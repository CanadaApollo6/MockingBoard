export type OverlayTheme = 'dark' | 'light' | 'transparent';

export function parseOverlayTheme(
  param: string | undefined | null,
): OverlayTheme {
  if (param === 'light' || param === 'dark' || param === 'transparent')
    return param;
  return 'dark';
}

/** Whether the given pathname should render without the AppShell (sidebar, nav, mobile bar). */
export function isBare(pathname: string, isAuthenticated: boolean): boolean {
  if (pathname === '/') return !isAuthenticated;
  if (pathname.startsWith('/auth')) return true;
  if (pathname.startsWith('/overlay')) return true;
  if (pathname.startsWith('/embed')) return true;
  if (pathname.includes('/spectate')) return true;
  return false;
}
