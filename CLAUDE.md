# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The OGC Testbed 21 Voyager Search UI is a React+Vite+TypeScript application that provides a geospatial data search and discovery interface on top of Voyager Search. It presents results in multiple OGC-standard formats: native Voyager, STAC (SpatioTemporal Asset Catalog), and OGC API - Records.

**Product Name**: Voyager Search
**Organization**: Voyager Search

## Multi-Tier Architecture

Voyager Search UIs are **not a monorepo**. Each tier lives in its own repository:

| Repo | Purpose |
|------|---------|
| `knowledge-ui-web` | Knowledge Search web UI |
| `analyst-ui-web` | Analyst Search web UI |
| `analyst-search-ios` | Analyst Search iOS app (planned) |
| `ogc-testbed-21` | OGC Testbed 21 Voyager Search UI |
| `vs-uis-docs` | Central documentation hub (syncs docs to tier repos via CI) |

## Development Commands

### Running the Application

```bash
npm run dev           # Development mode (Vite dev server with proxy)
```

### Building & Production

```bash
npm run build    # Build for production
npm start        # Run Express production server
```

### Type Checking

```bash
npm run typecheck   # TypeScript type checking
npm run lint        # ESLint
```

## Architecture

### Project Structure

```
ogc-testbed-21/
├── config/
│   └── voyager.json          # Centralized configuration (all URLs, settings)
├── server/
│   ├── index.js              # Express production server
│   └── routes/
│       ├── voyager-proxy.js  # Voyager API proxy
│       ├── ogc-records-api.js # OGC Records API
│       └── stac-api.js       # STAC API
├── src/
│   ├── components/           # React UI components
│   ├── services/             # API clients and data transforms
│   ├── utils/                # Utility functions
│   ├── config.ts             # Config loader (reads voyager.json + localStorage overrides)
│   ├── App.tsx               # Main application component
│   └── main.tsx              # Entry point
├── vite.config.ts            # Vite config with dev proxy plugin
└── CLAUDE.md
```

### State Management

React `useState` hooks in `App.tsx`. The main `AppState` interface manages search query, results, facets, interface mode, and loading states.

### Authentication Flow

No authentication. The app is public and stateless.

### Configuration System

All runtime configuration lives in `config/voyager.json`:
- `baseUrl` — Voyager instance URL
- `voyager.displayTemplateId` — Display template ID
- `voyager.solrPath` — Solr endpoint path
- `transformApi.url` — Metadata transform API URL
- `standardsApi.url` — Standards/rules engine API URL
- `pagination` — Default page size and sort

The Settings panel in the UI allows users to override values via `localStorage`. The `src/config.ts` module reads from `voyager.json` first, then checks `localStorage` for overrides.

### Feature Organization

Four interface modes controlled by `InterfaceToggle`:
- **Home** (`ApiLandingPage`) — API endpoint listing
- **Voyager** (`VoyagerInterface`) — Native Voyager search with facets
- **STAC Browser** (`STACBrowserInterface`) — STAC items with Leaflet map
- **OGC Records** (`RecordsBrowserInterface`) — OGC API - Records format

### Server Architecture

- **Development**: Vite dev server with custom middleware plugin proxies `/api/*` routes
- **Production**: Express server serves built static files + `/api/*` proxy/API routes
- Both share route handler modules from `server/routes/`

## Key Technical Patterns

### API Requests

All Voyager API requests go through `/api/voyager-proxy` which forwards to the configured Voyager instance. The proxy handles CORS and supports both JSON and image responses.

```ts
// voyagerApi.ts pattern
const proxyUrl = '/api/voyager-proxy';
const params = new URLSearchParams();
params.append('path', '/solr/v0/select');
// ... add query params
const response = await fetch(`${proxyUrl}?${params.toString()}`);
```

### Data Transforms

- `src/services/stacTransform.ts` — Voyager → STAC items (client-side)
- `src/services/recordsTransform.ts` — Voyager → OGC Records (client-side)
- `server/routes/ogc-records-api.js` — Voyager → OGC Records (server-side)
- `server/routes/stac-api.js` — Voyager → STAC (server-side)

### Error Handling

- API errors are caught and stored in `state.error`, displayed as banner alerts
- Proxy errors return 500 with JSON error message
- Image load failures show fallback icons

### Type Safety

- TypeScript strict mode enabled
- Interfaces defined for `AppState`, `VoyagerSearchParams`, `VoyagerResponse`

### Development Notes

**Configuration:**

- All configurable values are in `config/voyager.json` — never hardcode URLs in source
- Set in `config/voyager.json` for defaults, override via Settings UI (persisted in localStorage)

## Important Constraints

1. **No database**: All data comes from Voyager Search API — no local storage of records
2. **No authentication**: The app is public
3. **Voyager is canonical**: All search data comes from the Voyager Solr index
4. **Config-driven**: All URLs and settings must come from `config/voyager.json`, not hardcoded

## Standards & Processes

- **Environment setup** (Claude Code, JIRA MCP, GitHub CLI, IDE): See [docs/_shared/ENV_SETUP.md](docs/_shared/ENV_SETUP.md)
- **Git workflow & PR process** (branching, commits, CI/CD, branch protection): See [docs/_shared/REPO_ETIQUETTE.md](docs/_shared/REPO_ETIQUETTE.md)
- **JIRA workflow** (issue tracking, board transitions): See [docs/_shared/jira-flow.md](docs/_shared/jira-flow.md)
- **Production readiness**: See [docs/_platform/production-readiness-report.md](docs/_platform/production-readiness-report.md)

### Git Workflow (Quick Reference)

1. Create feature branch from `dev`: `git checkout -b feat/TICKET-123-description`
2. Make changes, commit with descriptive messages
3. Create PR targeting `dev`: `gh pr create --base dev --title "TICKET-123 Description"`
4. Wait for CI to pass
5. Never merge directly to `main`

### Issue Tracking Integration (JIRA)

**Order of Operations (NON-NEGOTIABLE):**

1. **Ticket exists?** If not, create one in JIRA first
2. **Create feature branch** from `dev` — `git checkout dev && git pull && git checkout -b feat/TICKET-123-description`
3. **Move ticket to "In Progress"** on the JIRA board
4. **NOW you may write code** on the feature branch

Do not:
- Fix code first, then create a ticket (wrong order)
- Create a ticket and immediately close it (skips the workflow)
- Make changes on `dev` or `main` (protected branches)

**Team Members:**

| Name | GitHub Handle | Role |
|------|---------------|------|
| Harold Bostic | @hbostic | Owner |

### Merge Rules

**NEVER merge directly to `main`.** The ONLY way code gets to `main` is:

1. Feature branches merge to `dev` via PR
2. `dev` merges to `main` via release PR

**Before running `gh pr merge`:**

1. Run `gh pr view <number> --json baseRefName` to verify target is `dev`
2. If baseRefName is `main`, STOP and ask the user
3. Run `gh pr checks <number>` — ALL checks must show passed
4. If CI is still running or has failed, STOP and wait/report to user

### Close-Out Process

When the user confirms testing is complete and asks to "close out" or "finish" a ticket, execute these steps in order:

1. **Verify PR target**: `gh pr view <number> --json baseRefName` — MUST be `dev`
2. **Verify CI passed**: `gh pr checks <number>` — ALL checks must pass
3. **Verify unit tests exist**: Confirm the PR includes tests for new or changed behavior. If tests are missing, flag it before merging.
4. **Verify documentation updated**: Confirm relevant docs (CLAUDE.md, shared docs) are updated for any new features, config changes, or API changes. If docs are missing, flag it before merging.
5. **Merge PR** (only after steps 1-4 pass)
6. **Document on the ticket**: Add a comment with PR link, summary of changes, and files modified
7. **Move ticket to "In Review"** and assign to the appropriate reviewer
8. **Ask to delete the feature branch**
9. **Production readiness check**: Review changes against known production readiness concerns:
   - Hardcoded environment configuration
   - Sensitive logging or credentials
   - Input validation gaps
   - Security misses
   - Dead or divergent code
   - Placeholder content

This process can be triggered by saying "close out", "finish the ticket", or "put it through the close out process".

### Release Process

After testing is complete on `dev`, a separate PR from `dev` to `main` is created for release.

## Related Documentation

- Platform readiness: [docs/_platform/production-readiness-report.md](docs/_platform/production-readiness-report.md)
- Environment setup: [docs/_shared/ENV_SETUP.md](docs/_shared/ENV_SETUP.md)
- Repository standards: [docs/_shared/REPO_ETIQUETTE.md](docs/_shared/REPO_ETIQUETTE.md)
- JIRA workflow: [docs/_shared/jira-flow.md](docs/_shared/jira-flow.md)
