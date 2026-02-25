import React, {useState, useEffect} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput as RNTextInput,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {useAuth} from '../contexts/AuthContext';
import {theme} from '../theme';
import inventoryService from '../services/inventoryService';
import {BoxIcon, AlertCircleIcon, ChevronDownIcon, ChevronRightIcon} from '../components/icons';

export const InventoryScreen = () => {
  const {token} = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [groupedItems, setGroupedItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [expandedItems, setExpandedItems] = useState<{[key: string]: boolean}>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'purchases' | 'sells'>('purchases');
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(true);

  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);

  useEffect(() => {
    if (token && isMounted) {
      setExpandedItems({}); // Clear expanded items when tab changes
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

  const toggleExpand = (sku: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [sku]: !prev[sku],
    }));
  };

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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {/* Header */}
        <View style={styles.header}>
          <Typography variant="h1" weight="bold" style={styles.headerTitle}>
            Inventory
          </Typography>
          <Typography
            variant="body"
            color={theme.colors.gray[500]}
            style={styles.headerSubtitle}>
            {filteredItems.length} items in stock
          </Typography>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <RNTextInput
            style={styles.searchInput}
            placeholder="Search by name or SKU..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={theme.colors.gray[400]}
          />
        </View>

        {/* Tabs */}
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
                  onPress={() => toggleExpand(group.sku)}
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
                    {/* For Purchases - show orders */}
                    {activeTab === 'purchases' && group.orders && group.orders.length > 0 && (
                      <View style={styles.ordersContainer}>
                        <Typography
                          variant="small"
                          weight="semibold"
                          color={theme.colors.gray[700]}
                          style={styles.ordersTitle}>
                          Order Details
                        </Typography>

                        {group.orders.map((order: any, index: number) => (
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
                          </View>
                        ))}
                      </View>
                    )}

                    {/* For Sells - show invoices */}
                    {activeTab === 'sells' && group.invoices && group.invoices.length > 0 && (
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
                                  color={invoice.stockProcessed ? theme.colors.success[700] : theme.colors.warning[700]}>
                                  {invoice.stockProcessed ? 'Yes' : 'No'}
                                </Typography>
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </>
                )}
              </Card>
            );
          })}
        </View>
      </ScrollView>
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
    fontSize: 32,
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    fontSize: 14,
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: theme.colors.primary[100],
  },
  statusBadgeSuccess: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: theme.colors.success[100],
  },
  statusBadgeWarning: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: theme.colors.warning[100],
  },
});
