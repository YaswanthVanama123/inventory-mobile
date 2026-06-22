import React, {useState, useEffect, useMemo} from 'react';
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
import {useTheme} from '../contexts/ThemeContext';
import {Theme} from '../theme';
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
import {formatDate} from '../utils/dateUtils';
import {useBreakpoint, BreakpointInfo} from '../utils/breakpoints';

interface OrdersScreenWrapperProps {
  navigation: any;
}

export const OrdersScreenWrapper: React.FC<OrdersScreenWrapperProps> = ({
  navigation,
}) => {
  const theme = useTheme();
  const bp = useBreakpoint();
  const styles = useMemo(() => makeStyles(theme, bp), [theme, bp]);
  // Mac / desktop width gets a compact table; phone & tablet keep the cards.
  const isWideLayout = bp.isDesktop || bp.isWide;
  const {token, user} = useAuth();
  const {handleApiError} = useApiErrorHandler();
  const isAdmin = user?.role === 'admin';
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [orderDetails, setOrderDetails] = useState<Record<string, any>>({});
  const [loadingDetails, setLoadingDetails] = useState<Set<string>>(new Set());
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
      // Lazy-load items on first expand. The list endpoint only returns
      // itemCount, not the items array, so we fetch the full order detail
      // and cache it keyed by orderNumber.
      if (!orderDetails[orderNumber] && !loadingDetails.has(orderNumber) && token) {
        const next = new Set(loadingDetails);
        next.add(orderNumber);
        setLoadingDetails(next);
        ordersService
          .getOrderByNumber(token, orderNumber)
          .then(detail => {
            setOrderDetails(prev => ({...prev, [orderNumber]: detail}));
          })
          .catch(err => {
            console.error('Failed to load order details:', err);
          })
          .finally(() => {
            setLoadingDetails(prev => {
              const updated = new Set(prev);
              updated.delete(orderNumber);
              return updated;
            });
          });
      }
    }
    setExpandedOrders(newExpanded);
  };
  const handleVerifyOrder = (order: any) => {
    if (!order.orderNumber) {
      Alert.alert('Error', 'Order number not found');
      return;
    }
    navigation.navigate('OrderVerification', {orderNumber: order.orderNumber});
  };
  const formatCurrency = (amount: number) => {
    return `$${(amount || 0).toFixed(2)}`;
  };
  const getStatusColor = (status: string) => {
    const statusMap: {[key: string]: string} = {
      Complete: theme.colors.success[600],
      Processing: theme.colors.primary[600],
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
      Processing: theme.colors.primary[100],
      Shipped: theme.colors.primary[100],
      Cancelled: theme.colors.error[100],
      Pending: theme.colors.gray[100],
      received: theme.colors.success[100],
    };
    return statusMap[status] || theme.colors.gray[100];
  };
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
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
          <View style={styles.contentWrap}>
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
                color={theme.colors.primary[600]}>
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
          </View>{/* end contentWrap */}

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
          ) : isWideLayout ? (
            <View style={styles.table}>
              <View style={styles.tableHeadRow}>
                <Typography variant="caption" weight="semibold" color={theme.colors.gray[500]} style={[styles.th, styles.colOrder]}>ORDER</Typography>
                <Typography variant="caption" weight="semibold" color={theme.colors.gray[500]} style={[styles.th, styles.colVendor]}>VENDOR</Typography>
                <Typography variant="caption" weight="semibold" color={theme.colors.gray[500]} style={[styles.th, styles.colDate]}>DATE</Typography>
                <Typography variant="caption" weight="semibold" color={theme.colors.gray[500]} style={[styles.th, styles.colTotal, styles.tdRight]}>TOTAL</Typography>
                <Typography variant="caption" weight="semibold" color={theme.colors.gray[500]} style={[styles.th, styles.colItems, styles.tdRight]}>ITEMS</Typography>
                <Typography variant="caption" weight="semibold" color={theme.colors.gray[500]} style={[styles.th, styles.colStock, styles.tdCenter]}>STOCK</Typography>
                <Typography variant="caption" weight="semibold" color={theme.colors.gray[500]} style={[styles.th, styles.colAction]}>ACTION</Typography>
                <View style={styles.colChevron} />
              </View>
              {filteredOrders.map(order => {
                const isExpanded = expandedOrders.has(order.orderNumber);
                return (
                  <View key={order._id} style={[styles.tableRowWrap, isExpanded && styles.tableRowWrapActive]}>
                    <View style={styles.tableRow}>
                      <TouchableOpacity style={[styles.colOrder, styles.orderCell]} onPress={() => handleOrderPress(order.orderNumber)} activeOpacity={0.7}>
                        <Typography variant="body" weight="bold" numberOfLines={1}>#{order.orderNumber}</Typography>
                        <View style={[styles.statusBadge, {backgroundColor: getStatusBgColor(order.status)}]}>
                          <Typography variant="caption" weight="semibold" color={getStatusColor(order.status)}>
                            {order.status}
                          </Typography>
                        </View>
                        {order.source === 'manual' && (
                          <View style={styles.manualBadge}>
                            <Typography variant="caption" weight="bold" color={theme.colors.accent[700]}>MANUAL</Typography>
                          </View>
                        )}
                      </TouchableOpacity>
                      <Typography variant="small" numberOfLines={1} style={styles.colVendor}>{order.vendor?.name || 'N/A'}</Typography>
                      <Typography variant="small" color={theme.colors.gray[600]} numberOfLines={1} style={styles.colDate}>{formatDate(order.orderDate)}</Typography>
                      <Typography variant="body" weight="bold" color={theme.colors.gray[900]} style={[styles.colTotal, styles.tdRight]}>{formatCurrency(order.total)}</Typography>
                      <Typography variant="small" weight="semibold" color={theme.colors.gray[700]} style={[styles.colItems, styles.tdRight]}>{order.itemCount ?? order.items?.length ?? 0}</Typography>
                      <View style={[styles.colStock, styles.tdCenterBox]}>
                        {order.stockProcessed ? (
                          <CheckCircleIcon size={18} color={theme.colors.success[600]} />
                        ) : (
                          <ClockIcon size={18} color={theme.colors.primary[600]} />
                        )}
                      </View>
                      <View style={styles.colAction}>
                        {!order.verified ? (
                          <TouchableOpacity style={styles.verifyBtnSm} onPress={() => handleVerifyOrder(order)} activeOpacity={0.85}>
                            <CheckCircleIcon size={13} color={theme.colors.white} />
                            <Typography variant="caption" weight="bold" color={theme.colors.white}>
                              {orderDetails[order.orderNumber]?.items?.some((i: any) => (i.receivedQuantity || 0) > 0 && (i.receivedQuantity || 0) < i.qty) ? 'Verify Rem.' : 'Verify'}
                            </Typography>
                          </TouchableOpacity>
                        ) : (
                          <View style={[styles.statusBadge, {backgroundColor: theme.colors.success[100], alignSelf: 'flex-start'}]}>
                            <Typography variant="caption" weight="semibold" color={theme.colors.success[700]}>Verified</Typography>
                          </View>
                        )}
                      </View>
                      <TouchableOpacity style={styles.colChevron} onPress={() => handleOrderPress(order.orderNumber)} activeOpacity={0.7}>
                        {isExpanded ? (
                          <ChevronDownIcon size={18} color={theme.colors.gray[600]} />
                        ) : (
                          <ChevronRightIcon size={18} color={theme.colors.gray[600]} />
                        )}
                      </TouchableOpacity>
                    </View>

                    {isExpanded && (() => {
                      const detail = orderDetails[order.orderNumber];
                      const detailItems: any[] = detail?.items || [];
                      const isLoadingDetail = loadingDetails.has(order.orderNumber);
                      return (
                        <View style={styles.tableExpanded}>
                          {isLoadingDetail ? (
                            <View style={{paddingVertical: 16, alignItems: 'center'}}>
                              <ActivityIndicator color={theme.colors.primary[600]} />
                            </View>
                          ) : detailItems.length === 0 ? (
                            <Typography variant="small" color={theme.colors.gray[500]}>No items in this order.</Typography>
                          ) : (
                            <>
                              <View style={styles.itemsHeadRow}>
                                <Typography variant="caption" weight="semibold" color={theme.colors.gray[500]} style={styles.itemColName}>ITEM</Typography>
                                <Typography variant="caption" weight="semibold" color={theme.colors.gray[500]} style={styles.itemColSku}>SKU</Typography>
                                <Typography variant="caption" weight="semibold" color={theme.colors.gray[500]} style={[styles.itemColQty, styles.tdRight]}>QTY</Typography>
                                <Typography variant="caption" weight="semibold" color={theme.colors.gray[500]} style={[styles.itemColPrice, styles.tdRight]}>UNIT PRICE</Typography>
                              </View>
                              {detailItems.map((item: any, idx: number) => (
                                <View key={idx} style={styles.itemsRow}>
                                  <Typography variant="small" weight="semibold" numberOfLines={1} style={styles.itemColName}>{item.name}</Typography>
                                  <Typography variant="small" color={theme.colors.gray[600]} numberOfLines={1} style={styles.itemColSku}>{item.sku}</Typography>
                                  <Typography variant="small" weight="bold" style={[styles.itemColQty, styles.tdRight]}>{item.qty}</Typography>
                                  <Typography variant="small" style={[styles.itemColPrice, styles.tdRight]}>{formatCurrency(item.unitPrice ?? item.price)}</Typography>
                                </View>
                              ))}
                            </>
                          )}
                        </View>
                      );
                    })()}
                  </View>
                );
              })}
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
                        {order.itemCount ?? order.items?.length ?? 0}
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
                        <ClockIcon size={20} color={theme.colors.primary[600]} />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
                {/* Verify Order Button */}
                {!order.verified && (
                    <TouchableOpacity
                      style={styles.verifyButton}
                      onPress={() => handleVerifyOrder(order)}>
                      <CheckCircleIcon size={16} color={theme.colors.white} />
                      <Typography style={styles.verifyButtonText}>
                        {orderDetails[order.orderNumber]?.items?.some(
                          (i: any) =>
                            (i.receivedQuantity || 0) > 0 &&
                            (i.receivedQuantity || 0) < i.qty,
                        )
                          ? 'Verify Remaining'
                          : 'Verify Order'}
                      </Typography>
                    </TouchableOpacity>
                  )}
                {/* Expanded Details */}
                {expandedOrders.has(order.orderNumber) && (() => {
                  const detail = orderDetails[order.orderNumber];
                  const detailItems: any[] = detail?.items || [];
                  const isLoadingDetail = loadingDetails.has(order.orderNumber);
                  return (
                    <View style={styles.expandedContent}>
                      <Typography
                        variant="h4"
                        weight="semibold"
                        style={{marginBottom: 12}}>
                        Order Items
                      </Typography>
                      {isLoadingDetail ? (
                        <View style={{paddingVertical: 16, alignItems: 'center'}}>
                          <ActivityIndicator color={theme.colors.primary[600]} />
                        </View>
                      ) : detailItems.length === 0 ? (
                        <Typography variant="small" color={theme.colors.gray[500]}>
                          No items in this order.
                        </Typography>
                      ) : (
                        <>
                          {detailItems.slice(0, 5).map((item: any, idx: number) => (
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
                                  {formatCurrency(item.unitPrice ?? item.price)}
                                </Typography>
                              </View>
                            </View>
                          ))}
                          {detailItems.length > 5 && (
                            <Typography
                              variant="small"
                              color={theme.colors.gray[500]}
                              style={{marginTop: 8}}>
                              +{detailItems.length - 5} more items
                            </Typography>
                          )}
                        </>
                      )}
                    </View>
                  );
                })()}
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
const makeStyles = (theme: Theme, bp: BreakpointInfo) => {
  const actionBtnMaxWidth = bp.isWide ? 560 : bp.isDesktop ? 480 : undefined;
  const btnPadScale = bp.isWide ? 1.3 : bp.isDesktop ? 1.15 : 1;
  const rb = (n: number) => Math.round(n);
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.gray[50],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Centers & caps content on large / XL screens.
  contentWrap: {
    width: '100%',
    maxWidth: bp.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: bp.gutter,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: bp.gutter,
    paddingTop: 0,
    paddingBottom: 80,
    maxWidth: bp.contentMaxWidth,
    width: '100%',
    alignSelf: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  searchContainer: {
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: theme.colors.white,
    borderRadius: 8,
    padding: 12,
    fontSize: theme.typography.roles.body.fontSize,
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

  // ── Mac / desktop table layout ────────────────────────────────────────
  table: {
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
    overflow: 'hidden',
    marginBottom: 16,
  },
  tableHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: theme.colors.gray[50],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  th: {letterSpacing: 0.5},
  tableRowWrap: {borderBottomWidth: 1, borderBottomColor: theme.colors.gray[100]},
  tableRowWrapActive: {backgroundColor: theme.colors.primary[50]},
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  orderCell: {flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap'},
  colOrder: {flex: 1.8, paddingRight: 8},
  colVendor: {flex: 1.6, paddingRight: 8},
  colDate: {flex: 1.2, paddingRight: 8},
  colTotal: {flex: 1, paddingRight: 8},
  colItems: {flex: 0.7, paddingRight: 8},
  colStock: {flex: 0.8, paddingRight: 8},
  colAction: {flex: 1.5, paddingRight: 8},
  colChevron: {width: 40, alignItems: 'flex-end', justifyContent: 'center'},
  tdRight: {textAlign: 'right'},
  tdCenter: {textAlign: 'center'},
  tdCenterBox: {alignItems: 'center'},
  verifyBtnSm: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.success[600],
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  tableExpanded: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: theme.colors.gray[50],
  },
  itemsHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  itemsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.gray[200],
  },
  itemColName: {flex: 2.2, paddingRight: 8},
  itemColSku: {flex: 1.4, paddingRight: 8},
  itemColQty: {flex: 0.7, paddingRight: 8},
  itemColPrice: {flex: 1.2, paddingRight: 8},
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
    paddingVertical: rb(12 * btnPadScale),
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 8,
    maxWidth: actionBtnMaxWidth,
    alignSelf: actionBtnMaxWidth ? 'center' : 'stretch',
    width: actionBtnMaxWidth ? undefined : '100%',
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
};
