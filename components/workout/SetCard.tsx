import { useColorScheme } from '@/hooks/useColorScheme';
import type { WorkoutExercise, WorkoutSet } from '@/types/workout';
import { Box, HStack, Pressable, Text, VStack } from '@gluestack-ui/themed';

export interface SetCardProps {
  currentExercise: WorkoutExercise;
  currentSet: WorkoutSet | undefined;
  currentSetIndex: number;
  formatWeight: (value: number) => string;
  convertWeight: (value: number, fromUnit: 'kg' | 'lbs', toUnit: 'kg' | 'lbs') => number;
  weightUnit: 'kg' | 'lbs';
  onWeightAdjust?: (delta: number) => Promise<void>;
}

export default function SetCard({ currentExercise, currentSet, currentSetIndex, formatWeight, convertWeight, weightUnit, onWeightAdjust }: SetCardProps) {
  const isSuperset = !!(currentExercise as any)?.groupId;
  const colorScheme = useColorScheme();
  
  return (
    <VStack alignItems="center" space="lg">
      <Box
        bg="$backgroundLight0"
        sx={{ _dark: { bg: '$backgroundDark0' } }}
        borderRadius={16}
        p={24}
        w="100%"
        alignItems="center"
      >
        <VStack alignItems="center" space="sm">
          <Box
            bg="$primary0"
            sx={{ _dark: { bg: '$textDark0' } }}
            borderRadius={8}
            px={12}
            py={4}
          >
            <Text
              size="sm"
              color="$backgroundLight0"
              sx={{ _dark: { color: '$backgroundDark0' } }}
              textTransform="uppercase"
              letterSpacing={1}
              fontWeight="$bold"
            >
              Set {currentSetIndex + 1} of {currentExercise?.sets.length}
            </Text>
          </Box>
          <Text
            size="5xl"
            fontWeight="$bold"
            color="$primary0"
            sx={{ _dark: { color: '$textDark0' } }}
          >
            {currentSet?.reps}
          </Text>
          <Text
            size="sm"
            color="$textLight200"
            sx={{ _dark: { color: '$textDark200' } }}
            textTransform="uppercase"
            letterSpacing={1}
          >
            Reps
          </Text>
        </VStack>
      </Box>

      <VStack alignItems="center" space="xs">
        {currentSet?.weight ? (
          onWeightAdjust ? (
            <HStack alignItems="center" space="md" justifyContent="center">
              <Pressable onPress={() => onWeightAdjust(-1)}>
                <Box
                  borderWidth={1}
                  borderColor="$borderLight0"
                  sx={{ 
                    _dark: { borderColor: '$borderDark0' },
                    _pressed: { 
                      bg: '$backgroundLight100',
                      _dark: { bg: '$backgroundDark100' }
                    }
                  }}
                  borderRadius={12}
                  w={44}
                  h={44}
                  justifyContent="center"
                  alignItems="center"
                >
                  <Text 
                    fontSize={24} 
                    color="$textLight0" 
                    sx={{ _dark: { color: '$textDark0' } }} 
                    fontWeight="$bold"
                    lineHeight={24}
                  >
                    −
                  </Text>
                </Box>
              </Pressable>
              <Box minWidth={100} alignItems="center">
                <Text
                  size="xl"
                  fontWeight="$semibold"
                  color="$textLight0"
                  sx={{ _dark: { color: '$textDark0' } }}
                  textAlign="center"
                >
                  {(() => {
                    const isPair = currentExercise?.loadingMode === 'pair';
                    const converted = convertWeight(currentSet.weight || 0, 'kg', weightUnit);
                    if (isPair) {
                      const per = converted / 2;
                      return `${formatWeight(per)} each`;
                    }
                    return formatWeight(converted);
                  })()}
                </Text>
              </Box>
              <Pressable onPress={() => onWeightAdjust(1)}>
                <Box
                  borderWidth={1}
                  borderColor="$borderLight0"
                  sx={{ 
                    _dark: { borderColor: '$borderDark0' },
                    _pressed: { 
                      bg: '$backgroundLight100',
                      _dark: { bg: '$backgroundDark100' }
                    }
                  }}
                  borderRadius={12}
                  w={44}
                  h={44}
                  justifyContent="center"
                  alignItems="center"
                >
                  <Text 
                    fontSize={24} 
                    color="$textLight0" 
                    sx={{ _dark: { color: '$textDark0' } }} 
                    fontWeight="$bold"
                    lineHeight={24}
                  >
                    +
                  </Text>
                </Box>
              </Pressable>
            </HStack>
          ) : (
            <Text
              size="xl"
              fontWeight="$semibold"
              color="$textLight0"
              sx={{ _dark: { color: '$textDark0' } }}
              textAlign="center"
            >
              {(() => {
                const isPair = currentExercise?.loadingMode === 'pair';
                const converted = convertWeight(currentSet.weight || 0, 'kg', weightUnit);
                if (isPair) {
                  const per = converted / 2;
                  return `${formatWeight(per)} each`;
                }
                return formatWeight(converted);
              })()}
            </Text>
          )
        ) : (
          <Text
            size="lg"
            fontWeight="$medium"
            color="$textLight200"
            sx={{ _dark: { color: '$textDark200' } }}
          >
            {currentExercise?.loadBasis === 'external'
              ? `${Math.round(100 / (1 + ((currentSet?.reps ?? 10) / 30)))}% of 1RM`
              : (currentExercise?.loadBasis === 'assisted' ? 'Assisted Bodyweight' : 'Bodyweight')}
          </Text>
        )}
        <Text
          size="xs"
          color="$textLight300"
          sx={{ _dark: { color: '$textDark300' } }}
          textTransform="uppercase"
          letterSpacing={1}
        >
          {currentSet?.weight
            ? ((currentExercise as any)?.loadingMode === 'pair'
                ? (currentExercise?.equipment === 'kettlebell' ? 'Per Kettlebell' : 'Per Dumbbell')
                : (currentExercise?.loadingMode === 'bar' ? 'Barbell Load' : 'Target Weight'))
            : (currentExercise?.loadBasis === 'external'
                ? 'Percent of 1RM'
                : (currentExercise?.loadBasis === 'assisted' ? 'Assistance' : 'No Weight'))}
        </Text>

        {currentSet?.weight && (
          <Text
            size="xs"
            color="$textLight300"
            sx={{ _dark: { color: '$textDark300' } }}
            textAlign="center"
          >
            {(() => {
              const lm = currentExercise?.loadingMode;
              const eq = (currentExercise as any)?.equipment as string | undefined;
              if (lm === 'pair') {
                const impl = eq === 'kettlebell' ? 'kettlebells' : 'dumbbells';
                const per = convertWeight((currentSet.weight || 0) / 2, 'kg', weightUnit);
                const perText = formatWeight(per).replace(` ${weightUnit}`, '');
                return `Use 2 × ${perText} ${weightUnit} ${impl}`;
              }
              if (lm === 'single') {
                const impl = eq === 'kettlebell' ? 'kettlebell' : 'dumbbell';
                const one = convertWeight(currentSet.weight || 0, 'kg', weightUnit);
                const oneText = formatWeight(one).replace(` ${weightUnit}`, '');
                return `Use 1 × ${oneText} ${weightUnit} ${impl}`;
              }
              if (lm === 'bar') {
                return '';
              }
              return '';
            })()}
          </Text>
        )}
      </VStack>
    </VStack>
  );
}


