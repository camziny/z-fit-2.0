import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useConvexAuth, useMutation } from 'convex/react';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { api } from '@/convex/_generated/api';

function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

export function usePushNotifications() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const registerPushToken = useMutation(api.notifications.registerPushToken);
  const registeredUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isSignedIn || !user) {
      registeredUserIdRef.current = null;
      return;
    }

    const register = async () => {
      if (isLoading || !isAuthenticated || registeredUserIdRef.current === user.id) {
        return;
      }

      if (Platform.OS === 'web') {
        return;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return;
      }

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;

      const tokenResponse = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );

      await registerPushToken({
        expoPushToken: tokenResponse.data,
        timezone: getDeviceTimezone(),
      });

      registeredUserIdRef.current = user.id;
    };

    void register();
  }, [isSignedIn, user, isLoading, isAuthenticated, registerPushToken]);
}
