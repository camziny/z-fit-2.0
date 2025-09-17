import { api } from '@/convex/_generated/api';
import { Box, HStack, Text } from '@gluestack-ui/themed';
import { useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { Pressable } from 'react-native';

type Props = {
  visible: boolean;
  name?: string;
  exerciseId?: string;
  gifUrl?: string;
  onClose: () => void;
};

const FALLBACK_GIF = 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbDNxNnRrZ2lwdDNsOGZ3aTByczVjYjZ1aXc5NmszMmQya21nZ3p5cCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3oEjI6SIIHBdRxXI40/giphy.gif';

function ModalContent({ name, exerciseId, gifUrl, onClose }: Omit<Props, 'visible'>) {
  const exercise = useQuery(api.exercises.getMultiple, exerciseId ? { exerciseIds: [exerciseId as any] } : 'skip');
  const resolvedGif = gifUrl || (exercise && exercise[0]?.gifUrl) || FALLBACK_GIF;

  return (
    <Box position="absolute" top={0} left={0} right={0} bottom={0} bg="rgba(0,0,0,0.95)" justifyContent="center" alignItems="center">
      <Pressable onPress={onClose} position="absolute" top={0} left={0} right={0} bottom={0} />
      <Box w="95%" maxWidth={450} aspectRatio={1} position="relative">
        <Image
          source={{ uri: resolvedGif }}
          style={{ width: '100%', height: '100%', borderRadius: 20 }}
          contentFit="contain"
        />
        <Box position="absolute" top={16} left={16} right={16}>
          <HStack justifyContent="space-between" alignItems="center">
            <Box bg="rgba(0,0,0,0.7)" borderRadius={12} px={12} py={6}>
              <Text size="md" fontWeight="$semibold" color="white">
                {name || 'Exercise'}
              </Text>
            </Box>
            <Pressable onPress={onClose}>
              <Box bg="rgba(0,0,0,0.7)" borderRadius={20} w={36} h={36} justifyContent="center" alignItems="center">
                <Text color="white" size="lg" fontWeight="$bold">×</Text>
              </Box>
            </Pressable>
          </HStack>
        </Box>
      </Box>
    </Box>
  );
}

export default function ExerciseHelpModal({ visible, name, exerciseId, gifUrl, onClose }: Props) {
  if (!visible) return null;
  return <ModalContent name={name} exerciseId={exerciseId} gifUrl={gifUrl} onClose={onClose} />;
}


