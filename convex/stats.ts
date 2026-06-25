import { v } from 'convex/values';
import { query } from './_generated/server';
import { getCurrentUser } from './lib/auth';
import {
  computeCurrentStreak,
  computeWorkoutsInRange,
  computeWorkoutsPerDay,
  getCompletedSessions,
  getWeekRange,
} from './lib/stats';

const sessionValidator = v.object({
  _id: v.id('sessions'),
  status: v.union(v.literal('active'), v.literal('completed')),
  startedAt: v.number(),
  completedAt: v.optional(v.number()),
  exercises: v.array(
    v.object({
      exerciseId: v.id('exercises'),
      exerciseName: v.string(),
      sets: v.array(
        v.object({
          reps: v.number(),
          done: v.boolean(),
          completedReps: v.optional(v.number()),
          completedWeight: v.optional(v.number()),
        })
      ),
    })
  ),
});

export const myOverview = query({
  args: {
    now: v.number(),
    timezoneOffsetMinutes: v.number(),
  },
  returns: v.object({
    thisWeekWorkouts: v.number(),
    totalWorkouts: v.number(),
    currentStreak: v.number(),
    workoutsPerDay: v.array(v.number()),
  }),
  handler: async (ctx, { now, timezoneOffsetMinutes }) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return {
        thisWeekWorkouts: 0,
        totalWorkouts: 0,
        currentStreak: 0,
        workoutsPerDay: Array.from({ length: 7 }, () => 0),
      };
    }

    const sessions = await ctx.db
      .query('sessions')
      .withIndex('by_user_started', (q) => q.eq('userId', user._id))
      .collect();

    const completed = getCompletedSessions(sessions);
    const weekRange = getWeekRange(now);

    return {
      thisWeekWorkouts: computeWorkoutsInRange(sessions, weekRange.startMs),
      totalWorkouts: completed.length,
      currentStreak: computeCurrentStreak(sessions, now, timezoneOffsetMinutes),
      workoutsPerDay: computeWorkoutsPerDay(sessions, now, timezoneOffsetMinutes),
    };
  },
});

export const myHistory = query({
  args: {},
  returns: v.array(sessionValidator),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    const sessions = await ctx.db
      .query('sessions')
      .withIndex('by_user_started', (q) => q.eq('userId', user._id))
      .collect();

    return sessions.map((session) => ({
      _id: session._id,
      status: session.status,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      exercises: session.exercises.map((exercise) => ({
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        sets: exercise.sets.map((set) => ({
          reps: set.reps,
          done: set.done,
          completedReps: set.completedReps,
          completedWeight: set.completedWeight,
        })),
      })),
    }));
  },
});
