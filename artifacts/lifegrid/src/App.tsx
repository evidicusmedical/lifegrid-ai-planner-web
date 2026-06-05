import React, { useState } from 'react';
import { AppProvider } from './context/AppDataContext';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BottomNav } from './components/BottomNav';

// Lazy load pages for simplicity, or import directly
import { GridView } from './pages/GridView';
import { TasksView } from './pages/TasksView';
import { PeopleView } from './pages/PeopleView';
import { AIView } from './pages/AIView';

function AppContent() {
  const [tab, setTab] = useState('grid');

  return (
    <div className="min-h-[100dvh] pb-16 bg-background text-foreground flex flex-col">
      <main className="flex-1 flex flex-col overflow-hidden">
        {tab === 'grid' && <GridView />}
        {tab === 'tasks' && <TasksView />}
        {tab === 'people' && <PeopleView />}
        {tab === 'ai' && <AIView />}
      </main>
      <BottomNav currentTab={tab} onChange={setTab} />
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </AppProvider>
  );
}

export default App;
