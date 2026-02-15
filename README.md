# ContentHub - Your LinkedIn & Substack Second Brain

ContentHub is a full-stack web application that helps you save, organize, and search your favorite LinkedIn and Substack posts using AI. Think of it as a personal knowledge base for professional content — save posts manually, scrape them from URLs, bulk import via CSV/JSON, or use the Chrome extension to save directly from LinkedIn.

## Features

- **Save Posts** — Manually create entries or paste a URL to auto-scrape content, images, and author info
- **URL Scraping** — Platform-specific extraction for LinkedIn, Substack (including custom domains), and generic URLs with multi-stage content cleaning
- **Bulk Import** — Upload CSV or JSON files to import many posts at once
- **Chrome Extension** — Save LinkedIn posts directly from your feed with one click
- **AI Search** — Ask natural language questions about your saved content using semantic search
- **Grid & List Views** — Toggle between card grid and compact list layouts on the dashboard
- **Favorites** — Mark posts as favorites for quick access
- **Platform Badges** — Color-coded badges for LinkedIn (blue), Substack (orange), and other sources

## Changelog

The app includes a built-in changelog page at `/changelog` that tracks updates across three categories:

- **New** — Brand new features added to the app
- **Improved** — Enhancements to existing features
- **Fixed** — Bug fixes

Each entry is grouped by version number and date. The changelog data lives in `client/src/data/changelog.json` for easy updates.

## Tech Stack

### Frontend
- React 18 + TypeScript, bundled with Vite
- Wouter for client-side routing
- TanStack React Query for server state
- shadcn/ui components (Radix UI + Tailwind CSS)
- Framer Motion for animations
- React Hook Form + Zod for form validation

### Backend
- Express.js + TypeScript
- Replit Auth (OpenID Connect) with Passport.js
- OpenAI SDK for AI-powered search and chat
- Cheerio for server-side URL scraping

### Database
- PostgreSQL with Drizzle ORM
- Tables: `users`, `sessions`, `posts`, `conversations`, `messages`
- Schema defined in `shared/schema.ts` with Drizzle-Zod validation

## Project Structure

```
client/                  React frontend
  src/
    components/          App components + shadcn ui components
      PostCard.tsx         Grid view post card
      PostListItem.tsx     List view post row
      CreatePostDialog.tsx Post creation with URL scraping
      BulkImportDialog.tsx CSV/JSON bulk import
      AISearchSidebar.tsx  AI search panel
    data/
      changelog.json       Changelog entries
    hooks/               Custom hooks (auth, posts, toast)
    lib/                 Utilities (queryClient, auth, cn)
    pages/               Page components
      Dashboard.tsx        Main app (grid/list, search, AI sidebar)
      LandingPage.tsx      Public landing page
      ChangelogPage.tsx    Version history
      ExtensionPage.tsx    Chrome extension setup guide
  public/
    extension/           Chrome extension (Manifest V3)

server/                  Express backend
  index.ts               HTTP server entry point
  routes.ts              API routes (CRUD, scrape, import, AI)
  storage.ts             Database storage interface
  scraper.ts             URL scraping (Cheerio)
  replit_integrations/   Auth, chat, audio, image utilities

shared/                  Shared between client & server
  schema.ts              Drizzle schema + Zod insert schemas
  models/                Table definitions (auth, chat)
  routes.ts              API route contracts with Zod validation
```

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL database
- Environment variables:
  - `DATABASE_URL` — PostgreSQL connection string
  - `SESSION_SECRET` — Express session encryption key
  - `AI_INTEGRATIONS_OPENAI_API_KEY` — OpenAI API key (via Replit AI Integrations)
  - `AI_INTEGRATIONS_OPENAI_BASE_URL` — OpenAI base URL

### Development
```bash
npm install
npm run db:push    # Push database schema
npm run dev        # Start dev server
```

### Production Build
```bash
npm run build      # Builds client (Vite) + server (esbuild) to dist/
npm start          # Run production server
```

## Chrome Extension

Located in `client/public/extension/`. To install:

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `client/public/extension/` folder
4. The extension adds "Save to ContentHub" buttons on LinkedIn post pages

## Roadmap

### Phase 1 — Core Experience Polish
- Tags & collections for organizing posts
- Full-text keyword search on the dashboard
- Favorites filter view
- Dark mode toggle

### Phase 2 — Smarter Content
- AI auto-tagging on save
- AI-generated post summaries
- Related posts suggestions
- Weekly digest of saved content

### Phase 3 — More Sources
- Twitter/X, Medium support
- RSS feed import
- Browser extension for any webpage

### Phase 4 — Collaboration & Sharing
- Public shareable collections
- Export to PDF, Markdown, CSV
- Post highlights and notes

### Phase 5 — Growth & Engagement
- Reading stats dashboard
- Mobile-responsive improvements
- Email-to-save integration
