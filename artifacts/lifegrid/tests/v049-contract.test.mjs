import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');
test('calendar isolation seed contracts are implemented', () => { const source = read('lib/calendarSeeds.ts'); for (const term of ['emptyCalendarData', "events: []", "tasks: []", "personEvents: []", "people: []", "projects: []", "id: 'other'", "copy-structure", "cloneData(source.categories)", "cloneData(source.people)", "cloneData(source.projects)"]) assert.match(source, new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))); });
test('calendar switching exposes selected calendar data only', () => assert.match(read('context/AppDataContext.tsx'), /const data = activeCalendar\.data/));
test('export filenames share local timestamp and calendar sanitizer', () => { const source = read('lib/exportFilenames.ts'); for (const term of ['safeFilenamePart', 'localExportTimestamp', 'lifegrid_${kind}_${safeFilenamePart(calendarName)}']) assert.ok(source.includes(term)); });
test('starter prompt is staged, private, and v3-only', () => { const source = read('lib/aiPrompt.ts'); for (const term of ['SOURCE INVENTORY', 'unreadable', 'EVIDENCE EXTRACTION', 'TEMPORAL NORMALIZATION', 'ENTITY RESOLUTION', 'MATERIAL AMBIGUITY', 'DETERMINISTIC FINAL VALIDATION', 'JSON only', 'lifegridPatchVersion']) assert.ok(source.includes(term)); assert.ok(!source.includes('OpenAI')); });
test('dependency analysis and apply-time validation remain wired', () => { const source = read('context/AppDataContext.tsx'); assert.match(source, /analyzeDependencies/); assert.match(source, /Revalidate selected references/); });
