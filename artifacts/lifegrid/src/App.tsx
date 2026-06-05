import React, { useState } from 'react';
import { AppProvider } from './context/AppDataContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BottomNav } from './components/BottomNav';
import { GridView } from './pages/GridView';
import { TasksView } from './pages/TasksView';
import { PeopleView } from './pages/PeopleView';
import { AIView } from './pages/AIView';
import { SettingsView } from './pages/SettingsView';

function AppContent() {
  const [tab, setTab] = useState('grid');

  return (
    <div className="h-[100dvh] flex flex-col bg-background text-foreground overflow-hidden">
      <main className="flex-1 flex flex-col overflow-hidden">
        {tab === 'grid'   && <GridView />}
        {tab === 'tasks'  && <TasksView />}
        {tab === 'people' && <PeopleView />}
        {tab === 'ai'     && <AIView />}
        {tab === 'settings' && <SettingsView />}
      </main>
      <BottomNav currentTab={tab} onChange={setTab} />
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
