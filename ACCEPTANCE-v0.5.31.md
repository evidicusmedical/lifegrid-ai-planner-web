# LifeGrid v0.5.31 acceptance

## Automated contract

- 18 focused unit tests cover short and long legends, punctuation, oversized tokens, balancing, truncation, immutability, month-table sizing, and release/schema identity.
- Playwright acceptance uses a deterministic September 2026 fixture in Chromium, Firefox, and WebKit, creates real PNGs, traces Firefox Canvas `fillText`, verifies Sunday-first September alignment and compact table headers, and checks rolling ranges.
- Existing unit, typecheck, build, and v0.5.30 qualification remain release gates.

## Preserved behavior

Event-card dimensions and typography, exact structural dates, Letter frames, routing, sorting, renderer priority, pixel ratio, themes, storage schema 7, and AI interchange version 5 are unchanged. Exceptional prose is ellipsized only on the final permitted line; only an individually oversized token receives an internal break.
