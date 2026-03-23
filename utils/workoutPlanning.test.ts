import { describe, expect, it } from 'vitest';

import { buildPlannedWeightsInKg, getDisplayIncrement, roundGymDisplayWeight } from './workoutPlanning';
import { convertWeight } from './weights';

describe('getDisplayIncrement', () => {
  it('uses 5 lb / 2.5 kg for single loading', () => {
    expect(getDisplayIncrement('lbs', { loadingMode: 'single' })).toBe(5);
    expect(getDisplayIncrement('kg', { loadingMode: 'single' })).toBe(2.5);
  });

  it('uses pair-aware total increments', () => {
    expect(getDisplayIncrement('lbs', { loadingMode: 'pair' })).toBe(10);
    expect(getDisplayIncrement('kg', { loadingMode: 'pair' })).toBe(5);
  });
});

describe('roundGymDisplayWeight', () => {
  it('rounds by pair increment in lbs', () => {
    expect(roundGymDisplayWeight(62, 'lbs', { loadingMode: 'pair' })).toBe(60);
    expect(roundGymDisplayWeight(66, 'lbs', { loadingMode: 'pair' })).toBe(70);
  });

  it('rounds by single increment in kg', () => {
    expect(roundGymDisplayWeight(82.2, 'kg', { loadingMode: 'single' })).toBe(82.5);
    expect(roundGymDisplayWeight(81.1, 'kg', { loadingMode: 'single' })).toBe(80);
  });
});

describe('buildPlannedWeightsInKg', () => {
  it('builds payload with exercise-specific rounding before kg conversion', () => {
    const plannedWeights = {
      exPair: 67,
      exSingle: 137,
    };
    const exercises = [
      { _id: 'exPair', loadingMode: 'pair' as const },
      { _id: 'exSingle', loadingMode: 'single' as const },
    ];

    const result = buildPlannedWeightsInKg(plannedWeights, 'lbs', exercises, convertWeight);

    expect(result.exPair).toBe(convertWeight(70, 'lbs', 'kg'));
    expect(result.exSingle).toBe(convertWeight(135, 'lbs', 'kg'));
  });
});

