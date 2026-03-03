import React, {useState, useEffect} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput as RNTextInput,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {useAuth} from '../contexts/AuthContext';
import {useApiErrorHandler} from '../hooks/useApiErrorHandler';
import {theme} from '../theme';
import truckCheckoutService from '../services/truckCheckoutService';
import {
  TruckIcon,
  ClockIcon,
  CheckCircleIcon,
  AlertCircleIcon,
} from '../components/icons';

type TabType = 'checkouts' | 'sales';

export const TruckCheckoutListScreen = () => {
  const {token} = useAuth();
  const {handleApiError} = useApiErrorHandler();

  const [activeTab, setActiveTab] = useState<TabType>('checkouts');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isMounted, setIsMounted] = useState(true);

  // Checkouts data
  const [checkouts, setCheckouts] = useState<any[]>([]);
  const [pagination, setPagination] = useState({total: 0, page: 1, limit: 50, pages: 0});

  // Sales tracking data
  const [salesTracking, setSalesTracking] = useState<any[]>([]);
  const [salesSummary, setSalesSummary] = useState<any>({});

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('');

  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'checkouts') {
      loadCheckouts();
    } else if (activeTab === 'sales') {
      loadSalesTracking();
    }
  }, [activeTab, statusFilter, employeeFilter, pagination.page]);

  const loadCheckouts = async () => {
    if (!token) return;

    try {
      setLoading(true);

      const filters: any = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (statusFilter !== 'all') filters.status = statusFilter;
      if (employeeFilter.trim()) filters.employeeName = employeeFilter.trim();

      const result = await truckCheckoutService.getCheckouts(token, filters);

      if (isMounted) {
        setCheckouts(result.checkouts || []);
        setPagination(result.pagination || {total: 0, page: 1, limit: 50, pages: 0});
      }
    } catch (error: any) {
      console.error('Load checkouts error:', error);
      const wasHandled = await handleApiError(error);
      if (!wasHandled && isMounted) {
        setCheckouts([]);
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  };

  const loadSalesTracking = async () => {
    if (!token) return;

    try {
      setLoading(true);

      const filters: any = {};
      if (employeeFilter.trim()) filters.employeeName = employeeFilter.trim();

      const result = await truckCheckoutService.getSalesTracking(token, filters);

      if (isMounted) {
        setSalesTracking(result.checkouts || []);
        setSalesSummary(result.summary || {});
      }
    } catch (error: any) {
      console.error('Load sales tracking error:', error);
      const wasHandled = await handleApiError(error);
      if (!wasHandled && isMounted) {
        setSalesTracking([]);
        setSalesSummary({});
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (activeTab === 'checkouts') {
      loadCheckouts().finally(() => setRefreshing(false));
    } else {
      loadSalesTracking().finally(() => setRefreshing(false));
    }
  };

  const formatDate = (date: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const config: any = {
      checked_out: {color: theme.colors.warning[600], label: 'Checked Out'},
      completed: {color: theme.colors.success[600], label: 'Completed'},
      cancelled: {color: theme.colors.error[600], label: 'Cancelled'},
    };

    const {color, label} = config[status] || config.checked_out;

    return (
      <View style={[styles.badge, {backgroundColor: `${color}20`}]}>
        <Typography variant="caption" style={{color}} weight="semibold">
          {label}
        </Typography>
      </View>
    );
  };

  const getStatusBadgeForTracking = (status: string) => {
    const config: any = {
      Good: {color: theme.colors.success[600], label: 'Good'},
      Shortage: {color: theme.colors.warning[600], label: 'Shortage'},
      Overage: {color: theme.colors.error[600], label: 'Overage'},
    };

    const {color, label} = config[status] || config.Good;

    return (
      <View style={[styles.badge, {backgroundColor: `${color}20`}]}>
        <Typography variant="caption" style={{color}} weight="semibold">
          {label}
        </Typography>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TruckIcon size={32} color={theme.colors.primary[600]} />
            <Typography variant="h2" weight="bold" style={styles.headerTitle}>
              Truck Checkouts
            </Typography>
          </View>
          <Typography
            variant="body"
            color={theme.colors.gray[500]}
            style={styles.headerSubtitle}>
            Track items taken by employees in trucks
          </Typography>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'checkouts' && styles.tabActive]}
            onPress={() => setActiveTab('checkouts')}>
            <Typography
              variant="body"
              weight={activeTab === 'checkouts' ? 'bold' : 'medium'}
              color={
                activeTab === 'checkouts'
                  ? theme.colors.primary[600]
                  : theme.colors.gray[600]
              }>
              Checkouts
            </Typography>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'sales' && styles.tabActive]}
            onPress={() => setActiveTab('sales')}>
            <Typography
              variant="body"
              weight={activeTab === 'sales' ? 'bold' : 'medium'}
              color={
                activeTab === 'sales'
                  ? theme.colors.primary[600]
                  : theme.colors.gray[600]
              }>
              Sales & Remaining
            </Typography>
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <Card variant="elevated" padding="md" style={styles.filtersCard}>
          <Typography variant="body" weight="semibold" style={styles.filterTitle}>
            Filters
          </Typography>

          {activeTab === 'checkouts' && (
            <View style={styles.filterGroup}>
              <Typography variant="small" color={theme.colors.gray[600]} style={styles.filterLabel}>
                Status
              </Typography>
              <View style={styles.statusFilters}>
                {['all', 'checked_out', 'completed', 'cancelled'].map(status => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusFilter,
                      statusFilter === status && styles.statusFilterActive,
                    ]}
                    onPress={() => setStatusFilter(status)}>
                    <Typography
                      variant="caption"
                      color={
                        statusFilter === status
                          ? theme.colors.white
                          : theme.colors.gray[600]
                      }
                      weight={statusFilter === status ? 'semibold' : 'regular'}>
                      {status === 'all' ? 'All' : status.replace('_', ' ')}
                    </Typography>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.filterGroup}>
            <Typography variant="small" color={theme.colors.gray[600]} style={styles.filterLabel}>
              Employee Name
            </Typography>
            <RNTextInput
              style={styles.filterInput}
              value={employeeFilter}
              onChangeText={setEmployeeFilter}
              placeholder="Filter by employee name"
              placeholderTextColor={theme.colors.gray[400]}
            />
          </View>

          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={() => {
              setStatusFilter('all');
              setEmployeeFilter('');
              setPagination(prev => ({...prev, page: 1}));
            }}>
            <Typography variant="small" color={theme.colors.primary[600]} weight="semibold">
              Clear Filters
            </Typography>
          </TouchableOpacity>
        </Card>

        {/* Checkouts Tab */}
        {activeTab === 'checkouts' && (
          <Card variant="elevated" padding="md" style={styles.contentCard}>
            <Typography variant="body" weight="semibold" style={styles.contentTitle}>
              Checkouts ({pagination.total} records)
            </Typography>

            {loading && checkouts.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary[600]} />
              </View>
            ) : checkouts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Typography variant="body" color={theme.colors.gray[500]}>
                  No checkouts found
                </Typography>
              </View>
            ) : (
              checkouts.map((checkout: any) => (
                <View key={checkout._id} style={styles.checkoutCard}>
                  <View style={styles.checkoutHeader}>
                    <Typography variant="body" weight="bold">
                      {checkout.employeeName}
                    </Typography>
                    {getStatusBadge(checkout.status)}
                  </View>

                  <View style={styles.checkoutRow}>
                    <Typography variant="small" color={theme.colors.gray[500]}>
                      Truck:
                    </Typography>
                    <Typography variant="small">{checkout.truckNumber || '-'}</Typography>
                  </View>

                  <View style={styles.checkoutRow}>
                    <Typography variant="small" color={theme.colors.gray[500]}>
                      Item:
                    </Typography>
                    <View style={{flex: 1}}>
                      {checkout.itemName ? (
                        <>
                          <Typography variant="small" weight="semibold">
                            {checkout.itemName}
                          </Typography>
                          <Typography variant="caption" color={theme.colors.gray[500]}>
                            Qty: {checkout.quantityTaking || 0}
                          </Typography>
                        </>
                      ) : (
                        <>
                          <Typography variant="small" weight="semibold">
                            {checkout.itemsTaken?.length || 0} items
                          </Typography>
                          <Typography variant="caption" color={theme.colors.gray[500]}>
                            Total qty:{' '}
                            {checkout.itemsTaken?.reduce(
                              (sum: number, item: any) => sum + item.quantity,
                              0
                            ) || 0}
                          </Typography>
                        </>
                      )}
                    </View>
                  </View>

                  <View style={styles.checkoutRow}>
                    <Typography variant="small" color={theme.colors.gray[500]}>
                      Date:
                    </Typography>
                    <Typography variant="small">{formatDate(checkout.checkoutDate)}</Typography>
                  </View>

                  {checkout.invoiceNumbers && checkout.invoiceNumbers.length > 0 && (
                    <View style={styles.checkoutRow}>
                      <Typography variant="small" color={theme.colors.gray[500]}>
                        Invoices:
                      </Typography>
                      <Typography variant="small" weight="semibold">
                        {checkout.invoiceNumbers.length} invoices
                      </Typography>
                    </View>
                  )}
                </View>
              ))
            )}
          </Card>
        )}

        {/* Sales & Remaining Tab */}
        {activeTab === 'sales' && (
          <>
            {/* Summary Cards */}
            <View style={styles.summaryContainer}>
              <View style={[styles.summaryCard, styles.summaryCardGood]}>
                <View style={styles.summaryCardContent}>
                  <Typography variant="small" weight="semibold" color={theme.colors.success[700]}>
                    Good (Matched)
                  </Typography>
                  <Typography variant="h2" weight="bold" color={theme.colors.success[700]}>
                    {salesSummary.good || 0}
                  </Typography>
                </View>
                <CheckCircleIcon size={32} color={theme.colors.success[600]} />
              </View>

              <View style={[styles.summaryCard, styles.summaryCardShortage]}>
                <View style={styles.summaryCardContent}>
                  <Typography variant="small" weight="semibold" color={theme.colors.warning[700]}>
                    Shortage
                  </Typography>
                  <Typography variant="h2" weight="bold" color={theme.colors.warning[700]}>
                    {salesSummary.shortage || 0}
                  </Typography>
                </View>
                <ClockIcon size={32} color={theme.colors.warning[600]} />
              </View>

              <View style={[styles.summaryCard, styles.summaryCardOverage]}>
                <View style={styles.summaryCardContent}>
                  <Typography variant="small" weight="semibold" color={theme.colors.error[700]}>
                    Overage
                  </Typography>
                  <Typography variant="h2" weight="bold" color={theme.colors.error[700]}>
                    {salesSummary.overage || 0}
                  </Typography>
                </View>
                <AlertCircleIcon size={32} color={theme.colors.error[600]} />
              </View>
            </View>

            {/* Sales Tracking List */}
            <Card variant="elevated" padding="md" style={styles.contentCard}>
              <Typography variant="body" weight="semibold" style={styles.contentTitle}>
                Sales & Remaining Tracking
              </Typography>
              <Typography variant="caption" color={theme.colors.gray[500]} style={{marginBottom: 12}}>
                Track what was sold vs what was checked out
              </Typography>

              {loading && salesTracking.length === 0 ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.colors.primary[600]} />
                </View>
              ) : salesTracking.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Typography variant="body" color={theme.colors.gray[500]}>
                    No sales tracking data found
                  </Typography>
                </View>
              ) : (
                salesTracking.map((item: any) => (
                  <View key={item.checkoutId} style={styles.salesCard}>
                    <View style={styles.salesHeader}>
                      <View style={{flex: 1}}>
                        <Typography variant="body" weight="bold">
                          {item.employeeName}
                        </Typography>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          Truck: {item.truckNumber || '-'}
                        </Typography>
                      </View>
                      {getStatusBadgeForTracking(item.status)}
                    </View>

                    <Typography variant="small" weight="semibold" style={{marginBottom: 8}}>
                      {item.itemName}
                    </Typography>

                    <View style={styles.salesRow}>
                      <Typography variant="small" color={theme.colors.gray[500]}>
                        Checked Out:
                      </Typography>
                      <Typography variant="small" weight="bold">
                        {item.quantityCheckedOut}
                      </Typography>
                    </View>

                    <View style={styles.salesRow}>
                      <Typography variant="small" color={theme.colors.gray[500]}>
                        Sold:
                      </Typography>
                      <Typography variant="small" weight="bold" color={theme.colors.primary[600]}>
                        {item.totalSold}
                      </Typography>
                    </View>

                    <View style={styles.salesRow}>
                      <Typography variant="small" color={theme.colors.gray[500]}>
                        Remaining:
                      </Typography>
                      <Typography variant="small" weight="bold">
                        {item.remaining}
                      </Typography>
                    </View>

                    {item.matchedInvoices > 0 && (
                      <View style={styles.salesRow}>
                        <Typography variant="small" color={theme.colors.gray[500]}>
                          Invoices:
                        </Typography>
                        <Typography variant="small">
                          {item.matchedInvoices} matched
                        </Typography>
                      </View>
                    )}
                  </View>
                ))
              )}
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.gray[50],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
  },
  header: {
    marginBottom: theme.spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: theme.spacing.xs,
  },
  headerTitle: {
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    padding: 4,
    marginBottom: theme.spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: theme.colors.primary[50],
  },
  filtersCard: {
    marginBottom: theme.spacing.lg,
  },
  filterTitle: {
    marginBottom: theme.spacing.md,
  },
  filterGroup: {
    marginBottom: theme.spacing.md,
  },
  filterLabel: {
    marginBottom: theme.spacing.xs,
  },
  statusFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusFilter: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.gray[100],
  },
  statusFilterActive: {
    backgroundColor: theme.colors.primary[600],
  },
  filterInput: {
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
    borderRadius: 8,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 14,
    color: theme.colors.gray[900],
    backgroundColor: theme.colors.white,
  },
  clearFiltersButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  contentCard: {
    marginBottom: theme.spacing.lg,
  },
  contentTitle: {
    marginBottom: theme.spacing.md,
  },
  loadingContainer: {
    paddingVertical: theme.spacing.xl * 2,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: theme.spacing.xl * 2,
    alignItems: 'center',
  },
  checkoutCard: {
    backgroundColor: theme.colors.gray[50],
    borderRadius: 12,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
  },
  checkoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  checkoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: theme.spacing.lg,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryCardGood: {
    backgroundColor: theme.colors.success[50],
    borderWidth: 1,
    borderColor: theme.colors.success[200],
  },
  summaryCardShortage: {
    backgroundColor: theme.colors.warning[50],
    borderWidth: 1,
    borderColor: theme.colors.warning[200],
  },
  summaryCardOverage: {
    backgroundColor: theme.colors.error[50],
    borderWidth: 1,
    borderColor: theme.colors.error[200],
  },
  summaryCardContent: {
    flex: 1,
  },
  salesCard: {
    backgroundColor: theme.colors.gray[50],
    borderRadius: 12,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
  },
  salesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  salesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
});
