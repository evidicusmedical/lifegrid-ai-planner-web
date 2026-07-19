# Event temporal import contract

v4 accepts `all-day`, `timed`, `unknown`, and `approximate`. All-day and unknown require null times; timed requires two valid `HH:MM` times; approximate never invents times. Explicit invalid statuses are rejected with the event field path. Missing legacy status infers `timed` only with both valid times, otherwise `unknown`. `endDate` and `recurringGroupId` are preserved; omitted update fields are unchanged. No timezone field or conversion is used.
