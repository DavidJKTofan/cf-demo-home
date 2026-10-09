import type { APIRoute } from 'astro';

export const prerender = false;

const DEMO_ORIGIN = 'https://automatic-demo.com';
const headers = { 'Cache-Control': 'no-store' };

export const POST: APIRoute = async ({ request }) => {
  const fetchSite = request.headers.get('Sec-Fetch-Site');
  if (new URL(request.url).origin !== DEMO_ORIGIN || request.headers.get('Origin') !== DEMO_ORIGIN ||
      (fetchSite && fetchSite !== 'same-origin')) {
    return Response.json({ error: 'Demo requests must be same-origin.' }, { status: 403, headers });
  }

  const contentType = request.headers.get('Content-Type')?.split(';', 1)[0].trim().toLowerCase();
  if (contentType !== 'application/json') {
    return Response.json({ error: 'Send JSON demo metadata.' }, { status: 415, headers });
  }

  // This is only a browser connection signal. Never read, log, or retain the body.
  await request.body?.cancel();
  return new Response(null, { status: 204, headers });
};
