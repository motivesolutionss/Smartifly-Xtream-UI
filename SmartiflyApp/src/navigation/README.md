# Smartifly Navigation System

A comprehensive bottom tab navigation system for the Smartifly IPTV app.

## 📁 File Structure

```
src/navigation/
├── index.tsx                    # Main export & AppNavigator
├── types.ts                     # TypeScript navigation types
├── MobileNavigator.tsx          # Root navigator (Login → Tabs)
├── BottomTabNavigator.tsx       # Main tab navigation
├── components/
│   ├── index.ts
│   ├── CustomTabBar.tsx         # Basic tab bar (text icons)
│   └── CustomTabBarWithIcons.tsx # Tab bar with vector icons
├── stacks/
│   ├── index.ts
│   ├── HomeStack.tsx
│   ├── LiveStack.tsx
│   ├── MoviesStack.tsx
│   ├── SeriesStack.tsx
│   └── SettingsStack.tsx
└── screens/
    └── SettingsScreen.tsx       # New settings screen
```

## 🚀 Installation

### 1. Install Dependencies

```bash
# Vector icons (recommended for better icons)
npm install react-native-vector-icons
npm install --save-dev @types/react-native-vector-icons

# Link for iOS
cd ios && pod install && cd ..
```

### 2. Copy Navigation Files

Copy the `navigation/` folder to your `src/` directory.

### 3. Update Your App.tsx

```tsx
import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './navigation';

const App: React.FC = () => {
  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#0B1220"
        translucent={false}
      />
      <AppNavigator />
    </SafeAreaProvider>
  );
};

export default App;
```

### 4. Update Stack Navigators

Replace placeholder components with your actual screens in each stack:

```tsx
// In stacks/HomeStack.tsx
import HomeScreen from '../../screens/mobile/HomeScreen';
import PlayerScreen from '../../screens/mobile/PlayerScreen';

// Then use them:
<Stack.Screen name="HomeMain" component={HomeScreen} />
<Stack.Screen name="Player" component={PlayerScreen} />
```

## 📱 Navigation Structure

```
RootStack (MobileNavigator)
├── Login                     # Auth screen
├── MainTabs (BottomTabNavigator)
│   ├── HomeTab
│   │   ├── HomeMain
│   │   └── Player
│   ├── LiveTab
│   │   ├── LiveList
│   │   └── Player
│   ├── MoviesTab
│   │   ├── MoviesList
│   │   ├── MovieDetail
│   │   └── Player
│   ├── SeriesTab
│   │   ├── SeriesList
│   │   ├── SeriesDetail
│   │   └── Player
│   └── SettingsTab
│       ├── SettingsMain
│       ├── Profile
│       ├── Playback
│       └── About
└── FullscreenPlayer          # Modal player (accessible anywhere)
```

## 🎨 Tab Bar Design

### Tab Configuration

| Tab | Label | Icon | Active Color |
|-----|-------|------|--------------|
| HomeTab | Home | `home` | #E50914 (Red) |
| LiveTab | Live TV | `radio` | #E50914 (Red) |
| MoviesTab | Movies | `film` | #9333EA (Purple) |
| SeriesTab | Series | `tv` | #0EA5E9 (Blue) |
| SettingsTab | Settings | `settings` | #00E5FF (Cyan) |

### Visual Features

- ✅ Active tab indicator line
- ✅ Color-coded active states
- ✅ Live badge on Live TV tab
- ✅ Safe area handling
- ✅ Keyboard aware (hides on keyboard)

## 🔧 Usage Examples

### Navigate Between Tabs

```tsx
import { useNavigation } from '@react-navigation/native';

const MyComponent = () => {
  const navigation = useNavigation();
  
  // Navigate to Movies tab
  navigation.navigate('MoviesTab');
  
  // Navigate to specific screen in a tab
  navigation.navigate('SeriesTab', {
    screen: 'SeriesDetail',
    params: { series: seriesData },
  });
};
```

### Navigate to Player

```tsx
// Navigate to player within current tab
navigation.navigate('Player', {
  type: 'movie',
  item: movieData,
});

// Navigate to fullscreen player from anywhere
navigation.navigate('FullscreenPlayer', {
  type: 'live',
  item: channelData,
});
```

### Handle Login Success

```tsx
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

const LoginScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleLogin = async () => {
    const success = await login(username, password);
    if (success) {
      // Replace prevents going back to login
      navigation.replace('MainTabs');
    }
  };
};
```

### Handle Logout

```tsx
const handleLogout = () => {
  logout(); // Clear auth state from store
  
  // Reset navigation to login
  navigation.reset({
    index: 0,
    routes: [{ name: 'Login' }],
  });
};
```

## 📐 TypeScript Types

### Using Screen Props

```tsx
import { HomeScreenProps } from '../navigation/types';

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation, route }) => {
  // navigation and route are fully typed
  navigation.navigate('Player', { type: 'live', item: channel });
};
```

### Using Navigation Hook

```tsx
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../navigation/types';

const MyComponent = () => {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  // Now navigation.navigate() is fully typed
};
```

## 🎯 Customization

### Change Tab Colors

Edit `TAB_CONFIG` in `components/CustomTabBar.tsx`:

```tsx
const TAB_CONFIG: Record<string, TabConfig> = {
  HomeTab: {
    label: 'Home',
    icon: 'home',
    activeColor: '#FF0000', // Change this
  },
  // ...
};
```

### Add New Tab

1. Create a new stack navigator in `stacks/`
2. Export it from `stacks/index.ts`
3. Add to `BottomTabNavigator.tsx`
4. Add configuration to `CustomTabBar.tsx`
5. Update `types.ts` with new param list

### Hide Tab Bar on Specific Screens

```tsx
// In your screen
import { useLayoutEffect } from 'react';

const PlayerScreen = ({ navigation }) => {
  useLayoutEffect(() => {
    navigation.getParent()?.setOptions({
      tabBarStyle: { display: 'none' },
    });
    
    return () => {
      navigation.getParent()?.setOptions({
        tabBarStyle: undefined,
      });
    };
  }, [navigation]);
};
```

## 🔄 Migration from Old Navigation

If you're migrating from the old flat navigation:

### Old Way
```tsx
navigation.navigate('Home');
navigation.navigate('Live');
navigation.navigate('Movies');
```

### New Way
```tsx
// Navigate to tab
navigation.navigate('HomeTab');
navigation.navigate('LiveTab');
navigation.navigate('MoviesTab');

// Or navigate to specific screen
navigation.navigate('MoviesTab', {
  screen: 'MoviesList',
});
```

### Screen Name Changes

| Old Name | New Name | Stack |
|----------|----------|-------|
| Home | HomeMain | HomeStack |
| Live | LiveList | LiveStack |
| Movies | MoviesList | MoviesStack |
| Series | SeriesList | SeriesStack |
| SeriesDetail | SeriesDetail | SeriesStack |
| Player | Player | (in each stack) |
| - | SettingsMain | SettingsStack |

## ⚠️ Important Notes

1. **Safe Area**: The tab bar automatically handles safe areas. Don't add extra bottom padding.

2. **Keyboard**: Tab bar hides automatically when keyboard appears.

3. **Deep Linking**: For deep linking support, you'll need to configure linking in `NavigationContainer`.

4. **State Persistence**: Consider adding state persistence for better UX:
   ```tsx
   <NavigationContainer
     onStateChange={(state) => saveNavigationState(state)}
     initialState={savedState}
   >
   ```

5. **Performance**: Tabs are lazy-loaded by default. First render of each tab may take longer.

---

*Part of the Smartifly Design System v1.0.0*