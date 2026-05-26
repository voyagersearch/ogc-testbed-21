import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const config = JSON.parse(readFileSync(resolve(__dirname, 'config/voyager.json'), 'utf-8'));
const voyagerBaseUrl = config.baseUrl.replace(/\/$/, '');
const basePath = (config.server.basePath || '').replace(/\/$/, '');
const port = config.server.port || 5002;

export default defineConfig({
  base: basePath ? `${basePath}/` : '/',
  server: {
    port,
  },
  plugins: [
    react(),
    {
      name: 'api-proxy',
      configureServer(server) {
        // Strip basePath prefix from API requests so /ogc-testbed-21/api/... → /api/...
        if (basePath) {
          server.middlewares.use((req, _res, next) => {
            if (req.url?.startsWith(`${basePath}/api/`)) {
              req.url = req.url.slice(basePath.length);
            }
            next();
          });
        }

        // Voyager proxy
        server.middlewares.use('/api/voyager-proxy', async (req, res) => {
          try {
            const url = new URL(req.url || '', 'http://localhost');
            const targetPath = url.searchParams.get('path') || '/solr/v0/select';
            const customBaseUrl = url.searchParams.get('baseUrl');

            let baseUrl = voyagerBaseUrl;
            if (customBaseUrl) {
              baseUrl = customBaseUrl.endsWith('/') ? customBaseUrl.slice(0, -1) : customBaseUrl;
            }

            const params = new URLSearchParams(url.searchParams);
            params.delete('path');
            params.delete('baseUrl');
            const queryString = params.toString();
            const targetUrl = `${baseUrl}${targetPath}${queryString ? `?${queryString}` : ''}`;

            const isImageRequest = targetPath.includes('/thumb');

            const headers: Record<string, string> = {};
            if (!isImageRequest) {
              headers['Content-Type'] = 'application/json';
              headers['Accept'] = 'application/json';
            }

            const fetchOptions: RequestInit = {
              method: req.method || 'GET',
              headers,
            };

            if (req.method === 'POST') {
              const chunks: Buffer[] = [];
              for await (const chunk of req) {
                chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
              }
              fetchOptions.body = Buffer.concat(chunks).toString();
            }

            const response = await fetch(targetUrl, fetchOptions);

            if (isImageRequest) {
              const buffer = Buffer.from(await response.arrayBuffer());
              res.setHeader('Content-Type', response.headers.get('Content-Type') || 'image/jpeg');
              res.setHeader('Cache-Control', 'public, max-age=31536000');
              res.statusCode = response.status;
              res.end(buffer);
            } else {
              const data = await response.text();
              res.setHeader('Content-Type', response.headers.get('Content-Type') || 'application/json');
              res.statusCode = response.status;
              res.end(data);
            }
          } catch (error: any) {
            console.error('Proxy error:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: error.message }));
          }
        });

        // OGC Records API proxy
        server.middlewares.use('/api/ogc-records-api', async (req, res) => {
          try {
            const url = new URL(req.url || '', 'http://localhost');
            const pathname = url.pathname;
            const acceptHeader = (req.headers['accept'] as string) || '';
            const wantsHtml = acceptHeader.includes('text/html');
            const selfBaseUrl = '/api/ogc-records-api';
            const solrUrl = `${voyagerBaseUrl}${config.voyager.solrPath}`;

            if (pathname === '/conformance') {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                conformsTo: [
                  'http://www.opengis.net/spec/ogcapi-common-1/1.0/conf/core',
                  'http://www.opengis.net/spec/ogcapi-common-2/1.0/conf/collections',
                  'http://www.opengis.net/spec/ogcapi-records-1/1.0/conf/core',
                  'http://www.opengis.net/spec/ogcapi-records-1/1.0/conf/sorting',
                  'http://www.opengis.net/spec/ogcapi-records-1/1.0/conf/opensearch',
                  'http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/core',
                  'http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/geojson'
                ]
              }));
              return;
            }

            if (pathname === '/collections') {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                links: [{ href: `${selfBaseUrl}/collections`, rel: 'self', type: 'application/json', title: 'This document' }],
                collections: [{
                  id: 'records',
                  title: 'Geospatial Records',
                  description: 'Collection of geospatial data records from Voyager',
                  itemType: 'record',
                  crs: ['http://www.opengis.net/def/crs/OGC/1.3/CRS84'],
                  links: [
                    { href: `${selfBaseUrl}/collections/records`, rel: 'self', type: 'application/json', title: 'This collection' },
                    { href: `${selfBaseUrl}/collections/records/items`, rel: 'items', type: 'application/geo+json', title: 'Records' }
                  ]
                }]
              }));
              return;
            }

            const itemMatch = pathname.match(/^\/collections\/records\/items\/(.+)$/);
            if (itemMatch) {
              const itemId = itemMatch[1];
              const voyagerUrl = `${solrUrl}/select?q=id:${encodeURIComponent(itemId)}&wt=json&rows=1`;
              const voyagerResponse = await fetch(voyagerUrl);
              const voyagerData = await voyagerResponse.json();
              const docs = voyagerData.response?.docs || [];
              if (docs.length === 0) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Record not found' }));
                return;
              }
              res.setHeader('Content-Type', 'application/geo+json');
              res.end(JSON.stringify(docs[0]));
              return;
            }

            if (pathname === '/collections/records/items') {
              const limit = parseInt(url.searchParams.get('limit') || String(config.pagination?.apiDefaultLimit ?? 100));
              const offset = parseInt(url.searchParams.get('offset') || '0');
              const q = url.searchParams.get('q') || '*:*';
              const voyagerUrl = `${solrUrl}/select?q=${encodeURIComponent(q)}&wt=json&rows=${limit}&start=${offset}`;
              const voyagerResponse = await fetch(voyagerUrl);
              const voyagerData = await voyagerResponse.json();
              const docs = voyagerData.response?.docs || [];
              const totalResults = voyagerData.response?.numFound || 0;

              res.setHeader('Content-Type', 'application/geo+json');
              res.end(JSON.stringify({
                type: 'FeatureCollection',
                features: docs,
                timeStamp: new Date().toISOString(),
                numberMatched: totalResults,
                numberReturned: docs.length
              }));
              return;
            }

            if (pathname === '/collections/records') {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                id: 'records',
                title: 'Geospatial Records',
                description: 'Collection of geospatial data records from Voyager',
                itemType: 'record',
                crs: ['http://www.opengis.net/def/crs/OGC/1.3/CRS84'],
                links: [
                  { href: `${selfBaseUrl}/collections/records`, rel: 'self', type: 'application/json', title: 'This collection' },
                  { href: `${selfBaseUrl}/collections/records/items`, rel: 'items', type: 'application/geo+json', title: 'Records' }
                ]
              }));
              return;
            }

            const unknownCollection = pathname.match(/^\/collections\/([^/]+)(\/.*)?$/);
            if (unknownCollection) {
              res.statusCode = 404;
              res.setHeader('Content-Type', 'application/problem+json');
              res.end(JSON.stringify({
                type: 'about:blank',
                title: 'Collection not found',
                status: 404,
                detail: `No collection with id '${unknownCollection[1]}'`
              }));
              return;
            }

            // Landing page
            const landingPage = {
              title: 'OGC API - Records',
              description: 'API providing access to geospatial records from Voyager in OGC API - Records format',
              links: [
                { href: selfBaseUrl, rel: 'self', type: 'application/json', title: 'This document' },
                { href: `${selfBaseUrl}/conformance`, rel: 'conformance', type: 'application/json', title: 'Conformance classes' },
                { href: `${selfBaseUrl}/collections`, rel: 'data', type: 'application/json', title: 'Collections' }
              ]
            };

            if (wantsHtml) {
              res.setHeader('Content-Type', 'text/html');
              const jsonStr = JSON.stringify(landingPage, null, 2);
              res.end(`<!DOCTYPE html><html><head><title>OGC API - Records</title></head><body><h1>OGC API - Records</h1><pre><code>${jsonStr}</code></pre></body></html>`);
            } else {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(landingPage));
            }
          } catch (error: any) {
            console.error('OGC Records API error:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: error.message }));
          }
        });

        // STAC API proxy
        server.middlewares.use('/api/stac-api', async (req, res) => {
          try {
            const url = new URL(req.url || '', 'http://localhost');
            const pathname = url.pathname;
            const selfBaseUrl = '/api/stac-api';
            const solrUrl = `${voyagerBaseUrl}${config.voyager.solrPath}`;

            if (pathname === '/conformance') {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                conformsTo: [
                  'https://api.stacspec.org/v1.0.0/core',
                  'https://api.stacspec.org/v1.0.0/item-search',
                  'https://api.stacspec.org/v1.0.0/collections'
                ]
              }));
              return;
            }

            if (pathname === '/collections') {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                collections: [{
                  type: 'Collection',
                  stac_version: '1.0.0',
                  id: 'voyager',
                  title: 'Voyager Search Results',
                  description: 'Geospatial items from Voyager',
                  license: 'proprietary',
                  extent: {
                    spatial: { bbox: [[-180, -90, 180, 90]] },
                    temporal: { interval: [[null, null]] }
                  },
                  links: [
                    { rel: 'self', href: `${selfBaseUrl}/collections/voyager`, type: 'application/json' },
                    { rel: 'items', href: `${selfBaseUrl}/collections/voyager/items`, type: 'application/geo+json' },
                    { rel: 'root', href: selfBaseUrl, type: 'application/json' }
                  ]
                }],
                links: [
                  { rel: 'self', href: `${selfBaseUrl}/collections`, type: 'application/json' },
                  { rel: 'root', href: selfBaseUrl, type: 'application/json' }
                ]
              }));
              return;
            }

            const itemsMatch = pathname.match(/^\/collections\/([^/]+)\/items$/);
            if (itemsMatch) {
              const collectionId = itemsMatch[1];
              if (collectionId !== 'voyager') {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Collection not found' }));
                return;
              }
              const limit = parseInt(url.searchParams.get('limit') || String(config.pagination?.apiDefaultLimit ?? 100));
              const offset = parseInt(url.searchParams.get('offset') || '0');
              const q = url.searchParams.get('q') || '*:*';
              const voyagerUrl = `${solrUrl}/select?q=${encodeURIComponent(q)}&wt=json&rows=${limit}&start=${offset}`;
              const voyagerResponse = await fetch(voyagerUrl);
              const voyagerData = await voyagerResponse.json();
              const docs = voyagerData.response?.docs || [];

              const totalResults = voyagerData.response?.numFound || 0;
              const qSuffix = q !== '*:*' ? `&q=${encodeURIComponent(q)}` : '';
              const links: any[] = [
                { rel: 'self', href: `${selfBaseUrl}/collections/${collectionId}/items?limit=${limit}&offset=${offset}${qSuffix}`, type: 'application/geo+json' },
                { rel: 'root', href: selfBaseUrl, type: 'application/json' },
                { rel: 'collection', href: `${selfBaseUrl}/collections/${collectionId}`, type: 'application/json' }
              ];
              if (offset > 0) {
                links.push({ rel: 'prev', href: `${selfBaseUrl}/collections/${collectionId}/items?limit=${limit}&offset=${Math.max(0, offset - limit)}${qSuffix}`, type: 'application/geo+json' });
              }
              if (offset + limit < totalResults) {
                links.push({ rel: 'next', href: `${selfBaseUrl}/collections/${collectionId}/items?limit=${limit}&offset=${offset + limit}${qSuffix}`, type: 'application/geo+json' });
              }

              res.setHeader('Content-Type', 'application/geo+json');
              res.end(JSON.stringify({
                type: 'FeatureCollection',
                features: docs.map((doc: any) => ({
                  type: 'Feature',
                  stac_version: '1.0.0',
                  id: doc.id,
                  geometry: null,
                  bbox: [],
                  properties: { datetime: null, title: doc.title || doc.name || doc.id },
                  links: [
                    { rel: 'self', href: `${selfBaseUrl}/collections/voyager/items/${doc.id}`, type: 'application/geo+json' },
                    { rel: 'parent', href: `${selfBaseUrl}/collections/voyager`, type: 'application/json' },
                    { rel: 'collection', href: `${selfBaseUrl}/collections/voyager`, type: 'application/json' },
                    { rel: 'root', href: selfBaseUrl, type: 'application/json' }
                  ],
                  assets: {},
                  collection: 'voyager'
                })),
                links,
                numberMatched: totalResults,
                numberReturned: docs.length
              }));
              return;
            }

            if (pathname === '/search') {
              const limit = parseInt(url.searchParams.get('limit') || String(config.pagination?.apiDefaultLimit ?? 100));
              const q = url.searchParams.get('q') || '*:*';
              const voyagerUrl = `${solrUrl}/select?q=${encodeURIComponent(q)}&wt=json&rows=${limit}`;
              const voyagerResponse = await fetch(voyagerUrl);
              const voyagerData = await voyagerResponse.json();
              const docs = voyagerData.response?.docs || [];

              res.setHeader('Content-Type', 'application/geo+json');
              res.end(JSON.stringify({
                type: 'FeatureCollection',
                features: docs.map((doc: any) => ({
                  type: 'Feature',
                  stac_version: '1.0.0',
                  id: doc.id,
                  geometry: null,
                  bbox: [],
                  properties: { datetime: null, title: doc.title || doc.name || doc.id },
                  links: [],
                  assets: {}
                })),
                numberMatched: voyagerData.response?.numFound || 0,
                numberReturned: docs.length
              }));
              return;
            }

            // Catalog root
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              type: 'Catalog',
              stac_version: '1.0.0',
              id: 'voyager-stac-catalog',
              title: 'Voyager STAC Catalog',
              description: 'STAC catalog for Voyager geospatial data',
              links: [
                { rel: 'self', href: selfBaseUrl, type: 'application/json' },
                { rel: 'root', href: selfBaseUrl, type: 'application/json' },
                { rel: 'collections', href: `${selfBaseUrl}/collections`, type: 'application/json' },
                { rel: 'search', href: `${selfBaseUrl}/search`, type: 'application/geo+json' }
              ],
              conformsTo: [
                'https://api.stacspec.org/v1.0.0/core',
                'https://api.stacspec.org/v1.0.0/item-search',
                'https://api.stacspec.org/v1.0.0/collections'
              ]
            }));
          } catch (error: any) {
            console.error('STAC API error:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: error.message }));
          }
        });
      }
    }
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
