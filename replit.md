# superBrain - LinkedIn Second Brain

## Overview

superBrain is a full-stack web application that serves as a "second brain" for LinkedIn and Substack content. Users can save, organize, search, and interact with their favorite posts using AI-powered features. The app supports manual post creation, URL scraping with auto-fill, bulk CSV/JSON import, AI semantic search, and a Chrome extension for saving posts directly from LinkedIn.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript, bundled by Vite
- **Routing**: Wouter (lightweight client-side router, not React Router)
- **State Management**: TanStack React Query for all server state — caching, mutations, and invalidation. No Redux or other global state libraries.
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives with Tailwind CSS. Component config is in `components.json`. New shadcn components should use the aliases defined there (`@/components/ui`, `@/lib/utils`, etc.)
- **Styling**: Tailwind CSS with CSS custom properties for theming. The palette is LinkedIn-inspired (primary blue `210 90% 40%`). Dark mode is supported via the `dark` class strategy. Global styles live in `client/src/index.css`.
- **Animations**: Framer Motion for page transitions, micro-interactions, and loading states
- **Forms**: React Hook Form with Zod resolvers (`@hookform/resolvers`) for client-side validation. Form schemas are shared with the server via `shared/schema.ts`.
- **Path aliases**: `@/` → `client/src/`, `@shared/` → `shared/`, `@assets/` → `attached_assets/` (configured in both `tsconfig.json` and `vite.config.ts`)
- **Key pages**: `LandingPage` (unauthenticated), `Dashboard` (main app with grid/list views, search, AI sidebar), `ExtensionPage` (Chrome extension setup guide), `ChangelogPage`
- **View modes**: Dashboard supports grid (PostCard) and list (PostListItem) layouts toggled via buttons

### Backend
- **Framework**: Express.js with TypeScript, executed via `tsx` in development
- **Entry point**: `server/index.ts` creates an HTTP server wrapping Express
- **API pattern**: REST API under `/api/*`. Route contracts (method, path, input/output Zod schemas) are defined in `shared/routes.ts` and shared between client and server for type safety.
- **Authentication**: Replit Auth via OpenID Connect (OIDC) with Passport.js. Sessions are stored in PostgreSQL using `connect-pg-simple`. Auth setup is in `server/replit_integrations/auth/`. The `requireAuth` middleware checks `req.isAuthenticated()` and user ID comes from `req.user.claims.sub`.
- **AI Integration**: OpenAI SDK configured with Replit AI Integrations environment variables (`AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`). Used for semantic search/RAG on saved posts and chat features.
- **URL Scraping**: `server/scraper.ts` uses Cheerio (not a headless browser) to extract content, images (`og:image`), author info, and platform from URLs. It has a multi-stage content cleaning pipeline (strips author bios, social metadata, normalizes whitespace). Supports LinkedIn, Substack (including custom domains), and generic URLs. The `POST /api/scrape` endpoint exposes this to the frontend.
- **Replit Integrations**: Pre-built modules in `server/replit_integrations/` for auth, chat, audio (voice), image generation, and batch processing. These are scaffolded utilities — not all are actively used in the main app flow.
- **Build process**: `script/build.ts` uses Vite for the client and esbuild for the server. Production output goes to `dist/` with the client in `dist/public/` and server as `dist/index.cjs`.

### Database
- **Database**: PostgreSQL (required). Connection via `DATABASE_URL` environment variable.
- **ORM**: Drizzle ORM with `drizzle-zod` for automatic schema-to-Zod-validation integration
- **Schema location**: `shared/schema.ts` is the main schema file (re-exports from `shared/models/`). Model files: `shared/models/auth.ts` (users, sessions), `shared/models/chat.ts` (conversations, messages)
- **Migrations**: Drizzle Kit with `drizzle-kit push` (`npm run db:push`) — pushes schema directly to DB without migration files
- **Key tables**:
  - `users` — User profiles from Replit Auth (id, email, firstName, lastName, profileImageUrl). **Mandatory for Replit Auth — do not drop.**
  - `sessions` — Express session storage (sid, sess JSONB, expire). **Mandatory for Replit Auth — do not drop.**
  - `posts` — Saved content (content, summary, tags as JSONB string array, authorName, authorUrl, imageUrl, originalUrl, platform, isFavorite, publishedAt, timestamps). Foreign key to users.
  - `collections` — Named collections for organizing posts (id, userId, name, description, createdAt). Foreign key to users.
  - `post_collections` — Join table linking posts to collections (postId, collectionId) with cascade deletes on both sides.
  - `conversations` / `messages` — Chat/conversation storage for AI features

### Chrome Extension
- Located in `client/public/extension/`
- Manifest V3 Chrome extension that runs on LinkedIn pages
- Content script (`content.js`) adds "Save to superBrain" buttons to LinkedIn posts
- Popup (`popup.html/js`) can bulk-scrape LinkedIn saved posts pages
- Communicates with the main app via fetch to the deployed URL

## External Dependencies

### Required Services
- **PostgreSQL**: Primary database, must be provisioned. Connection string via `DATABASE_URL` env var.
- **Replit Auth (OIDC)**: Authentication provider. Requires `ISSUER_URL` (defaults to `https://replit.com/oidc`), `REPL_ID`, and `SESSION_SECRET` environment variables.
- **OpenAI API (via Replit AI Integrations)**: Powers semantic search, chat, image generation. Requires `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL` environment variables.

### Key NPM Packages
- **Server**: `express`, `passport`, `express-session`, `connect-pg-simple`, `drizzle-orm`, `drizzle-zod`, `openai`, `cheerio`, `zod`, `memoizee`, `p-limit`, `p-retry`
- **Client**: `react`, `wouter`, `@tanstack/react-query`, `framer-motion`, `react-hook-form`, `@hookform/resolvers`, `date-fns`, `tailwindcss`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, full suite of `@radix-ui/*` primitives
- **Build**: `vite`, `esbuild`, `tsx`, `drizzle-kit`, `typescript`