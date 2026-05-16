import { describe, expect, it } from 'vitest';

import {
  buildPlannedWeightsInKg,
  estimateOneRepMax,
  estimateWeightForReps,
  getDisplayIncrement,
  getReferenceStrengthMultiplier,
  roundGymDisplayWeight,
} from './workoutPlanning';
import { convertWeight } from './weights';

describe('Epley load estimates', () => {
  it('estimates 1RM from a working set', () => {
    expect(estimateOneRepMax(225, 10)).toBe(300);
  });

  it('estimates target weight from 1RM and target reps', () => {
    expect(estimateWeightForReps(300, 10)).toBe(225);
    expect(Math.round(estimateWeightForReps(300, 5))).toBe(257);
  });
});

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

describe('getReferenceStrengthMultiplier', () => {
  const snatchGripDeadlift = {
    _id: 'snatch',
    name: 'Snatch Grip Deadlift',
    equipment: 'barbell' as const,
    loadingMode: 'bar' as const,
  };

  it('keeps dumbbell gorilla row conservative from snatch grip deadlift', () => {
    const gorillaRow = {
      _id: 'gorilla-row',
      name: 'Dumbbell Gorilla Row',
      equipment: 'dumbbell' as const,
      loadingMode: 'single' as const,
    };
    const multiplier = getReferenceStrengthMultiplier(snatchGripDeadlift, gorillaRow);
    const suggestedWeight = roundGymDisplayWeight(
      estimateWeightForReps(300 * multiplier, 12),
      'lbs',
      gorillaRow,
    );

    expect(multiplier).toBe(0.35);
    expect(suggestedWeight).toBe(75);
  });

  it('keeps barbell curl conservative from snatch grip deadlift', () => {
    const barbellCurl = {
      _id: 'barbell-curl',
      name: 'Barbell Curl',
      equipment: 'barbell' as const,
      loadingMode: 'bar' as const,
    };
    const multiplier = getReferenceStrengthMultiplier(snatchGripDeadlift, barbellCurl);
    const suggestedWeight = roundGymDisplayWeight(
      estimateWeightForReps(300 * multiplier, 8),
      'lbs',
      barbellCurl,
    );

    expect(multiplier).toBe(0.25);
    expect(suggestedWeight).toBe(60);
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

  it('preserves per-set planned weights when converting to kg', () => {
    const plannedWeights = {
      exBar: [168, 182, 193],
    };
    const exercises = [
      { _id: 'exBar', loadingMode: 'bar' as const },
    ];

    const result = buildPlannedWeightsInKg(plannedWeights, 'lbs', exercises, convertWeight);

    expect(result.exBar).toEqual([
      convertWeight(170, 'lbs', 'kg'),
      convertWeight(180, 'lbs', 'kg'),
      convertWeight(195, 'lbs', 'kg'),
    ]);
  });
});

