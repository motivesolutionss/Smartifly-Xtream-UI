import React, { memo, useCallback, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { colors, scale, scaleFont } from '../../../.././../theme';
import { WatchProgress } from '@smartifly/shared/src/store/watchHistoryStore';
import { usePerfProfile } from '@smartifly/shared/src/utils/perf';
import TVContentCard, { TVContentItem } from '../../cards/catalog/TVContentCard';
import BaseHorizontalRail from '../base/BaseHorizontalRail';
import {
  HOME_SIDEBAR_GAP,
  getRailLayoutMetrics,
} from '../../layout/railSizing';

interface TVContinueRailProps {
  title: string;
  data: WatchProgress[];
  onPressItem: (item: WatchProgress) => void;
  onRemoveItem?: (item: WatchProgress) => void;
  sidebarTargetNode?: number;
  onRequestSidebarFocus?: () => void;
  onFocusIndex?: (index: number) => void;
}

const TVContinueRail: React.FC<TVContinueRailProps> = ({
  title,
  data,
  onPressItem,
  onRemoveItem: _onRemoveItem,
  sidebarTargetNode,
  onRequestSidebarFocus,
  onFocusIndex,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const perf = usePerfProfile();
  const [railWidth, setRailWidth] = useState<number>(Math.max(0, screenWidth - HOME_SIDEBAR_GAP));

  const safeData = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const { cardWidth, cardHeight, cardGap, listLeft, contentLeft, contentRight } = useMemo(
    () => getRailLayoutMetrics('fiveUpContinue', railWidth),
    [railWidth]
  );
  const itemLength = cardWidth + cardGap;
  const railStyle = useMemo(() => ({ marginLeft: listLeft }), [listLeft]);
  const contentStyle = useMemo(
    () => ({ paddingLeft: contentLeft, paddingRight: contentRight }),
    [contentLeft, contentRight]
  );
  const separatorStyle = useMemo(() => ({ width: cardGap }), [cardGap]);

  const onRailLayout = useCallback((event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    if (next > 0) {
      setRailWidth((prev) => (Math.abs(prev - next) < 1 ? prev : next));
    }
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: WatchProgress; index: number }) => {
      const contentItem: TVContentItem = {
        id: item.id,
        title: item.episodeTitle || item.title,
        image: item.thumbnail || '',
        type: item.type === 'live' ? 'live' : item.type === 'series' ? 'series' : 'movie',
        data: item.data ?? item,
      };

      return (
        <TVContentCard
          item={contentItem}
          onPress={() => onPressItem(item)}
          onFocusItem={() => onFocusIndex?.(index)}
          width={cardWidth}
          height={cardHeight}
          disableZoom={true}
          nextFocusLeft={index === 0 ? sidebarTargetNode : undefined}
          onRequestSidebarFocus={index === 0 ? onRequestSidebarFocus : undefined}
          focusable
        />
      );
    },
    [cardHeight, cardWidth, onFocusIndex, onPressItem, onRequestSidebarFocus, sidebarTargetNode]
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({ length: itemLength, offset: itemLength * index, index }),
    [itemLength]
  );
  const keyExtractor = useCallback((item: WatchProgress) => String(item.id), []);
  const separator = useCallback(() => <View style={separatorStyle} />, [separatorStyle]);

  if (!safeData.length) return null;

  return (
    <View style={styles.container} onLayout={onRailLayout}>
      <Text style={styles.title}>{title}</Text>
      <BaseHorizontalRail
        railStyle={[styles.listBase, railStyle]}
        data={safeData}
        extraData={`${String(sidebarTargetNode ?? '')}:${cardWidth}`}
        renderItem={renderItem}
        renderSeparator={separator}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        contentContainerStyle={contentStyle}
        removeClippedSubviews={false}
        windowSize={perf.rails.windowSize}
        initialNumToRender={perf.rails.initialNumToRender}
        maxToRenderPerBatch={perf.rails.maxToRenderPerBatch}
        updateCellsBatchingPeriod={perf.rails.updateCellsBatchingPeriod}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: scale(10),
    overflow: 'hidden',
  },
  title: {
    marginLeft: scale(30),
    marginBottom: scale(8),
    fontSize: scaleFont(24),
    fontWeight: '700',
    color: colors.textPrimary || '#EEE',
  },
  listBase: {
    marginLeft: 0,
  },
});

export default memo(TVContinueRail);
