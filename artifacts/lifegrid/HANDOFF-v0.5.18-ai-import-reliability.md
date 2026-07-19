# Handoff — v0.5.18 AI import reliability

Starting main: `d7a2edf`; latest merged PR: #39. Event loss originated in `normalizeEvents`, which omitted `timeStatus`, `endDate`, and `recurringGroupId` before v4 validation. Selection divergence originated in `applyImportUpdate`, which created indexed keys while review/dependency logic used `patchProposalKey` keys. The fix reconstructs the selected set from the filtered patch with canonical keys.

Affected functions: `normalizeEvents`, `normalizeEventUpdate`, `parseAIUpdate`, `applyImportUpdate`, and `aiPromptContract`. The final dependency errors are evaluated before mutation; application remains atomic. Prompt instructions now require complete JSON, dependency inclusion, ASCII quotes, and no placeholders.

Verification recorded in the implementation commit: LifeGrid typecheck, 65 maintained unit tests, and LifeGrid build passed. Browser qualification was not run in this environment. Remaining manual verification: run Chromium, Firefox, and WebKit AI-intake workflows in CI. Branch: `work`; implementation commit and PR URL are recorded after release creation.
