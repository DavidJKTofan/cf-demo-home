import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

const DEMO_ORIGIN = 'https://automatic-demo.com';
const DEMO_PATH = '/demos/security/client-side-security';
const RATE_LIMIT_SECONDS = 10;
const MAX_REQUEST_BYTES = 128;

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

function readSignalText(html: string): string {
  const match = html.match(/id=["']signal-status["'][^>]*>([\s\S]*?)<\/span>/i);
  return (match?.[1] ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
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
  if (!isRecord(body) || !isScenario(body.scenario) || Object.keys(body).some((key) => key !== 'scenario')) {
    return jsonResponse({ error: 'Choose baseline, changed, or malicious.' }, 400);
  }

  const scenario = body.scenario;
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

  const pageUrl = new URL(DEMO_PATH, DEMO_ORIGIN);
  pageUrl.searchParams.set('pageshieldforcecsp', '');
  pageUrl.searchParams.set('variant', scenario === 'baseline' ? 'baseline' : 'changed');
  pageUrl.searchParams.set('run', crypto.randomUUID());
  if (scenario === 'malicious') pageUrl.searchParams.set('malicious', '1');

  try {
    const browserResponse = await env.BROWSER.quickAction('content', {
      url: pageUrl.toString(),
      gotoOptions: { waitUntil: 'networkidle2', timeout: 30_000 },
      waitForTimeout: 5_000,
      actionTimeout: 15_000,
      cacheTTL: 0,
    });

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
        { error: message, retryAfterSeconds: retryAfter ? Number(retryAfter) : undefined },
        browserResponse.status === 429 ? 429 : 502,
        retryAfter ? { 'Retry-After': retryAfter } : {},
      );
    }

    const payload: unknown = await browserResponse.json();
    if (!isRecord(payload) || payload.success !== true || typeof payload.result !== 'string') {
      return jsonResponse({ error: 'Browser Run returned an incomplete result.' }, 502);
    }

    const meta = isRecord(payload.meta) ? payload.meta : {};
    const responseHeaders = isRecord(meta.headers) ? meta.headers : {};
    const reportOnlyHeader = responseHeaders['content-security-policy-report-only'];
    const html = payload.result;
    const signalText = readSignalText(html);
    const pageStatus = typeof meta.status === 'number' ? meta.status : null;
    const scriptUrlPresent = html.includes('/demos/security/client-side-security-change-test.js');
    const maliciousPayloadRequested = scenario === 'malicious' && html.includes('examples.page-shield.workers.dev/0002.js');
    const expectedSignal = scenario === 'baseline'
      ? signalText.includes('Baseline script loaded')
      : scenario === 'changed'
        ? signalText.includes('Changed script loaded')
        : signalText.includes('Changed script loaded') ||
          signalText.includes('Cloudflare test payload loaded') ||
          signalText.includes('optional Cloudflare test payload did not load');
    const success = pageStatus === 200 && scriptUrlPresent && expectedSignal;
    const browserMsHeader = browserResponse.headers.get('X-Browser-Ms-Used');
    const browserMsUsed = browserMsHeader && Number.isFinite(Number(browserMsHeader))
      ? Number(browserMsHeader)
      : null;

    return jsonResponse({
      success,
      scenario,
      pageStatus,
      title: typeof meta.title === 'string' ? meta.title : 'Client-Side Security',
      signalText,
      scriptUrlPresent,
      reportOnlyHeaderPresent: typeof reportOnlyHeader === 'string' && reportOnlyHeader.length > 0,
      maliciousPayloadRequested,
      maliciousPayloadLoaded: signalText.includes('Cloudflare test payload loaded'),
      browserMsUsed,
    }, success ? 200 : 502);
  } catch (error) {
    console.error('Client-Side Security Browser Run failed', {
      scenario,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return jsonResponse({ error: 'Browser Run is temporarily unavailable. Try again shortly.' }, 502);
  }
};
