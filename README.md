# Slate

An AI-powered daily planner and task manager built for individual professionals who want a premium, intelligent productivity tool.

## Features

- **AI Task Management** — Intelligent task scheduling, estimation, and daily plan generation powered by AI
- **Smart Chat** — Conversational AI assistant for managing tasks, getting insights, and planning your day
- **Google Calendar Sync** — Two-way calendar integration to plan around your existing commitments
- **Push Notifications** — Real-time reminders and task alerts via web push
- **Lists & Labels** — Organize tasks with custom lists, labels, priorities, and effort levels
- **Saved Views** — Custom filtered views for focused workflows
- **Drag & Drop** — Reorder tasks and move between lists with intuitive DnD
- **Daily & Weekly Reports** — AI-generated productivity insights and summaries
- **Slack Integration** — Scan Slack channels for actionable items and turn them into tasks
- **Dark & Light Themes** — Premium dark-first design with full light mode support

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, Tailwind CSS v4, shadcn/ui (base-ui) |
| **Backend** | Next.js API Routes, Supabase (Postgres + Auth + RLS) |
| **AI** | Vercel AI SDK (streaming chat), AI SDK (background agent) |
| **Worker** | Node.js, BullMQ, Redis |
| **Monorepo** | Turborepo, pnpm workspaces |

## Project Structure

```
ai-todo-app/
├── apps/
│   ├── web/          # Next.js frontend + API routes
│   └── worker/       # BullMQ background worker (AI agent, notifications, calendar sync)
├── packages/
│   └── shared/       # Types, Zod schemas, constants
└── turbo.json
```

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 10+
- Supabase CLI
- Redis (for BullMQ worker)

### Setup

```bash
# Install dependencies
pnpm install

# Start Supabase locally
pnpm db:start

# Run database migrations
pnpm db:migrate

# Start development servers
pnpm dev
```

### Environment Variables

Create `.env.local` in `apps/web/`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Create `.env` in `apps/worker/`:

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
REDIS_URL=
ANTHROPIC_API_KEY=
```

### Build

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter web build
pnpm --filter @ai-todo/worker build

# Type-check
pnpm lint

# Run tests
pnpm test
```

## Deployment

- **Web** — Vercel
- **Worker** — Railway
- **Database** — Supabase (hosted)
- **Redis** — Railway (or any Redis provider)

## License

[MIT](LICENSE)
