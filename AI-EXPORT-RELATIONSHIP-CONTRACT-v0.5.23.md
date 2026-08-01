# AI export and relationship contract

`generateUniversalCurrentPackage` is the sole UI-facing generator and delegates scope selection to `selectAIExportData`. Complete export includes every catalog and record. Range export retains complete Category, Project, and People catalogs plus every undated Task, while intersecting ranged Events/schedules and filtering dated Tasks/Milestones to the inclusive interval. The context carries calendar metadata, app/interchange/backup versions, inclusion rules, and selected counts.

Legacy `parentTaskId`, `linkedEventIds`, and `linkedTaskIds` remain exported as read-only context. AI additions are forced flat and AI update fields for those relationships are ignored once, with a non-blocking warning. Use `category` for classification, `projectId` for workstreams, and notes fields for sequencing/dependency context. New and modified Events use only `all-day` or `timed`.
