import server from '@astrojs/cloudflare/entrypoints/server';
import { createSandboxDocument } from './lib/client-side-security/sandbox-document';

export { ClientSideSecurityRun } from './lib/client-side-security/run-state';
export default {
  fetch(request: Request, env: Env, context: ExecutionContext) {
    const path = new URL(request.url).pathname;
    // Astro reserves /_astro/. Serve this isolated document directly under the
    // zone's existing asset exclusion so Browser Run needs no challenge cookies.
    if (path === '/_astro/client-side-security/sample' || path === '/_astro/client-side-security/sample/') {
      if (request.method !== 'GET') return new Response('Method not allowed.', { status: 405, headers: { Allow: 'GET' } });
      return createSandboxDocument();
    }
    return server.fetch(request, env, context);
  },
} satisfies ExportedHandler<Env>;
