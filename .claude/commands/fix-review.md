# Fix Review Issues

Apply fixes from a code review, prioritized by severity.

## Usage
`/fix-review` — Fixes issues from the most recent code review output.

## Instructions

1. **Parse review output** — Look for the most recent code review results (either from a review subagent or from the Phase 1 review). Issues are categorized as CRITICAL, IMPORTANT, or SUGGESTION.

2. **Fix in priority order:**
   - CRITICAL — Fix immediately, these block progress
   - IMPORTANT — Fix before moving to next phase
   - SUGGESTION — Fix if quick (<2 min each), otherwise note for later

3. **For each fix:**
   - Read the file first
   - Make the minimal change needed
   - Verify with type-check: `pnpm turbo lint`

4. **Commit all fixes** in a single commit:
   ```
   fix: address code review feedback — {summary of what was fixed}
   ```

5. **Report** what was fixed and what was deferred.
