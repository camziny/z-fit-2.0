import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';

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

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false, // Don't show alert, just update the persistent notification
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export function useWorkoutLiveActivity() {
  const [notificationId, setNotificationId] = useState<string | null>(null);

  useEffect(() => {
    // Request notification permissions on mount
    const requestPermissions = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Notification permissions not granted');
      }
      // Base category (no Skip Rest)
      await Notifications.setNotificationCategoryAsync('workout', [
        {
          identifier: 'MARK_DONE',
          buttonTitle: 'Mark Done',
          options: { opensAppToForeground: false },
        },
        {
          identifier: 'NEXT_SET',
          buttonTitle: 'Next',
          options: { opensAppToForeground: false },
        },
        {
          identifier: 'PREV_SET',
          buttonTitle: 'Previous',
          options: { opensAppToForeground: false },
        },
      ]);

      // Category that includes Skip Rest action
      await Notifications.setNotificationCategoryAsync('workout_with_rest', [
        {
          identifier: 'MARK_DONE',
          buttonTitle: 'Mark Done',
          options: { opensAppToForeground: false },
        },
        {
          identifier: 'NEXT_SET',
          buttonTitle: 'Next',
          options: { opensAppToForeground: false },
        },
        {
          identifier: 'PREV_SET',
          buttonTitle: 'Previous',
          options: { opensAppToForeground: false },
        },
        {
          identifier: 'SKIP_REST',
          buttonTitle: 'Skip Rest',
          options: { opensAppToForeground: false },
        },
      ]);
    };
    requestPermissions();
  }, []);

  const dismissExistingWorkoutNotifications = useCallback(async () => {
    try {
      const presented = await Notifications.getPresentedNotificationsAsync();
      const toDismiss = presented.filter((n) =>
        n.request.content.categoryIdentifier === 'workout' ||
        n.request.content.categoryIdentifier === 'workout_with_rest'
      );
      await Promise.all(
        toDismiss.map((n) => Notifications.dismissNotificationAsync(n.request.identifier))
      );
    } catch {}
  }, []);

  const startWorkoutActivity = useCallback(async (data: WorkoutLiveActivityData) => {
    try {
      const title = data.exerciseName;
      const body = `Set ${data.currentSet}/${data.totalSets} • ${data.reps} reps${data.weight ? ` • ${data.weight}` : ''}${data.restEnabled && data.restEndsAt ? ` • Rest until ${new Date(data.restEndsAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}`;

      await dismissExistingWorkoutNotifications();

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { workoutData: data },
          sticky: true, // Android: make notification persistent
          priority: Notifications.AndroidNotificationPriority.HIGH,
          categoryIdentifier: data.restEnabled ? 'workout_with_rest' : 'workout',
        },
        trigger: null, // Show immediately
      });

      setNotificationId(identifier);
      return identifier;
    } catch (error) {
      console.warn('Failed to start workout notification:', error);
      return null;
    }
  }, [dismissExistingWorkoutNotifications]);

  const updateWorkoutActivity = useCallback(async (activityId: string, data: WorkoutLiveActivityData) => {
    if (!activityId) return;
    
    try {
      await dismissExistingWorkoutNotifications();
      
      const title = data.exerciseName;
      const body = `Set ${data.currentSet}/${data.totalSets} • ${data.reps} reps${data.weight ? ` • ${data.weight}` : ''}${data.restEnabled && data.restEndsAt ? ` • Rest until ${new Date(data.restEndsAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}`;

      const newIdentifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { workoutData: data },
          sticky: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          categoryIdentifier: data.restEnabled ? 'workout_with_rest' : 'workout',
        },
        trigger: null,
      });

      setNotificationId(newIdentifier);
    } catch (error) {
      console.warn('Failed to update workout notification:', error);
    }
  }, [dismissExistingWorkoutNotifications]);

  const endWorkoutActivity = useCallback(async (activityId: string) => {
    if (!activityId) return;
    
    try {
      await Notifications.cancelScheduledNotificationAsync(activityId);
      await dismissExistingWorkoutNotifications();
      setNotificationId(null);
    } catch (error) {
      console.warn('Failed to end workout notification:', error);
    }
  }, [dismissExistingWorkoutNotifications]);

  return {
    isSupported: true, // Notifications are supported on both platforms
    startWorkoutActivity,
    updateWorkoutActivity,
    endWorkoutActivity,
  };
}