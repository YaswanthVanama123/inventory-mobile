import React from 'react';
import {View, TouchableOpacity, StyleSheet, StyleProp, ViewStyle} from 'react-native';
import {useTheme} from '../../contexts/ThemeContext';
import {Typography} from '../atoms/Typography';
import {ChevronRightIcon} from '../icons';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  /** How many numbered page buttons to show (windowed around the current page). */
  maxPageButtons?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Numbered pagination control for mobile lists: result count, a rows-per-page
 * selector, and ‹ › chevrons with windowed page numbers. Pairs with the
 * server-paged (`useServerPagination`) or client-paged screens.
 */
export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  maxPageButtons = 5,
  style,
}) => {
  const theme = useTheme();

  if (!totalItems) {
    return null;
  }

  const go = (p: number) => {
    if (p >= 1 && p <= totalPages && p !== currentPage) {
      onPageChange(p);
    }
  };

  // Windowed page numbers around the current page.
  let start = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
  const end = Math.min(totalPages, start + maxPageButtons - 1);
  start = Math.max(1, end - maxPageButtons + 1);
  const pages: number[] = [];
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const navDisabled = (disabled: boolean) => (disabled ? {opacity: 0.35} : null);

  const Chevron = ({left}: {left?: boolean}) => (
    <View style={left ? styles.flip : undefined}>
      <ChevronRightIcon size={18} color={theme.colors.gray[700]} />
    </View>
  );

  return (
    <View style={[styles.container, style]}>
      {/* Result count + rows-per-page */}
      <View style={styles.topRow}>
        <Typography variant="caption" color={theme.colors.gray[600]}>
          {startItem}–{endItem} of {totalItems}
        </Typography>

        {onPageSizeChange ? (
          <View style={styles.pageSizeWrap}>
            <Typography variant="caption" color={theme.colors.gray[500]} style={styles.rowsLabel}>
              Rows
            </Typography>
            {pageSizeOptions.map(opt => {
              const active = opt === pageSize;
              return (
                <TouchableOpacity
                  key={opt}
                  onPress={() => !active && onPageSizeChange(opt)}
                  activeOpacity={0.8}
                  style={[
                    styles.sizeChip,
                    {
                      backgroundColor: active ? theme.colors.primary[600] : theme.colors.white,
                      borderColor: active ? theme.colors.primary[600] : theme.colors.gray[200],
                    },
                  ]}>
                  <Typography
                    variant="caption"
                    weight={active ? 'semibold' : 'normal'}
                    color={active ? theme.colors.white : theme.colors.gray[700]}>
                    {opt}
                  </Typography>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
      </View>

      {/* Page navigation */}
      {totalPages > 1 ? (
        <View style={styles.navRow}>
          <TouchableOpacity
            onPress={() => go(currentPage - 1)}
            disabled={currentPage <= 1}
            activeOpacity={0.8}
            style={[styles.navBtn, {borderColor: theme.colors.gray[200]}, navDisabled(currentPage <= 1)]}>
            <Chevron left />
          </TouchableOpacity>

          {start > 1 ? (
            <Typography variant="caption" color={theme.colors.gray[400]} style={styles.ellipsis}>
              …
            </Typography>
          ) : null}

          {pages.map(p => {
            const active = p === currentPage;
            return (
              <TouchableOpacity
                key={p}
                onPress={() => go(p)}
                activeOpacity={0.8}
                style={[
                  styles.pageBtn,
                  {
                    backgroundColor: active ? theme.colors.primary[600] : theme.colors.white,
                    borderColor: active ? theme.colors.primary[600] : theme.colors.gray[200],
                  },
                ]}>
                <Typography
                  variant="caption"
                  weight={active ? 'semibold' : 'normal'}
                  color={active ? theme.colors.white : theme.colors.gray[700]}>
                  {p}
                </Typography>
              </TouchableOpacity>
            );
          })}

          {end < totalPages ? (
            <Typography variant="caption" color={theme.colors.gray[400]} style={styles.ellipsis}>
              …
            </Typography>
          ) : null}

          <TouchableOpacity
            onPress={() => go(currentPage + 1)}
            disabled={currentPage >= totalPages}
            activeOpacity={0.8}
            style={[styles.navBtn, {borderColor: theme.colors.gray[200]}, navDisabled(currentPage >= totalPages)]}>
            <Chevron />
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  pageSizeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowsLabel: {
    marginRight: 2,
  },
  sizeChip: {
    minWidth: 34,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageBtn: {
    minWidth: 38,
    height: 38,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ellipsis: {
    paddingHorizontal: 2,
  },
  flip: {
    transform: [{scaleX: -1}],
  },
});
