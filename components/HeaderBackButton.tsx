import { useThemeMode } from '@/hooks/useThemeMode';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable } from 'react-native';

type HeaderBackButtonProps = {
  onPress: () => void;
};

export function HeaderBackButton({ onPress }: HeaderBackButtonProps) {
  const { effectiveColorScheme } = useThemeMode();

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: 'transparent', borderless: false }}
      style={({ pressed }) => ({
        opacity: pressed ? 0.65 : 1,
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
      })}
      hitSlop={12}
    >
      <Ionicons
        name="chevron-back"
        size={28}
        color={effectiveColorScheme === 'dark' ? '#F8F9FA' : '#212529'}
      />
    </Pressable>
  );
}
