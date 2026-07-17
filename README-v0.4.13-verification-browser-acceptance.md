# LifeGrid v0.4.13 — Verification Hardening and Browser Acceptance

## Objective
This release exposes the production ICS serializer as a pure module and adds executable coverage for serialization, timezone modes, inclusion policy, escaping, and UTF-8-safe RFC 5545 folding. The application version is canonical in `artifacts/lifegrid/src/lib/version.ts`; Universal AI Interchange remains v4 and backup schema remains v6.

## Compatibility and limits
Existing temporal validation, conversion, DST review, calendar isolation, filename, and AI contract checks remain in the package suite. ICS supports TZID preservation and UTC conversion for valid zoned records; floating and all-day records remain local/date-only. No `VTIMEZONE` components are emitted, so consumers must recognize IANA TZIDs. Dual start/end timezone travel remains unsupported.

## Browser acceptance
No Playwright, Cypress, jsdom, happy-dom, or Testing Library runner is installed, so no browser automation was added. The PWA service worker is disabled during development (`devOptions.enabled: false`); production uses auto-update caching. Use the companion acceptance checklist with fictional fixtures.

## Release metadata
- Branch: `codex/implement-v0.4.13-verification-browser-acceptance`
- Commit: recorded after final validation
- Pull request: recorded after creation
- Deployment: not deployed by this change.
