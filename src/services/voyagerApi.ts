import { getBaseUrl, getDisplayTemplateId } from '../config';

export function getApiBaseUrl(): string {
  const baseUrl = getBaseUrl();
  return `${baseUrl.replace(/\/$/, '')}/solr/v0`;
}

interface DisplayTemplateFilter {
  field: string;
  style?: string;
}

interface DisplayTemplateConfig {
  filters: DisplayTemplateFilter[];
  [key: string]: any;
}

interface VoyagerSearchParams {
  q?: string;
  fq?: string[];
  rows?: number;
  start?: number;
  wt?: string;
  fl?: string;
  [key: string]: any;
}

interface VoyagerResponse {
  response: {
    docs: any[];
    numFound: number;
  };
  facet_counts?: any;
  facets?: any;
}

interface FacetField {
  name: string;
  stype: string;
  multivalued: boolean;
  disp: string;
}

export async function fetchDisplayTemplate(): Promise<DisplayTemplateConfig | null> {
  try {
    const templateId = getDisplayTemplateId();
    const proxyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voyager-proxy`;
    const path = `/api/rest/display/config/${templateId}`;

    const proxyParams = new URLSearchParams();
    proxyParams.append('path', path);

    const url = `${proxyUrl}?${proxyParams.toString()}`;
    console.log('Fetching display template via proxy:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch display template: ${response.status}`);
      return null;
    }

    const data = await response.json();
    console.log('Display template data:', data);
    return data;
  } catch (error) {
    console.error('Error fetching display template:', error);
    return null;
  }
}

async function fetchVoyagerAPI(
  endpoint: string,
  params?: VoyagerSearchParams,
  method: 'GET' | 'POST' = 'GET'
): Promise<VoyagerResponse> {
  try {
    console.log('Environment variables:', import.meta.env);

    const proxyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voyager-proxy`;
    let path = `/solr/v0${endpoint}`;

    const proxyParams = new URLSearchParams();
    proxyParams.append('path', path);

    if (method === 'GET' && params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        if (Array.isArray(value)) {
          value.forEach(v => proxyParams.append(key, v));
        } else {
          proxyParams.append(key, value.toString());
        }
      });
    }

    const url = `${proxyUrl}?${proxyParams.toString()}`;
    console.log('Fetching via proxy:', url);

    let options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    if (method === 'POST' && params) {
      options.body = JSON.stringify(params);
    }

    const response = await fetch(url, options);

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response:', text.substring(0, 500));
      throw new Error(`Expected JSON response but got: ${contentType || 'unknown'}. Response: ${text.substring(0, 200)}`);
    }

    const data = await response.json();

    if (!response.ok) {
      console.error('Error response:', data);
      if (data.response && data.response.docs) {
        console.log('API returned 400 but has valid data, using it anyway');
        return data;
      }
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return data;
  } catch (error) {
    console.error('Voyager API Error:', error);
    throw error;
  }
}

function buildQueryString(params: VoyagerSearchParams): string {
  const urlParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (Array.isArray(value)) {
      value.forEach(v => urlParams.append(key, v));
    } else {
      urlParams.append(key, value.toString());
    }
  });

  return urlParams.toString();
}

export async function fetchFacets(
  query: string = '*:*',
  facetFilters: Record<string, string[]> = {},
  displayTemplate?: DisplayTemplateConfig | null
): Promise<VoyagerResponse> {
  const fq: string[] = [];

  Object.entries(facetFilters).forEach(([facetName, values]) => {
    if (values.length > 0) {
      const filterQuery = values.length === 1
        ? `${facetName}:"${values[0]}"`
        : `{!tag=${facetName}}${facetName}:(${values.map(v => `"${v}"`).join(' OR ')})`;
      fq.push(filterQuery);
    }
  });

  const facetFields: string[] = [];
  const facetParams: Record<string, string> = {};

  if (displayTemplate && displayTemplate.filters) {
    displayTemplate.filters.forEach((filter: DisplayTemplateFilter) => {
      const field = filter.field;
      const hasCheckStyle = filter.style === 'CHECK';

      if (hasCheckStyle) {
        facetFields.push(`{!ex=${field}}${field}`);
      } else {
        facetFields.push(field);
      }

      facetParams[`f.${field}.facet.mincount`] = '1';

      if (field.includes('Geography') || field.includes('Region') || field.includes('State') ||
          field.includes('County') || field.includes('Bureau') || field.includes('Department')) {
        facetParams[`f.${field}.facet.sort`] = 'index';
      }
    });
  }

  const params: VoyagerSearchParams = {
    q: query,
    fq: fq.length > 0 ? fq : undefined,
    rows: 0,
    wt: 'json',
    facet: 'true',
    'facet.mincount': '1',
    'facet.limit': '11',
    'facet.field': facetFields.length > 0 ? facetFields : ['{!ex=format}format'],
    ...facetParams
  };

  return fetchVoyagerAPI('/select', params, 'GET');
}

export async function searchVoyager(
  query: string,
  facetFilters: Record<string, string[]> = {},
  start: number = 0,
  rows: number = 48
): Promise<VoyagerResponse> {
  const fq: string[] = [];

  Object.entries(facetFilters).forEach(([facetName, values]) => {
    if (values.length > 0) {
      const filterQuery = values.length === 1
        ? `${facetName}:"${values[0]}"`
        : `{!tag=${facetName}}${facetName}:(${values.map(v => `"${v}"`).join(' OR ')})`;
      fq.push(filterQuery);
    }
  });

  const params: VoyagerSearchParams = {
    q: query || '*:*',
    fq: fq.length > 0 ? fq : undefined,
    rows,
    start,
    wt: 'json',
    // Original restricted field list (saved for potential revert):
    // fl: 'id,title,name:[name],format,abstract,fullpath:[absolute],absolute_path:[absolute],thumb:[thumbURL],path_to_thumb,subject,download:[downloadURL],format_type,bytes,modified,shard:[shard],bbox,geo:[geo],format_category,component_files,ags_fused_cache,linkcount__children,contains_name,wms_layer_name,tag_flags,hasMissingData,layerURL:[lyrURL],hasLayerFile,likes,dislikes,grp_Country,fl_views,views,description,keywords,fd_acquisition_date,name,name_alias,tag_tags,fd_publish_date,grp_Agency,fs_english_name,fs_title,fs_product_detail_link',
    fl: '*,thumb:[thumbURL]',
    'extent.bbox': 'true',
    'block': 'true',
    'sort': 'bytes desc'
  };

  return fetchVoyagerAPI('/select', params, 'GET');
}

export async function fetchFacetMetadata(): Promise<FacetField[]> {
  try {
    const proxyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voyager-proxy`;
    const path = `/api/rest/i18n/fields`;

    const proxyParams = new URLSearchParams();
    proxyParams.append('path', path);

    const url = `${proxyUrl}?${proxyParams.toString()}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch facet metadata: ${response.status}`);
    }

    const data = await response.json();
    return data.filter((field: FacetField) => field.name.startsWith('grp_') || field.name.startsWith('cat_'));
  } catch (error) {
    console.error('Error fetching facet metadata:', error);
    return [];
  }
}

export function buildQueryUrl(
  query: string,
  facetFilters: Record<string, string[]> = {}
): string {
  const fq: string[] = [];

  Object.entries(facetFilters).forEach(([facetName, values]) => {
    if (values.length > 0) {
      const filterQuery = values.length === 1
        ? `${facetName}:"${values[0]}"`
        : `{!tag=${facetName}}${facetName}:(${values.map(v => `"${v}"`).join(' OR ')})`;
      fq.push(filterQuery);
    }
  });

  const params: VoyagerSearchParams = {
    q: query || '*:*',
    fq: fq.length > 0 ? fq : undefined,
    wt: 'json',
  };

  const queryString = buildQueryString(params);
  return `${getApiBaseUrl()}/select?${queryString}`;
}
