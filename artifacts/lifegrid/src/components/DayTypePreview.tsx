import React, { useEffect, useRef } from 'react';
import { Event } from '../types';
import { formatDateLong } from '../lib/format';
import { normalizeEditableTimeStatus } from '../lib/gridModel';

type Props = { event: Event | null; date: string; category: string; project?: string | null; anchor: DOMRect | null; onClose: () => void; onInteractionEnter?: () => void; onInteractionLeave?: () => void };
/** Universal desktop Event preview. Touch activation continues to use DayDetailSheet. */
export const DayTypePreview = ({ event, date, category, project, anchor, onClose, onInteractionEnter, onInteractionLeave }: Props) => {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!event) return; const close = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, [event, onClose]);
  if (!event || !anchor) return null;
  const width = Math.min(420, Math.max(300, window.innerWidth - 32));
  const estimatedHeight = Math.min(window.innerHeight * .7, 420);
  const below = anchor.bottom + 8 + estimatedHeight <= window.innerHeight - 16;
  const left = Math.max(16, Math.min(anchor.left, window.innerWidth - width - 16));
  const status = normalizeEditableTimeStatus(event.timeStatus);
  const range = event.endDate && event.endDate !== event.date ? `${formatDateLong(event.date)} – ${formatDateLong(event.endDate)}` : formatDateLong(date);
  const time = status === 'timed' ? `Timed · ${event.startTime ?? 'Start required'}–${event.endTime ?? 'End required'}${event.endDate && event.endDate !== event.date ? ` · ends ${formatDateLong(event.endDate)}` : ''}` : `All day · ${range}`;
  return <div ref={panel} id={`day-type-preview-${event.id}`} role="dialog" tabIndex={0} aria-label={`Event preview: ${event.title}`} data-testid="grid-event-preview"
    className="fixed z-40 w-[min(26.25rem,calc(100vw-2rem))] max-h-[70vh] select-text overflow-hidden rounded-xl border border-border bg-card p-4 shadow-xl"
    style={{ left, top: below ? anchor.bottom + 8 : Math.max(16, anchor.top - estimatedHeight - 8) }}
    onPointerEnter={onInteractionEnter} onPointerLeave={onInteractionLeave} onFocus={onInteractionEnter} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onInteractionLeave?.(); }}
    onClick={e => e.stopPropagation()} onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') { e.preventDefault(); const range=document.createRange(); range.selectNodeContents(e.currentTarget); const selection=window.getSelection(); selection?.removeAllRanges(); selection?.addRange(range); } }}>
    <div><h2 className="text-base font-bold leading-tight">{event.title}</h2><p className="mt-1 text-xs text-muted-foreground">{time}</p><p className="text-xs text-muted-foreground">Tag / Category: {category}</p>{project && <p className="text-xs text-muted-foreground">Project: {project}</p>}</div>
    <section className="mt-3"><h3 className="text-xs font-bold uppercase tracking-wide">User Notes</h3><div data-testid="preview-notes" className="mt-1 max-h-[40vh] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed">{event.notes || <span className="text-muted-foreground">No notes</span>}</div></section>
  </div>;
};
