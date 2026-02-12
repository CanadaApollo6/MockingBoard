/// <reference types="vitest/globals" />
import { vi } from 'vitest';

// Mock server-only imports so the pure function can be tested
vi.mock('server-only', () => ({}));
vi.mock('./firebase-admin', () => ({ adminDb: {} }));

import { isUserInDraft } from './user-resolve.js';
import type { Draft } from '@mockingboard/shared';

function makeDraft(participants: Record<string, string>): Draft {
  return { participants } as Draft;
}

describe('isUserInDraft', () => {
  it('matches sessionUid in participants keys (new web drafts)', () => {
    const draft = makeDraft({ 'doc-123': 'discord-456' });
    expect(isUserInDraft(draft, 'doc-123')).toBe(true);
  });

  it('matches sessionUid in participants values (legacy web drafts)', () => {
    const draft = makeDraft({ 'discord-456': 'discord-456' });
    expect(isUserInDraft(draft, 'discord-456')).toBe(true);
  });

  it('matches discordId in participants keys (legacy web drafts)', () => {
    const draft = makeDraft({ 'discord-456': 'discord-456' });
    expect(isUserInDraft(draft, 'doc-123', 'discord-456')).toBe(true);
  });

  it('matches discordId in participants values (bot drafts)', () => {
    const draft = makeDraft({ 'doc-123': 'discord-456' });
    expect(isUserInDraft(draft, 'other-uid', 'discord-456')).toBe(true);
  });

  it('returns false when neither ID matches', () => {
    const draft = makeDraft({ 'doc-123': 'discord-456' });
    expect(isUserInDraft(draft, 'unknown', 'also-unknown')).toBe(false);
  });

  it('returns false when no discordId provided and sessionUid does not match', () => {
    const draft = makeDraft({ 'doc-123': 'discord-456' });
    expect(isUserInDraft(draft, 'unknown')).toBe(false);
  });

  it('handles empty participants', () => {
    const draft = makeDraft({});
    expect(isUserInDraft(draft, 'doc-123', 'discord-456')).toBe(false);
  });

  it('handles multiple participants', () => {
    const draft = makeDraft({
      'doc-1': 'discord-1',
      'doc-2': 'discord-2',
      'doc-3': 'discord-3',
    });
    expect(isUserInDraft(draft, 'doc-2')).toBe(true);
    expect(isUserInDraft(draft, 'other', 'discord-3')).toBe(true);
    expect(isUserInDraft(draft, 'other', 'discord-99')).toBe(false);
  });
});
