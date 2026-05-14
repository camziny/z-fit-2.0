import { api } from '@/convex/_generated/api';
import {
  loadCachedWorkoutSummaries,
  saveCachedWorkoutSummaries,
  type WorkoutTemplateSummary,
} from '@/utils/workoutSummaryCache';
import { fetchPublicWorkoutSummaries } from '@/utils/publicWorkoutSummaryFetch';
import { useConvexAuth, useQuery } from 'convex/react';
import { useEffect, useMemo, useRef, useState } from 'react';

const debugWorkoutLoading = process.env.EXPO_PUBLIC_WORKOUT_LOAD_DEBUG === 'true';

export function useWorkoutCategorySummaries(categoryKey?: string) {
  const { isLoading: isConvexAuthLoading, isAuthenticated } = useConvexAuth();
  const requestedAtRef = useRef(Date.now());
  const hasLoggedLiveResultRef = useRef(false);
  const hasLoggedHttpResultRef = useRef(false);
  const hadCachedTemplatesRef = useRef(false);
  const [cachedTemplates, setCachedTemplates] = useState<WorkoutTemplateSummary[] | undefined>();
  const [httpTemplates, setHttpTemplates] = useState<WorkoutTemplateSummary[] | undefined>();
  const [hasLoadedCache, setHasLoadedCache] = useState(false);
  const liveTemplates = useQuery(
    api.templates.byCategorySummaries,
    categoryKey ? { categoryKey } : 'skip',
  ) as WorkoutTemplateSummary[] | undefined;

  useEffect(() => {
    requestedAtRef.current = Date.now();
    hasLoggedLiveResultRef.current = false;
    hasLoggedHttpResultRef.current = false;
  }, [categoryKey]);

  useEffect(() => {
    let isActive = true;
    setCachedTemplates(undefined);
    setHttpTemplates(undefined);
    setHasLoadedCache(false);
    hadCachedTemplatesRef.current = false;

    if (!categoryKey) {
      setHasLoadedCache(true);
      return () => {
        isActive = false;
      };
    }

    loadCachedWorkoutSummaries(categoryKey)
      .then((summaries) => {
        if (!isActive) return;
        hadCachedTemplatesRef.current = summaries !== undefined;
        setCachedTemplates(summaries);
      })
      .finally(() => {
        if (!isActive) return;
        setHasLoadedCache(true);
      });

    fetchPublicWorkoutSummaries(categoryKey)
      .then((summaries) => {
        if (!isActive || summaries === undefined) return;
        setHttpTemplates(summaries);
        saveCachedWorkoutSummaries(categoryKey, summaries).catch(() => {});
        if (debugWorkoutLoading && !hasLoggedHttpResultRef.current) {
          hasLoggedHttpResultRef.current = true;
          console.info('workout-category-http-query-settled', {
            categoryKey,
            elapsedMs: Date.now() - requestedAtRef.current,
            resultCount: summaries.length,
            hadCachedTemplates: hadCachedTemplatesRef.current,
          });
        }
      })
      .catch(() => {});

    return () => {
      isActive = false;
    };
  }, [categoryKey]);

  useEffect(() => {
    if (!categoryKey || liveTemplates === undefined) return;
    saveCachedWorkoutSummaries(categoryKey, liveTemplates).catch(() => {});
  }, [categoryKey, liveTemplates]);

  useEffect(() => {
    if (!debugWorkoutLoading || liveTemplates === undefined || hasLoggedLiveResultRef.current) return;
    hasLoggedLiveResultRef.current = true;
    console.info('workout-category-live-query-settled', {
      categoryKey,
      elapsedMs: Date.now() - requestedAtRef.current,
      resultCount: liveTemplates.length,
      isConvexAuthLoading,
      isAuthenticated,
      hadCachedTemplates: cachedTemplates !== undefined,
    });
  }, [cachedTemplates, categoryKey, isAuthenticated, isConvexAuthLoading, liveTemplates]);

  return useMemo(() => {
    const templates = liveTemplates ?? httpTemplates ?? cachedTemplates;
    const isLoading = templates === undefined;
    const isUsingCache = liveTemplates === undefined && httpTemplates === undefined && cachedTemplates !== undefined;

    return {
      templates,
      liveTemplates,
      httpTemplates,
      cachedTemplates,
      hasLoadedCache,
      isLoading,
      isUsingCache,
      isConvexAuthLoading,
      isAuthenticated,
    };
  }, [
    cachedTemplates,
    hasLoadedCache,
    httpTemplates,
    isAuthenticated,
    isConvexAuthLoading,
    liveTemplates,
  ]);
}
