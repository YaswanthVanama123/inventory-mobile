import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {useAuth} from '../contexts/AuthContext';
import {useApiErrorHandler} from '../hooks/useApiErrorHandler';
import {useTheme} from '../contexts/ThemeContext';
import {Theme} from '../theme';
import ordersService from '../services/ordersService';
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  FileTextIcon,
  ClipboardIcon,
  TruckIcon,
  BoxIcon,
} from '../components/icons';
import {formatDateTime} from '../utils/dateUtils';
import {useBreakpoint, BreakpointInfo} from '../utils/breakpoints';

interface OrderDetailScreenProps {
  visible: boolean;
  onClose: () => void;
  orderNumber: string | null;
}

export const OrderDetailScreen: React.FC<OrderDetailScreenProps> = ({
  visible,
  onClose,
  orderNumber,
}) => {
  const theme = useTheme();
  const bp = useBreakpoint();
  const styles = useMemo(() => makeStyles(theme, bp), [theme, bp]);
  const {token} = useAuth();
  const {handleApiError} = useApiErrorHandler();
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!token || !orderNumber) return;
    try {
      setLoading(true);
      setError(null);
      setOrder(null);
      // getOrderByNumber → GET /customerconnect/orders/:orderNumber, returns the
      // full order object (result.data) with items, tracking & stock-processing.
      const detail = await ordersService.getOrderByNumber(token, orderNumber);
      setOrder(detail);
    } catch (err: any) {
      console.error('Failed to load order detail:', err);
      const wasHandled = await handleApiError(err);
      if (!wasHandled) setError(err.message || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, orderNumber]);

  useEffect(() => {
    if (visible && orderNumber) {
      loadDetail();
    }
  }, [visible, orderNumber, loadDetail]);

  const formatCurrency = (amount: number) => `$${(amount || 0).toFixed(2)}`;

  type StatusTone = 'success' | 'primary' | 'error' | 'gray';
  const getStatusTone = (status: string): StatusTone => {
    if (status === 'Complete') return 'success';
    if (status === 'Processing' || status === 'Shipped') return 'primary';
    if (status === 'Cancelled') return 'error';
    return 'gray';
  };
  const tonePalette = (tone: StatusTone) => {
    if (tone === 'gray')
      return {bg: theme.colors.gray[100], fg: theme.colors.gray[700]};
    return {bg: theme.colors[tone][50], fg: theme.colors[tone][700]};
  };

  const items: any[] = order?.items || [];
  const statusTone = getStatusTone(order?.status);
  const statusPalette = tonePalette(statusTone);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.backBtn}
            activeOpacity={0.85}>
            <ArrowLeftIcon size={18} color={theme.colors.primary[700]} />
            <Typography variant="small" weight="semibold" color={theme.colors.primary[700]}>
              Back
            </Typography>
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Typography variant="h4" weight="bold" numberOfLines={1}>
              Order {orderNumber ? `#${orderNumber}` : ''}
            </Typography>
            <Typography variant="caption" color={theme.colors.gray[500]}>
              Purchase order details
            </Typography>
          </View>
        </View>

        {loading ? (
          <View style={styles.centerFill}>
            <ActivityIndicator size="large" color={theme.colors.primary[600]} />
            <Typography variant="body" color={theme.colors.gray[600]} style={{marginTop: 16}}>
              Loading order...
            </Typography>
          </View>
        ) : error ? (
          <View style={styles.centerFill}>
            <AlertCircleIcon size={40} color={theme.colors.error[600]} />
            <Typography variant="body" color={theme.colors.error[700]} align="center" style={{marginTop: 12}}>
              {error}
            </Typography>
          </View>
        ) : !order ? (
          <View style={styles.centerFill}>
            <FileTextIcon size={40} color={theme.colors.gray[400]} />
            <Typography variant="body" color={theme.colors.gray[600]} style={{marginTop: 12}}>
              Order not found
            </Typography>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            <View style={styles.contentWrap}>
              {/* Status badges */}
              <View style={styles.badgeRow}>
                <View style={[styles.pill, {backgroundColor: statusPalette.bg}]}>
                  <Typography variant="caption" weight="semibold" color={statusPalette.fg}>
                    {order.status || 'Pending'}
                  </Typography>
                </View>
                {order.stockProcessed ? (
                  <View style={[styles.pill, {backgroundColor: theme.colors.success[50]}]}>
                    <CheckCircleIcon size={11} color={theme.colors.success[600]} />
                    <Typography variant="caption" weight="semibold" color={theme.colors.success[700]}>
                      Stock Processed
                    </Typography>
                  </View>
                ) : (
                  <View style={[styles.pill, {backgroundColor: theme.colors.warning[50]}]}>
                    <ClockIcon size={11} color={theme.colors.warning[600]} />
                    <Typography variant="caption" weight="semibold" color={theme.colors.warning[700]}>
                      Stock Pending
                    </Typography>
                  </View>
                )}
                {order.source === 'manual' && (
                  <View style={[styles.pill, {backgroundColor: theme.colors.accent[100]}]}>
                    <Typography variant="caption" weight="bold" color={theme.colors.accent[700]}>
                      MANUAL
                    </Typography>
                  </View>
                )}
              </View>

              {/* Order Information */}
              <Card variant="elevated" padding="lg" style={styles.sectionCard}>
                <View style={styles.sectionHead}>
                  <View style={[styles.sectionIcon, {backgroundColor: theme.colors.primary[50]}]}>
                    <FileTextIcon size={16} color={theme.colors.primary[600]} />
                  </View>
                  <Typography variant="body" weight="semibold">Order Information</Typography>
                </View>
                <Row label="Order Number">
                  <Typography variant="small" weight="semibold">#{order.orderNumber}</Typography>
                </Row>
                <Row label="Order Date">
                  <Typography variant="small">{formatDateTime(order.orderDate)}</Typography>
                </Row>
                <Row label="Status">
                  <View style={[styles.pill, {backgroundColor: statusPalette.bg, alignSelf: 'flex-end'}]}>
                    <Typography variant="caption" weight="semibold" color={statusPalette.fg}>
                      {order.status || 'Pending'}
                    </Typography>
                  </View>
                </Row>
                <Row label="Total Amount" last>
                  <Typography variant="body" weight="bold" color={theme.colors.success[700]}>
                    {formatCurrency(order.total)}
                  </Typography>
                </Row>
              </Card>

              {/* Vendor Information */}
              <Card variant="elevated" padding="lg" style={styles.sectionCard}>
                <View style={styles.sectionHead}>
                  <View style={[styles.sectionIcon, {backgroundColor: theme.colors.accent[50]}]}>
                    <TruckIcon size={16} color={theme.colors.accent[700]} />
                  </View>
                  <Typography variant="body" weight="semibold">Vendor Information</Typography>
                </View>
                <Row label="Vendor Name">
                  <Typography variant="small" weight="semibold">{order.vendor?.name || 'N/A'}</Typography>
                </Row>
                {order.vendor?.id ? (
                  <Row label="Vendor ID">
                    <Typography variant="small">{order.vendor.id}</Typography>
                  </Row>
                ) : null}
                <Row label="Tracking Number" last>
                  <Typography variant="small" weight={order.trackingNumber ? 'semibold' : 'normal'} color={order.trackingNumber ? undefined : theme.colors.gray[400]}>
                    {order.trackingNumber || 'N/A'}
                  </Typography>
                </Row>
              </Card>

              {/* Stock Processing Status */}
              <Card variant="elevated" padding="lg" style={styles.sectionCard}>
                <View style={styles.sectionHead}>
                  <View style={[styles.sectionIcon, {backgroundColor: theme.colors.success[50]}]}>
                    <BoxIcon size={16} color={theme.colors.success[600]} />
                  </View>
                  <Typography variant="body" weight="semibold">Stock Processing</Typography>
                </View>
                <Row label="Stock Processed">
                  {order.stockProcessed ? (
                    <View style={[styles.pill, {backgroundColor: theme.colors.success[50], alignSelf: 'flex-end'}]}>
                      <Typography variant="caption" weight="semibold" color={theme.colors.success[700]}>Yes</Typography>
                    </View>
                  ) : (
                    <View style={[styles.pill, {backgroundColor: theme.colors.gray[100], alignSelf: 'flex-end'}]}>
                      <Typography variant="caption" weight="semibold" color={theme.colors.gray[700]}>No</Typography>
                    </View>
                  )}
                </Row>
                {order.stockProcessedAt ? (
                  <Row label="Processed At" last={!order.stockProcessingError}>
                    <Typography variant="small">{formatDateTime(order.stockProcessedAt)}</Typography>
                  </Row>
                ) : null}
                {order.stockProcessingError ? (
                  <View style={styles.errorBox}>
                    <Typography variant="caption" weight="semibold" color={theme.colors.error[700]} style={{marginBottom: 2}}>
                      Processing Error
                    </Typography>
                    <Typography variant="small" color={theme.colors.error[600]}>
                      {order.stockProcessingError}
                    </Typography>
                  </View>
                ) : null}
              </Card>

              {/* Order Items */}
              {items.length > 0 && (
                <Card variant="elevated" padding="none" style={styles.sectionCard}>
                  <View style={[styles.sectionHead, styles.itemsHead]}>
                    <View style={[styles.sectionIcon, {backgroundColor: theme.colors.primary[50]}]}>
                      <ClipboardIcon size={16} color={theme.colors.primary[600]} />
                    </View>
                    <Typography variant="body" weight="semibold">Order Items ({items.length})</Typography>
                  </View>
                  {/* Table header */}
                  <View style={styles.tableHeadRow}>
                    <Typography variant="caption" weight="semibold" color={theme.colors.gray[500]} style={styles.colSku}>SKU</Typography>
                    <Typography variant="caption" weight="semibold" color={theme.colors.gray[500]} style={styles.colName}>NAME</Typography>
                    <Typography variant="caption" weight="semibold" color={theme.colors.gray[500]} style={[styles.colQty, styles.tdRight]}>QTY</Typography>
                    <Typography variant="caption" weight="semibold" color={theme.colors.gray[500]} style={[styles.colPrice, styles.tdRight]}>UNIT</Typography>
                    <Typography variant="caption" weight="semibold" color={theme.colors.gray[500]} style={[styles.colTotal, styles.tdRight]}>TOTAL</Typography>
                    <Typography variant="caption" weight="semibold" color={theme.colors.gray[500]} style={styles.colStatus}>STATUS</Typography>
                  </View>
                  {items.map((item: any, idx: number) => (
                    <View key={idx} style={styles.itemRow}>
                      <Typography variant="caption" weight="semibold" numberOfLines={1} style={styles.colSku}>{item.sku || 'N/A'}</Typography>
                      <Typography variant="caption" numberOfLines={2} style={styles.colName}>{item.name || 'N/A'}</Typography>
                      <Typography variant="caption" weight="bold" style={[styles.colQty, styles.tdRight]}>{item.qty || 0}</Typography>
                      <Typography variant="caption" style={[styles.colPrice, styles.tdRight]}>{formatCurrency(item.unitPrice || 0)}</Typography>
                      <Typography variant="caption" weight="bold" color={theme.colors.success[700]} style={[styles.colTotal, styles.tdRight]}>
                        {formatCurrency(item.lineTotal || (item.qty || 0) * (item.unitPrice || 0))}
                      </Typography>
                      <View style={styles.colStatus}>
                        {item.itemVerified === true ? (
                          <View style={[styles.statusPill, {backgroundColor: theme.colors.success[50]}]}>
                            <Typography variant="caption" weight="semibold" color={theme.colors.success[700]}>Verified</Typography>
                          </View>
                        ) : (item.receivedQuantity || 0) > 0 ? (
                          <View style={[styles.statusPill, {backgroundColor: theme.colors.warning[50]}]}>
                            <Typography variant="caption" weight="semibold" color={theme.colors.warning[700]}>
                              Partial {item.receivedQuantity}/{item.qty}
                            </Typography>
                          </View>
                        ) : (
                          <View style={[styles.statusPill, {backgroundColor: theme.colors.gray[100]}]}>
                            <Typography variant="caption" weight="semibold" color={theme.colors.gray[700]}>Not Verified</Typography>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
                  {/* Footer total */}
                  <View style={styles.tableFootRow}>
                    <Typography variant="small" weight="semibold" color={theme.colors.gray[700]} style={{flex: 1, textAlign: 'right', paddingRight: 12}}>
                      Total:
                    </Typography>
                    <Typography variant="body" weight="bold" color={theme.colors.success[700]}>
                      {formatCurrency(order.total)}
                    </Typography>
                  </View>
                </Card>
              )}

              {/* Notes */}
              {order.notes ? (
                <Card variant="elevated" padding="lg" style={styles.sectionCard}>
                  <View style={styles.sectionHead}>
                    <View style={[styles.sectionIcon, {backgroundColor: theme.colors.gray[100]}]}>
                      <FileTextIcon size={16} color={theme.colors.gray[600]} />
                    </View>
                    <Typography variant="body" weight="semibold">Notes</Typography>
                  </View>
                  <Typography variant="small" color={theme.colors.gray[600]}>
                    {order.notes}
                  </Typography>
                </Card>
              ) : null}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
};

// Small labelled key/value row used across the info cards.
const Row: React.FC<{label: string; last?: boolean; children: React.ReactNode}> = ({
  label,
  last,
  children,
}) => {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        paddingVertical: 8,
        borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.gray[200],
      }}>
      <Typography variant="caption" weight="semibold" color={theme.colors.gray[500]}>
        {label}
      </Typography>
      <View style={{flexShrink: 1, alignItems: 'flex-end'}}>{children}</View>
    </View>
  );
};

const makeStyles = (theme: Theme, bp: BreakpointInfo) =>
  StyleSheet.create({
    container: {flex: 1, backgroundColor: theme.colors.gray[50]},
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      paddingHorizontal: bp.gutter,
      paddingVertical: theme.spacing.sm + 2,
      backgroundColor: theme.colors.white,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.gray[200],
    },
    backBtn: {flexDirection: 'row', alignItems: 'center', gap: 4},
    headerTitleWrap: {flex: 1},
    centerFill: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32},
    scrollView: {flex: 1},
    scrollContent: {paddingVertical: theme.spacing.lg, paddingBottom: theme.spacing.xxxl},
    contentWrap: {
      width: '100%',
      maxWidth: bp.contentMaxWidth,
      alignSelf: 'center',
      paddingHorizontal: bp.gutter,
    },
    badgeRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: theme.spacing.md},
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    sectionCard: {marginBottom: theme.spacing.md},
    sectionHead: {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: theme.spacing.sm},
    itemsHead: {padding: theme.spacing.md, marginBottom: 0, borderBottomWidth: 1, borderBottomColor: theme.colors.gray[200]},
    sectionIcon: {width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center'},
    errorBox: {
      marginTop: theme.spacing.sm,
      backgroundColor: theme.colors.error[50],
      borderRadius: 10,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.error[200],
    },
    tableHeadRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.gray[50],
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.gray[200],
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + 2,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.gray[200],
    },
    tableFootRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.gray[50],
    },
    colSku: {flex: 1.2, paddingRight: 6},
    colName: {flex: 2, paddingRight: 6},
    colQty: {flex: 0.6, paddingRight: 6},
    colPrice: {flex: 1, paddingRight: 6},
    colTotal: {flex: 1.1, paddingRight: 6},
    colStatus: {flex: 1.4, paddingLeft: 6},
    tdRight: {textAlign: 'right'},
    statusPill: {alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999},
  });

export default OrderDetailScreen;
