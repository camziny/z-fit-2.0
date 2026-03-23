import { api } from '@/convex/_generated/api';
import { Box, HStack, Text } from '@gluestack-ui/themed';
import { useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable } from 'react-native';

type Props = {
  visible: boolean;
  name?: string;
  exerciseId?: string;
  gifUrl?: string;
  onClose: () => void;
};

const FALLBACK_GIF = 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif';

function ModalContent({ name, exerciseId, gifUrl, onClose }: Omit<Props, 'visible'>) {
  const exercise = useQuery(
    api.exercises.getMultiple,
    !gifUrl && exerciseId ? { exerciseIds: [exerciseId as any] } : 'skip'
  );
  const dbGifUrl = !gifUrl ? (exercise?.[0]?.mediaGifUrl || exercise?.[0]?.gifUrl) : undefined;
  const sources = useMemo(() => {
    const ordered = [gifUrl, dbGifUrl, FALLBACK_GIF].filter(Boolean) as string[];
    return Array.from(new Set(ordered));
  }, [gifUrl, dbGifUrl]);
  const sourceKey = useMemo(() => sources.join('|'), [sources]);
  const [sourceIndex, setSourceIndex] = useState(0);
  const resolvedGif = sources[sourceIndex];
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSourceIndex(0);
  }, [sourceKey]);

  useEffect(() => {
    if (!resolvedGif) {
      setLoaded(true);
      setFailed(true);
      return;
    }
    setLoaded(false);
    setFailed(false);
  }, [resolvedGif]);

  return (
    <Box position="absolute" top={0} left={0} right={0} bottom={0} bg="rgba(0,0,0,0.95)" justifyContent="center" alignItems="center">
      <Pressable onPress={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <Box w="95%" maxWidth={450} aspectRatio={1} position="relative">
        <Image
          source={{ uri: resolvedGif }}
          style={{ width: '100%', height: '100%', borderRadius: 20 }}
          contentFit="contain"
          cachePolicy="disk"
          priority="high"
          transition={0}
          recyclingKey={resolvedGif}
          onLoadStart={() => {
            setLoaded(false);
            setFailed(false);
          }}
          onLoad={() => setLoaded(true)}
          onLoadEnd={() => setLoaded(true)}
          onError={() => {
            if (sourceIndex < sources.length - 1) {
              setSourceIndex((prev) => prev + 1);
              setLoaded(false);
              return;
            }
            setFailed(true);
            setLoaded(true);
          }}
        />
        {!loaded && !failed && (
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            borderRadius={20}
            bg="rgba(33,37,41,0.88)"
            justifyContent="center"
            alignItems="center"
          >
            <ActivityIndicator size="small" color="#DEE2E6" />
            <Text size="xs" color="$textDark300" mt={8}>
              Loading media...
            </Text>
          </Box>
        )}
        {failed && (
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            borderRadius={20}
            bg="$backgroundDark100"
            justifyContent="center"
            alignItems="center"
            px={20}
          >
            <Text size="sm" color="$textDark200" textAlign="center">
              Could not load this exercise media.
            </Text>
            <Pressable
              onPress={() => {
                setSourceIndex(0);
                setLoaded(false);
                setFailed(false);
              }}
            >
              <Box mt={12} px={12} py={6} borderRadius={10} bg="$backgroundDark200">
                <Text size="xs" color="$textDark50">Try again</Text>
              </Box>
            </Pressable>
          </Box>
        )}
        <Box position="absolute" top={16} left={16} right={16}>
          <HStack justifyContent="space-between" alignItems="center">
            <Box bg="rgba(0,0,0,0.7)" borderRadius={12} px={12} py={6}>
              <Text size="md" fontWeight="$semibold" color="white">
                {name || 'Exercise'}
              </Text>
            </Box>
            <Pressable onPress={onClose}>
              <Box bg="rgba(0,0,0,0.7)" borderRadius={20} w={36} h={36} justifyContent="center" alignItems="center">
                <Text color="white" size="lg" fontWeight="$bold">x</Text>
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
