import { useEffect } from 'react';
import { BackHandler } from 'react-native';

/**
 * Hook for Android TV hardware back handling with automatic cleanup.
 * Requires the handler to be wrapped in useCallback to keep the subscription stable.
 */
const useTVBackHandler = (handler: () => boolean) => {
    useEffect(() => {
        const subscription = BackHandler.addEventListener('hardwareBackPress', handler);
        return () => subscription.remove();
    }, [handler]);
};

export default useTVBackHandler;
