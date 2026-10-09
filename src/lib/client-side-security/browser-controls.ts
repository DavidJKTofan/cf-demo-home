import { readBrowserRunResponse } from './browser-response';

interface Run {
  runId: string;
  controlToken: string;
  phase: 'baseline' | 'changed';
}

function isRun(value: unknown): value is Run {
  if (typeof value !== 'object' || value === null) return false;
  return 'runId' in value && typeof value.runId === 'string' && /^[a-f0-9]{32}$/.test(value.runId) &&
    'controlToken' in value && typeof value.controlToken === 'string' && /^[a-f0-9-]{36}$/.test(value.controlToken) &&
    'phase' in value && (value.phase === 'baseline' || value.phase === 'changed');
}

export function initializeBrowserControls(): void {
  const start = document.querySelector<HTMLButtonElement>('#browser-run-start');
  const change = document.querySelector<HTMLButtonElement>('#browser-run-change');
  const sample = document.querySelector<HTMLButtonElement>('#browser-run-sample');
  const includeSample = document.querySelector<HTMLInputElement>('#include-malicious-sample');
  const recorded = document.querySelector<HTMLInputElement>('#baseline-recorded');
  const status = document.querySelector<HTMLElement>('#browser-run-status');
  const results = document.querySelector<HTMLOListElement>('#browser-run-results');
  const pageLink = document.querySelector<HTMLAnchorElement>('#browser-run-page');
  const scriptLink = document.querySelector<HTMLAnchorElement>('#browser-run-script');
  if (!start || !change || !sample || !includeSample || !recorded || !status || !results || !pageLink || !scriptLink) return;
  const controls = { start, change, sample, includeSample, recorded, status, results, pageLink, scriptLink };
  const storageKey = 'client-side-security-run';
  let run: Run | null = null;
  let busy = false;
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null');
    if (isRun(saved)) run = saved;
  } catch { /* Optional browser persistence. */ }

  function refresh(): void {
    controls.start.disabled = busy;
    controls.change.disabled = busy || !run || (!controls.recorded.checked && run.phase !== 'changed');
    controls.sample.disabled = busy || !run;
    controls.recorded.disabled = busy || !run;
    controls.pageLink.hidden = controls.scriptLink.hidden = !run;
    if (run) {
      controls.pageLink.href = `/demos/security/client-side-security?pageshieldforcecsp&run=${run.runId}`;
      controls.scriptLink.href = `/demos/security/client-side-security-change-test.js?run=${run.runId}`;
    }
  }

  const wait = (duration: number) => new Promise<void>((resolve) => window.setTimeout(resolve, duration));
  async function runScenario(scenario: 'baseline' | 'changed' | 'malicious'): Promise<void> {
    const response = await fetch('/api/client-side-security/browser-run', {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scenario === 'baseline' ? { scenario } : { scenario, runId: run?.runId, controlToken: run?.controlToken }),
    });
    const data = await readBrowserRunResponse(response);
    if (isRun(data)) {
      run = { runId: data.runId, controlToken: data.controlToken, phase: data.phase };
      try { sessionStorage.setItem(storageKey, JSON.stringify(run)); } catch { /* Optional browser persistence. */ }
    }
    if (!('success' in data) || !data.success || !response.ok) {
      throw new Error('error' in data && typeof data.error === 'string' ? data.error : `Browser Run failed (${response.status}). Inspect this run before retrying.`);
    }
    const label = scenario === 'baseline' ? 'Baseline collected' : scenario === 'changed' ? 'Changed code published' : 'Hosted skimmer fixture';
    const header = 'scriptMonitoringHeaderPresent' in data && data.scriptMonitoringHeaderPresent ? 'Script-reporting CSP detected' : 'Script-reporting CSP not seen';
    const signal = 'signalText' in data && typeof data.signalText === 'string' ? data.signalText : 'Page loaded';
    const delivery = 'explicitReportDelivery' in data
      ? data.explicitReportDelivery === 'native-only'
        ? 'Native CSP reporting only; delivery unverified'
        : `Report forwarding: ${data.explicitReportDelivery}`
      : '';
    const sampleStatus = scenario === 'malicious' && 'sampleSignalText' in data ? String(data.sampleSignalText) : '';
    const item = document.createElement('li');
    item.className = 'browser-run-result';
    if (!('scriptMonitoringHeaderPresent' in data) || !data.scriptMonitoringHeaderPresent) item.dataset.state = 'warning';
    const summary = document.createElement('div');
    const heading = document.createElement('strong');
    heading.textContent = `${label} · four browser visits`;
    const description = document.createElement('span');
    description.textContent = [signal, sampleStatus, header, delivery].filter(Boolean).join(' · ');
    summary.appendChild(heading);
    summary.appendChild(description);
    item.appendChild(summary);
    controls.results.appendChild(item);
  }

  async function execute(scenario: 'baseline' | 'changed' | 'malicious'): Promise<void> {
    if (busy) return;
    if (location.origin !== 'https://automatic-demo.com') {
      controls.status.textContent = 'Browser Run controls are available on automatic-demo.com.';
      return;
    }
    busy = true;
    refresh();
    if (scenario === 'baseline') { controls.results.replaceChildren(); controls.recorded.checked = false; }
    const button = scenario === 'baseline' ? controls.start : scenario === 'changed' ? controls.change : controls.sample;
    button.setAttribute('aria-busy', 'true');
    try {
      controls.status.textContent = `Running ${scenario}: four managed Chrome visits…`;
      await runScenario(scenario);
      if (scenario === 'changed' && controls.includeSample.checked) {
        controls.status.textContent = 'Changed code published. Waiting 11 seconds before loading the fixture…';
        await wait(11_000);
        await runScenario('malicious');
      }
      controls.status.textContent = scenario === 'baseline'
        ? 'Baseline collected. Open this run and confirm a fetched baseline version in Cloudflare before publishing.'
        : 'Browser visits complete. Verify recorded versions, classification, and notification history in Cloudflare.';
    } catch (error) {
      controls.status.textContent = error instanceof Error ? error.message : 'Browser Run failed.';
    } finally {
      button.removeAttribute('aria-busy');
      await wait(11_000);
      busy = false;
      refresh();
    }
  }
  controls.start.addEventListener('click', () => { void execute('baseline'); });
  controls.change.addEventListener('click', () => { void execute('changed'); });
  controls.sample.addEventListener('click', () => { void execute('malicious'); });
  controls.recorded.addEventListener('change', refresh);
  refresh();
}
