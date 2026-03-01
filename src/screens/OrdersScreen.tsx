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
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalOrders: 0,
    processed: 0,
    pending: 0,
  });

  useEffect(() => {
    if (visible && token) {
      loadData();
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

  const loadData = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const response = await ordersService.getOrders(token, {
        limit: 100,
      });

      const ordersData = response.orders || [];
      setOrders(ordersData);
      setFilteredOrders(ordersData);

      // Calculate stats
      const processed = ordersData.filter((o: any) => o.stockProcessed).length;
      setStats({
        totalOrders: ordersData.length,
        processed,
        pending: ordersData.length - processed,
      });
    } catch (error: any) {
      console.error('Failed to fetch orders:', error);

      // Check if token expired and handle auto-logout
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
    loadData();
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
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }>
            {/* Stats Cards */}
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

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <RNTextInput
                style={styles.searchInput}
                placeholder="Search by order # or vendor..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={theme.colors.gray[400]}
              />
            </View>

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
                          {order.items?.length || 0} items
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
    padding: theme.spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: theme.spacing.lg,
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
    marginBottom: theme.spacing.md,
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
  ordersList: {
    gap: theme.spacing.md,
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
});
