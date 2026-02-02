import { describe, it, expect } from 'vitest';
import {
  getSchoolColor,
  schoolColorStyle,
  SCHOOL_COLORS,
  DEFAULT_SCHOOL_COLOR,
} from './school-colors';

describe('school-colors', () => {
  it('has entries for FBS and FCS schools', () => {
    expect(Object.keys(SCHOOL_COLORS).length).toBeGreaterThan(200);
  });

  it('each entry has valid hex primary and secondary colors', () => {
    const hexRe = /^#[0-9A-Fa-f]{6}$/;
    for (const [school, colors] of Object.entries(SCHOOL_COLORS)) {
      expect(colors.primary, `${school} primary`).toMatch(hexRe);
      expect(colors.secondary, `${school} secondary`).toMatch(hexRe);
    }
  });

  describe('getSchoolColor', () => {
    it('returns correct pair for known FBS school', () => {
      expect(getSchoolColor('Alabama')).toEqual({
        primary: '#990000',
        secondary: '#EEEEEE',
      });
    });

    it('returns correct pair for known FCS school', () => {
      expect(getSchoolColor('Yale')).toEqual({
        primary: '#00268D',
        secondary: '#196EFF',
      });
    });

    it('is case-insensitive', () => {
      expect(getSchoolColor('alabama')).toEqual(getSchoolColor('Alabama'));
      expect(getSchoolColor('MICHIGAN')).toEqual(getSchoolColor('michigan'));
    });

    it('returns default for unknown school', () => {
      expect(getSchoolColor('Nonexistent University')).toEqual(
        DEFAULT_SCHOOL_COLOR,
      );
    });

    it('resolves aliases', () => {
      expect(getSchoolColor('Miami')).toEqual(getSchoolColor('Miami (FL)'));
      expect(getSchoolColor('Pitt')).toEqual(getSchoolColor('Pittsburgh'));
      expect(getSchoolColor('Southern California')).toEqual(
        getSchoolColor('USC'),
      );
      expect(getSchoolColor('UMass')).toEqual(getSchoolColor('Massachusetts'));
    });
  });

  describe('schoolColorStyle', () => {
    it('returns CSS custom properties for known school', () => {
      const style = schoolColorStyle('Michigan');
      expect(style).toHaveProperty('--school-primary', '#FFCB05');
      expect(style).toHaveProperty('--school-secondary', '#00274C');
    });

    it('returns default CSS custom properties for unknown school', () => {
      const style = schoolColorStyle('Unknown School');
      expect(style).toHaveProperty(
        '--school-primary',
        DEFAULT_SCHOOL_COLOR.primary,
      );
      expect(style).toHaveProperty(
        '--school-secondary',
        DEFAULT_SCHOOL_COLOR.secondary,
      );
    });
  });
});
