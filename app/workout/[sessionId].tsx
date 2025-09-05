import { api } from '@/convex/_generated/api';
import { useWeightUnit } from '@/hooks/useWeightUnit';
import { Box, Button, HStack, Text, VStack } from '@gluestack-ui/themed';
import { useMutation, useQuery } from 'convex/react';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';

import {
  HeaderProgress,
  RestCompleteOverlay,
  SetCard,
  SetSuccessOverlay,
  WorkoutCompleteOverlay,
  WorkoutRoadmapModal,
} from '@/components/workout';
import type { Id } from '@/convex/_generated/dataModel';

export default function WorkoutSessionScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: Id<'sessions'> }>();
  const { weightUnit, convertWeight, formatWeight } = useWeightUnit();
  const session = useQuery(api.sessions.getSession, sessionId ? { sessionId } : 'skip');
  const markSetDone = useMutation(api.sessions.markSetDone);
  const completeSession = useMutation(api.sessions.completeSession);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [restEnabled, setRestEnabled] = useState(false);
  const [restRemainingSec, setRestRemainingSec] = useState<number | null>(null);
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [isMarkingSet, setIsMarkingSet] = useState(false);
  const [showRirCollection, setShowRirCollection] = useState(false);
  const [isSetOverlayActive, setIsSetOverlayActive] = useState(false);
  const [isWorkoutOverlayActive, setIsWorkoutOverlayActive] = useState(false);
  const [overlayExerciseComplete, setOverlayExerciseComplete] = useState(false);
  const [overlayExerciseName, setOverlayExerciseName] = useState<string>('');
  

  const buttonScale = useSharedValue(1);
  const progressWidth = useSharedValue(0);
  const cardSuccessOpacity = useSharedValue(0);
  const successCheckScale = useSharedValue(0.3);
  const successCheckOpacity = useSharedValue(0);
  
  const workoutCompleteScale = useSharedValue(1);
  const workoutCompleteOpacity = useSharedValue(0);
  const celebrationScale = useSharedValue(0.5);
  const celebrationOpacity = useSharedValue(0);
  
  
  const restCompleteOpacity = useSharedValue(0);
  const restCompleteScale = useSharedValue(0.5);

  const recordRir = useMutation(api.sessions.recordExerciseRIR);

  const handleRirSelect = async (exerciseIndex: number, rir: number) => {
    try {
      await recordRir({ sessionId: sessionId as Id<'sessions'>, exerciseIndex, rir });
      
      setTimeout(() => {
        if (!session) return;
        
        const missing = session.exercises
          .map((ex: any, idx: number) => ({ ex, idx }))
          .filter(({ ex, idx }) => ex.sets.some((st: any) => st.weight !== undefined))
          .filter(({ ex, idx }) => {
            if (idx === exerciseIndex) return false;
            return ex.rir === undefined;
          });
        
        if (missing.length === 0) {
          setShowRirCollection(false);
        }
      }, 500);
    } catch {
      // Handle error if needed
    }
  };

  const handleFinishWorkout = async () => {
    setShowRirCollection(false);
    workoutCompleteOpacity.value = withTiming(0, { duration: 400 });
    celebrationOpacity.value = withTiming(0, { duration: 300 });
    workoutCompleteScale.value = withSpring(1, { damping: 12, stiffness: 200 });
    celebrationScale.value = withTiming(0.5, { duration: 300 });
    setIsWorkoutOverlayActive(false);
    
    await completeSession({ sessionId: sessionId as Id<'sessions'> });
    router.replace('/(tabs)');
  };

  const totalSets = useMemo(() => {
    if (!session) return 0;
    return session.exercises.reduce((acc: number, ex: any) => acc + ex.sets.length, 0);
  }, [session]);

  const completedSets = useMemo(() => {
    if (!session) return 0;
    return session.exercises.reduce(
      (acc: number, ex: any) => acc + ex.sets.filter((s: any) => s.done).length,
      0
    );
  }, [session]);

  const overallPercent = totalSets === 0 ? 0 : Math.round((completedSets / totalSets) * 100);

  const onMarkCurrent = async () => {
    if (!session || isMarkingSet) return;
    
    setIsMarkingSet(true);
    
    buttonScale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const exercise = session.exercises[currentExerciseIndex];
    const nextSetIndex = currentSetIndex + 1;
    const isCompletingExercise = nextSetIndex >= exercise.sets.length;
    
    setIsSetOverlayActive(true);
    setOverlayExerciseComplete(isCompletingExercise);
    setOverlayExerciseName(exercise.exerciseName || `Exercise ${currentExerciseIndex + 1}`);
    
    cardSuccessOpacity.value = withTiming(1, { duration: 100 });
    successCheckOpacity.value = withTiming(1, { duration: 150 });
    successCheckScale.value = withSpring(1, { damping: 20, stiffness: 600 });
    
    const newProgress = Math.round(((completedSets + 1) / totalSets) * 100);
    progressWidth.value = withTiming(newProgress, { duration: 600 });
    
    try {
      await markSetDone({ sessionId: sessionId as Id<'sessions'>, exerciseIndex: currentExerciseIndex, setIndex: currentSetIndex });
      
              setTimeout(() => {
        cardSuccessOpacity.value = withTiming(0, { duration: 100 });
        successCheckOpacity.value = withTiming(0, { duration: 100 });
        successCheckScale.value = withTiming(0.3, { duration: 100 });
        setIsSetOverlayActive(false);
        setOverlayExerciseComplete(false);
        setOverlayExerciseName('');
        
        const exercise = session.exercises[currentExerciseIndex];
        const nextSetIndex = currentSetIndex + 1;
        const nextExerciseIndex = currentExerciseIndex + 1;
        const isWorkoutComplete = (completedSets + 1) === totalSets;
        
        if (isWorkoutComplete) {
          setTimeout(() => {
            setIsWorkoutOverlayActive(true);
            workoutCompleteScale.value = withSpring(1.05, { damping: 12, stiffness: 200 });
            workoutCompleteOpacity.value = withTiming(1, { duration: 400 });
            celebrationOpacity.value = withTiming(1, { duration: 500 });
            celebrationScale.value = withSpring(1, { damping: 10, stiffness: 300 });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            
            const missing = session.exercises
              .filter((ex: any) => ex.sets.some((st: any) => st.weight !== undefined))
              .filter((ex: any) => ex.rir === undefined);

            setShowRirCollection(missing.length > 0);
          }, 200);
        }
        
        if (restEnabled && exercise?.restSec) {
          setRestRemainingSec(exercise.restSec);
        }
        
        const groupId = exercise.groupId;
        if (groupId) {
          const groupMembers = session.exercises
            .map((ex: any, idx: number) => ({ ex, idx }))
            .filter(({ ex }) => ex.groupId === groupId)
            .sort((a, b) => (a.ex.groupOrder || 0) - (b.ex.groupOrder || 0) || a.idx - b.idx);
          const currentPos = groupMembers.findIndex(m => m.idx === currentExerciseIndex);
          let advanced = false;
          for (let stepIdx = 1; stepIdx < groupMembers.length; stepIdx++) {
            const nextPos = (currentPos + stepIdx) % groupMembers.length;
            const candidate = groupMembers[nextPos];
            const cUndone = candidate.ex.sets.findIndex((st: any) => !st.done);
            if (cUndone !== -1) {
              setCurrentExerciseIndex(candidate.idx);
              setCurrentSetIndex(cUndone);
              advanced = true;
              break;
            }
          }
          if (!advanced) {
            if (nextSetIndex < exercise.sets.length) {
              setCurrentSetIndex(nextSetIndex);
            } else if (nextExerciseIndex < session.exercises.length) {
              let idx = nextExerciseIndex;
              while (idx < session.exercises.length) {
                const nEx = session.exercises[idx];
                const nUndone = nEx.sets.findIndex((st: any) => !st.done);
                if (nUndone !== -1) {
                  setCurrentExerciseIndex(idx);
                  setCurrentSetIndex(nUndone);
                  break;
                }
                idx += 1;
              }
            }
          }
        } else {
          if (nextSetIndex < exercise.sets.length) {
            setCurrentSetIndex(nextSetIndex);
          } else if (nextExerciseIndex < session.exercises.length) {
            const nextEx = session.exercises[nextExerciseIndex];
            const nUndone = nextEx.sets.findIndex((st: any) => !st.done);
            setCurrentExerciseIndex(nextExerciseIndex);
            setCurrentSetIndex(nUndone === -1 ? 0 : nUndone);
          }
        }
        
        setIsMarkingSet(false);
      }, 800);
      
    } catch {
      setIsMarkingSet(false);
    } finally {
      buttonScale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }
  };


  const onPrev = () => {
    if (!session) return;
    if (currentSetIndex > 0) {
      setCurrentSetIndex(currentSetIndex - 1);
      return;
    }
    if (currentExerciseIndex > 0) {
      const prevExerciseIndex = currentExerciseIndex - 1;
      const prevExercise = session.exercises[prevExerciseIndex];
      setCurrentExerciseIndex(prevExerciseIndex);
      setCurrentSetIndex(Math.max(0, prevExercise.sets.length - 1));
    }
  };

  useEffect(() => {
    if (restRemainingSec === null) return;
    if (restRemainingSec <= 0) {
      restCompleteOpacity.value = withTiming(1, { duration: 300 });
      restCompleteScale.value = withSpring(1, { damping: 12, stiffness: 400 });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      setTimeout(() => {
        restCompleteOpacity.value = withTiming(0, { duration: 300 });
        restCompleteScale.value = withTiming(0.5, { duration: 300 });
        setRestRemainingSec(null);
      }, 1200);
      return;
    }
    const id = setInterval(() => {
      setRestRemainingSec(prev => (prev !== null ? Math.max(0, prev - 1) : null));
    }, 1000);
    return () => clearInterval(id);
  }, [restRemainingSec, restCompleteOpacity, restCompleteScale]);

  useEffect(() => {
    progressWidth.value = withTiming(overallPercent, { duration: 300 });
  }, [overallPercent, progressWidth]);


  const buttonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: buttonScale.value }],
    };
  });

  

  if (!session) {
    return (
      <Box bg="$background" flex={1} p={16} justifyContent="center">
        <Text size="lg" color="$textMuted" textAlign="center">Loading workout...</Text>
      </Box>
    );
  }

  const onNext = () => {
    if (!session) return;
    const exercise = session.exercises[currentExerciseIndex];
    if (currentSetIndex + 1 < exercise.sets.length) {
      setCurrentSetIndex(currentSetIndex + 1);
      return;
    }
    if (currentExerciseIndex + 1 < session.exercises.length) {
      let idx = currentExerciseIndex + 1;
      while (idx < session.exercises.length) {
        const nEx = session.exercises[idx];
        const nUndone = nEx.sets.findIndex((st: any) => !st.done);
        if (nUndone !== -1) {
          setCurrentExerciseIndex(idx);
          setCurrentSetIndex(nUndone);
          break;
        }
        idx += 1;
      }
    }
  };


  const currentExercise = session!.exercises[currentExerciseIndex];
  const currentSet = currentExercise?.sets[currentSetIndex];
  const isAnyOverlayActive = isSetOverlayActive || isWorkoutOverlayActive;
  const markDisabled = !!currentSet?.done || isMarkingSet || isAnyOverlayActive;
  const prevDisabled = (currentExerciseIndex === 0 && currentSetIndex === 0) || isMarkingSet || isAnyOverlayActive;
  const nextDisabled = isMarkingSet || isAnyOverlayActive;


  return (
    <Box 
      bg="$backgroundLight0" 
      sx={{ _dark: { bg: '$backgroundDark0' } }} 
      flex={1}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <VStack space="2xl" p={24} pb={120}>
          <HeaderProgress
            completedSets={completedSets}
            totalSets={totalSets}
            overallPercent={overallPercent}
            progressWidth={progressWidth}
            onOpenRoadmap={() => setShowRoadmap(true)}
            exercises={session.exercises}
            currentExerciseIndex={currentExerciseIndex}
            currentSetIndex={currentSetIndex}
            restEnabled={restEnabled}
            onToggleRest={setRestEnabled}
            restRemainingSec={restRemainingSec}
            onSkipRest={() => setRestRemainingSec(null)}
          />

          <Box position="relative">
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
              <VStack alignItems="center" space="xs">
                <Text 
                  size="xl" 
                  fontWeight="$bold" 
                  color="$textLight0"
                  sx={{ _dark: { color: '$textDark0' } }}
                  textAlign="center"
                >
                  {currentExercise?.exerciseName || `Exercise ${currentExerciseIndex + 1}`}
                </Text>
                {!!currentExercise?.groupId && (
                  <Text 
                    size="xs" 
                    color="$textLight300"
                    sx={{ _dark: { color: '$textDark300' } }}
                    textTransform="uppercase"
                    letterSpacing={1}
                  >
                    Superset {currentExercise.groupOrder || 1}
                  </Text>
                )}
                
              </VStack>

              <SetCard
                currentExercise={currentExercise}
                currentSet={currentSet}
                currentSetIndex={currentSetIndex}
                formatWeight={formatWeight}
                convertWeight={convertWeight}
                weightUnit={weightUnit}
              />

              {restRemainingSec !== null && (
                <Box
                  bg="$backgroundLight100"
                  sx={{ _dark: { bg: '$backgroundDark100' } }}
                  borderRadius={12}
                  p={12}
                  w="100%"
                >
                  <HStack justifyContent="space-between" alignItems="center" space="md">
                    <HStack alignItems="center" space="sm" flex={1}>
                      <Box
                        bg="$primary0"
                        sx={{ _dark: { bg: '$textDark0' } }}
                        borderRadius={999}
                        w={32}
                        h={32}
                        justifyContent="center"
                        alignItems="center"
                      >
                        <Text 
                          size="sm" 
                          fontWeight="$bold" 
                          color="$backgroundLight0"
                          sx={{ _dark: { color: '$backgroundDark0' } }}
                        >
                          {restRemainingSec}
                        </Text>
                      </Box>
                      <Text 
                        size="sm" 
                        color="$textLight0"
                        sx={{ _dark: { color: '$textDark0' } }}
                        fontWeight="$medium"
                        flex={1}
                      >
                        Rest Time
                      </Text>
                    </HStack>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onPress={() => setRestRemainingSec(null)}
                      borderColor="$borderLight0"
                      sx={{ _dark: { borderColor: '$borderDark0' } }}
                      borderRadius={8}
                      px={10}
                      h={28}
                    >
                      <Text 
                        color="$textLight0"
                        sx={{ _dark: { color: '$textDark0' } }}
                        size="xs"
                        fontWeight="$medium"
                      >
                        Skip
                      </Text>
                    </Button>
                  </HStack>
                </Box>
              )}

              <Animated.View style={buttonAnimatedStyle}>
                <Button 
                  bg="$primary0"
                  sx={{ _dark: { bg: '$textDark0' }, opacity: markDisabled ? 0.6 : 1 }}
                  onPress={onMarkCurrent} 
                  isDisabled={markDisabled}
                  borderRadius={16}
                  h={56}
                  w="100%"
                  justifyContent="center"
                  alignItems="center"
                  flexDirection="row"
                >
                  <Box flex={1} justifyContent="center" alignItems="center">
                    <Text 
                      color="$backgroundLight0"
                      sx={{ _dark: { color: '$backgroundDark0' } }}
                      fontWeight="$semibold"
                      size="lg"
                      textAlign="center"
                    >
                      {currentSet?.done ? '✓ Set Complete' : 'Mark Set Done'}
                    </Text>
                  </Box>
                </Button>
              </Animated.View>

              {completedSets < totalSets && (
                <HStack justifyContent="space-between" alignItems="center" w="100%">
                  <Button 
                    variant="outline" 
                    onPress={onPrev} 
                    isDisabled={prevDisabled}
                    borderColor="$borderLight0"
                    sx={{ _dark: { borderColor: '$borderDark0' }, opacity: prevDisabled ? 0.6 : 1 }}
                    borderRadius={12}
                    h={44}
                    px={20}
                  >
                    <Text 
                      color="$textLight0"
                      sx={{ _dark: { color: '$textDark0' } }}
                      fontWeight="$medium"
                    >
                      Previous
                    </Text>
                  </Button>
                  <Button 
                    bg="$primary0"
                    sx={{ _dark: { bg: '$textDark0' }, opacity: nextDisabled ? 0.6 : 1 }}
                    onPress={onNext}
                    isDisabled={nextDisabled}
                    borderRadius={12}
                    h={44}
                    px={20}
                    justifyContent="center"
                    alignItems="center"
                  >
                    <Text 
                      color="$backgroundLight0"
                      sx={{ _dark: { color: '$backgroundDark0' } }}
                      fontWeight="$medium"
                      textAlign="center"
                    >
                      Next
                    </Text>
                  </Button>
                </HStack>
              )}


            </VStack>
              </Box>
            
            <SetSuccessOverlay 
              cardSuccessOpacity={cardSuccessOpacity} 
              successCheckScale={successCheckScale} 
              successCheckOpacity={successCheckOpacity}
              isExerciseComplete={overlayExerciseComplete}
              exerciseName={overlayExerciseName}
            />
          </Box>

          <WorkoutRoadmapModal
            visible={showRoadmap}
            exercises={session!.exercises as any}
            currentExerciseIndex={currentExerciseIndex}
            onClose={() => setShowRoadmap(false)}
          />
        </VStack>
      </ScrollView>

      <WorkoutCompleteOverlay
        isActive={isWorkoutOverlayActive}
        workoutCompleteOpacity={workoutCompleteOpacity}
        workoutCompleteScale={workoutCompleteScale}
        celebrationOpacity={celebrationOpacity}
        celebrationScale={celebrationScale}
        exercises={session.exercises}
        onRirSelect={handleRirSelect}
        onFinishWorkout={handleFinishWorkout}
        showRirCollection={showRirCollection}
      />

      
      <RestCompleteOverlay restCompleteOpacity={restCompleteOpacity} restCompleteScale={restCompleteScale} />

    </Box>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
});
