# LifeGrid v0.5.1 — Project Detail Editing

## Objective
Project Detail now coordinates the existing Task and Event sheets, explicit Project editing, and a shared add/edit milestone editor.

## Workflows
Task and Event rows resolve current-calendar records by stable ID and open the production `TaskSheet` or `EventSheet`. Project edits support existing name, status, and notes fields. Milestones support title, optional date-only target date, status, optional date-only completion date, multiline notes, complete/reopen, reordering, and confirmed deletion. Notes are rendered as plain text with preserved newlines.

## Context, mobile, and accessibility
The detail layer retains ID-based nested-editor context, closes unavailable records safely, uses internal dynamic-viewport scrolling and safe-area padding, and exposes labelled actions, progress, dialogs, validation alerts, and delete confirmation.

## Compatibility
Backup schema remains 6; milestone notes and completion dates remain normalized and serialized. AI interchange remains v4 and continues to explicitly reject milestone patch operations while exporting milestone context. Local-first operation remains unchanged.

## Tests and limitations
Node helper contracts cover ID resolution, refresh derivation, validation, and date-only transitions. No browser runner is installed, so browser verification is documented in the acceptance checklist. Recommended v0.5.2: browser automation and richer project-field editing if fields are added to the model.

Branch: `codex/implement-v0.5.1-project-detail-editing`
Commit: release commit recorded in Git history.
PR URL: not returned by the available PR metadata tool.
Deployment status: not production-verified.
