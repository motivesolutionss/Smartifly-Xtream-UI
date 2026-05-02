import React, { memo } from 'react';
import {
  FlatList,
  FlatListProps,
  LayoutChangeEvent,
  StyleProp,
  ViewStyle,
} from 'react-native';

type BaseHorizontalRailProps<T> = {
  data: T[];
  extraData?: FlatListProps<T>['extraData'];
  railStyle?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  renderSeparator?: () => React.ReactElement | null;
  onRailLayout?: (event: LayoutChangeEvent) => void;
  removeClippedSubviews?: boolean;
  windowSize?: number;
  initialNumToRender?: number;
  maxToRenderPerBatch?: number;
  updateCellsBatchingPeriod?: number;
  onScrollToIndexFailed?: FlatListProps<T>['onScrollToIndexFailed'];
  keyExtractor: (item: T, index: number) => string;
  renderItem: FlatListProps<T>['renderItem'];
  getItemLayout?: FlatListProps<T>['getItemLayout'];
};

function BaseHorizontalRailInner<T>({
  data,
  extraData,
  railStyle,
  contentContainerStyle,
  renderSeparator,
  onRailLayout,
  removeClippedSubviews = false,
  windowSize,
  initialNumToRender,
  maxToRenderPerBatch,
  updateCellsBatchingPeriod,
  onScrollToIndexFailed,
  keyExtractor,
  renderItem,
  getItemLayout,
}: BaseHorizontalRailProps<T>) {
  return (
    <FlatList
      style={railStyle}
      horizontal
      data={data}
      extraData={extraData}
      renderItem={renderItem}
      ItemSeparatorComponent={renderSeparator}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      contentContainerStyle={contentContainerStyle}
      showsHorizontalScrollIndicator={false}
      bounces={false}
      overScrollMode="never"
      removeClippedSubviews={removeClippedSubviews}
      windowSize={windowSize}
      initialNumToRender={initialNumToRender}
      maxToRenderPerBatch={maxToRenderPerBatch}
      updateCellsBatchingPeriod={updateCellsBatchingPeriod}
      onScrollToIndexFailed={onScrollToIndexFailed}
      onLayout={onRailLayout}
    />
  );
}

const BaseHorizontalRail = memo(BaseHorizontalRailInner) as typeof BaseHorizontalRailInner;

export default BaseHorizontalRail;
