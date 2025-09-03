import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const seedBasics = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const basics = [
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
    return await ctx.db
      .query('exercises')
      .withIndex('by_body_part', q => q.eq('bodyPart', bodyPart))
      .collect();
  },
});

export const getMultiple = query({
  args: { exerciseIds: v.array(v.id('exercises')) },
  handler: async (ctx, { exerciseIds }) => {
    const exercises = await Promise.all(
      exerciseIds.map(id => ctx.db.get(id))
    );
    return exercises.filter(Boolean);
  },
});


