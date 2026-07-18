# LifeGrid v0.5.14 — Local time, low latency
Events now store only entered calendar dates and `HH:MM` clock values. They do not move by location. Legacy schema 6 timezone metadata is discarded on restore; schema 7 backups omit it.
