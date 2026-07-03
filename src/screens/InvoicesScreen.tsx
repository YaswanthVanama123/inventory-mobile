import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput as RNTextInput,
  Switch,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {Button} from '../components/atoms/Button';
import {Checkbox} from '../components/atoms/Checkbox';
import {PaginatedList} from '../components/molecules/PaginatedList';
import {Pagination} from '../components/molecules/Pagination';
import {useAuth} from '../contexts/AuthContext';
import {useApiErrorHandler} from '../hooks/useApiErrorHandler';
import {useTheme} from '../contexts/ThemeContext';
import {Theme} from '../theme';
import invoiceService from '../services/invoiceService';
import useDebounce from '../hooks/useDebounce';
import {useServerPagination} from '../hooks/useServerPagination';
import {AlertCircleIcon, FileTextIcon, TrashIcon} from '../components/icons';
import {InvoiceDetailScreen} from './InvoiceDetailScreen';
import {formatDate} from '../utils/dateUtils';
import {useBreakpoint, BreakpointInfo} from '../utils/breakpoints';

// Real status enum used by web/backend.
type StatusFilter = '' | 'Pending' | 'Completed' | 'Closed' | 'Cancelled';
type StockProcessedFilter = '' | 'true' | 'false';

export const InvoicesScreen = () => {
  const theme = useTheme();
  const bp = useBreakpoint();
  const styles = useMemo(() => makeStyles(theme, bp), [theme, bp]);
  const {token, user} = useAuth();
  const isAdmin = user?.role === 'admin';
  const {handleApiError} = useApiErrorHandler();
  const [syncing, setSyncing] = useState(false);
  const [syncingNew, setSyncingNew] = useState(false);
  const [syncingOld, setSyncingOld] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingDetails, setSyncingDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [invoiceType, setInvoiceType] = useState<'pending' | 'closed'>('pending');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [stockProcessedFilter, setStockProcessedFilter] = useState<StockProcessedFilter>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [syncLimit, setSyncLimit] = useState<0 | 50 | 100 | 500>(0);
  const [invoiceRange, setInvoiceRange] = useState<{
    highest: number | string | null;
    lowest: number | string | null;
    totalInvoices: number;
  }>({highest: null, lowest: null, totalInvoices: 0});
  const [selectMode, setSelectMode] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [deletingAll, setDeletingAll] = useState(false);
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [autoSyncInterval] = useState(30);

  const resetKey = `${invoiceType}|${debouncedSearch}|${statusFilter}|${stockProcessedFilter}|${dateFrom}|${dateTo}`;

  // Server-side numbered pagination.
  const {
    items: invoices,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    loading,
    refreshing,
    error,
    refresh,
    refetch,
  } = useServerPagination<any>(
    async (pg, limit) => {
      const params: any = {
        page: pg,
        limit,
        invoiceType,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter) params.status = statusFilter;
      if (stockProcessedFilter !== '') params.stockProcessed = stockProcessedFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if ((dateFrom || dateTo) && invoiceType === 'closed') {
        params.dateField = 'dateCompleted';
      }
      try {
        const res = await invoiceService.getInvoices(token!, params);
        return {items: res.invoices, total: res.total, pages: res.totalPages};
      } catch (e) {
        await handleApiError(e);
        throw e;
      }
    },
    {pageSize: 20, resetKey, enabled: !!token},
  );

  const fetchInvoices = refetch;
  const onRefresh = refresh;

  // Invoice range banner (#lowest – #highest (total)).
  const fetchInvoiceRange = async () => {
    if (!token) return;
    try {
      const range = await invoiceService.getInvoiceRange(token, invoiceType);
      setInvoiceRange(range);
    } catch (e) {
      console.error('Error fetching invoice range:', e);
    }
  };
  useEffect(() => {
    fetchInvoiceRange();
    // Reset selection when switching tabs.
    setSelectMode(false);
    setSelectedInvoices([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, invoiceType]);

  useEffect(() => {
    if (!autoSyncEnabled || !token || !isAdmin) return;
    const intervalMs = autoSyncInterval * 60 * 1000;
    const autoSyncTimer = setInterval(async () => {
      if (!syncing) {
        try {
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
  }, [autoSyncEnabled, autoSyncInterval, syncing, token, invoiceType, isAdmin]);

  // Build a "Synced: X new, Y updated, Z skipped" summary, omitting any
  // count the backend didn't return (mirrors web PendingInvoices/ClosedInvoices).
  const buildSyncSummary = (data: any, detailsSynced?: number) => {
    if (!data) return 'Sync complete';
    const parts: string[] = [];
    if (data.created != null) parts.push(`${data.created} new`);
    if (data.updated != null) parts.push(`${data.updated} updated`);
    if (data.skipped != null) parts.push(`${data.skipped} skipped`);
    if (detailsSynced != null) parts.push(`${detailsSynced} details synced`);
    return parts.length ? `Synced: ${parts.join(', ')}` : 'Sync complete';
  };

  const handleSyncNew = async () => {
    if (!token) return;
    setSyncingNew(true);
    setSyncing(true);
    try {
      const response = invoiceType === 'pending'
        ? await invoiceService.syncPendingInvoices(token, syncLimit, 'new')
        : await invoiceService.syncClosedInvoices(token, syncLimit, 'new');
      if (response.success) {
        fetchInvoices();
        fetchInvoiceRange();
        Alert.alert('Sync complete', buildSyncSummary(response.data));
      }
    } catch (error: any) {
      console.error('Failed to sync new invoices:', error);
      await handleApiError(error);
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
        ? await invoiceService.syncPendingInvoices(token, syncLimit, 'old')
        : await invoiceService.syncClosedInvoices(token, syncLimit, 'old');
      if (response.success) {
        fetchInvoices();
        fetchInvoiceRange();
        Alert.alert('Sync complete', buildSyncSummary(response.data));
      }
    } catch (error: any) {
      console.error('Failed to sync old invoices:', error);
      await handleApiError(error);
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
        ? await invoiceService.syncPendingInvoices(token, syncLimit, 'new')
        : await invoiceService.syncClosedInvoices(token, syncLimit, 'new');
      if (invoicesResponse.success) {
        let detailsSynced: number | undefined;
        try {
          const detailsResponse = await invoiceService.syncAllInvoiceDetails(token, invoiceType, 0);
          detailsSynced = detailsResponse?.data?.synced;
        } catch (detailsError) {
          console.error('Error syncing details:', detailsError);
        }
        fetchInvoices();
        fetchInvoiceRange();
        Alert.alert('Sync complete', buildSyncSummary(invoicesResponse.data, detailsSynced));
      }
    } catch (error: any) {
      console.error('Failed to sync all invoices:', error);
      await handleApiError(error);
    } finally {
      setSyncingAll(false);
      setSyncing(false);
    }
  };
  // Details-only sync (line items) for the current tab.
  const handleSyncDetails = async () => {
    if (!token) return;
    setSyncingDetails(true);
    setSyncing(true);
    try {
      const response = invoiceType === 'pending'
        ? await invoiceService.syncPendingInvoiceDetails(token, 0)
        : await invoiceService.syncClosedInvoiceDetails(token, 0);
      if (response.success) {
        fetchInvoices();
        const parts: string[] = [];
        if (response.data?.synced != null) parts.push(`${response.data.synced} details synced`);
        if (response.data?.skipped != null) parts.push(`${response.data.skipped} skipped`);
        Alert.alert('Sync complete', parts.length ? parts.join(', ') : 'Details sync complete');
      }
    } catch (error: any) {
      console.error('Failed to sync invoice details:', error);
      await handleApiError(error);
    } finally {
      setSyncingDetails(false);
      setSyncing(false);
    }
  };
  // Admin: clear all invoices for the active tab.
  const handleClearAll = () => {
    if (!token || !isAdmin) return;
    const label = invoiceType === 'pending' ? 'pending' : 'closed';
    Alert.alert(
      'Confirm Deletion',
      `Are you sure you want to delete all ${total} ${label} invoices? This action cannot be undone.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Yes, Delete All',
          style: 'destructive',
          onPress: async () => {
            setDeletingAll(true);
            try {
              const res = invoiceType === 'pending'
                ? await invoiceService.deleteAllPendingInvoices(token)
                : await invoiceService.deleteAllClosedInvoices(token);
              if (res.success) {
                fetchInvoices();
                fetchInvoiceRange();
              }
            } catch (error: any) {
              console.error('Failed to delete invoices:', error);
              await handleApiError(error);
            } finally {
              setDeletingAll(false);
            }
          },
        },
      ],
    );
  };
  // Admin: delete a single manual invoice.
  const handleDeleteManual = (invoiceNumber: string) => {
    if (!token || !isAdmin) return;
    Alert.alert(
      'Delete Manual Invoice',
      `Delete manual invoice ${invoiceNumber}? This action cannot be undone.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await invoiceService.deleteManualInvoice(token, invoiceNumber);
              fetchInvoices();
              fetchInvoiceRange();
            } catch (error: any) {
              console.error('Failed to delete manual invoice:', error);
              await handleApiError(error);
            }
          },
        },
      ],
    );
  };
  // Admin (closed tab): bulk delete selected invoices by number.
  const toggleSelectInvoice = (invoiceNumber: string) => {
    setSelectedInvoices((prev) =>
      prev.includes(invoiceNumber)
        ? prev.filter((n) => n !== invoiceNumber)
        : [...prev, invoiceNumber],
    );
  };
  const handleBulkDelete = () => {
    if (!token || !isAdmin || selectedInvoices.length === 0) return;
    Alert.alert(
      'Delete Selected Invoices',
      `Permanently delete ${selectedInvoices.length} selected invoice(s)? This action cannot be undone.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete Selected',
          style: 'destructive',
          onPress: async () => {
            setDeletingBulk(true);
            try {
              const res = await invoiceService.deleteBulkClosedInvoicesByNumbers(
                token,
                selectedInvoices,
              );
              if (res.success) {
                setSelectedInvoices([]);
                setSelectMode(false);
                fetchInvoices();
                fetchInvoiceRange();
              }
            } catch (error: any) {
              console.error('Failed to bulk delete invoices:', error);
              await handleApiError(error);
            } finally {
              setDeletingBulk(false);
            }
          },
        },
      ],
    );
  };
  const handleInvoicePress = (invoice: any) => {
    const invoiceIdentifier = invoice.invoiceNumber || invoice._id || invoice.id;
    setSelectedInvoiceId(invoiceIdentifier);
    setDetailModalVisible(true);
  };
  const handleCloseDetail = () => {
    setDetailModalVisible(false);
    setSelectedInvoiceId(null);
    fetchInvoices();
  };
  const formatCurrency = (amount: number) => {
    return `$${(amount || 0).toFixed(2)}`;
  };
  const getStatusColor = (status: string) => {
    const colors: {[key: string]: string} = {
      pending: theme.colors.primary[600],
      completed: theme.colors.success[600],
      closed: theme.colors.primary[600],
      cancelled: theme.colors.error[600],
    };
    return colors[status?.toLowerCase()] || theme.colors.gray[500];
  };
  const getStatusBgColor = (status: string) => {
    const colors: {[key: string]: string} = {
      pending: theme.colors.primary[100],
      completed: theme.colors.success[100],
      closed: theme.colors.primary[100],
      cancelled: theme.colors.error[100],
    };
    return colors[status?.toLowerCase()] || theme.colors.gray[100];
  };
  if (loading && !refreshing && invoices.length === 0) {
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
      <PaginatedList
        data={invoices}
        keyExtractor={(item, index) => item._id || String(index)}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshing={refreshing}
        onRefresh={onRefresh}
        resetKey={resetKey}
        pagedMode
        scrollTopKey={page}
        ItemSeparatorComponent={() => <View style={{height: 12}} />}
        ListFooterComponent={
          total > 0 ? (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={total}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          ) : null
        }
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View style={styles.header}>
              <Typography variant="h2" weight="bold" style={styles.headerTitle}>
                Invoices
              </Typography>
              <Typography
                variant="body"
                color={theme.colors.gray[500]}
                style={styles.headerSubtitle}>
                {total} {total === 1 ? 'invoice' : 'invoices'} found
              </Typography>
              {invoiceRange.highest ? (
                <Typography
                  variant="caption"
                  color={theme.colors.gray[500]}
                  style={styles.rangeBanner}>
                  Range: #{invoiceRange.lowest} – #{invoiceRange.highest} ({invoiceRange.totalInvoices} total)
                </Typography>
              ) : null}
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

            {/* Sync Buttons (admin only) */}
            {isAdmin && (
              <>
                <View style={styles.syncButtonsContainer}>
                  <TouchableOpacity
                    onPress={handleSyncNew}
                    disabled={syncing}
                    style={[
                      styles.syncActionButton,
                      styles.syncNewButton,
                      syncing && styles.syncButtonDisabled,
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
                      syncing && styles.syncButtonDisabled,
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
                      syncing && styles.syncButtonDisabled,
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

                {/* Details-only sync */}
                <View style={styles.syncButtonsContainer}>
                  <TouchableOpacity
                    onPress={handleSyncDetails}
                    disabled={syncing}
                    style={[
                      styles.syncActionButton,
                      styles.syncDetailsButton,
                      syncing && styles.syncButtonDisabled,
                    ]}>
                    {syncingDetails ? (
                      <ActivityIndicator size="small" color={theme.colors.white} />
                    ) : (
                      <Typography variant="small" weight="semibold" color={theme.colors.white}>
                        ⤓ Sync Details
                      </Typography>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Sync Limit Control */}
                <View style={styles.syncLimitContainer}>
                  <Typography variant="small" weight="semibold" color={theme.colors.gray[700]} style={styles.syncLimitLabel}>
                    Sync Limit
                  </Typography>
                  <View style={styles.syncLimitChips}>
                    {([
                      {label: 'AUTO', value: 0 as const},
                      {label: '50', value: 50 as const},
                      {label: '100', value: 100 as const},
                      {label: '500', value: 500 as const},
                    ]).map((opt) => (
                      <TouchableOpacity
                        key={opt.label}
                        style={[
                          styles.filterChip,
                          syncLimit === opt.value && styles.filterChipActive,
                        ]}
                        onPress={() => setSyncLimit(opt.value)}>
                        <Typography
                          variant="small"
                          weight="semibold"
                          color={syncLimit === opt.value ? theme.colors.white : theme.colors.gray[600]}>
                          {opt.label}
                        </Typography>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Typography variant="caption" color={theme.colors.gray[500]} style={{marginTop: 4}}>
                    AUTO (0) only syncs new invoices since last sync.
                  </Typography>
                </View>

                {/* Danger Zone: Clear All */}
                <View style={styles.dangerZone}>
                  <Button
                    title={`Clear All (${total})`}
                    variant="danger"
                    size="sm"
                    fullWidth
                    loading={deletingAll}
                    disabled={total === 0 || deletingAll}
                    leftIcon={<TrashIcon size={16} color={theme.colors.white} />}
                    onPress={handleClearAll}
                  />
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
                      trackColor={{false: theme.colors.gray[300], true: theme.colors.primary[400]}}
                      thumbColor={autoSyncEnabled ? theme.colors.primary[600] : theme.colors.gray[50]}
                    />
                  </View>
                </View>
              </>
            )}

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <RNTextInput
                style={styles.searchInput}
                placeholder="Search invoice or customer"
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={theme.colors.gray[400]}
              />
            </View>
            {/* Date Range Filters */}
            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Typography variant="small" weight="semibold" style={styles.filterLabel}>
                  From Date
                </Typography>
                <RNTextInput
                  style={styles.searchInput}
                  placeholder="YYYY-MM-DD"
                  value={dateFrom}
                  onChangeText={setDateFrom}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor={theme.colors.gray[400]}
                />
              </View>
              <View style={styles.dateField}>
                <Typography variant="small" weight="semibold" style={styles.filterLabel}>
                  To Date
                </Typography>
                <RNTextInput
                  style={styles.searchInput}
                  placeholder="YYYY-MM-DD"
                  value={dateTo}
                  onChangeText={setDateTo}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor={theme.colors.gray[400]}
                />
              </View>
            </View>
            {/* Stat Cards */}
            <View style={styles.statsRow}>
              <Card variant="elevated" padding="md" style={styles.statCard}>
                <Typography variant="caption" color={theme.colors.gray[500]}>
                  Total
                </Typography>
                <Typography variant="h3" weight="bold" color={theme.colors.text.primary} style={styles.statValue}>
                  {total}
                </Typography>
              </Card>
              <Card variant="elevated" padding="md" style={styles.statCard}>
                <Typography variant="caption" color={theme.colors.gray[500]}>
                  Processed
                </Typography>
                <Typography variant="h3" weight="bold" color={theme.colors.success[600]} style={styles.statValue}>
                  {invoices.filter((i: any) => i.stockProcessed).length}
                </Typography>
              </Card>
              <Card variant="elevated" padding="md" style={styles.statCard}>
                <Typography variant="caption" color={theme.colors.gray[500]}>
                  Pending Processing
                </Typography>
                <Typography variant="h3" weight="bold" color={theme.colors.primary[600]} style={styles.statValue}>
                  {invoices.filter((i: any) => !i.stockProcessed).length}
                </Typography>
              </Card>
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
                    {label: 'Pending', value: 'Pending'},
                    {label: 'Completed', value: 'Completed'},
                    {label: 'Closed', value: 'Closed'},
                    {label: 'Cancelled', value: 'Cancelled'},
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
            {/* Stock Processed Filter */}
            <View style={styles.filterSection}>
              <Typography variant="small" weight="semibold" style={styles.filterLabel}>
                Stock Processed
              </Typography>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                <View style={styles.filterChips}>
                  {[
                    {label: 'All Invoices', value: ''},
                    {label: 'Stock Processed', value: 'true'},
                    {label: 'Not Processed', value: 'false'},
                  ].map((filter) => (
                    <TouchableOpacity
                      key={filter.value}
                      style={[
                        styles.filterChip,
                        stockProcessedFilter === filter.value && styles.filterChipActive,
                      ]}
                      onPress={() => setStockProcessedFilter(filter.value as StockProcessedFilter)}>
                      <Typography
                        variant="small"
                        weight="semibold"
                        color={
                          stockProcessedFilter === filter.value
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
            {/* Select / Bulk-delete bar (admin, closed tab only) */}
            {isAdmin && invoiceType === 'closed' && total > 0 && (
              <View style={styles.selectBar}>
                <Button
                  title={selectMode ? 'Cancel Select' : 'Select'}
                  variant={selectMode ? 'secondary' : 'outline'}
                  size="sm"
                  onPress={() => {
                    setSelectMode((m) => !m);
                    setSelectedInvoices([]);
                  }}
                />
                {selectMode && (
                  <Button
                    title={`Delete Selected (${selectedInvoices.length})`}
                    variant="danger"
                    size="sm"
                    loading={deletingBulk}
                    disabled={selectedInvoices.length === 0 || deletingBulk}
                    leftIcon={<TrashIcon size={16} color={theme.colors.white} />}
                    onPress={handleBulkDelete}
                  />
                )}
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
          </View>
        }
        ListEmptyComponent={
          error ? null : (
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
                {searchQuery || statusFilter || stockProcessedFilter
                  ? 'Try adjusting your filters'
                  : 'No invoices to display'}
              </Typography>
            </Card>
          )
        }
        renderItem={({item: invoice}) => {
          const invNum = invoice.invoiceNumber;
          const isManual = invoice.source === 'manual';
          const isSelectable = isAdmin && invoiceType === 'closed' && selectMode;
          const isSelected = selectedInvoices.includes(invNum);
          return (
          <TouchableOpacity
            onPress={() =>
              isSelectable ? toggleSelectInvoice(invNum) : handleInvoicePress(invoice)
            }>
            <Card
              variant="elevated"
              padding="none"
              style={[styles.invoiceCard, isSelected && styles.invoiceCardSelected]}>
              {/* Invoice Header */}
              <View style={styles.invoiceHeader}>
                <View style={styles.invoiceHeaderLeft}>
                  {isSelectable && (
                    <Checkbox
                      checked={isSelected}
                      onChange={() => toggleSelectInvoice(invNum)}
                    />
                  )}
                  <View style={styles.iconContainer}>
                    <FileTextIcon size={20} color={theme.colors.primary[600]} />
                  </View>
                  <View style={styles.invoiceHeaderInfo}>
                    <View style={styles.invoiceNumberRow}>
                      <Typography
                        variant="body"
                        weight="bold"
                        style={styles.invoiceNumber}>
                        {invoice.invoiceNumber}
                      </Typography>
                      {isManual && (
                        <View style={styles.manualBadge}>
                          <Typography variant="caption" weight="semibold" color={theme.colors.primary[700]}>
                            MANUAL
                          </Typography>
                        </View>
                      )}
                    </View>
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
                    {formatCurrency(invoice.total || invoice.totalAmount)}
                  </Typography>
                  <Typography
                    variant="caption"
                    color={theme.colors.gray[500]}>
                    {formatDate(invoice.invoiceDate || invoice.date || invoice.createdAt)}
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
                      {invoice.status || 'Pending'}
                    </Typography>
                  </View>
                </View>
                {invoice.dateCompleted && (
                  <View style={styles.detailRow}>
                    <Typography variant="caption" color={theme.colors.gray[500]}>
                      Completed
                    </Typography>
                    <Typography variant="caption" color={theme.colors.gray[700]}>
                      {formatDate(invoice.dateCompleted)}
                    </Typography>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Typography variant="caption" color={theme.colors.gray[500]}>
                    Stock
                  </Typography>
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: invoice.stockProcessed
                          ? theme.colors.success[100]
                          : theme.colors.primary[100],
                      },
                    ]}>
                    <Typography
                      variant="caption"
                      weight="semibold"
                      color={
                        invoice.stockProcessed
                          ? theme.colors.success[600]
                          : theme.colors.primary[600]
                      }>
                      {invoice.stockProcessed ? 'Processed' : 'Pending'}
                    </Typography>
                  </View>
                </View>
                {isAdmin && isManual && (
                  <View style={styles.rowActions}>
                    <Button
                      title="Delete"
                      variant="danger"
                      size="sm"
                      leftIcon={<TrashIcon size={14} color={theme.colors.white} />}
                      onPress={() => handleDeleteManual(invNum)}
                    />
                  </View>
                )}
              </View>
            </Card>
          </TouchableOpacity>
          );
        }}
      />
      {/* Invoice Detail Modal */}
      <InvoiceDetailScreen
        visible={detailModalVisible}
        invoiceId={selectedInvoiceId}
        onClose={handleCloseDetail}
      />
    </SafeAreaView>
  );
};
const makeStyles = (theme: Theme, bp: BreakpointInfo) => {
  const actionBtnMaxWidth = bp.isWide ? 560 : bp.isDesktop ? 480 : undefined;
  const btnPadScale = bp.isWide ? 1.3 : bp.isDesktop ? 1.15 : 1;
  const rb = (n: number) => Math.round(n);
  return StyleSheet.create({
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
    paddingHorizontal: bp.gutter,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
    maxWidth: bp.contentMaxWidth,
    width: '100%',
    alignSelf: 'center',
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
  rangeBanner: {
    marginTop: theme.spacing.xs,
  },
  syncLimitContainer: {
    marginBottom: theme.spacing.md,
  },
  syncLimitLabel: {
    marginBottom: theme.spacing.xs,
  },
  syncLimitChips: {
    flexDirection: 'row',
    gap: 8,
  },
  dangerZone: {
    marginBottom: theme.spacing.md,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: theme.spacing.md,
  },
  dateField: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    borderRadius: theme.borderRadius.xl,
  },
  statValue: {
    marginTop: theme.spacing.xs,
  },
  selectBar: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  invoiceCardSelected: {
    borderWidth: 2,
    borderColor: theme.colors.primary[500],
  },
  invoiceNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  manualBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary[100],
  },
  rowActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: theme.spacing.xs,
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
    maxWidth: actionBtnMaxWidth,
    alignSelf: actionBtnMaxWidth ? 'center' : 'stretch',
    width: '100%',
  },
  syncActionButton: {
    flex: 1,
    paddingVertical: rb(12 * btnPadScale),
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
  syncDetailsButton: {
    backgroundColor: theme.colors.primary[500],
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
    marginHorizontal: -bp.gutter,
    paddingHorizontal: bp.gutter,
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
};
