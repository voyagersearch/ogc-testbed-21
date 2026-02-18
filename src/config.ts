const STORAGE_KEY_BASE_URL = 'voyager_base_url';
const STORAGE_KEY_TEMPLATE_ID = 'voyager_display_template_id';
const STORAGE_KEY_TRANSFORM_API = 'transform_api_url';
const STORAGE_KEY_STANDARDS_API = 'standards_api_url';
const DEFAULT_BASE_URL = 'https://ogc-sdi.voyagersearch.com/';
const DEFAULT_TEMPLATE_ID = 'D187992491DF';
const DEFAULT_TRANSFORM_API_URL = 'https://5d1fdadf-2421-4bad-b325-331537848150.spock.prod.repl.run/api/transform';
const DEFAULT_STANDARDS_API_URL = 'https://voyager-rulesengine-shruti41.replit.app/api/standards';

export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY_BASE_URL);
    return stored || DEFAULT_BASE_URL;
  }
  return DEFAULT_BASE_URL;
}

export function setBaseUrl(url: string): void {
  if (typeof window !== 'undefined') {
    // Ensure URL ends with /
    const normalizedUrl = url.endsWith('/') ? url : `${url}/`;
    localStorage.setItem(STORAGE_KEY_BASE_URL, normalizedUrl);
  }
}

export function getDisplayTemplateId(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY_TEMPLATE_ID);
    return stored || DEFAULT_TEMPLATE_ID;
  }
  return DEFAULT_TEMPLATE_ID;
}

export function setDisplayTemplateId(id: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_TEMPLATE_ID, id);
  }
}

export function getTransformApiUrl(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY_TRANSFORM_API);
    return stored || DEFAULT_TRANSFORM_API_URL;
  }
  return DEFAULT_TRANSFORM_API_URL;
}

export function setTransformApiUrl(url: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_TRANSFORM_API, url);
  }
}

export function getStandardsApiUrl(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY_STANDARDS_API);
    return stored || DEFAULT_STANDARDS_API_URL;
  }
  return DEFAULT_STANDARDS_API_URL;
}

export function setStandardsApiUrl(url: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_STANDARDS_API, url);
  }
}

export const config = {
  voyagerApiUrl: 'https://ogc-sdi.voyagersearch.com/solr/v0',
};
