import React, {useState, useEffect} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  TextInput as RNTextInput,
  RefreshControl,
  Switch,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {useAuth} from '../contexts/AuthContext';
import {useApiErrorHandler} from '../hooks/useApiErrorHandler';
import {theme} from '../theme';
import ordersService from '../services/ordersService';
import {
  AlertCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  BoxIcon,
  CheckCircleIcon,
  ClockIcon,
  FileTextIcon,
} from '../components/icons';

interface OrdersScreenProps {
  visible: boolean;
  onClose: () => void;
}

export const OrdersScreen: React.FC<OrdersScreenProps> = ({
  visible,
  onClose,
}) => {
  const {token} = useAuth();
  const {handleApiError} = useApiErrorHandler();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncingNew, setSyncingNew] = useState(false);
  const [syncingOld, setSyncingOld] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [stats, setStats] = useState({
    totalOrders: 0,
    processed: 0,
    pending: 0,
  });
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [autoSyncInterval, setAutoSyncInterval] = useState(30);
  useEffect(() => {
    if (visible && token) {
      setCurrentPage(1);
      setOrders([]);
      loadData(1);
    }
  }, [visible, token]);
  useEffect(() => {
    if (searchQuery) {
      const filtered = orders.filter(
        order =>
          order.orderNumber?.toString().includes(searchQuery) ||
          order.vendor?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredOrders(filtered);
    } else {
      setFilteredOrders(orders);
    }
  }, [searchQuery, orders]);
  useEffect(() => {
    if (!autoSyncEnabled || !visible || !token) return;
    const intervalMs = autoSyncInterval * 60 * 1000;
    const autoSyncTimer = setInterval(async () => {
      if (!syncing) {
        try {
          console.log('Running auto-sync for orders...');
          const response = await ordersService.syncOrders(token, 0, 'new');
          if (response.success && (response.data.created > 0 || response.data.updated > 0)) {
            loadData(currentPage);
          }
        } catch (error) {
          console.error('Auto-sync error:', error);
        }
      }
    }, intervalMs);
    return () => clearInterval(autoSyncTimer);
  }, [autoSyncEnabled, autoSyncInterval, syncing, visible, token, currentPage]);
  const loadData = async (page: number = 1) => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const response = await ordersService.getOrders(token, {
        page,
        limit: 20,
      });
      const ordersData = response.orders || [];
      setOrders(ordersData);
      setFilteredOrders(ordersData);

      if (response.pagination) {
        setCurrentPage(response.pagination.page);
        setTotalPages(response.pagination.pages);
        setTotalOrders(response.pagination.total);
      }

      const processed = ordersData.filter((o: any) => o.stockProcessed).length;
      setStats({
        totalOrders: response.pagination?.total || ordersData.length,
        processed,
        pending: (response.pagination?.total || ordersData.length) - processed,
      });
    } catch (error: any) {
      console.error('Failed to fetch orders:', error);
      const wasHandled = await handleApiError(error);
      if (wasHandled) return;
      setError(error.message || 'Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  const onRefresh = () => {
    setRefreshing(true);
    setCurrentPage(1);
    setOrders([]);
    loadData(1);
  };
  const handleSyncNew = async () => {
    if (!token) return;
    setSyncingNew(true);
    setSyncing(true);
    try {
      const response = await ordersService.syncOrders(token, 0, 'new');
      if (response.success) {
        const { created = 0, updated = 0, skipped = 0 } = response.data;
        setCurrentPage(1);
        setOrders([]);
        loadData(1);
      }
    } catch (error: any) {
      console.error('Failed to sync new orders:', error);
      const wasHandled = await handleApiError(error);
      if (!wasHandled) {
        setError(error.message || 'Failed to sync new orders');
      }
    } finally {
      setSyncingNew(false);
      setSyncing(false);
    }
  };
  const handleSyncOld = async () => {
    if (!token) return;
    setSyncingOld(true);
    setSyncing(true);
    try {
      const response = await ordersService.syncOrders(token, 0, 'old');
      if (response.success) {
        const { created = 0, updated = 0, skipped = 0 } = response.data;
        setCurrentPage(1);
        setOrders([]);
        loadData(1);
      }
    } catch (error: any) {
      console.error('Failed to sync old orders:', error);
      const wasHandled = await handleApiError(error);
      if (!wasHandled) {
        setError(error.message || 'Failed to sync old orders');
      }
    } finally {
      setSyncingOld(false);
      setSyncing(false);
    }
  };
  const handleSyncAll = async () => {
    if (!token) return;
    setSyncingAll(true);
    setSyncing(true);
    try {
      const ordersResponse = await ordersService.syncOrders(token, 0, 'new');
      if (ordersResponse.success) {
        const { created = 0, updated = 0, skipped = 0 } = ordersResponse.data;
        let detailsSynced = 0;
        try {
          const detailsResponse = await ordersService.syncAllOrderDetails(token, 0);
          if (detailsResponse.success) {
            detailsSynced = detailsResponse.data.synced || 0;
          }
        } catch (detailsError) {
          console.error('Error syncing details:', detailsError);
        }
        setCurrentPage(1);
        setOrders([]);
        loadData(1);
      }
    } catch (error: any) {
      console.error('Failed to sync all orders:', error);
      const wasHandled = await handleApiError(error);
      if (!wasHandled) {
        setError(error.message || 'Failed to sync all orders');
      }
    } finally {
      setSyncingAll(false);
      setSyncing(false);
    }
  };
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage && !loading) {
      loadData(page);
    }
  };
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };
  const handleOrderPress = (orderNumber: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderNumber)) {
      newExpanded.delete(orderNumber);
    } else {
      newExpanded.add(orderNumber);
    }
    setExpandedOrders(newExpanded);
  };
  const formatCurrency = (amount: number) => {
    return `$${(amount || 0).toFixed(2)}`;
  };
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Invalid Date';
    }
  };
  const getStatusColor = (status: string) => {
    const statusMap: {[key: string]: string} = {
      Complete: theme.colors.success[600],
      Processing: theme.colors.warning[600],
      Shipped: theme.colors.primary[600],
      Cancelled: theme.colors.error[600],
      Pending: theme.colors.gray[500],
    };
    return statusMap[status] || theme.colors.gray[500];
  };
  const getStatusBgColor = (status: string) => {
    const statusMap: {[key: string]: string} = {
      Complete: theme.colors.success[100],
      Processing: theme.colors.warning[100],
      Shipped: theme.colors.primary[100],
      Cancelled: theme.colors.error[100],
      Pending: theme.colors.gray[100],
    };
    return statusMap[status] || theme.colors.gray[100];
  };
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
            Purchase Orders
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
            <Typography
              variant="body"
              color={theme.colors.gray[600]}
              style={{marginTop: 16}}>
              Loading orders...
            </Typography>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            stickyHeaderIndices={[3]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }>
            {/* Stats Cards - Scrollable */}
            <View style={styles.statsGrid}>
              <View style={styles.statCardWrapper}>
                <View style={[styles.statCard, {backgroundColor: theme.colors.gray[600]}]}>
                  <FileTextIcon size={20} color={theme.colors.white} />
                  <Typography variant="caption" style={styles.statLabel}>
                    Total Orders
                  </Typography>
                  <Typography variant="h2" weight="bold" style={styles.statValue}>
                    {stats.totalOrders}
                  </Typography>
                  <Typography variant="caption" style={styles.statSubtitle}>
                    All orders
                  </Typography>
                </View>
              </View>
              <View style={styles.statCardWrapper}>
                <View style={[styles.statCard, {backgroundColor: theme.colors.success[600]}]}>
                  <CheckCircleIcon size={20} color={theme.colors.white} />
                  <Typography variant="caption" style={styles.statLabel}>
                    Processed
                  </Typography>
                  <Typography variant="h2" weight="bold" style={styles.statValue}>
                    {stats.processed}
                  </Typography>
                  <Typography variant="caption" style={styles.statSubtitle}>
                    Stock processed
                  </Typography>
                </View>
              </View>
              <View style={styles.statCardWrapper}>
                <View style={[styles.statCard, {backgroundColor: theme.colors.warning[600]}]}>
                  <ClockIcon size={20} color={theme.colors.white} />
                  <Typography variant="caption" style={styles.statLabel}>
                    Pending
                  </Typography>
                  <Typography variant="h2" weight="bold" style={styles.statValue}>
                    {stats.pending}
                  </Typography>
                  <Typography variant="caption" style={styles.statSubtitle}>
                    Not processed
                  </Typography>
                </View>
              </View>
            </View>

            {/* Sync Buttons */}
            <View style={styles.syncButtonsContainer}>
              <TouchableOpacity
                onPress={handleSyncNew}
                disabled={syncing}
                style={[
                  styles.syncActionButton,
                  styles.syncNewButton,
                  syncing && styles.syncButtonDisabled
                ]}
              >
                {syncingNew ? (
                  <ActivityIndicator size="small" color={theme.colors.white} />
                ) : (
                  <Typography variant="small" weight="semibold" color={theme.colors.white}>
                    ↑ New Sync
                  </Typography>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSyncOld}
                disabled={syncing}
                style={[
                  styles.syncActionButton,
                  styles.syncOldButton,
                  syncing && styles.syncButtonDisabled
                ]}
              >
                {syncingOld ? (
                  <ActivityIndicator size="small" color={theme.colors.primary[600]} />
                ) : (
                  <Typography variant="small" weight="semibold" color={theme.colors.primary[600]}>
                    ↓ Old Sync
                  </Typography>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSyncAll}
                disabled={syncing}
                style={[
                  styles.syncActionButton,
                  styles.syncAllButton,
                  syncing && styles.syncButtonDisabled
                ]}
              >
                {syncingAll ? (
                  <ActivityIndicator size="small" color={theme.colors.white} />
                ) : (
                  <Typography variant="small" weight="semibold" color={theme.colors.white}>
                    ⟳ Sync All
                  </Typography>
                )}
              </TouchableOpacity>
            </View>

            {/* Automation Settings */}
            <View style={styles.automationContainer}>
              <View style={styles.automationRow}>
                <View style={styles.automationLabel}>
                  <Typography variant="small" weight="semibold" color={theme.colors.gray[700]}>
                    Auto-Sync
                  </Typography>
                  <Typography variant="caption" color={theme.colors.gray[500]}>
                    Every {autoSyncInterval} min
                  </Typography>
                </View>
                <Switch
                  value={autoSyncEnabled}
                  onValueChange={setAutoSyncEnabled}
                  trackColor={{ false: theme.colors.gray[300], true: theme.colors.primary[400] }}
                  thumbColor={autoSyncEnabled ? theme.colors.primary[600] : theme.colors.gray[50]}
                />
              </View>
            </View>

            {/* Sticky Header: Search Bar */}
            <View style={styles.stickySearchContainer}>
              <View style={styles.searchContainer}>
                <RNTextInput
                  style={styles.searchInput}
                  placeholder="Search by order # or vendor..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor={theme.colors.gray[400]}
                />
              </View>
            </View>

            {/* Scrollable Content */}
            <View>
            {/* Error State */}
            {error && (
              <Card variant="outlined" padding="lg" style={styles.errorCard}>
                <View style={styles.errorContent}>
                  <AlertCircleIcon size={24} color={theme.colors.error[500]} />
                  <Typography
                    variant="body"
                    color={theme.colors.error[700]}
                    style={styles.errorText}>
                    {error}
                  </Typography>
                </View>
              </Card>
            )}
            {/* Empty State */}
            {!error && filteredOrders.length === 0 && (
              <Card variant="outlined" padding="lg" style={styles.emptyCard}>
                <FileTextIcon size={48} color={theme.colors.gray[400]} />
                <Typography
                  variant="h3"
                  weight="semibold"
                  color={theme.colors.gray[700]}
                  style={styles.emptyTitle}>
                  No orders found
                </Typography>
                <Typography
                  variant="body"
                  color={theme.colors.gray[500]}
                  align="center">
                  {searchQuery
                    ? 'Try adjusting your search'
                    : 'No orders available'}
                </Typography>
              </Card>
            )}
            {/* Orders List */}
            <View style={styles.ordersList}>
              {filteredOrders.map((order, index) => {
                const isExpanded = expandedOrders.has(order.orderNumber);
                return (
                  <Card
                    key={order._id || index}
                    variant="elevated"
                    padding="none"
                    style={styles.orderCard}>
                    <TouchableOpacity
                      onPress={() => handleOrderPress(order.orderNumber)}
                      style={styles.orderHeader}>
                      <View style={styles.orderHeaderLeft}>
                        <View style={styles.chevronContainer}>
                          {isExpanded ? (
                            <ChevronDownIcon size={20} color={theme.colors.gray[600]} />
                          ) : (
                            <ChevronRightIcon size={20} color={theme.colors.gray[600]} />
                          )}
                        </View>
                        <View style={styles.orderInfo}>
                          <Typography variant="body" weight="bold">
                            #{order.orderNumber}
                          </Typography>
                          <Typography variant="caption" color={theme.colors.gray[500]}>
                            {order.vendor?.name || 'N/A'}
                          </Typography>
                        </View>
                      </View>
                      <View style={styles.orderHeaderRight}>
                        <Typography
                          variant="body"
                          weight="bold"
                          color={theme.colors.success[600]}>
                          {formatCurrency(order.total)}
                        </Typography>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          {formatDate(order.orderDate)}
                        </Typography>
                      </View>
                    </TouchableOpacity>
                    {/* Order Details */}
                    <View style={styles.orderMeta}>
                      <View style={styles.metaRow}>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          Status
                        </Typography>
                        <View
                          style={[
                            styles.statusBadge,
                            {backgroundColor: getStatusBgColor(order.status)},
                          ]}>
                          <Typography
                            variant="caption"
                            weight="semibold"
                            color={getStatusColor(order.status)}>
                            {order.status || 'Pending'}
                          </Typography>
                        </View>
                      </View>
                      <View style={styles.metaRow}>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          Stock
                        </Typography>
                        {order.stockProcessed ? (
                          <View style={[styles.statusBadge, {backgroundColor: theme.colors.success[100]}]}>
                            <Typography
                              variant="caption"
                              weight="semibold"
                              color={theme.colors.success[600]}>
                              Processed
                            </Typography>
                          </View>
                        ) : (
                          <View style={[styles.statusBadge, {backgroundColor: theme.colors.warning[100]}]}>
                            <Typography
                              variant="caption"
                              weight="semibold"
                              color={theme.colors.warning[600]}>
                              Pending
                            </Typography>
                          </View>
                        )}
                      </View>
                      <View style={styles.metaRow}>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          Items
                        </Typography>
                        <Typography variant="small" weight="medium">
                          {order.itemCount || 0} items
                        </Typography>
                      </View>
                    </View>
                    {/* Expanded Items */}
                    {isExpanded && order.items && order.items.length > 0 && (
                      <View style={styles.expandedContent}>
                        <Typography variant="small" weight="semibold" style={styles.itemsTitle}>
                          Order Items ({order.items.length})
                        </Typography>
                        {order.items.map((item: any, itemIndex: number) => (
                          <View key={itemIndex} style={styles.itemCard}>
                            <View style={styles.itemHeader}>
                              <Typography variant="small" weight="bold" numberOfLines={1} style={{flex: 1}}>
                                {item.name || 'N/A'}
                              </Typography>
                            </View>
                            <View style={styles.itemRow}>
                              <Typography variant="caption" color={theme.colors.gray[500]}>
                                SKU
                              </Typography>
                              <Typography variant="small" weight="medium">
                                {item.sku || 'N/A'}
                              </Typography>
                            </View>
                            <View style={styles.itemRow}>
                              <Typography variant="caption" color={theme.colors.gray[500]}>
                                Quantity
                              </Typography>
                              <Typography variant="small" weight="bold">
                                {item.qty || 0}
                              </Typography>
                            </View>
                            <View style={styles.itemRow}>
                              <Typography variant="caption" color={theme.colors.gray[500]}>
                                Unit Price
                              </Typography>
                              <Typography variant="small">
                                {formatCurrency(item.unitPrice || 0)}
                              </Typography>
                            </View>
                            <View style={styles.itemRow}>
                              <Typography variant="caption" color={theme.colors.gray[500]}>
                                Line Total
                              </Typography>
                              <Typography variant="small" weight="bold" color={theme.colors.success[600]}>
                                {formatCurrency(item.lineTotal || (item.qty || 0) * (item.unitPrice || 0))}
                              </Typography>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </Card>
                );
              })}
            </View>
            {/* Pagination Info and Page Numbers */}
            {!error && filteredOrders.length > 0 && totalPages > 0 && (
              <View style={styles.paginationContainer}>
                <Typography variant="small" color={theme.colors.gray[600]} align="center" style={{marginBottom: 16}}>
                  Showing {(currentPage - 1) * 20 + 1}-{Math.min(currentPage * 20, totalOrders)} of {totalOrders} orders
                </Typography>

                <View style={styles.paginationControls}>
                  {/* Previous Button */}
                  <TouchableOpacity
                    style={[
                      styles.pageButton,
                      styles.navButton,
                      currentPage === 1 && styles.pageButtonDisabled,
                    ]}
                    onPress={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1 || loading}>
                    <Typography
                      variant="small"
                      weight="semibold"
                      color={currentPage === 1 ? theme.colors.gray[400] : theme.colors.primary[600]}>
                      Prev
                    </Typography>
                  </TouchableOpacity>

                  {/* Page Numbers */}
                  <View style={styles.pageNumbersContainer}>
                    {getPageNumbers().map((page, index) => {
                      if (page === '...') {
                        return (
                          <View key={`ellipsis-${index}`} style={styles.ellipsis}>
                            <Typography variant="small" color={theme.colors.gray[500]}>
                              ...
                            </Typography>
                          </View>
                        );
                      }
                      const pageNum = page as number;
                      const isActive = pageNum === currentPage;
                      return (
                        <TouchableOpacity
                          key={pageNum}
                          style={[
                            styles.pageButton,
                            isActive && styles.pageButtonActive,
                          ]}
                          onPress={() => goToPage(pageNum)}
                          disabled={loading}>
                          <Typography
                            variant="small"
                            weight={isActive ? 'bold' : 'medium'}
                            color={isActive ? theme.colors.white : theme.colors.gray[700]}>
                            {pageNum}
                          </Typography>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Next Button */}
                  <TouchableOpacity
                    style={[
                      styles.pageButton,
                      styles.navButton,
                      currentPage === totalPages && styles.pageButtonDisabled,
                    ]}
                    onPress={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages || loading}>
                    <Typography
                      variant="small"
                      weight="semibold"
                      color={currentPage === totalPages ? theme.colors.gray[400] : theme.colors.primary[600]}>
                      Next
                    </Typography>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
};
const styles = StyleSheet.create({
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  stickySearchContainer: {
    backgroundColor: theme.colors.gray[50],
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  automationContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.primary[50],
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.primary[200],
    marginBottom: theme.spacing.sm,
  },
  automationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  automationLabel: {
    flex: 1,
  },
  syncButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    justifyContent: 'space-between',
  },
  syncActionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    marginHorizontal: 4,
  },
  syncNewButton: {
    backgroundColor: theme.colors.primary[600],
  },
  syncOldButton: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.primary[600],
  },
  syncAllButton: {
    backgroundColor: theme.colors.success[600],
  },
  syncButtonDisabled: {
    opacity: 0.5,
  },
  statCardWrapper: {
    width: '33.33%',
    padding: 4,
  },
  statCard: {
    borderRadius: 12,
    padding: 12,
    minHeight: 120,
  },
  statLabel: {
    color: '#ffffff',
    fontSize: 11,
    opacity: 0.9,
    marginTop: 8,
    marginBottom: 4,
  },
  statValue: {
    color: '#ffffff',
    fontSize: 24,
    marginBottom: 4,
  },
  statSubtitle: {
    color: '#ffffff',
    fontSize: 10,
    opacity: 0.85,
  },
  searchContainer: {
    marginBottom: 0,
  },
  searchInput: {
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
    color: theme.colors.gray[900],
  },
  errorCard: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
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
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    alignItems: 'center',
    paddingVertical: theme.spacing.xl * 2,
  },
  emptyTitle: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  ordersList: {
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  orderCard: {
    marginBottom: 0,
    overflow: 'hidden',
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
  },
  orderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  chevronContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderInfo: {
    flex: 1,
  },
  orderHeaderRight: {
    alignItems: 'flex-end',
  },
  orderMeta: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
    padding: theme.spacing.md,
    backgroundColor: theme.colors.gray[50],
  },
  itemsTitle: {
    marginBottom: theme.spacing.md,
    color: theme.colors.gray[700],
  },
  itemCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 8,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    gap: 4,
  },
  itemHeader: {
    marginBottom: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paginationContainer: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pageNumbersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pageButton: {
    minWidth: 36,
    height: 36,
    backgroundColor: theme.colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  navButton: {
    minWidth: 60,
    paddingHorizontal: 12,
  },
  pageButtonActive: {
    backgroundColor: theme.colors.primary[600],
    borderColor: theme.colors.primary[600],
  },
  pageButtonDisabled: {
    backgroundColor: theme.colors.gray[100],
    borderColor: theme.colors.gray[200],
  },
  ellipsis: {
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
