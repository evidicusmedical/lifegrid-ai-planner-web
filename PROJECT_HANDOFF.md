# LifeGrid AI Planner — Project Handoff Document

> Created June 2026. No application code was modified to produce this document.

---

## 1. Project Overview

**App name:** LifeGrid AI Planner

**What it does:**
LifeGrid is a personal life-planning calendar app designed to run entirely inside your iPhone's Safari browser (or any modern browser). You plan your year on a scrollable horizontal grid — weeks run left to right, people/sections run top to bottom — and export your full calendar as a structured prompt that you paste into an AI model (ChatGPT, Claude, etc.) to get scheduling advice, conflict analysis, or a suggested weekly plan.

**Main features:**
- Horizontal scrolling yearly grid showing events colour-coded by category
- Five main tabs: Grid, Tasks, People, AI, Settings
- Events with optional times, multi-day ranges, recurring series
- Task tracker with status, priority, due date, owner, next action, and scheduling notes (these notes export to AI so it understands constraints)
- People / family-member schedules shown as separate rows on the grid
- AI export: generates a structured plain-text summary of your calendar for a chosen date range, which you copy/paste into ChatGPT or Claude — multiple prompt styles available
- AI import: paste back the AI's JSON reply to bulk-add/update events and tasks
- Calendar versioning — create named "versions" so you can compare before/after an AI import
- Settings: manage custom categories (colour + label), people, calendar versions, JSON backup/restore, and theme toggle (light/dark)
- PNG export of the grid view
- Recurring events/tasks (daily, weekly, bi-weekly, monthly) and multi-day events — all linked so you can delete the whole series at once

**Current limitations:**
- No backend — all data lives in your browser's localStorage. Clearing site data in Safari wipes everything.
- No account/sync — data does not roam between devices or browsers automatically (use the JSON backup in Settings to move data)
- Not a true offline/PWA app — it loads from the internet; once loaded it works without a connection, but a fresh load in airplane mode will fail because there is no service worker
- The AI features require you to manually copy/paste prompts to and from an external AI — there is no direct API connection to ChatGPT or Claude
- No push notifications or reminders

---

## 2. Technology Stack

| Area | Choice |
|---|---|
| Framework | React 19 (with hooks) |
| Language | TypeScript 5.9 |
| Package manager | pnpm 9 (monorepo / workspace) |
| Build tool | Vite 7 |
| Styling | Tailwind CSS v4 (utility classes) |
| UI component library | shadcn/ui (built on Radix UI primitives) |
| Form handling | react-hook-form + zod (validation) |
| Icons | lucide-react |
| Animation | framer-motion, tw-animate-css |
| Grid/chart export | html-to-image (renders DOM to PNG) |
| Backend / server | **None** — purely client-side |
| Database | **None** — browser localStorage only |
| Authentication | **None** |
| Deployment | Replit (served via Replit's hosting infrastructure) |

---

## 3. File and Folder Map

All application code lives inside `artifacts/lifegrid/`. Everything outside that folder is monorepo scaffolding that you do not need to edit.

```
artifacts/lifegrid/
├── index.html              Entry HTML page — safe to edit title/meta tags only
├── vite.config.ts          Build configuration — DO NOT edit (Replit-specific)
├── tsconfig.json           TypeScript settings — leave alone
├── package.json            Dependencies — edit only to add/remove packages
├── components.json         shadcn/ui component registry — leave alone
├── public/
│   ├── favicon.svg         App icon shown in browser tab — safe to replace
│   └── opengraph.jpg       Social share image — safe to replace
└── src/
    ├── main.tsx            App entry point — leave alone
    ├── App.tsx             Root component, tab routing — safe to read; minor edits OK
    ├── index.css           Global CSS + Tailwind theme tokens — colours live here
    ├── types/
    │   └── index.ts        ★ ALL data type definitions — read this first
    ├── context/
    │   └── AppDataContext.tsx  ★ All data logic, localStorage read/write, CRUD — central file
    ├── lib/
    │   ├── sampleData.ts   Default categories, people, and sample events loaded on first run
    │   ├── aiPrompt.ts     ★ Generates the AI export text — easiest file to customise
    │   ├── format.ts       Date/time formatting helpers
    │   └── utils.ts        Tailwind class merging utility (leave alone)
    ├── pages/
    │   ├── GridView.tsx    ★ The main calendar grid — most complex file
    │   ├── TasksView.tsx   Task list with filters and quick-done
    │   ├── PeopleView.tsx  People/family schedule rows
    │   ├── AIView.tsx      AI export/import interface
    │   ├── SettingsView.tsx  Categories, people, versioning, backup, theme
    │   └── not-found.tsx   404 page
    ├── components/
    │   ├── BottomNav.tsx       Tab bar at the bottom — safe to edit labels/icons
    │   ├── EventSheet.tsx      ★ Add/edit event form (slide-up panel)
    │   ├── TaskSheet.tsx       Add/edit task form
    │   ├── PersonEventSheet.tsx  Add/edit person-event form
    │   ├── DayDetailSheet.tsx  Panel showing all events for a tapped day
    │   └── ui/                 shadcn/ui primitive components — DO NOT edit
    └── hooks/
        ├── use-mobile.tsx  Detects mobile viewport
        └── use-toast.ts    Toast notification hook
```

### Edit safety guide

| File | Safe to edit? | What breaks if you get it wrong |
|---|---|---|
| `types/index.ts` | With care | Every other file depends on these types; a typo here causes a cascade of TypeScript errors across the whole app |
| `AppDataContext.tsx` | With care | All data storage and retrieval; a bug here can corrupt or lose your calendar data |
| `aiPrompt.ts` | Yes — easiest | Only affects AI export text; a bug produces a bad prompt, not a crash |
| `sampleData.ts` | Yes | Only affects fresh installs; existing data is unaffected |
| `pages/*.tsx` | Yes | Bugs are isolated to that tab; other tabs continue working |
| `components/EventSheet.tsx` etc | Yes | Only affects the specific form; other forms are unaffected |
| `index.css` | Yes — colour edits are safe | Changing CSS variable names (not values) will break all component colours |
| `components/ui/*.tsx` | Avoid | These are auto-generated shadcn primitives; changes may be overwritten and can break all UI |
| `vite.config.ts` | Avoid | Misconfiguring this breaks the build and dev server entirely |

---

## 4. How the App Runs

### Commands (run from the monorepo root unless noted)

| Purpose | Command |
|---|---|
| Install all dependencies | `pnpm install` |
| Start dev server (hot-reload) | `pnpm --filter @workspace/lifegrid run dev` |
| Type-check only | `pnpm --filter @workspace/lifegrid run typecheck` |
| Build for production | `PORT=3000 BASE_PATH=/ pnpm --filter @workspace/lifegrid run build` |
| Preview production build | `PORT=3000 BASE_PATH=/ pnpm --filter @workspace/lifegrid run serve` |

### Required environment variables (for Vite dev server and build)

| Variable | Example value | Purpose |
|---|---|---|
| `PORT` | `3000` | Which port the dev/preview server listens on |
| `BASE_PATH` | `/` | URL path prefix — use `/` for running at the root |

**Important:** `vite.config.ts` throws an error on startup if either variable is missing. On Replit these are set automatically. When running locally, set them before running the command:
```bash
export PORT=3000
export BASE_PATH=/
pnpm --filter @workspace/lifegrid run dev
```

### Required configuration files

| File | Purpose | Can be deleted? |
|---|---|---|
| `pnpm-lock.yaml` (root) | Exact dependency versions, ensures reproducible installs | No — deleting causes `pnpm install` to re-resolve everything, which can change versions |
| `pnpm-workspace.yaml` (root) | Tells pnpm which folders are workspace packages | No |
| `package.json` (root + artifact) | Dependencies and scripts | No |
| `tsconfig.json` (artifact) | TypeScript compiler settings | No |
| `vite.config.ts` (artifact) | Build and dev server configuration | No |
| `.replit` (root, hidden) | Replit workflow and run commands | Only needed on Replit |

---

## 5. Data Storage

**Where data is stored:** Entirely in the browser's `localStorage` under these keys:

| Key | Contents |
|---|---|
| `lifegrid_store_v5` | All calendar data — events, tasks, person-events, categories, people, calendar versions |
| `lifegrid_theme` | Light or dark mode preference |
| `lifegrid_ai_draft_v1` | Temporarily saved AI prompt draft (expires after 72 hours) |

**Local-only:** No server, no cloud sync. Data exists only in the browser you used to create it.

**Your entered data is NOT included in a code export/ZIP.** When you download the project code, localStorage contents are not part of the files — they live in the browser. To preserve your data:

1. Open the app → go to **Settings** tab → **Data & Backup** section
2. Tap **Download JSON Backup** — this saves a `.json` file containing everything
3. To restore on another device/browser: open the app there → Settings → **Import JSON Backup** → pick the file

---

## 6. Environment Variables and Secrets

This app has **no API keys, tokens, or secrets.** There is no connection to external services, databases, or APIs.

The only "environment variables" it uses are:

| Variable | Secret? | Purpose |
|---|---|---|
| `PORT` | No | Dev server port — any number like `3000` works |
| `BASE_PATH` | No | URL base path — use `/` for root |

If you move the project elsewhere, you do not need to recreate any secrets. You only need to ensure `PORT` and `BASE_PATH` are set when running the Vite server or build command.

---

## 7. Export / Backup Instructions

### A — Download as ZIP from Replit (easiest)

1. In the Replit interface, click the three-dot menu (⋯) next to your Repl name in the left sidebar
2. Select **Download as zip**
3. The ZIP will download to your computer — it contains the full project code
4. **Remember:** your calendar data (events, tasks, etc.) is NOT in this ZIP — back it up separately from the app's Settings tab

### B — Create a ZIP manually from the Replit Shell (if the menu option fails)

1. Open the Replit Shell (terminal)
2. Run this command (it excludes `node_modules` to keep the file small):
   ```bash
   zip -r lifegrid-export.zip . -x "*/node_modules/*" -x ".git/*" -x "*/dist/*"
   ```
3. The file `lifegrid-export.zip` will appear in the file browser
4. Right-click it → **Download**

### C — Connect to GitHub and push

1. In the Replit left sidebar, click the **Git** icon (branch icon) or go to **Version Control**
2. Click **Connect to GitHub**
3. Authorise Replit to access your GitHub account
4. Click **Create a GitHub repository**
5. Choose a name (e.g. `lifegrid-planner`), set it to **Private**
6. Click **Create repository**
7. Replit will automatically push the current code to GitHub
8. To confirm: open `github.com/YOUR_USERNAME/lifegrid-planner` — you should see all the files there

### D — Push future updates to GitHub

After making changes in Replit:
1. Go to the Git panel in Replit
2. Stage your changed files
3. Write a commit message (e.g. "added new feature")
4. Click **Commit & Push**

### Confirming the export worked

- Open the ZIP or GitHub repo and verify you can see `artifacts/lifegrid/src/` and `artifacts/lifegrid/package.json`
- Open `artifacts/lifegrid/src/pages/GridView.tsx` — if it contains readable React code, the export is intact

---

## 8. How to Run Elsewhere

### Prerequisites (all environments)
- Node.js 18 or later
- pnpm (`npm install -g pnpm`)

---

### VS Code or Cursor (local machine)

```bash
# 1. Unzip the downloaded project
# 2. Open the folder in VS Code / Cursor
# 3. Open the integrated terminal

# Install dependencies
pnpm install

# Start the dev server
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/lifegrid run dev

# Open http://localhost:3000 in your browser
```

Recommended VS Code extensions: ESLint, Prettier, Tailwind CSS IntelliSense, TypeScript + JavaScript support.

---

### GitHub Codespaces

1. Push the code to GitHub (Section 7C above)
2. Open the repo on github.com → click **Code** → **Codespaces** → **Create codespace**
3. Once the cloud environment loads, open the terminal and run:
   ```bash
   pnpm install
   PORT=3000 BASE_PATH=/ pnpm --filter @workspace/lifegrid run dev
   ```
4. Codespaces will show a popup offering to open the forwarded port — click it

---

### Another Replit project

1. Create a new Replit
2. Open the Shell and run:
   ```bash
   git clone https://github.com/YOUR_USERNAME/lifegrid-planner.git .
   pnpm install
   ```
3. Set up the workflow to run: `pnpm --filter @workspace/lifegrid run dev`
4. Set the `PORT` environment variable to whatever Replit assigns

---

### Generic local environment (Linux / macOS / WSL)

```bash
# Install pnpm if you don't have it
npm install -g pnpm

# Clone or unzip the project, then:
cd lifegrid-planner
pnpm install

# Run dev server
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/lifegrid run dev

# Or build + preview production version
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/lifegrid run build
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/lifegrid run serve
```

---

### Simplifying the vite.config.ts for outside-Replit use

The current `vite.config.ts` throws an error if `PORT` or `BASE_PATH` aren't set, because it was designed for Replit's environment. If you want to run the project more simply elsewhere, you can replace the top of `vite.config.ts` with:

```typescript
const port = Number(process.env.PORT ?? 3000);
const basePath = process.env.BASE_PATH ?? '/';
```

This makes both variables optional and defaults to `3000` / `/`. You can also remove the Replit-specific plugins (`@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner`, `@replit/vite-plugin-runtime-error-modal`) from the plugins array when running outside Replit.

---

## 9. Deployment / Publishing Notes

**Current setup:** Deployed via Replit's built-in hosting. The app is served as a static site (pre-built HTML/CSS/JS) from Replit's CDN/infrastructure.

**Is this a static site?** Yes — once built, the output is a folder of static files (`artifacts/lifegrid/dist/public/`) with no server-side logic. Any static host can serve it.

**Does it need a backend server?** No. There is no server component.

**Lowest-cost hosting options (outside Replit):**

| Host | Cost | Notes |
|---|---|---|
| Netlify | Free tier | Drag-and-drop the `dist/public` folder or connect GitHub for auto-deploy |
| Vercel | Free tier | Connect GitHub repo; set `BASE_PATH=/` in environment settings |
| GitHub Pages | Free | Works but requires some configuration for the correct base path |
| Cloudflare Pages | Free | Very fast CDN; similar GitHub-connect workflow to Netlify |

For any of these, the build command is:
```bash
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/lifegrid run build
```
And the publish directory is: `artifacts/lifegrid/dist/public`

**Risks of keeping it publicly published on Replit:**
- The app URL is publicly accessible — anyone with the link can use it, but since all data is stored in the visitor's own browser localStorage, there is no shared data exposure
- No authentication means no access control — add auth if you want to restrict who can load the app
- Replit's free tier may "sleep" the project after inactivity, causing a slower first load

---

## 10. Reverse Engineering Guide

### Files to read first (in this order)

1. **`src/types/index.ts`** — Start here. This file defines every data shape: `Event`, `Task`, `PersonEvent`, `Category`, `Person`, `Calendar`. Once you understand these types, everything else makes sense.

2. **`src/lib/sampleData.ts`** — See the default categories, people, and sample events. This shows you what real data looks like.

3. **`src/context/AppDataContext.tsx`** — This is the brain. It loads data from localStorage, exposes it to the whole app via React context, and defines every add/update/delete operation. Understanding this file means understanding how all data flows.

4. **`src/App.tsx`** — Short file. Shows the five-tab structure and which page component renders for each tab.

5. **`src/pages/GridView.tsx`** — The most complex view. Study this after understanding the data model.

### Files that control the UI
- `src/pages/*.tsx` — One file per tab: what the user sees and interacts with
- `src/components/EventSheet.tsx`, `TaskSheet.tsx`, `PersonEventSheet.tsx` — The slide-up forms for creating/editing items
- `src/index.css` — All theme colours (CSS variables at the top of the file)

### Files that control data storage
- `src/context/AppDataContext.tsx` — All localStorage reads and writes happen here
- `src/types/index.ts` — The shape of everything stored

### Files that control AI export/import logic
- `src/lib/aiPrompt.ts` — Generates the text prompt exported to AI. This is where you can change what information is included, how it's formatted, and what instructions are given to the AI model.
- `src/pages/AIView.tsx` — The UI for selecting prompt type, date range, copying the prompt, pasting the AI response back, and importing it

### Easiest features to modify safely
- Text labels anywhere in the app (button names, section headings, placeholder text)
- The AI prompt text in `src/lib/aiPrompt.ts`
- Colours of categories (in Settings, or change defaults in `sampleData.ts`)
- The order of fields in a form (`EventSheet.tsx` etc.)
- Adding a new field to a form (requires changes in 3 places: `types/index.ts`, `AppDataContext.tsx`, and the relevant sheet component)

### Areas to avoid until you understand the project better
- The `src/components/ui/` folder — auto-generated, do not manually edit
- The storage migration logic in `AppDataContext.tsx` (the section that reads the old `lifegrid_data` key and migrates it) — bugs here can corrupt existing user data
- `vite.config.ts` — misconfiguring it silently breaks the build

---

## 11. Safe Next Experiments

These are low-risk changes to try on a copy of the project after you've exported it:

1. **Change the AI prompt introduction text**
   Open `src/lib/aiPrompt.ts`. Find the function that builds the prompt string. Change the opening paragraph to describe your situation differently. The worst outcome is a worse AI response — nothing in the app breaks.

2. **Add a new colour to the default categories**
   Open `src/lib/sampleData.ts`. Find `DEFAULT_CATEGORIES`. Change the `color` hex value for one category (e.g. change Work from `#2563eb` to `#e11d48` for red). Reload the app — existing users won't see the change (their data is already in localStorage), but fresh installs will.

3. **Change a button label**
   Open `src/components/EventSheet.tsx`. Find `'Save Event'` and change it to whatever you like. This is pure UI text with zero logic implications.

4. **Add a "Location" field to events**
   This is a good beginner challenge:
   - Add `location?: string | null` to the `Event` interface in `types/index.ts`
   - Add a location `Input` field in `EventSheet.tsx` (copy any existing field's pattern)
   - Include it in the `addEvent`/`updateEvent` calls
   - Optionally display it in `GridView.tsx` or `DayDetailSheet.tsx`

5. **Adjust the default number of recurring occurrences**
   Open `src/components/EventSheet.tsx`. Find `const [repeatCount, setRepeatCount] = useState(4)`. Change `4` to `8` (or any number). Now the repeat stepper defaults to 8 occurrences instead of 4.

---

## 12. Risks and Missing Pieces

| Issue | Severity | Detail |
|---|---|---|
| **No offline support** | Medium | The app requires an internet connection to load. A service worker / PWA setup would fix this but has not been added yet. |
| **Data loss if browser storage is cleared** | High | localStorage can be wiped by Safari's "Clear History and Website Data", low storage conditions, or browser settings. The JSON backup in Settings is the only safeguard — it is not automatic. |
| **No cross-device sync** | Medium | Data is locked to the browser it was created in. Moving to a new phone requires a manual JSON backup/restore. |
| **No authentication** | Low (current use) | Anyone with the URL can load the app, though they get their own empty localStorage, not yours. Add auth if you share the URL publicly and want access control. |
| **Replit-specific vite.config.ts** | Medium | `vite.config.ts` requires `PORT` and `BASE_PATH` env vars and includes Replit-specific plugins. Needs minor editing to work cleanly outside Replit (see Section 8). |
| **node_modules not portable** | Normal | The `node_modules` folder is not included in a ZIP export. Always run `pnpm install` after moving the project to a new machine. |
| **Replit plugins outside Replit** | Low | `@replit/vite-plugin-cartographer` and related plugins will throw warnings or errors outside Replit. Remove them from `vite.config.ts` when running elsewhere. |
| **AI is manual copy/paste only** | By design | There is no live API key for ChatGPT or Claude. This is intentional (avoids costs/secrets) but means the AI workflow requires the user to switch apps. |
| **localStorage key versioning** | Low | The store key is `lifegrid_store_v5`. If a future code change increments this to `v6`, all existing browser data migrates automatically — but only if the migration logic is correct. Always test migrations carefully. |

---

*Document generated from code inspection of the live Replit project. No code was modified.*
