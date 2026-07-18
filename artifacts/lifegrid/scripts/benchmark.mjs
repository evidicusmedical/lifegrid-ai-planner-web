import { performance } from 'node:perf_hooks';

const sizes = { small: [100, 50, 10, 10, 1], medium: [1000, 500, 100, 30, 3], large: [5000, 2000, 500, 100, 5] };
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const fixture = ([eventCount, taskCount, personCount, projectCount, calendarCount]) => {
  const projects = Array.from({ length: projectCount }, (_, i) => ({ id: `project-${i}`, name: `Fictional Project ${i}`, status: i % 11 === 0 ? 'archived' : 'active' }));
  const tasks = Array.from({ length: taskCount }, (_, i) => ({ id: `task-${i}`, projectId: `project-${i % projectCount}`, status: i % 4 === 0 ? 'done' : 'todo', parentTaskId: i % 7 === 0 ? `task-${Math.max(0, i - 1)}` : null, dueDate: `2026-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 27) + 1).padStart(2, '0')}` }));
  const events = Array.from({ length: eventCount }, (_, i) => ({ id: `event-${i}`, date: `2026-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 27) + 1).padStart(2, '0')}`, linkedTaskIds: [`task-${i % taskCount}`], timeStatus: i % 5 === 0 ? 'unknown' : i % 3 === 0 ? 'all-day' : 'timed', notes: i % 13 === 0 ? 'Fictional long note '.repeat(12) : '' }));
  return { calendars: Array.from({ length: calendarCount }, (_, i) => ({ id: `calendar-${i}`, data: { events, tasks, personEvents: Array.from({ length: personCount }, (_, j) => ({ id: `person-${j}`, date: `2026-01-${String((j % 27) + 1).padStart(2, '0')}` })), projects } })), activeCalendarId: 'calendar-0' };
};
const measure = (fn, iterations = 25) => median(Array.from({ length: iterations }, () => { const start = performance.now(); fn(); return performance.now() - start; }));
for (const [name, size] of Object.entries(sizes)) {
  const data = fixture(size), active = data.calendars[0].data;
  const operations = {
    'grid date index': () => active.events.reduce((m, event) => { (m.get(event.date) ?? m.set(event.date, []).get(event.date)).push(event); return m; }, new Map()),
    'task indexes': () => active.tasks.reduce((m, task) => { m.byId.set(task.id, task); if (task.parentTaskId) (m.children.get(task.parentTaskId) ?? m.children.set(task.parentTaskId, []).get(task.parentTaskId)).push(task); return m; }, { byId: new Map(), children: new Map() }),
    'project usage': () => active.events.reduce((usage, event) => { const task = active.tasks[event.id.replace('event', 'task')]; if (task) usage[task.projectId] = (usage[task.projectId] ?? 0) + 1; return usage; }, {}),
    'storage serialization': () => JSON.stringify(data),
    'backup serialization': () => JSON.stringify({ schemaVersion: 6, store: data }),
  };
  console.log(`\n${name} fixture: ${size[0]} events, ${size[1]} tasks, ${size[2]} person schedule, ${size[3]} tags, ${size[4]} calendars; JSON ${(JSON.stringify(data).length / 1024).toFixed(1)} KiB`);
  for (const [operation, fn] of Object.entries(operations)) console.log(`  ${operation.padEnd(24)} ${measure(fn).toFixed(3)} ms median (25 iterations)`);
}
