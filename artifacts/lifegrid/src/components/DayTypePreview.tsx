import React, { useEffect, useRef } from 'react';
import { Event } from '../types';
import { formatDateLong } from '../lib/format';

type Props = { event: Event | null; date: string; category: string; anchor: DOMRect | null; onClose: () => void; onDetails: () => void; onEdit: () => void };
/** Desktop-only enhanced preview. Touch activation continues to use DayDetailSheet. */
export const DayTypePreview = ({ event, date, category, anchor, onClose, onDetails, onEdit }: Props) => {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!event) return; const close = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, [event, onClose]);
  if (!event || !anchor) return null;
  const width = Math.min(480, Math.max(320, window.innerWidth - 32));
  const below = anchor.bottom + 12 + 340 < window.innerHeight;
  const left = Math.max(16, Math.min(anchor.left, window.innerWidth - width - 16));
  return <div ref={panel} id={`day-type-preview-${event.id}`} role="dialog" aria-label={`Day Type preview: ${event.title}`} className="fixed z-40 w-[min(30rem,calc(100vw-2rem))] max-h-[65vh] overflow-y-auto rounded-xl border border-border bg-card p-4 shadow-xl" style={{ left, top: below ? anchor.bottom + 8 : Math.max(16, anchor.top - Math.min(420, window.innerHeight - 32)) }} onPointerEnter={() => undefined} onPointerLeave={onClose}>
    <div className="flex items-start justify-between gap-3"><div><p className="font-bold">{event.title}</p><p className="text-xs text-muted-foreground">{formatDateLong(date)} · {category} · Day Type</p></div><button type="button" onClick={onClose} aria-label="Close preview" className="text-sm text-muted-foreground">×</button></div>
    {event.notes ? <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{event.notes}</p> : <p className="mt-3 text-sm text-muted-foreground">No notes added.</p>}
    <div className="mt-4 flex gap-2"><button type="button" onClick={onDetails} className="rounded-md bg-muted px-3 py-2 text-xs font-bold">Open Details</button><button type="button" onClick={onEdit} className="rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">Edit</button></div>
  </div>;
};
