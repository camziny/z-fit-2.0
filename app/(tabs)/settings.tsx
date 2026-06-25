import { api } from '@/convex/_generated/api';
import { useThemeMode } from '@/hooks/useThemeMode';
import { useWeightUnit } from '@/hooks/useWeightUnit';
import { useAuth } from '@clerk/clerk-expo';
import { Box, HStack, Pressable, Text, VStack } from '@gluestack-ui/themed';
import { useMutation, useQuery } from 'convex/react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const themeOptions = [
  { label: 'System', value: 'system' as const, description: 'Follow device settings' },
  { label: 'Light', value: 'light' as const, description: 'Always use light mode' },
  { label: 'Dark', value: 'dark' as const, description: 'Always use dark mode' },
];

const weightUnitOptions = [
  { label: 'Kilograms', value: 'kg' as const, description: 'Metric system (kg)' },
  { label: 'Pounds', value: 'lbs' as const, description: 'Imperial system (lbs)' },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useAuth();
  const { themeMode, setThemeMode } = useThemeMode();
  const { weightUnit, setWeightUnit } = useWeightUnit();
  const notificationSettings = useQuery(api.notifications.getSettings, isSignedIn ? {} : 'skip');
  const updateNotificationPrefs = useMutation(api.notifications.updateNotificationPrefs);

  const toggleGroupWorkoutNotifications = async () => {
    if (!notificationSettings) {
      return;
    }
    await updateNotificationPrefs({
      notifyOnGroupWorkout: !notificationSettings.notifyOnGroupWorkout,
    });
  };

  const toggleWeeklyRecapNotifications = async () => {
    if (!notificationSettings) {
      return;
    }
    await updateNotificationPrefs({
      notifyWeeklyRecap: !notificationSettings.notifyWeeklyRecap,
    });
  };

  return (
    <Box 
      bg="$backgroundLight0" 
      sx={{ _dark: { bg: '$backgroundDark0' } }} 
      flex={1}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 140 }]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <VStack space="2xl" p={24}>
          <VStack space="sm" pt={32}>
            <Text 
              size="3xl" 
              fontWeight="$bold" 
              color="$textLight0"
              sx={{ _dark: { color: '$textDark0' } }}
            >
              Settings
            </Text>
            <Text 
              size="md" 
              color="$textLight300"
              sx={{ _dark: { color: '$textDark300' } }}
            >
              Adjust your app preferences
            </Text>
          </VStack>

          <VStack space="xl">
            <Box
              bg="$cardLight"
              sx={{ _dark: { bg: '$cardDark', borderColor: '$borderDark0' } }}
              borderColor="$borderLight0"
              borderWidth={1}
              borderRadius={16}
              p={24}
            >
              <VStack space="xl">
                <VStack space="sm">
                  <Text 
                    size="lg" 
                    fontWeight="$semibold" 
                    color="$textLight0"
                    sx={{ _dark: { color: '$textDark0' } }}
                  >
                    Appearance
                  </Text>
                  <Text 
                    size="sm" 
                    color="$textLight200"
                    sx={{ _dark: { color: '$textDark200' } }}
                  >
                    Select your preferred appearance
                  </Text>
                </VStack>
                
                <VStack space="md">
                  {themeOptions.map((option) => (
                    <Pressable
                      key={option.value}
                      onPress={() => setThemeMode(option.value)}
                    >
                      {({ pressed }) => (
                        <Box
                          bg={themeMode === option.value 
                            ? '$primary0' 
                            : 'transparent'
                          }
                          sx={themeMode === option.value 
                            ? { _dark: { bg: '$textDark0', borderColor: '$textDark0' } }
                            : { _dark: { borderColor: '$borderDark0' } }
                          }
                          borderColor={themeMode === option.value 
                            ? '$primary0' 
                            : '$borderLight0'
                          }
                          borderWidth={2}
                          borderRadius={12}
                          p={16}
                          opacity={pressed ? 0.85 : 1}
                        >
                          <HStack justifyContent="space-between" alignItems="center">
                            <VStack flex={1} space="xs">
                              <Text 
                                size="md" 
                                fontWeight="$medium" 
                                color={themeMode === option.value 
                                  ? '$backgroundLight0' 
                                  : '$textLight0'
                                }
                                sx={themeMode === option.value 
                                  ? { _dark: { color: '$backgroundDark0' } }
                                  : { _dark: { color: '$textDark0' } }
                                }
                              >
                                {option.label}
                              </Text>
                              <Text 
                                size="xs" 
                                color={themeMode === option.value 
                                  ? '$backgroundLight0' 
                                  : '$textLight300'
                                }
                                sx={themeMode === option.value 
                                  ? { _dark: { color: '$backgroundDark0' } }
                                  : { _dark: { color: '$textDark300' } }
                                }
                                opacity={themeMode === option.value ? 0.9 : 0.8}
                              >
                                {option.description}
                              </Text>
                            </VStack>
                            {themeMode === option.value && (
                              <Box pl={16}>
                                <Text 
                                  size="lg" 
                                  color="$backgroundLight0"
                                  sx={{ _dark: { color: '$backgroundDark0' } }}
                                  fontWeight="$bold"
                                >
                                  ✓
                                </Text>
                              </Box>
                            )}
                          </HStack>
                        </Box>
                      )}
                    </Pressable>
                  ))}
                </VStack>
              </VStack>
            </Box>

            <Box
              bg="$cardLight"
              sx={{ _dark: { bg: '$cardDark', borderColor: '$borderDark0' } }}
              borderColor="$borderLight0"
              borderWidth={1}
              borderRadius={16}
              p={24}
            >
              <VStack space="xl">
                <VStack space="sm">
                  <Text 
                    size="lg" 
                    fontWeight="$semibold" 
                    color="$textLight0"
                    sx={{ _dark: { color: '$textDark0' } }}
                  >
                    Weight Units
                  </Text>
                  <Text 
                    size="sm" 
                    color="$textLight200"
                    sx={{ _dark: { color: '$textDark200' } }}
                  >
                    Select your default weight unit
                  </Text>
                </VStack>
                
                <VStack space="md">
                  {weightUnitOptions.map((option) => (
                    <Pressable
                      key={option.value}
                      onPress={() => setWeightUnit(option.value)}
                    >
                      {({ pressed }) => (
                        <Box
                          bg={weightUnit === option.value 
                            ? '$primary0' 
                            : 'transparent'
                          }
                          borderColor={weightUnit === option.value 
                            ? '$primary0' 
                            : '$borderLight0'
                          }
                          sx={{
                            ...weightUnit === option.value 
                              ? { _dark: { bg: '$textDark0', borderColor: '$textDark0' } }
                              : { _dark: { borderColor: '$borderDark0' } },
                          }}
                          borderWidth={1}
                          borderRadius={12}
                          p={16}
                          opacity={pressed ? 0.85 : 1}
                          transform={[{ scale: pressed ? 0.98 : 1 }]}
                        >
                          <HStack justifyContent="space-between" alignItems="center">
                            <VStack space="xs">
                              <Text 
                                size="md" 
                                fontWeight="$medium" 
                                color={weightUnit === option.value 
                                  ? '$backgroundLight0' 
                                  : '$textLight0'
                                }
                                sx={weightUnit === option.value 
                                  ? { _dark: { color: '$backgroundDark0' } }
                                  : { _dark: { color: '$textDark0' } }
                                }
                              >
                                {option.label}
                              </Text>
                              <Text 
                                size="xs" 
                                color={weightUnit === option.value 
                                  ? '$backgroundLight0' 
                                  : '$textLight300'
                                }
                                sx={weightUnit === option.value 
                                  ? { _dark: { color: '$backgroundDark0' } }
                                  : { _dark: { color: '$textDark300' } }
                                }
                                opacity={weightUnit === option.value ? 0.9 : 0.8}
                              >
                                {option.description}
                              </Text>
                            </VStack>
                            {weightUnit === option.value && (
                              <Box pl={16}>
                                <Text 
                                  size="lg" 
                                  color="$backgroundLight0"
                                  sx={{ _dark: { color: '$backgroundDark0' } }}
                                  fontWeight="$bold"
                                >
                                  ✓
                                </Text>
                              </Box>
                            )}
                          </HStack>
                        </Box>
                      )}
                    </Pressable>
                  ))}
                </VStack>
              </VStack>
            </Box>

            {isSignedIn && (
              <Box
                bg="$cardLight"
                sx={{ _dark: { bg: '$cardDark', borderColor: '$borderDark0' } }}
                borderColor="$borderLight0"
                borderWidth={1}
                borderRadius={16}
                p={24}
              >
                <VStack space="xl">
                  <VStack space="sm">
                    <Text size="lg" fontWeight="$semibold" color="$textLight0" sx={{ _dark: { color: '$textDark0' } }}>
                      Group Notifications
                    </Text>
                    <Text size="sm" color="$textLight200" sx={{ _dark: { color: '$textDark200' } }}>
                      Stay in the loop with your training groups
                    </Text>
                  </VStack>

                  <VStack space="md">
                    <Pressable onPress={toggleGroupWorkoutNotifications}>
                      {({ pressed }) => (
                        <Box
                          bg={notificationSettings?.notifyOnGroupWorkout ? '$primary0' : 'transparent'}
                          sx={
                            notificationSettings?.notifyOnGroupWorkout
                              ? { _dark: { bg: '$textDark0', borderColor: '$textDark0' } }
                              : { _dark: { borderColor: '$borderDark0' } }
                          }
                          borderColor={notificationSettings?.notifyOnGroupWorkout ? '$primary0' : '$borderLight0'}
                          borderWidth={2}
                          borderRadius={12}
                          p={16}
                          opacity={pressed ? 0.85 : 1}
                        >
                          <HStack justifyContent="space-between" alignItems="center">
                            <VStack space="xs" flex={1}>
                              <Text
                                size="md"
                                fontWeight="$medium"
                                color={notificationSettings?.notifyOnGroupWorkout ? '$backgroundLight0' : '$textLight0'}
                                sx={
                                  notificationSettings?.notifyOnGroupWorkout
                                    ? { _dark: { color: '$backgroundDark0' } }
                                    : { _dark: { color: '$textDark0' } }
                                }
                              >
                                Workout finished
                              </Text>
                              <Text
                                size="xs"
                                color={notificationSettings?.notifyOnGroupWorkout ? '$backgroundLight0' : '$textLight300'}
                                sx={
                                  notificationSettings?.notifyOnGroupWorkout
                                    ? { _dark: { color: '$backgroundDark0' } }
                                    : { _dark: { color: '$textDark300' } }
                                }
                                opacity={0.9}
                              >
                                Notify when a group member completes a workout
                              </Text>
                            </VStack>
                            {notificationSettings?.notifyOnGroupWorkout && (
                              <Text size="lg" color="$backgroundLight0" sx={{ _dark: { color: '$backgroundDark0' } }} fontWeight="$bold">
                                ✓
                              </Text>
                            )}
                          </HStack>
                        </Box>
                      )}
                    </Pressable>

                    <Pressable onPress={toggleWeeklyRecapNotifications}>
                      {({ pressed }) => (
                        <Box
                          bg={notificationSettings?.notifyWeeklyRecap ? '$primary0' : 'transparent'}
                          sx={
                            notificationSettings?.notifyWeeklyRecap
                              ? { _dark: { bg: '$textDark0', borderColor: '$textDark0' } }
                              : { _dark: { borderColor: '$borderDark0' } }
                          }
                          borderColor={notificationSettings?.notifyWeeklyRecap ? '$primary0' : '$borderLight0'}
                          borderWidth={2}
                          borderRadius={12}
                          p={16}
                          opacity={pressed ? 0.85 : 1}
                        >
                          <HStack justifyContent="space-between" alignItems="center">
                            <VStack space="xs" flex={1}>
                              <Text
                                size="md"
                                fontWeight="$medium"
                                color={notificationSettings?.notifyWeeklyRecap ? '$backgroundLight0' : '$textLight0'}
                                sx={
                                  notificationSettings?.notifyWeeklyRecap
                                    ? { _dark: { color: '$backgroundDark0' } }
                                    : { _dark: { color: '$textDark0' } }
                                }
                              >
                                Weekly recap
                              </Text>
                              <Text
                                size="xs"
                                color={notificationSettings?.notifyWeeklyRecap ? '$backgroundLight0' : '$textLight300'}
                                sx={
                                  notificationSettings?.notifyWeeklyRecap
                                    ? { _dark: { color: '$backgroundDark0' } }
                                    : { _dark: { color: '$textDark300' } }
                                }
                                opacity={0.9}
                              >
                                Sunday evening summary with the weekly leader
                              </Text>
                            </VStack>
                            {notificationSettings?.notifyWeeklyRecap && (
                              <Text size="lg" color="$backgroundLight0" sx={{ _dark: { color: '$backgroundDark0' } }} fontWeight="$bold">
                                ✓
                              </Text>
                            )}
                          </HStack>
                        </Box>
                      )}
                    </Pressable>
                  </VStack>
                </VStack>
              </Box>
            )}

          </VStack>
        </VStack>
      </ScrollView>
    </Box>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
});