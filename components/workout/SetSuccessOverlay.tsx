import { Box, Text, VStack } from '@gluestack-ui/themed';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

type Props = {
  cardSuccessOpacity: SharedValue<number>;
  successCheckScale: SharedValue<number>;
  successCheckOpacity: SharedValue<number>;
};

export default function SetSuccessOverlay({ cardSuccessOpacity, successCheckScale, successCheckOpacity }: Props) {
  const containerStyle = useAnimatedStyle(() => {
    return { opacity: cardSuccessOpacity.value };
  });

  const checkStyle = useAnimatedStyle(() => {
    return { opacity: successCheckOpacity.value, transform: [{ scale: successCheckScale.value }] };
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
          <VStack alignItems="center" space="md">
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
              shadowOffset={{ width: 0, height: 6 }}
            >
              <Text
                color="$primary0"
                sx={{ _dark: { color: '$textDark0' } }}
                fontWeight="$bold"
                size="4xl"
              >
                ✓
              </Text>
            </Box>
            <Text
              color="$backgroundLight0"
              sx={{ _dark: { color: '$backgroundDark0' } }}
              fontWeight="$bold"
              size="xl"
              textAlign="center"
              letterSpacing={0.5}
            >
              Set Complete
            </Text>
          </VStack>
        </Animated.View>
      </Box>
    </Animated.View>
  );
}


