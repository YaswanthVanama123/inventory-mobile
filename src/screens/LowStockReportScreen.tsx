import React, {useMemo, useState} from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  TextInput as RNTextInput,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {PaginatedList} from '../components/molecules/PaginatedList';
import {Pagination} from '../components/molecules/Pagination';
import {useAuth} from '../contexts/AuthContext';
import {useApiErrorHandler} from '../hooks/useApiErrorHandler';
import {useTheme} from '../contexts/ThemeContext';
import {Theme} from '../theme';
import {useBreakpoint, BreakpointInfo} from '../utils/breakpoints';
import useDebounce from '../hooks/useDebounce';
import {useServerPagination} from '../hooks/useServerPagination';
import {API_BASE_URL} from '../config/api';
import {
  AlertCircleIcon,
  BoxIcon,
  WarningIcon,
  BarChartIcon,
} from '../components/icons';

// NOTE: CSV/PDF export from the web report is intentionally omitted on mobile.
// TODO: add CSV/PDF export (share sheet) if product wants parity with the webapp.

type Priority = 'critical' | 'high' | 'medium' | 'low';
type PriorityFilter = 'all' | 'critical' | 'high' | 'medium';

interface ReorderItem {
  id: string;
  itemName: string;
  skuCode: string;
  category?: string;
  currentStock: number;
  minimumStock: number;
  reorderPoint: number;
  supplierName?: string;
  supplierEmail?: string;
  supplierPhone?: string;
}

interface LowStockReportScreenProps {
  visible: boolean;
  onClose: () => void;
}

// Mirror of the webapp getPriorityLevel: 0 stock = critical, else by
// (currentStock / reorderPoint) * 100 — <=25 high, <=50 medium, else low.
const getPriorityLevel = (currentStock: number, reorderPoint: number): Priority => {
  if (currentStock === 0) return 'critical';
  const pct = reorderPoint > 0 ? (currentStock / reorderPoint) * 100 : 100;
  if (pct <= 25) return 'high';
  if (pct <= 50) return 'medium';
  return 'low';
};

export const LowStockReportScreen: React.FC<LowStockReportScreenProps> = ({
  visible,
  onClose,
}) => {
  const theme = useTheme();
  const bp = useBreakpoint();
  const styles = useMemo(() => makeStyles(theme, bp), [theme, bp]);
  const {token} = useAuth();
  const {handleApiError} = useApiErrorHandler();

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [filterPriority, setFilterPriority] = useState<PriorityFilter>('all');

  // reorder-list has no server pagination/search, so we fetch the full list once
  // (backend-debounced via the resetKey) and filter + slice client-side inside
  // fetchPage — still driven through useServerPagination for the numbered control.
  const {
    items,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    extra,
    loading,
    refreshing,
    error,
    refresh,
    refetch,
  } = useServerPagination<ReorderItem>(
    async (pg, limit) => {
      try {
        const res = await fetch(`${API_BASE_URL}/reports/reorder-list`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        const json = await res.json();
        const payload = json.data || json;
        const all: ReorderItem[] = Array.isArray(payload.items) ? payload.items : [];

        const q = debouncedSearch.trim().toLowerCase();
        const filtered = all.filter(it => {
          const priority = getPriorityLevel(it.currentStock, it.reorderPoint);
          const matchesSearch =
            !q ||
            it.itemName?.toLowerCase().includes(q) ||
            it.skuCode?.toLowerCase().includes(q);
          const matchesPriority = filterPriority === 'all' || priority === filterPriority;
          return matchesSearch && matchesPriority;
        });

        // Stat counts are computed over the *unfiltered* set (like the webapp).
        const stats = {
          total: all.length,
          critical: all.filter(i => getPriorityLevel(i.currentStock, i.reorderPoint) === 'critical').length,
          high: all.filter(i => getPriorityLevel(i.currentStock, i.reorderPoint) === 'high').length,
          medium: all.filter(i => getPriorityLevel(i.currentStock, i.reorderPoint) === 'medium').length,
        };

        const start = (pg - 1) * limit;
        const paged = filtered.slice(start, start + limit);
        return {
          items: paged,
          total: filtered.length,
          pages: Math.max(1, Math.ceil(filtered.length / limit)),
          extra: stats,
        };
      } catch (e) {
        await handleApiError(e);
        throw e;
      }
    },
    {pageSize: 20, resetKey: `${debouncedSearch}|${filterPriority}`, enabled: !!(visible && token)},
  );

  const loadData = refetch;
  const onRefresh = refresh;

  const stats = extra || {total: 0, critical: 0, high: 0, medium: 0};

  const priorityColor = (priority: Priority) => {
    switch (priority) {
      case 'critical':
        return theme.colors.error[500];
      case 'high':
        return theme.colors.warning[500];
      case 'medium':
        return theme.colors.primary[500];
      default:
        return theme.colors.primary[500];
    }
  };

  const priorityLabel = (priority: Priority) =>
    priority.charAt(0).toUpperCase() + priority.slice(1);

  const filterOptions: {key: PriorityFilter; label: string}[] = [
    {key: 'all', label: 'All'},
    {key: 'critical', label: 'Critical'},
    {key: 'high', label: 'High'},
    {key: 'medium', label: 'Medium'},
  ];

  const StatCard = ({
    label,
    value,
    color,
    icon,
    bg,
    border,
  }: {
    label: string;
    value: number;
    color: string;
    icon: React.ReactNode;
    bg?: string;
    border?: string;
  }) => (
    <View
      style={[
        styles.statCard,
        bg ? {backgroundColor: bg} : null,
        border ? {borderColor: border} : null,
      ]}>
      <View style={styles.statTop}>
        <Typography variant="caption" color={color}>
          {label}
        </Typography>
        {icon}
      </View>
      <Typography variant="h2" weight="bold" color={color}>
        {value}
      </Typography>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Typography variant="body" color={theme.colors.primary[600]} weight="semibold">
              Close
            </Typography>
          </TouchableOpacity>
          <Typography variant="h3" weight="bold" style={styles.modalTitle}>
            Low Stock Report
          </Typography>
          <TouchableOpacity onPress={loadData} style={styles.refreshButton}>
            <Typography variant="small" color={theme.colors.primary[600]} weight="semibold">
              Refresh
            </Typography>
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary[600]} />
            <Typography variant="body" color={theme.colors.gray[600]} style={{marginTop: 16}}>
              Loading low stock items...
            </Typography>
          </View>
        ) : (
          <PaginatedList
            data={items}
            keyExtractor={(item, index) => item.id || String(index)}
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, styles.contentWrap]}
            refreshing={refreshing}
            onRefresh={onRefresh}
            resetKey={`${searchQuery}|${filterPriority}`}
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
            ItemSeparatorComponent={() => <View style={{height: 12}} />}
            ListHeaderComponent={
              <View>
                {/* Stat cards */}
                <View style={styles.statsGrid}>
                  <StatCard
                    label="Total Items"
                    value={stats.total}
                    color={theme.colors.gray[900]}
                    icon={<BoxIcon size={18} color={theme.colors.gray[400]} />}
                  />
                  <StatCard
                    label="Critical"
                    value={stats.critical}
                    color={theme.colors.error[700]}
                    bg={theme.colors.error[50]}
                    border={theme.colors.error[200]}
                    icon={<WarningIcon size={18} color={theme.colors.error[500]} />}
                  />
                  <StatCard
                    label="High Priority"
                    value={stats.high}
                    color={theme.colors.warning[700]}
                    bg={theme.colors.warning[50]}
                    border={theme.colors.warning[200]}
                    icon={<BarChartIcon size={18} color={theme.colors.warning[500]} />}
                  />
                  <StatCard
                    label="Medium Priority"
                    value={stats.medium}
                    color={theme.colors.primary[700]}
                    bg={theme.colors.primary[50]}
                    border={theme.colors.primary[200]}
                    icon={<WarningIcon size={18} color={theme.colors.primary[500]} />}
                  />
                </View>

                {/* Search */}
                <View style={styles.searchContainer}>
                  <RNTextInput
                    style={styles.searchInput}
                    placeholder="Search by item name or SKU"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor={theme.colors.gray[400]}
                  />
                </View>

                {/* Priority filter chips */}
                <View style={styles.filterRow}>
                  {filterOptions.map(opt => {
                    const active = filterPriority === opt.key;
                    return (
                      <TouchableOpacity
                        key={opt.key}
                        onPress={() => setFilterPriority(opt.key)}
                        activeOpacity={0.8}
                        style={[
                          styles.filterChip,
                          {
                            backgroundColor: active
                              ? theme.colors.primary[600]
                              : theme.colors.white,
                            borderColor: active
                              ? theme.colors.primary[600]
                              : theme.colors.gray[200],
                          },
                        ]}>
                        <Typography
                          variant="small"
                          weight={active ? 'semibold' : 'normal'}
                          color={active ? theme.colors.white : theme.colors.gray[700]}>
                          {opt.label}
                        </Typography>
                      </TouchableOpacity>
                    );
                  })}
                </View>

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
              </View>
            }
            ListEmptyComponent={
              error ? null : (
                <Card variant="outlined" padding="lg" style={styles.emptyCard}>
                  <BoxIcon size={48} color={theme.colors.gray[400]} />
                  <Typography
                    variant="h3"
                    weight="semibold"
                    color={theme.colors.gray[700]}
                    style={styles.emptyTitle}>
                    No Items Found
                  </Typography>
                  <Typography variant="body" color={theme.colors.gray[500]} align="center">
                    {searchQuery || filterPriority !== 'all'
                      ? 'Try adjusting your filters'
                      : 'All items are adequately stocked'}
                  </Typography>
                </Card>
              )
            }
            renderItem={({item}) => {
              const priority = getPriorityLevel(item.currentStock, item.reorderPoint);
              const pColor = priorityColor(priority);
              const barPct = item.reorderPoint > 0
                ? Math.min((item.currentStock / item.reorderPoint) * 100, 100)
                : 100;
              const hasSupplier =
                !!(item.supplierName || item.supplierEmail || item.supplierPhone);
              return (
                <Card variant="elevated" padding="none" style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <View style={styles.itemInfo}>
                      <Typography variant="body" weight="bold" numberOfLines={1}>
                        {item.itemName}
                      </Typography>
                      <Typography variant="caption" color={theme.colors.gray[500]} numberOfLines={1}>
                        SKU: {item.skuCode}
                      </Typography>
                      {item.category ? (
                        <Typography variant="caption" color={theme.colors.gray[400]} numberOfLines={1}>
                          {item.category}
                        </Typography>
                      ) : null}
                    </View>
                    <View style={[styles.priorityBadge, {backgroundColor: pColor + '22'}]}>
                      <WarningIcon size={12} color={pColor} />
                      <Typography variant="caption" weight="semibold" color={pColor} style={{marginLeft: 4}}>
                        {priorityLabel(priority)}
                      </Typography>
                    </View>
                  </View>

                  {/* Stock level */}
                  <View style={styles.stockBlock}>
                    <View style={styles.stockRow}>
                      <Typography variant="small" color={theme.colors.gray[700]}>
                        Stock Level
                      </Typography>
                      <Typography
                        variant="small"
                        weight="semibold"
                        color={item.currentStock === 0 ? theme.colors.error[600] : theme.colors.gray[900]}>
                        {item.currentStock} / {item.reorderPoint}
                      </Typography>
                    </View>
                    <View style={styles.progressTrack}>
                      <View
                        style={[styles.progressFill, {width: `${barPct}%`, backgroundColor: pColor}]}
                      />
                    </View>
                    <View style={styles.stockRow}>
                      <Typography variant="caption" color={theme.colors.gray[500]}>
                        Min: {item.minimumStock}
                      </Typography>
                      <Typography variant="caption" color={theme.colors.gray[500]}>
                        Reorder: {item.reorderPoint}
                      </Typography>
                    </View>
                  </View>

                  {/* Supplier */}
                  {hasSupplier && (
                    <View style={styles.supplierBlock}>
                      <Typography variant="caption" weight="semibold" color={theme.colors.primary[900]} style={{marginBottom: 4}}>
                        Supplier
                      </Typography>
                      {item.supplierName ? (
                        <Typography variant="small" color={theme.colors.primary[800]}>
                          {item.supplierName}
                        </Typography>
                      ) : null}
                      {item.supplierEmail ? (
                        <Typography variant="caption" color={theme.colors.primary[700]}>
                          {item.supplierEmail}
                        </Typography>
                      ) : null}
                      {item.supplierPhone ? (
                        <Typography variant="caption" color={theme.colors.primary[700]}>
                          {item.supplierPhone}
                        </Typography>
                      ) : null}
                    </View>
                  )}
                </Card>
              );
            }}
          />
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
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: theme.spacing.lg,
    },
    contentWrap: {
      width: '100%',
      maxWidth: bp.contentMaxWidth,
      alignSelf: 'center',
      paddingHorizontal: bp.gutter,
      paddingTop: theme.spacing.lg,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.md,
    },
    statCard: {
      width: '48%',
      backgroundColor: theme.colors.white,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
      padding: theme.spacing.md,
      marginBottom: 12,
    },
    statTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    searchContainer: {
      marginBottom: theme.spacing.md,
    },
    searchInput: {
      backgroundColor: theme.colors.white,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: theme.typography.roles.sideheading.fontSize,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
      color: theme.colors.gray[900],
    },
    filterRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: theme.spacing.md,
    },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
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
    emptyCard: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl * 2,
    },
    emptyTitle: {
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.xs,
    },
    itemCard: {
      marginBottom: 0,
      overflow: 'hidden',
    },
    itemHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      padding: theme.spacing.md,
      gap: 8,
    },
    itemInfo: {
      flex: 1,
    },
    priorityBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    stockBlock: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.gray[200],
      padding: theme.spacing.md,
      gap: 8,
    },
    stockRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    progressTrack: {
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.gray[200],
      overflow: 'hidden',
    },
    progressFill: {
      height: 8,
      borderRadius: 4,
    },
    supplierBlock: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.gray[200],
      padding: theme.spacing.md,
      backgroundColor: theme.colors.primary[50],
    },
  });
