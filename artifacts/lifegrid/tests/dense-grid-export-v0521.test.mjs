import test from 'node:test';
import assert from 'node:assert/strict';
import { filterGridEventsByCategories } from '../.test-build/lib/gridModel.js';
import { estimateExportFeasibility } from '../.test-build/lib/gridPublication.js';
test('category filter runs before visible cell slicing with inclusive OR', () => {
 const records = Array.from({length: 25}, (_, i) => ({ category: i === 24 ? 'walker' : 'shift', title: String(i) }));
 assert.deepEqual(filterGridEventsByCategories(records, new Set(['walker'])).map(x => x.category), ['walker']);
 assert.equal(filterGridEventsByCategories(records, new Set(['walker', 'shift'])).length, 25);
 assert.equal(filterGridEventsByCategories(records, new Set()).length, 25);
});
test('feasibility guard permits visible output but blocks excessive mobile sharp output', () => {
 assert.equal(estimateExportFeasibility({width:1380,height:1600,pixelRatio:1,mobile:true,expanded:false,records:20,maxPerDate:2}).unsafe, false);
 assert.equal(estimateExportFeasibility({width:1760,height:18400,pixelRatio:2,mobile:true,expanded:true,records:1550,maxPerDate:25}).unsafe, true);
});
