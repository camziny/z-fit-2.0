import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const seedLegs = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const backSquat = await ctx.db
      .query('exercises')
      .withIndex('by_name', q => q.eq('name', 'Back Squat'))
      .first();
    const frontSquat = await ctx.db
      .query('exercises')
      .withIndex('by_name', q => q.eq('name', 'Front Squat'))
      .first();
    if (!backSquat || !frontSquat) throw new Error('Seed exercises first');

    await ctx.db.insert('templates', {
      name: 'Legs 1 - Back Squat Focus',
      description: 'Primary lift: Back Squat; accessories follow.',
      bodyPart: 'legs',
      variation: 'legs1',
      items: [
        {
          exerciseId: backSquat._id,
          order: 1,
          sets: [
            { reps: 10, weight: undefined, restSec: 120 },
            { reps: 8, weight: undefined, restSec: 120 },
            { reps: 6, weight: undefined, restSec: 150 },
            { reps: 4, weight: undefined, restSec: 150 },
            { reps: 4, weight: undefined, restSec: 150 },
          ],
        },
      ],
      createdAt: now,
    });

    await ctx.db.insert('templates', {
      name: 'Legs 2 - Front Squat Focus',
      description: 'Primary lift: Front Squat; accessories follow.',
      bodyPart: 'legs',
      variation: 'legs2',
      items: [
        {
          exerciseId: frontSquat._id,
          order: 1,
          sets: [
            { reps: 10, weight: undefined, restSec: 120 },
            { reps: 8, weight: undefined, restSec: 120 },
            { reps: 6, weight: undefined, restSec: 150 },
            { reps: 4, weight: undefined, restSec: 150 },
            { reps: 4, weight: undefined, restSec: 150 },
          ],
        },
      ],
      createdAt: now,
    });

    return true;
  },
});

export const byBodyPart = query({
  args: { bodyPart: v.string() },
  handler: async (ctx, { bodyPart }) => {
    return await ctx.db
      .query('templates')
      .withIndex('by_body_part', q => q.eq('bodyPart', bodyPart))
      .collect();
  },
});

export const getById = query({
  args: { templateId: v.id('templates') },
  handler: async (ctx, { templateId }) => {
    return await ctx.db.get(templateId);
  },
});


