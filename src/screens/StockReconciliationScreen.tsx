import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {Pagination} from '../components/molecules/Pagination';
import {useAuth} from '../contexts/AuthContext';
import {useApiErrorHandler} from '../hooks/useApiErrorHandler';
import {useTheme} from '../contexts/ThemeContext';
import {Theme} from '../theme';
import {useBreakpoint, BreakpointInfo} from '../utils/breakpoints';
import stockService from '../services/stockService';
import {
  AlertCircleIcon,
  BoxIcon,
  WarningIcon,
} from '../components/icons';

interface StockReconciliationScreenProps {
  visible: boolean;
  onClose: () => void;
}

// Per-SKU reconciliation row shape returned by GET /stock-reconciliation.
interface ReconItem {
  sku: string;
  name: string;
  purchased: {quantity: number; avgPrice: number; totalValue: number; orderCount: number};
  sold: {quantity: number; avgPrice: number; totalValue: number; invoiceCount: number};
  stock: {current: number; status: string; profitMargin: number};
}

interface ReconSummary {
  totalItems: number;
  inStock: number;
  outOfStock: number;
  oversold: number;
}

type StatusFilter = 'all' | 'in_stock' | 'out_of_stock' | 'oversold';

const PAGE_SIZE = 20;

export const StockReconciliationScreen: React.FC<StockReconciliationScreenProps> = ({
  visible,
  onClose,
}) => {
  const theme = useTheme();
  const bp = useBreakpoint();
  const styles = useMemo(() => makeStyles(theme, bp), [theme, bp]);
  const {token, user} = useAuth();
  const isAdmin = user?.role === 'admin';
  const {handleApiError} = useApiErrorHandler();

  const [items, setItems] = useState<ReconItem[]>([]);
  const [summary, setSummary] = useState<ReconSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);

  const loadData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await stockService.getStockReconciliation(token);
      setItems(res.items || []);
      setSummary(res.summary || null);
    } catch (err: any) {
      console.error('Failed to fetch stock reconciliation:', err);
      const wasHandled = await handleApiError(err);
      if (!wasHandled) setError(err?.message || 'Failed to load stock reconciliation');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (visible && token && isAdmin) {
      setPage(1);
      setFilter('all');
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, token]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Reset to page 1 whenever the status filter changes.
  useEffect(() => {
    setPage(1);
  }, [filter]);

  const statusFromItem = (item: ReconItem): string => {
    const current = item.stock?.current ?? 0;
    if (current < 0) return 'OVERSOLD';
    if (current === 0) return 'OUT_OF_STOCK';
    return 'IN_STOCK';
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (filter === 'all') return true;
      const status = statusFromItem(item);
      if (filter === 'in_stock') return status === 'IN_STOCK';
      if (filter === 'out_of_stock') return status === 'OUT_OF_STOCK';
      if (filter === 'oversold') return status === 'OVERSOLD';
      return true;
    });
  }, [items, filter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const pagedItems = useMemo(
    () => filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredItems, page],
  );

  const formatCurrency = (amount: number) =>
    `$${(amount || 0).toFixed(2)}`;

  const statusPalette = (status: string) => {
    if (status === 'OVERSOLD') {
      return {bg: theme.colors.error[50], fg: theme.colors.error[700], label: 'Oversold'};
    }
    if (status === 'OUT_OF_STOCK') {
      return {bg: theme.colors.primary[50], fg: theme.colors.primary[700], label: 'Out of Stock'};
    }
    return {bg: theme.colors.success[50], fg: theme.colors.success[700], label: 'In Stock'};
  };

  const currentColor = (current: number) => {
    if (current < 0) return theme.colors.error[600];
    if (current === 0) return theme.colors.primary[600];
    return theme.colors.success[600];
  };

  const marginColor = (m: number) => {
    if (m > 0) return theme.colors.success[600];
    if (m < 0) return theme.colors.error[600];
    return theme.colors.gray[600];
  };

  const filterTabs: {key: StatusFilter; label: string; count: number}[] = [
    {key: 'all', label: 'All', count: items.length},
    {key: 'in_stock', label: 'In Stock', count: summary?.inStock ?? 0},
    {key: 'out_of_stock', label: 'Out of Stock', count: summary?.outOfStock ?? 0},
    {key: 'oversold', label: 'Oversold', count: summary?.oversold ?? 0},
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Typography variant="body" color={theme.colors.primary[600]} weight="semibold">
              Close
            </Typography>
          </TouchableOpacity>
          <Typography variant="h3" weight="bold" style={styles.modalTitle}>
            Stock Reconciliation
          </Typography>
          <TouchableOpacity onPress={loadData} style={styles.refreshButton}>
            <Typography variant="small" color={theme.colors.primary[600]} weight="semibold">
              Refresh
            </Typography>
          </TouchableOpacity>
        </View>

        {!isAdmin ? (
          <View style={styles.centered}>
            <WarningIcon size={40} color={theme.colors.warning[500]} />
            <Typography
              variant="body"
              color={theme.colors.gray[600]}
              align="center"
              style={{marginTop: 16}}>
              Only administrators can view stock reconciliation.
            </Typography>
          </View>
        ) : loading && !refreshing && items.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.colors.primary[600]} />
            <Typography variant="body" color={theme.colors.gray[600]} style={{marginTop: 16}}>
              Loading stock reconciliation...
            </Typography>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.colors.primary[600]}
              />
            }>
            <View style={styles.contentWrap}>
              {/* TODO: CSV export ("Download Report") — skipped in mobile port. */}

              {error && (
                <Card variant="outlined" padding="lg" style={styles.errorCard}>
                  <View style={styles.errorContent}>
                    <AlertCircleIcon size={24} color={theme.colors.error[500]} />
                    <Typography variant="body" color={theme.colors.error[700]} style={styles.errorText}>
                      {error}
                    </Typography>
                  </View>
                </Card>
              )}

              {/* Summary cards */}
              {summary && (
                <View style={styles.summaryGrid}>
                  <Card variant="elevated" padding="md" style={styles.summaryCard}>
                    <Typography variant="caption" color={theme.colors.gray[500]}>
                      Total Items
                    </Typography>
                    <Typography variant="h3" weight="bold" color={theme.colors.text.primary}>
                      {summary.totalItems}
                    </Typography>
                  </Card>
                  <Card variant="elevated" padding="md" style={styles.summaryCard}>
                    <Typography variant="caption" color={theme.colors.gray[500]}>
                      In Stock
                    </Typography>
                    <Typography variant="h3" weight="bold" color={theme.colors.success[600]}>
                      {summary.inStock}
                    </Typography>
                  </Card>
                  <Card variant="elevated" padding="md" style={styles.summaryCard}>
                    <Typography variant="caption" color={theme.colors.gray[500]}>
                      Out of Stock
                    </Typography>
                    <Typography variant="h3" weight="bold" color={theme.colors.primary[600]}>
                      {summary.outOfStock}
                    </Typography>
                  </Card>
                  <Card variant="elevated" padding="md" style={styles.summaryCard}>
                    <Typography variant="caption" color={theme.colors.gray[500]}>
                      Oversold
                    </Typography>
                    <Typography variant="h3" weight="bold" color={theme.colors.error[600]}>
                      {summary.oversold}
                    </Typography>
                  </Card>
                </View>
              )}

              {/* Status filter tabs */}
              <View style={styles.filterChips}>
                {filterTabs.map(tab => {
                  const active = filter === tab.key;
                  return (
                    <TouchableOpacity
                      key={tab.key}
                      style={[styles.filterChip, active && styles.filterChipActive]}
                      onPress={() => setFilter(tab.key)}
                      activeOpacity={0.85}>
                      <Typography
                        variant="small"
                        weight="semibold"
                        color={active ? theme.colors.white : theme.colors.gray[700]}>
                        {tab.label} ({tab.count})
                      </Typography>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Empty state */}
              {!error && items.length === 0 && (
                <Card variant="outlined" padding="lg" style={styles.emptyCard}>
                  <BoxIcon size={48} color={theme.colors.gray[400]} />
                  <Typography
                    variant="h3"
                    weight="semibold"
                    color={theme.colors.gray[700]}
                    style={styles.emptyTitle}>
                    No stock data available
                  </Typography>
                  <Typography variant="body" color={theme.colors.gray[500]} align="center">
                    Sync CustomerConnect purchases and RouteStar invoices to see stock reconciliation
                  </Typography>
                </Card>
              )}

              {/* Filtered-empty state */}
              {!error && items.length > 0 && filteredItems.length === 0 && (
                <Card variant="outlined" padding="lg" style={styles.emptyCard}>
                  <BoxIcon size={40} color={theme.colors.gray[400]} />
                  <Typography
                    variant="body"
                    weight="semibold"
                    color={theme.colors.gray[600]}
                    style={styles.emptyTitle}>
                    No items found for this filter
                  </Typography>
                </Card>
              )}

              {/* Per-SKU cards */}
              {pagedItems.map((item, index) => {
                const status = statusFromItem(item);
                const palette = statusPalette(status);
                const margin = item.stock?.profitMargin ?? 0;
                return (
                  <Card
                    key={`${item.sku}-${index}`}
                    variant="elevated"
                    padding="none"
                    style={styles.itemCard}>
                    <View style={styles.itemHeader}>
                      <View style={styles.itemHeaderLeft}>
                        <Typography variant="body" weight="bold" style={styles.skuText} numberOfLines={1}>
                          {item.sku}
                        </Typography>
                        <Typography variant="caption" color={theme.colors.gray[500]} numberOfLines={2}>
                          {item.name}
                        </Typography>
                      </View>
                      <View style={[styles.statusBadge, {backgroundColor: palette.bg}]}>
                        <Typography variant="caption" weight="semibold" color={palette.fg}>
                          {palette.label}
                        </Typography>
                      </View>
                    </View>

                    <View style={styles.itemBody}>
                      <View style={styles.metricRow}>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          Purchased
                        </Typography>
                        <Typography variant="small" weight="semibold" color={theme.colors.primary[600]}>
                          {item.purchased?.quantity ?? 0} ({item.purchased?.orderCount ?? 0} orders)
                        </Typography>
                      </View>
                      <View style={styles.metricRow}>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          Sold
                        </Typography>
                        <Typography variant="small" weight="semibold" color={theme.colors.success[600]}>
                          {item.sold?.quantity ?? 0} ({item.sold?.invoiceCount ?? 0} invoices)
                        </Typography>
                      </View>
                      <View style={styles.metricRow}>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          Current Stock
                        </Typography>
                        <Typography variant="body" weight="bold" color={currentColor(item.stock?.current ?? 0)}>
                          {item.stock?.current ?? 0}
                        </Typography>
                      </View>
                      <View style={styles.metricRow}>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          Avg Buy
                        </Typography>
                        <Typography variant="small" weight="medium">
                          {formatCurrency(item.purchased?.avgPrice ?? 0)}
                        </Typography>
                      </View>
                      <View style={styles.metricRow}>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          Avg Sell
                        </Typography>
                        <Typography variant="small" weight="medium">
                          {formatCurrency(item.sold?.avgPrice ?? 0)}
                        </Typography>
                      </View>
                      <View style={styles.metricRow}>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          Profit Margin
                        </Typography>
                        <Typography variant="small" weight="semibold" color={marginColor(margin)}>
                          {margin > 0 ? '+' : ''}{margin}%
                        </Typography>
                      </View>
                    </View>
                  </Card>
                );
              })}

              {/* Pagination */}
              {filteredItems.length > 0 && (
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={filteredItems.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setPage}
                />
              )}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const makeStyles = (theme: Theme, bp: BreakpointInfo) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.gray[50],
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.gray[200],
      backgroundColor: theme.colors.white,
    },
    closeButton: {
      paddingVertical: 4,
      width: 60,
    },
    refreshButton: {
      paddingVertical: 4,
      width: 60,
      alignItems: 'flex-end',
    },
    modalTitle: {
      flex: 1,
      textAlign: 'center',
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: theme.spacing.xxxl,
    },
    contentWrap: {
      width: '100%',
      maxWidth: bp.contentMaxWidth,
      alignSelf: 'center',
      paddingHorizontal: bp.gutter,
      paddingTop: theme.spacing.lg,
    },
    errorCard: {
      marginBottom: theme.spacing.lg,
      backgroundColor: theme.colors.error[50],
    },
    errorContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    errorText: {
      flex: 1,
    },
    summaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.md,
    },
    summaryCard: {
      width: '48%',
      marginBottom: 12,
      borderRadius: theme.borderRadius.xl,
    },
    filterChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: theme.spacing.md,
    },
    filterChip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 24,
      backgroundColor: theme.colors.gray[100],
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
    },
    filterChipActive: {
      backgroundColor: theme.colors.primary[600],
      borderColor: theme.colors.primary[600],
    },
    emptyCard: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl,
    },
    emptyTitle: {
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.xs,
    },
    itemCard: {
      marginBottom: 12,
      overflow: 'hidden',
      borderRadius: theme.borderRadius.xl,
    },
    itemHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      padding: theme.spacing.md,
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.gray[100],
    },
    itemHeaderLeft: {
      flex: 1,
      gap: 2,
    },
    skuText: {
      fontFamily: 'monospace',
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: theme.borderRadius.full,
    },
    itemBody: {
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.gray[50],
    },
    metricRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
  });
