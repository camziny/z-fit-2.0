import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const getOrCreate = mutation({
  args: { clerkUserId: v.string(), displayName: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkUserId', args.clerkUserId))
      .first();
    if (existing) return existing._id;
    const now = Date.now();
    return await ctx.db.insert('users', {
      clerkUserId: args.clerkUserId,
      displayName: args.displayName,
      createdAt: now,
    });
  },
});

export const me = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkUserId', args.clerkUserId))
      .first();
  },
});


