import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TimeStatus, TimeZoneMode } from '../types';
import { temporalErrors, temporalSummary } from '../lib/temporal';

export const TIME_ZONES = ['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Asia/Tokyo'];

/** Shared, deliberately small temporal editor used by Event and Person Schedule sheets. */
export function TemporalFields({ prefix, date, startTime, endTime, endDate, timeStatus, timeZoneMode, timeZone, displayTimeZone, onChange }: {
  prefix: 'event' | 'person-schedule'; date: string; startTime: string; endTime: string; endDate: string; timeStatus: TimeStatus; timeZoneMode: TimeZoneMode; timeZone: string; displayTimeZone: string;
  onChange: (next: Partial<{ startTime: string; endTime: string; endDate: string; timeStatus: TimeStatus; timeZoneMode: TimeZoneMode; timeZone: string }>) => void;
}) {
  const clocked = timeStatus === 'timed' || timeStatus === 'approximate';
  const test = (name: string) => `${prefix}-${name}`;
  const changeStatus = (next: TimeStatus) => {
    if (next === 'all-day' || next === 'unknown') onChange({ timeStatus: next, startTime: '', endTime: '', timeZone: '', timeZoneMode: null as unknown as TimeZoneMode });
    else onChange({ timeStatus: next, endDate: endDate || date, timeZoneMode: timeZoneMode || 'zoned', timeZone: timeZone || displayTimeZone });
  };
  const errors = temporalErrors({ date, startTime: clocked ? startTime || null : null, endTime: clocked ? endTime || null : null, endDate: endDate || date, timeStatus, timeZone: clocked && timeZoneMode === 'zoned' ? timeZone : null, timeZoneMode: clocked ? timeZoneMode : null });
  return <div className="rounded-xl border border-border p-3 space-y-3">
    <Label className="text-sm font-semibold">Time type</Label>
    <div className="grid grid-cols-2 gap-2">{([['all-day','All day'],['timed','Timed'],['unknown','Time unknown'],['approximate','Approximate']] as [TimeStatus,string][]).map(([value,label]) => <button key={value} type="button" onClick={() => changeStatus(value)} data-testid={test('time-type')} className={`rounded-lg border px-2 py-2 text-xs ${timeStatus === value ? 'border-primary bg-primary/5 text-primary' : 'border-border'}`}>{label}</button>)}</div>
    {clocked && <>
      <div className="grid grid-cols-2 gap-2"><div><Label>Start time</Label><Input type="time" value={startTime} onChange={e => onChange({ startTime: e.target.value })} data-testid={test('start-time')} /></div><div><Label>End time</Label><Input type="time" value={endTime} onChange={e => onChange({ endTime: e.target.value })} data-testid={test('end-time')} /></div></div>
      <div><Label>End date</Label><Input type="date" value={endDate || date} min={date} onChange={e => onChange({ endDate: e.target.value })} data-testid={test('end-date')} /></div>
      <div className="flex gap-2"><Button type="button" size="sm" variant={timeZoneMode === 'zoned' ? 'default' : 'outline'} onClick={() => onChange({ timeZoneMode: 'zoned', timeZone: timeZone || displayTimeZone })} data-testid={test('time-handling')}>Specific timezone</Button><Button type="button" size="sm" variant={timeZoneMode === 'floating' ? 'default' : 'outline'} onClick={() => onChange({ timeZoneMode: 'floating', timeZone: '' })}>Floating local time</Button></div>
      {timeZoneMode === 'zoned' && <select value={timeZone} onChange={e => onChange({ timeZone: e.target.value })} className="w-full h-9 rounded border bg-background px-2 text-sm" data-testid={test('timezone')}>{TIME_ZONES.map(z => <option key={z}>{z}</option>)}</select>}
    </>}
    <p className="text-[11px] text-muted-foreground">{errors[0] || temporalSummary({ date, startTime: clocked ? startTime || null : null, endTime: clocked ? endTime || null : null, endDate: endDate || date, timeStatus, timeZone: clocked && timeZoneMode === 'zoned' ? timeZone : null, timeZoneMode: clocked ? timeZoneMode : null })}</p>
  </div>;
}
