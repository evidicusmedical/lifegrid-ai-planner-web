import { AppData, Event, Task, PersonEvent } from '../types';

export const defaultData: AppData = {
  events: [
    { id: crypto.randomUUID(), date: '2026-06-08', title: 'Flight to NYC', category: 'travel', startTime: '07:00', endTime: null, color: '#3b82f6', notes: null },
    { id: crypto.randomUUID(), date: '2026-06-09', title: 'NYC Conference', category: 'work', startTime: null, endTime: null, color: '#3b82f6', notes: null },
    { id: crypto.randomUUID(), date: '2026-06-10', title: 'NYC Conference', category: 'work', startTime: null, endTime: null, color: '#3b82f6', notes: null },
    { id: crypto.randomUUID(), date: '2026-06-11', title: 'NYC Conference', category: 'work', startTime: null, endTime: null, color: '#3b82f6', notes: null },
    { id: crypto.randomUUID(), date: '2026-06-12', title: 'NYC Conference', category: 'work', startTime: null, endTime: null, color: '#3b82f6', notes: null },
    { id: crypto.randomUUID(), date: '2026-06-18', title: 'Annual Physical', category: 'health', startTime: '09:30', endTime: null, color: '#10b981', notes: null },
    { id: crypto.randomUUID(), date: '2026-06-21', title: 'Summer Solstice Hike', category: 'personal', startTime: '07:00', endTime: null, color: '#8b5cf6', notes: null },
    { id: crypto.randomUUID(), date: '2026-07-04', title: '4th of July BBQ', category: 'family', startTime: '14:00', endTime: null, color: '#ef4444', notes: null },
    { id: crypto.randomUUID(), date: '2026-07-14', title: 'Q3 Planning', category: 'work', startTime: '10:00', endTime: null, color: '#3b82f6', notes: null },
    { id: crypto.randomUUID(), date: '2026-08-01', title: 'Anniversary Dinner', category: 'family', startTime: '19:00', endTime: null, color: '#ef4444', notes: null },
    { id: crypto.randomUUID(), date: '2026-08-15', title: 'Dentist Appt', category: 'health', startTime: '11:00', endTime: null, color: '#10b981', notes: null },
    { id: crypto.randomUUID(), date: '2026-09-07', title: 'Labor Day Weekend Trip', category: 'travel', startTime: null, endTime: null, color: '#f59e0b', notes: null },
    { id: crypto.randomUUID(), date: '2026-09-15', title: 'Performance Review', category: 'work', startTime: '14:00', endTime: null, color: '#3b82f6', notes: null },
  ],
  tasks: [
    { id: crypto.randomUUID(), name: 'Renew Passport', category: 'personal', dueDate: '2026-07-01', status: 'todo', owner: 'Me', nextAction: 'Gather documents', notes: null, priority: 'urgent' },
    { id: crypto.randomUUID(), name: 'Book Anniversary Hotel', category: 'family', dueDate: '2026-07-15', status: 'todo', owner: 'Me', nextAction: 'Check availability at The Grand', notes: null, priority: 'high' },
    { id: crypto.randomUUID(), name: 'Q3 Budget Review', category: 'work', dueDate: '2026-07-31', status: 'in-progress', owner: 'Me', nextAction: null, notes: null, priority: 'high' },
    { id: crypto.randomUUID(), name: 'Schedule Car Service', category: 'personal', dueDate: '2026-06-30', status: 'todo', owner: 'Me', nextAction: null, notes: null, priority: 'medium' },
    { id: crypto.randomUUID(), name: 'Plan Summer Vacation', category: 'travel', dueDate: '2026-06-20', status: 'in-progress', owner: 'Me', nextAction: 'Research flights to Europe', notes: null, priority: 'medium' },
    { id: crypto.randomUUID(), name: 'File Tax Extension', category: 'personal', dueDate: '2026-10-15', status: 'todo', owner: 'Me', nextAction: null, notes: null, priority: 'low' },
  ],
  personEvents: [
    { id: crypto.randomUUID(), person: 'wife', date: '2026-06-12', title: 'Book Club', notes: null, color: '#8b5cf6' },
    { id: crypto.randomUUID(), person: 'wife', date: '2026-06-20', title: 'Yoga Retreat', notes: null, color: '#10b981' },
    { id: crypto.randomUUID(), person: 'wife', date: '2026-07-10', title: 'Girls Trip to Napa', notes: null, color: '#f59e0b' },
    { id: crypto.randomUUID(), person: 'wife', date: '2026-08-05', title: 'Work Conference', notes: null, color: '#3b82f6' },
    { id: crypto.randomUUID(), person: 'shared', date: '2026-06-28', title: 'Couples Therapy', notes: null, color: '#8b5cf6' },
    { id: crypto.randomUUID(), person: 'shared', date: '2026-07-04', title: '4th of July BBQ', notes: null, color: '#ef4444' },
    { id: crypto.randomUUID(), person: 'shared', date: '2026-08-01', title: 'Anniversary Dinner', notes: null, color: '#ef4444' },
  ]
};
