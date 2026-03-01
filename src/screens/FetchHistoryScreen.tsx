import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {Button} from '../components/atoms/Button';
import {PickerModal} from '../components/molecules/PickerModal';
import {useAuth} from '../contexts/AuthContext';
import {useApiErrorHandler} from '../hooks/useApiErrorHandler';
import {theme} from '../theme';
import fetchHistoryService from '../services/fetchHistoryService';
import {
  AlertCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  CheckCircleIcon,
  WarningIcon,
  ClipboardIcon,
  RefreshIcon,
} from '../components/icons';

interface FetchHistoryScreenProps {
  visible: boolean;
  onClose: () => void;
}

export const FetchHistoryScreen: React.FC<FetchHistoryScreenProps> = ({
  visible,
  onClose,
}) => {
  const {token, user} = useAuth();
  const {handleApiError} = useApiErrorHandler();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [activeFetches, setActiveFetches] = useState<any[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterSource, setFilterSource] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDays, setFilterDays] = useState(10);

  // Picker modals
  const [sourcePickerVisible, setSourcePickerVisible] = useState(false);
  const [statusPickerVisible, setStatusPickerVisible] = useState(false);
  const [daysPickerVisible, setDaysPickerVisible] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    activeCount: 0,
    todayCount: 0,
    successRate: 100,
    totalCompleted: 0,
    totalFailed: 0,
  });

  useEffect(() => {
    if (visible && token) {
      loadData();
    }
  }, [visible, token, filterSource, filterStatus, filterDays]);

  // Auto-refresh every 30 seconds when screen is visible
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (visible && token) {
      interval = setInterval(() => {
        loadData(true); // Silent refresh
      }, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [visible, token, filterSource, filterStatus, filterDays]);

  const loadData = async (silent = false) => {
    if (!token) return;

    try {
      if (!silent) setLoading(true);
      setError(null);

      const params: any = {
        page: 1,
        limit: 100,
        days: filterDays,
      };

      if (filterSource) params.source = filterSource;
      if (filterStatus) params.status = filterStatus;

      const [historyData, activeFetchesData, statsData] = await Promise.all([
        fetchHistoryService.getHistory(token, params),
        fetchHistoryService.getActiveFetches(token, filterSource),
        fetchHistoryService.getStatistics(token, filterSource, filterDays),
      ]);

      setHistory(historyData.history || []);
      setActiveFetches(activeFetchesData || []);
      setStats(statsData || {
        activeCount: 0,
        todayCount: 0,
        successRate: 100,
        totalCompleted: 0,
        totalFailed: 0,
      });
    } catch (error: any) {
      console.error('Failed to fetch history:', error);

      const wasHandled = await handleApiError(error);
      if (wasHandled) return;

      if (!silent) setError(error.message || 'Failed to load data');
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

  const handleCancelFetch = (fetch: any) => {
    if (user?.role !== 'admin') {
      Alert.alert('Permission Denied', 'Only admins can cancel fetch operations');
      return;
    }

    Alert.alert(
      'Cancel Fetch',
      `Are you sure you want to cancel this fetch operation?`,
      [
        {text: 'No', style: 'cancel'},
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetchHistoryService.cancelFetch(token!, fetch._id);
              Alert.alert('Success', 'Fetch operation cancelled');
              loadData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to cancel fetch');
            }
          },
        },
      ]
    );
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'customer_connect':
        return 'Customer Connect';
      case 'routestar_invoices':
        return 'RouteStar Invoices';
      case 'routestar_items':
        return 'RouteStar Items';
      default:
        return source;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'customer_connect':
        return theme.colors.primary[600];
      case 'routestar_invoices':
        return theme.colors.success[600];
      case 'routestar_items':
        return theme.colors.warning[600];
      default:
        return theme.colors.gray[600];
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return theme.colors.success[600];
      case 'in_progress':
        return theme.colors.primary[600];
      case 'failed':
        return theme.colors.error[600];
      case 'cancelled':
        return theme.colors.gray[600];
      default:
        return theme.colors.gray[600];
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'completed':
        return theme.colors.success[100];
      case 'in_progress':
        return theme.colors.primary[100];
      case 'failed':
        return theme.colors.error[100];
      case 'cancelled':
        return theme.colors.gray[200];
      default:
        return theme.colors.gray[100];
    }
  };

  const formatDuration = (ms: number) => {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const sourceOptions = [
    {label: 'All Sources', value: ''},
    {label: 'Customer Connect', value: 'customer_connect'},
    {label: 'RouteStar Invoices', value: 'routestar_invoices'},
    {label: 'RouteStar Items', value: 'routestar_items'},
  ];

  const statusOptions = [
    {label: 'All Status', value: ''},
    {label: 'In Progress', value: 'in_progress'},
    {label: 'Completed', value: 'completed'},
    {label: 'Failed', value: 'failed'},
    {label: 'Cancelled', value: 'cancelled'},
  ];

  const daysOptions = [
    {label: 'Last 24 hours', value: 1},
    {label: 'Last 3 days', value: 3},
    {label: 'Last 7 days', value: 7},
    {label: 'Last 10 days', value: 10},
  ];

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
            Fetch History
          </Typography>
          <TouchableOpacity onPress={() => loadData()} style={styles.refreshButton}>
            <RefreshIcon size={20} color={theme.colors.primary[600]} />
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary[600]} />
            <Typography
              variant="body"
              color={theme.colors.gray[600]}
              style={{marginTop: 16}}>
              Loading history...
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
                <View style={[styles.statCard, {backgroundColor: theme.colors.warning[600]}]}>
                  <ClockIcon size={18} color={theme.colors.white} />
                  <Typography variant="caption" style={styles.statLabel}>
                    Active Fetches
                  </Typography>
                  <Typography variant="h2" weight="bold" style={styles.statValue}>
                    {stats.activeCount}
                  </Typography>
                  <Typography variant="caption" style={styles.statSubtitle}>
                    Currently running
                  </Typography>
                </View>
              </View>

              <View style={styles.statCardWrapper}>
                <View style={[styles.statCard, {backgroundColor: theme.colors.primary[600]}]}>
                  <ClipboardIcon size={18} color={theme.colors.white} />
                  <Typography variant="caption" style={styles.statLabel}>
                    Today's Fetches
                  </Typography>
                  <Typography variant="h2" weight="bold" style={styles.statValue}>
                    {stats.todayCount}
                  </Typography>
                  <Typography variant="caption" style={styles.statSubtitle}>
                    Syncs today
                  </Typography>
                </View>
              </View>

              <View style={styles.statCardWrapper}>
                <View style={[styles.statCard, {backgroundColor: theme.colors.success[600]}]}>
                  <CheckCircleIcon size={18} color={theme.colors.white} />
                  <Typography variant="caption" style={styles.statLabel}>
                    Success Rate
                  </Typography>
                  <Typography variant="h2" weight="bold" style={styles.statValue}>
                    {stats.successRate.toFixed(0)}%
                  </Typography>
                  <Typography variant="caption" style={styles.statSubtitle}>
                    {stats.totalCompleted} completed, {stats.totalFailed} failed
                  </Typography>
                </View>
              </View>

              <View style={styles.statCardWrapper}>
                <View style={[styles.statCard, {backgroundColor: theme.colors.gray[600]}]}>
                  <RefreshIcon size={18} color={theme.colors.white} />
                  <Typography variant="caption" style={styles.statLabel}>
                    Total Operations
                  </Typography>
                  <Typography variant="h2" weight="bold" style={styles.statValue}>
                    {stats.totalCompleted + stats.totalFailed}
                  </Typography>
                  <Typography variant="caption" style={styles.statSubtitle}>
                    Last {filterDays} days
                  </Typography>
                </View>
              </View>
            </View>

            {/* Active Fetches Section */}
            {activeFetches.length > 0 && (
              <Card variant="elevated" padding="md" style={styles.activeFetchesCard}>
                <Typography variant="small" weight="bold" style={{marginBottom: 12}}>
                  Active Fetches ({activeFetches.length})
                </Typography>
                {activeFetches.map((fetch) => (
                  <View key={fetch._id} style={styles.activeFetchItem}>
                    <View style={styles.activeFetchLeft}>
                      <View style={styles.activeFetchIcon}>
                        <ClockIcon size={16} color={theme.colors.primary[600]} />
                      </View>
                      <View style={{flex: 1}}>
                        <Typography variant="small" weight="semibold">
                          {getSourceLabel(fetch.source)}
                        </Typography>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          Started: {formatDate(fetch.startedAt)}
                        </Typography>
                      </View>
                    </View>
                    {user?.role === 'admin' && (
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => handleCancelFetch(fetch)}>
                        <Typography variant="caption" color={theme.colors.error[600]} weight="semibold">
                          Cancel
                        </Typography>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </Card>
            )}

            {/* Filters */}
            <Card variant="elevated" padding="md" style={styles.filterCard}>
              <Typography variant="small" weight="bold" style={{marginBottom: 12}}>
                Filters
              </Typography>

              <View style={styles.filterRow}>
                <View style={styles.filterItem}>
                  <Typography variant="caption" color={theme.colors.gray[600]} style={{marginBottom: 4}}>
                    Source
                  </Typography>
                  <TouchableOpacity
                    style={styles.filterButton}
                    onPress={() => setSourcePickerVisible(true)}>
                    <Typography variant="small" numberOfLines={1}>
                      {filterSource ? getSourceLabel(filterSource) : 'All Sources'}
                    </Typography>
                    <ChevronDownIcon size={16} color={theme.colors.gray[400]} />
                  </TouchableOpacity>
                </View>

                <View style={styles.filterItem}>
                  <Typography variant="caption" color={theme.colors.gray[600]} style={{marginBottom: 4}}>
                    Status
                  </Typography>
                  <TouchableOpacity
                    style={styles.filterButton}
                    onPress={() => setStatusPickerVisible(true)}>
                    <Typography variant="small" numberOfLines={1}>
                      {filterStatus ? filterStatus.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'All Status'}
                    </Typography>
                    <ChevronDownIcon size={16} color={theme.colors.gray[400]} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.filterRow}>
                <View style={styles.filterItem}>
                  <Typography variant="caption" color={theme.colors.gray[600]} style={{marginBottom: 4}}>
                    Time Period
                  </Typography>
                  <TouchableOpacity
                    style={styles.filterButton}
                    onPress={() => setDaysPickerVisible(true)}>
                    <Typography variant="small" numberOfLines={1}>
                      {daysOptions.find(d => d.value === filterDays)?.label || 'Last 10 days'}
                    </Typography>
                    <ChevronDownIcon size={16} color={theme.colors.gray[400]} />
                  </TouchableOpacity>
                </View>
              </View>
            </Card>

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
            {!error && history.length === 0 && (
              <Card variant="outlined" padding="lg" style={styles.emptyCard}>
                <ClipboardIcon size={48} color={theme.colors.gray[400]} />
                <Typography
                  variant="h3"
                  weight="semibold"
                  color={theme.colors.gray[700]}
                  style={styles.emptyTitle}>
                  No fetch history
                </Typography>
                <Typography
                  variant="body"
                  color={theme.colors.gray[500]}
                  align="center">
                  No sync operations found for the selected filters
                </Typography>
              </Card>
            )}

            {/* History List */}
            <View style={styles.historyList}>
              <Typography variant="small" weight="bold" style={{marginBottom: 12}}>
                Fetch History ({history.length} records)
              </Typography>
              {history.map((item, index) => {
                const isExpanded = expandedItems.has(item._id);

                return (
                  <Card
                    key={item._id || index}
                    variant="elevated"
                    padding="none"
                    style={styles.historyCard}>
                    <TouchableOpacity
                      onPress={() => handleItemPress(item._id)}
                      style={styles.historyHeader}>
                      <View style={styles.historyHeaderLeft}>
                        <View style={styles.chevronContainer}>
                          {isExpanded ? (
                            <ChevronDownIcon size={20} color={theme.colors.gray[600]} />
                          ) : (
                            <ChevronRightIcon size={20} color={theme.colors.gray[600]} />
                          )}
                        </View>
                        <View style={styles.historyInfo}>
                          <Typography variant="body" weight="bold" numberOfLines={1} color={getSourceColor(item.source)}>
                            {getSourceLabel(item.source)}
                          </Typography>
                          <Typography variant="caption" color={theme.colors.gray[500]} numberOfLines={1}>
                            {item.fetchType}
                          </Typography>
                        </View>
                      </View>
                      <View style={styles.historyHeaderRight}>
                        <View style={[styles.statusBadge, {backgroundColor: getStatusBgColor(item.status)}]}>
                          <Typography
                            variant="caption"
                            weight="semibold"
                            color={getStatusColor(item.status)}>
                            {item.status.replace('_', ' ')}
                          </Typography>
                        </View>
                      </View>
                    </TouchableOpacity>

                    {/* History Meta */}
                    <View style={styles.historyMeta}>
                      <View style={styles.metaRow}>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          Started
                        </Typography>
                        <Typography variant="small" weight="medium">
                          {formatDate(item.startedAt)}
                        </Typography>
                      </View>
                      <View style={styles.metaRow}>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          Duration
                        </Typography>
                        <Typography variant="small" weight="medium">
                          {formatDuration(item.duration)}
                        </Typography>
                      </View>
                      {item.results && (
                        <View style={styles.metaRow}>
                          <Typography variant="caption" color={theme.colors.gray[500]}>
                            Results
                          </Typography>
                          <Typography variant="small" weight="medium">
                            Fetched: {item.results.totalFetched || 0}
                          </Typography>
                        </View>
                      )}
                    </View>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <View style={styles.expandedContent}>
                        {item.results && (
                          <View style={styles.resultsSection}>
                            <Typography variant="small" weight="semibold" style={{marginBottom: 8}}>
                              Detailed Results
                            </Typography>
                            <View style={styles.resultRow}>
                              <Typography variant="caption" color={theme.colors.gray[600]}>
                                Created:
                              </Typography>
                              <Typography variant="small" weight="medium">
                                {item.results.created || 0}
                              </Typography>
                            </View>
                            <View style={styles.resultRow}>
                              <Typography variant="caption" color={theme.colors.gray[600]}>
                                Updated:
                              </Typography>
                              <Typography variant="small" weight="medium">
                                {item.results.updated || 0}
                              </Typography>
                            </View>
                            {item.results.detailsSynced !== undefined && (
                              <View style={styles.resultRow}>
                                <Typography variant="caption" color={theme.colors.gray[600]}>
                                  Details Synced:
                                </Typography>
                                <Typography variant="small" weight="medium">
                                  {item.results.detailsSynced}
                                </Typography>
                              </View>
                            )}
                            {item.results.failed > 0 && (
                              <View style={styles.resultRow}>
                                <Typography variant="caption" color={theme.colors.error[600]}>
                                  Failed:
                                </Typography>
                                <Typography variant="small" weight="medium" color={theme.colors.error[600]}>
                                  {item.results.failed}
                                </Typography>
                              </View>
                            )}
                          </View>
                        )}

                        {item.errorMessage && (
                          <View style={styles.errorSection}>
                            <Typography variant="small" weight="semibold" color={theme.colors.error[700]} style={{marginBottom: 4}}>
                              Error
                            </Typography>
                            <Typography variant="caption" color={theme.colors.error[600]}>
                              {item.errorMessage}
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

        {/* Picker Modals */}
        <PickerModal
          visible={sourcePickerVisible}
          onClose={() => setSourcePickerVisible(false)}
          items={sourceOptions}
          selectedValue={filterSource}
          onValueChange={(value) => {
            setFilterSource(value);
            setSourcePickerVisible(false);
          }}
          placeholder="Select Source"
          getLabel={(item) => item.label}
          getValue={(item) => item.value}
        />

        <PickerModal
          visible={statusPickerVisible}
          onClose={() => setStatusPickerVisible(false)}
          items={statusOptions}
          selectedValue={filterStatus}
          onValueChange={(value) => {
            setFilterStatus(value);
            setStatusPickerVisible(false);
          }}
          placeholder="Select Status"
          getLabel={(item) => item.label}
          getValue={(item) => item.value}
        />

        <PickerModal
          visible={daysPickerVisible}
          onClose={() => setDaysPickerVisible(false)}
          items={daysOptions}
          selectedValue={filterDays}
          onValueChange={(value) => {
            setFilterDays(value);
            setDaysPickerVisible(false);
          }}
          placeholder="Select Time Period"
          getLabel={(item) => item.label}
          getValue={(item) => item.value}
        />
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
    minHeight: 110,
  },
  statLabel: {
    color: '#ffffff',
    fontSize: theme.typography.fontSizes.xs,  // 11
    opacity: 0.9,
    marginTop: 6,
    marginBottom: 4,
  },
  statValue: {
    color: '#ffffff',
    fontSize: theme.typography.fontSizes.xl,  // 18 instead of 22
    marginBottom: 4,
  },
  statSubtitle: {
    color: '#ffffff',
    fontSize: theme.typography.fontSizes.xs,  // 11 instead of 10
    opacity: 0.85,
  },
  activeFetchesCard: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.primary[50],
  },
  activeFetchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.primary[100],
  },
  activeFetchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  activeFetchIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: theme.colors.error[100],
  },
  filterCard: {
    marginBottom: theme.spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  filterItem: {
    flex: 1,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.gray[100],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
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
  historyList: {
    gap: theme.spacing.md,
  },
  historyCard: {
    marginBottom: 0,
    overflow: 'hidden',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
  },
  historyHeaderLeft: {
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
  historyInfo: {
    flex: 1,
  },
  historyHeaderRight: {
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  historyMeta: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
    padding: theme.spacing.md,
    backgroundColor: theme.colors.gray[50],
  },
  resultsSection: {
    marginBottom: theme.spacing.sm,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  errorSection: {
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.error[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.error[200],
  },
});
