# LifeGrid Export Checklist

Follow these steps in order. Each section is independent — you can do them on different days.

---

## Part 1 — Back up your calendar data (do this first)

Your events, tasks, and people live in the browser, not in the code. A code export does NOT include them.

- [ ] Open the live app in your browser
- [ ] Tap the **Settings** tab (gear icon, bottom right)
- [ ] Scroll to **Data & Backup**
- [ ] Tap **Download JSON Backup**
- [ ] Confirm a `.json` file was saved to your device
- [ ] Open the file and confirm it contains your events/tasks (it should be readable text)
- [ ] Store the `.json` file somewhere safe (iCloud, Google Drive, email to yourself)

---

## Part 2 — Download the code as a ZIP

- [ ] In Replit, click the **three-dot menu (⋯)** next to the Repl name in the left sidebar
- [ ] Select **Download as zip**
- [ ] Confirm `workspace.zip` (or similar) downloaded to your computer
- [ ] Unzip it and open the folder
- [ ] Verify the folder `artifacts/lifegrid/src/` exists inside it
- [ ] Verify `artifacts/lifegrid/src/pages/GridView.tsx` opens and contains readable code

**If the menu option is missing or fails — use the Shell instead:**
- [ ] Open the Replit **Shell** tab
- [ ] Run: `zip -r lifegrid-export.zip . -x "*/node_modules/*" -x ".git/*" -x "*/dist/*"`
- [ ] Wait for it to finish (10–30 seconds)
- [ ] The file `lifegrid-export.zip` will appear in the file tree — right-click → **Download**

---

## Part 3 — Push to a private GitHub repository

- [ ] In Replit, click the **Git** icon in the left sidebar (looks like a branch)
- [ ] Click **Connect to GitHub** and authorise Replit if prompted
- [ ] Click **Create a GitHub repository**
- [ ] Set the name (e.g. `lifegrid-planner`) and choose **Private**
- [ ] Click **Create repository**
- [ ] Confirm you see a success message and a GitHub link
- [ ] Open `github.com/YOUR_USERNAME/lifegrid-planner` in your browser
- [ ] Confirm the files are there — especially `artifacts/lifegrid/src/`

---

## Part 4 — Verify you can run the project elsewhere

Test that the code export actually works by running it locally or in a cloud editor.

**Quick local test (requires Node.js + pnpm):**

- [ ] Install pnpm if needed: `npm install -g pnpm`
- [ ] Unzip the downloaded project and open a terminal in that folder
- [ ] Run: `pnpm install`
- [ ] Run: `pnpm --filter @workspace/lifegrid run dev`  *(PORT defaults to 3000, BASE_PATH defaults to /)*
- [ ] Open `http://localhost:3000` in your browser
- [ ] Confirm the app loads (it will be empty — your data is in the other browser's localStorage)
- [ ] Import your JSON backup: Settings → Data & Backup → Import JSON Backup → select the `.json` file
- [ ] Confirm your events and tasks appear

**Alternative — test in GitHub Codespaces (no local install needed):**

- [ ] Open your GitHub repo → click **Code** → **Codespaces** → **Create codespace on main**
- [ ] Wait for the environment to build (~2 minutes)
- [ ] In the Codespaces terminal: `pnpm install`
- [ ] Then: `pnpm --filter @workspace/lifegrid run dev`
- [ ] Click the **Open in Browser** popup that appears
- [ ] Confirm the app loads

---

## Part 5 — Preserve secrets and environment variables

- [ ] Confirm there are **no API keys or secrets** to preserve — this app has none ✓
- [ ] The only required variables when running outside Replit are:
  - `PORT` — any number, e.g. `3000`
  - `BASE_PATH` — use `/`
- [ ] Note these are **not secret** — they are just configuration values

---

## Part 6 — Final verification checklist

- [ ] Code ZIP downloaded ✓
- [ ] Code visible on GitHub (private repo) ✓
- [ ] Calendar data backed up as `.json` file ✓
- [ ] `.json` backup stored somewhere safe (not only on the Replit server) ✓
- [ ] App successfully runs from the ZIP / GitHub clone ✓
- [ ] Data successfully restored from `.json` backup in the local/remote copy ✓

---

## Quick reference — key files to know

| What you want to change | File to open |
|---|---|
| AI export prompt text | `artifacts/lifegrid/src/lib/aiPrompt.ts` |
| Default categories and colours | `artifacts/lifegrid/src/lib/sampleData.ts` |
| Event / task form fields | `artifacts/lifegrid/src/components/EventSheet.tsx` |
| Data types (add a new field) | `artifacts/lifegrid/src/types/index.ts` |
| All data storage logic | `artifacts/lifegrid/src/context/AppDataContext.tsx` |
| Global colours / theme | `artifacts/lifegrid/src/index.css` |

## Quick reference — run commands

```bash
# Install dependencies (run once after cloning/unzipping)
pnpm install

# Start dev server with live reload (PORT defaults to 3000, BASE_PATH defaults to /)
pnpm --filter @workspace/lifegrid run dev

# Build for production
pnpm --filter @workspace/lifegrid run build

# Preview the production build
pnpm --filter @workspace/lifegrid run serve
```

Production build output is in: `artifacts/lifegrid/dist/public/`
This folder is what you upload to Netlify, Vercel, Cloudflare Pages, or GitHub Pages.

---

## v0.3.1 Patch-Generation Checklist

- Run `pnpm --filter @workspace/lifegrid run typecheck`.
- Run `pnpm --filter @workspace/lifegrid run build`.
- Confirm grid cell sorting: no-time/all-day first, timed events by start time, category order as secondary sort.
- Confirm PNG export disables controls, shows progress, and expands rows to include all events.
- Confirm the AI Planner defaults to AI Admin Assistant / compact context mode for routine planning.
- Confirm JSON patch mode prompts for minimal raw JSON with `completed_task_ids`, project/category assignments, and notes.
- Confirm Settings separates restorable JSON backup from readable `.txt` and calendar-only `.ics` exports.
- Final GitHub push and deployment should be performed from Replit, not from this workspace.
