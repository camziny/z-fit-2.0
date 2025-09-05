import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
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
      const items = await ctx.db
        .query('assessments')
        .withIndex('by_exercise_created', q => q.eq('exerciseId', exId))
        .collect();
      let filtered = items;
      if (effectiveUserId) filtered = filtered.filter(i => i.userId && i.userId === effectiveUserId);
      else if (anonKey) filtered = filtered.filter(i => i.anonKey && i.anonKey === anonKey);
      const latest = filtered.reduce((acc, cur) => (acc && acc.createdAt > cur.createdAt ? acc : cur), undefined as any);
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

export const startFromTemplate = mutation({
  args: { 
    templateId: v.id('templates'), 
    userId: v.optional(v.id('users')), 
    anonKey: v.optional(v.string()),
    plannedWeights: v.optional(v.record(v.string(), v.number()))
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
          const ex = await ctx.db.get(item.exerciseId);
          // Merge provided plannedWeights with progression profile next weights
          let plannedWeight = plannedWeights[item.exerciseId] as number | undefined;
          if (plannedWeight === undefined && resolvedUserId) {
            const prof = await ctx.db
              .query('progressionProfiles')
              .withIndex('by_user_exercise', (q: any) => q.eq('userId', resolvedUserId).eq('exerciseId', item.exerciseId))
              .first();
            if (prof?.nextPlannedWeightKg !== undefined) plannedWeight = prof.nextPlannedWeightKg;
          }
          return {
            exerciseId: item.exerciseId,
            exerciseName: ex?.name ?? '',
            equipment: ex?.equipment,
            loadingMode: ex?.loadingMode,
            loadBasis: (ex?.isWeighted === false) ? 'bodyweight' : 'external',
            order: item.order,
            groupId: item.groupId,
            groupOrder: item.groupOrder,
            restSec: item.sets[0]?.restSec,
            rir: undefined,
            sets: item.sets.map((s: any) => ({ 
              reps: s.reps, 
              weight: plannedWeight || s.weight, 
              done: false 
            })),
          };
        })
    );

    const sessionId = await ctx.db.insert('sessions', {
      userId: resolvedUserId,
      anonKey,
      templateId,
      status: 'active',
      startedAt: now,
      createdAt: now,
      exercises: itemsWithNames,
    });
    return sessionId;
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
    st.done = true;
    st.completedAt = Date.now();
    if (args.reps !== undefined) st.completedReps = args.reps;
    if (args.weight !== undefined) st.completedWeight = args.weight;
    await ctx.db.replace(args.sessionId, s);
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
    await ctx.db.replace(sessionId, s);

    // Update progression profile
    const resolvedUserId = (userId as any) ?? s.userId ?? undefined;
    if (lastCompletedWeightKg !== undefined && resolvedUserId) {
      // Upsert by userId/exerciseId (avoid cross-user pooling)
      const profileQuery = ctx.db
        .query('progressionProfiles')
        .withIndex('by_user_exercise', q => q.eq('userId', resolvedUserId).eq('exerciseId', ex.exerciseId));
      const existing = await profileQuery.first();
      const now = Date.now();
      const nextPlannedWeightKg = computeNextPlannedWeight(lastCompletedWeightKg, rir);
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

function computeNextPlannedWeight(lastCompletedWeightKg: number, rir: number): number {
  // Simple default rule; can be replaced with per-category/per-user settings later
  const bigInc = 5; // kg
  const smallInc = 2.5; // kg
  if (rir >= 4) return lastCompletedWeightKg + bigInc;
  if (rir >= 1) return lastCompletedWeightKg + smallInc;
  return lastCompletedWeightKg; // rir = 0 maintain
}

export const completeSession = mutation({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, { sessionId }) => {
    const s = await ctx.db.get(sessionId);
    if (!s) throw new Error('Session not found');
    s.status = 'completed';
    s.completedAt = Date.now();
    await ctx.db.replace(sessionId, s);
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

export const getLatestCompletedWeights = query({
  args: { userId: v.optional(v.id('users')), anonKey: v.optional(v.string()), exerciseIds: v.array(v.id('exercises')) },
  handler: async (ctx, { userId, anonKey, exerciseIds }) => {
    const result: Record<string, number> = {};
    const effectiveUserId = userId ?? (await resolveUserId(ctx as any));

    let sessions: any[] = [];
    if (effectiveUserId) {
      const userSessions = await ctx.db
        .query('sessions')
        .withIndex('by_user_started', q => q.eq('userId', effectiveUserId))
        .collect();
      sessions = sessions.concat(userSessions);
    }
    if (anonKey) {
      const anonSessions = await ctx.db
        .query('sessions')
        .withIndex('by_anon_started', q => q.eq('anonKey', anonKey))
        .collect();
      sessions = sessions.concat(anonSessions);
    }

    sessions.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));

    for (const exId of exerciseIds) {
      if (result[exId]) continue;
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


