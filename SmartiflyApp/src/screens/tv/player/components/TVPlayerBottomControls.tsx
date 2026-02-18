import React, { memo } from 'react';
import { findNodeHandle, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, scale, scaleFont } from '../../../../theme';

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
    setProgressBarWidth: (width: number) => void;
    panResponder: any;
    playPauseRef?: any;
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
    setProgressBarWidth,
    panResponder,
    playPauseRef,
}) => {
    const progressTime = isScrubbing ? scrubTime : currentTime;
    const progressPercent = duration > 0 ? Math.min(progressTime / duration, 1) : 0;
    const bufferPercent = duration > 0 ? Math.min(playableDuration / duration, 1) : 0;

    return (
        <View style={styles.bottomControls}>
            <View style={styles.timeRow}>
                {isLive ? (
                    <View style={styles.liveBadge}>
                        <Text style={styles.liveBadgeText}>LIVE</Text>
                    </View>
                ) : (
                    <Text style={styles.timeText}>{formatTime(progressTime)}</Text>
                )}
                {!isLive && (
                    <Text style={styles.timeText}>-{formatTime(Math.max(duration - progressTime, 0))}</Text>
                )}
            </View>

            {!isLive && (
                <Pressable
                    ref={progressPressableRef}
                    focusable={true}
                    onFocus={() => {
                        setFocusedElement('progress');
                        showHUD();
                    }}
                    onBlur={() => setFocusedElement(null)}
                    style={[
                        styles.progressContainer,
                        focusedElement === 'progress' && styles.progressContainerFocused
                    ]}
                    onLayout={(event) => setProgressBarWidth(event.nativeEvent.layout.width)}
                    {...panResponder.panHandlers}
                    {...({
                        nextFocusUp: findNodeHandle(playPauseRef.current)
                    } as any)}
                >
                    <View style={[
                        styles.progressTrack,
                        focusedElement === 'progress' && styles.progressTrackFocused
                    ]}>
                        <View style={[styles.progressBuffered, { width: `${bufferPercent * 100}%` }]} />
                        <View style={[styles.progressPlayed, { width: `${progressPercent * 100}%` }]} />
                    </View>
                    <View style={[
                        styles.progressThumb,
                        { left: `${progressPercent * 100}%` },
                        focusedElement === 'progress' && styles.progressThumbFocused
                    ]} />
                    {isScrubbing && (
                        <View style={styles.scrubTimeBubble}>
                            <Text style={styles.scrubTimeText}>{formatTime(scrubTime)}</Text>
                        </View>
                    )}
                </Pressable>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    bottomControls: {
        gap: scale(12),
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    timeText: {
        color: colors.textPrimary,
        fontSize: scaleFont(18),
    },
    progressContainer: {
        height: scale(48),
        justifyContent: 'center',
        paddingHorizontal: scale(10),
    },
    progressContainerFocused: {
    },
    progressTrack: {
        height: scale(6),
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: scale(3),
        overflow: 'hidden',
    },
    progressTrackFocused: {
        height: scale(10),
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    progressBuffered: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.35)',
    },
    progressPlayed: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: colors.primary,
    },
    progressThumb: {
        position: 'absolute',
        width: scale(14),
        height: scale(14),
        borderRadius: scale(7),
        backgroundColor: colors.primary,
        marginLeft: scale(-7),
    },
    progressThumbFocused: {
        width: scale(22),
        height: scale(22),
        borderRadius: scale(11),
        marginLeft: scale(-11),
        backgroundColor: '#FFF',
        elevation: 10,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 10,
    },
    scrubTimeBubble: {
        position: 'absolute',
        top: scale(-28),
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: scale(12),
        paddingVertical: scale(6),
        borderRadius: scale(10),
    },
    scrubTimeText: {
        color: colors.textPrimary,
        fontSize: scaleFont(14),
    },
    liveBadge: {
        backgroundColor: colors.primary,
        paddingHorizontal: scale(12),
        paddingVertical: scale(6),
        borderRadius: scale(6),
    },
    liveBadgeText: {
        color: colors.textPrimary,
        fontSize: scaleFont(16),
        fontWeight: '700',
    },
});

export default TVPlayerBottomControls;
