import React, {useEffect, useMemo, useState, useRef, ReactElement} from 'react';
import {
  FlatList,
  View,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  ListRenderItem,
  StyleProp,
  ViewStyle,
} from 'react-native';
import {useTheme} from '../../contexts/ThemeContext';

interface PaginatedListProps<T> {
  data: T[];
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T, index: number) => string;
  ListHeaderComponent?: ReactElement | null;
  ListEmptyComponent?: ReactElement | null;
  ItemSeparatorComponent?: React.ComponentType<any> | null;
  ListFooterComponent?: ReactElement | null;
  pageSize?: number;
  refreshing?: boolean;
  onRefresh?: () => void;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  resetKey?: string | number;
  serverMode?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  pagedMode?: boolean;
  scrollTopKey?: string | number;
}

export function PaginatedList<T>({
  data,
  renderItem,
  keyExtractor,
  ListHeaderComponent = null,
  ListEmptyComponent = null,
  ItemSeparatorComponent = null,
  ListFooterComponent = null,
  pageSize = 20,
  refreshing,
  onRefresh,
  style,
  contentContainerStyle,
  resetKey,
  serverMode = false,
  onLoadMore,
  hasMore: hasMoreProp,
  loadingMore = false,
  pagedMode = false,
  scrollTopKey,
}: PaginatedListProps<T>) {
  const theme = useTheme();
  const listRef = useRef<FlatList<T>>(null);
  const [visibleCount, setVisibleCount] = useState(pageSize);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [pageSize, data.length, resetKey]);

  useEffect(() => {
    if (scrollTopKey !== undefined) {
      listRef.current?.scrollToOffset({offset: 0, animated: true});
    }
  }, [scrollTopKey]);

  const sliced = useMemo(
    () => (serverMode || pagedMode ? data : data.slice(0, visibleCount)),
    [serverMode, pagedMode, data, visibleCount],
  );
  const hasMore = pagedMode ? false : serverMode ? !!hasMoreProp : visibleCount < data.length;

  const loadMore = () => {
    if (pagedMode) {
      return;
    }
    if (serverMode) {
      if (hasMoreProp) onLoadMore?.();
      return;
    }
    if (hasMore) {
      setVisibleCount(c => Math.min(c + pageSize, data.length));
    }
  };

  const showFooterSpinner = pagedMode ? false : serverMode ? loadingMore : hasMore;

  return (
    <FlatList
      ref={listRef}
      data={sliced}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      style={style}
      contentContainerStyle={contentContainerStyle}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      ItemSeparatorComponent={ItemSeparatorComponent ?? undefined}
      ListFooterComponent={
        showFooterSpinner ? (
          <View style={styles.footer}>
            <ActivityIndicator color={theme.colors.primary[600]} />
          </View>
        ) : (
          ListFooterComponent
        )
      }
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} />
        ) : undefined
      }
      removeClippedSubviews
      initialNumToRender={pageSize}
      maxToRenderPerBatch={pageSize}
      windowSize={11}
      keyboardShouldPersistTaps="handled"
    />
  );
}

const styles = StyleSheet.create({
  footer: {paddingVertical: 16, alignItems: 'center'},
});

