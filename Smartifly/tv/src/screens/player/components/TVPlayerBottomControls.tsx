import React, { memo } from 'react';
import { findNodeHandle, Pressable, StyleSheet, Text, View } from 'react-native';
import { scale, scaleFont } from '../.././../theme';
import { useTheme } from '../.././../theme/ThemeProvider';
import { typographyTV } from '../.././../theme/typography';
import { formatTime } from '../playerUtils';

interface TVPlayerBottomControlsProps {
    isLive: boolean;
    duration: number;
    currentTime: number;
    playableDuration: number;
    isScrubbing: boolean;
    scrubTime: number;
    focusedElement: string | null;
    setFocusedElement: (element: string | null) => void;
    showHUD: () => void;
    progressPressableRef: any;
    playPauseRef?: any;
    handleSeekBy?: (delta: number) => void;
    handleLiveChannelStep?: (delta: number) => void;
    leftActionRef?: any;
    rightActionRef?: any;
    registerHorizontalActionOrigin: (ref: any) => void;
}

const TVPlayerBottomControls: React.FC<TVPlayerBottomControlsProps> = memo(({
    isLive,
    duration,
    currentTime,
    playableDuration,
    isScrubbing,
    scrubTime,
    focusedElement,
    setFocusedElement,
    showHUD,
    progressPressableRef,
    playPauseRef,
    handleSeekBy,
    handleLiveChannelStep,
    leftActionRef,
    rightActionRef,
    registerHorizontalActionOrigin,
}) => {
    const { colors } = useTheme();
    const progressTime = isScrubbing ? scrubTime : currentTime;
    const progressPercent = duration > 0 ? Math.min(progressTime / duration, 1) : 0;
    const bufferPercent = duration > 0 ? Math.min(playableDuration / duration, 1) : 0;
    const isFocused = focusedElement === 'progress';

    return (
        <View style={styles.bottomControls}>
            {!isLive && (
                <Pressable
                    ref={progressPressableRef}
                    focusable
                    onFocus={() => {
                        registerHorizontalActionOrigin(progressPressableRef);
                        setFocusedElement('progress');
                        showHUD();
                    }}
                    onBlur={() => setFocusedElement(null)}
                    style={styles.progressContainer}
                    {...({
                        nextFocusUp: findNodeHandle(playPauseRef.current),
                        nextFocusLeft: findNodeHandle(leftActionRef.current),
                        nextFocusRight: findNodeHandle(rightActionRef.current),
                    } as any)}
                >
                    <View
                        style={[
                            styles.progressTrack,
                            { backgroundColor: colors.borderMedium },
                            isFocused && styles.progressTrackFocused,
                        ]}
                    >
                        <View style={[styles.progressBuffered, { width: `${bufferPercent * 100}%` }]} />
                        <View
                            style={[
                                styles.progressPlayed,
                                { width: `${progressPercent * 100}%`, backgroundColor: colors.primary },
                            ]}
                        />
                    </View>
                    <View
                        style={[
                            styles.progressThumb,
                            { left: `${progressPercent * 100}%`, backgroundColor: colors.accent },
                            isFocused && styles.progressThumbFocused,
                        ]}
                    />
                    {isScrubbing && (
                        <View style={[styles.scrubTimeBubble, { left: `${progressPercent * 100}%` }]}>
                            <Text style={styles.scrubTimeText}>{formatTime(scrubTime)}</Text>
                        </View>
                    )}
                </Pressable>
            )}

            <View style={styles.timeRow}>
                {isLive ? (
                    <View style={styles.liveBadge}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveBadgeText}>LIVE</Text>
                    </View>
                ) : (
                    <Text style={[styles.timeText, { color: colors.textSecondary }]}>{formatTime(progressTime)}</Text>
                )}
                {!isLive && (
                    <Text style={[styles.timeTextRemaining, { color: colors.textSecondary }]}>
                        -{formatTime(Math.max(duration - progressTime, 0))}
                    </Text>
                )}
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    bottomControls: {
        gap: scale(6),
    },
    progressContainer: {
        height: scale(40),
        justifyContent: 'center',
        paddingHorizontal: scale(4),
    },
    progressTrack: {
        height: scale(4),
        borderRadius: scale(2),
        overflow: 'hidden',
    },
    progressTrackFocused: {
        height: scale(7),
    },
    progressBuffered: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.4)',
    },
    progressPlayed: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
    },
    progressThumb: {
        position: 'absolute',
        width: scale(14),
        height: scale(14),
        borderRadius: scale(7),
        marginLeft: scale(-7),
    },
    progressThumbFocused: {
        width: scale(20),
        height: scale(20),
        borderRadius: scale(10),
        marginLeft: scale(-10),
        elevation: 2,
        shadowColor: '#E50914',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    scrubTimeBubble: {
        position: 'absolute',
        top: scale(-34),
        marginLeft: scale(-30),
        backgroundColor: 'rgba(0,0,0,0.85)',
        paddingHorizontal: scale(14),
        paddingVertical: scale(6),
        borderRadius: scale(6),
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    scrubTimeText: {
        color: '#FFFFFF',
        fontSize: scaleFont(15),
        fontWeight: '600',
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scale(4),
    },
    timeText: {
        fontSize: typographyTV.labelSmall.fontSize,
        fontWeight: typographyTV.labelSmall.fontWeight,
    },
    timeTextRemaining: {
        fontSize: typographyTV.labelSmall.fontSize,
        fontWeight: typographyTV.labelSmall.fontWeight,
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(6),
        backgroundColor: 'rgba(229, 9, 20, 0.9)',
        paddingHorizontal: scale(12),
        paddingVertical: scale(5),
        borderRadius: scale(4),
    },
    liveDot: {
        width: scale(8),
        height: scale(8),
        borderRadius: scale(4),
        backgroundColor: '#FFFFFF',
    },
    liveBadgeText: {
        color: '#FFFFFF',
        fontSize: scaleFont(14),
        fontWeight: '800',
    },
});

export default TVPlayerBottomControls;
