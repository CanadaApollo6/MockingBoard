/// <reference types="vitest/globals" />
import { generateDraftName } from './draft-names.js';

describe('generateDraftName', () => {
  it('returns a string', () => {
    expect(typeof generateDraftName()).toBe('string');
  });

  it('returns a two-word name (adjective + noun)', () => {
    const name = generateDraftName();
    // Most names are "Word Word" but some nouns have spaces (e.g. "Hail Mary", "Snap Count")
    // so just check there's at least one space
    expect(name).toContain(' ');
    expect(name.length).toBeGreaterThan(3);
  });

  it('never returns an empty string', () => {
    for (let i = 0; i < 50; i++) {
      const name = generateDraftName();
      expect(name.trim().length).toBeGreaterThan(0);
    }
  });

  it('starts with an uppercase letter', () => {
    for (let i = 0; i < 50; i++) {
      const name = generateDraftName();
      expect(name[0]).toBe(name[0].toUpperCase());
    }
  });

  it('produces variety (not always the same name)', () => {
    const names = new Set<string>();
    for (let i = 0; i < 100; i++) {
      names.add(generateDraftName());
    }
    // With 37 adjectives × 35 nouns = 1295 combos, 100 attempts should produce many unique
    expect(names.size).toBeGreaterThan(50);
  });

  it('follows "Adjective Noun" pattern with known words', () => {
    const knownAdjectives = [
      'Iron',
      'Phantom',
      'Thunder',
      'Golden',
      'Steel',
      'Shadow',
      'Crimson',
      'Blazing',
      'Frozen',
      'Silver',
      'Rogue',
      'Savage',
      'Electric',
      'Silent',
      'Midnight',
      'Rapid',
      'Atomic',
      'Titan',
      'Neon',
      'Fierce',
      'Mystic',
      'Primal',
      'Turbo',
      'Apex',
      'Noble',
      'Dark',
      'Omega',
      'Alpha',
      'Grand',
      'Wild',
      'Swift',
      'Bold',
      'Sonic',
      'Storm',
      'Hyper',
      'Peak',
      'Royal',
    ];

    for (let i = 0; i < 50; i++) {
      const name = generateDraftName();
      const firstWord = name.split(' ')[0];
      expect(knownAdjectives).toContain(firstWord);
    }
  });
});
