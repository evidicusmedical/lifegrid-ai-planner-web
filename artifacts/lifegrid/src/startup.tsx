import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { APP_VERSION } from './lib/version';

type Diagnostic = Record<string, unknown>;
const diagnostics: Diagnostic = { appVersion: APP_VERSION, phase: 'module', manifestUrl: '/manifest.webmanifest' };
const recoveryKey = 'lifegrid_chunk_recovery_v1';

const safe = (fn: () => unknown) => { try { return fn(); } catch (error) { return `unavailable: ${error instanceof Error ? error.name : 'error'}`; } };
export const markStartupPhase = (phase: string) => { diagnostics.phase = phase; };
export const startupDiagnostics = () => ({ ...diagnostics });
export const diagnosticSummary = () => JSON.stringify(startupDiagnostics(), null, 2);

export const installStartupDiagnostics = () => {
  Object.assign(diagnostics, {
    userAgent: navigator.userAgent, path: location.pathname, hash: location.hash,
    visibility: document.visibilityState, standalone: safe(() => matchMedia('(display-mode: standalone)').matches),
    navigatorStandalone: safe(() => (navigator as Navigator & { standalone?: boolean }).standalone === true),
    storage: safe(() => { localStorage.getItem('lifegrid_store_v5'); return 'available'; }),
    indexedDB: typeof indexedDB !== 'undefined', serviceWorkerController: !!navigator.serviceWorker?.controller,
  });
  if (import.meta.env.DEV) (window as Window & { lifegridStartupDiagnostics?: () => Diagnostic }).lifegridStartupDiagnostics = startupDiagnostics;
};

const isChunkError = (reason: unknown) => /failed to fetch dynamically imported module|importing a module script failed|chunkloaderror|error loading dynamically imported module|load failed/i.test(reason instanceof Error ? `${reason.name} ${reason.message}` : String(reason));
export const clearAssetCaches = async () => {
  if ('caches' in window) await Promise.all((await caches.keys()).map(key => caches.delete(key)));
  if ('serviceWorker' in navigator) await Promise.all((await navigator.serviceWorker.getRegistrations()).map(registration => registration.unregister()));
};
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
  componentDidCatch(error: Error, info: ErrorInfo) { diagnostics.errorType = error.name; diagnostics.errorMessage = error.message; diagnostics.errorStack = `${error.stack ?? ''}\n${info.componentStack ?? ''}`.slice(0, 2000); markStartupPhase('failed'); }
  render() { return this.state.error ? <RecoveryScreen error={this.state.error} retry={() => this.setState({ error: null })} /> : this.props.children; }
}

export const RecoveryScreen = ({ error, retry }: { error?: Error; retry?: () => void }) => {
  const copy = async () => { try { await navigator.clipboard?.writeText(diagnosticSummary()); } catch { /* clipboard permission is optional */ } };
  const exportRaw = () => { const raw = safe(() => localStorage.getItem('lifegrid_store_v5')); if (typeof raw !== 'string') return; const blob = new Blob([raw], { type: 'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'lifegrid-local-recovery.json'; link.click(); URL.revokeObjectURL(link.href); };
  return <main role="alert" className="min-h-screen bg-background text-foreground p-6 flex items-center justify-center"><section className="max-w-lg space-y-4 rounded-lg border bg-card p-6 shadow"><h1 className="text-xl font-bold">LifeGrid could not finish starting.</h1><p>Calendar data was not cleared. Cached application files are separate from your LifeGrid calendar data.</p><div className="flex flex-wrap gap-2"><button onClick={retry}>Retry</button><button onClick={() => location.reload()}>Reload application</button><button onClick={() => void clearAssetCaches().then(() => location.reload())}>Clear cached app files and reload</button><button onClick={exportRaw}>Export raw local recovery data</button><button onClick={() => alert(diagnosticSummary())}>Open diagnostic details</button><button onClick={() => void copy()}>Copy Diagnostic Summary</button></div>{error && <p className="text-sm text-muted-foreground">{error.name}: {error.message}</p>}</section></main>;
};
