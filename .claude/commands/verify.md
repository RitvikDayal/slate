# Verify Monorepo

Run full verification across the monorepo to catch issues early.

## Instructions

Run these checks in sequence, stopping at the first failure:

1. **Type-check all packages:**
   ```bash
   pnpm turbo lint
   ```

2. **Build all packages:**
   ```bash
   pnpm turbo build
   ```

3. **Run all tests:**
   ```bash
   pnpm turbo test
   ```

4. **Report results** — summarize pass/fail for each step. If anything fails, show the error and suggest a fix.

## Quick Mode
If the user specifies a package (e.g., `/verify worker`), only check that package:
```bash
pnpm --filter @ai-todo/worker lint && pnpm --filter @ai-todo/worker build && pnpm --filter @ai-todo/worker test
```

Package filter names:
- `web` → `--filter web`
- `worker` → `--filter @ai-todo/worker`
- `shared` → `--filter @ai-todo/shared`
