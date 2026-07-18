# v0.5.0 Acceptance Checklist

**Environment:** Browser [ ], Device [ ], viewport [ ], version v0.5.0 [ ], test calendar [ ], backup completed [ ]. Screenshot: [ ]. Console errors: [ ].

## Dashboard
- [ ] Summary counts; [ ] saved order; [ ] status/health/category filters; [ ] overdue/milestone/no-action filters; [ ] case-insensitive search; [ ] sorting; [ ] health text explanations; [ ] progress; [ ] next action/milestone; [ ] empty filter state.
## Detail and milestones
- [ ] Open/completed/overdue/unscheduled tasks; [ ] linked/upcoming/past/unknown/approximate events; [ ] edit Project; [ ] task completion and normal task editing; [ ] event editing.
- [ ] Add/edit milestone; [ ] complete/reopen; [ ] reorder; [ ] confirmed delete; [ ] date-only behavior; [ ] touch actions; [ ] calendar isolation.
## Calendar / compatibility
- [ ] Empty removes Projects/Milestones; [ ] Copy Structure; [ ] Duplicate; [ ] fictional sample; [ ] switching closes/updates detail.
- [ ] backup download; [ ] v6 restore; [ ] older restore; [ ] milestone preservation/order/date; [ ] multiple calendars. [ ] current AI export; [ ] starter prompt; [ ] existing v4 patch; [ ] unsupported milestone patch message.
## Mobile / recovery
- [ ] metric/card/filter wrapping; [ ] detail height; [ ] no horizontal overflow. [ ] Restore original backup; [ ] confirm active calendar/data.

**Severity:** Blocker = data loss/security; High = unusable core workflow; Medium = incorrect/major usability; Low = cosmetic. **Stop:** stop on blocker, unexpected cross-calendar data, orphan milestones, date shift, or failed restore. **Recovery:** stop testing, restore the pre-test downloaded backup, select original calendar, verify project/milestone counts, record console errors and screenshot.
