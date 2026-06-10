import { api } from "@/convex/_generated/api";
import { useThemeMode } from "@/hooks/useThemeMode";
import { useWorkoutLiveActivity } from "@/hooks/useLiveActivity";
import { useWeightUnit } from "@/hooks/useWeightUnit";
import { getDisplayIncrement } from "@/utils/workoutPlanning";
import { Ionicons } from "@expo/vector-icons";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { Box, Button, HStack, Text, VStack } from "@gluestack-ui/themed";
import { usePreventRemove } from "@react-navigation/native";
import { useMutation, useQuery } from "convex/react";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, AppState, Linking, Pressable, ScrollView, StyleSheet, type AppStateStatus } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import {
  HeaderProgress,
  RestCompleteOverlay,
  SetCard,
  SetSuccessOverlay,
  WorkoutCompleteOverlay,
  WorkoutRoadmapModal,
} from "@/components/workout";
import type { Id } from "@/convex/_generated/dataModel";
import {
  applyWorkoutOperation,
  applyWorkoutOperations,
  clearActiveSession,
  createWorkoutOperationId,
  loadActiveSession,
  loadPendingWorkoutOperations,
  removePendingWorkoutOperationsForSession,
  saveActiveSession,
  savePendingWorkoutOperations,
  type WorkoutOperation,
} from "@/utils/activeWorkoutStorage";
import { cancelWorkoutSessionOverHttp } from "@/utils/publicWorkoutSummaryFetch";
import { useAnonKey } from "@/hooks/useAnonKey";

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

export default function WorkoutSessionScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: Id<"sessions"> }>();
  const { user } = useUser();
  const { getToken } = useAuth();
  const { anonKey: storedAnonKey } = useAnonKey();
  const { weightUnit, convertWeight, formatWeight } = useWeightUnit();
  const { effectiveColorScheme } = useThemeMode();
  const remoteSession = useQuery(
    api.sessions.getSession,
    sessionId ? { sessionId } : "skip",
  );
  const [localSession, setLocalSession] = useState<any | null>(null);
  const [pendingOperations, setPendingOperations] = useState<WorkoutOperation[]>([]);
  const session = useMemo(() => {
    const baseSession = remoteSession ?? localSession;
    if (!baseSession) return baseSession;
    return applyWorkoutOperations(
      baseSession,
      pendingOperations.filter((operation) => String(operation.sessionId) === String(sessionId)),
    );
  }, [localSession, pendingOperations, remoteSession, sessionId]);
  const exerciseIds = useMemo(() => {
    if (!session) return [];
    const ids = new Set<string>();
    session.exercises.forEach((ex: any) => {
      if (ex.exerciseId) ids.add(ex.exerciseId);
    });
    return Array.from(ids);
  }, [session]);
  const exerciseMeta = useQuery(
    api.exercises.getMultiple,
    exerciseIds.length ? { exerciseIds: exerciseIds as any } : "skip",
  );
  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  const markSetDone = useMutation(api.sessions.markSetDone).withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.sessions.getSession, { sessionId: args.sessionId });
    if (current !== undefined) {
      localStore.setQuery(
        api.sessions.getSession,
        { sessionId: args.sessionId },
        applyWorkoutOperation(current, {
          id: createWorkoutOperationId("markSetDone"),
          type: "markSetDone",
          sessionId: String(args.sessionId),
          exerciseIndex: args.exerciseIndex,
          setIndex: args.setIndex,
          reps: args.reps,
          weight: args.weight,
          createdAt: Date.now(),
        }),
      );
    }
  });
  const completeSession = useMutation(api.sessions.completeSession).withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.sessions.getSession, { sessionId: args.sessionId });
    if (current !== undefined) {
      localStore.setQuery(
        api.sessions.getSession,
        { sessionId: args.sessionId },
        applyWorkoutOperation(current, {
          id: createWorkoutOperationId("completeSession"),
          type: "completeSession",
          sessionId: String(args.sessionId),
          createdAt: Date.now(),
        }),
      );
    }
  });
  const updatePlannedWeight = useMutation(api.sessions.updatePlannedWeight).withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.sessions.getSession, { sessionId: args.sessionId });
    if (current !== undefined) {
      localStore.setQuery(
        api.sessions.getSession,
        { sessionId: args.sessionId },
        applyWorkoutOperation(current, {
          id: createWorkoutOperationId("updatePlannedWeight"),
          type: "updatePlannedWeight",
          sessionId: String(args.sessionId),
          exerciseIndex: args.exerciseIndex,
          fromSetIndex: args.fromSetIndex,
          weightKg: args.weightKg,
          createdAt: Date.now(),
        }),
      );
    }
  });
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [restEnabled, setRestEnabled] = useState(false);
  const [restRemainingSec, setRestRemainingSec] = useState<number | null>(null);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [appStateStatus, setAppStateStatus] = useState<AppStateStatus>(AppState.currentState);
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [isMarkingSet, setIsMarkingSet] = useState(false);
  const [optimisticCompletedSetKeys, setOptimisticCompletedSetKeys] = useState<Set<string>>(() => new Set());
  const [showRirCollection, setShowRirCollection] = useState(false);
  const [isSetOverlayActive, setIsSetOverlayActive] = useState(false);
  const [isWorkoutOverlayActive, setIsWorkoutOverlayActive] = useState(false);
  const [isCancellingWorkout, setIsCancellingWorkout] = useState(false);
  const [canLeaveWorkout, setCanLeaveWorkout] = useState(false);
  const [overlayExerciseComplete, setOverlayExerciseComplete] = useState(false);
  const [overlayExerciseName, setOverlayExerciseName] = useState<string>("");
  const [liveActivityId, setLiveActivityId] = useState<string | null>(null);
  const cancelPromptOpenRef = useRef(false);
  const pendingHomeNavigationRef = useRef(false);
  const isCancellingWorkoutRef = useRef(false);
  const isSyncingPendingOperationsRef = useRef(false);
  const pendingOperationsRef = useRef<WorkoutOperation[]>([]);

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

  const recordRir = useMutation(api.sessions.recordExerciseRIR).withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.sessions.getSession, { sessionId: args.sessionId });
    if (current !== undefined) {
      localStore.setQuery(
        api.sessions.getSession,
        { sessionId: args.sessionId },
        applyWorkoutOperation(current, {
          id: createWorkoutOperationId("recordExerciseRIR"),
          type: "recordExerciseRIR",
          sessionId: String(args.sessionId),
          exerciseIndex: args.exerciseIndex,
          rir: args.rir,
          createdAt: Date.now(),
        }),
      );
    }
  });

  const getSetKey = useCallback((exerciseIndex: number, setIndex: number) => `${exerciseIndex}:${setIndex}`, []);

  useEffect(() => {
    let isActive = true;
    const loadPersistedWorkout = async () => {
      const [storedSession, storedOperations] = await Promise.all([
        loadActiveSession(),
        loadPendingWorkoutOperations(),
      ]);
      if (!isActive) return;
      if (storedSession && String(storedSession._id) === String(sessionId)) {
        setLocalSession(storedSession);
      }
      pendingOperationsRef.current = storedOperations;
      setPendingOperations(storedOperations);
    };
    loadPersistedWorkout();
    return () => {
      isActive = false;
    };
  }, [sessionId]);

  useEffect(() => {
    if (!remoteSession || String(remoteSession._id) !== String(sessionId)) return;
    if (pendingOperations.some((operation) => String(operation.sessionId) === String(sessionId))) return;
    setLocalSession(remoteSession);
    saveActiveSession(remoteSession).catch(() => {});
  }, [pendingOperations, remoteSession, sessionId]);
  const { startWorkoutActivity, updateWorkoutActivity, endWorkoutActivity } =
    useWorkoutLiveActivity();
  const isAnyOverlayActive = isSetOverlayActive || isWorkoutOverlayActive;

  useEffect(() => {
    pendingOperationsRef.current = pendingOperations;
  }, [pendingOperations]);

  const removePendingOperationById = useCallback(async (operationId: string) => {
    const next = pendingOperationsRef.current.filter((operation) => operation.id !== operationId);
    pendingOperationsRef.current = next;
    setPendingOperations(next);
    await savePendingWorkoutOperations(next);
  }, []);

  const enqueueWorkoutOperation = useCallback(
    (operation: WorkoutOperation) => {
      setPendingOperations((prev) => {
        const next = [...prev, operation];
        pendingOperationsRef.current = next;
        savePendingWorkoutOperations(next).catch(() => {});
        return next;
      });
      const baseSession = sessionRef.current ?? localSession;
      const nextSession = applyWorkoutOperation(baseSession, operation);
      if (nextSession) {
        setLocalSession(nextSession);
        saveActiveSession(nextSession).catch(() => {});
      }
    },
    [localSession],
  );

  const replayWorkoutOperation = useCallback(
    async (operation: WorkoutOperation) => {
      if (operation.type === "markSetDone") {
        await markSetDone({
          sessionId: operation.sessionId as Id<"sessions">,
          exerciseIndex: operation.exerciseIndex,
          setIndex: operation.setIndex,
          reps: operation.reps,
          weight: operation.weight,
        });
        return;
      }
      if (operation.type === "updatePlannedWeight") {
        await updatePlannedWeight({
          sessionId: operation.sessionId as Id<"sessions">,
          exerciseIndex: operation.exerciseIndex,
          fromSetIndex: operation.fromSetIndex,
          weightKg: operation.weightKg,
        });
        return;
      }
      if (operation.type === "recordExerciseRIR") {
        await recordRir({
          sessionId: operation.sessionId as Id<"sessions">,
          exerciseIndex: operation.exerciseIndex,
          rir: operation.rir,
        });
        return;
      }
      if (operation.type === "completeSession") {
        await completeSession({ sessionId: operation.sessionId as Id<"sessions"> });
      }
    },
    [completeSession, markSetDone, recordRir, updatePlannedWeight],
  );

  const syncPendingOperations = useCallback(async () => {
    if (isSyncingPendingOperationsRef.current) return;
    if (appStateStatus !== "active") return;
    const currentPendingOperations = pendingOperationsRef.current.length === 0 ? pendingOperations : pendingOperationsRef.current;
    const operationsForSession = currentPendingOperations.filter((operation) => String(operation.sessionId) === String(sessionId));
    if (operationsForSession.length === 0) return;
    isSyncingPendingOperationsRef.current = true;
    try {
      for (const operation of operationsForSession) {
        try {
          await replayWorkoutOperation(operation);
        } catch (error) {
          const message = String((error as any)?.message || error || "");
          if (!message.includes("Session not found")) throw error;
        }
        await removePendingOperationById(operation.id);
      }
    } finally {
      isSyncingPendingOperationsRef.current = false;
    }
  }, [appStateStatus, pendingOperations, removePendingOperationById, replayWorkoutOperation, sessionId]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", setAppStateStatus);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    syncPendingOperations().catch(() => {});
  }, [syncPendingOperations]);

  useEffect(() => {
    if (!session) return;
    setOptimisticCompletedSetKeys((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set(prev);
      session.exercises.forEach((exercise: any, exerciseIndex: number) => {
        exercise.sets.forEach((set: any, setIndex: number) => {
          if (set.done) next.delete(getSetKey(exerciseIndex, setIndex));
        });
      });
      return next.size === prev.size ? prev : next;
    });
  }, [getSetKey, session]);

  const navigateHomeAfterCleanup = useCallback(() => {
    pendingHomeNavigationRef.current = true;
    setCanLeaveWorkout(true);
  }, []);

  useEffect(() => {
    if (!canLeaveWorkout || !pendingHomeNavigationRef.current) return;
    pendingHomeNavigationRef.current = false;
    router.replace("/(tabs)");
  }, [canLeaveWorkout]);

  const handleRirSelect = async (exerciseIndex: number, rir: number) => {
    try {
      enqueueWorkoutOperation({
        id: createWorkoutOperationId("recordExerciseRIR"),
        type: "recordExerciseRIR",
        sessionId: String(sessionId),
        exerciseIndex,
        rir,
        createdAt: Date.now(),
      });
      recordRir({
        sessionId: sessionId as Id<"sessions">,
        exerciseIndex,
        rir,
      }).catch(() => {});

      setTimeout(() => {
        if (!session) return;

        const missing = session.exercises
          .map((ex: any, idx: number) => ({ ex, idx }))
          .filter(({ ex }: { ex: any; idx: number }) =>
            ex.sets.some((st: any) => st.weight !== undefined),
          )
          .filter(({ ex, idx }: { ex: any; idx: number }) => {
            if (idx === exerciseIndex) return false;
            return ex.rir === undefined;
          });

        if (missing.length === 0) {
          setShowRirCollection(false);
        }
      }, 500);
    } catch {}
  };

  const handleFinishWorkout = async () => {
    setShowRirCollection(false);
    workoutCompleteOpacity.value = withTiming(0, { duration: 400 });
    celebrationOpacity.value = withTiming(0, { duration: 300 });
    workoutCompleteScale.value = withSpring(1, { damping: 12, stiffness: 200 });
    celebrationScale.value = withTiming(0.5, { duration: 300 });
    setIsWorkoutOverlayActive(false);

    const operation: WorkoutOperation = {
      id: createWorkoutOperationId("completeSession"),
      type: "completeSession",
      sessionId: String(sessionId),
      createdAt: Date.now(),
    };
    enqueueWorkoutOperation(operation);
    completeSession({
      sessionId: sessionId as Id<"sessions">,
    }).catch(() => {});

    try {
      if (liveActivityId) {
        await endWorkoutActivity(liveActivityId);
        setLiveActivityId(null);
      }

      try { await clearActiveSession(); } catch {}
      navigateHomeAfterCleanup();
    } catch {
      setIsWorkoutOverlayActive(true);
      workoutCompleteOpacity.value = withTiming(1, { duration: 250 });
      celebrationOpacity.value = withTiming(1, { duration: 250 });
      celebrationScale.value = withSpring(1, { damping: 12, stiffness: 200 });
      Alert.alert("Could not finish workout", "Please try again.");
    }
  };

  const handleCancelWorkout = useCallback(() => {
    if (isCancellingWorkout || isAnyOverlayActive || cancelPromptOpenRef.current) return;
    cancelPromptOpenRef.current = true;

    Alert.alert(
      "Cancel workout?",
      "This will discard this workout and return you to the home screen.",
      [
        {
          text: "Keep Going",
          style: "cancel",
          onPress: () => {
            cancelPromptOpenRef.current = false;
          },
        },
        {
          text: "Cancel Workout",
          style: "destructive",
          onPress: async () => {
            isCancellingWorkoutRef.current = true;
            setIsCancellingWorkout(true);
            try {
              if (liveActivityId) {
                await endWorkoutActivity(liveActivityId);
                setLiveActivityId(null);
              }
              if (sessionId) {
                const cancelSessionId = String(sessionId);
                const cancelAnonKey = user ? undefined : (storedAnonKey || undefined);
                const authToken = user
                  ? await withTimeout(getToken({ template: "convex" }), 3000, "Unable to get auth token")
                  : undefined;
                await withTimeout(
                  cancelWorkoutSessionOverHttp({
                    sessionId: cancelSessionId,
                    anonKey: cancelAnonKey,
                    authToken,
                  }),
                  12000,
                  "Workout cancel timed out"
                );
                await removePendingWorkoutOperationsForSession(String(sessionId));
                setPendingOperations((prev) =>
                  {
                    const next = prev.filter((operation) => String(operation.sessionId) !== String(sessionId));
                    pendingOperationsRef.current = next;
                    return next;
                  },
                );
              }
              await clearActiveSession();
              cancelPromptOpenRef.current = false;
              navigateHomeAfterCleanup();
            } catch {
              isCancellingWorkoutRef.current = false;
              setIsCancellingWorkout(false);
              cancelPromptOpenRef.current = false;
              Alert.alert("Could not cancel workout", "Please try again.");
            }
          },
        },
      ],
      {
        cancelable: true,
        onDismiss: () => {
          if (!isCancellingWorkoutRef.current) cancelPromptOpenRef.current = false;
        },
      },
    );
  }, [
    endWorkoutActivity,
    getToken,
    isAnyOverlayActive,
    isCancellingWorkout,
    liveActivityId,
    navigateHomeAfterCleanup,
    sessionId,
    storedAnonKey,
    user,
  ]);

  usePreventRemove(!canLeaveWorkout && Boolean(sessionId), () => {
    handleCancelWorkout();
  });

  const totalSets = useMemo(() => {
    if (!session) return 0;
    return session.exercises.reduce(
      (acc: number, ex: any) => acc + ex.sets.length,
      0,
    );
  }, [session]);

  const completedSets = useMemo(() => {
    if (!session) return 0;
    const savedCompleted = session.exercises.reduce(
      (acc: number, ex: any) => acc + ex.sets.filter((s: any) => s.done).length,
      0,
    );
    let optimisticCompleted = 0;
    optimisticCompletedSetKeys.forEach((key) => {
      const [exerciseIndexRaw, setIndexRaw] = key.split(":");
      const exerciseIndex = Number(exerciseIndexRaw);
      const setIndex = Number(setIndexRaw);
      const set = session.exercises[exerciseIndex]?.sets[setIndex];
      if (set && !set.done) optimisticCompleted += 1;
    });
    return savedCompleted + optimisticCompleted;
  }, [optimisticCompletedSetKeys, session]);

  const overallPercent =
    totalSets === 0 ? 0 : Math.round((completedSets / totalSets) * 100);
  const liveActivityRestRemaining = useMemo(
    () => (restEndsAt ? Math.max(0, Math.ceil((restEndsAt - Date.now()) / 1000)) : undefined),
    [restEndsAt],
  );

  const onMarkCurrent = async () => {
    if (!session || isMarkingSet) return;

    setIsMarkingSet(true);

    buttonScale.value = withSpring(0.95, { damping: 15, stiffness: 300 });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const exercise = session.exercises[currentExerciseIndex];
    const nextSetIndex = currentSetIndex + 1;
    const isCompletingExercise = nextSetIndex >= exercise.sets.length;
    const completedSetKey = getSetKey(currentExerciseIndex, currentSetIndex);
    const optimisticSession = {
      ...session,
      exercises: session.exercises.map((sessionExercise: any, exerciseIndex: number) => {
        if (exerciseIndex !== currentExerciseIndex) return sessionExercise;
        return {
          ...sessionExercise,
          sets: sessionExercise.sets.map((set: any, setIndex: number) =>
            setIndex === currentSetIndex
              ? {
                  ...set,
                  done: true,
                  completedAt: Date.now(),
                  completedWeight: currentSet?.weight,
                }
              : set
          ),
        };
      }),
    };

    setIsSetOverlayActive(true);
    setOptimisticCompletedSetKeys((prev) => {
      const next = new Set(prev);
      next.add(completedSetKey);
      return next;
    });
    setOverlayExerciseComplete(isCompletingExercise);
    setOverlayExerciseName(
      exercise.exerciseName || `Exercise ${currentExerciseIndex + 1}`,
    );

    cardSuccessOpacity.value = withTiming(1, { duration: 100 });
    successCheckOpacity.value = withTiming(1, { duration: 150 });
    successCheckScale.value = withSpring(1, { damping: 20, stiffness: 600 });

    const newProgress = Math.round(((completedSets + 1) / totalSets) * 100);
    progressWidth.value = withTiming(newProgress, { duration: 600 });

    const operation: WorkoutOperation = {
      id: createWorkoutOperationId("markSetDone"),
      type: "markSetDone",
      sessionId: String(sessionId),
      exerciseIndex: currentExerciseIndex,
      setIndex: currentSetIndex,
      weight: currentSet?.weight,
      createdAt: Date.now(),
    };
    enqueueWorkoutOperation(operation);
    markSetDone({
      sessionId: sessionId as Id<"sessions">,
      exerciseIndex: currentExerciseIndex,
      setIndex: currentSetIndex,
      weight: currentSet?.weight,
    }).catch(() => {});

    setTimeout(() => {
      cardSuccessOpacity.value = withTiming(0, { duration: 100 });
      successCheckOpacity.value = withTiming(0, { duration: 100 });
      successCheckScale.value = withTiming(0.3, { duration: 100 });
      setIsSetOverlayActive(false);
      setOverlayExerciseComplete(false);
      setOverlayExerciseName("");

      const latestSession = optimisticSession;

      const exercise = latestSession.exercises[currentExerciseIndex];
      const nextSetIndex = currentSetIndex + 1;
      const nextExerciseIndex = currentExerciseIndex + 1;
      const latestCompleted = latestSession.exercises.reduce(
        (acc: number, ex: any) =>
          acc + ex.sets.filter((s: any) => s.done).length,
        0,
      );
      const latestTotal = latestSession.exercises.reduce(
        (acc: number, ex: any) => acc + ex.sets.length,
        0,
      );
      const isWorkoutComplete = latestCompleted >= latestTotal;

      if (isWorkoutComplete) {
        setTimeout(() => {
          setIsWorkoutOverlayActive(true);
          workoutCompleteScale.value = withSpring(1.05, {
            damping: 12,
            stiffness: 200,
          });
          workoutCompleteOpacity.value = withTiming(1, { duration: 400 });
          celebrationOpacity.value = withTiming(1, { duration: 500 });
          celebrationScale.value = withSpring(1, {
            damping: 10,
            stiffness: 300,
          });
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

          const freshSession = sessionRef.current;
          const missing = (freshSession ?? latestSession).exercises
            .filter((ex: any) =>
              ex.sets.some((st: any) => st.weight !== undefined),
            )
            .filter((ex: any) => ex.rir === undefined);

          setShowRirCollection(missing.length > 0);
        }, 200);
      }

      if (restEnabled && exercise?.restSec) {
        setRestEndsAt(Date.now() + exercise.restSec * 1000);
        setRestRemainingSec(exercise.restSec);
      }

      const groupId = exercise.groupId;
      if (groupId) {
        const groupMembers = latestSession.exercises
          .map((ex: any, idx: number) => ({ ex, idx }))
          .filter(({ ex }: { ex: any; idx: number }) => ex.groupId === groupId)
          .sort(
            (a: any, b: any) =>
              (a.ex.groupOrder || 0) - (b.ex.groupOrder || 0) ||
              a.idx - b.idx,
          );
        const currentPos = groupMembers.findIndex(
          (m: any) => m.idx === currentExerciseIndex,
        );
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
          } else if (nextExerciseIndex < latestSession.exercises.length) {
            let idx = nextExerciseIndex;
            while (idx < latestSession.exercises.length) {
              const nEx = latestSession.exercises[idx];
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
        } else if (nextExerciseIndex < latestSession.exercises.length) {
          const nextEx = latestSession.exercises[nextExerciseIndex];
          const nUndone = nextEx.sets.findIndex((st: any) => !st.done);
          setCurrentExerciseIndex(nextExerciseIndex);
          setCurrentSetIndex(nUndone === -1 ? 0 : nUndone);
        }
      }

      setIsMarkingSet(false);
    }, 800);
    buttonScale.value = withSpring(1, { damping: 15, stiffness: 300 });
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
    if (restEndsAt === null) {
      return;
    }

    const updateRestRemaining = () => {
      const nextRemaining = Math.max(0, Math.ceil((restEndsAt - Date.now()) / 1000));
      setRestRemainingSec((prev) => (prev === nextRemaining ? prev : nextRemaining));
      if (nextRemaining > 0) return;

      setRestEndsAt(null);
      restCompleteOpacity.value = withTiming(1, { duration: 300 });
      restCompleteScale.value = withSpring(1, { damping: 12, stiffness: 400 });
      if (appStateStatus === "active") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      setTimeout(() => {
        restCompleteOpacity.value = withTiming(0, { duration: 300 });
        restCompleteScale.value = withTiming(0.5, { duration: 300 });
        setRestRemainingSec(null);
      }, 1200);
    };

    updateRestRemaining();
    if (appStateStatus !== "active") return;

    const id = setInterval(updateRestRemaining, 1000);
    return () => clearInterval(id);
  }, [appStateStatus, restEndsAt, restCompleteOpacity, restCompleteScale]);

  useEffect(() => {
    if (progressWidth.value !== overallPercent) {
      progressWidth.value = withTiming(overallPercent, { duration: 300 });
    }
  }, [overallPercent, progressWidth]);

  // Start Live Activity when workout begins
  useEffect(() => {
    if (!session || !session.exercises.length || liveActivityId) return;

    const startLiveActivity = async () => {
      const currentExercise = session.exercises[currentExerciseIndex];
      const currentSet = currentExercise?.sets[currentSetIndex];

      if (!currentExercise || !currentSet) return;

      const weightDisplay = currentSet.weight
        ? (() => {
            const isPair = currentExercise.loadingMode === "pair";
            const converted = convertWeight(
              currentSet.weight,
              "kg",
              weightUnit,
            );
            if (isPair) {
              const per = converted / 2;
              return `${formatWeight(per)} each`;
            }
            return formatWeight(converted);
          })()
        : undefined;

      const activityId = await startWorkoutActivity({
        exerciseName:
          currentExercise.exerciseName ||
          `Exercise ${currentExerciseIndex + 1}`,
        currentSet: currentSetIndex + 1,
        totalSets: currentExercise.sets.length,
        reps: currentSet.reps,
        weight: weightDisplay,
        restTimeRemaining: liveActivityRestRemaining,
        restEndsAt: restEndsAt || undefined,
        restEnabled,
        isSuperset: !!currentExercise.groupId,
        supersetInfo: currentExercise.groupId
          ? (() => {
              const groupMembers = session.exercises
                .filter((ex: any) => ex.groupId === currentExercise.groupId)
                .sort(
                  (a: any, b: any) => (a.groupOrder || 0) - (b.groupOrder || 0),
                );
              const currentGroupIndex = groupMembers.findIndex(
                (ex: any) => ex.exerciseName === currentExercise.exerciseName,
              );
              return `${currentGroupIndex + 1}/${groupMembers.length}`;
            })()
          : undefined,
      });

      if (activityId) {
        setLiveActivityId(activityId);
      }
    };

    startLiveActivity();
  }, [
    session,
    liveActivityId,
    currentExerciseIndex,
    currentSetIndex,
    convertWeight,
    formatWeight,
    liveActivityRestRemaining,
    restEndsAt,
    restEnabled,
    startWorkoutActivity,
    weightUnit,
  ]);

  // Update Live Activity when workout state changes
  useEffect(() => {
    if (!session || !liveActivityId) return;

    const updateLiveActivity = async () => {
      const currentExercise = session.exercises[currentExerciseIndex];
      const currentSet = currentExercise?.sets[currentSetIndex];

      if (!currentExercise || !currentSet) return;

      const weightDisplay = currentSet.weight
        ? (() => {
            const isPair = currentExercise.loadingMode === "pair";
            const converted = convertWeight(
              currentSet.weight,
              "kg",
              weightUnit,
            );
            if (isPair) {
              const per = converted / 2;
              return `${formatWeight(per)} each`;
            }
            return formatWeight(converted);
          })()
        : undefined;

      await updateWorkoutActivity(liveActivityId, {
        exerciseName:
          currentExercise.exerciseName ||
          `Exercise ${currentExerciseIndex + 1}`,
        currentSet: currentSetIndex + 1,
        totalSets: currentExercise.sets.length,
        reps: currentSet.reps,
        weight: weightDisplay,
        restTimeRemaining: liveActivityRestRemaining,
        restEndsAt: restEndsAt || undefined,
        restEnabled,
        isSuperset: !!currentExercise.groupId,
        supersetInfo: currentExercise.groupId
          ? (() => {
              const groupMembers = session.exercises
                .filter((ex: any) => ex.groupId === currentExercise.groupId)
                .sort(
                  (a: any, b: any) => (a.groupOrder || 0) - (b.groupOrder || 0),
                );
              const currentGroupIndex = groupMembers.findIndex(
                (ex: any) => ex.exerciseName === currentExercise.exerciseName,
              );
              return `${currentGroupIndex + 1}/${groupMembers.length}`;
            })()
          : undefined,
      });
    };

    updateLiveActivity();
  }, [
    session,
    liveActivityId,
    currentExerciseIndex,
    currentSetIndex,
    restEnabled,
    liveActivityRestRemaining,
    restEndsAt,
    weightUnit,
    convertWeight,
    formatWeight,
    updateWorkoutActivity,
  ]);

  const buttonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: buttonScale.value }],
    };
  });

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

  const currentExercise = session?.exercises[currentExerciseIndex];
  const currentExerciseMeta = (exerciseMeta ?? []).find(
    (e: any) => e._id === currentExercise?.exerciseId,
  );
  const currentSet = currentExercise?.sets[currentSetIndex];
  const currentMediaSource =
    (currentExercise as any)?.mediaSource || (currentExerciseMeta as any)?.mediaSource;
  const currentYoutubeUrl = currentMediaSource?.youtubeUrl as string | undefined;
  const currentYoutubeStartSec = currentMediaSource?.sourceStartSec as number | undefined;
  const currentSetKey = getSetKey(currentExerciseIndex, currentSetIndex);
  const markDisabled = !!currentSet?.done || optimisticCompletedSetKeys.has(currentSetKey) || isMarkingSet || isAnyOverlayActive;
  const prevDisabled =
    (currentExerciseIndex === 0 && currentSetIndex === 0) ||
    isMarkingSet ||
    isAnyOverlayActive;
  const nextDisabled = isMarkingSet || isAnyOverlayActive;

  const buildYoutubeTimestampUrl = (rawUrl: string, startSec?: number) => {
    const sec = typeof startSec === "number" && startSec > 0 ? Math.floor(startSec) : undefined;
    try {
      const parsed = new URL(rawUrl);
      if (sec === undefined) return parsed.toString();
      parsed.searchParams.set("t", `${sec}s`);
      return parsed.toString();
    } catch {
      if (sec === undefined) return rawUrl;
      const separator = rawUrl.includes("?") ? "&" : "?";
      return `${rawUrl}${separator}t=${sec}s`;
    }
  };

  const openExerciseSourceVideo = async () => {
    if (!currentYoutubeUrl) {
      Alert.alert("Video unavailable", "No source video is configured for this exercise yet.");
      return;
    }
    const targetUrl = buildYoutubeTimestampUrl(currentYoutubeUrl, currentYoutubeStartSec);
    try {
      const canOpen = await Linking.canOpenURL(targetUrl);
      if (!canOpen) {
        Alert.alert("Cannot open link", "Unable to open YouTube link on this device.");
        return;
      }
      await Linking.openURL(targetUrl);
    } catch {
      Alert.alert("Cannot open link", "Unable to open YouTube link on this device.");
    }
  };

  if (!session || !currentExercise) {
    return (
      <Box bg="$background" flex={1} p={16} justifyContent="center">
        <Text size="lg" color="$textMuted" textAlign="center">
          Loading workout...
        </Text>
      </Box>
    );
  }

  return (
    <Box
      bg="$backgroundLight0"
      sx={{ _dark: { bg: "$backgroundDark0" } }}
      flex={1}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <VStack space="2xl" p={24} pb={120}>
          {!showRoadmap && (
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
              onSkipRest={() => {
                setRestEndsAt(null);
                setRestRemainingSec(null);
              }}
            />
          )}

          <Box position="relative">
            <Box
              bg="$cardLight"
              borderColor="$borderLight0"
              sx={{
                _dark: {
                  bg: "$cardDark",
                  borderColor: "$borderDark0",
                },
              }}
              borderWidth={1}
              borderRadius={20}
              p={32}
              alignItems="center"
              position="relative"
            >
              {!showRoadmap && !isAnyOverlayActive && (
                <Pressable
                  onPress={openExerciseSourceVideo}
                  style={{ position: "absolute", top: 12, right: 12, zIndex: 10, padding: 4 }}
                >
                  <Ionicons
                    name="logo-youtube"
                    size={22}
                    color={effectiveColorScheme === "dark" ? "#ADB5BD" : "#212529"}
                  />
                </Pressable>
              )}
              <VStack space="2xl" alignItems="center" w="100%">
                <VStack alignItems="center" space="xs">
                  <Text
                    size="xl"
                    fontWeight="$bold"
                    color="$textLight0"
                    sx={{ _dark: { color: "$textDark0" } }}
                    textAlign="center"
                  >
                    {currentExercise?.exerciseName ||
                      `Exercise ${currentExerciseIndex + 1}`}
                  </Text>
                  {!!currentExercise?.groupId &&
                    (() => {
                      const groupMembers = session!.exercises
                        .filter(
                          (ex: any) => ex.groupId === currentExercise.groupId,
                        )
                        .sort(
                          (a: any, b: any) =>
                            (a.groupOrder || 0) - (b.groupOrder || 0),
                        );
                      const currentGroupIndex = groupMembers.findIndex(
                        (ex: any) =>
                          ex.exerciseName === currentExercise.exerciseName,
                      );
                      const nextInGroup =
                        groupMembers[
                          (currentGroupIndex + 1) % groupMembers.length
                        ];

                      return (
                        <VStack alignItems="center" space="xs">
                          <Box
                            bg="$primary0"
                            sx={{ _dark: { bg: "$textDark0" } }}
                            borderRadius={12}
                            px={16}
                            py={8}
                          >
                            <HStack alignItems="center" space="sm">
                              <HStack alignItems="center" space="xs">
                                <Ionicons
                                  name="shuffle"
                                  size={16}
                                  color={
                                    effectiveColorScheme === "dark"
                                      ? "#FFFFFF"
                                      : "#000000"
                                  }
                                />
                                <Text
                                  size="xs"
                                  color="$backgroundLight0"
                                  sx={{ _dark: { color: "$backgroundDark0" } }}
                                  fontWeight="$bold"
                                  textTransform="uppercase"
                                  letterSpacing={1}
                                >
                                  SUPERSET
                                </Text>
                              </HStack>
                              <Text
                                size="xs"
                                color="$backgroundLight0"
                                sx={{ _dark: { color: "$backgroundDark0" } }}
                                fontWeight="$bold"
                              >
                                {currentGroupIndex + 1}/{groupMembers.length}
                              </Text>
                            </HStack>
                          </Box>
                          {nextInGroup &&
                            nextInGroup.exerciseName !==
                              currentExercise.exerciseName && (
                              <Text
                                size="xs"
                                color="$textLight300"
                                sx={{ _dark: { color: "$textDark300" } }}
                                textAlign="center"
                              >
                                Next: {nextInGroup.exerciseName}
                              </Text>
                            )}
                        </VStack>
                      );
                    })()}
                </VStack>

                <SetCard
                  currentExercise={currentExercise}
                  currentSet={currentSet}
                  currentSetIndex={currentSetIndex}
                  formatWeight={formatWeight}
                  convertWeight={convertWeight}
                  weightUnit={weightUnit}
                  onWeightAdjust={
                    currentExercise?.loadBasis === "external"
                      ? async (delta: number) => {
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Light,
                          );
                          const step = getDisplayIncrement(
                            weightUnit,
                            currentExercise as any,
                          );
                          const currentDisplay = convertWeight(
                            currentSet?.weight || 0,
                            "kg",
                            weightUnit,
                          );
                          const nextDisplay = Math.max(
                            0,
                            currentDisplay + delta * step,
                          );
                          const nextKg = convertWeight(
                            nextDisplay,
                            weightUnit,
                            "kg",
                          );
                          enqueueWorkoutOperation({
                            id: createWorkoutOperationId("updatePlannedWeight"),
                            type: "updatePlannedWeight",
                            sessionId: String(sessionId),
                            exerciseIndex: currentExerciseIndex,
                            fromSetIndex: currentSetIndex,
                            weightKg: nextKg,
                            createdAt: Date.now(),
                          });
                          updatePlannedWeight({
                            sessionId: sessionId as Id<"sessions">,
                            exerciseIndex: currentExerciseIndex,
                            fromSetIndex: currentSetIndex,
                            weightKg: nextKg,
                          }).catch(() => {});
                        }
                      : undefined
                  }
                />

                <Animated.View style={buttonAnimatedStyle}>
                  <Button
                    bg="$primary0"
                    sx={{
                      _dark: { bg: "$textDark0" },
                      opacity: markDisabled ? 0.6 : 1,
                    }}
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
                        sx={{ _dark: { color: "$backgroundDark0" } }}
                        fontWeight="$semibold"
                        size="lg"
                        textAlign="center"
                      >
                        {currentSet?.done ? "✓ Set Complete" : "Mark Set Done"}
                      </Text>
                    </Box>
                  </Button>
                </Animated.View>

                {completedSets < totalSets && (
                  <HStack
                    justifyContent="space-between"
                    alignItems="center"
                    w="100%"
                  >
                    <Button
                      variant="outline"
                      onPress={onPrev}
                      isDisabled={prevDisabled}
                      borderColor="$borderLight0"
                      sx={{
                        _dark: { borderColor: "$borderDark0" },
                        opacity: prevDisabled ? 0.6 : 1,
                      }}
                      borderRadius={12}
                      h={44}
                      px={20}
                    >
                      <Text
                        color="$textLight0"
                        sx={{ _dark: { color: "$textDark0" } }}
                        fontWeight="$medium"
                      >
                        Previous
                      </Text>
                    </Button>
                    <Button
                      bg="$primary0"
                      sx={{
                        _dark: { bg: "$textDark0" },
                        opacity: nextDisabled ? 0.6 : 1,
                      }}
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
                        sx={{ _dark: { color: "$backgroundDark0" } }}
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
        </VStack>
      </ScrollView>

      <WorkoutRoadmapModal
        visible={showRoadmap}
        exercises={session!.exercises as any}
        currentExerciseIndex={currentExerciseIndex}
        onClose={() => setShowRoadmap(false)}
      />

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

      <RestCompleteOverlay
        restCompleteOpacity={restCompleteOpacity}
        restCompleteScale={restCompleteScale}
      />
    </Box>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
});
