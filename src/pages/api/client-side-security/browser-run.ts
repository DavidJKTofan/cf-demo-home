import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { readBrowserEvidence } from '../../../lib/client-side-security/browser-evidence';
import { RUN_ID_PATTERN, CONTROL_TOKEN_PATTERN } from '../../../lib/client-side-security/script-versions';

export const prerender = false;

const DEMO_ORIGIN = 'https://automatic-demo.com';
const DEMO_PATH = '/demos/security/client-side-security';
const RATE_LIMIT_SECONDS = 10;
const MAX_REQUEST_BYTES = 256;

type Scenario = 'baseline' | 'changed' | 'malicious';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isScenario(value: unknown): value is Scenario {
  return value === 'baseline' || value === 'changed' || value === 'malicious';
}

type JsonBodyResult =
  | { kind: 'ok'; value: unknown }
  | { kind: 'too-large' }
  | { kind: 'invalid' };

async function readSmallJsonBody(request: Request): Promise<JsonBodyResult> {
  const contentLength = Number(request.headers.get('Content-Length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return { kind: 'too-large' };
  }

  const reader = request.body?.getReader();
  if (!reader) return { kind: 'invalid' };

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_REQUEST_BYTES) {
        await reader.cancel().catch(() => undefined);
        return { kind: 'too-large' };
      }

      chunks.push(value);
    }

    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }

    return { kind: 'ok', value: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) };
  } catch {
    return { kind: 'invalid' };
  }
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
  additionalHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
      ...additionalHeaders,
    },
  });
}

export const POST: APIRoute = async ({ request }) => {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get('Origin');
  const fetchSite = request.headers.get('Sec-Fetch-Site');

  if (requestUrl.origin !== DEMO_ORIGIN || origin !== DEMO_ORIGIN || (fetchSite && fetchSite !== 'same-origin')) {
    return jsonResponse({ error: 'Run requests must come from the Client-Side Security demo.' }, 403);
  }

  const contentType = request.headers.get('Content-Type')?.split(';', 1)[0].trim().toLowerCase();
  if (contentType !== 'application/json') {
    return jsonResponse({ error: 'Send a JSON scenario.' }, 415);
  }

  const bodyResult = await readSmallJsonBody(request);
  if (bodyResult.kind === 'too-large') {
    return jsonResponse({ error: 'The request is too large.' }, 413);
  }
  if (bodyResult.kind === 'invalid') {
    return jsonResponse({ error: 'The request body must be valid JSON.' }, 400);
  }

  const body = bodyResult.value;
  if (!isRecord(body) || !isScenario(body.scenario) ||
      Object.keys(body).some((key) => !['scenario', 'runId', 'controlToken'].includes(key))) {
    return jsonResponse({ error: 'Choose baseline, changed, or malicious.' }, 400);
  }

  const scenario = body.scenario;
  if (scenario !== 'baseline' &&
      (typeof body.runId !== 'string' || !RUN_ID_PATTERN.test(body.runId) ||
       typeof body.controlToken !== 'string' || !CONTROL_TOKEN_PATTERN.test(body.controlToken))) {
    return jsonResponse({ error: 'Start a baseline run first.' }, 400);
  }
  if (scenario === 'baseline' && (body.runId !== undefined || body.controlToken !== undefined)) {
    return jsonResponse({ error: 'A new baseline creates a new isolated run.' }, 400);
  }
  const runId = scenario === 'baseline' ? crypto.randomUUID().replaceAll('-', '') : String(body.runId);
  const controlToken = scenario === 'baseline' ? crypto.randomUUID() : String(body.controlToken);
  let phase: 'baseline' | 'changed' | null = null;
  try {
    const clientIp = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const rateLimit = await env.BROWSER_RUN_LIMITER.limit({
      key: `client-side-security:${clientIp}`,
    });

    if (!rateLimit.success) {
      return jsonResponse(
        { error: 'Please wait a few seconds before the next Browser Run.', retryAfterSeconds: RATE_LIMIT_SECONDS },
        429,
        { 'Retry-After': String(RATE_LIMIT_SECONDS) },
      );
    }

    const run = env.CLIENT_SIDE_SECURITY_RUNS.getByName(runId);
    if (scenario === 'baseline') await run.create(controlToken);
    else if (!await run.authorize(controlToken)) return jsonResponse({ error: 'Run expired or invalid control token.' }, 403);
    if (scenario === 'changed') await run.publishChanged();
    phase = await run.phase();
    const runDetails = {
      runId, controlToken, phase,
      scriptUrl: `${DEMO_ORIGIN}${DEMO_PATH}-change-test.js?run=${runId}`,
      manualUrl: `${DEMO_ORIGIN}${DEMO_PATH}?pageshieldforcecsp&run=${runId}`,
    };
    const pageUrl = new URL(DEMO_PATH, DEMO_ORIGIN);
    pageUrl.searchParams.set('pageshieldforcecsp', '');
    pageUrl.searchParams.set('run', runId);
    if (scenario === 'malicious') pageUrl.searchParams.set('malicious', '1');

    // Multiple genuine browser visits establish a resource instead of relying on one sampled report.
    let browserResponse: Response | undefined;
    let browserMsUsed = 0;
    for (let visit = 0; visit < 4; visit += 1) {
      browserResponse = await env.BROWSER.quickAction('content', {
        url: pageUrl.toString(), gotoOptions: { waitUntil: 'networkidle2', timeout: 30_000 },
        waitForTimeout: 5_000, actionTimeout: 15_000, cacheTTL: 0,
      });
      const ms = Number(browserResponse.headers.get('X-Browser-Ms-Used'));
      if (Number.isFinite(ms)) browserMsUsed += ms;
      if (!browserResponse.ok) break;
      if (visit < 3) await browserResponse.body?.cancel();
    }
    if (!browserResponse) return jsonResponse({ error: 'Browser Run did not start.' }, 502);

    if (!browserResponse.ok) {
      const retryAfter = browserResponse.headers.get('Retry-After');
      const errorPayload: unknown = await browserResponse.json().catch(() => null);
      const errorMessage = isRecord(errorPayload) && Array.isArray(errorPayload.errors)
        ? errorPayload.errors.find(isRecord)?.message
        : undefined;
      const message = typeof errorMessage === 'string'
        ? errorMessage.slice(0, 240)
        : 'Browser Run could not render the demo page.';

      return jsonResponse(
        { ...runDetails, error: message, retryAfterSeconds: retryAfter ? Number(retryAfter) : undefined },
        browserResponse.status === 429 ? 429 : 502,
        retryAfter ? { 'Retry-After': retryAfter } : {},
      );
    }

    const payload: unknown = await browserResponse.json();
    if (!isRecord(payload) || payload.success !== true || typeof payload.result !== 'string') {
      return jsonResponse({ ...runDetails, error: 'Browser Run returned an incomplete result.' }, 502);
    }

    const meta = isRecord(payload.meta) ? payload.meta : {};
    const responseHeaders = isRecord(meta.headers) ? meta.headers : {};
    const evidence = readBrowserEvidence(payload.result, responseHeaders);
    const pageStatus = typeof meta.status === 'number' ? meta.status : null;
    const expectedSignal = phase === 'baseline'
      ? evidence.signalText.includes('Baseline script loaded')
      : evidence.signalText.includes('Changed script loaded');
    const success = pageStatus === 200 && evidence.scriptUrlPresent && expectedSignal &&
      (scenario !== 'malicious' || evidence.maliciousPayloadLoaded);

    return jsonResponse({
      success,
      ...(!success ? { error: pageStatus !== 200
        ? 'Browser Run could not open the demo page.'
        : !evidence.scriptUrlPresent || !expectedSignal
          ? 'The published test script did not execute. Inspect this run before retrying.'
          : 'The sandboxed fixture did not confirm loading. Open this run to inspect the frame.' } : {}),
      scenario,
      ...runDetails,
      manualUrl: pageUrl.toString(),
      visits: 4,
      pageStatus,
      title: typeof meta.title === 'string' ? meta.title : 'Client-Side Security',
      ...evidence,
      browserMsUsed,
    }, success ? 200 : 502);
  } catch (error) {
    console.error(JSON.stringify({
      message: 'Client-Side Security Browser Run failed',
      scenario,
      error: error instanceof Error ? error.message : 'Unknown error',
    }));
    return jsonResponse({ ...(phase ? { runId, controlToken, phase } : {}), error: 'Browser Run is temporarily unavailable. Try again shortly.' }, 502);
  }
};
