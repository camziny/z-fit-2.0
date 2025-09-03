import { api } from '@/convex/_generated/api';
import { useUser } from '@clerk/clerk-expo';
import { useConvexAuth, useMutation } from 'convex/react';
import { useEffect, useRef } from 'react';

export default function AuthSync() {
  const { isSignedIn, user } = useUser();
  const { isLoading: convexLoading, isAuthenticated: convexAuthenticated } = useConvexAuth();
  const getOrCreate = useMutation(api.users.getOrCreate);
  const lastSyncedId = useRef<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!isSignedIn || !user) return;
      if (convexLoading) return;
      if (!convexAuthenticated) return;
      if (lastSyncedId.current === user.id) return;

      try {
        const userId = await getOrCreate({
          clerkUserId: user.id,
          displayName: user.fullName ?? user.firstName ?? user.username ?? undefined,
        });
        lastSyncedId.current = user.id;
      } catch {}
    };
    const timer = setTimeout(run, 1000);
    return () => clearTimeout(timer);
  }, [isSignedIn, user, getOrCreate, convexLoading, convexAuthenticated]);

  return null;
}


