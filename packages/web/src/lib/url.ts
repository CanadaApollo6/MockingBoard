/**
 * Get the public origin for building redirect URLs.
 * Firebase App Hosting runs behind a proxy where request.url shows the
 * internal Cloud Run address (e.g. https://0.0.0.0:8080). We use APP_URL
 * env var as the authoritative source, with header-based detection as fallback.
 */
export function getOrigin(request: Request): string {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, '');
  }

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
