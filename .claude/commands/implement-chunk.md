# Implement Plan Chunk

Dispatch a subagent to implement a specific chunk (or range of chunks) from a plan file.

## Usage
`/implement-chunk <phase> <chunk-range> [--parallel]`

Examples:
- `/implement-chunk 2 8-9` — Implement Phase 2, Chunks 8-9
- `/implement-chunk 3 A-C --parallel` — Implement Phase 3, Chunks A-C in parallel worktrees

## Instructions

1. **Read the plan file** for the given phase:
   - Phase 1: `docs/superpowers/plans/2026-03-14-ai-todo-phase1-foundation.md`
   - Phase 2: `docs/superpowers/plans/2026-03-14-ai-todo-phase2-ai-agent.md`
   - Phase 3: `docs/superpowers/plans/2026-03-14-ai-todo-phase3-calendar-notifications.md`
   - Phase 4: `docs/superpowers/plans/2026-03-14-ai-todo-phase4-slack-reports.md`

2. **Extract the specified chunks** from the plan. Each chunk starts with `## Chunk N:` heading.

3. **Build the subagent prompt** with:
   - Full chunk content (all tasks with code snippets)
   - Project context from CLAUDE.md
   - Current file tree context (key existing files the chunk depends on)
   - Clear instructions: implement all tasks, commit after each logical group, run type-check after

4. **Dispatch subagent(s)**:
   - Single chunk or sequential range: one Agent with `isolation: "worktree"`
   - `--parallel` flag: dispatch separate Agents per chunk, each in its own worktree

5. **After completion**: verify the build passes with `pnpm turbo build`, then mark any tracking tasks as completed.

## Subagent Prompt Template

```
You are implementing Chunk(s) {N} of Phase {P} for the AI Todo App.

PROJECT: Turborepo monorepo — apps/web (Next.js 16), apps/worker (BullMQ + Claude SDK), packages/shared.
WORKING DIR: /Users/ritvik/Projects/Personal/ai-todo-app

## Plan Tasks
{paste full chunk content here}

## Existing Files You'll Need
{list key files this chunk reads/imports from}

## Instructions
1. Read existing files before modifying them
2. Implement each task in order
3. After each logical group of files, run: pnpm --filter {package} lint
4. Commit with conventional commit messages after each logical group
5. After all tasks: run pnpm turbo build to verify everything compiles
```
