# LifeGrid v0.5.25 acceptance

## Operational acceptance
Portable Grid PNGs are a read-only schedule for locations where LifeGrid may be unavailable. The incident was caused by targeted capture content being parked 10,000 pixels outside the viewport and by generation being coupled to the annual table.

## Automated contract
- Next 7, 14, and 30 begin on the local calendar date today.
- Targeted Custom ranges may cross years and are limited to 45 inclusive days.
- Export selection is range AND Category AND Project AND `showInExport !== false`.
- Empty targeted ranges remain valid publications.
- Playwright drives the real Generate Image button, qualifies natural image dimensions/data URL, and validates Chromium download bytes and the PNG signature.
- Chromium, Firefox, and WebKit run the central generation path with retries disabled for this suite.

## Manual acceptance remaining
Desktop Chrome/Edge, Firefox/Safari, and iPhone Safari should confirm readable, unclipped PNGs, downloads, native Share where available, long-press Save Image, safe-area/orientation behavior, and a short December-to-January Custom export.
