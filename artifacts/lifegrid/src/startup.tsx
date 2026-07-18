import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { APP_VERSION } from './lib/version';

type Diagnostic = Record<string, unknown>;
type RetirementResult = { reloadRequired: boolean; registrationsRemoved: number; cachesRemoved: number };
const diagnostics: Diagnostic = { appVersion: APP_VERSION, deployedVersion: null, phase: 'module', manifestUrl: '/manifest.webmanifest' };
const recoveryKey = 'lifegrid_chunk_recovery_v1';
const retirementKey = 'lifegrid_sw_retirement_v05151';
const retirementReloadKey = 'lifegrid_sw_retirement_reload_v05151';
const APP_CACHE_PREFIXES = ['workbox-', 'vite-pwa-', 'lifegrid-', 'precache-', 'runtime-'];

const safe = (fn: () => unknown) => { try { return fn(); } catch (error) { return `unavailable: ${error instanceof Error ? error.name : 'error'}`; } };
const isAppAssetCache = (key: string) => APP_CACHE_PREFIXES.some(prefix => key.toLowerCase().startsWith(prefix));
const withTimeout = async <T,>(work: Promise<T>, milliseconds: number, fallback: T): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([work, new Promise<T>(resolve => { timer = setTimeout(() => resolve(fallback), milliseconds); })]); }
  finally { if (timer) clearTimeout(timer); }
};
export const markStartupPhase = (phase: string) => { diagnostics.phase = phase; };
export const startupDiagnostics = () => ({ ...diagnostics });
export const diagnosticSummary = () => JSON.stringify(startupDiagnostics(), null, 2);

export const installStartupDiagnostics = () => {
  Object.assign(diagnostics, {
    userAgent: navigator.userAgent, path: location.pathname, hash: location.hash,
    visibility: document.visibilityState, standalone: safe(() => matchMedia('(display-mode: standalone)').matches),
    navigatorStandalone: safe(() => (navigator as Navigator & { standalone?: boolean }).standalone === true),
    storage: safe(() => { const raw = localStorage.getItem('lifegrid_store_v5'); diagnostics.compatibilityMetadataPresent = !!raw && /\"displayTimeZone\"/.test(raw); return 'available'; }),
    indexedDB: typeof indexedDB !== 'undefined', serviceWorkerController: !!navigator.serviceWorker?.controller,
  });
  if (import.meta.env.DEV) (window as Window & { lifegridStartupDiagnostics?: () => Diagnostic }).lifegridStartupDiagnostics = startupDiagnostics;
};

/** Removes only known PWA asset caches; calendar localStorage and IndexedDB are never accessed. */
export const clearAssetCaches = async () => {
  if (typeof window !== 'undefined' && 'caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.filter(isAppAssetCache).map(key => caches.delete(key)));
  }
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) await Promise.all((await navigator.serviceWorker.getRegistrations()).map(registration => registration.unregister()));
};

/** Bounded, safe retirement of workers created by the previous VitePWA release. */
export const retireLegacyServiceWorkersOnce = async (): Promise<RetirementResult> => withTimeout((async () => {
  const fallback = { reloadRequired: false, registrationsRemoved: 0, cachesRemoved: 0 };
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return fallback;
  try {
    const hadController = !!navigator.serviceWorker.controller;
    const registrations = await navigator.serviceWorker.getRegistrations();
    let registrationsRemoved = 0;
    for (const registration of registrations) {
      if (new URL(registration.scope).origin !== location.origin) continue;
      if (await registration.unregister()) registrationsRemoved += 1;
    }
    let cachesRemoved = 0;
    if (typeof window !== 'undefined' && 'caches' in window) {
      const keys = await caches.keys();
      for (const key of keys.filter(isAppAssetCache)) if (await caches.delete(key)) cachesRemoved += 1;
    }
    safe(() => localStorage.setItem(retirementKey, 'complete'));
    Object.assign(diagnostics, { serviceWorkerRetirement: 'complete', registrationsRemoved, cachesRemoved });
    return { reloadRequired: hadController || registrationsRemoved > 0 || cachesRemoved > 0, registrationsRemoved, cachesRemoved };
  } catch (error) {
    diagnostics.serviceWorkerRetirement = `failed: ${error instanceof Error ? error.name : 'error'}`;
    return fallback;
  }
})(), 750, { reloadRequired: false, registrationsRemoved: 0, cachesRemoved: 0 });

export const reloadAfterServiceWorkerRetirementOnce = () => {
  const previousAttempt = safe(() => sessionStorage.getItem(retirementReloadKey));
  if (previousAttempt !== null && previousAttempt !== 'attempted') return false;
  if (previousAttempt === 'attempted') return false;
  const writeAttempt = safe(() => sessionStorage.setItem(retirementReloadKey, 'attempted'));
  if (typeof writeAttempt === 'string') return false;
  const url = new URL(location.href); url.searchParams.set('lifegrid-refresh', `v05151-${Date.now()}`); location.replace(url.toString());
  return true;
};

export const checkDeployedVersion = async () => {
  try {
    const response = await fetch('/version.json', { cache: 'no-store' });
    const release = await response.json() as { appVersion?: string };
    diagnostics.deployedVersion = release.appVersion ?? null;
    if (response.ok && release.appVersion && release.appVersion !== APP_VERSION) {
      diagnostics.versionMismatch = `${APP_VERSION} != ${release.appVersion}`;
      const advisory = document.createElement('div');
      advisory.setAttribute('role', 'status'); advisory.dataset.lifegridVersionAdvisory = 'true';
      advisory.textContent = 'A LifeGrid update is available. Please reload to get the current application.';
      advisory.style.cssText = 'position:fixed;z-index:2147483647;left:1rem;right:1rem;bottom:1rem;padding:1rem;background:#0f172a;color:#fff;border-radius:.5rem;text-align:center';
      document.body.append(advisory);
    }
  } catch { diagnostics.versionCheck = 'unavailable'; }
};

const isChunkError = (reason: unknown) => /failed to fetch dynamically imported module|importing a module script failed|chunkloaderror|error loading dynamically imported module|load failed/i.test(reason instanceof Error ? `${reason.name} ${reason.message}` : String(reason));
export const recoverChunkOnce = async (reason: unknown) => {
  if (!isChunkError(reason)) return false;
  diagnostics.dynamicImportFailure = true;
  if (safe(() => sessionStorage.getItem(recoveryKey)) === 'attempted') return false;
  safe(() => sessionStorage.setItem(recoveryKey, 'attempted'));
  await clearAssetCaches();
  const url = new URL(location.href); url.searchParams.set('lifegrid-reload', Date.now().toString()); location.replace(url.toString());
  return true;
};

export class StartupBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { diagnostics.errorName = error.name; diagnostics.errorMessage = error.message; diagnostics.route = location.hash || location.pathname; diagnostics.gridMount = /GridView/.test(info.componentStack ?? ''); diagnostics.errorStack = `${error.stack ?? ''}\n${info.componentStack ?? ''}`.slice(0, 2000); markStartupPhase('failed'); }
  render() { return this.state.error ? <RecoveryScreen error={this.state.error} retry={() => this.setState({ error: null })} /> : this.props.children; }
}

export const RecoveryScreen = ({ error, retry }: { error?: Error; retry?: () => void }) => {
  const copy = async () => { try { await navigator.clipboard?.writeText(diagnosticSummary()); } catch { /* clipboard permission is optional */ } };
  const exportRaw = () => { const raw = safe(() => localStorage.getItem('lifegrid_store_v5')); if (typeof raw !== 'string') return; const blob = new Blob([raw], { type: 'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'lifegrid-local-recovery.json'; link.click(); URL.revokeObjectURL(link.href); };
  return <main role="alert" className="min-h-screen bg-background text-foreground p-6 flex items-center justify-center"><section className="max-w-lg space-y-4 rounded-lg border bg-card p-6 shadow"><h1 className="text-xl font-bold">LifeGrid could not finish starting.</h1>{error && /invalid time zone: local/i.test(error.message) && <p>LifeGrid encountered obsolete calendar timezone metadata. Your Event dates and times were not changed.</p>}<p>Calendar data was not cleared. Cached application files are separate from your LifeGrid calendar data.</p><div className="flex flex-wrap gap-2"><button onClick={retry}>Retry</button><button onClick={() => location.reload()}>Reload application</button><button onClick={() => void clearAssetCaches().then(() => location.reload())}>Clear cached app files and reload</button><button onClick={exportRaw}>Export raw local recovery data</button><button onClick={() => alert(diagnosticSummary())}>Open diagnostic details</button><button onClick={() => void copy()}>Copy Diagnostic Summary</button></div>{error && <p className="text-sm text-muted-foreground">{error.name}: {error.message}</p>}</section></main>;
};
