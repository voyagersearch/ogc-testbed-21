import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadConfig() {
  const configPath = resolve(__dirname, '../../config/voyager.json');
  return JSON.parse(readFileSync(configPath, 'utf-8'));
}

export function handleVoyagerProxy(req, res) {
  const config = loadConfig();
  const targetPath = req.query.path || '/solr/v0/select';
  const customBaseUrl = req.query.baseUrl;

  let voyagerBaseUrl = config.baseUrl.replace(/\/$/, '');

  if (customBaseUrl) {
    voyagerBaseUrl = customBaseUrl.endsWith('/') ? customBaseUrl.slice(0, -1) : customBaseUrl;
  } else if (targetPath.startsWith('/voyager/api/rest/content')) {
    voyagerBaseUrl = config.voyager.thumbnailBaseUrl;
  }

  const params = new URLSearchParams(req.query);
  params.delete('path');
  params.delete('baseUrl');
  const queryString = params.toString();
  const targetUrl = `${voyagerBaseUrl}${targetPath}${queryString ? `?${queryString}` : ''}`;

  const isImageRequest = targetPath.includes('/thumb');

  const headers = {};
  if (!isImageRequest) {
    headers['Content-Type'] = 'application/json';
    headers['Accept'] = 'application/json';
  }

  const fetchOptions = {
    method: req.method,
    headers,
  };

  if (req.method === 'POST' && req.body) {
    fetchOptions.body = JSON.stringify(req.body);
  }

  fetch(targetUrl, fetchOptions)
    .then(async (response) => {
      if (isImageRequest) {
        const buffer = Buffer.from(await response.arrayBuffer());
        res.set('Content-Type', response.headers.get('Content-Type') || 'image/jpeg');
        res.set('Cache-Control', 'public, max-age=31536000');
        res.status(response.status).send(buffer);
      } else {
        const data = await response.text();
        res.set('Content-Type', response.headers.get('Content-Type') || 'application/json');
        res.status(response.status).send(data);
      }
    })
    .catch((error) => {
      console.error('Proxy error:', error);
      res.status(500).json({ error: error.message });
    });
}
