import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { query } from './_generated/server';
import { getCurrentUser, requireGroupMembership } from './lib/auth';
import {
  computeActivityExercises,
  computeMetricDetail,
  computeMetricValue,
  countDoneSets,
  deriveWorkoutTitle,
  getCompletedSessions,
  resolveTimezoneOffsetMinutes,
  type LeaderboardMetric,
} from './lib/stats';

const metricValidator = v.union(
  v.literal('prsThisMonth'),
  v.literal('workoutsThisWeek'),
  v.literal('currentStreak')
);

const detailValidator = v.union(
  v.object({
    type: v.literal('prsThisMonth'),
    prs: v.array(
      v.object({
        exerciseName: v.string(),
        weight: v.number(),
        completedAt: v.number(),
        isPrimary: v.boolean(),
      })
    ),
  }),
  v.object({
    type: v.literal('workoutsThisWeek'),
    workouts: v.array(
      v.object({
        completedAt: v.number(),
        title: v.string(),
      })
    ),
  }),
  v.object({
    type: v.literal('currentStreak'),
    lastWorkoutAt: v.union(v.number(), v.null()),
    workedToday: v.boolean(),
  })
);

const leaderboardEntryValidator = v.object({
  userId: v.id('users'),
  displayName: v.string(),
  imageUrl: v.union(v.string(), v.null()),
  value: v.number(),
  rank: v.number(),
  isCurrentUser: v.boolean(),
  detail: detailValidator,
});

export const forGroup = query({
  args: {
    groupId: v.id('groups'),
    metric: metricValidator,
    periodStart: v.number(),
    timezoneOffsetMinutes: v.number(),
  },
  returns: v.array(leaderboardEntryValidator),
  handler: async (ctx, { groupId, metric, periodStart, timezoneOffsetMinutes }) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    await requireGroupMembership(ctx, groupId, user._id);

    const members = await ctx.db
      .query('groupMembers')
      .withIndex('by_group', (q) => q.eq('groupId', groupId))
      .collect();

    const memberSessions = await Promise.all(
      members.map(async (member) => ({
        member,
        sessions: await ctx.db
          .query('sessions')
          .withIndex('by_user_started', (q) => q.eq('userId', member.userId))
          .collect(),
        notificationSettings: await ctx.db
          .query('userNotificationSettings')
          .withIndex('by_user', (q) => q.eq('userId', member.userId))
          .unique(),
      }))
    );

    const templateIds = new Set<string>();
    for (const { sessions } of memberSessions) {
      for (const session of sessions) {
        if (session.templateId) {
          templateIds.add(String(session.templateId));
        }
      }
    }

    const templateNamesById = new Map<string, string>();
    for (const templateId of templateIds) {
      const template = await ctx.db.get(templateId as Id<'templates'>);
      if (template) {
        templateNamesById.set(String(template._id), template.name);
      }
    }

    const entries = memberSessions.map(({ member, sessions, notificationSettings }) => {
      const leaderboardMetric = metric as LeaderboardMetric;
      const memberTimezoneOffsetMinutes = resolveTimezoneOffsetMinutes(periodStart, {
        timezone: notificationSettings?.timezone,
        viewerTimezoneOffsetMinutes: timezoneOffsetMinutes,
        isViewer: member.userId === user._id,
      });

      return {
        userId: member.userId,
        joinedAt: member.joinedAt,
        value: computeMetricValue(
          sessions,
          leaderboardMetric,
          periodStart,
          memberTimezoneOffsetMinutes
        ),
        detail: computeMetricDetail(
          sessions,
          leaderboardMetric,
          periodStart,
          templateNamesById,
          memberTimezoneOffsetMinutes
        ),
      };
    });

    const entriesWithUsers = await Promise.all(
      entries.map(async (entry) => {
        const memberUser = await ctx.db.get(entry.userId);
        return {
          userId: entry.userId,
          displayName: memberUser?.displayName ?? 'Athlete',
          imageUrl: memberUser?.imageUrl ?? null,
          joinedAt: entry.joinedAt,
          value: entry.value,
          detail: entry.detail,
        };
      })
    );
    entriesWithUsers.sort((a, b) => {
      if (b.value !== a.value) {
        return b.value - a.value;
      }
      if (a.joinedAt !== b.joinedAt) {
        return a.joinedAt - b.joinedAt;
      }
      return a.displayName.localeCompare(b.displayName);
    });

    let rank = 0;
    let lastValue: number | null = null;

    return entriesWithUsers.map((entry, index) => {
      if (lastValue === null || entry.value !== lastValue) {
        rank = index + 1;
        lastValue = entry.value;
      }

      return {
        userId: entry.userId,
        displayName: entry.displayName,
        imageUrl: entry.imageUrl,
        value: entry.value,
        rank,
        isCurrentUser: entry.userId === user._id,
        detail: entry.detail,
      };
    });
  },
});

const activityItemValidator = v.object({
  sessionId: v.id('sessions'),
  userId: v.id('users'),
  displayName: v.string(),
  imageUrl: v.union(v.string(), v.null()),
  isCurrentUser: v.boolean(),
  completedAt: v.number(),
  title: v.string(),
  setCount: v.number(),
  exercises: v.array(
    v.object({
      exerciseName: v.string(),
      weight: v.number(),
      reps: v.number(),
      isPrimary: v.boolean(),
      weighted: v.boolean(),
    })
  ),
});

export const recentActivity = query({
  args: {
    groupId: v.id('groups'),
    limit: v.optional(v.number()),
  },
  returns: v.array(activityItemValidator),
  handler: async (ctx, { groupId, limit }) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    await requireGroupMembership(ctx, groupId, user._id);

    const members = await ctx.db
      .query('groupMembers')
      .withIndex('by_group', (q) => q.eq('groupId', groupId))
      .collect();

    const memberSessions = await Promise.all(
      members.map(async (member) => ({
        member,
        sessions: await ctx.db
          .query('sessions')
          .withIndex('by_user_started', (q) => q.eq('userId', member.userId))
          .collect(),
      }))
    );

    const userInfoById = new Map<string, { displayName: string; imageUrl: string | null }>();
    await Promise.all(
      members.map(async (member) => {
        const memberUser = await ctx.db.get(member.userId);
        userInfoById.set(String(member.userId), {
          displayName: memberUser?.displayName ?? 'Athlete',
          imageUrl: memberUser?.imageUrl ?? null,
        });
      })
    );

    const templateIds = new Set<string>();
    for (const { sessions } of memberSessions) {
      for (const session of sessions) {
        if (session.templateId) {
          templateIds.add(String(session.templateId));
        }
      }
    }

    const templateNamesById = new Map<string, string>();
    for (const templateId of templateIds) {
      const template = await ctx.db.get(templateId as Id<'templates'>);
      if (template) {
        templateNamesById.set(String(template._id), template.name);
      }
    }

    const items = memberSessions.flatMap(({ member, sessions }) => {
      const info = userInfoById.get(String(member.userId));
      return getCompletedSessions(sessions).map((session) => ({
        sessionId: session._id,
        userId: member.userId,
        displayName: info?.displayName ?? 'Athlete',
        imageUrl: info?.imageUrl ?? null,
        isCurrentUser: member.userId === user._id,
        completedAt: session.completedAt ?? 0,
        title: deriveWorkoutTitle(session, templateNamesById),
        setCount: countDoneSets(session),
        exercises: computeActivityExercises(session),
      }));
    });

    items.sort((a, b) => b.completedAt - a.completedAt);

    return items.slice(0, limit ?? 12);
  },
});
