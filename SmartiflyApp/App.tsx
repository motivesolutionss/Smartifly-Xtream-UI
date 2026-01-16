import React, { useEffect } from 'react';
import { StatusBar, LogBox, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';

// Import the proper navigator - AppNavigator handles TV/Mobile detection
import MobileNavigator from './src/navigation/MobileNavigator';
import TVNavigator from './src/navigation/TVNavigator';

// Error Boundary for catching JavaScript errors
import ErrorBoundary from './src/components/ErrorBoundary';

// Stores
import { useFavoritesStore } from './src/screens/mobile/favorites/store/favoritesStore';

// Theme
import { colors } from './src/theme';

// Ignore specific warnings
LogBox.ignoreLogs(['Non-serializable values were found in the navigation state']);

// Create custom dark theme by extending DefaultTheme (includes fonts)
const AppTheme = {
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

const App: React.FC = () => {
  // Detect if running on TV
  const isTV = Platform.isTV;

  // Load favorites on app start (bootstrap)
  useEffect(() => {
    useFavoritesStore
      .getState()
      .loadFavorites()
      .catch(() => {
        // Error already logged inside store
      });
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        {/* Minimal StatusBar - PlayerScreen controls visibility */}
        <StatusBar barStyle="light-content" hidden={isTV} />
        <NavigationContainer theme={AppTheme}>
          {isTV ? <TVNavigator /> : <MobileNavigator />}
        </NavigationContainer>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
};

export default App;