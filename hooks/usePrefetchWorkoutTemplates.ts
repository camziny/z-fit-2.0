import { api } from '@/convex/_generated/api';
import { useQuery } from 'convex/react';

export function usePrefetchWorkoutTemplates() {
  return useQuery(api.templates.allCategorySummaries, {});
}
