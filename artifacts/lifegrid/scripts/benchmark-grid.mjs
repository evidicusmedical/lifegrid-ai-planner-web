import { performance } from 'node:perf_hooks';
import { createStructuralGridFixture, REAL_SHAPE, STRESS_REAL_SHAPE } from './grid-fixtures.mjs';
const configs = [['small',{ events:100,tasks:20,years:1 }],['medium',{ events:1000,tasks:100,years:3 }],['large',{ events:10000,tasks:1000,years:6 }],['real-shape',REAL_SHAPE],['stress-real-shape',STRESS_REAL_SHAPE]];
const select = (events, year) => events.filter(e => e.date <= `${year}-12-31` && e.endDate >= `${year}-01-01`);
for (const [name, config] of configs) {
  const fixture = createStructuralGridFixture(config), samples = [];
  let intersecting = 0, summaries = 0, buckets = 0;
  for (let iteration=0; iteration<15; iteration++) { const start=performance.now(); const selected=select(fixture.events, 2025); const model=new Map(); for(const e of selected) { const s={id:e.id,date:e.date,endDate:e.endDate,title:e.title,category:e.category,color:e.color,displayPriority:e.displayPriority,timeStatus:e.timeStatus,startTime:e.startTime,endTime:e.endTime,eventKind:e.eventKind,showInGrid:e.showInGrid}; const list=model.get(s.date)??[]; list.push(s);model.set(s.date,list); } for(const list of model.values()) list.sort((a,b)=>a.displayPriority-b.displayPriority||a.title.localeCompare(b.title)); samples.push(performance.now()-start); intersecting=selected.length;summaries=[...model.values()].reduce((n,x)=>n+x.length,0);buckets=model.size; }
  samples.sort((a,b)=>a-b); console.log(`${name}: ${fixture.events.length} total; ${intersecting} intersecting; ${summaries} summaries; ${buckets} buckets; model median ${samples[7].toFixed(2)} ms (min ${samples[0].toFixed(2)}, max ${samples.at(-1).toFixed(2)}), 15 iterations; Node ${process.version}. Node model derivation only, not browser rendering.`);
}
