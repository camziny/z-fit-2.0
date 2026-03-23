import type { WeightUnit } from './weights';

export type ExerciseWeightMeta = {
  _id?: string;
  loadingMode?: 'bar' | 'pair' | 'single';
  roundingIncrementKg?: number;
};

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
  plannedWeights: Record<string, number>,
  weightUnit: WeightUnit,
  exercises: ExerciseWeightMeta[],
  convertWeight: (value: number, fromUnit: WeightUnit, toUnit: WeightUnit) => number
): Record<string, number> {
  const byId = new Map(exercises.map((exercise) => [exercise._id, exercise]));
  const result: Record<string, number> = {};

  Object.entries(plannedWeights).forEach(([exerciseId, weight]) => {
    const exerciseMeta = byId.get(exerciseId);
    const roundedDisplayWeight = roundGymDisplayWeight(weight, weightUnit, exerciseMeta);
    result[exerciseId] = convertWeight(roundedDisplayWeight, weightUnit, 'kg');
  });

  return result;
}

