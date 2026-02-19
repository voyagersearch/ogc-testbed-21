# Repository Etiquette Guide

This document outlines the standard practices for setting up and maintaining repositories. Use this as a reference when creating new projects or onboarding team members.

## Table of Contents

- [Branching Strategy](#branching-strategy)
- [Dev vs Main Commit Strategy](#dev-vs-main-commit-strategy)
- [CI/CD Pipeline Setup](#cicd-pipeline-setup)
- [Branch Protection Rules](#branch-protection-rules)
- [Production Readiness Checks](#production-readiness-checks)
- [Commit Guidelines](#commit-guidelines)
- [Unit Testing Requirements](#unit-testing-requirements)
- [Documentation Requirements](#documentation-requirements)
- [Code Documentation Standards](#code-documentation-standards)
- [Pull Request Process](#pull-request-process)
- [JIRA Integration](#jira-integration)

> **Related:** For environment setup (Claude Code, JIRA MCP, GitHub CLI), see [ENV_SETUP.md](ENV_SETUP.md).

---

## Branching Strategy

### Branch Structure

| Branch     | Purpose                        | Protected |
| ---------- | ------------------------------ | --------- |
| `main`     | Production-ready code          | Yes       |
| `dev`      | Development integration branch | Yes       |
| `feat/*`   | Feature development            | No        |
| `fix/*`    | Bug fixes                      | No        |
| `hotfix/*` | Production hotfixes            | No        |

### Branch Naming Convention

```
<type>/<ticket-id>-<short-description>
```

**Examples:**

- `feat/TICKET-123-add-user-authentication`
- `fix/TICKET-456-resolve-login-timeout`
- `hotfix/TICKET-789-critical-security-patch`

**Types:**

- `feat` - New feature
- `fix` - Bug fix
- `hotfix` - Critical production fix
- `refactor` - Code refactoring
- `docs` - Documentation only
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

### Workflow

```
main ← dev ← feature branches
```

1. Create feature branches from `dev`
2. Merge feature branches back to `dev` via PR
3. Merge `dev` to `main` for releases
4. Hotfixes can go directly to `main` (then backport to `dev`)

---

## Dev vs Main Commit Strategy

### The Golden Rules

| Rule                                         | Description                              |
| -------------------------------------------- | ---------------------------------------- |
| **Never commit directly to `main` or `dev`** | All changes go through PRs               |
| **All feature work targets `dev`**           | PRs from feature branches → `dev`        |
| **Only `dev` merges to `main`**              | When ready for production release        |
| **Hotfixes are the exception**               | Can PR directly to `main`, then backport |

### Visual Flow

```
Feature Development:
┌─────────────┐    PR     ┌─────────────┐    PR     ┌─────────────┐
│   feature   │ ───────▶  │     dev     │ ───────▶  │    main     │
│   branch    │           │  (staging)  │           │ (production)│
└─────────────┘           └─────────────┘           └─────────────┘
     │                          │                         │
     │ Daily work               │ Integration             │ Releases
     │ Multiple commits         │ testing                 │ only
     └──────────────────────────┴─────────────────────────┘

Hotfix (Emergency):
┌─────────────┐    PR     ┌─────────────┐
│   hotfix    │ ───────▶  │    main     │
│   branch    │           │ (production)│
└─────────────┘           └─────────────┘
                                │
                                │ Backport
                                ▼
                          ┌─────────────┐
                          │     dev     │
                          └─────────────┘
```

### What Goes Where

#### Feature Branch → `dev` (Daily Development)

**Target:** `dev` branch via PR

**Use for:**

- New features
- Bug fixes (non-critical)
- Refactoring
- Test additions
- Documentation updates
- Dependency updates

**Example workflow:**

```bash
# Start from dev
git checkout dev && git pull

# Create feature branch
git checkout -b feat/TICKET-123-add-search-filters

# Work on feature (multiple commits OK)
git add . && git commit -m "feat: add date filter component"
git add . && git commit -m "feat: add keyword filter component"
git add . && git commit -m "test: add filter unit tests"

# Push and create PR targeting dev
git push -u origin feat/TICKET-123-add-search-filters
gh pr create --base dev --title "[TICKET-123] Add search filters"
```

#### `dev` → `main` (Release)

**Target:** `main` branch via PR

**Use for:**

- Scheduled releases
- Accumulated features ready for production
- After QA validation on dev/staging

**Example workflow:**

```bash
# Ensure dev is up to date
git checkout dev && git pull

# Create release PR
gh pr create --base main --head dev --title "Release: v1.2.0"

# After approval and merge, tag the release
git checkout main && git pull
git tag -a v1.2.0 -m "Release v1.2.0"
git push origin v1.2.0
```

#### Hotfix Branch → `main` (Emergency Only)

**Target:** `main` branch directly via PR

**Use for:**

- Critical production bugs
- Security vulnerabilities
- Data corruption issues

**Example workflow:**

```bash
# Start from main (production)
git checkout main && git pull

# Create hotfix branch
git checkout -b hotfix/TICKET-999-fix-auth-bypass

# Make minimal fix
git add . && git commit -m "fix: patch authentication bypass vulnerability"

# Push and create PR targeting main
git push -u origin hotfix/TICKET-999-fix-auth-bypass
gh pr create --base main --title "[HOTFIX][TICKET-999] Fix auth bypass"

# After merge to main, backport to dev
git checkout dev && git pull
git merge main
git push origin dev
```

### Commit Frequency Guidelines

| Branch Type    | Commit Frequency            | Commit Size            |
| -------------- | --------------------------- | ---------------------- |
| Feature branch | Frequent (multiple per day) | Small, focused         |
| `dev`          | Via PR merge only           | Squash or merge commit |
| `main`         | Via PR from `dev` only      | Release batches        |

### PR Requirements by Target

| Target Branch   | Required Checks | Approvals | Notes                  |
| --------------- | --------------- | --------- | ---------------------- |
| `dev`           | CI must pass    | 0-1       | Standard review        |
| `main`          | CI must pass    | 1-2       | Release review         |
| `main` (hotfix) | CI must pass    | 1         | Expedited but reviewed |

### Common Mistakes to Avoid

| Mistake                       | Why It's Bad                | Correct Approach               |
| ----------------------------- | --------------------------- | ------------------------------ |
| Committing directly to `dev`  | Bypasses code review        | Always use feature branch + PR |
| Committing directly to `main` | Untested code in production | Use `dev` → `main` PR          |
| Feature PR to `main`          | Skips integration testing   | PR to `dev` first              |
| Large PRs                     | Hard to review, risky       | Break into smaller PRs         |
| Merging without CI passing    | Broken code in branch       | Wait for green CI              |

---

## CI/CD Pipeline Setup

### GitHub Actions Workflow

The CI workflow is defined in `.github/workflows/ci.yml` and runs on all pushes and PRs.

**Pipeline steps:**

1. Install dependencies
2. Build the project
3. Type check
4. Lint
5. Run tests with coverage
6. Production readiness check
7. Security audit

### Required package.json Scripts

```json
{
  "scripts": {
    "build": "...",
    "dev": "...",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "check": "tsc",
    "check:prod": "tsx scripts/production-readiness-check.ts",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

---

## Branch Protection Rules

### Protection Settings

| Setting                           | Value    | Purpose                                  |
| --------------------------------- | -------- | ---------------------------------------- |
| `required_status_checks.strict`   | `true`   | Branch must be up-to-date before merging |
| `required_status_checks.contexts` | `["ci"]` | CI job must pass                         |
| `required_approving_review_count` | `0-1`    | Number of approvals required             |
| `dismiss_stale_reviews`           | `true`   | New commits invalidate old approvals     |
| `allow_force_pushes`              | `false`  | Prevent history rewriting                |
| `allow_deletions`                 | `false`  | Prevent accidental branch deletion       |

### Setting Up via GitHub UI

1. Go to **Settings** > **Branches**
2. Click **Add branch protection rule**
3. Enter branch name pattern: `main` or `dev`
4. Enable:
   - Require a pull request before merging
   - Require approvals (1 for main, 0 for dev)
   - Dismiss stale pull request approvals when new commits are pushed
   - Require status checks to pass before merging
   - Require branches to be up to date before merging
   - Select status check: `ci`
5. Disable:
   - Allow force pushes
   - Allow deletions

---

## Production Readiness Checks

### Overview

Production readiness checks scan the codebase for issues that linters can't catch:

- Hardcoded IP addresses
- Hardcoded URLs (especially internal/dev URLs)
- AWS hostnames that should be environment variables
- Dev secrets in `.env.example` files
- Large files that need refactoring
- Duplicate constant definitions
- Console statements (should use proper logging)

### Setup

The check runs via: `npm run check:prod`

### Allowlisting Items

When you have legitimate exceptions, add them to `scripts/production-readiness-allowlist.json`:

```json
{
  "hardcodedUrls": ["http://localhost", "https://cdn.example.com"],
  "largeFiles": ["src/pages/complex-page.tsx"]
}
```

---

## Commit Guidelines

### Commit Message Format

```
<type>: <short description>

<optional body explaining the "why">

Co-Authored-By: <name> <email>
```

### Types

| Type       | Description                               |
| ---------- | ----------------------------------------- |
| `feat`     | New feature                               |
| `fix`      | Bug fix                                   |
| `docs`     | Documentation changes                     |
| `style`    | Code style (formatting, semicolons, etc.) |
| `refactor` | Code refactoring                          |
| `test`     | Adding or updating tests                  |
| `chore`    | Maintenance tasks                         |
| `perf`     | Performance improvements                  |
| `ci`       | CI/CD changes                             |

### Examples

```
feat: Add user authentication with OAuth

Implements OAuth2 flow with PKCE for secure browser-based auth.
Session tokens are stored in httpOnly cookies.

Co-Authored-By: Developer Name <dev@example.com>
```

### Rules

- Use imperative mood ("Add feature" not "Added feature")
- Keep first line under 72 characters
- Reference JIRA tickets in PR, not commit messages
- Don't include file lists (git tracks that)

---

## Unit Testing Requirements

**Every code change must include corresponding unit tests.** This is a mandatory part of the development workflow, not an optional follow-up task.

### What to Test

| Change Type  | Required Tests                                              |
| ------------ | ----------------------------------------------------------- |
| New feature  | Tests for all public functions/components and key behaviors |
| Bug fix      | Regression test proving the bug is fixed                    |
| Refactor     | Existing tests still pass; add tests if coverage gaps found |
| API endpoint | Request/response validation, error cases, auth checks       |
| UI component | Render tests, user interaction, conditional rendering       |

### Test Standards

- **Framework:** Vitest (all tiers)
- **Component testing:** React Testing Library (`@testing-library/react`)
- **Naming:** Test files live next to source: `component.test.tsx` or in a `__tests__/` directory
- **Coverage:** New code should have meaningful coverage — focus on behavior, not line count
- **Run before pushing:** `npm run test:run` must pass locally before creating a PR

### When Tests Are Missing

If a PR lacks tests for new or changed behavior, it is **not ready for merge**. The reviewer should request tests before approving.

If working with legacy code that has no existing tests, add tests for the code you're touching at minimum. You are not required to backfill tests for unrelated code.

---

## Documentation Requirements

**Code changes that affect behavior, APIs, or configuration must include documentation updates.** Documentation is part of the definition of done — not a separate task.

### What Requires Documentation Updates

| Change                   | Documentation Needed                                                    |
| ------------------------ | ----------------------------------------------------------------------- |
| New feature or component | Update `CLAUDE.md` in the tier repo (architecture, patterns, key files) |
| New API endpoint         | Update API docs, add to route definitions                               |
| Changed configuration    | Update environment variable docs, `CLAUDE.md` config section            |
| New dependency           | Note in PR description; update setup docs if it requires config         |
| Changed auth flow        | Update authentication section in `CLAUDE.md`                            |
| New shared pattern       | Update `REPO_ETIQUETTE.md` or `ci-implementation.md` in vs-uis-docs     |
| Breaking change          | Clearly document in PR description and `CLAUDE.md`                      |

### Where Documentation Lives

| Scope                                           | Location                         |
| ----------------------------------------------- | -------------------------------- |
| Tier-specific (architecture, features, setup)   | `CLAUDE.md` in the tier repo     |
| Cross-tier standards (workflow, CI, JIRA)       | `shared/` in vs-uis-docs         |
| Cross-tier platform concerns                    | `platform/` in vs-uis-docs       |
| Tier-specific reference docs (deployment, PRDs) | `exports/<tier>/` in vs-uis-docs |

### When Documentation Is Missing

If a PR introduces new behavior without updating relevant docs, it is **not ready for merge**. The reviewer should request documentation before approving.

---

## Code Documentation Standards

**Code-level documentation is mandatory for every code change.** This includes JSDoc/TSDoc for exported functions, Swagger/OpenAPI for API endpoints, and inline comments where logic isn't self-evident.

### When Code Documentation Is Required

| Change Type                                         | Required Documentation                                         |
| --------------------------------------------------- | -------------------------------------------------------------- |
| New exported function/hook/utility                  | JSDoc/TSDoc with description, `@param`, `@returns`, `@example` |
| New API endpoint (Express route)                    | Swagger/OpenAPI JSDoc comment block                            |
| Complex business logic                              | Inline comments explaining the "why"                           |
| Non-obvious algorithm or workaround                 | Inline comment with context                                    |
| Type-only files, trivial getters, self-evident code | No documentation required                                      |

### Self-Evident Code Exception

Not everything needs documentation. Do NOT add comments to:

- Simple getters or one-line utilities with clear names
- Straightforward CRUD operations
- Obvious React rendering logic
- Type definitions (types are self-documenting)
- Test files (test names should be descriptive)

Only add comments where the logic **isn't immediately clear** from reading the code. A well-named function with typed parameters often needs no comment at all.

### When Code Documentation Is Missing

If a PR adds new exports, API endpoints, or complex logic without corresponding documentation, it is **not ready for merge**. The reviewer should request code documentation before approving.

> **Detailed standards and examples:** See [ci-implementation.md — Code Documentation Standards](ci-implementation.md#code-documentation-standards) for JSDoc, Swagger, and inline comment format guidance with examples.

---

## Pull Request Process

### Creating a PR

1. **Title format:** `[TICKET-123] Short description`
2. **Description template:**

```markdown
## Summary

- Brief bullet points of changes

## Test plan

- [ ] Unit tests added/updated for changed behavior
- [ ] All tests pass (`npm run test:run`)
- [ ] Manual testing completed
- [ ] Edge cases covered

## Documentation

- [ ] CLAUDE.md updated (if architecture, features, or config changed)
- [ ] Shared docs updated in vs-uis-docs (if workflow or standards changed)
- [ ] JSDoc/TSDoc added for new exported functions, hooks, and utilities
- [ ] Swagger/OpenAPI docs added for new API endpoints
- [ ] Inline comments added where logic isn't self-evident
- [ ] N/A — no documentation changes needed

## Screenshots (if applicable)

<!-- Add screenshots for UI changes -->

## Related tickets

- TICKET-123
```

### PR Checklist

Before requesting review:

- [ ] CI passes (build, lint, tests, type check)
- [ ] **Unit tests added/updated** for all new or changed behavior
- [ ] **Documentation updated** (CLAUDE.md, shared docs, or marked N/A in PR)
- [ ] **Code documentation added** (JSDoc/TSDoc for exports, Swagger for endpoints, inline comments for complex logic)
- [ ] Production readiness check passes
- [ ] Self-review completed
- [ ] No console.log statements (use proper logging)
- [ ] No hardcoded values that should be config

### Post-Merge Workflow

1. **Merge the PR** to `dev`
2. **Transition JIRA** to "In Review"
3. **Ask the developer** if they want to delete the feature branch
4. **Update JIRA ticket** status after review

**Branch cleanup commands (when developer confirms):**

```bash
# Delete remote branch
git push origin --delete feat/TICKET-123-description

# Delete local branch
git checkout dev && git pull
git branch -d feat/TICKET-123-description
```

---

## JIRA Integration

### Workflow States

| State       | Trigger               |
| ----------- | --------------------- |
| Open        | Ticket created        |
| In Progress | Developer starts work |
| In Review   | PR created            |
| Done        | PR merged             |

### Linking JIRA to GitHub

1. Include ticket ID in branch name: `feat/TICKET-123-description`
2. Include ticket ID in PR title: `[TICKET-123] Description`
3. JIRA will auto-link based on these patterns

---

## Quick Reference

### New Repository Checklist

- [ ] Initialize repo with README
- [ ] Add `.gitignore` appropriate for tech stack
- [ ] Create `main` and `dev` branches
- [ ] Set up branch protection rules
- [ ] Create `.github/workflows/ci.yml`
- [ ] Add production readiness check script
- [ ] Configure test coverage reporting
- [ ] Add `CLAUDE.md` with project-specific instructions
- [ ] Create initial JIRA epic for the project

### Developer Daily Workflow

```bash
# 1. Start from dev
git checkout dev && git pull

# 2. Create feature branch
git checkout -b feat/TICKET-123-description

# 3. Write code + tests together
git add . && git commit -m "feat: add search filter component"
git add . && git commit -m "test: add search filter unit tests"

# 4. Add documentation (CLAUDE.md, JSDoc, Swagger, inline comments)
git add . && git commit -m "docs: add JSDoc and update CLAUDE.md for search filters"

# 5. Verify everything passes locally
npm run test:run && npm run check && npm run lint

# 6. Push and create PR
git push -u origin feat/TICKET-123-description
gh pr create --base dev --title "[TICKET-123] Description"

# 7. After CI passes, merge via GitHub UI
# 8. Delete local branch
git checkout dev && git pull && git branch -d feat/TICKET-123-description
```
