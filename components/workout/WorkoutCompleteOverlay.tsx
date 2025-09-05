import { Box, HStack, Text, VStack } from '@gluestack-ui/themed';
import * as Haptics from 'expo-haptics';
import { TouchableOpacity } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
    type SharedValue
} from 'react-native-reanimated';

type Exercise = {
  exerciseName?: string;
  sets: Array<{ weight?: number } & Record<string, any>>;
  rir?: number;
};

type Props = {
  isActive: boolean;
  workoutCompleteOpacity: SharedValue<number>;
  workoutCompleteScale: SharedValue<number>;
  celebrationOpacity: SharedValue<number>;
  celebrationScale: SharedValue<number>;
  exercises: Exercise[];
  onRirSelect: (exerciseIndex: number, rir: number) => void;
  onFinishWorkout: () => void;
  showRirCollection: boolean;
};

export default function WorkoutCompleteOverlay({
  isActive,
  workoutCompleteOpacity,
  workoutCompleteScale,
  celebrationOpacity,
  celebrationScale,
  exercises,
  onRirSelect,
  onFinishWorkout,
  showRirCollection,
}: Props) {
  const buttonScale = useSharedValue(1);
  const feedbackOpacity = useSharedValue(0);
  const overlayStyle = useAnimatedStyle(() => {
    return { opacity: workoutCompleteOpacity.value, transform: [{ scale: workoutCompleteScale.value }] };
  });

  const celebrationStyle = useAnimatedStyle(() => {
    return { opacity: celebrationOpacity.value, transform: [{ scale: celebrationScale.value }] };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: 'center',
          alignItems: 'center',
          pointerEvents: isActive ? 'auto' : 'none',
        },
        overlayStyle,
      ]}
    >
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        bg="$backgroundLight0"
        sx={{ _dark: { bg: '$backgroundDark0' } }}
      />
      
      <Animated.View style={celebrationStyle}>
        <VStack alignItems="center" space="xl" w="100%" maxWidth={360} p={24} pb={48}>
          <VStack alignItems="center" space="lg">
            <Box
              bg="$primary0"
              sx={{ _dark: { bg: '$textDark0' } }}
              borderRadius={999}
              w={100}
              h={100}
              justifyContent="center"
              alignItems="center"
              shadowColor="$primary0"
              shadowOpacity={0.4}
              shadowRadius={20}
              shadowOffset={{ width: 0, height: 10 }}
            >
              <Text
                color="$backgroundLight0"
                sx={{ _dark: { color: '$backgroundDark0' } }}
                fontWeight="$bold"
                size="4xl"
              >
                ✓
              </Text>
            </Box>
            <VStack alignItems="center" space="sm">
              <Text 
                color="$textLight0" 
                sx={{ _dark: { color: '$textDark0' } }}
                fontWeight="$bold" 
                size="2xl" 
                textAlign="center"
              >
                Workout Complete!
              </Text>
              <Text 
                color="$textLight300" 
                sx={{ _dark: { color: '$textDark300' } }}
                fontWeight="$medium" 
                size="md" 
                textAlign="center"
              >
                {showRirCollection ? 'Quick question before we finish...' : 'Great job!'}
              </Text>
            </VStack>
          </VStack>

          {showRirCollection && (() => {
            const missingRirExercises = exercises
              .map((ex, idx) => ({ ex, idx }))
              .filter(({ ex }) => ex.sets.some(st => st.weight !== undefined))
              .filter(({ ex }) => ex.rir === undefined);
            
            const currentRirExercise = missingRirExercises[0];
            const remainingCount = missingRirExercises.length;
            
            if (!currentRirExercise) return null;

            const handleRirPress = async (rir: number) => {
              buttonScale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
              feedbackOpacity.value = withTiming(1, { duration: 200 });
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              
              setTimeout(() => {
                buttonScale.value = withSpring(1, { damping: 15, stiffness: 300 });
                feedbackOpacity.value = withTiming(0, { duration: 200 });
                onRirSelect(currentRirExercise.idx, rir);
              }, 300);
            };
            
            return (
              <VStack space="lg" w="100%">
                <VStack space="xs" alignItems="center">
                  <Text 
                    color="$textLight0" 
                    sx={{ _dark: { color: '$textDark0' } }}
                    fontWeight="$bold" 
                    size="md" 
                    textAlign="center"
                  >
                    {currentRirExercise.ex.exerciseName}
                  </Text>
                  <Text 
                    color="$textLight300" 
                    sx={{ _dark: { color: '$textDark300' } }}
                    fontWeight="$medium" 
                    size="sm" 
                    textAlign="center"
                  >
                    How many reps left in the tank?
                  </Text>
                  {remainingCount > 1 && (
                    <Text 
                      color="$textLight400" 
                      sx={{ _dark: { color: '$textDark400' } }}
                      fontWeight="$medium" 
                      size="xs" 
                      textAlign="center"
                    >
                      {remainingCount} questions remaining
                    </Text>
                  )}
                </VStack>
                <HStack space="sm" justifyContent="center">
                  {[0, 1, 2, 3, 4].map((v) => (
                    <TouchableOpacity key={v} onPress={() => handleRirPress(v)}>
                      <Box
                        bg="$backgroundLight100"
                        borderColor="$borderLight200"
                        sx={{ _dark: { bg: '$backgroundDark100', borderColor: '$borderDark200' } }}
                        borderWidth={1}
                        borderRadius={12}
                        w={55}
                        h={55}
                        justifyContent="center"
                        alignItems="center"
                        p={4}
                      >
                        <Text 
                          color="$textLight0" 
                          sx={{ _dark: { color: '$textDark0' } }}
                          fontWeight="$bold" 
                          size="md"
                        >
                          {v === 4 ? '4+' : v}
                        </Text>
                      </Box>
                    </TouchableOpacity>
                  ))}
                </HStack>
              </VStack>
            );
          })()}

          <TouchableOpacity onPress={onFinishWorkout}>
            <Box
              bg="$primary0"
              sx={{ _dark: { bg: '$textDark0' } }}
              borderRadius={16}
              h={64}
              w="100%"
              justifyContent="center"
              alignItems="center"
              px={32}
              py={20}
            >
              <Text 
                color="$backgroundLight0" 
                sx={{ _dark: { color: '$backgroundDark0' } }}
                fontWeight="$bold" 
                size="md"
                textAlign="center"
                lineHeight={20}
              >
                {(() => {
                  if (!showRirCollection) return 'Finish Workout';
                  
                  const missingRirExercises = exercises
                    .filter(ex => ex.sets.some(st => st.weight !== undefined))
                    .filter(ex => ex.rir === undefined);
                  
                  return missingRirExercises.length > 0 ? 'Skip & Finish' : 'Finish Workout';
                })()}
              </Text>
            </Box>
          </TouchableOpacity>
        </VStack>
      </Animated.View>
    </Animated.View>
  );
}


