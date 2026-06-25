import { v } from 'convex/values';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { internalMutation, mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import { ensureCurrentUser, getCurrentUser } from './lib/auth';
import { computeMetricValue } from './lib/stats';

const WORKOUT_NOTIFY_DEBOUNCE_MS = 30 * 60 * 1000;
const WEEKLY_RECAP_HOUR = 19;
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

const settingsValidator = v.object({
  notifyOnGroupWorkout: v.boolean(),
  notifyWeeklyRecap: v.boolean(),
  timezone: v.optional(v.string()),
  hasPushToken: v.boolean(),
});

async function getSettingsForUser(ctx: QueryCtx, userId: Id<'users'>) {
  return await ctx.db
    .query('userNotificationSettings')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .first();
}

async function getOrCreateSettings(ctx: MutationCtx, userId: Id<'users'>) {
  const existing = await ctx.db
    .query('userNotificationSettings')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .first();

  if (existing) {
    return existing;
  }

  const settingsId = await ctx.db.insert('userNotificationSettings', {
    userId,
    notifyOnGroupWorkout: true,
    notifyWeeklyRecap: true,
    timezone: undefined,
    expoPushToken: undefined,
    lastWeeklyRecapSentAt: undefined,
  });

  return await ctx.db.get(settingsId);
}

export const getSettings = query({
  args: {},
  returns: settingsValidator,
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return {
        notifyOnGroupWorkout: true,
        notifyWeeklyRecap: true,
        timezone: undefined,
        hasPushToken: false,
      };
    }

    const settings = await getSettingsForUser(ctx, user._id);

    return {
      notifyOnGroupWorkout: settings?.notifyOnGroupWorkout ?? true,
      notifyWeeklyRecap: settings?.notifyWeeklyRecap ?? true,
      timezone: settings?.timezone,
      hasPushToken: Boolean(settings?.expoPushToken),
    };
  },
});

export const registerPushToken = mutation({
  args: {
    expoPushToken: v.string(),
    timezone: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { expoPushToken, timezone }) => {
    const user = await ensureCurrentUser(ctx);
    const settings = await getOrCreateSettings(ctx, user._id);

    if (settings) {
      await ctx.db.patch(settings._id, {
        expoPushToken,
        timezone: timezone ?? settings.timezone,
      });
    }

    return null;
  },
});

export const updateNotificationPrefs = mutation({
  args: {
    notifyOnGroupWorkout: v.optional(v.boolean()),
    notifyWeeklyRecap: v.optional(v.boolean()),
    timezone: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ensureCurrentUser(ctx);
    const settings = await getOrCreateSettings(ctx, user._id);

    if (!settings) {
      throw new Error('Notification settings not found');
    }

    const updates: Record<string, boolean | string | undefined> = {};
    if (args.notifyOnGroupWorkout !== undefined) {
      updates.notifyOnGroupWorkout = args.notifyOnGroupWorkout;
    }
    if (args.notifyWeeklyRecap !== undefined) {
      updates.notifyWeeklyRecap = args.notifyWeeklyRecap;
    }
    if (args.timezone !== undefined) {
      updates.timezone = args.timezone;
    }

    await ctx.db.patch(settings._id, updates);
    return null;
  },
});

export const notifyGroupInvite = internalMutation({
  args: { invitationId: v.id('groupInvitations') },
  returns: v.null(),
  handler: async (ctx, { invitationId }) => {
    const invite = await ctx.db.get(invitationId);
    if (!invite || invite.status !== 'pending') {
      return null;
    }

    const group = await ctx.db.get(invite.groupId);
    const inviter = await ctx.db.get(invite.invitedByUserId);
    if (!group) {
      return null;
    }

    const settings = await ctx.db
      .query('userNotificationSettings')
      .withIndex('by_user', (q) => q.eq('userId', invite.invitedUserId))
      .first();

    if (!settings?.expoPushToken) {
      return null;
    }

    const inviterName = inviter?.displayName ?? 'Someone';

    await ctx.scheduler.runAfter(0, internal.notificationsActions.sendPush, {
      tokens: [settings.expoPushToken],
      title: 'Group invitation',
      body: `${inviterName} invited you to join ${group.name}`,
      data: { type: 'group_invite', invitationId },
    });

    return null;
  },
});

export const notifyGroupWorkout = internalMutation({
  args: {
    userId: v.id('users'),
    sessionId: v.id('sessions'),
  },
  returns: v.null(),
  handler: async (ctx, { userId, sessionId }) => {
    const session = await ctx.db.get(sessionId);
    if (!session || session.status !== 'completed' || !session.completedAt) {
      return null;
    }

    const recentSessions = await ctx.db
      .query('sessions')
      .withIndex('by_user_started', (q) => q.eq('userId', userId))
      .order('desc')
      .take(5);

    const recentCompleted = recentSessions.filter(
      (item) =>
        item.status === 'completed' &&
        item._id !== sessionId &&
        item.completedAt !== undefined &&
        session.completedAt !== undefined &&
        session.completedAt - item.completedAt < WORKOUT_NOTIFY_DEBOUNCE_MS
    );

    if (recentCompleted.length > 0) {
      return null;
    }

    const actor = await ctx.db.get(userId);
    const actorName = actor?.displayName ?? 'Someone';
    const template = session.templateId ? await ctx.db.get(session.templateId) : null;
    const workoutLabel = template?.name ?? `${session.exercises.length} exercises`;

    const memberships = await ctx.db
      .query('groupMembers')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();

    const groupIds = new Set(memberships.map((membership) => membership.groupId));
    const recipientTokens: string[] = [];

    for (const groupId of groupIds) {
      const members = await ctx.db
        .query('groupMembers')
        .withIndex('by_group', (q) => q.eq('groupId', groupId))
        .collect();

      for (const member of members) {
        if (member.userId === userId) {
          continue;
        }

        const settings = await ctx.db
          .query('userNotificationSettings')
          .withIndex('by_user', (q) => q.eq('userId', member.userId))
          .first();

        if (!settings?.expoPushToken || !settings.notifyOnGroupWorkout) {
          continue;
        }

        recipientTokens.push(settings.expoPushToken);
      }
    }

    const uniqueTokens = [...new Set(recipientTokens)];
    if (uniqueTokens.length === 0) {
      return null;
    }

    await ctx.scheduler.runAfter(0, internal.notificationsActions.sendPush, {
      tokens: uniqueTokens,
      title: `${actorName} finished a workout`,
      body: workoutLabel,
      data: { type: 'group_workout', sessionId },
    });

    return null;
  },
});

export const sendWeeklyRecaps = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const allSettings = await ctx.db.query('userNotificationSettings').collect();

    for (const settings of allSettings) {
      if (!settings.notifyWeeklyRecap || !settings.expoPushToken) {
        continue;
      }

      const timezone = settings.timezone ?? 'UTC';
      const localParts = getLocalDateParts(now, timezone);
      if (localParts.weekday !== 0 || localParts.hour !== WEEKLY_RECAP_HOUR) {
        continue;
      }

      if (
        settings.lastWeeklyRecapSentAt !== undefined &&
        now - settings.lastWeeklyRecapSentAt < MS_PER_WEEK - 60 * 60 * 1000
      ) {
        continue;
      }

      const memberships = await ctx.db
        .query('groupMembers')
        .withIndex('by_user', (q) => q.eq('userId', settings.userId))
        .collect();

      if (memberships.length === 0) {
        continue;
      }

      const recapMessages: string[] = [];

      for (const membership of memberships) {
        const group = await ctx.db.get(membership.groupId);
        if (!group) {
          continue;
        }

        const members = await ctx.db
          .query('groupMembers')
          .withIndex('by_group', (q) => q.eq('groupId', group._id))
          .collect();

        const entries = await Promise.all(
          members.map(async (member) => {
            const memberUser = await ctx.db.get(member.userId);
            const sessions = await ctx.db
              .query('sessions')
              .withIndex('by_user_started', (q) => q.eq('userId', member.userId))
              .collect();

            return {
              displayName: memberUser?.displayName ?? 'Athlete',
              value: computeMetricValue(sessions, 'workoutsThisWeek', now),
            };
          })
        );

        entries.sort((a, b) => b.value - a.value);
        const leader = entries[0];
        if (!leader || leader.value <= 0) {
          recapMessages.push(`${group.name}: no workouts logged this week`);
        } else {
          recapMessages.push(
            `${group.name}: ${leader.displayName} leads with ${leader.value} workout${leader.value === 1 ? '' : 's'}`
          );
        }
      }

      if (recapMessages.length === 0) {
        continue;
      }

      await ctx.scheduler.runAfter(0, internal.notificationsActions.sendPush, {
        tokens: [settings.expoPushToken],
        title: 'Weekly group recap',
        body: recapMessages.join(' • '),
        data: { type: 'weekly_recap' },
      });

      await ctx.db.patch(settings._id, { lastWeeklyRecapSentAt: now });
    }

    return null;
  },
});

function getLocalDateParts(timestamp: number, timezone: string): { weekday: number; hour: number } {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
      hour: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date(timestamp));
    const weekdayLabel = parts.find((part) => part.type === 'weekday')?.value ?? 'Sun';
    const hourValue = Number(parts.find((part) => part.type === 'hour')?.value ?? '0');
    const weekdayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };

    return {
      weekday: weekdayMap[weekdayLabel] ?? 0,
      hour: Number.isNaN(hourValue) ? 0 : hourValue,
    };
  } catch {
    const date = new Date(timestamp);
    return { weekday: date.getUTCDay(), hour: date.getUTCHours() };
  }
}
