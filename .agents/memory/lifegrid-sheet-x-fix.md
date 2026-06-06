---
name: LifeGrid Radix Sheet X-button suppression
description: How to hide the Radix-injected close X button in bottom-sheet modals without editing the shared ui/sheet.tsx component.
---

# Suppressing the duplicate X button in Radix SheetContent

Radix automatically injects a close `<button>` as the first child of `<SheetContent>`. When a custom X button is in the sticky header (as in EventSheet, TaskSheet, PersonEventSheet), this produces two X buttons on mobile.

## Fix

Add `[&>button:first-of-type]:hidden` to the SheetContent `className`:

```tsx
<SheetContent
  side="bottom"
  className="rounded-t-2xl overflow-hidden flex flex-col p-0 [&>button:first-of-type]:hidden"
  ...
>
```

**Why:** Editing `ui/sheet.tsx` globally would break every usage of Sheet that relies on the built-in close button. The Tailwind arbitrary-variant selector targets only the first injected button inside this specific SheetContent instance.

**How to apply:** Any new bottom-sheet modal with its own header close button must include this class. Do NOT remove it; the duplicate appears on mobile Safari even when invisible on desktop.
