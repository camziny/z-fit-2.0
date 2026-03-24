import ActiveSessionResume from '@/components/ActiveSessionResume';
import AuthSync from '@/components/AuthSync';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { Box, Button, GluestackUIProvider, Text, VStack } from '@gluestack-ui/themed';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { ConvexReactClient } from 'convex/react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { theme } from '../gluestack-theme';

import 'react-native-reanimated';

import { useThemeMode } from '@/hooks/useThemeMode';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ErrorBoundaryProps } from 'expo-router';
import { Pressable } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const rawMessage = String((error as any)?.message || error || '');
  const isConvexQuota = rawMessage.includes('free plan limits') || rawMessage.includes('deployments have been disabled');

  return (
    <Box bg="$backgroundLight0" sx={{ _dark: { bg: '$backgroundDark0' } }} flex={1} px={24} justifyContent="center">
      <VStack space="xl" alignItems="center">
        <Text size="2xl" fontWeight="$bold" color="$textLight0" sx={{ _dark: { color: '$textDark0' } }} textAlign="center">
          {isConvexQuota ? 'Service Temporarily Unavailable' : 'Something went wrong'}
        </Text>
        <Text size="md" color="$textLight300" sx={{ _dark: { color: '$textDark300' } }} textAlign="center">
          {isConvexQuota
            ? 'Backend access is currently disabled due to Convex plan limits. Please try again shortly.'
            : 'Please try again. If the issue continues, restart the app and try once more.'}
        </Text>
        <VStack space="md" w="100%">
          <Button bg="$primary0" sx={{ _dark: { bg: '$textDark0' } }} borderRadius={12} h={52} onPress={retry}>
            <Text color="$backgroundLight0" sx={{ _dark: { color: '$backgroundDark0' } }} fontWeight="$medium">
              Retry
            </Text>
          </Button>
          <Button
            variant="outline"
            borderColor="$borderLight0"
            sx={{ _dark: { borderColor: '$borderDark0' } }}
            borderWidth={1}
            borderRadius={12}
            h={52}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text color="$textLight0" sx={{ _dark: { color: '$textDark0' } }} fontWeight="$medium">
              Go to Home
            </Text>
          </Button>
        </VStack>
      </VStack>
    </Box>
  );
}

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
  const renderHeaderBackButton = () => (
    <Pressable
      onPress={() => {
        if (router.canGoBack()) router.back();
        else router.replace('/(tabs)');
      }}
      style={{
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'flex-start',
      }}
      hitSlop={8}
    >
      <Ionicons
        name="chevron-back"
        size={24}
        color={effectiveColorScheme === 'dark' ? '#F8F9FA' : '#212529'}
      />
    </Pressable>
  );

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
                  title: 'Sign In',
                  headerBackTitleVisible: false,
                  headerBackButtonDisplayMode: 'minimal',
                  headerStyle: { backgroundColor: effectiveColorScheme === 'dark' ? '#343A40' : '#F8F9FA' },
                  headerTintColor: effectiveColorScheme === 'dark' ? '#F8F9FA' : '#212529',
                }} 
              />
              <Stack.Screen 
                name="workouts/[bodyPart]" 
                options={({ route }) => {
                  const bodyPartParam = (route.params as { bodyPart?: string } | undefined)?.bodyPart;
                  const bodyPartTitle =
                    typeof bodyPartParam === 'string' && bodyPartParam.length > 0
                      ? `${bodyPartParam.charAt(0).toUpperCase()}${bodyPartParam.slice(1)} Workouts`
                      : 'Workouts';
                  return {
                    headerShown: true,
                    title: bodyPartTitle,
                    headerBackTitle: 'Workouts',
                    headerBackButtonDisplayMode: 'minimal',
                    headerStyle: { backgroundColor: effectiveColorScheme === 'dark' ? '#343A40' : '#F8F9FA' },
                    headerTintColor: effectiveColorScheme === 'dark' ? '#F8F9FA' : '#212529',
                  };
                }}
              />
              <Stack.Screen 
                name="workout-setup/[templateId]" 
                options={{ 
                  headerShown: true,
                  title: 'Setup',
                  headerBackTitleVisible: false,
                  headerBackVisible: false,
                  headerLeft: renderHeaderBackButton,
                  headerBackButtonDisplayMode: 'minimal',
                  headerLeftContainerStyle: { paddingLeft: 12 },
                  headerStyle: { backgroundColor: effectiveColorScheme === 'dark' ? '#343A40' : '#F8F9FA' },
                  headerTintColor: effectiveColorScheme === 'dark' ? '#F8F9FA' : '#212529',
                }} 
              />
              <Stack.Screen 
                name="workout/[sessionId]" 
                options={{ 
                  headerShown: true,
                  title: 'Active Workout',
                  headerBackTitleVisible: false,
                  headerBackVisible: false,
                  headerBackButtonDisplayMode: 'minimal',
                  headerLeft: renderHeaderBackButton,
                  headerLeftContainerStyle: { paddingLeft: 12 },
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
