import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { computeNextPlannedWeight } from '../utils/workoutProgression';
async function resolveUserId(ctx: any, provided?: string) {
  if (provided) return provided;
  const identity = await ctx.auth.getUserIdentity?.();
  if (!identity?.subject) return undefined;
  const existing = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q: any) => q.eq('clerkUserId', identity.subject))
    .first();
  if (existing) return existing._id;
  const now = Date.now();
  const newId = await ctx.db.insert('users', {
    clerkUserId: identity.subject,
    displayName: identity.name ?? undefined,
    createdAt: now,
  });
  return newId;
}

async function resolveExistingUserId(ctx: any, provided?: string) {
  if (provided) return provided;
  const identity = await ctx.auth.getUserIdentity?.();
  if (!identity?.subject) return undefined;
  const existing = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q: any) => q.eq('clerkUserId', identity.subject))
    .first();
  return existing?._id;
}

async function getLatestAssessment(ctx: any, exerciseId: any, userId?: any, anonKey?: string) {
  if (userId) {
    return await ctx.db
      .query('assessments')
      .withIndex('by_user_exercise_created', (q: any) => q.eq('userId', userId).eq('exerciseId', exerciseId))
      .order('desc')
      .first();
  }
  if (anonKey) {
    return await ctx.db
      .query('assessments')
      .withIndex('by_anon_exercise_created', (q: any) => q.eq('anonKey', anonKey).eq('exerciseId', exerciseId))
      .order('desc')
      .first();
  }
  return null;
}

async function getRecentSessions(ctx: any, userId?: any, anonKey?: string) {
  const sessions: any[] = [];
  if (userId) {
    const userSessions = await ctx.db
      .query('sessions')
      .withIndex('by_user_started', (q: any) => q.eq('userId', userId))
      .order('desc')
      .take(25);
    sessions.push(...userSessions);
  }
  if (anonKey) {
    const anonSessions = await ctx.db
      .query('sessions')
      .withIndex('by_anon_started', (q: any) => q.eq('anonKey', anonKey))
      .order('desc')
      .take(25);
    sessions.push(...anonSessions);
  }
  return sessions.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
}

export const recordAssessment = mutation({
  args: {
    userId: v.optional(v.id('users')),
    anonKey: v.optional(v.string()),
    exerciseId: v.id('exercises'),
    type: v.union(v.literal('1rm'), v.literal('working')),
    value: v.number(),
    unit: v.union(v.literal('kg'), v.literal('lbs')),
  },
  handler: async (ctx, { userId, anonKey, exerciseId, type, value, unit }) => {
    const resolvedUserForAssessment = userId ?? (await resolveUserId(ctx as any));
    await ctx.db.insert('assessments', {
      userId: resolvedUserForAssessment,
      anonKey,
      exerciseId,
      type,
      value,
      unit,
      createdAt: Date.now(),
    });
    return true;
  },
});

export const getLatestAssessments = query({
  args: { userId: v.optional(v.id('users')), anonKey: v.optional(v.string()), exerciseIds: v.array(v.id('exercises')) },
  handler: async (ctx, { userId, anonKey, exerciseIds }) => {
    const result: Record<string, any> = {};
    let effectiveUserId = userId;
    if (!effectiveUserId && !anonKey) {
      effectiveUserId = await resolveUserId(ctx as any);
    }
    for (const exId of exerciseIds) {
      const latest = await getLatestAssessment(ctx as any, exId, effectiveUserId, anonKey);
      if (latest) {
        result[exId] = latest;
      }
    }
    return result;
  },
});
export const getSession = query({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db.get(sessionId);
  },
});

export const getLatestActiveSession = query({
  args: { userId: v.optional(v.id('users')), anonKey: v.optional(v.string()) },
  handler: async (ctx, { userId, anonKey }) => {
    let effectiveUserId = userId;
    if (!effectiveUserId && !anonKey) {
      effectiveUserId = await resolveUserId(ctx as any);
    }
    const sessions: any[] = [];
    if (effectiveUserId) {
      const userSession = await ctx.db
        .query('sessions')
        .withIndex('by_user_status_started', q => q.eq('userId', effectiveUserId).eq('status', 'active'))
        .order('desc')
        .first();
      if (userSession) sessions.push(userSession);
    }
    if (anonKey) {
      const anonSession = await ctx.db
        .query('sessions')
        .withIndex('by_anon_status_started', q => q.eq('anonKey', anonKey).eq('status', 'active'))
        .order('desc')
        .first();
      if (anonSession) sessions.push(anonSession);
    }
    const active = sessions.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0))[0];
    return active ?? null;
  },
});

export const startFromTemplate = mutation({
  args: { 
    templateId: v.id('templates'), 
    userId: v.optional(v.id('users')), 
    anonKey: v.optional(v.string()),
    plannedWeights: v.optional(v.record(v.string(), v.union(v.number(), v.array(v.number()))))
  },
  handler: async (ctx, { templateId, userId, anonKey, plannedWeights = {} }) => {
    const resolvedUserId = await resolveUserId(ctx, userId as any);
    const template = await ctx.db.get(templateId);
    if (!template) throw new Error('Template not found');
    const now = Date.now();
    const itemsWithNames = await Promise.all(
      template.items
        .sort((a: any, b: any) => a.order - b.order)
        .map(async (item: any) => {
          const ex = (await ctx.db.get(item.exerciseId)) as any;
          // Merge provided plannedWeights with progression profile next weights
          let plannedWeight = plannedWeights[item.exerciseId] as number | number[] | undefined;
          if (plannedWeight === undefined && resolvedUserId) {
            const prof = await ctx.db
              .query('progressionProfiles')
              .withIndex('by_user_exercise', (q: any) => q.eq('userId', resolvedUserId).eq('exerciseId', item.exerciseId))
              .first();
            if (prof?.nextPlannedWeightKg !== undefined) plannedWeight = prof.nextPlannedWeightKg;
          }
          return {
            exerciseId: item.exerciseId,
            exerciseName: (ex?.name as string) ?? '',
            equipment: ex?.equipment,
            loadingMode: ex?.loadingMode,
            loadBasis: (ex?.isWeighted === false ? 'bodyweight' : 'external') as 'external' | 'bodyweight',
            order: item.order,
            groupId: item.groupId,
            groupOrder: item.groupOrder,
            restSec: item.sets[0]?.restSec,
            rir: undefined,
            sets: item.sets.map((s: any, setIndex: number) => ({ 
              reps: s.reps, 
              weight: Array.isArray(plannedWeight) ? plannedWeight[setIndex] ?? s.weight : plannedWeight ?? s.weight, 
              done: false 
            })),
          };
        })
    );

    const session = {
      userId: resolvedUserId,
      anonKey,
      templateId,
      status: 'active' as const,
      startedAt: now,
      createdAt: now,
      exercises: itemsWithNames,
    };
    const sessionId = await ctx.db.insert('sessions', session);
    return { sessionId, session: { ...session, _id: sessionId } };
  },
});

export const markSetDone = mutation({
  args: { sessionId: v.id('sessions'), exerciseIndex: v.number(), setIndex: v.number(), reps: v.optional(v.number()), weight: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const s = await ctx.db.get(args.sessionId);
    if (!s) throw new Error('Session not found');
    const ex = s.exercises[args.exerciseIndex];
    if (!ex) throw new Error('Exercise not found');
    const st = ex.sets[args.setIndex];
    if (!st) throw new Error('Set not found');
    if (st.done) return true;
    st.done = true;
    st.completedAt = Date.now();
    if (args.reps !== undefined) st.completedReps = args.reps;
    if (args.weight !== undefined) st.completedWeight = args.weight;
    await ctx.db.patch(args.sessionId, { exercises: s.exercises });
    return true;
  },
});

export const updatePlannedWeight = mutation({
  args: {
    sessionId: v.id('sessions'),
    exerciseIndex: v.number(),
    fromSetIndex: v.optional(v.number()),
    weightKg: v.number(),
  },
  handler: async (ctx, { sessionId, exerciseIndex, fromSetIndex, weightKg }) => {
    const s = await ctx.db.get(sessionId);
    if (!s) throw new Error('Session not found');
    const ex = s.exercises[exerciseIndex];
    if (!ex) throw new Error('Exercise not found');
    const start = fromSetIndex ?? 0;
    for (let i = start; i < ex.sets.length; i++) {
      const st = ex.sets[i];
      if (st.done) continue;
      st.weight = weightKg;
    }
    await ctx.db.patch(sessionId, { exercises: s.exercises });
    return true;
  },
});

export const recordExerciseRIR = mutation({
  args: { sessionId: v.id('sessions'), exerciseIndex: v.number(), rir: v.number(), userId: v.optional(v.id('users')) },
  handler: async (ctx, { sessionId, exerciseIndex, rir, userId }) => {
    const s = await ctx.db.get(sessionId);
    if (!s) throw new Error('Session not found');
    const ex = s.exercises[exerciseIndex];
    if (!ex) throw new Error('Exercise not found');
    ex.rir = rir;

    // Determine lastCompletedWeightKg from the last working set with completedWeight or fallback to last set weight
    const completed = [...ex.sets].reverse().find(st => st.completedWeight !== undefined || st.weight !== undefined);
    const lastCompletedWeightKg = (completed?.completedWeight ?? completed?.weight) ?? undefined;

    // Ensure session has userId if available via identity
    if (!s.userId) {
      const newUserId = await resolveUserId(ctx, userId as any);
      if (newUserId) s.userId = newUserId as any;
    }
    await ctx.db.patch(sessionId, {
      userId: s.userId,
      exercises: s.exercises,
    });

    // Update progression profile
    const resolvedUserId = (userId as any) ?? s.userId ?? undefined;
    if (lastCompletedWeightKg !== undefined && resolvedUserId) {
      // Upsert by userId/exerciseId (avoid cross-user pooling)
      const profileQuery = ctx.db
        .query('progressionProfiles')
        .withIndex('by_user_exercise', q => q.eq('userId', resolvedUserId).eq('exerciseId', ex.exerciseId));
      const existing = await profileQuery.first();
      const now = Date.now();
      const exerciseMeta = (await ctx.db.get(ex.exerciseId)) as any;
      const nextPlannedWeightKg = computeNextPlannedWeight(lastCompletedWeightKg, rir, {
        loadingMode: exerciseMeta?.loadingMode ?? ex.loadingMode,
        roundingIncrementKg: exerciseMeta?.roundingIncrementKg,
      });
      if (existing) {
        await ctx.db.patch(existing._id, {
          lastCompletedWeightKg,
          lastRIR: rir,
          nextPlannedWeightKg,
          lastUpdatedAt: now,
        });
      } else {
        await ctx.db.insert('progressionProfiles', {
          userId: resolvedUserId,
          exerciseId: ex.exerciseId,
          categoryKey: undefined,
          lastCompletedWeightKg,
          lastRIR: rir,
          nextPlannedWeightKg,
          lastUpdatedAt: now,
        });
      }
    }

    return true;
  },
});

export const completeSession = mutation({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, { sessionId }) => {
    const s = await ctx.db.get(sessionId);
    if (!s) throw new Error('Session not found');
    if (s.status === 'completed') return true;
    const allSetsDone = s.exercises.every((ex: any) => ex.sets.every((set: any) => set.done));
    if (!allSetsDone) throw new Error('Cannot complete workout until all sets are saved');
    await ctx.db.patch(sessionId, {
      status: 'completed',
      completedAt: Date.now(),
    });
    return true;
  },
});

export const cancelSession = mutation({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, { sessionId }) => {
    const s = await ctx.db.get(sessionId);
    if (!s) return true;
    if (s.status !== 'active') return true;
    await ctx.db.delete(sessionId);
    return true;
  },
});

export const historyForUser = query({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query('sessions')
      .withIndex('by_user_started', q => q.eq('userId', userId))
      .collect();
  },
});


export const getProgressionsForExercises = query({
  args: { userId: v.optional(v.id('users')), exerciseIds: v.array(v.id('exercises')) },
  handler: async (ctx, { userId, exerciseIds }) => {
    const result: Record<string, any> = {};
    const effectiveUserId = userId ?? (await resolveUserId(ctx as any));
    if (!effectiveUserId) return result;
    for (const exId of exerciseIds) {
      const prof = await ctx.db
        .query('progressionProfiles')
        .withIndex('by_user_exercise', q => q.eq('userId', effectiveUserId).eq('exerciseId', exId))
        .first();
      if (prof) {
        result[exId] = prof;
      }
    }
    return result;
  },
});

async function getTemplateWithExercises(ctx: any, templateId: any) {
  const template = await ctx.db.get(templateId);
  if (!template) return null;
  const exerciseIds = Array.from(new Set<any>(template.items.map((item: any) => item.exerciseId)));
  const exercises = (await Promise.all(exerciseIds.map((id: any) => ctx.db.get(id)))).filter(Boolean);
  return { template, exercises };
}

export const getSetupBaseData = query({
  args: {
    templateId: v.id('templates'),
  },
  handler: async (ctx, { templateId }) => {
    return await getTemplateWithExercises(ctx as any, templateId);
  },
});

export const getSetupData = query({
  args: {
    templateId: v.id('templates'),
    userId: v.optional(v.id('users')),
    anonKey: v.optional(v.string()),
  },
  handler: async (ctx, { templateId, userId, anonKey }) => {
    const baseData = await getTemplateWithExercises(ctx as any, templateId);
    if (!baseData) return null;

    const { template, exercises } = baseData;
    const exerciseIds = Array.from(new Set<any>(template.items.map((item: any) => item.exerciseId)));
    const effectiveUserId = await resolveExistingUserId(ctx as any, userId as any);
    const progressions: Record<string, any> = {};
    const latestCompleted: Record<string, number> = {};
    const latestAssessments: Record<string, any> = {};

    if (effectiveUserId) {
      const profiles = await Promise.all(exerciseIds.map(async (exId: any) => {
        const prof = await ctx.db
          .query('progressionProfiles')
          .withIndex('by_user_exercise', (q: any) => q.eq('userId', effectiveUserId).eq('exerciseId', exId))
          .first();
        return { exId, prof };
      }));
      for (const { exId, prof } of profiles) {
        if (prof) {
          progressions[exId] = prof;
          if (prof.lastCompletedWeightKg !== undefined) latestCompleted[exId] = prof.lastCompletedWeightKg;
        }
      }
    }

    const missingLatest = exerciseIds.some((exId: any) => latestCompleted[exId] === undefined);
    const sessions = missingLatest ? await getRecentSessions(ctx as any, effectiveUserId, anonKey) : [];

    for (const exId of exerciseIds) {
      if (latestCompleted[exId] !== undefined) continue;
      for (const session of sessions) {
        const exercise = session.exercises?.find((ex: any) => ex.exerciseId === exId);
        if (!exercise) continue;
        const completedSet = [...exercise.sets]
          .reverse()
          .find((set: any) => set.completedWeight !== undefined || set.weight !== undefined);
        const value = completedSet?.completedWeight ?? completedSet?.weight;
        if (value !== undefined) {
          latestCompleted[exId] = value;
          break;
        }
      }
    }

    const assessments = await Promise.all(exerciseIds.map(async (exId: any) => ({
      exId,
      latest: await getLatestAssessment(ctx as any, exId, effectiveUserId, anonKey),
    })));
    for (const { exId, latest } of assessments) {
      if (latest) latestAssessments[exId] = latest;
    }

    return {
      template,
      exercises,
      progressions,
      latestCompleted,
      latestAssessments,
    };
  },
});

export const getLatestCompletedWeights = query({
  args: { userId: v.optional(v.id('users')), anonKey: v.optional(v.string()), exerciseIds: v.array(v.id('exercises')) },
  handler: async (ctx, { userId, anonKey, exerciseIds }) => {
    const result: Record<string, number> = {};
    const effectiveUserId = userId ?? (await resolveUserId(ctx as any));

    if (effectiveUserId) {
      for (const exId of exerciseIds) {
        const prof = await ctx.db
          .query('progressionProfiles')
          .withIndex('by_user_exercise', q => q.eq('userId', effectiveUserId).eq('exerciseId', exId))
          .first();
        if (prof?.lastCompletedWeightKg !== undefined) {
          result[exId] = prof.lastCompletedWeightKg;
        }
      }
    }

    const missingLatest = exerciseIds.some((exId: any) => result[exId] === undefined);
    const sessions = missingLatest ? await getRecentSessions(ctx as any, effectiveUserId, anonKey) : [];

    for (const exId of exerciseIds) {
      if (result[exId] !== undefined) continue;
      for (const s of sessions) {
        const ex = (s.exercises || []).find((e: any) => e.exerciseId === exId);
        if (!ex) continue;
        const st = [...(ex.sets || [])].reverse().find((st: any) => st.completedWeight !== undefined || st.weight !== undefined);
        const w = (st?.completedWeight ?? st?.weight) as number | undefined;
        if (w !== undefined) {
          result[exId] = w;
          break;
        }
      }
    }

    return result;
  },
});


