import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'z-fit-workout-setup-cache-v1';

export type WorkoutSetupBaseData = {
  template: any;
  exercises: any[];
} | null;

type WorkoutSetupCache = {
  updatedAt: number;
  templates: Record<string, WorkoutSetupBaseData>;
};

const emptyCache = (): WorkoutSetupCache => ({
  updatedAt: 0,
  templates: {},
});

let cacheWriteQueue = Promise.resolve();

function enqueueCacheWrite(operation: () => Promise<void>): Promise<void> {
  const nextWrite = cacheWriteQueue.catch(() => {}).then(operation);
  cacheWriteQueue = nextWrite.catch(() => {});
  return nextWrite;
}

export async function loadWorkoutSetupCache(): Promise<WorkoutSetupCache> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyCache();
  try {
    const parsed = JSON.parse(raw) as Partial<WorkoutSetupCache>;
    if (!parsed || typeof parsed !== 'object' || !parsed.templates) return emptyCache();
    return {
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
      templates: parsed.templates,
    };
  } catch {
    return emptyCache();
  }
}

export async function loadCachedWorkoutSetupBaseData(templateId: string): Promise<WorkoutSetupBaseData | undefined> {
  const cache = await loadWorkoutSetupCache();
  return cache.templates[templateId];
}

export async function saveCachedWorkoutSetupBaseData(
  templateId: string,
  setupBaseData: WorkoutSetupBaseData,
): Promise<void> {
  await enqueueCacheWrite(async () => {
    const cache = await loadWorkoutSetupCache();
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        updatedAt: Date.now(),
        templates: {
          ...cache.templates,
          [templateId]: setupBaseData,
        },
      }),
    );
  });
}
