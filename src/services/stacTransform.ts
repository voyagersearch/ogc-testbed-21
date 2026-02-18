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

interface STACItem {
  type: 'Feature';
  stac_version: string;
  stac_extensions?: string[];
  id: string;
  geometry: any;
  bbox: number[];
  properties: {
    datetime: string | null;
    start_datetime?: string;
    end_datetime?: string;
    title?: string;
    description?: string;
    [key: string]: any;
  };
  links: Array<{
    rel: string;
    href: string;
    type?: string;
    title?: string;
  }>;
  assets: {
    [key: string]: {
      href: string;
      title?: string;
      description?: string;
      type?: string;
      roles?: string[];
    };
  };
  collection?: string;
}

interface STACCollection {
  type: 'Collection';
  stac_version: string;
  stac_extensions?: string[];
  id: string;
  title: string;
  description: string;
  license: string;
  extent: {
    spatial: {
      bbox: number[][];
    };
    temporal: {
      interval: (string | null)[][];
    };
  };
  links: Array<{
    rel: string;
    href: string;
    type?: string;
    title?: string;
  }>;
  summaries?: {
    [key: string]: any;
  };
}

export function parseBBox(bboxStr?: string): number[] | null {
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

export function parseGeometry(geoStr?: string, bbox?: number[]): any {
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

export function parseDateTime(doc: VoyagerDoc): { datetime: string | null; start?: string; end?: string } {
  const acquisitionDate = doc.fd_acquisition_date;
  const publishDate = doc.fd_publish_date;
  const modifiedDate = doc.modified;

  const dateStr = acquisitionDate || publishDate || modifiedDate;

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

export function transformVoyagerToSTACItem(doc: VoyagerDoc, baseUrl: string = ''): STACItem {
  const bbox = parseBBox(doc.bbox);
  const geometry = parseGeometry(doc.geo, bbox || undefined);
  const dateInfo = parseDateTime(doc);

  const title = doc.title || doc.name || doc.id;
  const description = doc.abstract || doc.description || '';

  const assets: STACItem['assets'] = {};

  const generatedThumbnail = generateVoyagerThumbnailUrl(doc);
  const thumbnailUrl = generatedThumbnail || doc.thumb;

  if (thumbnailUrl) {
    assets.thumbnail = {
      href: thumbnailUrl,
      title: 'Thumbnail',
      type: 'image/jpeg',
      roles: ['thumbnail']
    };
  }

  if (doc.download) {
    const format = doc.format?.toLowerCase() || '';
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

  const properties: STACItem['properties'] = {
    datetime: dateInfo.datetime,
    title: title,
    description: description
  };

  if (doc.format) properties.format = doc.format;
  if (doc.format_type) properties.format_type = doc.format_type;
  if (doc.keywords) properties.keywords = doc.keywords;
  if (doc.tag_tags) properties.tags = doc.tag_tags;
  if (doc.subject) properties.subject = doc.subject;
  if (doc.grp_Country) properties.country = doc.grp_Country;
  if (doc.grp_Agency) properties.agency = doc.grp_Agency;
  if (doc.bytes) properties.file_size = doc.bytes;
  if (dateInfo.start) properties.start_datetime = dateInfo.start;
  if (dateInfo.end) properties.end_datetime = dateInfo.end;

  const links: STACItem['links'] = [
    {
      rel: 'self',
      href: `${baseUrl}/items/${doc.id}`,
      type: 'application/geo+json'
    }
  ];

  if (doc.fullpath || doc.absolute_path) {
    links.push({
      rel: 'alternate',
      href: doc.fullpath || doc.absolute_path || '',
      type: 'text/html',
      title: 'Original Source'
    });
  }

  const stacItem: STACItem = {
    type: 'Feature',
    stac_version: '1.0.0',
    id: doc.id,
    geometry: geometry,
    bbox: bbox || [],
    properties: properties,
    links: links,
    assets: assets
  };

  return stacItem;
}

export function transformVoyagerToSTACCollection(
  collectionId: string,
  items: VoyagerDoc[],
  title: string,
  description: string = '',
  baseUrl: string = ''
): STACCollection {
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  let minDate: Date | null = null;
  let maxDate: Date | null = null;

  items.forEach(doc => {
    const bbox = parseBBox(doc.bbox);
    if (bbox) {
      minLon = Math.min(minLon, bbox[0]);
      minLat = Math.min(minLat, bbox[1]);
      maxLon = Math.max(maxLon, bbox[2]);
      maxLat = Math.max(maxLat, bbox[3]);
    }

    const dateInfo = parseDateTime(doc);
    if (dateInfo.datetime) {
      const date = new Date(dateInfo.datetime);
      if (!minDate || date < minDate) minDate = date;
      if (!maxDate || date > maxDate) maxDate = date;
    }
  });

  const spatialBbox = (minLon !== Infinity)
    ? [[minLon, minLat, maxLon, maxLat]]
    : [[-180, -90, 180, 90]];

  const temporalInterval: (string | null)[][] = minDate && maxDate
    ? [[minDate.toISOString(), maxDate.toISOString()]]
    : [[null, null]];

  const collection: STACCollection = {
    type: 'Collection',
    stac_version: '1.0.0',
    id: collectionId,
    title: title,
    description: description || `Collection of ${items.length} items`,
    license: 'proprietary',
    extent: {
      spatial: {
        bbox: spatialBbox
      },
      temporal: {
        interval: temporalInterval
      }
    },
    links: [
      {
        rel: 'self',
        href: `${baseUrl}/collections/${collectionId}`,
        type: 'application/json'
      },
      {
        rel: 'items',
        href: `${baseUrl}/collections/${collectionId}/items`,
        type: 'application/geo+json'
      },
      {
        rel: 'root',
        href: `${baseUrl}/`,
        type: 'application/json'
      }
    ]
  };

  return collection;
}

export function transformVoyagerResponseToSTAC(
  voyagerResponse: any,
  baseUrl: string = ''
): { items: STACItem[]; collection: STACCollection } {
  const docs = voyagerResponse.response?.docs || [];
  const totalResults = voyagerResponse.response?.numFound || 0;

  const stacItems = docs.map((doc: VoyagerDoc) => transformVoyagerToSTACItem(doc, baseUrl));

  const collection = transformVoyagerToSTACCollection(
    'voyager-search-results',
    docs,
    'Voyager Search Results',
    `Search results containing ${totalResults} total items`,
    baseUrl
  );

  return {
    items: stacItems,
    collection: collection
  };
}
