import React, { memo } from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

type BaseInteractiveCardProps = {
  containerStyle?: StyleProp<ViewStyle>;
  cardStyle?: any;
  cardRef?: React.Ref<View>;
  onPress: () => void;
  onFocus: () => void;
  onBlur: () => void;
  hasTVPreferredFocus?: boolean;
  focusable?: boolean;
  nextFocusLeft?: number | null;
  nextFocusRight?: number | null;
  nextFocusUp?: number | null;
  nextFocusDown?: number | null;
  onKeyPress?: (event: any) => void;
  onKeyDown?: (event: any) => void;
  onKeyUp?: (event: any) => void;
  children: React.ReactNode;
};

const BaseInteractiveCard: React.FC<BaseInteractiveCardProps> = ({
  containerStyle,
  cardStyle,
  cardRef,
  onPress,
  onFocus,
  onBlur,
  hasTVPreferredFocus = false,
  focusable = true,
  nextFocusLeft,
  nextFocusRight,
  nextFocusUp,
  nextFocusDown,
  onKeyPress,
  onKeyDown,
  onKeyUp,
  children,
}) => {
  return (
    <Pressable
      ref={cardRef}
      collapsable={false}
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      focusable={focusable}
      hasTVPreferredFocus={hasTVPreferredFocus}
      // @ts-ignore TV-only focus props
      nextFocusLeft={nextFocusLeft ?? undefined}
      // @ts-ignore TV-only focus props
      nextFocusRight={nextFocusRight ?? undefined}
      // @ts-ignore TV-only focus props
      nextFocusUp={nextFocusUp ?? undefined}
      // @ts-ignore TV-only focus props
      nextFocusDown={nextFocusDown ?? undefined}
      // @ts-ignore TV-only focus events
      onKeyPress={onKeyPress}
      // @ts-ignore TV-only focus events
      onKeyDown={onKeyDown}
      // @ts-ignore TV-only focus events
      onKeyUp={onKeyUp}
      style={containerStyle}
    >
      <Animated.View style={cardStyle}>{children}</Animated.View>
    </Pressable>
  );
};

export default memo(BaseInteractiveCard);
