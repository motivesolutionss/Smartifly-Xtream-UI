import { useCallback } from 'react';
import { BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Hook for Android TV hardware back handling with automatic cleanup.
 * Requires the handler to be wrapped in useCallback to keep the subscription stable.
 */
const useTVBackHandler = (handler: () => boolean) => {
    useFocusEffect(
        useCallback(() => {
            const subscription = BackHandler.addEventListener('hardwareBackPress', handler);
            return () => subscription.remove();
        }, [handler])
    );
};

export default useTVBackHandler;
