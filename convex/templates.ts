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


export const seedBackWorkouts = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const requiredExercises: Array<{
      name: string;
      bodyPart: string;
      isWeighted: boolean;
      equipment?: 'barbell' | 'dumbbell' | 'machine' | 'kettlebell' | 'cable' | 'bodyweight';
      loadingMode?: 'bar' | 'pair' | 'single';
    }> = [
      { name: 'Barbell Deadlift', bodyPart: 'back', isWeighted: true, equipment: 'barbell', loadingMode: 'bar' },
      { name: 'Chest Supported Row', bodyPart: 'back', isWeighted: true, equipment: 'machine', loadingMode: 'bar' },
      { name: 'Dumbbell Pullover', bodyPart: 'back', isWeighted: true, equipment: 'dumbbell', loadingMode: 'single' },
      { name: 'Dumbbell High Pull', bodyPart: 'back', isWeighted: true, equipment: 'dumbbell', loadingMode: 'pair' },
      { name: 'Chin-up', bodyPart: 'arms', isWeighted: false, equipment: 'bodyweight', loadingMode: 'bar' },
      { name: 'Overhead Triceps Extension', bodyPart: 'arms', isWeighted: true, equipment: 'dumbbell', loadingMode: 'single' },
      { name: 'Angels and Devils', bodyPart: 'shoulders', isWeighted: true, equipment: 'dumbbell', loadingMode: 'pair' },
      { name: 'Snatch Grip Deadlift', bodyPart: 'back', isWeighted: true, equipment: 'barbell', loadingMode: 'bar' },
      { name: 'Pull-up (Weighted)', bodyPart: 'back', isWeighted: false, equipment: 'bodyweight', loadingMode: 'bar' },
      { name: 'Dumbbell Gorilla Row', bodyPart: 'back', isWeighted: true, equipment: 'dumbbell', loadingMode: 'single' },
      { name: 'Straight Arm Pushdown', bodyPart: 'back', isWeighted: true, equipment: 'cable', loadingMode: 'bar' },
      { name: 'Barbell Curl', bodyPart: 'arms', isWeighted: true, equipment: 'barbell', loadingMode: 'bar' },
      { name: 'Triceps Pushdown', bodyPart: 'arms', isWeighted: true, equipment: 'cable', loadingMode: 'bar' },
      { name: 'Face Pull', bodyPart: 'back', isWeighted: true, equipment: 'cable', loadingMode: 'bar' },
      { name: 'V-Handle Pulldown', bodyPart: 'back', isWeighted: true, equipment: 'cable', loadingMode: 'bar' },
      { name: 'Dual Pulley Standing Cable Row', bodyPart: 'back', isWeighted: true, equipment: 'cable', loadingMode: 'bar' },
      { name: 'Dead Shrug', bodyPart: 'back', isWeighted: true, equipment: 'barbell', loadingMode: 'bar' },
    ];

    const exerciseIds: Record<string, any> = {};
    for (const ex of requiredExercises) {
      const existing = await ctx.db
        .query('exercises')
        .withIndex('by_name', q => q.eq('name', ex.name))
        .first();
      if (existing) {
        exerciseIds[ex.name] = existing._id;
      } else {
        const insertedId = await ctx.db.insert('exercises', { ...ex, createdAt: now });
        exerciseIds[ex.name] = insertedId;
      }
    }

    const templates = [
      {
        name: 'Back Pull 1',
        description: 'Primary: Deadlift. Includes superset: Chin-up + Overhead Triceps Extension.',
        bodyPart: 'back',
        variation: 'pull1',
        items: [
          {
            exerciseId: exerciseIds['Barbell Deadlift'],
            order: 1,
            sets: [
              { reps: 10, weight: undefined, restSec: 120 },
              { reps: 8, weight: undefined, restSec: 120 },
              { reps: 6, weight: undefined, restSec: 150 },
              { reps: 4, weight: undefined, restSec: 150 },
              { reps: 5, weight: undefined, restSec: 180 },
            ],
          },
          {
            exerciseId: exerciseIds['Chest Supported Row'],
            order: 2,
            sets: [
              { reps: 10, weight: undefined, restSec: 90 },
              { reps: 10, weight: undefined, restSec: 90 },
              { reps: 8, weight: undefined, restSec: 90 },
            ],
          },
          {
            exerciseId: exerciseIds['Dumbbell Pullover'],
            order: 3,
            sets: [
              { reps: 12, weight: undefined, restSec: 90 },
              { reps: 12, weight: undefined, restSec: 90 },
              { reps: 10, weight: undefined, restSec: 90 },
            ],
          },
          {
            exerciseId: exerciseIds['Dumbbell High Pull'],
            order: 4,
            sets: [
              { reps: 12, weight: undefined, restSec: 90 },
              { reps: 12, weight: undefined, restSec: 90 },
              { reps: 10, weight: undefined, restSec: 90 },
            ],
          },
          {
            exerciseId: exerciseIds['Chin-up'],
            order: 5,
            groupId: 'ss1',
            groupOrder: 1,
            sets: [
              { reps: 8, weight: undefined, restSec: 60 },
              { reps: 8, weight: undefined, restSec: 60 },
              { reps: 8, weight: undefined, restSec: 60 },
            ],
          },
          {
            exerciseId: exerciseIds['Overhead Triceps Extension'],
            order: 6,
            groupId: 'ss1',
            groupOrder: 2,
            sets: [
              { reps: 12, weight: undefined, restSec: 60 },
              { reps: 12, weight: undefined, restSec: 60 },
              { reps: 10, weight: undefined, restSec: 60 },
            ],
          },
          {
            exerciseId: exerciseIds['Angels and Devils'],
            order: 7,
            sets: [
              { reps: 20, weight: undefined, restSec: 60 },
              { reps: 20, weight: undefined, restSec: 60 },
              { reps: 15, weight: undefined, restSec: 60 },
            ],
          },
        ],
        createdAt: now,
      },
      {
        name: 'Back Pull 2',
        description: 'Includes superset: Barbell Curl + Triceps Pushdown.',
        bodyPart: 'back',
        variation: 'pull2',
        items: [
          {
            exerciseId: exerciseIds['Snatch Grip Deadlift'],
            order: 1,
            sets: [
              { reps: 5, weight: undefined, restSec: 150 },
              { reps: 5, weight: undefined, restSec: 150 },
              { reps: 5, weight: undefined, restSec: 150 },
            ],
          },
          {
            exerciseId: exerciseIds['Pull-up (Weighted)'],
            order: 2,
            sets: [
              { reps: 8, weight: undefined, restSec: 120 },
              { reps: 7, weight: undefined, restSec: 120 },
              { reps: 6, weight: undefined, restSec: 120 },
            ],
          },
          {
            exerciseId: exerciseIds['Dumbbell Gorilla Row'],
            order: 3,
            sets: [
              { reps: 12, weight: undefined, restSec: 90 },
              { reps: 12, weight: undefined, restSec: 90 },
              { reps: 10, weight: undefined, restSec: 90 },
            ],
          },
          {
            exerciseId: exerciseIds['Straight Arm Pushdown'],
            order: 4,
            sets: [
              { reps: 15, weight: undefined, restSec: 60 },
              { reps: 15, weight: undefined, restSec: 60 },
              { reps: 12, weight: undefined, restSec: 60 },
            ],
          },
          {
            exerciseId: exerciseIds['Barbell Curl'],
            order: 5,
            groupId: 'ss2',
            groupOrder: 1,
            sets: [
              { reps: 8, weight: undefined, restSec: 60 },
              { reps: 8, weight: undefined, restSec: 60 },
              { reps: 6, weight: undefined, restSec: 60 },
            ],
          },
          {
            exerciseId: exerciseIds['Triceps Pushdown'],
            order: 6,
            groupId: 'ss2',
            groupOrder: 2,
            sets: [
              { reps: 12, weight: undefined, restSec: 60 },
              { reps: 12, weight: undefined, restSec: 60 },
              { reps: 10, weight: undefined, restSec: 60 },
            ],
          },
          {
            exerciseId: exerciseIds['Face Pull'],
            order: 7,
            sets: [
              { reps: 20, weight: undefined, restSec: 60 },
              { reps: 20, weight: undefined, restSec: 60 },
              { reps: 15, weight: undefined, restSec: 60 },
            ],
          },
        ],
        createdAt: now,
      },
      {
        name: 'Back - Bane',
        description: 'Back focus. Deadlifts recommended elsewhere in the week.',
        bodyPart: 'back',
        variation: 'bane',
        items: [
          {
            exerciseId: exerciseIds['Straight Arm Pushdown'],
            order: 1,
            sets: [
              { reps: 15, weight: undefined, restSec: 60 },
              { reps: 15, weight: undefined, restSec: 60 },
              { reps: 12, weight: undefined, restSec: 60 },
            ],
          },
          {
            exerciseId: exerciseIds['V-Handle Pulldown'],
            order: 2,
            sets: [
              { reps: 12, weight: undefined, restSec: 90 },
              { reps: 10, weight: undefined, restSec: 90 },
              { reps: 10, weight: undefined, restSec: 90 },
              { reps: 8, weight: undefined, restSec: 90 },
            ],
          },
          {
            exerciseId: exerciseIds['Pull-up (Weighted)'],
            order: 3,
            sets: [
              { reps: 8, weight: undefined, restSec: 120 },
              { reps: 8, weight: undefined, restSec: 120 },
              { reps: 6, weight: undefined, restSec: 120 },
            ],
          },
          {
            exerciseId: exerciseIds['Dual Pulley Standing Cable Row'],
            order: 4,
            sets: [
              { reps: 12, weight: undefined, restSec: 90 },
              { reps: 10, weight: undefined, restSec: 90 },
              { reps: 10, weight: undefined, restSec: 90 },
            ],
          },
          {
            exerciseId: exerciseIds['Dead Shrug'],
            order: 5,
            sets: [
              { reps: 12, weight: undefined, restSec: 120 },
              { reps: 10, weight: undefined, restSec: 120 },
              { reps: 10, weight: undefined, restSec: 120 },
            ],
          },
        ],
        createdAt: now,
      },
    ];

    const existingTemplates = await ctx.db.query('templates').collect();
    const existingNames = new Set(existingTemplates.map(t => t.name));
    for (const t of templates) {
      if (!existingNames.has(t.name)) {
        await ctx.db.insert('templates', t);
      }
    }

    return true;
  },
});

export const seedChestWorkouts = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const requiredExercises: Array<{
      name: string;
      bodyPart: string;
      isWeighted: boolean;
      equipment?: 'barbell' | 'dumbbell' | 'machine' | 'kettlebell' | 'cable' | 'bodyweight';
      loadingMode?: 'bar' | 'pair' | 'single';
    }> = [
      { name: 'Barbell Bench Press', bodyPart: 'chest', isWeighted: true, equipment: 'barbell', loadingMode: 'bar' },
      { name: 'Hi-to-Low Cable Crossover', bodyPart: 'chest', isWeighted: true, equipment: 'cable', loadingMode: 'pair' },
      { name: 'Dumbbell Shoulder Press', bodyPart: 'shoulders', isWeighted: true, equipment: 'dumbbell', loadingMode: 'pair' },
      { name: '1.5 Side Lateral Raise', bodyPart: 'shoulders', isWeighted: true, equipment: 'dumbbell', loadingMode: 'pair' },
      { name: 'Lying Triceps Extension', bodyPart: 'arms', isWeighted: true, equipment: 'barbell', loadingMode: 'bar' },
      { name: "Dumbbell Waiter's Curl", bodyPart: 'arms', isWeighted: true, equipment: 'dumbbell', loadingMode: 'single' },
      { name: 'Rotator Cuff External Rotation', bodyPart: 'shoulders', isWeighted: true, equipment: 'cable', loadingMode: 'single' },
      { name: 'Barbell Overhead Press', bodyPart: 'shoulders', isWeighted: true, equipment: 'barbell', loadingMode: 'bar' },
      { name: 'Underhand Dumbbell Bench Press', bodyPart: 'chest', isWeighted: true, equipment: 'dumbbell', loadingMode: 'pair' },
      { name: 'Dumbbell Abduction Row', bodyPart: 'back', isWeighted: true, equipment: 'dumbbell', loadingMode: 'single' },
      { name: 'Dumbbell Floor Fly', bodyPart: 'chest', isWeighted: true, equipment: 'dumbbell', loadingMode: 'pair' },
      { name: 'Close Grip Bench Press', bodyPart: 'chest', isWeighted: true, equipment: 'barbell', loadingMode: 'bar' },
      { name: 'Dumbbell Curl', bodyPart: 'arms', isWeighted: true, equipment: 'dumbbell', loadingMode: 'pair' },
      { name: 'Push-up Plus', bodyPart: 'chest', isWeighted: false, equipment: 'bodyweight', loadingMode: 'bar' },
    ];

    const exerciseIds: Record<string, any> = {};
    for (const ex of requiredExercises) {
      const existing = await ctx.db
        .query('exercises')
        .withIndex('by_name', q => q.eq('name', ex.name))
        .first();
      if (existing) {
        exerciseIds[ex.name] = existing._id;
      } else {
        const insertedId = await ctx.db.insert('exercises', { ...ex, createdAt: now });
        exerciseIds[ex.name] = insertedId;
      }
    }

    const templates = [
      {
        name: 'Chest Push 1',
        description: 'Bench-focused push day with cable and dumbbell accessories. Includes one superset.',
        bodyPart: 'chest',
        variation: 'push1',
        items: [
          {
            exerciseId: exerciseIds['Barbell Bench Press'],
            order: 1,
            sets: [
              { reps: 6, weight: undefined, restSec: 150 },
              { reps: 6, weight: undefined, restSec: 150 },
              { reps: 5, weight: undefined, restSec: 180 },
              { reps: 4, weight: undefined, restSec: 180 },
            ],
          },
          {
            exerciseId: exerciseIds['Hi-to-Low Cable Crossover'],
            order: 2,
            sets: [
              { reps: 12, weight: undefined, restSec: 90 },
              { reps: 12, weight: undefined, restSec: 90 },
              { reps: 10, weight: undefined, restSec: 90 },
            ],
          },
          {
            exerciseId: exerciseIds['Dumbbell Shoulder Press'],
            order: 3,
            sets: [
              { reps: 10, weight: undefined, restSec: 120 },
              { reps: 10, weight: undefined, restSec: 120 },
              { reps: 9, weight: undefined, restSec: 120 },
              { reps: 8, weight: undefined, restSec: 120 },
            ],
          },
          {
            exerciseId: exerciseIds['1.5 Side Lateral Raise'],
            order: 4,
            sets: [
              { reps: 15, weight: undefined, restSec: 60 },
              { reps: 15, weight: undefined, restSec: 60 },
              { reps: 12, weight: undefined, restSec: 60 },
            ],
          },
          {
            exerciseId: exerciseIds['Lying Triceps Extension'],
            order: 5,
            groupId: 'ps1',
            groupOrder: 1,
            sets: [
              { reps: 12, weight: undefined, restSec: 60 },
              { reps: 12, weight: undefined, restSec: 60 },
              { reps: 10, weight: undefined, restSec: 60 },
            ],
          },
          {
            exerciseId: exerciseIds["Dumbbell Waiter's Curl"],
            order: 6,
            groupId: 'ps1',
            groupOrder: 2,
            sets: [
              { reps: 12, weight: undefined, restSec: 60 },
              { reps: 12, weight: undefined, restSec: 60 },
              { reps: 10, weight: undefined, restSec: 60 },
            ],
          },
          {
            exerciseId: exerciseIds['Rotator Cuff External Rotation'],
            order: 7,
            sets: [
              { reps: 20, weight: undefined, restSec: 60 },
              { reps: 20, weight: undefined, restSec: 60 },
              { reps: 15, weight: undefined, restSec: 60 },
            ],
          },
        ],
        createdAt: now,
      },
      {
        name: 'Chest Push 2',
        description: 'Overhead press focus with dumbbell and chest accessories. Includes one superset.',
        bodyPart: 'chest',
        variation: 'push2',
        items: [
          {
            exerciseId: exerciseIds['Barbell Overhead Press'],
            order: 1,
            sets: [
              { reps: 6, weight: undefined, restSec: 150 },
              { reps: 6, weight: undefined, restSec: 150 },
              { reps: 5, weight: undefined, restSec: 180 },
              { reps: 4, weight: undefined, restSec: 180 },
            ],
          },
          {
            exerciseId: exerciseIds['Underhand Dumbbell Bench Press'],
            order: 2,
            sets: [
              { reps: 10, weight: undefined, restSec: 120 },
              { reps: 10, weight: undefined, restSec: 120 },
              { reps: 8, weight: undefined, restSec: 120 },
            ],
          },
          {
            exerciseId: exerciseIds['Dumbbell Abduction Row'],
            order: 3,
            sets: [
              { reps: 10, weight: undefined, restSec: 90 },
              { reps: 10, weight: undefined, restSec: 90 },
              { reps: 8, weight: undefined, restSec: 90 },
            ],
          },
          {
            exerciseId: exerciseIds['Dumbbell Floor Fly'],
            order: 4,
            sets: [
              { reps: 12, weight: undefined, restSec: 90 },
              { reps: 12, weight: undefined, restSec: 90 },
              { reps: 10, weight: undefined, restSec: 90 },
            ],
          },
          {
            exerciseId: exerciseIds['Close Grip Bench Press'],
            order: 5,
            groupId: 'ps2',
            groupOrder: 1,
            sets: [
              { reps: 8, weight: undefined, restSec: 90 },
              { reps: 7, weight: undefined, restSec: 90 },
              { reps: 6, weight: undefined, restSec: 90 },
            ],
          },
          {
            exerciseId: exerciseIds['Dumbbell Curl'],
            order: 6,
            groupId: 'ps2',
            groupOrder: 2,
            sets: [
              { reps: 12, weight: undefined, restSec: 60 },
              { reps: 12, weight: undefined, restSec: 60 },
              { reps: 10, weight: undefined, restSec: 60 },
            ],
          },
          {
            exerciseId: exerciseIds['Push-up Plus'],
            order: 7,
            sets: [
              { reps: 20, weight: undefined, restSec: 60 },
              { reps: 15, weight: undefined, restSec: 60 },
              { reps: 12, weight: undefined, restSec: 60 },
            ],
          },
        ],
        createdAt: now,
      },
    ];

    const existingTemplates = await ctx.db.query('templates').collect();
    const existingNames = new Set(existingTemplates.map(t => t.name));
    for (const t of templates) {
      if (!existingNames.has(t.name)) {
        await ctx.db.insert('templates', t);
      }
    }

    return true;
  },
});

export const seedLegWorkouts = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const requiredExercises: Array<{
      name: string;
      bodyPart: string;
      isWeighted: boolean;
      equipment?: 'barbell' | 'dumbbell' | 'machine' | 'kettlebell' | 'cable' | 'bodyweight';
      loadingMode?: 'bar' | 'pair' | 'single';
    }> = [
      { name: 'Back Squat', bodyPart: 'legs', isWeighted: true, equipment: 'barbell', loadingMode: 'bar' },
      { name: 'Barbell Hip Thrust', bodyPart: 'legs', isWeighted: true, equipment: 'barbell', loadingMode: 'bar' },
      { name: 'Dumbbell Reverse Lunge', bodyPart: 'legs', isWeighted: true, equipment: 'dumbbell', loadingMode: 'pair' },
      { name: 'Dumbbell Hamstring Curl', bodyPart: 'legs', isWeighted: true, equipment: 'dumbbell', loadingMode: 'single' },
      { name: 'Barbell Calf Raise', bodyPart: 'legs', isWeighted: true, equipment: 'barbell', loadingMode: 'bar' },
      { name: 'Reverse Hyper', bodyPart: 'back', isWeighted: true, equipment: 'machine', loadingMode: 'bar' },
      { name: 'Glute Ham Raise', bodyPart: 'legs', isWeighted: false, equipment: 'bodyweight', loadingMode: 'bar' },
      { name: 'Harop Curl', bodyPart: 'legs', isWeighted: false, equipment: 'bodyweight', loadingMode: 'bar' },
      { name: 'Dumbbell Bulgarian Split Squat', bodyPart: 'legs', isWeighted: true, equipment: 'dumbbell', loadingMode: 'pair' },
      { name: 'Romanian Deadlift', bodyPart: 'legs', isWeighted: true, equipment: 'barbell', loadingMode: 'bar' },
      { name: 'Terminal Knee Extension', bodyPart: 'legs', isWeighted: true, equipment: 'cable', loadingMode: 'single' },
      { name: 'Standing Calf Raise', bodyPart: 'legs', isWeighted: true, equipment: 'machine', loadingMode: 'bar' },
      { name: 'Hip Abduction', bodyPart: 'legs', isWeighted: true, equipment: 'cable', loadingMode: 'single' },
      { name: 'Front Squat', bodyPart: 'legs', isWeighted: true, equipment: 'barbell', loadingMode: 'bar' },
      { name: 'Trap Bar Deadlift', bodyPart: 'legs', isWeighted: true, equipment: 'barbell', loadingMode: 'bar' },
      { name: 'Seated Hamstring Curl', bodyPart: 'legs', isWeighted: true, equipment: 'machine', loadingMode: 'bar' },
    ];

    const exerciseIds: Record<string, any> = {};
    const gifByName: Record<string, string> = {
      'Reverse Hyper': 'https://gifrun.blob.core.windows.net/temp/31e154c3d58247a495e3ba260d0dd07b.gif',
      'Trap Bar Deadlift': 'https://gifrun.blob.core.windows.net/temp/f0be73631edf4e2f90ca8e20dd430c31.gif',
      'Front Squat': 'https://gifrun.blob.core.windows.net/temp/5d11b2ca3b244bb99c507ec281ac4af6.gif',
      'Dumbbell Reverse Lunge': 'https://gifrun.blob.core.windows.net/temp/e6b1b1ff125c41d2bc77be360702060f.gif',
      'Seated Hamstring Curl': 'https://gifrun.blob.core.windows.net/temp/b3ba88705e56460eb943a6242a24e834.gif',
      'Standing Calf Raise': 'https://gifrun.blob.core.windows.net/temp/bc95aa4259bc42eb936ad39f5f49e296.gif',
      'Glute Ham Raise': 'https://gifrun.blob.core.windows.net/temp/1a3e4613ddab466584520b63fd529962.gif',
    };
    const descByName: Record<string, string | undefined> = {
      'Front Squat': 'Use ~80% 1RM',
      'Seated Hamstring Curl': 'Slow eccentric; to failure by 12 reps',
      'Glute Ham Raise': 'To failure',
    };
    for (const ex of requiredExercises) {
      const existing = await ctx.db
        .query('exercises')
        .withIndex('by_name', q => q.eq('name', ex.name))
        .first();
      if (existing) {
        const maybeGif = gifByName[ex.name];
        const maybeDesc = descByName[ex.name];
        if (maybeGif || maybeDesc) {
          await ctx.db.patch(existing._id, {
            gifUrl: maybeGif ?? existing.gifUrl,
            description: maybeDesc ?? existing.description,
          });
        }
        exerciseIds[ex.name] = existing._id;
      } else {
        const insertedId = await ctx.db.insert('exercises', {
          ...ex,
          gifUrl: gifByName[ex.name],
          description: descByName[ex.name],
          createdAt: now,
        });
        exerciseIds[ex.name] = insertedId;
      }
    }

    const templates = [
      {
        name: 'Legs PPL 1',
        description: 'Squat focus with hip thrusts and hamstring/calf work. Includes one superset.',
        bodyPart: 'legs',
        variation: 'ppl1',
        items: [
          {
            exerciseId: exerciseIds['Back Squat'],
            order: 1,
            sets: [
              { reps: 6, weight: undefined, restSec: 150 },
              { reps: 6, weight: undefined, restSec: 150 },
              { reps: 5, weight: undefined, restSec: 180 },
              { reps: 4, weight: undefined, restSec: 180 },
            ],
          },
          {
            exerciseId: exerciseIds['Barbell Hip Thrust'],
            order: 2,
            sets: [
              { reps: 12, weight: undefined, restSec: 120 },
              { reps: 10, weight: undefined, restSec: 120 },
              { reps: 8, weight: undefined, restSec: 120 },
            ],
          },
          {
            exerciseId: exerciseIds['Dumbbell Reverse Lunge'],
            order: 3,
            sets: [
              { reps: 12, weight: undefined, restSec: 90 },
              { reps: 12, weight: undefined, restSec: 90 },
              { reps: 10, weight: undefined, restSec: 90 },
            ],
          },
          {
            exerciseId: exerciseIds['Dumbbell Hamstring Curl'],
            order: 4,
            sets: [
              { reps: 12, weight: undefined, restSec: 90 },
              { reps: 12, weight: undefined, restSec: 90 },
              { reps: 10, weight: undefined, restSec: 90 },
            ],
          },
          {
            exerciseId: exerciseIds['Barbell Calf Raise'],
            order: 5,
            sets: [
              { reps: 12, weight: undefined, restSec: 60 },
              { reps: 12, weight: undefined, restSec: 60 },
              { reps: 10, weight: undefined, restSec: 60 },
            ],
          },
          {
            exerciseId: exerciseIds['Reverse Hyper'],
            order: 6,
            groupId: 'lss1',
            groupOrder: 1,
            sets: [
              { reps: 12, weight: undefined, restSec: 60 },
              { reps: 12, weight: undefined, restSec: 60 },
              { reps: 10, weight: undefined, restSec: 60 },
            ],
          },
          {
            exerciseId: exerciseIds['Glute Ham Raise'],
            order: 7,
            groupId: 'lss1',
            groupOrder: 2,
            sets: [
              { reps: 15, weight: undefined, restSec: 60 },
              { reps: 12, weight: undefined, restSec: 60 },
              { reps: 10, weight: undefined, restSec: 60 },
            ],
          },
        ],
        createdAt: now,
      },
      {
        name: 'Legs PPL 2',
        description: 'Hamstring emphasis with single-leg work and accessories.',
        bodyPart: 'legs',
        variation: 'ppl2',
        items: [
          { exerciseId: exerciseIds['Reverse Hyper'], order: 1, sets: [ { reps: 15, weight: undefined, restSec: 60 }, { reps: 15, weight: undefined, restSec: 60 } ] },
          { exerciseId: exerciseIds['Trap Bar Deadlift'], order: 2, sets: [ { reps: 5, weight: undefined, restSec: 150 }, { reps: 5, weight: undefined, restSec: 150 }, { reps: 5, weight: undefined, restSec: 150 } ] },
          { exerciseId: exerciseIds['Front Squat'], order: 3, sets: [ { reps: 8, weight: undefined, restSec: 150 }, { reps: 7, weight: undefined, restSec: 150 }, { reps: 6, weight: undefined, restSec: 150 } ] },
          { exerciseId: exerciseIds['Dumbbell Reverse Lunge'], order: 4, sets: [ { reps: 10, weight: undefined, restSec: 120 }, { reps: 10, weight: undefined, restSec: 120 }, { reps: 10, weight: undefined, restSec: 120 } ] },
          { exerciseId: exerciseIds['Seated Hamstring Curl'], order: 5, sets: [ { reps: 12, weight: undefined, restSec: 90 }, { reps: 12, weight: undefined, restSec: 90 }, { reps: 12, weight: undefined, restSec: 90 } ] },
          { exerciseId: exerciseIds['Standing Calf Raise'], order: 6, sets: [ { reps: 20, weight: undefined, restSec: 60 }, { reps: 18, weight: undefined, restSec: 60 }, { reps: 15, weight: undefined, restSec: 60 } ] },
          { exerciseId: exerciseIds['Glute Ham Raise'], order: 7, sets: [ { reps: 15, weight: undefined, restSec: 60 }, { reps: 12, weight: undefined, restSec: 60 }, { reps: 10, weight: undefined, restSec: 60 } ] },
        ],
        createdAt: now,
      },
      {
        name: 'PERFECT PPL WORKOUT: LEGS 2',
        description: 'Updated legs workout with gifs',
        bodyPart: 'legs',
        variation: 'ppl2',
        items: [
          { exerciseId: exerciseIds['Reverse Hyper'], order: 1, sets: [ { reps: 15, weight: undefined, restSec: 60 }, { reps: 15, weight: undefined, restSec: 60 } ] },
          { exerciseId: exerciseIds['Trap Bar Deadlift'], order: 2, sets: [ { reps: 5, weight: undefined, restSec: 150 }, { reps: 5, weight: undefined, restSec: 150 }, { reps: 5, weight: undefined, restSec: 150 } ] },
          { exerciseId: exerciseIds['Front Squat'], order: 3, sets: [ { reps: 8, weight: undefined, restSec: 150 }, { reps: 7, weight: undefined, restSec: 150 }, { reps: 6, weight: undefined, restSec: 150 } ] },
          { exerciseId: exerciseIds['Dumbbell Reverse Lunge'], order: 4, sets: [ { reps: 10, weight: undefined, restSec: 120 }, { reps: 10, weight: undefined, restSec: 120 }, { reps: 10, weight: undefined, restSec: 120 } ] },
          { exerciseId: exerciseIds['Seated Hamstring Curl'], order: 5, sets: [ { reps: 12, weight: undefined, restSec: 90 }, { reps: 12, weight: undefined, restSec: 90 }, { reps: 12, weight: undefined, restSec: 90 } ] },
          { exerciseId: exerciseIds['Standing Calf Raise'], order: 6, sets: [ { reps: 20, weight: undefined, restSec: 60 }, { reps: 18, weight: undefined, restSec: 60 }, { reps: 15, weight: undefined, restSec: 60 } ] },
          { exerciseId: exerciseIds['Glute Ham Raise'], order: 7, sets: [ { reps: 15, weight: undefined, restSec: 60 }, { reps: 12, weight: undefined, restSec: 60 }, { reps: 10, weight: undefined, restSec: 60 } ] },
        ],
        createdAt: now,
      },
    ];

    const existingTemplates = await ctx.db.query('templates').collect();
    const existingNames = new Set(existingTemplates.map(t => t.name));
    for (const t of templates) {
      if (!existingNames.has(t.name)) {
        await ctx.db.insert('templates', t);
      }
    }

    const allLegs = await ctx.db
      .query('templates')
      .withIndex('by_body_part', q => q.eq('bodyPart', 'legs'))
      .collect();
    const ppl2 = allLegs.find(t => t.variation === 'ppl2' || t.name === 'Legs PPL 2' || t.name === 'PERFECT PPL WORKOUT: LEGS 2');
    if (ppl2) {
      await ctx.db.patch(ppl2._id, {
        name: 'PERFECT PPL WORKOUT: LEGS 2',
        description: 'Updated legs workout with gifs',
        variation: 'ppl2',
        items: templates.find(t => t.variation === 'ppl2')!.items,
      });
    }

    return true;
  },
});


export const replaceLegsPpl2WithGifs = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const requiredExercises: Array<{
      name: string;
      bodyPart: string;
      isWeighted: boolean;
      equipment: 'barbell' | 'dumbbell' | 'machine' | 'kettlebell' | 'cable' | 'bodyweight';
      loadingMode: 'bar' | 'pair' | 'single';
      gifUrl: string;
      description?: string;
    }> = [
      {
        name: 'Reverse Hyper',
        bodyPart: 'back',
        isWeighted: true,
        equipment: 'machine',
        loadingMode: 'bar',
        gifUrl: 'https://gifrun.blob.core.windows.net/temp/31e154c3d58247a495e3ba260d0dd07b.gif',
      },
      {
        name: 'Trap Bar Deadlift',
        bodyPart: 'legs',
        isWeighted: true,
        equipment: 'barbell',
        loadingMode: 'bar',
        gifUrl: 'https://gifrun.blob.core.windows.net/temp/f0be73631edf4e2f90ca8e20dd430c31.gif',
      },
      {
        name: 'Front Squat',
        bodyPart: 'legs',
        isWeighted: true,
        equipment: 'barbell',
        loadingMode: 'bar',
        gifUrl: 'https://gifrun.blob.core.windows.net/temp/5d11b2ca3b244bb99c507ec281ac4af6.gif',
        description: 'Use ~80% 1RM',
      },
      {
        name: 'Dumbbell Reverse Lunge',
        bodyPart: 'legs',
        isWeighted: true,
        equipment: 'dumbbell',
        loadingMode: 'pair',
        gifUrl: 'https://gifrun.blob.core.windows.net/temp/e6b1b1ff125c41d2bc77be360702060f.gif',
      },
      {
        name: 'Seated Hamstring Curl',
        bodyPart: 'legs',
        isWeighted: true,
        equipment: 'machine',
        loadingMode: 'bar',
        gifUrl: 'https://gifrun.blob.core.windows.net/temp/b3ba88705e56460eb943a6242a24e834.gif',
        description: 'Slow eccentric; to failure by 12 reps',
      },
      {
        name: 'Standing Calf Raise',
        bodyPart: 'legs',
        isWeighted: true,
        equipment: 'machine',
        loadingMode: 'bar',
        gifUrl: 'https://gifrun.blob.core.windows.net/temp/bc95aa4259bc42eb936ad39f5f49e296.gif',
      },
      {
        name: 'Glute Ham Raise',
        bodyPart: 'legs',
        isWeighted: false,
        equipment: 'bodyweight',
        loadingMode: 'bar',
        gifUrl: 'https://gifrun.blob.core.windows.net/temp/1a3e4613ddab466584520b63fd529962.gif',
        description: 'To failure',
      },
    ];

    const exerciseIds: Record<string, any> = {};
    for (const ex of requiredExercises) {
      const existing = await ctx.db
        .query('exercises')
        .withIndex('by_name', q => q.eq('name', ex.name))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, {
          gifUrl: ex.gifUrl,
          description: ex.description,
          bodyPart: ex.bodyPart,
          isWeighted: ex.isWeighted,
          equipment: ex.equipment,
          loadingMode: ex.loadingMode,
        });
        exerciseIds[ex.name] = existing._id;
      } else {
        const insertedId = await ctx.db.insert('exercises', { ...ex, createdAt: now });
        exerciseIds[ex.name] = insertedId;
      }
    }

    const items = [
      {
        exerciseId: exerciseIds['Reverse Hyper'],
        order: 1,
        sets: [
          { reps: 15, weight: undefined, restSec: 60 },
          { reps: 15, weight: undefined, restSec: 60 },
        ],
      },
      {
        exerciseId: exerciseIds['Trap Bar Deadlift'],
        order: 2,
        sets: [
          { reps: 5, weight: undefined, restSec: 150 },
          { reps: 5, weight: undefined, restSec: 150 },
          { reps: 5, weight: undefined, restSec: 150 },
        ],
      },
      {
        exerciseId: exerciseIds['Front Squat'],
        order: 3,
        sets: [
          { reps: 8, weight: undefined, restSec: 150 },
          { reps: 7, weight: undefined, restSec: 150 },
          { reps: 6, weight: undefined, restSec: 150 },
        ],
      },
      {
        exerciseId: exerciseIds['Dumbbell Reverse Lunge'],
        order: 4,
        sets: [
          { reps: 10, weight: undefined, restSec: 120 },
          { reps: 10, weight: undefined, restSec: 120 },
          { reps: 10, weight: undefined, restSec: 120 },
        ],
      },
      {
        exerciseId: exerciseIds['Seated Hamstring Curl'],
        order: 5,
        sets: [
          { reps: 12, weight: undefined, restSec: 90 },
          { reps: 12, weight: undefined, restSec: 90 },
          { reps: 12, weight: undefined, restSec: 90 },
        ],
      },
      {
        exerciseId: exerciseIds['Standing Calf Raise'],
        order: 6,
        sets: [
          { reps: 20, weight: undefined, restSec: 60 },
          { reps: 18, weight: undefined, restSec: 60 },
          { reps: 15, weight: undefined, restSec: 60 },
        ],
      },
      {
        exerciseId: exerciseIds['Glute Ham Raise'],
        order: 7,
        sets: [
          { reps: 15, weight: undefined, restSec: 60 },
          { reps: 12, weight: undefined, restSec: 60 },
          { reps: 10, weight: undefined, restSec: 60 },
        ],
      },
    ];

    const legsTemplates = await ctx.db
      .query('templates')
      .withIndex('by_body_part', q => q.eq('bodyPart', 'legs'))
      .collect();

    const existing = legsTemplates.find(
      t => t.variation === 'ppl2' || t.name === 'Legs PPL 2' || t.name === 'PERFECT PPL WORKOUT: LEGS 2'
    );

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: 'PERFECT PPL WORKOUT: LEGS 2',
        description: 'Updated legs workout with gifs',
        variation: 'ppl2',
        items,
      });
      return true;
    }

    await ctx.db.insert('templates', {
      name: 'PERFECT PPL WORKOUT: LEGS 2',
      description: 'Updated legs workout with gifs',
      bodyPart: 'legs',
      variation: 'ppl2',
      items,
      createdAt: now,
    });

    return true;
  },
});

