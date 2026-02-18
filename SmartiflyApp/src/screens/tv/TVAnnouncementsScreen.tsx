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
    // 1. Store hooks (Always at top, order preserved from original as much as possible)
    const announcements = useStore((state) => state.announcements) as Announcement[];
    const isLoading = useStore((state) => state.announcementsLoading);
    const error = useStore((state) => state.announcementsError);
    const fetchAnnouncements = useStore((state) => state.fetchAnnouncements);
    const fatherControl = useStore((state) => state.fatherControl);

    // 2. State hooks
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [focusedCategory, setFocusedCategory] = useState<string | null>(null);
    const [focusedId, setFocusedId] = useState<string | null>(null);

    // =========================================================================
    // DATA PROCESSING (Memoized to prevent unnecessary re-calculatios/renders)
    // =========================================================================

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
    }, [announcements, fatherControl?.broadcasts]);

    const categories = useMemo(() => {
        const systemCount = combinedAnnouncements.filter(a => a.isBroadcast).length;
        const criticalCount = combinedAnnouncements.filter(a =>
            a.priority === 'HIGH' || a.priority === 'URGENT' || a.type === 'EMERGENCY'
        ).length;
        const generalCount = combinedAnnouncements.filter(a => !a.isBroadcast).length;

        return [
            { id: 'all', label: 'All Announcements', icon: 'megaphone', count: combinedAnnouncements.length },
            { id: 'system', label: 'System Messages', icon: 'shield-check', count: systemCount },
            { id: 'critical', label: 'Critical Alerts', icon: 'warning', count: criticalCount },
            { id: 'general', label: 'General Info', icon: 'info', count: generalCount },
        ];
    }, [combinedAnnouncements]);

    const filteredAnnouncements = useMemo(() => {
        switch (selectedCategory) {
            case 'system':
                return combinedAnnouncements.filter(a => a.isBroadcast);
            case 'critical':
                return combinedAnnouncements.filter(a =>
                    a.priority === 'HIGH' || a.priority === 'URGENT' || a.type === 'EMERGENCY'
                );
            case 'general':
                return combinedAnnouncements.filter(a => !a.isBroadcast);
            default:
                return combinedAnnouncements;
        }
    }, [combinedAnnouncements, selectedCategory]);

    // =========================================================================
    // EFFECTS & HANDLERS
    // =========================================================================

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

    useEffect(() => {
        fetchAnnouncements();
    }, [fetchAnnouncements]);

    // =========================================================================
    // RENDERERS
    // =========================================================================

    const renderCategoryItem = ({ item }: { item: any }) => {
        const isSelected = selectedCategory === item.id;
        const isFocused = focusedCategory === item.id;
        const isFirst = item.id === categories[0].id;

        return (
            <Pressable
                ref={isFirst ? focusEntryRef : undefined}
                onPress={() => {
                    setSelectedCategory(item.id);
                }}
                onFocus={() => {
                    setFocusedCategory(item.id);
                }}
                onBlur={() => setFocusedCategory(null)}
                style={[
                    styles.categoryItem,
                    isSelected && styles.categoryItemActive,
                    isFocused && styles.categoryItemFocused,
                ]}
            >
                <View style={styles.categoryItemInner}>
                    <Text style={[
                        styles.categoryLabel,
                        isSelected && styles.categoryLabelActive,
                        isFocused && styles.categoryLabelFocused,
                    ]}>
                        {item.label}
                    </Text>
                    {item.count > 0 && (
                        <View style={[
                            styles.categoryBadge,
                            isSelected && styles.categoryBadgeActive
                        ]}>
                            <Text style={[
                                styles.categoryBadgeText,
                                isSelected && styles.categoryBadgeTextActive
                            ]}>
                                {item.count}
                            </Text>
                        </View>
                    )}
                </View>
                {isSelected && <View style={styles.selectedIndicator} />}
            </Pressable>
        );
    };

    const renderAnnouncementItem = ({ item }: { item: Announcement; index: number }) => {
        const isFocused = focusedId === item.id;

        return (
            <Pressable
                onFocus={() => {
                    setFocusedId(item.id);
                }}
                onBlur={() => setFocusedId(null)}
                style={[styles.card, isFocused && styles.cardFocused]}
            >
                <View style={styles.cardHeader}>
                    <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
                </View>
                <Text style={styles.body}>{sanitizeContent(item.content)}</Text>
                <View style={styles.metaRow}>
                    {item.isBroadcast && (
                        <View style={[styles.statusTag, { backgroundColor: colors.primary + '30' }]}>
                            <Text style={[styles.statusTagText, { color: colors.primary }]}>SYSTEM</Text>
                        </View>
                    )}
                    {item.type && (
                        <View style={styles.statusTag}>
                            <Text style={styles.statusTagText}>{item.type}</Text>
                        </View>
                    )}
                    {item.priority && (
                        <View style={[
                            styles.statusTag,
                            (item.priority === 'HIGH' || item.priority === 'URGENT') && { backgroundColor: '#FF525220' }
                        ]}>
                            <Text style={[
                                styles.statusTagText,
                                (item.priority === 'HIGH' || item.priority === 'URGENT') && { color: '#FF5252' }
                            ]}>
                                {item.priority}
                            </Text>
                        </View>
                    )}
                </View>
            </Pressable>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar hidden />

            {/* Left Sidebar: Categories */}
            <View style={styles.sidebar}>
                <View style={styles.titleContainer}>
                    <Text style={styles.screenTitle}>ANNOUNCEMENTS</Text>
                    <View style={styles.titleLine} />
                </View>

                <FlatList
                    data={categories}
                    renderItem={renderCategoryItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.categoryList}
                    showsVerticalScrollIndicator={false}
                />
            </View>

            {/* Right Panel: Announcements List */}
            <View style={styles.content}>
                {isLoading ? (
                    <TVLoadingState style={styles.centerBox} />
                ) : error ? (
                    <View style={styles.centerBox}>
                        <Text style={styles.emptyText}>{error}</Text>
                    </View>
                ) : filteredAnnouncements.length === 0 ? (
                    <View style={styles.centerBox}>
                        <Text style={styles.emptyText}>No messages in this category</Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredAnnouncements}
                        renderItem={renderAnnouncementItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: colors.background,
    },
    // Sidebar
    sidebar: {
        width: scale(320),
        borderRightWidth: 1,
        borderRightColor: 'rgba(255,255,255,0.05)',
        paddingTop: scale(40),
        paddingHorizontal: scale(30),
    },
    titleContainer: {
        marginBottom: scale(40),
        paddingLeft: scale(10),
    },
    screenTitle: {
        fontSize: scaleFont(22),
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 2,
    },
    titleLine: {
        height: scale(3),
        width: scale(40),
        backgroundColor: colors.primary,
        marginTop: scale(10),
        borderRadius: 2,
    },
    categoryList: {
        paddingBottom: scale(20),
    },
    categoryItem: {
        paddingVertical: scale(16),
        paddingHorizontal: scale(20),
        borderRadius: scale(12),
        marginBottom: scale(10),
        borderWidth: 1,
        borderColor: 'transparent',
    },
    categoryItemActive: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    categoryItemFocused: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
        transform: [{ scale: 1.05 }],
    },
    categoryItemInner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    categoryLabel: {
        fontSize: scaleFont(18),
        color: 'rgba(255,255,255,0.5)',
        fontWeight: '600',
    },
    categoryLabelActive: {
        color: '#FFF',
        fontWeight: '700',
    },
    categoryLabelFocused: {
        color: '#FFF',
        fontWeight: '800',
    },
    categoryBadge: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: scale(8),
        paddingVertical: scale(2),
        borderRadius: scale(6),
    },
    categoryBadgeActive: {
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    categoryBadgeText: {
        fontSize: scaleFont(12),
        color: 'rgba(255,255,255,0.4)',
        fontWeight: '700',
    },
    categoryBadgeTextActive: {
        color: '#FFF',
    },
    selectedIndicator: {
        position: 'absolute',
        left: -scale(30),
        top: '50%',
        marginTop: -scale(10),
        width: scale(4),
        height: scale(20),
        backgroundColor: colors.primary,
        borderTopRightRadius: 2,
        borderBottomRightRadius: 2,
    },

    // Content Panel
    content: {
        flex: 1,
        paddingTop: scale(40),
        paddingHorizontal: scale(60),
    },
    listContent: {
        paddingBottom: scale(80),
    },
    centerBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: scale(16),
        padding: scale(24),
        marginBottom: scale(20),
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    cardFocused: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderColor: colors.primary,
        transform: [{ scale: 1.02 }],
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: scale(15),
    },
    title: {
        flex: 1,
        fontSize: scaleFont(24),
        fontWeight: '700',
        color: '#FFF',
        marginRight: scale(20),
    },
    date: {
        fontSize: scaleFont(14),
        color: 'rgba(255,255,255,0.4)',
    },
    body: {
        fontSize: scaleFont(18),
        color: 'rgba(255,255,255,0.7)',
        lineHeight: scale(28),
        marginBottom: scale(20),
    },
    metaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: scale(10),
    },
    statusTag: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: scale(12),
        paddingVertical: scale(4),
        borderRadius: scale(4),
    },
    statusTagText: {
        fontSize: scaleFont(12),
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 1,
    },
    emptyText: {
        fontSize: scaleFont(20),
        color: 'rgba(255,255,255,0.3)',
        fontWeight: '600',
    },
});

export default TVAnnouncementsScreen;
