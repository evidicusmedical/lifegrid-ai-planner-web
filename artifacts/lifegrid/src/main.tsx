import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { StartupBoundary, checkDeployedVersion, installStartupDiagnostics, markStartupPhase, recoverChunkOnce, reloadAfterServiceWorkerRetirementOnce, retireLegacyServiceWorkersOnce } from './startup';

const start = async () => {
  installStartupDiagnostics();
  window.addEventListener('error', event => { void recoverChunkOnce(event.error ?? event.message); });
  window.addEventListener('unhandledrejection', event => { void recoverChunkOnce(event.reason); });
  markStartupPhase('retiring-legacy-service-workers');
  const retirement = await retireLegacyServiceWorkersOnce();
  if (retirement.reloadRequired && reloadAfterServiceWorkerRetirementOnce()) return;
  void checkDeployedVersion();
  const root = document.getElementById("root");
  if (!root) throw new Error('LifeGrid root element is missing.');
  markStartupPhase('rendering');
  createRoot(root).render(<StartupBoundary><App /></StartupBoundary>);
  markStartupPhase('mounted');
};

void start();
