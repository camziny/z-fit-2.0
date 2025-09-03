import { api } from '@/convex/_generated/api';
import { useWeightUnit } from '@/hooks/useWeightUnit';
import { Box, Button, HStack, Text, VStack } from '@gluestack-ui/themed';
import { useMutation, useQuery } from 'convex/react';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming
} from 'react-native-reanimated';

import {
  ConfirmCompleteModal,
  ExerciseTransitionOverlay,
  HeaderProgress,
  RestCompleteOverlay,
  RestTimerRow,
  RirCatchupModal,
  RirModal,
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
  const [showConfirmComplete, setShowConfirmComplete] = useState(false);
  const [showRirModal, setShowRirModal] = useState(false);
  const [selectedRir, setSelectedRir] = useState<number | null>(null);
  const [savingRir, setSavingRir] = useState(false);
  const [pendingRirExerciseIndex, setPendingRirExerciseIndex] = useState<number | null>(null);
  const [showRirCatchup, setShowRirCatchup] = useState(false);
  const [rirCatchupQueue, setRirCatchupQueue] = useState<number[]>([]);
  const [rirCatchupPos, setRirCatchupPos] = useState(0);
  const [isSetOverlayActive, setIsSetOverlayActive] = useState(false);
  const [isExerciseOverlayActive, setIsExerciseOverlayActive] = useState(false);
  const [isWorkoutOverlayActive, setIsWorkoutOverlayActive] = useState(false);
  

  const buttonScale = useSharedValue(1);
  const progressWidth = useSharedValue(0);
  const cardSuccessOpacity = useSharedValue(0);
  const successCheckScale = useSharedValue(0.3);
  const successCheckOpacity = useSharedValue(0);
  
  const workoutCompleteScale = useSharedValue(1);
  const workoutCompleteOpacity = useSharedValue(0);
  const celebrationScale = useSharedValue(0.5);
  const celebrationOpacity = useSharedValue(0);
  
  const exerciseTransitionOpacity = useSharedValue(0);
  const exerciseTransitionScale = useSharedValue(0.8);
  
  const transitionProgress = useSharedValue(0);
  const checkmarkScale = useSharedValue(0);
  const checkmarkOpacity = useSharedValue(0);
  
  const restCompleteOpacity = useSharedValue(0);
  const restCompleteScale = useSharedValue(0.5);

  const recordRir = useMutation(api.sessions.recordExerciseRIR);

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
    
    try {
      await markSetDone({ sessionId: sessionId as Id<'sessions'>, exerciseIndex: currentExerciseIndex, setIndex: currentSetIndex });
      
      setIsSetOverlayActive(true);
      cardSuccessOpacity.value = withTiming(1, { duration: 200 });
      successCheckOpacity.value = withTiming(1, { duration: 300 });
      successCheckScale.value = withSpring(1, { damping: 12, stiffness: 400 });
      
      const newProgress = Math.round(((completedSets + 1) / totalSets) * 100);
      progressWidth.value = withTiming(newProgress, { duration: 600 });
      
              setTimeout(() => {
        cardSuccessOpacity.value = withTiming(0, { duration: 300 });
        successCheckOpacity.value = withTiming(0, { duration: 200 });
        successCheckScale.value = withTiming(0.3, { duration: 200 });
        setIsSetOverlayActive(false);
        
        const exercise = session.exercises[currentExerciseIndex];
        const nextSetIndex = currentSetIndex + 1;
        const nextExerciseIndex = currentExerciseIndex + 1;
        const isWorkoutComplete = (completedSets + 1) === totalSets;
        const isMovingToNextExercise = nextSetIndex >= exercise.sets.length && nextExerciseIndex < session.exercises.length;
        
        if (isWorkoutComplete) {
          setTimeout(() => {
            setIsWorkoutOverlayActive(true);
            workoutCompleteScale.value = withSpring(1.05, { damping: 12, stiffness: 200 });
            workoutCompleteOpacity.value = withTiming(1, { duration: 400 });
            celebrationOpacity.value = withTiming(1, { duration: 500 });
            celebrationScale.value = withSpring(1, { damping: 10, stiffness: 300 });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            
            setTimeout(() => {
              const missing: number[] = session.exercises
                .map((ex: any, idx: number) => ({ ex, idx }))
                .filter(({ ex }) => ex.sets.some((st: any) => st.weight !== undefined))
                .filter(({ ex }) => ex.rir === undefined)
                .map(({ idx }) => idx);

              if (missing.length > 0) {
                setShowRirCatchup(true);
                setRirCatchupQueue(missing);
                setRirCatchupPos(0);
              } else {
                workoutCompleteOpacity.value = withTiming(0, { duration: 400 });
                celebrationOpacity.value = withTiming(0, { duration: 300 });
                workoutCompleteScale.value = withSpring(1, { damping: 12, stiffness: 200 });
                celebrationScale.value = withTiming(0.5, { duration: 300 });
                setIsWorkoutOverlayActive(false);
              }
            }, 2500);
          }, 200);
        } else if (nextSetIndex >= exercise.sets.length && exercise.sets.some((st: any) => st.weight !== undefined)) {
          setTimeout(() => {
            setIsExerciseOverlayActive(true);
            
            exerciseTransitionOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });
            exerciseTransitionScale.value = withSpring(1, { damping: 18, stiffness: 180 });
            
            checkmarkScale.value = 0;
            checkmarkOpacity.value = 0;
            checkmarkOpacity.value = withDelay(200, withTiming(1, { duration: 300 }));
            checkmarkScale.value = withDelay(200, withSequence(
              withSpring(1.2, { damping: 12, stiffness: 400 }),
              withSpring(1, { damping: 15, stiffness: 200 })
            ));
            
            transitionProgress.value = 0;
            transitionProgress.value = withDelay(600, withTiming(1, { duration: 1200, easing: Easing.out(Easing.quad) }));
            
            setTimeout(() => {
              exerciseTransitionOpacity.value = withTiming(0, { duration: 500, easing: Easing.in(Easing.cubic) });
              exerciseTransitionScale.value = withSpring(0.9, { damping: 20, stiffness: 150 });
              checkmarkOpacity.value = withTiming(0, { duration: 300 });
              transitionProgress.value = 0;
              setIsExerciseOverlayActive(false);
              setPendingRirExerciseIndex(currentExerciseIndex);
              setSelectedRir(null);
              setShowRirModal(true);
            }, 3200);
          }, 100);
          setIsMarkingSet(false);
          return;
        } else if (isMovingToNextExercise) {
          setTimeout(() => {
            setIsExerciseOverlayActive(true);
            
            exerciseTransitionOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });
            exerciseTransitionScale.value = withSpring(1, { damping: 18, stiffness: 180 });
            
            checkmarkScale.value = 0;
            checkmarkOpacity.value = 0;
            checkmarkOpacity.value = withDelay(200, withTiming(1, { duration: 300 }));
            checkmarkScale.value = withDelay(200, withSequence(
              withSpring(1.2, { damping: 12, stiffness: 400 }),
              withSpring(1, { damping: 15, stiffness: 200 })
            ));
            
            transitionProgress.value = 0;
            transitionProgress.value = withDelay(600, withTiming(1, { duration: 1200, easing: Easing.out(Easing.quad) }));
            
            setTimeout(() => {
              exerciseTransitionOpacity.value = withTiming(0, { duration: 500, easing: Easing.in(Easing.cubic) });
              exerciseTransitionScale.value = withSpring(0.9, { damping: 20, stiffness: 150 });
              checkmarkOpacity.value = withTiming(0, { duration: 300 });
              transitionProgress.value = 0;
              setIsExerciseOverlayActive(false);
            }, 3200);
          }, 100);
        }
        
        if (restEnabled && exercise?.restSec) {
          setRestRemainingSec(exercise.restSec);
        }
        
        if (nextSetIndex < exercise.sets.length) {
          setCurrentSetIndex(nextSetIndex);
        } else if (!showRirModal && nextExerciseIndex < session.exercises.length) {
          const nextEx = session.exercises[nextExerciseIndex];
          const nUndone = nextEx.sets.findIndex((st: any) => !st.done);
          setCurrentExerciseIndex(nextExerciseIndex);
          setCurrentSetIndex(nUndone === -1 ? 0 : nUndone);
        }
        
        setIsMarkingSet(false);
      }, 800);
      
    } catch {
      setIsMarkingSet(false);
    } finally {
      buttonScale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }
  };

  const onSubmitRir = async () => {
    if (selectedRir === null || pendingRirExerciseIndex === null) return;
    setSavingRir(true);
    try {
      await recordRir({ sessionId: sessionId as Id<'sessions'>, exerciseIndex: pendingRirExerciseIndex, rir: selectedRir });
      setShowRirModal(false);
      setSavingRir(false);
      const nextExerciseIndex = currentExerciseIndex + 1;
      if (nextExerciseIndex < session!.exercises.length) {
        const nEx = session!.exercises[nextExerciseIndex];
        const nUndone = nEx.sets.findIndex((st: any) => !st.done);
        setCurrentExerciseIndex(nextExerciseIndex);
        setCurrentSetIndex(nUndone === -1 ? 0 : nUndone);
      }
    } catch {
      setSavingRir(false);
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

  const onComplete = async () => {
    setShowConfirmComplete(true);
  };

  const onConfirmComplete = async () => {
    setShowConfirmComplete(false);
    await completeSession({ sessionId: sessionId as Id<'sessions'> });
    router.replace('/(tabs)');
  };

  const currentExercise = session!.exercises[currentExerciseIndex];
  const currentSet = currentExercise?.sets[currentSetIndex];
  const isAnyOverlayActive = isSetOverlayActive || isExerciseOverlayActive || isWorkoutOverlayActive || showRirModal || showRirCatchup;
  const markDisabled = !!currentSet?.done || isMarkingSet || isAnyOverlayActive;
  const prevDisabled = (currentExerciseIndex === 0 && currentSetIndex === 0) || isMarkingSet || isAnyOverlayActive;
  const nextDisabled = isMarkingSet || isAnyOverlayActive;
  const finishDisabled = isMarkingSet || isAnyOverlayActive;


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
          />
          
          <RestTimerRow
            restEnabled={restEnabled}
            onToggle={setRestEnabled}
            restRemainingSec={restRemainingSec}
            onSkip={() => setRestRemainingSec(null)}
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
                  size="xs" 
                  color="$textLight400"
                  sx={{ _dark: { color: '$textDark400' } }}
                  textTransform="uppercase"
                  letterSpacing={1}
                  fontWeight="$medium"
                >
                  Exercise {currentExerciseIndex + 1} of {session!.exercises.length}
                </Text>
                <Text 
                  size="xl" 
                  fontWeight="$bold" 
                  color="$textLight0"
                  sx={{ _dark: { color: '$textDark0' } }}
                  textAlign="center"
                >
                  {currentExercise?.exerciseName || `Exercise ${currentExerciseIndex + 1}`}
                </Text>
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

              {completedSets === totalSets ? (
                <VStack space="md" w="100%">
                  <Button 
                    bg="$primary0"
                    sx={{ _dark: { bg: '$textDark0' }, opacity: finishDisabled ? 0.6 : 1 }}
                    onPress={onComplete}
                    isDisabled={finishDisabled}
                    borderRadius={16}
                    h={64}
                    w="100%"
                    justifyContent="center"
                    alignItems="center"
                  >
                    <VStack alignItems="center" space="xs">
                      <Text 
                        color="$backgroundLight0"
                        sx={{ _dark: { color: '$backgroundDark0' } }}
                        fontWeight="$bold"
                        size="xl"
                      >
                        Finish Workout
                      </Text>
                      <Text 
                        color="$backgroundLight100"
                        sx={{ _dark: { color: '$backgroundDark100' } }}
                        fontWeight="$medium"
                        size="xs"
                        opacity={0.8}
                      >
                        All sets completed!
                      </Text>
                    </VStack>
                  </Button>
                  <Button 
                    variant="outline" 
                    onPress={onPrev} 
                    isDisabled={prevDisabled}
                    borderColor="$borderLight0"
                    sx={{ _dark: { borderColor: '$borderDark0' }, opacity: prevDisabled ? 0.6 : 1 }}
                    borderRadius={12}
                    h={36}
                    w="100%"
                  >
                    <Text 
                      color="$textLight0"
                      sx={{ _dark: { color: '$textDark0' } }}
                      fontWeight="$medium"
                      size="sm"
                    >
                      ← Go Back
                    </Text>
                  </Button>
                </VStack>
              ) : (
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
            
            <SetSuccessOverlay cardSuccessOpacity={cardSuccessOpacity} successCheckScale={successCheckScale} successCheckOpacity={successCheckOpacity} />

            <ExerciseTransitionOverlay
              exerciseTransitionOpacity={exerciseTransitionOpacity}
              exerciseTransitionScale={exerciseTransitionScale}
              checkmarkOpacity={checkmarkOpacity}
              checkmarkScale={checkmarkScale}
              transitionProgress={transitionProgress}
              message={(() => {
                const exercise = session!.exercises[currentExerciseIndex];
                const nextSetIndex = currentSetIndex + 1;
                if (nextSetIndex >= exercise.sets.length) {
                  const nextExerciseIndex = currentExerciseIndex + 1;
                  const nextExercise = session!.exercises[nextExerciseIndex];
                  if (exercise.sets.some((st: any) => st.weight !== undefined)) {
                    return '';
                  }
                  return nextExercise ? `Get ready for: ${nextExercise.exerciseName}` : '';
                }
                return '';
              })()}
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
      />

      <RirModal
        visible={showRirModal}
        selectedRir={selectedRir}
        saving={savingRir}
        onSelect={(v) => setSelectedRir(v)}
        onCancel={() => setShowRirModal(false)}
        onSubmit={onSubmitRir}
      />

      <RirCatchupModal
        visible={showRirCatchup && rirCatchupQueue.length > 0}
        exerciseName={session!.exercises[rirCatchupQueue[rirCatchupPos]]?.exerciseName}
        onSelect={async (v: number) => {
          const exIdx = rirCatchupQueue[rirCatchupPos];
          try {
            await recordRir({ sessionId: sessionId as Id<'sessions'>, exerciseIndex: exIdx, rir: v });
            const nextPos = rirCatchupPos + 1;
            if (nextPos >= rirCatchupQueue.length) {
              setShowRirCatchup(false);
              workoutCompleteOpacity.value = withTiming(0, { duration: 400 });
              celebrationOpacity.value = withTiming(0, { duration: 300 });
              workoutCompleteScale.value = withSpring(1, { damping: 12, stiffness: 200 });
              celebrationScale.value = withTiming(0.5, { duration: 300 });
              setIsWorkoutOverlayActive(false);
            } else {
              setRirCatchupPos(nextPos);
            }
          } catch {}
        }}
        onSkip={() => {
          setShowRirCatchup(false);
          workoutCompleteOpacity.value = withTiming(0, { duration: 400 });
          celebrationOpacity.value = withTiming(0, { duration: 300 });
          workoutCompleteScale.value = withSpring(1, { damping: 12, stiffness: 200 });
          celebrationScale.value = withTiming(0.5, { duration: 300 });
          setIsWorkoutOverlayActive(false);
        }}
      />
      
      <RestCompleteOverlay restCompleteOpacity={restCompleteOpacity} restCompleteScale={restCompleteScale} />

      <ConfirmCompleteModal
        visible={showConfirmComplete}
        isDisabled={isMarkingSet || isSetOverlayActive || isExerciseOverlayActive || isWorkoutOverlayActive}
        onCancel={() => setShowConfirmComplete(false)}
        onConfirm={onConfirmComplete}
      />
    </Box>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
});
