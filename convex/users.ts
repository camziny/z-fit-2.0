import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const getOrCreate = mutation({
  args: {
    clerkUserId: v.string(),
    displayName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkUserId', args.clerkUserId))
      .first();
    if (existing) {
      const patch: { displayName?: string; imageUrl?: string } = {};
      if (args.displayName !== undefined && args.displayName !== existing.displayName) {
        patch.displayName = args.displayName;
      }
      if (args.imageUrl !== undefined && args.imageUrl !== existing.imageUrl) {
        patch.imageUrl = args.imageUrl;
      }
      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(existing._id, patch);
      }
      return existing._id;
    }
    const now = Date.now();
    return await ctx.db.insert('users', {
      clerkUserId: args.clerkUserId,
      displayName: args.displayName,
      imageUrl: args.imageUrl,
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


