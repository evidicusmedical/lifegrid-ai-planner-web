import { performance } from 'node:perf_hooks';
const fixtures = [['small', 100], ['medium', 1000], ['large', 10000]];
for (const [name, count] of fixtures) {
  const events = Array.from({ length: count }, (_, i) => ({ id: String(i), date: `2026-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`, displayPriority: i % 5 }));
  const start = performance.now();
  const index = new Map();
  for (const event of events) { const bucket = index.get(event.date) ?? []; bucket.push(event); index.set(event.date, bucket); }
  for (const bucket of index.values()) bucket.sort((a, b) => a.displayPriority - b.displayPriority);
  const days = Array.from({ length: 365 }, (_, i) => i);
  console.log(`Grid model derivation (${name}, ${count} events): ${(performance.now() - start).toFixed(2)} ms; ${index.size} date buckets; ${days.length} displayed days`);
}
