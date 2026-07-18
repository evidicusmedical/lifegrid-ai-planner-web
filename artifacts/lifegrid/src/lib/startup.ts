import { APP_VERSION } from './version';

export type StartupPhase = 'boot' | 'hydration' | 'migration' | 'render' | 'ready' | 'failed';
export type StartupDiagnostic = Record<string, string | boolean | null | undefined>;
const state: StartupDiagnostic = { appVersion: APP_VERSION, phase: 'boot' };

const safe = <T>(fn: () => T, fallback: T): T => { try { return fn(); } catch { return fallback; } };
export const startupDiagnostics = () => ({ ...state });
export const setStartupPhase = (phase: StartupPhase) => { state.phase = phase; };
export const recordStartupError = (error: unknown, phase: StartupPhase = 'failed') => {
  setStartupPhase(phase);
  const value = error instanceof Error ? error : new Error(String(error));
  state.errorName = value.name;
  state.errorMessage = value.message.slice(0, 500);
  state.errorStack = value.stack?.slice(0, 1500) ?? null;
};
export const initializeStartupDiagnostics = () => {
  state.userAgent = safe(() => navigator.userAgent, 'unavailable');
  state.path = safe(() => location.pathname, 'unavailable');
  state.hash = safe(() => location.hash, 'unavailable');
  state.visibility = safe(() => document.visibilityState, 'unavailable');
  state.standalone = safe(() => matchMedia('(display-mode: standalone)').matches, false);
  state.navigatorStandalone = safe(() => Boolean((navigator as Navigator & { standalone?: boolean }).standalone), false);
  state.serviceWorkerControlled = safe(() => Boolean(navigator.serviceWorker?.controller), false);
  state.manifest = safe(() => document.querySelector<HTMLLinkElement>('link[rel="manifest"]')?.href ?? null, null);
  state.localStorageAvailable = safe(() => { const key = '__lifegrid_startup_probe__'; localStorage.setItem(key, '1'); localStorage.removeItem(key); return true; }, false);
  state.indexedDbAvailable = safe(() => typeof indexedDB !== 'undefined', false);
  if (import.meta.env.DEV) (window as Window & { lifegridStartupDiagnostics?: () => StartupDiagnostic }).lifegridStartupDiagnostics = startupDiagnostics;
};
export const isChunkLoadFailure = (error: unknown) => /failed to fetch dynamically imported module|importing a module script failed|chunkloaderror|error loading dynamically imported module|load failed/i.test(error instanceof Error ? `${error.name} ${error.message}` : String(error));
export const clearAssetCaches = async () => { if ('caches' in window) await Promise.all((await caches.keys()).filter(key => /workbox|vite|lifegrid/i.test(key)).map(key => caches.delete(key))); };
export const recoverChunkOnce = async () => {
  const key = 'lifegrid_chunk_recovery_v1';
  if (safe(() => sessionStorage.getItem(key), null)) return false;
  safe(() => sessionStorage.setItem(key, '1'), undefined);
  await clearAssetCaches();
  if ('serviceWorker' in navigator) await Promise.all((await navigator.serviceWorker.getRegistrations()).map(registration => registration.unregister()));
  location.replace(`${location.pathname}?lifegrid-recovery=${Date.now()}${location.hash}`);
  return true;
};
