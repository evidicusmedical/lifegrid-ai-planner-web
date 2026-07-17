# v0.4.9 Engineering Handoff

## Confirmed starting state
Repository: `lifegrid-ai-planner-web`; base/default expected branch: `main`. Starting commit was `4acc124eda37fe072b7f5993abdddb09191dbbc6`, the merge of PR #5, with preceding merged head `903cde660ca277a6366d36205b72efb60fbbd7aa`. `APP_VERSION` was v0.4.8; `AI_INTERCHANGE_VERSION` was 3. Both Universal AI workflows, dependency analysis, and apply-time revalidation were present. Empty creation copied active categories, people, and projects; GridView placed the app version in the narrow 8rem calendar trigger.

## Implementation
The header separates an independently centered, pointer-transparent canonical version from a responsive title selector with adjacent caret and native title. The Today cell retains ring/background/top accent and accessible text but no visible badge.

Calendar isolation now has pure seed modes: Empty (only canonical Other), Copy Structure (deep copied categories/people/projects only), Sample (fictional fixture), and Duplicate (complete deep copy). Reset to Truly Empty is confirmation-protected and available only when the active calendar has no events, tasks, or person schedule entries; it alters no other version.

A shared filename utility owns sanitization and local date/time formatting. Exact conventions are `lifegrid_json_backup_<calendar>_<date>_<time>.json`, `lifegrid_ics_export_<calendar>_<date>_<time>.ics`, and `lifegrid_text_export_<calendar>_<date>_<time>.txt`.

The new starter prompt has 13 staged policy areas: role, access limits, inventory, extraction, temporal normalization, entity resolution, precedence, ambiguity, field reference, planning, construction, validation, and final output. Supported v3 fields are documented from types: category/people id-label-color; project aliases/status; task dueDateType/triageStatus/parent/link arrays; event display/export/AI/source/eventKind/link fields; and person schedule timing. Omitted updates retain fields, null clears nullable fields, and empty link arrays clear links. No timezone/endDate/timeStatus/delete/merge semantics were added.

## Verification
A Node package test command was added because Vitest installation was blocked by registry 403. It checks seed/isolation contracts, active data exposure, shared filenames, staged/provider-neutral prompt content, and retained dependency/apply wiring. `pnpm --filter @workspace/lifegrid test`, LifeGrid typecheck/build, and root typecheck passed. Root build failed only because unrelated mockup-sandbox requires `PORT`; it was not modified. `git diff --check` passed. No browser, production, screenshot, or manual UI verification was performed.

Backup JSON compatibility and ICS contents/UID behavior are retained. Privacy verification confirms the starter prompt generator is static and does not accept AppData. Limitations: source tests are lightweight contract tests rather than full component/browser tests; timezone and a future temporal model (timezone, endDate, DST-safe semantics) remain recommended next work.

Final branch: `codex/implement-v0.4.9-calendar-isolation-interchange-refinement`. Final commit and PR URL are recorded in git/PR metadata after release creation. Deployment status: not verified.
