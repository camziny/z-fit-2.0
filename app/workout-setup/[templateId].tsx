import { api } from '@/convex/_generated/api';
import { useAnonKey } from '@/hooks/useAnonKey';
import { useWeightUnit } from '@/hooks/useWeightUnit';
import { useUser } from '@clerk/clerk-expo';
import { Box, Button, HStack, Text, VStack } from '@gluestack-ui/themed';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery } from 'convex/react';
import { Image as ExpoImage } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput } from 'react-native';

// Key exercises for assessment by body part
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

export default function WorkoutSetupScreen() {
  const params = useLocalSearchParams();
  const templateParam = (params as any)?.templateId as string | string[] | undefined;
  const templateId = Array.isArray(templateParam) ? templateParam[0] : templateParam;
  const { user } = useUser();
  const { anonKey: storedAnonKey, isLoaded: isAnonLoaded } = useAnonKey();
  const { weightUnit, convertWeight } = useWeightUnit();
  const template = useQuery(api.templates.getById, templateId ? { templateId } : 'skip');
  const exercises = useQuery(api.exercises.getMultiple, 
    template ? { exerciseIds: template.items.map(item => item.exerciseId) } : 'skip'
  );
  const progressions = useQuery(api.sessions.getProgressionsForExercises,
    template ? { userId: undefined as any, exerciseIds: template.items.map(item => item.exerciseId) } : 'skip'
  );
  const latestCompleted = useQuery(
    api.sessions.getLatestCompletedWeights,
    template && (user || isAnonLoaded)
      ? { userId: undefined as any, anonKey: user ? undefined : (storedAnonKey || undefined), exerciseIds: template.items.map(item => item.exerciseId) }
      : 'skip'
  );
  const latestAssessments = useQuery(
    api.sessions.getLatestAssessments,
    template && exercises && (user || isAnonLoaded)
      ? { userId: undefined as any, anonKey: user ? undefined : (storedAnonKey || undefined), exerciseIds: template.items.map(i => i.exerciseId) }
      : 'skip'
  );
  const startFromTemplate = useMutation(api.sessions.startFromTemplate);
  const recordAssessment = useMutation(api.sessions.recordAssessment);
  const [isStartingWorkout, setIsStartingWorkout] = useState(false);
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [assessmentData, setAssessmentData] = useState<Record<string, { value: number; type: '1rm' | 'working' }>>({});
  const [step, setStep] = useState<'assessment' | 'weights'>('assessment');
  const [plannedWeights, setPlannedWeights] = useState<Record<string, number>>({});
  const [whyOpen, setWhyOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!exercises || !template) return;
    try {
      const idsInTemplate = new Set(template.items.map((i: any) => i.exerciseId));
      const inOrder = (exercises as any[]).filter((e: any) => idsInTemplate.has(e._id));
      const toPrefetch = inOrder.map((e: any) => e.gifUrl).filter(Boolean).slice(0, 4) as string[];
      toPrefetch.forEach((u) => { try { ExpoImage.prefetch(u).catch(() => {}); } catch {} });
    } catch {}
  }, [template, exercises]);

  const assessmentQuestions = useMemo(() => {
    if (!template || !exercises) return [];
    const itemsSorted = [...(template.items || [])].sort((a: any, b: any) => a.order - b.order);
    const weightedByOrder = itemsSorted
      .map((it: any) => (exercises as any[]).find((ex: any) => ex._id === it.exerciseId))
      .filter((ex: any) => ex && ex.isWeighted);
    const questions: Array<{ exercise: any; type: '1rm' | 'working'; question: string }> = [];
    if (weightedByOrder.length === 0) return questions;
    const primary = weightedByOrder[0];
    questions.push({
      exercise: primary,
      type: '1rm',
      question: `If you had to do 1 rep max on ${primary.name.toLowerCase()}, how much do you think you could do?`
    });
    weightedByOrder.slice(1).forEach((ex: any) => {
      questions.push({
        exercise: ex,
        type: 'working',
        question: `For ${ex.name.toLowerCase()}, what weight would you typically use for a moderate set?`
      });
    });
    return questions;
  }, [template, exercises]);

  const isLikelyDumbbellName = (name: string): boolean => {
    const n = String(name || '').toLowerCase();
    return n.includes('dumbbell') || n.includes('lunge');
  };

  const currentQuestion = assessmentQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === assessmentQuestions.length - 1;

  const [currentAnswer, setCurrentAnswer] = useState('');
  const [dontKnow, setDontKnow] = useState(false);

  const roundGym = (weight: number, exerciseMeta?: any): number => {
    const incKg = exerciseMeta?.roundingIncrementKg ?? 2.5;
    const incLbs = exerciseMeta?.roundingIncrementLbs ?? (exerciseMeta?.equipment === 'dumbbell' ? 5 : 2.5);
    if (weightUnit === 'kg') return Math.round(weight / incKg) * incKg;
    return Math.round(weight / 5) * 5;
  };

  const calculateSuggestedWeight = (baseWeight: number, baseType: '1rm' | 'working', targetReps: number, exerciseMeta?: any): number => {
    const assumedWorkingReps = 10;
    let estimatedOneRm = baseWeight;
    if (baseType === 'working') {
      estimatedOneRm = baseWeight * (1 + assumedWorkingReps / 30);
    }
    const raw = estimatedOneRm / (1 + targetReps / 30);
    return roundGym(raw, exerciseMeta);
  };

  const estimateFromKeyExercises = () => {
    if (!template || !exercises) return {};
    
    const suggestions: Record<string, number> = {};
    const weightedExercises = exercises.filter((ex: any) => ex.isWeighted);
    
    // Get assessment data for key exercises
    const assessedExercises = Object.keys(assessmentData);
    
    template.items.forEach((item: any) => {
      const ex = weightedExercises.find((e: any) => e._id === item.exerciseId);
      if (!ex) return;
      const exMeta = ex;
      
      const avgReps = item.sets.reduce((acc: number, s: any) => acc + s.reps, 0) / item.sets.length;
      
      // If this exercise was assessed directly
      const latest = (latestAssessments as any)?.[item.exerciseId];
      const progression = (progressions as any)?.[item.exerciseId];
      const lastCompletedKg = (latestCompleted as any)?.[item.exerciseId];
      if (assessedExercises.includes(item.exerciseId) || latest || progression?.nextPlannedWeightKg !== undefined || lastCompletedKg !== undefined) {
        const data = assessedExercises.includes(item.exerciseId)
          ? assessmentData[item.exerciseId]
          : latest
            ? { value: latest.value, type: latest.type }
            : progression?.nextPlannedWeightKg !== undefined
              ? { value: convertWeight(progression.nextPlannedWeightKg, 'kg', weightUnit), type: 'working' }
              : { value: convertWeight(lastCompletedKg, 'kg', weightUnit), type: 'working' };
        suggestions[item.exerciseId] = calculateSuggestedWeight(data.value, data.type, avgReps, exMeta);
        return;
      }
      
      // Estimate based on similar exercise type
      const bodyPartKeys = keyExercisesByBodyPart[template.bodyPart] || { press: [], pull: [] };
      const isPress = bodyPartKeys.press?.some(name => ex.name.includes(name.split(' ')[0]));
      const isPull = bodyPartKeys.pull?.some(name => ex.name.includes(name.split(' ')[0]));
      
      // Find similar assessed exercise
      let baseExercise = null;
      let multiplier = 0.8; // Conservative estimate
      
      if (isPress) {
        baseExercise = assessedExercises.find(id => {
          const assessedEx = exercises.find(e => e._id === id);
          return assessedEx && bodyPartKeys.press?.some(name => assessedEx.name.includes(name.split(' ')[0]));
        });
        multiplier = 0.8; // Press exercises similar, keep conservative
      } else if (isPull) {
        baseExercise = assessedExercises.find(id => {
          const assessedEx = exercises.find(e => e._id === id);
          return assessedEx && bodyPartKeys.pull?.some(name => assessedEx.name.includes(name.split(' ')[0]));
        });
        multiplier = 0.75; // Pull exercises vary more
      }
      
      if (baseExercise) {
        const baseData = assessmentData[baseExercise];
        const adjustedBase = baseData.value * multiplier;
        const estimatedWeight = calculateSuggestedWeight(adjustedBase, baseData.type, avgReps, exMeta);
        suggestions[item.exerciseId] = estimatedWeight;
      }
    });
    
    return suggestions;
  };

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
    } else if (progression?.nextPlannedWeightKg !== undefined) {
      baseValInCurrentUnit = convertWeight(progression.nextPlannedWeightKg, 'kg', weightUnit as any);
      baseType = 'working';
    } else if (lastCompletedKg !== undefined) {
      baseValInCurrentUnit = convertWeight(lastCompletedKg, 'kg', weightUnit as any);
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
  }, [currentQuestion, latestAssessments, progressions, latestCompleted, weightUnit]);

  const onAnswerQuestion = () => {
    if (!currentQuestion || !currentAnswer) return;
    
    const value = Number(currentAnswer.replace(/[^0-9.]/g, ''));
    if (isNaN(value) || value <= 0) return;
    
    setAssessmentData(prev => ({
      ...prev,
      [currentQuestion.exercise._id]: {
        value,
        type: dontKnow ? 'working' : currentQuestion.type
      }
    }));
    // Persist assessment
    recordAssessment({
      userId: user ? undefined : undefined,
      anonKey: user ? undefined : (storedAnonKey || undefined),
      exerciseId: currentQuestion.exercise._id,
      type: (dontKnow ? 'working' : currentQuestion.type) as any,
      value,
      unit: weightUnit as any,
    });
    
    if (isLastQuestion) {
      // Generate suggestions and move to weight planning
      const suggestions = estimateFromKeyExercises();
      setPlannedWeights(suggestions);
      setStep('weights');
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
    
    setCurrentAnswer('');
    setDontKnow(false);
  };

  const onStartWorkout = async () => {
    if (!template || isStartingWorkout) return;
    
    setIsStartingWorkout(true);
    
    try {
      const weightsInKg: Record<string, number> = {};
      Object.entries(plannedWeights).forEach(([exerciseId, weight]) => {
        const rounded = roundGym(weight);
        weightsInKg[exerciseId] = convertWeight(rounded, weightUnit, 'kg');
      });
      
      const sessionId = await startFromTemplate({ 
        templateId: template._id,
        userId: user ? undefined : undefined,
        anonKey: user ? undefined : (storedAnonKey || undefined),
        plannedWeights: weightsInKg,
      });
      try { await AsyncStorage.setItem('z-fit-active-session-id', String(sessionId)); } catch {}
      router.push(`/workout/${sessionId}`);
    } catch (error) {
      setIsStartingWorkout(false);
    }
  };
  useEffect(() => {
    if (step !== 'assessment') return;
    if (!template || !exercises) return;
    if (assessmentQuestions.length === 0) {
      const suggestions = estimateFromKeyExercises();
      setPlannedWeights(suggestions);
      setStep('weights');
    }
  }, [step, template, exercises, assessmentQuestions]);

  useEffect(() => {
    if (step !== 'weights') return;
    if (!template || !exercises) return;
    const suggestions = estimateFromKeyExercises();
    if (!suggestions || Object.keys(suggestions).length === 0) return;
    setPlannedWeights((prev: Record<string, number>) => {
      const next = { ...prev } as Record<string, number>;
      template.items.forEach((item: any) => {
        if (next[item.exerciseId] === undefined && suggestions[item.exerciseId] !== undefined) {
          next[item.exerciseId] = suggestions[item.exerciseId];
        }
      });
      return next;
    });
  }, [step, latestAssessments, progressions, latestCompleted, exercises, template, weightUnit]);

  if (!template) {
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
          Loading workout...
        </Text>
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
          p={24}
          justifyContent="center"
        >
          <Text 
            color="$textLight300"
            sx={{ _dark: { color: '$textDark300' } }}
            textAlign="center"
          >
            Preparing questions...
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
          <VStack space="2xl" p={24} pb={120}>
            {/* Progress indicator */}
            <VStack space="md" pt={16}>
              <HStack justifyContent="space-between" alignItems="center">
                <Text 
                  size="sm" 
                  color="$textLight300"
                  sx={{ _dark: { color: '$textDark300' } }}
                  textTransform="uppercase"
                  letterSpacing={1}
                >
                  Question {currentQuestionIndex + 1} of {assessmentQuestions.length}
                </Text>
                <Text 
                  size="sm" 
                  color="$textLight300"
                  sx={{ _dark: { color: '$textDark300' } }}
                >
                  {Math.round(((currentQuestionIndex + 1) / assessmentQuestions.length) * 100)}%
                </Text>
              </HStack>
              
              <Box 
                bg="$backgroundLight100" 
                sx={{ _dark: { bg: '$backgroundDark100' } }}
                borderRadius={999} 
                h={6} 
                overflow="hidden"
              >
                <Box 
                  bg="$primary0"
                  sx={{ _dark: { bg: '$textDark0' } }}
                  h="100%" 
                  borderRadius={999}
                  style={{ width: `${((currentQuestionIndex + 1) / assessmentQuestions.length) * 100}%` }}
                />
              </Box>
            </VStack>

            {/* Main question card */}
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
                    {isLikelyDumbbellName(currentQuestion.exercise.name)
                      ? `${currentQuestion.question} (per dumbbell)`
                      : currentQuestion.question}
                  </Text>
                  
                  {currentQuestion.type === '1rm' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onPress={() => setDontKnow(!dontKnow)}
                      borderColor="$borderLight0"
                      sx={{ _dark: { borderColor: '$borderDark0' } }}
                      borderRadius={12}
                      bg={dontKnow ? "$primary0" : "transparent"}
                      sx={dontKnow ? { _dark: { bg: '$textDark0' } } : { _dark: { bg: 'transparent' } }}
                    >
                      <Text 
                        color={dontKnow ? "$backgroundLight0" : "$textLight300"}
                        sx={dontKnow ? { _dark: { color: '$backgroundDark0' } } : { _dark: { color: '$textDark300' } }}
                        size="sm"
                        fontWeight="$medium"
                      >
                        {dontKnow ? 'I know my 1RM' : "I don't know my 1RM"}
                      </Text>
                    </Button>
                  )}
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
                      {dontKnow ? `Working Weight (${weightUnit})` : `${currentQuestion.type === '1rm' ? '1RM' : 'Weight'} (${weightUnit})`}
                    </Text>
                    <HStack alignItems="center" space="sm">
                      <Button
                        variant="outline"
                        size="sm"
                        borderColor="$borderLight0"
                        sx={{ _dark: { borderColor: '$borderDark0' } }}
                        borderRadius={12}
                        onPress={() => {
                          const step = weightUnit === 'kg' ? 2.5 : 5;
                          const num = Number((currentAnswer || '0').replace(/[^0-9.]/g, '')) || 0;
                          const next = Math.max(0, num - step);
                          const rounded = roundGym(next, currentQuestion.exercise);
                          setCurrentAnswer(String(rounded));
                        }}
                      >
                        <Text size="lg" color="$textLight0" sx={{ _dark: { color: '$textDark0' } }}>−</Text>
                      </Button>
                      <TextInput
                        keyboardType="numeric"
                        placeholder={weightUnit === 'kg' ? (dontKnow ? '60' : '80') : (dontKnow ? '135' : '175')}
                        value={currentAnswer}
                        onChangeText={setCurrentAnswer}
                        style={{
                          minWidth: 140,
                          borderColor: '#CED4DA',
                          borderWidth: 2,
                          borderRadius: 16,
                          paddingHorizontal: 20,
                          paddingVertical: 16,
                          fontSize: 24,
                          fontWeight: '700',
                          textAlign: 'center',
                          backgroundColor: '#F8F9FA',
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        borderColor="$borderLight0"
                        sx={{ _dark: { borderColor: '$borderDark0' } }}
                        borderRadius={12}
                        onPress={() => {
                          const step = weightUnit === 'kg' ? 2.5 : 5;
                          const num = Number((currentAnswer || '0').replace(/[^0-9.]/g, '')) || 0;
                          const next = num + step;
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
                      {isLastQuestion ? 'Generate Workout Plan' : 'Next Question'}
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
                      Skip assessment for now
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
        <VStack space="2xl" p={24} pb={120}>
          <VStack space="sm" pt={32}>
            <Text 
              size="3xl" 
              fontWeight="$bold" 
              color="$textLight0"
              sx={{ _dark: { color: '$textDark0' } }}
            >
              Plan Your Weights
            </Text>
            <Text 
              size="md" 
              color="$textLight300"
              sx={{ _dark: { color: '$textDark300' } }}
            >
              Adjust suggested weights based on your strength assessment
            </Text>
          </VStack>

          <VStack space="lg">
            {template.items.map((item: any, idx: number) => {
              const ex = (exercises ?? []).find((e: any) => e._id === item.exerciseId);
              if (!ex?.isWeighted) return null;
              const exMeta = ex as any;
              const isSuperset = !!item.groupId;
              
              return (
                <Box
                  key={idx}
                  bg="$cardLight"
                  sx={{ _dark: { bg: '$cardDark', borderColor: '$borderDark0' } }}
                  borderColor="$borderLight0"
                  borderWidth={1}
                  borderRadius={16}
                  p={24}
                >
                  <VStack space="md">
                    <VStack space="xs">
                      <Text 
                        size="lg" 
                        fontWeight="$semibold" 
                        color="$textLight0"
                        sx={{ _dark: { color: '$textDark0' } }}
                      >
                        {ex.name}
                      </Text>
                      {isSuperset && (
                        <Text 
                          size="xs" 
                          color="$textLight300"
                          sx={{ _dark: { color: '$textDark300' } }}
                          textTransform="uppercase"
                          letterSpacing={1}
                        >
                          Superset {item.groupOrder || 1}
                        </Text>
                      )}
                      <Text 
                        size="sm" 
                        color="$textLight300"
                        sx={{ _dark: { color: '$textDark300' } }}
                      >
                        {item.sets.length} sets • {item.sets.map((s: any) => s.reps).join(', ')} reps
                      </Text>
                    </VStack>
                    
                    <HStack alignItems="center" space="md">
                      <Text 
                        size="sm" 
                        color="$textLight200"
                        sx={{ _dark: { color: '$textDark200' } }}
                        fontWeight="$medium"
                      >
                        Weight ({weightUnit}):
                      </Text>
                      <HStack alignItems="center" space="sm">
                        <Button
                          variant="outline"
                          size="sm"
                          borderColor="$borderLight0"
                          sx={{ _dark: { borderColor: '$borderDark0' } }}
                          borderRadius={12}
                          onPress={() => {
                            const step = weightUnit === 'kg' ? 2.5 : 5;
                            const cur = plannedWeights[item.exerciseId] ?? 0;
                            const next = Math.max(0, cur - step);
                            const rounded = roundGym(next, exMeta);
                            setPlannedWeights(prev => ({ ...prev, [item.exerciseId]: rounded }));
                          }}
                        >
                          <Text size="lg" color="$textLight0" sx={{ _dark: { color: '$textDark0' } }}>−</Text>
                        </Button>
                        <TextInput
                          keyboardType="numeric"
                          placeholder="0"
                          value={String(plannedWeights[item.exerciseId] ?? '')}
                          onChangeText={(t) => {
                            const cleaned = (t || '').replace(/[^0-9.]/g, '');
                            if (cleaned === '') {
                              setPlannedWeights(prev => {
                                const { [item.exerciseId]: _omit, ...rest } = prev as any;
                                return rest as any;
                              });
                              return;
                            }
                            const num = Number(cleaned);
                            setPlannedWeights(prev => ({ ...prev, [item.exerciseId]: isNaN(num) ? 0 : num }));
                          }}
                          style={{
                            minWidth: 120,
                            borderColor: '#CED4DA',
                            borderWidth: 1,
                            borderRadius: 12,
                            paddingHorizontal: 16,
                            paddingVertical: 12,
                            fontSize: 16,
                            fontWeight: '600',
                            textAlign: 'center',
                            backgroundColor: '#F8F9FA',
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          borderColor="$borderLight0"
                          sx={{ _dark: { borderColor: '$borderDark0' } }}
                          borderRadius={12}
                          onPress={() => {
                            const step = weightUnit === 'kg' ? 2.5 : 5;
                            const cur = plannedWeights[item.exerciseId] ?? 0;
                            const next = cur + step;
                            const rounded = roundGym(next, exMeta);
                            setPlannedWeights(prev => ({ ...prev, [item.exerciseId]: rounded }));
                          }}
                        >
                          <Text size="lg" color="$textLight0" sx={{ _dark: { color: '$textDark0' } }}>+</Text>
                        </Button>
                      </HStack>
                    </HStack>

                    <Button
                      variant="link"
                      size="sm"
                      onPress={() => setWhyOpen(prev => ({ ...prev, [item.exerciseId]: !prev[item.exerciseId] }))}
                    >
                      <Text size="xs" color="$textLight300" sx={{ _dark: { color: '$textDark300' } }}>
                        {whyOpen[item.exerciseId] ? 'Hide details' : 'Why this suggestion?'}
                      </Text>
                    </Button>
                    {whyOpen[item.exerciseId] && (() => {
                      const latest = (latestAssessments as any)?.[item.exerciseId];
                      const local = assessmentData[item.exerciseId];
                      const base = local || latest;
                      const baseType = base ? base.type : 'working';
                      const baseUnit = base ? base.unit || weightUnit : weightUnit;
                      const baseValInCurrent = base ? convertWeight(base.value, baseUnit as any, weightUnit as any) : 0;
                      const estimated1RM = baseType === '1rm'
                        ? baseValInCurrent
                        : baseValInCurrent * (1 + 10 / 30);
                      const targetReps = Math.round(item.sets.reduce((acc: number, s: any) => acc + s.reps, 0) / item.sets.length);
                      const raw = estimated1RM / (1 + targetReps / 30);
                      const rounded = roundGym(raw, exMeta);
                      const finalPlanned = plannedWeights[item.exerciseId] ?? rounded;
                      const incText = weightUnit === 'kg'
                        ? `${exMeta.roundingIncrementKg ?? 2.5} kg`
                        : `${exMeta.roundingIncrementLbs ?? (exMeta.equipment === 'dumbbell' ? 5 : 2.5)} lb`;
                      return (
                        <Box bg="$backgroundLight0" sx={{ _dark: { bg: '$backgroundDark0' } }} borderRadius={12} p={12}>
                          <VStack space="xs">
                            <Text size="xs" color="$textLight300" sx={{ _dark: { color: '$textDark300' } }}>
                              Based on Epley: 1RM / (1 + reps/30). Rounding increment: {incText}.
                            </Text>
                            <Text size="xs" color="$textLight300" sx={{ _dark: { color: '$textDark300' } }}>
                              Target reps: {item.sets.map((s: any) => s.reps).join(', ')}
                            </Text>
                            {base && (
                              <Text size="xs" color="$textLight300" sx={{ _dark: { color: '$textDark300' } }}>
                                1RM used: {Math.round(estimated1RM)} {weightUnit}{baseType === 'working' ? ' (estimated from working weight)' : ''}
                              </Text>
                            )}
                            <Text size="xs" color="$textLight300" sx={{ _dark: { color: '$textDark300' } }}>
                              Suggested (rounded): {Math.round(finalPlanned)} {weightUnit}
                            </Text>
                          </VStack>
                        </Box>
                      );
                    })()}
                  </VStack>
                </Box>
              );
            })}
          </VStack>

          <HStack justifyContent="space-between" alignItems="center">
            <Button 
              variant="outline" 
              onPress={() => setStep('assessment')}
              borderColor="$borderLight0"
              sx={{ _dark: { borderColor: '$borderDark0' } }}
              borderRadius={16}
              h={56}
              px={24}
            >
              <Text 
                color="$textLight0"
                sx={{ _dark: { color: '$textDark0' } }}
                fontWeight="$medium"
                size="md"
              >
                Back
              </Text>
            </Button>
            
            <Button 
              bg="$primary0"
              sx={{ _dark: { bg: '$textDark0' }, opacity: isStartingWorkout ? 0.7 : 1 }}
              onPress={onStartWorkout}
              isDisabled={isStartingWorkout}
              borderRadius={16}
              h={56}
              px={24}
            >
              <Text 
                color="$backgroundLight0"
                sx={{ _dark: { color: '$backgroundDark0' } }}
                fontWeight="$semibold"
                size="lg"
              >
                {isStartingWorkout ? 'Starting...' : 'Start Workout'}
              </Text>
            </Button>
          </HStack>
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
