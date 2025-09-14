import { Box, Pressable, Text, VStack } from '@gluestack-ui/themed';
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
              Choose a category to start training
            </Text>
          </VStack>

          

          <VStack space="md">
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
                    p={24}
                    opacity={pressed ? 0.85 : 1}
                    transform={[{ scale: pressed ? 0.98 : 1 }]}
                  >
                    <VStack space="sm">
                      <Text 
                        size="xl" 
                        fontWeight="$semibold" 
                        color="$textLight0"
                        sx={{ _dark: { color: '$textDark0' } }}
                      >
                        {category.name}
                      </Text>
                    </VStack>
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