import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useThemeMode } from '@/hooks/useThemeMode';

export default function TabLayout() {
  const { effectiveColorScheme } = useThemeMode();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[effectiveColorScheme ?? 'light'].tabIconSelected,
        tabBarInactiveTintColor: Colors[effectiveColorScheme ?? 'light'].tabIconDefault,
        tabBarStyle: {
          backgroundColor: Colors[effectiveColorScheme ?? 'light'].background,
          borderTopColor: Colors[effectiveColorScheme ?? 'light'].tabIconDefault,
          borderTopWidth: 0.5,
          ...Platform.select({
            ios: {
              position: 'absolute',
            },
            default: {},
          }),
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Workouts',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="dumbbell.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.circle.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="gearshape.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
