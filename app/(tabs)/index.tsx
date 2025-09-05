import { useUser } from '@clerk/clerk-expo';
import { Box, Button, Text, VStack } from '@gluestack-ui/themed';
import { router } from 'expo-router';
import { Dimensions, ScrollView, StyleSheet } from 'react-native';

const { height, width } = Dimensions.get('window');

export default function HomeScreen() {
  const { isSignedIn, user } = useUser();

  return (
    <Box 
      bg="$backgroundLight0" 
      sx={{ _dark: { bg: '$backgroundDark0' } }} 
      flex={1}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <VStack flex={1} justifyContent="center" alignItems="center" p={32} minHeight={height * 0.85}>
          <VStack space="3xl" alignItems="center" maxWidth={Math.min(360, width - 64)} width="100%">
            
            {/* Hero Section */}
            <VStack space="2xl" alignItems="center">
              <VStack space="xl" alignItems="center">
                <Text 
                  size="5xl" 
                  fontWeight="$bold" 
                  color="$textLight0"
                  sx={{ _dark: { color: '$textDark0' } }}
                  textAlign="center"
                >
                  z-fit
                </Text>
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
                  <Text 
                    size="xs" 
                    color="$textLight300"
                    sx={{ _dark: { color: '$textDark300' } }}
                    textAlign="center"
                    opacity={0.8}
                  >
                    No registration required to start
                  </Text>
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