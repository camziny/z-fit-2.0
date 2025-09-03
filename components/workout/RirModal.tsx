import { Box, Button, HStack, Text, VStack } from '@gluestack-ui/themed';

type Props = {
  visible: boolean;
  selectedRir: number | null;
  saving: boolean;
  onSelect: (v: number) => void;
  onCancel: () => void;
  onSubmit: () => void;
};

export default function RirModal({ visible, selectedRir, saving, onSelect, onCancel, onSubmit }: Props) {
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
        p={24}
        w="100%"
        maxWidth={340}
      >
        <VStack space="lg" alignItems="center">
          <Text color="$textLight0" sx={{ _dark: { color: '$textDark0' } }} fontWeight="$bold" size="lg" textAlign="center">
            On your last tough set, how many reps did you have left in the tank?
          </Text>

          <VStack space="sm" w="100%">
            {[0, 1, 2, 3, 4].map((v) => (
              <Button
                key={v}
                bg={selectedRir === v ? '$primary0' : '$backgroundLight0'}
                sx={selectedRir === v ? { _dark: { bg: '$textDark0' } } : { _dark: { bg: '$backgroundDark0', borderColor: '$borderDark0' } }}
                borderColor={selectedRir === v ? '$primary0' : '$borderLight0'}
                borderWidth={1}
                onPress={() => onSelect(v)}
                borderRadius={12}
                h={56}
                w="100%"
                justifyContent="center"
                alignItems="center"
              >
                <Text
                  color={selectedRir === v ? '$backgroundLight0' : '$textLight0'}
                  sx={selectedRir === v ? { _dark: { color: '$backgroundDark0' } } : { _dark: { color: '$textDark0' } }}
                  fontWeight="$bold"
                  size="lg"
                  textAlign="center"
                >
                  {v === 4 ? '4+' : v}
                </Text>
              </Button>
            ))}
          </VStack>

          <HStack space="sm" w="100%">
            <Button variant="outline" onPress={onCancel} borderColor="$borderLight0" sx={{ _dark: { borderColor: '$borderDark0' } }} borderRadius={12} h={44} flex={1}>
              <Text color="$textLight0" sx={{ _dark: { color: '$textDark0' } }} fontWeight="$medium">
                Cancel
              </Text>
            </Button>
            <Button bg="$primary0" sx={{ _dark: { bg: '$textDark0' }, opacity: selectedRir === null || saving ? 0.6 : 1 }} onPress={onSubmit} isDisabled={selectedRir === null || saving} borderRadius={12} h={44} flex={1}>
              <Text color="$backgroundLight0" sx={{ _dark: { color: '$backgroundDark0' } }} fontWeight="$semibold">
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </Button>
          </HStack>
        </VStack>
      </Box>
    </Box>
  );
}


