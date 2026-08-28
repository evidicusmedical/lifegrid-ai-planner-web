# Acceptance — v0.5.26

- [x] External models receive stable IDs and examples for ADD, UPDATE, MOVE, RESCHEDULE, RECATEGORIZE, HIDE, RESTORE, DETACH, and DELETE.
- [x] Stable-ID deletion parses for Categories, Projects, Tasks, and Events; People and People Schedule deletion block.
- [x] Other is protected; missing targets and selected contradictions block atomically.
- [x] Unselected deletes do not affect transaction validity; selected conflicts respond live.
- [x] Task/Event links and surviving child parents are repaired.
- [x] Category deletion rehomes surviving records to Other and recolors Events; Project deletion detaches surviving records.
- [x] Impact counts exclude records also selected for deletion.
- [x] Recurring and high-impact Event warnings remain explicitly approvable.
- [x] Deletions default unchecked with individual, subset, bulk controls, backup guidance, and final confirmation.
- [x] AI Interchange 5; backup schema 7 unchanged.
- [x] Local unit suite, typecheck, and build pass.
- [ ] Hosted Chromium, Firefox, WebKit, GitHub Actions, and Vercel conclusions require the existing PR branch to be pushed.
