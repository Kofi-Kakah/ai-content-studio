# AI Content Studio

A full-stack AI content generation studio — articles, social posts, YouTube scripts,
summaries, titles and SEO descriptions — with a ChatGPT-style workspace, projects,
usage analytics and a rich editor.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui (Base UI) · TanStack Query · Zustand · React Hook Form + Zod · Recharts · react-markdown · Monaco · cmdk |
| Backend | Separate Node.js API server (Express 5 · TypeScript) |
| Database | PostgreSQL (Neon) with Prisma 8 ORM |
| Auth | Auth.js (NextAuth v5) credentials + JWT sessions |
| AI | NVIDIA NIM — `deepseek-ai/deepseek-v4.1-flash` |
| Cache / rate limiting | Upstash Redis |
| File uploads | Backblaze B2 (S3-compatible), local fallback in dev |
| Email | Resend (password reset) |
| Hosting | Vercel (web) + any Node host (API) |

## Repository layout

```
apps/web        Next.js frontend
apps/api        Node/Express API server (Prisma, AI, uploads, email)
packages/shared Shared types, AI prompt templates, Zod schemas
scripts/        Local dev database bootstrap (embedded PostgreSQL)
```

## Getting started

```bash
npm install
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env    # fill in secrets

npm run db:start    # optional: local embedded PostgreSQL (or point DATABASE_URL at Neon)
npm run db:push     # create tables + seed prompt data
npm run db:seed     # demo user & sample content

npm run dev         # web on :3000, api on :4000
```

Demo account (after seeding): `demo@studio.dev` / `Demo1234!`

Full documentation lives in [`docs/`](docs/).
