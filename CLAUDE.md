# AI Todo App — Claude Code Instructions

## Project Structure

Turborepo monorepo with 3 packages:
- `apps/web` — Next.js 16 (App Router, React 19, Tailwind v4, shadcn/ui with base-ui)
- `apps/worker` — Node.js BullMQ worker with Claude SDK AI agent
- `packages/shared` — Types, Zod schemas, constants shared across apps

All web source files live under `apps/web/src/` with `@/*` alias → `./src/*`.

## Key Commands

```bash
# Build everything (shared → web + worker)
pnpm turbo build

# Type-check without emitting
pnpm turbo lint

# Run tests
pnpm turbo test

# Build only web
pnpm --filter web build

# Build only worker
pnpm --filter @ai-todo/worker build

# Type-check worker
pnpm --filter @ai-todo/worker lint
```

## Architecture Notes

- **shadcn/ui uses base-ui, NOT Radix.** No `asChild` prop — use `render` prop instead.
- **Next.js 16** with Turbopack (dev) and Webpack (build, needed for Serwist).
- **Supabase Auth** — Google OAuth with `calendar.readonly` scope. Server-side session via `@supabase/ssr`.
- **RLS** on all tables. `user_secrets` has RLS enabled with no client policies (service_role only).
- **BullMQ queues**: `ai-tasks`, `notifications`, `calendar-sync` (defined in `packages/shared/src/types/jobs.ts`).
- **Worker uses service_role Supabase client** — bypasses RLS for background jobs.
- **Vercel AI SDK** (`ai` + `@ai-sdk/anthropic`) for streaming chat in web app.
- **Claude SDK** (`@anthropic-ai/sdk`) for background AI jobs in worker.

## Implementation Plans

Plans are in `docs/superpowers/plans/`:
- `2026-03-14-ai-todo-phase1-foundation.md` — Phase 1 (DONE)
- `2026-03-14-ai-todo-phase2-ai-agent.md` — Phase 2 (IN PROGRESS)
- `2026-03-14-ai-todo-phase3-calendar-notifications.md` — Phase 3
- `2026-03-14-ai-todo-phase4-slack-reports.md` — Phase 4

## Coding Standards

- TypeScript strict mode. No `any` types.
- Zod validation on all API inputs (schemas in `packages/shared/src/validation/`).
- API routes use `getAuthenticatedUser()` from `@/lib/api/auth` for auth.
- Error responses: `{ error: string }` with appropriate HTTP status codes.
- Wrap `request.json()` in try/catch, return 400 on parse failure.
- Use `date-fns` for date manipulation, `lucide-react` for icons.
- Commits: conventional commits (`feat:`, `fix:`, `chore:`).
