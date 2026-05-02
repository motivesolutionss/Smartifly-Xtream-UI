import React, { memo } from 'react';
import { findNodeHandle, Pressable, StyleSheet, Text, View } from 'react-native';
import { scale, scaleFont } from '../.././../theme';
import { useTheme } from '../.././../theme/ThemeProvider';
import { typographyTV } from '../.././../theme/typography';

const SEEK_STEP_SECONDS = 10;

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
}

const formatTime = (value: number) => {
    const totalSeconds = Math.max(0, Math.floor(value || 0));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

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
}) => {
    const { colors } = useTheme();
    const progressTime = isScrubbing ? scrubTime : currentTime;
    const progressPercent = duration > 0 ? Math.min(progressTime / duration, 1) : 0;
    const bufferPercent = duration > 0 ? Math.min(playableDuration / duration, 1) : 0;
    const isFocused = focusedElement === 'progress';

    /**
     * Key handler for the progress bar.
     * Left/Right seeks so the remote D-pad works for scrubbing.
     */
    const handleProgressKeyDown = (event: any) => {
        const nativeEvent = event?.nativeEvent;
        const key = nativeEvent?.key;
        const keyCode = nativeEvent?.keyCode;

        const isRight = key === 'ArrowRight' || key === 'Right' || keyCode === 22;
        const isLeft = key === 'ArrowLeft' || key === 'Left' || keyCode === 21;

        if (isRight && handleSeekBy) {
            if (isLive && handleLiveChannelStep) {
                handleLiveChannelStep(1);
            } else {
                handleSeekBy(SEEK_STEP_SECONDS);
            }
            showHUD();
            return;
        }

        if (isLeft && handleSeekBy) {
            if (isLive && handleLiveChannelStep) {
                handleLiveChannelStep(-1);
            } else {
                handleSeekBy(-SEEK_STEP_SECONDS);
            }
            showHUD();
            return;
        }
    };

    return (
        <View style={styles.bottomControls}>
            {/* Progress bar */}
            {!isLive && (
                <Pressable
                    ref={progressPressableRef}
                    focusable={true}
                    onFocus={() => {
                        setFocusedElement('progress');
                        showHUD();
                    }}
                    onBlur={() => setFocusedElement(null)}
                    style={styles.progressContainer}
                    // @ts-ignore – Android TV key events
                    onKeyDown={handleProgressKeyDown}
                    {...({
                        nextFocusUp: findNodeHandle(playPauseRef.current),
                        // Keep Left/Right focus on progress bar so onKeyDown fires for seeking
                        nextFocusLeft: findNodeHandle(progressPressableRef.current),
                        nextFocusRight: findNodeHandle(progressPressableRef.current),
                    } as any)}
                >
                    <View style={[
                        styles.progressTrack,
                        isFocused && styles.progressTrackFocused,
                        { backgroundColor: colors.borderMedium },
                        isFocused && { backgroundColor: colors.borderMedium },
                    ]}>
                        <View style={[styles.progressBuffered, { width: `${bufferPercent * 100}%` }]} />
                        <View style={[styles.progressPlayed, { width: `${progressPercent * 100}%`, backgroundColor: colors.primary }]} />
                    </View>
                    {/* Thumb */}
                    <View style={[
                        styles.progressThumb,
                        { left: `${progressPercent * 100}%`, backgroundColor: colors.accent },
                        isFocused && styles.progressThumbFocused,
                        isFocused && { backgroundColor: colors.accent },
                    ]} />
                    {/* Scrub time popup */}
                    {isScrubbing && (
                        <View style={[styles.scrubTimeBubble, { left: `${progressPercent * 100}%` }]}>
                            <Text style={styles.scrubTimeText}>{formatTime(scrubTime)}</Text>
                        </View>
                    )}
                </Pressable>
            )}

            {/* Time row */}
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
                    <Text style={[styles.timeTextRemaining, { color: colors.textSecondary }]}>-{formatTime(Math.max(duration - progressTime, 0))}</Text>
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
        backgroundColor: 'rgba(255,255,255,0.2)', // overridden at render time with theme.colors.borderMedium
        borderRadius: scale(2),
        overflow: 'hidden',
    },
    progressTrackFocused: {
        height: scale(7),
        backgroundColor: 'rgba(255,255,255,0.25)', // overridden at render time with theme.colors.borderMedium
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
        backgroundColor: '#E50914', // overridden at render time with theme.colors.primary
    },
    progressThumb: {
        position: 'absolute',
        width: scale(14),
        height: scale(14),
        borderRadius: scale(7),
        backgroundColor: '#E50914', // overridden at render time with theme.colors.accent
        marginLeft: scale(-7),
    },
    progressThumbFocused: {
        width: scale(20),
        height: scale(20),
        borderRadius: scale(10),
        marginLeft: scale(-10),
        backgroundColor: '#FFFFFF', // overridden at render time with theme.colors.accent (white in default theme)
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
        color: '#999999', // overridden at render time with theme.colors.textSecondary
        fontSize: typographyTV.labelSmall.fontSize,
        fontWeight: typographyTV.labelSmall.fontWeight,
    },
    timeTextRemaining: {
        color: '#999999', // overridden at render time with theme.colors.textSecondary
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
        letterSpacing: 1.2,
    },
});

export default TVPlayerBottomControls;
