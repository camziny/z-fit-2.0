import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    displayName: v.optional(v.string()),
    createdAt: v.number(),
  }).index('by_clerk_id', ['clerkUserId']),

  exercises: defineTable({
    name: v.string(),
    bodyPart: v.string(),
    isWeighted: v.boolean(),
    gifUrl: v.optional(v.string()),
    description: v.optional(v.string()),
    equipment: v.optional(v.union(
      v.literal('barbell'),
      v.literal('dumbbell'),
      v.literal('machine'),
      v.literal('kettlebell'),
      v.literal('cable'),
      v.literal('bodyweight')
    )),
    loadingMode: v.optional(v.union(
      v.literal('bar'), 
      v.literal('pair'), 
      v.literal('single') 
    )),
    roundingIncrementKg: v.optional(v.number()),
    roundingIncrementLbs: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_body_part', ['bodyPart'])
    .index('by_name', ['name']),

  templates: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    bodyPart: v.string(),
    variation: v.optional(v.string()),
    items: v.array(
      v.object({
        exerciseId: v.id('exercises'),
        order: v.number(),
        sets: v.array(
          v.object({ reps: v.number(), weight: v.optional(v.number()), restSec: v.optional(v.number()) })
        ),
        groupId: v.optional(v.string()),
        groupOrder: v.optional(v.number()),
      })
    ),
    createdAt: v.number(),
  }).index('by_body_part', ['bodyPart']),

  sessions: defineTable({
    userId: v.optional(v.id('users')),
    anonKey: v.optional(v.string()),
    templateId: v.optional(v.id('templates')),
    status: v.union(v.literal('active'), v.literal('completed')),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    exercises: v.array(
      v.object({
        exerciseId: v.id('exercises'),
        exerciseName: v.string(),
        equipment: v.optional(v.union(
          v.literal('barbell'),
          v.literal('dumbbell'),
          v.literal('machine'),
          v.literal('kettlebell'),
          v.literal('cable'),
          v.literal('bodyweight')
        )),
        loadingMode: v.optional(v.union(
          v.literal('bar'),
          v.literal('pair'),
          v.literal('single')
        )),
        loadBasis: v.optional(v.union(
          v.literal('external'),
          v.literal('bodyweight'),
          v.literal('bodyweight_plus'),
          v.literal('assisted')
        )),
        order: v.number(),
        restSec: v.optional(v.number()),
        rir: v.optional(v.number()),
        groupId: v.optional(v.string()),
        groupOrder: v.optional(v.number()),
        sets: v.array(
          v.object({
            reps: v.number(),
            weight: v.optional(v.number()),
            done: v.boolean(),
            completedReps: v.optional(v.number()),
            completedWeight: v.optional(v.number()),
            completedAt: v.optional(v.number()),
          })
        ),
      })
    ),
    createdAt: v.number(),
  })
    .index('by_user_started', ['userId', 'startedAt'])
    .index('by_anon_started', ['anonKey', 'startedAt']),

  progressionProfiles: defineTable({
    userId: v.optional(v.id('users')),
    exerciseId: v.id('exercises'),
    categoryKey: v.optional(v.string()),
    lastCompletedWeightKg: v.optional(v.number()),
    lastRIR: v.optional(v.number()),
    nextPlannedWeightKg: v.optional(v.number()),
    lastUpdatedAt: v.number(),
  })
    .index('by_user_exercise', ['userId', 'exerciseId'])
    .index('by_exercise', ['exerciseId']),

  userProgressionSettings: defineTable({
    userId: v.id('users'),
    unit: v.union(v.literal('kg'), v.literal('lbs')),
    minIncrementKg: v.optional(v.number()),
    minIncrementLb: v.optional(v.number()),
    roundingMode: v.optional(v.union(v.literal('standard'), v.literal('nearestPlate'))),
    defaultsByCategory: v.optional(
      v.record(
        v.string(),
        v.object({ smallIncKg: v.number(), bigIncKg: v.number() })
      )
    ),
    answeredStepCategories: v.optional(v.array(v.string())),
    createdAt: v.number(),
  })
    .index('by_user', ['userId']),

  assessments: defineTable({
    userId: v.optional(v.id('users')),
    anonKey: v.optional(v.string()),
    exerciseId: v.id('exercises'),
    type: v.union(v.literal('1rm'), v.literal('working')),
    value: v.number(),
    unit: v.union(v.literal('kg'), v.literal('lbs')),
    createdAt: v.number(),
  })
    .index('by_user_created', ['userId', 'createdAt'])
    .index('by_exercise_created', ['exerciseId', 'createdAt'])
    .index('by_anon_created', ['anonKey', 'createdAt']),
});


