import React, { memo } from 'react';
import { findNodeHandle, Pressable, StyleSheet, Text, View } from 'react-native';
import { scale, scaleFont, Icon } from '../.././../theme';
import { useTheme } from '../.././../theme/ThemeProvider';

interface TVPlayerCenterControlsProps {
    isLive: boolean;
    paused: boolean;
    setPaused: (paused: boolean | ((prev: boolean) => boolean)) => void;
    focusedElement: string | null;
    setFocusedElement: (element: string | null) => void;
    handleSeekBy: (delta: number) => void;
    handleLiveChannelStep: (delta: number) => void;
    showHUD: () => void;
    isHudVisible: boolean;
    playPauseRef?: any;
    progressPressableRef?: any;
    lockButtonRef?: any;
    leftActionRef?: any;
    rightActionRef?: any;
    registerHorizontalActionOrigin: (ref: any) => void;
}

const TVPlayerCenterControls: React.FC<TVPlayerCenterControlsProps> = memo(({
    isLive,
    paused,
    setPaused,
    focusedElement,
    setFocusedElement,
    handleSeekBy,
    handleLiveChannelStep,
    showHUD,
    isHudVisible,
    playPauseRef,
    progressPressableRef,
    lockButtonRef,
    leftActionRef,
    rightActionRef,
    registerHorizontalActionOrigin,
}) => {
    const { colors } = useTheme();

    return (
        <View style={styles.centerControls}>
            <Pressable
                style={[
                    styles.seekButton,
                    focusedElement === 'seek-rewind' && [styles.seekButtonFocused, { backgroundColor: colors.glass }],
                ]}
                onPress={() => {
                    if (isLive) {
                        handleLiveChannelStep(-1);
                    } else {
                        handleSeekBy(-10);
                    }
                }}
                onFocus={() => {
                    setFocusedElement('seek-rewind');
                    showHUD();
                }}
                onBlur={() => setFocusedElement(null)}
                {...({
                    nextFocusRight: findNodeHandle(playPauseRef.current),
                    nextFocusLeft: findNodeHandle(leftActionRef.current),
                    nextFocusUp: findNodeHandle(lockButtonRef.current),
                } as any)}
            >
                <Icon name={isLive ? 'arrowLeft' : 'arrowCounterClockwise'} size={scale(40)} color="#FFFFFF" />
                <Text style={styles.seekLabel}>{isLive ? 'CH-' : '10'}</Text>
            </Pressable>

            <Pressable
                ref={playPauseRef}
                style={[
                    styles.playPauseButton,
                    focusedElement === 'playPause' && [styles.playPauseButtonFocused, { backgroundColor: colors.glass }],
                ]}
                onPress={() => setPaused((prev) => !prev)}
                onFocus={() => {
                    registerHorizontalActionOrigin(playPauseRef);
                    setFocusedElement('playPause');
                    showHUD();
                }}
                onBlur={() => setFocusedElement(null)}
                {...({
                    hasTVPreferredFocus: isHudVisible,
                    nextFocusDown: findNodeHandle(progressPressableRef.current),
                    nextFocusUp: findNodeHandle(lockButtonRef.current),
                    nextFocusLeft: findNodeHandle(leftActionRef.current),
                    nextFocusRight: findNodeHandle(rightActionRef.current),
                } as any)}
            >
                <Icon name={paused ? 'play' : 'pause'} size={scale(48)} color="#FFFFFF" />
            </Pressable>

            <Pressable
                style={[
                    styles.seekButton,
                    focusedElement === 'seek-forward' && [styles.seekButtonFocused, { backgroundColor: colors.glass }],
                ]}
                onPress={() => {
                    if (isLive) {
                        handleLiveChannelStep(1);
                    } else {
                        handleSeekBy(10);
                    }
                }}
                onFocus={() => {
                    setFocusedElement('seek-forward');
                    showHUD();
                }}
                onBlur={() => setFocusedElement(null)}
                {...({
                    nextFocusLeft: findNodeHandle(playPauseRef.current),
                    nextFocusRight: findNodeHandle(rightActionRef.current),
                    nextFocusUp: findNodeHandle(lockButtonRef.current),
                } as any)}
            >
                <Icon name="arrowRight" size={scale(40)} color="#FFFFFF" />
                <Text style={styles.seekLabel}>{isLive ? 'CH+' : '10'}</Text>
            </Pressable>
        </View>
    );
});

const styles = StyleSheet.create({
    centerControls: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: scale(52),
    },
    seekButton: {
        alignItems: 'center',
        justifyContent: 'center',
        width: scale(72),
        height: scale(72),
        borderRadius: scale(36),
        borderWidth: 2,
        borderColor: 'transparent',
    },
    seekButtonFocused: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderColor: 'rgba(255,255,255,0.5)',
        transform: [{ scale: 1.08 }],
    },
    seekLabel: {
        color: '#FFFFFF',
        fontSize: scaleFont(13),
        fontWeight: '700',
        marginTop: scale(2),
    },
    playPauseButton: {
        width: scale(110),
        height: scale(110),
        borderRadius: scale(55),
        backgroundColor: 'rgba(255,255,255,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2.5,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    playPauseButtonFocused: {
        backgroundColor: 'rgba(255,255,255,0.25)',
        borderColor: '#FFFFFF',
        transform: [{ scale: 1.12 }],
    },
});

export default TVPlayerCenterControls;
