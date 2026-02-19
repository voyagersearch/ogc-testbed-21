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
      return matches.map(Number).slice(0, 4);
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

function parseDateTime(doc) {
  const dateStr = doc.fd_acquisition_date || doc.fd_publish_date || doc.modified;
  if (dateStr) {
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return { datetime: date.toISOString() };
      }
    } catch (error) {
      console.error('Error parsing datetime:', error);
    }
  }
  return { datetime: null };
}

function transformVoyagerToSTACItem(doc, baseUrl) {
  const config = loadConfig();
  const bbox = parseBBox(doc.bbox);
  const geometry = parseGeometry(doc.geo, bbox || undefined);
  const dateInfo = parseDateTime(doc);
  const title = doc.title || doc.name || doc.id;
  const description = doc.abstract || doc.description || '';

  const assets = {};

  let thumbnailUrl = null;
  if (doc.hasPreview && doc.path_to_preview) {
    thumbnailUrl = `${config.baseUrl.replace(/\/$/, '')}${doc.path_to_preview}`;
  } else if (doc.thumb) {
    thumbnailUrl = doc.thumb;
  }

  if (thumbnailUrl) {
    assets.thumbnail = {
      href: thumbnailUrl,
      title: 'Thumbnail',
      type: 'image/jpeg',
      roles: ['thumbnail']
    };
  }

  if (doc.download) {
    const format = (doc.format || '').toLowerCase();
    let mimeType = 'application/octet-stream';

    if (format.includes('tif') || format.includes('geotiff')) {
      mimeType = 'image/tiff; application=geotiff';
    } else if (format.includes('shp') || format.includes('shapefile')) {
      mimeType = 'application/x-shapefile';
    } else if (format.includes('json') || format.includes('geojson')) {
      mimeType = 'application/geo+json';
    } else if (format.includes('png')) {
      mimeType = 'image/png';
    } else if (format.includes('jpg') || format.includes('jpeg')) {
      mimeType = 'image/jpeg';
    }

    assets.data = {
      href: doc.download,
      title: 'Data File',
      type: mimeType,
      roles: ['data']
    };

    if (doc.bytes) {
      assets.data.description = `Size: ${(doc.bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
  }

  if (doc.layerURL) {
    assets.wms = {
      href: doc.layerURL,
      title: 'WMS Layer',
      type: 'application/vnd.ogc.wms_xml',
      roles: ['wms']
    };
  }

  const properties = {
    datetime: dateInfo.datetime,
    title,
    description
  };

  if (doc.format) properties.format = doc.format;
  if (doc.format_type) properties.format_type = doc.format_type;
  if (doc.keywords) properties.keywords = doc.keywords;
  if (doc.tag_tags) properties.tags = doc.tag_tags;
  if (doc.subject) properties.subject = doc.subject;
  if (doc.grp_Country) properties.country = doc.grp_Country;
  if (doc.grp_Agency) properties.agency = doc.grp_Agency;
  if (doc.bytes) properties.file_size = doc.bytes;

  const links = [
    { rel: 'self', href: `${baseUrl}/collections/voyager/items/${doc.id}`, type: 'application/geo+json' },
    { rel: 'collection', href: `${baseUrl}/collections/voyager`, type: 'application/json' }
  ];

  if (doc.fullpath || doc.absolute_path) {
    links.push({
      rel: 'alternate',
      href: doc.fullpath || doc.absolute_path || '',
      type: 'text/html',
      title: 'Original Source'
    });
  }

  return {
    type: 'Feature',
    stac_version: '1.0.0',
    id: doc.id,
    geometry,
    bbox: bbox || [],
    properties,
    links,
    assets,
    collection: 'voyager'
  };
}

export function createSTACRouter() {
  const router = Router();
  const config = loadConfig();
  const voyagerSolrUrl = `${config.baseUrl.replace(/\/$/, '')}${config.voyager.solrPath}`;

  router.get('/', (req, res) => {
    const baseUrl = `${req.protocol}://${req.get('host')}/api/stac-api`;
    res.json({
      type: 'Catalog',
      stac_version: '1.0.0',
      id: 'voyager-stac-catalog',
      title: 'Voyager STAC Catalog',
      description: 'STAC catalog for Voyager geospatial data',
      links: [
        { rel: 'self', href: baseUrl, type: 'application/json' },
        { rel: 'root', href: baseUrl, type: 'application/json' },
        { rel: 'collections', href: `${baseUrl}/collections`, type: 'application/json' },
        { rel: 'search', href: `${baseUrl}/search`, type: 'application/geo+json' }
      ],
      conformsTo: [
        'https://api.stacspec.org/v1.0.0/core',
        'https://api.stacspec.org/v1.0.0/item-search',
        'https://api.stacspec.org/v1.0.0/collections'
      ]
    });
  });

  router.get('/conformance', (req, res) => {
    res.json({
      conformsTo: [
        'https://api.stacspec.org/v1.0.0/core',
        'https://api.stacspec.org/v1.0.0/item-search',
        'https://api.stacspec.org/v1.0.0/collections'
      ]
    });
  });

  router.get('/collections', async (req, res) => {
    try {
      const baseUrl = `${req.protocol}://${req.get('host')}/api/stac-api`;

      const voyagerUrl = `${voyagerSolrUrl}/select?q=*:*&wt=json&rows=0`;
      const voyagerResponse = await fetch(voyagerUrl);
      const voyagerData = await voyagerResponse.json();
      const totalResults = voyagerData.response?.numFound || 0;

      res.json({
        collections: [
          {
            type: 'Collection',
            stac_version: '1.0.0',
            id: 'voyager',
            title: 'Voyager Search Results',
            description: `Collection of ${totalResults} geospatial items from Voyager`,
            license: 'proprietary',
            extent: {
              spatial: { bbox: [[-180, -90, 180, 90]] },
              temporal: { interval: [[null, null]] }
            },
            links: [
              { rel: 'self', href: `${baseUrl}/collections/voyager`, type: 'application/json' },
              { rel: 'items', href: `${baseUrl}/collections/voyager/items`, type: 'application/geo+json' },
              { rel: 'root', href: baseUrl, type: 'application/json' }
            ]
          }
        ],
        links: [
          { rel: 'self', href: `${baseUrl}/collections`, type: 'application/json' },
          { rel: 'root', href: baseUrl, type: 'application/json' }
        ]
      });
    } catch (error) {
      console.error('STAC API error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/collections/:collectionId', async (req, res) => {
    try {
      const baseUrl = `${req.protocol}://${req.get('host')}/api/stac-api`;
      const { collectionId } = req.params;

      if (collectionId !== 'voyager') {
        return res.status(404).json({ error: 'Collection not found' });
      }

      const voyagerUrl = `${voyagerSolrUrl}/select?q=*:*&wt=json&rows=0`;
      const voyagerResponse = await fetch(voyagerUrl);
      const voyagerData = await voyagerResponse.json();
      const totalResults = voyagerData.response?.numFound || 0;

      res.json({
        type: 'Collection',
        stac_version: '1.0.0',
        id: 'voyager',
        title: 'Voyager Search Results',
        description: `Collection of ${totalResults} geospatial items from Voyager`,
        license: 'proprietary',
        extent: {
          spatial: { bbox: [[-180, -90, 180, 90]] },
          temporal: { interval: [[null, null]] }
        },
        links: [
          { rel: 'self', href: `${baseUrl}/collections/voyager`, type: 'application/json' },
          { rel: 'items', href: `${baseUrl}/collections/voyager/items`, type: 'application/geo+json' },
          { rel: 'root', href: baseUrl, type: 'application/json' }
        ]
      });
    } catch (error) {
      console.error('STAC API error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/collections/:collectionId/items/:itemId', async (req, res) => {
    try {
      const baseUrl = `${req.protocol}://${req.get('host')}/api/stac-api`;
      const { collectionId, itemId } = req.params;

      if (collectionId !== 'voyager') {
        return res.status(404).json({ error: 'Collection not found' });
      }

      const voyagerUrl = `${voyagerSolrUrl}/select?q=id:${encodeURIComponent(itemId)}&wt=json&rows=1`;
      const voyagerResponse = await fetch(voyagerUrl);
      const voyagerData = await voyagerResponse.json();

      const docs = voyagerData.response?.docs || [];
      if (docs.length === 0) {
        return res.status(404).json({ error: 'Item not found' });
      }

      const item = transformVoyagerToSTACItem(docs[0], baseUrl);
      res.set('Content-Type', 'application/geo+json');
      res.json(item);
    } catch (error) {
      console.error('STAC API error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/collections/:collectionId/items', async (req, res) => {
    try {
      const baseUrl = `${req.protocol}://${req.get('host')}/api/stac-api`;
      const { collectionId } = req.params;

      if (collectionId !== 'voyager') {
        return res.status(404).json({ error: 'Collection not found' });
      }

      const limit = parseInt(req.query.limit || '10');
      const offset = parseInt(req.query.offset || '0');

      const voyagerUrl = `${voyagerSolrUrl}/select?q=*:*&wt=json&rows=${limit}&start=${offset}`;
      const voyagerResponse = await fetch(voyagerUrl);
      const voyagerData = await voyagerResponse.json();

      const docs = voyagerData.response?.docs || [];
      const totalResults = voyagerData.response?.numFound || 0;

      const items = docs.map(doc => transformVoyagerToSTACItem(doc, baseUrl));

      res.set('Content-Type', 'application/geo+json');
      res.json({
        type: 'FeatureCollection',
        features: items,
        links: [
          { rel: 'self', href: `${baseUrl}/collections/${collectionId}/items?limit=${limit}&offset=${offset}`, type: 'application/geo+json' },
          { rel: 'collection', href: `${baseUrl}/collections/${collectionId}`, type: 'application/json' }
        ],
        numberMatched: totalResults,
        numberReturned: items.length
      });
    } catch (error) {
      console.error('STAC API error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/search', async (req, res) => {
    try {
      const baseUrl = `${req.protocol}://${req.get('host')}/api/stac-api`;
      const limit = parseInt(req.query.limit || '10');
      const bbox = req.query.bbox;
      const q = req.query.q || '*:*';

      let voyagerQuery = q;
      if (bbox) {
        const bboxCoords = bbox.split(',').map(Number);
        if (bboxCoords.length === 4) {
          voyagerQuery += ` AND bbox:[${bboxCoords[1]},${bboxCoords[0]} TO ${bboxCoords[3]},${bboxCoords[2]}]`;
        }
      }

      const voyagerUrl = `${voyagerSolrUrl}/select?q=${encodeURIComponent(voyagerQuery)}&wt=json&rows=${limit}`;
      const voyagerResponse = await fetch(voyagerUrl);
      const voyagerData = await voyagerResponse.json();

      const docs = voyagerData.response?.docs || [];
      const items = docs.map(doc => transformVoyagerToSTACItem(doc, baseUrl));

      res.set('Content-Type', 'application/geo+json');
      res.json({
        type: 'FeatureCollection',
        features: items,
        links: [
          { rel: 'self', href: `${baseUrl}/search?${new URLSearchParams(req.query).toString()}`, type: 'application/geo+json' }
        ],
        numberMatched: voyagerData.response?.numFound || 0,
        numberReturned: items.length
      });
    } catch (error) {
      console.error('STAC API error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
