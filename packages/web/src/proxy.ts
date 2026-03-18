import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(_request: NextRequest) {
  const response = NextResponse.next();

  // Allow cross-origin iframing for overlay and embed routes
  response.headers.delete('X-Frame-Options');
  response.headers.set('Content-Security-Policy', 'frame-ancestors *;');

  return response;
}

export const config = {
  matcher: ['/overlay/:path*', '/embed/:path*'],
};
