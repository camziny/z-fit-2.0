import { describe, expect, it } from 'vitest';

import { convertWeight, formatWeight } from './weights';

describe('convertWeight', () => {
  it('keeps same unit values unchanged aside from configured rounding', () => {
    expect(convertWeight(55, 'lbs', 'lbs')).toBe(55);
    expect(convertWeight(55.2, 'kg', 'kg')).toBe(55);
  });

  it('converts kg to lbs and rounds to nearest 5', () => {
    expect(convertWeight(80, 'kg', 'lbs')).toBe(175);
    expect(convertWeight(81, 'kg', 'lbs')).toBe(180);
  });

  it('converts lbs to kg and rounds to nearest 0.5', () => {
    expect(convertWeight(225, 'lbs', 'kg')).toBe(102);
    expect(convertWeight(135, 'lbs', 'kg')).toBe(61);
  });
});

describe('formatWeight', () => {
  it('formats with one decimal precision when needed', () => {
    expect(formatWeight(82.34, 'kg')).toBe('82.3 kg');
    expect(formatWeight(185, 'lbs')).toBe('185 lbs');
  });
});

