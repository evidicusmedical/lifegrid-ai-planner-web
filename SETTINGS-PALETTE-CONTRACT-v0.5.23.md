# Settings and palette contract

Category, Project, and People management retain stable-ID full-array reorder semantics while searched. Shared Up/Down controls remain accessible. Project clear/reassign updates both Tasks and directly assigned Events.

The first 16 palette values are immutable. Sixteen new, uniquely named hue/chroma/lightness families are appended; arbitrary existing user colors are preserved without migration. Pairwise separation is calculated in CIE L*a*b* with CIE76 distance. Required minimum is 12; the final minimum is approximately 12.57 (`#4338ca` / `#1d4ed8`, an immutable legacy pair).
