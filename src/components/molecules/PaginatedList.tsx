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
  /** How many rows to reveal per "page" (default 20). */
  pageSize?: number;
  refreshing?: boolean;
  onRefresh?: () => void;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Change this (e.g. search text / active tab) to jump back to the first page. */
  resetKey?: string | number;
  /**
   * SERVER mode (infinite scroll): `data` is the accumulated server pages —
   * renders it as-is and calls `onLoadMore` near the bottom.
   */
  serverMode?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  /**
   * PAGED mode (numbered pagination): `data` is the single current page —
   * renders it as-is with no load-more, and `ListFooterComponent` (the numbered
   * <Pagination/> control) is always shown.
   */
  pagedMode?: boolean;
  /** When this changes (e.g. current page number), the list scrolls back to top. */
  scrollTopKey?: string | number;
}

// Virtualized list (FlatList). Default: reveals client data 20 rows at a time on
// scroll. serverMode: infinite-scroll over server pages. pagedMode: renders one
// server page with a numbered pagination footer.
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

  // Jump back to page 1 when the data size or the reset key (search/tab) changes.
  useEffect(() => {
    setVisibleCount(pageSize);
  }, [pageSize, data.length, resetKey]);

  // Numbered pagination: scroll to the top of the list when the page changes.
  useEffect(() => {
    if (scrollTopKey !== undefined) {
      listRef.current?.scrollToOffset({offset: 0, animated: true});
    }
  }, [scrollTopKey]);

  // pagedMode/serverMode render `data` as-is; default mode reveals a slice.
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

