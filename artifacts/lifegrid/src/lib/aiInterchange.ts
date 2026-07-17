import type { AppData, Category } from '../types';
import { parseAIUpdate, type ParsedUpdate } from './aiPrompt';

export type InterchangeFinding = { code: string; entityType?: string; entityId?: string; operation?: string; field?: string; severity: 'error' | 'warning'; blocking: boolean; message: string };
/** One React-independent entry point for AI JSON routing and parser findings. */
export const parseAiInterchange = (raw: string, categories: Category[], current?: AppData): { version: number | 'legacy'; normalizedPatch: ParsedUpdate | null; findings: InterchangeFinding[]; warnings: string[]; isValid: boolean } => {
  try {
    const parsed = parseAIUpdate(raw, categories, current);
    const match = raw.match(/"lifegridPatchVersion"\s*:\s*(\d+)/);
    return { version: match ? Number(match[1]) : 'legacy', normalizedPatch: parsed, findings: (parsed.warnings ?? []).map(message => ({ code: 'parser-warning', severity: 'warning', blocking: false, message })), warnings: parsed.warnings ?? [], isValid: true };
  } catch (error: any) {
    return { version: 'legacy', normalizedPatch: null, warnings: [], isValid: false, findings: [{ code: 'parse-invalid', severity: 'error', blocking: true, message: error.message }] };
  }
};
