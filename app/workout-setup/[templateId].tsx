import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { useAnonKey } from '@/hooks/useAnonKey';
import { useThemeMode } from '@/hooks/useThemeMode';
import { useWeightUnit } from '@/hooks/useWeightUnit';
import {
  DEFAULT_WORKING_REPS,
  buildPlannedWeightsInKg,
  estimateOneRepMax,
  estimateWeightForReps,
  getDisplayIncrement,
  getReferenceStrengthMultiplier,
  roundGymDisplayWeight,
  type PlannedWeightValue,
} from '@/utils/workoutPlanning';
import { useUser } from '@clerk/clerk-expo';
import { Box, Button, HStack, Text, VStack } from '@gluestack-ui/themed';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery } from 'convex/react';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput } from 'react-native';
import { saveActiveSession } from '@/utils/activeWorkoutStorage';

const keyExercisesByBodyPart: Record<string, { press?: string[], pull?: string[] }> = {
  legs: { 
    press: ['Back Squat', 'Front Squat', 'Leg Press'], 
    pull: ['Romanian Deadlift', 'Stiff Leg Deadlift'] 
  },
  chest: { 
    press: ['Bench Press', 'Incline Bench Press', 'Push-up'], 
    pull: [] 
  },
  back: { 
    press: [], 
    pull: ['Pull-up', 'Lat Pulldown', 'Barbell Row'] 
  },
  arms: { 
    press: ['Overhead Press', 'Dumbbell Press'], 
    pull: ['Barbell Curl', 'Dumbbell Curl'] 
  },
  shoulders: { 
    press: ['Overhead Press', 'Shoulder Press'], 
    pull: ['Face Pull', 'Rear Delt Fly'] 
  },
  core: { press: [], pull: [] }
};

const ACTIVE_SESSION_STORAGE_KEY = 'z-fit-active-session-id';

const getParamValue = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export default function WorkoutSetupScreen() {
  const params = useLocalSearchParams();
  const templateId = getParamValue((params as any)?.templateId);
  const routeTemplateName = getParamValue((params as any)?.templateName);
  const routeExerciseCount = getParamValue((params as any)?.exerciseCount);
  const routeSetCount = getParamValue((params as any)?.setCount);
  const routeEstimatedMinutes = getParamValue((params as any)?.estimatedMinutes);
  const { user } = useUser();
  const { anonKey: storedAnonKey, isLoaded: isAnonLoaded } = useAnonKey();
  const { weightUnit, convertWeight } = useWeightUnit();
  const { effectiveColorScheme } = useThemeMode();
  const isDark = effectiveColorScheme === 'dark';

  const setupBaseData = useQuery(
    api.sessions.getSetupBaseData,
    templateId
      ? {
          templateId: templateId as Id<'templates'>,
        }
      : 'skip'
  );
  const setupData = useQuery(
    api.sessions.getSetupData,
    templateId && (user || isAnonLoaded)
      ? {
          templateId: templateId as Id<'templates'>,
          userId: undefined as any,
          anonKey: user ? undefined : (storedAnonKey || undefined),
        }
      : 'skip'
  );
  const template = setupData?.template ?? setupBaseData?.template;
  const exercises = (setupData?.exercises ?? setupBaseData?.exercises) as any[] | undefined;
  const progressions = setupData?.progressions;
  const latestCompleted = setupData?.latestCompleted;
  const latestAssessments = setupData?.latestAssessments;
  const loadingTitle = template?.name ?? routeTemplateName ?? 'Workout setup';
  const loadingMeta = [
    routeExerciseCount ? `${routeExerciseCount} exercises` : undefined,
    routeSetCount ? `${routeSetCount} sets` : undefined,
    routeEstimatedMinutes ? `~${routeEstimatedMinutes} min` : undefined,
  ].filter(Boolean).join(' · ');
  const startFromTemplate = useMutation(api.sessions.startFromTemplate);
  const recordAssessment = useMutation(api.sessions.recordAssessment);
  const [isStartingWorkout, setIsStartingWorkout] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  
  const [assessmentData, setAssessmentData] = useState<Record<string, { value: number; type: '1rm' | 'working' }>>({});
  const [step, setStep] = useState<'assessment' | 'weights'>('assessment');
  const [plannedWeights, setPlannedWeights] = useState<Record<string, PlannedWeightValue>>({});

  const assessmentQuestions = useMemo<{ exercise: any; type: '1rm' | 'working'; question: string }[]>(() => {
    if (!template || !exercises) return [];
    const itemsSorted = [...(template.items || [])].sort((a: any, b: any) => a.order - b.order);
    const weightedByOrder = itemsSorted
      .map((it: any) => (exercises as any[]).find((ex: any) => ex._id === it.exerciseId))
      .filter((ex: any) => ex && ex.isWeighted);
    if (weightedByOrder.length === 0) return [];
    
    const primary = weightedByOrder[0];
    return [{
      exercise: primary,
      type: '1rm' as const,
      question: `What's your estimated 1RM for ${primary.name.toLowerCase()}?`
    }];
  }, [template, exercises]);

  const isLikelyDumbbellName = (name: string): boolean => {
    const n = String(name || '').toLowerCase();
    return n.includes('dumbbell') || n.includes('lunge');
  };

  const currentQuestion = assessmentQuestions[0];
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [dontKnow, setDontKnow] = useState(false);

  const roundGym = useCallback(
    (weight: number, exerciseMeta?: any): number =>
      roundGymDisplayWeight(weight, weightUnit, exerciseMeta),
    [weightUnit]
  );

  const calculateSuggestedWeight = useCallback(
    (baseWeight: number, baseType: '1rm' | 'working', targetReps: number, exerciseMeta?: any): number => {
      const estimatedOneRm = baseType === '1rm'
        ? baseWeight
        : estimateOneRepMax(baseWeight, DEFAULT_WORKING_REPS);
      const raw = estimateWeightForReps(estimatedOneRm, targetReps);
      return roundGym(raw, exerciseMeta);
    },
    [roundGym]
  );

  const calculateSuggestedWeightsForSets = useCallback(
    (baseWeight: number, baseType: '1rm' | 'working', sets: any[], exerciseMeta?: any): number[] =>
      sets.map((set: any) => calculateSuggestedWeight(baseWeight, baseType, set.reps, exerciseMeta)),
    [calculateSuggestedWeight]
  );

  const estimateFromKeyExercises = useCallback(
    (overrideAssessments?: Record<string, { value: number; type: '1rm' | 'working' }>) => {
      if (!template || !exercises) return {};

      const suggestions: Record<string, PlannedWeightValue> = {};
      const weightedExercises = exercises.filter((ex: any) => ex.isWeighted);
      const effectiveAssessments = overrideAssessments ?? assessmentData;
      const itemsSorted = [...(template.items || [])].sort((a: any, b: any) => a.order - b.order);
      const bodyPartKeys = keyExercisesByBodyPart[template.bodyPart] || { press: [], pull: [] };
      const weightedItems = itemsSorted
        .map((item: any) => ({
          item,
          ex: weightedExercises.find((e: any) => e._id === item.exerciseId),
        }))
        .filter(({ ex }: any) => !!ex);

      const movementTypeFor = (ex: any): 'press' | 'pull' | undefined => {
        const name = String(ex?.name || '').toLowerCase();
        if (bodyPartKeys.press?.some(key => name.includes(key.split(' ')[0].toLowerCase()))) return 'press';
        if (bodyPartKeys.pull?.some(key => name.includes(key.split(' ')[0].toLowerCase()))) return 'pull';
        return undefined;
      };

      const directDataFor = (exerciseId: string): { value: number; type: '1rm' | 'working' } | undefined => {
        if (effectiveAssessments[exerciseId]) return effectiveAssessments[exerciseId];
        const latest = (latestAssessments as any)?.[exerciseId];
        if (latest) {
          const baseUnit = (latest.unit as any) || weightUnit;
          return { value: convertWeight(latest.value, baseUnit, weightUnit as any), type: latest.type };
        }
        const lastCompletedKg = (latestCompleted as any)?.[exerciseId];
        if (lastCompletedKg !== undefined) {
          return { value: convertWeight(lastCompletedKg, 'kg', weightUnit), type: 'working' };
        }
        const progression = (progressions as any)?.[exerciseId];
        if (progression?.nextPlannedWeightKg !== undefined) {
          return { value: convertWeight(progression.nextPlannedWeightKg, 'kg', weightUnit), type: 'working' };
        }
        return undefined;
      };

      const templateWeightsFor = (item: any, exMeta: any): number[] | undefined => {
        const firstKnownWeight = item.sets.find((set: any) => set.weight !== undefined)?.weight;
        if (firstKnownWeight === undefined) return undefined;
        return item.sets.map((set: any) => {
          const weightKg = set.weight ?? firstKnownWeight;
          return roundGym(convertWeight(weightKg, 'kg', weightUnit), exMeta);
        });
      };

      const references = weightedItems
        .map(({ item, ex }: any) => {
          const data = directDataFor(item.exerciseId);
          return data ? { item, ex, data, movement: movementTypeFor(ex) } : null;
        })
        .filter(Boolean) as { item: any; ex: any; data: { value: number; type: '1rm' | 'working' }; movement?: 'press' | 'pull' }[];
      const primaryReference = references[0];

      weightedItems.forEach(({ item, ex }: any) => {
        const exMeta = ex;
        const directData = directDataFor(item.exerciseId);
        if (directData) {
          suggestions[item.exerciseId] = calculateSuggestedWeightsForSets(directData.value, directData.type, item.sets, exMeta);
          return;
        }

        const templateWeights = templateWeightsFor(item, exMeta);
        if (templateWeights) {
          suggestions[item.exerciseId] = templateWeights;
          return;
        }

        const movement = movementTypeFor(ex);
        const familyReference = movement
          ? references.find(reference => reference.movement === movement)
          : undefined;
        const fallbackReference = familyReference ?? primaryReference;
        if (!fallbackReference) return;

        const multiplier = getReferenceStrengthMultiplier(fallbackReference.ex, ex, {
          movement,
          hasFamilyReference: !!familyReference,
        });
        suggestions[item.exerciseId] = calculateSuggestedWeightsForSets(
          fallbackReference.data.value * multiplier,
          fallbackReference.data.type,
          item.sets,
          exMeta
        );
      });

      return suggestions;
    },
    [template, exercises, assessmentData, latestAssessments, progressions, latestCompleted, convertWeight, weightUnit, calculateSuggestedWeightsForSets, roundGym]
  );

  useEffect(() => {
    if (!currentQuestion) return;
    if (currentAnswer && Number(currentAnswer.replace(/[^0-9.]/g, '')) > 0) return;
    const latest = (latestAssessments as any)?.[currentQuestion.exercise._id];
    const progression = (progressions as any)?.[currentQuestion.exercise._id];
    const lastCompletedKg = (latestCompleted as any)?.[currentQuestion.exercise._id];
    let baseValInCurrentUnit: number | undefined;
    let baseType: '1rm' | 'working' | undefined;
    if (latest) {
      const baseUnit = (latest.unit as any) || weightUnit;
      baseValInCurrentUnit = convertWeight(latest.value, baseUnit, weightUnit as any);
      baseType = latest.type;
    } else if (lastCompletedKg !== undefined) {
      baseValInCurrentUnit = convertWeight(lastCompletedKg, 'kg', weightUnit as any);
      baseType = 'working';
    } else if (progression?.nextPlannedWeightKg !== undefined) {
      baseValInCurrentUnit = convertWeight(progression.nextPlannedWeightKg, 'kg', weightUnit as any);
      baseType = 'working';
    }
    if (baseValInCurrentUnit === undefined) return;
    let prefFill = baseValInCurrentUnit;
    if (currentQuestion.type === '1rm' && baseType === 'working') {
      prefFill = baseValInCurrentUnit * (1 + 10 / 30);
    } else if (currentQuestion.type === 'working' && baseType === '1rm') {
      prefFill = baseValInCurrentUnit / (1 + 10 / 30);
    }
    const rounded = roundGym(prefFill, currentQuestion.exercise);
    setCurrentAnswer(String(rounded));
  }, [currentQuestion, latestAssessments, progressions, latestCompleted, weightUnit, currentAnswer, convertWeight, roundGym]);

  const onAnswerQuestion = () => {
    if (!currentQuestion || !currentAnswer) return;
    
    const value = Number(currentAnswer.replace(/[^0-9.]/g, ''));
    if (isNaN(value) || value <= 0) return;
    
    const effectiveType = (dontKnow ? 'working' : currentQuestion.type) as '1rm' | 'working';
    const updatedData = {
      ...assessmentData,
      [currentQuestion.exercise._id]: { value, type: effectiveType }
    };
    
    setAssessmentData(updatedData);
    recordAssessment({
      anonKey: user ? undefined : (storedAnonKey || undefined),
      exerciseId: currentQuestion.exercise._id,
      type: effectiveType as any,
      value,
      unit: weightUnit as any,
    });
    
    const suggestions = estimateFromKeyExercises(updatedData);
    setPlannedWeights(suggestions);
    setStep('weights');
    
    setCurrentAnswer('');
    setDontKnow(false);
  };

  const onStartWorkout = async () => {
    if (activeSessionId) {
      router.push(`/workout/${activeSessionId}`);
      return;
    }
    if (!template || isStartingWorkout) return;
    
    setIsStartingWorkout(true);
    
    try {
      const weightsInKg = buildPlannedWeightsInKg(
        plannedWeights,
        weightUnit,
        (exercises ?? []) as any[],
        convertWeight
      );
      
      const result = await startFromTemplate({ 
        templateId: template._id,
        anonKey: user ? undefined : (storedAnonKey || undefined),
        plannedWeights: weightsInKg,
      });
      const sessionId = typeof result === 'string' ? result : result.sessionId;
      const nextSessionId = String(sessionId);
      setActiveSessionId(nextSessionId);
      try {
        if (typeof result === 'string') {
          await AsyncStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, nextSessionId);
        } else {
          await saveActiveSession(result.session);
        }
      } catch {}
      setIsStartingWorkout(false);
      router.push(`/workout/${sessionId}`);
    } catch {
      setIsStartingWorkout(false);
      Alert.alert('Failed to start workout', 'Something went wrong. Please try again.');
    }
  };

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      setIsStartingWorkout(false);
      AsyncStorage.getItem(ACTIVE_SESSION_STORAGE_KEY)
        .then((storedSessionId) => {
          if (isActive) setActiveSessionId(storedSessionId);
        })
        .catch(() => {
          if (isActive) setActiveSessionId(null);
        });

      return () => {
        isActive = false;
      };
    }, [])
  );

  useEffect(() => {
    if (step !== 'assessment') return;
    if (!template || !exercises) return;
    if (assessmentQuestions.length === 0) {
      const suggestions = estimateFromKeyExercises();
      setPlannedWeights(suggestions);
      setStep('weights');
    }
  }, [step, template, exercises, assessmentQuestions, estimateFromKeyExercises]);

  useEffect(() => {
    if (step !== 'weights') return;
    if (!template || !exercises) return;
    const suggestions = estimateFromKeyExercises();
    if (!suggestions || Object.keys(suggestions).length === 0) return;
    setPlannedWeights((prev: Record<string, PlannedWeightValue>) => {
      const next = { ...prev } as Record<string, PlannedWeightValue>;
      let changed = false;
      template.items.forEach((item: any) => {
        if (next[item.exerciseId] === undefined && suggestions[item.exerciseId] !== undefined) {
          next[item.exerciseId] = suggestions[item.exerciseId];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [step, latestAssessments, progressions, latestCompleted, exercises, template, weightUnit, estimateFromKeyExercises]);

  const inputStyle = {
    minWidth: 140,
    borderColor: isDark ? '#495057' : '#CED4DA',
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 24,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
    backgroundColor: isDark ? '#343A40' : '#F8F9FA',
    color: isDark ? '#F8F9FA' : '#212529',
  };

  if (setupBaseData === null || setupData === null) {
    return (
      <Box
        bg="$backgroundLight0"
        sx={{ _dark: { bg: '$backgroundDark0' } }}
        flex={1}
        p={24}
        justifyContent="center"
      >
        <VStack space="md" alignItems="center">
          <Text
            color="$textLight0"
            sx={{ _dark: { color: '$textDark0' } }}
            textAlign="center"
            fontWeight="$bold"
            size="lg"
          >
            Workout not found
          </Text>
          <Text
            color="$textLight300"
            sx={{ _dark: { color: '$textDark300' } }}
            textAlign="center"
          >
            This workout may have been removed. Please choose another workout.
          </Text>
        </VStack>
      </Box>
    );
  }

  if (!template) {
    return (
      <Box 
        bg="$backgroundLight0" 
        sx={{ _dark: { bg: '$backgroundDark0' } }} 
        flex={1}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <VStack space="xl" p={24} pb={120}>
            <VStack space="xs" pt={32}>
              <Text
                size="sm"
                color="$textLight300"
                sx={{ _dark: { color: '$textDark300' } }}
                textTransform="uppercase"
                letterSpacing={1}
              >
                Setup
              </Text>
              <Text
                size="3xl"
                fontWeight="$bold"
                color="$textLight0"
                sx={{ _dark: { color: '$textDark0' } }}
              >
                {loadingTitle}
              </Text>
              {!!loadingMeta && (
                <Text
                  size="sm"
                  color="$textLight300"
                  sx={{ _dark: { color: '$textDark300' } }}
                >
                  {loadingMeta}
                </Text>
              )}
            </VStack>

            <Box
              bg="$cardLight"
              sx={{ _dark: { bg: '$cardDark', borderColor: '$borderDark0' } }}
              borderColor="$borderLight0"
              borderWidth={1}
              borderRadius={20}
              p={24}
            >
              <VStack space="sm">
                <Text
                  size="lg"
                  fontWeight="$semibold"
                  color="$textLight0"
                  sx={{ _dark: { color: '$textDark0' } }}
                >
                  Preparing your workout
                </Text>
                <Text
                  size="sm"
                  color="$textLight300"
                  sx={{ _dark: { color: '$textDark300' } }}
                >
                  Loading exercises and weight suggestions...
                </Text>
              </VStack>
            </Box>
          </VStack>
        </ScrollView>
      </Box>
    );
  }

  if (step === 'assessment') {
    if (!currentQuestion) {
      return (
        <Box 
          bg="$backgroundLight0" 
          sx={{ _dark: { bg: '$backgroundDark0' } }} 
          flex={1}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <VStack space="xl" p={24} pb={120}>
              <VStack space="xs" pt={32}>
                <Text
                  size="sm"
                  color="$textLight300"
                  sx={{ _dark: { color: '$textDark300' } }}
                  textTransform="uppercase"
                  letterSpacing={1}
                >
                  Setup
                </Text>
                <Text
                  size="3xl"
                  fontWeight="$bold"
                  color="$textLight0"
                  sx={{ _dark: { color: '$textDark0' } }}
                >
                  {loadingTitle}
                </Text>
              </VStack>

              <Box
                bg="$cardLight"
                sx={{ _dark: { bg: '$cardDark', borderColor: '$borderDark0' } }}
                borderColor="$borderLight0"
                borderWidth={1}
                borderRadius={20}
                p={24}
              >
                <Text
                  size="sm"
                  color="$textLight300"
                  sx={{ _dark: { color: '$textDark300' } }}
                >
                  Preparing weight suggestions...
                </Text>
              </Box>
            </VStack>
          </ScrollView>
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
          <VStack space="2xl" p={24} pb={120}>
            <VStack space="sm" pt={32}>
              <Text 
                size="sm" 
                color="$textLight300"
                sx={{ _dark: { color: '$textDark300' } }}
                textTransform="uppercase"
                letterSpacing={1}
              >
                Weight Calibration
              </Text>
              <Text 
                size="3xl" 
                fontWeight="$bold" 
                color="$textLight0"
                sx={{ _dark: { color: '$textDark0' } }}
              >
                {template.name}
              </Text>
            </VStack>

            <Box
              bg="$cardLight"
              sx={{ _dark: { bg: '$cardDark', borderColor: '$borderDark0' } }}
              borderColor="$borderLight0"
              borderWidth={1}
              borderRadius={20}
              p={32}
              alignItems="center"
            >
              <VStack space="2xl" alignItems="center" w="100%">
                <VStack alignItems="center" space="md">
                  <Text 
                    size="2xl" 
                    fontWeight="$bold" 
                    color="$textLight0"
                    sx={{ _dark: { color: '$textDark0' } }}
                    textAlign="center"
                  >
                    {dontKnow
                      ? `What's a comfortable working weight for ${currentQuestion.exercise.name.toLowerCase()}?`
                      : isLikelyDumbbellName(currentQuestion.exercise.name)
                        ? `${currentQuestion.question} (per dumbbell)`
                        : currentQuestion.question}
                  </Text>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onPress={() => setDontKnow(!dontKnow)}
                    borderColor={dontKnow ? '$primary0' : '$borderLight0'}
                    sx={{ 
                      _dark: { 
                        borderColor: dontKnow ? '$textDark0' : '$borderDark0',
                        bg: dontKnow ? '$textDark0' : 'transparent'
                      } 
                    }}
                    borderRadius={12}
                    bg={dontKnow ? "$primary0" : "transparent"}
                  >
                    <Text 
                      color={dontKnow ? "$backgroundLight0" : "$textLight300"}
                      sx={{ _dark: { color: dontKnow ? '$backgroundDark0' : '$textDark300' } }}
                      size="sm"
                      fontWeight="$medium"
                    >
                      {dontKnow ? 'Use 1RM Instead' : 'Use Working Weight Instead'}
                    </Text>
                  </Button>
                </VStack>

                <VStack alignItems="center" space="lg">
                  <VStack alignItems="center" space="xs">
                    <Text 
                      size="sm" 
                      color="$textLight200"
                      sx={{ _dark: { color: '$textDark200' } }}
                      textTransform="uppercase"
                      letterSpacing={1}
                    >
                      {dontKnow ? `Working Weight (${weightUnit})` : `1RM (${weightUnit})`}
                    </Text>
                    <HStack alignItems="center" space="sm">
                      <Button
                        variant="outline"
                        size="sm"
                        borderColor="$borderLight0"
                        sx={{ _dark: { borderColor: '$borderDark0' } }}
                        borderRadius={12}
                        onPress={() => {
                          const inc = getDisplayIncrement(weightUnit, currentQuestion.exercise);
                          const num = Number((currentAnswer || '0').replace(/[^0-9.]/g, '')) || 0;
                          const next = Math.max(0, num - inc);
                          const rounded = roundGym(next, currentQuestion.exercise);
                          setCurrentAnswer(String(rounded));
                        }}
                      >
                        <Text size="lg" color="$textLight0" sx={{ _dark: { color: '$textDark0' } }}>−</Text>
                      </Button>
                      <TextInput
                        keyboardType="numeric"
                        placeholder={weightUnit === 'kg' ? (dontKnow ? '60' : '80') : (dontKnow ? '135' : '175')}
                        placeholderTextColor={isDark ? '#6C757D' : '#ADB5BD'}
                        value={currentAnswer}
                        onChangeText={setCurrentAnswer}
                        style={inputStyle}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        borderColor="$borderLight0"
                        sx={{ _dark: { borderColor: '$borderDark0' } }}
                        borderRadius={12}
                        onPress={() => {
                          const inc = getDisplayIncrement(weightUnit, currentQuestion.exercise);
                          const num = Number((currentAnswer || '0').replace(/[^0-9.]/g, '')) || 0;
                          const next = num + inc;
                          const rounded = roundGym(next, currentQuestion.exercise);
                          setCurrentAnswer(String(rounded));
                        }}
                      >
                        <Text size="lg" color="$textLight0" sx={{ _dark: { color: '$textDark0' } }}>+</Text>
                      </Button>
                    </HStack>
                  </VStack>

                  <Button 
                    bg="$primary0"
                    sx={{ _dark: { bg: '$textDark0' } }}
                    onPress={onAnswerQuestion}
                    isDisabled={!currentAnswer || Number(currentAnswer.replace(/[^0-9.]/g, '')) <= 0}
                    borderRadius={16}
                    h={56}
                    w="100%"
                    justifyContent="center"
                    alignItems="center"
                    display="flex"
                  >
                    <Text 
                      color="$backgroundLight0"
                      sx={{ _dark: { color: '$backgroundDark0' } }}
                      fontWeight="$semibold"
                      size="lg"
                      textAlign="center"
                      flex={1}
                    >
                      Generate Plan
                    </Text>
                  </Button>

                  <Button 
                    variant="link"
                    size="sm"
                    onPress={() => {
                      const suggestions = estimateFromKeyExercises();
                      setPlannedWeights(suggestions);
                      setStep('weights');
                    }}
                  >
                    <Text size="xs" color="$textLight300" sx={{ _dark: { color: '$textDark300' } }}>
                      Skip for now
                    </Text>
                  </Button>
                </VStack>
              </VStack>
            </Box>
          </VStack>
        </ScrollView>
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
        <VStack space="xl" p={24} pb={120}>
          <VStack space="xs" pt={32}>
            <Text 
              size="3xl" 
              fontWeight="$bold" 
              color="$textLight0"
              sx={{ _dark: { color: '$textDark0' } }}
            >
              {template.name}
            </Text>
            <Text 
              size="sm" 
              color="$textLight300"
              sx={{ _dark: { color: '$textDark300' } }}
            >
              {template.items.filter((i: any) => (exercises ?? []).find((e: any) => e._id === i.exerciseId)?.isWeighted).length} exercises
            </Text>
          </VStack>

          <VStack space="sm">
            {template.items.map((item: any, idx: number) => {
              const ex = (exercises ?? []).find((e: any) => e._id === item.exerciseId);
              if (!ex?.isWeighted) return null;
              const exMeta = ex as any;
              const planned = plannedWeights[item.exerciseId];
              const setWeights = Array.isArray(planned)
                ? planned
                : item.sets.map(() => typeof planned === 'number' ? planned : 0);
              const formatW = (w: number) => {
                const d = exMeta.loadingMode === 'pair' ? w / 2 : w;
                return `${Math.round(d)}`;
              };
              const repWeightPairs = item.sets.map((s: any, si: number) => ({
                reps: s.reps,
                weight: formatW(setWeights[si] || 0),
              }));
              const deduped: { reps: number; weight: string; count: number }[] = [];
              for (const p of repWeightPairs) {
                const last = deduped[deduped.length - 1];
                if (last && last.reps === p.reps && last.weight === p.weight) {
                  last.count += 1;
                } else {
                  deduped.push({ ...p, count: 1 });
                }
              }
              const pairSuffix = exMeta.loadingMode === 'pair'
                ? (exMeta.equipment === 'kettlebell' ? ' ea' : ' ea')
                : '';
              
              return (
                <Box
                  key={idx}
                  bg="$cardLight"
                  sx={{ _dark: { bg: '$cardDark', borderColor: '$borderDark0' } }}
                  borderColor="$borderLight0"
                  borderWidth={1}
                  borderRadius={12}
                  px={16}
                  py={14}
                >
                  <HStack alignItems="center" justifyContent="space-between">
                    <VStack space="xs" flex={1} mr={12}>
                      <Text 
                        size="md" 
                        fontWeight="$semibold" 
                        color="$textLight0"
                        sx={{ _dark: { color: '$textDark0' } }}
                        numberOfLines={1}
                      >
                        {ex.name}
                      </Text>
                      <Text 
                        size="xs" 
                        color="$textLight300"
                        sx={{ _dark: { color: '$textDark300' } }}
                        numberOfLines={1}
                      >
                        {deduped.map(d =>
                          d.count > 1
                            ? `${d.count}x${d.reps} @ ${d.weight}${pairSuffix}`
                            : `${d.reps} @ ${d.weight}${pairSuffix}`
                        ).join('  ·  ')}
                        {` ${weightUnit}`}
                      </Text>
                    </VStack>
                    {!!item.groupId && (
                      <Box
                        bg="$primary0"
                        sx={{ _dark: { bg: '$textDark0' } }}
                        borderRadius={6}
                        px={8}
                        py={3}
                      >
                        <Text
                          size="xs"
                          color="$backgroundLight0"
                          sx={{ _dark: { color: '$backgroundDark0' } }}
                          fontWeight="$bold"
                          textTransform="uppercase"
                          letterSpacing={0.5}
                        >
                          SS
                        </Text>
                      </Box>
                    )}
                  </HStack>
                </Box>
              );
            })}
          </VStack>

          <VStack space="md">
            <Button 
              bg="$primary0"
              sx={{ _dark: { bg: '$textDark0' }, opacity: isStartingWorkout ? 0.7 : 1 }}
              onPress={onStartWorkout}
              isDisabled={isStartingWorkout && !activeSessionId}
              borderRadius={16}
              h={56}
              w="100%"
              justifyContent="center"
              alignItems="center"
            >
              <Text 
                color="$backgroundLight0"
                sx={{ _dark: { color: '$backgroundDark0' } }}
                fontWeight="$semibold"
                size="lg"
              >
                {activeSessionId ? 'Resume Workout' : isStartingWorkout ? 'Starting...' : 'Start Workout'}
              </Text>
            </Button>
            <Button 
              variant="outline" 
              onPress={() => {
                setStep('assessment');
                setCurrentAnswer('');
                setDontKnow(false);
              }}
              borderColor="$borderLight0"
              sx={{ _dark: { borderColor: '$borderDark0' } }}
              borderRadius={16}
              h={48}
              w="100%"
              justifyContent="center"
              alignItems="center"
            >
              <Text 
                color="$textLight0"
                sx={{ _dark: { color: '$textDark0' } }}
                fontWeight="$medium"
                size="md"
              >
                Re-enter Estimate
              </Text>
            </Button>
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
