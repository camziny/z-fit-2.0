import { describe, expect, it } from 'vitest';

import { computeNextPlannedWeight, getProgressionIncrementKg } from './workoutProgression';

describe('getProgressionIncrementKg', () => {
  it('uses pair-aware total increments', () => {
    expect(getProgressionIncrementKg({ loadingMode: 'pair' })).toBe(5);
    expect(getProgressionIncrementKg({ loadingMode: 'bar' })).toBe(2.5);
  });

  it('honors exercise-specific kg increments', () => {
    expect(getProgressionIncrementKg({ loadingMode: 'bar', roundingIncrementKg: 1 })).toBe(1);
  });
});

describe('computeNextPlannedWeight', () => {
  it('lowers, holds, and increases based on RIR', () => {
    expect(computeNextPlannedWeight(100, 0, { loadingMode: 'bar' })).toBe(97.5);
    expect(computeNextPlannedWeight(100, 1, { loadingMode: 'bar' })).toBe(100);
    expect(computeNextPlannedWeight(100, 2, { loadingMode: 'bar' })).toBe(102.5);
    expect(computeNextPlannedWeight(100, 3, { loadingMode: 'bar' })).toBe(105);
    expect(computeNextPlannedWeight(100, 4, { loadingMode: 'bar' })).toBe(107.5);
  });

  it('uses larger total jumps for paired implements', () => {
    expect(computeNextPlannedWeight(40, 2, { loadingMode: 'pair' })).toBe(45);
    expect(computeNextPlannedWeight(40, 3, { loadingMode: 'pair' })).toBe(50);
    expect(computeNextPlannedWeight(40, 4, { loadingMode: 'pair' })).toBe(55);
  });
});
