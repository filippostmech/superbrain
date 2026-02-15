# ContentHub - LinkedIn Second Brain

## Overview

ContentHub is a full-stack web application that lets users save, organize, and search their favorite LinkedIn posts using AI. It functions as a "second brain" for LinkedIn content. Users can save posts manually (with automatic URL scraping), via bulk import (CSV/JSON), or through a Chrome browser extension that adds "Save to ContentHub" buttons directly on LinkedIn pages. The app includes an AI-powered search sidebar that lets users ask natural language questions about their saved content library.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

- **URL Scraping & Auto-fetch** (Feb 2026): Added `server/scraper.ts` that extracts post content, images, author info from LinkedIn and generic URLs using Cheerio. The scraper strips author bios, social engagement metadata (likes, comments, share buttons, commenter info), and cleans content text. Auto-scraping is integrated into post creation — when a URL is provided, metadata is fetched automatically.
- **Scrape API Endpoint** (Feb 2026): `POST /api/scrape` endpoint lets the frontend fetch URL previews before saving. The CreatePostDialog has a "Fetch" button that auto-fills content, image, and author fields.
- **Grid/List View Toggle** (Feb 2026): Dashboard supports both card grid and compact list layouts. Toggle buttons next to Filter control the view mode. Grid uses `PostCard`, list uses `PostListItem`.
- **Author Extraction Improvements** (Feb 2026): Scraper properly parses LinkedIn `og:title` pipe-delimited format, uses `meta[name="author"]` when available, and falls back to extracting from raw article text. Author names display as "by AuthorName" in both grid and list views.
- **Content Cleaning Pipeline** (Feb 2026): Multi-stage cleaning: `stripAuthorBio` removes author name/title/bio prefix, `stripSocialMetadata` removes likes/comments/share buttons/commenter info, `cleanText` normalizes whitespace.
- **Custom-Domain Substack Detection** (Feb 2026): `detectSubstackFromHtml()` checks fetched HTML for Substack markers (substackcdn.com, substack-post-media, post-content class) to detect custom-domain Substack sites that don't use substack.com URLs. `scrapePost()` does two-pass detection: URL pattern first, then HTML inspection for unknowns.
- **Platform Badge Styling** (Feb 2026): Platform badges use `getPlatformBadgeClass()` helper for color-coded display: LinkedIn (blue), Substack (orange), Other (gray) with dark mode support. Both PostCard and PostListItem use this helper.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript, bundled by Vite
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: TanStack React Query for server state caching and mutations
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives with Tailwind CSS
- **Styling**: Tailwind CSS with CSS variables for theming (LinkedIn-inspired blue palette using `--primary: 210 90% 40%`)
- **Animations**: Framer Motion for page transitions and micro-interactions
- **Forms**: React Hook Form with Zod resolvers for validation
- **Path aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`
- **View Modes**: Dashboard supports grid (card) and list (compact row) layouts, toggled via buttons

### Backend
- **Framework**: Express.js with TypeScript, run via `tsx`
- **HTTP Server**: Node.js `http.createServer` wrapping Express
- **API Pattern**: REST API with routes defined under `/api/*`. Route contracts are defined in `shared/routes.ts` using Zod schemas, shared between client and server
- **Authentication**: Replit Auth via OpenID Connect (OIDC) with Passport.js. Sessions stored in PostgreSQL via `connect-pg-simple`. Auth logic lives in `server/replit_integrations/auth/`
- **AI Integration**: OpenAI SDK configured with Replit AI Integrations environment variables (`AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`) for semantic search/RAG and chat features
- **URL Scraping**: `server/scraper.ts` uses Cheerio to extract content, images (`og:image`), and author info from URLs. Multi-stage content cleaning pipeline strips author bios, social metadata, and normalizes text.

### Database
- **Database**: PostgreSQL (required, uses `DATABASE_URL` environment variable)
- **ORM**: Drizzle ORM with `drizzle-zod` for schema-to-validation integration
- **Schema location**: `shared/schema.ts` (main) with model files in `shared/models/`
- **Migrations**: Drizzle Kit with `drizzle-kit push` command (`npm run db:push`)
- **Key tables**:
  - `users` - User profiles from Replit Auth (id, email, name, profile image)
  - `sessions` - Express session storage for auth persistence
  - `posts` - Saved LinkedIn content (content, summary, tags as JSONB, author info, imageUrl, URLs, favorites)
  - `conversations` / `messages` - AI chat history

### Chrome Extension
- Static files served from `client/public/extension/`
- Manifest V3 extension that runs on `linkedin.com`
- Content script adds "Save to ContentHub" buttons to LinkedIn posts
- Popup provides bulk scraping of LinkedIn saved posts page
- Communicates with the main app via fetch to the API endpoints

### Build System
- **Dev**: `tsx server/index.ts` with Vite dev server middleware (HMR via WebSocket at `/vite-hmr`)
- **Production**: Vite builds client to `dist/public/`, esbuild bundles server to `dist/index.cjs`
- Build script in `script/build.ts` selectively bundles server dependencies (allowlist pattern) while externalizing UI-related packages

### Key Components
- `PostCard` - Grid view card with image preview, author attribution, content, favorite/delete actions
- `PostListItem` - Compact list row with optional thumbnail, metadata, expand/collapse
- `CreatePostDialog` - Manual post entry with URL auto-fetch (scrape preview with image)
- `BulkImportDialog` - CSV/JSON file upload or paste for bulk importing posts
- `AISearchSidebar` - AI-powered natural language search over saved content

### Project Structure
```
client/           → React frontend
  src/
    components/   → App components + shadcn ui/ components
      PostCard.tsx        → Grid view post card
      PostListItem.tsx    → List view post row
      CreatePostDialog.tsx → Manual post creation with URL scraping
      BulkImportDialog.tsx → Bulk CSV/JSON import
      AISearchSidebar.tsx  → AI search panel
    hooks/        → Custom hooks (use-auth, use-posts, use-toast)
    lib/          → Utilities (queryClient, auth-utils, cn helper)
    pages/        → Page components (Dashboard, LandingPage, ExtensionPage)
  public/
    extension/    → Chrome extension files
server/           → Express backend
  scraper.ts      → URL scraping with Cheerio (content, images, author extraction)
  routes.ts       → API routes (CRUD, scrape, bulk import, AI search)
  storage.ts      → Database storage interface
  replit_integrations/  → Auth, chat, audio, image, batch utilities
shared/           → Shared types, schemas, route definitions
  models/         → Drizzle table definitions (auth, chat)
  schema.ts       → Main schema (posts) + re-exports
  routes.ts       → API route contracts with Zod validation
```

## Feature Roadmap

### Phase 1 — Core Experience Polish
- **Tags & Collections**: Let users organize posts into custom collections (e.g., "AI Tools", "Leadership") and add/edit tags. Add filtering by tag on the dashboard.
- **Full-text Search**: Add a search bar to the dashboard for instantly filtering posts by keyword, author, or tag — fast filtering without AI.
- **Favorites View**: A dedicated page or filter to quickly access favorited posts.
- **Dark Mode Toggle**: Add a visible theme toggle for light/dark mode switching.

### Phase 2 — Smarter Content
- **AI Auto-Tagging**: When a post is saved, use AI to automatically suggest relevant tags based on content.
- **AI Summaries**: Auto-generate a short summary for each saved post, making it easier to scan the library.
- **Related Posts**: "Posts similar to this one" suggestions powered by semantic similarity.
- **Weekly Digest**: An AI-generated summary of saved content for the week, surfacing key themes.

### Phase 3 — More Sources & Import Options
- **Twitter/X Support**: Detect and scrape tweets with platform-specific badge styling.
- **Medium Support**: Add scraping for Medium articles.
- **RSS Feed Import**: Let users subscribe to newsletter RSS feeds for automatic content capture.
- **Browser Extension Improvements**: One-click save from any webpage, not just LinkedIn.

### Phase 4 — Collaboration & Sharing
- **Public Collections**: Let users share curated collections via a public link.
- **Export**: Export posts as PDF, Markdown, or CSV for use elsewhere.
- **Highlights & Notes**: Let users annotate saved posts with personal notes or highlight key passages.

### Phase 5 — Growth & Engagement
- **Reading Stats Dashboard**: Visualize saving habits, top authors, content trends over time.
- **Mobile-Responsive Improvements**: Optimize the experience for phone/tablet users.
- **Email Integration**: Forward newsletter emails to ContentHub for automatic parsing and saving.

## External Dependencies

- **PostgreSQL**: Primary database, connected via `DATABASE_URL` environment variable. Required for app data, sessions, and auth
- **Replit Auth (OIDC)**: Authentication provider using `ISSUER_URL` (defaults to `https://replit.com/oidc`) and `REPL_ID` environment variables
- **OpenAI API (via Replit AI Integrations)**: Used for AI-powered search/RAG over saved posts and chat functionality. Configured via `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL`
- **Cheerio**: Server-side HTML parsing for URL scraping (`server/scraper.ts`)
- **Session Secret**: `SESSION_SECRET` environment variable required for Express session encryption
- **Google Fonts**: Inter and Merriweather fonts loaded via CDN in index.html and CSS
