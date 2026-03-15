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
- `2026-03-14-ai-todo-phase2-ai-agent.md` — Phase 2 (DONE)
- `2026-03-14-ai-todo-phase3-calendar-notifications.md` — Phase 3
- `2026-03-14-ai-todo-phase4-slack-reports.md` — Phase 4
- `2026-03-15-ai-todo-phase5-completion.md` — Phase 5 (DONE)
- Phase 6: Power User Features (DONE) — Task creation modal, attachments, DnD enhancements, voice capture, Slack/Gmail capture, filters & saved views

## Coding Standards

- TypeScript strict mode. No `any` types.
- Zod validation on all API inputs (schemas in `packages/shared/src/validation/`).
- API routes use `getAuthenticatedUser()` from `@/lib/api/auth` for auth.
- Error responses: `{ error: string }` with appropriate HTTP status codes.
- Wrap `request.json()` in try/catch, return 400 on parse failure.
- Use `date-fns` for date manipulation, `lucide-react` for icons.
- Commits: conventional commits (`feat:`, `fix:`, `chore:`).

## Design Context

### Users
Individual professionals and productivity-minded people who want an AI-powered daily planner. They use the app throughout the day to manage tasks, review AI-generated schedules, sync calendars, and track progress. They expect a tool that feels premium, trustworthy, and stays out of the way while being genuinely helpful.

### Brand Personality
**Clean, trustworthy, capable.** Like a well-built premium SaaS — reliable, professional, gets out of your way. The AI assistant should feel intelligent but not showy. The interface should communicate competence through restraint and precision.

### Emotional Goals
- **Calm & focused**: Reduce cognitive load — the interface should feel like a clean desk
- **Premium & confident**: Every detail should feel intentional and polished, like Linear or Raycast

### Aesthetic Direction
**Superlist-inspired with fresh identity.** Deep, rich dark backgrounds (navy/charcoal, not warm brown). Vibrant but controlled accent colors. Bold display typography for hierarchy. Both dark and light themes, with dark as the primary experience.

Superlist's design philosophy centers on "simplicity, delight, and user respect" — minimalist interfaces that hide complex capabilities behind intuitive interactions. Their sensory design (dynamic completion sounds, haptic feedback, variable audio tones) creates psychological reward loops. Their "task-as-a-page" paradigm elevates simple items into rich documents. These principles should inform our redesign.

**Reference apps**: Superlist (color vibrancy, premium dark UI, sensory feedback, tactile interactions), Linear (precision, spacing, confidence), Raycast (clean hierarchy, pro-tool feel)

**Anti-references — explicitly avoid**:
- Generic shadcn/Radix default aesthetic — needs a real visual identity
- Overly playful, cutesy, or illustration-heavy designs
- Corporate/enterprise density (no Jira-like heaviness)
- Flashy/gimmicky trends (no gratuitous glassmorphism or gradients)
- "Blank slate" overwhelm — provide opinionated structure like Superlist does

### Color System
**Fresh palette required** — the current warm lime-on-brown palette is being replaced entirely. New palette direction inspired by Superlist:
- **Dark backgrounds**: Deep navy/charcoal tones (`#181824`, `#26253b` range — not warm brown)
- **Light backgrounds**: Clean whites and cool grays (`#f7f7ff` off-white range)
- **Primary accent**: Vibrant purple/blue range (Superlist uses `#9187ff` purple, `#2486e0` blue)
- **Secondary accent**: Energetic magenta/pink for highlights (Superlist uses `#f739f7`)
- **Semantic colors**: Success green (`#22c55e`), warning amber (`#f59e0b`), error red (`#ef4444`)
- **Color space**: Continue using OKLch for perceptual uniformity, with display-p3 support for high-end displays

### Typography
- **Display/headings**: Inter Display or Satoshi — distinctive sans-serif with multiple weights (100-900 range)
- **Body**: Inter — clean, highly readable at small sizes, excellent weight variety
- **Monospace**: Fragment Mono or Geist Mono for code/data contexts
- Use weight and size contrast aggressively for visual hierarchy
- Enable `-webkit-font-smoothing: antialiased` for crisp rendering

### Design Principles
1. **Precision over decoration** — Every pixel should be intentional. Spacing, alignment, and proportion create the premium feel, not ornament.
2. **Hierarchy through contrast** — Use size, weight, color, and whitespace to create clear visual layers. Nothing should blend together or compete for attention.
3. **Distinctive identity** — This app should be recognizable at a glance. No generic component-library aesthetic.
4. **Calm confidence** — The interface should feel assured and restrained. Animations are subtle and purposeful, never distracting.
5. **Dark-first, light-ready** — Design for dark mode first as the signature experience, then adapt thoughtfully to light mode.

### Accessibility
- **WCAG AA compliance**: 4.5:1 contrast ratio for text, 3:1 for UI elements
- Touch targets: minimum 44px for mobile interactions
- `prefers-reduced-motion` support for all animations
- Both themes must independently meet contrast requirements
- Keyboard navigation support on all interactive elements
