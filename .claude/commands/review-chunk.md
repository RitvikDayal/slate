# Review Recent Implementation

Dispatch a code review subagent to review the most recent implementation work against the plan.

## Instructions

1. **Identify what to review:**
   - Check `git log --oneline -10` for recent commits
   - Check `git diff HEAD~{N}..HEAD --stat` for changed files

2. **Dispatch review subagent** (use `subagent_type: "superpowers:code-reviewer"`) with:
   - The list of changed files and their diffs
   - The relevant plan chunk(s) that were implemented
   - The CLAUDE.md coding standards

3. **Review criteria:**
   - Does the implementation match the plan?
   - TypeScript strict compliance (no `any`, proper types)
   - Zod validation on API inputs
   - Auth checks on all API routes
   - Error handling (try/catch on request.json(), proper status codes)
   - No security issues (SQL injection, XSS, token leaks)
   - shadcn/ui patterns (base-ui, not Radix — no `asChild`)
   - Imports use correct aliases (`@/*` for web, relative for worker/shared)

4. **Report** issues found, categorized as CRITICAL / IMPORTANT / SUGGESTION.
