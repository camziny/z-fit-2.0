import { Box, Text, VStack } from '@gluestack-ui/themed';
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

type Props = {
  exerciseTransitionOpacity: SharedValue<number>;
  exerciseTransitionScale: SharedValue<number>;
  checkmarkScale: SharedValue<number>;
  checkmarkOpacity: SharedValue<number>;
  transitionProgress: SharedValue<number>;
  message?: string;
};

export default function ExerciseTransitionOverlay({
  exerciseTransitionOpacity,
  exerciseTransitionScale,
  checkmarkScale,
  checkmarkOpacity,
  transitionProgress,
  message,
}: Props) {
  const containerStyle = useAnimatedStyle(() => {
    return { opacity: exerciseTransitionOpacity.value, transform: [{ scale: exerciseTransitionScale.value }] };
  });

  const checkStyle = useAnimatedStyle(() => {
    return { opacity: checkmarkOpacity.value, transform: [{ scale: checkmarkScale.value }] };
  });

  const progressStyle = useAnimatedStyle(() => {
    return { width: `${interpolate(transitionProgress.value, [0, 1], [0, 100])}%` };
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
          borderRadius: 20,
          overflow: 'hidden',
          pointerEvents: 'none',
        },
        containerStyle,
      ]}
    >
      <Box
        bg="$primary0"
        sx={{ _dark: { bg: '$textDark0' } }}
        borderRadius={20}
        w="100%"
        h="100%"
        justifyContent="center"
        alignItems="center"
        opacity={0.95}
      >
        <Animated.View style={checkStyle}>
          <VStack alignItems="center" space="lg">
            <Box
              bg="$backgroundLight0"
              sx={{ _dark: { bg: '$backgroundDark0' } }}
              borderRadius={999}
              w={80}
              h={80}
              justifyContent="center"
              alignItems="center"
              shadowColor="$primary0"
              shadowOpacity={0.3}
              shadowRadius={12}
              elevation={6}
            >
              <Text
                color="$primary0"
                sx={{ _dark: { color: '$textDark0' } }}
                fontWeight="$bold"
                size="2xl"
                textAlign="center"
              >
                ✓
              </Text>
            </Box>
            <VStack alignItems="center" space="sm">
              <Text
                color="$backgroundLight0"
                sx={{ _dark: { color: '$backgroundDark0' } }}
                fontWeight="$bold"
                size="xl"
                textAlign="center"
                letterSpacing={0.5}
              >
                Exercise Complete
              </Text>
              <VStack alignItems="center" space="md" w="100%" mt="$4">
                <Box
                  w="80%"
                  h={3}
                  bg="$backgroundLight0"
                  sx={{ _dark: { bg: '$backgroundDark0' } }}
                  borderRadius={2}
                  opacity={0.3}
                  overflow="hidden"
                >
                  <Animated.View
                    style={[
                      {
                        height: '100%',
                        backgroundColor: 'white',
                        borderRadius: 2,
                      },
                      progressStyle,
                    ]}
                  />
                </Box>
                {!!message && (
                  <Text
                    color="$backgroundLight0"
                    sx={{ _dark: { color: '$backgroundDark0' } }}
                    size="lg"
                    fontWeight="$bold"
                    textAlign="center"
                    letterSpacing={0.5}
                  >
                    {message}
                  </Text>
                )}
              </VStack>
            </VStack>
          </VStack>
        </Animated.View>
      </Box>
    </Animated.View>
  );
}


