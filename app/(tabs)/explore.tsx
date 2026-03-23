import { useThemeMode } from '@/hooks/useThemeMode';
import { Ionicons } from '@expo/vector-icons';
import { Box, HStack, Pressable, Text, VStack } from '@gluestack-ui/themed';
import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

const workoutCategories = [
  { name: 'Push', bodyPart: 'push' },
  { name: 'Pull', bodyPart: 'pull' },
  { name: 'Legs', bodyPart: 'legs' },
  { name: 'Chest', bodyPart: 'chest' },
  { name: 'Back', bodyPart: 'back' },
  { name: 'Arms', bodyPart: 'arms' },
  { name: 'Shoulders', bodyPart: 'shoulders' },
  { name: 'Core', bodyPart: 'core' },
];

export default function ExploreScreen() {
  const { effectiveColorScheme } = useThemeMode();
  const isDark = effectiveColorScheme === 'dark';

  return (
    <Box 
      bg="$backgroundLight0" 
      sx={{ _dark: { bg: '$backgroundDark0' } }} 
      flex={1}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <VStack space="2xl" p={24} pb={120}>
          <VStack space="sm" pt={32}>
            <Text 
              size="3xl" 
              fontWeight="$bold" 
              color="$textLight0"
              sx={{ _dark: { color: '$textDark0' } }}
            >
              Workouts
            </Text>
            <Text 
              size="md" 
              color="$textLight300"
              sx={{ _dark: { color: '$textDark300' } }}
            >
              Choose a muscle group to start
            </Text>
          </VStack>

          <VStack space="sm">
            {workoutCategories.map((category) => (
              <Pressable
                key={category.bodyPart}
                onPress={() => router.push(`/workouts/${category.bodyPart}`)}
              >
                {({ pressed }) => (
                  <Box
                    bg="$cardLight"
                    sx={{ _dark: { bg: '$cardDark', borderColor: '$borderDark0' } }}
                    borderColor="$borderLight0"
                    borderWidth={1}
                    borderRadius={16}
                    px={20}
                    py={18}
                    opacity={pressed ? 0.85 : 1}
                    transform={[{ scale: pressed ? 0.98 : 1 }]}
                  >
                    <HStack alignItems="center" justifyContent="space-between">
                      <Text 
                        size="lg" 
                        fontWeight="$semibold" 
                        color="$textLight0"
                        sx={{ _dark: { color: '$textDark0' } }}
                      >
                        {category.name}
                      </Text>
                      <Ionicons 
                        name="chevron-forward" 
                        size={20} 
                        color={isDark ? '#6C757D' : '#ADB5BD'} 
                      />
                    </HStack>
                  </Box>
                )}
              </Pressable>
            ))}
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
