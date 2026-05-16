import React from 'react';
import { Platform, UIManager, View, requireNativeComponent } from 'react-native';
import type { IOSVLCPlayerProps } from './IOSVLCPlayer';

const VIEW_CANDIDATES = ['IOSAltPlayerViewManager', 'IOSAltPlayerView'] as const;
const resolvedViewName = Platform.OS === 'ios'
    ? VIEW_CANDIDATES.find((name) => !!UIManager.getViewManagerConfig(name))
    : undefined;

const isIOSAltPlayerAvailable = Platform.OS === 'ios' && !!resolvedViewName;
const NativeIOSAltPlayer = resolvedViewName
    ? requireNativeComponent<IOSVLCPlayerProps>(resolvedViewName)
    : null;

const IOSAltPlayer: React.FC<IOSVLCPlayerProps> = (props) => {
    if (!NativeIOSAltPlayer) {
        return <View {...props} />;
    }
    return <NativeIOSAltPlayer {...props} />;
};

export { isIOSAltPlayerAvailable };
export default IOSAltPlayer;
