import { Box, Text, VStack } from '@gluestack-ui/themed';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

type Props = {
  isActive: boolean;
  workoutCompleteOpacity: SharedValue<number>;
  workoutCompleteScale: SharedValue<number>;
  celebrationOpacity: SharedValue<number>;
  celebrationScale: SharedValue<number>;
};

export default function WorkoutCompleteOverlay({
  isActive,
  workoutCompleteOpacity,
  workoutCompleteScale,
  celebrationOpacity,
  celebrationScale,
}: Props) {
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
          backgroundColor: 'rgba(0,0,0,0.95)',
          pointerEvents: isActive ? 'auto' : 'none',
        },
        overlayStyle,
      ]}
    >
      <Animated.View style={celebrationStyle}>
        <VStack alignItems="center" space="xl">
          <Box
            bg="$primary0"
            sx={{ _dark: { bg: '$textDark0' } }}
            borderRadius={999}
            w={120}
            h={120}
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
              size="5xl"
            >
              ✓
            </Text>
          </Box>
          <VStack alignItems="center" space="sm">
            <Text color="white" fontWeight="$bold" size="3xl" textAlign="center">
              Workout Complete!
            </Text>
            <Text color="rgba(255,255,255,0.8)" fontWeight="$medium" size="lg" textAlign="center">
              Great job!
            </Text>
          </VStack>
        </VStack>
      </Animated.View>
    </Animated.View>
  );
}


