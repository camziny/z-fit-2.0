import type { WeightUnit } from './weights';

export type ExerciseWeightMeta = {
  _id?: string;
  name?: string;
  equipment?: 'barbell' | 'dumbbell' | 'machine' | 'kettlebell' | 'cable' | 'bodyweight';
  loadingMode?: 'bar' | 'pair' | 'single';
  roundingIncrementKg?: number;
};

export type PlannedWeightValue = number | number[];
export type MovementType = 'press' | 'pull';

export type ReferenceMultiplierOptions = {
  movement?: MovementType;
  hasFamilyReference?: boolean;
};

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

export function getReferenceStrengthMultiplier(
  referenceExercise: ExerciseWeightMeta | undefined,
  targetExercise: ExerciseWeightMeta | undefined,
  options: ReferenceMultiplierOptions = {}
): number {
  const referenceName = String(referenceExercise?.name ?? '').toLowerCase();
  const targetName = String(targetExercise?.name ?? '').toLowerCase();
  const targetEquipment = targetExercise?.equipment;
  const isDeadliftReference = referenceName.includes('deadlift');

  if (referenceExercise?._id && referenceExercise._id === targetExercise?._id) return 1;
  if (targetName.includes('curl')) return isDeadliftReference ? 0.25 : 0.35;
  if (targetName.includes('face pull') || targetName.includes('rear delt') || targetName.includes('angels and devils')) return 0.18;
  if (targetName.includes('triceps') || targetName.includes('pushdown') || targetName.includes('extension')) return isDeadliftReference ? 0.22 : 0.35;
  if (targetName.includes('straight arm') || targetName.includes('pullover')) return isDeadliftReference ? 0.24 : 0.35;
  if (targetName.includes('pulldown')) return isDeadliftReference ? 0.42 : 0.6;
  if (targetName.includes('row')) {
    if (targetExercise?.loadingMode === 'single' || targetEquipment === 'dumbbell') return isDeadliftReference ? 0.35 : 0.5;
    return isDeadliftReference ? 0.45 : 0.6;
  }
  if (targetEquipment === 'cable') return isDeadliftReference ? 0.28 : 0.45;
  if (targetEquipment === 'dumbbell' || targetEquipment === 'kettlebell') return isDeadliftReference ? 0.3 : 0.45;
  if (options.hasFamilyReference) return options.movement === 'pull' ? 0.75 : 0.8;
  return 0.65;
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

