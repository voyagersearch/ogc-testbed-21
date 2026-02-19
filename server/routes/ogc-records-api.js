import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Router } from 'express';

function loadConfig() {
  const configPath = resolve(process.cwd(), 'config/voyager.json');
  return JSON.parse(readFileSync(configPath, 'utf-8'));
}

function parseBBox(bboxStr) {
  if (!bboxStr || typeof bboxStr !== 'string') return null;
  try {
    const matches = bboxStr.match(/-?[\d.]+/g);
    if (matches && matches.length >= 4) {
      return matches.map(Number);
    }
  } catch (error) {
    console.error('Error parsing bbox:', error);
  }
  return null;
}

function parseGeometry(geoStr, bbox) {
  if (!geoStr && !bbox) return null;

  if (geoStr && typeof geoStr === 'string' && geoStr.includes('POLYGON')) {
    try {
      const coordsMatch = geoStr.match(/\(\(([^)]+)\)\)/);
      if (coordsMatch) {
        const coordPairs = coordsMatch[1].split(',').map(pair => {
          const [lon, lat] = pair.trim().split(' ').map(Number);
          return [lon, lat];
        });
        return { type: 'Polygon', coordinates: [coordPairs] };
      }
    } catch (error) {
      console.error('Error parsing geometry:', error);
    }
  }

  if (bbox) {
    return {
      type: 'Polygon',
      coordinates: [[
        [bbox[0], bbox[1]],
        [bbox[2], bbox[1]],
        [bbox[2], bbox[3]],
        [bbox[0], bbox[3]],
        [bbox[0], bbox[1]]
      ]]
    };
  }

  return null;
}

function transformVoyagerToOGCRecord(doc, baseUrl) {
  const config = loadConfig();
  const bbox = parseBBox(doc.bbox);
  const geometry = parseGeometry(doc.geo, bbox || undefined);
  const title = doc.title || doc.name || doc.id;
  const description = doc.abstract || doc.description || '';

  const keywords = [];
  if (doc.keywords) keywords.push(...doc.keywords);
  if (doc.tag_tags) keywords.push(...doc.tag_tags);
  if (doc.subject) keywords.push(...doc.subject);

  const links = [
    {
      href: `${baseUrl}/collections/records/items/${doc.id}`,
      rel: 'self',
      type: 'application/geo+json',
      title: 'This record'
    }
  ];

  if (doc.fullpath || doc.absolute_path) {
    links.push({
      href: doc.fullpath || doc.absolute_path || '',
      rel: 'alternate',
      type: 'text/html',
      title: 'Original source'
    });
  }

  let thumbnailUrl = null;
  if (doc.hasPreview && doc.path_to_preview) {
    thumbnailUrl = `${config.baseUrl.replace(/\/$/, '')}${doc.path_to_preview}`;
  } else if (doc.thumb) {
    thumbnailUrl = doc.thumb;
  }

  if (thumbnailUrl) {
    links.push({
      href: thumbnailUrl,
      rel: 'preview',
      type: 'image/jpeg',
      title: 'Preview image'
    });
  }

  if (doc.download) {
    links.push({
      href: doc.download,
      rel: 'enclosure',
      type: doc.format || 'application/octet-stream',
      title: 'Download data'
    });
  }

  if (doc.layerURL) {
    links.push({
      href: doc.layerURL,
      rel: 'wms',
      type: 'application/vnd.ogc.wms_xml',
      title: 'WMS service'
    });
  }

  const properties = {
    type: 'dataset',
    title,
    description: description || undefined,
    created: doc.fd_publish_date || undefined,
    updated: doc.modified || doc.fd_acquisition_date || undefined,
    keywords: keywords.length > 0 ? keywords : undefined,
    language: 'en',
    formats: doc.format ? [doc.format] : undefined,
    license: 'proprietary',
  };

  if (bbox) {
    properties.extent = {
      spatial: {
        bbox: [bbox],
        crs: 'http://www.opengis.net/def/crs/OGC/1.3/CRS84'
      }
    };

    if (doc.fd_acquisition_date || doc.fd_publish_date) {
      const dateStr = doc.fd_acquisition_date || doc.fd_publish_date;
      properties.extent.temporal = {
        interval: [[dateStr || null, null]],
        trs: 'http://www.opengis.net/def/uom/ISO-8601/0/Gregorian'
      };
    }
  }

  if (doc.grp_Agency || doc.grp_Country) {
    properties.contacts = [{
      organization: doc.grp_Agency || undefined,
      position: doc.grp_Country || undefined
    }];
  }

  const themes = [];
  if (doc.subject && doc.subject.length > 0) {
    themes.push({
      concepts: doc.subject.map(s => ({ id: s, title: s })),
      scheme: 'http://www.example.com/themes'
    });
  }

  if (themes.length > 0) {
    properties.themes = themes;
  }

  if (doc.format_type) properties.recordType = doc.format_type;
  if (doc.bytes) properties.fileSize = doc.bytes;

  return {
    id: doc.id,
    type: 'Feature',
    conformsTo: [
      'http://www.opengis.net/spec/ogcapi-records-1/1.0/req/record-core',
      'http://www.opengis.net/spec/ogcapi-features-1/1.0/req/core',
      'http://www.opengis.net/spec/ogcapi-features-1/1.0/req/geojson'
    ],
    geometry,
    properties,
    links
  };
}

function generateHTMLResponse(data, title) {
  const jsonStr = JSON.stringify(data, null, 2);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - OGC API Records</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    h1 {
      color: #333;
      border-bottom: 2px solid #007bff;
      padding-bottom: 10px;
    }
    pre {
      background: #fff;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid #ddd;
      overflow-x: auto;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    code {
      color: #333;
      font-size: 14px;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <pre><code>${jsonStr}</code></pre>
</body>
</html>`;
}

export function createOGCRecordsRouter() {
  const router = Router();
  const config = loadConfig();
  const voyagerSolrUrl = `${config.baseUrl.replace(/\/$/, '')}${config.voyager.solrPath}`;

  router.get('/conformance', (req, res) => {
    res.json({
      conformsTo: [
        'http://www.opengis.net/spec/ogcapi-common-1/1.0/conf/core',
        'http://www.opengis.net/spec/ogcapi-common-2/1.0/conf/collections',
        'http://www.opengis.net/spec/ogcapi-records-1/1.0/conf/core',
        'http://www.opengis.net/spec/ogcapi-records-1/1.0/conf/sorting',
        'http://www.opengis.net/spec/ogcapi-records-1/1.0/conf/opensearch',
        'http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/core',
        'http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/geojson'
      ]
    });
  });

  router.get('/collections', (req, res) => {
    const baseUrl = `${req.protocol}://${req.get('host')}/api/ogc-records-api`;
    res.json({
      links: [
        { href: `${baseUrl}/collections`, rel: 'self', type: 'application/json', title: 'This document' }
      ],
      collections: [
        {
          id: 'records',
          title: 'Geospatial Records',
          description: 'Collection of geospatial data records from Voyager',
          itemType: 'record',
          crs: ['http://www.opengis.net/def/crs/OGC/1.3/CRS84'],
          links: [
            { href: `${baseUrl}/collections/records`, rel: 'self', type: 'application/json', title: 'This collection' },
            { href: `${baseUrl}/collections/records/items`, rel: 'items', type: 'application/geo+json', title: 'Records' }
          ]
        }
      ]
    });
  });

  router.get('/collections/records/items/:itemId', async (req, res) => {
    try {
      const { itemId } = req.params;
      const baseUrl = `${req.protocol}://${req.get('host')}/api/ogc-records-api`;

      const voyagerUrl = `${voyagerSolrUrl}/select?q=id:${encodeURIComponent(itemId)}&wt=json&rows=1`;
      const voyagerResponse = await fetch(voyagerUrl);
      const voyagerData = await voyagerResponse.json();

      const docs = voyagerData.response?.docs || [];
      if (docs.length === 0) {
        return res.status(404).json({ error: 'Record not found' });
      }

      const record = transformVoyagerToOGCRecord(docs[0], baseUrl);
      res.set('Content-Type', 'application/geo+json');
      res.json(record);
    } catch (error) {
      console.error('OGC Records API error:', error);
      res.status(500).json({ error: error.message, type: 'application/problem+json' });
    }
  });

  router.get('/collections/records/items', async (req, res) => {
    try {
      const baseUrl = `${req.protocol}://${req.get('host')}/api/ogc-records-api`;
      const limit = parseInt(req.query.limit || '10');
      const offset = parseInt(req.query.offset || '0');
      const q = req.query.q || '*:*';
      const bbox = req.query.bbox;

      let voyagerQuery = q;
      if (bbox) {
        const bboxCoords = bbox.split(',').map(Number);
        if (bboxCoords.length === 4) {
          voyagerQuery += ` AND bbox:[${bboxCoords[1]},${bboxCoords[0]} TO ${bboxCoords[3]},${bboxCoords[2]}]`;
        }
      }

      const voyagerUrl = `${voyagerSolrUrl}/select?q=${encodeURIComponent(voyagerQuery)}&wt=json&rows=${limit}&start=${offset}`;
      const voyagerResponse = await fetch(voyagerUrl);
      const voyagerData = await voyagerResponse.json();

      const docs = voyagerData.response?.docs || [];
      const totalResults = voyagerData.response?.numFound || 0;

      const records = docs.map(doc => transformVoyagerToOGCRecord(doc, baseUrl));

      const links = [
        {
          href: `${baseUrl}/collections/records/items?limit=${limit}&offset=${offset}${q !== '*:*' ? `&q=${encodeURIComponent(q)}` : ''}`,
          rel: 'self',
          type: 'application/geo+json',
          title: 'This document'
        }
      ];

      if (offset > 0) {
        const prevOffset = Math.max(0, offset - limit);
        links.push({
          href: `${baseUrl}/collections/records/items?limit=${limit}&offset=${prevOffset}${q !== '*:*' ? `&q=${encodeURIComponent(q)}` : ''}`,
          rel: 'prev',
          type: 'application/geo+json',
          title: 'Previous page'
        });
      }

      if (offset + limit < totalResults) {
        const nextOffset = offset + limit;
        links.push({
          href: `${baseUrl}/collections/records/items?limit=${limit}&offset=${nextOffset}${q !== '*:*' ? `&q=${encodeURIComponent(q)}` : ''}`,
          rel: 'next',
          type: 'application/geo+json',
          title: 'Next page'
        });
      }

      res.set('Content-Type', 'application/geo+json');
      res.json({
        type: 'FeatureCollection',
        features: records,
        links,
        timeStamp: new Date().toISOString(),
        numberMatched: totalResults,
        numberReturned: records.length
      });
    } catch (error) {
      console.error('OGC Records API error:', error);
      res.status(500).json({ error: error.message, type: 'application/problem+json' });
    }
  });

  router.get('/collections/records', (req, res) => {
    const baseUrl = `${req.protocol}://${req.get('host')}/api/ogc-records-api`;
    res.json({
      id: 'records',
      title: 'Geospatial Records',
      description: 'Collection of geospatial data records from Voyager',
      itemType: 'record',
      crs: ['http://www.opengis.net/def/crs/OGC/1.3/CRS84'],
      links: [
        { href: `${baseUrl}/collections/records`, rel: 'self', type: 'application/json', title: 'This collection' },
        { href: `${baseUrl}/collections/records/items`, rel: 'items', type: 'application/geo+json', title: 'Records' }
      ]
    });
  });

  router.get('/', (req, res) => {
    const baseUrl = `${req.protocol}://${req.get('host')}/api/ogc-records-api`;
    const acceptHeader = req.get('Accept') || '';
    const wantsHtml = acceptHeader.includes('text/html');

    const landingPage = {
      title: 'OGC API - Records',
      description: 'API providing access to geospatial records from Voyager in OGC API - Records format',
      links: [
        { href: baseUrl, rel: 'self', type: 'application/json', title: 'This document' },
        { href: `${baseUrl}/conformance`, rel: 'conformance', type: 'application/json', title: 'Conformance classes' },
        { href: `${baseUrl}/collections`, rel: 'data', type: 'application/json', title: 'Collections' },
        { href: 'https://docs.ogc.org/is/20-004/20-004.html', rel: 'service-doc', type: 'text/html', title: 'OGC API - Records specification' }
      ]
    };

    if (wantsHtml) {
      res.set('Content-Type', 'text/html');
      res.send(generateHTMLResponse(landingPage, 'OGC API - Records Landing Page'));
    } else {
      res.json(landingPage);
    }
  });

  return router;
}
