import { Box, Button, HStack, Text } from '@gluestack-ui/themed';
import { Switch } from 'react-native';

type Props = {
  restEnabled: boolean;
  onToggle: (v: boolean) => void;
  restRemainingSec: number | null;
  onSkip: () => void;
};

export default function RestTimerRow({ restEnabled, onToggle, restRemainingSec, onSkip }: Props) {
  return (
    <>
      <Box bg="$backgroundLight100" sx={{ _dark: { bg: '$backgroundDark100' } }} borderRadius={12} p={12}>
        <HStack justifyContent="space-between" alignItems="center">
          <HStack alignItems="center" space="sm">
            <Switch value={restEnabled} onValueChange={onToggle} trackColor={{ false: '#CED4DA', true: '#212529' }} thumbColor={restEnabled ? '#F8F9FA' : '#6C757D'} />
            <Text size="sm" color="$textLight0" sx={{ _dark: { color: '$textDark0' } }} fontWeight="$medium">
              Rest timer
            </Text>
          </HStack>
          {restEnabled && (
            <Text size="xs" color="$textLight300" sx={{ _dark: { color: '$textDark300' } }}>
              Auto-start after sets
            </Text>
          )}
        </HStack>
      </Box>

      {restRemainingSec !== null && (
        <Box bg="$backgroundLight100" sx={{ _dark: { bg: '$backgroundDark100' } }} borderRadius={12} p={12} w="100%">
          <HStack justifyContent="space-between" alignItems="center" space="md">
            <HStack alignItems="center" space="sm" flex={1}>
              <Box bg="$primary0" sx={{ _dark: { bg: '$textDark0' } }} borderRadius={999} w={32} h={32} justifyContent="center" alignItems="center">
                <Text size="sm" fontWeight="$bold" color="$backgroundLight0" sx={{ _dark: { color: '$backgroundDark0' } }}>
                  {restRemainingSec}
                </Text>
              </Box>
              <Text size="sm" color="$textLight0" sx={{ _dark: { color: '$textDark0' } }} fontWeight="$medium" flex={1}>
                Rest Time
              </Text>
            </HStack>
            <Button variant="outline" size="sm" onPress={onSkip} borderColor="$borderLight0" sx={{ _dark: { borderColor: '$borderDark0' } }} borderRadius={8} px={10} h={28}>
              <Text color="$textLight0" sx={{ _dark: { color: '$textDark0' } }} size="xs" fontWeight="$medium">
                Skip
              </Text>
            </Button>
          </HStack>
        </Box>
      )}
    </>
  );
}


