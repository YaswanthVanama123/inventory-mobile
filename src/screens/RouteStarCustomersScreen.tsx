import React, {useState, useMemo} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  TextInput as RNTextInput,
  Linking,
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
import routeStarCustomerService from '../services/routeStarCustomerService';
import useDebounce from '../hooks/useDebounce';
import {useServerPagination} from '../hooks/useServerPagination';
import {AlertCircleIcon, UserIcon, RefreshIcon, TrashIcon} from '../components/icons';

interface Props {
  visible: boolean;
  onClose: () => void;
}

type DetailTab = 'details' | 'contacts' | 'equipment' | 'routes' | 'notes' | 'activities';

const fmtMoney = (v: any) => `$${parseFloat(v || 0).toFixed(2)}`;

export const RouteStarCustomersScreen: React.FC<Props> = ({visible, onClose}) => {
  const theme = useTheme();
  const bp = useBreakpoint();
  const styles = useMemo(() => makeStyles(theme, bp), [theme, bp]);
  const {token, user} = useAuth();
  const isAdmin = user?.role === 'admin';
  const {handleApiError} = useApiErrorHandler();

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('all');
  const [stats, setStats] = useState({totalCustomers: 0, activeCustomers: 0, inactiveCustomers: 0});
  const [syncing, setSyncing] = useState<null | 'sync' | 'details' | 'delete'>(null);

  // Detail drill-in
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>('details');

  const {
    items: customers,
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
  } = useServerPagination<any>(
    async (pg, limit) => {
      try {
        const [res, st] = await Promise.all([
          routeStarCustomerService.getCustomers(token!, {
            page: pg,
            limit,
            search: debouncedSearch || undefined,
            active: activeFilter !== 'all' ? activeFilter : undefined,
          }),
          routeStarCustomerService.getCustomerStats(token!).catch(() => null),
        ]);
        if (st) setStats(st);
        const pg2 = res.pagination;
        return {items: res.customers, total: pg2.totalCount, pages: pg2.totalPages};
      } catch (e) {
        await handleApiError(e);
        throw e;
      }
    },
    {pageSize: 50, resetKey: `${debouncedSearch}|${activeFilter}`, enabled: !!(visible && token)},
  );

  const openDetail = async (customerId: string) => {
    if (!token) return;
    setDetailTab('details');
    setDetail({loading: true});
    try {
      setDetailLoading(true);
      const c = await routeStarCustomerService.getCustomerById(token, customerId);
      setDetail(c);
    } catch (e: any) {
      setDetail(null);
      Alert.alert('Error', e?.message || 'Failed to load customer');
    } finally {
      setDetailLoading(false);
    }
  };

  const confirmSync = () => {
    Alert.alert(
      'Sync Customers',
      'This will sync all customers from RouteStar. This may take several minutes. Continue?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Sync',
          onPress: async () => {
            try {
              setSyncing('sync');
              await routeStarCustomerService.syncCustomers(token!);
              Alert.alert('Success', 'Sync completed');
              refetch();
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Failed to sync');
            } finally {
              setSyncing(null);
            }
          },
        },
      ],
    );
  };

  const confirmSyncDetails = async () => {
    try {
      setSyncing('details');
      await routeStarCustomerService.syncCustomerDetails(token!);
      Alert.alert('Success', 'Details sync started; it will continue in the background.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to start details sync');
    } finally {
      setSyncing(null);
    }
  };

  const confirmDeleteAll = () => {
    Alert.alert(
      'Delete All Customers',
      'Are you sure you want to delete ALL customers? This cannot be undone!',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              setSyncing('delete');
              const r = await routeStarCustomerService.deleteAllCustomers(token!);
              Alert.alert('Success', r?.message || 'All customers deleted');
              refetch();
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Failed to delete');
            } finally {
              setSyncing(null);
            }
          },
        },
      ],
    );
  };

  const detailTabs: {id: DetailTab; label: string; count?: number}[] = detail
    ? [
        {id: 'details', label: 'Details'},
        {id: 'contacts', label: 'Contacts', count: detail.contacts?.length},
        {id: 'equipment', label: 'Equipment', count: detail.equipment?.length},
        {id: 'routes', label: 'Routes', count: detail.routes?.length},
        {id: 'notes', label: 'Notes', count: detail.notes?.length},
        {id: 'activities', label: 'Activities', count: detail.activities?.length},
      ]
    : [];

  const renderRow = (label: string, value: any) =>
    value ? (
      <View style={styles.metaRow}>
        <Typography variant="caption" color={theme.colors.gray[500]}>{label}</Typography>
        <Typography variant="small" weight="medium" style={{flex: 1, textAlign: 'right', marginLeft: 12}}>
          {String(value)}
        </Typography>
      </View>
    ) : null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.headerSide}>
            <Typography variant="body" color={theme.colors.primary[600]} weight="semibold">Close</Typography>
          </TouchableOpacity>
          <Typography variant="h3" weight="bold" style={styles.modalTitle}>RouteStar Customers</Typography>
          <TouchableOpacity onPress={refetch} style={[styles.headerSide, {alignItems: 'flex-end'}]}>
            <Typography variant="small" color={theme.colors.primary[600]} weight="semibold">Refresh</Typography>
          </TouchableOpacity>
        </View>

        {initialLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary[600]} />
            <Typography variant="body" color={theme.colors.gray[600]} style={{marginTop: 16}}>
              Loading customers...
            </Typography>
          </View>
        ) : (
          <PaginatedList
            data={customers}
            keyExtractor={(item, index) => item.customerId || String(index)}
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, styles.contentWrap]}
            refreshing={refreshing}
            onRefresh={refresh}
            resetKey={`${searchQuery}|${activeFilter}`}
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
                {/* Stats */}
                <View style={styles.statsRow}>
                  <View style={styles.statCard}>
                    <Typography variant="caption" color={theme.colors.gray[500]}>Total</Typography>
                    <Typography variant="h3" weight="bold">{stats.totalCustomers}</Typography>
                  </View>
                  <View style={styles.statCard}>
                    <Typography variant="caption" color={theme.colors.gray[500]}>Active</Typography>
                    <Typography variant="h3" weight="bold" color={theme.colors.success[600]}>{stats.activeCustomers}</Typography>
                  </View>
                  <View style={styles.statCard}>
                    <Typography variant="caption" color={theme.colors.gray[500]}>Inactive</Typography>
                    <Typography variant="h3" weight="bold" color={theme.colors.gray[500]}>{stats.inactiveCustomers}</Typography>
                  </View>
                </View>

                {isAdmin && (
                  <View style={styles.syncRow}>
                    <Button title={syncing === 'sync' ? 'Syncing…' : 'Sync'} variant="primary" onPress={confirmSync} disabled={!!syncing} loading={syncing === 'sync'} style={{flex: 1}} leftIcon={<RefreshIcon size={14} color={theme.colors.white} />} />
                    <Button title={syncing === 'details' ? 'Syncing…' : 'Sync Details'} variant="secondary" onPress={confirmSyncDetails} disabled={!!syncing} loading={syncing === 'details'} style={{flex: 1}} />
                    <Button title="Delete All" variant="danger" onPress={confirmDeleteAll} disabled={!!syncing} loading={syncing === 'delete'} leftIcon={<TrashIcon size={14} color={theme.colors.white} />} />
                  </View>
                )}

                <View style={{marginBottom: theme.spacing.md}}>
                  <RNTextInput
                    style={styles.searchInput}
                    placeholder="Search by name, ID, email, phone, account…"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor={theme.colors.gray[400]}
                  />
                </View>
                <View style={styles.filterRow}>
                  {(['all', 'true', 'false'] as const).map(f => (
                    <TouchableOpacity key={f} style={[styles.filterChip, activeFilter === f && styles.filterChipActive]} onPress={() => setActiveFilter(f)}>
                      <Typography variant="caption" weight="semibold" color={activeFilter === f ? theme.colors.primary[600] : theme.colors.gray[500]}>
                        {f === 'all' ? 'All Status' : f === 'true' ? 'Active' : 'Inactive'}
                      </Typography>
                    </TouchableOpacity>
                  ))}
                </View>
                {error && (
                  <Card variant="outlined" padding="lg" style={styles.errorCard}>
                    <View style={styles.errorContent}>
                      <AlertCircleIcon size={24} color={theme.colors.error[500]} />
                      <Typography variant="body" color={theme.colors.error[700]} style={{flex: 1}}>{error}</Typography>
                    </View>
                  </Card>
                )}
              </View>
            }
            ListEmptyComponent={
              error ? null : (
                <Card variant="outlined" padding="lg" style={styles.emptyCard}>
                  <UserIcon size={48} color={theme.colors.gray[400]} />
                  <Typography variant="h3" weight="semibold" color={theme.colors.gray[700]} style={{marginTop: 12}}>No customers found</Typography>
                </Card>
              )
            }
            renderItem={({item: c}) => (
              <TouchableOpacity onPress={() => openDetail(c.customerId)} activeOpacity={0.7}>
                <Card variant="elevated" padding="md" style={{marginBottom: 0}}>
                  <View style={styles.custHeader}>
                    <View style={{flex: 1}}>
                      <Typography variant="body" weight="bold" numberOfLines={1}>{c.customerName}</Typography>
                      <Typography variant="caption" color={theme.colors.gray[500]}>ID: {c.customerId}</Typography>
                    </View>
                    <View style={[styles.statusBadge, {backgroundColor: c.active ? theme.colors.success[100] : theme.colors.gray[100]}]}>
                      <Typography variant="caption" weight="semibold" color={c.active ? theme.colors.success[600] : theme.colors.gray[500]}>
                        {c.active ? 'Active' : 'Inactive'}
                      </Typography>
                    </View>
                  </View>
                  <View style={{marginTop: 8, gap: 4}}>
                    {c.email ? <Typography variant="caption" color={theme.colors.gray[600]}>✉ {c.email}</Typography> : null}
                    {c.phone ? <Typography variant="caption" color={theme.colors.gray[600]}>☎ {c.phone}</Typography> : null}
                    {(c.serviceCity || c.serviceState) ? (
                      <Typography variant="caption" color={theme.colors.gray[500]}>
                        {[c.serviceCity, c.serviceState, c.serviceZip].filter(Boolean).join(', ')}
                      </Typography>
                    ) : null}
                    {c.balance != null ? (
                      <Typography variant="caption" weight="semibold" color={c.balance > 0 ? theme.colors.error[600] : theme.colors.success[600]}>
                        Balance: {fmtMoney(c.balance)}
                      </Typography>
                    ) : null}
                  </View>
                </Card>
              </TouchableOpacity>
            )}
          />
        )}
      </SafeAreaView>

      {/* Detail Modal */}
      <Modal visible={!!detail} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setDetail(null)}>
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setDetail(null)} style={styles.headerSide}>
              <Typography variant="body" color={theme.colors.primary[600]} weight="semibold">Back</Typography>
            </TouchableOpacity>
            <Typography variant="h3" weight="bold" style={styles.modalTitle} numberOfLines={1}>
              {detail?.customerName || 'Customer'}
            </Typography>
            <View style={styles.headerSide} />
          </View>
          {detailLoading || detail?.loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary[600]} />
            </View>
          ) : detail ? (
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
              <View style={styles.contentWrap}>
                {/* Summary cards */}
                <View style={styles.statsRow}>
                  <View style={styles.statCard}>
                    <Typography variant="caption" color={theme.colors.gray[500]}>Balance</Typography>
                    <Typography variant="body" weight="bold" color={detail.balance > 0 ? theme.colors.error[600] : theme.colors.success[600]}>{fmtMoney(detail.balance)}</Typography>
                  </View>
                  <View style={styles.statCard}>
                    <Typography variant="caption" color={theme.colors.gray[500]}>Type</Typography>
                    <Typography variant="body" weight="bold">{detail.customerType || 'N/A'}</Typography>
                  </View>
                  <View style={styles.statCard}>
                    <Typography variant="caption" color={theme.colors.gray[500]}>Zone</Typography>
                    <Typography variant="body" weight="bold">{detail.zone || 'N/A'}</Typography>
                  </View>
                </View>

                {/* Tabs */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsRow}>
                  {detailTabs.map(t => (
                    <TouchableOpacity key={t.id} style={[styles.tab, detailTab === t.id && styles.tabActive]} onPress={() => setDetailTab(t.id)}>
                      <Typography variant="small" weight="semibold" color={detailTab === t.id ? theme.colors.primary[600] : theme.colors.gray[500]}>
                        {t.label}{t.count !== undefined ? ` (${t.count})` : ''}
                      </Typography>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {detailTab === 'details' && (
                  <>
                    <Card style={styles.detailCard}>
                      <Typography variant="small" weight="bold" style={{marginBottom: 8}}>Basic Information</Typography>
                      {renderRow('Company', detail.company)}
                      {renderRow('Contact', detail.contact)}
                      {renderRow('Email', detail.email)}
                      {renderRow('Phone', detail.phone)}
                      {renderRow('Sales Rep', detail.salesRep)}
                    </Card>
                    <Card style={styles.detailCard}>
                      <Typography variant="small" weight="bold" style={{marginBottom: 8}}>Service Address</Typography>
                      {[detail.serviceAddress1, detail.serviceAddress2, detail.serviceAddress3]
                        .filter(Boolean)
                        .map((l: string, i: number) => (
                          <Typography key={i} variant="small">{l}</Typography>
                        ))}
                      {(detail.serviceCity || detail.serviceState || detail.serviceZip) ? (
                        <Typography variant="small" color={theme.colors.gray[600]}>
                          {[detail.serviceCity, detail.serviceState, detail.serviceZip].filter(Boolean).join(', ')}
                        </Typography>
                      ) : null}
                      {detail.latitude && detail.longitude ? (
                        <TouchableOpacity
                          style={{marginTop: 10}}
                          onPress={() => Linking.openURL(`https://www.google.com/maps?q=${detail.latitude},${detail.longitude}`)}>
                          <Typography variant="small" weight="semibold" color={theme.colors.primary[600]}>📍 View on Google Maps</Typography>
                        </TouchableOpacity>
                      ) : null}
                    </Card>
                    <Card style={styles.detailCard}>
                      <Typography variant="small" weight="bold" style={{marginBottom: 8}}>Billing Address</Typography>
                      {[detail.billingAddress1, detail.billingAddress2, detail.billingAddress3]
                        .filter(Boolean)
                        .map((l: string, i: number) => (
                          <Typography key={i} variant="small">{l}</Typography>
                        ))}
                      {(detail.billingCity || detail.billingState || detail.billingZip) ? (
                        <Typography variant="small" color={theme.colors.gray[600]}>
                          {[detail.billingCity, detail.billingState, detail.billingZip].filter(Boolean).join(', ')}
                        </Typography>
                      ) : null}
                    </Card>
                    <Card style={styles.detailCard}>
                      <Typography variant="small" weight="bold" style={{marginBottom: 8}}>Account Information</Typography>
                      {renderRow('Account Number', detail.accountNumber)}
                      {renderRow('Balance', fmtMoney(detail.balance))}
                      {detail.creditLimit ? renderRow('Credit Limit', fmtMoney(detail.creditLimit)) : null}
                      {renderRow('Payment Terms', detail.terms)}
                    </Card>
                  </>
                )}

                {detailTab === 'contacts' && (
                  <Card style={styles.detailCard}>
                    {(detail.contacts || []).length === 0 ? (
                      <Typography variant="small" color={theme.colors.gray[400]}>No additional contacts</Typography>
                    ) : (
                      detail.contacts.map((ct: any, i: number) => (
                        <View key={i} style={styles.subItem}>
                          <Typography variant="small" weight="semibold">{ct.contactName}</Typography>
                          {renderRow('Notify By', ct.notifyBy)}
                          {renderRow('Email', ct.email)}
                          {renderRow('Phone', ct.phone)}
                        </View>
                      ))
                    )}
                  </Card>
                )}

                {detailTab === 'equipment' && (
                  <Card style={styles.detailCard}>
                    {(detail.equipment || []).length === 0 ? (
                      <Typography variant="small" color={theme.colors.gray[400]}>No equipment found</Typography>
                    ) : (
                      detail.equipment.map((eq: any, i: number) => (
                        <View key={i} style={styles.subItem}>
                          {renderRow('Type', eq.equipmentType)}
                          {renderRow('Description', eq.description)}
                          {renderRow('Serial Number', eq.serialNumber)}
                        </View>
                      ))
                    )}
                  </Card>
                )}

                {detailTab === 'routes' && (
                  <Card style={styles.detailCard}>
                    {(detail.routes || []).length === 0 ? (
                      <Typography variant="small" color={theme.colors.gray[400]}>No routes found</Typography>
                    ) : (
                      detail.routes.map((r: any, i: number) => (
                        <View key={i} style={styles.subItem}>
                          {renderRow('Route Name', r.routeName)}
                          {renderRow('Frequency', r.frequency)}
                          {renderRow('Status', r.status)}
                        </View>
                      ))
                    )}
                  </Card>
                )}

                {detailTab === 'notes' && (
                  <Card style={styles.detailCard}>
                    {(detail.notes || []).length === 0 ? (
                      <Typography variant="small" color={theme.colors.gray[400]}>No notes found</Typography>
                    ) : (
                      detail.notes.map((n: any, i: number) => (
                        <View key={i} style={styles.subItem}>
                          <Typography variant="small">{n.noteText}</Typography>
                          <Typography variant="caption" color={theme.colors.gray[400]}>
                            By: {n.createdBy || 'Unknown'} • {n.createdDate ? new Date(n.createdDate).toLocaleDateString() : 'N/A'}
                          </Typography>
                        </View>
                      ))
                    )}
                  </Card>
                )}

                {detailTab === 'activities' && (
                  <Card style={styles.detailCard}>
                    {(detail.activities || []).length === 0 ? (
                      <Typography variant="small" color={theme.colors.gray[400]}>No activities found</Typography>
                    ) : (
                      detail.activities.map((a: any, i: number) => (
                        <View key={i} style={styles.subItem}>
                          <View style={styles.metaRow}>
                            <Typography variant="caption" color={theme.colors.gray[500]}>
                              {a.activityDate ? new Date(a.activityDate).toLocaleDateString() : 'N/A'}
                            </Typography>
                            <Typography variant="caption" weight="semibold">{a.activityType}</Typography>
                          </View>
                          {a.description ? <Typography variant="small">{a.description}</Typography> : null}
                          {a.amount ? <Typography variant="caption" color={theme.colors.gray[600]}>{fmtMoney(a.amount)}</Typography> : null}
                        </View>
                      ))
                    )}
                  </Card>
                )}
              </View>
            </ScrollView>
          ) : (
            <View style={styles.loadingContainer}>
              <Typography variant="body" color={theme.colors.gray[500]}>Customer not found</Typography>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </Modal>
  );
};

const makeStyles = (theme: Theme, bp: BreakpointInfo) =>
  StyleSheet.create({
    container: {flex: 1, backgroundColor: theme.colors.gray[50]},
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
    headerSide: {width: 60, paddingVertical: 4},
    modalTitle: {flex: 1, textAlign: 'center'},
    loadingContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},
    scrollView: {flex: 1},
    scrollContent: {paddingBottom: theme.spacing.lg},
    contentWrap: {
      width: '100%',
      maxWidth: bp.contentMaxWidth,
      alignSelf: 'center',
      paddingHorizontal: bp.gutter,
      paddingTop: theme.spacing.lg,
    },
    statsRow: {flexDirection: 'row', gap: 10, marginBottom: theme.spacing.md},
    statCard: {flex: 1, backgroundColor: theme.colors.white, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.gray[200], padding: 12, alignItems: 'center'},
    syncRow: {flexDirection: 'row', gap: 8, marginBottom: theme.spacing.md, flexWrap: 'wrap'},
    searchInput: {
      backgroundColor: theme.colors.white,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: theme.typography.roles.sideheading.fontSize,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
      color: theme.colors.gray[900],
    },
    filterRow: {flexDirection: 'row', gap: 8, marginBottom: theme.spacing.md},
    filterChip: {paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: theme.colors.gray[200], backgroundColor: theme.colors.white},
    filterChipActive: {borderColor: theme.colors.primary[600], backgroundColor: theme.colors.primary[50]},
    errorCard: {marginBottom: theme.spacing.lg, backgroundColor: theme.colors.error[50]},
    errorContent: {flexDirection: 'row', alignItems: 'center', gap: 12},
    emptyCard: {alignItems: 'center', paddingVertical: theme.spacing.xl * 2},
    custHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
    statusBadge: {paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 8},
    tabsRow: {flexDirection: 'row', marginBottom: theme.spacing.md},
    tab: {paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: theme.colors.gray[200], backgroundColor: theme.colors.white, marginRight: 8},
    tabActive: {borderColor: theme.colors.primary[600], backgroundColor: theme.colors.primary[50]},
    detailCard: {padding: 16, marginBottom: 12},
    metaRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6},
    subItem: {paddingVertical: 10, borderTopWidth: 1, borderTopColor: theme.colors.gray[100]},
  });
