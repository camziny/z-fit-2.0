import { Box, Button, HStack, Text, VStack } from '@gluestack-ui/themed';
import Animated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';

type Props = {
  completedSets: number;
  totalSets: number;
  overallPercent: number;
  progressWidth: SharedValue<number>;
  onOpenRoadmap: () => void;
};

export default function HeaderProgress({ completedSets, totalSets, overallPercent, progressWidth, onOpenRoadmap }: Props) {
  const progressAnimatedStyle = useAnimatedStyle(() => {
    return { width: `${progressWidth.value}%` };
  });

  return (
    <VStack space="md" pt={16}>
      <HStack justifyContent="space-between" alignItems="center">
        <VStack space="xs">
          <Text size="2xl" fontWeight="$bold" color="$textLight0" sx={{ _dark: { color: '$textDark0' } }}>
            Active Workout
          </Text>
          <Text size="sm" color="$textLight300" sx={{ _dark: { color: '$textDark300' } }}>
            {completedSets} of {totalSets} sets completed
          </Text>
        </VStack>
        <Button variant="outline" size="sm" bg="$backgroundLight0" sx={{ _dark: { bg: '$backgroundDark0', borderColor: '$borderDark0' } }} borderColor="$borderLight0" onPress={onOpenRoadmap}>
          <Text color="$textLight0" sx={{ _dark: { color: '$textDark0' } }} size="xs">
            Progress
          </Text>
        </Button>
      </HStack>
      <Box bg="$backgroundLight100" sx={{ _dark: { bg: '$backgroundDark100' } }} borderRadius={999} h={8} overflow="hidden">
        <Animated.View
          style={[
            {
              height: '100%',
              borderRadius: 999,
            },
            progressAnimatedStyle,
          ]}
        >
          <Box bg="$primary0" sx={{ _dark: { bg: '$textDark0' } }} h="100%" borderRadius={999} w="100%" />
        </Animated.View>
      </Box>
    </VStack>
  );
}


