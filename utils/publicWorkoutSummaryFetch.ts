import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import type { WorkoutSetupBaseData } from '@/utils/workoutSetupCache';
import { type WorkoutTemplateSummary } from '@/utils/workoutSummaryCache';
import type { PlannedWeightValue } from '@/utils/workoutPlanning';
import { ConvexHttpClient } from 'convex/browser';

let publicConvexClient: ConvexHttpClient | null = null;

function getConvexUrl() {
  const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
  if (!convexUrl) return null;
  return convexUrl;
}

function getPublicConvexClient() {
  const convexUrl = getConvexUrl();
  if (!convexUrl) return null;
  if (!publicConvexClient) {
    publicConvexClient = new ConvexHttpClient(convexUrl, { logger: false });
  }
  return publicConvexClient;
}

function createConvexHttpClient(authToken?: string | null) {
  const convexUrl = getConvexUrl();
  if (!convexUrl) return null;
  const client = new ConvexHttpClient(convexUrl, { logger: false });
  if (authToken) client.setAuth(authToken);
  return client;
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

export async function fetchPublicWorkoutSetupBaseData(
  templateId: string,
): Promise<WorkoutSetupBaseData | undefined> {
  const client = getPublicConvexClient();
  if (!client) return undefined;
  return await client.query(api.sessions.getSetupBaseData, {
    templateId: templateId as Id<'templates'>,
  });
}

export async function startWorkoutFromTemplateOverHttp({
  templateId,
  anonKey,
  plannedWeights,
  authToken,
}: {
  templateId: string;
  anonKey?: string;
  plannedWeights?: Record<string, PlannedWeightValue>;
  authToken?: string | null;
}) {
  const client = createConvexHttpClient(authToken);
  if (!client) throw new Error('Convex URL is not configured');
  return await client.mutation(api.sessions.startFromTemplate, {
    templateId: templateId as Id<'templates'>,
    anonKey,
    plannedWeights,
  });
}

export async function cancelWorkoutSessionOverHttp({
  sessionId,
  anonKey,
  authToken,
}: {
  sessionId: string;
  anonKey?: string;
  authToken?: string | null;
}) {
  const client = createConvexHttpClient(authToken);
  if (!client) throw new Error('Convex URL is not configured');
  return await client.mutation(api.sessions.cancelSession, {
    sessionId: sessionId as Id<'sessions'>,
    anonKey,
  });
}
