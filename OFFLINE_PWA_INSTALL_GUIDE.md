# LifeGrid — Offline & PWA Install Guide

LifeGrid is a **Progressive Web App (PWA)**. Once installed, it:

- Opens in its own window (no browser chrome)
- Loads instantly — even with no internet connection
- Stores all data locally on your device (nothing sent to a server)

---

## Installing on iPhone / iPad (Safari)

1. Open LifeGrid in **Safari** (not Chrome — iOS PWA install requires Safari)
2. Tap the **Share button** (the box with an upward arrow ↑) in the toolbar
3. Scroll down in the share sheet and tap **Add to Home Screen**
4. Optionally rename it, then tap **Add** in the top-right corner
5. LifeGrid now appears on your home screen and opens like a native app

> **Tip:** On iOS, the app cache is controlled by Safari. If you clear Safari's cache, the offline cache will be cleared too. Keep a JSON backup to protect your data.

---

## Installing on Android (Chrome)

1. Open LifeGrid in **Chrome**
2. Tap the **⋮ menu** (three dots) in the top-right corner
3. Tap **Add to Home screen** or **Install app**
4. Confirm by tapping **Add** or **Install**

Chrome may also show an automatic install banner at the bottom of the screen when it detects a qualifying PWA.

---

## Installing on Desktop (Chrome / Edge)

1. Open LifeGrid in Chrome or Edge
2. Look for the **install icon** (⊕ or a screen-with-arrow icon) in the browser's address bar
3. Click it and choose **Install**
4. LifeGrid opens as a standalone desktop app

---

## How offline works

LifeGrid uses a **Workbox app-shell** service worker. On first load:

- The app shell (HTML, CSS, JS, icons) is pre-cached
- Subsequent loads serve from cache — no network needed

Your **calendar data** is stored in `localStorage` on your device. The service worker caches the app code; your events/tasks are separate and always available offline.

---

## Keeping your data safe

Since LifeGrid is entirely local, your data is only on the device where you use it.

**Recommended practice:**
- Go to **Settings → Data & backup** and tap **Download backup (.json)** weekly
- Store the file somewhere safe (iCloud, Google Drive, email to yourself)
- To restore: tap **Restore from backup** and select the `.json` file

The backup status indicator in Settings turns amber if you haven't backed up in 7+ days.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| App not loading offline | Check that you installed it (it won't cache until installed on some browsers) |
| Old version showing | Pull-to-refresh or force-refresh; the service worker auto-updates |
| Install option missing | Make sure you're using Safari on iOS or Chrome/Edge on Android/desktop |
| Data missing after reinstall | Data lives in the browser's localStorage — reinstalling clears it. Always keep a backup. |
---

## v0.3.1 note

The Settings screen now uses a shorter "Install & use offline" explanation. Offline/PWA behavior is unchanged: LifeGrid remains local-first, and JSON backup is still the main protection against browser/site-data deletion.
