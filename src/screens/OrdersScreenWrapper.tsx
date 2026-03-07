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
  PlusIcon,
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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [stats, setStats] = useState({
    totalOrders: 0,
    processed: 0,
    pending: 0,
  });
  useEffect(() => {
    if (token) {
      setCurrentPage(1);
      setOrders([]);
      loadData(1);
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
    setCurrentPage(1);
    setOrders([]);
    loadData(1);
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
        <>
          {/* Stats - Fixed */}
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

          {/* Search - Fixed */}
          <View style={styles.searchContainer}>
            <RNTextInput
              style={styles.searchInput}
              placeholder="Search by order number or vendor..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={theme.colors.gray[400]}
            />
          </View>

          {/* Scrollable Content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }>
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
                      {order.source === 'manual' && (
                        <View style={styles.manualBadge}>
                          <Typography
                            variant="small"
                            weight="bold"
                            color={theme.colors.accent[700]}>
                            MANUAL
                          </Typography>
                        </View>
                      )}
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
          {/* Pagination Info and Page Numbers */}
          {!error && !loading && filteredOrders.length > 0 && totalPages > 0 && (
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
        </ScrollView>
        </>
      )}
      {/* Floating Action Buttons */}
      {isAdmin && (
        <View style={styles.floatingButtonContainer}>
          <TouchableOpacity
            style={[styles.floatingButton, styles.createOrderButton]}
            onPress={() => navigation.navigate('ManualOrderForm')}>
            <PlusIcon size={20} color={theme.colors.white} />
            <Typography style={styles.floatingButtonText}>
              Create Order
            </Typography>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.floatingButton}
            onPress={() => navigation.navigate('OrderDiscrepancies')}>
            <FileTextIcon size={20} color={theme.colors.white} />
            <Typography style={styles.floatingButtonText}>
              View Discrepancies
            </Typography>
          </TouchableOpacity>
        </View>
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
    paddingTop: 0,
    paddingBottom: 80,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
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
  manualBadge: {
    backgroundColor: theme.colors.accent[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
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
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    gap: 12,
  },
  floatingButton: {
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
  createOrderButton: {
    backgroundColor: theme.colors.success[600],
  },
  floatingButtonText: {
    color: theme.colors.white,
    fontWeight: 'bold',
  },
  paginationContainer: {
    marginTop: 16,
    marginBottom: 16,
    paddingVertical: 12,
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
