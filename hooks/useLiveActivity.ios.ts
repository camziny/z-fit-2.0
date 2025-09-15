import { useRef } from 'react';
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
  restEnabled?: boolean;
  isSuperset?: boolean;
  supersetInfo?: string;
}

type ActivityHandle = string | null;

export function useWorkoutLiveActivity() {
  const activityRef = useRef<ActivityHandle>(null);

  const isSupported = Platform.OS === 'ios' && !!LiveActivities;

  const startWorkoutActivity = async (data: WorkoutLiveActivityData): Promise<string | null> => {
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
        isSuperset: !!data.isSuperset,
        supersetInfo: data.supersetInfo ?? undefined,
      };
      const handle: string = await LiveActivities.startActivity(attributes, contentState);
      activityRef.current = handle;
      return handle;
    } catch {
      return null;
    }
  };

  const updateWorkoutActivity = async (activityId: string, data: WorkoutLiveActivityData) => {
    if (!isSupported || !activityId) return;
    try {
      const contentState = {
        currentSet: data.currentSet,
        totalSets: data.totalSets,
        reps: data.reps,
        weight: data.weight,
        restEnabled: !!data.restEnabled,
        restTimeRemaining: data.restTimeRemaining ?? 0,
        isSuperset: !!data.isSuperset,
        supersetInfo: data.supersetInfo ?? undefined,
      };
      await LiveActivities.updateActivity(activityId, contentState);
    } catch {
      // swallow
    }
  };

  const endWorkoutActivity = async (activityId: string) => {
    if (!isSupported || !activityId) return;
    try {
      await LiveActivities.endActivity(activityId);
      activityRef.current = null;
    } catch {
      // swallow
    }
  };

  return {
    isSupported,
    startWorkoutActivity,
    updateWorkoutActivity,
    endWorkoutActivity,
  };
}


