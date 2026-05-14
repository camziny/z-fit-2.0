import { api } from '@/convex/_generated/api';
import { fetchPublicWorkoutSummariesByCategory } from '@/utils/publicWorkoutSummaryFetch';
import { saveAllCachedWorkoutSummaries, type WorkoutTemplateSummary } from '@/utils/workoutSummaryCache';
import { useQuery } from 'convex/react';
import { useEffect, useRef } from 'react';

function createSummarySignature(summariesByCategory: Record<string, WorkoutTemplateSummary[]>) {
  return JSON.stringify(
    Object.entries(summariesByCategory)
      .sort(([leftCategory], [rightCategory]) => leftCategory.localeCompare(rightCategory))
      .map(([categoryKey, summaries]) => [
        categoryKey,
        summaries.map((summary) => ({
          _id: summary._id,
          name: summary.name,
          description: summary.description ?? null,
          setCount: summary.setCount,
          estimatedMinutes: summary.estimatedMinutes,
          items: summary.items.map((item) => ({
            exerciseId: item.exerciseId,
            exerciseName: item.exerciseName,
            order: item.order,
            setCount: item.setCount,
            restSeconds: item.restSeconds,
            groupId: item.groupId ?? null,
            groupOrder: item.groupOrder ?? null,
          })),
        })),
      ]),
  );
}

export default function WorkoutSummaryPrefetch() {
  const summariesByCategory = useQuery(api.templates.allCategorySummaries, {}) as
    | Record<string, WorkoutTemplateSummary[]>
    | undefined;
  const lastSavedSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    let isActive = true;

    fetchPublicWorkoutSummariesByCategory()
      .then((httpSummariesByCategory) => {
        if (!isActive || !httpSummariesByCategory) return;
        const signature = createSummarySignature(httpSummariesByCategory);
        if (lastSavedSignatureRef.current === signature) return;
        lastSavedSignatureRef.current = signature;
        saveAllCachedWorkoutSummaries(httpSummariesByCategory).catch(() => {});
      })
      .catch(() => {});

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!summariesByCategory) return;
    const signature = createSummarySignature(summariesByCategory);
    if (lastSavedSignatureRef.current === signature) return;
    lastSavedSignatureRef.current = signature;
    saveAllCachedWorkoutSummaries(summariesByCategory).catch(() => {});
  }, [summariesByCategory]);

  return null;
}
