import React from 'react';
import { Calendar, CheckSquare, Users, Cpu } from 'lucide-react';

interface BottomNavProps {
  currentTab: string;
  onChange: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onChange }) => {
  const tabs = [
    { id: 'grid', label: 'Grid', icon: Calendar },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'people', label: 'People', icon: Users },
    { id: 'ai', label: 'AI', icon: Cpu },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around z-50 px-2 pb-safe">
      {tabs.map(tab => {
        const active = currentTab === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors ${active ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <Icon size={24} strokeWidth={active ? 2.5 : 2} />
            <span className="text-[10px] font-medium mt-1">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
