import React, {useState, useEffect, useMemo, useRef} from 'react';
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
  Animated,
  Easing,
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
  CheckCircleIcon,
  ClockIcon,
  FileTextIcon,
  CloseIcon,
  RefreshIcon,
  SearchIcon,
  ClipboardIcon,
  ArrowRightIcon,
} from '../components/icons';
import {formatDate} from '../utils/dateUtils';
import {useBreakpoint, BreakpointInfo} from '../utils/breakpoints';

interface OrdersScreenProps {
  visible: boolean;
  onClose: () => void;
}

export const OrdersScreen: React.FC<OrdersScreenProps> = ({visible, onClose}) => {
  const theme = useTheme();
  const bp = useBreakpoint();
  const styles = useMemo(() => makeStyles(theme, bp), [theme, bp]);
  // Mac / desktop-class width gets a dedicated table layout instead of the
  // stacked phone cards (which look sparse on a wide window).
  const isWideLayout = bp.isDesktop || bp.isWide;
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
  const [stats, setStats] = useState({totalOrders: 0, processed: 0, pending: 0});
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [autoSyncInterval] = useState(30);

  const heroFade = useRef(new Animated.Value(1)).current;
  const heroSlide = useRef(new Animated.Value(0)).current;
  const blobPulse = useRef(new Animated.Value(0)).current;

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
          order.vendor?.name?.toLowerCase().includes(searchQuery.toLowerCase()),
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
          const response = await ordersService.syncOrders(token, 0, 'new');
          if (response.success && (response.data.created > 0 || response.data.updated > 0)) {
            loadData(currentPage);
          }
        } catch (err) {
          console.error('Auto-sync error:', err);
        }
      }
    }, intervalMs);
    return () => clearInterval(autoSyncTimer);
  }, [autoSyncEnabled, autoSyncInterval, syncing, visible, token, currentPage]);

  useEffect(() => {
    if (visible) {
      heroFade.setValue(0.6);
      heroSlide.setValue(16);
      Animated.parallel([
        Animated.timing(heroFade, {toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true}),
        Animated.timing(heroSlide, {toValue: 0, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true}),
      ]).start();
    }
  }, [visible, heroFade, heroSlide]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(blobPulse, {toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true}),
        Animated.timing(blobPulse, {toValue: 0, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true}),
      ]),
    ).start();
  }, [blobPulse]);

  const loadData = async (page: number = 1) => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const response = await ordersService.getOrders(token, {page, limit: 20});
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
    } catch (err: any) {
      console.error('Failed to fetch orders:', err);
      const wasHandled = await handleApiError(err);
      if (wasHandled) return;
      setError(err.message || 'Failed to load orders');
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

  const runSync = async (
    direction: 'new' | 'old' | 'all',
    setFlag: (value: boolean) => void,
  ) => {
    if (!token) return;
    setFlag(true);
    setSyncing(true);
    try {
      if (direction === 'all') {
        const ordersResponse = await ordersService.syncOrders(token, 0, 'new');
        if (ordersResponse.success) {
          try {
            await ordersService.syncAllOrderDetails(token, 0);
          } catch (detailsError) {
            console.error('Error syncing details:', detailsError);
          }
          setCurrentPage(1);
          setOrders([]);
          loadData(1);
        }
      } else {
        const response = await ordersService.syncOrders(token, 0, direction);
        if (response.success) {
          setCurrentPage(1);
          setOrders([]);
          loadData(1);
        }
      }
    } catch (err: any) {
      console.error(`Failed to sync ${direction} orders:`, err);
      const wasHandled = await handleApiError(err);
      if (!wasHandled) setError(err.message || `Failed to sync ${direction} orders`);
    } finally {
      setFlag(false);
      setSyncing(false);
    }
  };

  const handleSyncNew = () => runSync('new', setSyncingNew);
  const handleSyncOld = () => runSync('old', setSyncingOld);
  const handleSyncAll = () => runSync('all', setSyncingAll);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage && !loading) {
      loadData(page);
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
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
    if (newExpanded.has(orderNumber)) newExpanded.delete(orderNumber);
    else newExpanded.add(orderNumber);
    setExpandedOrders(newExpanded);
  };

  const formatCurrency = (amount: number) => `$${(amount || 0).toFixed(2)}`;

  type StatusTone = 'success' | 'primary' | 'error' | 'gray';
  const getStatusTone = (status: string): StatusTone => {
    if (status === 'Complete') return 'success';
    if (status === 'Processing' || status === 'Shipped') return 'primary';
    if (status === 'Cancelled') return 'error';
    return 'gray';
  };
  const tonePalette = (tone: StatusTone) => {
    if (tone === 'gray') return {bg: theme.colors.gray[100], fg: theme.colors.gray[700], strong: theme.colors.gray[400]};
    return {bg: theme.colors[tone][50], fg: theme.colors[tone][700], strong: theme.colors[tone][500]};
  };

  const blobScale = blobPulse.interpolate({inputRange: [0, 1], outputRange: [1, 1.08]});
  const blobOpacity = blobPulse.interpolate({inputRange: [0, 1], outputRange: [0.18, 0.28]});

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingMark}>
              <FileTextIcon size={22} color={theme.colors.primary[600]} />
            </View>
            <ActivityIndicator size="large" color={theme.colors.primary[600]} />
            <Typography variant="body" color={theme.colors.gray[600]} style={{marginTop: 16}}>
              Loading orders...
            </Typography>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.white} />
            }>
            <View style={styles.hero}>
              <Animated.View style={[styles.blob, styles.blobOne, {transform: [{scale: blobScale}], opacity: blobOpacity}]} />
              <Animated.View style={[styles.blob, styles.blobTwo, {transform: [{scale: blobScale}], opacity: blobOpacity}]} />
              <View style={styles.dotGrid} pointerEvents="none">
                {Array.from({length: 18}).map((_, i) => <View key={i} style={styles.dot} />)}
              </View>

              <Animated.View style={[styles.heroBody, {opacity: heroFade, transform: [{translateY: heroSlide}]}]}>
                <View style={styles.heroTopRow}>
                  <TouchableOpacity onPress={onClose} style={styles.heroIconBtn} activeOpacity={0.85}>
                    <CloseIcon size={16} color={theme.colors.brand.text} />
                  </TouchableOpacity>
                  <View style={{flex: 1}}>
                    <Typography variant="caption" weight="semibold" color={theme.colors.brand.textTracked} style={styles.heroEyebrow}>
                      ORDERS
                    </Typography>
                    <Typography variant="h2" weight="bold" color={theme.colors.brand.text} style={styles.heroTitle}>
                      Purchase Orders
                    </Typography>
                    <Typography variant="small" color={theme.colors.brand.textMuted}>
                      CustomerConnect orders · live sync
                    </Typography>
                  </View>
                  <TouchableOpacity onPress={() => loadData(currentPage)} style={styles.heroIconBtn} activeOpacity={0.85}>
                    <RefreshIcon size={18} color={theme.colors.brand.text} />
                  </TouchableOpacity>
                </View>

                <View style={styles.statusChip}>
                  <View style={[styles.statusDot, autoSyncEnabled ? null : {backgroundColor: theme.colors.gray[400]}]} />
                  <Typography variant="caption" weight="semibold" color={theme.colors.brand.text}>
                    {autoSyncEnabled ? `Auto-sync · every ${autoSyncInterval} min` : 'Auto-sync off'}
                  </Typography>
                </View>

                <View style={styles.heroMetricsRow}>
                  <View style={styles.heroMetric}>
                    <Typography variant="caption" weight="semibold" color={theme.colors.brand.textMuted} style={styles.heroMetricLabel}>
                      TOTAL
                    </Typography>
                    <Typography variant="h3" weight="bold" color={theme.colors.brand.text}>
                      {stats.totalOrders}
                    </Typography>
                  </View>
                  <View style={styles.heroMetricDivider} />
                  <View style={styles.heroMetric}>
                    <Typography variant="caption" weight="semibold" color={theme.colors.brand.textMuted} style={styles.heroMetricLabel}>
                      PROCESSED
                    </Typography>
                    <Typography variant="h3" weight="bold" color={theme.colors.brand.text}>
                      {stats.processed}
                    </Typography>
                  </View>
                  <View style={styles.heroMetricDivider} />
                  <View style={styles.heroMetric}>
                    <Typography variant="caption" weight="semibold" color={theme.colors.brand.textMuted} style={styles.heroMetricLabel}>
                      PENDING
                    </Typography>
                    <Typography variant="h3" weight="bold" color={theme.colors.brand.text}>
                      {stats.pending}
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
                  placeholder="Search order or vendor"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor={theme.colors.gray[400]}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClear} activeOpacity={0.7}>
                    <CloseIcon size={14} color={theme.colors.gray[500]} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            <View style={styles.syncRow}>
              <TouchableOpacity
                onPress={handleSyncNew}
                disabled={syncing}
                style={[styles.syncBtn, styles.syncBtnPrimary, syncing && styles.syncBtnDisabled]}
                activeOpacity={0.85}>
                {syncingNew ? (
                  <ActivityIndicator size="small" color={theme.colors.brand.text} />
                ) : (
                  <>
                    <ArrowRightIcon size={14} color={theme.colors.brand.text} />
                    <Typography variant="caption" weight="semibold" color={theme.colors.brand.text}>
                      New
                    </Typography>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSyncOld}
                disabled={syncing}
                style={[styles.syncBtn, styles.syncBtnGhost, syncing && styles.syncBtnDisabled]}
                activeOpacity={0.85}>
                {syncingOld ? (
                  <ActivityIndicator size="small" color={theme.colors.primary[600]} />
                ) : (
                  <Typography variant="caption" weight="semibold" color={theme.colors.primary[700]}>
                    Old
                  </Typography>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSyncAll}
                disabled={syncing}
                style={[styles.syncBtn, styles.syncBtnSuccess, syncing && styles.syncBtnDisabled]}
                activeOpacity={0.85}>
                {syncingAll ? (
                  <ActivityIndicator size="small" color={theme.colors.brand.text} />
                ) : (
                  <>
                    <RefreshIcon size={14} color={theme.colors.brand.text} />
                    <Typography variant="caption" weight="semibold" color={theme.colors.brand.text}>
                      Sync all
                    </Typography>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.automationWrap}>
              <View style={styles.automationCard}>
                <View style={styles.automationLeft}>
                  <View style={styles.automationIconWrap}>
                    <ClockIcon size={14} color={theme.colors.primary[600]} />
                  </View>
                  <View style={{flex: 1}}>
                    <Typography variant="small" weight="semibold">
                      Auto-sync new orders
                    </Typography>
                    <Typography variant="caption" color={theme.colors.gray[500]}>
                      Every {autoSyncInterval} minutes when this screen is open
                    </Typography>
                  </View>
                </View>
                <Switch
                  value={autoSyncEnabled}
                  onValueChange={setAutoSyncEnabled}
                  trackColor={{false: theme.colors.gray[300], true: theme.colors.primary[600]}}
                  thumbColor={theme.colors.white}
                />
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

            {!error && filteredOrders.length === 0 && (
              <Card variant="elevated" padding="lg" style={styles.emptyCard}>
                <View style={styles.emptyIconWrap}>
                  <FileTextIcon size={32} color={theme.colors.primary[600]} />
                </View>
                <Typography variant="h3" weight="semibold" color={theme.colors.gray[800]} style={styles.emptyTitle}>
                  No orders found
                </Typography>
                <Typography variant="small" color={theme.colors.gray[500]} align="center">
                  {searchQuery ? 'Try adjusting your search.' : 'No orders available yet — try syncing.'}
                </Typography>
              </Card>
            )}

            {!error && filteredOrders.length > 0 && (
              <View style={styles.sectionEyebrow}>
                <View style={styles.eyebrowLine} />
                <Typography variant="caption" weight="semibold" color={theme.colors.primary[600]}>
                  ORDERS · {totalOrders}
                </Typography>
              </View>
            )}

            {isWideLayout && !error && filteredOrders.length > 0 ? (
              <View style={styles.table}>
                <View style={styles.tableHeadRow}>
                  <Typography variant="caption" weight="semibold" color={theme.colors.gray[500]} style={[styles.th, styles.colOrder]}>ORDER</Typography>
                  <Typography variant="caption" weight="semibold" color={theme.colors.gray[500]} style={[styles.th, styles.colVendor]}>VENDOR</Typography>
                  <Typography variant="caption" weight="semibold" color={theme.colors.gray[500]} style={[styles.th, styles.colDate]}>DATE</Typography>
                  <Typography variant="caption" weight="semibold" color={theme.colors.gray[500]} style={[styles.th, styles.colStatus]}>STATUS</Typography>
                  <Typography variant="caption" weight="semibold" color={theme.colors.gray[500]} style={[styles.th, styles.colStock]}>STOCK</Typography>
                  <Typography variant="caption" weight="semibold" color={theme.colors.gray[500]} style={[styles.th, styles.colItems, styles.tdRight]}>ITEMS</Typography>
                  <Typography variant="caption" weight="semibold" color={theme.colors.gray[500]} style={[styles.th, styles.colTotal, styles.tdRight]}>TOTAL</Typography>
                  <View style={styles.colChevron} />
                </View>
                {filteredOrders.map((order, index) => {
                  const isExpanded = expandedOrders.has(order.orderNumber);
                  const tone = getStatusTone(order.status);
                  const palette = tonePalette(tone);
                  return (
                    <View key={order._id || index} style={[styles.tableRowWrap, isExpanded && styles.tableRowWrapActive]}>
                      <TouchableOpacity onPress={() => handleOrderPress(order.orderNumber)} style={styles.tableRow} activeOpacity={0.7}>
                        <View style={[styles.colOrder, styles.orderCell]}>
                          <View style={[styles.rowStripe, {backgroundColor: palette.strong}]} />
                          <Typography variant="body" weight="bold" numberOfLines={1}>#{order.orderNumber}</Typography>
                        </View>
                        <Typography variant="small" numberOfLines={1} style={styles.colVendor}>
                          {order.vendor?.name || 'N/A'}
                        </Typography>
                        <Typography variant="small" color={theme.colors.gray[600]} numberOfLines={1} style={styles.colDate}>
                          {formatDate(order.orderDate)}
                        </Typography>
                        <View style={styles.colStatus}>
                          <View style={[styles.metaPill, {backgroundColor: palette.bg, alignSelf: 'flex-start'}]}>
                            <Typography variant="caption" weight="semibold" color={palette.fg}>
                              {order.status || 'Pending'}
                            </Typography>
                          </View>
                        </View>
                        <View style={styles.colStock}>
                          {order.stockProcessed ? (
                            <View style={[styles.metaPill, {backgroundColor: theme.colors.success[50], alignSelf: 'flex-start'}]}>
                              <CheckCircleIcon size={11} color={theme.colors.success[600]} />
                              <Typography variant="caption" weight="semibold" color={theme.colors.success[700]}>Done</Typography>
                            </View>
                          ) : (
                            <View style={[styles.metaPill, {backgroundColor: theme.colors.warning[50], alignSelf: 'flex-start'}]}>
                              <ClockIcon size={11} color={theme.colors.warning[600]} />
                              <Typography variant="caption" weight="semibold" color={theme.colors.warning[700]}>Pending</Typography>
                            </View>
                          )}
                        </View>
                        <Typography variant="small" weight="semibold" color={theme.colors.gray[700]} style={[styles.colItems, styles.tdRight]}>
                          {order.itemCount || 0}
                        </Typography>
                        <Typography variant="body" weight="bold" color={theme.colors.success[700]} style={[styles.colTotal, styles.tdRight]}>
                          {formatCurrency(order.total)}
                        </Typography>
                        <View style={styles.colChevron}>
                          <View style={styles.chevronCircle}>
                            {isExpanded ? (
                              <ChevronDownIcon size={14} color={theme.colors.gray[700]} />
                            ) : (
                              <ChevronRightIcon size={14} color={theme.colors.gray[700]} />
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>

                      {isExpanded && order.items && order.items.length > 0 && (
                        <View style={styles.tableExpanded}>
                          <View style={styles.itemsHeadRow}>
                            <Typography variant="caption" weight="semibold" color={theme.colors.gray[500]} style={styles.itemColName}>ITEM</Typography>
                            <Typography variant="caption" weight="semibold" color={theme.colors.gray[500]} style={styles.itemColSku}>SKU</Typography>
                            <Typography variant="caption" weight="semibold" color={theme.colors.gray[500]} style={[styles.itemColQty, styles.tdRight]}>QTY</Typography>
                            <Typography variant="caption" weight="semibold" color={theme.colors.gray[500]} style={[styles.itemColPrice, styles.tdRight]}>UNIT</Typography>
                            <Typography variant="caption" weight="semibold" color={theme.colors.gray[500]} style={[styles.itemColTotal, styles.tdRight]}>LINE TOTAL</Typography>
                            <Typography variant="caption" weight="semibold" color={theme.colors.gray[500]} style={styles.itemColStatus}>STATUS</Typography>
                          </View>
                          {order.items.map((item: any, itemIndex: number) => (
                            <View key={itemIndex} style={styles.itemsRow}>
                              <Typography variant="small" weight="semibold" numberOfLines={1} style={styles.itemColName}>{item.name || 'N/A'}</Typography>
                              <Typography variant="small" color={theme.colors.gray[600]} numberOfLines={1} style={styles.itemColSku}>{item.sku || 'N/A'}</Typography>
                              <Typography variant="small" weight="bold" style={[styles.itemColQty, styles.tdRight]}>{item.qty || 0}</Typography>
                              <Typography variant="small" style={[styles.itemColPrice, styles.tdRight]}>{formatCurrency(item.unitPrice || 0)}</Typography>
                              <Typography variant="small" weight="bold" color={theme.colors.success[700]} style={[styles.itemColTotal, styles.tdRight]}>
                                {formatCurrency(item.lineTotal || (item.qty || 0) * (item.unitPrice || 0))}
                              </Typography>
                              <View style={styles.itemColStatus}>
                                {item.itemVerified === true ? (
                                  <View style={[styles.statusPill, {backgroundColor: theme.colors.success[50], alignSelf: 'flex-start'}]}>
                                    <CheckCircleIcon size={11} color={theme.colors.success[600]} />
                                    <Typography variant="caption" weight="semibold" color={theme.colors.success[700]}>Verified</Typography>
                                  </View>
                                ) : item.receivedQuantity > 0 ? (
                                  <View style={[styles.statusPill, {backgroundColor: theme.colors.warning[50], alignSelf: 'flex-start'}]}>
                                    <Typography variant="caption" weight="semibold" color={theme.colors.warning[700]}>Partial {item.receivedQuantity}/{item.qty}</Typography>
                                  </View>
                                ) : (
                                  <View style={[styles.statusPill, {backgroundColor: theme.colors.gray[100], alignSelf: 'flex-start'}]}>
                                    <Typography variant="caption" weight="semibold" color={theme.colors.gray[700]}>Pending</Typography>
                                  </View>
                                )}
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ) : (
            <View style={styles.ordersList}>
              {filteredOrders.map((order, index) => {
                const isExpanded = expandedOrders.has(order.orderNumber);
                const tone = getStatusTone(order.status);
                const palette = tonePalette(tone);
                return (
                  <Card key={order._id || index} variant="elevated" padding="none" style={styles.orderCard}>
                    <View style={[styles.orderStripe, {backgroundColor: palette.strong}]} />
                    <TouchableOpacity onPress={() => handleOrderPress(order.orderNumber)} style={styles.orderHeader} activeOpacity={0.85}>
                      <View style={[styles.orderIconWrap, {backgroundColor: palette.bg}]}>
                        <FileTextIcon size={18} color={palette.fg} />
                      </View>
                      <View style={styles.orderInfo}>
                        <Typography variant="body" weight="bold" numberOfLines={1}>
                          #{order.orderNumber}
                        </Typography>
                        <Typography variant="caption" color={theme.colors.gray[500]} numberOfLines={1}>
                          {order.vendor?.name || 'N/A'} · {formatDate(order.orderDate)}
                        </Typography>
                      </View>
                      <View style={styles.orderTotalCol}>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          Total
                        </Typography>
                        <Typography variant="body" weight="bold" color={theme.colors.success[700]}>
                          {formatCurrency(order.total)}
                        </Typography>
                      </View>
                      <View style={styles.chevronCircle}>
                        {isExpanded ? (
                          <ChevronDownIcon size={14} color={theme.colors.gray[700]} />
                        ) : (
                          <ChevronRightIcon size={14} color={theme.colors.gray[700]} />
                        )}
                      </View>
                    </TouchableOpacity>

                    <View style={styles.orderMeta}>
                      <View style={[styles.metaPill, {backgroundColor: palette.bg}]}>
                        <Typography variant="caption" weight="semibold" color={palette.fg}>
                          {order.status || 'Pending'}
                        </Typography>
                      </View>
                      {order.stockProcessed ? (
                        <View style={[styles.metaPill, {backgroundColor: theme.colors.success[50]}]}>
                          <CheckCircleIcon size={11} color={theme.colors.success[600]} />
                          <Typography variant="caption" weight="semibold" color={theme.colors.success[700]}>
                            Stock processed
                          </Typography>
                        </View>
                      ) : (
                        <View style={[styles.metaPill, {backgroundColor: theme.colors.warning[50]}]}>
                          <ClockIcon size={11} color={theme.colors.warning[600]} />
                          <Typography variant="caption" weight="semibold" color={theme.colors.warning[700]}>
                            Pending stock
                          </Typography>
                        </View>
                      )}
                      <View style={[styles.metaPill, {backgroundColor: theme.colors.gray[100]}]}>
                        <Typography variant="caption" weight="semibold" color={theme.colors.gray[700]}>
                          {order.itemCount || 0} items
                        </Typography>
                      </View>
                    </View>

                    {isExpanded && order.items && order.items.length > 0 && (
                      <View style={styles.expandedContent}>
                        <View style={styles.expandedHeader}>
                          <View style={[styles.expandedHeaderIcon, {backgroundColor: theme.colors.primary[50]}]}>
                            <ClipboardIcon size={14} color={theme.colors.primary[600]} />
                          </View>
                          <Typography variant="small" weight="semibold" color={theme.colors.gray[800]}>
                            Order items
                          </Typography>
                          <View style={[styles.countPill, {backgroundColor: theme.colors.primary[50]}]}>
                            <Typography variant="caption" weight="semibold" color={theme.colors.primary[700]}>
                              {order.items.length}
                            </Typography>
                          </View>
                        </View>
                        {order.items.map((item: any, itemIndex: number) => (
                          <View key={itemIndex} style={styles.itemCard}>
                            <View style={styles.itemHeaderRow}>
                              <Typography variant="small" weight="bold" numberOfLines={1} style={{flex: 1}}>
                                {item.name || 'N/A'}
                              </Typography>
                              {item.itemVerified === true ? (
                                <View style={[styles.statusPill, {backgroundColor: theme.colors.success[50]}]}>
                                  <CheckCircleIcon size={11} color={theme.colors.success[600]} />
                                  <Typography variant="caption" weight="semibold" color={theme.colors.success[700]}>
                                    Verified
                                  </Typography>
                                </View>
                              ) : item.receivedQuantity > 0 ? (
                                <View style={[styles.statusPill, {backgroundColor: theme.colors.warning[50]}]}>
                                  <Typography variant="caption" weight="semibold" color={theme.colors.warning[700]}>
                                    Partial {item.receivedQuantity}/{item.qty}
                                  </Typography>
                                </View>
                              ) : (
                                <View style={[styles.statusPill, {backgroundColor: theme.colors.gray[100]}]}>
                                  <Typography variant="caption" weight="semibold" color={theme.colors.gray[700]}>
                                    Pending
                                  </Typography>
                                </View>
                              )}
                            </View>
                            <View style={styles.itemDetailRow}>
                              <Typography variant="caption" color={theme.colors.gray[500]}>SKU</Typography>
                              <Typography variant="small" weight="semibold">{item.sku || 'N/A'}</Typography>
                            </View>
                            <View style={styles.itemDetailRow}>
                              <Typography variant="caption" color={theme.colors.gray[500]}>Quantity</Typography>
                              <Typography variant="small" weight="bold">{item.qty || 0}</Typography>
                            </View>
                            <View style={styles.itemDetailRow}>
                              <Typography variant="caption" color={theme.colors.gray[500]}>Unit price</Typography>
                              <Typography variant="small">{formatCurrency(item.unitPrice || 0)}</Typography>
                            </View>
                            <View style={styles.itemDetailRow}>
                              <Typography variant="caption" color={theme.colors.gray[500]}>Line total</Typography>
                              <Typography variant="small" weight="bold" color={theme.colors.success[700]}>
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
            )}

            {!error && filteredOrders.length > 0 && totalPages > 0 && (
              <View style={styles.paginationContainer}>
                <Typography variant="caption" color={theme.colors.gray[500]} align="center" style={{marginBottom: 12}}>
                  Showing {(currentPage - 1) * 20 + 1}–{Math.min(currentPage * 20, totalOrders)} of {totalOrders}
                </Typography>
                <View style={styles.paginationControls}>
                  <TouchableOpacity
                    style={[styles.pageButton, styles.navButton, currentPage === 1 && styles.pageButtonDisabled]}
                    onPress={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1 || loading}
                    activeOpacity={0.85}>
                    <Typography
                      variant="small"
                      weight="semibold"
                      color={currentPage === 1 ? theme.colors.gray[400] : theme.colors.primary[700]}>
                      Prev
                    </Typography>
                  </TouchableOpacity>
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
                          style={[styles.pageButton, isActive && styles.pageButtonActive]}
                          onPress={() => goToPage(pageNum)}
                          disabled={loading}
                          activeOpacity={0.85}>
                          <Typography
                            variant="small"
                            weight={isActive ? 'bold' : 'semibold'}
                            color={isActive ? theme.colors.white : theme.colors.gray[700]}>
                            {pageNum}
                          </Typography>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <TouchableOpacity
                    style={[styles.pageButton, styles.navButton, currentPage === totalPages && styles.pageButtonDisabled]}
                    onPress={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages || loading}
                    activeOpacity={0.85}>
                    <Typography
                      variant="small"
                      weight="semibold"
                      color={currentPage === totalPages ? theme.colors.gray[400] : theme.colors.primary[700]}>
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

const makeStyles = (theme: Theme, bp: BreakpointInfo) => {
  const wide = !bp.isMobile;
  const actionBtnMaxWidth = bp.isWide ? 560 : bp.isDesktop ? 480 : undefined;
  const btnPadScale = bp.isWide ? 1.3 : bp.isDesktop ? 1.15 : 1;
  const rb = (n: number) => Math.round(n);
  return StyleSheet.create({
    container: {flex: 1, backgroundColor: theme.colors.brand.bg},
    loadingContainer: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.gray[50]},
    loadingMark: {
      width: 56, height: 56, borderRadius: 16,
      backgroundColor: theme.colors.primary[50],
      alignItems: 'center', justifyContent: 'center',
      marginBottom: theme.spacing.md,
    },
    scrollView: {flex: 1, backgroundColor: theme.colors.background.secondary},
    scrollContent: {paddingBottom: theme.spacing.xxxl},

    // Centers & caps post-hero content on large / XL screens.
    contentWrap: {
      width: '100%',
      maxWidth: bp.contentMaxWidth,
      alignSelf: 'center',
      paddingHorizontal: bp.gutter,
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
    blob: {position: 'absolute', borderRadius: 9999},
    blobOne: {
      width: wide ? 420 : 280, height: wide ? 420 : 280,
      top: wide ? -170 : -130, right: wide ? -150 : -100,
      backgroundColor: theme.colors.primary[400],
    },
    blobTwo: {
      width: wide ? 320 : 220, height: wide ? 320 : 220,
      bottom: wide ? -150 : -110, left: wide ? -100 : -70,
      backgroundColor: theme.colors.accent[500],
    },
    dotGrid: {position: 'absolute', top: 50, right: 18, width: 90, flexDirection: 'row', flexWrap: 'wrap', gap: 10, opacity: 0.18},
    dot: {width: 4, height: 4, borderRadius: 2, backgroundColor: theme.colors.white},
    heroBody: {
      width: '100%',
      maxWidth: bp.contentMaxWidth,
      alignSelf: 'center',
      zIndex: 2,
    },
    heroTopRow: {flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.md},
    heroEyebrow: {letterSpacing: 1.4, marginBottom: 4},
    heroTitle: {letterSpacing: -0.4, marginBottom: 2},
    heroIconBtn: {
      width: 36, height: 36, borderRadius: 12,
      backgroundColor: theme.colors.brand.glassBgStrong,
      borderWidth: 1, borderColor: theme.colors.brand.glassBorderStrong,
      alignItems: 'center', justifyContent: 'center',
    },
    statusChip: {
      alignSelf: 'flex-start',
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: theme.spacing.sm + 2, paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: theme.colors.brand.glassBg,
      borderWidth: 1, borderColor: theme.colors.brand.glassBorder,
      marginBottom: theme.spacing.lg,
    },
    statusDot: {width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.success[400]},
    heroMetricsRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: theme.colors.brand.glassBg,
      borderRadius: 14,
      borderWidth: 1, borderColor: theme.colors.brand.glassBorder,
      paddingVertical: theme.spacing.md - 2, paddingHorizontal: theme.spacing.sm,
    },
    heroMetric: {flex: 1, alignItems: 'center', gap: 2},
    heroMetricLabel: {letterSpacing: 1.2},
    heroMetricDivider: {width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.18)'},

    searchWrap: {marginTop: -22, zIndex: 3},
    searchCard: {
      flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
      backgroundColor: theme.colors.white, borderRadius: 14,
      paddingHorizontal: theme.spacing.md, paddingVertical: 10,
      borderWidth: 1, borderColor: theme.colors.gray[200],
      ...theme.shadows.md,
    },
    searchInput: {flex: 1, fontSize: theme.typography.roles.body.fontSize, color: theme.colors.gray[900], paddingVertical: 0},
    searchClear: {
      width: 22, height: 22, borderRadius: 11,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: theme.colors.gray[100],
    },

    syncRow: {
      flexDirection: 'row', gap: 8,
      marginTop: theme.spacing.md,
      maxWidth: actionBtnMaxWidth,
      alignSelf: actionBtnMaxWidth ? 'center' : 'stretch',
      width: '100%',
    },
    syncBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      paddingVertical: rb(12 * btnPadScale),
      borderRadius: 12,
    },
    syncBtnPrimary: {backgroundColor: theme.colors.primary[600]},
    syncBtnGhost: {
      backgroundColor: theme.colors.white,
      borderWidth: 1, borderColor: theme.colors.primary[200],
    },
    syncBtnSuccess: {backgroundColor: theme.colors.success[600]},
    syncBtnDisabled: {opacity: 0.5},

    automationWrap: {marginTop: theme.spacing.md},
    automationCard: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: theme.colors.white,
      borderRadius: 12,
      paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm + 4,
      borderWidth: 1, borderColor: theme.colors.gray[200],
    },
    automationLeft: {flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1},
    automationIconWrap: {
      width: 28, height: 28, borderRadius: 9,
      backgroundColor: theme.colors.primary[50],
      alignItems: 'center', justifyContent: 'center',
    },

    sectionEyebrow: {
      flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
      marginTop: theme.spacing.lg, marginBottom: theme.spacing.md,
    },
    eyebrowLine: {width: 24, height: 2, borderRadius: 1, backgroundColor: theme.colors.primary[600]},

    errorCard: {
      marginTop: theme.spacing.md,
      backgroundColor: theme.colors.error[50],
      borderColor: theme.colors.error[200],
    },
    errorContent: {flexDirection: 'row', alignItems: 'center', gap: 12},
    errorIconWrap: {
      width: 40, height: 40, borderRadius: 12,
      backgroundColor: theme.colors.error[100],
      alignItems: 'center', justifyContent: 'center',
    },
    errorText: {flex: 1},

    emptyCard: {
      marginTop: theme.spacing.md,
      alignItems: 'center',
      paddingVertical: theme.spacing.xl,
    },
    emptyIconWrap: {
      width: 56, height: 56, borderRadius: 16,
      backgroundColor: theme.colors.primary[50],
      alignItems: 'center', justifyContent: 'center',
      marginBottom: theme.spacing.md,
    },
    emptyTitle: {marginBottom: theme.spacing.xs},

    ordersList: {gap: theme.spacing.md},

    // ── Mac / desktop table layout ──────────────────────────────────────
    table: {
      backgroundColor: theme.colors.white,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
      overflow: 'hidden',
      ...theme.shadows.xs,
    },
    tableHeadRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm + 2,
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
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    orderCell: {flexDirection: 'row', alignItems: 'center', gap: 8},
    rowStripe: {width: 3, height: 22, borderRadius: 2},
    colOrder: {flex: 1.4, paddingRight: 8},
    colVendor: {flex: 2, paddingRight: 8},
    colDate: {flex: 1.3, paddingRight: 8},
    colStatus: {flex: 1.3, paddingRight: 8},
    colStock: {flex: 1.3, paddingRight: 8},
    colItems: {flex: 0.7, paddingRight: 8},
    colTotal: {flex: 1.2, paddingRight: 8},
    colChevron: {width: 36, alignItems: 'flex-end'},
    tdRight: {textAlign: 'right'},
    tableExpanded: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      backgroundColor: theme.colors.gray[50],
    },
    itemsHeadRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.gray[200],
    },
    itemsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.gray[200],
    },
    itemColName: {flex: 2, paddingRight: 8},
    itemColSku: {flex: 1.3, paddingRight: 8},
    itemColQty: {flex: 0.7, paddingRight: 8},
    itemColPrice: {flex: 1, paddingRight: 8},
    itemColTotal: {flex: 1.3, paddingRight: 8},
    itemColStatus: {flex: 1.3, paddingLeft: 8},
    orderCard: {overflow: 'hidden', position: 'relative'},
    orderStripe: {position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: theme.colors.primary[500]},
    orderHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      padding: theme.spacing.md,
      paddingTop: theme.spacing.md + 4,
    },
    orderIconWrap: {width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center'},
    orderInfo: {flex: 1, gap: 2},
    orderTotalCol: {alignItems: 'flex-end'},
    chevronCircle: {
      width: 28, height: 28, borderRadius: 14,
      backgroundColor: theme.colors.gray[50],
      alignItems: 'center', justifyContent: 'center',
    },
    orderMeta: {
      borderTopWidth: 1, borderTopColor: theme.colors.gray[100],
      paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm + 4,
      flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    },
    metaPill: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 10, paddingVertical: 4,
      borderRadius: 999,
    },

    expandedContent: {
      borderTopWidth: 1, borderTopColor: theme.colors.gray[100],
      backgroundColor: theme.colors.background.secondary,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    expandedHeader: {flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4},
    expandedHeaderIcon: {width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center'},
    countPill: {paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999},
    itemCard: {
      backgroundColor: theme.colors.white, borderRadius: 12,
      padding: theme.spacing.md,
      borderWidth: 1, borderColor: theme.colors.gray[200],
      gap: 6,
    },
    itemHeaderRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4},
    statusPill: {flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999},
    itemDetailRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},

    paginationContainer: {
      marginTop: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
    },
    paginationControls: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8},
    pageNumbersContainer: {flexDirection: 'row', alignItems: 'center', gap: 6},
    pageButton: {
      minWidth: 36, height: 36,
      backgroundColor: theme.colors.white,
      borderRadius: 10,
      borderWidth: 1, borderColor: theme.colors.gray[200],
      alignItems: 'center', justifyContent: 'center',
      paddingHorizontal: 8,
    },
    navButton: {minWidth: 60, paddingHorizontal: 12},
    pageButtonActive: {backgroundColor: theme.colors.primary[600], borderColor: theme.colors.primary[600]},
    pageButtonDisabled: {backgroundColor: theme.colors.gray[100], borderColor: theme.colors.gray[200]},
    ellipsis: {minWidth: 28, alignItems: 'center', justifyContent: 'center'},
  });
};
