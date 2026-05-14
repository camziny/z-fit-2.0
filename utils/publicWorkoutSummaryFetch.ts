import { api } from '@/convex/_generated/api';
import { type WorkoutTemplateSummary } from '@/utils/workoutSummaryCache';
import { ConvexHttpClient } from 'convex/browser';

let publicConvexClient: ConvexHttpClient | null = null;

function getPublicConvexClient() {
  const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
  if (!convexUrl) return null;
  if (!publicConvexClient) {
    publicConvexClient = new ConvexHttpClient(convexUrl);
  }
  return publicConvexClient;
}

export async function fetchPublicWorkoutSummaries(
  categoryKey: string,
): Promise<WorkoutTemplateSummary[] | undefined> {
  const client = getPublicConvexClient();
  if (!client) return undefined;
  return await client.query(api.templates.byCategorySummaries, { categoryKey });
}

export async function fetchPublicWorkoutSummariesByCategory(): Promise<
  Record<string, WorkoutTemplateSummary[]> | undefined
> {
  const client = getPublicConvexClient();
  if (!client) return undefined;
  return await client.query(api.templates.allCategorySummaries, {});
}
