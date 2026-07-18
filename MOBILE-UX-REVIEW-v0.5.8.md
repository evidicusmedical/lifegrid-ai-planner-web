# Mobile Tasks review — v0.5.8

The prior header placed the sort control beside the title/description and chip rows were visually vulnerable to clipping. Task metadata and the floating add control competed with narrow layouts and bottom navigation.

v0.5.8 uses shared horizontally-scrollable status, Project Tag, and category rails with reachable 32px-plus controls; narrow layouts place sort below the heading with a 44px target. Task titles explicitly use `min-w-0`, wrap, and retain a fixed trailing status/priority area; metadata wraps with controlled gaps. The task list reserves bottom-nav/safe-area/FAB space, while the FAB uses `--bottom-nav-height + env(safe-area-inset-bottom) + 1rem`. The header becomes structured rows below 430px.

Source contracts cover the responsive foundation. Browser visual verification was not run because Playwright package installation was blocked by registry 403.
