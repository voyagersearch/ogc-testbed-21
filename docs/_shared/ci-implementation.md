# CI/CD Implementation Guide

This document describes the standard CI/CD pipeline and code quality tools used across Voyager Search UI projects.

## Overview

The CI pipeline uses GitHub Actions to automate code quality checks, testing, security scanning, and build verification on every push and pull request.

## GitHub Actions Workflow

**File:** `.github/workflows/ci.yml`

### Triggers

- **Push to any branch** - Runs CI on every commit
- **Pull requests to main** - Runs CI before merge

### Pipeline Steps

1. **Checkout** - Clone repository
2. **Setup Node.js 20** - Install Node with npm caching
3. **Install dependencies** - `npm ci`
4. **Type check** - `npm run check`
5. **Lint** - `npm run lint`
6. **Format check** - `npm run format:check`
7. **Tests with coverage** - `npm run test:coverage`
8. **Upload coverage** - Send to Codecov
9. **Security audit** - `npm audit --audit-level=high`
10. **Build** - `npm run build`

### Branch Protection (Manual Setup)

To require CI to pass before merging to main:

1. Go to repository Settings → Branches
2. Click "Add branch protection rule"
3. Branch name pattern: `main`
4. Enable "Require status checks to pass before merging"
5. Select "ci" as a required check
6. Enable "Require branches to be up to date before merging"

## Code Quality Tools

### ESLint

**File:** `eslint.config.js`

Configuration includes:

- TypeScript strict rules
- React and React Hooks rules
- `no-console` rule (errors on `console.log`, allows `console.error`/`console.warn`)
- Unused variable detection

**Commands:**

```bash
npm run lint        # Check for issues
npm run lint:fix    # Auto-fix issues
```

### Prettier

**Files:** `.prettierrc`, `.prettierignore`

Configuration:

- Semicolons enabled
- Single quotes
- Trailing commas (ES5)
- 2-space indentation
- 100 character line width

**Commands:**

```bash
npm run format        # Format all files
npm run format:check  # Check formatting
```

### Pre-commit Hooks (Husky + lint-staged)

**Files:** `.husky/pre-commit`, `package.json` (lint-staged config)

Automatically runs on every commit:

- ESLint with auto-fix on `.ts` and `.tsx` files
- Prettier on all supported files

## NPM Scripts

| Script                  | Description               |
| ----------------------- | ------------------------- |
| `npm run lint`          | Run ESLint                |
| `npm run lint:fix`      | Run ESLint with auto-fix  |
| `npm run format`        | Format with Prettier      |
| `npm run format:check`  | Check Prettier formatting |
| `npm run check`         | TypeScript type checking  |
| `npm run test`          | Run tests in watch mode   |
| `npm run test:run`      | Run tests once            |
| `npm run test:coverage` | Run tests with coverage   |
| `npm run build`         | Build for production      |
| `npm run ci`            | Full CI pipeline locally  |

## Running CI Locally

Before pushing, run the full CI pipeline locally:

```bash
npm run ci
```

This runs: type check → lint → tests → build

## Unit Testing Standards

Unit tests are a **mandatory** part of every code change. The CI pipeline enforces this via the `test:coverage` step.

### Test Framework

All tiers use **Vitest** as the test runner with **React Testing Library** for component testing.

### File Organization

Tests live alongside the code they test:

```
features/search/
├── components/
│   ├── search-filters.tsx
│   ├── search-filters.test.tsx      # Component test
│   └── __tests__/
│       └── search-filters.test.tsx  # Alternative: __tests__ directory
├── api.ts
├── api.test.ts                      # Hook/API test
└── types.ts                         # No test needed (type-only)
```

### What Every PR Must Include

| Change Type      | Required Tests                                        |
| ---------------- | ----------------------------------------------------- |
| New component    | Render test, key interactions, conditional rendering  |
| New hook         | Return values, state changes, error states            |
| New API endpoint | Request/response, error cases, auth checks            |
| Bug fix          | Regression test proving the fix                       |
| Refactor         | Existing tests pass; add tests if coverage gaps found |

### Running Tests

```bash
npm run test          # Watch mode (during development)
npm run test:run      # Single run (before pushing)
npm run test:coverage # With coverage report (CI runs this)
```

### Testing Patterns

**Component test example:**

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { SearchFilters } from './search-filters';

describe('SearchFilters', () => {
  it('renders filter categories', () => {
    render(<SearchFilters filters={mockFilters} onChange={vi.fn()} />);
    expect(screen.getByText('Document Type')).toBeInTheDocument();
  });

  it('calls onChange when a filter is toggled', async () => {
    const onChange = vi.fn();
    render(<SearchFilters filters={mockFilters} onChange={onChange} />);
    await userEvent.click(screen.getByLabelText('PDF'));
    expect(onChange).toHaveBeenCalled();
  });
});
```

---

## Code Documentation Standards

Code documentation is a **mandatory** part of every code change. Well-documented code reduces onboarding time, prevents knowledge silos, and makes code reviews faster.

### JSDoc / TSDoc Standards

**When required:** All exported functions, custom hooks, React components with non-trivial props, and utility functions.

**Format:** TSDoc style (`/** ... */`) with `@param`, `@returns`, and `@example` tags.

**Function documentation example:**

```typescript
/**
 * Builds a Voyager search query from the current filter state.
 *
 * @param filters - Active filter selections from the search panel
 * @param page - Zero-based page index for pagination
 * @returns Formatted query object ready for the Voyager search API
 *
 * @example
 * const query = buildSearchQuery(filters, 0);
 * const results = await voyagerApi.search(query);
 */
export function buildSearchQuery(filters: FilterState, page: number): VoyagerQuery {
```

**React hook documentation example:**

```typescript
/**
 * Manages search filter state with URL synchronization.
 * Reads initial filters from query params and writes changes back.
 *
 * @param defaultFilters - Fallback filter values when URL params are empty
 * @returns Filter state and setter functions
 */
export function useSearchFilters(defaultFilters: FilterState) {
```

**When NOT required:**

- Type-only files (`types.ts`, `schema.ts`) — types are self-documenting
- Simple React component wrappers with obvious props
- Trivial utility functions (`cn()`, `formatDate()`)
- One-line arrow functions with clear names

### Swagger / OpenAPI Standards

**When required:** Every Express route handler in `server/routes.ts`.

**Format:** JSDoc comment blocks compatible with swagger-jsdoc or equivalent tooling.

**Required fields:** summary, description, parameters/requestBody, responses.

**Example:**

```typescript
/**
 * @swagger
 * /api/search:
 *   post:
 *     summary: Execute a search query
 *     description: Searches the Voyager index with the provided filters and pagination
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SearchRequest'
 *     responses:
 *       200:
 *         description: Search results with facets
 *       401:
 *         description: Not authenticated
 */
router.post('/api/search', async (req, res) => {
```

### Inline Comments

**When required:**

- Business logic that isn't obvious from reading the code
- Workarounds with context explaining why the workaround is needed
- Regex patterns (explain what they match)
- Performance-sensitive code (explain the optimization)
- External API quirks or data format assumptions

**Style:** `// Single-line` for brief context. Multi-line `/* Block */` for longer explanations.

**Examples:**

```typescript
// Voyager API returns dates as epoch milliseconds, not ISO strings
const formattedDate = new Date(result.timestamp).toISOString();

// Debounce search input to avoid hammering the API on every keystroke
const debouncedSearch = useMemo(() => debounce((q: string) => setQuery(q), 300), []);

// Cookie names must match what the server sets in auth.ts
const ACCESS_TOKEN_COOKIE = 'access_token';
```

**When NOT required:**

- Self-evident code — don't comment `const count = items.length; // get the count`
- Simple CRUD operations
- Straightforward React rendering logic
- Test files — test names should be descriptive enough

---

## Console Logging Policy

- `console.log` - **Removed** (blocked by ESLint)
- `console.warn` - Allowed for warnings
- `console.error` - Allowed for error handling

Debug logging has been removed from production code. Use proper logging services (e.g., Sentry) for production error tracking.

## Troubleshooting

### ESLint errors on unused variables

Prefix unused variables with underscore: `_unusedVar`

### Pre-commit hook not running

Ensure Husky is installed:

```bash
npm run prepare
```

### CI fails on format check

Run `npm run format` locally and commit the changes.
