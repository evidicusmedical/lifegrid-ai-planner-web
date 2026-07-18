# Manual acceptance — v0.5.15.1 service-worker retirement

## Desktop Chrome / Edge

1. Export a LifeGrid JSON backup, then open production with an old worker registered if available.
2. Reload normally after deploying v0.5.15.1. Confirm at most one controlled refresh and visible `v0.5.15.1`.
3. In Application > Service Workers, confirm no active LifeGrid worker remains; confirm calendar data is intact.
4. Open `/version.json` and confirm `appVersion` is `v0.5.15.1`; open `/sw.js` and confirm JavaScript retirement content, not HTML.

## iPhone Safari and Home Screen

1. Export a backup and open the root URL in normal Safari. Confirm the current version and no white screen.
2. Remove any old Home Screen icon; add the root URL again and launch it. Confirm `v0.5.15.1`, intact data, and no white screen.
3. Force-close and relaunch. Repeat in both normal Safari and standalone Home Screen modes.

Expected: calendar data remains intact throughout. AI prompt-quality behavior is explicitly out of scope for this release.
