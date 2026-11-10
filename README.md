# AI Content Studio

A full-stack AI content generation studio — articles, social posts, YouTube scripts,
summaries, titles and SEO descriptions — with a ChatGPT-style workspace, projects,
usage analytics and a rich markdown editor.

```
┌────────────────────────────┐        ┌────────────────────────────┐
│  apps/web  (Next.js :3000) │  BFF   │  apps/api  (Express :4000) │
│  Auth.js session cookie    │ ─────▶ │  JWT bearer, SSE streaming │
│  React Query · Zustand     │ proxy  │  Prisma 8 · NVIDIA NIM     │
└────────────────────────────┘        └─────────────┬──────────────┘
                                                    │
                                        ┌───────────▼───────────┐
                                        │  PostgreSQL (Neon /   │
                                        │  embedded dev PG)     │
                                        └───────────────────────┘
```

## Features

**Workspace (ChatGPT-style)**
- Streaming AI responses (SSE) with a live caret and stop button
- 7 generation modes — chat, article, social post, YouTube script, summary,
  title ideas, SEO description — each with its own system prompt
- Conversation history with infinite scroll, debounced search,
  rename / move-to-project / delete
- Regenerate, copy, export (`.md` / `.txt`), open any generation in the editor
- File attachments (upload or paste; text files are fed to the model)
- Optimistic message sending, light / dark / system themes

**Projects** — organized by type (YouTube Scripts, Blog Posts, Social Media,
Marketing), with per-project chat lists and stats.

**Dashboard** — usage totals, token usage over time (stacked prompt vs
completion), generations per day, recent generations, activity timeline
(Recharts, 7/30/90-day ranges).

**Editor** — Monaco-based markdown editor with a formatting toolbar,
split live preview, `⌘S` save, unsaved-changes guard and export.

**Everything else**
- Auth: register / login / logout, password reset by email, profile settings,
  change password, delete account
- Command palette (`⌘K`) searching chats and projects
- Keyboard shortcuts (`⌘B`, `⌘⇧O`, `⌘⇧L`, `⌘/`) with a help dialog
- Notifications bell with unread badge
- Fully responsive (sidebar collapses to a sheet on mobile)

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui (Base UI) · TanStack Query · Zustand · React Hook Form + Zod · Recharts · react-markdown · Monaco · cmdk |
| Backend | Separate Node.js API server (Express 5 · TypeScript) |
| Database | PostgreSQL (Neon in prod, embedded PostgreSQL in dev) with Prisma 8 ORM |
| Auth | Auth.js (NextAuth v5) credentials + JWT sessions, bcrypt hashing |
| AI | NVIDIA NIM — `deepseek-ai/deepseek-v4.1-flash` (env-configurable) |
| Cache / rate limiting | Upstash Redis (in-memory fallback in dev) |
| File uploads | Backblaze B2 (S3-compatible); local disk fallback in dev |
| Email | Resend (password reset links; dev link fallback in logs) |
| Hosting | Vercel (web) + any Node host (API) |

## Repository layout

```
apps/web        Next.js frontend (App Router, BFF proxy, Auth.js)
apps/api        Node/Express API (Prisma, AI streaming, uploads, email, stats)
packages/shared Shared types, AI prompt templates, Zod schemas, helpers
scripts/        Local dev database bootstrap (embedded PostgreSQL)
```

## Getting started

Prerequisites: Node.js 20+ and npm 10+.

```bash
npm install

# 1. Environment
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env
#    set AUTH_SECRET in both (openssl rand -base64 32)
#    optionally add NVIDIA_API_KEY for real AI (mock stream without it)

# 2. Database (embedded PostgreSQL — no install needed)
npm run db:setup     # starts DB :54329, creates tables, seeds demo data

#    …or point DATABASE_URL at Neon / any PostgreSQL and run:
#    npm run db:push --workspace @studio/api && npm run db:seed --workspace @studio/api

# 3. Run
npm run dev          # web on :3000, api on :4000
```

Demo account (after seeding): **demo@studio.dev / Demo1234!**

### Handy scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Web + API with hot reload |
| `npm run db:start` | Embedded PostgreSQL on :54329 (keeps running) |
| `npm run db:setup` | `db:start` + schema push + seed |
| `npm run build` / `typecheck` | Build / type-check both workspaces |

## Configuration

All configuration is environment-based — see `apps/api/.env.example` and
`apps/web/.env.example` for the full list.

| Variable | Where | Notes |
| --- | --- | --- |
| `DATABASE_URL` | api | PostgreSQL (Neon: `?sslmode=require`) |
| `AUTH_SECRET` | both | Shared HMAC secret for session JWTs |
| `NVIDIA_API_KEY` | api | `nvapi-…` from build.nvidia.com; without it the API streams a mock response |
| `AI_MODEL` | api | Defaults to `deepseek-ai/deepseek-v4.1-flash` |
| `RESEND_API_KEY`, `EMAIL_FROM` | api | Password-reset emails; without it the reset link is logged |
| `UPSTASH_REDIS_REST_URL/TOKEN` | api | Rate limiting; in-memory fallback without it |
| `B2_*`, `STORAGE_DRIVER` | api | Backblaze B2 uploads; `local` disk fallback in dev |
| `API_URL` | web | Base URL of the API server |

## How auth works

1. The web app is the only browser-facing surface; it talks to
   `/api/v1/*` **on its own origin** (a BFF route proxies to the API).
2. Login posts to Auth.js, which calls the API `/auth/login` and stores the
   API JWT **inside the encrypted session cookie** — the token is never
   exposed to client JavaScript.
3. The BFF proxy decrypts the cookie server-side and attaches
   `Authorization: Bearer …` when forwarding to the API (including SSE
   streams, which are piped through unbuffered).

## API surface (`/api/v1`)

```
POST   /auth/register|login|forgot-password|reset-password   GET /auth/me
PATCH  /users/me            POST /users/me/password           DELETE /users/me
GET    /conversations?search&projectId&limit&before          POST /conversations
GET|PATCH|DELETE /conversations/:id
GET|PATCH|DELETE /messages/:id
POST   /ai/chat             → SSE stream: meta | delta | done | error
GET|POST|PATCH|DELETE /projects…
GET    /stats/overview      GET /stats/usage?days=30
GET    /activity            POST /activity/read-all
POST   /uploads             GET /uploads          GET /files/:key
GET    /health
```

## Deployment

- **Web (Vercel):** import the repo, set the root to `apps/web` (or use the
  monorepo setup), set `AUTH_SECRET`, `API_URL` and `AUTH_TRUST_HOST=true`.
- **API (any Node host — Render, Railway, Fly, a VPS):** build with
  `npm run build --workspace @studio/api`, run `node apps/api/dist/src/index.js`,
  with `DATABASE_URL` (Neon), `CORS_ORIGIN` set to your web origin, and the
  optional integrations (NVIDIA, Resend, Upstash, B2) configured.
- Run `prisma contract emit && prisma db update` (or `npm run db:push
  --workspace @studio/api`) against the production database once.

## Notes

- In dev the app degrades gracefully without external services: mock AI
  streaming, local-disk uploads, in-memory rate limiting, reset links in
  server logs.
- All dates are stored and compared in UTC; the dashboard aggregates per
  UTC day.
