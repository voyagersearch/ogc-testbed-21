# Development Environment Setup

This document covers setting up the development environment, including tooling integrations for Claude Code, JIRA, and GitHub.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Claude Code Setup](#claude-code-setup)
- [JIRA MCP Integration](#jira-mcp-integration)
- [GitHub CLI Setup](#github-cli-setup)
- [IDE Configuration](#ide-configuration)

---

## Prerequisites

Before starting, ensure you have:

- Node.js 20+ installed
- npm 10+
- Git configured with your credentials
- Access to your JIRA instance
- GitHub account with repo access

---

## Claude Code Setup

### Installation

```bash
# Install Claude Code CLI
npm install -g @anthropic-ai/claude-code

# Verify installation
claude --version
```

### Project Configuration

Each project should have a `CLAUDE.md` file in the root directory. This file provides context to Claude about:

- Project structure and architecture
- Development commands
- Coding conventions
- Git workflow specific to the project

**Example CLAUDE.md structure:**

```markdown
# CLAUDE.md

## Project Overview

Brief description of what the project does.

## Development Commands

\`\`\`bash
npm install # Install dependencies
npm run build # Build the project
npm test # Run tests
npm run dev # Start dev server
\`\`\`

## Architecture

Key architectural decisions and patterns used.

## Git Workflow

Link to REPO_ETIQUETTE.md for standard practices.
```

---

## JIRA MCP Integration

The JIRA MCP (Model Context Protocol) server allows Claude Code to interact directly with JIRA - creating tickets, transitioning issues, and querying project status.

### Setup

1. **Get your Atlassian API token:**
   - Go to https://id.atlassian.com/manage-profile/security/api-tokens
   - Click "Create API token"
   - Give it a descriptive label (e.g., "Claude Code MCP")
   - Copy the token (you won't see it again)

2. **Configure Claude Code MCP settings:**

   **macOS / Linux:**

   Create or edit `~/.claude/settings.json`:

   ```json
   {
     "mcpServers": {
       "jira": {
         "command": "npx",
         "args": ["-y", "@anthropic-ai/mcp-server-jira"],
         "env": {
           "JIRA_HOST": "your-company.atlassian.net",
           "JIRA_EMAIL": "your.email@company.com",
           "JIRA_API_TOKEN": "your-api-token-here"
         }
       }
     }
   }
   ```

   **Windows:**

   On Windows, MCP servers are configured in `~/.claude.json` (typically `C:\Users\<username>\.claude.json`), **NOT** in `settings.json`.

   ```json
   {
     "mcpServers": {
       "jira": {
         "command": "cmd",
         "args": ["/c", "npx", "-y", "@anthropic-ai/mcp-server-jira"],
         "env": {
           "JIRA_HOST": "your-company.atlassian.net",
           "JIRA_EMAIL": "your.email@company.com",
           "JIRA_API_TOKEN": "your-api-token-here"
         }
       }
     }
   }
   ```

   > **Important:** On Windows, wrap `npx` commands with `cmd /c` to avoid "Connection closed" errors. Use forward slashes in paths within JSON files for portability.

   Replace:
   - `your-company.atlassian.net` with your JIRA instance URL
   - `your.email@company.com` with your Atlassian account email
   - `your-api-token-here` with the API token from step 1

3. **Restart Claude Code** to load the MCP server.

### MCP Configuration Scopes

| Scope             | Location                                                              | Use Case                                        |
| ----------------- | --------------------------------------------------------------------- | ----------------------------------------------- |
| **User scope**    | `~/.claude/settings.json` (macOS/Linux) or `~/.claude.json` (Windows) | Personal servers, available across all projects |
| **Project scope** | `.mcp.json` (project root)                                            | Team-shared, checked into version control       |

### Available JIRA Commands

Once configured, Claude can:

| Action            | Example Prompt                                                     |
| ----------------- | ------------------------------------------------------------------ |
| Create issue      | "Create a JIRA ticket in <PROJECT> for adding user authentication" |
| Get issue details | "What's the status of <PROJECT>-123?"                              |
| Search issues     | "Show me all open bugs in project <PROJECT>"                       |
| Transition issue  | "Move <PROJECT>-123 to In Progress"                                |
| Add comment       | "Add a comment to <PROJECT>-123 about the implementation approach" |
| List projects     | "What JIRA projects do I have access to?"                          |

### Example Workflow with JIRA MCP

```
You: Create a ticket for adding dark mode support

Claude: I'll create a JIRA ticket for this feature.
[Creates <PROJECT>-456: Add dark mode support]

You: Start working on <PROJECT>-456

Claude: I'll transition the ticket and create a feature branch.
[Transitions <PROJECT>-456 to "In Progress"]
[Creates branch feat/<PROJECT>-456-add-dark-mode]

You: [After completing work] Create a PR for this

Claude: I'll create the PR and update the ticket.
[Creates PR #12 targeting dev]
[Transitions <PROJECT>-456 to "In Review"]
[Adds comment with PR link to <PROJECT>-456]
```

### Windows-Specific MCP Notes

#### Path Format

Use **forward slashes** in paths within JSON files — they work on Windows and are more portable:

```json
{
  "args": ["E:/Development/my-project/dist/index.js"]
}
```

If you prefer backslashes, you must escape them:

```json
{
  "args": ["E:\\Development\\my-project\\dist\\index.js"]
}
```

#### NPX Servers on Windows

For any MCP server that uses `npx`, wrap with `cmd /c`:

```json
{
  "mcpServers": {
    "example-server": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@some/mcp-package"],
      "env": {}
    }
  }
}
```

#### CLI Commands for MCP Management

```bash
# Add a server
claude mcp add --transport stdio my-server -- cmd /c npx -y @some/package

# Add to user scope
claude mcp add --transport stdio --scope user my-server -- node path/to/server.js

# List all servers
claude mcp list

# View server details
claude mcp get my-server

# Remove a server
claude mcp remove my-server
```

### Troubleshooting

**MCP not connecting:**

- Verify your API token is valid
- Check that JIRA_HOST doesn't include `https://`
- Ensure your email matches your Atlassian account

**"Connection closed" errors (Windows):**

- Ensure you're using the `cmd /c` wrapper for npx-based servers
- Check that all required environment variables are set

**Permission errors:**

- Verify you have access to the JIRA project
- Check that your API token has the necessary scopes

**Rate limiting:**

- JIRA has API rate limits; avoid rapid successive queries

**Server Starts But Tools Missing:**

1. Run `/mcp` to check server connection status
2. Verify the server is exporting tools correctly
3. Check server logs for initialization errors
4. On Windows, check debug logs at `C:\Users\<username>\.claude\debug\latest`

### Security Notes

- Never commit `~/.claude.json` or `~/.claude/settings.json` to version control (they contain API tokens)
- Use environment variables or a secrets manager for sensitive values in team settings
- Rotate API tokens periodically
- The `.mcp.json` project file should NOT contain secrets — use environment variable references instead

---

## GitHub CLI Setup

The GitHub CLI (`gh`) is used for repository management, PRs, and branch protection.

### Installation

```bash
# macOS
brew install gh

# Windows
winget install GitHub.cli

# Linux
sudo apt install gh
```

### Authentication

```bash
# Login to GitHub
gh auth login

# Follow the prompts:
# - Select GitHub.com
# - Select HTTPS
# - Authenticate via browser
```

### Verify Setup

```bash
# Check authentication
gh auth status

# Test repo access
gh repo view
```

### Common Commands

```bash
# Create PR targeting dev
gh pr create --base dev --title "[TICKET-123] Description"

# View PR status
gh pr status

# Check CI status
gh pr checks

# Merge PR (after approval)
gh pr merge --squash

# Create a new repo
gh repo create org/new-repo --private
```

---

## IDE Configuration

### VS Code Extensions

Recommended extensions:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

Save as `.vscode/extensions.json` in your project.

### VS Code Settings

Recommended workspace settings:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.turbo": true
  }
}
```

Save as `.vscode/settings.json` in your project.

---

## Environment Variables

### Local Development

Projects use `.env` files for local configuration:

```bash
# .env.example (committed as a template)
# See .env.example in project root for all available variables

# .env (local, gitignored)
# Copy from .env.example and fill in your values
```

Refer to each project's `.env.example` for the specific variables needed.

### CI/CD Environment

GitHub Actions secrets are managed in repository settings:

1. Go to **Settings** > **Secrets and variables** > **Actions**
2. Add repository secrets for sensitive values
3. Reference in workflows: `${{ secrets.SECRET_NAME }}`

---

## Verification Checklist

After setup, verify everything works:

- [ ] `claude --version` shows installed version
- [ ] Claude Code can access JIRA (try "List JIRA projects")
- [ ] `gh auth status` shows authenticated
- [ ] `gh repo view` shows current repository
- [ ] IDE extensions installed and working
- [ ] Project builds successfully (`npm run build`)
- [ ] Tests pass (`npm run test:run`)

---

## References

- [Claude Code Documentation](https://docs.anthropic.com/claude-code)
- [MCP Server Documentation](https://modelcontextprotocol.io/)
- [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
- [GitHub CLI Manual](https://cli.github.com/manual/)
- [JIRA API Documentation](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
