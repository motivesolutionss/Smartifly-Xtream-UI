import React from 'react';
import { Platform, UIManager, View, ViewProps, requireNativeComponent } from 'react-native';

export type VideoLoadEvent = { nativeEvent: { duration?: number } };
export type VideoOpenEvent = { nativeEvent: { state?: string } };
export type VideoProgressEvent = { nativeEvent: { currentTime: number; playableDuration?: number } };
export type VideoBufferEvent = { nativeEvent: { isBuffering: boolean } };
export type VideoErrorEvent = { nativeEvent: { error?: { errorString?: string; domain?: string; errorCode?: string } } };
export type VideoDebugEvent = {
    nativeEvent: {
        playerState?: string;
        debugReason?: string;
        stateRaw?: number;
        isPlaying?: boolean;
        timeMs?: number;
        position?: number;
        rate?: number;
        lengthMs?: number;
        bitrate?: number;
        demuxReadBytes?: number;
        startupRecoveryAttempts?: number;
    };
};
export type VLCSubtitleTrack = {
    id: number;
    name: string;
};
export type VLCSubtitleTracksEvent = {
    nativeEvent: {
        selectedTrackId?: number;
        tracks?: VLCSubtitleTrack[];
        reason?: string;
    };
};

export type IOSVLCPlayerProps = ViewProps & {
    src: string;
    paused?: boolean;
    muted?: boolean;
    rate?: number;
    subtitleFontSize?: number;
    subtitleColor?: string;
    subtitleOutlineColor?: string;
    subtitleOutlineWidth?: number;
    subtitleBackgroundColor?: string;
    subtitleBottomMargin?: number;
    subtitleTrackId?: number;
    startupTimeoutMs?: number;
    seekTime?: number;
    seekTrigger?: number;
    onVLCOpen?: (event: VideoOpenEvent) => void;
    onVLCDebug?: (event: VideoDebugEvent) => void;
    onVLCLoad?: (event: VideoLoadEvent) => void;
    onVLCProgress?: (event: VideoProgressEvent) => void;
    onVLCBuffer?: (event: VideoBufferEvent) => void;
    onVLCSubtitleTracks?: (event: VLCSubtitleTracksEvent) => void;
    onVLCError?: (event: VideoErrorEvent) => void;
    onVLCEnd?: () => void;
};

const VIEW_CANDIDATES = ['IOSVLCPlayerViewManager', 'IOSVLCPlayerView'] as const;
const resolvedViewName = Platform.OS === 'ios'
    ? VIEW_CANDIDATES.find((name) => !!UIManager.getViewManagerConfig(name))
    : undefined;
const isIOSVLCPlayerAvailable = Platform.OS === 'ios' && !!resolvedViewName;
const NativeIOSVLCPlayer = resolvedViewName
    ? requireNativeComponent<IOSVLCPlayerProps>(resolvedViewName)
    : null;

const IOSVLCPlayer: React.FC<IOSVLCPlayerProps> = (props) => {
    if (!NativeIOSVLCPlayer) {
        return <View {...props} />;
    }
    return <NativeIOSVLCPlayer {...props} />;
};

export { isIOSVLCPlayerAvailable };
export default IOSVLCPlayer;
