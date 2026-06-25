import { useAppToast } from '@/components/AppToast';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { useThemeMode } from '@/hooks/useThemeMode';
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

const metricOptions: {
  value: LeaderboardMetric;
  label: string;
  caption: string;
  unit: string;
  expandable: boolean;
}[] = [
  { value: 'prsThisMonth', label: 'PRs', caption: 'Personal records this month', unit: 'PRs', expandable: true },
  { value: 'workoutsThisWeek', label: 'Workouts', caption: 'Sessions in the last 7 days', unit: 'sessions', expandable: true },
  { value: 'currentStreak', label: 'Streak', caption: 'Consecutive training days', unit: 'days', expandable: false },
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

function getHighlight(entry: LeaderboardEntry, now: number): string {
  if (entry.detail.type === 'prsThisMonth') {
    if (entry.detail.prs.length === 0) return 'No new PRs';
    const top = entry.detail.prs[0];
    return `${top.exerciseName} · ${top.weight} lb`;
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
  if (entry.detail.type === 'prsThisMonth') return entry.detail.prs.length > 0;
  if (entry.detail.type === 'workoutsThisWeek') return entry.detail.workouts.length > 0;
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

function ExpandedDetail({ entry, now }: { entry: LeaderboardEntry; now: number }) {
  if (entry.detail.type === 'prsThisMonth') {
    return (
      <VStack space="md">
        {entry.detail.prs.map((pr, index) => (
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
                {pr.weight} lb
              </Text>
              <Text size="xs" color="$textLight300" sx={{ _dark: { color: '$textDark300' } }} w={60} textAlign="right">
                {formatRelativeDay(pr.completedAt, now)}
              </Text>
            </HStack>
          </HStack>
        ))}
      </VStack>
    );
  }

  if (entry.detail.type === 'workoutsThisWeek') {
    return (
      <VStack space="md">
        {entry.detail.workouts.map((workout) => (
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
      </VStack>
    );
  }

  return null;
}

function ActivityCard({ item, now, mutedIcon }: { item: ActivityItem; now: number; mutedIcon: string }) {
  const [expanded, setExpanded] = useState(false);
  const initial = (item.displayName.trim()[0] ?? 'A').toUpperCase();
  const canExpand = item.exercises.length > 0;
  const name = item.isCurrentUser ? 'You' : item.displayName;

  return (
    <Pressable onPress={() => canExpand && setExpanded((prev) => !prev)}>
      {({ pressed }) => (
        <Box
          bg="$cardLight"
          sx={{ _dark: { bg: '$cardDark', borderColor: '$borderDark0' } }}
          borderColor="$borderLight0"
          borderWidth={1}
          borderRadius={18}
          style={styles.card}
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
              <Text size="xs" color="$textLight300" sx={{ _dark: { color: '$textDark300' } }} numberOfLines={1}>
                {formatActivityTime(item.completedAt, now)} · {item.setCount} set{item.setCount === 1 ? '' : 's'}
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
                {item.exercises.map((exercise, index) => (
                  <HStack key={`${exercise.exerciseName}-${index}`} alignItems="center" justifyContent="space-between" space="md">
                    <Text
                      size="sm"
                      fontWeight={exercise.isPrimary ? '$semibold' : '$normal'}
                      color={exercise.isPrimary ? '$textLight0' : '$textLight200'}
                      sx={{ _dark: { color: exercise.isPrimary ? '$textDark0' : '$textDark200' } }}
                      flex={1}
                      numberOfLines={1}
                    >
                      {exercise.exerciseName}
                    </Text>
                    <Text size="sm" fontWeight="$bold" color="$textLight0" sx={{ _dark: { color: '$textDark0' } }}>
                      {exercise.weighted ? `${exercise.weight} lb × ${exercise.reps}` : `${exercise.reps} reps`}
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
  const convexUser = useQuery(api.users.me, isSignedIn && user ? { clerkUserId: user.id } : 'skip');

  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const isValidGroupId = Boolean(groupId && groupId !== 'index');
  const parsedGroupId = isValidGroupId ? (groupId as Id<'groups'>) : undefined;

  const [view, setView] = useState<GroupView>('leaderboard');
  const [metric, setMetric] = useState<LeaderboardMetric>('prsThisMonth');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [invitingUserId, setInvitingUserId] = useState<Id<'users'> | null>(null);
  const now = useMemo(() => Date.now(), []);
  const timezoneOffsetMinutes = useMemo(() => new Date().getTimezoneOffset(), []);

  const mutedIcon = isDark ? '#6C757D' : '#ADB5BD';
  const headerIcon = isDark ? '#F8F9FA' : '#212529';

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
  const memberCount = leaderboard?.length ?? 0;

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

  const openMenu = () => {
    Alert.alert(group?.name ?? 'Group', undefined, [
      { text: 'Leave group', style: 'destructive', onPress: handleLeave },
      { text: 'Cancel', style: 'cancel' },
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
      <Stack.Screen
        options={{
          title: group?.name ?? 'Group',
          headerRight: () => (
            <HStack space="lg" alignItems="center" pr={4}>
              <Pressable
                hitSlop={8}
                onPress={() => {
                  setShowInvite((prev) => !prev);
                  setSearchQuery('');
                }}
              >
                <Ionicons name="person-add-outline" size={22} color={headerIcon} />
              </Pressable>
              <Pressable hitSlop={8} onPress={openMenu}>
                <Ionicons name="ellipsis-horizontal" size={22} color={headerIcon} />
              </Pressable>
            </HStack>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <VStack space="lg" p={20} pb={140}>
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

          {view === 'leaderboard' && (
            <>
            <Box
              bg="$backgroundLight100"
              sx={{ _dark: { bg: '$backgroundDark100' } }}
              borderRadius={14}
              p={4}
            >
              <HStack space="xs">
                {metricOptions.map((option) => {
                const active = metric === option.value;
                return (
                  <Pressable key={option.value} flex={1} onPress={() => handleSelectMetric(option.value)}>
                    <Box
                      bg={active ? '$cardLight' : 'transparent'}
                      sx={{ _dark: { bg: active ? '$cardDark' : 'transparent' } }}
                      style={active ? styles.segmentShadow : undefined}
                      borderRadius={10}
                      h={38}
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

              <HStack alignItems="center" justifyContent="space-between" px={4}>
                <Text size="sm" color="$textLight300" sx={{ _dark: { color: '$textDark300' } }}>
                  {selectedMetric.caption}
                </Text>
                {memberCount > 0 && (
                  <Text size="sm" color="$textLight300" sx={{ _dark: { color: '$textDark300' } }}>
                    {memberCount} member{memberCount === 1 ? '' : 's'}
                  </Text>
                )}
              </HStack>
            </>
          )}

          {view === 'activity' && (
            <HStack alignItems="center" justifyContent="space-between" px={4}>
              <Text size="sm" color="$textLight300" sx={{ _dark: { color: '$textDark300' } }}>
                Latest workouts from your group
              </Text>
            </HStack>
          )}

          {showInvite && (
            <Box
              bg="$cardLight"
              sx={{ _dark: { bg: '$cardDark', borderColor: '$borderDark0' } }}
              borderColor="$borderLight0"
              borderWidth={1}
              borderRadius={18}
              style={styles.card}
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
                  <HStack key={result.userId} justifyContent="space-between" alignItems="center" py={2}>
                    <Text size="md" fontWeight="$medium" color="$textLight0" sx={{ _dark: { color: '$textDark0' } }} flex={1} numberOfLines={1}>
                      {result.displayName}
                    </Text>
                    <Pressable disabled={invitingUserId === result.userId} onPress={() => handleInvite(result.userId, result.displayName)}>
                      {({ pressed }) => (
                        <Box
                          bg="$primary0"
                          sx={{ _dark: { bg: '$textDark0' } }}
                          borderRadius={10}
                          h={34}
                          px={16}
                          justifyContent="center"
                          alignItems="center"
                          opacity={invitingUserId === result.userId ? 0.5 : pressed ? 0.85 : 1}
                        >
                          <Text color="$backgroundLight0" sx={{ _dark: { color: '$backgroundDark0' } }} fontWeight="$semibold" size="sm">
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
              borderRadius={20}
              style={styles.card}
              p={32}
            >
              <VStack space="md" alignItems="center">
                <Ionicons name="trophy-outline" size={30} color={mutedIcon} />
                <Text size="sm" color="$textLight300" sx={{ _dark: { color: '$textDark300' } }} textAlign="center">
                  Invite friends to start competing
                </Text>
                <Pressable onPress={() => setShowInvite(true)}>
                  {({ pressed }) => (
                    <Box
                      bg="$primary0"
                      sx={{ _dark: { bg: '$textDark0' } }}
                      borderRadius={12}
                      h={44}
                      px={24}
                      justifyContent="center"
                      alignItems="center"
                      opacity={pressed ? 0.85 : 1}
                    >
                      <Text color="$backgroundLight0" sx={{ _dark: { color: '$backgroundDark0' } }} fontWeight="$semibold" size="sm">
                        Invite friends
                      </Text>
                    </Box>
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
                        borderRadius={18}
                        style={styles.card}
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
                              {getHighlight(entry, now)}
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
                            <ExpandedDetail entry={entry} now={now} />
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
              borderRadius={20}
              style={styles.card}
              p={32}
            >
              <VStack space="md" alignItems="center">
                <Ionicons name="pulse-outline" size={30} color={mutedIcon} />
                <Text size="sm" color="$textLight300" sx={{ _dark: { color: '$textDark300' } }} textAlign="center">
                  No recent activity yet
                </Text>
                <Text size="xs" color="$textLight300" sx={{ _dark: { color: '$textDark300' } }} textAlign="center">
                  Completed workouts from the group will show up here
                </Text>
              </VStack>
            </Box>
          ) : (
            <VStack space="sm">
              {activity.map((item) => (
                <ActivityCard key={item.sessionId} item={item} now={now} mutedIcon={mutedIcon} />
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
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  segmentShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
});
