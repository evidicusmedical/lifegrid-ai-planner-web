# LifeGrid v0.5.30 acceptance

## Compatibility

- `APP_VERSION`: `v0.5.30`
- AI interchange: `5` (unchanged)
- backup schema: `7` (unchanged)
- no storage migration and no Event or Category text mutation

## Renderer contracts

1. Light month columns from a Dark app and Dark month columns from a Light app have independently computed publication colors. Normal semantic text targets 4.5:1 contrast.
2. Structural months and numeric days bypass generic Canvas prose fitting and cannot acquire `…` or lose digits. Firefox verification traces `fillText`; Chromium/WebKit verify staged structure and real PNG output.
3. Landscape and portrait logical frames remain 1400 × 1082 and 1082 × 1400. Ordinary short layouts tolerate 1.5% ratio variance (2% for Current Month).
4. Next 7/14/30 tables are content-bound at the top of the Letter page with one/two/five equal planned rows. Clean residual space follows the table. Dense content may grow beyond the target frame rather than crop Events.
5. Legend entries cannot shrink. `USAF`, `Fun`, and `Family` remain uninterrupted; long labels wrap at word boundaries over multiple rows.
6. Current Grid, Calendar Year, quarters, and long Custom month columns remain content-bound rather than forcing microscopic Letter output.
