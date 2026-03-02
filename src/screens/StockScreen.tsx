import React, {useState, useEffect} from 'react';
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
import {theme} from '../theme';
import stockService from '../services/stockService';
import discrepancyService from '../services/discrepancyService';
import {
  BoxIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  AlertCircleIcon,
  PlusIcon,
} from '../components/icons';

export const StockScreen = () => {
  const {token} = useAuth();
  const {handleApiError} = useApiErrorHandler();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'use' | 'sell'>('sell');
  const [useStockData, setUseStockData] = useState<any>({items: [], totals: {}});
  const [sellStockData, setSellStockData] = useState<any>({items: [], totals: {}});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSKUs, setExpandedSKUs] = useState<Set<string>>(new Set());
  const [categorySkuData, setCategorySkuData] = useState<{[key: string]: any[]}>({});
  const [loadingCategories, setLoadingCategories] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(true);

  // Discrepancy modal state
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

      // Check if token expired and handle auto-logout
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

          const response = activeTab === 'use'
            ? await stockService.getCategorySKUs(token!, categoryName)
            : await stockService.getCategorySales(token!, categoryName);

          setCategorySkuData(prev => ({
            ...prev,
            [categoryName]: response || [],
          }));

          newLoadingCategories.delete(categoryName);
          setLoadingCategories(newLoadingCategories);
        } catch (error: any) {
          console.error('Error loading category data:', error);

          // Check if token expired and handle auto-logout
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

  const currentData = activeTab === 'use' ? useStockData : sellStockData;

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
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

      // Refresh stock data
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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {/* Header */}
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

        {/* Tabs */}
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
              setCategorySkuData({});
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
              setCategorySkuData({});
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

        {/* Stats Cards */}
        {activeTab === 'sell' && (
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[{backgroundColor: theme.colors.primary[600]}, styles.statCardContent]}>
                <Typography variant="caption" style={styles.statLabel}>
                  Total Purchased
                </Typography>
                <Typography variant="h2" weight="bold" style={styles.statValue}>
                  {currentData.totals.totalPurchased || 0}
                </Typography>
                <Typography variant="caption" style={styles.statSubtitle}>
                  Units ordered
                </Typography>
              </View>
            </View>

            <View style={styles.statCard}>
              <View style={[{backgroundColor: theme.colors.success[600]}, styles.statCardContent]}>
                <Typography variant="caption" style={styles.statLabel}>
                  Total Sold
                </Typography>
                <Typography variant="h2" weight="bold" style={styles.statValue}>
                  {currentData.totals.totalSold || 0}
                </Typography>
                <Typography variant="caption" style={styles.statSubtitle}>
                  Units sold
                </Typography>
              </View>
            </View>

            <View style={styles.statCard}>
              <View style={[{backgroundColor: theme.colors.warning[600]}, styles.statCardContent]}>
                <Typography variant="caption" style={styles.statLabel}>
                  Checked Out
                </Typography>
                <Typography variant="h2" weight="bold" style={styles.statValue}>
                  {currentData.totals.totalCheckedOut || 0}
                </Typography>
                <Typography variant="caption" style={styles.statSubtitle}>
                  Units on trucks
                </Typography>
              </View>
            </View>

            <View style={styles.statCard}>
              <View style={[{backgroundColor: '#9333ea'}, styles.statCardContent]}>
                <Typography variant="caption" style={styles.statLabel}>
                  Stock Remaining
                </Typography>
                <Typography variant="h2" weight="bold" style={styles.statValue}>
                  {currentData.totals.stockRemaining || 0}
                </Typography>
                <Typography variant="caption" style={styles.statSubtitle}>
                  Available stock
                </Typography>
              </View>
            </View>

            <View style={styles.statCard}>
              <View style={[{backgroundColor: theme.colors.error[600]}, styles.statCardContent]}>
                <Typography variant="caption" style={styles.statLabel}>
                  Discrepancies
                </Typography>
                <Typography variant="h2" weight="bold" style={styles.statValue}>
                  {currentData.totals.totalDiscrepancyDifference !== undefined ? currentData.totals.totalDiscrepancyDifference : currentData.totals.totalDiscrepancies || 0}
                </Typography>
                <Typography variant="caption" style={styles.statSubtitle}>
                  Total difference
                </Typography>
              </View>
            </View>
          </View>
        )}

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
                      {activeTab === 'sell' && (
                        <Typography
                          variant="caption"
                          color={theme.colors.gray[500]}>
                          {category.itemCount || 0} items • {category.invoiceCount || 0} invoices
                        </Typography>
                      )}
                    </View>
                  </View>

                  {/* Second Row: Stats */}
                  <View style={styles.categoryStatsRow}>
                    {activeTab === 'use' ? (
                      <>
                        <View style={styles.statItem}>
                          <Typography
                            variant="caption"
                            color={theme.colors.gray[500]}
                            style={styles.statItemLabel}>
                            QTY
                          </Typography>
                          <Typography
                            variant="body"
                            weight="bold">
                            {category.totalQuantity}
                          </Typography>
                        </View>
                        <View style={styles.statItem}>
                          <Typography
                            variant="caption"
                            color={theme.colors.gray[500]}
                            style={styles.statItemLabel}>
                            VALUE
                          </Typography>
                          <Typography
                            variant="small"
                            weight="semibold"
                            color={theme.colors.success[600]}>
                            {formatCurrency(category.totalValue)}
                          </Typography>
                        </View>
                      </>
                    ) : (
                      <>
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
                      </>
                    )}
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
                    ) : categorySkuData[category.categoryName]?.length > 0 ? (
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
                                {activeTab === 'use' ? (
                                  <Typography variant="body" weight="bold">
                                    {sku.totalQuantity}
                                  </Typography>
                                ) : (
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
                                )}
                              </View>
                            </TouchableOpacity>

                            {/* SKU Details */}
                            {isSkuExpanded && (
                              <View style={styles.skuDetails}>
                                {/* Summary for Sell Stock */}
                                {activeTab === 'sell' && (
                                  <View style={styles.skuSummary}>
                                    <View style={styles.summaryRow}>
                                      <View style={styles.summaryItem}>
                                        <Typography variant="caption" color={theme.colors.gray[500]}>
                                          Purchased
                                        </Typography>
                                        <Typography variant="body" weight="bold" color={theme.colors.primary[600]}>
                                          {sku.totalPurchased || 0}
                                        </Typography>
                                      </View>
                                      <View style={styles.summaryItem}>
                                        <Typography variant="caption" color={theme.colors.gray[500]}>
                                          Sold
                                        </Typography>
                                        <Typography variant="body" weight="bold" color={theme.colors.success[600]}>
                                          {sku.totalSold || 0}
                                        </Typography>
                                      </View>
                                      <View style={styles.summaryItem}>
                                        <Typography variant="caption" color={theme.colors.gray[500]}>
                                          Checked Out
                                        </Typography>
                                        <Typography variant="body" weight="bold" color={theme.colors.warning[600]}>
                                          {sku.totalCheckedOut || 0}
                                        </Typography>
                                      </View>
                                      <View style={styles.summaryItem}>
                                        <Typography variant="caption" color={theme.colors.gray[500]}>
                                          Discrepancy
                                        </Typography>
                                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                                          <Typography variant="body" weight="bold" color={theme.colors.error[600]}>
                                            {(sku.discrepancyHistory || []).reduce((sum: number, d: any) => sum + (d.difference || 0), 0)}
                                          </Typography>
                                          <TouchableOpacity
                                            onPress={() => {
                                              const stockRemaining = (sku.totalPurchased || 0) - (sku.totalSold || 0) - (sku.totalCheckedOut || 0);

                                              // Extract actual RouteStarItem category from itemName
                                              const itemNameUpper = sku.itemName.toUpperCase();
                                              const categoryKeywords = ['WHITE', 'BLACK', 'BLUE', 'RED', 'GREEN', 'YELLOW', 'BROWN', 'GRAY', 'GREY', 'ORANGE', 'PINK', 'PURPLE'];
                                              let actualCategory = null;

                                              for (const keyword of categoryKeywords) {
                                                if (itemNameUpper.includes(keyword)) {
                                                  actualCategory = keyword;
                                                  break;
                                                }
                                              }

                                              setPrefilledItem({
                                                itemName: sku.itemName,
                                                itemSku: sku.sku,
                                                categoryName: actualCategory || '',
                                                systemQuantity: stockRemaining,
                                              });
                                              setDiscrepancyFormData({
                                                actualQuantity: 0,
                                                discrepancyType: '',
                                                reason: '',
                                                notes: `Reported from Stock Management for ${actualCategory || sku.itemName}`,
                                              });
                                              setShowDiscrepancyModal(true);
                                            }}
                                            style={styles.addDiscrepancyButton}>
                                            <PlusIcon size={16} color={theme.colors.primary[600]} />
                                          </TouchableOpacity>
                                        </View>
                                      </View>
                                      <View style={styles.summaryItem}>
                                        <Typography variant="caption" color={theme.colors.gray[500]}>
                                          Remaining
                                        </Typography>
                                        <Typography variant="body" weight="bold" color={'#9333ea'}>
                                          {sku.stockRemaining !== undefined ? sku.stockRemaining : ((sku.totalPurchased || 0) - (sku.totalSold || 0) - (sku.totalCheckedOut || 0))}
                                        </Typography>
                                      </View>
                                    </View>
                                  </View>
                                )}

                                {/* Purchase History */}
                                {sku.purchaseHistory && sku.purchaseHistory.length > 0 && (
                                  <View style={styles.historySection}>
                                    <Typography
                                      variant="small"
                                      weight="semibold"
                                      color={theme.colors.primary[700]}
                                      style={styles.historyTitle}>
                                      Purchase History ({sku.purchaseHistory.length})
                                    </Typography>
                                    {sku.purchaseHistory.map((record: any, index: number) => (
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
                                    ))}
                                  </View>
                                )}

                                {/* Sales History (for sell stock) */}
                                {activeTab === 'sell' && sku.salesHistory && sku.salesHistory.length > 0 && (
                                  <View style={[styles.historySection, {backgroundColor: theme.colors.success[50]}]}>
                                    <Typography
                                      variant="small"
                                      weight="semibold"
                                      color={theme.colors.success[700]}
                                      style={styles.historyTitle}>
                                      Sales History ({sku.salesHistory.length})
                                    </Typography>
                                    {sku.salesHistory.map((record: any, index: number) => (
                                      <View key={index} style={styles.historyItem}>
                                        <View style={styles.historyRow}>
                                          <Typography variant="caption" color={theme.colors.gray[500]}>
                                            Invoice #
                                          </Typography>
                                          <Typography variant="small" weight="medium" color={theme.colors.success[600]}>
                                            {record.invoiceNumber}
                                          </Typography>
                                        </View>
                                        <View style={styles.historyRow}>
                                          <Typography variant="caption" color={theme.colors.gray[500]}>
                                            Date
                                          </Typography>
                                          <Typography variant="small" color={theme.colors.gray[700]}>
                                            {formatDate(record.invoiceDate)}
                                          </Typography>
                                        </View>
                                        <View style={styles.historyRow}>
                                          <Typography variant="caption" color={theme.colors.gray[500]}>
                                            Customer
                                          </Typography>
                                          <Typography variant="small" weight="medium">
                                            {record.customer || 'N/A'}
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
                                            Rate
                                          </Typography>
                                          <Typography variant="small">
                                            {formatCurrency(record.rate)}
                                          </Typography>
                                        </View>
                                        <View style={styles.historyRow}>
                                          <Typography variant="caption" color={theme.colors.gray[500]}>
                                            Amount
                                          </Typography>
                                          <Typography variant="small" weight="bold" color={theme.colors.success[600]}>
                                            {formatCurrency(record.amount)}
                                          </Typography>
                                        </View>
                                      </View>
                                    ))}
                                  </View>
                                )}

                                {/* Discrepancy History (for sell stock) */}
                                {activeTab === 'sell' && sku.discrepancyHistory && sku.discrepancyHistory.length > 0 && (
                                  <View style={[styles.historySection, {backgroundColor: theme.colors.error[50]}]}>
                                    <Typography
                                      variant="small"
                                      weight="semibold"
                                      color={theme.colors.error[700]}
                                      style={styles.historyTitle}>
                                      Discrepancy History ({sku.discrepancyHistory.length})
                                    </Typography>
                                    {sku.discrepancyHistory.map((record: any, index: number) => (
                                      <View key={index} style={styles.historyItem}>
                                        <View style={styles.historyRow}>
                                          <Typography variant="caption" color={theme.colors.gray[500]}>
                                            Invoice #
                                          </Typography>
                                          <Typography variant="small" weight="medium" color={theme.colors.error[600]}>
                                            {record.invoiceNumber || 'N/A'}
                                          </Typography>
                                        </View>
                                        <View style={styles.historyRow}>
                                          <Typography variant="caption" color={theme.colors.gray[500]}>
                                            Reported
                                          </Typography>
                                          <Typography variant="small" color={theme.colors.gray[700]}>
                                            {formatDate(record.reportedAt)}
                                          </Typography>
                                        </View>
                                        <View style={styles.historyRow}>
                                          <Typography variant="caption" color={theme.colors.gray[500]}>
                                            System Qty
                                          </Typography>
                                          <Typography variant="small" weight="medium">
                                            {record.systemQuantity}
                                          </Typography>
                                        </View>
                                        <View style={styles.historyRow}>
                                          <Typography variant="caption" color={theme.colors.gray[500]}>
                                            Actual Qty
                                          </Typography>
                                          <Typography variant="small" weight="medium">
                                            {record.actualQuantity}
                                          </Typography>
                                        </View>
                                        <View style={styles.historyRow}>
                                          <Typography variant="caption" color={theme.colors.gray[500]}>
                                            Difference
                                          </Typography>
                                          <Typography variant="small" weight="bold" color={record.difference > 0 ? theme.colors.success[600] : theme.colors.error[600]}>
                                            {record.difference > 0 ? '+' : ''}{record.difference}
                                          </Typography>
                                        </View>
                                        <View style={styles.historyRow}>
                                          <Typography variant="caption" color={theme.colors.gray[500]}>
                                            Type
                                          </Typography>
                                          <Typography variant="small" weight="medium">
                                            {record.discrepancyType}
                                          </Typography>
                                        </View>
                                        <View style={styles.historyRow}>
                                          <Typography variant="caption" color={theme.colors.gray[500]}>
                                            Status
                                          </Typography>
                                          <Typography
                                            variant="small"
                                            weight="bold"
                                            color={
                                              record.status === 'Approved'
                                                ? theme.colors.success[600]
                                                : record.status === 'Rejected'
                                                ? theme.colors.error[600]
                                                : theme.colors.warning[600]
                                            }>
                                            {record.status}
                                          </Typography>
                                        </View>
                                        {record.reason && (
                                          <View style={styles.historyRow}>
                                            <Typography variant="caption" color={theme.colors.gray[500]}>
                                              Reason
                                            </Typography>
                                            <Typography variant="small" color={theme.colors.gray[700]}>
                                              {record.reason}
                                            </Typography>
                                          </View>
                                        )}
                                        {record.reportedBy && (
                                          <View style={styles.historyRow}>
                                            <Typography variant="caption" color={theme.colors.gray[500]}>
                                              Reported By
                                            </Typography>
                                            <Typography variant="small" color={theme.colors.gray[700]}>
                                              {record.reportedBy.fullName || record.reportedBy.username}
                                            </Typography>
                                          </View>
                                        )}
                                      </View>
                                    ))}
                                  </View>
                                )}
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
                <View style={styles.pickerContainer}>
                  {['Overage', 'Shortage', 'Damage', 'Missing'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.pickerOption,
                        discrepancyFormData.discrepancyType === type && styles.pickerOptionActive,
                      ]}
                      onPress={() =>
                        setDiscrepancyFormData({...discrepancyFormData, discrepancyType: type})
                      }>
                      <Typography
                        variant="small"
                        color={
                          discrepancyFormData.discrepancyType === type
                            ? theme.colors.white
                            : theme.colors.gray[700]
                        }>
                        {type}
                      </Typography>
                    </TouchableOpacity>
                  ))}
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

const styles = StyleSheet.create({
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
    paddingTop: theme.spacing.xl,
  },
  header: {
    marginBottom: theme.spacing.lg,
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
    marginBottom: theme.spacing.lg,
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
    borderRadius: 12,
    padding: 12,
    minHeight: 100,
  },
  statLabel: {
    color: '#ffffff',
    fontSize: 11,
    opacity: 0.9,
    marginBottom: 4,
  },
  statValue: {
    color: '#ffffff',
    fontSize: 24,
    marginBottom: 4,
  },
  statSubtitle: {
    color: '#ffffff',
    fontSize: 11,
    opacity: 0.85,
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
