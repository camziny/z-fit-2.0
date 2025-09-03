import { useThemeMode } from '@/hooks/useThemeMode';
import { useWeightUnit } from '@/hooks/useWeightUnit';
import { Box, HStack, Pressable, Text, VStack } from '@gluestack-ui/themed';
import { ScrollView, StyleSheet } from 'react-native';

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
  const { themeMode, setThemeMode } = useThemeMode();
  const { weightUnit, setWeightUnit } = useWeightUnit();

  return (
    <Box 
      bg="$backgroundLight0" 
      sx={{ _dark: { bg: '$backgroundDark0' } }} 
      flex={1}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
              Customize your z-fit experience
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
                    Choose your preferred theme
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
                    Choose your preferred weight measurement
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
                          sx={weightUnit === option.value 
                            ? { _dark: { bg: '$textDark0' } }
                            : {}
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

            <Box
              bg="$cardLight"
              sx={{ _dark: { bg: '$cardDark', borderColor: '$borderDark0' } }}
              borderColor="$borderLight0"
              borderWidth={1}
              borderRadius={16}
              p={24}
            >
              <VStack space="lg">
                <VStack space="sm">
                  <Text 
                    size="lg" 
                    fontWeight="$semibold" 
                    color="$textLight0"
                    sx={{ _dark: { color: '$textDark0' } }}
                  >
                    About
                  </Text>
                  <Text 
                    size="sm" 
                    color="$textLight200"
                    sx={{ _dark: { color: '$textDark200' } }}
                  >
                    App information
                  </Text>
                </VStack>
                
                <VStack space="md">
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text 
                      size="sm" 
                      color="$textLight200"
                      sx={{ _dark: { color: '$textDark200' } }}
                    >
                      Version
                    </Text>
                    <Text 
                      size="sm" 
                      color="$textLight0"
                      sx={{ _dark: { color: '$textDark0' } }}
                      fontWeight="$medium"
                    >
                      1.0.0
                    </Text>
                  </HStack>
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text 
                      size="sm" 
                      color="$textLight200"
                      sx={{ _dark: { color: '$textDark200' } }}
                    >
                      Build
                    </Text>
                    <Text 
                      size="sm" 
                      color="$textLight0"
                      sx={{ _dark: { color: '$textDark0' } }}
                      fontWeight="$medium"
                    >
                      Development
                    </Text>
                  </HStack>
                </VStack>
              </VStack>
            </Box>
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