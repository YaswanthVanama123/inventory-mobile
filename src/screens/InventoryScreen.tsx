import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput as RNTextInput,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {Button} from '../components/atoms/Button';
import {useAuth} from '../contexts/AuthContext';
import {useApiErrorHandler} from '../hooks/useApiErrorHandler';
import {useTheme} from '../contexts/ThemeContext';
import {Theme} from '../theme';
import inventoryService from '../services/inventoryService';
import {BoxIcon, AlertCircleIcon, ChevronDownIcon, ChevronRightIcon, CheckCircleIcon} from '../components/icons';
import {PartialVerificationModal} from '../components/molecules/PartialVerificationModal';
import {formatDate} from '../utils/dateUtils';

export const InventoryScreen = () => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const {token, user} = useAuth();
  const {handleApiError} = useApiErrorHandler();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [groupedItems, setGroupedItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [expandedItems, setExpandedItems] = useState<{[key: string]: boolean}>({});
  const [loadingDetails, setLoadingDetails] = useState<{[key: string]: boolean}>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'purchases' | 'sells'>('purchases');
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(true);
  const [verifyingItems, setVerifyingItems] = useState<{[key: string]: boolean}>({});
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [selectedOrderForVerify, setSelectedOrderForVerify] = useState<any>(null);
  const [verifyingSku, setVerifyingSku] = useState<string>('');

  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);
  useEffect(() => {
    if (token && isMounted) {
      setExpandedItems({});
      fetchData();
    } else if (isMounted) {
      setLoading(false);
    }
  }, [token, activeTab]);
  useEffect(() => {
    applySearch();
  }, [searchQuery, groupedItems]);
  const fetchData = async () => {
    try {
      if (token && isMounted) {
        let items;
        if (activeTab === 'purchases') {
          items = await inventoryService.getGroupedItems(token);
        } else {
          items = await inventoryService.getGroupedSalesItems(token);
        }
        if (isMounted) {
          setGroupedItems(Array.isArray(items) ? items : []);
          setError(null);
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch grouped items:', error);
      const wasHandled = await handleApiError(error);
      if (wasHandled) return;
      if (isMounted) {
        setError(error.message || 'Failed to load inventory');
        setGroupedItems([]);
      }
    } finally {
      if (isMounted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };
  const applySearch = () => {
    if (!isMounted) return;
    if (!groupedItems || !Array.isArray(groupedItems)) {
      setFilteredItems([]);
      return;
    }
    if (!searchQuery) {
      setFilteredItems(groupedItems);
      return;
    }
    const search = searchQuery.toLowerCase();
    const filtered = groupedItems.filter(
      item =>
        item.name?.toLowerCase().includes(search) ||
        item.sku?.toLowerCase().includes(search),
    );
    setFilteredItems(filtered);
  };
  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };
  const toggleExpand = async (sku: string, itemName: string) => {
    const isCurrentlyExpanded = expandedItems[sku];
    setExpandedItems(prev => ({
      ...prev,
      [sku]: !prev[sku],
    }));
    if (!isCurrentlyExpanded && token) {
      const item = groupedItems.find(i => i.sku === sku);
      const hasData = activeTab === 'purchases'
        ? (item?.orders && item.orders.length > 0)
        : (item?.invoices && item.invoices.length > 0);
      if (!hasData) {
        setLoadingDetails(prev => ({ ...prev, [sku]: true }));
        try {
          let details;
          if (activeTab === 'purchases') {
            details = await inventoryService.getOrdersForItem(token, sku);
          } else {
            details = await inventoryService.getInvoicesForItem(token, itemName);
          }
          if (isMounted) {
            setGroupedItems(prev =>
              prev.map(item =>
                item.sku === sku
                  ? {
                      ...item,
                      [activeTab === 'purchases' ? 'orders' : 'invoices']: details,
                    }
                  : item
              )
            );
          }
        } catch (error: any) {
          console.error('Failed to fetch details:', error);
          const wasHandled = await handleApiError(error);
          if (!wasHandled && isMounted) {
            setGroupedItems(prev =>
              prev.map(item =>
                item.sku === sku
                  ? {
                      ...item,
                      [activeTab === 'purchases' ? 'orders' : 'invoices']: [],
                    }
                  : item
              )
            );
          }
        } finally {
          if (isMounted) {
            setLoadingDetails(prev => ({ ...prev, [sku]: false }));
          }
        }
      }
    }
  };
  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };
  const handleVerifyItem = (order: any, itemIndex: number, sku: string) => {
    console.log('[InventoryScreen] Opening verify modal for order:', order);
    setSelectedOrderForVerify({...order, itemIndex});
    setVerifyingSku(sku);
    setVerifyModalVisible(true);
  };

  const handleConfirmVerification = async (receivedQty: number, notes: string) => {
    if (!token || !user || !selectedOrderForVerify) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    const { itemIndex, orderNumber } = selectedOrderForVerify;
    const verifyKey = `${orderNumber}-${itemIndex}`;

    try {
      setVerifyingItems(prev => ({...prev, [verifyKey]: true}));

      const result = await inventoryService.verifyOrderItem(
        token,
        orderNumber,
        itemIndex,
        user.id || user._id,
        verifyingSku,
        receivedQty,
        notes
      );

      // Show success message
      const message = result.data?.fullyReceived
        ? 'Item fully received and verified'
        : `Partial receipt recorded - ${result.data?.remaining || 0} unit(s) remaining`;

      Alert.alert('Success', message);

      // Fetch updated data from database
      const updatedOrders = await inventoryService.getOrdersForItem(token, verifyingSku);

      if (isMounted) {
        setGroupedItems(prev =>
          prev.map(item => {
            if (item.sku === verifyingSku) {
              return {...item, orders: updatedOrders};
            }
            return item;
          })
        );
      }

      // Close modal
      setVerifyModalVisible(false);
      setSelectedOrderForVerify(null);
      setVerifyingSku('');
    } catch (error: any) {
      console.error('Verify item error:', error);
      const wasHandled = await handleApiError(error);
      if (!wasHandled) {
        Alert.alert('Error', error.message || 'Failed to verify item');
      }
    } finally {
      if (isMounted) {
        setVerifyingItems(prev => {
          const newState = {...prev};
          delete newState[verifyKey];
          return newState;
        });
      }
    }
  };

  const handleCloseVerifyModal = () => {
    setVerifyModalVisible(false);
    setSelectedOrderForVerify(null);
    setVerifyingSku('');
  };
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary[600]} />
        <Typography
          variant="body"
          color={theme.colors.gray[600]}
          style={{marginTop: 16}}>
          Loading inventory...
        </Typography>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header - Fixed */}
      <View style={styles.header}>
        <Typography variant="h2" weight="bold" style={styles.headerTitle}>
          Inventory
        </Typography>
        <Typography
          variant="body"
          color={theme.colors.gray[500]}
          style={styles.headerSubtitle}>
          {filteredItems.length} items in stock
        </Typography>
      </View>

      {/* Search Bar - Fixed */}
      <View style={styles.searchContainer}>
        <RNTextInput
          style={styles.searchInput}
          placeholder="Search by name or SKU..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={theme.colors.gray[400]}
        />
      </View>

      {/* Tabs - Fixed */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'purchases' && styles.tabActive,
          ]}
          onPress={() => setActiveTab('purchases')}>
          <Typography
            variant="body"
            weight="semibold"
            color={
              activeTab === 'purchases'
                ? theme.colors.white
                : theme.colors.gray[600]
            }>
            Purchases
          </Typography>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'sells' && styles.tabActive,
          ]}
          onPress={() => setActiveTab('sells')}>
          <Typography
            variant="body"
            weight="semibold"
            color={
              activeTab === 'sells'
                ? theme.colors.white
                : theme.colors.gray[600]
            }>
            Sells
          </Typography>
        </TouchableOpacity>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
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
        {!error && filteredItems.length === 0 && (
          <Card variant="outlined" padding="lg" style={styles.emptyCard}>
            <BoxIcon size={48} color={theme.colors.gray[400]} />
            <Typography
              variant="h3"
              weight="semibold"
              color={theme.colors.gray[700]}
              style={styles.emptyTitle}>
              No items found
            </Typography>
            <Typography
              variant="body"
              color={theme.colors.gray[500]}
              align="center">
              {searchQuery
                ? 'Try adjusting your search'
                : 'No items to display'}
            </Typography>
          </Card>
        )}

        {/* Grouped Items List */}
        <View style={styles.itemsList}>
          {filteredItems.map((group, index) => {
            const isExpanded = expandedItems[group.sku];
            return (
              <Card
                key={group._id || `${group.sku}-${index}`}
                variant="elevated"
                padding="none"
                style={styles.groupCard}>
                {/* Group Header */}
                <TouchableOpacity
                  onPress={() => toggleExpand(group.sku, group.name)}
                  style={styles.groupHeader}>
                  <View style={styles.groupHeaderLeft}>
                    {/* Chevron */}
                    <View style={styles.chevronContainer}>
                      {isExpanded ? (
                        <ChevronDownIcon size={20} color={theme.colors.gray[600]} />
                      ) : (
                        <ChevronRightIcon size={20} color={theme.colors.gray[600]} />
                      )}
                    </View>
                    {/* Box Icon */}
                    <View style={styles.boxIconContainer}>
                      <BoxIcon size={24} color={theme.colors.primary[600]} />
                    </View>
                    {/* Item Info */}
                    <View style={styles.groupInfo}>
                      <Typography
                        variant="body"
                        weight="semibold"
                        numberOfLines={1}>
                        {group.name}
                      </Typography>
                      <Typography
                        variant="caption"
                        color={theme.colors.gray[500]}>
                        SKU: {group.sku} • {activeTab === 'purchases' ? group.orderCount : group.invoiceCount}{' '}
                        {activeTab === 'purchases'
                          ? (group.orderCount === 1 ? 'order' : 'orders')
                          : (group.invoiceCount === 1 ? 'invoice' : 'invoices')}
                      </Typography>
                    </View>
                  </View>
                  {/* Stats on the right */}
                  <View style={styles.groupStats}>
                    <View style={styles.statItem}>
                      <Typography
                        variant="caption"
                        color={theme.colors.gray[500]}
                        style={styles.statLabel}>
                        {activeTab === 'purchases' ? 'TOTAL ORDERED' : 'TOTAL SOLD'}
                      </Typography>
                      <Typography
                        variant="body"
                        weight="bold"
                        style={styles.statValue}>
                        {group.totalQuantity}
                      </Typography>
                    </View>
                    <View style={styles.statItem}>
                      <Typography
                        variant="caption"
                        color={theme.colors.gray[500]}
                        style={styles.statLabel}>
                        AVG PRICE
                      </Typography>
                      <Typography
                        variant="body"
                        weight="semibold"
                        color={theme.colors.gray[700]}>
                        {formatCurrency(group.avgUnitPrice)}
                      </Typography>
                    </View>
                    <View style={styles.statItem}>
                      <Typography
                        variant="caption"
                        color={theme.colors.gray[500]}
                        style={styles.statLabel}>
                        {activeTab === 'purchases' ? 'TOTAL VALUE' : 'TOTAL REVENUE'}
                      </Typography>
                      <Typography
                        variant="body"
                        weight="bold"
                        color={theme.colors.success[600]}>
                        {formatCurrency(group.totalValue)}
                      </Typography>
                    </View>
                  </View>
                </TouchableOpacity>
                {/* Expanded Orders */}
                {isExpanded && (
                  <>
                    {/* Loading spinner */}
                    {loadingDetails[group.sku] && (
                      <View style={styles.ordersContainer}>
                        <ActivityIndicator size="small" color={theme.colors.primary[600]} />
                        <Typography
                          variant="body"
                          color={theme.colors.gray[600]}
                          style={{marginTop: 8, textAlign: 'center'}}>
                          Loading details...
                        </Typography>
                      </View>
                    )}
                    {/* For Purchases - show orders */}
                    {!loadingDetails[group.sku] && activeTab === 'purchases' && group.orders && group.orders.length > 0 && (
                      <View style={styles.ordersContainer}>
                        <Typography
                          variant="small"
                          weight="semibold"
                          color={theme.colors.gray[700]}
                          style={styles.ordersTitle}>
                          Order Details
                        </Typography>
                        {group.orders.map((order: any, index: number) => {
                          const isItemVerified = order.itemVerified === true;
                          const hasPartialReceipts = (order.verificationHistory && order.verificationHistory.length > 0);
                          const receivedQty = order.receivedQuantity || 0;
                          const expectedQty = order.qty || 0;
                          const remainingQty = Math.max(0, expectedQty - receivedQty);
                          const isPartiallyVerified = receivedQty > 0 && receivedQty < expectedQty;

                          console.log(`[InventoryScreen] Order ${order.orderNumber} - index ${index}:`, {
                            itemVerified: order.itemVerified,
                            isItemVerified: isItemVerified,
                            itemVerifiedAt: order.itemVerifiedAt,
                            stockProcessed: order.stockProcessed,
                            receivedQty,
                            remainingQty,
                            hasPartialReceipts,
                            fullOrder: order
                          });
                          return (
                          <View
                            key={`${order.orderNumber}-${index}`}
                            style={styles.orderItem}>
                            <View style={styles.orderRow}>
                              <Typography
                                variant="caption"
                                color={theme.colors.gray[500]}
                                style={styles.orderLabel}>
                                Order #
                              </Typography>
                              <Typography
                                variant="small"
                                weight="medium"
                                color={theme.colors.primary[600]}>
                                {order.orderNumber}
                              </Typography>
                            </View>
                            <View style={styles.orderRow}>
                              <Typography
                                variant="caption"
                                color={theme.colors.gray[500]}
                                style={styles.orderLabel}>
                                PO Number
                              </Typography>
                              <Typography
                                variant="small"
                                color={theme.colors.gray[700]}>
                                {order.poNumber || 'N/A'}
                              </Typography>
                            </View>
                            <View style={styles.orderRow}>
                              <Typography
                                variant="caption"
                                color={theme.colors.gray[500]}
                                style={styles.orderLabel}>
                                Order Date
                              </Typography>
                              <Typography
                                variant="small"
                                color={theme.colors.gray[700]}>
                                {formatDate(order.orderDate)}
                              </Typography>
                            </View>
                            <View style={styles.orderRow}>
                              <Typography
                                variant="caption"
                                color={theme.colors.gray[500]}
                                style={styles.orderLabel}>
                                Vendor
                              </Typography>
                              <Typography
                                variant="small"
                                weight="medium"
                                color={theme.colors.gray[900]}>
                                {order.vendor || 'N/A'}
                              </Typography>
                            </View>
                            <View style={styles.orderRow}>
                              <Typography
                                variant="caption"
                                color={theme.colors.gray[500]}
                                style={styles.orderLabel}>
                                Quantity
                              </Typography>
                              <Typography
                                variant="small"
                                weight="bold"
                                color={theme.colors.gray[900]}>
                                {order.qty}
                              </Typography>
                            </View>
                            {/* Show received/remaining if partial verification enabled */}
                            {hasPartialReceipts && (
                              <>
                                <View style={styles.orderRow}>
                                  <Typography
                                    variant="caption"
                                    color={theme.colors.gray[500]}
                                    style={styles.orderLabel}>
                                    Received
                                  </Typography>
                                  <Typography
                                    variant="small"
                                    weight="bold"
                                    color={theme.colors.success[600]}>
                                    {receivedQty}
                                  </Typography>
                                </View>
                                <View style={styles.orderRow}>
                                  <Typography
                                    variant="caption"
                                    color={theme.colors.gray[500]}
                                    style={styles.orderLabel}>
                                    Remaining
                                  </Typography>
                                  <Typography
                                    variant="small"
                                    weight="bold"
                                    color={theme.colors.primary[600]}>
                                    {remainingQty}
                                  </Typography>
                                </View>
                                <View style={styles.orderRow}>
                                  <Typography
                                    variant="caption"
                                    color={theme.colors.gray[500]}
                                    style={styles.orderLabel}>
                                    Verification History
                                  </Typography>
                                  <View style={styles.statusBadge}>
                                    <Typography
                                      variant="caption"
                                      weight="medium"
                                      color={theme.colors.primary[600]}>
                                      {order.verificationHistory.length} receipt{order.verificationHistory.length !== 1 ? 's' : ''}
                                    </Typography>
                                  </View>
                                </View>
                              </>
                            )}
                            <View style={styles.orderRow}>
                              <Typography
                                variant="caption"
                                color={theme.colors.gray[500]}
                                style={styles.orderLabel}>
                                Unit Price
                              </Typography>
                              <Typography
                                variant="small"
                                weight="medium"
                                color={theme.colors.gray[900]}>
                                {formatCurrency(order.unitPrice)}
                              </Typography>
                            </View>
                            <View style={styles.orderRow}>
                              <Typography
                                variant="caption"
                                color={theme.colors.gray[500]}
                                style={styles.orderLabel}>
                                Line Total
                              </Typography>
                              <Typography
                                variant="small"
                                weight="bold"
                                color={theme.colors.success[600]}>
                                {formatCurrency(order.lineTotal)}
                              </Typography>
                            </View>
                            <View style={styles.orderRow}>
                              <Typography
                                variant="caption"
                                color={theme.colors.gray[500]}
                                style={styles.orderLabel}>
                                Status
                              </Typography>
                              <View style={styles.statusBadge}>
                                <Typography
                                  variant="caption"
                                  weight="medium"
                                  color={theme.colors.primary[600]}>
                                  {order.status}
                                </Typography>
                              </View>
                            </View>
                            <View style={styles.orderRow}>
                              <Typography
                                variant="caption"
                                color={theme.colors.gray[500]}
                                style={styles.orderLabel}>
                                Item Verified
                              </Typography>
                              {isItemVerified ? (
                                <View style={{alignItems: 'flex-end', gap: 2}}>
                                  <View style={styles.statusBadge}>
                                    <CheckCircleIcon size={14} color={theme.colors.success[600]} />
                                    <Typography
                                      variant="caption"
                                      weight="medium"
                                      color={theme.colors.success[600]}
                                      style={{marginLeft: 4}}>
                                      Fully Verified
                                    </Typography>
                                  </View>
                                  {order.itemVerifiedAt && (
                                    <Typography
                                      variant="caption"
                                      color={theme.colors.gray[500]}
                                      style={{fontSize: 10}}>
                                      {formatDate(order.itemVerifiedAt)}
                                    </Typography>
                                  )}
                                </View>
                              ) : isPartiallyVerified ? (
                                <View style={{alignItems: 'flex-end', gap: 2}}>
                                  <View style={[styles.statusBadge, {backgroundColor: theme.colors.primary[100]}]}>
                                    <Typography
                                      variant="caption"
                                      weight="medium"
                                      color={theme.colors.primary[700]}>
                                      Partial ({receivedQty}/{expectedQty})
                                    </Typography>
                                  </View>
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onPress={() => handleVerifyItem(order, order.itemIndex, group.sku)}
                                    loading={verifyingItems[`${order.orderNumber}-${order.itemIndex}`]}
                                    disabled={verifyingItems[`${order.orderNumber}-${order.itemIndex}`]}
                                    style={{paddingHorizontal: 12, paddingVertical: 6, marginTop: 4}}>
                                    <Typography
                                      variant="caption"
                                      weight="medium"
                                      color={theme.colors.white}>
                                      {verifyingItems[`${order.orderNumber}-${order.itemIndex}`] ? 'Verifying...' : 'Verify More'}
                                    </Typography>
                                  </Button>
                                </View>
                              ) : (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onPress={() => handleVerifyItem(order, order.itemIndex, group.sku)}
                                  loading={verifyingItems[`${order.orderNumber}-${order.itemIndex}`]}
                                  disabled={verifyingItems[`${order.orderNumber}-${order.itemIndex}`]}
                                  style={{paddingHorizontal: 12, paddingVertical: 6}}>
                                  <Typography
                                    variant="caption"
                                    weight="medium"
                                    color={theme.colors.white}>
                                    {verifyingItems[`${order.orderNumber}-${order.itemIndex}`] ? 'Verifying...' : 'Verify Arrival'}
                                  </Typography>
                                </Button>
                              )}
                            </View>
                          </View>
                          );
                        })}
                      </View>
                    )}
                    {/* For Sells - show invoices */}
                    {!loadingDetails[group.sku] && activeTab === 'sells' && group.invoices && group.invoices.length > 0 && (
                      <View style={styles.ordersContainer}>
                        <Typography
                          variant="small"
                          weight="semibold"
                          color={theme.colors.gray[700]}
                          style={styles.ordersTitle}>
                          Invoice Details
                        </Typography>
                        {group.invoices.map((invoice: any, index: number) => (
                          <View
                            key={`${invoice.invoiceNumber}-${index}`}
                            style={styles.orderItem}>
                            <View style={styles.orderRow}>
                              <Typography
                                variant="caption"
                                color={theme.colors.gray[500]}
                                style={styles.orderLabel}>
                                Invoice #
                              </Typography>
                              <Typography
                                variant="small"
                                weight="medium"
                                color={theme.colors.success[600]}>
                                {invoice.invoiceNumber}
                              </Typography>
                            </View>
                            <View style={styles.orderRow}>
                              <Typography
                                variant="caption"
                                color={theme.colors.gray[500]}
                                style={styles.orderLabel}>
                                Type
                              </Typography>
                              <View style={styles.statusBadge}>
                                <Typography
                                  variant="caption"
                                  weight="medium"
                                  color={theme.colors.primary[600]}>
                                  {invoice.invoiceType || 'N/A'}
                                </Typography>
                              </View>
                            </View>
                            <View style={styles.orderRow}>
                              <Typography
                                variant="caption"
                                color={theme.colors.gray[500]}
                                style={styles.orderLabel}>
                                Date
                              </Typography>
                              <Typography
                                variant="small"
                                color={theme.colors.gray[700]}>
                                {formatDate(invoice.date)}
                              </Typography>
                            </View>
                            <View style={styles.orderRow}>
                              <Typography
                                variant="caption"
                                color={theme.colors.gray[500]}
                                style={styles.orderLabel}>
                                Customer
                              </Typography>
                              <Typography
                                variant="small"
                                weight="medium"
                                color={theme.colors.gray[900]}>
                                {invoice.customerName || 'N/A'}
                              </Typography>
                            </View>
                            <View style={styles.orderRow}>
                              <Typography
                                variant="caption"
                                color={theme.colors.gray[500]}
                                style={styles.orderLabel}>
                                Quantity
                              </Typography>
                              <Typography
                                variant="small"
                                weight="bold"
                                color={theme.colors.gray[900]}>
                                {invoice.qty}
                              </Typography>
                            </View>
                            <View style={styles.orderRow}>
                              <Typography
                                variant="caption"
                                color={theme.colors.gray[500]}
                                style={styles.orderLabel}>
                                Rate
                              </Typography>
                              <Typography
                                variant="small"
                                weight="medium"
                                color={theme.colors.gray[900]}>
                                {formatCurrency(invoice.rate)}
                              </Typography>
                            </View>
                            <View style={styles.orderRow}>
                              <Typography
                                variant="caption"
                                color={theme.colors.gray[500]}
                                style={styles.orderLabel}>
                                Amount
                              </Typography>
                              <Typography
                                variant="small"
                                weight="bold"
                                color={theme.colors.success[600]}>
                                {formatCurrency(invoice.amount)}
                              </Typography>
                            </View>
                            <View style={styles.orderRow}>
                              <Typography
                                variant="caption"
                                color={theme.colors.gray[500]}
                                style={styles.orderLabel}>
                                Status
                              </Typography>
                              <View style={styles.statusBadge}>
                                <Typography
                                  variant="caption"
                                  weight="medium"
                                  color={theme.colors.primary[600]}>
                                  {invoice.status || 'N/A'}
                                </Typography>
                              </View>
                            </View>
                            <View style={styles.orderRow}>
                              <Typography
                                variant="caption"
                                color={theme.colors.gray[500]}
                                style={styles.orderLabel}>
                                Stock Processed
                              </Typography>
                              <View style={invoice.stockProcessed ? styles.statusBadgeSuccess : styles.statusBadgeWarning}>
                                <Typography
                                  variant="caption"
                                  weight="medium"
                                  color={invoice.stockProcessed ? theme.colors.success[700] : theme.colors.primary[700]}>
                                  {invoice.stockProcessed ? 'Yes' : 'No'}
                                </Typography>
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                    {/* Empty state - when not loading and no data */}
                    {!loadingDetails[group.sku] && activeTab === 'purchases' &&
                     group.orders !== undefined && (!group.orders || group.orders.length === 0) && (
                      <View style={styles.ordersContainer}>
                        <Typography
                          variant="body"
                          color={theme.colors.gray[500]}
                          style={{textAlign: 'center', paddingVertical: 16}}>
                          No purchase orders found for this item
                        </Typography>
                      </View>
                    )}
                    {!loadingDetails[group.sku] && activeTab === 'sells' &&
                     group.invoices !== undefined && (!group.invoices || group.invoices.length === 0) && (
                      <View style={styles.ordersContainer}>
                        <Typography
                          variant="body"
                          color={theme.colors.gray[500]}
                          style={{textAlign: 'center', paddingVertical: 16}}>
                          No sales invoices found for this item
                        </Typography>
                      </View>
                    )}
                  </>
                )}
              </Card>
            );
          })}
        </View>
      </ScrollView>

      {/* Partial Verification Modal */}
      <PartialVerificationModal
        visible={verifyModalVisible}
        onClose={handleCloseVerifyModal}
        onConfirm={handleConfirmVerification}
        order={selectedOrderForVerify}
        loading={selectedOrderForVerify ? verifyingItems[`${selectedOrderForVerify.orderNumber}-${selectedOrderForVerify.itemIndex}`] : false}
      />
    </SafeAreaView>
  );
};
const makeStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.gray[50],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.gray[50],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  headerTitle: {
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  searchContainer: {
    paddingHorizontal: theme.spacing.lg,
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
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: theme.colors.gray[200],
  },
  tabActive: {
    backgroundColor: theme.colors.primary[600],
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
  itemsList: {
    gap: theme.spacing.md,
  },
  groupCard: {
    marginBottom: 0,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    gap: 12,
  },
  groupHeaderLeft: {
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
  boxIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: theme.colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupInfo: {
    flex: 1,
    gap: 4,
  },
  groupStats: {
    flexDirection: 'column',
    gap: 8,
    alignItems: 'flex-end',
  },
  statItem: {
    alignItems: 'flex-end',
  },
  statLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
  },
  ordersContainer: {
    backgroundColor: theme.colors.gray[50],
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
    padding: theme.spacing.md,
  },
  ordersTitle: {
    marginBottom: theme.spacing.md,
  },
  orderItem: {
    backgroundColor: theme.colors.white,
    borderRadius: 8,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    gap: 8,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderLabel: {
    fontSize: 11,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: theme.colors.primary[100],
  },
  statusBadgeSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: theme.colors.success[100],
  },
  statusBadgeWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: theme.colors.primary[100],
  },
});
