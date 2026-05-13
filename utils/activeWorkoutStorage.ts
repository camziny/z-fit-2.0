import AsyncStorage from '@react-native-async-storage/async-storage';

const ACTIVE_SESSION_ID_KEY = 'z-fit-active-session-id';
const ACTIVE_SESSION_KEY = 'z-fit-active-session';
const PENDING_OPS_KEY = 'z-fit-workout-mutation-queue';

export type WorkoutOperation =
  | {
      id: string;
      type: 'markSetDone';
      sessionId: string;
      exerciseIndex: number;
      setIndex: number;
      reps?: number;
      weight?: number;
      createdAt: number;
    }
  | {
      id: string;
      type: 'updatePlannedWeight';
      sessionId: string;
      exerciseIndex: number;
      fromSetIndex?: number;
      weightKg: number;
      createdAt: number;
    }
  | {
      id: string;
      type: 'recordExerciseRIR';
      sessionId: string;
      exerciseIndex: number;
      rir: number;
      createdAt: number;
    }
  | {
      id: string;
      type: 'completeSession';
      sessionId: string;
      createdAt: number;
    };

export async function saveActiveSession(session: any) {
  await AsyncStorage.multiSet([
    [ACTIVE_SESSION_ID_KEY, String(session._id)],
    [ACTIVE_SESSION_KEY, JSON.stringify(session)],
  ]);
}

export async function loadActiveSession() {
  const raw = await AsyncStorage.getItem(ACTIVE_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function clearActiveSession() {
  await AsyncStorage.multiRemove([ACTIVE_SESSION_ID_KEY, ACTIVE_SESSION_KEY]);
}

export async function loadPendingWorkoutOperations() {
  const raw = await AsyncStorage.getItem(PENDING_OPS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as WorkoutOperation[] : [];
  } catch {
    return [];
  }
}

export async function savePendingWorkoutOperations(operations: WorkoutOperation[]) {
  await AsyncStorage.setItem(PENDING_OPS_KEY, JSON.stringify(operations));
}

export async function removePendingWorkoutOperationsForSession(sessionId: string) {
  const operations = await loadPendingWorkoutOperations();
  const remaining = operations.filter((operation) => String(operation.sessionId) !== String(sessionId));
  await savePendingWorkoutOperations(remaining);
  return remaining;
}

export function createWorkoutOperationId(type: WorkoutOperation['type']) {
  return `${type}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

export function applyWorkoutOperation(session: any, operation: WorkoutOperation) {
  if (!session || String(session._id) !== String(operation.sessionId)) return session;
  if (operation.type === 'markSetDone') {
    return {
      ...session,
      exercises: session.exercises.map((exercise: any, exerciseIndex: number) => {
        if (exerciseIndex !== operation.exerciseIndex) return exercise;
        return {
          ...exercise,
          sets: exercise.sets.map((set: any, setIndex: number) => {
            if (setIndex !== operation.setIndex) return set;
            return {
              ...set,
              done: true,
              completedAt: set.completedAt ?? operation.createdAt,
              completedReps: operation.reps ?? set.completedReps,
              completedWeight: operation.weight ?? set.completedWeight,
            };
          }),
        };
      }),
    };
  }
  if (operation.type === 'updatePlannedWeight') {
    return {
      ...session,
      exercises: session.exercises.map((exercise: any, exerciseIndex: number) => {
        if (exerciseIndex !== operation.exerciseIndex) return exercise;
        const start = operation.fromSetIndex ?? 0;
        return {
          ...exercise,
          sets: exercise.sets.map((set: any, setIndex: number) => {
            if (setIndex < start || set.done) return set;
            return { ...set, weight: operation.weightKg };
          }),
        };
      }),
    };
  }
  if (operation.type === 'recordExerciseRIR') {
    return {
      ...session,
      exercises: session.exercises.map((exercise: any, exerciseIndex: number) =>
        exerciseIndex === operation.exerciseIndex ? { ...exercise, rir: operation.rir } : exercise
      ),
    };
  }
  if (operation.type === 'completeSession') {
    return {
      ...session,
      status: 'completed',
      completedAt: session.completedAt ?? operation.createdAt,
    };
  }
  return session;
}

export function applyWorkoutOperations(session: any, operations: WorkoutOperation[]) {
  return operations.reduce((current, operation) => applyWorkoutOperation(current, operation), session);
}
