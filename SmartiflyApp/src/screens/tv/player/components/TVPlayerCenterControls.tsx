import React, { memo } from 'react';
import { findNodeHandle, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, scale, scaleFont, Icon } from '../../../../theme';

const SEEK_STEP_SECONDS = 15;

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
    return (
        <View style={styles.centerControls}>
            <Pressable
                style={[
                    styles.seekButton,
                    focusedElement === 'seek-rewind' && styles.seekButtonFocused
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
                <Icon name="arrowLeft" size={scale(36)} color={isLive ? colors.textMuted : colors.textPrimary} />
                <Text style={styles.seekLabel}>15s</Text>
            </Pressable>

            <Pressable
                ref={playPauseRef}
                style={[
                    styles.playPauseButton,
                    focusedElement === 'playPause' && styles.playPauseButtonFocused
                ]}
                onPress={() => setPaused(prev => !prev)}
                onFocus={() => {
                    setFocusedElement('playPause');
                    showHUD(); // Keep alive
                }}
                onBlur={() => setFocusedElement(null)}
                {...({
                    hasTVPreferredFocus: isHudVisible,
                    nextFocusDown: findNodeHandle(progressPressableRef.current),
                    nextFocusUp: findNodeHandle(lockButtonRef.current),
                    nextFocusLeft: isLive ? undefined : undefined, // Handled automatically by layout but we can be explicit
                } as any)}
            >
                <Icon name={paused ? 'play' : 'pause'} size={scale(40)} color={colors.textPrimary} />
            </Pressable>

            <Pressable
                style={[
                    styles.seekButton,
                    focusedElement === 'seek-forward' && styles.seekButtonFocused
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
                <Icon name="arrowRight" size={scale(36)} color={isLive ? colors.textMuted : colors.textPrimary} />
                <Text style={styles.seekLabel}>15s</Text>
            </Pressable>
        </View>
    );
});

const styles = StyleSheet.create({
    centerControls: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: scale(32),
    },
    seekButton: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: scale(12),
        borderRadius: scale(12),
        borderWidth: 2,
        borderColor: 'transparent',
    },
    seekButtonFocused: {
        borderColor: colors.primary,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    seekLabel: {
        color: colors.textPrimary,
        fontSize: scaleFont(16),
        marginTop: scale(6),
    },
    playPauseButton: {
        width: scale(96),
        height: scale(96),
        borderRadius: scale(48),
        backgroundColor: 'rgba(255,255,255,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: 'transparent',
    },
    playPauseButtonFocused: {
        borderColor: colors.primary,
        backgroundColor: 'rgba(255,255,255,0.25)',
        transform: [{ scale: 1.1 }],
    },
});

export default TVPlayerCenterControls;
