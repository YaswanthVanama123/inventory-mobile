import React, {useState, useEffect, useMemo, useRef} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {useAuth} from '../contexts/AuthContext';
import {useApiErrorHandler} from '../hooks/useApiErrorHandler';
import {useTheme} from '../contexts/ThemeContext';
import {Theme} from '../theme';
import stockService from '../services/stockService';
import discrepancyService from '../services/discrepancyService';
import {
  BoxIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  AlertCircleIcon,
  PlusIcon,
  TruckIcon,
  DollarIcon,
  CheckCircleIcon,
  RefreshIcon,
  TimelineIcon,
  CloseIcon,
} from '../components/icons';
import {formatDate} from '../utils/dateUtils';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const TILE_GAP = 12;

type Tone = 'primary' | 'accent' | 'success' | 'warning' | 'error' | 'info';

interface StockStatCardProps {
  theme: Theme;
  label: string;
  value: string | number;
  subtitle?: string;
  Icon: React.FC<{size?: number; color?: string}>;
  tone: Tone;
  width: number;
}

const StockStatCard: React.FC<StockStatCardProps> = ({theme, label, value, subtitle, Icon, tone, width}) => {
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const palette = theme.colors[tone];
  return (
    <View style={[styles.statTileWrapper, {width}]}>
      <View style={styles.statTileCard}>
        <View style={[styles.statTileAccent, {backgroundColor: palette[500]}]} />
        <View style={[styles.statTileIcon, {backgroundColor: palette[50]}]}>
          <Icon size={18} color={palette[600]} />
        </View>
        <Typography variant="caption" color={theme.colors.gray[500]} style={styles.statTileLabel}>
          {label}
        </Typography>
        <Typography variant="h3" weight="bold" style={styles.statTileValue}>
          {value}
        </Typography>
        {subtitle ? (
          <Typography variant="caption" color={theme.colors.gray[500]} style={styles.statTileSubtitle}>
            {subtitle}
          </Typography>
        ) : null}
      </View>
    </View>
  );
};

export const StockScreen = () => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const {token} = useAuth();
  const {handleApiError} = useApiErrorHandler();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'use' | 'sell'>('sell');
  const [useStockData, setUseStockData] = useState<any>({items: [], totals: {}});
  const [sellStockData, setSellStockData] = useState<any>({items: [], totals: {}});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSKUs, setExpandedSKUs] = useState<Set<string>>(new Set());
  const [expandedCategorySales, setExpandedCategorySales] = useState<Set<string>>(new Set());
  const [expandedCategoryCheckouts, setExpandedCategoryCheckouts] = useState<Set<string>>(new Set());
  const [expandedCategoryDiscrepancies, setExpandedCategoryDiscrepancies] = useState<Set<string>>(new Set());
  const [expandedSkuPurchases, setExpandedSkuPurchases] = useState<Set<string>>(new Set());
  const [categorySkuData, setCategorySkuData] = useState<{[key: string]: any[]}>({});
  const [categoryDiscrepancies, setCategoryDiscrepancies] = useState<{[key: string]: any[]}>({});
  const [categorySalesHistory, setCategorySalesHistory] = useState<{[key: string]: any[]}>({});
  const [categoryCheckoutHistory, setCategoryCheckoutHistory] = useState<{[key: string]: any[]}>({});
  const [loadingCategories, setLoadingCategories] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(true);

  const [showDiscrepancyModal, setShowDiscrepancyModal] = useState(false);
  const [prefilledItem, setPrefilledItem] = useState<any>(null);
  const [discrepancyFormData, setDiscrepancyFormData] = useState({
    actualQuantity: 0,
    discrepancyType: '',
    reason: '',
    notes: '',
  });
  const [submittingDiscrepancy, setSubmittingDiscrepancy] = useState(false);

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
      loadData();
    } else if (isMounted) {
      setLoading(false);
    }
  }, [token]);

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

  const loadData = async () => {
    try {
      if (token && isMounted) {
        const response = await stockService.getStockSummary(token);
        if (isMounted) {
          const useStock = response.useStock || {items: [], totals: {}};
          const sellStock = response.sellStock || {items: [], totals: {}};
          setUseStockData(useStock);
          setSellStockData(sellStock);
          setError(null);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch stock data:', err);
      const wasHandled = await handleApiError(err);
      if (wasHandled) return;
      if (isMounted) {
        setError(err.message || 'Failed to load stock data');
      }
    } finally {
      if (isMounted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const resetExpansionState = () => {
    setExpandedCategories(new Set());
    setExpandedSKUs(new Set());
    setExpandedCategorySales(new Set());
    setExpandedCategoryCheckouts(new Set());
    setExpandedCategoryDiscrepancies(new Set());
    setExpandedSkuPurchases(new Set());
    setCategorySkuData({});
    setCategorySalesHistory({});
    setCategoryCheckoutHistory({});
    setCategoryDiscrepancies({});
  };

  const handleCategoryClick = async (categoryName: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
      setExpandedCategories(newExpanded);
    } else {
      newExpanded.add(categoryName);
      setExpandedCategories(newExpanded);
      if (!categorySkuData[categoryName]) {
        try {
          const newLoadingCategories = new Set(loadingCategories);
          newLoadingCategories.add(categoryName);
          setLoadingCategories(newLoadingCategories);
          const response = await stockService.getCategorySales(token!, categoryName);
          setCategorySkuData(prev => ({...prev, [categoryName]: response.skus || []}));
          setCategorySalesHistory(prev => ({...prev, [categoryName]: response.categorySalesHistory || []}));
          setCategoryCheckoutHistory(prev => ({...prev, [categoryName]: response.categoryCheckoutHistory || []}));
          setCategoryDiscrepancies(prev => ({...prev, [categoryName]: response.categoryDiscrepancies || []}));
          newLoadingCategories.delete(categoryName);
          setLoadingCategories(newLoadingCategories);
        } catch (err: any) {
          console.error('Error loading category data:', err);
          const wasHandled = await handleApiError(err);
          if (wasHandled) return;
          const newLoadingCategories = new Set(loadingCategories);
          newLoadingCategories.delete(categoryName);
          setLoadingCategories(newLoadingCategories);
        }
      }
    }
  };

  const handleSKUClick = (skuId: string) => {
    const newExpanded = new Set(expandedSKUs);
    if (newExpanded.has(skuId)) newExpanded.delete(skuId);
    else newExpanded.add(skuId);
    setExpandedSKUs(newExpanded);
  };

  const toggleCategorySales = (categoryName: string) => {
    const newExpanded = new Set(expandedCategorySales);
    if (newExpanded.has(categoryName)) newExpanded.delete(categoryName);
    else newExpanded.add(categoryName);
    setExpandedCategorySales(newExpanded);
  };

  const toggleCategoryCheckouts = (categoryName: string) => {
    const newExpanded = new Set(expandedCategoryCheckouts);
    if (newExpanded.has(categoryName)) newExpanded.delete(categoryName);
    else newExpanded.add(categoryName);
    setExpandedCategoryCheckouts(newExpanded);
  };

  const toggleCategoryDiscrepancies = (categoryName: string) => {
    const newExpanded = new Set(expandedCategoryDiscrepancies);
    if (newExpanded.has(categoryName)) newExpanded.delete(categoryName);
    else newExpanded.add(categoryName);
    setExpandedCategoryDiscrepancies(newExpanded);
  };

  const toggleSkuPurchases = (skuId: string) => {
    const newExpanded = new Set(expandedSkuPurchases);
    if (newExpanded.has(skuId)) newExpanded.delete(skuId);
    else newExpanded.add(skuId);
    setExpandedSkuPurchases(newExpanded);
  };

  const currentData = activeTab === 'use' ? useStockData : sellStockData;
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  const handleSubmitDiscrepancy = async () => {
    if (!prefilledItem) return;
    if (discrepancyFormData.actualQuantity === prefilledItem.systemQuantity) {
      Alert.alert('Error', 'Actual quantity matches system quantity - no discrepancy to record');
      return;
    }
    if (!discrepancyFormData.discrepancyType) {
      Alert.alert('Error', 'Please select a discrepancy type');
      return;
    }
    try {
      setSubmittingDiscrepancy(true);
      const data = {
        itemName: prefilledItem.itemName,
        itemSku: prefilledItem.itemSku,
        categoryName: prefilledItem.categoryName,
        systemQuantity: prefilledItem.systemQuantity,
        actualQuantity: discrepancyFormData.actualQuantity,
        discrepancyType: discrepancyFormData.discrepancyType,
        reason: discrepancyFormData.reason,
        notes: discrepancyFormData.notes,
      };
      await discrepancyService.createDiscrepancy(data);
      Alert.alert('Success', 'Discrepancy recorded successfully');
      setShowDiscrepancyModal(false);
      setPrefilledItem(null);
      setDiscrepancyFormData({actualQuantity: 0, discrepancyType: '', reason: '', notes: ''});
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to record discrepancy');
    } finally {
      setSubmittingDiscrepancy(false);
    }
  };

  const blobScale = blobPulse.interpolate({inputRange: [0, 1], outputRange: [1, 1.08]});
  const blobOpacity = blobPulse.interpolate({inputRange: [0, 1], outputRange: [0.18, 0.28]});

  const tileWidth = (SCREEN_WIDTH - theme.spacing.lg * 2 - TILE_GAP) / 2;
  const totalCategories = currentData.items?.length || 0;
  const totalDiscr =
    currentData.totals?.totalDiscrepancyDifference !== undefined
      ? currentData.totals.totalDiscrepancyDifference
      : currentData.totals?.totalDiscrepancies || 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <View style={styles.loadingMark}>
          <BoxIcon size={22} color={theme.colors.primary[600]} />
        </View>
        <ActivityIndicator size="large" color={theme.colors.primary[600]} />
        <Typography variant="body" color={theme.colors.gray[600]} style={{marginTop: 16}}>
          Loading stock data...
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.white} />
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
                  color={theme.colors.primary[200]}
                  style={styles.heroEyebrow}>
                  STOCK MANAGEMENT
                </Typography>
                <Typography variant="h2" weight="bold" color={theme.colors.white} style={styles.heroTitle}>
                  Stock Summary
                </Typography>
                <Typography variant="small" color={theme.colors.primary[100]}>
                  By category · live data
                </Typography>
              </View>
              <TouchableOpacity onPress={onRefresh} style={styles.heroRefresh} activeOpacity={0.85}>
                <RefreshIcon size={18} color={theme.colors.white} />
              </TouchableOpacity>
            </View>

            <View style={styles.statusChip}>
              <View style={styles.statusDot} />
              <Typography variant="caption" weight="semibold" color={theme.colors.white}>
                {totalCategories} {totalCategories === 1 ? 'category' : 'categories'} ·{' '}
                {activeTab === 'sell' ? 'Sell stock' : 'Use stock'}
              </Typography>
            </View>

            <View style={styles.heroMetricsRow}>
              <View style={styles.heroMetric}>
                <Typography
                  variant="caption"
                  weight="semibold"
                  color={theme.colors.primary[100]}
                  style={styles.heroMetricLabel}>
                  PURCHASED
                </Typography>
                <Typography variant="h3" weight="bold" color={theme.colors.white}>
                  {currentData.totals?.totalPurchased || 0}
                </Typography>
              </View>
              <View style={styles.heroMetricDivider} />
              <View style={styles.heroMetric}>
                <Typography
                  variant="caption"
                  weight="semibold"
                  color={theme.colors.primary[100]}
                  style={styles.heroMetricLabel}>
                  SOLD
                </Typography>
                <Typography variant="h3" weight="bold" color={theme.colors.white}>
                  {currentData.totals?.totalSold || 0}
                </Typography>
              </View>
              <View style={styles.heroMetricDivider} />
              <View style={styles.heroMetric}>
                <Typography
                  variant="caption"
                  weight="semibold"
                  color={theme.colors.primary[100]}
                  style={styles.heroMetricLabel}>
                  REMAINING
                </Typography>
                <Typography variant="h3" weight="bold" color={theme.colors.white}>
                  {currentData.totals?.stockRemaining || 0}
                </Typography>
              </View>
            </View>
          </Animated.View>
        </View>

        <View style={styles.tabsWrap}>
          <View style={styles.tabsCard}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'use' && styles.tabActive]}
              onPress={() => {
                setActiveTab('use');
                resetExpansionState();
              }}
              activeOpacity={0.85}>
              <Typography
                variant="small"
                weight="semibold"
                color={activeTab === 'use' ? theme.colors.white : theme.colors.gray[700]}>
                Use Stock
              </Typography>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'sell' && styles.tabActive]}
              onPress={() => {
                setActiveTab('sell');
                resetExpansionState();
              }}
              activeOpacity={0.85}>
              <Typography
                variant="small"
                weight="semibold"
                color={activeTab === 'sell' ? theme.colors.white : theme.colors.gray[700]}>
                Sell Stock
              </Typography>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionEyebrow}>
          <View style={styles.eyebrowLine} />
          <Typography variant="caption" weight="semibold" color={theme.colors.primary[600]}>
            OVERVIEW
          </Typography>
        </View>

        <View style={styles.statsGrid}>
          <StockStatCard
            theme={theme}
            label="Total Purchased"
            value={currentData.totals?.totalPurchased || 0}
            subtitle="Units ordered"
            tone="primary"
            Icon={BoxIcon}
            width={tileWidth}
          />
          <StockStatCard
            theme={theme}
            label="Total Sold"
            value={currentData.totals?.totalSold || 0}
            subtitle="Units sold"
            tone="success"
            Icon={DollarIcon}
            width={tileWidth}
          />
          <StockStatCard
            theme={theme}
            label="Checked Out"
            value={currentData.totals?.totalCheckedOut || 0}
            subtitle="Units on trucks"
            tone="warning"
            Icon={TruckIcon}
            width={tileWidth}
          />
          <StockStatCard
            theme={theme}
            label="Stock Remaining"
            value={currentData.totals?.stockRemaining || 0}
            subtitle="Available stock"
            tone="accent"
            Icon={CheckCircleIcon}
            width={tileWidth}
          />
          <StockStatCard
            theme={theme}
            label="Discrepancies"
            value={totalDiscr}
            subtitle="Total difference"
            tone="error"
            Icon={AlertCircleIcon}
            width={tileWidth}
          />
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

        {!error && currentData.items.length === 0 && (
          <Card variant="elevated" padding="lg" style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <BoxIcon size={32} color={theme.colors.primary[600]} />
            </View>
            <Typography
              variant="h3"
              weight="semibold"
              color={theme.colors.gray[800]}
              style={styles.emptyTitle}>
              No data available
            </Typography>
            <Typography variant="small" color={theme.colors.gray[500]} align="center">
              {activeTab === 'use'
                ? 'Orders with mapped categories will appear here.'
                : 'Invoices with mapped categories will appear here.'}
            </Typography>
          </Card>
        )}

        {!error && currentData.items.length > 0 && (
          <View style={styles.sectionEyebrow}>
            <View style={styles.eyebrowLine} />
            <Typography variant="caption" weight="semibold" color={theme.colors.primary[600]}>
              CATEGORIES
            </Typography>
          </View>
        )}

        <View style={styles.categoriesList}>
          {currentData.items.map((category: any) => {
            const isExpanded = expandedCategories.has(category.categoryName);
            const isLoading = loadingCategories.has(category.categoryName);
            return (
              <Card
                key={category.categoryName}
                variant="elevated"
                padding="none"
                style={styles.categoryCard}>
                <View style={styles.categoryStripe} />
                <TouchableOpacity
                  onPress={() => handleCategoryClick(category.categoryName)}
                  style={styles.categoryHeader}
                  activeOpacity={0.85}>
                  <View style={styles.categoryHeaderTop}>
                    <View style={styles.boxIconContainer}>
                      <BoxIcon size={22} color={theme.colors.primary[600]} />
                    </View>
                    <View style={styles.categoryInfo}>
                      <Typography variant="body" weight="bold">
                        {category.categoryName}
                      </Typography>
                      {category.aliases && category.aliases.length > 0 && (
                        <Typography
                          variant="caption"
                          color={theme.colors.gray[500]}
                          style={{marginTop: 2}}
                          numberOfLines={1}>
                          aka {category.aliases.join(', ')}
                        </Typography>
                      )}
                      <Typography variant="caption" color={theme.colors.gray[500]}>
                        {category.itemCount || 0} items · {category.invoiceCount || 0} invoices
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

                  <View style={styles.categoryStatsRow}>
                    <View style={[styles.categoryStatPill, {backgroundColor: theme.colors.primary[50]}]}>
                      <Typography variant="caption" weight="semibold" color={theme.colors.primary[700]}>
                        Purchased
                      </Typography>
                      <Typography variant="body" weight="bold" color={theme.colors.primary[700]}>
                        {category.totalPurchased || 0}
                      </Typography>
                    </View>
                    <View style={[styles.categoryStatPill, {backgroundColor: theme.colors.success[50]}]}>
                      <Typography variant="caption" weight="semibold" color={theme.colors.success[700]}>
                        Sold
                      </Typography>
                      <Typography variant="body" weight="bold" color={theme.colors.success[700]}>
                        {category.totalSold || 0}
                      </Typography>
                    </View>
                    <View style={[styles.categoryStatPill, {backgroundColor: theme.colors.error[50]}]}>
                      <Typography variant="caption" weight="semibold" color={theme.colors.error[700]}>
                        Discr.
                      </Typography>
                      <Typography variant="body" weight="bold" color={theme.colors.error[700]}>
                        {category.totalDiscrepancyDifference !== undefined
                          ? category.totalDiscrepancyDifference
                          : category.totalDiscrepancies || 0}
                      </Typography>
                    </View>
                    <View style={[styles.categoryStatPill, {backgroundColor: theme.colors.accent[50]}]}>
                      <Typography variant="caption" weight="semibold" color={theme.colors.accent[700]}>
                        Remaining
                      </Typography>
                      <Typography variant="body" weight="bold" color={theme.colors.accent[700]}>
                        {category.stockRemaining || 0}
                      </Typography>
                    </View>
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.skusContainer}>
                    {isLoading ? (
                      <View style={styles.loadingSkus}>
                        <ActivityIndicator size="small" color={theme.colors.primary[600]} />
                        <Typography
                          variant="small"
                          color={theme.colors.gray[500]}
                          style={{marginLeft: 8}}>
                          Loading SKUs...
                        </Typography>
                      </View>
                    ) : (
                      <>
                        <View style={styles.categoryFolderItem}>
                          <TouchableOpacity
                            style={[styles.folderHeader, {borderLeftColor: theme.colors.success[500]}]}
                            onPress={() => toggleCategorySales(category.categoryName)}
                            activeOpacity={0.85}>
                            <View style={styles.folderHeaderLeft}>
                              <View style={[styles.folderIconWrap, {backgroundColor: theme.colors.success[50]}]}>
                                <DollarIcon size={14} color={theme.colors.success[600]} />
                              </View>
                              <Typography variant="small" weight="semibold" color={theme.colors.gray[800]}>
                                Sales History
                              </Typography>
                              <View style={[styles.folderCountPill, {backgroundColor: theme.colors.success[50]}]}>
                                <Typography variant="caption" weight="semibold" color={theme.colors.success[700]}>
                                  {(categorySalesHistory[category.categoryName] || []).length}
                                </Typography>
                              </View>
                            </View>
                            {expandedCategorySales.has(category.categoryName) ? (
                              <ChevronDownIcon size={16} color={theme.colors.gray[500]} />
                            ) : (
                              <ChevronRightIcon size={16} color={theme.colors.gray[500]} />
                            )}
                          </TouchableOpacity>
                          {expandedCategorySales.has(category.categoryName) && (
                            <View style={styles.folderBody}>
                              {(categorySalesHistory[category.categoryName] || []).length === 0 ? (
                                <Typography variant="caption" color={theme.colors.gray[500]} align="center" style={{padding: 12}}>
                                  No sales history
                                </Typography>
                              ) : (
                                (categorySalesHistory[category.categoryName] || []).map((record: any, idx: number) => (
                                  <View key={idx} style={styles.historyItem}>
                                    <View style={styles.historyRow}>
                                      <Typography variant="caption" color={theme.colors.gray[500]}>Invoice #</Typography>
                                      <Typography variant="small" weight="semibold" color={theme.colors.success[700]}>
                                        {record.invoiceNumber}
                                      </Typography>
                                    </View>
                                    <View style={styles.historyRow}>
                                      <Typography variant="caption" color={theme.colors.gray[500]}>Date</Typography>
                                      <Typography variant="small" color={theme.colors.gray[700]}>
                                        {record.invoiceDate ? formatDate(record.invoiceDate) : '-'}
                                      </Typography>
                                    </View>
                                    <View style={styles.historyRow}>
                                      <Typography variant="caption" color={theme.colors.gray[500]}>Customer</Typography>
                                      <Typography variant="small" weight="medium">{record.customer || '-'}</Typography>
                                    </View>
                                    <View style={styles.historyRow}>
                                      <Typography variant="caption" color={theme.colors.gray[500]}>Quantity</Typography>
                                      <Typography variant="small" weight="bold">{record.quantity}</Typography>
                                    </View>
                                    <View style={styles.historyRow}>
                                      <Typography variant="caption" color={theme.colors.gray[500]}>Rate</Typography>
                                      <Typography variant="small">{formatCurrency(record.rate || 0)}</Typography>
                                    </View>
                                    <View style={styles.historyRow}>
                                      <Typography variant="caption" color={theme.colors.gray[500]}>Amount</Typography>
                                      <Typography variant="small" weight="bold" color={theme.colors.success[700]}>
                                        {formatCurrency(record.amount || 0)}
                                      </Typography>
                                    </View>
                                    {record.status && (
                                      <View style={styles.historyRow}>
                                        <Typography variant="caption" color={theme.colors.gray[500]}>Status</Typography>
                                        <Typography variant="small" weight="medium">{record.status}</Typography>
                                      </View>
                                    )}
                                  </View>
                                ))
                              )}
                            </View>
                          )}
                        </View>

                        <View style={styles.categoryFolderItem}>
                          <TouchableOpacity
                            style={[styles.folderHeader, {borderLeftColor: theme.colors.warning[500]}]}
                            onPress={() => toggleCategoryCheckouts(category.categoryName)}
                            activeOpacity={0.85}>
                            <View style={styles.folderHeaderLeft}>
                              <View style={[styles.folderIconWrap, {backgroundColor: theme.colors.warning[50]}]}>
                                <TruckIcon size={14} color={theme.colors.warning[600]} />
                              </View>
                              <Typography variant="small" weight="semibold" color={theme.colors.gray[800]}>
                                Checkout History
                              </Typography>
                              <View style={[styles.folderCountPill, {backgroundColor: theme.colors.warning[50]}]}>
                                <Typography variant="caption" weight="semibold" color={theme.colors.warning[700]}>
                                  {(categoryCheckoutHistory[category.categoryName] || []).length}
                                </Typography>
                              </View>
                            </View>
                            {expandedCategoryCheckouts.has(category.categoryName) ? (
                              <ChevronDownIcon size={16} color={theme.colors.gray[500]} />
                            ) : (
                              <ChevronRightIcon size={16} color={theme.colors.gray[500]} />
                            )}
                          </TouchableOpacity>
                          {expandedCategoryCheckouts.has(category.categoryName) && (
                            <View style={styles.folderBody}>
                              {(categoryCheckoutHistory[category.categoryName] || []).length === 0 ? (
                                <Typography variant="caption" color={theme.colors.gray[500]} align="center" style={{padding: 12}}>
                                  No checkout history
                                </Typography>
                              ) : (
                                (categoryCheckoutHistory[category.categoryName] || []).map((record: any, idx: number) => (
                                  <View key={idx} style={styles.historyItem}>
                                    <View style={styles.historyRow}>
                                      <Typography variant="caption" color={theme.colors.gray[500]}>Employee</Typography>
                                      <Typography variant="small" weight="semibold">{record.employeeName || '-'}</Typography>
                                    </View>
                                    <View style={styles.historyRow}>
                                      <Typography variant="caption" color={theme.colors.gray[500]}>Truck</Typography>
                                      <Typography variant="small">{record.truckNumber || '-'}</Typography>
                                    </View>
                                    <View style={styles.historyRow}>
                                      <Typography variant="caption" color={theme.colors.gray[500]}>Date</Typography>
                                      <Typography variant="small" color={theme.colors.gray[700]}>
                                        {record.checkoutDate ? formatDate(record.checkoutDate) : '-'}
                                      </Typography>
                                    </View>
                                    <View style={styles.historyRow}>
                                      <Typography variant="caption" color={theme.colors.gray[500]}>Quantity</Typography>
                                      <Typography variant="small" weight="bold">{record.quantity}</Typography>
                                    </View>
                                    {record.notes && (
                                      <View style={styles.historyRow}>
                                        <Typography variant="caption" color={theme.colors.gray[500]}>Notes</Typography>
                                        <Typography variant="small" color={theme.colors.gray[700]}>{record.notes}</Typography>
                                      </View>
                                    )}
                                  </View>
                                ))
                              )}
                            </View>
                          )}
                        </View>

                        <View style={styles.categoryFolderItem}>
                          <View style={[styles.folderHeader, {borderLeftColor: theme.colors.error[500]}]}>
                            <TouchableOpacity
                              style={styles.folderHeaderLeft}
                              onPress={() => toggleCategoryDiscrepancies(category.categoryName)}
                              activeOpacity={0.85}>
                              <View style={[styles.folderIconWrap, {backgroundColor: theme.colors.error[50]}]}>
                                <AlertCircleIcon size={14} color={theme.colors.error[600]} />
                              </View>
                              <Typography variant="small" weight="semibold" color={theme.colors.gray[800]}>
                                Discrepancies
                              </Typography>
                              <View style={[styles.folderCountPill, {backgroundColor: theme.colors.error[50]}]}>
                                <Typography variant="caption" weight="semibold" color={theme.colors.error[700]}>
                                  {(categoryDiscrepancies[category.categoryName] || []).length}
                                </Typography>
                              </View>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.addDiscrepancyButton}
                              onPress={() => {
                                setPrefilledItem({
                                  itemName: category.categoryName,
                                  itemSku: '',
                                  categoryName: category.categoryName,
                                  systemQuantity: category.stockRemaining || 0,
                                });
                                setDiscrepancyFormData({
                                  actualQuantity: 0,
                                  discrepancyType: '',
                                  reason: '',
                                  notes: `Stock adjustment reported from Stock Management for ${category.categoryName}`,
                                });
                                setShowDiscrepancyModal(true);
                              }}
                              activeOpacity={0.85}>
                              <PlusIcon size={12} color={theme.colors.white} />
                              <Typography
                                variant="caption"
                                weight="semibold"
                                color={theme.colors.white}
                                style={{marginLeft: 4}}>
                                Add
                              </Typography>
                            </TouchableOpacity>
                          </View>
                          {expandedCategoryDiscrepancies.has(category.categoryName) && (
                            <View style={styles.folderBody}>
                              {(categoryDiscrepancies[category.categoryName] || []).length === 0 ? (
                                <Typography variant="caption" color={theme.colors.gray[500]} align="center" style={{padding: 12}}>
                                  No discrepancy history
                                </Typography>
                              ) : (
                                (categoryDiscrepancies[category.categoryName] || []).map((record: any, idx: number) => (
                                  <View key={idx} style={styles.historyItem}>
                                    <View style={styles.historyRow}>
                                      <Typography variant="caption" color={theme.colors.gray[500]}>Reported</Typography>
                                      <Typography variant="small" color={theme.colors.gray[700]}>
                                        {record.reportedAt ? formatDate(record.reportedAt) : '-'}
                                      </Typography>
                                    </View>
                                    <View style={styles.historyRow}>
                                      <Typography variant="caption" color={theme.colors.gray[500]}>System Qty</Typography>
                                      <Typography variant="small" weight="medium">{record.systemQuantity}</Typography>
                                    </View>
                                    <View style={styles.historyRow}>
                                      <Typography variant="caption" color={theme.colors.gray[500]}>Actual Qty</Typography>
                                      <Typography variant="small" weight="medium">{record.actualQuantity}</Typography>
                                    </View>
                                    <View style={styles.historyRow}>
                                      <Typography variant="caption" color={theme.colors.gray[500]}>Difference</Typography>
                                      <Typography
                                        variant="small"
                                        weight="bold"
                                        color={record.difference > 0 ? theme.colors.success[600] : theme.colors.error[600]}>
                                        {record.difference > 0 ? '+' : ''}{record.difference}
                                      </Typography>
                                    </View>
                                    <View style={styles.historyRow}>
                                      <Typography variant="caption" color={theme.colors.gray[500]}>Type</Typography>
                                      <Typography variant="small" weight="medium">{record.discrepancyType}</Typography>
                                    </View>
                                    <View style={styles.historyRow}>
                                      <Typography variant="caption" color={theme.colors.gray[500]}>Status</Typography>
                                      <Typography
                                        variant="small"
                                        weight="bold"
                                        color={
                                          record.status === 'Approved'
                                            ? theme.colors.success[600]
                                            : record.status === 'Rejected'
                                            ? theme.colors.error[600]
                                            : theme.colors.primary[600]
                                        }>
                                        {record.status}
                                      </Typography>
                                    </View>
                                    {record.reportedBy && (
                                      <View style={styles.historyRow}>
                                        <Typography variant="caption" color={theme.colors.gray[500]}>Reported By</Typography>
                                        <Typography variant="small" color={theme.colors.gray[700]}>
                                          {record.reportedBy.fullName || record.reportedBy.username}
                                        </Typography>
                                      </View>
                                    )}
                                  </View>
                                ))
                              )}
                            </View>
                          )}
                        </View>

                        {categorySkuData[category.categoryName]?.length > 0 ? (
                          <View style={styles.skuListWrap}>
                            <View style={styles.skuListHeader}>
                              <TimelineIcon size={14} color={theme.colors.primary[600]} />
                              <Typography variant="caption" weight="semibold" color={theme.colors.gray[700]}>
                                SKUs in this category
                              </Typography>
                            </View>
                            {categorySkuData[category.categoryName].map((sku: any) => {
                              const isSkuExpanded = expandedSKUs.has(sku.sku);
                              return (
                                <View key={sku.sku} style={styles.skuItem}>
                                  <TouchableOpacity
                                    style={styles.skuHeader}
                                    onPress={() => handleSKUClick(sku.sku)}
                                    activeOpacity={0.85}>
                                    <View style={styles.skuHeaderLeft}>
                                      <View style={styles.skuChevron}>
                                        {isSkuExpanded ? (
                                          <ChevronDownIcon size={14} color={theme.colors.gray[500]} />
                                        ) : (
                                          <ChevronRightIcon size={14} color={theme.colors.gray[500]} />
                                        )}
                                      </View>
                                      <View style={styles.skuInfo}>
                                        <Typography variant="small" weight="semibold" numberOfLines={1}>
                                          {sku.sku}
                                        </Typography>
                                        <Typography
                                          variant="caption"
                                          color={theme.colors.gray[500]}
                                          numberOfLines={1}>
                                          {sku.itemName}
                                        </Typography>
                                      </View>
                                    </View>
                                    <View style={styles.skuStats}>
                                      <View style={[styles.skuStatPill, {backgroundColor: theme.colors.success[50]}]}>
                                        <Typography variant="caption" weight="semibold" color={theme.colors.success[700]}>
                                          Sold {sku.totalSold || 0}
                                        </Typography>
                                      </View>
                                      <Typography
                                        variant="caption"
                                        color={theme.colors.gray[500]}
                                        style={{marginTop: 2}}>
                                        Purchased: {sku.totalPurchased || 0}
                                      </Typography>
                                    </View>
                                  </TouchableOpacity>

                                  {isSkuExpanded && (
                                    <View style={styles.skuDetails}>
                                      <View style={styles.skuPurchaseFolder}>
                                        <TouchableOpacity
                                          style={[styles.folderHeader, {borderLeftColor: theme.colors.primary[500]}]}
                                          onPress={() => toggleSkuPurchases(sku.sku)}
                                          activeOpacity={0.85}>
                                          <View style={styles.folderHeaderLeft}>
                                            <View style={[styles.folderIconWrap, {backgroundColor: theme.colors.primary[50]}]}>
                                              <BoxIcon size={14} color={theme.colors.primary[600]} />
                                            </View>
                                            <Typography variant="small" weight="semibold" color={theme.colors.gray[800]}>
                                              Purchase History
                                            </Typography>
                                            <View style={[styles.folderCountPill, {backgroundColor: theme.colors.primary[50]}]}>
                                              <Typography variant="caption" weight="semibold" color={theme.colors.primary[700]}>
                                                {(sku.purchaseHistory || []).length}
                                              </Typography>
                                            </View>
                                          </View>
                                          {expandedSkuPurchases.has(sku.sku) ? (
                                            <ChevronDownIcon size={16} color={theme.colors.gray[500]} />
                                          ) : (
                                            <ChevronRightIcon size={16} color={theme.colors.gray[500]} />
                                          )}
                                        </TouchableOpacity>
                                        {expandedSkuPurchases.has(sku.sku) && (
                                          <View style={styles.folderBody}>
                                            {(sku.purchaseHistory || []).length === 0 ? (
                                              <Typography
                                                variant="caption"
                                                color={theme.colors.gray[500]}
                                                align="center"
                                                style={{padding: 12}}>
                                                No purchase history
                                              </Typography>
                                            ) : (
                                              sku.purchaseHistory.map((record: any, index: number) => (
                                                <View key={index} style={styles.historyItem}>
                                                  <View style={styles.historyRow}>
                                                    <Typography variant="caption" color={theme.colors.gray[500]}>Order #</Typography>
                                                    <Typography variant="small" weight="semibold">
                                                      {record.orderNumber}
                                                    </Typography>
                                                  </View>
                                                  <View style={styles.historyRow}>
                                                    <Typography variant="caption" color={theme.colors.gray[500]}>Date</Typography>
                                                    <Typography variant="small" color={theme.colors.gray[700]}>
                                                      {formatDate(record.orderDate)}
                                                    </Typography>
                                                  </View>
                                                  <View style={styles.historyRow}>
                                                    <Typography variant="caption" color={theme.colors.gray[500]}>Quantity</Typography>
                                                    <Typography variant="small" weight="bold">{record.quantity}</Typography>
                                                  </View>
                                                  <View style={styles.historyRow}>
                                                    <Typography variant="caption" color={theme.colors.gray[500]}>Unit Price</Typography>
                                                    <Typography variant="small">{formatCurrency(record.unitPrice)}</Typography>
                                                  </View>
                                                  <View style={styles.historyRow}>
                                                    <Typography variant="caption" color={theme.colors.gray[500]}>Line Total</Typography>
                                                    <Typography variant="small" weight="bold" color={theme.colors.success[700]}>
                                                      {formatCurrency(record.lineTotal)}
                                                    </Typography>
                                                  </View>
                                                  <View style={styles.historyRow}>
                                                    <Typography variant="caption" color={theme.colors.gray[500]}>Vendor</Typography>
                                                    <Typography variant="small" color={theme.colors.gray[700]}>
                                                      {record.vendor || 'N/A'}
                                                    </Typography>
                                                  </View>
                                                </View>
                                              ))
                                            )}
                                          </View>
                                        )}
                                      </View>
                                    </View>
                                  )}
                                </View>
                              );
                            })}
                          </View>
                        ) : (
                          <View style={styles.emptySkus}>
                            <Typography variant="small" color={theme.colors.gray[500]}>
                              No SKUs mapped to this category
                            </Typography>
                          </View>
                        )}
                      </>
                    )}
                  </View>
                )}
              </Card>
            );
          })}
        </View>
      </ScrollView>

      <Modal
        visible={showDiscrepancyModal}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setShowDiscrepancyModal(false);
          setPrefilledItem(null);
        }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalHeaderIcon}>
                  <AlertCircleIcon size={18} color={theme.colors.error[600]} />
                </View>
                <View>
                  <Typography variant="h3" weight="bold">
                    Record Discrepancy
                  </Typography>
                  <Typography variant="caption" color={theme.colors.gray[500]}>
                    Reconcile a stock difference
                  </Typography>
                </View>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => {
                  setShowDiscrepancyModal(false);
                  setPrefilledItem(null);
                }}
                activeOpacity={0.7}>
                <CloseIcon size={16} color={theme.colors.gray[600]} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {prefilledItem && (
                <View style={styles.itemDetailsCard}>
                  <Typography
                    variant="caption"
                    weight="semibold"
                    color={theme.colors.primary[700]}
                    style={{marginBottom: 6, letterSpacing: 1}}>
                    ITEM DETAILS
                  </Typography>
                  <View style={styles.itemRow}>
                    <Typography variant="caption" color={theme.colors.gray[500]}>Item</Typography>
                    <Typography variant="small" weight="semibold" numberOfLines={1}>
                      {prefilledItem.itemName}
                    </Typography>
                  </View>
                  {prefilledItem.itemSku ? (
                    <View style={styles.itemRow}>
                      <Typography variant="caption" color={theme.colors.gray[500]}>SKU</Typography>
                      <Typography variant="small">{prefilledItem.itemSku}</Typography>
                    </View>
                  ) : null}
                  <View style={styles.itemRow}>
                    <Typography variant="caption" color={theme.colors.gray[500]}>Category</Typography>
                    <Typography variant="small">{prefilledItem.categoryName}</Typography>
                  </View>
                  <View style={styles.itemRow}>
                    <Typography variant="caption" color={theme.colors.gray[500]}>Current stock</Typography>
                    <Typography variant="small" weight="bold">
                      {prefilledItem.systemQuantity} units
                    </Typography>
                  </View>
                </View>
              )}

              <View style={styles.formGroup}>
                <Typography variant="small" weight="semibold" style={{marginBottom: 6}}>
                  System Quantity
                </Typography>
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  value={prefilledItem?.systemQuantity?.toString() || '0'}
                  editable={false}
                />
              </View>

              <View style={styles.formGroup}>
                <Typography variant="small" weight="semibold" style={{marginBottom: 6}}>
                  Actual Quantity (Physical Count) *
                </Typography>
                <TextInput
                  style={styles.input}
                  value={discrepancyFormData.actualQuantity.toString()}
                  onChangeText={(text) => {
                    const value = parseFloat(text) || 0;
                    setDiscrepancyFormData({
                      ...discrepancyFormData,
                      actualQuantity: value,
                      discrepancyType:
                        value > (prefilledItem?.systemQuantity || 0)
                          ? 'Overage'
                          : value < (prefilledItem?.systemQuantity || 0)
                          ? 'Shortage'
                          : '',
                    });
                  }}
                  keyboardType="numeric"
                  placeholder="Enter actual counted quantity"
                  placeholderTextColor={theme.colors.gray[400]}
                />
              </View>

              {discrepancyFormData.actualQuantity !== 0 && (
                <View
                  style={[
                    styles.differenceCard,
                    {
                      backgroundColor:
                        discrepancyFormData.actualQuantity > (prefilledItem?.systemQuantity || 0)
                          ? theme.colors.success[50]
                          : theme.colors.error[50],
                    },
                  ]}>
                  <View>
                    <Typography variant="caption" color={theme.colors.gray[600]}>
                      Difference
                    </Typography>
                    <Typography variant="caption" color={theme.colors.gray[500]}>
                      {discrepancyFormData.actualQuantity > (prefilledItem?.systemQuantity || 0)
                        ? 'Overage detected'
                        : 'Shortage detected'}
                    </Typography>
                  </View>
                  <Typography
                    variant="h3"
                    weight="bold"
                    color={
                      discrepancyFormData.actualQuantity > (prefilledItem?.systemQuantity || 0)
                        ? theme.colors.success[700]
                        : theme.colors.error[700]
                    }>
                    {discrepancyFormData.actualQuantity > (prefilledItem?.systemQuantity || 0) ? '+' : ''}
                    {discrepancyFormData.actualQuantity - (prefilledItem?.systemQuantity || 0)}
                  </Typography>
                </View>
              )}

              <View style={styles.formGroup}>
                <Typography variant="small" weight="semibold" style={{marginBottom: 6}}>
                  Discrepancy Type *
                </Typography>
                <View style={[styles.input, styles.inputDisabled, styles.typeBadgeWrap]}>
                  <Typography
                    variant="small"
                    weight="semibold"
                    color={
                      discrepancyFormData.discrepancyType
                        ? theme.colors.gray[800]
                        : theme.colors.gray[400]
                    }>
                    {discrepancyFormData.discrepancyType
                      ? `${discrepancyFormData.discrepancyType} (${
                          discrepancyFormData.discrepancyType === 'Overage'
                            ? 'More than expected'
                            : 'Less than expected'
                        })`
                      : 'Auto-detected from difference'}
                  </Typography>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Typography variant="small" weight="semibold" style={{marginBottom: 6}}>
                  Reason
                </Typography>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={discrepancyFormData.reason}
                  onChangeText={(text) =>
                    setDiscrepancyFormData({...discrepancyFormData, reason: text})
                  }
                  placeholder="Explain the reason for this discrepancy..."
                  placeholderTextColor={theme.colors.gray[400]}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formGroup}>
                <Typography variant="small" weight="semibold" style={{marginBottom: 6}}>
                  Additional Notes
                </Typography>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={discrepancyFormData.notes}
                  onChangeText={(text) =>
                    setDiscrepancyFormData({...discrepancyFormData, notes: text})
                  }
                  placeholder="Any additional information..."
                  placeholderTextColor={theme.colors.gray[400]}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowDiscrepancyModal(false);
                  setPrefilledItem(null);
                }}
                disabled={submittingDiscrepancy}
                activeOpacity={0.85}>
                <Typography variant="small" weight="semibold" color={theme.colors.gray[700]}>
                  Cancel
                </Typography>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (submittingDiscrepancy || !discrepancyFormData.discrepancyType) &&
                    styles.submitButtonDisabled,
                ]}
                onPress={handleSubmitDiscrepancy}
                disabled={submittingDiscrepancy || !discrepancyFormData.discrepancyType}
                activeOpacity={0.85}>
                {submittingDiscrepancy ? (
                  <ActivityIndicator color={theme.colors.white} />
                ) : (
                  <>
                    <CheckCircleIcon size={16} color={theme.colors.white} />
                    <Typography variant="small" weight="bold" color={theme.colors.white}>
                      Record Discrepancy
                    </Typography>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.primary[700],
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
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xl + theme.spacing.md,
      backgroundColor: theme.colors.primary[700],
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
      width: 280,
      height: 280,
      top: -130,
      right: -100,
      backgroundColor: theme.colors.primary[400],
    },
    blobTwo: {
      width: 220,
      height: 220,
      bottom: -110,
      left: -70,
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
      zIndex: 2,
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
      backgroundColor: 'rgba(255,255,255,0.14)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.22)',
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
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.18)',
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
      backgroundColor: 'rgba(255,255,255,0.10)',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.18)',
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

    tabsWrap: {
      paddingHorizontal: theme.spacing.lg,
      marginTop: -22,
      zIndex: 3,
    },
    tabsCard: {
      flexDirection: 'row',
      gap: 6,
      backgroundColor: theme.colors.white,
      borderRadius: 14,
      padding: 6,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
      ...theme.shadows.md,
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
      paddingHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.lg,
      marginBottom: theme.spacing.md,
    },
    eyebrowLine: {
      width: 24,
      height: 2,
      borderRadius: 1,
      backgroundColor: theme.colors.primary[600],
    },

    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: theme.spacing.lg,
      gap: TILE_GAP,
      marginBottom: theme.spacing.sm,
    },
    statTileWrapper: {},
    statTileCard: {
      backgroundColor: theme.colors.white,
      borderRadius: 16,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
      minHeight: 124,
      overflow: 'hidden',
      position: 'relative',
      ...theme.shadows.xs,
    },
    statTileAccent: {
      position: 'absolute',
      left: 0,
      top: 12,
      bottom: 12,
      width: 3,
      borderTopRightRadius: 3,
      borderBottomRightRadius: 3,
    },
    statTileIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
      marginLeft: 6,
    },
    statTileLabel: {
      marginBottom: 2,
      paddingLeft: 6,
    },
    statTileValue: {
      color: theme.colors.gray[900],
      paddingLeft: 6,
    },
    statTileSubtitle: {
      marginTop: 2,
      paddingLeft: 6,
    },

    errorCard: {
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.md,
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
      marginHorizontal: theme.spacing.lg,
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

    categoriesList: {
      paddingHorizontal: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    categoryCard: {
      overflow: 'hidden',
      position: 'relative',
    },
    categoryStripe: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 3,
      backgroundColor: theme.colors.primary[500],
    },
    categoryHeader: {
      paddingTop: theme.spacing.md + 4,
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.md,
      gap: theme.spacing.md,
    },
    categoryHeaderTop: {
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
    categoryInfo: {
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
    categoryStatsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    categoryStatPill: {
      flexBasis: '47%',
      flexGrow: 1,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
    },

    skusContainer: {
      backgroundColor: theme.colors.background.secondary,
      borderTopWidth: 1,
      borderTopColor: theme.colors.gray[200],
      padding: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    loadingSkus: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.md,
    },
    emptySkus: {
      alignItems: 'center',
      padding: theme.spacing.md,
    },

    categoryFolderItem: {
      backgroundColor: theme.colors.white,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
    },
    folderHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing.sm + 2,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.primary[500],
      backgroundColor: theme.colors.white,
      gap: theme.spacing.sm,
    },
    folderHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    folderIconWrap: {
      width: 28,
      height: 28,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    folderCountPill: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
    },
    folderBody: {
      padding: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.gray[100],
      gap: theme.spacing.sm,
    },

    addDiscrepancyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: theme.colors.error[600],
    },

    skuListWrap: {
      gap: theme.spacing.sm,
    },
    skuListHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: theme.spacing.xs,
      paddingTop: theme.spacing.sm,
    },
    skuItem: {
      backgroundColor: theme.colors.white,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
    },
    skuHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.sm + 2,
    },
    skuHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 8,
    },
    skuChevron: {
      width: 18,
      height: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    skuInfo: {
      flex: 1,
    },
    skuStats: {
      alignItems: 'flex-end',
      gap: 2,
    },
    skuStatPill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
    },
    skuDetails: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.gray[100],
      backgroundColor: theme.colors.background.secondary,
      padding: theme.spacing.sm,
    },
    skuPurchaseFolder: {
      backgroundColor: theme.colors.white,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
    },

    historyItem: {
      backgroundColor: theme.colors.background.secondary,
      borderRadius: 10,
      padding: theme.spacing.sm + 2,
      gap: 6,
      borderWidth: 1,
      borderColor: theme.colors.gray[100],
    },
    historyRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },

    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15,23,42,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
    },
    modalContent: {
      width: '100%',
      maxHeight: '88%',
      backgroundColor: theme.colors.white,
      borderRadius: 20,
      overflow: 'hidden',
      ...theme.shadows.xl,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.gray[200],
    },
    modalHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      flex: 1,
    },
    modalHeaderIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: theme.colors.error[50],
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalCloseBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: theme.colors.gray[100],
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalBody: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
    },
    modalFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: theme.colors.gray[200],
      backgroundColor: theme.colors.background.secondary,
    },
    itemDetailsCard: {
      backgroundColor: theme.colors.primary[50],
      padding: theme.spacing.md,
      borderRadius: 12,
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.primary[100],
      gap: 4,
    },
    itemRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    formGroup: {
      marginBottom: theme.spacing.md,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
      borderRadius: 10,
      paddingHorizontal: theme.spacing.sm + 4,
      paddingVertical: theme.spacing.sm + 2,
      fontSize: 14,
      color: theme.colors.gray[900],
      backgroundColor: theme.colors.white,
    },
    inputDisabled: {
      backgroundColor: theme.colors.gray[50],
      color: theme.colors.gray[500],
    },
    textArea: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    typeBadgeWrap: {
      justifyContent: 'center',
    },
    differenceCard: {
      padding: theme.spacing.md,
      borderRadius: 12,
      marginBottom: theme.spacing.md,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    cancelButton: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.gray[300],
      backgroundColor: theme.colors.white,
    },
    submitButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
      backgroundColor: theme.colors.primary[600],
      minWidth: 180,
      ...theme.shadows.sm,
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
  });
