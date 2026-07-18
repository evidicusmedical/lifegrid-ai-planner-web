import React, { Component, type ErrorInfo, type ReactNode, useState } from 'react';
import { clearAssetCaches, recordStartupError, startupDiagnostics } from '../lib/startup';

const copy = async (text: string) => { if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text); };
const rawRecoveryData = () => { try { return localStorage.getItem('lifegrid_store_v5') ?? localStorage.getItem('lifegrid_data') ?? ''; } catch { return ''; } };
export const RecoveryScreen = ({ error, retry }: { error?: Error; retry?: () => void }) => {
  const [details, setDetails] = useState(false); const report = JSON.stringify(startupDiagnostics(), null, 2);
  const exportRaw = () => { const payload = rawRecoveryData(); if (!payload) return; const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = 'lifegrid-local-recovery.json'; a.click(); URL.revokeObjectURL(url); };
  return <main className="startup-recovery" role="alert"><h1>LifeGrid could not finish starting.</h1><p>Your calendar data has not been cleared. Cached application files and calendar data are separate.</p><div className="startup-actions"><button onClick={retry}>Retry</button><button onClick={() => location.reload()}>Reload application</button><button onClick={() => clearAssetCaches().then(() => location.reload())}>Clear cached app files and reload</button>{rawRecoveryData() && <button onClick={exportRaw}>Export raw local recovery data</button>}<button onClick={() => copy(report)}>Copy diagnostic summary</button><button onClick={() => setDetails(v => !v)} aria-expanded={details}>Open diagnostic details</button></div>{details && <pre>{report}</pre>}{error && <p className="startup-error">{error.name}: {error.message}</p>}</main>;
};
export class StartupBoundary extends Component<{ children: ReactNode }, { error?: Error; attempt: number }> {
  state: { error?: Error; attempt: number } = { attempt: 0 };
  static getDerivedStateFromError(error: Error) { recordStartupError(error); return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { recordStartupError(new Error(`${error.message}\n${info.componentStack}`)); }
  retry = () => this.setState(({ attempt }) => ({ error: undefined, attempt: attempt + 1 }));
  render() { return this.state.error ? <RecoveryScreen error={this.state.error} retry={this.retry} /> : <React.Fragment key={this.state.attempt}>{this.props.children}</React.Fragment>; }
}
