import express from 'express';
import cors from 'cors';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { handleVoyagerProxy } from './routes/voyager-proxy.js';
import { createOGCRecordsRouter } from './routes/ogc-records-api.js';
import { createSTACRouter } from './routes/stac-api.js';

const configPath = resolve(process.cwd(), 'config/voyager.json');
const config = JSON.parse(readFileSync(configPath, 'utf-8'));

const app = express();
const PORT = config.server.port || 5002;
const basePath = (config.server.basePath || '').replace(/\/$/, '');

app.use(cors());
app.use(express.json());

// API routes — register at both /api/... and {basePath}/api/...
app.all('/api/voyager-proxy', handleVoyagerProxy);
app.use('/api/ogc-records-api', createOGCRecordsRouter());
app.use('/api/stac-api', createSTACRouter());

if (basePath) {
  app.all(`${basePath}/api/voyager-proxy`, handleVoyagerProxy);
  app.use(`${basePath}/api/ogc-records-api`, createOGCRecordsRouter());
  app.use(`${basePath}/api/stac-api`, createSTACRouter());
}

// Serve static files from the built frontend
const distPath = resolve(process.cwd(), 'dist');

if (basePath) {
  // Serve static assets under basePath
  app.use(basePath, express.static(distPath));

  // Redirect root to basePath
  app.get('/', (_req, res) => {
    res.redirect(302, basePath);
  });

  // SPA fallback for basePath routes
  app.get(basePath, (_req, res) => {
    res.sendFile(resolve(distPath, 'index.html'));
  });
  app.get(`${basePath}/*`, (_req, res) => {
    res.sendFile(resolve(distPath, 'index.html'));
  });
} else {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(resolve(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}${basePath || '/'}`);
  console.log(`Voyager proxy:     ${basePath}/api/voyager-proxy`);
  console.log(`OGC Records API:   ${basePath}/api/ogc-records-api`);
  console.log(`STAC API:          ${basePath}/api/stac-api`);
});
