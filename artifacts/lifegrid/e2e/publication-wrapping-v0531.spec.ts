import { expect, test, type Page, type TestInfo } from '@playwright/test';

test.describe.configure({ retries: 0 });
test.setTimeout(90_000);

const labels=['USAF','Fun','Admin','Family','Health','Holidays','Langley ED Shifts','USACS and Moonlighting','Relationship / Wife','Requested Day Off','Certification, Credentials and Continuing Education'];
const titles=['Dietician Class for Starting GLP 1','Drop off Natalie before Chicago trip','USACS New Hire Onboarding meeting (PT 1099)','Requested day off - spouse visit planning','This intentionally excessive sentence length title contains far more explanatory prose than the publication card can display while retaining its date and time and equal geometry','ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
const categories=labels.map((label,index)=>({id:`category-${index}`,label,color:['#2563eb','#16a34a','#dc2626'][index%3]}));
const events=labels.map((_,index)=>({id:`event-${index}`,date:`2026-09-${String(index+1).padStart(2,'0')}`,endDate:`2026-09-${String(index+1).padStart(2,'0')}`,title:titles[index]??`Represented event ${index}`,category:`category-${index}`,projectId:null,timeStatus:'all-day',startTime:null,endTime:null,color:categories[index].color,notes:null,displayPriority:4,showInGrid:true,showInExport:true,linkedTaskIds:[],aiNotes:null,sourceNotes:null}));
events.push({...events[0],id:'event-after-dietician',title:'Following Event',displayPriority:5});

test.beforeEach(async({page})=>{
  await page.clock.setFixedTime(new Date('2026-09-15T12:00:00Z'));
  await page.addInitScript(data=>{
    (window as Window & {__fillTexts?:{text:string;x:number;y:number;maxWidth?:number;font:string}[]}).__fillTexts=[];
    const original=CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText=function(text,x,y,maxWidth){(window as Window & {__fillTexts?:{text:string;x:number;y:number;maxWidth?:number;font:string}[]}).__fillTexts?.push({text:String(text),x,y,maxWidth,font:this.font});return maxWidth===undefined?original.call(this,text,x,y):original.call(this,text,x,y,maxWidth);};
    if(!localStorage.getItem('lifegrid_store_v5')) localStorage.setItem('lifegrid_store_v5',JSON.stringify({activeCalendarId:'v0531',calendars:[{id:'v0531',name:'Wrapping Calendar',createdAt:'2026-09-01T00:00:00.000Z',data}]}));
  },{events,tasks:[],personEvents:[],people:[],milestones:[],categories,projects:[]});
  await page.goto('/#grid');
  await expect(page.getByTestId('grid-content')).toHaveAttribute('aria-busy','false');
});

const open=async(page:Page,preset:string)=>{await page.getByTestId('button-export').click();await page.getByTestId(`export-date-preset-${preset}`).click();};
const png=async(page:Page)=>{await page.getByTestId('button-export-generate').click();await expect(page.getByTestId('grid-export-status')).toHaveAttribute('data-export-status','ready',{timeout:45_000});const image=page.getByTestId('export-preview-image');await expect(image).toBeVisible();expect(await image.getAttribute('src')).toMatch(/^data:image\/png;base64,/);};
const visibleLines=async(locator:ReturnType<Page['locator']>)=>locator.evaluate(element=>{
  const text=element.firstChild;if(!text||text.nodeType!==Node.TEXT_NODE)return [];
  const bounds=element.getBoundingClientRect(),value=text.textContent??'';
  const tokens=[...value.matchAll(/\S+/g)].map(match=>({text:match[0],start:match.index!,end:match.index!+match[0].length}));
  const visible=tokens.map(token=>{const range=document.createRange();range.setStart(text,token.start);range.setEnd(text,token.end);const rect=range.getBoundingClientRect();return{...token,rect};}).filter(token=>token.rect.bottom>bounds.top-.5&&token.rect.top<bounds.bottom+.5&&token.rect.right>bounds.left-.5&&token.rect.left<bounds.right+.5);
  const lines:{top:number;tokens:string[]}[]=[];
  for(const token of visible){let line=lines.find(item=>Math.abs(item.top-token.rect.top)<=1.5);if(!line){line={top:token.rect.top,tokens:[]};lines.push(line);}line.tokens.push(token.text);}
  return lines.sort((a,b)=>a.top-b.top).map(line=>line.tokens.join(' '));
});

test('natural legend, event titles, and compact September month matrix produce a real PNG',async({page},testInfo:TestInfo)=>{
  await open(page,'currentMonth');
  const root=page.getByTestId('targeted-export-grid');
  await expect(root).toHaveAttribute('data-publication-layout','month-matrix');
  await expect(root.locator('thead th')).toHaveText(['Sun','Mon','Tue','Wed','Thu','Fri','Sat']);
  const tableMetrics=await root.locator('table').evaluate(table=>{const head=table.querySelector('thead')!.getBoundingClientRect();const body=table.querySelector('tbody tr')!.getBoundingClientRect();return{headHeight:head.height,gap:body.top-head.bottom,tableBottom:table.getBoundingClientRect().bottom,rootBottom:table.parentElement!.getBoundingClientRect().bottom};});
  expect(tableMetrics.headHeight).toBeLessThan(50);expect(Math.abs(tableMetrics.gap)).toBeLessThanOrEqual(4);expect(tableMetrics.rootBottom-tableMetrics.tableBottom).toBeGreaterThan(0);
  const september1=page.getByTestId('targeted-export-day-2026-09-01');expect(await september1.evaluate(node=>node.cellIndex)).toBe(2);
  for(const label of labels.slice(0,6)){const node=root.locator('[data-publication-legend-label]',{hasText:label}).first();await expect(node).toHaveText(label);const height=await node.evaluate(element=>element.getBoundingClientRect().height);expect(height).toBeLessThanOrEqual(18);}
  const title=root.locator('[data-publication-event-title]',{hasText:titles[0]}).first();await expect(title).toHaveText(titles[0]);
  const renderedLines=await visibleLines(title);expect(renderedLines.flatMap(line=>line.split(' '))).toEqual(titles[0].split(' '));expect(renderedLines.at(-1)).not.toBe('1');
  const card=title.locator('xpath=..');const cardBox=await card.boundingBox(),titleBox=await title.boundingBox();expect(titleBox!.y+titleBox!.height).toBeLessThanOrEqual(cardBox!.y+cardBox!.height+1);
  const nextCard=page.getByTestId('targeted-export-event-2026-09-01-event-after-dietician');const nextBox=await nextCard.boundingBox();expect(cardBox!.y+cardBox!.height).toBeLessThanOrEqual(nextBox!.y+1);
  const legendRegion=await root.locator('[aria-label=Categories]').boundingBox();
  const publicationBox=await root.boundingBox();
  await png(page);
  if(testInfo.project.name==='firefox'){
    const calls=await page.evaluate(()=>(window as Window & {__fillTexts?:{text:string;x:number;y:number;maxWidth?:number;font:string}[]}).__fillTexts??[]);
    const offset={x:publicationBox!.x,y:publicationBox!.y};
    const inBox=(call:typeof calls[number],box:{x:number;y:number;width:number;height:number})=>call.x+offset.x>=box.x-2&&call.x+offset.x<=box.x+box.width+2&&call.y+offset.y>=box.y-2&&call.y+offset.y<=box.y+box.height+2;
    const legendCalls=calls.filter(call=>inBox(call,legendRegion!)).map(call=>call.text);
    for(const label of labels.slice(0,6))expect(legendCalls).toContain(label);
    for(const fragment of ['USA','F','Fu','n','Admi','Famil','Holiday'])expect(legendCalls).not.toContain(fragment);
    const titleCalls=calls.filter(call=>inBox(call,cardBox!)).filter(call=>titles[0].split(' ').some(word=>call.text.includes(word))||call.text==='1').sort((a,b)=>a.y-b.y);
    expect(titleCalls.map(call=>call.text).join(' ').split(/\s+/)).toEqual(titles[0].split(' '));expect(titleCalls.at(-1)?.text).not.toBe('1');
    for(const call of titleCalls)if(call.maxWidth!==undefined)expect(call.maxWidth).toBeLessThanOrEqual(titleBox!.width+1);
  }
});

test('Next 7, Next 14, and Next 30 preserve exact dates and equal row geometry',async({page})=>{
  for(const [preset,count] of [['next7',7],['next14',14],['next30',30]] as const){await open(page,preset);const root=page.getByTestId('targeted-export-grid');await expect(root.locator('[data-publication-date]')).toHaveCount(count);const heights=await root.locator('tbody tr').evaluateAll(rows=>rows.map(row=>Math.round(row.getBoundingClientRect().height)));expect(new Set(heights).size).toBe(1);await png(page);await page.getByTestId('button-export-close').click();}
});
