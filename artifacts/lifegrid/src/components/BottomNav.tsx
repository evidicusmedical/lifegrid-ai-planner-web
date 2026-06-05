import React from 'react';
import { Calendar, CheckSquare, Users, Cpu } from 'lucide-react';

interface BottomNavProps {
  currentTab: string;
  onChange: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onChange }) => {
  const tabs = [
    { id: 'grid',   label: 'Grid',   icon: Calendar },
    { id: 'tasks',  label: 'Tasks',  icon: CheckSquare },
    { id: 'people', label: 'People', icon: Users },
    { id: 'ai',     label: 'AI',     icon: Cpu },
  ];

  return (
    <nav className="h-16 bg-card border-t border-border flex items-center justify-around z-50 px-2 safe-area-inset-bottom" data-testid="bottom-nav">
      {tabs.map(tab => {
        const active = currentTab === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            data-testid={`nav-${tab.id}`}
            className={`flex flex-col items-center justify-center flex-1 h-14 gap-0.5 rounded-xl transition-all duration-150 ${
              active
                ? 'text-primary'
                : 'text-muted-foreground active:scale-95'
            }`}
          >
            <div className={`p-1.5 rounded-lg transition-colors ${active ? 'bg-primary/10' : ''}`}>
              <Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
            </div>
            <span className={`text-[10px] font-semibold leading-none ${active ? 'text-primary' : ''}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
