import { v } from 'convex/values';
import { action, mutation, query } from './_generated/server';

function decodeBase64(base64: string): Uint8Array {
  const normalized = base64.includes(',') ? base64.split(',').pop() || '' : base64;
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function resolveExerciseMedia(ctx: any, exercise: any) {
  const gifFromStorage = exercise.mediaGifStorageId
    ? await ctx.storage.getUrl(exercise.mediaGifStorageId)
    : null;
  const mp4FromStorage = exercise.mediaMp4StorageId
    ? await ctx.storage.getUrl(exercise.mediaMp4StorageId)
    : null;
  return {
    exerciseId: exercise._id,
    name: exercise.name,
    gifUrl: exercise.gifUrl,
    mediaGifUrl: gifFromStorage ?? exercise.mediaGifUrl,
    mediaMp4Url: mp4FromStorage ?? exercise.mediaMp4Url,
    mediaGifStorageId: exercise.mediaGifStorageId,
    mediaMp4StorageId: exercise.mediaMp4StorageId,
    mediaSource: exercise.mediaSource,
  };
}

export const listExerciseMedia = query({
  args: {},
  handler: async (ctx) => {
    const exercises = await ctx.db.query('exercises').collect();
    return await Promise.all(exercises.map((exercise: any) => resolveExerciseMedia(ctx, exercise)));
  },
});

export const applyExerciseMediaManifest = mutation({
  args: {
    clips: v.array(
      v.object({
        exerciseName: v.string(),
        mediaGifUrl: v.optional(v.string()),
        mediaMp4Url: v.optional(v.string()),
        sourceProvider: v.optional(v.string()),
        youtubeUrl: v.optional(v.string()),
        sourceLabel: v.optional(v.string()),
        sourceStartSec: v.optional(v.number()),
        sourceEndSec: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, { clips }) => {
    let updated = 0;
    const missing: string[] = [];

    for (const clip of clips) {
      const exercise = await ctx.db
        .query('exercises')
        .withIndex('by_name', q => q.eq('name', clip.exerciseName))
        .first();

      if (!exercise) {
        missing.push(clip.exerciseName);
        continue;
      }

      await ctx.db.patch(exercise._id, {
        mediaGifUrl: clip.mediaGifUrl,
        mediaMp4Url: clip.mediaMp4Url,
        mediaSource: {
          provider: clip.sourceProvider,
          youtubeUrl: clip.youtubeUrl,
          sourceLabel: clip.sourceLabel,
          sourceStartSec: clip.sourceStartSec,
          sourceEndSec: clip.sourceEndSec,
        },
      });
      updated += 1;
    }

    return {
      total: clips.length,
      updated,
      missing,
    };
  },
});

export const getExerciseByName = query({
  args: {
    exerciseName: v.string(),
  },
  handler: async (ctx, { exerciseName }) => {
    return await ctx.db
      .query('exercises')
      .withIndex('by_name', q => q.eq('name', exerciseName))
      .first();
  },
});

export const attachExerciseMediaStorage = mutation({
  args: {
    exerciseId: v.id('exercises'),
    fileKind: v.union(v.literal('gif'), v.literal('mp4')),
    storageId: v.id('_storage'),
  },
  handler: async (ctx, { exerciseId, fileKind, storageId }) => {
    if (fileKind === 'gif') {
      await ctx.db.patch(exerciseId, { mediaGifStorageId: storageId });
    } else {
      await ctx.db.patch(exerciseId, { mediaMp4StorageId: storageId });
    }
    return true;
  },
});

export const uploadExerciseMediaFile = action({
  args: {
    exerciseName: v.string(),
    fileKind: v.union(v.literal('gif'), v.literal('mp4')),
    fileBase64: v.string(),
  },
  handler: async (ctx, { exerciseName, fileKind, fileBase64 }) => {
    const exercise = await ctx.runQuery('media:getExerciseByName' as any, { exerciseName });
    if (!exercise) {
      throw new Error(`Exercise not found: ${exerciseName}`);
    }
    const bytes = decodeBase64(fileBase64);
    const blob = new Blob([bytes], { type: fileKind === 'gif' ? 'image/gif' : 'video/mp4' });
    const storageId = await ctx.storage.store(blob);
    await ctx.runMutation('media:attachExerciseMediaStorage' as any, {
      exerciseId: exercise._id,
      fileKind,
      storageId,
    });
    const url = await ctx.storage.getUrl(storageId);
    return {
      exerciseId: exercise._id,
      exerciseName,
      fileKind,
      storageId,
      url,
    };
  },
});

export const setExerciseMediaSource = mutation({
  args: {
    exerciseName: v.string(),
    sourceProvider: v.optional(v.string()),
    youtubeUrl: v.optional(v.string()),
    sourceLabel: v.optional(v.string()),
    sourceStartSec: v.optional(v.number()),
    sourceEndSec: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const exercise = await ctx.db
      .query('exercises')
      .withIndex('by_name', q => q.eq('name', args.exerciseName))
      .first();
    if (!exercise) {
      throw new Error(`Exercise not found: ${args.exerciseName}`);
    }
    await ctx.db.patch(exercise._id, {
      mediaSource: {
        provider: args.sourceProvider ?? 'youtube',
        youtubeUrl: args.youtubeUrl,
        sourceLabel: args.sourceLabel,
        sourceStartSec: args.sourceStartSec,
        sourceEndSec: args.sourceEndSec,
      },
    });
    return true;
  },
});

export const clearStoredExerciseMediaReferences = mutation({
  args: {
    clearLegacyUrls: v.optional(v.boolean()),
  },
  handler: async (ctx, { clearLegacyUrls }) => {
    const exercises = await ctx.db.query('exercises').collect();
    let updated = 0;
    const affectedExerciseNames: string[] = [];
    for (const exercise of exercises) {
      const hasStorageRefs = !!exercise.mediaGifStorageId || !!exercise.mediaMp4StorageId;
      const hasLegacyMediaUrls =
        !!exercise.mediaGifUrl || !!exercise.mediaMp4Url || !!exercise.gifUrl;
      if (!hasStorageRefs && !(clearLegacyUrls && hasLegacyMediaUrls)) continue;
      await ctx.db.patch(exercise._id, {
        mediaGifStorageId: undefined,
        mediaMp4StorageId: undefined,
        mediaGifUrl: clearLegacyUrls ? undefined : exercise.mediaGifUrl,
        mediaMp4Url: clearLegacyUrls ? undefined : exercise.mediaMp4Url,
        gifUrl: clearLegacyUrls ? undefined : exercise.gifUrl,
      });
      updated += 1;
      affectedExerciseNames.push(exercise.name);
    }
    return {
      totalExercises: exercises.length,
      updated,
      affectedExerciseNames,
    };
  },
});

