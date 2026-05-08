import React, { memo } from 'react';
import { findNodeHandle, Pressable, StyleSheet, View } from 'react-native';

interface TVPlayerFocusLayerProps {
    isLive: boolean;
    controlsLocked: boolean;
    showOverlay: boolean;
    isHudVisible: boolean;
    focusTrapRef: any;
    leftActionRef: any;
    rightActionRef: any;
    horizontalActionOriginRef: any;
    setFocusedElement: (element: string | null) => void;
    showHUD: () => void;
    handleSeekBy: (delta: number) => void;
    handleLiveChannelStep: (delta: number) => void;
    registerHorizontalActionOrigin: (ref: any) => void;
}

const TVPlayerFocusLayer: React.FC<TVPlayerFocusLayerProps> = memo(({
    isLive,
    controlsLocked,
    showOverlay,
    isHudVisible,
    focusTrapRef,
    leftActionRef,
    rightActionRef,
    horizontalActionOriginRef,
    setFocusedElement,
    showHUD,
    handleSeekBy,
    handleLiveChannelStep,
    registerHorizontalActionOrigin,
}) => {
    if (controlsLocked || showOverlay) return null;

    const runHorizontalAction = (direction: -1 | 1) => {
        if (isLive) {
            handleLiveChannelStep(direction);
        } else {
            handleSeekBy(direction * 10);
        }

        requestAnimationFrame(() => {
            horizontalActionOriginRef.current?.current?.focus?.();
        });
    };

    return (
        <View
            style={StyleSheet.absoluteFill}
            pointerEvents={isHudVisible ? 'none' : 'box-none'}
        >
            <Pressable
                ref={focusTrapRef}
                style={styles.focusTrap}
                focusable={!isHudVisible}
                hasTVPreferredFocus={!isHudVisible}
                onFocus={() => {
                    if (!isHudVisible) {
                        registerHorizontalActionOrigin(focusTrapRef);
                        setFocusedElement('focus-trap');
                    }
                }}
                onPress={showHUD}
                {...({
                    nextFocusLeft: findNodeHandle(leftActionRef.current),
                    nextFocusRight: findNodeHandle(rightActionRef.current),
                } as any)}
            />

            <Pressable
                ref={leftActionRef}
                style={styles.actionCatcher}
                focusable
                onFocus={() => runHorizontalAction(-1)}
            />

            <Pressable
                ref={rightActionRef}
                style={styles.actionCatcher}
                focusable
                onFocus={() => runHorizontalAction(1)}
            />
        </View>
    );
});

const styles = StyleSheet.create({
    actionCatcher: {
        position: 'absolute',
        width: 1,
        height: 1,
        opacity: 0,
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
