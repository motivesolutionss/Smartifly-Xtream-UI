/**
 * Smartifly Favorites Stack
 * 
 * Navigation stack for the Favorites tab.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FavoritesStackParamList } from '../types';

// Screens
import FavoritesScreen from '../../screens/mobile/favorites/FavoritesScreen';
import PlayerScreen from '../../screens/mobile/PlayerScreen';
import MovieDetailScreen from '../../screens/mobile/MovieDetailScreen';
import SeriesDetailScreen from '../../screens/mobile/SeriesDetailScreen';

const Stack = createNativeStackNavigator<FavoritesStackParamList>();

const FavoritesStack: React.FC = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
            }}
            initialRouteName="FavoritesMain"
        >
            <Stack.Screen name="FavoritesMain" component={FavoritesScreen} />
            <Stack.Screen name="Player" component={PlayerScreen} />
            <Stack.Screen name="MovieDetail" component={MovieDetailScreen} />
            <Stack.Screen name="SeriesDetail" component={SeriesDetailScreen} />
        </Stack.Navigator>
    );
};

export default FavoritesStack;
