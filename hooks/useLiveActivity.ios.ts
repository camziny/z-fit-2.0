import { useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import * as LiveActivities from 'react-native-live-activities';

export interface WorkoutLiveActivityData {
  sessionId?: string;
  exerciseName: string;
  currentSet: number;
  totalSets: number;
  reps: number;
  weight?: string;
  restTimeRemaining?: number;
  restEndsAt?: number;
  restEnabled?: boolean;
  isSuperset?: boolean;
  supersetInfo?: string;
}

type ActivityHandle = string | null;

export function useWorkoutLiveActivity() {
  const activityRef = useRef<ActivityHandle>(null);
  const nativeLiveActivities = LiveActivities as any;

  const isSupported = Platform.OS === 'ios' && !!LiveActivities;

  const startWorkoutActivity = useCallback(async (data: WorkoutLiveActivityData): Promise<string | null> => {
    if (!isSupported) return null;
    try {
      const attributes = {
        sessionId: data.sessionId ?? '',
        exerciseName: data.exerciseName,
      };
      const contentState = {
        currentSet: data.currentSet,
        totalSets: data.totalSets,
        reps: data.reps,
        weight: data.weight,
        restEnabled: !!data.restEnabled,
        restTimeRemaining: data.restTimeRemaining ?? 0,
        restEndsAt: data.restEndsAt ?? 0,
        isSuperset: !!data.isSuperset,
        supersetInfo: data.supersetInfo ?? undefined,
      };
      const handle: string = await nativeLiveActivities.startActivity(attributes, contentState);
      activityRef.current = handle;
      return handle;
    } catch {
      return null;
    }
  }, [isSupported, nativeLiveActivities]);

  const updateWorkoutActivity = useCallback(async (activityId: string, data: WorkoutLiveActivityData) => {
    if (!isSupported || !activityId) return;
    try {
      const contentState = {
        currentSet: data.currentSet,
        totalSets: data.totalSets,
        reps: data.reps,
        weight: data.weight,
        restEnabled: !!data.restEnabled,
        restTimeRemaining: data.restTimeRemaining ?? 0,
        restEndsAt: data.restEndsAt ?? 0,
        isSuperset: !!data.isSuperset,
        supersetInfo: data.supersetInfo ?? undefined,
      };
      await nativeLiveActivities.updateActivity(activityId, contentState);
    } catch {
      // swallow
    }
  }, [isSupported, nativeLiveActivities]);

  const endWorkoutActivity = useCallback(async (activityId: string) => {
    if (!isSupported || !activityId) return;
    try {
      if (typeof nativeLiveActivities.endActivity === 'function') {
        await nativeLiveActivities.endActivity(activityId);
      } else if (typeof nativeLiveActivities.endAllActivity === 'function') {
        await nativeLiveActivities.endAllActivity();
      }
      activityRef.current = null;
    } catch {
      // swallow
    }
  }, [isSupported, nativeLiveActivities]);

  return {
    isSupported,
    startWorkoutActivity,
    updateWorkoutActivity,
    endWorkoutActivity,
  };
}


