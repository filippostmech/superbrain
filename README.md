<p align="center">
  <img src="assets/logo.png" alt="superBrain logo" width="80" />
</p>

<h1 align="center">superBrain</h1>

<p align="center">
  <strong>Your LinkedIn & Substack Second Brain</strong><br />
  Save, organize, and search your favorite professional content with AI.
</p>

<p align="center">
  <a href="https://super-brain.app">Live App</a> &middot;
  <a href="#features">Features</a> &middot;
  <a href="#getting-started">Get Started</a> &middot;
  <a href="#contributing">Contributing</a> &middot;
  <a href="#roadmap">Roadmap</a>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" /></a>
</p>

---

## What is superBrain?

superBrain is an open-source web app that acts as a personal knowledge base for your professional reading. Stop losing valuable insights from LinkedIn posts and Substack articles — save them in one place, organize with tags and collections, and use AI-powered search to find exactly what you need.

## Features

- **Save Posts** — Manually create entries or paste a URL to auto-scrape content, images, and author info
- **URL Scraping** — Smart extraction for LinkedIn, Substack (including custom domains), and generic URLs
- **Bulk Import** — Upload CSV or JSON files to import many posts at once
- **Chrome Extension** — Save posts directly from LinkedIn and Substack with one click
- **Tags & Collections** — Organize posts with tags and named collections, filter by either on the dashboard
- **AI Search** — Ask natural language questions about your saved content using semantic search
- **Grid & List Views** — Toggle between card grid and compact list layouts
- **Favorites** — Mark posts as favorites for quick access
- **Platform Badges** — Color-coded badges for LinkedIn (blue), Substack (orange), and other sources
- **Knowledge Graph** — AI-powered entity extraction that maps people, companies, topics, and technologies from your posts into an interactive force-directed graph visualization with search, filtering, and relationship exploration
- **Public REST API** — Programmatic access to your data via API keys (Pro)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion |
| Backend | Express.js, TypeScript, Passport.js (OIDC Auth) |
| Database | PostgreSQL, Drizzle ORM |
| AI | OpenAI SDK (semantic search & chat) |
| Scraping | Cheerio (server-side HTML parsing) |

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database

### Environment Variables

Create a `.env` file or set the following environment variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Express session encryption key |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | OpenAI API key |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | OpenAI base URL |

### Installation

```bash
git clone https://github.com/filippostmech/superbrain.git
cd superbrain
npm install
npm run db:push    # Push database schema to PostgreSQL
npm run dev        # Start the development server
```

### Production Build

```bash
npm run build      # Builds client (Vite) + server (esbuild) to dist/
npm start          # Run production server
```

## Project Structure

```
client/                  React frontend
  src/
    components/          UI components (PostCard, CreatePostDialog, AISearchSidebar, etc.)
    data/                Static data (changelog.json)
    hooks/               Custom hooks (auth, posts, collections)
    lib/                 Utilities (queryClient, auth helpers)
    pages/               Page components (Dashboard, LandingPage, ChangelogPage)
  public/
    extension/           Chrome Extension (Manifest V3)

server/                  Express backend
  index.ts               HTTP server entry point
  routes.ts              API routes (CRUD, scrape, import, AI, collections)
  apiV1.ts               Public REST API v1 (Bearer token auth, rate limiting)
  knowledgeGraph.ts       Entity extraction & knowledge graph API
  storage.ts             Database storage interface
  scraper.ts             URL scraping with Cheerio

shared/                  Shared between client & server
  schema.ts              Drizzle schema + Zod validation
  routes.ts              API route contracts
```

## Chrome Extension

The Chrome extension lets you save posts directly from LinkedIn and Substack pages.

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `client/public/extension/` folder
4. "Save to superBrain" buttons will appear on LinkedIn post pages

## MCP Server (AI Agent Integration)

superBrain includes an MCP (Model Context Protocol) server that lets AI agents query your saved knowledge base directly. Compatible with Claude Desktop, Cursor, and any MCP-compatible client.

### Available Tools

| Tool | Description |
|------|-------------|
| `search_knowledge` | Semantic search across saved posts |
| `list_posts` | List/filter posts by tags, platform, collection |
| `save_post` | Save new content (text or URL) |
| `scrape_url` | Scrape a URL and return structured content |
| `list_collections` | List your collections |

### Setup

1. Generate an API key from your superBrain dashboard (API Keys page)
2. Add the following to your Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "superbrain": {
      "command": "npx",
      "args": ["tsx", "mcp/server.ts"],
      "cwd": "/path/to/superbrain",
      "env": {
        "SUPERBRAIN_API_KEY": "sb_your_api_key_here",
        "SUPERBRAIN_URL": "https://www.super-brain.app"
      }
    }
  }
}
```

Set `SUPERBRAIN_URL` to your own domain if self-hosting. It defaults to `https://www.super-brain.app`.

### Example Prompts

Once connected, you can ask your AI agent things like:
- "What did I save last month about AI pricing models?"
- "Find my posts tagged with 'strategy'"
- "Save this article to my superBrain: https://example.com/article"
- "What collections do I have?"

## Contributing

Contributions are welcome! Whether it's bug fixes, new features, or documentation improvements, we'd love your help.

1. **Fork** the repository
2. **Create a branch** for your feature (`git checkout -b feature/my-feature`)
3. **Commit** your changes (`git commit -m 'Add my feature'`)
4. **Push** to your branch (`git push origin feature/my-feature`)
5. **Open a Pull Request**

Please make sure your code follows the existing style and includes relevant tests where applicable.

## Roadmap

| Status | Feature |
|--------|---------|
| Done | Save posts manually or via URL scraping (LinkedIn, Substack, generic) |
| Done | Bulk import from CSV / JSON |
| Done | Chrome Extension — save posts with one click from LinkedIn & Substack |
| Done | Tags & named collections for organizing posts |
| Done | AI-powered semantic search across saved content |
| Done | Grid & list dashboard views with platform badges |
| Done | Favorites for quick access |
| Done | Public REST API — 7 endpoints (`/api/v1/*`) for posts, search, collections, and scraping |
| Done | API key management — generate, revoke, and rotate keys from the dashboard |
| Done | Rate-limited access — 100 req/min per key with standard `X-RateLimit-*` headers |
| Done | MCP Server — AI agents (Claude Desktop, Cursor) can query your knowledge base via Model Context Protocol |
| Done | Dark mode toggle |
| Done | Favorites-only filter view |
| Done | Export to CSV & Markdown — download posts with current filters applied |
| Done | Knowledge Graph — AI entity extraction with interactive force-directed visualization |
| Planned | Mobile-responsive improvements |
| Planned | AI auto-tagging on save |
| Planned | AI-generated post summaries |
| Planned | Related posts suggestions |
| Planned | Weekly digest emails |
| Planned | Additional sources — Twitter/X, Medium, RSS feeds |
| Planned | Public shareable collections |
| Planned | Reading stats dashboard |
| Planned | Higher API rate limits |

## License

This project is licensed under the [MIT License](LICENSE).
