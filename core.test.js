import test from 'node:test';
import assert from 'node:assert/strict';
import { numberLines, chunks, validate, csv, callOpenAI, extract } from './core.js';
const text = 'Maya: I will email the report Friday.\r\nLeo: No purchase approved.';
const valid = { task: 'Email report', owner: 'Maya', deadline: 'Friday', evidence: [{ line: 1, quote: 'Maya: I will email the report Friday.' }] };
test('exact evidence still requires semantic review', () => {
  assert.equal(validate([valid], numberLines(text))[0].status, 'needs_review');
});
test('fabricated quote, out-of-range citation and invented deadline are rejected', () => {
  for (const item of [{ ...valid, deadline: 'Monday' }, { ...valid, evidence: [{ line: 99, quote: 'approved' }] }, { ...valid, evidence: [{ line: 1, quote: 'Buy appliances' }] }]) assert.equal(validate([item], numberLines(text))[0].status, 'rejected');
});
test('absent owner and deadline are flagged', () => {
  const item = validate([{ ...valid, owner: null, deadline: null }], numberLines(text))[0];
  assert.ok(item.flags.includes('Owner unspecified'));
});
test('overlapping chunks preserve all original line IDs', () => {
  const lines = numberLines(Array.from({ length: 210 }, (_, i) => `line ${i}`).join('\n'));
  const parts = chunks(lines);
  assert.equal(parts[1][0].line, 71);
  assert.equal(new Set(parts.flat().map(l => l.line)).size, 210);
  assert.throws(() => chunks(lines, 10, 10));
});
test('CSV escapes quotes and prevents spreadsheet formula execution', () => {
  const result = csv([{ ...valid, task: '=HYPERLINK("bad")', flags: [], status: 'needs_review' }]);
  assert.ok(result.includes("'=HYPERLINK"));
  assert.ok(result.includes('""bad""'));
});
test('provider sends OpenAI API request and retries transient errors', async () => {
  let calls = 0;
  const items = await callOpenAI(numberLines(text), { key: 'test-only', model: 'test-model', sleep: async () => {}, fetcher: async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    assert.equal(options.headers.Authorization, 'Bearer test-only');
    assert.equal(JSON.parse(options.body).model, 'test-model');
    if (++calls === 1) return new Response('', { status: 429 });
    return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ items: [valid] }) }] }] });
  } });
  assert.equal(calls, 2); assert.deepEqual(items, [valid]);
});
test('truncated output and permanent API errors fail closed', async () => {
  for (const response of [new Response('', { status: 401 }), Response.json({ status: 'incomplete', output: [] }), Response.json({ status: 'completed', output: [{ content: [{ type: 'output_text', text: 'not json' }] }] })]) {
    await assert.rejects(callOpenAI([], { key: 'fake', model: 'fake', fetcher: async () => response }));
  }
});
test('empty input and malformed model schemas fail closed', async () => {
  await assert.rejects(extract('  ', {}));
  assert.throws(() => validate('bad', []));
  assert.equal(validate([null], [])[0].status, 'rejected');
});
