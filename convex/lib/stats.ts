import type { Doc } from '../_generated/dataModel';

type SessionDoc = Doc<'sessions'>;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;
const MS_PER_MONTH = 30 * MS_PER_DAY;
const MS_PER_MINUTE = 60 * 1000;

function localDateKey(timestampMs: number, timezoneOffsetMinutes: number): string {
  const localMs = timestampMs - timezoneOffsetMinutes * MS_PER_MINUTE;
  const date = new Date(localMs);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function offsetMinutesForTimezone(timestampMs: number, timezone: string): number {
  try {
    const date = new Date(timestampMs);
    const utcMs = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' })).getTime();
    const tzMs = new Date(date.toLocaleString('en-US', { timeZone: timezone })).getTime();
    return (utcMs - tzMs) / MS_PER_MINUTE;
  } catch {
    return 0;
  }
}

function localDateKeyWithOffset(
  referenceMs: number,
  timezoneOffsetMinutes: number,
  dayOffset: number
): string {
  const localMs = referenceMs - timezoneOffsetMinutes * MS_PER_MINUTE;
  const date = new Date(localMs);
  date.setUTCDate(date.getUTCDate() + dayOffset);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function resolveTimezoneOffsetMinutes(
  timestampMs: number,
  options: {
    timezone?: string;
    viewerTimezoneOffsetMinutes?: number;
    isViewer?: boolean;
  }
): number {
  if (options.timezone) {
    return offsetMinutesForTimezone(timestampMs, options.timezone);
  }
  if (options.isViewer && options.viewerTimezoneOffsetMinutes !== undefined) {
    return options.viewerTimezoneOffsetMinutes;
  }
  return 0;
}

export type LeaderboardMetric = 'prsThisMonth' | 'workoutsThisWeek' | 'currentStreak';

const PRIMARY_LIFT_PATTERNS = ['squat', 'bench press', 'deadlift', 'overhead press'];

export function isPrimaryLift(exerciseName: string): boolean {
  const normalized = exerciseName.toLowerCase();
  return PRIMARY_LIFT_PATTERNS.some((pattern) => normalized.includes(pattern));
}

export type PrDetail = {
  exerciseName: string;
  weight: number;
  completedAt: number;
  isPrimary: boolean;
};

export type WorkoutDetail = {
  completedAt: number;
  title: string;
};

export function deriveWorkoutTitle(
  session: SessionDoc,
  templateNamesById: Map<string, string>
): string {
  if (session.templateId) {
    const templateName = templateNamesById.get(String(session.templateId));
    if (templateName) {
      return templateName;
    }
  }

  return 'Custom Workout';
}

export type ActivityExercise = {
  exerciseName: string;
  weight: number;
  reps: number;
  isPrimary: boolean;
  weighted: boolean;
};

export function computeActivityExercises(session: SessionDoc): ActivityExercise[] {
  const ordered = [...session.exercises].sort((a, b) => a.order - b.order);
  const result: ActivityExercise[] = [];

  for (const exercise of ordered) {
    let best: { weight: number; reps: number } | null = null;

    for (const set of exercise.sets) {
      if (!set.done) {
        continue;
      }

      const weight = set.completedWeight ?? set.weight ?? 0;
      const reps = set.completedReps ?? set.reps ?? 0;
      if (
        !best ||
        weight > best.weight ||
        (weight === best.weight && reps > best.reps)
      ) {
        best = { weight, reps };
      }
    }

    if (!best) {
      continue;
    }

    result.push({
      exerciseName: exercise.exerciseName,
      weight: best.weight,
      reps: best.reps,
      isPrimary: isPrimaryLift(exercise.exerciseName),
      weighted: best.weight > 0,
    });
  }

  return result;
}

export function countDoneSets(session: SessionDoc): number {
  return session.exercises.reduce(
    (total, exercise) => total + exercise.sets.filter((set) => set.done).length,
    0
  );
}

export type StreakDetail = {
  lastWorkoutAt: number | null;
  workedToday: boolean;
};

export type LeaderboardDetail =
  | { type: 'prsThisMonth'; prs: PrDetail[] }
  | { type: 'workoutsThisWeek'; workouts: WorkoutDetail[] }
  | { type: 'currentStreak'; lastWorkoutAt: number | null; workedToday: boolean };

export function getCompletedSessions(sessions: SessionDoc[]): SessionDoc[] {
  return sessions.filter((session) => session.status === 'completed' && session.completedAt !== undefined);
}

export function getWeekRange(nowMs: number): { startMs: number; endMs: number } {
  return { startMs: nowMs - MS_PER_WEEK, endMs: nowMs };
}

export function getMonthRange(nowMs: number): { startMs: number; endMs: number } {
  return { startMs: nowMs - MS_PER_MONTH, endMs: nowMs };
}

export function computeWorkoutsInRange(
  sessions: SessionDoc[],
  startMs: number
): number {
  return getCompletedSessions(sessions).filter((session) => {
    const completedAt = session.completedAt ?? 0;
    return completedAt >= startMs;
  }).length;
}

export function computeSetsInRange(
  sessions: SessionDoc[],
  startMs: number
): number {
  return getCompletedSessions(sessions)
    .filter((session) => {
      const completedAt = session.completedAt ?? 0;
      return completedAt >= startMs;
    })
    .reduce((total, session) => {
      return (
        total +
        session.exercises.reduce((exerciseTotal, exercise) => {
          return exerciseTotal + exercise.sets.filter((set) => set.done).length;
        }, 0)
      );
    }, 0);
}

export function computeMinutesInRange(
  sessions: SessionDoc[],
  startMs: number
): number {
  return getCompletedSessions(sessions)
    .filter((session) => {
      const completedAt = session.completedAt ?? 0;
      return completedAt >= startMs;
    })
    .reduce((total, session) => {
      if (!session.completedAt) {
        return total;
      }
      const minutes = Math.round((session.completedAt - session.startedAt) / (1000 * 60));
      return total + Math.max(minutes, 0);
    }, 0);
}

export function computeCurrentStreak(
  sessions: SessionDoc[],
  nowMs: number,
  timezoneOffsetMinutes = 0
): number {
  const completed = getCompletedSessions(sessions).sort(
    (a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)
  );

  if (completed.length === 0) {
    return 0;
  }

  const anchorMs = completed[0].completedAt ?? 0;
  const anchorDayKey = localDateKey(anchorMs, timezoneOffsetMinutes);
  const todayKey = localDateKey(nowMs, timezoneOffsetMinutes);
  const yesterdayKey = localDateKeyWithOffset(nowMs, timezoneOffsetMinutes, -1);

  if (anchorDayKey !== todayKey && anchorDayKey !== yesterdayKey) {
    return 0;
  }

  const workoutDayKeys = new Set(
    completed.map((session) => localDateKey(session.completedAt ?? 0, timezoneOffsetMinutes))
  );

  let streak = 0;
  for (let dayOffset = 0; ; dayOffset += 1) {
    const dayKey = localDateKeyWithOffset(anchorMs, timezoneOffsetMinutes, -dayOffset);
    if (!workoutDayKeys.has(dayKey)) {
      break;
    }
    streak += 1;
  }

  return streak;
}

export function computeWorkoutsPerDay(
  sessions: SessionDoc[],
  nowMs: number,
  timezoneOffsetMinutes = 0
): number[] {
  const completed = getCompletedSessions(sessions);
  const dayKeys = Array.from({ length: 7 }, (_, index) =>
    localDateKeyWithOffset(nowMs, timezoneOffsetMinutes, -(6 - index))
  );

  return dayKeys.map(
    (dayKey) =>
      completed.filter(
        (session) => localDateKey(session.completedAt ?? 0, timezoneOffsetMinutes) === dayKey
      ).length
  );
}

export function computePrDetailsInRange(
  sessions: SessionDoc[],
  startMs: number
): PrDetail[] {
  const completed = getCompletedSessions(sessions).sort(
    (a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0)
  );

  const maxByExercise = new Map<string, number>();
  const prs: PrDetail[] = [];

  for (const session of completed) {
    const completedAt = session.completedAt ?? 0;

    for (const exercise of session.exercises) {
      for (const set of exercise.sets) {
        if (!set.done) {
          continue;
        }

        const weight = set.completedWeight ?? set.weight;
        if (weight === undefined || weight <= 0) {
          continue;
        }

        const exerciseKey = String(exercise.exerciseId);
        const previousMax = maxByExercise.get(exerciseKey) ?? -Infinity;

        if (weight > previousMax && completedAt >= startMs) {
          prs.push({
            exerciseName: exercise.exerciseName,
            weight,
            completedAt,
            isPrimary: isPrimaryLift(exercise.exerciseName),
          });
        }

        if (weight > previousMax) {
          maxByExercise.set(exerciseKey, weight);
        }
      }
    }
  }

  return prs.sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) {
      return a.isPrimary ? -1 : 1;
    }
    return b.completedAt - a.completedAt;
  });
}

export function computeWorkoutDetailsInRange(
  sessions: SessionDoc[],
  startMs: number,
  templateNamesById: Map<string, string> = new Map()
): WorkoutDetail[] {
  return getCompletedSessions(sessions)
    .filter((session) => {
      const completedAt = session.completedAt ?? 0;
      return completedAt >= startMs;
    })
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
    .map((session) => ({
      completedAt: session.completedAt ?? 0,
      title: deriveWorkoutTitle(session, templateNamesById),
    }));
}

export function computeStreakDetail(
  sessions: SessionDoc[],
  nowMs: number,
  timezoneOffsetMinutes = 0
): StreakDetail {
  const completed = getCompletedSessions(sessions).sort(
    (a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)
  );

  if (completed.length === 0) {
    return { lastWorkoutAt: null, workedToday: false };
  }

  const lastWorkoutAt = completed[0].completedAt ?? 0;
  const todayKey = localDateKey(nowMs, timezoneOffsetMinutes);
  const lastWorkoutKey = localDateKey(lastWorkoutAt, timezoneOffsetMinutes);

  return {
    lastWorkoutAt,
    workedToday: lastWorkoutKey === todayKey,
  };
}

export function computeMetricDetail(
  sessions: SessionDoc[],
  metric: LeaderboardMetric,
  nowMs: number,
  templateNamesById: Map<string, string> = new Map(),
  timezoneOffsetMinutes = 0
): LeaderboardDetail {
  const weekRange = getWeekRange(nowMs);
  const monthRange = getMonthRange(nowMs);

  switch (metric) {
    case 'prsThisMonth':
      return {
        type: 'prsThisMonth',
        prs: computePrDetailsInRange(sessions, monthRange.startMs),
      };
    case 'workoutsThisWeek':
      return {
        type: 'workoutsThisWeek',
        workouts: computeWorkoutDetailsInRange(
          sessions,
          weekRange.startMs,
          templateNamesById
        ),
      };
    case 'currentStreak': {
      const streakDetail = computeStreakDetail(sessions, nowMs, timezoneOffsetMinutes);
      return {
        type: 'currentStreak',
        lastWorkoutAt: streakDetail.lastWorkoutAt,
        workedToday: streakDetail.workedToday,
      };
    }
  }
}

export function computePrCountInRange(
  sessions: SessionDoc[],
  startMs: number
): number {
  const completed = getCompletedSessions(sessions).sort(
    (a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0)
  );

  const maxByExercise = new Map<string, number>();
  let prCount = 0;

  for (const session of completed) {
    const completedAt = session.completedAt ?? 0;

    for (const exercise of session.exercises) {
      for (const set of exercise.sets) {
        if (!set.done) {
          continue;
        }

        const weight = set.completedWeight ?? set.weight;
        if (weight === undefined || weight <= 0) {
          continue;
        }

        const exerciseKey = String(exercise.exerciseId);
        const previousMax = maxByExercise.get(exerciseKey) ?? -Infinity;

        if (weight > previousMax && completedAt >= startMs) {
          prCount += 1;
        }

        if (weight > previousMax) {
          maxByExercise.set(exerciseKey, weight);
        }
      }
    }
  }

  return prCount;
}

export function computeMetricValue(
  sessions: SessionDoc[],
  metric: LeaderboardMetric,
  nowMs: number,
  timezoneOffsetMinutes = 0
): number {
  const weekRange = getWeekRange(nowMs);
  const monthRange = getMonthRange(nowMs);

  switch (metric) {
    case 'workoutsThisWeek':
      return computeWorkoutsInRange(sessions, weekRange.startMs);
    case 'currentStreak':
      return computeCurrentStreak(sessions, nowMs, timezoneOffsetMinutes);
    case 'prsThisMonth':
      return computePrCountInRange(sessions, monthRange.startMs);
  }
}
