import { useOAuth, useSignIn, useSignUp } from "@clerk/clerk-expo";
import {
  Box,
  Button,
  HStack,
  Input,
  InputField,
  Text,
  VStack,
} from "@gluestack-ui/themed";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Alert } from "react-native";
import Svg, { Path } from "react-native-svg";

WebBrowser.maybeCompleteAuthSession();

function GoogleMark({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18">
      <Path
        fill="#EA4335"
        d="M9 3.48c1.69 0 2.84.73 3.49 1.34l2.56-2.5C13.46.81 11.44 0 9 0 5.48 0 2.44 2.02.96 4.96l2.98 2.31C4.66 5.1 6.62 3.48 9 3.48z"
      />
      <Path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.12-.84 2.07-1.8 2.71v2.25h2.91c1.7-1.57 2.69-3.88 2.69-6.6z"
      />
      <Path
        fill="#FBBC05"
        d="M3.94 10.73c-.18-.54-.28-1.11-.28-1.73s.1-1.19.28-1.73V5H.96A8.99 8.99 0 0 0 0 9c0 1.45.35 2.83.96 4l2.98-2.27z"
      />
      <Path
        fill="#34A853"
        d="M9 18c2.44 0 4.46-.81 5.95-2.2l-2.91-2.25c-.81.54-1.84.86-3.04.86-2.38 0-4.4-1.61-5.12-3.78L.9 12.87C2.38 15.98 5.48 18 9 18z"
      />
    </Svg>
  );
}

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { signUp, isLoaded: isSignUpLoaded } = useSignUp();
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const [emailAddress, setEmailAddress] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpMode, setOtpMode] = useState<"signIn" | "signUp" | null>(null);
  const [codeRequested, setCodeRequested] = useState(false);

  const onRequestCodePress = async () => {
    const email = emailAddress.trim().toLowerCase();
    if (!isLoaded || !isSignUpLoaded || !email) return;

    setLoading(true);
    try {
      const signInAttempt = await signIn.create({
        strategy: "email_code",
        identifier: email,
      });
      if (
        signInAttempt.status === "complete" &&
        signInAttempt.createdSessionId
      ) {
        await setActive({ session: signInAttempt.createdSessionId });
        router.replace("/(tabs)");
      } else {
        const emailFactor = signInAttempt.supportedFirstFactors?.find(
          (factor: any) =>
            factor?.strategy === "email_code" &&
            typeof factor?.emailAddressId === "string",
        ) as { emailAddressId: string } | undefined;
        const emailAddressId = emailFactor?.emailAddressId;
        if (!emailAddressId) {
          throw new Error("Unable to start email code sign in.");
        }
        await signIn.prepareFirstFactor({
          strategy: "email_code",
          emailAddressId,
        });
        setOtpMode("signIn");
        setCodeRequested(true);
      }
    } catch (err: any) {
      try {
        if (!signUp) {
          throw err;
        }
        await signUp.create({ emailAddress: email });
        await signUp.prepareEmailAddressVerification({
          strategy: "email_code",
        });
        setOtpMode("signUp");
        setCodeRequested(true);
      } catch (signUpErr: any) {
        Alert.alert(
          "Error",
          signUpErr?.errors?.[0]?.message ||
            err?.errors?.[0]?.message ||
            "Failed to send code",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const onVerifyCodePress = async () => {
    const code = emailCode.trim();
    if (!isLoaded || !code || !otpMode) return;

    setLoading(true);
    try {
      if (otpMode === "signIn") {
        const signInAttempt = await signIn.attemptFirstFactor({
          strategy: "email_code",
          code,
        });
        if (
          signInAttempt.status === "complete" &&
          signInAttempt.createdSessionId
        ) {
          await setActive({ session: signInAttempt.createdSessionId });
          router.replace("/(tabs)");
          return;
        }
      } else {
        if (!signUp) {
          throw new Error("Sign up is unavailable.");
        }
        const signUpAttempt = await signUp.attemptEmailAddressVerification({
          code,
        });
        if (
          signUpAttempt.status === "complete" &&
          signUpAttempt.createdSessionId
        ) {
          await setActive({ session: signUpAttempt.createdSessionId });
          router.replace("/(tabs)");
          return;
        }
      }
      Alert.alert("Error", "Code verification incomplete. Please try again.");
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.errors?.[0]?.message || "Failed to verify code",
      );
    } finally {
      setLoading(false);
    }
  };

  const onGoogleSignIn = async () => {
    try {
      const { createdSessionId, setActive: setOAuthActive } =
        await startOAuthFlow({
          redirectUrl: Linking.createURL("/"),
        });
      if (createdSessionId) {
        await setOAuthActive?.({ session: createdSessionId });
        router.replace("/(tabs)");
      } else {
        Alert.alert("Sign in canceled", "Google sign in was not completed.");
      }
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.errors?.[0]?.message || "Failed to sign in with Google",
      );
    }
  };

  return (
    <Box
      bg="$backgroundLight0"
      sx={{ _dark: { bg: "$backgroundDark0" } }}
      flex={1}
    >
      <VStack space="xl" p={24} pt={32}>
        <VStack space="sm">
          <Text
            size="2xl"
            fontWeight="$bold"
            color="$textLight0"
            sx={{ _dark: { color: "$textDark0" } }}
          >
            Welcome
          </Text>
          <Text
            size="md"
            color="$textLight300"
            sx={{ _dark: { color: "$textDark300" } }}
          >
            Continue with Google or verify your email.
          </Text>
        </VStack>

        <VStack space="lg">
          <VStack space="md">
            <Text
              size="sm"
              fontWeight="$medium"
              color="$textLight0"
              sx={{ _dark: { color: "$textDark0" } }}
            >
              Email Address
            </Text>
            <Input
              borderColor="$borderLight0"
              sx={{ _dark: { borderColor: "$borderDark0", bg: "$cardDark" } }}
              bg="$cardLight"
              borderRadius={12}
              h={48}
            >
              <InputField
                placeholder="Enter your email"
                value={emailAddress}
                onChangeText={(value) => {
                  setEmailAddress(value);
                  setCodeRequested(false);
                  setOtpMode(null);
                  setEmailCode("");
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                color="$textLight0"
                sx={{ _dark: { color: "$textDark0" } }}
              />
            </Input>
          </VStack>

          {codeRequested && (
            <VStack space="md">
              <Text
                size="sm"
                fontWeight="$medium"
                color="$textLight0"
                sx={{ _dark: { color: "$textDark0" } }}
              >
                Verification Code
              </Text>
              <Input
                borderColor="$borderLight0"
                sx={{ _dark: { borderColor: "$borderDark0", bg: "$cardDark" } }}
                bg="$cardLight"
                borderRadius={12}
                h={48}
              >
                <InputField
                  placeholder="Enter the code from your email"
                  value={emailCode}
                  onChangeText={setEmailCode}
                  keyboardType="number-pad"
                  autoCapitalize="none"
                  color="$textLight0"
                  sx={{ _dark: { color: "$textDark0" } }}
                />
              </Input>
            </VStack>
          )}

          <VStack space="md">
            <Button
              bg="$primary0"
              sx={{ _dark: { bg: "$textDark0" } }}
              onPress={codeRequested ? onVerifyCodePress : onRequestCodePress}
              isDisabled={
                loading || !emailAddress || (codeRequested && !emailCode)
              }
              borderRadius={12}
              h={52}
              justifyContent="center"
              alignItems="center"
              px={24}
            >
              <Text
                color="$backgroundLight0"
                sx={{ _dark: { color: "$backgroundDark0" } }}
                fontWeight="$medium"
                size="md"
              >
                {loading
                  ? "Please wait..."
                  : codeRequested
                    ? "Verify Code"
                    : "Send Verification Code"}
              </Text>
            </Button>

            <VStack space="md" alignItems="center">
              <Text
                size="xs"
                color="$textLight300"
                sx={{ _dark: { color: "$textDark300" } }}
              >
                Or continue with
              </Text>

              <Button
                variant="outline"
                borderColor="$borderLight0"
                sx={{ _dark: { borderColor: "$borderDark0" } }}
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
                  <GoogleMark size={18} />
                  <Text
                    color="$textLight0"
                    sx={{ _dark: { color: "$textDark0" } }}
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
