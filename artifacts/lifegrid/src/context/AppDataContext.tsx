import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppData, Event, Task, PersonEvent } from '../types';
import { defaultData } from '../lib/sampleData';

interface AppContextType extends AppData {
  addEvent: (event: Event) => void;
  updateEvent: (id: string, event: Partial<Event>) => void;
  deleteEvent: (id: string) => void;
  
  addTask: (task: Task) => void;
  updateTask: (id: string, task: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  
  addPersonEvent: (event: PersonEvent) => void;
  updatePersonEvent: (id: string, event: Partial<PersonEvent>) => void;
  deletePersonEvent: (id: string) => void;

  applyImportUpdate: (update: any) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'lifegrid_data';
const DATA_VERSION_KEY = 'lifegrid_data_version';
const CURRENT_VERSION = '3';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<AppData>(() => {
    const storedVersion = localStorage.getItem(DATA_VERSION_KEY);
    if (storedVersion !== CURRENT_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(DATA_VERSION_KEY, CURRENT_VERSION);
      return defaultData;
    }
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse local storage data");
      }
    }
    return defaultData;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const addEvent = (event: Event) => setData(prev => ({ ...prev, events: [...prev.events, event] }));
  const updateEvent = (id: string, update: Partial<Event>) => setData(prev => ({
    ...prev,
    events: prev.events.map(e => e.id === id ? { ...e, ...update } : e)
  }));
  const deleteEvent = (id: string) => setData(prev => ({ ...prev, events: prev.events.filter(e => e.id !== id) }));

  const addTask = (task: Task) => setData(prev => ({ ...prev, tasks: [...prev.tasks, task] }));
  const updateTask = (id: string, update: Partial<Task>) => setData(prev => ({
    ...prev,
    tasks: prev.tasks.map(t => t.id === id ? { ...t, ...update } : t)
  }));
  const deleteTask = (id: string) => setData(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== id) }));

  const addPersonEvent = (event: PersonEvent) => setData(prev => ({ ...prev, personEvents: [...prev.personEvents, event] }));
  const updatePersonEvent = (id: string, update: Partial<PersonEvent>) => setData(prev => ({
    ...prev,
    personEvents: prev.personEvents.map(e => e.id === id ? { ...e, ...update } : e)
  }));
  const deletePersonEvent = (id: string) => setData(prev => ({ ...prev, personEvents: prev.personEvents.filter(e => e.id !== id) }));

  const applyImportUpdate = (update: any) => {
    setData(prev => {
      const next = { ...prev };

      if (update.events) {
        if (update.events.add) {
          next.events = [...next.events, ...update.events.add];
        }
        if (update.events.update) {
          next.events = next.events.map(e => {
            const up = update.events.update.find((u: any) => u.id === e.id);
            return up ? { ...e, ...up } : e;
          });
        }
        if (update.events.delete) {
          next.events = next.events.filter(e => !update.events.delete.includes(e.id));
        }
      }

      if (update.tasks) {
        if (update.tasks.add) {
          next.tasks = [...next.tasks, ...update.tasks.add];
        }
        if (update.tasks.update) {
          next.tasks = next.tasks.map(t => {
            const up = update.tasks.update.find((u: any) => u.id === t.id);
            return up ? { ...t, ...up } : t;
          });
        }
        if (update.tasks.delete) {
          next.tasks = next.tasks.filter(t => !update.tasks.delete.includes(t.id));
        }
      }

      return next;
    });
  };

  return (
    <AppContext.Provider value={{
      ...data,
      addEvent, updateEvent, deleteEvent,
      addTask, updateTask, deleteTask,
      addPersonEvent, updatePersonEvent, deletePersonEvent,
      applyImportUpdate
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppData = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppData must be used within AppProvider");
  return context;
};
