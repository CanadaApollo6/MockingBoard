/**
 * Get the public origin from a request, respecting reverse proxy headers.
 * Firebase App Hosting runs behind a proxy, so request.url shows the
 * internal Cloud Run address (e.g. https://0.0.0.0:8080). The real
 * origin comes from x-forwarded-host / x-forwarded-proto headers.
 */
export function getOrigin(request: Request): string {
  const forwardedHost = request.headers.get('x-forwarded-host');
  if (forwardedHost) {
    const proto = request.headers.get('x-forwarded-proto') ?? 'https';
    return `${proto}://${forwardedHost}`;
  }

  const host = request.headers.get('host');
  if (host && !host.startsWith('0.0.0.0')) {
    return `https://${host}`;
  }

  return new URL(request.url).origin;
}
