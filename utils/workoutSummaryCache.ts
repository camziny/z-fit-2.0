import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'z-fit-workout-summary-cache-v1';

export type WorkoutTemplateSummary = {
  _id: string;
  name: string;
  description?: string;
  items: Array<{
    exerciseId: string;
    exerciseName: string;
    order: number;
    setCount: number;
    restSeconds: number;
    groupId?: string;
    groupOrder?: number;
  }>;
  setCount: number;
  estimatedMinutes: number;
};

export type WorkoutSummaryCache = {
  updatedAt: number;
  categories: Record<string, WorkoutTemplateSummary[]>;
};

const emptyCache = (): WorkoutSummaryCache => ({
  updatedAt: 0,
  categories: {},
});

let cacheWriteQueue = Promise.resolve();

function normalizeSummaries(value: unknown): WorkoutTemplateSummary[] {
  return Array.isArray(value) ? (value as WorkoutTemplateSummary[]) : [];
}

function normalizeCategoryMap(categories: Record<string, WorkoutTemplateSummary[]>) {
  return Object.fromEntries(
    Object.entries(categories).map(([categoryKey, summaries]) => [
      categoryKey,
      normalizeSummaries(summaries),
    ]),
  );
}

function enqueueCacheWrite(operation: () => Promise<void>): Promise<void> {
  const nextWrite = cacheWriteQueue.catch(() => {}).then(operation);
  cacheWriteQueue = nextWrite.catch(() => {});
  return nextWrite;
}

export async function loadWorkoutSummaryCache(): Promise<WorkoutSummaryCache> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyCache();
  try {
    const parsed = JSON.parse(raw) as Partial<WorkoutSummaryCache>;
    if (!parsed || typeof parsed !== 'object' || !parsed.categories) return emptyCache();
    return {
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
      categories: parsed.categories,
    };
  } catch {
    return emptyCache();
  }
}

export async function loadCachedWorkoutSummaries(categoryKey: string): Promise<WorkoutTemplateSummary[] | undefined> {
  const cache = await loadWorkoutSummaryCache();
  return cache.categories[categoryKey];
}

export async function saveCachedWorkoutSummaries(
  categoryKey: string,
  summaries: WorkoutTemplateSummary[],
): Promise<void> {
  await enqueueCacheWrite(async () => {
    const cache = await loadWorkoutSummaryCache();
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        updatedAt: Date.now(),
        categories: {
          ...cache.categories,
          [categoryKey]: normalizeSummaries(summaries),
        },
      }),
    );
  });
}

export async function saveAllCachedWorkoutSummaries(
  categories: Record<string, WorkoutTemplateSummary[]>,
): Promise<void> {
  await enqueueCacheWrite(async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        updatedAt: Date.now(),
        categories: normalizeCategoryMap(categories),
      }),
    );
  });
}
