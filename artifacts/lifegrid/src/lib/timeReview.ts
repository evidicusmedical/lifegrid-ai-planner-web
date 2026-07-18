import { analyzeTemporalReview, type TemporalReviewIssue, type TemporalRecord } from './temporal.js';

/** Review rows are an immutable projection of current calendar data, never stored calendar data. */
export type ReviewSource = 'temporal-validation' | 'legacy-migration' | 'application-version' | 'ai-clarification' | 'reference-validation';
export type ReviewAction = 'edit' | 'confirm-all-day' | 'confirm-time-unknown' | 'delete';
export type ReviewRecordType = 'event' | 'person-schedule';
export type FlaggedReviewItem = { issueKey: string; source: ReviewSource; severity: 'blocking' | 'advisory'; recordType: ReviewRecordType; recordId: string; issueCode: string; title: string; reason: string; question?: string; allowedActions: ReviewAction[]; fingerprint: string };
type ReviewRule = { issueCode: string; source: ReviewSource; severity: FlaggedReviewItem['severity']; allowedActions: ReviewAction[]; reason: string; question?: string; requiresReview: (issue: TemporalReviewIssue, record: TemporalRecord) => boolean };

/** A legacy value is reviewable only when its producer explicitly recorded an unresolved two-way choice. */
export const requiresLegacyTemporalClarification = (record: TemporalRecord) =>
  !record.timeStatus && (record as TemporalRecord & { temporalReview?: string }).temporalReview === 'legacy-ambiguous';

const temporalRule = (issueCode: string): ReviewRule => ({ issueCode, source: 'temporal-validation', severity: 'blocking', allowedActions: ['edit', 'delete'], reason: 'The current temporal values cannot be safely interpreted or exported.', requiresReview: () => true });
export const REVIEW_ISSUE_RULES: readonly ReviewRule[] = [
  { issueCode: 'MIGRATION_REVIEW_REQUIRED', source: 'legacy-migration', severity: 'blocking', allowedActions: ['confirm-all-day', 'confirm-time-unknown', 'edit', 'delete'], reason: 'The older representation has two valid meanings and choosing one would guess intent.', question: 'Was this intended to be all day or to occur at an unknown time?', requiresReview: (_issue, record) => requiresLegacyTemporalClarification(record) },
  ...['SAME_START_END', 'END_BEFORE_START_DATE', 'ZONED_WITHOUT_TIMEZONE', 'FLOATING_WITH_TIMEZONE', 'INVALID_TIMEZONE', 'DST_GAP', 'DST_FOLD', 'INVALID_TEMPORAL_COMBINATION'].map(temporalRule),
];
export const REVIEW_RULE_BY_CODE = new Map(REVIEW_ISSUE_RULES.map(rule => [rule.issueCode, rule]));
export const reviewFingerprint = (issue: TemporalReviewIssue) => `${issue.recordType}|${issue.recordId}|${issue.code}|${issue.date}|${issue.explanation}`;
export const isReviewEligible = (issue: TemporalReviewIssue, record?: TemporalRecord) => !!record && !!REVIEW_RULE_BY_CODE.get(issue.code)?.requiresReview(issue, record);

export type DerivedFlaggedReviewState = { rawFindings: TemporalReviewIssue[]; items: FlaggedReviewItem[]; unmappedFindings: TemporalReviewIssue[]; counts: ReturnType<typeof reviewCounts>; itemsByKey: Map<string, FlaggedReviewItem>; findingsByRecordKey: Map<string, TemporalReviewIssue[]>; grouped: Map<string, FlaggedReviewItem[]> };
export const deriveFlaggedReviewState = ({ events, personEvents }: { events: Array<TemporalRecord & { id: string; title: string }>; personEvents: Array<TemporalRecord & { id: string; title: string }> }): DerivedFlaggedReviewState => {
  const rawFindings = analyzeTemporalReview(events, personEvents);
  const records = new Map<string, TemporalRecord>();
  events.forEach(record => records.set(`event:${record.id}`, record)); personEvents.forEach(record => records.set(`person-schedule:${record.id}`, record));
  const unmappedFindings: TemporalReviewIssue[] = [], items: FlaggedReviewItem[] = [];
  const findingsByRecordKey = new Map<string, TemporalReviewIssue[]>();
  for (const issue of rawFindings) {
    const recordKey = `${issue.recordType}:${issue.recordId}`; const record = records.get(recordKey); const rule = REVIEW_RULE_BY_CODE.get(issue.code);
    const recordFindings = findingsByRecordKey.get(recordKey) ?? []; recordFindings.push(issue); findingsByRecordKey.set(recordKey, recordFindings);
    if (!rule) { unmappedFindings.push(issue); continue; }
    if (!record || !rule.requiresReview(issue, record)) continue;
    items.push({ issueKey: issue.key, source: rule.source, severity: rule.severity, recordType: issue.recordType, recordId: issue.recordId, issueCode: issue.code, title: issue.title, reason: issue.explanation || rule.reason, question: rule.question, allowedActions: rule.allowedActions, fingerprint: reviewFingerprint(issue) });
  }
  items.sort((a, b) => a.issueKey.localeCompare(b.issueKey));
  const grouped = new Map<string, FlaggedReviewItem[]>(); items.forEach(item => { const group = grouped.get(item.issueCode) ?? []; group.push(item); grouped.set(item.issueCode, group); });
  return { rawFindings, items, unmappedFindings, counts: reviewCounts(items), itemsByKey: new Map(items.map(item => [item.issueKey, item])), findingsByRecordKey, grouped };
};
/** Compatibility wrapper; callers with records should use deriveFlaggedReviewState. Unknown codes are deliberately omitted. */
export const toFlaggedReviewItems = (issues: TemporalReviewIssue[]) => issues.filter(issue => REVIEW_RULE_BY_CODE.has(issue.code)).map(issue => { const rule = REVIEW_RULE_BY_CODE.get(issue.code)!; return { issueKey: issue.key, source: rule.source, severity: rule.severity, recordType: issue.recordType, recordId: issue.recordId, issueCode: issue.code, title: issue.title, reason: issue.explanation, question: rule.question, allowedActions: rule.allowedActions, fingerprint: reviewFingerprint(issue) }; }).sort((a,b) => (a.source === 'legacy-migration' ? -1 : b.source === 'legacy-migration' ? 1 : a.issueKey.localeCompare(b.issueKey)));
export const reviewCounts = (items: FlaggedReviewItem[]) => ({ blocking: items.filter(item => item.severity === 'blocking').length, advisory: items.filter(item => item.severity === 'advisory').length, total: items.length });
export const quickTemporalConfirmation = <T extends { date: string }>(record: T, choice: 'all-day' | 'unknown') => ({ ...record, endDate: record.date, timeStatus: choice, startTime: null, endTime: null, timeZone: null, timeZoneMode: null, temporalReview: undefined });
export const compareReviewFindings = (previous: TemporalReviewIssue[], current: TemporalReviewIssue[]) => { const before = new Set(previous.map(issue => issue.key)), after = new Set(current.map(issue => issue.key)); return { resolved: [...before].filter(key => !after.has(key)).length, added: [...after].filter(key => !before.has(key)).length, remaining: current.length }; };
export const reviewRefreshMessage = ({ resolved, added, remaining }: ReturnType<typeof compareReviewFindings>) => !remaining ? 'Review refreshed — no flagged items.' : resolved || added ? `Review refreshed — ${resolved} issue${resolved === 1 ? '' : 's'} resolved, ${added} new issue${added === 1 ? '' : 's'} detected.` : `Review refreshed — ${remaining} issue${remaining === 1 ? '' : 's'} remain.`;
