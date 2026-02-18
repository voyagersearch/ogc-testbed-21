import { generateVoyagerThumbnailUrl } from '../utils/thumbnailGenerator';

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
  wms_layer_name?: string;
  hasPreview?: boolean;
  path_to_preview?: string;
  location?: string;
  [key: string]: any;
}

interface OGCRecord {
  id: string;
  type: 'Feature';
  conformsTo: string[];
  geometry: any;
  properties: {
    type: string;
    title: string;
    description?: string;
    created?: string;
    updated?: string;
    keywords?: string[];
    language?: string;
    externalIds?: Array<{
      scheme: string;
      value: string;
    }>;
    formats?: string[];
    contacts?: Array<{
      name?: string;
      organization?: string;
      position?: string;
      links?: Array<{
        href: string;
        rel?: string;
        type?: string;
      }>;
    }>;
    themes?: Array<{
      concepts: Array<{
        id: string;
        title?: string;
      }>;
      scheme?: string;
    }>;
    license?: string;
    rights?: string;
    extent?: {
      spatial?: {
        bbox: number[][];
        crs?: string;
      };
      temporal?: {
        interval: (string | null)[][];
        trs?: string;
      };
    };
    associations?: Array<{
      associationType: string;
      href: string;
      type?: string;
      title?: string;
    }>;
    [key: string]: any;
  };
  links: Array<{
    href: string;
    rel: string;
    type?: string;
    title?: string;
    hreflang?: string;
  }>;
  linkTemplates?: Array<{
    uriTemplate: string;
    rel: string;
    type?: string;
    title?: string;
    variables?: {
      [key: string]: {
        description: string;
        type?: string;
        enum?: string[];
      };
    };
  }>;
}

interface RecordsCollection {
  type: 'FeatureCollection';
  features: OGCRecord[];
  links: Array<{
    href: string;
    rel: string;
    type?: string;
    title?: string;
  }>;
  timeStamp: string;
  numberMatched: number;
  numberReturned: number;
}

function parseBBox(bboxStr?: string): number[] | null {
  if (!bboxStr || typeof bboxStr !== 'string') return null;

  try {
    const matches = bboxStr.match(/-?[\d.]+/g);
    if (matches && matches.length >= 4) {
      const coords = matches.map(Number);
      return [coords[0], coords[1], coords[2], coords[3]];
    }
  } catch (error) {
    console.error('Error parsing bbox:', error);
  }

  return null;
}

function parseGeometry(geoStr?: string, bbox?: number[]): any {
  if (!geoStr && !bbox) {
    return null;
  }

  if (geoStr && typeof geoStr === 'string' && geoStr.includes('POLYGON')) {
    try {
      const coordsMatch = geoStr.match(/\(\(([^)]+)\)\)/);
      if (coordsMatch) {
        const coordPairs = coordsMatch[1].split(',').map(pair => {
          const [lon, lat] = pair.trim().split(' ').map(Number);
          return [lon, lat];
        });

        return {
          type: 'Polygon',
          coordinates: [coordPairs]
        };
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

export function transformVoyagerToOGCRecord(doc: VoyagerDoc, baseUrl: string = ''): OGCRecord {
  const bbox = parseBBox(doc.bbox);
  const geometry = parseGeometry(doc.geo, bbox || undefined);

  const title = doc.title || doc.name || doc.id;
  const description = doc.abstract || doc.description || '';

  const keywords: string[] = [];
  if (doc.keywords) keywords.push(...doc.keywords);
  if (doc.tag_tags) keywords.push(...doc.tag_tags);
  if (doc.subject) keywords.push(...doc.subject);

  const links: OGCRecord['links'] = [
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

  const properties: OGCRecord['properties'] = {
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

  const themes: Array<{ concepts: Array<{ id: string; title?: string }>; scheme?: string }> = [];

  if (doc.subject && doc.subject.length > 0) {
    themes.push({
      concepts: doc.subject.map(s => ({ id: s, title: s })),
      scheme: 'http://www.example.com/themes'
    });
  }

  if (themes.length > 0) {
    properties.themes = themes;
  }

  if (doc.format_type) {
    properties.recordType = doc.format_type;
  }

  if (doc.bytes) {
    properties.fileSize = doc.bytes;
  }

  const record: OGCRecord = {
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

  return record;
}

export function transformVoyagerToRecordsCollection(
  voyagerResponse: any,
  baseUrl: string = '',
  limit: number = 10,
  offset: number = 0
): RecordsCollection {
  const docs = voyagerResponse.response?.docs || [];
  const totalResults = voyagerResponse.response?.numFound || 0;

  const records = docs.map((doc: VoyagerDoc) => transformVoyagerToOGCRecord(doc, baseUrl));

  const links: RecordsCollection['links'] = [
    {
      href: `${baseUrl}/collections/records/items?limit=${limit}&offset=${offset}`,
      rel: 'self',
      type: 'application/geo+json',
      title: 'This document'
    }
  ];

  if (offset > 0) {
    const prevOffset = Math.max(0, offset - limit);
    links.push({
      href: `${baseUrl}/collections/records/items?limit=${limit}&offset=${prevOffset}`,
      rel: 'prev',
      type: 'application/geo+json',
      title: 'Previous page'
    });
  }

  if (offset + limit < totalResults) {
    const nextOffset = offset + limit;
    links.push({
      href: `${baseUrl}/collections/records/items?limit=${limit}&offset=${nextOffset}`,
      rel: 'next',
      type: 'application/geo+json',
      title: 'Next page'
    });
  }

  const collection: RecordsCollection = {
    type: 'FeatureCollection',
    features: records,
    links: links,
    timeStamp: new Date().toISOString(),
    numberMatched: totalResults,
    numberReturned: records.length
  };

  return collection;
}

export type { VoyagerDoc, OGCRecord, RecordsCollection };
