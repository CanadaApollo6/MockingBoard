export function isAdmin(uid: string): boolean {
  const uids = process.env.ADMIN_UIDS?.split(',').map((s) => s.trim()) ?? [];
  return uids.includes(uid);
}
