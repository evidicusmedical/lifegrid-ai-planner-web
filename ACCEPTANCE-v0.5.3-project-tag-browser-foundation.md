# Acceptance — v0.5.3 Project Tag UX and Browser-Test Foundation

## Severity and stop conditions
- **Blocker:** data loss, persisted Event.projectId, app cannot load, or Task save corrupts assignment; stop and recover backup.
- **High:** inaccessible critical action, duplicate tag bypass, browser overflow hides Save/Cancel; stop release until fixed.
- **Medium/Low:** visual wrapping or non-critical feedback; document, capture screenshot, and triage.

On failure: capture browser/version/viewport, screenshot and console error; close sheets with Escape, reload, restore isolated fixture/backup, reproduce from clean localStorage, then log recovery result.

## Environment matrix
| Environment | Command / viewport | Result | Screenshot / console fields |
|---|---|---|---|
| Chromium desktop | `pnpm --filter @workspace/lifegrid test:browser:chromium` | [ ] Not run — runner unavailable | Screenshot: ___; console: ___ |
| Firefox desktop | `pnpm --filter @workspace/lifegrid test:browser:firefox` | [ ] Not run — runner unavailable | Screenshot: ___; console: ___ |
| WebKit desktop | `pnpm --filter @workspace/lifegrid test:browser:webkit` | [ ] Not run — runner unavailable | Screenshot: ___; console: ___ |
| Mobile Chromium | 390×844 | [ ] Not run | Screenshot: ___; console: ___ |
| Mobile WebKit | 390×844 | [ ] Not run | Screenshot: ___; console: ___ |
| Tablet | 768×1024 | [ ] Not run | Screenshot: ___; console: ___ |
| No browser automation | registry returned `ERR_PNPM_FETCH_403` | [x] Documented blocker | N/A |

Planned failure artifacts: `artifacts/lifegrid/test-results/` and `artifacts/lifegrid/playwright-report/` (ignored). Browser versions: unavailable.

## Project Tag combobox
- [ ] Open via Tab/Enter/Space; visible labelled combobox and expanded state.
- [ ] Search canonical name; [ ] search alias; [ ] arrows/Enter; [ ] Escape.
- [ ] Clear; [ ] archived assignment visible; [ ] archived excluded by default; [ ] missing tag unavailable; [ ] long name/alias wraps.

## Quick create
- [ ] Create valid tag; [ ] duplicate blocked; [ ] alias conflict blocked; [ ] cancel creates nothing.
- [ ] Task cancel preserves newly created tag but not assignment; [ ] Task Save persists ID; [ ] focus returns to TaskSheet.

## Derived Event tags
- [ ] One tag; [ ] deduplicate same tag; [ ] multiple tags; [ ] archived text.
- [ ] Day Detail; [ ] linked-task change refresh; [ ] verify no Event.projectId persisted.

## Settings
- [ ] Create/edit/alias; [ ] archive/unarchive; [ ] reorder; [ ] usage counts.
- [ ] Delete unused; [ ] clear/reassign used; [ ] legacy milestone protection; [ ] focus and mobile overflow.

## Responsive/accessibility smoke
- [ ] 390×844 no body overflow; TaskSheet, combobox, quick-create, Settings, reassignment, Day Detail fit; Save/Cancel reachable.
- [ ] 768×1024 fits; [ ] desktop reference.
- [ ] Combobox accessible name/expanded state/options keyboard-selectable; dialog title; focus return; archived textual; no hover-only action.

This is a focused smoke plan, not a claim of WCAG conformance or cross-browser verification.
