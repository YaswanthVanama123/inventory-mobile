import React, {useState, useEffect, useMemo, useRef} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput as RNTextInput,
  Alert,
  Animated,
  Easing,
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
import {
  BoxIcon,
  AlertCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  RefreshIcon,
  SearchIcon,
  CloseIcon,
  DollarIcon,
  TimelineIcon,
  ClipboardIcon,
} from '../components/icons';
import {PartialVerificationModal} from '../components/molecules/PartialVerificationModal';
import {formatDate} from '../utils/dateUtils';
import {useBreakpoint, BreakpointInfo} from '../utils/breakpoints';

export const InventoryScreen = () => {
  const theme = useTheme();
  const bp = useBreakpoint();
  const styles = useMemo(() => makeStyles(theme, bp), [theme, bp]);
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

  const heroFade = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(20)).current;
  const blobPulse = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroFade, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(heroSlide, {
        toValue: 0,
        duration: 560,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(blobPulse, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(blobPulse, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [heroFade, heroSlide, blobPulse]);

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
    } catch (err: any) {
      console.error('Failed to fetch grouped items:', err);
      const wasHandled = await handleApiError(err);
      if (wasHandled) return;
      if (isMounted) {
        setError(err.message || 'Failed to load inventory');
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
    setExpandedItems(prev => ({...prev, [sku]: !prev[sku]}));
    if (!isCurrentlyExpanded && token) {
      const item = groupedItems.find(i => i.sku === sku);
      const hasData =
        activeTab === 'purchases'
          ? item?.orders && item.orders.length > 0
          : item?.invoices && item.invoices.length > 0;
      if (!hasData) {
        setLoadingDetails(prev => ({...prev, [sku]: true}));
        try {
          let details;
          if (activeTab === 'purchases') {
            details = await inventoryService.getOrdersForItem(token, sku);
          } else {
            details = await inventoryService.getInvoicesForItem(token, itemName);
          }
          if (isMounted) {
            setGroupedItems(prev =>
              prev.map(i =>
                i.sku === sku
                  ? {...i, [activeTab === 'purchases' ? 'orders' : 'invoices']: details}
                  : i,
              ),
            );
          }
        } catch (err: any) {
          console.error('Failed to fetch details:', err);
          const wasHandled = await handleApiError(err);
          if (!wasHandled && isMounted) {
            setGroupedItems(prev =>
              prev.map(i =>
                i.sku === sku
                  ? {...i, [activeTab === 'purchases' ? 'orders' : 'invoices']: []}
                  : i,
              ),
            );
          }
        } finally {
          if (isMounted) {
            setLoadingDetails(prev => ({...prev, [sku]: false}));
          }
        }
      }
    }
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  const handleVerifyItem = (order: any, itemIndex: number, sku: string) => {
    setSelectedOrderForVerify({...order, itemIndex});
    setVerifyingSku(sku);
    setVerifyModalVisible(true);
  };

  const handleConfirmVerification = async (receivedQty: number, notes: string) => {
    if (!token || !user || !selectedOrderForVerify) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }
    const {itemIndex, orderNumber} = selectedOrderForVerify;
    const verifyKey = `${orderNumber}-${itemIndex}`;
    try {
      setVerifyingItems(prev => ({...prev, [verifyKey]: true}));
      const result = await inventoryService.verifyOrderItem(
        token,
        orderNumber,
        itemIndex,
        user.id || (user as any)._id,
        verifyingSku,
        receivedQty,
        notes,
      );
      const message = result.data?.fullyReceived
        ? 'Item fully received and verified'
        : `Partial receipt recorded - ${result.data?.remaining || 0} unit(s) remaining`;
      Alert.alert('Success', message);
      const updatedOrders = await inventoryService.getOrdersForItem(token, verifyingSku);
      if (isMounted) {
        setGroupedItems(prev =>
          prev.map(item => {
            if (item.sku === verifyingSku) return {...item, orders: updatedOrders};
            return item;
          }),
        );
      }
      setVerifyModalVisible(false);
      setSelectedOrderForVerify(null);
      setVerifyingSku('');
    } catch (err: any) {
      console.error('Verify item error:', err);
      const wasHandled = await handleApiError(err);
      if (!wasHandled) {
        Alert.alert('Error', err.message || 'Failed to verify item');
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

  const blobScale = blobPulse.interpolate({inputRange: [0, 1], outputRange: [1, 1.08]});
  const blobOpacity = blobPulse.interpolate({inputRange: [0, 1], outputRange: [0.18, 0.28]});

  const totalItems = filteredItems.length;
  const totalQty = filteredItems.reduce((sum: number, g: any) => sum + (g.totalQuantity || 0), 0);
  const totalValue = filteredItems.reduce((sum: number, g: any) => sum + (g.totalValue || 0), 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <View style={styles.loadingMark}>
          <BoxIcon size={22} color={theme.colors.primary[600]} />
        </View>
        <ActivityIndicator size="large" color={theme.colors.primary[600]} />
        <Typography variant="body" color={theme.colors.gray[600]} style={{marginTop: 16}}>
          Loading inventory...
        </Typography>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.white}
          />
        }>
        <View style={styles.hero}>
          <Animated.View
            style={[
              styles.blob,
              styles.blobOne,
              {transform: [{scale: blobScale}], opacity: blobOpacity},
            ]}
          />
          <Animated.View
            style={[
              styles.blob,
              styles.blobTwo,
              {transform: [{scale: blobScale}], opacity: blobOpacity},
            ]}
          />
          <View style={styles.dotGrid} pointerEvents="none">
            {Array.from({length: 18}).map((_, i) => (
              <View key={i} style={styles.dot} />
            ))}
          </View>

          <Animated.View
            style={[
              styles.heroBody,
              {opacity: heroFade, transform: [{translateY: heroSlide}]},
            ]}>
            <View style={styles.heroTopRow}>
              <View style={{flex: 1}}>
                <Typography
                  variant="caption"
                  weight="semibold"
                  color={theme.colors.brand.textTracked}
                  style={styles.heroEyebrow}>
                  INVENTORY
                </Typography>
                <Typography variant="h2" weight="bold" color={theme.colors.brand.text} style={styles.heroTitle}>
                  Inventory items
                </Typography>
                <Typography variant="small" color={theme.colors.brand.textMuted}>
                  Grouped by SKU · expand for orders & invoices
                </Typography>
              </View>
              <TouchableOpacity onPress={onRefresh} style={styles.heroRefresh} activeOpacity={0.85}>
                <RefreshIcon size={18} color={theme.colors.brand.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.statusChip}>
              <View style={styles.statusDot} />
              <Typography variant="caption" weight="semibold" color={theme.colors.brand.text}>
                {totalItems} {totalItems === 1 ? 'item' : 'items'} ·{' '}
                {activeTab === 'purchases' ? 'Purchases' : 'Sells'}
              </Typography>
            </View>

            <View style={styles.heroMetricsRow}>
              <View style={styles.heroMetric}>
                <Typography
                  variant="caption"
                  weight="semibold"
                  color={theme.colors.brand.textMuted}
                  style={styles.heroMetricLabel}>
                  ITEMS
                </Typography>
                <Typography variant="h3" weight="bold" color={theme.colors.brand.text}>
                  {totalItems}
                </Typography>
              </View>
              <View style={styles.heroMetricDivider} />
              <View style={styles.heroMetric}>
                <Typography
                  variant="caption"
                  weight="semibold"
                  color={theme.colors.brand.textMuted}
                  style={styles.heroMetricLabel}>
                  {activeTab === 'purchases' ? 'ORDERED' : 'SOLD'}
                </Typography>
                <Typography variant="h3" weight="bold" color={theme.colors.brand.text}>
                  {totalQty}
                </Typography>
              </View>
              <View style={styles.heroMetricDivider} />
              <View style={styles.heroMetric}>
                <Typography
                  variant="caption"
                  weight="semibold"
                  color={theme.colors.brand.textMuted}
                  style={styles.heroMetricLabel}>
                  {activeTab === 'purchases' ? 'VALUE' : 'REVENUE'}
                </Typography>
                <Typography variant="h3" weight="bold" color={theme.colors.brand.text}>
                  ${(totalValue / 1000).toFixed(1)}K
                </Typography>
              </View>
            </View>
          </Animated.View>
        </View>

        <View style={styles.contentWrap}>
        <View style={styles.searchWrap}>
          <View style={styles.searchCard}>
            <SearchIcon size={18} color={theme.colors.gray[500]} />
            <RNTextInput
              style={styles.searchInput}
              placeholder="Search by name or SKU..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={theme.colors.gray[400]}
            />
            {searchQuery ? (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.searchClear}
                activeOpacity={0.7}>
                <CloseIcon size={14} color={theme.colors.gray[500]} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View style={styles.tabsWrap}>
          <View style={styles.tabsCard}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'purchases' && styles.tabActive]}
              onPress={() => setActiveTab('purchases')}
              activeOpacity={0.85}>
              <Typography
                variant="small"
                weight="semibold"
                color={activeTab === 'purchases' ? theme.colors.white : theme.colors.gray[700]}>
                Purchases
              </Typography>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'sells' && styles.tabActive]}
              onPress={() => setActiveTab('sells')}
              activeOpacity={0.85}>
              <Typography
                variant="small"
                weight="semibold"
                color={activeTab === 'sells' ? theme.colors.white : theme.colors.gray[700]}>
                Sells
              </Typography>
            </TouchableOpacity>
          </View>
        </View>

        {error && (
          <Card variant="outlined" padding="lg" style={styles.errorCard}>
            <View style={styles.errorContent}>
              <View style={styles.errorIconWrap}>
                <AlertCircleIcon size={22} color={theme.colors.error[600]} />
              </View>
              <Typography variant="body" color={theme.colors.error[700]} style={styles.errorText}>
                {error}
              </Typography>
            </View>
          </Card>
        )}

        {!error && filteredItems.length === 0 && (
          <Card variant="elevated" padding="lg" style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <BoxIcon size={32} color={theme.colors.primary[600]} />
            </View>
            <Typography
              variant="h3"
              weight="semibold"
              color={theme.colors.gray[800]}
              style={styles.emptyTitle}>
              No items found
            </Typography>
            <Typography variant="small" color={theme.colors.gray[500]} align="center">
              {searchQuery ? 'Try adjusting your search.' : 'No items to display yet.'}
            </Typography>
          </Card>
        )}

        {!error && filteredItems.length > 0 && (
          <View style={styles.sectionEyebrow}>
            <View style={styles.eyebrowLine} />
            <Typography variant="caption" weight="semibold" color={theme.colors.primary[600]}>
              {activeTab === 'purchases' ? 'PURCHASED ITEMS' : 'SOLD ITEMS'}
            </Typography>
          </View>
        )}

        <View style={styles.itemsList}>
          {filteredItems.map((group, index) => {
            const isExpanded = expandedItems[group.sku];
            return (
              <Card
                key={group._id || `${group.sku}-${index}`}
                variant="elevated"
                padding="none"
                style={styles.groupCard}>
                <View style={styles.groupStripe} />
                <TouchableOpacity
                  onPress={() => toggleExpand(group.sku, group.name)}
                  style={styles.groupHeader}
                  activeOpacity={0.85}>
                  <View style={styles.groupHeaderTop}>
                    <View style={styles.boxIconContainer}>
                      <BoxIcon size={22} color={theme.colors.primary[600]} />
                    </View>
                    <View style={styles.groupInfo}>
                      <Typography variant="body" weight="bold" numberOfLines={1}>
                        {group.name}
                      </Typography>
                      <Typography variant="caption" color={theme.colors.gray[500]}>
                        SKU {group.sku} ·{' '}
                        {activeTab === 'purchases' ? group.orderCount : group.invoiceCount}{' '}
                        {activeTab === 'purchases'
                          ? group.orderCount === 1
                            ? 'order'
                            : 'orders'
                          : group.invoiceCount === 1
                          ? 'invoice'
                          : 'invoices'}
                      </Typography>
                    </View>
                    <View style={styles.chevronCircle}>
                      {isExpanded ? (
                        <ChevronDownIcon size={16} color={theme.colors.gray[700]} />
                      ) : (
                        <ChevronRightIcon size={16} color={theme.colors.gray[700]} />
                      )}
                    </View>
                  </View>

                  <View style={styles.groupStatsRow}>
                    <View style={[styles.groupStatPill, {backgroundColor: theme.colors.primary[50]}]}>
                      <Typography variant="caption" weight="semibold" color={theme.colors.primary[700]}>
                        {activeTab === 'purchases' ? 'Ordered' : 'Sold'}
                      </Typography>
                      <Typography variant="body" weight="bold" color={theme.colors.primary[700]}>
                        {group.totalQuantity}
                      </Typography>
                    </View>
                    <View style={[styles.groupStatPill, {backgroundColor: theme.colors.accent[50]}]}>
                      <Typography variant="caption" weight="semibold" color={theme.colors.accent[700]}>
                        Avg Price
                      </Typography>
                      <Typography variant="body" weight="bold" color={theme.colors.accent[700]}>
                        {formatCurrency(group.avgUnitPrice)}
                      </Typography>
                    </View>
                    <View style={[styles.groupStatPill, {backgroundColor: theme.colors.success[50]}]}>
                      <Typography variant="caption" weight="semibold" color={theme.colors.success[700]}>
                        {activeTab === 'purchases' ? 'Value' : 'Revenue'}
                      </Typography>
                      <Typography variant="body" weight="bold" color={theme.colors.success[700]}>
                        {formatCurrency(group.totalValue)}
                      </Typography>
                    </View>
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.expandedContainer}>
                    {loadingDetails[group.sku] && (
                      <View style={styles.expandedLoading}>
                        <ActivityIndicator size="small" color={theme.colors.primary[600]} />
                        <Typography
                          variant="small"
                          color={theme.colors.gray[600]}
                          style={{marginLeft: 8}}>
                          Loading details...
                        </Typography>
                      </View>
                    )}

                    {!loadingDetails[group.sku] &&
                      activeTab === 'purchases' &&
                      group.orders &&
                      group.orders.length > 0 && (
                        <>
                          <View style={styles.expandedHeader}>
                            <View style={[styles.expandedHeaderIcon, {backgroundColor: theme.colors.primary[50]}]}>
                              <ClipboardIcon size={14} color={theme.colors.primary[600]} />
                            </View>
                            <Typography variant="small" weight="semibold" color={theme.colors.gray[800]}>
                              Order Details
                            </Typography>
                            <View style={[styles.countPill, {backgroundColor: theme.colors.primary[50]}]}>
                              <Typography variant="caption" weight="semibold" color={theme.colors.primary[700]}>
                                {group.orders.length}
                              </Typography>
                            </View>
                          </View>

                          {group.orders.map((order: any, idx: number) => {
                            const isItemVerified = order.itemVerified === true;
                            const hasPartialReceipts =
                              order.verificationHistory && order.verificationHistory.length > 0;
                            const receivedQty = order.receivedQuantity || 0;
                            const expectedQty = order.qty || 0;
                            const remainingQty = Math.max(0, expectedQty - receivedQty);
                            const isPartiallyVerified =
                              receivedQty > 0 && receivedQty < expectedQty;

                            return (
                              <View key={`${order.orderNumber}-${idx}`} style={styles.detailItem}>
                                <View style={styles.detailItemTop}>
                                  <View style={styles.detailIdBadge}>
                                    <Typography
                                      variant="caption"
                                      weight="semibold"
                                      color={theme.colors.primary[700]}>
                                      #{order.orderNumber}
                                    </Typography>
                                  </View>
                                  {isItemVerified ? (
                                    <View
                                      style={[
                                        styles.statusPill,
                                        {backgroundColor: theme.colors.success[50]},
                                      ]}>
                                      <CheckCircleIcon size={12} color={theme.colors.success[600]} />
                                      <Typography
                                        variant="caption"
                                        weight="semibold"
                                        color={theme.colors.success[700]}>
                                        Verified
                                      </Typography>
                                    </View>
                                  ) : isPartiallyVerified ? (
                                    <View
                                      style={[
                                        styles.statusPill,
                                        {backgroundColor: theme.colors.warning[50]},
                                      ]}>
                                      <Typography
                                        variant="caption"
                                        weight="semibold"
                                        color={theme.colors.warning[700]}>
                                        Partial {receivedQty}/{expectedQty}
                                      </Typography>
                                    </View>
                                  ) : (
                                    <View
                                      style={[
                                        styles.statusPill,
                                        {backgroundColor: theme.colors.gray[100]},
                                      ]}>
                                      <Typography
                                        variant="caption"
                                        weight="semibold"
                                        color={theme.colors.gray[600]}>
                                        Pending
                                      </Typography>
                                    </View>
                                  )}
                                </View>

                                <View style={styles.detailRow}>
                                  <Typography variant="caption" color={theme.colors.gray[500]}>
                                    PO Number
                                  </Typography>
                                  <Typography variant="small" color={theme.colors.gray[700]}>
                                    {order.poNumber || 'N/A'}
                                  </Typography>
                                </View>
                                <View style={styles.detailRow}>
                                  <Typography variant="caption" color={theme.colors.gray[500]}>
                                    Order Date
                                  </Typography>
                                  <Typography variant="small" color={theme.colors.gray[700]}>
                                    {formatDate(order.orderDate)}
                                  </Typography>
                                </View>
                                <View style={styles.detailRow}>
                                  <Typography variant="caption" color={theme.colors.gray[500]}>
                                    Vendor
                                  </Typography>
                                  <Typography variant="small" weight="semibold">
                                    {order.vendor || 'N/A'}
                                  </Typography>
                                </View>
                                <View style={styles.detailRow}>
                                  <Typography variant="caption" color={theme.colors.gray[500]}>
                                    Quantity
                                  </Typography>
                                  <Typography variant="small" weight="bold">
                                    {order.qty}
                                  </Typography>
                                </View>
                                {hasPartialReceipts && (
                                  <>
                                    <View style={styles.detailRow}>
                                      <Typography variant="caption" color={theme.colors.gray[500]}>
                                        Received
                                      </Typography>
                                      <Typography
                                        variant="small"
                                        weight="bold"
                                        color={theme.colors.success[700]}>
                                        {receivedQty}
                                      </Typography>
                                    </View>
                                    <View style={styles.detailRow}>
                                      <Typography variant="caption" color={theme.colors.gray[500]}>
                                        Remaining
                                      </Typography>
                                      <Typography
                                        variant="small"
                                        weight="bold"
                                        color={theme.colors.primary[700]}>
                                        {remainingQty}
                                      </Typography>
                                    </View>
                                    <View style={styles.detailRow}>
                                      <Typography variant="caption" color={theme.colors.gray[500]}>
                                        Receipts
                                      </Typography>
                                      <Typography variant="small" weight="medium">
                                        {order.verificationHistory.length}
                                      </Typography>
                                    </View>
                                  </>
                                )}
                                <View style={styles.detailRow}>
                                  <Typography variant="caption" color={theme.colors.gray[500]}>
                                    Unit Price
                                  </Typography>
                                  <Typography variant="small">
                                    {formatCurrency(order.unitPrice)}
                                  </Typography>
                                </View>
                                <View style={styles.detailRow}>
                                  <Typography variant="caption" color={theme.colors.gray[500]}>
                                    Line Total
                                  </Typography>
                                  <Typography
                                    variant="small"
                                    weight="bold"
                                    color={theme.colors.success[700]}>
                                    {formatCurrency(order.lineTotal)}
                                  </Typography>
                                </View>

                                {!isItemVerified && (
                                  <View style={styles.verifyBtnWrap}>
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      onPress={() => handleVerifyItem(order, order.itemIndex, group.sku)}
                                      loading={verifyingItems[`${order.orderNumber}-${order.itemIndex}`]}
                                      disabled={verifyingItems[`${order.orderNumber}-${order.itemIndex}`]}
                                      fullWidth
                                      title={
                                        verifyingItems[`${order.orderNumber}-${order.itemIndex}`]
                                          ? 'Verifying...'
                                          : isPartiallyVerified
                                          ? 'Verify More'
                                          : 'Verify Arrival'
                                      }
                                    />
                                  </View>
                                )}
                              </View>
                            );
                          })}
                        </>
                      )}

                    {!loadingDetails[group.sku] &&
                      activeTab === 'sells' &&
                      group.invoices &&
                      group.invoices.length > 0 && (
                        <>
                          <View style={styles.expandedHeader}>
                            <View style={[styles.expandedHeaderIcon, {backgroundColor: theme.colors.success[50]}]}>
                              <DollarIcon size={14} color={theme.colors.success[600]} />
                            </View>
                            <Typography variant="small" weight="semibold" color={theme.colors.gray[800]}>
                              Invoice Details
                            </Typography>
                            <View style={[styles.countPill, {backgroundColor: theme.colors.success[50]}]}>
                              <Typography variant="caption" weight="semibold" color={theme.colors.success[700]}>
                                {group.invoices.length}
                              </Typography>
                            </View>
                          </View>

                          {group.invoices.map((invoice: any, idx: number) => (
                            <View key={`${invoice.invoiceNumber}-${idx}`} style={styles.detailItem}>
                              <View style={styles.detailItemTop}>
                                <View
                                  style={[
                                    styles.detailIdBadge,
                                    {backgroundColor: theme.colors.success[50]},
                                  ]}>
                                  <Typography
                                    variant="caption"
                                    weight="semibold"
                                    color={theme.colors.success[700]}>
                                    #{invoice.invoiceNumber}
                                  </Typography>
                                </View>
                                <View
                                  style={[
                                    styles.statusPill,
                                    {
                                      backgroundColor: invoice.stockProcessed
                                        ? theme.colors.success[50]
                                        : theme.colors.warning[50],
                                    },
                                  ]}>
                                  <Typography
                                    variant="caption"
                                    weight="semibold"
                                    color={
                                      invoice.stockProcessed
                                        ? theme.colors.success[700]
                                        : theme.colors.warning[700]
                                    }>
                                    {invoice.stockProcessed ? 'Stock processed' : 'Pending stock'}
                                  </Typography>
                                </View>
                              </View>

                              <View style={styles.detailRow}>
                                <Typography variant="caption" color={theme.colors.gray[500]}>
                                  Type
                                </Typography>
                                <Typography variant="small" weight="medium">
                                  {invoice.invoiceType || 'N/A'}
                                </Typography>
                              </View>
                              <View style={styles.detailRow}>
                                <Typography variant="caption" color={theme.colors.gray[500]}>
                                  Date
                                </Typography>
                                <Typography variant="small" color={theme.colors.gray[700]}>
                                  {formatDate(invoice.date)}
                                </Typography>
                              </View>
                              <View style={styles.detailRow}>
                                <Typography variant="caption" color={theme.colors.gray[500]}>
                                  Customer
                                </Typography>
                                <Typography variant="small" weight="semibold">
                                  {invoice.customerName || 'N/A'}
                                </Typography>
                              </View>
                              <View style={styles.detailRow}>
                                <Typography variant="caption" color={theme.colors.gray[500]}>
                                  Quantity
                                </Typography>
                                <Typography variant="small" weight="bold">
                                  {invoice.qty}
                                </Typography>
                              </View>
                              <View style={styles.detailRow}>
                                <Typography variant="caption" color={theme.colors.gray[500]}>
                                  Rate
                                </Typography>
                                <Typography variant="small">
                                  {formatCurrency(invoice.rate)}
                                </Typography>
                              </View>
                              <View style={styles.detailRow}>
                                <Typography variant="caption" color={theme.colors.gray[500]}>
                                  Amount
                                </Typography>
                                <Typography
                                  variant="small"
                                  weight="bold"
                                  color={theme.colors.success[700]}>
                                  {formatCurrency(invoice.amount)}
                                </Typography>
                              </View>
                              <View style={styles.detailRow}>
                                <Typography variant="caption" color={theme.colors.gray[500]}>
                                  Status
                                </Typography>
                                <Typography variant="small" weight="medium">
                                  {invoice.status || 'N/A'}
                                </Typography>
                              </View>
                            </View>
                          ))}
                        </>
                      )}

                    {!loadingDetails[group.sku] &&
                      activeTab === 'purchases' &&
                      group.orders !== undefined &&
                      (!group.orders || group.orders.length === 0) && (
                        <View style={styles.detailEmpty}>
                          <TimelineIcon size={20} color={theme.colors.gray[400]} />
                          <Typography variant="small" color={theme.colors.gray[500]}>
                            No purchase orders for this item
                          </Typography>
                        </View>
                      )}
                    {!loadingDetails[group.sku] &&
                      activeTab === 'sells' &&
                      group.invoices !== undefined &&
                      (!group.invoices || group.invoices.length === 0) && (
                        <View style={styles.detailEmpty}>
                          <TimelineIcon size={20} color={theme.colors.gray[400]} />
                          <Typography variant="small" color={theme.colors.gray[500]}>
                            No sales invoices for this item
                          </Typography>
                        </View>
                      )}
                  </View>
                )}
              </Card>
            );
          })}
        </View>
        </View>
      </ScrollView>

      <PartialVerificationModal
        visible={verifyModalVisible}
        onClose={handleCloseVerifyModal}
        onConfirm={handleConfirmVerification}
        order={selectedOrderForVerify}
        loading={
          selectedOrderForVerify
            ? verifyingItems[`${selectedOrderForVerify.orderNumber}-${selectedOrderForVerify.itemIndex}`]
            : false
        }
      />
    </SafeAreaView>
  );
};

const makeStyles = (theme: Theme, bp: BreakpointInfo) => {
  const wide = !bp.isMobile;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.brand.bg,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.gray[50],
    },
    loadingMark: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: theme.colors.primary[50],
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.md,
    },
    scrollView: {
      flex: 1,
      backgroundColor: theme.colors.background.secondary,
    },
    scrollContent: {
      paddingBottom: theme.spacing.xxxl,
    },

    hero: {
      paddingHorizontal: bp.gutter,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xl + theme.spacing.md,
      backgroundColor: theme.colors.brand.bg,
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
      overflow: 'hidden',
      position: 'relative',
    },
    blob: {
      position: 'absolute',
      borderRadius: 9999,
    },
    blobOne: {
      width: wide ? 420 : 280,
      height: wide ? 420 : 280,
      top: wide ? -170 : -130,
      right: wide ? -150 : -100,
      backgroundColor: theme.colors.primary[400],
    },
    blobTwo: {
      width: wide ? 320 : 220,
      height: wide ? 320 : 220,
      bottom: wide ? -150 : -110,
      left: wide ? -100 : -70,
      backgroundColor: theme.colors.accent[500],
    },
    dotGrid: {
      position: 'absolute',
      top: 50,
      right: 18,
      width: 90,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      opacity: 0.18,
    },
    dot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.white,
    },
    heroBody: {
      width: '100%',
      maxWidth: bp.contentMaxWidth,
      alignSelf: 'center',
      zIndex: 2,
    },

    contentWrap: {
      width: '100%',
      maxWidth: bp.contentMaxWidth,
      alignSelf: 'center',
      paddingHorizontal: bp.gutter,
    },
    heroTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.md,
    },
    heroEyebrow: {
      letterSpacing: 1.4,
      marginBottom: 4,
    },
    heroTitle: {
      letterSpacing: -0.4,
      marginBottom: 2,
    },
    heroRefresh: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: theme.colors.brand.glassBgStrong,
      borderWidth: 1,
      borderColor: theme.colors.brand.glassBorderStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statusChip: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: theme.spacing.sm + 2,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: theme.colors.brand.glassBg,
      borderWidth: 1,
      borderColor: theme.colors.brand.glassBorder,
      marginBottom: theme.spacing.lg,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.success[400],
    },
    heroMetricsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.brand.glassBg,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.brand.glassBorder,
      paddingVertical: theme.spacing.md - 2,
      paddingHorizontal: theme.spacing.sm,
    },
    heroMetric: {
      flex: 1,
      alignItems: 'center',
      gap: 2,
    },
    heroMetricLabel: {
      letterSpacing: 1.2,
    },
    heroMetricDivider: {
      width: 1,
      height: 28,
      backgroundColor: 'rgba(255,255,255,0.18)',
    },

    searchWrap: {
      marginTop: -22,
      zIndex: 3,
    },
    searchCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.white,
      borderRadius: 14,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
      ...theme.shadows.md,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.gray[900],
      paddingVertical: 0,
    },
    searchClear: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.gray[100],
    },

    tabsWrap: {
      marginTop: theme.spacing.md,
    },
    tabsCard: {
      flexDirection: 'row',
      gap: 6,
      backgroundColor: theme.colors.white,
      borderRadius: 12,
      padding: 6,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
    },
    tab: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center',
      backgroundColor: theme.colors.gray[50],
    },
    tabActive: {
      backgroundColor: theme.colors.primary[600],
    },

    sectionEyebrow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.lg,
      marginBottom: theme.spacing.md,
    },
    eyebrowLine: {
      width: 24,
      height: 2,
      borderRadius: 1,
      backgroundColor: theme.colors.primary[600],
    },

    errorCard: {
      marginTop: theme.spacing.md,
      backgroundColor: theme.colors.error[50],
      borderColor: theme.colors.error[200],
    },
    errorContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    errorIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: theme.colors.error[100],
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorText: {
      flex: 1,
    },

    emptyCard: {
      marginTop: theme.spacing.md,
      alignItems: 'center',
      paddingVertical: theme.spacing.xl,
    },
    emptyIconWrap: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: theme.colors.primary[50],
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.md,
    },
    emptyTitle: {
      marginBottom: theme.spacing.xs,
    },

    itemsList: {
      gap: theme.spacing.md,
    },
    groupCard: {
      overflow: 'hidden',
      position: 'relative',
    },
    groupStripe: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 3,
      backgroundColor: theme.colors.primary[500],
    },
    groupHeader: {
      paddingTop: theme.spacing.md + 4,
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.md,
      gap: theme.spacing.md,
    },
    groupHeaderTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    boxIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: theme.colors.primary[50],
      alignItems: 'center',
      justifyContent: 'center',
    },
    groupInfo: {
      flex: 1,
      gap: 2,
    },
    chevronCircle: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: theme.colors.gray[50],
      alignItems: 'center',
      justifyContent: 'center',
    },
    groupStatsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    groupStatPill: {
      flex: 1,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 10,
      gap: 2,
    },

    expandedContainer: {
      backgroundColor: theme.colors.background.secondary,
      borderTopWidth: 1,
      borderTopColor: theme.colors.gray[200],
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    expandedLoading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.md,
    },
    expandedHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 4,
    },
    expandedHeaderIcon: {
      width: 26,
      height: 26,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    countPill: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
    },
    detailItem: {
      backgroundColor: theme.colors.white,
      borderRadius: 12,
      padding: theme.spacing.md,
      gap: 8,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
    },
    detailItemTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    detailIdBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: theme.colors.primary[50],
    },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    verifyBtnWrap: {
      marginTop: 6,
    },
    detailEmpty: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: theme.spacing.md,
    },
  });
};
