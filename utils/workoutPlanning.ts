import type { WeightUnit } from './weights';

export type ExerciseWeightMeta = {
  _id?: string;
  loadingMode?: 'bar' | 'pair' | 'single';
  roundingIncrementKg?: number;
};

export type PlannedWeightValue = number | number[];

export const DEFAULT_WORKING_REPS = 10;

export function estimateOneRepMax(weight: number, reps: number): number {
  return weight * (1 + reps / 30);
}

export function estimateWeightForReps(oneRepMax: number, reps: number): number {
  return oneRepMax / (1 + reps / 30);
}

export function getDisplayIncrement(weightUnit: WeightUnit, exerciseMeta?: ExerciseWeightMeta): number {
  const isPair = exerciseMeta?.loadingMode === 'pair';
  if (weightUnit === 'kg') return isPair ? 5 : 2.5;
  return isPair ? 10 : 5;
}

export function roundGymDisplayWeight(
  weight: number,
  weightUnit: WeightUnit,
  exerciseMeta?: ExerciseWeightMeta
): number {
  const increment = getDisplayIncrement(weightUnit, exerciseMeta);
  return Math.round(weight / increment) * increment;
}

export function buildPlannedWeightsInKg(
  plannedWeights: Record<string, PlannedWeightValue>,
  weightUnit: WeightUnit,
  exercises: ExerciseWeightMeta[],
  convertWeight: (value: number, fromUnit: WeightUnit, toUnit: WeightUnit) => number
): Record<string, PlannedWeightValue> {
  const byId = new Map(exercises.map((exercise) => [exercise._id, exercise]));
  const result: Record<string, PlannedWeightValue> = {};

  Object.entries(plannedWeights).forEach(([exerciseId, weight]) => {
    const exerciseMeta = byId.get(exerciseId);
    const convertRounded = (value: number) => {
      const roundedDisplayWeight = roundGymDisplayWeight(value, weightUnit, exerciseMeta);
      return convertWeight(roundedDisplayWeight, weightUnit, 'kg');
    };
    result[exerciseId] = Array.isArray(weight)
      ? weight.map(convertRounded)
      : convertRounded(weight);
  });

  return result;
}

