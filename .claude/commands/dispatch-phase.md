# Dispatch Entire Phase

Orchestrate the implementation of a complete phase by dispatching chunks as subagents.

## Usage
`/dispatch-phase <phase-number>`

## Instructions

1. **Read the plan file** for the specified phase.

2. **Identify all chunks** and their dependencies:
   - Some chunks are sequential (later chunks import from earlier ones)
   - Some chunks are independent and can run in parallel

3. **Build a dispatch schedule:**
   - Group chunks into waves. Each wave contains chunks that can run in parallel.
   - Example: Wave 1 (Chunks 1-2), Wave 2 (Chunks 3-4 parallel), Wave 3 (Chunk 5), etc.

4. **For each wave:**
   a. Read the current file tree to provide accurate context
   b. Dispatch subagents for each chunk in the wave (parallel where possible)
   c. Wait for all subagents in the wave to complete
   d. Run `pnpm turbo lint` to verify type safety
   e. Commit if subagents didn't already
   f. Update task tracking

5. **After all waves complete:**
   - Run full verification: `pnpm turbo build && pnpm turbo test`
   - Dispatch a code review subagent for the entire phase
   - Report summary

## Chunk Context Template

For each subagent, provide:
- Full chunk tasks from the plan (with all code snippets)
- List of files created by previous chunks in this phase
- CLAUDE.md content
- Any specific dependencies or imports needed
- Instructions to commit after implementation and run type-check

## Error Recovery

If a subagent fails or produces broken code:
1. Read the error output
2. Fix the issue directly or re-dispatch with corrected instructions
3. Don't proceed to the next wave until the current one is clean
