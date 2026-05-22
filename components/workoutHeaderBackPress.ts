import { router } from 'expo-router';

export const defaultHeaderBackHandler = () => {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)');
};

export const workoutHeaderBackPressRef = {
  current: defaultHeaderBackHandler,
};
