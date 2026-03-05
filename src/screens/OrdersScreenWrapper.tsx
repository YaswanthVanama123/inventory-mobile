import React, {useState, useEffect} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput as RNTextInput,
  RefreshControl,
  Alert,
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

interface OrdersScreenWrapperProps {
  navigation: any;
}

export const OrdersScreenWrapper: React.FC<OrdersScreenWrapperProps> = ({
  navigation,
}) => {
  const {token, user} = useAuth();
  const {handleApiError} = useApiErrorHandler();
  const isAdmin = user?.role === 'admin';
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
    if (token) {
      loadData();
    }
  }, [token]);
  useEffect(() => {
    if (searchQuery) {
      const filtered = orders.filter(
        order =>
          order.orderNumber?.toString().includes(searchQuery) ||
          order.vendor?.name?.toLowerCase().includes(searchQuery.toLowerCase()),
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
      const processed = ordersData.filter((o: any) => o.stockProcessed).length;
      setStats({
        totalOrders: ordersData.length,
        processed,
        pending: ordersData.length - processed,
      });
    } catch (error: any) {
      console.error('Failed to fetch orders:', error);
      const wasHandled = await handleApiError(error);
      if (!wasHandled) {
        setError(error.message || 'Failed to load orders');
      }
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
  const handleVerifyOrder = (order: any) => {
    if (!order._id) {
      Alert.alert('Error', 'Order ID not found');
      return;
    }
    navigation.navigate('OrderVerification', {orderId: order._id});
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
      received: theme.colors.success[600],
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
      received: theme.colors.success[100],
    };
    return statusMap[status] || theme.colors.gray[100];
  };
  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
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
          {/* Stats */}
          <View style={styles.statsContainer}>
            <Card style={styles.statCard}>
              <Typography variant="small" color={theme.colors.gray[600]}>
                Total
              </Typography>
              <Typography variant="h2" weight="bold">
                {stats.totalOrders}
              </Typography>
            </Card>
            <Card style={styles.statCard}>
              <Typography variant="small" color={theme.colors.gray[600]}>
                Processed
              </Typography>
              <Typography
                variant="h2"
                weight="bold"
                color={theme.colors.success[600]}>
                {stats.processed}
              </Typography>
            </Card>
            <Card style={styles.statCard}>
              <Typography variant="small" color={theme.colors.gray[600]}>
                Pending
              </Typography>
              <Typography
                variant="h2"
                weight="bold"
                color={theme.colors.warning[600]}>
                {stats.pending}
              </Typography>
            </Card>
          </View>
          {/* Search */}
          <View style={styles.searchContainer}>
            <RNTextInput
              style={styles.searchInput}
              placeholder="Search by order number or vendor..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={theme.colors.gray[400]}
            />
          </View>
          {/* Orders List */}
          {error ? (
            <View style={styles.errorContainer}>
              <AlertCircleIcon size={48} color={theme.colors.error[600]} />
              <Typography
                variant="body"
                color={theme.colors.error[600]}
                style={{marginTop: 16}}>
                {error}
              </Typography>
            </View>
          ) : filteredOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <BoxIcon size={48} color={theme.colors.gray[400]} />
              <Typography
                variant="body"
                color={theme.colors.gray[600]}
                style={{marginTop: 16}}>
                No orders found
              </Typography>
            </View>
          ) : (
            filteredOrders.map(order => (
              <Card key={order._id} style={styles.orderCard}>
                <TouchableOpacity
                  onPress={() => handleOrderPress(order.orderNumber)}>
                  <View style={styles.orderHeader}>
                    <View style={styles.orderHeaderLeft}>
                      <Typography variant="h4" weight="bold">
                        #{order.orderNumber}
                      </Typography>
                      <View
                        style={[
                          styles.statusBadge,
                          {backgroundColor: getStatusBgColor(order.status)},
                        ]}>
                        <Typography
                          variant="small"
                          weight="semibold"
                          color={getStatusColor(order.status)}>
                          {order.status}
                        </Typography>
                      </View>
                    </View>
                    {expandedOrders.has(order.orderNumber) ? (
                      <ChevronDownIcon
                        size={20}
                        color={theme.colors.gray[600]}
                      />
                    ) : (
                      <ChevronRightIcon
                        size={20}
                        color={theme.colors.gray[600]}
                      />
                    )}
                  </View>
                  <View style={styles.orderInfo}>
                    <Typography variant="body" color={theme.colors.gray[700]}>
                      {order.vendor?.name || 'N/A'}
                    </Typography>
                    <Typography variant="small" color={theme.colors.gray[500]}>
                      {formatDate(order.orderDate)}
                    </Typography>
                  </View>
                  <View style={styles.orderMeta}>
                    <View style={styles.metaItem}>
                      <Typography
                        variant="small"
                        color={theme.colors.gray[600]}>
                        Total
                      </Typography>
                      <Typography
                        variant="body"
                        weight="semibold"
                        color={theme.colors.gray[900]}>
                        {formatCurrency(order.total)}
                      </Typography>
                    </View>
                    <View style={styles.metaItem}>
                      <Typography
                        variant="small"
                        color={theme.colors.gray[600]}>
                        Items
                      </Typography>
                      <Typography
                        variant="body"
                        weight="semibold"
                        color={theme.colors.gray[900]}>
                        {order.items?.length || 0}
                      </Typography>
                    </View>
                    <View style={styles.metaItem}>
                      <Typography
                        variant="small"
                        color={theme.colors.gray[600]}>
                        Stock
                      </Typography>
                      {order.stockProcessed ? (
                        <CheckCircleIcon
                          size={20}
                          color={theme.colors.success[600]}
                        />
                      ) : (
                        <ClockIcon size={20} color={theme.colors.warning[600]} />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
                {/* Verify Order Button */}
                {(order.status === 'received' || order.status === 'Complete') &&
                  !order.stockProcessed && (
                    <TouchableOpacity
                      style={styles.verifyButton}
                      onPress={() => handleVerifyOrder(order)}>
                      <CheckCircleIcon size={16} color={theme.colors.white} />
                      <Typography style={styles.verifyButtonText}>
                        Verify Order
                      </Typography>
                    </TouchableOpacity>
                  )}
                {/* Expanded Details */}
                {expandedOrders.has(order.orderNumber) && (
                  <View style={styles.expandedContent}>
                    <Typography
                      variant="h4"
                      weight="semibold"
                      style={{marginBottom: 12}}>
                      Order Items
                    </Typography>
                    {order.items?.slice(0, 5).map((item: any, idx: number) => (
                      <View key={idx} style={styles.itemRow}>
                        <View style={{flex: 1}}>
                          <Typography variant="body" weight="medium">
                            {item.name}
                          </Typography>
                          <Typography
                            variant="small"
                            color={theme.colors.gray[500]}>
                            {item.sku}
                          </Typography>
                        </View>
                        <View style={styles.itemQuantity}>
                          <Typography variant="body" weight="semibold">
                            {item.qty}
                          </Typography>
                          <Typography
                            variant="small"
                            color={theme.colors.gray[600]}>
                            {formatCurrency(item.price)}
                          </Typography>
                        </View>
                      </View>
                    ))}
                    {order.items?.length > 5 && (
                      <Typography
                        variant="small"
                        color={theme.colors.gray[500]}
                        style={{marginTop: 8}}>
                        +{order.items.length - 5} more items
                      </Typography>
                    )}
                  </View>
                )}
              </Card>
            ))
          )}
        </ScrollView>
      )}
      {/* Discrepancies Button */}
      {isAdmin && (
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => navigation.navigate('OrderDiscrepancies')}>
          <FileTextIcon size={20} color={theme.colors.white} />
          <Typography style={styles.floatingButtonText}>
            View Discrepancies
          </Typography>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.gray[50],
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
    padding: 16,
    paddingBottom: 80,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: theme.colors.white,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: theme.colors.gray[900],
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  orderCard: {
    marginBottom: 12,
    padding: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  orderInfo: {
    marginBottom: 12,
  },
  orderMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  metaItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  verifyButton: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success[600],
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  verifyButtonText: {
    color: theme.colors.white,
    fontWeight: 'bold',
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[100],
  },
  itemQuantity: {
    alignItems: 'flex-end',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary[600],
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  floatingButtonText: {
    color: theme.colors.white,
    fontWeight: 'bold',
  },
});
