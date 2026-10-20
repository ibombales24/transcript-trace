import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { extract, validate, numberLines, csv } from './core.js';

try {
  const demo = process.argv[2] === '--demo';
  const input = demo ? new URL('./sample.txt', import.meta.url) : process.argv[2];
  if (!input) throw new Error('Usage: node --env-file=.env cli.js transcript.txt [output-directory], or npm run demo');
  const text = await readFile(input, 'utf8');
  const items = demo ? validate([
    { task: 'Request a plumbing quote', owner: 'Leo', deadline: 'Friday', evidence: [{ line: 2, quote: 'Leo: I will request a plumbing quote by Friday.' }] },
    { task: 'Email cleaning checklist to Leo', owner: 'Maya', deadline: 'tomorrow', evidence: [{ line: 4, quote: 'Maya: I will email the cleaning checklist to Leo tomorrow.' }] },
    { task: 'Inspect smoke detectors', owner: null, deadline: null, evidence: [{ line: 5, quote: "We also need to inspect the smoke detectors. We haven't assigned that yet." }] },
    { task: 'Purchase appliances', owner: 'Maya', deadline: 'Monday', evidence: [{ line: 99, quote: 'Purchase approved' }] }
  ], numberLines(text)) : await extract(text, { key: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL || 'gpt-4.1-mini' });
  const out = process.argv[3] ?? 'output';
  await mkdir(out, { recursive: true });
  await writeFile(`${out}/actions.json`, JSON.stringify({ mode: demo ? 'offline-fixture' : 'live-openai', items }, null, 2));
  await writeFile(`${out}/actions.csv`, csv(items));
  console.log(`${demo ? 'OFFLINE FIXTURE (no API call)' : 'LIVE OPENAI'}: ${items.length} candidates; ${items.filter(i => i.status === 'rejected').length} rejected. Saved JSON and CSV to ${out}. All remaining candidates require human review.`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
