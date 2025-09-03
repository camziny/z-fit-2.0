import { Box, Button, HStack, Text, VStack } from '@gluestack-ui/themed';

type Props = {
  visible: boolean;
  isDisabled?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmCompleteModal({ visible, isDisabled, onCancel, onConfirm }: Props) {
  if (!visible) return null;

  return (
    <Box
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      bg="rgba(0,0,0,0.8)"
      justifyContent="center"
      alignItems="center"
      p={24}
    >
      <Box
        bg="$cardLight"
        sx={{ _dark: { bg: '$cardDark', borderColor: '$borderDark0' } }}
        borderColor="$borderLight0"
        borderWidth={1}
        borderRadius={24}
        p={32}
        w="100%"
        maxWidth={320}
        shadowColor="$primary0"
        shadowOpacity={0.2}
        shadowRadius={20}
        shadowOffset={{ width: 0, height: 10 }}
      >
        <VStack space="xl" alignItems="center">
          <VStack space="md" alignItems="center">
            <VStack space="xs" alignItems="center">
              <Text color="$textLight0" sx={{ _dark: { color: '$textDark0' } }} fontWeight="$bold" size="xl" textAlign="center">
                Confirm Workout?
              </Text>
              <Text color="$textLight300" sx={{ _dark: { color: '$textDark300' } }} fontWeight="$medium" size="sm" textAlign="center">
                Are you ready to finish this workout?
              </Text>
            </VStack>
          </VStack>
          <HStack space="sm" w="100%">
            <Button
              variant="outline"
              onPress={onCancel}
              borderColor="$borderLight0"
              sx={{ _dark: { borderColor: '$borderDark0' } }}
              borderRadius={16}
              h={48}
              flex={1}
              justifyContent="center"
              alignItems="center"
            >
              <Text color="$textLight0" sx={{ _dark: { color: '$textDark0' } }} fontWeight="$medium" size="md">
                Cancel
              </Text>
            </Button>
            <Button
              bg="$primary0"
              sx={{ _dark: { bg: '$textDark0' } }}
              onPress={onConfirm}
              isDisabled={!!isDisabled}
              borderRadius={16}
              h={48}
              flex={1}
              justifyContent="center"
              alignItems="center"
            >
              <Text color="$backgroundLight0" sx={{ _dark: { color: '$backgroundDark0' } }} fontWeight="$semibold" size="md">
                Complete
              </Text>
            </Button>
          </HStack>
        </VStack>
      </Box>
    </Box>
  );
}


