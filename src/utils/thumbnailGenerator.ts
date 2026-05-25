import { getApiBasePath } from '../config';

export interface VoyagerPreviewData {
  id?: string;
  format?: string;
  path_to_thumb?: string;
  location?: string;
}

export function generateVoyagerThumbnailUrl(doc: VoyagerPreviewData, baseUrl?: string): string | null {
  if (!doc.id || !doc.format || !doc.location) {
    return null;
  }

  try {
    const thumbnailPath = `/api/rest/content/${doc.id}/thumb`;
    const params = new URLSearchParams();
    params.append('path', thumbnailPath);
    params.append('format', doc.format);
    params.append('location', doc.location);

    if (doc.path_to_thumb) {
      params.append('path_to_thumb', doc.path_to_thumb);
    }

    if (baseUrl) {
      params.append('baseUrl', baseUrl);
    }

    const thumbnailUrl = `${getApiBasePath()}/api/voyager-proxy?${params.toString()}`;

    return thumbnailUrl;
  } catch (error) {
    console.error('Error generating thumbnail URL:', error);
    return null;
  }
}
