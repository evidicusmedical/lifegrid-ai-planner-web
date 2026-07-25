# Handoff — LifeGrid v0.5.22

## Release identity
- Starting main commit: `5a94dc50b6dd808362231ecb73f83d996b4dc107`
- Implementation branch: `codex/lifegrid-v0.5.22-task-workflow-settings-events`
- Final implementation commit: recorded as the pull request head (a commit cannot contain its own hash); see PR URL below.
- PR number and URL: populated after PR creation.

## Phase 0 audit and root causes
1. **Task model:** status enum is `todo | in-progress | done | blocked`; triage is `ready | needs-review | blocked | waiting | duplicate-candidate | needs-scheduling | scheduled | backlog`; priority is `low | medium | high | urgent`; `dueDate` is nullable YYYY-MM-DD; `parentTaskId` is nullable; Project Tag is optional `projectId`; shared Task/Event Category is `category`. Existing parent data is normalized and atomically applied.
2. **Sorting:** TasksView locally implemented Smart/date/priority/status/category sorting; status incorrectly ranked In progress before To do, Category sorted raw IDs, names were absent, tie-breaks were incomplete, and selection was not persisted. Smart used runtime Date construction and put all undated work behind dated work. v0.5.22 moves contracts to a pure helper, adds exact explanations/name modes/visible labels/stable ties, date-only scoring, and optional local preference persistence.
3. **AI:** `aiPrompt` produces instructions and exports context; parser normalizes sparse patches, validates enums/IDs, warns on real-deadline changes, and atomic apply occurs only after preview approval. Status and triage were both accepted but intent precedence was undocumented. `dueDate: null` already was canonical. Task deletes were accepted, contrary to the desired no-delete workflow. Guidance now makes status authoritative, preserves triage-only intent, supports null clears, discrete naming and parent compatibility, and visibly converts proposed Task deletion to Blocked manual review. Atomicity is unchanged.
4. **Ordering:** Categories persist array order. People already had `order` plus a context reorder method but no UI. Project Tags use `order`; Settings derived a sorted/filtered list then sent its filtered index to a full-array mutation, causing wrong/no movement under search and relying on order alignment. People/Projects normalize missing/duplicate legacy order deterministically. Controls now share accessible Up/Down behavior and Project controls resolve full ordered indexes.
5. **Archive:** Project `status` includes legacy `archived`; selectors and derived tags safely read it. The Settings button did change stored status, but no complete archive lifecycle/page existed. Removing only the toggle needs no migration; legacy archived records remain readable and are not rewritten. Explicit Delete remains.
6. **Event time mode:** the shared TemporalFields used by Event and Person Schedule exposed Specific timezone/Floating local time and help/selectors. Event models retain nullable legacy fields. Editors previously reconstructed these fields, risking changes on save. Display/grid paths already use stored local date/time. Controls are removed; legacy values are copied opaquely on edit and new values are null.
7. **Recurring all-day:** recurrence is materialized sibling records sharing `recurringGroupId`, with no master-series recurrence pattern or This/Following/Entire mutation engine. The editor initialized `temporalEndDate` from the selected sibling, then changing its date could leave an earlier end and trigger temporal validation. v0.5.22 normalizes the range from the edited local date and original inclusive duration; missing/stale end becomes same-day. A notes-only pure field-diff helper is included, while unsupported scope UI is not fabricated.
8. **Colors:** Settings had a 12-color private palette, Event used current Category colors, and People Schedule inherited Person color. Existing values are stored literally; no centralized contrast helper governs all views and several badges use existing CSS/foreground treatments. v0.5.22 provides a shared 16-color palette and retains arbitrary current colors without reassignment.

## Files changed
See `git diff --name-only 5a94dc50...HEAD` for the authoritative list: Task/Event/Temporal/Settings UI, AI prompt/parser, pure workflow/palette/recurrence helpers, Node contract test, version markers/assertions, and the nine v0.5.22 documents.

## Compatibility and version decisions
- APP_VERSION: `v0.5.22`; package: `0.5.22`.
- AI_INTERCHANGE_VERSION remains **4**.
- BACKUP_SCHEMA_VERSION remains **7**.
- No Projects page, Project Operations, Milestones UI, drag/drop, deep hierarchy, archive lifecycle, runtime timezone conversion, service worker, migration, bulk recoloring, or unrelated export/filter behavior was added.
- Existing assigned colors were **not reassigned**.
- No timezone conversion was reintroduced; local stored semantics remain authoritative.

## Testing/results
- `pnpm install --frozen-lockfile`: pass (lockfile current).
- `pnpm --filter @workspace/lifegrid typecheck`: pass.
- `pnpm --filter @workspace/lifegrid test`: pass, 81/81.
- `pnpm --filter @workspace/lifegrid build`: pass; existing sourcemap/chunk-size warnings remain advisory.
- `git diff --check`: pass.
- `pnpm --filter @workspace/lifegrid test:e2e:smoke`: not completed; harness web server did not reach execution and was stopped.
- Screenshot/browser spot-check: not run because the installed Playwright package has no Chromium executable (`chromium_headless_shell-1187`).
- Tests not run: Firefox, WebKit, mobile projects, physical iPhone Safari.

## Known limitations and browser/device follow-up
- Current materialized recurrence architecture does not support This and following / Entire series edit scopes; only individual edit and group delete are present. Do not claim unsupported scope acceptance.
- Verify all interactive layout/color contrast and persistence on desktop Chromium and a physical iPhone Safari.
- Verify legacy zoned/floating fixtures visually retain stored clock text without editor controls.

## Manual acceptance checklist (pending physical/browser execution)
1–8: Smart default; exact descriptions; status/priority/name/tag order; related-title grouping; untagged last. 9–14: AI blocked/triage/combined previews; main status emphasis; triage Advanced. 15–19: No due date clear/persistence/isolation and Smart urgent/blocked behavior. 20–26: Project/People Up/Down persistence, Category behavior, boundaries, selectors. 27–28: Archive absent; records unchanged. 29–32: timezone controls absent and local round trip. 33–38: all-day range repair and only supported recurrence behavior (scope-engine checks remain follow-up/known limitation). 39–42: 16 colors, preservation, manual selection, light/dark legibility.
