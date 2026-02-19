import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadConfig() {
  const configPath = resolve(process.cwd(), 'config/voyager.json');
  return JSON.parse(readFileSync(configPath, 'utf-8'));
}

export function handleVoyagerProxy(req, res) {
  const config = loadConfig();

  // Use the raw query string to preserve repeated params (e.g. multiple facet.field values)
  const rawQuery = new URL(req.url, 'http://localhost').search;
  const params = new URLSearchParams(rawQuery);

  const targetPath = params.get('path') || '/solr/v0/select';
  const customBaseUrl = params.get('baseUrl');

  let voyagerBaseUrl = config.baseUrl.replace(/\/$/, '');

  if (customBaseUrl) {
    voyagerBaseUrl = customBaseUrl.endsWith('/') ? customBaseUrl.slice(0, -1) : customBaseUrl;
  }

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
