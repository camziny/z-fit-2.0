import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

async function resolveExerciseMedia(ctx: any, exercise: any) {
  if (!exercise) return exercise;
  const gifFromStorage = exercise.mediaGifStorageId
    ? await ctx.storage.getUrl(exercise.mediaGifStorageId)
    : null;
  const mp4FromStorage = exercise.mediaMp4StorageId
    ? await ctx.storage.getUrl(exercise.mediaMp4StorageId)
    : null;
  return {
    ...exercise,
    mediaGifUrl: gifFromStorage ?? exercise.mediaGifUrl,
    mediaMp4Url: mp4FromStorage ?? exercise.mediaMp4Url,
  };
}

export const seedBasics = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const basics: Array<{
      name: string;
      bodyPart: string;
      isWeighted: boolean;
      equipment: 'barbell' | 'dumbbell' | 'machine' | 'kettlebell' | 'cable' | 'bodyweight';
      loadingMode: 'bar' | 'pair' | 'single';
      roundingIncrementKg: number;
      roundingIncrementLbs: number;
    }> = [
      { name: 'Back Squat', bodyPart: 'legs', isWeighted: true, equipment: 'barbell', loadingMode: 'bar', roundingIncrementKg: 2.5, roundingIncrementLbs: 2.5 },
      { name: 'Front Squat', bodyPart: 'legs', isWeighted: true, equipment: 'barbell', loadingMode: 'bar', roundingIncrementKg: 2.5, roundingIncrementLbs: 2.5 },
      { name: 'Leg Press', bodyPart: 'legs', isWeighted: true, equipment: 'machine', loadingMode: 'bar', roundingIncrementKg: 2.5, roundingIncrementLbs: 5 },
      { name: 'Walking Lunge', bodyPart: 'legs', isWeighted: true, equipment: 'dumbbell', loadingMode: 'pair', roundingIncrementKg: 2.5, roundingIncrementLbs: 5 },
      { name: 'Romanian Deadlift', bodyPart: 'legs', isWeighted: true, equipment: 'barbell', loadingMode: 'bar', roundingIncrementKg: 2.5, roundingIncrementLbs: 2.5 },
      { name: 'Push-up', bodyPart: 'chest', isWeighted: false, equipment: 'bodyweight', loadingMode: 'bar', roundingIncrementKg: 2.5, roundingIncrementLbs: 5 },
      { name: 'Pull-up', bodyPart: 'back', isWeighted: false, equipment: 'bodyweight', loadingMode: 'bar', roundingIncrementKg: 2.5, roundingIncrementLbs: 5 },
    ];
    for (const e of basics) {
      await ctx.db.insert('exercises', { ...e, createdAt: now });
    }
    return basics.length;
  },
});

export const byBodyPart = query({
  args: { bodyPart: v.string() },
  handler: async (ctx, { bodyPart }) => {
    const exercises = await ctx.db
      .query('exercises')
      .withIndex('by_body_part', q => q.eq('bodyPart', bodyPart))
      .collect();
    return await Promise.all(exercises.map((exercise: any) => resolveExerciseMedia(ctx, exercise)));
  },
});

export const getMultiple = query({
  args: { exerciseIds: v.array(v.id('exercises')) },
  handler: async (ctx, { exerciseIds }) => {
    const exercises = await Promise.all(
      exerciseIds.map(id => ctx.db.get(id))
    );
    const existing = exercises.filter(Boolean);
    return await Promise.all(existing.map((exercise: any) => resolveExerciseMedia(ctx, exercise)));
  },
});


