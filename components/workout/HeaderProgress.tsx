import { Colors } from '@/constants/Colors';
import { useThemeMode } from '@/hooks/useThemeMode';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Box, Button, HStack, Text, VStack } from '@gluestack-ui/themed';
import { useMemo } from 'react';
import { TouchableOpacity } from 'react-native';
import Animated, {
    type SharedValue,
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';

type Exercise = {
  exerciseName?: string;
  sets: Array<{ done?: boolean } & Record<string, any>>;
};

type Props = {
  completedSets: number;
  totalSets: number;
  overallPercent: number;
  progressWidth: SharedValue<number>;
  onOpenRoadmap: () => void;
  exercises: Exercise[];
  currentExerciseIndex: number;
  currentSetIndex: number;
  restEnabled: boolean;
  onToggleRest: (enabled: boolean) => void;
  restRemainingSec: number | null;
  onSkipRest: () => void;
};

export default function HeaderProgress({ 
  completedSets, 
  totalSets, 
  overallPercent, 
  progressWidth, 
  onOpenRoadmap,
  exercises,
  currentExerciseIndex,
  currentSetIndex,
  restEnabled,
  onToggleRest,
  restRemainingSec,
  onSkipRest
}: Props) {
  const { effectiveColorScheme } = useThemeMode();
  const currentExercise = exercises[currentExerciseIndex];
  const currentSet = currentExercise?.sets[currentSetIndex];
  const isCurrentSetCompleted = !!currentSet?.done;
  const currentPositionX = useSharedValue(0);
  
  const exerciseMarkers = useMemo(() => {
    let totalSetsSoFar = 0;
    
    return exercises.map((exercise, exerciseIndex) => {
      totalSetsSoFar += exercise.sets.length;
      const position = (totalSetsSoFar / totalSets) * 100;
      const isCompleted = exercise.sets.every(set => set.done);
      
      return {
        exerciseIndex,
        position,
        isCompleted,
      };
    });
  }, [exercises, totalSets]);

  const currentSetProgress = useMemo(() => {
    if (!exercises[currentExerciseIndex]) return 0;
    
    let setsBeforeCurrent = 0;
    for (let i = 0; i < currentExerciseIndex; i++) {
      setsBeforeCurrent += exercises[i].sets.length;
    }
    
    const currentPosition = setsBeforeCurrent + currentSetIndex;
    const newProgress = (currentPosition / totalSets) * 100;
    
    currentPositionX.value = withSpring(newProgress, { 
      damping: 25, 
      stiffness: 120,
      mass: 0.8
    });
    
    return newProgress;
  }, [exercises, currentExerciseIndex, currentSetIndex, totalSets, currentPositionX]);

  const progressAnimatedStyle = useAnimatedStyle(() => {
    return { 
      width: `${progressWidth.value}%`,
    };
  });

  const currentPositionStyle = useAnimatedStyle(() => {
    return {
      left: `${currentPositionX.value}%`,
      transform: [{ translateX: -9 }],
    };
  });

  return (
    <VStack space="lg" pt={16}>
      <HStack justifyContent="space-between" alignItems="center">
        <VStack space="xs">
          <Text size="sm" color="$textLight300" sx={{ _dark: { color: '$textDark300' } }}>
            {completedSets} of {totalSets} sets completed
          </Text>
        </VStack>
        <HStack space="xs">
          <TouchableOpacity onPress={() => onToggleRest(!restEnabled)}>
            <Box
              bg={restEnabled ? '$primary0' : '$backgroundLight0'}
              borderColor={restEnabled ? '$primary0' : '$borderLight0'}
              sx={{ _dark: { 
                bg: restEnabled ? '$textDark0' : '$backgroundDark0', 
                borderColor: restEnabled ? '$textDark0' : '$borderDark0' 
              }}} 
              borderRadius={8}
              borderWidth={1}
              w={36}
              h={36}
              justifyContent="center"
              alignItems="center"
            >
              <Ionicons 
                name="time" 
                size={18} 
                color={restEnabled ? '#FFFFFF' : Colors[effectiveColorScheme ?? 'light'].icon}
              />
            </Box>
          </TouchableOpacity>
          <TouchableOpacity onPress={onOpenRoadmap}>
            <Box
              bg="$backgroundLight0" 
              sx={{ _dark: { bg: '$backgroundDark0', borderColor: '$borderDark0' } }} 
              borderColor="$borderLight0" 
              borderRadius={8}
              borderWidth={1}
              w={36}
              h={36}
              justifyContent="center"
              alignItems="center"
            >
              <Ionicons 
                name="menu" 
                size={18} 
                color={Colors[effectiveColorScheme ?? 'light'].icon}
              />
            </Box>
          </TouchableOpacity>
        </HStack>
      </HStack>

      <Box position="relative" h={20} mt={8}>
        <Box 
          position="absolute"
          top={8}
          left={0}
          right={0}
          h={4}
          bg="$backgroundLight100" 
          sx={{ _dark: { bg: '$backgroundDark100' } }} 
          borderRadius={999}
        />
        
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 8,
              left: 0,
              height: 4,
              borderRadius: 999,
              zIndex: 2,
            },
            progressAnimatedStyle,
          ]}
        >
          <Box 
            bg="$primary0" 
            sx={{ _dark: { bg: '$textDark0' } }} 
            h="100%" 
            borderRadius={999} 
            w="100%"
          />
        </Animated.View>

        {exerciseMarkers.map((marker, index) => (
          <Box
            key={`exercise-${marker.exerciseIndex}`}
            position="absolute"
            left={`${marker.position}%`}
            top={4}
            w={16}
            h={16}
            transform={[{ translateX: -8 }]}
            zIndex={3}
          >
            <Box
              w="100%"
              h="100%"
              bg={marker.isCompleted ? '$primary0' : '$backgroundLight200'}
              borderRadius={999}
              sx={{ 
                _dark: { 
                  bg: marker.isCompleted ? '$textDark0' : '$backgroundDark200'
                } 
              }}
              justifyContent="center"
              alignItems="center"
            >
              {marker.isCompleted ? (
                <Ionicons 
                  name="checkmark" 
                  size={14} 
                  color={effectiveColorScheme === 'dark' ? '#212529' : '#FFFFFF'}
                />
              ) : (
                <Box
                  w={6}
                  h={6}
                  bg="$textLight400"
                  sx={{ _dark: { bg: '$textDark400' } }}
                  borderRadius={999}
                />
              )}
            </Box>
          </Box>
        ))}

        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 2,
              width: 18,
              height: 18,
              zIndex: 5,
            },
            currentPositionStyle,
          ]}
        >
          <Box
            w="100%"
            h="100%"
            bg="$primary0"
            borderRadius={999}
            borderWidth={2}
            borderColor="$backgroundLight0"
            sx={{ _dark: { bg: '$textDark0', borderColor: '$backgroundDark0' } }}
            justifyContent="center"
            alignItems="center"
          >
            <Box
              w={8}
              h={8}
              bg="$backgroundLight0"
              sx={{ _dark: { bg: '$backgroundDark0' } }}
              borderRadius={999}
            />
          </Box>
        </Animated.View>
      </Box>

      {restRemainingSec !== null && (
        <Box
          bg="$backgroundLight50"
          borderRadius={16}
          p={16}
          borderWidth={1}
          borderColor="$borderLight100"
          sx={{ _dark: { bg: '$backgroundDark50', borderColor: '$borderDark100' } }}
        >
          <HStack justifyContent="space-between" alignItems="center">
            <HStack alignItems="center" space="md">
              <Box
                bg="$primary0"
                sx={{ _dark: { bg: '$textDark0' } }}
                borderRadius={999}
                w={40}
                h={40}
                justifyContent="center"
                alignItems="center"
              >
                <Text 
                  size="lg" 
                  fontWeight="$bold" 
                  color="$backgroundLight0"
                  sx={{ _dark: { color: '$backgroundDark0' } }}
                >
                  {restRemainingSec}
                </Text>
              </Box>
              <VStack space="xs">
                <Text 
                  size="sm" 
                  color="$textLight0"
                  sx={{ _dark: { color: '$textDark0' } }}
                  fontWeight="$semibold"
                >
                  Rest Time
                </Text>
                <Text 
                  size="xs" 
                  color="$textLight400"
                  sx={{ _dark: { color: '$textDark400' } }}
                >
                  Take your time
                </Text>
              </VStack>
            </HStack>
            <Button 
              variant="outline" 
              size="sm"
              onPress={onSkipRest}
              borderColor="$borderLight200"
              sx={{ _dark: { borderColor: '$borderDark200' } }}
              borderRadius={12}
              px={16}
              h={36}
            >
              <Text 
                color="$textLight0"
                sx={{ _dark: { color: '$textDark0' } }}
                size="xs"
                fontWeight="$medium"
              >
                Skip
              </Text>
            </Button>
          </HStack>
        </Box>
      )}
    </VStack>
  );
}