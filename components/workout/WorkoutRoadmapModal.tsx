import { Box, Button, HStack, Text, VStack } from '@gluestack-ui/themed';
import { ScrollView } from 'react-native';

type Exercise = {
  exerciseName?: string;
  sets: Array<{ done?: boolean } & Record<string, any>>;
};

type Props = {
  visible: boolean;
  exercises: Exercise[];
  currentExerciseIndex: number;
  onClose: () => void;
};

export default function WorkoutRoadmapModal({ visible, exercises, currentExerciseIndex, onClose }: Props) {
  if (!visible) return null;

  return (
    <Box
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      bg="rgba(0,0,0,0.7)"
      justifyContent="center"
      alignItems="center"
      p={24}
    >
      <Box
        bg="$cardLight"
        sx={{ _dark: { bg: '$cardDark', borderColor: '$borderDark0' } }}
        borderColor="$borderLight0"
        borderWidth={1}
        borderRadius={20}
        p={24}
        w="100%"
        maxHeight="70%"
      >
        <VStack space="lg">
          <HStack justifyContent="space-between" alignItems="center">
            <Text size="xl" fontWeight="$bold" color="$textLight0" sx={{ _dark: { color: '$textDark0' } }}>
              Workout Progress
            </Text>
            <Button
              variant="outline"
              size="sm"
              onPress={onClose}
              borderColor="$borderLight0"
              sx={{ _dark: { borderColor: '$borderDark0' } }}
              borderRadius={8}
            >
              <Text color="$textLight0" sx={{ _dark: { color: '$textDark0' } }} size="xs">
                Close
              </Text>
            </Button>
          </HStack>

          <ScrollView showsVerticalScrollIndicator={false}>
            <VStack space="sm">
              {exercises.map((ex, idx) => {
                const doneSets = ex.sets.filter((s) => s.done).length;
                const total = ex.sets.length;
                const allDone = doneSets === total;
                const isActive = idx === currentExerciseIndex;

                return (
                  <Box
                    key={idx}
                    bg={isActive ? '$primary0' : '$backgroundLight0'}
                    sx={isActive ? { _dark: { bg: '$textDark0' } } : { _dark: { bg: '$backgroundDark0', borderColor: '$borderDark0' } }}
                    borderColor={isActive ? '$primary0' : '$borderLight0'}
                    borderWidth={1}
                    borderRadius={12}
                    p={16}
                  >
                    <HStack justifyContent="space-between" alignItems="center">
                      <VStack space="xs">
                        <HStack alignItems="center" space="xs">
                          {(ex as any).groupId && (
                            <Text
                              size="xs"
                              color={isActive ? '$backgroundLight0' : '$primary0'}
                              sx={isActive ? { _dark: { color: '$backgroundDark0' } } : { _dark: { color: '$textDark0' } }}
                            >
                              🔗
                            </Text>
                          )}
                          <Text
                            size="sm"
                            fontWeight="$semibold"
                            color={isActive ? '$backgroundLight0' : '$textLight0'}
                            sx={isActive ? { _dark: { color: '$backgroundDark0' } } : { _dark: { color: '$textDark0' } }}
                          >
                            {ex.exerciseName || `Exercise ${idx + 1}`}
                          </Text>
                        </HStack>
                        <Text
                          size="xs"
                          color={isActive ? '$backgroundLight100' : '$textLight300'}
                          sx={isActive ? { _dark: { color: '$backgroundDark100' } } : { _dark: { color: '$textDark300' } }}
                        >
                          {doneSets}/{total} sets
                        </Text>
                      </VStack>
                      <Text
                        size="lg"
                        fontWeight="$bold"
                        color={allDone ? '$primary0' : isActive ? '$backgroundLight0' : '$textLight300'}
                        sx=
                          {allDone
                            ? { _dark: { color: '$textDark0' } }
                            : isActive
                            ? { _dark: { color: '$backgroundDark0' } }
                            : { _dark: { color: '$textDark300' } }}
                      >
                        {allDone ? '✓' : `${Math.round((doneSets / total) * 100)}%`}
                      </Text>
                    </HStack>
                  </Box>
                );
              })}
            </VStack>
          </ScrollView>
        </VStack>
      </Box>
    </Box>
  );
}


