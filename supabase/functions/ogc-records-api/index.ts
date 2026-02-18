import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface VoyagerDoc {
  id: string;
  title?: string;
  name?: string;
  abstract?: string;
  description?: string;
  bbox?: string;
  geo?: string;
  modified?: string;
  fd_acquisition_date?: string;
  fd_publish_date?: string;
  thumb?: string;
  download?: string;
  format?: string;
  format_type?: string;
  bytes?: number;
  keywords?: string[];
  tag_tags?: string[];
  subject?: string[];
  grp_Country?: string;
  grp_Agency?: string;
  fullpath?: string;
  absolute_path?: string;
  layerURL?: string;
  [key: string]: any;
}

function generateVoyagerThumbnailUrl(doc: VoyagerDoc): string | null {
  if (doc.hasPreview && doc.path_to_preview) {
    return `https://voyager.fas.usda.gov${doc.path_to_preview}`;
  }
  return null;
}

function parseBBox(bboxStr?: string): number[] | null {
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

function parseGeometry(geoStr?: string, bbox?: number[]): any {
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

function transformVoyagerToOGCRecord(doc: VoyagerDoc, baseUrl: string): any {
  const bbox = parseBBox(doc.bbox);
  const geometry = parseGeometry(doc.geo, bbox || undefined);
  const title = doc.title || doc.name || doc.id;
  const description = doc.abstract || doc.description || '';

  const keywords: string[] = [];
  if (doc.keywords) keywords.push(...doc.keywords);
  if (doc.tag_tags) keywords.push(...doc.tag_tags);
  if (doc.subject) keywords.push(...doc.subject);

  const links: any[] = [
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

  const generatedThumbnail = generateVoyagerThumbnailUrl(doc);
  const thumbnailUrl = generatedThumbnail || doc.thumb;

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

  const properties: any = {
    type: 'dataset',
    title: title,
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

  const themes: any[] = [];
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
    geometry: geometry,
    properties: properties,
    links: links
  };
}

function generateHTMLResponse(data: any, title: string): string {
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const pathname = url.pathname;
    const acceptHeader = req.headers.get('Accept') || '';
    const wantsHtml = acceptHeader.includes('text/html');

    const functionBaseUrl = url.origin + url.pathname.split('/collections')[0];

    if (pathname.endsWith('/conformance')) {
      const conformance = {
        conformsTo: [
          'http://www.opengis.net/spec/ogcapi-common-1/1.0/conf/core',
          'http://www.opengis.net/spec/ogcapi-common-2/1.0/conf/collections',
          'http://www.opengis.net/spec/ogcapi-records-1/1.0/conf/core',
          'http://www.opengis.net/spec/ogcapi-records-1/1.0/conf/sorting',
          'http://www.opengis.net/spec/ogcapi-records-1/1.0/conf/opensearch',
          'http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/core',
          'http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/geojson'
        ]
      };

      return new Response(JSON.stringify(conformance), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    if (pathname.endsWith('/collections')) {
      const collections = {
        links: [
          {
            href: `${functionBaseUrl}/collections`,
            rel: 'self',
            type: 'application/json',
            title: 'This document'
          }
        ],
        collections: [
          {
            id: 'records',
            title: 'Geospatial Records',
            description: 'Collection of geospatial data records from Voyager',
            itemType: 'record',
            crs: ['http://www.opengis.net/def/crs/OGC/1.3/CRS84'],
            links: [
              {
                href: `${functionBaseUrl}/collections/records`,
                rel: 'self',
                type: 'application/json',
                title: 'This collection'
              },
              {
                href: `${functionBaseUrl}/collections/records/items`,
                rel: 'items',
                type: 'application/geo+json',
                title: 'Records'
              }
            ]
          }
        ]
      };

      return new Response(JSON.stringify(collections), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    if (pathname.includes('/collections/records/items/')) {
      const itemId = pathname.split('/items/')[1];

      const voyagerUrl = `https://ogc-sdi.voyagersearch.com/solr/v0/select?q=id:${encodeURIComponent(itemId)}&wt=json&rows=1`;
      const voyagerResponse = await fetch(voyagerUrl);
      const voyagerData = await voyagerResponse.json();

      const docs = voyagerData.response?.docs || [];
      if (docs.length === 0) {
        return new Response(JSON.stringify({ error: 'Record not found' }), {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        });
      }

      const record = transformVoyagerToOGCRecord(docs[0], functionBaseUrl);

      return new Response(JSON.stringify(record), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/geo+json",
        },
      });
    }

    if (pathname.includes('/collections/records/items')) {
      const limit = parseInt(url.searchParams.get('limit') || '10');
      const offset = parseInt(url.searchParams.get('offset') || '0');
      const q = url.searchParams.get('q') || '*:*';
      const bbox = url.searchParams.get('bbox');

      let voyagerQuery = q;
      if (bbox) {
        const bboxCoords = bbox.split(',').map(Number);
        if (bboxCoords.length === 4) {
          voyagerQuery += ` AND bbox:[${bboxCoords[1]},${bboxCoords[0]} TO ${bboxCoords[3]},${bboxCoords[2]}]`;
        }
      }

      const voyagerUrl = `https://ogc-sdi.voyagersearch.com/solr/v0/select?q=${encodeURIComponent(voyagerQuery)}&wt=json&rows=${limit}&start=${offset}`;

      const voyagerResponse = await fetch(voyagerUrl);
      const voyagerData = await voyagerResponse.json();

      const docs = voyagerData.response?.docs || [];
      const totalResults = voyagerData.response?.numFound || 0;

      const records = docs.map((doc: VoyagerDoc) => transformVoyagerToOGCRecord(doc, functionBaseUrl));

      const links: any[] = [
        {
          href: `${functionBaseUrl}/collections/records/items?limit=${limit}&offset=${offset}${q !== '*:*' ? `&q=${encodeURIComponent(q)}` : ''}`,
          rel: 'self',
          type: 'application/geo+json',
          title: 'This document'
        }
      ];

      if (offset > 0) {
        const prevOffset = Math.max(0, offset - limit);
        links.push({
          href: `${functionBaseUrl}/collections/records/items?limit=${limit}&offset=${prevOffset}${q !== '*:*' ? `&q=${encodeURIComponent(q)}` : ''}`,
          rel: 'prev',
          type: 'application/geo+json',
          title: 'Previous page'
        });
      }

      if (offset + limit < totalResults) {
        const nextOffset = offset + limit;
        links.push({
          href: `${functionBaseUrl}/collections/records/items?limit=${limit}&offset=${nextOffset}${q !== '*:*' ? `&q=${encodeURIComponent(q)}` : ''}`,
          rel: 'next',
          type: 'application/geo+json',
          title: 'Next page'
        });
      }

      const collection = {
        type: 'FeatureCollection',
        features: records,
        links: links,
        timeStamp: new Date().toISOString(),
        numberMatched: totalResults,
        numberReturned: records.length
      };

      return new Response(JSON.stringify(collection), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/geo+json",
        },
      });
    }

    if (pathname.includes('/collections/records')) {
      const collection = {
        id: 'records',
        title: 'Geospatial Records',
        description: 'Collection of geospatial data records from Voyager',
        itemType: 'record',
        crs: ['http://www.opengis.net/def/crs/OGC/1.3/CRS84'],
        links: [
          {
            href: `${functionBaseUrl}/collections/records`,
            rel: 'self',
            type: 'application/json',
            title: 'This collection'
          },
          {
            href: `${functionBaseUrl}/collections/records/items`,
            rel: 'items',
            type: 'application/geo+json',
            title: 'Records'
          }
        ]
      };

      return new Response(JSON.stringify(collection), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    const landingPage = {
      title: 'OGC API - Records',
      description: 'API providing access to geospatial records from Voyager in OGC API - Records format',
      links: [
        {
          href: `${functionBaseUrl}`,
          rel: 'self',
          type: 'application/json',
          title: 'This document'
        },
        {
          href: `${functionBaseUrl}/conformance`,
          rel: 'conformance',
          type: 'application/json',
          title: 'Conformance classes'
        },
        {
          href: `${functionBaseUrl}/collections`,
          rel: 'data',
          type: 'application/json',
          title: 'Collections'
        },
        {
          href: 'https://docs.ogc.org/is/20-004/20-004.html',
          rel: 'service-doc',
          type: 'text/html',
          title: 'OGC API - Records specification'
        }
      ]
    };

    if (wantsHtml) {
      return new Response(generateHTMLResponse(landingPage, 'OGC API - Records Landing Page'), {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/html",
        },
      });
    }

    return new Response(JSON.stringify(landingPage), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });

  } catch (error) {
    console.error("OGC Records API error:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        type: 'application/problem+json'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/problem+json",
        },
      }
    );
  }
});