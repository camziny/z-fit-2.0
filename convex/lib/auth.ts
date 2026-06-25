import type { MutationCtx, QueryCtx } from '../_generated/server';
import type { Doc, Id } from '../_generated/dataModel';

type AuthCtx = QueryCtx | MutationCtx;

export async function getCurrentUser(ctx: AuthCtx): Promise<Doc<'users'> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.subject) {
    return null;
  }

  return await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkUserId', identity.subject))
    .unique();
}

export async function ensureCurrentUser(ctx: MutationCtx): Promise<Doc<'users'>> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.subject) {
    throw new Error('Not authenticated');
  }

  const existing = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkUserId', identity.subject))
    .unique();

  if (existing) {
    return existing;
  }

  const now = Date.now();
  const userId = await ctx.db.insert('users', {
    clerkUserId: identity.subject,
    displayName: identity.name ?? undefined,
    createdAt: now,
  });

  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error('Failed to create user');
  }

  return user;
}

export async function requireGroupMembership(
  ctx: AuthCtx,
  groupId: Id<'groups'>,
  userId: Id<'users'>
): Promise<Doc<'groupMembers'>> {
  const membership = await ctx.db
    .query('groupMembers')
    .withIndex('by_group_and_user', (q) => q.eq('groupId', groupId).eq('userId', userId))
    .unique();

  if (!membership) {
    throw new Error('Not a member of this group');
  }

  return membership;
}
