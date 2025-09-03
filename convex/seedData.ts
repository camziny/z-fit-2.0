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

