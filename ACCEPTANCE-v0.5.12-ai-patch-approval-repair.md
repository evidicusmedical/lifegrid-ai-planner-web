# v0.5.12 acceptance procedure
1. Confirm the footer shows v0.5.12 and download a JSON backup.
2. Paste the privately supplied response (never commit it), choose Review Preflight, and verify warnings, blocking errors, and information are separated.
3. With zero blocking errors, verify **Approve and Apply N Selected** is enabled despite warnings.
4. Deselect an independent record (still enabled), then a required same-patch addition (its dependent becomes blocking); reselect it.
5. Apply and confirm one success message, retained omitted task fields, linked event/task records, backup counts, and refresh persistence.
6. Paste a deliberately invalid copy and verify failure reports no partial changes.
