import { mutation } from './_generated/server';

export const initializeApp = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    // Check if data already exists
    const existingExercises = await ctx.db.query('exercises').first();
    if (existingExercises) {
      return { message: 'Data already seeded' };
    }

    // Seed exercises organized by body part
    const exercises = [
      // Legs
      { name: 'Back Squat', bodyPart: 'legs', isWeighted: true, description: 'Primary compound movement for leg strength' },
      { name: 'Front Squat', bodyPart: 'legs', isWeighted: true, description: 'Quad-focused squat variation' },
      { name: 'Romanian Deadlift', bodyPart: 'legs', isWeighted: true, description: 'Hamstring and glute focused' },
      { name: 'Bulgarian Split Squat', bodyPart: 'legs', isWeighted: true, description: 'Unilateral leg strength' },
      { name: 'Walking Lunges', bodyPart: 'legs', isWeighted: true, description: 'Dynamic leg movement' },
      { name: 'Leg Press', bodyPart: 'legs', isWeighted: true, description: 'Machine-based leg strength' },
      
      // Chest
      { name: 'Bench Press', bodyPart: 'chest', isWeighted: true, description: 'Primary chest compound movement' },
      { name: 'Incline Dumbbell Press', bodyPart: 'chest', isWeighted: true, description: 'Upper chest focus' },
      { name: 'Push-ups', bodyPart: 'chest', isWeighted: false, description: 'Bodyweight chest exercise' },
      { name: 'Dips', bodyPart: 'chest', isWeighted: false, description: 'Bodyweight tricep and chest' },
      
      // Back
      { name: 'Pull-ups', bodyPart: 'back', isWeighted: false, description: 'Primary vertical pull' },
      { name: 'Bent-over Rows', bodyPart: 'back', isWeighted: true, description: 'Horizontal pulling movement' },
      { name: 'Lat Pulldowns', bodyPart: 'back', isWeighted: true, description: 'Machine-based vertical pull' },
      { name: 'T-Bar Rows', bodyPart: 'back', isWeighted: true, description: 'Thick grip rowing' },
      
      // Arms
      { name: 'Bicep Curls', bodyPart: 'arms', isWeighted: true, description: 'Bicep isolation' },
      { name: 'Tricep Dips', bodyPart: 'arms', isWeighted: false, description: 'Tricep bodyweight exercise' },
      { name: 'Close-grip Bench Press', bodyPart: 'arms', isWeighted: true, description: 'Tricep-focused pressing' },
      
      // Shoulders
      { name: 'Overhead Press', bodyPart: 'shoulders', isWeighted: true, description: 'Primary shoulder movement' },
      { name: 'Lateral Raises', bodyPart: 'shoulders', isWeighted: true, description: 'Side deltoid isolation' },
      { name: 'Pike Push-ups', bodyPart: 'shoulders', isWeighted: false, description: 'Bodyweight shoulder exercise' },
      
      // Core
      { name: 'Plank', bodyPart: 'core', isWeighted: false, description: 'Core stability hold' },
      { name: 'Dead Bug', bodyPart: 'core', isWeighted: false, description: 'Core stability and control' },
      { name: 'Russian Twists', bodyPart: 'core', isWeighted: false, description: 'Rotational core strength' },
    ];

    // Insert exercises
    const exerciseIds: Record<string, any> = {};
    for (const exercise of exercises) {
      const id = await ctx.db.insert('exercises', { ...exercise, createdAt: now });
      exerciseIds[exercise.name] = id;
    }

    // Seed workout templates
    const templates = [
      // Leg Templates
      {
        name: 'Legs 1 - Squat Focus',
        description: 'Back squat primary with accessories',
        bodyPart: 'legs',
        variation: 'squat-focus',
        items: [
          {
            exerciseId: exerciseIds['Back Squat'],
            order: 1,
            sets: [
              { reps: 10, weight: undefined, restSec: 120 },
              { reps: 8, weight: undefined, restSec: 120 },
              { reps: 6, weight: undefined, restSec: 150 },
              { reps: 4, weight: undefined, restSec: 150 },
              { reps: 4, weight: undefined, restSec: 150 },
            ],
          },
          {
            exerciseId: exerciseIds['Romanian Deadlift'],
            order: 2,
            sets: [
              { reps: 12, weight: undefined, restSec: 90 },
              { reps: 10, weight: undefined, restSec: 90 },
              { reps: 8, weight: undefined, restSec: 90 },
            ],
          },
          {
            exerciseId: exerciseIds['Walking Lunges'],
            order: 3,
            sets: [
              { reps: 20, weight: undefined, restSec: 60 },
              { reps: 20, weight: undefined, restSec: 60 },
            ],
          },
        ],
      },
      {
        name: 'Legs 2 - Front Squat Focus',
        description: 'Front squat primary with unilateral work',
        bodyPart: 'legs',
        variation: 'front-squat-focus',
        items: [
          {
            exerciseId: exerciseIds['Front Squat'],
            order: 1,
            sets: [
              { reps: 8, weight: undefined, restSec: 120 },
              { reps: 6, weight: undefined, restSec: 120 },
              { reps: 5, weight: undefined, restSec: 150 },
              { reps: 5, weight: undefined, restSec: 150 },
            ],
          },
          {
            exerciseId: exerciseIds['Bulgarian Split Squat'],
            order: 2,
            sets: [
              { reps: 12, weight: undefined, restSec: 90 },
              { reps: 10, weight: undefined, restSec: 90 },
              { reps: 8, weight: undefined, restSec: 90 },
            ],
          },
        ],
      },
      // Chest Templates
      {
        name: 'Chest 1 - Bench Focus',
        description: 'Bench press primary with accessories',
        bodyPart: 'chest',
        variation: 'bench-focus',
        items: [
          {
            exerciseId: exerciseIds['Bench Press'],
            order: 1,
            sets: [
              { reps: 8, weight: undefined, restSec: 150 },
              { reps: 6, weight: undefined, restSec: 150 },
              { reps: 5, weight: undefined, restSec: 180 },
              { reps: 5, weight: undefined, restSec: 180 },
            ],
          },
          {
            exerciseId: exerciseIds['Incline Dumbbell Press'],
            order: 2,
            sets: [
              { reps: 10, weight: undefined, restSec: 90 },
              { reps: 8, weight: undefined, restSec: 90 },
              { reps: 6, weight: undefined, restSec: 90 },
            ],
          },
          {
            exerciseId: exerciseIds['Push-ups'],
            order: 3,
            sets: [
              { reps: 15, weight: undefined, restSec: 60 },
              { reps: 12, weight: undefined, restSec: 60 },
              { reps: 10, weight: undefined, restSec: 60 },
            ],
          },
        ],
      },
    ];

    // Insert templates
    for (const template of templates) {
      await ctx.db.insert('templates', { ...template, createdAt: now });
    }

    return { 
      message: 'Successfully seeded data',
      exercises: exercises.length,
      templates: templates.length,
    };
  },
});

export const clearAllData = mutation({
  args: {},
  handler: async (ctx) => {
    // Clear in reverse dependency order
    const sessions = await ctx.db.query('sessions').collect();
    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }
    
    const templates = await ctx.db.query('templates').collect();
    for (const template of templates) {
      await ctx.db.delete(template._id);
    }
    
    const exercises = await ctx.db.query('exercises').collect();
    for (const exercise of exercises) {
      await ctx.db.delete(exercise._id);
    }
    
    const users = await ctx.db.query('users').collect();
    for (const user of users) {
      await ctx.db.delete(user._id);
    }

    return { message: 'All data cleared successfully' };
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
      { exerciseId: exerciseIds['Reverse Hyper'], order: 1, sets: [ { reps: 15, weight: undefined, restSec: 60 }, { reps: 15, weight: undefined, restSec: 60 } ] },
      { exerciseId: exerciseIds['Trap Bar Deadlift'], order: 2, sets: [ { reps: 5, weight: undefined, restSec: 150 }, { reps: 5, weight: undefined, restSec: 150 }, { reps: 5, weight: undefined, restSec: 150 } ] },
      { exerciseId: exerciseIds['Front Squat'], order: 3, sets: [ { reps: 8, weight: undefined, restSec: 150 }, { reps: 7, weight: undefined, restSec: 150 }, { reps: 6, weight: undefined, restSec: 150 } ] },
      { exerciseId: exerciseIds['Dumbbell Reverse Lunge'], order: 4, sets: [ { reps: 10, weight: undefined, restSec: 120 }, { reps: 10, weight: undefined, restSec: 120 }, { reps: 10, weight: undefined, restSec: 120 } ] },
      { exerciseId: exerciseIds['Seated Hamstring Curl'], order: 5, sets: [ { reps: 12, weight: undefined, restSec: 90 }, { reps: 12, weight: undefined, restSec: 90 }, { reps: 12, weight: undefined, restSec: 90 } ] },
      { exerciseId: exerciseIds['Standing Calf Raise'], order: 6, sets: [ { reps: 20, weight: undefined, restSec: 60 }, { reps: 18, weight: undefined, restSec: 60 }, { reps: 15, weight: undefined, restSec: 60 } ] },
      { exerciseId: exerciseIds['Glute Ham Raise'], order: 7, sets: [ { reps: 15, weight: undefined, restSec: 60 }, { reps: 12, weight: undefined, restSec: 60 }, { reps: 10, weight: undefined, restSec: 60 } ] },
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



