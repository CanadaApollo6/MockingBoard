const adminUids = (process.env.NEXT_PUBLIC_ADMIN_UIDS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export function isAdmin(uid: string): boolean {
  return adminUids.includes(uid);
}
