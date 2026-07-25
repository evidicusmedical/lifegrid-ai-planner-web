# Local-time event editor contract — v0.5.22

New and edited Event and People Schedule forms expose only stored `date`, `endDate`, `startTime`, and `endTime`; Specific timezone and Floating local time controls and conversion-oriented help are absent. All-day Event editing includes an explicit End date. No UTC normalization, timezone lookup, runtime conversion, or locale date shifting was added.

New records store timezone compatibility fields as null. Editing a legacy record carries its existing `timeZone` and `timeZoneMode` through opaquely while displaying and saving local values unchanged. An explicitly edited all-day end date is authoritative and remains subject to normal validation. For an untouched end, valid stored ranges remain intact, valid duration follows a moved start, and missing or stale ends repair to the Event date. Opening Settings or an editor does not migrate historical records.
