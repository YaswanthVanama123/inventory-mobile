import React, {useMemo, useState} from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {Button} from '../components/atoms/Button';
import {PaginatedList} from '../components/molecules/PaginatedList';
import {Pagination} from '../components/molecules/Pagination';
import {useAuth} from '../contexts/AuthContext';
import {useApiErrorHandler} from '../hooks/useApiErrorHandler';
import {useTheme} from '../contexts/ThemeContext';
import {Theme} from '../theme';
import {useBreakpoint, BreakpointInfo} from '../utils/breakpoints';
import {useServerPagination} from '../hooks/useServerPagination';
import quickBooksSyncService, {
  QbSyncStats,
  QbSyncQueueRecord,
} from '../services/quickBooksSyncService';
import {
  AlertCircleIcon,
  ClockIcon,
  RefreshIcon,
  CheckCircleIcon,
  WarningIcon,
  BoxIcon,
} from '../components/icons';

interface QuickBooksSyncScreenProps {
  visible: boolean;
  onClose: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  synced: 'Synced',
  failed: 'Failed',
};

const TYPE_LABELS: Record<string, string> = {
  stock_update: 'Stock Update',
  discrepancy_adjustment: 'Discrepancy',
};

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '-' : d.toLocaleString();
};

export const QuickBooksSyncScreen: React.FC<QuickBooksSyncScreenProps> = ({
  visible,
  onClose,
}) => {
  const theme = useTheme();
  const bp = useBreakpoint();
  const styles = useMemo(() => makeStyles(theme, bp), [theme, bp]);
  const {token, user} = useAuth();
  const {handleApiError} = useApiErrorHandler();
  const isAdmin = user?.role === 'admin';

  const [stats, setStats] = useState<QbSyncStats | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  const {
    items: queue,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    loading,
    initialLoading,
    refreshing,
    error,
    refresh,
    refetch,
  } = useServerPagination<QbSyncQueueRecord>(
    async (pg, limit) => {
      try {
        const [statsResp, queueResp] = await Promise.all([
          quickBooksSyncService.getStats(token!),
          quickBooksSyncService.getQueue(token!, {
            status: statusFilter || undefined,
            page: pg,
            limit,
          }),
        ]);
        setStats(statsResp);
        return {items: queueResp.items, total: queueResp.total};
      } catch (e) {
        await handleApiError(e);
        throw e;
      }
    },
    {pageSize: 20, resetKey: statusFilter, enabled: !!(visible && token)},
  );

  const loadData = refetch;
  const onRefresh = refresh;

  const statusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return theme.colors.primary[600];
      case 'in_progress':
        return theme.colors.warning[600];
      case 'synced':
        return theme.colors.success[600];
      case 'failed':
        return theme.colors.error[600];
      default:
        return theme.colors.gray[600];
    }
  };

  const handleTriggerSnapshot = async () => {
    if (!token) return;
    try {
      setTriggering(true);
      const data = await quickBooksSyncService.triggerSnapshot(token);
      const snap = data.snapshot || {};
      const disc = data.discrepancies || {};
      Alert.alert(
        'Snapshot Enqueued',
        `Enqueued ${snap.enqueued || 0} stock records, ${disc.enqueued || 0} discrepancies`,
      );
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to trigger snapshot');
    } finally {
      setTriggering(false);
    }
  };

  const handleRetry = async (id: string) => {
    if (!token) return;
    try {
      setRetryingId(id);
      await quickBooksSyncService.retry(token, id);
      Alert.alert('Success', 'Record reset to pending');
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to retry');
    } finally {
      setRetryingId(null);
    }
  };

  const filterOptions = [
    {key: '', label: 'All'},
    {key: 'pending', label: 'Pending'},
    {key: 'in_progress', label: 'In Progress'},
    {key: 'synced', label: 'Synced'},
    {key: 'failed', label: 'Failed'},
  ];

  const StatCard = ({
    label,
    value,
    color,
    icon,
  }: {
    label: string;
    value: number;
    color: string;
    icon?: React.ReactNode;
  }) => (
    <View style={styles.statCard}>
      <View style={styles.statTop}>
        <Typography variant="caption" color={theme.colors.gray[600]}>
          {label}
        </Typography>
        {icon}
      </View>
      <Typography variant="h2" weight="bold" color={color}>
        {value}
      </Typography>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Typography variant="body" color={theme.colors.primary[600]} weight="semibold">
              Close
            </Typography>
          </TouchableOpacity>
          <Typography variant="h3" weight="bold" style={styles.modalTitle}>
            QuickBooks Sync
          </Typography>
          <TouchableOpacity onPress={loadData} style={styles.refreshButton}>
            <Typography variant="small" color={theme.colors.primary[600]} weight="semibold">
              Refresh
            </Typography>
          </TouchableOpacity>
        </View>

        {initialLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary[600]} />
            <Typography variant="body" color={theme.colors.gray[600]} style={{marginTop: 16}}>
              Loading sync queue...
            </Typography>
          </View>
        ) : (
          <PaginatedList
            data={queue}
            keyExtractor={(item, index) => item._id || String(index)}
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, styles.contentWrap]}
            refreshing={refreshing}
            onRefresh={onRefresh}
            resetKey={statusFilter}
            pagedMode
            scrollTopKey={page}
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
            ItemSeparatorComponent={() => <View style={{height: 12}} />}
            ListHeaderComponent={
              <View>
                <Typography variant="caption" color={theme.colors.gray[600]} style={{marginBottom: 12}}>
                  Stock + discrepancy adjustments queued for the QuickBooks Web Connector
                </Typography>
                {stats?.lastSyncedAt ? (
                  <Typography variant="caption" color={theme.colors.gray[500]} style={{marginBottom: 12}}>
                    Last successful sync: {formatDateTime(stats.lastSyncedAt)}
                    {stats.lastSyncedItem ? ` (${stats.lastSyncedItem})` : ''}
                  </Typography>
                ) : null}

                {/* Stat cards */}
                <View style={styles.statsGrid}>
                  <StatCard
                    label="Pending"
                    value={stats?.pending || 0}
                    color={theme.colors.primary[600]}
                    icon={<ClockIcon size={18} color={theme.colors.primary[500]} />}
                  />
                  <StatCard
                    label="In Progress"
                    value={stats?.in_progress || 0}
                    color={theme.colors.warning[600]}
                    icon={<RefreshIcon size={18} color={theme.colors.warning[500]} />}
                  />
                  <StatCard
                    label="Synced"
                    value={stats?.synced || 0}
                    color={theme.colors.success[600]}
                    icon={<CheckCircleIcon size={18} color={theme.colors.success[500]} />}
                  />
                  <StatCard
                    label="Failed"
                    value={stats?.failed || 0}
                    color={theme.colors.error[600]}
                    icon={<WarningIcon size={18} color={theme.colors.error[500]} />}
                  />
                  <StatCard
                    label="Total"
                    value={stats?.total || 0}
                    color={theme.colors.gray[900]}
                    icon={<BoxIcon size={18} color={theme.colors.gray[400]} />}
                  />
                </View>

                {/* Admin action */}
                {isAdmin && (
                  <View style={styles.actionContainer}>
                    <Button
                      title={triggering ? 'Enqueuing...' : 'Enqueue Snapshot Now'}
                      variant="primary"
                      onPress={handleTriggerSnapshot}
                      disabled={triggering}
                      loading={triggering}
                      fullWidth
                    />
                  </View>
                )}

                {/* Status filter chips */}
                <View style={styles.filterRow}>
                  {filterOptions.map(opt => {
                    const active = statusFilter === opt.key;
                    return (
                      <TouchableOpacity
                        key={opt.key || 'all'}
                        onPress={() => setStatusFilter(opt.key)}
                        activeOpacity={0.8}
                        style={[
                          styles.filterChip,
                          {
                            backgroundColor: active
                              ? theme.colors.primary[600]
                              : theme.colors.white,
                            borderColor: active
                              ? theme.colors.primary[600]
                              : theme.colors.gray[200],
                          },
                        ]}>
                        <Typography
                          variant="small"
                          weight={active ? 'semibold' : 'normal'}
                          color={active ? theme.colors.white : theme.colors.gray[700]}>
                          {opt.label}
                        </Typography>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {error && (
                  <Card variant="outlined" padding="lg" style={styles.errorCard}>
                    <View style={styles.errorContent}>
                      <AlertCircleIcon size={24} color={theme.colors.error[500]} />
                      <Typography variant="body" color={theme.colors.error[700]} style={styles.errorText}>
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
                  <BoxIcon size={48} color={theme.colors.gray[400]} />
                  <Typography
                    variant="h3"
                    weight="semibold"
                    color={theme.colors.gray[700]}
                    style={styles.emptyTitle}>
                    No queue records
                  </Typography>
                  <Typography variant="body" color={theme.colors.gray[500]} align="center">
                    {statusFilter ? 'No records matching this filter' : 'The sync queue is empty'}
                  </Typography>
                </Card>
              )
            }
            renderItem={({item: rec}) => {
              const qty =
                rec.type === 'discrepancy_adjustment'
                  ? rec.quantityDifference != null
                    ? rec.quantityDifference > 0
                      ? `+${rec.quantityDifference}`
                      : String(rec.quantityDifference)
                    : '-'
                  : rec.newQuantity != null
                  ? String(rec.newQuantity)
                  : '-';
              const sColor = statusColor(rec.status);
              return (
                <Card variant="elevated" padding="md" style={styles.recordCard}>
                  <View style={styles.recordHeader}>
                    <View style={styles.recordInfo}>
                      <Typography variant="body" weight="bold" numberOfLines={1}>
                        {rec.itemName || '-'}
                      </Typography>
                      <Typography variant="caption" color={theme.colors.gray[500]}>
                        {TYPE_LABELS[rec.type] || rec.type}
                      </Typography>
                    </View>
                    <View style={[styles.statusBadge, {backgroundColor: sColor + '22'}]}>
                      <Typography variant="caption" weight="semibold" color={sColor}>
                        {STATUS_LABELS[rec.status] || rec.status}
                      </Typography>
                    </View>
                  </View>

                  <View style={styles.recordMeta}>
                    <View style={styles.metaRow}>
                      <Typography variant="caption" color={theme.colors.gray[500]}>
                        Qty
                      </Typography>
                      <Typography variant="small" weight="medium">
                        {qty}
                      </Typography>
                    </View>
                    <View style={styles.metaRow}>
                      <Typography variant="caption" color={theme.colors.gray[500]}>
                        Retries
                      </Typography>
                      <Typography variant="small" weight="medium">
                        {rec.retries || 0}
                      </Typography>
                    </View>
                    <View style={styles.metaRow}>
                      <Typography variant="caption" color={theme.colors.gray[500]}>
                        Enqueued
                      </Typography>
                      <Typography variant="small">{formatDateTime(rec.enqueuedAt)}</Typography>
                    </View>
                    {rec.syncedAt ? (
                      <View style={styles.metaRow}>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          Synced
                        </Typography>
                        <Typography variant="small">{formatDateTime(rec.syncedAt)}</Typography>
                      </View>
                    ) : null}
                    {rec.lastError ? (
                      <View style={styles.metaRow}>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          Error
                        </Typography>
                        <Typography
                          variant="caption"
                          color={theme.colors.error[600]}
                          style={{flex: 1, textAlign: 'right'}}
                          numberOfLines={2}>
                          {rec.lastError}
                        </Typography>
                      </View>
                    ) : null}
                  </View>

                  {isAdmin && rec.status === 'failed' && (
                    <View style={styles.recordActions}>
                      <TouchableOpacity
                        style={styles.retryButton}
                        onPress={() => handleRetry(rec._id)}
                        disabled={retryingId === rec._id}>
                        <RefreshIcon size={16} color={theme.colors.primary[600]} />
                        <Typography
                          variant="small"
                          weight="semibold"
                          color={theme.colors.primary[600]}
                          style={{marginLeft: 8}}>
                          {retryingId === rec._id ? 'Retrying...' : 'Retry'}
                        </Typography>
                      </TouchableOpacity>
                    </View>
                  )}
                </Card>
              );
            }}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

const makeStyles = (theme: Theme, bp: BreakpointInfo) =>
  StyleSheet.create({
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
      paddingBottom: theme.spacing.lg,
    },
    contentWrap: {
      width: '100%',
      maxWidth: bp.contentMaxWidth,
      alignSelf: 'center',
      paddingHorizontal: bp.gutter,
      paddingTop: theme.spacing.lg,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.md,
    },
    statCard: {
      width: '48%',
      backgroundColor: theme.colors.white,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
      padding: theme.spacing.md,
      marginBottom: 12,
    },
    statTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    actionContainer: {
      marginBottom: theme.spacing.md,
    },
    filterRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: theme.spacing.md,
    },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
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
    recordCard: {
      marginBottom: 0,
    },
    recordHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 8,
    },
    recordInfo: {
      flex: 1,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    recordMeta: {
      marginTop: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    recordActions: {
      marginTop: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.gray[200],
      paddingTop: theme.spacing.md,
    },
    retryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 8,
      borderWidth: 1,
      backgroundColor: theme.colors.primary[50],
      borderColor: theme.colors.primary[200],
    },
  });
