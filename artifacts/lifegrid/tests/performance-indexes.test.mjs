import test from 'node:test';
import assert from 'node:assert/strict';
import { indexTasks, indexProjectUsage } from '../.test-build/lib/performanceSelectors.js';

test('task indexes preserve records and parent relationships without mutation', () => {
  const tasks = [{ id: 'a', linkedEventIds: [] }, { id: 'b', parentTaskId: 'a', linkedEventIds: ['e'] }];
  const result = indexTasks(tasks);
  assert.equal(result.byId.size, 2); assert.deepEqual(result.children.get('a').map(x => x.id), ['b']); assert.deepEqual(tasks.map(x => x.id), ['a', 'b']);
});
test('project usage is a single indexed-pass equivalent', () => {
  const usage = indexProjectUsage([{ id: 'p' }], [{ id: 't', projectId: 'p', status: 'todo' }], [{ linkedTaskIds: ['t'] }]);
  assert.deepEqual(usage.p, { openTasks: 1, completedTasks: 0, totalTasks: 1, relatedEvents: 1 });
});
