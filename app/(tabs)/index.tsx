import { useThemeMode } from '@/hooks/useThemeMode';
import { useUser } from '@clerk/clerk-expo';
import { Box, Button, Text, VStack } from '@gluestack-ui/themed';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Dimensions, ScrollView, StyleSheet } from 'react-native';

const { height, width } = Dimensions.get('window');

export default function HomeScreen() {
  const { isSignedIn } = useUser();
  const { effectiveColorScheme } = useThemeMode();
  const logoSource = effectiveColorScheme === 'dark'
    ? require('../../assets/images/transparent_BG_dark.png')
    : require('../../assets/images/transparent_BG_light.png');

  return (
    <Box 
      bg="$backgroundLight0" 
      sx={{ _dark: { bg: '$backgroundDark0' } }} 
      flex={1}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <VStack flex={1} justifyContent="center" alignItems="center" p={32} minHeight={height * 0.85}>
          <VStack space="3xl" alignItems="center" maxWidth={Math.min(360, width - 64)} width="100%">
            
            <VStack space="2xl" alignItems="center">
              <VStack space="xl" alignItems="center">
                <Image 
                  source={logoSource}
                  style={{ width: Math.min(320, width - 64), height: 72 }}
                  contentFit="contain"
                />
              </VStack>


            </VStack>

            <VStack space="xl" width="100%">
              <Button 
                bg="$primary0"
                sx={{ _dark: { bg: '$textDark0' } }}
                borderRadius={16}
                onPress={() => router.push('/(tabs)/explore')}
                h={64}
                justifyContent="center"
                alignItems="center"
                px={32}
              >
                <Text 
                  color="$backgroundLight0"
                  sx={{ _dark: { color: '$backgroundDark0' } }}
                  fontWeight="$semibold"
                  size="lg"
                >
                  Start Training
                </Text>
              </Button>

              {!isSignedIn ? (
                <VStack space="md" width="100%">
                  <Button 
                    variant="outline"
                    borderColor="$borderLight0"
                    sx={{ _dark: { borderColor: '$borderDark0' } }}
                    borderWidth={2}
                    borderRadius={16}
                    onPress={() => router.push('/sign-in')}
                    h={56}
                    justifyContent="center"
                    alignItems="center"
                    bg="transparent"
                    px={32}
                  >
                    <Text 
                      color="$textLight0"
                      sx={{ _dark: { color: '$textDark0' } }}
                      fontWeight="$medium"
                      size="md"
                    >
                      Sign In to Track Progress
                    </Text>
                  </Button>
                </VStack>
              ) : (
                <Button 
                  variant="outline"
                  borderColor="$borderLight0"
                  sx={{ _dark: { borderColor: '$borderDark0' } }}
                  borderWidth={2}
                  borderRadius={16}
                  onPress={() => router.push('/(tabs)/profile')}
                  h={56}
                  justifyContent="center"
                  alignItems="center"
                  bg="transparent"
                  px={32}
                >
                  <Text 
                    color="$textLight0"
                    sx={{ _dark: { color: '$textDark0' } }}
                    fontWeight="$medium"
                    size="md"
                  >
                    View Profile
                  </Text>
                </Button>
              )}
            </VStack>
          </VStack>
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