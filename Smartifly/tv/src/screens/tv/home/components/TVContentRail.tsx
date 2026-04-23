import React, { memo, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Platform,
} from 'react-native';
import { scale, scaleFont } from '../../../../theme';
import { usePerfProfile } from '../../../../utils/perf';
import TVContentCard, { TVContentItem } from './TVContentCard';

// =============================================================================
// CONSTANTS
// =============================================================================

const CARD_WIDTH = scale(200);
const CARD_MARGIN = scale(24);
const ITEM_WIDTH = CARD_WIDTH + CARD_MARGIN;
interface TVContentRailProps {
  title: string;
  data: TVContentItem[];
  onPressItem: (item: TVContentItem) => void;
  onFocusItem?: (item: TVContentItem) => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

const TVContentRail: React.FC<TVContentRailProps> = ({
  title,
  data,
  onPressItem,
  onFocusItem,
}) => {
  const safeData = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const perf = usePerfProfile();
  const railPerf = perf.rails;

  const renderItem = useCallback(
    ({ item }: { item: TVContentItem }) => {
      return (
        <TVContentCard
          item={item}
          onPress={onPressItem}
          onFocusItem={() => onFocusItem?.(item)}
          focusable={true}
        />
      );
    },
    [onFocusItem, onPressItem]
  );

  const getItemLayout = useCallback((_: unknown, index: number) => {
    return {
      length: ITEM_WIDTH,
      offset: ITEM_WIDTH * index,
      index,
    };
  }, []);

  const keyExtractor = useCallback((item: TVContentItem) => String(item.id), []);

  return (
    <View style={styles.container} renderToHardwareTextureAndroid>
      <Text style={styles.title}>{title}</Text>

      <FlatList
        horizontal
        data={safeData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        contentContainerStyle={styles.listContent}
        showsHorizontalScrollIndicator={false}
        scrollEnabled
        removeClippedSubviews={Platform.OS === 'android'}
        windowSize={railPerf.windowSize}
        initialNumToRender={railPerf.initialNumToRender}
        maxToRenderPerBatch={railPerf.maxToRenderPerBatch}
        updateCellsBatchingPeriod={railPerf.updateCellsBatchingPeriod}
      />
    </View>
  );
};

export default memo(TVContentRail);

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    marginBottom: scale(6),
    width: '100%',
  },
  title: {
    fontSize: scaleFont(24),
    fontWeight: 'bold',
    color: '#E5E5E5',
    marginBottom: scale(8),
    marginLeft: scale(30),
  },
  listContent: {
    paddingHorizontal: scale(30),
    paddingRight: scale(80),
  },
});
