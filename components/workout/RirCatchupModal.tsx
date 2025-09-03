import { Box, Button, HStack, Text, VStack } from '@gluestack-ui/themed';

type Props = {
  visible: boolean;
  exerciseName?: string;
  onSelect: (v: number) => Promise<void> | void;
  onSkip: () => void;
};

export default function RirCatchupModal({ visible, exerciseName, onSelect, onSkip }: Props) {
  if (!visible) return null;

  return (
    <Box position="absolute" top={0} left={0} right={0} bottom={0} bg="rgba(0,0,0,0.8)" justifyContent="center" alignItems="center" p={24}>
      <Box
        bg="$cardLight"
        sx={{ _dark: { bg: '$cardDark', borderColor: '$borderDark0' } }}
        borderColor="$borderLight0"
        borderWidth={1}
        borderRadius={24}
        p={24}
        w="100%"
        maxWidth={360}
      >
        <VStack space="lg" alignItems="center">
          <Text color="$textLight0" sx={{ _dark: { color: '$textDark0' } }} fontWeight="$bold" size="lg" textAlign="center">
            One more question: {exerciseName}
          </Text>

          <HStack space="sm" w="100%" justifyContent="space-between">
            {[0, 1, 2, 3, 4].map((v) => (
              <Button key={v} onPress={() => onSelect(v)} borderRadius={12} h={44} flex={1} mx={2}>
                <Text color="$backgroundLight0" sx={{ _dark: { color: '$backgroundDark0' } }} fontWeight="$semibold">
                  {v === 4 ? '4+' : v}
                </Text>
              </Button>
            ))}
          </HStack>

          <Button variant="outline" onPress={onSkip} borderColor="$borderLight0" sx={{ _dark: { borderColor: '$borderDark0' } }} borderRadius={12} h={44} w="100%">
            <Text color="$textLight0" sx={{ _dark: { color: '$textDark0' } }} fontWeight="$medium" textAlign="center">
              Skip for now
            </Text>
          </Button>
        </VStack>
      </Box>
    </Box>
  );
}


