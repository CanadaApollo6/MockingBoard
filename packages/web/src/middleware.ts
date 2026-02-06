import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function middleware(_request: NextRequest) {
  const response = NextResponse.next();

  // Allow cross-origin iframing for overlay and embed routes
  response.headers.delete('X-Frame-Options');
  response.headers.set('Content-Security-Policy', 'frame-ancestors *;');

  return response;
}

export const config = {
  matcher: ['/overlay/:path*', '/embed/:path*'],
};
