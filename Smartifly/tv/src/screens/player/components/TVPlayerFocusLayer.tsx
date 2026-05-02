import React, { memo, useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

const SEEK_STEP_SECONDS = 15;

interface TVPlayerFocusLayerProps {
    isLive: boolean;
    controlsLocked: boolean;
    showOverlay: boolean;
    isHudVisible: boolean;
    focusTrapRef: any;
    setFocusedElement: (element: string | null) => void;
    showHUD: () => void;
    handleSeekBy: (delta: number) => void;
    handleLiveChannelStep: (delta: number) => void;
    progressPressableRef: any;
    playPauseRef: any;
    focusedElement: string | null;
}

const TVPlayerFocusLayer: React.FC<TVPlayerFocusLayerProps> = memo(({
    isLive,
    controlsLocked,
    showOverlay,
    isHudVisible,
    focusTrapRef,
    setFocusedElement,
    showHUD,
    handleSeekBy,
    handleLiveChannelStep,
    progressPressableRef: _progressPressableRef,
    playPauseRef,
    focusedElement: _focusedElement,
}) => {
    const timeoutRefs = useRef<Array<ReturnType<typeof setTimeout>>>([]);

    useEffect(() => () => {
        timeoutRefs.current.forEach(clearTimeout);
        timeoutRefs.current = [];
    }, []);

    const scheduleTimeout = useCallback((callback: () => void, delay: number) => {
        const timeoutId = setTimeout(() => {
            timeoutRefs.current = timeoutRefs.current.filter((item) => item !== timeoutId);
            callback();
        }, delay);
        timeoutRefs.current.push(timeoutId);
    }, []);

    if (controlsLocked || showOverlay) return null;

    /**
     * Key handler for the focus trap (HUD hidden state).
     * Left/Right → seek / channel step.
     * OK → show HUD.
     */
    const handleTrapKeyDown = (event: any) => {
        if (isHudVisible) return;

        const nativeEvent = event?.nativeEvent;
        const key = nativeEvent?.key;
        const keyCode = nativeEvent?.keyCode;

        const isRight = key === 'ArrowRight' || key === 'Right' || keyCode === 22;
        const isLeft = key === 'ArrowLeft' || key === 'Left' || keyCode === 21;

        if (isRight) {
            if (isLive) {
                handleLiveChannelStep(1);
            } else {
                handleSeekBy(SEEK_STEP_SECONDS);
            }
            return;
        }

        if (isLeft) {
            if (isLive) {
                handleLiveChannelStep(-1);
            } else {
                handleSeekBy(-SEEK_STEP_SECONDS);
            }
            return;
        }
    };

    const refocusTrap = () => {
        scheduleTimeout(() => {
            focusTrapRef.current?.focus?.();
        }, 0);
    };

    /**
     * Edge-catcher onFocus handler.
     * When the D-pad moves focus to a catcher, we perform the seek action and
     * immediately return focus to the central trap so that repeated presses
     * keep working.
     */
    const onCatcherFocus = (action: 'seek-rewind' | 'seek-forward' | 'show-hud') => {
        if (!isHudVisible) {
            if (action === 'seek-rewind') {
                if (isLive) {
                    handleLiveChannelStep(-1);
                } else {
                    handleSeekBy(-SEEK_STEP_SECONDS);
                }
                refocusTrap();
            } else if (action === 'seek-forward') {
                if (isLive) {
                    handleLiveChannelStep(1);
                } else {
                    handleSeekBy(SEEK_STEP_SECONDS);
                }
                refocusTrap();
            }
        }
    };

    return (
        <View
            style={StyleSheet.absoluteFill}
            pointerEvents={isHudVisible ? 'none' : 'box-none'}
        >
            {/* Centered Focus Trap — Only active when HUD hidden */}
            <Pressable
                ref={focusTrapRef}
                style={styles.focusTrap}
                focusable={!isHudVisible}
                hasTVPreferredFocus={!isHudVisible}
                // @ts-ignore – Android TV key events
                onKeyDown={handleTrapKeyDown}
                onFocus={() => {
                    if (!isHudVisible) setFocusedElement('focus-trap');
                }}
                onPress={() => {
                    showHUD();
                    scheduleTimeout(() => playPauseRef.current?.focus(), 50);
                }}
            />

            {/* Left edge catcher — seeks backward when focus lands here */}
            <Pressable
                style={[styles.focusCatcher, styles.focusCatcherLeft]}
                focusable={!isHudVisible}
                onFocus={() => onCatcherFocus('seek-rewind')}
                // @ts-ignore
                onKeyDown={handleTrapKeyDown}
                onPress={() => {
                    showHUD();
                    scheduleTimeout(() => playPauseRef.current?.focus(), 50);
                }}
            />
            {/* Right edge catcher — seeks forward when focus lands here */}
            <Pressable
                style={[styles.focusCatcher, styles.focusCatcherRight]}
                focusable={!isHudVisible}
                onFocus={() => onCatcherFocus('seek-forward')}
                // @ts-ignore
                onKeyDown={handleTrapKeyDown}
                onPress={() => {
                    showHUD();
                    scheduleTimeout(() => playPauseRef.current?.focus(), 50);
                }}
            />

            {/* Top/Bottom catchers */}
            <Pressable
                style={[styles.focusCatcher, styles.focusCatcherTop]}
                focusable={!isHudVisible}
                onFocus={() => onCatcherFocus('show-hud')}
                onPress={() => {
                    showHUD();
                    scheduleTimeout(() => playPauseRef.current?.focus(), 50);
                }}
            />
            <Pressable
                style={[styles.focusCatcher, styles.focusCatcherBottom]}
                focusable={!isHudVisible}
                onFocus={() => onCatcherFocus('show-hud')}
                onPress={() => {
                    showHUD();
                    scheduleTimeout(() => playPauseRef.current?.focus(), 50);
                }}
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
        opacity: 0.01,
        zIndex: 999,
    },
});

export default TVPlayerFocusLayer;
