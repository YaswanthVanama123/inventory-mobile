import React, {useState, useEffect} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput as RNTextInput,
  Switch,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {useAuth} from '../contexts/AuthContext';
import {useApiErrorHandler} from '../hooks/useApiErrorHandler';
import {theme} from '../theme';
import invoiceService from '../services/invoiceService';
import {AlertCircleIcon, FileTextIcon} from '../components/icons';
import {InvoiceDetailScreen} from './InvoiceDetailScreen';

type StatusFilter = '' | 'draft' | 'issued' | 'paid' | 'cancelled';
type PaymentStatusFilter = '' | 'pending' | 'paid' | 'overdue';

export const InvoicesScreen = () => {
  const {token} = useAuth();
  const {handleApiError} = useApiErrorHandler();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncingNew, setSyncingNew] = useState(false);
  const [syncingOld, setSyncingOld] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [invoiceType, setInvoiceType] = useState<'pending' | 'closed'>('pending');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatusFilter>('');
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(true);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [autoSyncInterval, setAutoSyncInterval] = useState(30);
  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);
  useEffect(() => {
    if (token && isMounted) {
      fetchInvoices();
    } else if (isMounted) {
      setLoading(false);
    }
  }, [token, statusFilter, paymentStatusFilter, invoiceType]);
  useEffect(() => {
    if (!autoSyncEnabled || !isMounted || !token) return;
    const intervalMs = autoSyncInterval * 60 * 1000;
    const autoSyncTimer = setInterval(async () => {
      if (!syncing) {
        try {
          console.log('Running auto-sync for invoices...');
          const response = invoiceType === 'pending'
            ? await invoiceService.syncPendingInvoices(token, 0, 'new')
            : await invoiceService.syncClosedInvoices(token, 0, 'new');
          if (response.success && (response.data.created > 0 || response.data.updated > 0)) {
            fetchInvoices();
          }
        } catch (error) {
          console.error('Auto-sync error:', error);
        }
      }
    }, intervalMs);
    return () => clearInterval(autoSyncTimer);
  }, [autoSyncEnabled, autoSyncInterval, syncing, isMounted, token, invoiceType]);
  useEffect(() => {
    if (!isMounted) return;
    const timer = setTimeout(() => {
      if (token) {
        fetchInvoices();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  const fetchInvoices = async () => {
    try {
      if (token && isMounted) {
        const params: any = {
          limit: 50,
        };
        if (searchQuery) params.search = searchQuery;
        if (statusFilter) params.status = statusFilter;
        if (paymentStatusFilter) params.paymentStatus = paymentStatusFilter;
        const response = await invoiceService.getInvoices(token, params);
        console.log('Fetched invoices response:', response);
        console.log('Number of invoices:', response.invoices?.length);
        if (response.invoices && response.invoices.length > 0) {
          console.log('First invoice structure:', JSON.stringify(response.invoices[0], null, 2));
        }
        if (isMounted) {
          setInvoices(response.invoices || []);
          setError(null);
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch invoices:', error);
      const wasHandled = await handleApiError(error);
      if (wasHandled) return;
      if (isMounted) {
        setError(error.message || 'Failed to load invoices');
        setInvoices([]);
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
    fetchInvoices();
  };
  const handleSyncNew = async () => {
    if (!token) return;
    setSyncingNew(true);
    setSyncing(true);
    try {
      const response = invoiceType === 'pending'
        ? await invoiceService.syncPendingInvoices(token, 0, 'new')
        : await invoiceService.syncClosedInvoices(token, 0, 'new');
      if (response.success) {
        fetchInvoices();
      }
    } catch (error: any) {
      console.error('Failed to sync new invoices:', error);
      const wasHandled = await handleApiError(error);
      if (!wasHandled) {
        setError(error.message || 'Failed to sync new invoices');
      }
    } finally {
      setSyncingNew(false);
      setSyncing(false);
    }
  };
  const handleSyncOld = async () => {
    if (!token) return;
    setSyncingOld(true);
    setSyncing(true);
    try {
      const response = invoiceType === 'pending'
        ? await invoiceService.syncPendingInvoices(token, 0, 'old')
        : await invoiceService.syncClosedInvoices(token, 0, 'old');
      if (response.success) {
        fetchInvoices();
      }
    } catch (error: any) {
      console.error('Failed to sync old invoices:', error);
      const wasHandled = await handleApiError(error);
      if (!wasHandled) {
        setError(error.message || 'Failed to sync old invoices');
      }
    } finally {
      setSyncingOld(false);
      setSyncing(false);
    }
  };
  const handleSyncAll = async () => {
    if (!token) return;
    setSyncingAll(true);
    setSyncing(true);
    try {
      const invoicesResponse = invoiceType === 'pending'
        ? await invoiceService.syncPendingInvoices(token, 0, 'new')
        : await invoiceService.syncClosedInvoices(token, 0, 'new');
      if (invoicesResponse.success) {
        let detailsSynced = 0;
        try {
          const detailsResponse = await invoiceService.syncAllInvoiceDetails(token, invoiceType, 0);
          if (detailsResponse.success) {
            detailsSynced = detailsResponse.data.synced || 0;
          }
        } catch (detailsError) {
          console.error('Error syncing details:', detailsError);
        }
        fetchInvoices();
      }
    } catch (error: any) {
      console.error('Failed to sync all invoices:', error);
      const wasHandled = await handleApiError(error);
      if (!wasHandled) {
        setError(error.message || 'Failed to sync all invoices');
      }
    } finally {
      setSyncingAll(false);
      setSyncing(false);
    }
  };
  const handleInvoicePress = (invoice: any) => {
    console.log('Invoice pressed - Full invoice object:', JSON.stringify(invoice, null, 2));
    console.log('Invoice _id:', invoice._id);
    console.log('Invoice id:', invoice.id);
    console.log('Invoice invoiceNumber:', invoice.invoiceNumber);
    const invoiceIdentifier = invoice.invoiceNumber || invoice._id || invoice.id;
    console.log('Using invoice identifier:', invoiceIdentifier);
    setSelectedInvoiceId(invoiceIdentifier);
    setDetailModalVisible(true);
  };
  const handleCloseDetail = () => {
    setDetailModalVisible(false);
    setSelectedInvoiceId(null);
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
    const colors: {[key: string]: string} = {
      draft: theme.colors.gray[500],
      issued: theme.colors.primary[600],
      paid: theme.colors.success[600],
      cancelled: theme.colors.error[600],
    };
    return colors[status?.toLowerCase()] || theme.colors.gray[500];
  };
  const getPaymentStatusColor = (paymentStatus: string) => {
    const colors: {[key: string]: string} = {
      pending: theme.colors.warning[600],
      paid: theme.colors.success[600],
      overdue: theme.colors.error[600],
    };
    return colors[paymentStatus?.toLowerCase()] || theme.colors.gray[500];
  };
  const getStatusBgColor = (status: string) => {
    const colors: {[key: string]: string} = {
      draft: theme.colors.gray[100],
      issued: theme.colors.primary[100],
      paid: theme.colors.success[100],
      cancelled: theme.colors.error[100],
    };
    return colors[status?.toLowerCase()] || theme.colors.gray[100];
  };
  const getPaymentStatusBgColor = (paymentStatus: string) => {
    const colors: {[key: string]: string} = {
      pending: theme.colors.warning[100],
      paid: theme.colors.success[100],
      overdue: theme.colors.error[100],
    };
    return colors[paymentStatus?.toLowerCase()] || theme.colors.gray[100];
  };
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary[600]} />
        <Typography
          variant="body"
          color={theme.colors.gray[600]}
          style={{marginTop: 16}}>
          Loading invoices...
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
            Invoices
          </Typography>
          <Typography
            variant="body"
            color={theme.colors.gray[500]}
            style={styles.headerSubtitle}>
            {invoices.length} {invoices.length === 1 ? 'invoice' : 'invoices'} found
          </Typography>
        </View>

        {/* Invoice Type Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, invoiceType === 'pending' && styles.tabActive]}
            onPress={() => setInvoiceType('pending')}>
            <Typography
              variant="small"
              weight="semibold"
              color={invoiceType === 'pending' ? theme.colors.primary[600] : theme.colors.gray[600]}>
              Pending
            </Typography>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, invoiceType === 'closed' && styles.tabActive]}
            onPress={() => setInvoiceType('closed')}>
            <Typography
              variant="small"
              weight="semibold"
              color={invoiceType === 'closed' ? theme.colors.primary[600] : theme.colors.gray[600]}>
              Closed
            </Typography>
          </TouchableOpacity>
        </View>

        {/* Sync Buttons */}
        <View style={styles.syncButtonsContainer}>
          <TouchableOpacity
            onPress={handleSyncNew}
            disabled={syncing}
            style={[
              styles.syncActionButton,
              styles.syncNewButton,
              syncing && styles.syncButtonDisabled
            ]}>
            {syncingNew ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              <Typography variant="small" weight="semibold" color={theme.colors.white}>
                ↑ New Sync
              </Typography>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSyncOld}
            disabled={syncing}
            style={[
              styles.syncActionButton,
              styles.syncOldButton,
              syncing && styles.syncButtonDisabled
            ]}>
            {syncingOld ? (
              <ActivityIndicator size="small" color={theme.colors.primary[600]} />
            ) : (
              <Typography variant="small" weight="semibold" color={theme.colors.primary[600]}>
                ↓ Old Sync
              </Typography>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSyncAll}
            disabled={syncing}
            style={[
              styles.syncActionButton,
              styles.syncAllButton,
              syncing && styles.syncButtonDisabled
            ]}>
            {syncingAll ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              <Typography variant="small" weight="semibold" color={theme.colors.white}>
                ⟳ Sync All
              </Typography>
            )}
          </TouchableOpacity>
        </View>

        {/* Automation Settings */}
        <View style={styles.automationContainer}>
          <View style={styles.automationRow}>
            <View style={styles.automationLabel}>
              <Typography variant="small" weight="semibold" color={theme.colors.gray[700]}>
                Auto-Sync
              </Typography>
              <Typography variant="caption" color={theme.colors.gray[500]}>
                Every {autoSyncInterval} min
              </Typography>
            </View>
            <Switch
              value={autoSyncEnabled}
              onValueChange={setAutoSyncEnabled}
              trackColor={{ false: theme.colors.gray[300], true: theme.colors.primary[400] }}
              thumbColor={autoSyncEnabled ? theme.colors.primary[600] : theme.colors.gray[50]}
            />
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <RNTextInput
            style={styles.searchInput}
            placeholder="Search by invoice number or customer..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={theme.colors.gray[400]}
          />
        </View>
        {/* Status Filter */}
        <View style={styles.filterSection}>
          <Typography variant="small" weight="semibold" style={styles.filterLabel}>
            Status
          </Typography>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <View style={styles.filterChips}>
              {[
                {label: 'All', value: ''},
                {label: 'Draft', value: 'draft'},
                {label: 'Issued', value: 'issued'},
                {label: 'Paid', value: 'paid'},
                {label: 'Cancelled', value: 'cancelled'},
              ].map((filter) => (
                <TouchableOpacity
                  key={filter.value}
                  style={[
                    styles.filterChip,
                    statusFilter === filter.value && styles.filterChipActive,
                  ]}
                  onPress={() => setStatusFilter(filter.value as StatusFilter)}>
                  <Typography
                    variant="small"
                    weight="semibold"
                    color={
                      statusFilter === filter.value
                        ? theme.colors.white
                        : theme.colors.gray[600]
                    }>
                    {filter.label}
                  </Typography>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
        {/* Payment Status Filter */}
        <View style={styles.filterSection}>
          <Typography variant="small" weight="semibold" style={styles.filterLabel}>
            Payment Status
          </Typography>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <View style={styles.filterChips}>
              {[
                {label: 'All', value: ''},
                {label: 'Pending', value: 'pending'},
                {label: 'Paid', value: 'paid'},
                {label: 'Overdue', value: 'overdue'},
              ].map((filter) => (
                <TouchableOpacity
                  key={filter.value}
                  style={[
                    styles.filterChip,
                    paymentStatusFilter === filter.value && styles.filterChipActive,
                  ]}
                  onPress={() => setPaymentStatusFilter(filter.value as PaymentStatusFilter)}>
                  <Typography
                    variant="small"
                    weight="semibold"
                    color={
                      paymentStatusFilter === filter.value
                        ? theme.colors.white
                        : theme.colors.gray[600]
                    }>
                    {filter.label}
                  </Typography>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
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
        {!error && invoices.length === 0 && (
          <Card variant="outlined" padding="lg" style={styles.emptyCard}>
            <FileTextIcon size={48} color={theme.colors.gray[400]} />
            <Typography
              variant="h3"
              weight="semibold"
              color={theme.colors.gray[700]}
              style={styles.emptyTitle}>
              No invoices found
            </Typography>
            <Typography
              variant="body"
              color={theme.colors.gray[500]}
              align="center">
              {searchQuery || statusFilter || paymentStatusFilter
                ? 'Try adjusting your filters'
                : 'No invoices to display'}
            </Typography>
          </Card>
        )}
        {/* Invoices List */}
        <View style={styles.invoicesList}>
          {invoices.map((invoice) => (
            <TouchableOpacity
              key={invoice._id}
              onPress={() => handleInvoicePress(invoice)}>
              <Card
                variant="elevated"
                padding="none"
                style={styles.invoiceCard}>
                {/* Invoice Header */}
                <View style={styles.invoiceHeader}>
                  <View style={styles.invoiceHeaderLeft}>
                    <View style={styles.iconContainer}>
                      <FileTextIcon size={20} color={theme.colors.primary[600]} />
                    </View>
                    <View style={styles.invoiceHeaderInfo}>
                      <Typography
                        variant="body"
                        weight="bold"
                        style={styles.invoiceNumber}>
                        {invoice.invoiceNumber}
                      </Typography>
                      <Typography
                        variant="caption"
                        color={theme.colors.gray[500]}>
                        {invoice.customer?.name || invoice.customerName || 'Unknown'}
                      </Typography>
                    </View>
                  </View>
                  <View style={styles.invoiceHeaderRight}>
                    <Typography
                      variant="body"
                      weight="bold"
                      color={theme.colors.success[600]}>
                      {formatCurrency(invoice.totalAmount || invoice.total)}
                    </Typography>
                    <Typography
                      variant="caption"
                      color={theme.colors.gray[500]}>
                      {formatDate(invoice.date || invoice.createdAt)}
                    </Typography>
                  </View>
                </View>
                {/* Invoice Details */}
                <View style={styles.invoiceDetails}>
                  <View style={styles.detailRow}>
                    <Typography variant="caption" color={theme.colors.gray[500]}>
                      Status
                    </Typography>
                    <View
                      style={[
                        styles.badge,
                        {backgroundColor: getStatusBgColor(invoice.status)},
                      ]}>
                      <Typography
                        variant="caption"
                        weight="semibold"
                        color={getStatusColor(invoice.status)}>
                        {invoice.status || 'Draft'}
                      </Typography>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <Typography variant="caption" color={theme.colors.gray[500]}>
                      Payment
                    </Typography>
                    <View
                      style={[
                        styles.badge,
                        {backgroundColor: getPaymentStatusBgColor(invoice.paymentStatus)},
                      ]}>
                      <Typography
                        variant="caption"
                        weight="semibold"
                        color={getPaymentStatusColor(invoice.paymentStatus)}>
                        {invoice.paymentStatus || 'Pending'}
                      </Typography>
                    </View>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      {/* Invoice Detail Modal */}
      <InvoiceDetailScreen
        visible={detailModalVisible}
        invoiceId={selectedInvoiceId}
        onClose={handleCloseDetail}
      />
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
    marginBottom: theme.spacing.xl,
  },
  headerTitle: {
    marginBottom: theme.spacing.xs,
    color: theme.colors.text.primary,
  },
  headerSubtitle: {
    fontSize: theme.typography.fontSizes.md,
    color: theme.colors.text.tertiary,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.gray[100],
    borderRadius: theme.borderRadius.xl,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: theme.colors.white,
    ...theme.shadows.sm,
  },
  syncButtonsContainer: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
    justifyContent: 'space-between',
  },
  syncActionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    marginHorizontal: 4,
  },
  syncNewButton: {
    backgroundColor: theme.colors.primary[600],
  },
  syncOldButton: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.primary[600],
  },
  syncAllButton: {
    backgroundColor: theme.colors.success[600],
  },
  syncButtonDisabled: {
    opacity: 0.5,
  },
  automationContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.primary[50],
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.primary[200],
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.xl,
  },
  automationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  automationLabel: {
    flex: 1,
  },
  searchContainer: {
    marginBottom: theme.spacing.md,
  },
  searchInput: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.xl,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: theme.typography.fontSizes.md,
    borderWidth: 1.5,
    borderColor: theme.colors.gray[200],
    color: theme.colors.text.primary,
    ...theme.shadows.sm,
  },
  filterSection: {
    marginBottom: theme.spacing.md,
  },
  filterLabel: {
    marginBottom: theme.spacing.xs,
    color: theme.colors.gray[700],
  },
  filterScroll: {
    marginHorizontal: -theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: theme.colors.gray[100],
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary[600],
    borderColor: theme.colors.primary[600],
    ...theme.shadows.sm,
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
  invoicesList: {
    gap: theme.spacing.md,
  },
  invoiceCard: {
    marginBottom: 0,
    overflow: 'hidden',
    borderRadius: theme.borderRadius.xl,
    ...theme.shadows.sm,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[100],
  },
  invoiceHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoiceHeaderInfo: {
    flex: 1,
  },
  invoiceNumber: {
    fontFamily: 'monospace',
  },
  invoiceHeaderRight: {
    alignItems: 'flex-end',
  },
  invoiceDetails: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    backgroundColor: theme.colors.gray[50],
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
  },
});
