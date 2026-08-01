# AI export delivery contract — v0.5.24

The export boundary is exactly categories, projects, people, events, personEvents, tasks, and milestones. Extra enumerable properties—including CRUD callbacks—are ignored. All-data and restricted selection return independent clones; range selection retains full catalogs and undated Tasks and selects intersecting multi-day Events.

Copy first uses `navigator.clipboard.writeText`, then a readonly off-screen textarea and `execCommand('copy')`. Success is reported only on a true delivery result; total failure retains Preview for manual copy. Download always freshly generates the package, creates a UTF-8 Blob, appends/clicks/removes an anchor, then revokes its URL after 1000 ms. Workflow, calendar, preset, and date changes invalidate Preview.

Interchange remains 4 and backup schema remains 7. Legacy hard relationships remain read-only exported context.
