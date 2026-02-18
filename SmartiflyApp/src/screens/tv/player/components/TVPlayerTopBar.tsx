import React, { memo } from 'react';
import { findNodeHandle, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, scale, scaleFont, Icon } from '../../../../theme';

interface TVPlayerTopBarProps {
    navigation: any;
    item: any;
    type: string;
    focusedElement: string | null;
    setFocusedElement: (element: string | null) => void;
    setControlsLocked: (locked: boolean) => void;
    setShowStats: (show: (prev: boolean) => boolean) => void;
    setShowSettings: (show: boolean) => void;
    showHUD: () => void;
    isHudVisible: boolean;
    backButtonRef: any;
    lockButtonRef: any;
    playPauseRef: any;
}

const TVPlayerTopBar: React.FC<TVPlayerTopBarProps> = memo(({
    navigation,
    item,
    type,
    focusedElement,
    setFocusedElement,
    setControlsLocked,
    setShowStats,
    setShowSettings,
    showHUD,
    isHudVisible,
    backButtonRef,
    lockButtonRef,
    playPauseRef,
}) => {
    // If the HUD isn't visible, we don't want this layer capturing focus at all
    if (!isHudVisible) return null;

    return (
        <View style={styles.topBar}>
            <Pressable
                ref={backButtonRef}
                style={[
                    styles.topButton,
                    focusedElement === 'back' && styles.topButtonFocused
                ]}
                onPress={() => navigation.goBack()}
                onFocus={() => {
                    setFocusedElement('back');
                    showHUD();
                }}
                onBlur={() => setFocusedElement(null)}
                {...({
                    nextFocusRight: findNodeHandle(lockButtonRef.current),
                    nextFocusDown: findNodeHandle(playPauseRef.current)
                } as any)}
            >
                <Icon name="back" size={scale(28)} color={colors.textPrimary} />
            </Pressable>

            <View style={styles.titleBlock}>
                <Text style={styles.title} numberOfLines={1}>{item?.name}</Text>
                {type === 'series' && (item as any)?.episodeTitle ? (
                    <Text style={styles.subtitle} numberOfLines={1}>{(item as any)?.episodeTitle}</Text>
                ) : null}
            </View>

            <View style={styles.topActions}>
                <Pressable
                    ref={lockButtonRef}
                    style={[
                        styles.topButton,
                        focusedElement === 'lock' && styles.topButtonFocused
                    ]}
                    onPress={() => setControlsLocked(true)}
                    onFocus={() => {
                        setFocusedElement('lock');
                        showHUD();
                    }}
                    onBlur={() => setFocusedElement(null)}
                    {...({
                        nextFocusLeft: findNodeHandle(backButtonRef.current),
                        nextFocusRight: findNodeHandle(playPauseRef.current),
                        nextFocusDown: findNodeHandle(playPauseRef.current)
                    } as any)}
                >
                    <Icon name="lock" size={scale(28)} color={colors.textPrimary} />
                </Pressable>
                <Pressable
                    style={[
                        styles.topButton,
                        focusedElement === 'info' && styles.topButtonFocused
                    ]}
                    onPress={() => setShowStats(prev => !prev)}
                    onFocus={() => {
                        setFocusedElement('info');
                        showHUD();
                    }}
                    onBlur={() => setFocusedElement(null)}
                    {...({
                        nextFocusDown: findNodeHandle(playPauseRef.current)
                    } as any)}
                >
                    <Icon name="info" size={scale(28)} color={colors.textPrimary} />
                </Pressable>
                <Pressable
                    style={[
                        styles.topButton,
                        focusedElement === 'settings' && styles.topButtonFocused
                    ]}
                    onPress={() => setShowSettings(true)}
                    onFocus={() => {
                        setFocusedElement('settings');
                        showHUD();
                    }}
                    onBlur={() => setFocusedElement(null)}
                    {...({
                        nextFocusDown: playPauseRef
                    } as any)}
                >
                    <Icon name="settings" size={scale(28)} color={colors.textPrimary} />
                </Pressable>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: scale(24),
        paddingHorizontal: scale(20),
        paddingTop: scale(20),
    },
    topButton: {
        backgroundColor: 'rgba(255,255,255,0.12)',
        padding: scale(12),
        borderRadius: scale(12),
        borderWidth: 2,
        borderColor: 'transparent',
    },
    topButtonFocused: {
        borderColor: colors.primary,
        backgroundColor: 'rgba(255,255,255,0.25)',
    },
    titleBlock: {
        flex: 1,
        marginHorizontal: scale(16),
    },
    title: {
        color: colors.textPrimary,
        fontSize: scaleFont(26),
        fontWeight: '600',
    },
    subtitle: {
        color: colors.textSecondary,
        fontSize: scaleFont(18),
        marginTop: scale(4),
    },
    topActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(14),
    },
});

export default TVPlayerTopBar;
