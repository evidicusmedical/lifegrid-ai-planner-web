# Local-time runtime contract

LifeGrid Events use entered `YYYY-MM-DD` dates, optional `endDate`, and entered local `HH:MM` values directly. Runtime rendering, sorting, validation, AI context, and export do not project Events through calendar timezones, UTC offsets, daylight-saving calculations, or browser timezone detection. Legacy timezone fields are accepted only to be discarded during normalization. ICS DTSTAMP and generated-at metadata remain permitted metadata timestamps.
