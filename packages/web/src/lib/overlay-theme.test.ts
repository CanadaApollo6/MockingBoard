import { describe, it, expect } from 'vitest';
import { parseOverlayTheme, isBare } from './overlay-theme';

describe('parseOverlayTheme', () => {
  it('returns "dark" for valid dark input', () => {
    expect(parseOverlayTheme('dark')).toBe('dark');
  });

  it('returns "light" for valid light input', () => {
    expect(parseOverlayTheme('light')).toBe('light');
  });

  it('returns "transparent" for valid transparent input', () => {
    expect(parseOverlayTheme('transparent')).toBe('transparent');
  });

  it('defaults to "dark" for undefined', () => {
    expect(parseOverlayTheme(undefined)).toBe('dark');
  });

  it('defaults to "dark" for null', () => {
    expect(parseOverlayTheme(null)).toBe('dark');
  });

  it('defaults to "dark" for empty string', () => {
    expect(parseOverlayTheme('')).toBe('dark');
  });

  it('defaults to "dark" for invalid string', () => {
    expect(parseOverlayTheme('neon')).toBe('dark');
    expect(parseOverlayTheme('DARK')).toBe('dark');
    expect(parseOverlayTheme('Light')).toBe('dark');
  });
});

describe('isBare', () => {
  describe('landing page', () => {
    it('is bare when unauthenticated', () => {
      expect(isBare('/', false)).toBe(true);
    });

    it('is not bare when authenticated', () => {
      expect(isBare('/', true)).toBe(false);
    });
  });

  describe('auth pages', () => {
    it('is bare for /auth', () => {
      expect(isBare('/auth', false)).toBe(true);
      expect(isBare('/auth', true)).toBe(true);
    });

    it('is bare for /auth sub-paths', () => {
      expect(isBare('/auth/login', false)).toBe(true);
      expect(isBare('/auth/signup', true)).toBe(true);
    });
  });

  describe('overlay pages', () => {
    it('is bare for /overlay root', () => {
      expect(isBare('/overlay', false)).toBe(true);
    });

    it('is bare for overlay sub-paths', () => {
      expect(isBare('/overlay/abc123/current-pick', false)).toBe(true);
      expect(isBare('/overlay/abc123/ticker', true)).toBe(true);
      expect(isBare('/overlay/abc123/board', false)).toBe(true);
    });
  });

  describe('embed pages', () => {
    it('is bare for /embed root', () => {
      expect(isBare('/embed', false)).toBe(true);
    });

    it('is bare for embed sub-paths', () => {
      expect(isBare('/embed/board/my-board', false)).toBe(true);
      expect(isBare('/embed/player/abc123', true)).toBe(true);
    });
  });

  describe('spectate pages', () => {
    it('is bare for spectate path', () => {
      expect(isBare('/drafts/abc123/spectate', false)).toBe(true);
      expect(isBare('/drafts/abc123/spectate', true)).toBe(true);
    });
  });

  describe('normal app pages', () => {
    it('is not bare for standard pages', () => {
      expect(isBare('/drafts', true)).toBe(false);
      expect(isBare('/players', false)).toBe(false);
      expect(isBare('/boards', true)).toBe(false);
      expect(isBare('/community', false)).toBe(false);
      expect(isBare('/settings', true)).toBe(false);
      expect(isBare('/drafts/abc123/live', true)).toBe(false);
    });
  });
});
