import { useAppToast } from '@/components/AppToast';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { useThemeMode } from '@/hooks/useThemeMode';
import { useWeightUnit } from '@/hooks/useWeightUnit';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { Box, HStack, Input, InputField, Pressable, Text, VStack } from '@gluestack-ui/themed';
import { useMutation, useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { Stack, router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';

type GroupView = 'leaderboard' | 'activity';
type LeaderboardMetric = 'prsThisMonth' | 'workoutsThisWeek' | 'currentStreak';

type PrDetail = { exerciseName: string; weight: number; completedAt: number; isPrimary: boolean };
type WorkoutDetail = { completedAt: number; title: string };

type ActivityExercise = { exerciseName: string; weight: number; reps: number; isPrimary: boolean; weighted: boolean };
type ActivityItem = {
  sessionId: Id<'sessions'>;
  userId: Id<'users'>;
  displayName: string;
  imageUrl: string | null;
  isCurrentUser: boolean;
  completedAt: number;
  title: string;
  setCount: number;
  exercises: ActivityExercise[];
};

type LeaderboardEntry = {
  userId: Id<'users'>;
  displayName: string;
  imageUrl: string | null;
  value: number;
  rank: number;
  isCurrentUser: boolean;
  detail:
    | { type: 'prsThisMonth'; prs: PrDetail[] }
    | { type: 'workoutsThisWeek'; workouts: WorkoutDetail[] }
    | { type: 'currentStreak'; lastWorkoutAt: number | null; workedToday: boolean };
};

const DETAIL_LIMIT = 3;

const metricOptions: {
  value: LeaderboardMetric;
  label: string;
  caption: string;
  unit: string;
  expandable: boolean;
}[] = [
  { value: 'prsThisMonth', label: 'PRs', caption: 'This month', unit: 'PRs', expandable: true },
  { value: 'workoutsThisWeek', label: 'Workouts', caption: 'Last 7 days', unit: 'sessions', expandable: true },
  { value: 'currentStreak', label: 'Streak', caption: 'Consecutive days', unit: 'days', expandable: false },
];

function formatRelativeDay(timestamp: number, now: number): string {
  const day = new Date(timestamp);
  day.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - day.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatActivityTime(timestamp: number, now: number): string {
  const diffMs = now - timestamp;
  const diffMinutes = Math.round(diffMs / (60 * 1000));
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return formatRelativeDay(timestamp, now);
}

function capPrs(prs: PrDetail[]) {
  const sorted = [...prs].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return b.completedAt - a.completedAt;
  });
  return { visible: sorted.slice(0, DETAIL_LIMIT), overflow: Math.max(0, sorted.length - DETAIL_LIMIT) };
}

function capWorkouts(workouts: WorkoutDetail[]) {
  return { visible: workouts.slice(0, DETAIL_LIMIT), overflow: Math.max(0, workouts.length - DETAIL_LIMIT) };
}

function getTopLift(exercises: ActivityExercise[]): ActivityExercise | null {
  const primary = exercises.filter((e) => e.isPrimary && e.weighted);
  const pool = primary.length > 0 ? primary : exercises.filter((e) => e.weighted);
  if (pool.length === 0) return null;
  return pool.reduce((best, e) => (e.weight > best.weight ? e : best));
}

function getExpandedActivityExercises(exercises: ActivityExercise[]): ActivityExercise[] {
  return exercises.filter((e) => e.isPrimary && e.weighted).slice(0, DETAIL_LIMIT);
}

function formatSetLine(
  exercise: ActivityExercise,
  formatStoredWeight: (weightKg: number) => string
): string {
  if (!exercise.weighted) return `${exercise.reps} reps`;
  return `${formatStoredWeight(exercise.weight)} × ${exercise.reps}`;
}

function getHighlight(
  entry: LeaderboardEntry,
  now: number,
  formatStoredWeight: (weightKg: number) => string
): string {
  if (entry.detail.type === 'prsThisMonth') {
    if (entry.detail.prs.length === 0) return 'No new PRs';
    const top = capPrs(entry.detail.prs).visible[0];
    return `${top.exerciseName} · ${formatStoredWeight(top.weight)}`;
  }
  if (entry.detail.type === 'workoutsThisWeek') {
    if (entry.detail.workouts.length === 0) return 'No workouts yet';
    const latest = entry.detail.workouts[0];
    return `${latest.title} · ${formatRelativeDay(latest.completedAt, now)}`;
  }
  if (entry.value === 0 || !entry.detail.lastWorkoutAt) return 'No active streak';
  return entry.detail.workedToday ? 'Trained today' : `Last ${formatRelativeDay(entry.detail.lastWorkoutAt, now)}`;
}

function hasExpandableDetail(entry: LeaderboardEntry): boolean {
  if (entry.detail.type === 'prsThisMonth') return capPrs(entry.detail.prs).overflow > 0;
  if (entry.detail.type === 'workoutsThisWeek') return capWorkouts(entry.detail.workouts).overflow > 0;
  return false;
}

function Avatar({
  size,
  imageUrl,
  initial,
  variant = 'default',
}: {
  size: number;
  imageUrl: string | null;
  initial: string;
  variant?: 'default' | 'leader';
}) {
  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
        transition={150}
      />
    );
  }

  const isLeader = variant === 'leader';
  return (
    <Box
      w={size}
      h={size}
      borderRadius={999}
      justifyContent="center"
      alignItems="center"
      bg={isLeader ? '$primary0' : '$backgroundLight100'}
      sx={{ _dark: { bg: isLeader ? '$textDark0' : '$backgroundDark100' } }}
    >
      <Text
        size={size >= 44 ? 'lg' : 'md'}
        fontWeight="$bold"
        color={isLeader ? '$backgroundLight0' : '$textLight0'}
        sx={{ _dark: { color: isLeader ? '$backgroundDark0' : '$textDark0' } }}
      >
        {initial}
      </Text>
    </Box>
  );
}

function ExpandedDetail({
  entry,
  now,
  formatStoredWeight,
}: {
  entry: LeaderboardEntry;
  now: number;
  formatStoredWeight: (weightKg: number) => string;
}) {
  if (entry.detail.type === 'prsThisMonth') {
    const { visible, overflow } = capPrs(entry.detail.prs);
    return (
      <VStack space="md">
        {visible.map((pr, index) => (
          <HStack key={`${pr.exerciseName}-${pr.completedAt}-${index}`} alignItems="center" justifyContent="space-between">
            <HStack space="sm" alignItems="center" flex={1}>
              <Box
                w={6}
                h={6}
                borderRadius={999}
                bg={pr.isPrimary ? '$primary0' : '$borderLight200'}
                sx={{ _dark: { bg: pr.isPrimary ? '$textDark0' : '$borderDark0' } }}
              />
              <Text
                size="sm"
                fontWeight={pr.isPrimary ? '$semibold' : '$normal'}
                color={pr.isPrimary ? '$textLight0' : '$textLight200'}
                sx={{ _dark: { color: pr.isPrimary ? '$textDark0' : '$textDark200' } }}
                numberOfLines={1}
              >
                {pr.exerciseName}
              </Text>
            </HStack>
            <HStack space="md" alignItems="center">
              <Text size="sm" fontWeight="$bold" color="$textLight0" sx={{ _dark: { color: '$textDark0' } }}>
                {formatStoredWeight(pr.weight)}
              </Text>
              <Text size="xs" color="$textLight300" sx={{ _dark: { color: '$textDark300' } }} w={60} textAlign="right">
                {formatRelativeDay(pr.completedAt, now)}
              </Text>
            </HStack>
          </HStack>
        ))}
        {overflow > 0 && (
          <Text size="xs" color="$textLight300" sx={{ _dark: { color: '$textDark300' } }}>
            +{overflow} more PR{overflow === 1 ? '' : 's'}
          </Text>
        )}
      </VStack>
    );
  }

  if (entry.detail.type === 'workoutsThisWeek') {
    const { visible, overflow } = capWorkouts(entry.detail.workouts);
    return (
      <VStack space="md">
        {visible.map((workout) => (
          <HStack key={workout.completedAt} alignItems="center" justifyContent="space-between" space="md">
            <Text
              size="sm"
              fontWeight="$medium"
              color="$textLight0"
              sx={{ _dark: { color: '$textDark0' } }}
              flex={1}
              numberOfLines={1}
            >
              {workout.title}
            </Text>
            <Text size="xs" color="$textLight300" sx={{ _dark: { color: '$textDark300' } }}>
              {formatRelativeDay(workout.completedAt, now)}
            </Text>
          </HStack>
        ))}
        {overflow > 0 && (
          <Text size="xs" color="$textLight300" sx={{ _dark: { color: '$textDark300' } }}>
            +{overflow} more workout{overflow === 1 ? '' : 's'}
          </Text>
        )}
      </VStack>
    );
  }

  return null;
}

function ActivityCard({
  item,
  now,
  mutedIcon,
  formatStoredWeight,
}: {
  item: ActivityItem;
  now: number;
  mutedIcon: string;
  formatStoredWeight: (weightKg: number) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const initial = (item.displayName.trim()[0] ?? 'A').toUpperCase();
  const name = item.isCurrentUser ? 'You' : item.displayName;
  const topLift = getTopLift(item.exercises);
  const expandedExercises = getExpandedActivityExercises(item.exercises);
  const canExpand = expandedExercises.length > 1;

  const subtitleParts = [
    formatActivityTime(item.completedAt, now),
    `${item.setCount} set${item.setCount === 1 ? '' : 's'}`,
  ];
  if (topLift) {
    subtitleParts.push(`${topLift.exerciseName} ${formatSetLine(topLift, formatStoredWeight)}`);
  }

  return (
    <Pressable onPress={() => canExpand && setExpanded((prev) => !prev)}>
      {({ pressed }) => (
        <Box
          bg="$cardLight"
          sx={{ _dark: { bg: '$cardDark', borderColor: '$borderDark0' } }}
          borderColor="$borderLight0"
          borderWidth={1}
          borderRadius={16}
          px={16}
          py={14}
          opacity={canExpand && pressed ? 0.92 : 1}
        >
          <HStack alignItems="center" space="md">
            <Avatar size={42} imageUrl={item.imageUrl} initial={initial} />

            <VStack flex={1} space="xs">
              <Text size="md" color="$textLight0" sx={{ _dark: { color: '$textDark0' } }} numberOfLines={1}>
                <Text size="md" fontWeight="$bold" color="$textLight0" sx={{ _dark: { color: '$textDark0' } }}>
                  {name}
                </Text>{' '}
                did{' '}
                <Text size="md" fontWeight="$bold" color="$textLight0" sx={{ _dark: { color: '$textDark0' } }}>
                  {item.title}
                </Text>
              </Text>
              <Text size="xs" color="$textLight300" sx={{ _dark: { color: '$textDark300' } }} numberOfLines={2}>
                {subtitleParts.join(' · ')}
              </Text>
            </VStack>

            {canExpand && (
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={mutedIcon} />
            )}
          </HStack>

          {expanded && canExpand && (
            <Box
              mt={14}
              pt={14}
              borderTopWidth={1}
              borderColor="$borderLight0"
              sx={{ _dark: { borderColor: '$borderDark0' } }}
            >
              <VStack space="md">
                {expandedExercises.map((exercise, index) => (
                  <HStack key={`${exercise.exerciseName}-${index}`} alignItems="center" justifyContent="space-between" space="md">
                    <Text
                      size="sm"
                      color="$textLight0"
                      sx={{ _dark: { color: '$textDark0' } }}
                      flex={1}
                      numberOfLines={1}
                    >
                      {exercise.exerciseName}
                    </Text>
                    <Text size="sm" fontWeight="$medium" color="$textLight200" sx={{ _dark: { color: '$textDark200' } }}>
                      {formatSetLine(exercise, formatStoredWeight)}
                    </Text>
                  </HStack>
                ))}
              </VStack>
            </Box>
          )}
        </Box>
      )}
    </Pressable>
  );
}

export default function GroupLeaderboardScreen() {
  const { effectiveColorScheme } = useThemeMode();
  const isDark = effectiveColorScheme === 'dark';
  const { showToast } = useAppToast();
  const { isSignedIn, user } = useUser();
  const { weightUnit, convertWeight, formatWeight } = useWeightUnit();
  const convexUser = useQuery(api.users.me, isSignedIn && user ? { clerkUserId: user.id } : 'skip');

  const formatStoredWeight = useMemo(
    () => (weightKg: number) => formatWeight(convertWeight(weightKg, 'kg', weightUnit)),
    [convertWeight, formatWeight, weightUnit]
  );

  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const isValidGroupId = Boolean(groupId && groupId !== 'index');
  const parsedGroupId = isValidGroupId ? (groupId as Id<'groups'>) : undefined;

  const [view, setView] = useState<GroupView>('leaderboard');
  const [metric, setMetric] = useState<LeaderboardMetric>('workoutsThisWeek');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [invitingUserId, setInvitingUserId] = useState<Id<'users'> | null>(null);
  const now = useMemo(() => Date.now(), []);
  const timezoneOffsetMinutes = useMemo(() => new Date().getTimezoneOffset(), []);

  const mutedIcon = isDark ? '#6C757D' : '#ADB5BD';

  useEffect(() => {
    if (groupId === 'index') {
      router.replace('/groups' as Href);
    }
  }, [groupId]);

  const group = useQuery(api.groups.getGroup, parsedGroupId ? { groupId: parsedGroupId } : 'skip');
  const searchResults = useQuery(
    api.groups.searchUsersForInvite,
    parsedGroupId && searchQuery.trim().length >= 2 ? { groupId: parsedGroupId, query: searchQuery } : 'skip'
  );
  const pendingSentInvites = useQuery(
    api.groups.listPendingInvitesForGroup,
    parsedGroupId ? { groupId: parsedGroupId } : 'skip'
  );
  const leaderboard = useQuery(
    api.leaderboard.forGroup,
    parsedGroupId
      ? { groupId: parsedGroupId, metric, periodStart: now, timezoneOffsetMinutes }
      : 'skip'
  ) as LeaderboardEntry[] | undefined;
  const activity = useQuery(
    api.leaderboard.recentActivity,
    parsedGroupId && view === 'activity' ? { groupId: parsedGroupId } : 'skip'
  ) as ActivityItem[] | undefined;
  const leaveGroup = useMutation(api.groups.leave);
  const sendInvite = useMutation(api.groups.sendInvite);

  const selectedMetric = metricOptions.find((option) => option.value === metric) ?? metricOptions[0];
  const filteredSearchResults = searchResults?.filter((result) => !convexUser || result.userId !== convexUser._id);

  const handleSelectView = (next: GroupView) => {
    setView(next);
    setExpandedUserId(null);
  };

  const handleSelectMetric = (next: LeaderboardMetric) => {
    setMetric(next);
    setExpandedUserId(null);
  };

  const handleToggleExpand = (entry: LeaderboardEntry) => {
    if (!selectedMetric.expandable || !hasExpandableDetail(entry)) {
      return;
    }
    setExpandedUserId((prev) => (prev === String(entry.userId) ? null : String(entry.userId)));
  };

  const handleInvite = async (userId: Id<'users'>, displayName: string) => {
    if (!parsedGroupId || (convexUser && userId === convexUser._id)) {
      return;
    }
    setInvitingUserId(userId);
    try {
      await sendInvite({ groupId: parsedGroupId, userId });
      setSearchQuery('');
      showToast(`Invite sent to ${displayName}`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to send invite');
    } finally {
      setInvitingUserId(null);
    }
  };

  const handleLeave = () => {
    Alert.alert('Leave group', `Are you sure you want to leave ${group?.name ?? 'this group'}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          if (!parsedGroupId) {
            return;
          }
          await leaveGroup({ groupId: parsedGroupId });
          showToast('Left group');
          router.replace('/groups' as Href);
        },
      },
    ]);
  };

  if (group === null) {
    return (
      <Box flex={1} bg="$backgroundLight0" sx={{ _dark: { bg: '$backgroundDark0' } }} p={24} justifyContent="center">
        <Stack.Screen options={{ title: 'Group' }} />
        <Text textAlign="center" color="$textLight0" sx={{ _dark: { color: '$textDark0' } }}>
          Group not found
        </Text>
      </Box>
    );
  }

  return (
    <Box bg="$backgroundLight0" sx={{ _dark: { bg: '$backgroundDark0' } }} flex={1}>
      <Stack.Screen options={{ title: group?.name ?? 'Group' }} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <VStack space="xl" p={20} pb={140}>
          <HStack space="xl" px={4} borderBottomWidth={1} borderColor="$borderLight0" sx={{ _dark: { borderColor: '$borderDark0' } }}>
            {(['leaderboard', 'activity'] as GroupView[]).map((tab) => {
              const active = view === tab;
              return (
                <Pressable key={tab} onPress={() => handleSelectView(tab)}>
                  <Box
                    pt={2}
                    pb={12}
                    sx={{ _dark: { borderColor: active ? '$textDark0' : 'transparent' } }}
                    borderBottomWidth={2}
                    borderColor={active ? '$primary0' : 'transparent'}
                  >
                    <Text
                      size="lg"
                      fontWeight={active ? '$bold' : '$medium'}
                      color={active ? '$textLight0' : '$textLight300'}
                      sx={{ _dark: { color: active ? '$textDark0' : '$textDark300' } }}
                    >
                      {tab === 'leaderboard' ? 'Leaderboard' : 'Activity'}
                    </Text>
                  </Box>
                </Pressable>
              );
            })}
          </HStack>

          <HStack alignItems="center" justifyContent="space-between" px={4}>
            <Pressable
              hitSlop={8}
              onPress={() => {
                setShowInvite((prev) => !prev);
                setSearchQuery('');
              }}
            >
              {({ pressed }) => (
                <Text
                  size="sm"
                  fontWeight="$medium"
                  color="$primary0"
                  sx={{ _dark: { color: '$textDark0' } }}
                  opacity={pressed ? 0.7 : 1}
                >
                  Invite friends
                </Text>
              )}
            </Pressable>
            <Pressable hitSlop={8} onPress={handleLeave}>
              {({ pressed }) => (
                <Text size="sm" fontWeight="$medium" color="$error500" opacity={pressed ? 0.7 : 1}>
                  Leave group
                </Text>
              )}
            </Pressable>
          </HStack>

          {view === 'leaderboard' && (
            <VStack space="md">
              <Box
                bg="$backgroundLight100"
                sx={{ _dark: { bg: '$backgroundDark100' } }}
                borderRadius={12}
                p={3}
              >
                <HStack space="xs">
                  {metricOptions.map((option) => {
                    const active = metric === option.value;
                    return (
                      <Pressable key={option.value} flex={1} onPress={() => handleSelectMetric(option.value)}>
                        <Box
                          bg={active ? '$cardLight' : 'transparent'}
                          sx={{ _dark: { bg: active ? '$cardDark' : 'transparent' } }}
                          borderRadius={9}
                          h={36}
                          justifyContent="center"
                          alignItems="center"
                        >
                          <Text
                            size="sm"
                            fontWeight={active ? '$bold' : '$medium'}
                            color={active ? '$textLight0' : '$textLight300'}
                            sx={{ _dark: { color: active ? '$textDark0' : '$textDark300' } }}
                          >
                            {option.label}
                          </Text>
                        </Box>
                      </Pressable>
                    );
                  })}
                </HStack>
              </Box>

              <Text size="sm" color="$textLight300" sx={{ _dark: { color: '$textDark300' } }} px={4}>
                {selectedMetric.caption}
              </Text>
            </VStack>
          )}

          {view === 'activity' && (
            <Text size="sm" color="$textLight300" sx={{ _dark: { color: '$textDark300' } }} px={4}>
              Recent workouts
            </Text>
          )}

          {showInvite && (
            <Box
              bg="$cardLight"
              sx={{ _dark: { bg: '$cardDark', borderColor: '$borderDark0' } }}
              borderColor="$borderLight0"
              borderWidth={1}
              borderRadius={16}
              p={18}
            >
              <VStack space="md">
                <HStack alignItems="center" justifyContent="space-between">
                  <Text size="md" fontWeight="$semibold" color="$textLight0" sx={{ _dark: { color: '$textDark0' } }}>
                    Invite friends
                  </Text>
                  <Pressable hitSlop={8} onPress={() => { setShowInvite(false); setSearchQuery(''); }}>
                    <Ionicons name="close" size={20} color={mutedIcon} />
                  </Pressable>
                </HStack>
                <Box
                  bg="$backgroundLight0"
                  sx={{ _dark: { bg: '$backgroundDark0', borderColor: '$borderDark0' } }}
                  borderColor="$borderLight0"
                  borderWidth={1}
                  borderRadius={12}
                  px={14}
                  flexDirection="row"
                  alignItems="center"
                >
                  <Ionicons name="search" size={18} color={mutedIcon} />
                  <Input flex={1} borderWidth={0} h={46}>
                    <InputField
                      placeholder="Search by name"
                      placeholderTextColor={mutedIcon}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      autoFocus
                      color="$textLight0"
                      sx={{ _dark: { color: '$textDark0' } }}
                    />
                  </Input>
                </Box>
                {searchQuery.trim().length >= 2 && filteredSearchResults && filteredSearchResults.length === 0 && (
                  <Text size="sm" color="$textLight300" sx={{ _dark: { color: '$textDark300' } }}>
                    No users found
                  </Text>
                )}
                {filteredSearchResults?.map((result) => (
                  <HStack key={result.userId} justifyContent="space-between" alignItems="center" py={4} space="md">
                    <Text size="md" color="$textLight0" sx={{ _dark: { color: '$textDark0' } }} flex={1} numberOfLines={1}>
                      {result.displayName}
                    </Text>
                    <Pressable
                      flexShrink={0}
                      disabled={invitingUserId === result.userId}
                      onPress={() => handleInvite(result.userId, result.displayName)}
                    >
                      {({ pressed }) => (
                        <Box
                          borderColor="$borderLight0"
                          sx={{ _dark: { borderColor: '$borderDark0' } }}
                          borderWidth={1}
                          borderRadius={10}
                          h={36}
                          minWidth={72}
                          px={16}
                          justifyContent="center"
                          alignItems="center"
                          opacity={invitingUserId === result.userId ? 0.5 : pressed ? 0.7 : 1}
                        >
                          <Text color="$textLight0" sx={{ _dark: { color: '$textDark0' } }} fontWeight="$medium" size="sm">
                            Invite
                          </Text>
                        </Box>
                      )}
                    </Pressable>
                  </HStack>
                ))}
                {pendingSentInvites && pendingSentInvites.length > 0 && (
                  <VStack space="sm" pt={4}>
                    <Text size="2xs" fontWeight="$bold" color="$textLight300" sx={{ _dark: { color: '$textDark300' } }} letterSpacing={1}>
                      PENDING
                    </Text>
                    {pendingSentInvites.map((invite) => (
                      <HStack key={invite._id} space="sm" alignItems="center">
                        <Ionicons name="time-outline" size={14} color={mutedIcon} />
                        <Text size="sm" color="$textLight300" sx={{ _dark: { color: '$textDark300' } }}>
                          {invite.displayName}
                        </Text>
                      </HStack>
                    ))}
                  </VStack>
                )}
              </VStack>
            </Box>
          )}

          {view === 'leaderboard' ? (
            leaderboard === undefined ? (
              <Text size="sm" color="$textLight300" sx={{ _dark: { color: '$textDark300' } }} px={4}>
                Loading…
              </Text>
            ) : leaderboard.length === 0 ? (
              <Box
                bg="$cardLight"
                sx={{ _dark: { bg: '$cardDark', borderColor: '$borderDark0' } }}
                borderColor="$borderLight0"
                borderWidth={1}
                borderRadius={16}
                p={32}
              >
                <VStack space="md" alignItems="center">
                  <Ionicons name="trophy-outline" size={30} color={mutedIcon} />
                  <Text size="sm" color="$textLight300" sx={{ _dark: { color: '$textDark300' } }} textAlign="center">
                    Invite friends to start competing
                  </Text>
                  <Pressable onPress={() => setShowInvite(true)}>
                    {({ pressed }) => (
                      <Text
                        size="sm"
                        fontWeight="$medium"
                        color="$primary0"
                        sx={{ _dark: { color: '$textDark0' } }}
                        opacity={pressed ? 0.7 : 1}
                      >
                        Invite friends
                      </Text>
                    )}
                  </Pressable>
                </VStack>
              </Box>
            ) : (
              <VStack space="sm">
                {leaderboard.map((entry) => {
                  const isLeader = entry.rank === 1 && entry.value > 0;
                  const expanded = expandedUserId === String(entry.userId);
                  const canExpand = selectedMetric.expandable && hasExpandableDetail(entry);
                  const initial = (entry.displayName.trim()[0] ?? 'A').toUpperCase();

                  return (
                    <Pressable key={entry.userId} onPress={() => handleToggleExpand(entry)}>
                      {({ pressed }) => (
                        <Box
                          bg="$cardLight"
                          sx={{ _dark: { bg: '$cardDark', borderColor: '$borderDark0' } }}
                          borderColor="$borderLight0"
                          borderWidth={1}
                          borderRadius={16}
                          px={16}
                          py={14}
                          opacity={canExpand && pressed ? 0.92 : 1}
                        >
                          <HStack alignItems="center" space="md">
                            <Box w={20} alignItems="center">
                              <Text
                                size="md"
                                fontWeight="$bold"
                                color={isLeader ? '$textLight0' : '$textLight300'}
                                sx={{ _dark: { color: isLeader ? '$textDark0' : '$textDark300' } }}
                              >
                                {entry.rank}
                              </Text>
                            </Box>

                            <Avatar
                              size={46}
                              imageUrl={entry.imageUrl}
                              initial={initial}
                              variant={isLeader ? 'leader' : 'default'}
                            />

                            <VStack flex={1} space="xs">
                              <Text
                                size="md"
                                fontWeight="$semibold"
                                color="$textLight0"
                                sx={{ _dark: { color: '$textDark0' } }}
                                numberOfLines={1}
                              >
                                {entry.displayName}
                                {entry.isCurrentUser ? ' (You)' : ''}
                              </Text>
                              <Text size="sm" color="$textLight300" sx={{ _dark: { color: '$textDark300' } }} numberOfLines={1}>
                                {getHighlight(entry, now, formatStoredWeight)}
                              </Text>
                            </VStack>

                            <VStack alignItems="flex-end" space="xs" minWidth={48}>
                              <Text size="2xl" fontWeight="$bold" color="$textLight0" sx={{ _dark: { color: '$textDark0' } }} lineHeight={26}>
                                {entry.value}
                              </Text>
                              <Text size="2xs" color="$textLight300" sx={{ _dark: { color: '$textDark300' } }} textTransform="uppercase" letterSpacing={0.5}>
                                {selectedMetric.unit}
                              </Text>
                            </VStack>

                            {canExpand && (
                              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={mutedIcon} />
                            )}
                          </HStack>

                          {expanded && canExpand && (
                            <Box
                              mt={14}
                              pt={14}
                              borderTopWidth={1}
                              borderColor="$borderLight0"
                              sx={{ _dark: { borderColor: '$borderDark0' } }}
                            >
                              <ExpandedDetail entry={entry} now={now} formatStoredWeight={formatStoredWeight} />
                            </Box>
                          )}
                        </Box>
                      )}
                    </Pressable>
                  );
                })}
              </VStack>
            )
          ) : activity === undefined ? (
            <Text size="sm" color="$textLight300" sx={{ _dark: { color: '$textDark300' } }} px={4}>
              Loading…
            </Text>
          ) : activity.length === 0 ? (
            <Box
              bg="$cardLight"
              sx={{ _dark: { bg: '$cardDark', borderColor: '$borderDark0' } }}
              borderColor="$borderLight0"
              borderWidth={1}
              borderRadius={16}
              p={32}
            >
              <VStack space="md" alignItems="center">
                <Ionicons name="pulse-outline" size={30} color={mutedIcon} />
                <Text size="sm" color="$textLight300" sx={{ _dark: { color: '$textDark300' } }} textAlign="center">
                  No recent activity yet
                </Text>
              </VStack>
            </Box>
          ) : (
            <VStack space="sm">
              {activity.map((item) => (
                <ActivityCard
                  key={item.sessionId}
                  item={item}
                  now={now}
                  mutedIcon={mutedIcon}
                  formatStoredWeight={formatStoredWeight}
                />
              ))}
            </VStack>
          )}
        </VStack>
      </ScrollView>
    </Box>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
});
