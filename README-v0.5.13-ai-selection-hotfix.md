# v0.5.13 AI selection hotfix

This narrowly scoped release repairs AI review selection identity. Review checkboxes, counts, readiness, and the submitted filtered patch now use the canonical `entityType:operation:recordId` proposal key. Valid parsed proposals are initialized into the authoritative selection set once per pasted-patch session. AI interchange remains v4 and backup schema remains v6.
