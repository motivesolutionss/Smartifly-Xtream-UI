import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MobileNavigator from './navigation/MobileNavigator';
import { ThemeProvider } from './theme';

export default function AppRoot() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <MobileNavigator />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
