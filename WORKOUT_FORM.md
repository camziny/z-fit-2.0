## Purpose

Concise, schema-driven guide for building a Next.js web form to add new workouts against the existing Convex backend. Focuses on data shapes, relationships, available queries/mutations, and validations. No technology recommendations.

## Data model overview

- **exercises**: master list of movements to reference in workouts
- **templates**: reusable workout definitions (what to do)
- **sessions**: actual workout instances (what was done)
- Progression/assessment tables support auto-planned weights and history

### exercises

Fields:

- name: string
- bodyPart: string
- isWeighted: boolean
- equipment?: 'barbell' | 'dumbbell' | 'machine' | 'kettlebell' | 'cable' | 'bodyweight'
- loadingMode?: 'bar' | 'pair' | 'single'
- roundingIncrementKg?: number
- roundingIncrementLbs?: number
- gifUrl?: string
- description?: string
- createdAt: number

Indices:

- by_body_part (bodyPart)
- by_name (name)

### templates

Represents a program/workout definition.

Fields:

- name: string
- description?: string
- bodyPart: string
- variation?: string
- items: Array of:
  - exerciseId: Id<'exercises'>
  - order: number
  - sets: Array of { reps: number; weight?: number; restSec?: number }
  - groupId?: string
  - groupOrder?: number
- createdAt: number

Index:

- by_body_part (bodyPart)

### sessions

Represents a started/completed instance of a workout (often derived from a template).

Fields:

- userId?: Id<'users'>
- anonKey?: string
- templateId?: Id<'templates'>
- status: 'active' | 'completed'
- startedAt: number
- completedAt?: number
- exercises: Array of:
  - exerciseId: Id<'exercises'>
  - exerciseName: string
  - equipment?: 'barbell' | 'dumbbell' | 'machine' | 'kettlebell' | 'cable' | 'bodyweight'
  - loadingMode?: 'bar' | 'pair' | 'single'
  - loadBasis?: 'external' | 'bodyweight' | 'bodyweight_plus' | 'assisted'
  - order: number
  - restSec?: number
  - rir?: number
  - groupId?: string
  - groupOrder?: number
  - sets: Array of {
    - reps: number
    - weight?: number
    - done: boolean
    - completedReps?: number
    - completedWeight?: number
    - completedAt?: number
      }
- createdAt: number

Indices:

- by_user_started (userId, startedAt)
- by_anon_started (anonKey, startedAt)

### progressionProfiles

Supports auto-planning weights when starting sessions.

Fields:

- userId?: Id<'users'>
- exerciseId: Id<'exercises'>
- categoryKey?: string
- lastCompletedWeightKg?: number
- lastRIR?: number
- nextPlannedWeightKg?: number
- lastUpdatedAt: number

Indices:

- by_user_exercise (userId, exerciseId)
- by_exercise (exerciseId)

### assessments

Stores user- or anonKey-scoped assessments (e.g., 1RM, working weight).

Fields:

- userId?: Id<'users'>
- anonKey?: string
- exerciseId: Id<'exercises'>
- type: '1rm' | 'working'
- value: number
- unit: 'kg' | 'lbs'
- createdAt: number

Indices:

- by_user_created (userId, createdAt)
- by_exercise_created (exerciseId, createdAt)
- by_anon_created (anonKey, createdAt)

## What a “workout” form can create

Two common flows based on the schema:

- **Authoring flow (create Template)**: Define a new reusable workout with ordered items and sets.
- **User flow (start Session)**: Start a concrete workout instance from an existing template, optionally providing planned weights.

Your web app can implement one or both. Data requirements below.

## Authoring flow: create Template

Collect these fields:

- name (required)
- bodyPart (required)
- description (optional)
- variation (optional)
- items[] (required): for each item
  - exerciseId (required; must reference existing exercise)
  - order (required; unique within template)
  - sets[] (required): for each set
    - reps (required, > 0)
    - weight (optional)
    - restSec (optional)
  - groupId (optional; to model supersets/paired sets)
  - groupOrder (optional; intra-group ordering)

Example payload shape:

```json
{
  "name": "Chest Push 3",
  "description": "Bench focus with accessories",
  "bodyPart": "chest",
  "variation": "push3",
  "items": [
    {
      "exerciseId": "exercises_abc123",
      "order": 1,
      "sets": [
        { "reps": 6, "restSec": 150 },
        { "reps": 6, "restSec": 150 },
        { "reps": 5, "restSec": 180 }
      ]
    },
    {
      "exerciseId": "exercises_def456",
      "order": 2,
      "groupId": "ss1",
      "groupOrder": 1,
      "sets": [
        { "reps": 12, "restSec": 60 },
        { "reps": 12, "restSec": 60 }
      ]
    },
    {
      "exerciseId": "exercises_ghi789",
      "order": 3,
      "groupId": "ss1",
      "groupOrder": 2,
      "sets": [
        { "reps": 12, "restSec": 60 },
        { "reps": 10, "restSec": 60 }
      ]
    }
  ]
}
```

Validations to enforce on submit:

- name, bodyPart present
- items non-empty
- each exerciseId exists in exercises
- order unique across items
- groupId consistency: all items with same groupId have distinct groupOrder values
- sets non-empty; each reps > 0; weight/restSec optional
- createdAt should be set server-side

Notes:

- Templates are currently global (no ownerId). If you need per-user templates, you would extend the schema.

## User flow: start Session from a Template

Use the existing mutation to start a session:

Arguments:

- templateId: Id<'templates'> (required)
- userId?: Id<'users'>
- anonKey?: string
- plannedWeights?: Record<string, number> mapping exerciseId -> weightKg

Behavior:

- Builds session.exercises from template.items, copying reps and restSec
- Derives exerciseName, equipment, loadingMode, and loadBasis from the exercise
- For each exercise, plannedWeights[exerciseId] is used if provided; otherwise, if a progressionProfiles record exists for the user/exercise, uses nextPlannedWeightKg; otherwise falls back to template set weight
- Sets are initialized with done=false

Example call shape:

```json
{
  "templateId": "templates_123",
  "plannedWeights": {
    "exercises_abc123": 80,
    "exercises_def456": 25
  }
}
```

Related mutations you may use later in the flow:

- update planned weight (kg) for future sets in-session
- mark set done with completed reps/weight
- record exercise RIR (updates progressionProfiles with nextPlannedWeightKg)
- complete session

## Queries/mutations available

Exercises:

- exercises.byBodyPart(bodyPart)
- exercises.getMultiple(exerciseIds[])

Templates:

- templates.byBodyPart(bodyPart)
- templates.getById(templateId)
  // Seed mutations exist but are hardcoded; not intended for user-generated content

Sessions:

- sessions.startFromTemplate({ templateId, userId?, anonKey?, plannedWeights? })
- sessions.getLatestActiveSession({ userId?, anonKey? })
- sessions.getSession(sessionId)
- sessions.updatePlannedWeight({ sessionId, exerciseIndex, fromSetIndex?, weightKg })
- sessions.markSetDone({ sessionId, exerciseIndex, setIndex, reps?, weight? })
- sessions.recordAssessment({ userId?, anonKey?, exerciseId, type, value, unit })
- sessions.getLatestAssessments({ userId?, anonKey?, exerciseIds[] })
- sessions.getLatestCompletedWeights({ userId?, anonKey?, exerciseIds[] })
- sessions.completeSession({ sessionId })

## Supersets / paired sets modeling

- Use groupId to denote a pairing/superset across multiple template items
- Use groupOrder to define intra-group sequence (1, 2, ...)
- order still defines the overall sequence through the workout

## Units and weight handling

- All server-side weight inputs in the session mutations are kilograms
- If the web form collects pounds, convert to kg before submit
- roundingIncrementKg/Lbs from exercises can inform UI hints, but are optional

## Identity and ownership

- Sessions can be associated with a userId or an anonKey
- If neither is provided and auth is available, userId may be resolved server-side
- Templates are global in current schema; add an owner field if per-user ownership is required

## Recommended new mutation for authoring

Add a server mutation to create templates that validates the payload above and inserts into templates, setting createdAt on the server.
