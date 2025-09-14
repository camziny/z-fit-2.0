import { api } from '@/convex/_generated/api';

import { Box, Button, HStack, Text, VStack } from '@gluestack-ui/themed';
import { useQuery } from 'convex/react';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { useMemo } from 'react';

export default function WorkoutsByBodyPartScreen() {
  const { bodyPart } = useLocalSearchParams<{ bodyPart: string }>();
  const effectiveBodyPart = useMemo(() => {
    if (!bodyPart) return undefined;
    if (bodyPart === 'push') return 'chest';
    if (bodyPart === 'pull') return 'back';
    return bodyPart;
  }, [bodyPart]);

  const allTemplates = useQuery(api.templates.byBodyPart, effectiveBodyPart ? { bodyPart: effectiveBodyPart } : 'skip');
  const templates = useMemo(() => {
    if (!allTemplates) return allTemplates as any;
    if (bodyPart === 'push') {
      return (allTemplates as any[]).filter(t =>
        /push/i.test(String(t.name || '')) || /push/i.test(String(t.variation || ''))
      );
    }
    if (bodyPart === 'pull') {
      return (allTemplates as any[]).filter(t =>
        /pull/i.test(String(t.name || '')) || /pull/i.test(String(t.variation || ''))
      );
    }
    return allTemplates as any;
  }, [allTemplates, bodyPart]);
  const exerciseIds = useMemo(() => {
    const ids = new Set<string>();
    (templates ?? []).forEach((t: any) => {
      (t.items || []).forEach((it: any) => ids.add(it.exerciseId));
    });
    return Array.from(ids);
  }, [templates]);
  const exercises = useQuery(api.exercises.getMultiple, exerciseIds.length ? { exerciseIds: exerciseIds as any } : 'skip');
  
  const onStartSetup = (template: any) => {
    router.push(`/workout-setup/${template._id}`);
  };

  if (!bodyPart) {
    return (
      <Box 
        bg="$backgroundLight0" 
        sx={{ _dark: { bg: '$backgroundDark0' } }} 
        flex={1} 
        p={24}
        justifyContent="center"
      >
        <Text 
          color="$textLight0"
          sx={{ _dark: { color: '$textDark0' } }}
          textAlign="center"
        >
          Invalid body part
        </Text>
      </Box>
    );
  }

  return (
    <Box 
      bg="$backgroundLight0" 
      sx={{ _dark: { bg: '$backgroundDark0' } }} 
      flex={1}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <VStack space="2xl" p={24}>
          <VStack space="sm" pt={32}>
            <Text 
              size="3xl" 
              fontWeight="$bold" 
              color="$textLight0"
              sx={{ _dark: { color: '$textDark0' } }}
              textTransform="capitalize"
            >
              {bodyPart} Workouts
            </Text>
            <Text 
              size="md" 
              color="$textLight300"
              sx={{ _dark: { color: '$textDark300' } }}
            >
              Choose a workout template to begin
            </Text>
          </VStack>

          <VStack space="lg">
            {(templates ?? []).map((template: any) => (
              <Box
                key={template._id}
                bg="$cardLight"
                sx={{ _dark: { bg: '$cardDark', borderColor: '$borderDark0' } }}
                borderColor="$borderLight0"
                borderWidth={1}
                borderRadius={16}
                p={24}
              >
                <VStack space="lg">
                  <VStack space="sm">
                    <Text 
                      size="xl" 
                      fontWeight="$semibold" 
                      color="$textLight0"
                      sx={{ _dark: { color: '$textDark0' } }}
                    >
                      {template.name}
                    </Text>
                    {template.description && (
                      <Text 
                        size="sm" 
                        color="$textLight200"
                        sx={{ _dark: { color: '$textDark200' } }}
                      >
                        {template.description}
                      </Text>
                    )}
                  </VStack>
                  
                  <VStack space="md">
                    <HStack alignItems="center">
                      <Box 
                        bg="$backgroundLight0" 
                        borderColor="$borderLight0" 
                        borderWidth={1} 
                        borderRadius={999} 
                        px={12} 
                        py={6}
                        sx={{ _dark: { bg: '$backgroundDark0', borderColor: '$borderDark0' } }}
                      >
                        <Text size="xs" color="$textLight300" sx={{ _dark: { color: '$textDark300' } }}>{template.items.length} exercises</Text>
                      </Box>
                      <Box 
                        ml={8}
                        bg="$backgroundLight0" 
                        borderColor="$borderLight0" 
                        borderWidth={1} 
                        borderRadius={999} 
                        px={12} 
                        py={6}
                        sx={{ _dark: { bg: '$backgroundDark0', borderColor: '$borderDark0' } }}
                      >
                        <Text size="xs" color="$textLight300" sx={{ _dark: { color: '$textDark300' } }}>
                          {template.items.reduce((acc: number, it: any) => acc + it.sets.length, 0)} sets
                        </Text>
                      </Box>
                      <Box 
                        ml={8}
                        bg="$backgroundLight0" 
                        borderColor="$borderLight0" 
                        borderWidth={1} 
                        borderRadius={999} 
                        px={12} 
                        py={6}
                        sx={{ _dark: { bg: '$backgroundDark0', borderColor: '$borderDark0' } }}
                      >
                        <Text size="xs" color="$textLight300" sx={{ _dark: { color: '$textDark300' } }}>
                          {Math.max(1, Math.round(((template.items.flatMap((it: any) => it.sets).reduce((acc: number, s: any) => acc + (s.restSec ?? 60), 0)) + (template.items.flatMap((it: any) => it.sets).length * 40)) / 60))} min
                        </Text>
                      </Box>
                    </HStack>

                    <VStack space="xs">
                      <Text 
                        size="sm" 
                        fontWeight="$medium" 
                        color="$textLight200"
                        sx={{ _dark: { color: '$textDark200' } }}
                      >
                        Included exercises
                      </Text>
                      {template.items.map((item: any, index: number) => {
                        const ex = (exercises ?? []).find((e: any) => e._id === item.exerciseId);
                        const label = ex?.name || 'Exercise';
                        const isSuperset = !!item.groupId;
                        const supersetTag = isSuperset ? ` (Superset ${item.groupOrder || 1})` : '';
                        return (
                          <Text 
                            key={index} 
                            size="sm" 
                            color="$textLight300"
                            sx={{ _dark: { color: '$textDark300' } }}
                          >
                            • {label}{supersetTag} · {item.sets.length} sets
                          </Text>
                        );
                      })}
                    </VStack>
                  </VStack>

                  <Button 
                    bg="$primary0"
                    sx={{ _dark: { bg: '$textDark0' } }}
                    onPress={() => onStartSetup(template)}
                    borderRadius={12}
                    h={48}
                    justifyContent="center"
                    alignItems="center"
                    px={24}
                  >
                    <Text 
                      color="$backgroundLight0"
                      sx={{ _dark: { color: '$backgroundDark0' } }}
                      fontWeight="$medium"
                      size="md"
                    >
                      Start Workout
                    </Text>
                  </Button>
                </VStack>
              </Box>
            ))}

            {(!templates || templates.length === 0) && (
              <Box
                bg="$cardLight"
                sx={{ _dark: { bg: '$cardDark', borderColor: '$borderDark0' } }}
                borderColor="$borderLight0"
                borderWidth={1}
                borderRadius={16}
                p={24}
              >
                <VStack space="lg" alignItems="center">
                  <Text 
                    size="md" 
                    color="$textLight200"
                    sx={{ _dark: { color: '$textDark200' } }}
                    textAlign="center"
                  >
                    No {bodyPart} workouts available yet
                  </Text>
                  <Text 
                    size="sm" 
                    color="$textLight300"
                    sx={{ _dark: { color: '$textDark300' } }}
                    textAlign="center"
                  >
                    Check back soon for new workout templates
                  </Text>
                </VStack>
              </Box>
            )}
          </VStack>
        </VStack>
      </ScrollView>
    </Box>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
});