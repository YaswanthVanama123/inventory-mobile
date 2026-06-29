import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {useAuth} from '../contexts/AuthContext';
import {useRefetchOnFocus} from '../hooks/useRefetchOnFocus';
import {useApiErrorHandler} from '../hooks/useApiErrorHandler';
import {useTheme} from '../contexts/ThemeContext';
import {Theme} from '../theme';
import {useBreakpoint, BreakpointInfo} from '../utils/breakpoints';
import truckCheckoutService from '../services/truckCheckoutService';
import {
  TruckIcon,
  ClockIcon,
  CheckCircleIcon,
  AlertCircleIcon,
} from '../components/icons';
import {formatDateTime} from '../utils/dateUtils';

interface TruckCheckoutDetailScreenProps {
  route: any;
  navigation: any;
}

export const TruckCheckoutDetailScreen: React.FC<
  TruckCheckoutDetailScreenProps
> = ({route, navigation}) => {
  const theme = useTheme();
  const bp = useBreakpoint();
  const styles = useMemo(() => makeStyles(theme, bp), [theme, bp]);
  const {checkoutId} = route.params;
  const {token} = useAuth();
  const {handleApiError} = useApiErrorHandler();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkout, setCheckout] = useState<any>(null);

  useEffect(() => {
    if (token && checkoutId) {
      loadCheckout();
    }
  }, [token, checkoutId]);

  // Refresh the detail when returning to this screen (e.g. after an edit elsewhere).
  useRefetchOnFocus(() => loadCheckout());

  const loadCheckout = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await truckCheckoutService.getCheckout(token, checkoutId);
      setCheckout(data);
    } catch (error: any) {
      console.error('Load checkout error:', error);
      const wasHandled = await handleApiError(error);
      if (!wasHandled) {
        Alert.alert('Error', 'Failed to load checkout details');
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCheckout();
    setRefreshing(false);
  };

  const handleDelete = () => {
    if (!checkout) return;
    Alert.alert(
      'Delete Checkout',
      `Are you sure you want to delete this checkout for ${checkout.employeeName}? This action cannot be undone.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!token) return;
            try {
              await truckCheckoutService.deleteCheckout(token, checkoutId);
              Alert.alert('Success', 'Checkout deleted successfully');
              navigation.goBack();
            } catch (error: any) {
              console.error('Delete error:', error);
              const wasHandled = await handleApiError(error);
              if (!wasHandled) {
                Alert.alert('Error', error.message || 'Failed to delete');
              }
            }
          },
        },
      ],
    );
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'checked_out':
        return {color: '#2563eb', bg: '#dbeafe', label: 'Checked Out'};
      case 'completed':
        return {color: '#059669', bg: '#d1fae5', label: 'Completed'};
      case 'cancelled':
        return {color: '#dc2626', bg: '#fee2e2', label: 'Cancelled'};
      default:
        return {color: '#6b7280', bg: '#f3f4f6', label: status};
    }
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[600]} />
          <Typography
            variant="body"
            color={theme.colors.gray[500]}
            style={{marginTop: 16}}>
            Loading checkout...
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  if (!checkout) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <View style={styles.loadingContainer}>
          <AlertCircleIcon size={48} color={theme.colors.gray[400]} />
          <Typography
            variant="body"
            color={theme.colors.gray[500]}
            style={{marginTop: 16}}>
            Checkout not found
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  const statusConfig = getStatusConfig(checkout.status);
  const itemDisplay = checkout.itemName
    ? {name: checkout.itemName, qty: checkout.quantityTaking || 0}
    : {
        name: `${checkout.itemsTaken?.length || 0} items`,
        qty:
          checkout.itemsTaken?.reduce(
            (sum: number, item: any) => sum + item.quantity,
            0,
          ) || 0,
      };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        <View style={styles.contentWrap}>
        {/* Header Card */}
        <Card style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={styles.headerIcon}>
              <TruckIcon size={24} color={theme.colors.primary[600]} />
            </View>
            <View style={styles.headerInfo}>
              <Typography variant="h3" weight="bold">
                {checkout.employeeName}
              </Typography>
              <Typography
                variant="caption"
                color={theme.colors.gray[500]}
                style={{marginTop: 2}}>
                Truck: {checkout.truckNumber || 'N/A'} •{' '}
                {formatDateTime(checkout.checkoutDate)}
              </Typography>
            </View>
            <View
              style={[styles.statusBadge, {backgroundColor: statusConfig.bg}]}>
              <Typography
                variant="caption"
                weight="bold"
                color={statusConfig.color}>
                {statusConfig.label}
              </Typography>
            </View>
          </View>
        </Card>

        {/* Info Grid */}
        <View style={styles.infoGrid}>
          {/* Employee & Checkout Info */}
          <Card style={styles.infoCard}>
            <Typography
              variant="small"
              weight="bold"
              color={theme.colors.gray[700]}
              style={styles.sectionTitle}>
              Employee & Checkout
            </Typography>
            <View style={styles.detailRow}>
              <Typography variant="caption" color={theme.colors.gray[500]}>
                Employee
              </Typography>
              <Typography variant="small" weight="semibold">
                {checkout.employeeName}
              </Typography>
            </View>
            {checkout.employeeId && (
              <View style={styles.detailRow}>
                <Typography variant="caption" color={theme.colors.gray[500]}>
                  Employee ID
                </Typography>
                <Typography variant="small" weight="semibold">
                  {checkout.employeeId}
                </Typography>
              </View>
            )}
            <View style={styles.detailRow}>
              <Typography variant="caption" color={theme.colors.gray[500]}>
                Route/Truck
              </Typography>
              <Typography variant="small" weight="semibold">
                {checkout.truckNumber || 'N/A'}
              </Typography>
            </View>
            <View style={styles.detailRow}>
              <Typography variant="caption" color={theme.colors.gray[500]}>
                Checkout Date
              </Typography>
              <Typography variant="small" weight="semibold">
                {formatDateTime(checkout.checkoutDate)}
              </Typography>
            </View>
            {checkout.completedDate && (
              <View style={styles.detailRow}>
                <Typography variant="caption" color={theme.colors.gray[500]}>
                  Completed
                </Typography>
                <Typography variant="small" weight="semibold">
                  {formatDateTime(checkout.completedDate)}
                </Typography>
              </View>
            )}
            <View style={styles.detailRow}>
              <Typography variant="caption" color={theme.colors.gray[500]}>
                Status
              </Typography>
              <View
                style={[
                  styles.inlineStatusBadge,
                  {backgroundColor: statusConfig.bg},
                ]}>
                <Typography
                  variant="caption"
                  weight="bold"
                  color={statusConfig.color}>
                  {statusConfig.label}
                </Typography>
              </View>
            </View>
            {checkout.notes && (
              <View style={styles.notesBox}>
                <Typography
                  variant="caption"
                  weight="semibold"
                  color={theme.colors.gray[600]}
                  style={{marginBottom: 4}}>
                  Notes
                </Typography>
                <Typography variant="small" color={theme.colors.gray[700]}>
                  {checkout.notes}
                </Typography>
              </View>
            )}
          </Card>

          {/* Invoices */}
          <Card style={styles.infoCard}>
            <Typography
              variant="small"
              weight="bold"
              color={theme.colors.gray[700]}
              style={styles.sectionTitle}>
              Invoices
            </Typography>
            {checkout.invoiceNumbers && checkout.invoiceNumbers.length > 0 ? (
              <>
                <View style={styles.detailRow}>
                  <Typography variant="caption" color={theme.colors.gray[500]}>
                    Count
                  </Typography>
                  <Typography variant="small" weight="semibold">
                    {checkout.invoiceNumbers.length} invoice(s)
                  </Typography>
                </View>
                {checkout.invoiceType && (
                  <View style={styles.detailRow}>
                    <Typography
                      variant="caption"
                      color={theme.colors.gray[500]}>
                      Type
                    </Typography>
                    <View
                      style={[
                        styles.inlineStatusBadge,
                        {
                          backgroundColor:
                            checkout.invoiceType === 'closed'
                              ? '#d1fae5'
                              : '#dbeafe',
                        },
                      ]}>
                      <Typography
                        variant="caption"
                        weight="bold"
                        color={
                          checkout.invoiceType === 'closed'
                            ? '#059669'
                            : '#2563eb'
                        }>
                        {checkout.invoiceType}
                      </Typography>
                    </View>
                  </View>
                )}
                <View style={styles.invoicesList}>
                  {checkout.invoiceNumbers.map((inv: string, idx: number) => (
                    <View key={idx} style={styles.invoiceChip}>
                      <Typography
                        variant="caption"
                        color={theme.colors.gray[700]}
                        style={{fontFamily: 'monospace'}}>
                        {inv}
                      </Typography>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <View style={styles.emptyInvoices}>
                <Typography variant="small" color={theme.colors.gray[400]}>
                  No invoices yet
                </Typography>
              </View>
            )}
          </Card>
        </View>

        {/* Items Taken */}
        <Card style={styles.itemsCard}>
          <View style={styles.itemsHeader}>
            <Typography variant="small" weight="bold" color={theme.colors.gray[700]}>
              Items Taken ({checkout.itemName ? '1' : checkout.itemsTaken?.length || 0})
            </Typography>
            <View style={styles.totalQtyBadge}>
              <Typography variant="caption" weight="bold" color={theme.colors.gray[600]}>
                Total Qty: {itemDisplay.qty}
              </Typography>
            </View>
          </View>

          {checkout.itemName ? (
            <View style={styles.itemRow}>
              <View style={{flex: 1}}>
                <Typography variant="body" weight="semibold">
                  {checkout.itemName}
                </Typography>
                {checkout.notes && (
                  <Typography
                    variant="caption"
                    color={theme.colors.gray[500]}
                    style={{marginTop: 2}}>
                    {checkout.notes}
                  </Typography>
                )}
              </View>
              <View style={styles.qtyChip}>
                <Typography variant="small" weight="bold">
                  x{checkout.quantityTaking}
                </Typography>
              </View>
            </View>
          ) : checkout.itemsTaken && checkout.itemsTaken.length > 0 ? (
            checkout.itemsTaken.map((item: any, idx: number) => (
              <View key={idx} style={styles.itemRow}>
                <View style={{flex: 1}}>
                  <Typography variant="body" weight="semibold">
                    {item.name || item.itemName}
                  </Typography>
                  <View style={{flexDirection: 'row', gap: 8, marginTop: 2}}>
                    {item.sku && (
                      <Typography variant="caption" color={theme.colors.gray[500]}>
                        SKU: {item.sku}
                      </Typography>
                    )}
                    {item.notes && (
                      <Typography variant="caption" color={theme.colors.gray[400]}>
                        • {item.notes}
                      </Typography>
                    )}
                  </View>
                </View>
                <View style={styles.qtyChip}>
                  <Typography variant="small" weight="bold">
                    x{item.quantity}
                  </Typography>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyInvoices}>
              <Typography variant="small" color={theme.colors.gray[400]}>
                No items
              </Typography>
            </View>
          )}
        </Card>

        {/* Tally Results */}
        {checkout.tallyResults &&
          checkout.tallyResults.discrepancies &&
          checkout.tallyResults.discrepancies.length > 0 && (
            <Card style={styles.tallyCard}>
              <Typography
                variant="small"
                weight="bold"
                color={theme.colors.gray[700]}
                style={styles.sectionTitle}>
                Tally Results
              </Typography>

              {/* Summary Stats */}
              <View style={styles.tallyStats}>
                <View style={[styles.tallyStat, {backgroundColor: '#dbeafe'}]}>
                  <Typography variant="caption" color="#1d4ed8" weight="semibold">
                    Taken
                  </Typography>
                  <Typography variant="h3" weight="bold" color="#1d4ed8">
                    {checkout.tallyResults.discrepancies.reduce(
                      (sum: number, i: any) => sum + i.quantityTaken,
                      0,
                    )}
                  </Typography>
                </View>
                <View style={[styles.tallyStat, {backgroundColor: '#d1fae5'}]}>
                  <Typography variant="caption" color="#059669" weight="semibold">
                    Sold
                  </Typography>
                  <Typography variant="h3" weight="bold" color="#059669">
                    {checkout.tallyResults.discrepancies.reduce(
                      (sum: number, i: any) => sum + i.quantitySold,
                      0,
                    )}
                  </Typography>
                </View>
                <View style={[styles.tallyStat, {backgroundColor: '#ffedd5'}]}>
                  <Typography variant="caption" color="#c2410c" weight="semibold">
                    Used
                  </Typography>
                  <Typography variant="h3" weight="bold" color="#c2410c">
                    {checkout.tallyResults.discrepancies.reduce(
                      (sum: number, i: any) => sum + i.quantityTaken,
                      0,
                    ) -
                      checkout.tallyResults.discrepancies.reduce(
                        (sum: number, i: any) => sum + i.quantitySold,
                        0,
                      )}
                  </Typography>
                </View>
              </View>

              {/* Item List */}
              {checkout.tallyResults.discrepancies.map(
                (item: any, idx: number) => (
                  <View
                    key={idx}
                    style={[
                      styles.tallyItem,
                      item.status !== 'matched' && {backgroundColor: '#fffbeb'},
                    ]}>
                    <View style={{flex: 1}}>
                      <Typography variant="small" weight="semibold">
                        {item.name}
                      </Typography>
                      {item.sku && (
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          {item.sku}
                        </Typography>
                      )}
                    </View>
                    <View style={styles.tallyNumbers}>
                      <View style={styles.tallyNumBox}>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          T
                        </Typography>
                        <Typography variant="small" weight="bold">
                          {item.quantityTaken}
                        </Typography>
                      </View>
                      <View style={styles.tallyNumBox}>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          S
                        </Typography>
                        <Typography variant="small" weight="bold" color="#059669">
                          {item.quantitySold}
                        </Typography>
                      </View>
                      <View style={styles.tallyNumBox}>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          U
                        </Typography>
                        <Typography
                          variant="small"
                          weight="bold"
                          color={item.difference > 0 ? '#c2410c' : theme.colors.gray[600]}>
                          {item.difference > 0 ? item.difference : 0}
                        </Typography>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.tallyStatusBadge,
                        {
                          backgroundColor:
                            item.status === 'matched'
                              ? '#d1fae5'
                              : item.status === 'excess'
                              ? '#dbeafe'
                              : '#fee2e2',
                        },
                      ]}>
                      <Typography
                        variant="caption"
                        weight="bold"
                        color={
                          item.status === 'matched'
                            ? '#059669'
                            : item.status === 'excess'
                            ? '#2563eb'
                            : '#dc2626'
                        }>
                        {item.status === 'matched'
                          ? 'OK'
                          : item.status === 'excess'
                          ? 'Ret'
                          : 'Short'}
                      </Typography>
                    </View>
                  </View>
                ),
              )}
            </Card>
          )}

        {/* Delete Button */}
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Typography variant="small" weight="semibold" color="#dc2626">
            Delete Checkout
          </Typography>
        </TouchableOpacity>
        </View>
      </ScrollView>
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
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  contentWrap: {
    width: '100%',
    maxWidth: bp.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: bp.gutter,
    paddingTop: bp.gutter,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCard: {
    marginBottom: 12,
    padding: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  infoGrid: {
    flexDirection: bp.isMobile ? 'column' : 'row',
    gap: 12,
    marginBottom: 12,
  },
  infoCard: {
    flex: bp.isMobile ? undefined : 1,
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
  },
  inlineStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  notesBox: {
    marginTop: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  invoicesList: {
    marginTop: 10,
    gap: 4,
  },
  invoiceChip: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyInvoices: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  itemsCard: {
    marginBottom: 12,
    padding: 0,
    overflow: 'hidden',
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  totalQtyBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  qtyChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 12,
  },
  tallyCard: {
    marginBottom: 12,
    padding: 16,
  },
  tallyStats: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  tallyStat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  tallyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  tallyNumbers: {
    flexDirection: 'row',
    gap: 10,
    marginRight: 10,
  },
  tallyNumBox: {
    alignItems: 'center',
  },
  tallyStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: rb(14 * btnPadScale),
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
    marginTop: 4,
    maxWidth: actionBtnMaxWidth,
    alignSelf: actionBtnMaxWidth ? 'center' : 'stretch',
    width: '100%',
  },
});
};
