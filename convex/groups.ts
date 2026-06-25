import { v } from 'convex/values';
import { internal } from './_generated/api';
import { mutation, query } from './_generated/server';
import { ensureCurrentUser, getCurrentUser, requireGroupMembership } from './lib/auth';

const groupSummaryValidator = v.object({
  _id: v.id('groups'),
  name: v.string(),
  memberCount: v.number(),
  role: v.union(v.literal('owner'), v.literal('member')),
  createdAt: v.number(),
});

const pendingInviteValidator = v.object({
  _id: v.id('groupInvitations'),
  groupId: v.id('groups'),
  groupName: v.string(),
  invitedByName: v.string(),
  createdAt: v.number(),
});

const searchResultValidator = v.object({
  userId: v.id('users'),
  displayName: v.string(),
});

const sentInviteValidator = v.object({
  _id: v.id('groupInvitations'),
  displayName: v.string(),
  createdAt: v.number(),
});

export const create = mutation({
  args: { name: v.string() },
  returns: v.object({
    groupId: v.id('groups'),
  }),
  handler: async (ctx, { name }) => {
    const user = await ensureCurrentUser(ctx);
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      throw new Error('Group name must be at least 2 characters');
    }

    const now = Date.now();
    const groupId = await ctx.db.insert('groups', {
      name: trimmedName,
      createdByUserId: user._id,
      createdAt: now,
    });

    await ctx.db.insert('groupMembers', {
      groupId,
      userId: user._id,
      role: 'owner',
      joinedAt: now,
    });

    return { groupId };
  },
});

export const searchUsersForInvite = query({
  args: {
    groupId: v.id('groups'),
    query: v.string(),
  },
  returns: v.array(searchResultValidator),
  handler: async (ctx, { groupId, query: searchQuery }) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    await requireGroupMembership(ctx, groupId, user._id);

    const trimmedQuery = searchQuery.trim().toLowerCase();
    if (trimmedQuery.length < 2) {
      return [];
    }

    const members = await ctx.db
      .query('groupMembers')
      .withIndex('by_group', (q) => q.eq('groupId', groupId))
      .collect();
    const memberIds = new Set(members.map((member) => String(member.userId)));

    const pendingInvites = await ctx.db
      .query('groupInvitations')
      .withIndex('by_group_status', (q) => q.eq('groupId', groupId).eq('status', 'pending'))
      .collect();
    const pendingUserIds = new Set(pendingInvites.map((invite) => String(invite.invitedUserId)));

    const allUsers = await ctx.db.query('users').collect();

    return allUsers
      .filter((candidate) => {
        if (String(candidate._id) === String(user._id)) {
          return false;
        }
        if (memberIds.has(String(candidate._id))) {
          return false;
        }
        if (pendingUserIds.has(String(candidate._id))) {
          return false;
        }
        const displayName = (candidate.displayName ?? 'Athlete').toLowerCase();
        return displayName.includes(trimmedQuery);
      })
      .slice(0, 8)
      .map((candidate) => ({
        userId: candidate._id,
        displayName: candidate.displayName ?? 'Athlete',
      }));
  },
});

export const sendInvite = mutation({
  args: {
    groupId: v.id('groups'),
    userId: v.id('users'),
  },
  returns: v.id('groupInvitations'),
  handler: async (ctx, { groupId, userId }) => {
    const user = await ensureCurrentUser(ctx);
    await requireGroupMembership(ctx, groupId, user._id);

    if (userId === user._id) {
      throw new Error('You cannot invite yourself');
    }

    const invitedUser = await ctx.db.get(userId);
    if (!invitedUser) {
      throw new Error('User not found');
    }

    const existingMembership = await ctx.db
      .query('groupMembers')
      .withIndex('by_group_and_user', (q) => q.eq('groupId', groupId).eq('userId', userId))
      .first();
    if (existingMembership) {
      throw new Error('User is already in this group');
    }

    const existingInvite = await ctx.db
      .query('groupInvitations')
      .withIndex('by_group_and_invited_user', (q) => q.eq('groupId', groupId).eq('invitedUserId', userId))
      .first();

    if (existingInvite?.status === 'pending') {
      throw new Error('Invite already pending');
    }

    const now = Date.now();
    let inviteId;

    if (existingInvite) {
      await ctx.db.patch(existingInvite._id, {
        invitedByUserId: user._id,
        status: 'pending',
        createdAt: now,
        respondedAt: undefined,
      });
      inviteId = existingInvite._id;
    } else {
      inviteId = await ctx.db.insert('groupInvitations', {
        groupId,
        invitedUserId: userId,
        invitedByUserId: user._id,
        status: 'pending',
        createdAt: now,
      });
    }

    await ctx.scheduler.runAfter(0, internal.notifications.notifyGroupInvite, {
      invitationId: inviteId,
    });

    return inviteId;
  },
});

export const listMyPendingInvites = query({
  args: {},
  returns: v.array(pendingInviteValidator),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    const invites = await ctx.db
      .query('groupInvitations')
      .withIndex('by_invited_user_status', (q) => q.eq('invitedUserId', user._id).eq('status', 'pending'))
      .collect();

    const details = await Promise.all(
      invites.map(async (invite) => {
        const group = await ctx.db.get(invite.groupId);
        const inviter = await ctx.db.get(invite.invitedByUserId);
        if (!group) {
          return null;
        }

        return {
          _id: invite._id,
          groupId: invite.groupId,
          groupName: group.name,
          invitedByName: inviter?.displayName ?? 'Someone',
          createdAt: invite.createdAt,
        };
      })
    );

    return details
      .filter((invite): invite is NonNullable<typeof invite> => invite !== null)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const listPendingInvitesForGroup = query({
  args: { groupId: v.id('groups') },
  returns: v.array(sentInviteValidator),
  handler: async (ctx, { groupId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    await requireGroupMembership(ctx, groupId, user._id);

    const invites = await ctx.db
      .query('groupInvitations')
      .withIndex('by_group_status', (q) => q.eq('groupId', groupId).eq('status', 'pending'))
      .collect();

    const details = await Promise.all(
      invites.map(async (invite) => {
        const invitedUser = await ctx.db.get(invite.invitedUserId);
        return {
          _id: invite._id,
          displayName: invitedUser?.displayName ?? 'Athlete',
          createdAt: invite.createdAt,
        };
      })
    );

    return details.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const acceptInvite = mutation({
  args: { invitationId: v.id('groupInvitations') },
  returns: v.id('groups'),
  handler: async (ctx, { invitationId }) => {
    const user = await ensureCurrentUser(ctx);
    const invite = await ctx.db.get(invitationId);

    if (!invite || invite.invitedUserId !== user._id) {
      throw new Error('Invitation not found');
    }
    if (invite.status !== 'pending') {
      throw new Error('Invitation is no longer pending');
    }

    const existingMembership = await ctx.db
      .query('groupMembers')
      .withIndex('by_group_and_user', (q) => q.eq('groupId', invite.groupId).eq('userId', user._id))
      .first();

    if (!existingMembership) {
      await ctx.db.insert('groupMembers', {
        groupId: invite.groupId,
        userId: user._id,
        role: 'member',
        joinedAt: Date.now(),
      });
    }

    await ctx.db.patch(invitationId, {
      status: 'accepted',
      respondedAt: Date.now(),
    });

    return invite.groupId;
  },
});

export const declineInvite = mutation({
  args: { invitationId: v.id('groupInvitations') },
  returns: v.null(),
  handler: async (ctx, { invitationId }) => {
    const user = await ensureCurrentUser(ctx);
    const invite = await ctx.db.get(invitationId);

    if (!invite || invite.invitedUserId !== user._id) {
      throw new Error('Invitation not found');
    }
    if (invite.status !== 'pending') {
      throw new Error('Invitation is no longer pending');
    }

    await ctx.db.patch(invitationId, {
      status: 'declined',
      respondedAt: Date.now(),
    });

    return null;
  },
});

export const leave = mutation({
  args: { groupId: v.id('groups') },
  returns: v.null(),
  handler: async (ctx, { groupId }) => {
    const user = await ensureCurrentUser(ctx);
    const membership = await requireGroupMembership(ctx, groupId, user._id);

    const members = await ctx.db
      .query('groupMembers')
      .withIndex('by_group', (q) => q.eq('groupId', groupId))
      .collect();

    if (members.length <= 1) {
      const pendingInvites = await ctx.db
        .query('groupInvitations')
        .withIndex('by_group_status', (q) => q.eq('groupId', groupId).eq('status', 'pending'))
        .collect();
      for (const invite of pendingInvites) {
        await ctx.db.delete(invite._id);
      }
      for (const member of members) {
        await ctx.db.delete(member._id);
      }
      await ctx.db.delete(groupId);
      return null;
    }

    await ctx.db.delete(membership._id);

    if (membership.role === 'owner') {
      const remainingMembers = members
        .filter((member) => member._id !== membership._id)
        .sort((a, b) => a.joinedAt - b.joinedAt);
      const nextOwner = remainingMembers[0];
      if (nextOwner) {
        await ctx.db.patch(nextOwner._id, { role: 'owner' });
      }
    }

    return null;
  },
});

export const listMine = query({
  args: {},
  returns: v.array(groupSummaryValidator),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    const memberships = await ctx.db
      .query('groupMembers')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    const groups = await Promise.all(
      memberships.map(async (membership) => {
        const group = await ctx.db.get(membership.groupId);
        if (!group) {
          return null;
        }

        const memberCount = (
          await ctx.db
            .query('groupMembers')
            .withIndex('by_group', (q) => q.eq('groupId', group._id))
            .collect()
        ).length;

        return {
          _id: group._id,
          name: group.name,
          memberCount,
          role: membership.role,
          createdAt: group.createdAt,
        };
      })
    );

    return groups
      .filter((group): group is NonNullable<typeof group> => group !== null)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getGroup = query({
  args: { groupId: v.id('groups') },
  returns: v.union(
    v.object({
      _id: v.id('groups'),
      name: v.string(),
      memberCount: v.number(),
      role: v.union(v.literal('owner'), v.literal('member')),
      createdAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, { groupId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return null;
    }

    const membership = await ctx.db
      .query('groupMembers')
      .withIndex('by_group_and_user', (q) => q.eq('groupId', groupId).eq('userId', user._id))
      .first();

    if (!membership) {
      return null;
    }

    const group = await ctx.db.get(groupId);
    if (!group) {
      return null;
    }

    const memberCount = (
      await ctx.db
        .query('groupMembers')
        .withIndex('by_group', (q) => q.eq('groupId', groupId))
        .collect()
    ).length;

    return {
      _id: group._id,
      name: group.name,
      memberCount,
      role: membership.role,
      createdAt: group.createdAt,
    };
  },
});

export const getMembers = query({
  args: { groupId: v.id('groups') },
  returns: v.array(
    v.object({
      userId: v.id('users'),
      displayName: v.string(),
      role: v.union(v.literal('owner'), v.literal('member')),
      joinedAt: v.number(),
    })
  ),
  handler: async (ctx, { groupId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    await requireGroupMembership(ctx, groupId, user._id);

    const members = await ctx.db
      .query('groupMembers')
      .withIndex('by_group', (q) => q.eq('groupId', groupId))
      .collect();

    const memberDetails = await Promise.all(
      members.map(async (member) => {
        const memberUser = await ctx.db.get(member.userId);
        return {
          userId: member.userId,
          displayName: memberUser?.displayName ?? 'Athlete',
          role: member.role,
          joinedAt: member.joinedAt,
        };
      })
    );

    return memberDetails.sort((a, b) => a.joinedAt - b.joinedAt);
  },
});
