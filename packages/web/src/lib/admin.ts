const adminUids = (process.env.ADMIN_UIDS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export function isAdmin(uid: string): boolean {
  return adminUids.includes(uid);
}
