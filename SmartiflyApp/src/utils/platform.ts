import { Platform } from 'react-native';

// Detect if running on TV
export const isTV = Platform.isTV;

// Platform-specific dimensions
export const isAndroid = Platform.OS === 'android';
export const isIOS = Platform.OS === 'ios';

export default {
    isTV,
    isAndroid,
    isIOS,
};
