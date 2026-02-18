import React, { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

const SEEK_STEP_SECONDS = 15;

interface TVPlayerFocusLayerProps {
    controlsLocked: boolean;
    showOverlay: boolean;
    isHudVisible: boolean;
    focusTrapRef: any;
    setFocusedElement: (element: string | null) => void;
    showHUD: () => void;
    handleSeekBy: (delta: number) => void;
    progressPressableRef: any;
    playPauseRef: any;
    focusedElement: string | null;
}

const TVPlayerFocusLayer: React.FC<TVPlayerFocusLayerProps> = memo(({
    controlsLocked,
    showOverlay,
    isHudVisible,
    focusTrapRef,
    setFocusedElement,
    showHUD,
    handleSeekBy,
    progressPressableRef,
    playPauseRef,
    focusedElement,
}) => {
    if (controlsLocked || showOverlay) return null;

    const onCatcherFocus = (action: 'seek-rewind' | 'seek-forward' | 'show-hud') => {
        if (!isHudVisible) {
            if (action === 'seek-rewind') {
                handleSeekBy(-SEEK_STEP_SECONDS);
            } else if (action === 'seek-forward') {
                handleSeekBy(SEEK_STEP_SECONDS);
            }
            showHUD();
            // Refocus the play/pause button as it's the main control
            setTimeout(() => playPauseRef.current?.focus(), 50);
        }
    };

    return (
        <View
            style={StyleSheet.absoluteFill}
            pointerEvents={isHudVisible ? "none" : "box-none"}
        >
            {/* Centered Focus Trap - Only active when HUD hidden */}
            <Pressable
                ref={focusTrapRef}
                style={styles.focusTrap}
                focusable={!isHudVisible}
                hasTVPreferredFocus={!isHudVisible}
                onFocus={() => {
                    if (!isHudVisible) setFocusedElement('focus-trap');
                }}
                onPress={() => {
                    showHUD();
                    setTimeout(() => playPauseRef.current?.focus(), 50);
                }}
            />

            {/* Seek/HUD Catchers around the edges */}
            <Pressable
                style={[styles.focusCatcher, styles.focusCatcherLeft]}
                focusable={!isHudVisible}
                onFocus={() => onCatcherFocus('seek-rewind')}
                onPress={() => onCatcherFocus('seek-rewind')}
            />
            <Pressable
                style={[styles.focusCatcher, styles.focusCatcherRight]}
                focusable={!isHudVisible}
                onFocus={() => onCatcherFocus('seek-forward')}
                onPress={() => onCatcherFocus('seek-forward')}
            />

            {/* Top/Bottom Catchers - Mostly for HUD Hidden state */}
            <Pressable
                style={[styles.focusCatcher, styles.focusCatcherTop]}
                focusable={!isHudVisible}
                onFocus={() => onCatcherFocus('show-hud')}
                onPress={() => onCatcherFocus('show-hud')}
            />
            <Pressable
                style={[styles.focusCatcher, styles.focusCatcherBottom]}
                focusable={!isHudVisible}
                onFocus={() => onCatcherFocus('show-hud')}
                onPress={() => onCatcherFocus('show-hud')}
            />
        </View>
    );
});

const styles = StyleSheet.create({
    focusCatcher: {
        position: 'absolute',
        backgroundColor: 'transparent',
    },
    focusCatcherLeft: {
        width: 100,
        height: '100%',
        left: 0,
    },
    focusCatcherRight: {
        width: 100,
        height: '100%',
        right: 0,
    },
    focusCatcherTop: {
        width: '100%',
        height: 100,
        top: 0,
    },
    focusCatcherBottom: {
        width: '100%',
        height: 100,
        bottom: 0,
    },
    focusTrap: {
        position: 'absolute',
        width: 100,
        height: 100,
        left: '50%',
        top: '50%',
        marginLeft: -50,
        marginTop: -50,
        opacity: 0,
        zIndex: 999,
    },
});

export default TVPlayerFocusLayer;
