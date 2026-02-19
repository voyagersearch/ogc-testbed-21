import voyagerConfig from '../config/voyager.json';

const STORAGE_KEY_BASE_URL = 'voyager_base_url';
const STORAGE_KEY_TEMPLATE_ID = 'voyager_display_template_id';
const STORAGE_KEY_TRANSFORM_API = 'transform_api_url';
const STORAGE_KEY_STANDARDS_API = 'standards_api_url';

export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY_BASE_URL);
    return stored || voyagerConfig.baseUrl;
  }
  return voyagerConfig.baseUrl;
}

export function setBaseUrl(url: string): void {
  if (typeof window !== 'undefined') {
    const normalizedUrl = url.endsWith('/') ? url : `${url}/`;
    localStorage.setItem(STORAGE_KEY_BASE_URL, normalizedUrl);
  }
}

export function getDisplayTemplateId(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY_TEMPLATE_ID);
    return stored || voyagerConfig.voyager.displayTemplateId;
  }
  return voyagerConfig.voyager.displayTemplateId;
}

export function setDisplayTemplateId(id: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_TEMPLATE_ID, id);
  }
}

export function getTransformApiUrl(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY_TRANSFORM_API);
    return stored || voyagerConfig.transformApi.url;
  }
  return voyagerConfig.transformApi.url;
}

export function setTransformApiUrl(url: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_TRANSFORM_API, url);
  }
}

export function getStandardsApiUrl(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY_STANDARDS_API);
    return stored || voyagerConfig.standardsApi.url;
  }
  return voyagerConfig.standardsApi.url;
}

export function setStandardsApiUrl(url: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_STANDARDS_API, url);
  }
}

export const config = {
  voyagerApiUrl: `${voyagerConfig.baseUrl}solr/v0`,
};
