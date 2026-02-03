'use server';

import { getSessionUser } from '@/lib/auth-session';
import { resolveUser } from '@/lib/user-resolve';
import { getDraftsPaginated, getUserDraftsPaginated } from '@/lib/data';
import type { Draft } from '@mockingboard/shared';

const PAGE_SIZE = 20;

export async function loadMoreDrafts(input: {
  tab: 'all' | 'mine';
  afterSeconds: number;
}): Promise<{ drafts: Draft[]; hasMore: boolean }> {
  if (input.tab === 'mine') {
    const session = await getSessionUser();
    if (!session) return { drafts: [], hasMore: false };

    const user = await resolveUser(session.uid);
    return getUserDraftsPaginated(session.uid, user?.discordId, {
      limit: PAGE_SIZE,
      afterSeconds: input.afterSeconds,
    });
  }

  return getDraftsPaginated({
    limit: PAGE_SIZE,
    afterSeconds: input.afterSeconds,
    excludePrivate: true,
  });
}
