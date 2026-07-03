import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  TextInput as RNTextInput,
} from 'react-native';
import {PaginatedList} from '../components/molecules/PaginatedList';
import {Pagination} from '../components/molecules/Pagination';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {Button} from '../components/atoms/Button';
import {useAuth} from '../contexts/AuthContext';
import {useApiErrorHandler} from '../hooks/useApiErrorHandler';
import {useTheme} from '../contexts/ThemeContext';
import {Theme} from '../theme';
import {useBreakpoint, BreakpointInfo} from '../utils/breakpoints';
import itemsInvoiceUsageService, {
  ItemUsage,
  InvoiceUsageTotals,
} from '../services/itemsInvoiceUsageService';
import {
  BarChartIcon,
  SearchIcon,
  XIcon,
  BoxIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  TagIcon,
  FileTextIcon,
} from '../components/icons';
import {formatDate} from '../utils/dateUtils';
import useDebounce from '../hooks/useDebounce';
import {useServerPagination} from '../hooks/useServerPagination';

interface ItemsInvoiceUsageScreenProps {
  visible: boolean;
  onClose: () => void;
}

export const ItemsInvoiceUsageScreen: React.FC<ItemsInvoiceUsageScreenProps> = ({
  visible,
  onClose,
}) => {
  const {token} = useAuth();
  const {handleApiError} = useApiErrorHandler();
  const theme = useTheme();
  const bp = useBreakpoint();
  const styles = useMemo(() => makeStyles(theme, bp), [theme, bp]);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemName)) {
        next.delete(itemName);
      } else {
        next.add(itemName);
      }
      return next;
    });
  };

  const formatCurrency = (value?: number) =>
    `$${(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  const [totals, setTotals] = useState<InvoiceUsageTotals>({
    totalMappedItems: 0,
    totalUniqueItems: 0,
    totalItems: 0,
    totalInvoices: 0,
  });

  // Server-side pagination: 20 rows per page (+ aggregate totals for the stat cards).
  const {
    items,
    loading,
    refreshing,
    error,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    refresh,
    refetch,
  } = useServerPagination<ItemUsage>(
    async (pg, limit) => {
      try {
        const res = await itemsInvoiceUsageService.getItemsUsage(token!, {
          search: debouncedSearch,
          page: pg,
          limit,
        });
        setTotals(res.totals);
        return {items: res.items, total: res.total, pages: res.pages};
      } catch (e) {
        await handleApiError(e);
        throw e;
      }
    },
    {pageSize: 20, resetKey: debouncedSearch, enabled: !!(visible && token)},
  );
  const loadData = refetch;
  const onRefresh = refresh;

  // Backend applies the search (itemName + aliases); render the result as-is.
  const filteredItems = items;

  const renderItemCard = (item: ItemUsage, index: number) => {
    const isExpanded = expandedItems.has(item.itemName);
    return (
      <Card key={index} variant="elevated" padding="md" style={styles.itemCard}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => toggleExpanded(item.itemName)}>
          <View style={styles.itemHeader}>
            <View style={styles.itemHeaderLeft}>
              <View style={styles.chevron}>
                {isExpanded ? (
                  <ChevronDownIcon size={18} color={theme.colors.gray[500]} />
                ) : (
                  <ChevronRightIcon size={18} color={theme.colors.gray[500]} />
                )}
              </View>
              <View style={styles.itemIconContainer}>
                <BoxIcon size={20} color={theme.colors.primary[600]} />
              </View>
              <View style={styles.itemInfo}>
                <Typography variant="body" weight="semibold">
                  {item.itemName}
                </Typography>
                {item.aliases.length > 0 && (
                  <Typography variant="caption" color={theme.colors.gray[500]}>
                    {item.aliases.length} alias{item.aliases.length !== 1 ? 'es' : ''}
                  </Typography>
                )}
              </View>
            </View>
            <View
              style={[
                styles.categoryBadge,
                item.type === 'mapped' && {backgroundColor: theme.colors.accent[100]},
              ]}>
              <Typography
                variant="caption"
                color={
                  item.type === 'mapped'
                    ? theme.colors.accent[700]
                    : theme.colors.info[700]
                }
                weight="medium">
                {item.type === 'mapped' ? 'Mapped' : 'Unique'}
              </Typography>
            </View>
          </View>

          <View style={styles.itemStats}>
            <View style={styles.statItem}>
              <Typography variant="caption" color={theme.colors.gray[500]}>
                Total Quantity
              </Typography>
              <Typography variant="body" weight="bold" color={theme.colors.primary[600]}>
                {item.totalQuantitySold.toLocaleString()}
              </Typography>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Typography variant="caption" color={theme.colors.gray[500]}>
                Invoices
              </Typography>
              <Typography variant="body" weight="bold" color={theme.colors.success[600]}>
                {item.invoiceCount}
              </Typography>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Typography variant="caption" color={theme.colors.gray[500]}>
                Avg/Invoice
              </Typography>
              <Typography variant="body" weight="bold" color={theme.colors.accent[600]}>
                {(item.averageQuantityPerInvoice || 0).toFixed(1)}
              </Typography>
            </View>
          </View>

          {item.lastUsedDate && (
            <View style={styles.lastUsedContainer}>
              <ClockIcon size={12} color={theme.colors.gray[400]} />
              <Typography variant="caption" color={theme.colors.gray[500]}>
                Last used: {formatDate(item.lastUsedDate)}
              </Typography>
            </View>
          )}
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedContainer}>
            {/* Alias chips */}
            {item.aliases.length > 0 && (
              <View style={styles.aliasSection}>
                <View style={styles.expandHeading}>
                  <TagIcon size={14} color={theme.colors.accent[600]} />
                  <Typography
                    variant="caption"
                    weight="semibold"
                    color={theme.colors.gray[700]}>
                    Aliases
                  </Typography>
                </View>
                <View style={styles.aliasChips}>
                  {item.aliases.map((alias, aIdx) => (
                    <View key={aIdx} style={styles.aliasChip}>
                      <Typography
                        variant="caption"
                        color={theme.colors.accent[700]}
                        weight="medium">
                        {alias}
                      </Typography>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Per-invoice table */}
            {item.invoices.length > 0 ? (
              <View style={styles.invoiceSection}>
                <View style={styles.expandHeading}>
                  <FileTextIcon size={14} color={theme.colors.primary[600]} />
                  <Typography
                    variant="caption"
                    weight="semibold"
                    color={theme.colors.gray[700]}>
                    Invoices ({item.invoices.length})
                  </Typography>
                </View>

                {/* Table header */}
                <View style={[styles.invoiceRow, styles.invoiceHeaderRow]}>
                  <Typography
                    variant="caption"
                    weight="semibold"
                    color={theme.colors.gray[600]}
                    style={styles.colInvoice}>
                    Invoice #
                  </Typography>
                  <Typography
                    variant="caption"
                    weight="semibold"
                    color={theme.colors.gray[600]}
                    style={styles.colDate}>
                    Date
                  </Typography>
                  <Typography
                    variant="caption"
                    weight="semibold"
                    color={theme.colors.gray[600]}
                    style={styles.colCustomer}>
                    Customer
                  </Typography>
                  <Typography
                    variant="caption"
                    weight="semibold"
                    color={theme.colors.gray[600]}
                    style={styles.colQty}>
                    Qty
                  </Typography>
                  <Typography
                    variant="caption"
                    weight="semibold"
                    color={theme.colors.gray[600]}
                    style={styles.colStatus}>
                    Status
                  </Typography>
                  <Typography
                    variant="caption"
                    weight="semibold"
                    color={theme.colors.gray[600]}
                    style={styles.colTotal}>
                    Total
                  </Typography>
                </View>

                {/* Table rows */}
                {item.invoices.map((invoice, invIdx) => {
                  const isDone =
                    invoice.status === 'Completed' || invoice.status === 'Closed';
                  return (
                    <View
                      key={invIdx}
                      style={[
                        styles.invoiceRow,
                        invIdx % 2 === 1 && styles.invoiceRowAlt,
                      ]}>
                      <Typography
                        variant="caption"
                        weight="medium"
                        color={theme.colors.primary[600]}
                        style={styles.colInvoice}>
                        {invoice.invoiceNumber}
                      </Typography>
                      <Typography
                        variant="caption"
                        color={theme.colors.gray[600]}
                        style={styles.colDate}>
                        {invoice.invoiceDate ? formatDate(invoice.invoiceDate) : 'N/A'}
                      </Typography>
                      <Typography
                        variant="caption"
                        color={theme.colors.gray[900]}
                        style={styles.colCustomer}
                        numberOfLines={1}>
                        {invoice.customer || '-'}
                      </Typography>
                      <Typography
                        variant="caption"
                        weight="semibold"
                        color={theme.colors.gray[900]}
                        style={styles.colQty}>
                        {invoice.totalQuantity}
                      </Typography>
                      <View style={styles.colStatus}>
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor: isDone
                                ? theme.colors.success[100]
                                : theme.colors.info[100],
                            },
                          ]}>
                          <Typography
                            variant="caption"
                            weight="medium"
                            color={
                              isDone
                                ? theme.colors.success[700]
                                : theme.colors.info[700]
                            }
                            numberOfLines={1}>
                            {invoice.status}
                          </Typography>
                        </View>
                      </View>
                      <Typography
                        variant="caption"
                        weight="semibold"
                        color={theme.colors.gray[900]}
                        style={styles.colTotal}>
                        {formatCurrency(invoice.total)}
                      </Typography>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.invoiceSection}>
                <Typography variant="caption" color={theme.colors.gray[500]}>
                  No invoices for this item
                </Typography>
              </View>
            )}
          </View>
        )}
      </Card>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconContainer, styles.headerIcon]}>
              <BarChartIcon size={22} color={theme.colors.accent[600]} />
            </View>
            <View>
              <Typography variant="h2" weight="bold">
                Items Invoice Usage
              </Typography>
              <Typography variant="caption" color={theme.colors.gray[500]}>
                Track item usage across invoices
              </Typography>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <XIcon size={24} color={theme.colors.gray[600]} />
          </TouchableOpacity>
        </View>

        {/* Stats Summary */}
        {!loading && totals.totalItems > 0 && (
          <View style={styles.statsContainer}>
            <View style={styles.statsCard}>
              <Typography variant="small" color={theme.colors.gray[600]}>
                Total Items
              </Typography>
              <Typography variant="h2" weight="bold" color={theme.colors.primary[600]}>
                {totals.totalItems}
              </Typography>
            </View>
            <View style={styles.statsCard}>
              <Typography variant="small" color={theme.colors.gray[600]}>
                Mapped Items
              </Typography>
              <Typography variant="h2" weight="bold" color={theme.colors.accent[600]}>
                {totals.totalMappedItems}
              </Typography>
            </View>
            <View style={styles.statsCard}>
              <Typography variant="small" color={theme.colors.gray[600]}>
                Unique Items
              </Typography>
              <Typography variant="h2" weight="bold" color={theme.colors.info[600]}>
                {totals.totalUniqueItems}
              </Typography>
            </View>
            <View style={styles.statsCard}>
              <Typography variant="small" color={theme.colors.gray[600]}>
                Total Invoices
              </Typography>
              <Typography variant="h2" weight="bold" color={theme.colors.success[600]}>
                {totals.totalInvoices}
              </Typography>
            </View>
          </View>
        )}

        {/* Search */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <SearchIcon size={18} color={theme.colors.gray[400]} />
            <RNTextInput
              style={styles.searchInput}
              placeholder="Search items..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={theme.colors.gray[400]}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <XIcon size={18} color={theme.colors.gray[400]} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Content */}
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary[600]} />
            <Typography
              variant="body"
              color={theme.colors.gray[500]}
              style={styles.loadingText}>
              Loading items usage...
            </Typography>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Typography variant="body" color={theme.colors.error[600]}>
              {error}
            </Typography>
            <Button
              title="Retry"
              variant="outline"
              size="sm"
              onPress={loadData}
              style={styles.retryButton}
            />
          </View>
        ) : (
          <PaginatedList
            data={filteredItems}
            keyExtractor={(item, index) => String(item.itemName + index)}
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, styles.contentWrap]}
            refreshing={refreshing}
            onRefresh={onRefresh}
            resetKey={searchQuery}
            pagedMode
            scrollTopKey={page}
            ListFooterComponent={
              total > 0 ? (
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={total}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              ) : null
            }
            ItemSeparatorComponent={() => <View style={{height: 0}} />}
            ListHeaderComponent={
              filteredItems.length > 0 ? (
                <View style={styles.resultsHeader}>
                  <Typography variant="small" color={theme.colors.gray[600]}>
                    {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} found
                  </Typography>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <BarChartIcon size={48} color={theme.colors.gray[300]} />
                <Typography
                  variant="body"
                  color={theme.colors.gray[500]}
                  style={styles.emptyText}>
                  {searchQuery
                    ? 'No items match your search'
                    : 'No invoice usage data available'}
                </Typography>
              </View>
            }
            renderItem={({item, index}) => renderItemCard(item, index)}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

const makeStyles = (theme: Theme, bp: BreakpointInfo) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.gray[50],
  },
  contentWrap: {
    width: '100%',
    maxWidth: bp.contentMaxWidth,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: bp.gutter,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    backgroundColor: theme.colors.accent[100],
  },
  closeButton: {
    padding: theme.spacing.sm,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: theme.colors.white,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: bp.gutter,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  statsCard: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  searchSection: {
    paddingHorizontal: bp.gutter,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.gray[100],
    borderRadius: 10,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
    maxWidth: bp.contentMaxWidth,
    alignSelf: 'center',
    width: '100%',
  },
  searchInput: {
    flex: 1,
    fontSize: theme.typography.roles.body.fontSize,
    color: theme.colors.gray[900],
    padding: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: bp.gutter,
  },
  resultsHeader: {
    marginBottom: theme.spacing.md,
  },
  itemCard: {
    marginBottom: theme.spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  itemHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  itemIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.info[100],
  },
  itemStats: {
    flexDirection: 'row',
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.gray[200],
    marginHorizontal: theme.spacing.sm,
  },
  lastUsedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
  },
  chevron: {
    marginRight: 2,
  },
  expandedContainer: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
  },
  expandHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: theme.spacing.sm,
  },
  aliasSection: {
    marginBottom: theme.spacing.md,
  },
  aliasChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  aliasChip: {
    backgroundColor: theme.colors.accent[100],
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  invoiceSection: {
    marginTop: theme.spacing.xs,
  },
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
  },
  invoiceHeaderRow: {
    backgroundColor: theme.colors.gray[100],
    borderRadius: theme.borderRadius.sm,
  },
  invoiceRowAlt: {
    backgroundColor: theme.colors.gray[50],
  },
  colInvoice: {
    flex: 1.6,
  },
  colDate: {
    flex: 1.6,
  },
  colCustomer: {
    flex: 2,
  },
  colQty: {
    flex: 0.8,
    textAlign: 'center',
  },
  colStatus: {
    flex: 1.4,
    alignItems: 'flex-start',
  },
  colTotal: {
    flex: 1.4,
    textAlign: 'right',
  },
  statusBadge: {
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  retryButton: {
    marginTop: theme.spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: theme.spacing.xl * 2,
  },
  emptyText: {
    marginTop: theme.spacing.md,
  },
});
