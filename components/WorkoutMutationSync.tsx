import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import {
  loadPendingWorkoutOperations,
  savePendingWorkoutOperations,
  type WorkoutOperation,
} from '@/utils/activeWorkoutStorage';
import { useMutation } from 'convex/react';
import { usePathname } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

export default function WorkoutMutationSync() {
  const pathname = usePathname();
  const markSetDone = useMutation(api.sessions.markSetDone);
  const updatePlannedWeight = useMutation(api.sessions.updatePlannedWeight);
  const recordRir = useMutation(api.sessions.recordExerciseRIR);
  const completeSession = useMutation(api.sessions.completeSession);
  const [appStateStatus, setAppStateStatus] = useState<AppStateStatus>(AppState.currentState);
  const isSyncingRef = useRef(false);

  const replayOperation = useCallback(
    async (operation: WorkoutOperation) => {
      if (operation.type === 'markSetDone') {
        await markSetDone({
          sessionId: operation.sessionId as Id<'sessions'>,
          exerciseIndex: operation.exerciseIndex,
          setIndex: operation.setIndex,
          reps: operation.reps,
          weight: operation.weight,
        });
        return;
      }
      if (operation.type === 'updatePlannedWeight') {
        await updatePlannedWeight({
          sessionId: operation.sessionId as Id<'sessions'>,
          exerciseIndex: operation.exerciseIndex,
          fromSetIndex: operation.fromSetIndex,
          weightKg: operation.weightKg,
        });
        return;
      }
      if (operation.type === 'recordExerciseRIR') {
        await recordRir({
          sessionId: operation.sessionId as Id<'sessions'>,
          exerciseIndex: operation.exerciseIndex,
          rir: operation.rir,
        });
        return;
      }
      if (operation.type === 'completeSession') {
        await completeSession({ sessionId: operation.sessionId as Id<'sessions'> });
      }
    },
    [completeSession, markSetDone, recordRir, updatePlannedWeight],
  );

  const syncPendingOperations = useCallback(async () => {
    if (isSyncingRef.current || appStateStatus !== 'active') return;
    if (pathname?.startsWith('/workout/')) return;
    const pendingOperations = await loadPendingWorkoutOperations();
    if (pendingOperations.length === 0) return;
    isSyncingRef.current = true;
    try {
      let remaining = pendingOperations;
      for (const operation of pendingOperations) {
        try {
          await replayOperation(operation);
        } catch (error) {
          const message = String((error as any)?.message || error || '');
          if (!message.includes('Session not found')) throw error;
        }
        remaining = remaining.filter((item) => item.id !== operation.id);
        await savePendingWorkoutOperations(remaining);
      }
    } finally {
      isSyncingRef.current = false;
    }
  }, [appStateStatus, pathname, replayOperation]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppStateStatus);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    syncPendingOperations().catch(() => {});
    if (pathname?.startsWith('/workout/')) return;
    const intervalId = setInterval(() => {
      syncPendingOperations().catch(() => {});
    }, 5000);
    return () => clearInterval(intervalId);
  }, [pathname, syncPendingOperations]);

  return null;
}
