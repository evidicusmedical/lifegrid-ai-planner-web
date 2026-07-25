import type { Category, Task, TaskPriority, TaskStatus } from '../types';

export type TaskSortMode = 'smart' | 'due-asc' | 'due-desc' | 'priority' | 'status' | 'name-asc' | 'name-desc' | 'category';

export const TASK_SORT_LABELS: Record<TaskSortMode, string> = {
  smart: 'Smart priority', 'due-asc': 'Due date: earliest first', 'due-desc': 'Due date: latest first',
  priority: 'Priority', status: 'Status', 'name-asc': 'Name: A–Z', 'name-desc': 'Name: Z–A', category: 'Tag / Category',
};
export const TASK_SORT_DESCRIPTIONS: Record<TaskSortMode, string> = {
  smart: 'Balances task status, due date, priority, and planning signals to surface the most actionable work.',
  'due-asc': 'Shows dated tasks from soonest to latest. Tasks without a due date appear after dated tasks.',
  'due-desc': 'Shows dated tasks from latest to soonest. Tasks without a due date appear after dated tasks.',
  priority: 'Sorts by assigned task priority: Urgent, High, Medium, Low, then None.',
  status: 'Groups tasks by their overall workflow status: To do, In progress, Blocked, then Done.',
  'name-asc': 'Sorts tasks alphabetically by task name.',
  'name-desc': 'Sorts tasks in reverse alphabetical order.',
  category: 'Sorts tasks alphabetically by their assigned tag or category.',
};
export const statusRank = (value: TaskStatus | string) => ({ todo: 0, 'in-progress': 1, blocked: 2, done: 3 }[value] ?? 99);
export const priorityRank = (value: TaskPriority | string | null | undefined) => ({ urgent: 0, high: 1, medium: 2, low: 3 }[value ?? ''] ?? 4);
const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });
export const compareTaskName = (a: Task, b: Task) => collator.compare(a.name, b.name) || collator.compare(a.id, b.id);

const localDayNumber = (date: string) => {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / 86400000;
};
export function smartPriorityScore(task: Task, today: string): number {
  if (task.status === 'done') return 10000;
  const priority = priorityRank(task.priority);
  const blockedSignal = task.status === 'blocked' ? -30 : 0;
  if (!task.dueDate) {
    if (priority === 0) return 70 + blockedSignal;
    if (task.status === 'blocked') return 105 + priority * 5;
    if (priority === 1) return 180;
    return 420 + priority * 20;
  }
  const distance = localDayNumber(task.dueDate) - localDayNumber(today);
  if (distance < 0) return distance * 10 + priority;
  if (distance <= 7) return 20 + distance * 4 + priority + blockedSignal;
  return 100 + distance + priority + blockedSignal;
}
export const clearTaskDueDate = <T extends Task>(task: T): T => ({ ...task, dueDate: null });

export function sortTasks(tasks: readonly Task[], mode: TaskSortMode, categories: readonly Category[], today: string): Task[] {
  const labels = new Map(categories.map(category => [category.id, category.label]));
  const due = (a: Task, b: Task, direction: 1 | -1) => !a.dueDate && !b.dueDate ? compareTaskName(a, b) : !a.dueDate ? 1 : !b.dueDate ? -1 : direction * a.dueDate.localeCompare(b.dueDate) || compareTaskName(a, b);
  return [...tasks].sort((a, b) => {
    if (mode === 'smart') return smartPriorityScore(a, today) - smartPriorityScore(b, today) || compareTaskName(a, b);
    if (mode === 'due-asc') return due(a, b, 1);
    if (mode === 'due-desc') return due(a, b, -1);
    if (mode === 'priority') return priorityRank(a.priority) - priorityRank(b.priority) || compareTaskName(a, b);
    if (mode === 'status') return statusRank(a.status) - statusRank(b.status) || compareTaskName(a, b);
    if (mode === 'name-asc') return compareTaskName(a, b);
    if (mode === 'name-desc') return -collator.compare(a.name, b.name) || collator.compare(a.id, b.id);
    const al = labels.get(a.category)?.trim() ?? '', bl = labels.get(b.category)?.trim() ?? '';
    return !al && !bl ? compareTaskName(a, b) : !al ? 1 : !bl ? -1 : collator.compare(al, bl) || compareTaskName(a, b);
  });
}
