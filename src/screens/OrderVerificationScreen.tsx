import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput as RNTextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {useAuth} from '../contexts/AuthContext';
import {useApiErrorHandler} from '../hooks/useApiErrorHandler';
import {useTheme} from '../contexts/ThemeContext';
import {Theme} from '../theme';
import {useBreakpoint, BreakpointInfo} from '../utils/breakpoints';
import ordersService from '../services/ordersService';
import orderDiscrepancyService from '../services/orderDiscrepancyService';
import {
  CheckCircleIcon,
  ClipboardIcon,
  AlertCircleIcon,
  ArrowLeftIcon,
} from '../components/icons';
import {formatDate} from '../utils/dateUtils';

interface OrderVerificationScreenProps {
  route: any;
  navigation: any;
}

interface OrderItem {
  sku: string;
  name: string;
  itemName?: string;
  qty: number;
  previouslyReceived: number;
  receivingNow: number;
  verificationHistory?: any[];
  notes?: string;
}

export const OrderVerificationScreen: React.FC<
  OrderVerificationScreenProps
> = ({route, navigation}) => {
  const theme = useTheme();
  const bp = useBreakpoint();
  const styles = useMemo(() => makeStyles(theme, bp), [theme, bp]);
  const {orderNumber} = route.params;
  const {token} = useAuth();
  const {handleApiError} = useApiErrorHandler();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState('');
  const [hasDiscrepancies, setHasDiscrepancies] = useState(false);

  useEffect(() => {
    if (orderNumber && token) {
      fetchOrder();
    }
  }, [orderNumber, token]);

  useEffect(() => {
    const discrepancies = items.some(item => {
      const receivingNow = parseFloat(item.receivingNow.toString()) || 0;
      const totalAfterThis = item.previouslyReceived + receivingNow;
      return totalAfterThis !== item.qty;
    });
    setHasDiscrepancies(discrepancies);
  }, [items]);

  const fetchOrder = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await ordersService.getOrderByNumber(token, orderNumber);
      if (response) {
        setOrder(response);
        setItems(
          response.items.map((item: any) => ({
            ...item,
            previouslyReceived: item.receivedQuantity || 0,
            receivingNow: Math.max(0, (item.qty || 0) - (item.receivedQuantity || 0)),
            itemName: item.name,
          })),
        );
      }
    } catch (error: any) {
      console.error('Fetch order error:', error);
      const wasHandled = await handleApiError(error);
      if (!wasHandled) {
        Alert.alert('Error', 'Failed to load order details');
      }
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const setItemQty = (index: number, value: number) => {
    const newItems = [...items];
    newItems[index].receivingNow = Math.max(0, value);
    setItems(newItems);
  };

  const handleQuantityChange = (index: number, value: string) => {
    setItemQty(index, parseFloat(value) || 0);
  };

  const handleAllGood = async () => {
    if (!token || !order?._id) return;
    Alert.alert(
      'Confirm All Good',
      'Mark all items as fully received?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setSubmitting(true);
              await orderDiscrepancyService.verifyOrder(token, order._id, {
                allGood: true,
                notes: notes.trim() || 'All items received as expected',
              });
              Alert.alert('Success', 'Order verified successfully', [
                {text: 'OK', onPress: () => navigation.goBack()},
              ]);
            } catch (error: any) {
              console.error('Verify order error:', error);
              const wasHandled = await handleApiError(error);
              if (!wasHandled) {
                Alert.alert('Error', error.message || 'Failed to verify order');
              }
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };

  const handleSubmitWithDiscrepancies = async () => {
    if (!token || !order?._id) return;
    Alert.alert(
      'Submit Verification',
      'Record received quantities. Remaining items will be tracked for future receipts.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Submit',
          onPress: async () => {
            try {
              setSubmitting(true);
              const itemsData = items.map(item => ({
                sku: item.sku,
                itemName: item.itemName || item.name,
                expectedQuantity: item.qty,
                receivedQuantity: parseFloat(item.receivingNow.toString()) || 0,
                notes: item.notes || '',
              }));
              const response = await orderDiscrepancyService.verifyOrder(
                token,
                order._id,
                {allGood: false, items: itemsData, notes: notes.trim()},
              );
              const {partiallyVerifiedItems = [], fullyReceived = false} = response;
              const message = fullyReceived
                ? 'Order fully received and verified'
                : `Partial receipt recorded — ${partiallyVerifiedItems.length} item(s) still pending`;
              Alert.alert('Success', message, [
                {text: 'OK', onPress: () => navigation.goBack()},
              ]);
            } catch (error: any) {
              console.error('Submit discrepancies error:', error);
              const wasHandled = await handleApiError(error);
              if (!wasHandled) {
                Alert.alert(
                  'Error',
                  error.message || 'Failed to submit verification',
                );
              }
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };

  const renderTopBar = (showSubtitle: boolean) => (
    <View style={styles.topBar}>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
        hitSlop={{top: 8, right: 8, bottom: 8, left: 8}}>
        <ArrowLeftIcon size={22} color={theme.colors.gray[900]} />
      </TouchableOpacity>
      <View style={styles.topBarTitleWrap}>
        <Typography variant="h3" weight="semibold">
          Verify Order
        </Typography>
        {showSubtitle && order?.orderNumber ? (
          <Typography variant="caption" color={theme.colors.gray[500]}>
            #{order.orderNumber}
          </Typography>
        ) : null}
      </View>
      <View style={styles.topBarRightSpacer} />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {renderTopBar(false)}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[600]} />
          <Typography variant="body" color={theme.colors.gray[600]} style={styles.loadingText}>
            Loading order…
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {renderTopBar(false)}
        <View style={styles.statusContainer}>
          <View style={[styles.statusIconWrap, {backgroundColor: theme.colors.error[100]}]}>
            <AlertCircleIcon size={32} color={theme.colors.error[600]} />
          </View>
          <Typography variant="h3" weight="semibold" style={styles.statusTitle}>
            Order not found
          </Typography>
          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={() => navigation.goBack()}>
            <Typography weight="semibold" color={theme.colors.white}>
              Go Back
            </Typography>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (order.verified) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {renderTopBar(true)}
        <View style={styles.statusContainer}>
          <View style={[styles.statusIconWrap, {backgroundColor: theme.colors.success[100]}]}>
            <CheckCircleIcon size={32} color={theme.colors.success[600]} />
          </View>
          <Typography variant="h3" weight="semibold" style={styles.statusTitle}>
            Already Verified
          </Typography>
          <Typography
            variant="body"
            color={theme.colors.gray[600]}
            style={styles.statusSubtitle}>
            This order has already been verified.
          </Typography>
          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={() => navigation.goBack()}>
            <Typography weight="semibold" color={theme.colors.white}>
              Go Back
            </Typography>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const summary = items.reduce(
    (acc, it) => {
      const recv = parseFloat(it.receivingNow.toString()) || 0;
      const after = it.previouslyReceived + recv;
      if (after >= it.qty) acc.complete++;
      else if (after > 0) acc.partial++;
      else acc.pending++;
      return acc;
    },
    {complete: 0, partial: 0, pending: 0},
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {renderTopBar(true)}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          {/* Order summary card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View style={styles.flex}>
                <Typography variant="caption" color={theme.colors.gray[500]}>
                  Vendor
                </Typography>
                <Typography variant="body" weight="semibold">
                  {order.vendor?.name || '—'}
                </Typography>
              </View>
              <View style={styles.summaryDateWrap}>
                <Typography variant="caption" color={theme.colors.gray[500]}>
                  Order Date
                </Typography>
                <Typography variant="body" weight="semibold">
                  {formatDate(order.orderDate)}
                </Typography>
              </View>
            </View>
            <View style={styles.summaryStatsRow}>
              <SummaryPill
                theme={theme}
                label="Items"
                value={items.length}
                tone="neutral"
              />
              <SummaryPill
                theme={theme}
                label="Complete"
                value={summary.complete}
                tone="success"
              />
              <SummaryPill
                theme={theme}
                label="Partial"
                value={summary.partial}
                tone="warning"
              />
              <SummaryPill
                theme={theme}
                label="Pending"
                value={summary.pending}
                tone="error"
              />
            </View>
          </View>

          {/* Items */}
          <View style={styles.itemsSection}>
            <View style={styles.itemsSectionHeader}>
              <Typography variant="body" weight="semibold">
                Items
              </Typography>
              <Typography variant="caption" color={theme.colors.gray[500]}>
                Tap − / + or type to adjust
              </Typography>
            </View>
            {items.map((item, index) => {
              const receivingNow = parseFloat(item.receivingNow.toString()) || 0;
              const previouslyReceived = item.previouslyReceived || 0;
              const expected = item.qty;
              const totalAfterThis = previouslyReceived + receivingNow;
              const remaining = Math.max(0, expected - totalAfterThis);
              const isFullyReceived = totalAfterThis >= expected;
              const status: 'complete' | 'partial' | 'pending' = isFullyReceived
                ? 'complete'
                : totalAfterThis > 0
                ? 'partial'
                : 'pending';
              const statusColor =
                status === 'complete'
                  ? {bg: theme.colors.success[100], fg: theme.colors.success[700]}
                  : status === 'partial'
                  ? {bg: theme.colors.warning[100], fg: theme.colors.warning[700]}
                  : {bg: theme.colors.gray[100], fg: theme.colors.gray[700]};
              const statusLabel =
                status === 'complete' ? 'Complete' : status === 'partial' ? 'Partial' : 'Pending';

              return (
                <View key={index} style={styles.itemCard}>
                  <View style={styles.itemHeaderRow}>
                    <View style={styles.flex}>
                      <Typography variant="body" weight="semibold" numberOfLines={2}>
                        {item.name}
                      </Typography>
                      <View style={styles.itemMetaRow}>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          SKU {item.sku || '—'}
                        </Typography>
                        {previouslyReceived > 0 ? (
                          <>
                            <View style={styles.metaDot} />
                            <Typography variant="caption" color={theme.colors.gray[500]}>
                              {previouslyReceived} of {expected} received
                            </Typography>
                          </>
                        ) : null}
                      </View>
                    </View>
                    <View style={[styles.statusPill, {backgroundColor: statusColor.bg}]}>
                      <Typography
                        variant="caption"
                        weight="semibold"
                        color={statusColor.fg}>
                        {statusLabel}
                      </Typography>
                    </View>
                  </View>

                  <View style={styles.stepperRow}>
                    <View style={styles.stepperLabelWrap}>
                      <Typography variant="caption" color={theme.colors.gray[500]}>
                        Receiving now
                      </Typography>
                      <Typography variant="caption" color={theme.colors.gray[500]}>
                        Expected {expected} • Remaining {remaining}
                      </Typography>
                    </View>
                    <View style={styles.stepper}>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => setItemQty(index, receivingNow - 1)}
                        hitSlop={{top: 8, right: 8, bottom: 8, left: 8}}>
                        <Typography variant="h3" weight="semibold" color={theme.colors.gray[700]}>
                          −
                        </Typography>
                      </TouchableOpacity>
                      <RNTextInput
                        style={styles.stepInput}
                        value={item.receivingNow.toString()}
                        onChangeText={value => handleQuantityChange(index, value)}
                        keyboardType="numeric"
                        selectTextOnFocus
                      />
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => setItemQty(index, receivingNow + 1)}
                        hitSlop={{top: 8, right: 8, bottom: 8, left: 8}}>
                        <Typography variant="h3" weight="semibold" color={theme.colors.gray[700]}>
                          +
                        </Typography>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Notes */}
          <View style={styles.notesCard}>
            <Typography variant="body" weight="semibold" style={styles.notesLabel}>
              Notes
              <Typography variant="caption" color={theme.colors.gray[500]}>
                {'  '}(optional)
              </Typography>
            </Typography>
            <RNTextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any notes about this verification…"
              placeholderTextColor={theme.colors.gray[400]}
              multiline
              numberOfLines={3}
            />
          </View>

          {hasDiscrepancies ? (
            <View style={styles.discrepancyHint}>
              <AlertCircleIcon size={16} color={theme.colors.warning[600]} />
              <Typography variant="caption" color={theme.colors.warning[700]} style={styles.flex}>
                Some items aren't fully received. Remaining quantities will be tracked.
              </Typography>
            </View>
          ) : null}
        </ScrollView>

        {/* Sticky bottom bar */}
        <SafeAreaView edges={['bottom']} style={styles.bottomBarSafe}>
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => navigation.goBack()}
              disabled={submitting}>
              <Typography weight="semibold" color={theme.colors.gray[700]}>
                Cancel
              </Typography>
            </TouchableOpacity>
            {!hasDiscrepancies ? (
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  {backgroundColor: theme.colors.success[600]},
                  submitting && styles.btnDisabled,
                ]}
                onPress={handleAllGood}
                disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator size="small" color={theme.colors.white} />
                ) : (
                  <>
                    <CheckCircleIcon size={18} color={theme.colors.white} />
                    <Typography weight="semibold" color={theme.colors.white}>
                      All Good
                    </Typography>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  {backgroundColor: theme.colors.primary[600]},
                  submitting && styles.btnDisabled,
                ]}
                onPress={handleSubmitWithDiscrepancies}
                disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator size="small" color={theme.colors.white} />
                ) : (
                  <>
                    <ClipboardIcon size={18} color={theme.colors.white} />
                    <Typography weight="semibold" color={theme.colors.white}>
                      Submit Receipt
                    </Typography>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const SummaryPill: React.FC<{
  theme: Theme;
  label: string;
  value: number;
  tone: 'neutral' | 'success' | 'warning' | 'error';
}> = ({theme, label, value, tone}) => {
  const palette =
    tone === 'success'
      ? {bg: theme.colors.success[50], fg: theme.colors.success[700]}
      : tone === 'warning'
      ? {bg: theme.colors.warning[50], fg: theme.colors.warning[700]}
      : tone === 'error'
      ? {bg: theme.colors.gray[100], fg: theme.colors.gray[700]}
      : {bg: theme.colors.gray[100], fg: theme.colors.gray[700]};
  return (
    <View style={[styles_summaryPill.wrap, {backgroundColor: palette.bg}]}>
      <Typography variant="h4" weight="bold" color={palette.fg}>
        {value}
      </Typography>
      <Typography variant="caption" color={palette.fg}>
        {label}
      </Typography>
    </View>
  );
};

const styles_summaryPill = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    alignItems: 'center',
  },
});

const makeStyles = (theme: Theme, bp: BreakpointInfo) => {
  const actionBtnMaxWidth = bp.isWide ? 560 : bp.isDesktop ? 480 : undefined;
  const btnPadScale = bp.isWide ? 1.3 : bp.isDesktop ? 1.15 : 1;
  const rb = (n: number) => Math.round(n);
  return StyleSheet.create({
    flex: {flex: 1},
    container: {
      flex: 1,
      backgroundColor: theme.colors.gray[50],
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: theme.colors.white,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.gray[200],
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    topBarTitleWrap: {
      flex: 1,
      alignItems: 'center',
    },
    topBarRightSpacer: {
      width: 36,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 12,
    },
    statusContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    statusIconWrap: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    statusTitle: {
      marginBottom: 4,
    },
    statusSubtitle: {
      textAlign: 'center',
      marginBottom: 24,
    },
    primaryActionBtn: {
      paddingHorizontal: 24,
      paddingVertical: rb(12 * btnPadScale),
      backgroundColor: theme.colors.primary[600],
      borderRadius: 10,
      maxWidth: actionBtnMaxWidth,
      alignSelf: actionBtnMaxWidth ? 'center' : 'stretch',
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 32,
      maxWidth: bp.contentMaxWidth,
      alignSelf: 'center',
      width: '100%',
    },
    summaryCard: {
      backgroundColor: theme.colors.white,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.gray[200],
      padding: 16,
      marginBottom: 16,
    },
    summaryHeader: {
      flexDirection: 'row',
      marginBottom: 12,
    },
    summaryDateWrap: {
      alignItems: 'flex-end',
    },
    summaryStatsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    itemsSection: {
      marginBottom: 12,
    },
    itemsSectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    itemCard: {
      backgroundColor: theme.colors.white,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.gray[200],
      padding: 14,
      marginBottom: 10,
    },
    itemHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 8,
      marginBottom: 12,
    },
    itemMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 2,
      flexWrap: 'wrap',
    },
    metaDot: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: theme.colors.gray[400],
    },
    statusPill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
    },
    stepperRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    stepperLabelWrap: {
      flex: 1,
      gap: 2,
    },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.gray[100],
      borderRadius: 10,
      padding: 2,
    },
    stepBtn: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
    },
    stepInput: {
      minWidth: 44,
      textAlign: 'center',
      paddingVertical: 4,
      paddingHorizontal: 8,
      color: theme.colors.gray[900],
      fontSize: theme.typography.roles.sideheading.fontSize,
      fontWeight: '600',
    },
    notesCard: {
      backgroundColor: theme.colors.white,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.gray[200],
      padding: 14,
      marginBottom: 12,
    },
    notesLabel: {
      marginBottom: 8,
    },
    notesInput: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.gray[200],
      borderRadius: 10,
      padding: 12,
      color: theme.colors.gray[900],
      minHeight: 72,
      textAlignVertical: 'top',
      backgroundColor: theme.colors.gray[50],
    },
    discrepancyHint: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      padding: 12,
      backgroundColor: theme.colors.warning[50],
      borderRadius: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.warning[100],
    },
    bottomBarSafe: {
      backgroundColor: theme.colors.white,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.gray[200],
    },
    bottomBar: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 10,
      maxWidth: actionBtnMaxWidth ?? bp.contentMaxWidth,
      alignSelf: 'center',
      width: '100%',
    },
    cancelBtn: {
      paddingHorizontal: 16,
      paddingVertical: rb(12 * btnPadScale),
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
      backgroundColor: theme.colors.white,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: rb(12 * btnPadScale),
      borderRadius: 10,
    },
    btnDisabled: {
      opacity: 0.5,
    },
  });
};
