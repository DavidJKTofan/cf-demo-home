// Supplement native reports only when the configured Cloudflare endpoint is same-origin.
// Cross-origin collectors and opaque sandbox frames require native CSP transport, not fetch.
export const CSP_REPORTER_SCRIPT = `(() => {
  const sent = new Set();
  document.addEventListener('securitypolicyviolation', (event) => {
    if (!/^https?:/.test(event.blockedURI)) return;
    let resource;
    try { resource = new URL(event.blockedURI); } catch { return; }
    if (resource.hostname === 'csp-reporting.cloudflare.com' ||
        (resource.hostname === location.hostname && resource.pathname.startsWith('/cdn-cgi/'))) return;
    const source = event.originalPolicy.match(/(?:^|;)\\s*report-uri\\s+([^;\\s]+)/i)?.[1];
    if (!source) return;
    let target;
    try {
      target = new URL(source, location.href);
      if (target.protocol !== 'https:' ||
          !['csp-reporting.cloudflare.com', location.hostname].includes(target.hostname) ||
          !/^\\/cdn-cgi\\/script[_-]monitor\\/report$/.test(target.pathname)) return;
    } catch { return; }
    if (target.origin !== globalThis.origin) {
      document.documentElement.dataset.cspReportDelivery ??= 'native-only';
      return;
    }
    const key = target.href + event.effectiveDirective + event.blockedURI;
    if (sent.has(key)) return;
    sent.add(key);
    fetch(target.href, {
      method: 'POST', mode: 'same-origin', credentials: 'same-origin', keepalive: true,
      headers: { 'Content-Type': 'application/csp-report' },
      body: JSON.stringify({ 'csp-report': {
        'blocked-uri': event.blockedURI, 'document-uri': event.documentURI,
        'effective-directive': event.effectiveDirective, 'violated-directive': event.violatedDirective,
        'original-policy': event.originalPolicy, 'disposition': event.disposition,
        'referrer': event.referrer, 'status-code': event.statusCode,
      } }),
    }).then((response) => {
      document.documentElement.dataset.cspReportDelivery = response.ok ? 'accepted' : 'rejected';
    }).catch(() => {
      document.documentElement.dataset.cspReportDelivery = 'unconfirmed';
    });
  });
})();`;
