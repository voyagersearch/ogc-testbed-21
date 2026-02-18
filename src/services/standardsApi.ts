import { getStandardsApiUrl } from '../config';

export interface Standard {
  id: string;
  name: string;
  description: string;
  mandatoryFieldsTotal: number;
}

let cachedStandards: Standard[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

export async function fetchStandards(forceRefresh = false): Promise<Standard[]> {
  const now = Date.now();

  if (!forceRefresh && cachedStandards && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedStandards;
  }

  const fallbackStandards: Standard[] = [
    {
      id: 'iso19115',
      name: 'ISO 19115',
      description: 'ISO 19115 Geographic Information - Metadata',
      mandatoryFieldsTotal: 11
    },
    {
      id: 'fgdc',
      name: 'FGDC CSDGM',
      description: 'Federal Geographic Data Committee Content Standard for Digital Geospatial Metadata',
      mandatoryFieldsTotal: 17
    },
    {
      id: 'landsat',
      name: 'Landsat Data Dictionary',
      description: 'Landsat Collection 2 Level-1 Data Dictionary',
      mandatoryFieldsTotal: 20
    }
  ];

  try {
    const standardsApiUrl = getStandardsApiUrl();
    const response = await fetch(standardsApiUrl, {
      mode: 'cors',
      credentials: 'omit',
    });

    if (!response.ok) {
      console.warn(`Standards API returned ${response.status}, using fallback`);
      return fallbackStandards;
    }

    const data = await response.json();
    const standards: Standard[] = data.standards || data;

    cachedStandards = standards;
    cacheTimestamp = now;

    return standards;
  } catch (error) {
    console.warn('Standards API unavailable, using fallback standards');

    if (cachedStandards) {
      return cachedStandards;
    }

    return fallbackStandards;
  }
}

export function clearStandardsCache(): void {
  cachedStandards = null;
  cacheTimestamp = 0;
}
