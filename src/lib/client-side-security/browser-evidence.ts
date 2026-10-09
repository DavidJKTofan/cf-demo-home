function readStatusText(html: string, id: 'signal-status' | 'sample-status'): string {
  const match = html.match(new RegExp(`<span\\b[^>]*\\bid=["']${id}["'][^>]*>([\\s\\S]*?)<\\/span>`, 'i'));
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

function usesCloudflareReporter(policy: string): boolean {
  const sources = policy.match(/(?:^|;)\s*report-uri\s+([^;]+)/i)?.[1].trim().split(/\s+/) ?? [];
  return sources.some((source) => {
    try {
      const url = new URL(source, 'https://automatic-demo.com');
      return url.protocol === 'https:' &&
        (url.hostname === 'csp-reporting.cloudflare.com' || url.hostname === 'automatic-demo.com') &&
        /^\/cdn-cgi\/script[_-]monitor\/report$/.test(url.pathname);
    } catch {
      return false;
    }
  });
}

export function readBrowserEvidence(html: string, headers: Record<string, unknown>) {
  const policies = Object.entries(headers)
    .filter(([name]) => name.toLowerCase() === 'content-security-policy-report-only')
    .flatMap(([, value]) => typeof value === 'string' ? [value] : Array.isArray(value) ? value : [])
    .filter((value): value is string => typeof value === 'string')
    // Browser Run joins repeated response headers with newlines; Fetch uses commas.
    .flatMap((value) => value.split(/[,\r\n]+/))
    .map((value) => value.trim())
    .filter(Boolean);
  const reportingPolicies = policies.filter(usesCloudflareReporter);
  // The sampled monitoring policy has no allowed external script sources.
  // A connection-only Log rule also adds a report-only header, but does not inventory scripts.
  const scriptMonitoringHeaderPresent = reportingPolicies.some((policy) => {
    const sources = policy.match(/(?:^|;)\s*script-src\s+([^;]+)/i)?.[1].trim().split(/\s+/) ?? [];
    return sources.length > 0 && sources.every((source) => /^'(?:none|unsafe-inline|unsafe-eval)'$/i.test(source));
  });

  const sampleSignalText = readStatusText(html, 'sample-status');
  return {
    signalText: readStatusText(html, 'signal-status'),
    sampleSignalText,
    scriptUrlPresent: /<script\b[^>]*\bsrc=["']\/demos\/security\/client-side-security-change-test\.js(?:\?run=[a-f0-9]{32})?["']/i.test(html),
    reportOnlyHeaderPresent: policies.length > 0,
    scriptMonitoringHeaderPresent,
    connectionReportingHeaderPresent: reportingPolicies.some((policy) => /(?:^|;)\s*connect-src\s+/i.test(policy)),
    maliciousPayloadRequested: /<iframe\b[^>]*\bsrc=["']\/_astro\/client-side-security\/sample["']/i.test(html),
    maliciousPayloadLoaded: sampleSignalText.startsWith('Hosted skimmer sample loaded'),
    maliciousPayloadLoadFailed: sampleSignalText.startsWith('The hosted skimmer sample did not load'),
    explicitReportDelivery: html.match(/<html\b[^>]*\bdata-csp-report-delivery=["'](accepted|rejected|unconfirmed|native-only)["']/i)?.[1] ?? 'not-observed',
  };
}
