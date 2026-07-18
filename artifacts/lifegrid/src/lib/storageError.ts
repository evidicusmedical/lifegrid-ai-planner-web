/** Returns safe, actionable language without discarding the browser's existing data. */
export const classifyStorageError = (error: unknown): string => {
  const name = error instanceof Error ? error.name : '';
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (name === 'QuotaExceededError' || message.includes('quota')) return 'Storage is full. Your latest change was not saved; download a backup before freeing browser space.';
  if (name === 'SecurityError' || message.includes('access is denied')) return 'Browser storage is unavailable. Your latest change was not saved; check private-browsing or site storage settings.';
  return 'LifeGrid could not save this change locally. Your previous saved data was left intact; download a backup before recovery.';
};
