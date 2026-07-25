# Handoff — LifeGrid v0.5.22

## Release identity
- Starting main commit: `5a94dc50b6dd808362231ecb73f83d996b4dc107`
- Implementation branch / existing PR head: `codex/implement-lifegrid-v0.5.22-in-lifegrid-ai-planner-web`
- Final implementation correction commit: `8b6f12b01a4784d86f2907158e16afaa06a37078`.
- Final documentation/head commit: PR #46 HEAD on `codex/implement-lifegrid-v0.5.22-in-lifegrid-ai-planner-web` (this documentation-only closeout; immutable hash recorded in the final PR description after commit creation).
- Pull request: **#46**, https://github.com/evidicusmedical/lifegrid-ai-planner-web/pull/46
- Merge status: open for review; not merged by this handoff.

## Phase 0 audit and corrected root causes
1. **Task model:** status is `todo | in-progress | done | blocked`; triage is `ready | needs-review | blocked | waiting | duplicate-candidate | needs-scheduling | scheduled | backlog`; priority is `low | medium | high | urgent`; `dueDate` and `parentTaskId` are nullable; Project Tag is `projectId`; shared Task/Event classification is `category`.
2. **Task sorting:** sorting originally lived in TasksView, incorrectly ranked In progress before To do, sorted raw Category IDs, omitted name modes/stable ties, and did not persist selection. The first v0.5.22 Smart score also treated blocked as a positive numeric penalty and could leave blocked-undated work behind far-future ordinary work. The corrected pure comparator uses a blocked actionability bonus; urgent-undated and blocked-undated work beat far-future medium/low work while near-due and overdue work remain prominent.
3. **AI status/triage:** parser accepted sparse canonical fields independently, so prompt text alone could not prevent `triageStatus: "blocked"` from representing an overall blocked request. Normalization now adds `status: "blocked"` when blocked triage arrives without status and preserves explicit combined status/triage values. Adds receive the same canonical default. Parser-level tests cover triage-only and combined inputs.
4. **AI deletion:** the first workaround skipped adding Blocked whenever the same ID already had any update, losing the substitution. The corrected parser merges `status: "blocked"` into that existing sparse update, retains its other fields, clears `tasks.delete`, emits the exact manual-review warning, and leaves atomic preview/apply unchanged.
5. **Due dates and terminology:** canonical clearing remains `dueDate: null` without unrelated mutations. The Task editor now says **Tag / Category** while the schema field remains `category`.
6. **Ordering:** Categories persist array order. People and Project Tags have stored `order`. The original Project Settings view mixed filtered indexes with the full array. A deeper review also found that reordering followed by `normalizeEntityOrder` sorted moved records back by their old order values. The correction uses one `moveOrderedEntity` helper that moves immutably and immediately reindexes; People and Project controls persist contiguous order through the active-calendar store and backup JSON.
7. **Archive:** legacy Project `status` can still be `archived` and is read safely. The incomplete Archive/Unarchive action is absent; opening Settings does not rewrite legacy flags; explicit Delete remains.
8. **Event local time:** Event and Person Schedule editors previously exposed zoned/floating controls. They now expose stored local date/time fields only. New records use null compatibility metadata; edits copy legacy `timeZone`/`timeZoneMode` opaquely and never convert clock values.
9. **Repeated Event creation:** materialized repeat siblings previously changed only `date`, leaving later all-day, timed, and approximate `endDate` at the first occurrence. All time types now share one pure range helper: same-day occurrences end on their occurrence date, while overnight/multiday occurrences preserve the first record's calendar-day span for weekly, monthly, and other frequencies. Materialized multi-day daily records also use their own date for `endDate`.
10. **All-day editing:** the first repair always rebuilt endDate from `initialData`, overriding a user edit; the follow-up still retained a stale `endDate < date` when the start stayed unchanged. All-day editors expose End date and track explicit modification. Explicit end wins and validation rejects an explicit invalid range. Untouched valid ranges/durations are retained, while missing or stale ends normalize to `endDate = date`, including notes-only grouped edits.
11. **Recurring notes:** recurrence is materialized siblings connected by `recurringGroupId`, not a rule/master engine. Notes-only group edits show Entire series by default and allow This event. Entire series updates `notes`, `aiNotes`, and `sourceNotes` on all siblings. Structural edits remain single-event. No unsupported “This and following” behavior is fabricated or claimed.
12. **Colors:** the initial 16 values were exact-hex unique but clustered in gray/purple/orange/blue/teal. The corrected palette documents 16 named perceptual families across a hue progression. Existing arbitrary assigned values remain selectable and round-trip literally; no migration or automatic recoloring occurs.

## Exact behavior implemented
- Eight compact Task sorts with exact descriptions, deterministic status/priority/name/visible-category tie contracts, Smart default, and optional selected-sort persistence.
- Clear due-date control and No due date filter; main Task status remains prominent and triage remains Advanced planning.
- Parser-enforced blocked workflow status, combined triage preservation, disclosed update-plus-delete Blocked merge, discrete flat AI Task guidance, and parentTaskId compatibility.
- Shared immutable Up/Down ordering for Categories (array order), People, and Project Tags, with disabled boundaries and accessible labels.
- Project Archive UI removed without data migration.
- Local-time-only Event/People Schedule editing with opaque legacy metadata preservation.
- Valid per-occurrence ranges for all-day, timed, and approximate repeats; stale all-day repair; explicit end-date authority; and supported notes scopes Entire series / This event only.
- Shared 16-family palette for new/manual choices with arbitrary-current-color preservation.

## Schema and release decisions
- APP_VERSION is **v0.5.22**.
- AI_INTERCHANGE_VERSION remains **4**.
- BACKUP_SCHEMA_VERSION remains **7**.
- No Projects page, Project Operations, Milestones UI, drag/drop, deep hierarchy, archive lifecycle, service worker, runtime timezone conversion, historical-time migration, bulk recoloring, or unrelated Grid/Export filtering change was introduced.
- Existing assigned colors were not reassigned. Existing local clock/date values were not converted.

## Files changed
The final implementation includes EventSheet/TemporalFields, AppDataContext/entityOrder, TaskSheet, aiPrompt, taskWorkflow, recurrenceEdit, palette, focused Node tests, and the v0.5.22 contracts/handoff. This closeout changes documentation only.

## Verification
- `pnpm install --frozen-lockfile`: passed; lockfile was current.
- `pnpm --filter @workspace/lifegrid typecheck`: passed.
- `pnpm --filter @workspace/lifegrid test`: passed, **87/87**.
- `pnpm --filter @workspace/lifegrid build`: passed; existing Vite sourcemap and chunk-size advisories remain non-blocking.
- `git diff --check`: passed.

## Tests not run and browser/device follow-up
- Physical iPhone Safari and real-browser interaction/contrast checks were not run in this environment and remain manual post-merge acceptance checks.
- Post-merge acceptance should confirm notes scope default/override, repeated one-/multiday ranges, Project/People refresh persistence, arbitrary legacy colors, and light/dark palette legibility.
- No claim is made for unsupported “This and following” recurrence editing.

## Known limitations
- Materialized recurrence supports notes-only **Entire series** and **This event**. Structural edits are **This event** only; there is no recurrence-rule engine or “This and following” scope.
- Legacy archived flags and legacy timezone compatibility fields remain intentionally opaque and are not migrated.
