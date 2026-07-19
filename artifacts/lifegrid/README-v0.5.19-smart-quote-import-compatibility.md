# LifeGrid v0.5.19 smart-quote import compatibility

LifeGrid v0.5.19 accepts U+201C opening and U+201D closing quotation marks when an otherwise valid Universal AI Interchange v4 JSON patch has had its structural delimiters typographically substituted. It first parses the extracted JSON unchanged. Only on a parse failure containing those characters does it scan and normalize recoverable delimiters, then calls `JSON.parse` again.

Blanket replacement is unsafe because valid ASCII JSON can legitimately contain typographic prose quotes. The scanner preserves those strings and U+2019 apostrophes exactly. Schema validation, proposal review, duplicate/reference checks, dependency selection, and atomic apply are unchanged.
