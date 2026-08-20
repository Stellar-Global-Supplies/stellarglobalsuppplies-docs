# GitDocs — GitHub README → Confluence-style Docs

A lightweight Confluence clone that auto-generates documentation from your GitHub repository README files. Built on Cloudflare Pages + Workers + D1.

**Live URL:** https://docs.stellarglobalsupplies.com

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Cloudflare Pages (docs.stellarglobalsupplies.com)│
│  React SPA (Vite)                               │
│  • Home dashboard                               │
│  • Doc viewer with TOC                          │
│  • Repos table                                  │
│  • Spaces (groupings)                           │
│  • Full-text search                             │
└───────────────────┬─────────────────────────────┘
                    │ fetch /api/*
┌───────────────────▼─────────────────────────────┐
│  Cloudflare Worker (github-docs-worker)          │
│  • GET /api/repos                               │
│  • GET/POST /api/docs                           │
│  • POST /api/sync/start                         │
│  • GET /api/sync/status                         │
│  • CRUD /api/spaces                             │
└───────────┬───────────────────┬─────────────────┘
            │                   │
    ┌───────▼──────┐   ┌───────▼──────┐
    │  D1 Database  │   │ Secret Store  │
    │  repositories │   │ GITHUB_TOKEN  │
    │  documents    │   └──────────────┘
    │  spaces       │
    │  sync_logs    │
    └──────────────┘
```

---

## Prerequisites

- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) < 4.0.0
- Node.js 18+
- Cloudflare account with:
  - Workers & Pages enabled
  - D1 database created
  - Secret Store set up with `GITHUB_TOKEN`
- GitHub Personal Access Token with `repo` scope

---

## Setup

### 1. Create D1 Database

```bash
cd worker
npx wrangler d1 create github-docs-db
```

Copy the `database_id` from the output and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "github-docs-db"
database_id = "YOUR_D1_DATABASE_ID_HERE"
```

### 2. Run Database Migrations

```bash
npx wrangler d1 execute github-docs-db --file=./schema.sql
```

### 3. Configure Secret Store

Your `GITHUB_TOKEN` is already saved in your Secret Store. Update `wrangler.toml` with your store ID:

```toml
[[secrets_store_secrets]]
binding     = "DOCS_WEBHOOK_TOKEN"
secret_name = "DOCS_WEBHOOK_TOKEN"
store_id    = "YOUR_SECRET_STORE_ID_HERE"

[[secrets_store_secrets]]
binding     = "GITHUB_TOKEN"
secret_name = "GITHUB_TOKEN"
store_id    = "YOUR_SECRET_STORE_ID_HERE"
```

Find your store ID in the Cloudflare dashboard → Workers & Pages → Secret Store.

### 4. Deploy the Worker

```bash
cd worker
npm install
npx wrangler deploy
```

Note the worker URL (e.g., `https://github-docs-worker.YOUR_SUBDOMAIN.workers.dev`).

### 5. Deploy the Frontend

```bash
cd frontend
npm install

# Set your worker URL
cp .env.example .env.local
# Edit .env.local and set VITE_API_URL to your worker URL

npm run build
npx wrangler pages deploy dist --project-name=github-docs-frontend
```

### 6. Configure Custom Domain

In the Cloudflare dashboard:
1. Go to **Workers & Pages** → `github-docs-frontend`
2. Click **Custom Domains**
3. Add `docs.stellarglobalsupplies.com`
4. Cloudflare will handle DNS automatically if your domain uses Cloudflare nameservers

### 7. Set Environment Variables in Pages

In the Cloudflare dashboard → Pages → `github-docs-frontend` → Settings → Environment Variables:

```
VITE_API_URL = https://github-docs-worker.YOUR_SUBDOMAIN.workers.dev
```

---

## Local Development

### Worker (backend)
```bash
cd worker
npm install
npx wrangler dev
# Runs on http://localhost:8787
```

### Frontend
```bash
cd frontend
npm install
# .env.local should point to http://localhost:8787
npm run dev
# Runs on http://localhost:5173
```

---

## Features

| Feature | Description |
|---------|-------------|
| **Auto-sync** | One-click sync scans all GitHub repos and imports README files |
| **Smart parsing** | Markdown → HTML with headings, tables, code blocks, badges, task lists |
| **Table of Contents** | Auto-generated TOC with scroll tracking |
| **Spaces** | Group repos into logical categories (e.g., Frontend, Backend) |
| **Full-text search** | Search across all doc titles and content |
| **Language filters** | Filter repos/docs by programming language |
| **Change detection** | SHA-based diffing skips unchanged READMEs (fast re-sync) |
| **Pagination** | Handles large repo counts gracefully |
| **Dark mode** | Automatic system dark mode support |
| **Responsive** | Mobile-friendly layout |

---

## API Reference

### `POST /api/sync/start`
Triggers a full sync of all GitHub repos. Fetches README files, parses markdown, stores in D1.

### `GET /api/sync/status`
Returns the latest sync log entry.

### `GET /api/repos?search=&language=&page=&limit=`
Lists all synced repositories with doc status.

### `GET /api/docs?page=&limit=`
Lists all documents.

### `GET /api/docs/:id`
Returns a single document with full HTML content and TOC.

### `GET /api/docs/search?q=`
Full-text search across titles and content.

### `GET/POST/PUT/DELETE /api/spaces`
CRUD for spaces (groups of repositories).

---

## wrangler.toml Reference

```toml
name = "github-docs-worker"
main = "src/index.js"
compatibility_date = "2025-04-01"

[[d1_databases]]
binding = "DB"
database_name = "github-docs-db"
database_id = "YOUR_D1_DATABASE_ID"

[[secrets_store_secrets]]
binding     = "DOCS_WEBHOOK_TOKEN"
secret_name = "DOCS_WEBHOOK_TOKEN"
store_id    = "YOUR_SECRET_STORE_ID"

[[secrets_store_secrets]]
binding     = "GITHUB_TOKEN"
secret_name = "GITHUB_TOKEN"
store_id    = "YOUR_SECRET_STORE_ID"

[vars]
FRONTEND_URL = "https://docs.stellarglobalsupplies.com"
```

---

## Notes

- **No manual editing** — docs are read-only, sourced entirely from GitHub
- **Re-sync anytime** — click the Sync button; unchanged READMEs (same SHA) are skipped
- **Private repos** — if your token has access, private repos are synced and marked 🔒
- **Rate limits** — GitHub API allows 5,000 requests/hour for authenticated users
