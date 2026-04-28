import React, { memo } from 'react';
import { findNodeHandle, Pressable, StyleSheet, Text, View } from 'react-native';
import { scale, scaleFont, Icon } from '../../../../theme';
import { useTheme } from '../../../../theme/ThemeProvider';

const SEEK_STEP_SECONDS = 10;

interface TVPlayerCenterControlsProps {
    isLive: boolean;
    paused: boolean;
    setPaused: (paused: boolean | ((prev: boolean) => boolean)) => void;
    focusedElement: string | null;
    setFocusedElement: (element: string | null) => void;
    handleSeekBy: (delta: number) => void;
    showHUD: () => void;
    isHudVisible: boolean;
    playPauseRef?: any;
    progressPressableRef?: any;
    lockButtonRef?: any;
}

const TVPlayerCenterControls: React.FC<TVPlayerCenterControlsProps> = memo(({
    isLive,
    paused,
    setPaused,
    focusedElement,
    setFocusedElement,
    handleSeekBy,
    showHUD,
    isHudVisible,
    playPauseRef,
    progressPressableRef,
    lockButtonRef,
}) => {
    const { colors } = useTheme();
    return (
        <View style={styles.centerControls}>
            {/* Rewind */}
            <Pressable
                style={[
                    styles.seekButton,
                    focusedElement === 'seek-rewind' && [styles.seekButtonFocused, { backgroundColor: colors.glass }]
                ]}
                onPress={() => handleSeekBy(-SEEK_STEP_SECONDS)}
                onFocus={() => {
                    setFocusedElement('seek-rewind');
                    showHUD();
                }}
                onBlur={() => setFocusedElement(null)}
                disabled={isLive}
                {...({
                    nextFocusRight: findNodeHandle(playPauseRef.current),
                    nextFocusUp: findNodeHandle(lockButtonRef.current)
                } as any)}
            >
                <Icon name="arrowCounterClockwise" size={scale(40)} color={isLive ? 'rgba(255,255,255,0.3)' : '#FFFFFF'} />
                <Text style={[styles.seekLabel, isLive && styles.seekLabelDisabled]}>10</Text>
            </Pressable>

            {/* Play / Pause */}
            <Pressable
                ref={playPauseRef}
                style={[
                    styles.playPauseButton,
                    focusedElement === 'playPause' && [styles.playPauseButtonFocused, { backgroundColor: colors.glass }]
                ]}
                onPress={() => setPaused(prev => !prev)}
                onFocus={() => {
                    setFocusedElement('playPause');
                    showHUD();
                }}
                onBlur={() => setFocusedElement(null)}
                {...({
                    hasTVPreferredFocus: isHudVisible,
                    nextFocusDown: findNodeHandle(progressPressableRef.current),
                    nextFocusUp: findNodeHandle(lockButtonRef.current),
                } as any)}
            >
                <Icon name={paused ? 'play' : 'pause'} size={scale(48)} color="#FFFFFF" />
            </Pressable>

            {/* Forward */}
            <Pressable
                style={[
                    styles.seekButton,
                    focusedElement === 'seek-forward' && [styles.seekButtonFocused, { backgroundColor: colors.glass }]
                ]}
                onPress={() => handleSeekBy(SEEK_STEP_SECONDS)}
                onFocus={() => {
                    setFocusedElement('seek-forward');
                    showHUD();
                }}
                onBlur={() => setFocusedElement(null)}
                disabled={isLive}
                {...({
                    nextFocusLeft: findNodeHandle(playPauseRef.current),
                    nextFocusUp: findNodeHandle(lockButtonRef.current)
                } as any)}
            >
                <Icon name="arrowRight" size={scale(40)} color={isLive ? 'rgba(255,255,255,0.3)' : '#FFFFFF'} />
                <Text style={[styles.seekLabel, isLive && styles.seekLabelDisabled]}>10</Text>
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
        backgroundColor: 'rgba(255,255,255,0.15)', // overridden at render time with theme.colors.glass
        borderColor: 'rgba(255,255,255,0.5)',
        transform: [{ scale: 1.08 }],
    },
    seekLabel: {
        color: '#FFFFFF',
        fontSize: scaleFont(13),
        fontWeight: '700',
        marginTop: scale(2),
    },
    seekLabelDisabled: {
        color: 'rgba(255,255,255,0.3)',
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
        backgroundColor: 'rgba(255,255,255,0.25)', // overridden at render time with theme.colors.glass
        borderColor: '#FFFFFF',
        transform: [{ scale: 1.12 }],
    },
});

export default TVPlayerCenterControls;
