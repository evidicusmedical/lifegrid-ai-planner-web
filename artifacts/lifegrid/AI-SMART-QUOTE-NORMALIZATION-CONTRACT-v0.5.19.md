# AI smart-quote normalization contract — v0.5.19

`normalizeTypographicJsonDelimiters` is a state machine, not a global replacement. Outside a string it converts U+201C only into an ASCII JSON opening delimiter. Within an ASCII-delimited string it preserves U+201C, U+201D, U+2019, and escaped content. Within a typographic-delimited string it converts U+201D only when the next non-whitespace character is `:`, `,`, `}`, `]`, or end of input; it preserves prose punctuation otherwise and escapes unescaped ASCII quote content.

The importer tries ordinary `JSON.parse` first and never rewrites a valid ASCII JSON document. If normalization fails, it makes no other syntax repair and returns actionable guidance. `JSON.parse` remains authoritative: no JSON5, JavaScript evaluation, comments, trailing commas, missing commas/braces, or schema repairs are accepted. All v4 schema, entity-quality, duplicate, reference, event, selection, and atomic-apply protections remain active.
