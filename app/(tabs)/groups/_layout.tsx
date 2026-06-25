import { useThemeMode } from '@/hooks/useThemeMode';
import { Stack } from 'expo-router';

export default function GroupsLayout() {
  const { effectiveColorScheme } = useThemeMode();
  const isDark = effectiveColorScheme === 'dark';

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: isDark ? '#212529' : '#F8F9FA' },
        headerTintColor: isDark ? '#F8F9FA' : '#212529',
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[groupId]" options={{ title: '', headerTransparent: false }} />
    </Stack>
  );
}
