import test from 'node:test';
import assert from 'node:assert/strict';
import { addCalendarMonths, buildMonthWindow, countCalendarMonthsInclusive, monthWindowDateRange, resolveAddEventDefaultDate } from '../.test-build/lib/gridWindow.js';
import { resolveExportDateRange, validateExportRange } from '../.test-build/lib/gridAwareness.js';
import { planGridPublication } from '../.test-build/lib/gridPublicationPlan.js';
import { buildGridWindowViewModel } from '../.test-build/lib/gridModel.js';
import { wrapCanvasText } from '../.test-build/lib/gridImageRenderer.js';

const labels = months => months.map(m => `${m.label} ${m.year}`);
test('canonical and rolling month windows use exactly twelve calendar descriptors',()=>{
 const jan=buildMonthWindow(2026,0), sep=buildMonthWindow(2026,8), dec=buildMonthWindow(2026,11);
 assert.equal(jan.length,12); assert.deepEqual([labels(jan)[0],labels(jan).at(-1)],['Jan 2026','Dec 2026']);
 assert.deepEqual([labels(sep)[0],labels(sep).at(-1)],['Sep 2026','Aug 2027']);
 assert.deepEqual([labels(dec)[0],labels(dec).at(-1)],['Dec 2026','Nov 2027']);
 assert.deepEqual(addCalendarMonths({year:2026,monthIndex:11},1),{year:2027,monthIndex:0});
 assert.deepEqual(addCalendarMonths({year:2027,monthIndex:0},-1),{year:2026,monthIndex:11});
 assert.equal(buildMonthWindow(2027,11)[2].daysInMonth,29);
 assert.deepEqual(monthWindowDateRange(sep),{start:'2026-09-01',end:'2027-08-31'});
});

test('explicit export presets resolve against rolling window and anchor year',()=>{
 const window={start:'2026-09-01',end:'2027-08-31'}, today='2026-08-30';
 assert.deepEqual(resolveExportDateRange('currentGrid',window,2026,today),window);
 assert.deepEqual(resolveExportDateRange('calendarYear',window,2026,today),{start:'2026-01-01',end:'2026-12-31'});
 for(const [q,start,end] of [['q1','2026-01-01','2026-03-31'],['q2','2026-04-01','2026-06-30'],['q3','2026-07-01','2026-09-30'],['q4','2026-10-01','2026-12-31']]) assert.deepEqual(resolveExportDateRange(q,window,2026,today),{start,end});
 assert.deepEqual(resolveExportDateRange('next7',window,2026,today),{start:today,end:'2026-09-05'});
 assert.deepEqual(resolveExportDateRange('next14',window,2026,today),{start:today,end:'2026-09-12'});
 assert.deepEqual(resolveExportDateRange('next30',window,2026,today),{start:today,end:'2026-09-28'});
});

test('custom validation is based on distinct calendar months, including leap years',()=>{
 for(const [start,end] of [['2026-01-01','2026-12-31'],['2028-01-01','2028-12-31'],['2026-02-28','2027-01-31'],['2026-09-20','2027-08-31']]) { assert.equal(countCalendarMonthsInclusive(start,end),12); assert.equal(validateExportRange({start,end},2026,true),null); }
 for(const [start,end] of [['2026-01-31','2027-01-30'],['2026-09-20','2027-09-01']]) assert.equal(validateExportRange({start,end},2026,true),'Choose a range spanning no more than 12 calendar months.');
});

test('rolling grid model includes cross-year ranges and preserves canonical IDs',()=>{
 const event=(id,date,endDate=date,extra={})=>({id,date,endDate,title:id,category:'a',color:null,displayPriority:4,timeStatus:'all-day',startTime:null,endTime:null,eventKind:null,showInGrid:true,...extra});
 const months=buildMonthWindow(2026,8); const model=buildGridWindowViewModel([event('dec','2026-12-20'),event('jan','2027-01-01'),event('aug','2027-08-31'),event('sep','2027-09-01'),event('range','2026-12-31','2027-01-02'),event('hidden','2027-02-01','2027-02-01',{showInGrid:false})],months,new Map([['a',0]]));
 assert.equal(model.byDate.get('2026-12-20')[0].id,'dec'); assert.equal(model.byDate.get('2027-01-01').some(e=>e.id==='jan'),true); assert.equal(model.byDate.get('2027-08-31')[0].id,'aug'); assert.equal(model.byDate.has('2027-09-01'),false);
 assert.deepEqual(['2026-12-31','2027-01-01','2027-01-02'].map(d=>model.byDate.get(d).find(e=>e.id==='range').id),['range','range','range']); assert.equal(model.byDate.has('2027-02-01'),false);
});

test('adaptive planner selects layouts, month columns, highest safe ratio, and explicit infeasibility',()=>{
 const p=(start,end,extra={})=>planGridPublication({start,end,...extra});
 assert.equal(p('2026-01-01','2026-01-07').layout,'week'); assert.equal(p('2026-01-01','2026-01-14').layout,'week'); assert.equal(p('2026-01-01','2026-01-30').layout,'multiweek'); assert.equal(p('2026-01-01','2026-02-14').layout,'multiweek'); assert.equal(p('2026-01-01','2026-02-15').layout,'month-columns');
 assert.equal(p('2026-01-01','2026-03-31').columnCount,3); assert.equal(p('2026-01-01','2026-06-30').columnCount,6); assert.equal(p('2026-01-01','2026-12-31').columnCount,12); assert.equal(p('2026-01-01','2026-01-07').pixelRatio,2);
 const dense=new Map([['2026-01-01',Array(500).fill({})]]); const unsafe=p('2026-01-01','2026-12-31',{recordsByDate:dense,mobile:true}); assert.equal(unsafe.feasible,false); assert.equal(unsafe.includeAllEvents,false); assert.match(unsafe.reason,/too much information/);
});

test('publication event text wraps words and long tokens with final-line ellipsis only',()=>{
 const measureText=s=>s.length;
 assert.deepEqual(wrapCanvasText({text:'short',maxWidth:10,maxLines:2,measureText}),['short']);
 assert.deepEqual(wrapCanvasText({text:'normal long title',maxWidth:10,maxLines:3,measureText}),['normal','long title']);
 assert.deepEqual(wrapCanvasText({text:'abcdefghijklmnop',maxWidth:5,maxLines:4,measureText}),['abcde','fghij','klmno','p']);
 const overflow=wrapCanvasText({text:'one two three four five',maxWidth:7,maxLines:2,measureText}); assert.equal(overflow.length,2); assert.equal(overflow[0].includes('…'),false); assert.equal(overflow[1].endsWith('…'),true);
});

test('Q1 export descriptors stay authoritative from a February interactive anchor',()=>{
 const interactive=buildMonthWindow(2026,1);
 const q1Range=resolveExportDateRange('q1',monthWindowDateRange(interactive),2026,'2026-08-30');
 const exportMonths=buildMonthWindow(2026,0,3);
 assert.deepEqual(exportMonths.map(month=>[month.key,month.daysInMonth]),[['2026-01',31],['2026-02',28],['2026-03',31]]);
 const records=[{id:'jan31',date:'2026-01-31',endDate:'2026-01-31',title:'Jan 31',category:'a',color:null,displayPriority:4,timeStatus:'all-day',startTime:null,endTime:null,eventKind:null,showInGrid:true},{id:'mar31',date:'2026-03-31',endDate:'2026-03-31',title:'Mar 31',category:'a',color:null,displayPriority:4,timeStatus:'all-day',startTime:null,endTime:null,eventKind:null,showInGrid:true}];
 const model=buildGridWindowViewModel(records,exportMonths,new Map([['a',0]]));
 assert.deepEqual(q1Range,{start:'2026-01-01',end:'2026-03-31'});
 assert.equal(model.byDate.get('2026-01-31')[0].id,'jan31');
 assert.equal(model.byDate.get('2026-03-31')[0].id,'mar31');
});

test('calendar-year export descriptors ignore non-January interactive positions',()=>{
 const interactive=buildMonthWindow(2026,8);
 assert.equal(interactive[0].key,'2026-09');
 const calendarYear=buildMonthWindow(2026,0,12);
 assert.deepEqual(calendarYear.map(month=>month.daysInMonth),[31,28,31,30,31,30,31,31,30,31,30,31]);
});

test('2028 calendar-year export owns leap-day month length from its descriptor',()=>{
 const interactive=buildMonthWindow(2027,8);
 assert.equal(interactive[0].key,'2027-09');
 const calendarYear=buildMonthWindow(2028,0,12);
 assert.equal(calendarYear[1].key,'2028-02');
 assert.equal(calendarYear[1].daysInMonth,29);
});

test('Add Event defaults to today only when today is inside the rolling window',()=>{
 assert.equal(resolveAddEventDefaultDate('2026-08-30',monthWindowDateRange(buildMonthWindow(2026,8))),'2026-09-01');
 assert.equal(resolveAddEventDefaultDate('2026-08-30',monthWindowDateRange(buildMonthWindow(2026,7))),'2026-08-30');
});
