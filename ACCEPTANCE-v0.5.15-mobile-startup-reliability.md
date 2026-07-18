# v0.5.15 iPhone acceptance

1. Export a LifeGrid JSON backup and verify production shows v0.5.15.
2. In Safari open the production **root URL** directly; check Grid, Tasks, People, AI, Settings, close/reopen Safari, and verify data persists.
3. If recovering from an older deployment, clear only that website’s Safari data if needed. Remove any old LifeGrid Home Screen icon.
4. From the root URL choose Add to Home Screen; confirm name/icon, launch it, force-close/relaunch, restart the phone, and confirm no white page.
5. Test Wi-Fi, cellular, and temporary offline behavior (offline app-shell support is not promised in this release). Deploy a later build and confirm the next launch updates without data loss.
6. Verify Grid responsiveness. On a failure, use Copy Diagnostic Summary; do not include Event/Task/private calendar content in a report.

Automated WebKit emulation is not equivalent to real iOS Safari. Real-device verification is required and was not performed in this environment.
