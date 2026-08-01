# Settings and palette contract

Category, Project, and People management retain stable-ID full-array reorder semantics while searched. Shared Up/Down controls remain accessible. Project clear/reassign updates both Tasks and directly assigned Events.

The first 16 palette values are immutable. Sixteen new, uniquely named hue/chroma/lightness families are appended; arbitrary existing user colors are preserved without migration. Pairwise separation is calculated in CIE L*a*b* with CIE76 distance. Required minimum is 12; the final minimum is approximately 12.57 (`#4338ca` / `#1d4ed8`, an immutable legacy pair).

Text rendered directly over arbitrary Category/Event colors uses WCAG relative luminance to choose whichever of black or white has the greater contrast. Every preset passes 4.5:1; malformed input safely falls back to white without modifying stored color data. Category, Project, and People managers share the same Chevron Up/Down component, and Event-only Project usage receives the same assignment clear/reassign UI as Task usage.
