import { Box, Text, VStack } from '@gluestack-ui/themed';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

type Props = {
  restCompleteOpacity: SharedValue<number>;
  restCompleteScale: SharedValue<number>;
};

export default function RestCompleteOverlay({ restCompleteOpacity, restCompleteScale }: Props) {
  const overlayStyle = useAnimatedStyle(() => {
    return { opacity: restCompleteOpacity.value, transform: [{ scale: restCompleteScale.value }] };
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
          backgroundColor: 'rgba(0,0,0,0.7)',
          pointerEvents: 'none',
        },
        overlayStyle,
      ]}
    >
      <Box
        bg="$cardLight"
        sx={{ _dark: { bg: '$cardDark' } }}
        borderRadius={20}
        p={32}
        shadowColor="$primary0"
        shadowOpacity={0.2}
        shadowRadius={16}
        shadowOffset={{ width: 0, height: 8 }}
        minWidth={240}
      >
        <VStack alignItems="center" space="md">
          <Box
            bg="$primary0"
            sx={{ _dark: { bg: '$textDark0' } }}
            borderRadius={999}
            w={50}
            h={50}
            justifyContent="center"
            alignItems="center"
          >
            <Text
              color="$backgroundLight0"
              sx={{ _dark: { color: '$backgroundDark0' } }}
              fontWeight="$bold"
              size="xl"
            >
              ✓
            </Text>
          </Box>
          <VStack alignItems="center" space="xs">
            <Text color="$textLight0" sx={{ _dark: { color: '$textDark0' } }} fontWeight="$bold" size="lg" textAlign="center">
              Rest Complete
            </Text>
            <Text color="$textLight300" sx={{ _dark: { color: '$textDark300' } }} fontWeight="$medium" size="sm" textAlign="center">
              Ready for your next set
            </Text>
          </VStack>
        </VStack>
      </Box>
    </Animated.View>
  );
}


