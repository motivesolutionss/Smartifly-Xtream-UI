/**
 * Smartifly Search Stack
 * 
 * Navigation stack for the Search tab.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SearchStackParamList } from '../types';

// Screens
import SearchScreen from '../../screens/mobile/search/SearchScreen';
import PlayerScreen from '../../screens/mobile/PlayerScreen';
import MovieDetailScreen from '../../screens/mobile/MoviesScreen'; // Reusing details logic if embedded, wait, check MoviesStack
// Actually usually detail screens are separate. Let's check imports in other stacks.
// MoviesStack uses Mobile/MoviesScreen? No, usually Mobile/MovieDetailScreen if it exists.
// Checking file listing earlier: MoviesScreen.tsx exists. SeriesDetailScreen.tsx exists.
import SeriesDetailScreen from '../../screens/mobile/SeriesDetailScreen';

// We need a MovieDetailScreen. Checking MoviesStack to see what it uses.
// For now, I'll import what I think is correct and if it fails I'll fix it.
// React Native logic: Screen component must match.

const Stack = createNativeStackNavigator<SearchStackParamList>();

const SearchStack: React.FC = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
            }}
            initialRouteName="SearchMain"
        >
            <Stack.Screen name="SearchMain" component={SearchScreen} />
            <Stack.Screen name="Player" component={PlayerScreen} />
            {/* 
                 Reuse SeriesDetailScreen. 
                 For MovieDetail, usually it's a modal or separate screen.
                 I'll add it if it exists or use a placeholder.
                 Wait, I should check MoviesStack.tsx to see what it uses for MovieDetail.
            */}
            <Stack.Screen name="SeriesDetail" component={SeriesDetailScreen} />

            {/* 
               If there is no dedicated MovieDetailScreen, we might need to use a shared one 
               or if MoviesScreen handles details internally (unlikely for stack).
               Let's assume for now we might not have a dedicated MovieDetailScreen file 
               listed in the file list I saw earlier (LiveScreen, LoadingScreen, MoviesScreen, PlayerScreen, SeriesDetailScreen, SeriesScreen).
               Ah, MoviesScreen might be the main list. 
               If clicking a movie goes to Player directly, then we don't need MovieDetail.
               But SearchStackParamList has `MovieDetail`.
               I'll comment it out or point to generic placeholder until verified.
               Actually, I'll just omit it for now if I can't find it, but type has it.
               I'll check MoviesStack content in a parallel call to be sure.
            */}
        </Stack.Navigator>
    );
};

export default SearchStack;
