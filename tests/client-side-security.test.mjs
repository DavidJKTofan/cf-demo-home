import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { readBrowserEvidence } from '../src/lib/client-side-security/browser-evidence.ts';
import { changedScript } from '../src/lib/client-side-security/script-versions.ts';
import { CSP_REPORTER_SCRIPT } from '../src/lib/client-side-security/csp-reporter.ts';
import { readBrowserRunResponse } from '../src/lib/client-side-security/browser-response.ts';

test('empty and HTML API responses produce actionable HTTP errors instead of JSON parser failures', async () => {
  for (const response of [
    new Response(null, { status: 405 }),
    new Response('<html>Challenge</html>', { status: 403, headers: { 'Content-Type': 'text/html' } }),
    new Response('', { status: 502, headers: { 'Content-Type': 'application/json' } }),
  ]) {
    await assert.rejects(readBrowserRunResponse(response), new RegExp(`empty or non-JSON response \\(HTTP ${response.status}\\)`));
  }
  const response = Response.json({ error: 'Please wait.', retryAfterSeconds: 10 }, { status: 429 });
  assert.deepEqual(await readBrowserRunResponse(response), { error: 'Please wait.', retryAfterSeconds: 10 });
});

const reporter = 'https://csp-reporting.cloudflare.com/cdn-cgi/script_monitor/report?m=test';
const scriptTag = '<script src="/demos/security/client-side-security-change-test.js"></script>';
const sampleTag = '<iframe sandbox="allow-scripts" src="/_astro/client-side-security/sample"></iframe>';

test('a connection-only Cloudflare Log header is not script reporting', () => {
  const evidence = readBrowserEvidence(scriptTag, { 'content-security-policy-report-only': `connect-src 'self'; report-uri ${reporter}` });
  assert.equal(evidence.reportOnlyHeaderPresent, true);
  assert.equal(evidence.connectionReportingHeaderPresent, true);
  assert.equal(evidence.scriptMonitoringHeaderPresent, false);
});

test('recognizes script reporting alongside Log policies and mixed-case headers', () => {
  const monitoring = `script-src 'unsafe-inline' 'unsafe-eval'; connect-src 'none'; report-uri ${reporter}`;
  const log = `connect-src 'self'; report-uri ${reporter}`;
  for (const value of [monitoring, `${log}, ${monitoring}`, `${log}\n${monitoring}`, `${log}\r\n${monitoring}`, [log, monitoring]]) {
    const evidence = readBrowserEvidence(scriptTag, { 'Content-Security-Policy-Report-Only': value });
    assert.equal(evidence.scriptMonitoringHeaderPresent, true);
    assert.equal(evidence.connectionReportingHeaderPresent, true);
  }
});

test('does not equate arbitrary or script-allowlisting policies with complete reporting', () => {
  for (const policy of [
    `script-src 'self'; report-uri ${reporter}`, `script-src *; report-uri ${reporter}`,
    "script-src 'none'; report-uri https://example.com/report",
    "script-src 'none'; report-uri https://example.com/?url=https://csp-reporting.cloudflare.com/cdn-cgi/script_monitor/report",
  ]) assert.equal(readBrowserEvidence(scriptTag, { 'content-security-policy-report-only': policy }).scriptMonitoringHeaderPresent, false);
});

test('URLs in inline source do not confirm an inserted frame', () => {
  const evidence = readBrowserEvidence(`<script>const url='/_astro/client-side-security/sample';</script>`, {});
  assert.equal(evidence.maliciousPayloadRequested, false);
  assert.equal(evidence.maliciousPayloadLoaded, false);
});

const page = await readFile(new URL('../src/pages/demos/security/client-side-security.astro', import.meta.url), 'utf8');
const sampleLoader = [...page.matchAll(/<script is:inline>([\s\S]*?)<\/script>/g)]
  .map(match => match[1]).find(source => source.includes("frame.setAttribute('sandbox'"));

for (const outcome of ['load', 'error']) {
  test(`sample ${outcome} evidence survives a later changed-script completion`, async () => {
    let sample;
    let receiveMessage;
    let finishFetch;
    const elements = {
      '#signal-status': { textContent: '' }, '#sample-status': { textContent: '' },
      '#sample-result': { hidden: true, appendChild: element => { sample = element; } },
    };
    const document = {
      querySelector: selector => elements[selector] ?? { value: undefined },
      createElement: () => ({ style: {}, contentWindow: {}, setAttribute: () => {} }),
    };
    runInNewContext(changedScript, { document, fetch: () => new Promise(resolve => { finishFetch = resolve; }) });
    runInNewContext(sampleLoader, { document, URLSearchParams, window: {
      location: { search: '?malicious=1' }, addEventListener: (_, callback) => { receiveMessage = callback; },
    } });
    receiveMessage({ source: {}, data: { type: 'client-side-security-sample', state: 'loaded' } });
    assert.match(elements['#sample-status'].textContent, /waiting for load confirmation/);
    receiveMessage({ source: sample.contentWindow, data: { type: 'client-side-security-sample', state: outcome === 'load' ? 'loaded' : 'error' } });
    finishFetch();
    await new Promise(resolve => setImmediate(resolve));
    const html = `${scriptTag}${sampleTag}<span id="signal-status">${elements['#signal-status'].textContent}</span>` +
      `<span id="sample-status">${elements['#sample-status'].textContent}</span>`;
    const evidence = readBrowserEvidence(html, {});
    assert.match(evidence.signalText, /^Changed script loaded/);
    assert.equal(evidence.maliciousPayloadRequested, true);
    assert.equal(evidence.maliciousPayloadLoaded, outcome === 'load');
    assert.equal(evidence.maliciousPayloadLoadFailed, outcome === 'error');
    assert.equal(elements['#sample-result'].hidden, false);
  });
}

test('scanner-visible per-run script tags and transport delivery are parsed', () => {
  for (const delivery of ['accepted', 'rejected', 'unconfirmed', 'native-only']) {
    const html = `<html data-csp-report-delivery="${delivery}"><script src="/demos/security/client-side-security-change-test.js?run=${'a'.repeat(32)}"></script></html>`;
    const evidence = readBrowserEvidence(html, {});
    assert.equal(evidence.scriptUrlPresent, true);
    assert.equal(evidence.explicitReportDelivery, delivery);
  }
});

const sameHostReporter = 'https://automatic-demo.com/cdn-cgi/script-monitor/report?m=test';

test('report forwarding only sends actual resource violations to configured same-origin CSP endpoints', async () => {
  let listener;
  const requests = [];
  const document = { documentElement: { dataset: {} }, addEventListener: (_, handler) => { listener = handler; } };
  runInNewContext(CSP_REPORTER_SCRIPT, {
    document, URL, Set, origin: 'https://automatic-demo.com',
    location: { href: 'https://automatic-demo.com/demo', hostname: 'automatic-demo.com' },
    fetch: async (url, init) => { requests.push({ url, init }); return { ok: true }; },
  });
  const event = { originalPolicy: `script-src 'none'; report-uri ${sameHostReporter}`, blockedURI: 'https://automatic-demo.com/test.js', effectiveDirective: 'script-src', documentURI: 'https://automatic-demo.com/demo', disposition: 'report' };
  listener({ ...event, originalPolicy: "script-src 'none'; report-uri https://attacker.invalid/report" });
  listener({ ...event, blockedURI: 'inline' });
  listener({ ...event, blockedURI: 'https://csp-reporting.cloudflare.com/cdn-cgi/script_monitor/report' });
  listener({ ...event, blockedURI: 'https://automatic-demo.com/cdn-cgi/challenge-platform/test' });
  listener(event);
  listener(event);
  // External demo connections under /cdn-cgi/ are real violations, not collector recursion.
  const connection = { ...event, blockedURI: 'https://cf-testing.com/cdn-cgi/trace', effectiveDirective: 'connect-src' };
  listener(connection);
  listener(connection);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(requests.length, 2);
  assert.equal(requests[0].url, sameHostReporter);
  assert.equal(requests[0].init.mode, 'same-origin');
  assert.equal(requests[0].init.credentials, 'same-origin');
  assert.equal(requests[0].init.headers['Content-Type'], 'application/csp-report');
  assert.equal(JSON.parse(requests[0].init.body)['csp-report']['blocked-uri'], event.blockedURI);
  assert.equal(JSON.parse(requests[1].init.body)['csp-report']['blocked-uri'], connection.blockedURI);
  assert.equal(document.documentElement.dataset.cspReportDelivery, 'accepted');
});

test('cross-origin collectors and opaque sandbox origins use native reporting without a CORS fetch', () => {
  for (const [origin, target] of [
    ['https://automatic-demo.com', reporter],
    ['null', reporter],
    ['null', sameHostReporter],
  ]) {
    let listener;
    const document = { documentElement: { dataset: {} }, addEventListener: (_, handler) => { listener = handler; } };
    runInNewContext(CSP_REPORTER_SCRIPT, {
      document, URL, Set, origin,
      location: { href: 'https://automatic-demo.com/demo', hostname: 'automatic-demo.com' },
      fetch: () => assert.fail('Native-only reporting must not issue a cross-origin fetch.'),
    });
    listener({
      originalPolicy: `connect-src 'self'; report-uri ${target}`,
      blockedURI: 'https://cf-testing.com/cdn-cgi/trace', effectiveDirective: 'connect-src',
    });
    assert.equal(document.documentElement.dataset.cspReportDelivery, 'native-only');
  }
});
