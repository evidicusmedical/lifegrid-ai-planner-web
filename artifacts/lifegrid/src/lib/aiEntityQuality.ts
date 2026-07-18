import type { AppData } from '../types';

export const normalizeEntityDisplayName = (value: unknown): string =>
  typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/gu, ' ').trim() : '';

const placeholders = new Set(['untitled', 'untitled task', 'untitled event', 'untitled item', 'new task', 'new event', 'new item', 'task', 'event', 'item', 'tbd', 'unknown', 'placeholder', 'to do', 'title', 'name']);
const generic = new Set(['appointment', 'meeting', 'follow up', 'admin', 'handle this', 'check', 'call']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const generatedId = /^(?:imp|evt|event|task|project|person|category)[-_][a-z0-9]+(?:[-_][a-z0-9]+)*$/i;
const date = /^\d{4}-\d{2}-\d{2}$/;
const time = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const punctuation = /^\p{P}+$/u;
export type EntityQualityIssue = { code: string; severity: 'blocking'|'warning'; field: string; explanation: string; correction: string };
export const identityField = (entity: string) => entity === 'tasks' || entity === 'projects' ? 'name' : entity === 'events' || entity === 'peopleSchedule' ? 'title' : 'label';
export function validateAddedEntityIdentity(entity: string, record: any): EntityQualityIssue | null {
  const field = identityField(entity); const name = normalizeEntityDisplayName(record?.[field]);
  if (record?.[field] === undefined || record?.[field] === null) return { code:'MISSING_REQUIRED_TITLE', severity:'blocking', field, explanation:`${entity} additions require ${field}.`, correction:`Provide a meaningful ${field}.` };
  if (!name) return { code:'EMPTY_REQUIRED_TITLE', severity:'blocking', field, explanation:`${entity} ${field} is empty.`, correction:`Provide a meaningful ${field}.` };
  const lower = name.toLocaleLowerCase();
  if (placeholders.has(lower)) return { code:'PLACEHOLDER_TITLE', severity:'blocking', field, explanation:`${entity} ${field} is a placeholder.`, correction:`Replace it with a concrete human-readable ${field}.` };
  if (punctuation.test(name) || uuid.test(name) || generatedId.test(name) || date.test(name) || time.test(name)) return { code:'INVALID_TITLE_CHARACTERS', severity:'blocking', field, explanation:`${entity} ${field} is not a meaningful identity.`, correction:`Provide a descriptive human-readable ${field}.` };
  if (generic.has(lower)) return { code:'GENERIC_TITLE', severity:'blocking', field, explanation:`${entity} ${field} is too generic.`, correction:`Add concrete context or outcome to the ${field}.` };
  return null;
}

export function resolveProposalDisplayLabel(entity: string, operation: 'add'|'update', record: any, current: AppData): string {
  const field = identityField(entity);
  if (operation === 'add') return normalizeEntityDisplayName(record?.[field]) || `New ${entity} with missing ${field}`;
  const source = (current as any)[entity === 'peopleSchedule' ? 'personEvents' : entity]?.find((item: any) => item.id === record?.id);
  const merged = source ? { ...source, ...record } : record;
  return normalizeEntityDisplayName(merged?.[field]) || `Existing ${entity.slice(0, -1)} with missing ${field}`;
}
