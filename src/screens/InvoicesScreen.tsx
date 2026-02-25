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
import invoiceService from '../services/invoiceService';
import {AlertCircleIcon, FileTextIcon} from '../components/icons';
import {InvoiceDetailScreen} from './InvoiceDetailScreen';

type StatusFilter = '' | 'draft' | 'issued' | 'paid' | 'cancelled';
type PaymentStatusFilter = '' | 'pending' | 'paid' | 'overdue';

export const InvoicesScreen = () => {
  const {token} = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatusFilter>('');
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(true);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

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
  }, [token, statusFilter, paymentStatusFilter]);

  // Debounced search
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

        if (isMounted) {
          setInvoices(response.invoices || []);
          setError(null);
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch invoices:', error);
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

  const handleInvoicePress = (invoice: any) => {
    setSelectedInvoiceId(invoice._id);
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
          <Typography variant="h1" weight="bold" style={styles.headerTitle}>
            Invoices
          </Typography>
          <Typography
            variant="body"
            color={theme.colors.gray[500]}
            style={styles.headerSubtitle}>
            {invoices.length} {invoices.length === 1 ? 'invoice' : 'invoices'} found
          </Typography>
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
                      <FileTextIcon size={24} color={theme.colors.primary[600]} />
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.gray[200],
  },
  filterChipActive: {
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
  invoicesList: {
    gap: theme.spacing.md,
  },
  invoiceCard: {
    marginBottom: 0,
    overflow: 'hidden',
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  invoiceHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: theme.colors.primary[100],
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
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
});
