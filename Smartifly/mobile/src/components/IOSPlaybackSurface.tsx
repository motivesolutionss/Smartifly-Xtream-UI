import React from 'react';
import { View } from 'react-native';
import IOSVLCPlayer, { IOSVLCPlayerProps, isIOSVLCPlayerAvailable } from './IOSVLCPlayer';
import IOSAltPlayer, { isIOSAltPlayerAvailable } from './IOSAltPlayer';

export type IOSPlaybackSurfaceEngine = 'ios_vlc' | 'ios_alt_engine';

export type IOSPlaybackSurfaceProps = IOSVLCPlayerProps & {
    engine: IOSPlaybackSurfaceEngine;
};

export const isIOSPlaybackSurfaceEngineAvailable = (engine: IOSPlaybackSurfaceEngine): boolean => {
    switch (engine) {
        case 'ios_vlc':
            return isIOSVLCPlayerAvailable;
        case 'ios_alt_engine':
            return isIOSAltPlayerAvailable;
        default:
            return false;
    }
};

const IOSPlaybackSurface: React.FC<IOSPlaybackSurfaceProps> = ({ engine, ...props }) => {
    switch (engine) {
        case 'ios_vlc':
            return <IOSVLCPlayer {...props} />;
        case 'ios_alt_engine':
            return <IOSAltPlayer {...props} />;
        default:
            return <View {...props} />;
    }
};

export default IOSPlaybackSurface;
