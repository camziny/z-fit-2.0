export type ProgressionWeightMeta = {
  loadingMode?: 'bar' | 'pair' | 'single';
  roundingIncrementKg?: number;
};

export function getProgressionIncrementKg(exerciseMeta?: ProgressionWeightMeta): number {
  if (exerciseMeta?.roundingIncrementKg && exerciseMeta.roundingIncrementKg > 0) {
    return exerciseMeta.roundingIncrementKg;
  }
  return exerciseMeta?.loadingMode === 'pair' ? 5 : 2.5;
}

function roundToIncrement(value: number, increment: number): number {
  return Number((Math.round(value / increment) * increment).toFixed(3));
}

export function computeNextPlannedWeight(
  lastCompletedWeightKg: number,
  rir: number,
  exerciseMeta?: ProgressionWeightMeta
): number {
  const increment = getProgressionIncrementKg(exerciseMeta);
  const current = roundToIncrement(lastCompletedWeightKg, increment);

  if (rir <= 0) {
    return Math.max(0, roundToIncrement(current - increment, increment));
  }

  if (rir <= 1) {
    return current;
  }

  const multiplier = rir >= 4 ? 1.075 : rir >= 3 ? 1.05 : 1.025;
  const minimumIncrease = rir >= 4 ? increment * 3 : rir >= 3 ? increment * 2 : increment;
  const roundedTarget = roundToIncrement(lastCompletedWeightKg * multiplier, increment);
  return Math.max(roundedTarget, Number((current + minimumIncrease).toFixed(3)));
}
