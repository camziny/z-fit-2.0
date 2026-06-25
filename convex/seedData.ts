import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { mutation, type MutationCtx } from './_generated/server';

const DEMO_GROUP_NAME = 'Weekend Warriors';
const DEMO_CLERK_PREFIX = 'seed_demo_';

type ExerciseSeed = {
  exerciseId: Id<'exercises'>;
  exerciseName: string;
  sets: Array<{ reps: number; weight: number }>;
};

function completedAtForDaysAgo(daysAgo: number, now: number): number {
  const date = new Date(now);
  date.setHours(18, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date.getTime();
}

async function insertCompletedWorkout(
  ctx: MutationCtx,
  userId: Id<'users'>,
  completedAt: number,
  durationMin: number,
  exercises: ExerciseSeed[],
  templateId?: Id<'templates'>
) {
  const startedAt = completedAt - durationMin * 60 * 1000;
  await ctx.db.insert('sessions', {
    userId,
    templateId,
    status: 'completed',
    startedAt,
    completedAt,
    exercises: exercises.map((exercise, index) => ({
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      order: index + 1,
      sets: exercise.sets.map((set) => ({
        reps: set.reps,
        weight: set.weight,
        done: true,
        completedReps: set.reps,
        completedWeight: set.weight,
        completedAt,
      })),
    })),
    createdAt: startedAt,
  });
}

async function getOrCreateSeedUser(
  ctx: MutationCtx,
  clerkUserId: string,
  displayName: string,
  now: number
): Promise<Id<'users'>> {
  const existing = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q: any) => q.eq('clerkUserId', clerkUserId))
    .first();
  if (existing) {
    return existing._id;
  }
  return await ctx.db.insert('users', {
    clerkUserId,
    displayName,
    createdAt: now,
  });
}

export const seedDemoGroup = mutation({
  args: {
    ownerMatch: v.string(),
    recreate: v.optional(v.boolean()),
  },
  returns: v.object({
    message: v.string(),
    groupId: v.id('groups'),
    ownerDisplayName: v.string(),
    members: v.array(v.string()),
  }),
  handler: async (ctx, { ownerMatch, recreate }) => {
    const now = Date.now();
    const needle = ownerMatch.trim().toLowerCase();

    const allUsers = await ctx.db.query('users').collect();
    const owner = allUsers.find((user) => {
      const displayName = (user.displayName ?? '').toLowerCase();
      const clerkId = user.clerkUserId.toLowerCase();
      return displayName.includes(needle) || clerkId.includes(needle);
    });

    if (!owner) {
      const available = allUsers
        .map((user) => user.displayName ?? user.clerkUserId)
        .join(', ');
      throw new Error(`No user matching "${ownerMatch}". Available: ${available || 'none'}`);
    }

    const ownerMemberships = await ctx.db
      .query('groupMembers')
      .withIndex('by_user', (q) => q.eq('userId', owner._id))
      .collect();

    for (const membership of ownerMemberships) {
      const group = await ctx.db.get(membership.groupId);
      if (group?.name !== DEMO_GROUP_NAME) {
        continue;
      }

      if (!recreate) {
        return {
          message: 'Demo group already exists',
          groupId: group._id,
          ownerDisplayName: owner.displayName ?? 'Athlete',
          members: ['You', 'Mike', 'Sarah', 'Jake'],
        };
      }

      const members = await ctx.db
        .query('groupMembers')
        .withIndex('by_group', (q) => q.eq('groupId', group._id))
        .collect();
      for (const member of members) {
        await ctx.db.delete(member._id);
      }

      const invites = await ctx.db
        .query('groupInvitations')
        .withIndex('by_group_status', (q) => q.eq('groupId', group._id).eq('status', 'pending'))
        .collect();
      for (const invite of invites) {
        await ctx.db.delete(invite._id);
      }

      await ctx.db.delete(group._id);
    }

    const exercises = await ctx.db.query('exercises').collect();
    if (exercises.length < 3) {
      throw new Error('Need at least 3 exercises in the database. Run seedData:initializeApp first.');
    }

    const benchPress = exercises.find((exercise) => exercise.name === 'Bench Press') ?? exercises[0];
    const backSquat = exercises.find((exercise) => exercise.name === 'Back Squat') ?? exercises[1];
    const pullUps = exercises.find((exercise) => exercise.name === 'Pull-ups') ?? exercises[2];
    const romanianDeadlift =
      exercises.find((exercise) => exercise.name === 'Romanian Deadlift') ?? exercises[1];
    const overheadPress =
      exercises.find((exercise) => exercise.name === 'Overhead Press') ?? exercises[0];
    const bentOverRows =
      exercises.find((exercise) => exercise.name === 'Bent-over Rows') ?? exercises[2];

    const allTemplates = await ctx.db.query('templates').collect();
    const legsTemplate =
      allTemplates.find((template) => template.name === 'Legs 1 - Squat Focus') ?? allTemplates[0];
    const chestTemplate =
      allTemplates.find((template) => template.name === 'Chest 1 - Bench Focus') ?? allTemplates[1];
    const frontSquatTemplate =
      allTemplates.find((template) => template.name === 'Legs 2 - Front Squat Focus') ?? legsTemplate;

    if (!legsTemplate || !chestTemplate) {
      throw new Error('Workout templates not found. Run seedData:initializeApp first.');
    }

    const mikeId = await getOrCreateSeedUser(ctx, `${DEMO_CLERK_PREFIX}mike`, 'Mike', now);
    const sarahId = await getOrCreateSeedUser(ctx, `${DEMO_CLERK_PREFIX}sarah`, 'Sarah', now);
    const jakeId = await getOrCreateSeedUser(ctx, `${DEMO_CLERK_PREFIX}jake`, 'Jake', now);

    const demoUserIds = [mikeId, sarahId, jakeId];
    for (const userId of demoUserIds) {
      const sessions = await ctx.db
        .query('sessions')
        .withIndex('by_user_started', (q) => q.eq('userId', userId))
        .collect();
      for (const session of sessions) {
        await ctx.db.delete(session._id);
      }
    }

    const groupId = await ctx.db.insert('groups', {
      name: DEMO_GROUP_NAME,
      createdByUserId: owner._id,
      createdAt: now,
    });

    await ctx.db.insert('groupMembers', {
      groupId,
      userId: owner._id,
      role: 'owner',
      joinedAt: now,
    });

    for (const memberId of demoUserIds) {
      await ctx.db.insert('groupMembers', {
        groupId,
        userId: memberId,
        role: 'member',
        joinedAt: now,
      });
    }

    const bench = (weight: number, count = 4) =>
      Array.from({ length: count }, () => ({ reps: 5, weight }));
    const squat = (weight: number, count = 3) =>
      Array.from({ length: count }, () => ({ reps: 8, weight }));
    const pull = (count = 3) =>
      Array.from({ length: count }, () => ({ reps: 8, weight: 0 }));

    const mikeWorkouts: Array<{
      daysAgo: number;
      durationMin: number;
      benchWeight: number;
      squatWeight: number;
      rdlWeight?: number;
      ohpWeight?: number;
      templateId: Id<'templates'>;
    }> = [
      { daysAgo: 22, durationMin: 52, benchWeight: 205, squatWeight: 245, rdlWeight: 225, templateId: legsTemplate._id },
      { daysAgo: 14, durationMin: 55, benchWeight: 225, squatWeight: 275, rdlWeight: 245, templateId: legsTemplate._id },
      { daysAgo: 7, durationMin: 58, benchWeight: 235, squatWeight: 295, rdlWeight: 255, templateId: frontSquatTemplate._id },
      { daysAgo: 3, durationMin: 60, benchWeight: 245, squatWeight: 315, rdlWeight: 275, ohpWeight: 115, templateId: legsTemplate._id },
      { daysAgo: 0, durationMin: 58, benchWeight: 255, squatWeight: 315, rdlWeight: 275, ohpWeight: 120, templateId: legsTemplate._id },
    ];

    for (const workout of mikeWorkouts) {
      const exercisesForWorkout: ExerciseSeed[] = [
        { exerciseId: benchPress._id, exerciseName: benchPress.name, sets: bench(workout.benchWeight, 4) },
        { exerciseId: backSquat._id, exerciseName: backSquat.name, sets: squat(workout.squatWeight, 4) },
        { exerciseId: pullUps._id, exerciseName: pullUps.name, sets: pull(3) },
      ];

      if (workout.rdlWeight !== undefined) {
        exercisesForWorkout.push({
          exerciseId: romanianDeadlift._id,
          exerciseName: romanianDeadlift.name,
          sets: squat(workout.rdlWeight, 3),
        });
      }

      if (workout.ohpWeight !== undefined) {
        exercisesForWorkout.push({
          exerciseId: overheadPress._id,
          exerciseName: overheadPress.name,
          sets: bench(workout.ohpWeight, 3),
        });
      }

      await insertCompletedWorkout(
        ctx,
        mikeId,
        completedAtForDaysAgo(workout.daysAgo, now),
        workout.durationMin,
        exercisesForWorkout,
        workout.templateId
      );
    }

    const sarahWorkouts: Array<{
      daysAgo: number;
      durationMin: number;
      benchWeight: number;
      squatWeight: number;
      rdlWeight?: number;
      templateId: Id<'templates'>;
    }> = [
      { daysAgo: 20, durationMin: 42, benchWeight: 135, squatWeight: 185, templateId: chestTemplate._id },
      { daysAgo: 12, durationMin: 44, benchWeight: 145, squatWeight: 205, templateId: legsTemplate._id },
      { daysAgo: 6, durationMin: 46, benchWeight: 155, squatWeight: 215, rdlWeight: 135, templateId: chestTemplate._id },
      { daysAgo: 4, durationMin: 45, benchWeight: 165, squatWeight: 225, rdlWeight: 155, templateId: legsTemplate._id },
      { daysAgo: 3, durationMin: 44, benchWeight: 155, squatWeight: 205, templateId: legsTemplate._id },
      { daysAgo: 2, durationMin: 48, benchWeight: 155, squatWeight: 205, templateId: legsTemplate._id },
      { daysAgo: 1, durationMin: 42, benchWeight: 155, squatWeight: 205, templateId: legsTemplate._id },
      { daysAgo: 0, durationMin: 45, benchWeight: 165, squatWeight: 225, rdlWeight: 165, templateId: legsTemplate._id },
    ];

    for (const workout of sarahWorkouts) {
      const exercisesForWorkout: ExerciseSeed[] = [
        { exerciseId: benchPress._id, exerciseName: benchPress.name, sets: bench(workout.benchWeight, 4) },
        { exerciseId: backSquat._id, exerciseName: backSquat.name, sets: squat(workout.squatWeight, 3) },
      ];

      if (workout.rdlWeight !== undefined) {
        exercisesForWorkout.push({
          exerciseId: romanianDeadlift._id,
          exerciseName: romanianDeadlift.name,
          sets: squat(workout.rdlWeight, 3),
        });
      }

      await insertCompletedWorkout(
        ctx,
        sarahId,
        completedAtForDaysAgo(workout.daysAgo, now),
        workout.durationMin,
        exercisesForWorkout,
        workout.templateId
      );
    }

    const jakeWorkouts: Array<{
      daysAgo: number;
      durationMin: number;
      squatWeight: number;
      rowWeight?: number;
      templateId: Id<'templates'>;
    }> = [
      { daysAgo: 12, durationMin: 38, squatWeight: 205, templateId: legsTemplate._id },
      { daysAgo: 5, durationMin: 35, squatWeight: 225, rowWeight: 155, templateId: legsTemplate._id },
      { daysAgo: 1, durationMin: 40, squatWeight: 245, rowWeight: 165, templateId: frontSquatTemplate._id },
    ];

    for (const workout of jakeWorkouts) {
      const exercisesForWorkout: ExerciseSeed[] = [
        { exerciseId: backSquat._id, exerciseName: backSquat.name, sets: squat(workout.squatWeight, 3) },
        { exerciseId: pullUps._id, exerciseName: pullUps.name, sets: pull(4) },
      ];

      if (workout.rowWeight !== undefined) {
        exercisesForWorkout.push({
          exerciseId: bentOverRows._id,
          exerciseName: bentOverRows.name,
          sets: bench(workout.rowWeight, 3),
        });
      }

      await insertCompletedWorkout(
        ctx,
        jakeId,
        completedAtForDaysAgo(workout.daysAgo, now),
        workout.durationMin,
        exercisesForWorkout,
        workout.templateId
      );
    }

    const ownerWorkouts: Array<{
      daysAgo: number;
      durationMin: number;
      benchWeight: number;
      squatWeight: number;
      rowWeight?: number;
      templateId: Id<'templates'>;
    }> = [
      { daysAgo: 18, durationMin: 45, benchWeight: 185, squatWeight: 225, templateId: legsTemplate._id },
      { daysAgo: 10, durationMin: 48, benchWeight: 205, squatWeight: 245, rowWeight: 155, templateId: chestTemplate._id },
      { daysAgo: 3, durationMin: 52, benchWeight: 215, squatWeight: 255, rowWeight: 165, templateId: legsTemplate._id },
      { daysAgo: 1, durationMin: 48, benchWeight: 205, squatWeight: 245, templateId: chestTemplate._id },
      { daysAgo: 0, durationMin: 50, benchWeight: 225, squatWeight: 275, templateId: chestTemplate._id },
    ];

    for (const workout of ownerWorkouts) {
      const exercisesForWorkout: ExerciseSeed[] = [
        { exerciseId: benchPress._id, exerciseName: benchPress.name, sets: bench(workout.benchWeight, 4) },
        { exerciseId: backSquat._id, exerciseName: backSquat.name, sets: squat(workout.squatWeight, 3) },
      ];

      if (workout.rowWeight !== undefined) {
        exercisesForWorkout.push({
          exerciseId: bentOverRows._id,
          exerciseName: bentOverRows.name,
          sets: bench(workout.rowWeight, 3),
        });
      }

      await insertCompletedWorkout(
        ctx,
        owner._id,
        completedAtForDaysAgo(workout.daysAgo, now),
        workout.durationMin,
        exercisesForWorkout,
        workout.templateId
      );
    }

    return {
      message: 'Demo group seeded with workout history',
      groupId,
      ownerDisplayName: owner.displayName ?? 'Athlete',
      members: [owner.displayName ?? 'You', 'Mike', 'Sarah', 'Jake'],
    };
  },
});

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



