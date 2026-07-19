# Handoff — v0.5.19 smart-quote import compatibility

- **Starting main commit:** `4b2202ef4647180d5009a46ba00b7fee5599cb76` (PR #42 merged). PR #40 (`bf6375e`) introduced the prior blocking smart-quote rejection.
- **Root cause:** mobile/AI output substituted U+201C/U+201D for structural RFC 8259 delimiters.
- **Implementation:** `parseAIUpdate` parses original extracted JSON first, then calls a bounded delimiter scanner only after failure. Successful recovery adds a review-only warning; all parsing flows retain v4 normalization and preflight.
- **Safety boundaries:** no blanket replacement, no repair of commas/braces/comments/trailing commas, and no lenient parser. Valid ASCII JSON and U+2019/prose typography are preserved. JSON.parse, validation, duplicate/reference/dependency checks, selection, and atomic apply remain authoritative.
- **Version:** `v0.5.19`; `AI_INTERCHANGE_VERSION` remains 4 and `BACKUP_SCHEMA_VERSION` remains 7.
- **Branch:** `codex/smart-quote-importer-compatibility`. Implementation commit: `3d53ff5e87fc5c3421e1176a3e25a804827f7619`; PR number/URL are recorded in the pull request after creation.
- **Verification:** `pnpm install --frozen-lockfile`, `pnpm --filter @workspace/lifegrid typecheck`, `pnpm --filter @workspace/lifegrid test` (70/70 passing), `pnpm --filter @workspace/lifegrid build` (passed), and `git diff --check` all passed. The production build contains `v0.5.19` in `dist/public/version.json` and `dist/public/index.html`.
- **Files changed:** parser (`src/lib/aiPrompt.ts`), focused and existing importer/release tests, the four active version sources, and this README/acceptance/contract/handoff set.
- **Remaining limitation:** only U+201C/U+201D delimiters are recoverable; malformed or ambiguous JSON remains blocked.
