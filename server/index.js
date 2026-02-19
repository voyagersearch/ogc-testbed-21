import express from 'express';
import cors from 'cors';
import { resolve, dirname } from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { handleVoyagerProxy } from './routes/voyager-proxy.js';
import { createOGCRecordsRouter } from './routes/ogc-records-api.js';
import { createSTACRouter } from './routes/stac-api.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const configPath = resolve(__dirname, '../config/voyager.json');
const config = JSON.parse(readFileSync(configPath, 'utf-8'));

const app = express();
const PORT = config.server.port || 3001;

app.use(cors());
app.use(express.json());

// API routes
app.all('/api/voyager-proxy', handleVoyagerProxy);
app.use('/api/ogc-records-api', createOGCRecordsRouter());
app.use('/api/stac-api', createSTACRouter());

// Serve static files from the built frontend
const distPath = resolve(__dirname, '../dist');
app.use(express.static(distPath));

// SPA fallback — serve index.html for any non-API route
app.get('*', (req, res) => {
  res.sendFile(resolve(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Voyager proxy:     /api/voyager-proxy`);
  console.log(`OGC Records API:   /api/ogc-records-api`);
  console.log(`STAC API:          /api/stac-api`);
});
