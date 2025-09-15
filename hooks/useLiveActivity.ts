import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';

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

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false, // Don't show alert, just update the persistent notification
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

  const dismissExistingWorkoutNotifications = async () => {
    try {
      const presented = await Notifications.getPresentedNotificationsAsync();
      const toDismiss = presented.filter((n) => n.request.content.categoryIdentifier === 'workout');
      await Promise.all(
        toDismiss.map((n) => Notifications.dismissNotificationAsync(n.request.identifier))
      );
    } catch {}
  };

  const startWorkoutActivity = async (data: WorkoutLiveActivityData) => {
    try {
      const title = data.exerciseName;
      const body = `Set ${data.currentSet}/${data.totalSets} • ${data.reps} reps${data.weight ? ` • ${data.weight}` : ''}${data.restEnabled && data.restTimeRemaining ? ` • ${data.restTimeRemaining}s rest` : ''}`;

      await dismissExistingWorkoutNotifications();

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { workoutData: data },
          sticky: true, // Android: make notification persistent
          priority: Notifications.AndroidNotificationPriority.HIGH,
          categoryIdentifier: data.restEnabled ? 'workout_with_rest' : 'workout',
          threadIdentifier: 'workout',
        },
        trigger: null, // Show immediately
      });

      setNotificationId(identifier);
      return identifier;
    } catch (error) {
      console.warn('Failed to start workout notification:', error);
      return null;
    }
  };

  const updateWorkoutActivity = async (activityId: string, data: WorkoutLiveActivityData) => {
    if (!activityId) return;
    
    try {
      await dismissExistingWorkoutNotifications();
      
      const title = data.exerciseName;
      const body = `Set ${data.currentSet}/${data.totalSets} • ${data.reps} reps${data.weight ? ` • ${data.weight}` : ''}${data.restEnabled && data.restTimeRemaining ? ` • ${data.restTimeRemaining}s rest` : ''}`;

      const newIdentifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { workoutData: data },
          sticky: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          categoryIdentifier: data.restEnabled ? 'workout_with_rest' : 'workout',
          threadIdentifier: 'workout',
        },
        trigger: null,
      });

      setNotificationId(newIdentifier);
    } catch (error) {
      console.warn('Failed to update workout notification:', error);
    }
  };

  const endWorkoutActivity = async (activityId: string) => {
    if (!activityId) return;
    
    try {
      await Notifications.cancelScheduledNotificationAsync(activityId);
      await dismissExistingWorkoutNotifications();
      setNotificationId(null);
    } catch (error) {
      console.warn('Failed to end workout notification:', error);
    }
  };

  return {
    isSupported: true, // Notifications are supported on both platforms
    startWorkoutActivity,
    updateWorkoutActivity,
    endWorkoutActivity,
  };
}