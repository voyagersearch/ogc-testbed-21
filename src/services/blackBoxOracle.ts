interface BlackBoxResponse {
  modifiedQuery: string;
  message: string;
  action: 'added' | 'removed' | 'negated' | 'unchanged';
}

const SAMPLE_TERMS = [
  'geospatial', 'data', 'report', 'analysis', 'map', 'vector', 'raster',
  'shapefile', 'statistics', 'agriculture', 'climate', 'environment',
  'population', 'infrastructure', 'boundary', 'satellite', 'imagery'
];

export async function callBlackBoxOracle(query: string): Promise<BlackBoxResponse> {
  await new Promise(resolve => setTimeout(resolve, 800));

  if (!query || query.trim() === '' || query === '*:*') {
    return {
      modifiedQuery: query,
      message: 'BlackBox Oracle: No modification needed for wildcard search',
      action: 'unchanged'
    };
  }

  const actions: Array<'added' | 'removed' | 'negated'> = ['added', 'removed', 'negated'];
  const action = actions[Math.floor(Math.random() * actions.length)];

  const words = query.trim().split(/\s+/).filter(w => w.length > 0);

  let modifiedQuery = query;
  let message = '';

  switch (action) {
    case 'added': {
      const newTerm = SAMPLE_TERMS[Math.floor(Math.random() * SAMPLE_TERMS.length)];
      if (!words.includes(newTerm)) {
        modifiedQuery = words.length > 0 ? `${query} ${newTerm}` : newTerm;
        message = `BlackBox Oracle: Added term "${newTerm}" to enhance search relevance`;
      } else {
        modifiedQuery = query;
        message = 'BlackBox Oracle: No modification applied';
      }
      break;
    }

    case 'removed': {
      if (words.length > 1) {
        const indexToRemove = Math.floor(Math.random() * words.length);
        const removedTerm = words[indexToRemove];
        words.splice(indexToRemove, 1);
        modifiedQuery = words.join(' ');
        message = `BlackBox Oracle: Removed term "${removedTerm}" to broaden search scope`;
      } else {
        modifiedQuery = query;
        message = 'BlackBox Oracle: Cannot remove the only search term';
      }
      break;
    }

    case 'negated': {
      if (words.length > 0) {
        const indexToNegate = Math.floor(Math.random() * words.length);
        const term = words[indexToNegate];

        if (term.startsWith('-')) {
          words[indexToNegate] = term.substring(1);
          message = `BlackBox Oracle: Removed negation from "${term}" to include results`;
        } else {
          words[indexToNegate] = `-${term}`;
          message = `BlackBox Oracle: Negated term "${term}" to exclude from results`;
        }

        modifiedQuery = words.join(' ');
      } else {
        modifiedQuery = query;
        message = 'BlackBox Oracle: No terms available to negate';
      }
      break;
    }
  }

  return {
    modifiedQuery,
    message,
    action: modifiedQuery === query ? 'unchanged' : action
  };
}
