import React, {useState, useMemo, useEffect} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  TextInput as RNTextInput,
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
import {AlertCircleIcon, UserIcon} from '../components/icons';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const fmtMoney = (v: any) => `$${parseFloat(v || 0).toFixed(2)}`;

export const ClosedInvoiceCustomersScreen: React.FC<Props> = ({visible, onClose}) => {
  const theme = useTheme();
  const bp = useBreakpoint();
  const styles = useMemo(() => makeStyles(theme, bp), [theme, bp]);
  const {token} = useAuth();
  const {handleApiError} = useApiErrorHandler();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    if (visible && token && customers.length === 0) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, token]);

  const loadData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await routeStarCustomerService.getCustomersFromClosedInvoices(
        token,
        startDate || undefined,
        endDate || undefined,
      );
      setCustomers(res.customers || []);
      setPage(1);
    } catch (e: any) {
      const handled = await handleApiError(e);
      if (!handled) setError(e?.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return customers;
    return customers.filter(c =>
      [c.customerName, c.customerId, c.email, c.phone, c.accountNumber]
        .some(v => (v || '').toString().toLowerCase().includes(s)),
    );
  }, [customers, search]);

  const totalInvoices = filtered.reduce((sum, c) => sum + (c.invoiceCount || 0), 0);
  const totalAmount = filtered.reduce((sum, c) => sum + (c.totalAmount || 0), 0);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.headerSide}>
            <Typography variant="body" color={theme.colors.primary[600]} weight="semibold">Close</Typography>
          </TouchableOpacity>
          <Typography variant="h3" weight="bold" style={styles.modalTitle}>Closed Invoice Customers</Typography>
          <View style={styles.headerSide} />
        </View>

        <PaginatedList
          data={pageItems}
          keyExtractor={(item, index) => item.customerId || item.customerName || String(index)}
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, styles.contentWrap]}
          refreshing={false}
          onRefresh={loadData}
          resetKey={`${search}`}
          pagedMode
          scrollTopKey={page}
          ListFooterComponent={
            filtered.length > 0 ? (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={filtered.length}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={sz => {
                  setPageSize(sz);
                  setPage(1);
                }}
              />
            ) : null
          }
          ItemSeparatorComponent={() => <View style={{height: 12}} />}
          ListHeaderComponent={
            <View>
              {/* Date range */}
              <Card style={styles.filterCard}>
                <View style={styles.dateRow}>
                  <View style={{flex: 1}}>
                    <Typography variant="caption" color={theme.colors.gray[500]} style={{marginBottom: 4}}>Start Date</Typography>
                    <RNTextInput
                      style={styles.dateInput}
                      placeholder="YYYY-MM-DD"
                      value={startDate}
                      onChangeText={setStartDate}
                      placeholderTextColor={theme.colors.gray[400]}
                    />
                  </View>
                  <View style={{flex: 1}}>
                    <Typography variant="caption" color={theme.colors.gray[500]} style={{marginBottom: 4}}>End Date</Typography>
                    <RNTextInput
                      style={styles.dateInput}
                      placeholder="YYYY-MM-DD"
                      value={endDate}
                      onChangeText={setEndDate}
                      placeholderTextColor={theme.colors.gray[400]}
                    />
                  </View>
                </View>
                <Button title={loading ? 'Loading…' : 'Load Customers'} variant="primary" onPress={loadData} loading={loading} fullWidth style={{marginTop: 10}} />
              </Card>

              {customers.length > 0 && (
                <>
                  <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                      <Typography variant="caption" color={theme.colors.gray[500]}>Customers</Typography>
                      <Typography variant="h3" weight="bold">{filtered.length}</Typography>
                    </View>
                    <View style={styles.statCard}>
                      <Typography variant="caption" color={theme.colors.gray[500]}>Invoices</Typography>
                      <Typography variant="h3" weight="bold" color={theme.colors.primary[600]}>{totalInvoices}</Typography>
                    </View>
                    <View style={styles.statCard}>
                      <Typography variant="caption" color={theme.colors.gray[500]}>Total</Typography>
                      <Typography variant="body" weight="bold" color={theme.colors.success[600]}>{fmtMoney(totalAmount)}</Typography>
                    </View>
                  </View>
                  <View style={{marginBottom: theme.spacing.md}}>
                    <RNTextInput
                      style={styles.searchInput}
                      placeholder="Search customers…"
                      value={search}
                      onChangeText={t => {
                        setSearch(t);
                        setPage(1);
                      }}
                      placeholderTextColor={theme.colors.gray[400]}
                    />
                  </View>
                </>
              )}
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
            loading || error ? null : (
              <Card variant="outlined" padding="lg" style={styles.emptyCard}>
                <UserIcon size={48} color={theme.colors.gray[400]} />
                <Typography variant="body" color={theme.colors.gray[500]} align="center" style={{marginTop: 12}}>
                  {customers.length === 0 ? 'Choose a date range and load customers' : 'No customers match your search'}
                </Typography>
              </Card>
            )
          }
          renderItem={({item: c}) => (
            <Card variant="elevated" padding="md" style={{marginBottom: 0}}>
              <View style={styles.custHeader}>
                <View style={{flex: 1}}>
                  <Typography variant="body" weight="bold" numberOfLines={1}>{c.customerName}</Typography>
                  {c.customerId ? <Typography variant="caption" color={theme.colors.gray[500]}>ID: {c.customerId}</Typography> : null}
                </View>
                <View style={{alignItems: 'flex-end'}}>
                  <Typography variant="caption" color={theme.colors.primary[600]} weight="semibold">{c.invoiceCount} invoice(s)</Typography>
                  <Typography variant="small" weight="bold" color={theme.colors.success[600]}>{fmtMoney(c.totalAmount)}</Typography>
                </View>
              </View>
              <View style={{marginTop: 6, gap: 3}}>
                {c.email ? <Typography variant="caption" color={theme.colors.gray[600]}>✉ {c.email}</Typography> : null}
                {c.phone ? <Typography variant="caption" color={theme.colors.gray[600]}>☎ {c.phone}</Typography> : null}
                {(c.serviceCity || c.serviceState) ? (
                  <Typography variant="caption" color={theme.colors.gray[500]}>
                    {[c.serviceCity, c.serviceState, c.serviceZip].filter(Boolean).join(', ')}
                  </Typography>
                ) : null}
              </View>
            </Card>
          )}
        />
      </SafeAreaView>
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
    scrollView: {flex: 1},
    scrollContent: {paddingBottom: theme.spacing.lg},
    contentWrap: {
      width: '100%',
      maxWidth: bp.contentMaxWidth,
      alignSelf: 'center',
      paddingHorizontal: bp.gutter,
      paddingTop: theme.spacing.lg,
    },
    filterCard: {padding: 16, marginBottom: theme.spacing.md},
    dateRow: {flexDirection: 'row', gap: 10},
    dateInput: {
      backgroundColor: theme.colors.white,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
      color: theme.colors.gray[900],
    },
    statsRow: {flexDirection: 'row', gap: 10, marginBottom: theme.spacing.md},
    statCard: {flex: 1, backgroundColor: theme.colors.white, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.gray[200], padding: 12, alignItems: 'center'},
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
    errorCard: {marginBottom: theme.spacing.lg, backgroundColor: theme.colors.error[50]},
    errorContent: {flexDirection: 'row', alignItems: 'center', gap: 12},
    emptyCard: {alignItems: 'center', paddingVertical: theme.spacing.xl * 2},
    custHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  });
