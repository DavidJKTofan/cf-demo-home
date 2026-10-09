import assert from 'node:assert/strict';
import test from 'node:test';
import { POST } from '../src/pages/api/demo-exfil.ts';

const url = 'https://automatic-demo.com/api/demo-exfil';

test('demo connection sink cancels the body without reading or returning submitted data', async () => {
  let canceled = false;
  const body = new ReadableStream({
    pull() { assert.fail('The sink must never read submitted data.'); },
    cancel() { canceled = true; },
  }, { highWaterMark: 0 });
  const request = new Request(url, {
    method: 'POST', body, duplex: 'half',
    headers: { Origin: 'https://automatic-demo.com', 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'same-origin' },
  });
  const response = await POST({ request });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(await response.text(), '');
  assert.equal(canceled, true);
});

test('demo connection sink rejects missing, cross-origin, and cross-site origins', async () => {
  for (const headers of [
    {},
    { Origin: 'https://example.invalid' },
    { Origin: 'https://automatic-demo.com', 'Sec-Fetch-Site': 'cross-site' },
  ]) {
    const response = await POST({ request: new Request(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
    }) });
    assert.equal(response.status, 403);
  }
});

test('demo connection sink requires a JSON content type', async () => {
  const response = await POST({ request: new Request(url, {
    method: 'POST', headers: { Origin: 'https://automatic-demo.com', 'Content-Type': 'text/plain' },
  }) });
  assert.equal(response.status, 415);
});
