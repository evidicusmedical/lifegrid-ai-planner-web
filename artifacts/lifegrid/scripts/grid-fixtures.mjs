const long = (label, size = 1800) => `${label} ${'fictional-content '.repeat(Math.ceil(size / 18))}`.slice(0, size);
export const createStructuralGridFixture = ({ events: count, tasks, years, seed = 19 } = {}) => {
  const categories = Array.from({ length: 16 }, (_, i) => ({ id: `cat-${i}`, label: `Category ${i + 1}`, color: `hsl(${(i * 23) % 360} 55% 45%)` }));
  const taskRecords = Array.from({ length: tasks }, (_, i) => ({ id: `task-${seed}-${i}`, name: `Fictional task ${i}`, linkedEventIds: [] }));
  const events = Array.from({ length: count }, (_, i) => {
    const year = 2024 + (i % years), month = (i * 7) % 12 + 1, day = (i * 11) % 25 + 1;
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayType = i < Math.round(count * .422), annual = i % 9 === 0, multi = i % 17 === 0;
    const status = dayType ? 'all-day' : ['timed','unknown','approximate','all-day'][i % 4];
    const endDate = multi ? `${year}-${String(month).padStart(2, '0')}-${String(Math.min(28, day + 2)).padStart(2, '0')}` : date;
    return { id: `event-${seed}-${i}`, date, endDate, title: `${dayType ? 'Day type' : annual ? 'Annual reminder' : 'Calendar item'} ${i} ${i % 5 === 0 ? 'with a deliberately longer fictional title' : ''}`, category: categories[i % categories.length].id, color: categories[i % categories.length].color, timeStatus: status, startTime: status === 'timed' || status === 'approximate' ? `${String(8 + (i % 9)).padStart(2, '0')}:00` : null, endTime: status === 'timed' || status === 'approximate' ? `${String(9 + (i % 9)).padStart(2, '0')}:00` : null, timeZone: null, timeZoneMode: status === 'timed' || status === 'approximate' ? 'floating' : null, eventKind: dayType ? 'day-type' : annual ? 'reminder' : 'shift', displayPriority: i % 5 + 1, showInGrid: true, showInExport: true, notes: long('fictional event note'), aiNotes: long('fictional AI note', 900), sourceNotes: long('fictional source note', 700), linkedTaskIds: [taskRecords[i % tasks].id], recurringGroupId: annual ? `annual-${i % 30}` : undefined };
  });
  return { events, tasks: taskRecords, categories, personSchedule: Array.from({ length: Math.round(count / 11) }, (_, i) => ({ id: `schedule-${seed}-${i}` })) };
};
export const REAL_SHAPE = { events: 450, tasks: 200, years: 3 };
export const STRESS_REAL_SHAPE = { events: 1500, tasks: 500, years: 5 };
