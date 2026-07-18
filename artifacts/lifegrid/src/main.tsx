import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { StartupBoundary, installStartupDiagnostics, markStartupPhase, recoverChunkOnce } from './startup';

installStartupDiagnostics();
window.addEventListener('error', event => { void recoverChunkOnce(event.error ?? event.message); });
window.addEventListener('unhandledrejection', event => { void recoverChunkOnce(event.reason); });
const root = document.getElementById("root");
if (!root) throw new Error('LifeGrid root element is missing.');
markStartupPhase('rendering');
createRoot(root).render(<StartupBoundary><App /></StartupBoundary>);
markStartupPhase('mounted');
