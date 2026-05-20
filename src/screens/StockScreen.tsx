import React, {useState, useEffect, useMemo} from 'react';
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
} from '../components/icons';
import {formatDate} from '../utils/dateUtils';

interface StockStatCardProps {
  theme: Theme;
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
}

const StockStatCard: React.FC<StockStatCardProps> = ({theme, label, value, subtitle, icon}) => {
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.statCard}>
      <Card variant="elevated" padding="md" style={styles.statCardContent}>
        <View style={styles.statIconBadge}>{icon}</View>
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
      </Card>
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
    } catch (error: any) {
      console.error('Failed to fetch stock data:', error);
      const wasHandled = await handleApiError(error);
      if (wasHandled) return;
      if (isMounted) {
        setError(error.message || 'Failed to load stock data');
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
          setCategorySkuData(prev => ({
            ...prev,
            [categoryName]: response.skus || [],
          }));
          setCategorySalesHistory(prev => ({
            ...prev,
            [categoryName]: response.categorySalesHistory || [],
          }));
          setCategoryCheckoutHistory(prev => ({
            ...prev,
            [categoryName]: response.categoryCheckoutHistory || [],
          }));
          setCategoryDiscrepancies(prev => ({
            ...prev,
            [categoryName]: response.categoryDiscrepancies || [],
          }));
          newLoadingCategories.delete(categoryName);
          setLoadingCategories(newLoadingCategories);
        } catch (error: any) {
          console.error('Error loading category data:', error);
          const wasHandled = await handleApiError(error);
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
    if (newExpanded.has(skuId)) {
      newExpanded.delete(skuId);
    } else {
      newExpanded.add(skuId);
    }
    setExpandedSKUs(newExpanded);
  };
  const toggleCategorySales = (categoryName: string) => {
    const newExpanded = new Set(expandedCategorySales);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategorySales(newExpanded);
  };
  const toggleCategoryCheckouts = (categoryName: string) => {
    const newExpanded = new Set(expandedCategoryCheckouts);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategoryCheckouts(newExpanded);
  };
  const toggleCategoryDiscrepancies = (categoryName: string) => {
    const newExpanded = new Set(expandedCategoryDiscrepancies);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategoryDiscrepancies(newExpanded);
  };
  const toggleSkuPurchases = (skuId: string) => {
    const newExpanded = new Set(expandedSkuPurchases);
    if (newExpanded.has(skuId)) {
      newExpanded.delete(skuId);
    } else {
      newExpanded.add(skuId);
    }
    setExpandedSkuPurchases(newExpanded);
  };
  const currentData = activeTab === 'use' ? useStockData : sellStockData;
  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };
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
      setDiscrepancyFormData({
        actualQuantity: 0,
        discrepancyType: '',
        reason: '',
        notes: '',
      });
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to record discrepancy');
    } finally {
      setSubmittingDiscrepancy(false);
    }
  };
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary[600]} />
        <Typography
          variant="body"
          color={theme.colors.gray[600]}
          style={{marginTop: 16}}>
          Loading stock data...
        </Typography>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header - Fixed */}
      <View style={styles.header}>
        <Typography variant="h2" weight="bold" style={styles.headerTitle}>
          Stock Management
        </Typography>
        <Typography
          variant="body"
          color={theme.colors.gray[500]}
          style={styles.headerSubtitle}>
          View stock summary by category
        </Typography>
      </View>

      {/* Tabs - Fixed */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'use' && styles.tabActive,
          ]}
          onPress={() => {
            setActiveTab('use');
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
          }}>
          <Typography
            variant="body"
            weight="semibold"
            color={
              activeTab === 'use'
                ? theme.colors.white
                : theme.colors.gray[600]
            }>
            Use Stock
          </Typography>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'sell' && styles.tabActive,
          ]}
          onPress={() => {
            setActiveTab('sell');
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
          }}>
          <Typography
            variant="body"
            weight="semibold"
            color={
              activeTab === 'sell'
                ? theme.colors.white
                : theme.colors.gray[600]
            }>
            Sell Stock
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
        {/* Stats Cards */}
        <View style={styles.statsGrid}>
            <StockStatCard
              theme={theme}
              label="Total Purchased"
              value={currentData.totals.totalPurchased || 0}
              subtitle="Units ordered"
              icon={<BoxIcon size={18} color={theme.colors.gray[700]} />}
            />
            <StockStatCard
              theme={theme}
              label="Total Sold"
              value={currentData.totals.totalSold || 0}
              subtitle="Units sold"
              icon={<DollarIcon size={18} color={theme.colors.gray[700]} />}
            />
            <StockStatCard
              theme={theme}
              label="Checked Out"
              value={currentData.totals.totalCheckedOut || 0}
              subtitle="Units on trucks"
              icon={<TruckIcon size={18} color={theme.colors.gray[700]} />}
            />
            <StockStatCard
              theme={theme}
              label="Stock Remaining"
              value={currentData.totals.stockRemaining || 0}
              subtitle="Available stock"
              icon={<CheckCircleIcon size={18} color={theme.colors.gray[700]} />}
            />
            <StockStatCard
              theme={theme}
              label="Discrepancies"
              value={
                currentData.totals.totalDiscrepancyDifference !== undefined
                  ? currentData.totals.totalDiscrepancyDifference
                  : currentData.totals.totalDiscrepancies || 0
              }
              subtitle="Total difference"
              icon={<AlertCircleIcon size={18} color={theme.colors.gray[700]} />}
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
        {!error && currentData.items.length === 0 && (
          <Card variant="outlined" padding="lg" style={styles.emptyCard}>
            <BoxIcon size={48} color={theme.colors.gray[400]} />
            <Typography
              variant="h3"
              weight="semibold"
              color={theme.colors.gray[700]}
              style={styles.emptyTitle}>
              No Data Available
            </Typography>
            <Typography
              variant="body"
              color={theme.colors.gray[500]}
              align="center">
              {activeTab === 'use'
                ? 'Orders with mapped categories will appear here'
                : 'Invoices with mapped categories will appear here'}
            </Typography>
          </Card>
        )}
        {/* Categories List */}
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
                {/* Category Header */}
                <TouchableOpacity
                  onPress={() => handleCategoryClick(category.categoryName)}
                  style={styles.categoryHeader}>
                  {/* First Row: Icon and Name */}
                  <View style={styles.categoryHeaderTop}>
                    <View style={styles.chevronContainer}>
                      {isExpanded ? (
                        <ChevronDownIcon size={20} color={theme.colors.gray[600]} />
                      ) : (
                        <ChevronRightIcon size={20} color={theme.colors.gray[600]} />
                      )}
                    </View>
                    <View style={styles.boxIconContainer}>
                      <BoxIcon size={24} color={theme.colors.primary[600]} />
                    </View>
                    <View style={styles.categoryInfo}>
                      <Typography
                        variant="body"
                        weight="semibold">
                        {category.categoryName}
                      </Typography>
                      {/* Show aliases if present */}
                      {category.aliases && category.aliases.length > 0 && (
                        <Typography
                          variant="caption"
                          color={theme.colors.gray[500]}
                          style={{marginTop: 2}}>
                          ({category.aliases.join(', ')})
                        </Typography>
                      )}
                      <Typography
                        variant="caption"
                        color={theme.colors.gray[500]}>
                        {category.itemCount || 0} items • {category.invoiceCount || 0} invoices
                      </Typography>
                    </View>
                  </View>
                  {/* Second Row: Stats */}
                  <View style={styles.categoryStatsRow}>
                    <View style={styles.statItem}>
                      <Typography
                        variant="caption"
                        color={theme.colors.primary[600]}
                        style={styles.statItemLabel}>
                        PURCHASED
                      </Typography>
                      <Typography
                        variant="body"
                        weight="bold"
                        color={theme.colors.primary[600]}>
                        {category.totalPurchased || 0}
                      </Typography>
                    </View>
                    <View style={styles.statItem}>
                      <Typography
                        variant="caption"
                        color={theme.colors.success[600]}
                        style={styles.statItemLabel}>
                        SOLD
                      </Typography>
                      <Typography
                        variant="body"
                        weight="bold"
                        color={theme.colors.success[600]}>
                        {category.totalSold || 0}
                      </Typography>
                    </View>
                    <View style={styles.statItem}>
                      <Typography
                        variant="caption"
                        color={theme.colors.error[600]}
                        style={styles.statItemLabel}>
                        DISCR.
                      </Typography>
                      <Typography
                        variant="body"
                        weight="bold"
                        color={theme.colors.error[600]}>
                        {category.totalDiscrepancyDifference !== undefined ? category.totalDiscrepancyDifference : category.totalDiscrepancies || 0}
                      </Typography>
                    </View>
                    <View style={styles.statItem}>
                      <Typography
                        variant="caption"
                        color={theme.colors.gray[500]}
                        style={styles.statItemLabel}>
                        REMAINING
                      </Typography>
                      <Typography
                        variant="body"
                        weight="bold"
                        color={'#9333ea'}>
                        {category.stockRemaining || 0}
                      </Typography>
                    </View>
                  </View>
                </TouchableOpacity>
                {/* Expanded SKUs */}
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
                        {/* Category-level Sales History Folder */}
                        <View style={styles.categoryFolderItem}>
                          <TouchableOpacity
                            style={[styles.categoryFolderHeader, {backgroundColor: theme.colors.success[50]}]}
                            onPress={() => toggleCategorySales(category.categoryName)}>
                            <View style={styles.categoryFolderHeaderLeft}>
                              {expandedCategorySales.has(category.categoryName) ? (
                                <ChevronDownIcon size={16} color={theme.colors.gray[600]} />
                              ) : (
                                <ChevronRightIcon size={16} color={theme.colors.gray[600]} />
                              )}
                              <Typography
                                variant="small"
                                weight="semibold"
                                color={theme.colors.success[700]}
                                style={{marginLeft: 8}}>
                                Sales History ({(categorySalesHistory[category.categoryName] || []).length} invoices)
                              </Typography>
                            </View>
                          </TouchableOpacity>
                          {expandedCategorySales.has(category.categoryName) && (
                            <View style={styles.categoryFolderBody}>
                              {(categorySalesHistory[category.categoryName] || []).length === 0 ? (
                                <Typography variant="caption" color={theme.colors.gray[500]} align="center" style={{padding: 12}}>
                                  No sales history
                                </Typography>
                              ) : (
                                (categorySalesHistory[category.categoryName] || []).map((record: any, idx: number) => (
                                  <View key={idx} style={styles.historyItem}>
                                    <View style={styles.historyRow}>
                                      <Typography variant="caption" color={theme.colors.gray[500]}>Invoice #</Typography>
                                      <Typography variant="small" weight="medium" color={theme.colors.success[600]}>
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
                                      <Typography variant="small" weight="bold" color={theme.colors.success[600]}>
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
                        {/* Category-level Checkout History Folder */}
                        <View style={styles.categoryFolderItem}>
                          <TouchableOpacity
                            style={[styles.categoryFolderHeader, {backgroundColor: theme.colors.warning[50]}]}
                            onPress={() => toggleCategoryCheckouts(category.categoryName)}>
                            <View style={styles.categoryFolderHeaderLeft}>
                              {expandedCategoryCheckouts.has(category.categoryName) ? (
                                <ChevronDownIcon size={16} color={theme.colors.gray[600]} />
                              ) : (
                                <ChevronRightIcon size={16} color={theme.colors.gray[600]} />
                              )}
                              <Typography
                                variant="small"
                                weight="semibold"
                                color={theme.colors.warning[700]}
                                style={{marginLeft: 8}}>
                                Checkout History ({(categoryCheckoutHistory[category.categoryName] || []).length} checkouts)
                              </Typography>
                            </View>
                          </TouchableOpacity>
                          {expandedCategoryCheckouts.has(category.categoryName) && (
                            <View style={styles.categoryFolderBody}>
                              {(categoryCheckoutHistory[category.categoryName] || []).length === 0 ? (
                                <Typography variant="caption" color={theme.colors.gray[500]} align="center" style={{padding: 12}}>
                                  No checkout history
                                </Typography>
                              ) : (
                                (categoryCheckoutHistory[category.categoryName] || []).map((record: any, idx: number) => (
                                  <View key={idx} style={styles.historyItem}>
                                    <View style={styles.historyRow}>
                                      <Typography variant="caption" color={theme.colors.gray[500]}>Employee</Typography>
                                      <Typography variant="small" weight="medium">{record.employeeName || '-'}</Typography>
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
                        {/* Category-level Discrepancy History Folder */}
                        <View style={styles.categoryFolderItem}>
                          <TouchableOpacity
                            style={[styles.categoryFolderHeader, {backgroundColor: theme.colors.error[50]}]}
                            onPress={() => toggleCategoryDiscrepancies(category.categoryName)}>
                            <View style={styles.categoryFolderHeaderLeft}>
                              {expandedCategoryDiscrepancies.has(category.categoryName) ? (
                                <ChevronDownIcon size={16} color={theme.colors.gray[600]} />
                              ) : (
                                <ChevronRightIcon size={16} color={theme.colors.gray[600]} />
                              )}
                              <Typography
                                variant="small"
                                weight="semibold"
                                color={theme.colors.error[700]}
                                style={{marginLeft: 8}}>
                                Discrepancy History ({(categoryDiscrepancies[category.categoryName] || []).length} discrepancies)
                              </Typography>
                            </View>
                            <TouchableOpacity
                              style={styles.addDiscrepancyCategoryButton}
                              onPress={(e) => {
                                e.stopPropagation();
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
                              }}>
                              <PlusIcon size={14} color={theme.colors.white} />
                              <Typography
                                variant="caption"
                                weight="semibold"
                                color={theme.colors.white}
                                style={{marginLeft: 4}}>
                                Add Discrepancy
                              </Typography>
                            </TouchableOpacity>
                          </TouchableOpacity>
                          {expandedCategoryDiscrepancies.has(category.categoryName) && (
                            <View style={styles.categoryFolderBody}>
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
                        {/* SKU List */}
                        {categorySkuData[category.categoryName]?.length > 0 ? (
                      categorySkuData[category.categoryName].map((sku: any) => {
                        const isSkuExpanded = expandedSKUs.has(sku.sku);
                        return (
                          <View key={sku.sku} style={styles.skuItem}>
                            <TouchableOpacity
                              style={styles.skuHeader}
                              onPress={() => handleSKUClick(sku.sku)}>
                              <View style={styles.skuHeaderLeft}>
                                <View style={styles.skuChevron}>
                                  {isSkuExpanded ? (
                                    <ChevronDownIcon size={16} color={theme.colors.gray[500]} />
                                  ) : (
                                    <ChevronRightIcon size={16} color={theme.colors.gray[500]} />
                                  )}
                                </View>
                                <View style={styles.skuInfo}>
                                  <Typography
                                    variant="small"
                                    weight="semibold"
                                    numberOfLines={1}>
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
                                <View style={{alignItems: 'flex-end'}}>
                                  <Typography
                                    variant="small"
                                    color={theme.colors.success[600]}
                                    weight="semibold">
                                    Sold: {sku.totalSold || 0}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color={theme.colors.gray[500]}>
                                    Purchased: {sku.totalPurchased || 0}
                                  </Typography>
                                </View>
                              </View>
                            </TouchableOpacity>
                            {/* SKU Details */}
                            {isSkuExpanded && (
                              <View style={styles.skuDetails}>
                                {/* Purchase History Folder */}
                                <View style={styles.skuPurchaseFolder}>
                                  <TouchableOpacity
                                    style={[styles.categoryFolderHeader, {backgroundColor: theme.colors.primary[50]}]}
                                    onPress={() => toggleSkuPurchases(sku.sku)}>
                                    <View style={styles.categoryFolderHeaderLeft}>
                                      {expandedSkuPurchases.has(sku.sku) ? (
                                        <ChevronDownIcon size={16} color={theme.colors.gray[600]} />
                                      ) : (
                                        <ChevronRightIcon size={16} color={theme.colors.gray[600]} />
                                      )}
                                      <Typography
                                        variant="small"
                                        weight="semibold"
                                        color={theme.colors.primary[700]}
                                        style={{marginLeft: 8}}>
                                        Purchase History ({(sku.purchaseHistory || []).length} orders)
                                      </Typography>
                                    </View>
                                  </TouchableOpacity>
                                  {expandedSkuPurchases.has(sku.sku) && (
                                    <View style={styles.categoryFolderBody}>
                                      {(sku.purchaseHistory || []).length === 0 ? (
                                        <Typography variant="caption" color={theme.colors.gray[500]} align="center" style={{padding: 12}}>
                                          No purchase history
                                        </Typography>
                                      ) : (
                                        sku.purchaseHistory.map((record: any, index: number) => (
                                          <View key={index} style={styles.historyItem}>
                                            <View style={styles.historyRow}>
                                              <Typography variant="caption" color={theme.colors.gray[500]}>
                                                Order #
                                              </Typography>
                                              <Typography variant="small" weight="medium">
                                                {record.orderNumber}
                                              </Typography>
                                            </View>
                                            <View style={styles.historyRow}>
                                              <Typography variant="caption" color={theme.colors.gray[500]}>
                                                Date
                                              </Typography>
                                              <Typography variant="small" color={theme.colors.gray[700]}>
                                                {formatDate(record.orderDate)}
                                              </Typography>
                                            </View>
                                            <View style={styles.historyRow}>
                                              <Typography variant="caption" color={theme.colors.gray[500]}>
                                                Quantity
                                              </Typography>
                                              <Typography variant="small" weight="bold">
                                                {record.quantity}
                                              </Typography>
                                            </View>
                                            <View style={styles.historyRow}>
                                              <Typography variant="caption" color={theme.colors.gray[500]}>
                                                Unit Price
                                              </Typography>
                                              <Typography variant="small">
                                                {formatCurrency(record.unitPrice)}
                                              </Typography>
                                            </View>
                                            <View style={styles.historyRow}>
                                              <Typography variant="caption" color={theme.colors.gray[500]}>
                                                Line Total
                                              </Typography>
                                              <Typography variant="small" weight="bold" color={theme.colors.success[600]}>
                                                {formatCurrency(record.lineTotal)}
                                              </Typography>
                                            </View>
                                            <View style={styles.historyRow}>
                                              <Typography variant="caption" color={theme.colors.gray[500]}>
                                                Vendor
                                              </Typography>
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
                      })
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
      {/* Discrepancy Modal */}
      <Modal
        visible={showDiscrepancyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowDiscrepancyModal(false);
          setPrefilledItem(null);
        }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Typography variant="h3" weight="bold">
                Record Discrepancy
              </Typography>
              <TouchableOpacity
                onPress={() => {
                  setShowDiscrepancyModal(false);
                  setPrefilledItem(null);
                }}>
                <Typography variant="body" color={theme.colors.gray[500]}>
                  ✕
                </Typography>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {prefilledItem && (
                <View style={styles.itemDetailsCard}>
                  <Typography variant="small" weight="bold" style={{marginBottom: 8}}>
                    Item Details
                  </Typography>
                  <Typography variant="caption" color={theme.colors.gray[600]}>
                    Item: {prefilledItem.itemName}
                  </Typography>
                  <Typography variant="caption" color={theme.colors.gray[600]}>
                    SKU: {prefilledItem.itemSku}
                  </Typography>
                  <Typography variant="caption" color={theme.colors.gray[600]}>
                    Category: {prefilledItem.categoryName}
                  </Typography>
                  <Typography variant="caption" color={theme.colors.gray[600]}>
                    Current Stock: {prefilledItem.systemQuantity} units
                  </Typography>
                </View>
              )}
              <View style={styles.formGroup}>
                <Typography variant="small" weight="semibold" style={{marginBottom: 8}}>
                  System Quantity
                </Typography>
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  value={prefilledItem?.systemQuantity?.toString() || '0'}
                  editable={false}
                />
              </View>
              <View style={styles.formGroup}>
                <Typography variant="small" weight="semibold" style={{marginBottom: 8}}>
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
                />
              </View>
              {discrepancyFormData.actualQuantity !== 0 && (
                <View style={styles.differenceCard}>
                  <Typography variant="small" weight="semibold">
                    Difference:
                  </Typography>
                  <Typography
                    variant="h3"
                    weight="bold"
                    color={
                      discrepancyFormData.actualQuantity > (prefilledItem?.systemQuantity || 0)
                        ? theme.colors.success[600]
                        : theme.colors.error[600]
                    }>
                    {discrepancyFormData.actualQuantity > (prefilledItem?.systemQuantity || 0) ? '+' : ''}
                    {discrepancyFormData.actualQuantity - (prefilledItem?.systemQuantity || 0)}
                  </Typography>
                </View>
              )}
              <View style={styles.formGroup}>
                <Typography variant="small" weight="semibold" style={{marginBottom: 8}}>
                  Discrepancy Type *
                </Typography>
                <View style={[styles.input, styles.inputDisabled, {justifyContent: 'center'}]}>
                  <Typography
                    variant="body"
                    color={discrepancyFormData.discrepancyType ? theme.colors.gray[900] : theme.colors.gray[400]}>
                    {discrepancyFormData.discrepancyType
                      ? `${discrepancyFormData.discrepancyType} (${discrepancyFormData.discrepancyType === 'Overage' ? 'More than expected' : 'Less than expected'})`
                      : 'Auto-detected from difference'}
                  </Typography>
                </View>
              </View>
              <View style={styles.formGroup}>
                <Typography variant="small" weight="semibold" style={{marginBottom: 8}}>
                  Reason
                </Typography>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={discrepancyFormData.reason}
                  onChangeText={(text) =>
                    setDiscrepancyFormData({...discrepancyFormData, reason: text})
                  }
                  placeholder="Explain the reason for this discrepancy..."
                  multiline
                  numberOfLines={3}
                />
              </View>
              <View style={styles.formGroup}>
                <Typography variant="small" weight="semibold" style={{marginBottom: 8}}>
                  Additional Notes
                </Typography>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={discrepancyFormData.notes}
                  onChangeText={(text) =>
                    setDiscrepancyFormData({...discrepancyFormData, notes: text})
                  }
                  placeholder="Any additional information..."
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
                disabled={submittingDiscrepancy}>
                <Typography variant="body" color={theme.colors.gray[700]}>
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
                disabled={submittingDiscrepancy || !discrepancyFormData.discrepancyType}>
                {submittingDiscrepancy ? (
                  <ActivityIndicator color={theme.colors.white} />
                ) : (
                  <Typography variant="body" weight="semibold" color={theme.colors.white}>
                    Record Discrepancy
                  </Typography>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    width: '50%',
    padding: 4,
  },
  statCardContent: {
    minHeight: 120,
  },
  statIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statTileLabel: {
    marginBottom: 2,
  },
  statTileValue: {
    color: theme.colors.gray[900],
  },
  statTileSubtitle: {
    marginTop: 2,
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
  categoriesList: {
    gap: theme.spacing.md,
  },
  categoryCard: {
    marginBottom: 0,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'column',
    padding: theme.spacing.md,
    gap: 12,
  },
  categoryHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
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
  categoryInfo: {
    flex: 1,
    gap: 4,
  },
  categoryStatsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingLeft: 80,
    flexWrap: 'wrap',
  },
  statItem: {
    alignItems: 'flex-end',
  },
  statItemLabel: {
    fontSize: 9,
    marginBottom: 2,
  },
  skusContainer: {
    backgroundColor: theme.colors.gray[50],
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
    padding: theme.spacing.sm,
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
  skuItem: {
    backgroundColor: theme.colors.white,
    borderRadius: 8,
    marginBottom: theme.spacing.sm,
    overflow: 'hidden',
  },
  skuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.sm,
  },
  skuHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  skuChevron: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skuInfo: {
    flex: 1,
  },
  skuStats: {
    marginLeft: 8,
  },
  skuDetails: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
  },
  skuSummary: {
    backgroundColor: theme.colors.primary[50],
    padding: theme.spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
    minWidth: '18%',
    marginBottom: 8,
  },
  historySection: {
    backgroundColor: theme.colors.gray[50],
    padding: theme.spacing.md,
  },
  historyTitle: {
    marginBottom: theme.spacing.sm,
  },
  categoryFolderItem: {
    backgroundColor: theme.colors.white,
    borderRadius: 8,
    marginBottom: theme.spacing.sm,
    overflow: 'hidden',
  },
  categoryFolderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.sm,
  },
  categoryFolderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryFolderBody: {
    padding: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
  },
  skuPurchaseFolder: {
    margin: theme.spacing.sm,
    backgroundColor: theme.colors.white,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
  },
  historyItem: {
    backgroundColor: theme.colors.white,
    borderRadius: 8,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    gap: 6,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addDiscrepancyButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: theme.colors.primary[50],
  },
  addDiscrepancyCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: theme.colors.error[600],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  modalBody: {
    padding: theme.spacing.lg,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: theme.spacing.lg,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
  },
  itemDetailsCard: {
    backgroundColor: theme.colors.primary[50],
    padding: theme.spacing.md,
    borderRadius: 8,
    marginBottom: theme.spacing.md,
  },
  formGroup: {
    marginBottom: theme.spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
    borderRadius: 8,
    padding: theme.spacing.sm,
    fontSize: 14,
  },
  inputDisabled: {
    backgroundColor: theme.colors.gray[100],
    color: theme.colors.gray[500],
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  differenceCard: {
    backgroundColor: theme.colors.gray[50],
    padding: theme.spacing.md,
    borderRadius: 8,
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
    backgroundColor: theme.colors.white,
  },
  pickerOptionActive: {
    backgroundColor: theme.colors.primary[600],
    borderColor: theme.colors.primary[600],
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
  },
  submitButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: theme.colors.primary[600],
    minWidth: 180,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
});
