import React, {useState, useEffect} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  TextInput as RNTextInput,
  RefreshControl,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {useAuth} from '../contexts/AuthContext';
import {theme} from '../theme';
import salesReportService from '../services/salesReportService';
import {
  AlertCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  BoxIcon,
  DollarIcon,
  FileTextIcon,
  TagIcon,
} from '../components/icons';

interface SalesReportScreenProps {
  visible: boolean;
  onClose: () => void;
}

export const SalesReportScreen: React.FC<SalesReportScreenProps> = ({
  visible,
  onClose,
}) => {
  const {token} = useAuth();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && token) {
      loadData();
    }
  }, [visible, token]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = items.filter(
        item =>
          item.itemName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.itemParent?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredItems(filtered);
    } else {
      setFilteredItems(items);
    }
  }, [searchQuery, items]);

  const loadData = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const response = await salesReportService.getSalesReport(token);
      setItems(response.items || []);
      setFilteredItems(response.items || []);
      setTotals(response.totals || {});
    } catch (error: any) {
      console.error('Failed to fetch sales report:', error);
      setError(error.message || 'Failed to load sales report');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleItemPress = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Typography variant="body" color={theme.colors.primary[600]} weight="semibold">
              Close
            </Typography>
          </TouchableOpacity>
          <Typography variant="h3" weight="bold" style={styles.modalTitle}>
            Sales Report
          </Typography>
          <TouchableOpacity onPress={loadData} style={styles.refreshButton}>
            <Typography variant="small" color={theme.colors.primary[600]} weight="semibold">
              Refresh
            </Typography>
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary[600]} />
            <Typography
              variant="body"
              color={theme.colors.gray[600]}
              style={{marginTop: 16}}>
              Loading sales report...
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
            {/* Stats Cards */}
            <View style={styles.statsGrid}>
              <View style={styles.statCardWrapper}>
                <View style={[styles.statCard, {backgroundColor: theme.colors.gray[600]}]}>
                  <BoxIcon size={20} color={theme.colors.white} />
                  <Typography variant="caption" style={styles.statLabel}>
                    Total Items
                  </Typography>
                  <Typography variant="h2" weight="bold" style={styles.statValue}>
                    {totals.totalItems || 0}
                  </Typography>
                  <Typography variant="caption" style={styles.statSubtitle}>
                    Items with sales data
                  </Typography>
                </View>
              </View>

              <View style={styles.statCardWrapper}>
                <View style={[styles.statCard, {backgroundColor: theme.colors.success[600]}]}>
                  <TagIcon size={20} color={theme.colors.white} />
                  <Typography variant="caption" style={styles.statLabel}>
                    Total Sold Quantity
                  </Typography>
                  <Typography variant="h2" weight="bold" style={styles.statValue}>
                    {totals.totalSoldQuantity || 0}
                  </Typography>
                  <Typography variant="caption" style={styles.statSubtitle}>
                    Units sold
                  </Typography>
                </View>
              </View>

              <View style={styles.statCardWrapper}>
                <View style={[styles.statCard, {backgroundColor: theme.colors.primary[600]}]}>
                  <DollarIcon size={20} color={theme.colors.white} />
                  <Typography variant="caption" style={styles.statLabel}>
                    Total Sales Amount
                  </Typography>
                  <Typography variant="h2" weight="bold" style={styles.statValue}>
                    {formatCurrency(totals.totalSoldAmount || 0)}
                  </Typography>
                  <Typography variant="caption" style={styles.statSubtitle}>
                    Total revenue
                  </Typography>
                </View>
              </View>

              <View style={styles.statCardWrapper}>
                <View style={[styles.statCard, {backgroundColor: '#6366f1'}]}>
                  <FileTextIcon size={20} color={theme.colors.white} />
                  <Typography variant="caption" style={styles.statLabel}>
                    Total Invoices
                  </Typography>
                  <Typography variant="h2" weight="bold" style={styles.statValue}>
                    {totals.totalInvoices || 0}
                  </Typography>
                  <Typography variant="caption" style={styles.statSubtitle}>
                    Invoices processed
                  </Typography>
                </View>
              </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <RNTextInput
                style={styles.searchInput}
                placeholder="Search items..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={theme.colors.gray[400]}
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
                    : 'No sales data available'}
                </Typography>
              </Card>
            )}

            {/* Items List */}
            <View style={styles.itemsList}>
              {filteredItems.map((item, index) => {
                const isExpanded = expandedItems.has(item._id);

                return (
                  <Card
                    key={item._id || index}
                    variant="elevated"
                    padding="none"
                    style={styles.itemCard}>
                    <TouchableOpacity
                      onPress={() => handleItemPress(item._id)}
                      style={styles.itemHeader}>
                      <View style={styles.itemHeaderLeft}>
                        <View style={styles.chevronContainer}>
                          {isExpanded ? (
                            <ChevronDownIcon size={20} color={theme.colors.gray[600]} />
                          ) : (
                            <ChevronRightIcon size={20} color={theme.colors.gray[600]} />
                          )}
                        </View>
                        <View style={styles.itemInfo}>
                          <Typography variant="body" weight="semibold" numberOfLines={1}>
                            {item.itemName}
                          </Typography>
                          <Typography variant="caption" color={theme.colors.gray[500]}>
                            {item.itemParent || 'No parent'} • On Hand: {item.qtyOnHand || 0}
                          </Typography>
                        </View>
                      </View>
                      <View style={styles.itemStats}>
                        <Typography
                          variant="body"
                          weight="bold"
                          color={
                            item.soldQuantity > 0
                              ? theme.colors.success[600]
                              : theme.colors.gray[500]
                          }>
                          {item.soldQuantity || 0}
                        </Typography>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          sold
                        </Typography>
                      </View>
                    </TouchableOpacity>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <View style={styles.expandedContent}>
                        {/* Item Summary */}
                        <View style={styles.itemSummary}>
                          <View style={styles.summaryRow}>
                            <Typography variant="small" color={theme.colors.gray[500]}>
                              Description
                            </Typography>
                            <Typography variant="small" weight="medium" style={{flex: 1, textAlign: 'right'}}>
                              {item.description || 'N/A'}
                            </Typography>
                          </View>
                          <View style={styles.summaryRow}>
                            <Typography variant="small" color={theme.colors.gray[500]}>
                              Sold Quantity
                            </Typography>
                            <Typography variant="small" weight="bold" color={theme.colors.success[600]}>
                              {item.soldQuantity || 0}
                            </Typography>
                          </View>
                          <View style={styles.summaryRow}>
                            <Typography variant="small" color={theme.colors.gray[500]}>
                              Sales Amount
                            </Typography>
                            <Typography variant="small" weight="bold" color={theme.colors.primary[600]}>
                              {formatCurrency(item.soldAmount || 0)}
                            </Typography>
                          </View>
                          <View style={styles.summaryRow}>
                            <Typography variant="small" color={theme.colors.gray[500]}>
                              Invoices
                            </Typography>
                            <View style={styles.invoiceCountBadge}>
                              <Typography variant="caption" weight="semibold" color={theme.colors.primary[700]}>
                                {item.invoiceCount || 0}
                              </Typography>
                            </View>
                          </View>
                        </View>

                        {/* Invoice Details */}
                        {item.invoiceDetails && item.invoiceDetails.length > 0 ? (
                          <View style={styles.invoiceDetailsContainer}>
                            <Typography variant="small" weight="semibold" style={styles.invoiceDetailsTitle}>
                              Invoice Details ({item.invoiceDetails.length})
                            </Typography>
                            {item.invoiceDetails.map((invoice: any, invIndex: number) => (
                              <View key={invIndex} style={styles.invoiceDetailItem}>
                                <View style={styles.invoiceDetailRow}>
                                  <Typography variant="small" color={theme.colors.gray[500]}>
                                    Invoice #
                                  </Typography>
                                  <Typography variant="small" weight="medium">
                                    {invoice.invoiceNumber}
                                  </Typography>
                                </View>
                                <View style={styles.invoiceDetailRow}>
                                  <Typography variant="small" color={theme.colors.gray[500]}>
                                    Date
                                  </Typography>
                                  <Typography variant="small">
                                    {formatDate(invoice.invoiceDate)}
                                  </Typography>
                                </View>
                                <View style={styles.invoiceDetailRow}>
                                  <Typography variant="small" color={theme.colors.gray[500]}>
                                    Customer
                                  </Typography>
                                  <Typography variant="small" numberOfLines={1} style={{flex: 1, textAlign: 'right'}}>
                                    {invoice.customer || 'N/A'}
                                  </Typography>
                                </View>
                                <View style={styles.invoiceDetailRow}>
                                  <Typography variant="small" color={theme.colors.gray[500]}>
                                    Quantity
                                  </Typography>
                                  <Typography variant="small" weight="bold">
                                    {invoice.quantity}
                                  </Typography>
                                </View>
                                <View style={styles.invoiceDetailRow}>
                                  <Typography variant="small" color={theme.colors.gray[500]}>
                                    Rate
                                  </Typography>
                                  <Typography variant="small">
                                    {formatCurrency(invoice.rate || 0)}
                                  </Typography>
                                </View>
                                <View style={styles.invoiceDetailRow}>
                                  <Typography variant="small" color={theme.colors.gray[500]}>
                                    Amount
                                  </Typography>
                                  <Typography variant="small" weight="bold" color={theme.colors.success[600]}>
                                    {formatCurrency(invoice.amount || 0)}
                                  </Typography>
                                </View>
                              </View>
                            ))}
                          </View>
                        ) : (
                          <View style={styles.noInvoicesContainer}>
                            <FileTextIcon size={32} color={theme.colors.gray[300]} />
                            <Typography variant="small" color={theme.colors.gray[500]} style={{marginTop: 8}}>
                              No invoice entries found
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
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.gray[50],
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
    backgroundColor: theme.colors.white,
  },
  closeButton: {
    paddingVertical: 4,
    width: 60,
  },
  refreshButton: {
    paddingVertical: 4,
    width: 60,
    alignItems: 'flex-end',
  },
  modalTitle: {
    flex: 1,
    textAlign: 'center',
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
    padding: theme.spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: theme.spacing.lg,
  },
  statCardWrapper: {
    width: '50%',
    padding: 4,
  },
  statCard: {
    borderRadius: 12,
    padding: 12,
    minHeight: 120,
  },
  statLabel: {
    color: '#ffffff',
    fontSize: 11,
    opacity: 0.9,
    marginTop: 8,
    marginBottom: 4,
  },
  statValue: {
    color: '#ffffff',
    fontSize: 24,
    marginBottom: 4,
  },
  statSubtitle: {
    color: '#ffffff',
    fontSize: 10,
    opacity: 0.85,
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
  itemCard: {
    marginBottom: 0,
    overflow: 'hidden',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
  },
  itemHeaderLeft: {
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
  itemInfo: {
    flex: 1,
  },
  itemStats: {
    alignItems: 'flex-end',
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
    backgroundColor: theme.colors.gray[50],
  },
  itemSummary: {
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceCountBadge: {
    backgroundColor: theme.colors.primary[100],
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  invoiceDetailsContainer: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
    padding: theme.spacing.md,
    backgroundColor: theme.colors.white,
  },
  invoiceDetailsTitle: {
    marginBottom: theme.spacing.md,
    color: theme.colors.gray[700],
  },
  invoiceDetailItem: {
    backgroundColor: theme.colors.gray[50],
    borderRadius: 8,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    gap: 4,
  },
  invoiceDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noInvoicesContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
  },
});
