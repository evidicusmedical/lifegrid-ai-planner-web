import test from 'node:test'; import assert from 'node:assert/strict';
import { getGridMountOrder, gridMonthKey } from '../.test-build/lib/gridMounting.js';
test('incremental mount order chooses current, adjacent, then chronological unique months', () => { const order=getGridMountOrder(2026,2026,6); assert.deepEqual(order.slice(0,3),[6,5,7]); assert.equal(new Set(order).size,12); assert.equal(order.length,12); });
test('selection wins and non-current year begins in January', () => { assert.equal(getGridMountOrder(2025,2026,6,3)[0],3); assert.equal(getGridMountOrder(2025,2026,6)[0],0); assert.equal(gridMonthKey(2026,0),'2026-01'); });
