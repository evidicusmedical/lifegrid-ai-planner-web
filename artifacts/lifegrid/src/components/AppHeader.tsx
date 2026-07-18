import React from 'react';
import { useAppData } from '../context/AppDataContext';
import { APP_VERSION } from '../lib/version';
/** Header deliberately has no live clock: event times are floating local calendar values. */
export const AppHeader = () => { const { activeCalendar } = useAppData(); return <header className="app-header flex-none border-b border-border bg-card text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1" data-testid="app-header"><span className="shrink-0">LifeGrid <strong className="text-foreground">{APP_VERSION}</strong></span><span className="min-w-0 max-w-40 truncate" title={activeCalendar.name} aria-label={`Active calendar: ${activeCalendar.name}`}>Calendar: {activeCalendar.name}</span></header>; };
