# Acceptance — v0.5.19 smart-quote import compatibility

Acceptance is demonstrated by `ai-smart-quote-normalization-v0519.test.mjs`: fully typographic delimiters, nested v4 data, colors, arrays, nulls, booleans, U+2019 apostrophes, embedded prose quotes, and ASCII quote content parse correctly. Valid ASCII JSON retaining typographic prose quotes is not normalized. Malformed typographic input, placeholders, and malformed envelopes remain blocked. The realistic v4 fixture reaches normal preflight with its parent task, linked IDs, event temporal fields, recurring group, and warnings preserved.
