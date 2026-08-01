# AI export and relationship contract

The normal export starts at **All data** and includes complete catalogs and records, completed/undated Tasks, notes fields, metadata, versions, and legacy IDs as read-only context. Advanced ranges always retain complete Category/Project/People catalogs and every undated Task; inclusive intersections select Events/schedules, while due/target dates select Tasks/milestones. Restricted scope loses context outside the range.

AI may use `category` for classification and optional `projectId` for workstreams. Adds force Task `parentTaskId: null`, Task `linkedEventIds: []`, and Event `linkedTaskIds: []`; updates ignore these fields and warn non-blockingly. Stored/manual/backup links remain intact. Deletion remains unsupported with the disclosed Blocked/manual-review workaround.
