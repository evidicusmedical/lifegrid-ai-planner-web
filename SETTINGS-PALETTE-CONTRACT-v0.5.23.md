# Settings and palette contract

Category, Project, and People management use stable IDs when filtered so Up/Down mutates the full ordered collection. Category and People search changes only the visible list. Up/Down remains the accessible ordering mechanism; drag-and-drop is intentionally absent. Flagged review analyzers remain compatible but the visible Settings section is removed.

The shared palette retains the original 16 in order and appends ruby/orange/sunflower/lime/green/mint/turquoise/sky/blue/royal/iris/purple/fuchsia/pink/ochre/steel families. All 32 normalized values and family names must be unique. Existing arbitrary colors are prepended unchanged. Practical review uses distinct hue/family identity rather than bulk recoloring or a destructive minimum-distance migration.
