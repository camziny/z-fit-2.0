import ActiveSessionResume from '@/components/ActiveSessionResume';
import AuthSync from '@/components/AuthSync';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { ConvexReactClient } from 'convex/react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { theme } from '../gluestack-theme';

import 'react-native-reanimated';

import { useThemeMode } from '@/hooks/useThemeMode';

export default function RootLayout() {
  const { effectiveColorScheme, isLoaded } = useThemeMode();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded || !isLoaded) {
    return null;
  }

  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY as string | undefined;
  const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL as string | undefined;
  const convexClient = new ConvexReactClient(convexUrl ?? '');

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
        <GluestackUIProvider config={theme} colorMode={effectiveColorScheme === 'dark' ? 'dark' : 'light'}>
          <ThemeProvider value={effectiveColorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <AuthSync />
            <ActiveSessionResume />
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="+not-found" />
              <Stack.Screen 
                name="sign-in" 
                options={{ 
                  headerShown: true, 
                  title: 'Sign in',
                  headerStyle: { backgroundColor: effectiveColorScheme === 'dark' ? '#343A40' : '#F8F9FA' },
                  headerTintColor: effectiveColorScheme === 'dark' ? '#F8F9FA' : '#212529',
                }} 
              />
              <Stack.Screen 
                name="workouts/[bodyPart]" 
                options={({ route }) => ({
                  headerShown: true,
                  title: `${(route.params as any)?.bodyPart?.charAt(0).toUpperCase() + (route.params as any)?.bodyPart?.slice(1)} Workouts` || 'Workouts',
                  headerBackTitle: 'Workouts',
                  headerStyle: { backgroundColor: effectiveColorScheme === 'dark' ? '#343A40' : '#F8F9FA' },
                  headerTintColor: effectiveColorScheme === 'dark' ? '#F8F9FA' : '#212529',
                })}
              />
              <Stack.Screen 
                name="workout-setup/[templateId]" 
                options={{ 
                  headerShown: true,
                  title: 'Workout Setup',
                  headerStyle: { backgroundColor: effectiveColorScheme === 'dark' ? '#343A40' : '#F8F9FA' },
                  headerTintColor: effectiveColorScheme === 'dark' ? '#F8F9FA' : '#212529',
                }} 
              />
              <Stack.Screen 
                name="workout/[sessionId]" 
                options={{ 
                  headerShown: true,
                  title: 'Active Workout',
                  headerStyle: { backgroundColor: effectiveColorScheme === 'dark' ? '#343A40' : '#F8F9FA' },
                  headerTintColor: effectiveColorScheme === 'dark' ? '#F8F9FA' : '#212529',
                }} 
              />
            </Stack>
            <StatusBar style={effectiveColorScheme === 'dark' ? 'light' : 'dark'} />
          </ThemeProvider>
        </GluestackUIProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
