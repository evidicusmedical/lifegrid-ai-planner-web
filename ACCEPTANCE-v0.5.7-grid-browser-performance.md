# v0.5.7 Grid browser acceptance

| Check | Result | Evidence / recovery |
|---|---|---|
| Browser/version, OS/device, build | NOT RUN | Use local production preview; record browser and CPU. |
| Tasks/Settings → Grid first/repeat timing | NOT RUN | Capture `window.lifegridGridTiming()`; cold and warm cache. |
| Desktop, 390×844, 768×1024 | NOT RUN | Record screenshot, no horizontal overflow, console errors. |
| Staged shell / current content / completion | PASS by source contract | Shell has `aria-busy`; one rAF creates annual Grid; retry by revisiting Grid. |
| Event placement, Day Types, dense day, sheets, ICS/export | Existing suite required | Stop on regression; restore prior commit and inspect trace. |
| SW enabled/disabled/update/offline | NOT RUN | Application panel; verify emitted lazy chunk is cached after update. |

Stop if errors, stale content, focus jump, or a task exceeds 500 ms. Collect a sanitized trace and use a hard reload/bypass service worker to recover.
