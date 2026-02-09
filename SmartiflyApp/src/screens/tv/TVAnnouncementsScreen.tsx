/**
 * TV Announcements Screen
 *
 * Displays backend announcements in a TV-optimized list.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Pressable,
    StatusBar,
} from 'react-native';
import { colors, scale, scaleFont } from '../../theme';
import TVLoadingState from './components/TVLoadingState';
import { TVAnnouncementsScreenProps } from '../../navigation/types';
import useStore from '../../store';

interface Announcement {
    id: string;
    title: string;
    content: string;
    createdAt?: string;
    type?: string;
    priority?: string;
    isBroadcast?: boolean;
}


const TVAnnouncementsScreen: React.FC<TVAnnouncementsScreenProps> = ({ focusEntryRef }) => {
    const announcements = useStore((state) => state.announcements) as Announcement[];
    const isLoading = useStore((state) => state.announcementsLoading);
    const error = useStore((state) => state.announcementsError);
    const fetchAnnouncements = useStore((state) => state.fetchAnnouncements);
    const [focusedId, setFocusedId] = useState<string | null>(null);
    const fatherControl = useStore((state) => state.fatherControl);

    const formatDate = useCallback((dateString?: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    }, []);

    const sanitizeContent = useCallback((value?: string) => {
        if (!value) return '';
        return value
            .replace(/<[^>]*>/g, ' ')
            .replace(/&nbsp;/gi, ' ')
            .replace(/&amp;/gi, '&')
            .replace(/&quot;/gi, '"')
            .replace(/&#39;/gi, "'")
            .replace(/\s+/g, ' ')
            .trim();
    }, []);

    const refreshAnnouncements = useCallback(() => {
        fetchAnnouncements({ force: true });
    }, [fetchAnnouncements]);

    useEffect(() => {
        fetchAnnouncements();
    }, [fetchAnnouncements]);

    const listEmpty = useMemo(() => {
        if (isLoading) {
            return (
                <TVLoadingState style={styles.emptyState} />
            );
        }

        if (error) {
            return (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>{error}</Text>
                    <Pressable
                        onPress={refreshAnnouncements}
                        ref={focusEntryRef}
                        style={styles.retryButton}
                    >
                        <Text style={styles.retryText}>Try Again</Text>
                    </Pressable>
                </View>
            );
        }

        return (
            <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No announcements</Text>
            </View>
        );
    }, [error, fetchAnnouncements, isLoading, focusEntryRef]);

    const combinedAnnouncements = useMemo<Announcement[]>(() => {
        const broadcasts = (fatherControl.broadcasts || []).map((b: any) => ({
            id: `broadcast_${b.id}`,
            title: b.title || 'SYSTEM BROADCAST',
            content: b.message || b.content,
            createdAt: b.createdAt,
            type: b.type,
            priority: 'HIGH',
            isBroadcast: true,
        }));
        return [...broadcasts, ...announcements];
    }, [announcements, fatherControl.broadcasts]);

    const renderItem = ({ item, index }: { item: Announcement; index: number }) => {
        const isFocused = focusedId === item.id;

        return (
            <Pressable
                ref={index === 0 ? focusEntryRef : undefined}
                onFocus={() => setFocusedId(item.id)}
                onBlur={() => setFocusedId(null)}
                style={[styles.card, isFocused && styles.cardFocused]}
            >
                <View style={styles.cardHeader}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
                </View>
                <Text style={styles.body}>{sanitizeContent(item.content)}</Text>
                {(item.type || item.priority) && (
                    <View style={styles.metaRow}>
                        {item.type && <Text style={styles.metaTag}>{item.type}</Text>}
                        {item.priority && <Text style={styles.metaTag}>{item.priority}</Text>}
                    </View>
                )}
            </Pressable>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar hidden />
            <Text style={styles.screenTitle}>Announcements</Text>
            <FlatList
                data={combinedAnnouncements}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={listEmpty}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: scale(40),
        paddingHorizontal: scale(40),
    },
    screenTitle: {
        fontSize: scaleFont(36),
        color: colors.textPrimary || '#FFF',
        fontWeight: '700',
        marginBottom: scale(20),
    },
    listContent: {
        paddingBottom: scale(40),
    },
    card: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: scale(12),
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        padding: scale(20),
        marginBottom: scale(16),
    },
    cardFocused: {
        borderColor: colors.accent || '#00E5FF',
        backgroundColor: 'rgba(0, 229, 255, 0.08)',
        transform: [{ scale: 1.01 }],
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: scale(12),
    },
    title: {
        flex: 1,
        color: colors.textPrimary || '#FFF',
        fontSize: scaleFont(22),
        fontWeight: '600',
        marginRight: scale(12),
    },
    date: {
        color: colors.textMuted || '#AAA',
        fontSize: scaleFont(16),
    },
    body: {
        color: colors.textSecondary || '#CCC',
        fontSize: scaleFont(18),
        lineHeight: scaleFont(26),
    },
    metaRow: {
        flexDirection: 'row',
        gap: scale(10),
        marginTop: scale(12),
    },
    metaTag: {
        color: colors.textPrimary || '#FFF',
        fontSize: scaleFont(14),
        paddingVertical: scale(4),
        paddingHorizontal: scale(10),
        borderRadius: scale(6),
        backgroundColor: 'rgba(255,255,255,0.12)',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    emptyState: {
        alignItems: 'center',
        paddingTop: scale(80),
    },
    emptyText: {
        color: colors.textMuted || '#AAA',
        fontSize: scaleFont(18),
        marginBottom: scale(16),
    },
    retryButton: {
        paddingHorizontal: scale(20),
        paddingVertical: scale(10),
        borderRadius: scale(8),
        backgroundColor: colors.primary || '#E50914',
    },
    retryText: {
        color: '#FFF',
        fontSize: scaleFont(16),
        fontWeight: '600',
    },
});

export default TVAnnouncementsScreen;
