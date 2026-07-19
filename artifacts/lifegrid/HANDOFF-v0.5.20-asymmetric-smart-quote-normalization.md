# Handoff — v0.5.20 asymmetric smart-quote normalization

- **Starting main commit:** `936d93b` (`Merge pull request #43`); PR #43 is merged in the starting history.
- **Defect in PR #43:** its scanner recognized only U+201C (`“`) as a typographic opener and only U+201D (`”`) as a closer. Real production content used U+201D as the opening delimiter in values such as `“color”:”#8b5cf6”`, leaving that value malformed for `JSON.parse`.
- **Revised state machine:** ordinary `JSON.parse` remains first. On failure with smart quotes, the scanner accepts either U+201C or U+201D only at a JSON-plausible string opening position (`{`, `[`, `,`, `:`, or document start). Within a typographic string, either mark closes only when followed by `:`, `,`, `}`, `]`, or end of input. ASCII strings remain untouched; curly apostrophes and non-structural prose quotes remain content. `findMatchingBrace` uses the same rules.
- **Safety:** normalized text still goes through `JSON.parse`, then all existing v4 normalization, schema/preflight, dependency, duplicate, review, and atomic-apply paths. Failed normalization reports only a safe character position when available and confirms that no changes were applied.
- **Tests and totals:** `pnpm --filter @workspace/lifegrid test` passed **73/73** tests.
- **Build result:** `pnpm --filter @workspace/lifegrid build` passed (with pre-existing Vite sourcemap/chunk-size warnings).
- **Version verification:** `APP_VERSION`, package version, `public/version.json`, `index.html`, and active version-contract assertions all read `v0.5.20` / `0.5.20`.
- **Coverage:** the v0.5.19 regression suite now explicitly covers the production asymmetric color pattern, all four delimiter pairings, mixed delimiters, apostrophes, embedded prose quotes, ASCII-first parsing, legal terminators, malformed syntax, and a realistic relationship/USAF/project/task/event fixture with explicit U+201D opening delimiters.
- **Release:** `v0.5.20`; `AI_INTERCHANGE_VERSION` remains 4 and `BACKUP_SCHEMA_VERSION` remains 7.
- **Files changed:** `src/lib/aiPrompt.ts`, smart-quote and active version-contract tests, `src/lib/version.ts`, `package.json`, `public/version.json`, `index.html`, and this handoff.
- **Branch:** `codex/fix-asymmetric-smart-quotes-v0520`.
- **Implementation commit SHA:** `2df1d17be472917af72a90de34b98c6cf4ea631b`.
- **PR:** recorded through the configured `make_pr` integration as **“fix: normalize asymmetric LifeGrid smart quote delimiters”**; the integration did not return a PR number or URL, so neither can be safely asserted here.
