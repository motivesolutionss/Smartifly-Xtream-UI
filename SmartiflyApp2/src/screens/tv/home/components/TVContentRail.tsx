import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
} from 'react-native';
import { colors, scale, scaleFont } from '../../../../theme';
import TVContentCard, { TVContentItem } from './TVContentCard';

// =============================================================================
// TYPES
// =============================================================================

interface TVContentRailProps {
    title: string;
    data: TVContentItem[];
    onPressItem: (item: TVContentItem) => void;
}

// =============================================================================
// TV CONTENT RAIL COMPONENT
// =============================================================================

const TVContentRail: React.FC<TVContentRailProps> = ({
    title,
    data,
    onPressItem,
}) => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>{title}</Text>

            <FlatList
                horizontal
                data={data}
                renderItem={({ item }) => (
                    <TVContentCard
                        item={item}
                        onPress={onPressItem}
                    />
                )}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                showsHorizontalScrollIndicator={false}
                // Important for TV
                removeClippedSubviews={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: scale(10),
        width: '100%',
    },
    title: {
        fontSize: scaleFont(24),
        fontWeight: 'bold',
        color: colors.textPrimary || '#EEE',
        marginBottom: scale(16),
        marginLeft: scale(20), // Align with cards which have margin
        paddingLeft: scale(20), // Or just pad container
    },
    listContent: {
        paddingHorizontal: scale(40), // Left padding for focus room
        paddingRight: scale(80),
    }
});

export default TVContentRail;
