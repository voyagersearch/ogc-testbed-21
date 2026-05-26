#!/usr/bin/env node
// Validate an OGC API - Records endpoint against the published spec.
// Usage: node script/validate-records.js [base-url]
//   default base-url: http://localhost:5002/ogc-testbed-21/api/ogc-records-api
//
// Known discrepancy (informational, not a bug):
//   The final Ajv check against recordCollectionGeoJSON.yaml fails for any
//   record that has geometry: null. This is because Records 1.0's
//   recordCollectionGeoJSON does allOf against Features 1.0's
//   featureGeoJSON, which requires non-null geometry, even though
//   Records' own recordGeoJSON schema (and RFC 7946) allow null geometry
//   for unlocated features. We intentionally emit null geometry for
//   non-spatial Voyager records — see ADR-equivalent discussion in PR #1.

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import yaml from 'js-yaml';

const BASE = process.argv[2] || 'http://localhost:5002/ogc-testbed-21/api/ogc-records-api';
const SCHEMA_BASE = 'https://schemas.opengis.net/ogcapi/records/part1/1.0/openapi/schemas';

const REQUIRED_CONFORMANCE = [
  'http://www.opengis.net/spec/ogcapi-records-1/1.0/conf/core',
  'http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/core',
  'http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/geojson',
];

let passed = 0;
let failed = 0;
const failures = [];

function pass(name) {
  console.log(`  ✓ ${name}`);
  passed++;
}
function fail(name, detail) {
  console.log(`  ✗ ${name}`);
  if (detail) console.log(`      ${detail}`);
  failed++;
  failures.push({ name, detail });
}

async function getJSON(path) {
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return res.json();
}

function hasLink(links, rel) {
  return Array.isArray(links) && links.some((l) => l.rel === rel);
}

// ---------- Spec assertions (OGC API - Records 1.0 + Features 1.0) ----------

async function checkLanding() {
  console.log(`\nLanding page: ${BASE}`);
  const d = await getJSON('');
  d.title ? pass('has title') : fail('has title');
  d.description ? pass('has description') : fail('has description');
  Array.isArray(d.links) ? pass('has links array') : fail('has links array');
  hasLink(d.links, 'self') ? pass('link rel=self') : fail('link rel=self');
  hasLink(d.links, 'conformance') ? pass('link rel=conformance') : fail('link rel=conformance');
  hasLink(d.links, 'data') ? pass('link rel=data') : fail('link rel=data');
  return d;
}

async function checkConformance() {
  console.log(`\nConformance: ${BASE}/conformance`);
  const d = await getJSON('/conformance');
  Array.isArray(d.conformsTo) ? pass('conformsTo is array') : fail('conformsTo is array');
  for (const uri of REQUIRED_CONFORMANCE) {
    d.conformsTo?.includes(uri) ? pass(`declares ${uri}`) : fail(`declares ${uri}`);
  }
  return d;
}

async function checkCollections() {
  console.log(`\nCollections: ${BASE}/collections`);
  const d = await getJSON('/collections');
  Array.isArray(d.links) ? pass('has links') : fail('has links');
  Array.isArray(d.collections) ? pass('collections is array') : fail('collections is array');
  hasLink(d.links, 'self') ? pass('link rel=self') : fail('link rel=self');

  const records = d.collections?.find((c) => c.id === 'records');
  records ? pass('records collection present') : fail('records collection present');
  if (records) {
    records.itemType === 'record' ? pass('records.itemType=record') : fail('records.itemType=record');
    Array.isArray(records.crs) && records.crs.length > 0
      ? pass('records.crs declared')
      : fail('records.crs declared');
    hasLink(records.links, 'items') ? pass('records has rel=items link') : fail('records has rel=items link');
  }
  return d;
}

async function checkCollection() {
  console.log(`\nCollection: ${BASE}/collections/records`);
  const d = await getJSON('/collections/records');
  d.id === 'records' ? pass('id=records') : fail('id=records', `got ${d.id}`);
  d.itemType === 'record' ? pass('itemType=record') : fail('itemType=record');
  hasLink(d.links, 'items') ? pass('link rel=items') : fail('link rel=items');
  return d;
}

async function checkItems() {
  console.log(`\nItems: ${BASE}/collections/records/items?limit=3`);
  const d = await getJSON('/collections/records/items?limit=3');
  d.type === 'FeatureCollection' ? pass('type=FeatureCollection') : fail('type=FeatureCollection');
  Array.isArray(d.features) ? pass('features is array') : fail('features is array');
  Array.isArray(d.links) ? pass('has links') : fail('has links');
  hasLink(d.links, 'self') ? pass('link rel=self') : fail('link rel=self');
  typeof d.numberMatched === 'number' ? pass('numberMatched is number') : fail('numberMatched is number');
  typeof d.numberReturned === 'number' ? pass('numberReturned is number') : fail('numberReturned is number');
  d.timeStamp ? pass('has timeStamp') : fail('has timeStamp');

  if (d.features?.length) {
    const f = d.features[0];
    console.log(`\nFirst feature: ${f.id}`);
    f.type === 'Feature' ? pass('feature.type=Feature') : fail('feature.type=Feature');
    typeof f.id === 'string' ? pass('feature.id is string') : fail('feature.id is string');
    f.properties ? pass('feature.properties present') : fail('feature.properties present');
    f.properties?.type ? pass('feature.properties.type present') : fail('feature.properties.type present');
    Array.isArray(f.links) ? pass('feature.links is array') : fail('feature.links is array');
    hasLink(f.links, 'self') ? pass('feature link rel=self') : fail('feature link rel=self');
    // geometry is either GeoJSON object or null (per Records spec)
    f.geometry === null || (f.geometry && f.geometry.type)
      ? pass('feature.geometry shape (object|null)')
      : fail('feature.geometry shape (object|null)');
  }
  return d;
}

async function checkPagination() {
  console.log(`\nPagination: limit=2&offset=0`);
  const p1 = await getJSON('/collections/records/items?limit=2&offset=0');
  p1.numberReturned === 2 || p1.numberReturned === p1.features?.length
    ? pass('numberReturned matches features length')
    : fail('numberReturned matches features length');
  hasLink(p1.links, 'next') ? pass('rel=next link present') : fail('rel=next link present');

  console.log(`Pagination: limit=2&offset=2`);
  const p2 = await getJSON('/collections/records/items?limit=2&offset=2');
  hasLink(p2.links, 'prev') ? pass('rel=prev link present') : fail('rel=prev link present');

  const ids1 = p1.features?.map((f) => f.id) ?? [];
  const ids2 = p2.features?.map((f) => f.id) ?? [];
  const overlap = ids1.filter((id) => ids2.includes(id));
  overlap.length === 0 ? pass('pages do not overlap') : fail('pages do not overlap', `overlap: ${overlap.join(',')}`);
}

async function checkErrors() {
  console.log(`\nError handling`);
  const res = await fetch(`${BASE}/collections/this-does-not-exist`);
  res.status === 404 ? pass('unknown collection → 404') : fail('unknown collection → 404', `got ${res.status}`);
}

// ---------- Optional Ajv-based deep validation ----------

// OGC ships schemas as OpenAPI 3.0 YAML (uses `nullable: true`).
// Ajv speaks JSON Schema, where null is expressed via type: [X, 'null'].
// Walk the loaded schema and convert.
function openApiToJsonSchema(node) {
  if (Array.isArray(node)) return node.forEach(openApiToJsonSchema);
  if (node && typeof node === 'object') {
    if (node.nullable === true && node.type && node.type !== 'null') {
      node.type = Array.isArray(node.type) ? [...node.type, 'null'] : [node.type, 'null'];
    }
    delete node.nullable;
    for (const k of Object.keys(node)) openApiToJsonSchema(node[k]);
  }
}

async function loadYamlSchema(absoluteUrl) {
  const text = await (await fetch(absoluteUrl)).text();
  const schema = yaml.load(text);
  openApiToJsonSchema(schema);
  // Anchor the schema at its absolute URL so relative $refs resolve.
  if (typeof schema === 'object' && schema !== null && !schema.$id) {
    schema.$id = absoluteUrl;
  }
  return schema;
}

async function deepValidateItems(itemsResponse) {
  console.log(`\nAjv schema check: recordCollectionGeoJSON`);
  const ajv = new Ajv({
    strict: false,
    allErrors: true,
    loadSchema: async (uri) => loadYamlSchema(uri),
  });
  addFormats(ajv);
  try {
    const schema = await loadYamlSchema(`${SCHEMA_BASE}/recordCollectionGeoJSON.yaml`);
    const validate = await ajv.compileAsync(schema);
    const ok = validate(itemsResponse);
    if (ok) {
      pass('items response matches recordCollectionGeoJSON.yaml');
    } else {
      const sample = (validate.errors ?? []).slice(0, 5).map((e) => `${e.instancePath || '/'} ${e.message}`).join('; ');
      fail('items response matches recordCollectionGeoJSON.yaml', sample || 'unknown');
    }
  } catch (err) {
    fail('Ajv compile/validate', err.message);
  }
}

// ---------- main ----------

async function main() {
  console.log(`OGC API - Records validation`);
  console.log(`Target: ${BASE}`);
  try {
    await checkLanding();
    await checkConformance();
    await checkCollections();
    await checkCollection();
    const items = await checkItems();
    await checkPagination();
    await checkErrors();
    await deepValidateItems(items);
  } catch (err) {
    console.error(`\nFatal: ${err.message}`);
    process.exit(2);
  }

  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.log(`\nFailures:`);
    for (const f of failures) console.log(`  - ${f.name}${f.detail ? `: ${f.detail}` : ''}`);
    process.exit(1);
  }
}

main();
