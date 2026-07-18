# v0.5.5 Performance baseline and after measurements

Reference: Node v24.15.0, pnpm workspace command, production browser measurements unavailable. Run `pnpm --filter @workspace/lifegrid benchmark`; it prints 25-iteration medians. Fixtures are deterministic and fictional. These figures measure pure Node operations, never browser rendering or route timings.

| Fixture (events/tasks/person/tags/calendars) | Grid date index | Task indexes | Project usage | Storage JSON | Backup JSON | JSON size |
|---|---:|---:|---:|---:|---:|---:|
| Small 100/50/10/10/1 | 0.140ms | 0.045ms | 0.055ms | 0.147ms | 0.066ms | 17.6KiB |
| Medium 1000/500/100/30/3 | 0.093ms | 0.103ms | 0.589ms | 4.980ms | 4.571ms | 516.3KiB |
| Large 5000/2000/500/100/5 | 0.823ms | 0.851ms | 1.790ms | 79.555ms | 77.322ms | 4081.7KiB |

Before architecture: Grid’s render code constructed a date map inline; Settings eagerly initialized temporal review. After architecture: the reusable Grid index is memoized and review is deferred. No comparable pre-change Node harness existed, so no fabricated before wall-clock values are reported. Manual browser procedure: load development, local production preview, then deployed URL; for each desktop/390×844/768×1024 record cache/SW state, first/repeat route click-to-heading and usable-content timings, console errors, and fixture size.
