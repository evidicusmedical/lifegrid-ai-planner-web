import type { TemporalReviewIssue } from './temporal';

/** A derived, deliberately narrow review model.  It is not calendar content. */
export type ReviewSource = 'temporal-validation' | 'legacy-migration' | 'application-version' | 'ai-clarification' | 'reference-validation';
export type ReviewAction = 'edit' | 'confirm-all-day' | 'confirm-time-unknown' | 'ignore' | 'restore' | 'delete';
export type FlaggedReviewItem = {
  issueKey: string; source: ReviewSource; severity: 'blocking' | 'advisory';
  recordType: 'event' | 'person-schedule'; recordId: string; issueCode: string;
  title: string; reason: string; question?: string; allowedActions: ReviewAction[]; fingerprint: string;
};

const legacyCodes = new Set(['MISSING_TIME_STATUS', 'MIGRATION_REVIEW_REQUIRED']);
/** The exclusion gate: optional omissions and usable unusual time representations never pass. */
export const isReviewEligible = (issue: TemporalReviewIssue) => (issue.blocking && issue.code !== 'INVALID_TEMPORAL_COMBINATION') || legacyCodes.has(issue.code);
export const reviewFingerprint = (issue: TemporalReviewIssue) => `${issue.recordType}|${issue.recordId}|${issue.code}|${issue.date}|${issue.explanation}`;
export const toFlaggedReviewItems = (issues: TemporalReviewIssue[]): FlaggedReviewItem[] => issues.filter(isReviewEligible).map(issue => {
  const legacy = legacyCodes.has(issue.code);
  const allowedActions: ReviewAction[] = legacy ? ['confirm-all-day', 'confirm-time-unknown', 'edit', 'delete'] : ['edit', 'delete'];
  return { issueKey: issue.key, source: legacy ? 'legacy-migration' as const : 'temporal-validation' as const, severity: 'blocking' as const, recordType: issue.recordType, recordId: issue.recordId, issueCode: issue.code, title: issue.title, reason: issue.explanation, question: legacy ? 'Was this intended to be all day or to occur at an unknown time?' : undefined, allowedActions, fingerprint: reviewFingerprint(issue) };
}).sort((a, b) => a.issueKey.localeCompare(b.issueKey));

export const reviewCounts = (items: FlaggedReviewItem[]) => ({ blocking: items.filter(item => item.severity === 'blocking').length, advisory: items.filter(item => item.severity === 'advisory').length, total: items.length });
export const quickTemporalConfirmation = <T extends { date: string }>(record: T, choice: 'all-day' | 'unknown') => ({ ...record, endDate: record.date, timeStatus: choice, startTime: null, endTime: null, timeZone: null, timeZoneMode: null, temporalReview: undefined });

/** Compare analyzer output by its stable issue key; this never mutates findings. */
export const compareReviewFindings = (previous: TemporalReviewIssue[], current: TemporalReviewIssue[]) => {
  const before = new Set(previous.map(issue => issue.key));
  const after = new Set(current.map(issue => issue.key));
  return {
    resolved: [...before].filter(key => !after.has(key)).length,
    added: [...after].filter(key => !before.has(key)).length,
    remaining: current.length,
  };
};

export const reviewRefreshMessage = ({ resolved, added, remaining }: ReturnType<typeof compareReviewFindings>) => {
  if (!remaining) return 'Review refreshed — no flagged items.';
  if (resolved || added) return `Review refreshed — ${resolved ? `${resolved} issue${resolved === 1 ? '' : 's'} resolved` : ''}${resolved && added ? ' and ' : ''}${added ? `${added} new issue${added === 1 ? '' : 's'} detected` : ''}.`;
  return `Review refreshed — ${remaining} issue${remaining === 1 ? '' : 's'} remain.`;
};
