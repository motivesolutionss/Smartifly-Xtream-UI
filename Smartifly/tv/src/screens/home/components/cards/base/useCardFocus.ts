import { useCallback } from 'react';
import {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

type SpringConfig = {
  damping: number;
  stiffness: number;
  mass: number;
};

type UseCardFocusParams<T> = {
  zoomScaleFocused: number;
  zoomEnabled: boolean;
  ringWidthFocused: number;
  onFocused?: (item: T) => void;
  onBlurred?: () => void;
  item: T;
  springConfig: SpringConfig;
};

export function useCardFocus<T>({
  zoomScaleFocused,
  zoomEnabled,
  ringWidthFocused,
  onFocused,
  onBlurred,
  item,
  springConfig,
}: UseCardFocusParams<T>) {
  const focused = useSharedValue(0);
  const zoom = useSharedValue(1);
  const ringOpacity = useSharedValue(0);
  const ringWidth = useSharedValue(0);

  const focusStyle = useAnimatedStyle(() => ({
    transform: [{ scale: zoom.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    borderWidth: ringWidth.value,
  }));

  const handleFocus = useCallback(() => {
    focused.value = 1;
    ringOpacity.value = withTiming(1, { duration: 120 });
    ringWidth.value = withTiming(ringWidthFocused, { duration: 120 });
    if (zoomEnabled) {
      zoom.value = withSpring(zoomScaleFocused, springConfig);
    }
    if (onFocused) onFocused(item);
  }, [focused, item, onFocused, ringOpacity, ringWidth, ringWidthFocused, springConfig, zoom, zoomEnabled, zoomScaleFocused]);

  const handleBlur = useCallback(() => {
    focused.value = 0;
    ringOpacity.value = withTiming(0, { duration: 120 });
    ringWidth.value = withTiming(0, { duration: 120 });
    if (zoomEnabled) {
      zoom.value = withSpring(1, springConfig);
    }
    if (onBlurred) onBlurred();
  }, [focused, onBlurred, ringOpacity, ringWidth, springConfig, zoom, zoomEnabled]);

  return {
    focused,
    handleFocus,
    handleBlur,
    focusStyle,
    ringStyle,
  };
}
