import { CSP_REPORTER_SCRIPT } from './csp-reporter';

export const createSandboxDocument = (): Response => new Response(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Isolated skimmer test fixture</title>
<script>${CSP_REPORTER_SCRIPT}</script>
<style>body{font:14px system-ui;margin:16px;color:#263238}input{width:150px}p{margin:8px 0}</style></head>
<body><strong>Sandboxed skimmer fixture</strong><p>Read-only synthetic checkout; external exfiltration is blocked.</p>
<input aria-label="Synthetic card number" name="payment[cc_number]" value="0000000000000000" readonly>
<input aria-label="Synthetic security code" name="payment[cc_cid]" value="000" readonly>
<button class="button" type="button">Simulate checkout with fake data</button><p id="fixture-status">Loading fixture…</p>
<script>
const fixture = document.createElement('script');
fixture.src = '/_astro/client-side-security/skimmer-test.js';
fixture.crossOrigin = 'anonymous';
fixture.onload = () => {
  document.querySelector('#fixture-status').textContent = 'Fixture loaded. Outbound access is restricted by CSP.';
  parent.postMessage({type:'client-side-security-sample',state:'loaded'}, '*');
};
fixture.onerror = () => parent.postMessage({type:'client-side-security-sample',state:'error'}, '*');
document.head.appendChild(fixture);
document.addEventListener('securitypolicyviolation', (event) => {
  if (event.disposition === 'enforce' && event.effectiveDirective === 'connect-src') {
    // Cloudflare-injected scripts can also violate this restrictive CSP.
    // Only the pinned fixture's exfiltration targets establish this signal.
    try {
      if (['www.tarrianalee.co.uk', '89.32.251.136'].includes(new URL(event.blockedURI).hostname)) {
        document.querySelector('#fixture-status').textContent = 'Skimmer outbound request blocked by the sandbox CSP.';
      }
    } catch { /* Inline or non-URL violations. */ }
  }
});
</script></body></html>`, {
  headers: {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline' https://automatic-demo.com; style-src 'unsafe-inline'; connect-src https://csp-reporting.cloudflare.com; img-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors https://automatic-demo.com",
    'X-Content-Type-Options': 'nosniff',
  },
});
