import assert from 'node:assert/strict';
import test from 'node:test';
import { unstable_dev } from 'wrangler';

test('built Worker serves dynamic API, scanner script, and sandbox ahead of assets', async () => {
  const worker = await unstable_dev('dist/server/entry.mjs', {
    config: 'dist/server/wrangler.json', local: true, port: 0, persist: false,
    logLevel: 'error',
    experimental: { disableExperimentalWarning: true, disableDevRegistry: true, watch: false, forceLocal: true },
  });
  try {
    const api = await worker.fetch('/api/client-side-security/browser-run', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: 'baseline' }),
    });
    // Local requests are intentionally forbidden, but must reach the JSON API.
    assert.equal(api.status, 403);
    assert.match(api.headers.get('Content-Type'), /application\/json/);
    assert.match((await api.json()).error, /must come from/);

    const sink = await worker.fetch('/api/demo-exfil', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ demo: true, field: 'baseline-recorded', type: 'checkbox', timestamp: Date.now() }),
    });
    assert.equal(sink.status, 403);
    assert.match(sink.headers.get('Content-Type'), /application\/json/);
    assert.match((await sink.json()).error, /same-origin/);

    const script = await worker.fetch('/demos/security/client-side-security-change-test.js');
    assert.equal(script.status, 200);
    assert.equal(script.headers.get('X-Demo-Script-Version'), 'baseline');
    assert.match(script.headers.get('Content-Type'), /application\/javascript/);
    assert.match(await script.text(), /Baseline script loaded/);

    const missing = await worker.fetch(`/demos/security/client-side-security-change-test.js?run=${'f'.repeat(32)}`);
    assert.equal(missing.status, 404);
    assert.equal(await missing.text(), 'Run not found or expired.');

    for (const path of ['/_astro/client-side-security/sample', '/_astro/client-side-security/sample/']) {
      const frame = await worker.fetch(path, { headers: { 'Sec-Fetch-Mode': 'navigate' } });
      assert.equal(frame.status, 200);
      assert.match(frame.headers.get('Content-Security-Policy'), /default-src 'none'/);
      assert.match(await frame.text(), /Isolated skimmer test fixture/);
    }

    const fixture = await worker.fetch('/_astro/client-side-security/skimmer-test.js', {
      headers: { Origin: 'null' },
    });
    assert.equal(fixture.status, 200);
    assert.match(fixture.headers.get('Content-Type'), /application\/javascript/);
    assert.equal(fixture.headers.get('Access-Control-Allow-Origin'), '*');
    assert.equal(fixture.headers.get('Cache-Control'), 'no-store');

    assert.equal((await worker.fetch('/')).status, 200);
    assert.equal((await worker.fetch('/does-not-exist', { headers: { 'Sec-Fetch-Mode': 'navigate' } })).status, 404);
  } finally {
    await worker.stop();
  }
});
