import React, { useEffect, useState } from 'react';
import { AppProvider } from './context/AppDataContext';
import { useAppData } from './context/AppDataContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BottomNav } from './components/BottomNav';
import { AppHeader } from './components/AppHeader';
import { GridView } from './pages/GridView';
import { TasksView } from './pages/TasksView';
import { PeopleView } from './pages/PeopleView';
import { AIView } from './pages/AIView';
import { SettingsView } from './pages/SettingsView';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { beginGridTransition, gridMark, installGridDiagnostics } from './lib/gridDiagnostics';
// Development marks include lifegrid:grid-navigation-click (emitted by beginGridTransition).

function AppContent() {
  const validTabs = new Set(['grid', 'tasks', 'people', 'ai', 'settings']);
  const fromHash = () => { const requested = window.location.hash.slice(1); if (requested === 'projects') { window.history.replaceState({ tab: 'tasks' }, '', '#tasks'); return 'tasks'; } return validTabs.has(requested) ? requested : 'grid'; };
  const [tab, setTab] = useState(fromHash);
  const online = useOnlineStatus();
  const { storageError } = useAppData();
  useEffect(() => { installGridDiagnostics(); }, []);
  useEffect(() => { const back = () => setTab(fromHash()); window.addEventListener('popstate', back); return () => window.removeEventListener('popstate', back); }, []);
  const changeTab = (next: string) => { if (next === tab) return; if (next === 'grid') beginGridTransition(); window.history.pushState({ tab: next }, '', `#${next}`); setTab(next); if (next === 'grid') gridMark('grid-route-state-updated'); };

  return (
    <div className="h-[100dvh] flex flex-col bg-background text-foreground overflow-hidden">
      {!online && (
        <div className="flex-none bg-amber-500 text-white text-center text-xs font-semibold py-1 px-3 z-50">
          You're offline — your data is still available
        </div>
      )}
      {storageError && <div role="alert" className="flex-none bg-destructive px-3 py-2 text-center text-xs font-semibold text-destructive-foreground wrap-anywhere" data-testid="storage-error">{storageError}</div>}
      <AppHeader />
      <main className="flex-1 flex flex-col overflow-hidden">
        {tab === 'grid'   && <GridView />}
        {tab === 'tasks'  && <TasksView />}
        {tab === 'people' && <PeopleView />}
        {tab === 'ai'     && <AIView />}
        {tab === 'settings' && <SettingsView />}
      </main>
      <BottomNav currentTab={tab} onChange={changeTab} />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <TooltipProvider>
          <AppContent />
          <Toaster richColors position="top-center" />
        </TooltipProvider>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
