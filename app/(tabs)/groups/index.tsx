import { useAppToast } from '@/components/AppToast';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Ionicons } from '@expo/vector-icons';
import { Box, HStack, Input, InputField, Pressable, Text, VStack } from '@gluestack-ui/themed';
import { useMutation, useQuery } from 'convex/react';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { useThemeMode } from '@/hooks/useThemeMode';

export default function GroupsScreen() {
  const { effectiveColorScheme } = useThemeMode();
  const isDark = effectiveColorScheme === 'dark';
  const { showToast } = useAppToast();

  const groups = useQuery(api.groups.listMine);
  const pendingInvites = useQuery(api.groups.listMyPendingInvites);
  const createGroup = useMutation(api.groups.create);
  const acceptInvite = useMutation(api.groups.acceptInvite);
  const declineInvite = useMutation(api.groups.declineInvite);

  const [showCreate, setShowCreate] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [respondingInviteId, setRespondingInviteId] = useState<Id<'groupInvitations'> | null>(null);

  const mutedIcon = isDark ? '#6C757D' : '#ADB5BD';

  const openCreate = () => {
    setError(null);
    setGroupName('');
    setShowCreate(true);
  };

  const handleCreate = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await createGroup({ name: groupName.trim() });
      setGroupName('');
      setShowCreate(false);
      showToast('Group created');
      router.push(`/groups/${result.groupId}` as Href);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAccept = async (invitationId: Id<'groupInvitations'>) => {
    setRespondingInviteId(invitationId);
    try {
      const groupId = await acceptInvite({ invitationId });
      showToast('Joined group');
      router.push(`/groups/${groupId}` as Href);
    } catch (acceptError) {
      showToast(acceptError instanceof Error ? acceptError.message : 'Failed to accept invite');
    } finally {
      setRespondingInviteId(null);
    }
  };

  const handleDecline = async (invitationId: Id<'groupInvitations'>) => {
    setRespondingInviteId(invitationId);
    try {
      await declineInvite({ invitationId });
      showToast('Invitation declined');
    } catch (declineError) {
      showToast(declineError instanceof Error ? declineError.message : 'Failed to decline invite');
    } finally {
      setRespondingInviteId(null);
    }
  };

  const hasInvites = pendingInvites && pendingInvites.length > 0;
  const isLoading = groups === undefined;
  const isEmpty = !isLoading && groups.length === 0 && !hasInvites;

  return (
    <Box bg="$backgroundLight0" sx={{ _dark: { bg: '$backgroundDark0' } }} flex={1}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <VStack space="2xl" p={24} pb={140}>
          <HStack alignItems="flex-start" justifyContent="space-between" pt={32}>
            <VStack space="sm" flex={1}>
              <Text size="3xl" fontWeight="$bold" color="$textLight0" sx={{ _dark: { color: '$textDark0' } }}>
                Groups
              </Text>
              <Text size="md" color="$textLight300" sx={{ _dark: { color: '$textDark300' } }}>
                Compete and compare stats with friends
              </Text>
            </VStack>
            <Pressable onPress={openCreate} hitSlop={8}>
              {({ pressed }) => (
                <Box
                  bg="$primary0"
                  sx={{ _dark: { bg: '$textDark0' } }}
                  borderRadius={999}
                  w={44}
                  h={44}
                  justifyContent="center"
                  alignItems="center"
                  opacity={pressed ? 0.85 : 1}
                >
                  <Ionicons name="add" size={26} color={isDark ? '#212529' : '#F8F9FA'} />
                </Box>
              )}
            </Pressable>
          </HStack>

          {showCreate && (
            <Box
              bg="$cardLight"
              sx={{ _dark: { bg: '$cardDark', borderColor: '$borderDark0' } }}
              borderColor="$borderLight0"
              borderWidth={1}
              borderRadius={18}
              style={styles.card}
              p={20}
            >
              <VStack space="md">
                <Text size="lg" fontWeight="$semibold" color="$textLight0" sx={{ _dark: { color: '$textDark0' } }}>
                  New group
                </Text>
                <Input borderRadius={12} borderColor="$borderLight0" sx={{ _dark: { borderColor: '$borderDark0' } }} h={48}>
                  <InputField
                    placeholder="e.g. Gym Crew"
                    placeholderTextColor={mutedIcon}
                    value={groupName}
                    onChangeText={setGroupName}
                    autoFocus
                    color="$textLight0"
                    sx={{ _dark: { color: '$textDark0' } }}
                  />
                </Input>
                {error && (
                  <Text size="sm" color="$error500">
                    {error}
                  </Text>
                )}
                <HStack space="md">
                  <Pressable
                    flex={1}
                    onPress={() => {
                      setShowCreate(false);
                      setGroupName('');
                      setError(null);
                    }}
                  >
                    {({ pressed }) => (
                      <Box
                        borderColor="$borderLight0"
                        sx={{ _dark: { borderColor: '$borderDark0' } }}
                        borderWidth={1}
                        borderRadius={12}
                        h={48}
                        justifyContent="center"
                        alignItems="center"
                        opacity={pressed ? 0.7 : 1}
                      >
                        <Text color="$textLight0" sx={{ _dark: { color: '$textDark0' } }} fontWeight="$medium">
                          Cancel
                        </Text>
                      </Box>
                    )}
                  </Pressable>
                  <Pressable
                    flex={1}
                    disabled={isSubmitting || groupName.trim().length < 2}
                    onPress={handleCreate}
                  >
                    {({ pressed }) => (
                      <Box
                        bg="$primary0"
                        sx={{ _dark: { bg: '$textDark0' } }}
                        borderRadius={12}
                        h={48}
                        justifyContent="center"
                        alignItems="center"
                        opacity={isSubmitting || groupName.trim().length < 2 ? 0.4 : pressed ? 0.85 : 1}
                      >
                        <Text color="$backgroundLight0" sx={{ _dark: { color: '$backgroundDark0' } }} fontWeight="$medium">
                          Create
                        </Text>
                      </Box>
                    )}
                  </Pressable>
                </HStack>
              </VStack>
            </Box>
          )}

          {hasInvites && (
            <VStack space="md">
              <Text size="sm" fontWeight="$semibold" color="$textLight300" sx={{ _dark: { color: '$textDark300' } }} letterSpacing={0.5}>
                INVITATIONS
              </Text>
              {pendingInvites!.map((invite) => (
                <Box
                  key={invite._id}
                  bg="$cardLight"
                  sx={{ _dark: { bg: '$cardDark', borderColor: '$borderDark0' } }}
                  borderColor="$borderLight0"
                  borderWidth={1}
                  borderRadius={18}
                  style={styles.card}
                  p={20}
                >
                  <VStack space="md">
                    <HStack space="md" alignItems="center">
                      <Box
                        bg="$backgroundLight100"
                        sx={{ _dark: { bg: '$backgroundDark100' } }}
                        borderRadius={999}
                        w={40}
                        h={40}
                        justifyContent="center"
                        alignItems="center"
                      >
                        <Ionicons name="mail-outline" size={20} color={isDark ? '#F8F9FA' : '#212529'} />
                      </Box>
                      <VStack space="xs" flex={1}>
                        <Text size="md" fontWeight="$semibold" color="$textLight0" sx={{ _dark: { color: '$textDark0' } }}>
                          {invite.groupName}
                        </Text>
                        <Text size="sm" color="$textLight300" sx={{ _dark: { color: '$textDark300' } }}>
                          {invite.invitedByName} invited you
                        </Text>
                      </VStack>
                    </HStack>
                    <HStack space="md">
                      <Pressable flex={1} disabled={respondingInviteId === invite._id} onPress={() => handleAccept(invite._id)}>
                        {({ pressed }) => (
                          <Box
                            bg="$primary0"
                            sx={{ _dark: { bg: '$textDark0' } }}
                            borderRadius={12}
                            h={44}
                            justifyContent="center"
                            alignItems="center"
                            opacity={respondingInviteId === invite._id ? 0.5 : pressed ? 0.85 : 1}
                          >
                            <Text color="$backgroundLight0" sx={{ _dark: { color: '$backgroundDark0' } }} fontWeight="$medium" size="sm">
                              Accept
                            </Text>
                          </Box>
                        )}
                      </Pressable>
                      <Pressable flex={1} disabled={respondingInviteId === invite._id} onPress={() => handleDecline(invite._id)}>
                        {({ pressed }) => (
                          <Box
                            borderColor="$borderLight0"
                            sx={{ _dark: { borderColor: '$borderDark0' } }}
                            borderWidth={1}
                            borderRadius={12}
                            h={44}
                            justifyContent="center"
                            alignItems="center"
                            opacity={pressed ? 0.7 : 1}
                          >
                            <Text color="$textLight300" sx={{ _dark: { color: '$textDark300' } }} fontWeight="$medium" size="sm">
                              Decline
                            </Text>
                          </Box>
                        )}
                      </Pressable>
                    </HStack>
                  </VStack>
                </Box>
              ))}
            </VStack>
          )}

          {isLoading ? (
            <Box py={48} alignItems="center">
              <ActivityIndicator color={mutedIcon} />
            </Box>
          ) : isEmpty ? (
            <VStack space="lg" alignItems="center" py={48}>
              <Box
                bg="$backgroundLight100"
                sx={{ _dark: { bg: '$backgroundDark100' } }}
                borderRadius={999}
                w={72}
                h={72}
                justifyContent="center"
                alignItems="center"
              >
                <Ionicons name="people-outline" size={34} color={mutedIcon} />
              </Box>
              <VStack space="xs" alignItems="center">
                <Text size="lg" fontWeight="$semibold" color="$textLight0" sx={{ _dark: { color: '$textDark0' } }}>
                  No groups yet
                </Text>
                <Text size="sm" color="$textLight300" sx={{ _dark: { color: '$textDark300' } }} textAlign="center">
                  Create a group and invite friends by name
                </Text>
              </VStack>
              <Pressable onPress={openCreate}>
                {({ pressed }) => (
                  <Box
                    bg="$primary0"
                    sx={{ _dark: { bg: '$textDark0' } }}
                    borderRadius={12}
                    h={48}
                    px={28}
                    justifyContent="center"
                    alignItems="center"
                    opacity={pressed ? 0.85 : 1}
                  >
                    <Text color="$backgroundLight0" sx={{ _dark: { color: '$backgroundDark0' } }} fontWeight="$medium">
                      Create a group
                    </Text>
                  </Box>
                )}
              </Pressable>
            </VStack>
          ) : groups.length > 0 ? (
            <VStack space="md">
              <Text size="sm" fontWeight="$semibold" color="$textLight300" sx={{ _dark: { color: '$textDark300' } }} letterSpacing={0.5}>
                YOUR GROUPS
              </Text>
              {groups.map((group) => (
                <Pressable key={group._id} onPress={() => router.push(`/groups/${group._id}` as Href)}>
                  {({ pressed }) => (
                    <Box
                      bg="$cardLight"
                      sx={{ _dark: { bg: '$cardDark', borderColor: '$borderDark0' } }}
                      borderColor="$borderLight0"
                      borderWidth={1}
                      borderRadius={18}
                      style={styles.card}
                      px={20}
                      py={18}
                      opacity={pressed ? 0.85 : 1}
                      transform={[{ scale: pressed ? 0.98 : 1 }]}
                    >
                      <HStack alignItems="center" space="md">
                        <Box
                          bg="$backgroundLight100"
                          sx={{ _dark: { bg: '$backgroundDark100' } }}
                          borderRadius={12}
                          w={44}
                          h={44}
                          justifyContent="center"
                          alignItems="center"
                        >
                          <Ionicons name="people" size={22} color={isDark ? '#F8F9FA' : '#212529'} />
                        </Box>
                        <VStack space="xs" flex={1}>
                          <Text size="lg" fontWeight="$semibold" color="$textLight0" sx={{ _dark: { color: '$textDark0' } }}>
                            {group.name}
                          </Text>
                          <Text size="xs" color="$textLight300" sx={{ _dark: { color: '$textDark300' } }}>
                            {group.memberCount} member{group.memberCount === 1 ? '' : 's'}
                          </Text>
                        </VStack>
                        <Ionicons name="chevron-forward" size={20} color={mutedIcon} />
                      </HStack>
                    </Box>
                  )}
                </Pressable>
              ))}
            </VStack>
          ) : null}
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
});
