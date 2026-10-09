export async function readBrowserRunResponse(response: Response): Promise<Record<string, unknown>> {
  const message = `Browser Run returned an empty or non-JSON response (HTTP ${response.status}). Reload the demo and try again.`;
  if (!response.headers.get('Content-Type')?.toLowerCase().includes('application/json')) {
    throw new Error(message);
  }
  const data: unknown = await response.json().catch(() => null);
  if (typeof data !== 'object' || data === null || Array.isArray(data)) throw new Error(message);
  return data as Record<string, unknown>;
}
