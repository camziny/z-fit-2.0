import { api } from '@/convex/_generated/api';
import { useThemeMode } from '@/hooks/useThemeMode';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { Avatar, AvatarFallbackText, AvatarImage, Box, Button, HStack, Text, VStack } from '@gluestack-ui/themed';
import { useQuery } from 'convex/react';
import { router } from 'expo-router';
import { Dimensions, ScrollView, StyleSheet } from 'react-native';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const { isSignedIn, user } = useUser();
  const { signOut } = useAuth();
  const { effectiveColorScheme } = useThemeMode();
  const convexUser = useQuery(
    api.users.me,
    isSignedIn && user ? { clerkUserId: user.id } : 'skip'
  );
  const userHistory = useQuery(
    api.sessions.historyForUser,
    convexUser ? { userId: convexUser._id } : 'skip'
  );

  const isDark = effectiveColorScheme === 'dark';

  const completedWorkouts = userHistory?.filter((s: any) => s.status === 'completed') || [];
  
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date;
  });

  const workoutsPerDay = last7Days.map(date => {
    const dateStr = date.toDateString();
    return completedWorkouts.filter((session: any) => 
      new Date(session.completedAt).toDateString() === dateStr
    ).length;
  });

  const totalSets = completedWorkouts.reduce((total: number, session: any) => 
    total + session.exercises.reduce((acc: number, ex: any) => 
      acc + ex.sets.filter((set: any) => set.done).length, 0
    ), 0
  );

  const avgSetsPerWorkout = completedWorkouts.length > 0 
    ? Math.round(totalSets / completedWorkouts.length) 
    : 0;

  const thisWeekWorkouts = completedWorkouts.filter((session: any) => {
    const sessionDate = new Date(session.completedAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return sessionDate >= weekAgo;
  }).length;

  return (
    <Box 
      bg="$backgroundLight0" 
      sx={{ _dark: { bg: '$backgroundDark0' } }} 
      flex={1}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <VStack space="2xl" p={24} pb={120}>
          <VStack space="sm" pt={32}>
            <Text 
              size="3xl" 
              fontWeight="$bold" 
              color="$textLight0"
              sx={{ _dark: { color: '$textDark0' } }}
            >
              Profile
            </Text>
            {isSignedIn ? (
              <Text 
                size="md" 
                color="$textLight300"
                sx={{ _dark: { color: '$textDark300' } }}
              >
                Track your fitness journey
              </Text>
            ) : (
              <Text 
                size="md" 
                color="$textLight300"
                sx={{ _dark: { color: '$textDark300' } }}
              >
                Sign in to track your fitness journey
              </Text>
            )}
          </VStack>

          {isSignedIn ? (
            <VStack space="xl">
              {/* User Info Card */}
              <Box
                bg="$cardLight"
                sx={{ _dark: { bg: '$cardDark', borderColor: '$borderDark0' } }}
                borderColor="$borderLight0"
                borderWidth={1}
                borderRadius={16}
                p={24}
              >
                <HStack space="lg" alignItems="center">
                  <Avatar size="lg">
                    <AvatarFallbackText 
                      color="$backgroundLight0"
                      sx={{ _dark: { color: '$backgroundDark0' } }}
                    >
                      {user?.firstName?.[0] || user?.username?.[0] || 'A'}
                    </AvatarFallbackText>
                    {user?.imageUrl && (
                      <AvatarImage source={{ uri: user.imageUrl }} alt="Profile" />
                    )}
                  </Avatar>
                  <VStack flex={1} space="xs">
                    <Text 
                      size="xl" 
                      fontWeight="$bold" 
                      color="$textLight0"
                      sx={{ _dark: { color: '$textDark0' } }}
                    >
                      {user?.firstName || user?.username || 'Athlete'}
                    </Text>
                    <Text 
                      size="sm" 
                      color="$textLight200"
                      sx={{ _dark: { color: '$textDark200' } }}
                    >
                      {user?.emailAddresses[0]?.emailAddress}
                    </Text>
                    <Text 
                      size="xs" 
                      color="$textLight300"
                      sx={{ _dark: { color: '$textDark300' } }}
                    >
                      Member since {convexUser ? new Date(convexUser.createdAt).toLocaleDateString() : '—'}
                    </Text>
                  </VStack>
                </HStack>
              </Box>

              {/* Quick Stats */}
              <Box
                bg="$cardLight"
                sx={{ _dark: { bg: '$cardDark', borderColor: '$borderDark0' } }}
                borderColor="$borderLight0"
                borderWidth={1}
                borderRadius={16}
                p={24}
              >
                <VStack space="lg">
                  <Text 
                    size="lg" 
                    fontWeight="$semibold" 
                    color="$textLight0"
                    sx={{ _dark: { color: '$textDark0' } }}
                  >
                    Workout Overview
                  </Text>
                  <HStack space="xl" justifyContent="space-around">
                    <VStack alignItems="center" space="xs">
                      <Text 
                        size="3xl" 
                        fontWeight="$bold" 
                        color="$primary0"
                        sx={{ _dark: { color: '$textDark0' } }}
                      >
                        {thisWeekWorkouts}
                      </Text>
                      <Text 
                        size="xs" 
                        color="$textLight200"
                        sx={{ _dark: { color: '$textDark200' } }}
                        fontWeight="$medium"
                        textAlign="center"
                      >
                        This{'\n'}Week
                      </Text>
                    </VStack>
                    <VStack alignItems="center" space="xs">
                      <Text 
                        size="3xl" 
                        fontWeight="$bold" 
                        color="$primary0"
                        sx={{ _dark: { color: '$textDark0' } }}
                      >
                        {completedWorkouts.length}
                      </Text>
                      <Text 
                        size="xs" 
                        color="$textLight200"
                        sx={{ _dark: { color: '$textDark200' } }}
                        fontWeight="$medium"
                        textAlign="center"
                      >
                        Total{'\n'}Workouts
                      </Text>
                    </VStack>
                    <VStack alignItems="center" space="xs">
                      <Text 
                        size="3xl" 
                        fontWeight="$bold" 
                        color="$primary0"
                        sx={{ _dark: { color: '$textDark0' } }}
                      >
                        {avgSetsPerWorkout}
                      </Text>
                      <Text 
                        size="xs" 
                        color="$textLight200"
                        sx={{ _dark: { color: '$textDark200' } }}
                        fontWeight="$medium"
                        textAlign="center"
                      >
                        Avg Sets{'\n'}Per Workout
                      </Text>
                    </VStack>
                  </HStack>
                </VStack>
              </Box>

              {/* Weekly Activity Grid */}
              <Box
                bg="$cardLight"
                sx={{ _dark: { bg: '$cardDark', borderColor: '$borderDark0' } }}
                borderColor="$borderLight0"
                borderWidth={1}
                borderRadius={16}
                p={24}
              >
                <VStack space="lg">
                  <Text 
                    size="lg" 
                    fontWeight="$semibold" 
                    color="$textLight0"
                    sx={{ _dark: { color: '$textDark0' } }}
                  >
                    This Week's Activity
                  </Text>
                  <HStack space="sm" justifyContent="space-between" w="100%">
                    {last7Days.map((date, index) => {
                      const hasWorkout = workoutsPerDay[index] > 0;
                      const isToday = date.toDateString() === new Date().toDateString();
                      
                      return (
                        <VStack key={index} alignItems="center" space="xs" flex={1}>
                          <Text 
                            size="xs" 
                            color="$textLight300"
                            sx={{ _dark: { color: '$textDark300' } }}
                            fontWeight="$medium"
                            textAlign="center"
                          >
                            {date.toLocaleDateString('en-US', { weekday: 'short' })}
                          </Text>
                          <Box
                            bg={hasWorkout ? '$primary0' : '$backgroundLight100'}
                            sx={hasWorkout 
                              ? { _dark: { bg: '$textDark0' } } 
                              : { _dark: { bg: '$backgroundDark100' } }
                            }
                            borderColor={isToday ? '$primary0' : 'transparent'}
                            sx={isToday 
                              ? { _dark: { borderColor: '$textDark0' } } 
                              : { _dark: { borderColor: 'transparent' } }
                            }
                            borderWidth={isToday ? 2 : 0}
                            borderRadius={8}
                            w={32}
                            h={32}
                            justifyContent="center"
                            alignItems="center"
                          >
                            {hasWorkout ? (
                              <Text 
                                color="$backgroundLight0"
                                sx={{ _dark: { color: '$backgroundDark0' } }}
                                fontWeight="$bold"
                                size="sm"
                              >
                                ✓
                              </Text>
                            ) : (
                              <Text 
                                color="$textLight300"
                                sx={{ _dark: { color: '$textDark300' } }}
                                fontWeight="$medium"
                                size="xs"
                              >
                                {date.getDate()}
                              </Text>
                            )}
                          </Box>
                        </VStack>
                      );
                    })}
                  </HStack>
                  {thisWeekWorkouts > 0 && (
                    <Text 
                      size="sm" 
                      color="$textLight200"
                      sx={{ _dark: { color: '$textDark200' } }}
                      textAlign="center"
                    >
                      {thisWeekWorkouts} workout{thisWeekWorkouts !== 1 ? 's' : ''} completed this week
                    </Text>
                  )}
                </VStack>
              </Box>

              {/* Recent Activity */}
              <Box
                bg="$cardLight"
                sx={{ _dark: { bg: '$cardDark', borderColor: '$borderDark0' } }}
                borderColor="$borderLight0"
                borderWidth={1}
                borderRadius={16}
                p={24}
              >
                <VStack space="lg">
                  <Text 
                    size="lg" 
                    fontWeight="$semibold" 
                    color="$textLight0"
                    sx={{ _dark: { color: '$textDark0' } }}
                  >
                    Recent Activity
                  </Text>
                  {completedWorkouts.slice(-3).length > 0 ? (
                    <VStack space="md">
                      {completedWorkouts.slice(-3).reverse().map((session: any, index: number) => {
                        const completedSets = session.exercises.reduce((acc: number, ex: any) => 
                          acc + ex.sets.filter((set: any) => set.done).length, 0
                        );
                        const duration = session.completedAt && session.startedAt 
                          ? Math.round((new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()) / (1000 * 60))
                          : null;
                        
                        return (
                          <Box
                            key={session._id}
                            bg="$backgroundLight0"
                            sx={{ _dark: { bg: '$backgroundDark0' } }}
                            borderRadius={12}
                            p={16}
                          >
                            <VStack space="sm">
                              <HStack justifyContent="space-between" alignItems="center">
                                <VStack space="xs">
                                  <Text 
                                    size="sm" 
                                    fontWeight="$medium" 
                                    color="$textLight0"
                                    sx={{ _dark: { color: '$textDark0' } }}
                                  >
                                    {session.exercises.length} exercises • {completedSets} sets
                                  </Text>
                                  <Text 
                                    size="xs" 
                                    color="$textLight300"
                                    sx={{ _dark: { color: '$textDark300' } }}
                                  >
                                    {new Date(session.completedAt).toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric',
                                      weekday: 'short'
                                    })}
                                    {duration && ` • ${duration}min`}
                                  </Text>
                                </VStack>
                                <Text 
                                  size="lg" 
                                  fontWeight="$bold"
                                  color="$primary0"
                                  sx={{ _dark: { color: '$textDark0' } }}
                                >
                                  ✓
                                </Text>
                              </HStack>
                              {session.exercises.length > 0 && (
                                <Text 
                                  size="xs" 
                                  color="$textLight200"
                                  sx={{ _dark: { color: '$textDark200' } }}
                                  numberOfLines={1}
                                >
                                  {session.exercises.slice(0, 3).map((ex: any) => ex.exerciseName || 'Exercise').join(', ')}
                                  {session.exercises.length > 3 ? ` +${session.exercises.length - 3} more` : ''}
                                </Text>
                              )}
                            </VStack>
                          </Box>
                        );
                      })}
                    </VStack>
                  ) : (
                    <Text 
                      size="sm" 
                      color="$textLight200"
                      sx={{ _dark: { color: '$textDark200' } }}
                      textAlign="center"
                    >
                      No completed workouts yet
                    </Text>
                  )}
                </VStack>
              </Box>

              {/* Account Actions */}
              <Box
                bg="$cardLight"
                sx={{ _dark: { bg: '$cardDark', borderColor: '$borderDark0' } }}
                borderColor="$borderLight0"
                borderWidth={1}
                borderRadius={16}
                p={24}
              >
                <VStack space="lg">
                  <Text 
                    size="lg" 
                    fontWeight="$semibold" 
                    color="$textLight0"
                    sx={{ _dark: { color: '$textDark0' } }}
                  >
                    Account
                  </Text>
                  <Button 
                    variant="outline" 
                    borderColor="$primary0"
                    sx={{ _dark: { borderColor: '$textDark0' } }}
                    borderWidth={2}
                    onPress={() => signOut()}
                    borderRadius={12}
                    h={48}
                    justifyContent="center"
                    alignItems="center"
                    bg="transparent"
                    px={24}
                  >
                    <Text 
                      color="$primary0"
                      sx={{ _dark: { color: '$textDark0' } }}
                      fontWeight="$medium"
                      size="md"
                    >
                      Sign Out
                    </Text>
                  </Button>
                </VStack>
              </Box>
            </VStack>
          ) : (
            <Box
              bg="$cardLight"
              sx={{ _dark: { bg: '$cardDark', borderColor: '$borderDark0' } }}
              borderColor="$borderLight0"
              borderWidth={1}
              borderRadius={16}
              p={24}
            >
              <VStack space="xl" alignItems="center">
                <Avatar size="xl">
                  <AvatarFallbackText 
                    color="$backgroundLight0"
                    sx={{ _dark: { color: '$backgroundDark0' } }}
                  >
                    ?
                  </AvatarFallbackText>
                </Avatar>
                <VStack space="md" alignItems="center">
                  <Text 
                    size="lg" 
                    fontWeight="$semibold" 
                    color="$textLight0"
                    sx={{ _dark: { color: '$textDark0' } }}
                    textAlign="center"
                  >
                    Sign In to Track Progress
                  </Text>
                  <Text 
                    size="sm" 
                    color="$textLight200"
                    sx={{ _dark: { color: '$textDark200' } }}
                    textAlign="center"
                  >
                    Create an account to save your workout history, view detailed stats, and track your fitness journey.
                  </Text>
                </VStack>
                <Button 
                  bg="$primary0"
                  sx={{ _dark: { bg: '$textDark0' } }}
                  onPress={() => router.push('/sign-in')}
                  borderRadius={12}
                  h={52}
                  justifyContent="center"
                  alignItems="center"
                  px={32}
                  width="100%"
                >
                  <Text 
                    color="$backgroundLight0"
                    sx={{ _dark: { color: '$backgroundDark0' } }}
                    fontWeight="$medium"
                    size="md"
                  >
                    Sign In
                  </Text>
                </Button>
              </VStack>
            </Box>
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