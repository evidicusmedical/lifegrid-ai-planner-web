import type { TemporalReviewIssue } from './temporal';

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
  if (!remaining) return 'Review refreshed — no time-data issues found.';
  if (resolved || added) return `Review refreshed — ${resolved ? `${resolved} issue${resolved === 1 ? '' : 's'} resolved` : ''}${resolved && added ? ' and ' : ''}${added ? `${added} new issue${added === 1 ? '' : 's'} detected` : ''}.`;
  return `Review refreshed — ${remaining} issue${remaining === 1 ? '' : 's'} remain.`;
};
