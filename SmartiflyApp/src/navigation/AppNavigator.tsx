import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { Platform } from 'react-native';
import MobileNavigator from './MobileNavigator';
import TVNavigator from './TVNavigator';

import { colors } from '../theme';

const navigationTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.backgroundSecondary,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.primary,
  },
};

const AppNavigator: React.FC = () => {
  const isTV = Platform.isTV;

  return (
    <NavigationContainer theme={navigationTheme}>
      {isTV ? <TVNavigator /> : <MobileNavigator />}
    </NavigationContainer>
  );
};

export default AppNavigator;
