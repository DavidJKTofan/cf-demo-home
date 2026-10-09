import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { transform } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

test('persistent runs isolate scanner-visible publication and reject unauthorized changes', async () => {
  const source = await readFile(new URL('../src/lib/client-side-security/run-state.ts', import.meta.url), 'utf8');
  const { code } = await transform(source, { loader: 'ts', format: 'esm' });
  const script = `${code}
export default { async fetch(request, env) {
  const url = new URL(request.url);
  const run = env.RUNS.getByName(url.searchParams.get('run'));
  const token = request.headers.get('X-Control-Token') ?? '';
  if (request.method === 'POST') await run.create(token);
  if (request.method === 'PUT') {
    if (!await run.authorize(token)) return new Response('Forbidden', { status: 403 });
    await run.publishChanged();
  }
  return Response.json({phase: await run.phase()});
}};`;
  const mf = new Miniflare(convertV4MiniflareOptions({
    workers: [{
      name: 'test', modules: true, script, compatibilityDate: '2026-10-01', compatibilityFlags: ['nodejs_compat'],
      durableObjects: { RUNS: { className: 'ClientSideSecurityRun', useSQLite: true } },
    }],
  }));
  const request = (run, method = 'GET', token = 'owner-token', headers = {}) => mf.dispatchFetch(`http://demo.test/?run=${run}`, {
    method, headers: { 'X-Control-Token': token, ...headers },
  });
  try {
    assert.equal((await (await request('missing')).json()).phase, null);
    assert.equal((await (await request('first', 'POST')).json()).phase, 'baseline');
    assert.equal((await (await request('second', 'POST')).json()).phase, 'baseline');
    assert.equal((await request('first', 'PUT', 'wrong-token')).status, 403);
    assert.equal((await (await request('first')).json()).phase, 'baseline');
    assert.equal((await (await request('first', 'PUT')).json()).phase, 'changed');
    // Scanner requests lack Referer; browser requests can carry an arbitrary one.
    assert.equal((await (await request('first')).json()).phase, 'changed');
    assert.equal((await (await request('first', 'GET', '', { Referer: 'https://elsewhere.invalid/?variant=baseline' })).json()).phase, 'changed');
    assert.equal((await (await request('second')).json()).phase, 'baseline');
    assert.equal((await (await request('first', 'PUT')).json()).phase, 'changed');
    assert.equal((await request('missing', 'PUT')).status, 403);
  } finally {
    await mf.dispose();
  }
});
