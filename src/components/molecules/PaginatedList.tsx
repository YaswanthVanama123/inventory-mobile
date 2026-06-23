import React, {useEffect, useMemo, useState, ReactElement} from 'react';
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
}

// Virtualized list (FlatList) that lazily REVEALS already-fetched data 20 rows
// at a time as the user scrolls — keeps memory/render cost flat on huge data
// sets without any backend change. Drop-in replacement for a ScrollView+.map.
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
}: PaginatedListProps<T>) {
  const theme = useTheme();
  const [visibleCount, setVisibleCount] = useState(pageSize);

  // Jump back to page 1 when the data size or the reset key (search/tab) changes.
  useEffect(() => {
    setVisibleCount(pageSize);
  }, [pageSize, data.length, resetKey]);

  const sliced = useMemo(() => data.slice(0, visibleCount), [data, visibleCount]);
  const hasMore = visibleCount < data.length;

  const loadMore = () => {
    if (hasMore) {
      setVisibleCount(c => Math.min(c + pageSize, data.length));
    }
  };

  return (
    <FlatList
      data={sliced}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      style={style}
      contentContainerStyle={contentContainerStyle}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      ItemSeparatorComponent={ItemSeparatorComponent ?? undefined}
      ListFooterComponent={
        hasMore ? (
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
