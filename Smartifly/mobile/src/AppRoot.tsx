import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MobileNavigator from './navigation/MobileNavigator';
import { ThemeProvider } from './theme';

export default function AppRoot() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <NavigationContainer>
          <MobileNavigator />
        </NavigationContainer>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
