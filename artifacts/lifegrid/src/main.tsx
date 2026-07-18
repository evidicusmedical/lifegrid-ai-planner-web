import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { StartupBoundary } from "./components/StartupRecovery";
import { initializeStartupDiagnostics, isChunkLoadFailure, recordStartupError, recoverChunkOnce, setStartupPhase } from "./lib/startup";

initializeStartupDiagnostics();
window.addEventListener('error', event => { recordStartupError(event.error ?? event.message); if (isChunkLoadFailure(event.error ?? event.message)) void recoverChunkOnce(); });
window.addEventListener('unhandledrejection', event => { recordStartupError(event.reason); if (isChunkLoadFailure(event.reason)) void recoverChunkOnce(); });
// v0.5.15 intentionally removes the old offline app-shell worker: stale HTML must never reference removed chunks.
if ('serviceWorker' in navigator) void navigator.serviceWorker.getRegistrations().then(registrations => Promise.all(registrations.map(registration => registration.unregister())));
const root = document.getElementById("root");
if (!root) throw new Error('LifeGrid root is missing');
setStartupPhase('render');
createRoot(root).render(<StartupBoundary><App /></StartupBoundary>);
setStartupPhase('ready');
