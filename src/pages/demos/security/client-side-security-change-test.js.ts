import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { baselineScript, changedScript, RUN_ID_PATTERN } from '../../../lib/client-side-security/script-versions';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const runId = new URL(request.url).searchParams.get('run');
  if (runId && !RUN_ID_PATTERN.test(runId)) return new Response('Invalid run.', { status: 400 });
  const phase = runId ? await env.CLIENT_SIDE_SECURITY_RUNS.getByName(runId).phase() : 'baseline';
  if (!phase) return new Response('Run not found or expired.', { status: 404 });
  return new Response(phase === 'changed' ? changedScript : baselineScript, {
    headers: {
      'Cache-Control': 'no-store',
      'CDN-Cache-Control': 'no-store',
      'Content-Type': 'application/javascript; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Access-Control-Allow-Origin': '*',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'X-Demo-Script-Version': phase,
    },
  });
};
