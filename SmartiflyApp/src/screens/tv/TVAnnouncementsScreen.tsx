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
    ActivityIndicator,
} from 'react-native';
import { colors, scale, scaleFont } from '../../theme';
import { getAnnouncements } from '../../api/backend';
import { logger } from '../../config';

interface Announcement {
    id: string;
    title: string;
    content: string;
    createdAt?: string;
    type?: string;
    priority?: string;
}

const TVAnnouncementsScreen: React.FC = () => {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

    const fetchAnnouncements = useCallback(async () => {
        setError(null);
        setIsLoading(true);
        try {
            const response = await getAnnouncements({ status: 'PUBLISHED' });
            if (Array.isArray(response)) {
                setAnnouncements(response);
            } else {
                setAnnouncements([]);
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load announcements';
            logger.error('TV: Failed to load announcements', err);
            setError(errorMessage);
            setAnnouncements([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAnnouncements();
    }, [fetchAnnouncements]);

    const listEmpty = useMemo(() => {
        if (isLoading) {
            return (
                <View style={styles.emptyState}>
                    <ActivityIndicator color={colors.primary} />
                </View>
            );
        }

        if (error) {
            return (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>{error}</Text>
                    <Pressable
                        onPress={fetchAnnouncements}
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
    }, [error, fetchAnnouncements, isLoading]);

    const renderItem = ({ item }: { item: Announcement }) => (
        <View style={styles.card}>
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
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar hidden />
            <Text style={styles.screenTitle}>Announcements</Text>
            <FlatList
                data={announcements}
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
