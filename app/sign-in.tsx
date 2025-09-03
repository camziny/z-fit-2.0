import { useOAuth, useSignIn } from '@clerk/clerk-expo';
import { Box, Button, HStack, Input, InputField, Text, VStack } from '@gluestack-ui/themed';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, StyleSheet } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSignInPress = async () => {
    if (!isLoaded || !emailAddress || !password) return;
    
    setLoading(true);
    try {
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      });

      if (signInAttempt.status === 'complete') {
        await setActive({ session: signInAttempt.createdSessionId });
        router.replace('/(tabs)/');
      } else {
        Alert.alert('Error', 'Sign in incomplete. Please try again.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.errors?.[0]?.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const onGoogleSignIn = async () => {
    try {
      const { createdSessionId, setActive } = await startOAuthFlow();
      if (createdSessionId) {
        await setActive!({ session: createdSessionId });
        router.replace('/(tabs)/');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.errors?.[0]?.message || 'Failed to sign in with Google');
    }
  };

  return (
    <Box 
      bg="$backgroundLight0" 
      sx={{ _dark: { bg: '$backgroundDark0' } }} 
      flex={1}
    >
      <VStack space="xl" p={24} pt={32}>
        <VStack space="sm">
          <Text 
            size="2xl" 
            fontWeight="$bold" 
            color="$textLight0"
            sx={{ _dark: { color: '$textDark0' } }}
          >
            Welcome back
          </Text>
          <Text 
            size="md" 
            color="$textLight300"
            sx={{ _dark: { color: '$textDark300' } }}
          >
            Sign in to your account
          </Text>
        </VStack>

        <VStack space="lg">
          <VStack space="md">
            <Text 
              size="sm" 
              fontWeight="$medium" 
              color="$textLight0"
              sx={{ _dark: { color: '$textDark0' } }}
            >
              Email
            </Text>
            <Input
              borderColor="$borderLight0"
              sx={{ _dark: { borderColor: '$borderDark0', bg: '$cardDark' } }}
              bg="$cardLight"
              borderRadius={12}
              h={48}
            >
              <InputField
                placeholder="Enter your email"
                value={emailAddress}
                onChangeText={setEmailAddress}
                keyboardType="email-address"
                autoCapitalize="none"
                color="$textLight0"
                sx={{ _dark: { color: '$textDark0' } }}
              />
            </Input>
          </VStack>

          <VStack space="md">
            <Text 
              size="sm" 
              fontWeight="$medium" 
              color="$textLight0"
              sx={{ _dark: { color: '$textDark0' } }}
            >
              Password
            </Text>
            <Input
              borderColor="$borderLight0"
              sx={{ _dark: { borderColor: '$borderDark0', bg: '$cardDark' } }}
              bg="$cardLight"
              borderRadius={12}
              h={48}
            >
              <InputField
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                color="$textLight0"
                sx={{ _dark: { color: '$textDark0' } }}
              />
            </Input>
          </VStack>

          <VStack space="md">
            <Button 
              bg="$primary0"
              sx={{ _dark: { bg: '$textDark0' } }}
              onPress={onSignInPress}
              isDisabled={loading || !emailAddress || !password}
              borderRadius={12}
              h={52}
              justifyContent="center"
              alignItems="center"
              px={24}
            >
              <Text 
                color="$backgroundLight0"
                sx={{ _dark: { color: '$backgroundDark0' } }}
                fontWeight="$medium"
                size="md"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Text>
            </Button>

            <VStack space="md" alignItems="center">
              <Text 
                size="xs" 
                color="$textLight300"
                sx={{ _dark: { color: '$textDark300' } }}
              >
                or continue with
              </Text>
              
              <Button 
                variant="outline"
                borderColor="$borderLight0"
                sx={{ _dark: { borderColor: '$borderDark0' } }}
                borderWidth={2}
                onPress={onGoogleSignIn}
                borderRadius={12}
                h={52}
                justifyContent="center"
                alignItems="center"
                px={24}
                bg="transparent"
                width="100%"
              >
                <HStack space="sm" alignItems="center">
                  <Text 
                    size="lg"
                  >
                    G
                  </Text>
                  <Text 
                    color="$textLight0"
                    sx={{ _dark: { color: '$textDark0' } }}
                    fontWeight="$medium"
                    size="md"
                  >
                    Continue with Google
                  </Text>
                </HStack>
              </Button>
            </VStack>
          </VStack>
        </VStack>
      </VStack>
    </Box>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
});