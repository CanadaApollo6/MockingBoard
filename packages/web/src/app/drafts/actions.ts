'use server';

import { getSessionUser } from '@/lib/firebase/auth-session';
import { resolveUser } from '@/lib/user-resolve';
import { getUserDraftsPaginated } from '@/lib/firebase/data';
import type { Draft } from '@mockingboard/shared';

const PAGE_SIZE = 20;

export async function loadMoreDrafts(input: {
  afterSeconds: number;
}): Promise<{ drafts: Draft[]; hasMore: boolean }> {
  const session = await getSessionUser();
  if (!session) return { drafts: [], hasMore: false };

  const user = await resolveUser(session.uid);
  return getUserDraftsPaginated(session.uid, user?.discordId, {
    limit: PAGE_SIZE,
    afterSeconds: input.afterSeconds,
  });
}
