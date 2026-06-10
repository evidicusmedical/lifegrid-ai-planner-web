import { AppData, Event, EventKind, Task } from '../types';
import { MergeIntoDayTypeProposal, ConvertTimedBlockToTaskProposal } from './aiPrompt';

const APP_VERSION = '0.4.4';

const SAFE_DELETE_KINDS = new Set<EventKind>(['flexible-work-block', 'reminder', 'placeholder']);

export function isSourceDeletionAllowed(event: Event | undefined): { allowed: boolean; reason?: string } {
  if (!event) return { allowed: false, reason: 'Source event not found by ID' };
  if (!event.eventKind) {
    return { allowed: false, reason: 'Source event has unknown eventKind and cannot be auto-deleted' };
  }
  if (SAFE_DELETE_KINDS.has(event.eventKind)) return { allowed: true };
  return { allowed: false, reason: `"${event.eventKind}" events cannot be auto-deleted` };
}

export function appendAuditEntry(event: Event, entry: string): Event {
  const ts = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const line = `[AI v${APP_VERSION} ${ts}] ${entry}`;
  return {
    ...event,
    aiNotes: event.aiNotes ? `${event.aiNotes}\n${line}` : line,
  };
}

function genId(): string {
  return `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface TransformationProposalSet {
  mergeIntoDayType: MergeIntoDayTypeProposal[];
  convertTimedBlockToTask: ConvertTimedBlockToTaskProposal[];
}

export function applyTransformationProposals(
  data: AppData,
  proposals: TransformationProposalSet,
  approvedProposalIds: Set<string>
): { data: AppData; warnings: string[] } {
  const warnings: string[] = [];
  const processedSourceIds = new Set<string>();

  const next: AppData = {
    ...data,
    events: [...data.events],
    tasks: [...data.tasks],
    projects: data.projects,
    categories: data.categories,
    people: data.people,
    personEvents: data.personEvents,
  };

  // ── convertTimedBlockToTask ──────────────────────────────────────────────────
  for (const proposal of proposals.convertTimedBlockToTask) {
    if (!approvedProposalIds.has(proposal.proposalId)) continue;

    const { sourceEventId } = proposal;
    if (!sourceEventId) {
      warnings.push('Convert proposal skipped: missing sourceEventId');
      continue;
    }
    if (processedSourceIds.has(sourceEventId)) {
      warnings.push(`Convert proposal skipped: source "${sourceEventId}" already processed by another proposal`);
      continue;
    }

    const sourceEvent = next.events.find(e => e.id === sourceEventId);
    if (!sourceEvent) {
      warnings.push(`Convert proposal skipped: source event "${sourceEventId}" not found`);
      continue;
    }

    processedSourceIds.add(sourceEventId);

    const nt = proposal.newTask as any;
    const category = nt?.category ?? sourceEvent.category ?? 'other';
    const dueDate: string | null = nt?.dueDate ?? sourceEvent.date ?? null;
    const dueDateType = nt?.dueDateType ?? (dueDate ? 'target-date' as const : 'needs-clarification' as const);

    const provenanceLine = `Converted from event "${sourceEvent.title}" (${sourceEvent.date}${sourceEvent.startTime ? ` ${sourceEvent.startTime}` : ''}, id: ${sourceEventId})`;
    const combinedNotes = [provenanceLine, nt?.notes].filter(Boolean).join('\n');

    const task: Task = {
      id: (typeof nt?.id === 'string' && nt.id.trim()) ? nt.id.trim() : genId(),
      name: nt?.name ?? sourceEvent.title,
      category,
      dueDate,
      status: 'todo',
      owner: 'Me',
      nextAction: nt?.nextAction ?? null,
      notes: combinedNotes,
      priority: nt?.priority ?? 'medium',
      schedulingNotes: nt?.schedulingNotes ?? null,
      projectId: nt?.projectId ?? null,
      dueDateType,
      triageStatus: nt?.triageStatus ?? 'needs-review',
      parentTaskId: (typeof nt?.parentTaskId === 'string' && nt.parentTaskId) ? nt.parentTaskId : null,
      linkedEventIds: [sourceEventId],
    };

    next.tasks = [...next.tasks, task];

    const auditText = `Converted to task "${task.name}" (id: ${task.id})`;
    const annotatedSource = appendAuditEntry(sourceEvent, auditText);

    if (proposal.deleteSourceAfterConvert) {
      const deleteCheck = isSourceDeletionAllowed(sourceEvent);
      if (deleteCheck.allowed) {
        const finalNotes = [combinedNotes, `Source removed after conversion. ${auditText}`].filter(Boolean).join('\n');
        next.tasks = next.tasks.map(t => t.id === task.id ? { ...t, notes: finalNotes } : t);
        next.events = next.events.filter(e => e.id !== sourceEventId);
      } else {
        warnings.push(`Source event "${sourceEvent.title}" kept (${deleteCheck.reason})`);
        next.events = next.events.map(e => e.id === sourceEventId ? annotatedSource : e);
      }
    } else {
      next.events = next.events.map(e => e.id === sourceEventId ? annotatedSource : e);
    }
  }

  // ── mergeIntoDayType ─────────────────────────────────────────────────────────
  for (const proposal of proposals.mergeIntoDayType) {
    if (!approvedProposalIds.has(proposal.proposalId)) continue;

    const { sourceEventId, targetDayTypeEventId } = proposal;
    if (!sourceEventId) {
      warnings.push('Merge proposal skipped: missing sourceEventId');
      continue;
    }
    if (!targetDayTypeEventId) {
      warnings.push('Merge proposal skipped: missing targetDayTypeEventId');
      continue;
    }
    if (processedSourceIds.has(sourceEventId)) {
      warnings.push(`Merge proposal skipped: source "${sourceEventId}" already processed by another proposal`);
      continue;
    }

    const sourceEvent = next.events.find(e => e.id === sourceEventId);
    if (!sourceEvent) {
      warnings.push(`Merge proposal skipped: source event "${sourceEventId}" not found`);
      continue;
    }
    const targetEvent = next.events.find(e => e.id === targetDayTypeEventId);
    if (!targetEvent) {
      warnings.push(`Merge proposal skipped: target event "${targetDayTypeEventId}" not found`);
      continue;
    }
    if (targetEvent.eventKind !== 'day-type') {
      warnings.push(`Merge proposal skipped: target "${targetEvent.title}" is not a day-type event (kind: ${targetEvent.eventKind ?? 'unknown'})`);
      continue;
    }

    processedSourceIds.add(sourceEventId);

    const timePart = [sourceEvent.startTime, sourceEvent.endTime].filter(Boolean).join('–');
    const defaultMergeLine = [timePart, sourceEvent.title, sourceEvent.notes ? `— ${sourceEvent.notes}` : '']
      .filter(Boolean).join(' ').trim();
    const mergeLine = proposal.noteSection ?? defaultMergeLine;
    const sep = '\n---\n';
    const existing = targetEvent.notes ?? '';
    const mergeMode = proposal.mergeMode ?? 'append-to-notes';

    let mergedNotes: string | null;
    if (mergeMode === 'replace-notes') {
      mergedNotes = mergeLine;
    } else if (mergeMode === 'prepend-to-notes') {
      mergedNotes = existing ? `${mergeLine}${sep}${existing}` : mergeLine;
    } else if (mergeMode === 'no-change') {
      mergedNotes = existing || null;
    } else {
      mergedNotes = existing ? `${existing}${sep}${mergeLine}` : mergeLine;
    }

    const targetAuditText = `Merged from "${sourceEvent.title}" (${sourceEvent.date}${sourceEvent.startTime ? ` ${sourceEvent.startTime}` : ''}, id: ${sourceEventId})`;
    const updatedTarget = appendAuditEntry({ ...targetEvent, notes: mergedNotes }, targetAuditText);
    next.events = next.events.map(e => e.id === targetDayTypeEventId ? updatedTarget : e);

    const sourceAuditText = `Merged into day-type "${targetEvent.title}" (id: ${targetDayTypeEventId}) on ${new Date().toISOString().slice(0, 10)}`;
    const annotatedSource = appendAuditEntry(sourceEvent, sourceAuditText);

    if (proposal.deleteSourceAfterMerge) {
      const deleteCheck = isSourceDeletionAllowed(sourceEvent);
      if (deleteCheck.allowed) {
        next.events = next.events.filter(e => e.id !== sourceEventId);
      } else {
        warnings.push(`Source event "${sourceEvent.title}" kept (${deleteCheck.reason})`);
        next.events = next.events.map(e => e.id === sourceEventId ? annotatedSource : e);
      }
    } else {
      next.events = next.events.map(e => e.id === sourceEventId ? annotatedSource : e);
    }
  }

  return { data: next, warnings };
}
