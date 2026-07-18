# Entity quality contract
`normalizeEntityDisplayName` trims and collapses Unicode whitespace without fabricating text. Additions require Task/Project `name`, Event/Person Schedule `title`, and Category/Person `label`. Empty, placeholder, generic, punctuation-only, UUID/generated-ID, date-only, and time-only identities block application. Updates remain sparse and use authoritative merged labels.
