import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput as RNTextInput,
  Modal,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {Button} from '../components/atoms/Button';
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
  const {token, user} = useAuth();
  const isAdmin = user?.role === 'admin';
  const {handleApiError} = useApiErrorHandler();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkout, setCheckout] = useState<any>(null);

  // Complete / Add-invoices modal state
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [invoiceNumbers, setInvoiceNumbers] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [invoiceType, setInvoiceType] = useState<'closed' | 'pending'>('closed');
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [checkWorkDone, setCheckWorkDone] = useState(false);
  const [addMoreMode, setAddMoreMode] = useState(false);
  // Cancel modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

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

  // ---- Invoice chip input helpers ----
  const addInvoice = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !invoiceNumbers.includes(trimmed)) {
      setInvoiceNumbers(prev => [...prev, trimmed]);
    }
  };
  const removeInvoice = (inv: string) => {
    setInvoiceNumbers(prev => prev.filter(i => i !== inv));
  };
  const handleInvoiceInputChange = (value: string) => {
    if (value.includes(',')) {
      value
        .split(',')
        .map(p => p.trim())
        .filter(Boolean)
        .forEach(addInvoice);
      setCurrentInput('');
    } else {
      setCurrentInput(value);
    }
  };
  const commitCurrentInput = () => {
    if (currentInput.trim()) {
      addInvoice(currentInput);
      setCurrentInput('');
    }
  };

  const resetCompleteModal = () => {
    setShowCompleteModal(false);
    setInvoiceNumbers([]);
    setCurrentInput('');
    setComparisonData(null);
    setCheckWorkDone(false);
    setAddMoreMode(false);
  };

  const openCompleteModal = () => {
    setInvoiceNumbers([]);
    setCurrentInput('');
    setInvoiceType((checkout?.invoiceType as any) || 'closed');
    setComparisonData(null);
    setCheckWorkDone(false);
    setAddMoreMode(false);
    setShowCompleteModal(true);
  };

  const openAddMoreModal = () => {
    // Seed with the existing invoices; completing sends the full merged list.
    setInvoiceNumbers([...(checkout?.invoiceNumbers || [])]);
    setCurrentInput('');
    setInvoiceType((checkout?.invoiceType as any) || 'closed');
    setComparisonData(null);
    setCheckWorkDone(false);
    setAddMoreMode(true);
    setShowCompleteModal(true);
  };

  const showCheckWorkError = (error: any) => {
    const data = error?.response?.data;
    if (data?.duplicateCheckouts && data.duplicateCheckouts.length > 0) {
      const details = data.duplicateCheckouts
        .map(
          (dup: any) =>
            `${dup.employeeName} (Checkout #${dup.checkoutId}): ${(dup.invoices || []).join(', ')}`,
        )
        .join('\n');
      Alert.alert(
        'Duplicate Invoices',
        `${data.message}\n\nDuplicate invoices found in:\n${details}`,
      );
    } else {
      Alert.alert('Error', data?.message || error?.message || 'Failed to check work');
    }
  };

  const handleCheckWork = async () => {
    if (invoiceNumbers.length === 0) {
      Alert.alert('Validation', 'Please enter at least one invoice number');
      return;
    }
    if (!token) return;
    try {
      setActionLoading('check-work');
      const response = await truckCheckoutService.checkWork(
        token,
        checkoutId,
        invoiceNumbers,
        invoiceType,
      );
      setComparisonData(response.data);
      setCheckWorkDone(true);
    } catch (error: any) {
      console.error('Check work error:', error);
      showCheckWorkError(error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async () => {
    if (!checkWorkDone) {
      Alert.alert('Validation', 'Please tap "Check Work" first to review the comparison');
      return;
    }
    if (!token) return;
    try {
      setActionLoading('complete');
      await truckCheckoutService.completeCheckout(
        token,
        checkoutId,
        invoiceNumbers,
        invoiceType,
      );
      Alert.alert('Success', addMoreMode ? 'Checkout updated successfully' : 'Checkout completed successfully');
      resetCompleteModal();
      loadCheckout();
    } catch (error: any) {
      console.error('Complete error:', error);
      const wasHandled = await handleApiError(error);
      if (!wasHandled) {
        Alert.alert('Error', error?.response?.data?.message || error?.message || 'Failed to complete checkout');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!token) return;
    try {
      setActionLoading('cancel');
      await truckCheckoutService.cancelCheckout(token, checkoutId, cancelReason);
      Alert.alert('Success', 'Checkout cancelled');
      setShowCancelModal(false);
      setCancelReason('');
      loadCheckout();
    } catch (error: any) {
      console.error('Cancel error:', error);
      const wasHandled = await handleApiError(error);
      if (!wasHandled) {
        Alert.alert('Error', error?.response?.data?.message || error?.message || 'Failed to cancel checkout');
      }
    } finally {
      setActionLoading(null);
    }
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

        {/* Status-driven actions */}
        {checkout.status === 'checked_out' && (
          <Card style={styles.actionCard}>
            <Button
              title="Add Invoices & Complete"
              variant="primary"
              fullWidth
              onPress={openCompleteModal}
              style={{marginBottom: 10}}
            />
            <Button
              title="Cancel Checkout"
              variant="outline"
              fullWidth
              onPress={() => {
                setCancelReason('');
                setShowCancelModal(true);
              }}
            />
          </Card>
        )}
        {checkout.status === 'completed' &&
          !checkout.stockProcessed &&
          checkout.invoiceNumbers &&
          checkout.invoiceNumbers.length > 0 && (
            <Card style={styles.actionCard}>
              <Button
                title="Add More Invoices"
                variant="secondary"
                fullWidth
                onPress={openAddMoreModal}
              />
            </Card>
          )}
        {checkout.status === 'completed' && checkout.stockProcessed && (
          <Card style={[styles.actionCard, styles.stockProcessedRow]}>
            <CheckCircleIcon size={16} color="#059669" />
            <Typography variant="small" weight="semibold" color="#059669">
              Stock Processed
            </Typography>
          </Card>
        )}

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

        {/* Delete Button (admin only) */}
        {isAdmin && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Typography variant="small" weight="semibold" color="#dc2626">
              Delete Checkout
            </Typography>
          </TouchableOpacity>
        )}
        </View>
      </ScrollView>

      {/* Complete / Add-More Invoices Modal */}
      <Modal
        visible={showCompleteModal}
        transparent
        animationType="slide"
        onRequestClose={() => !actionLoading && resetCompleteModal()}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Typography variant="h3" weight="bold">
                {checkWorkDone
                  ? addMoreMode
                    ? 'Review & Update'
                    : 'Review & Complete'
                  : addMoreMode
                  ? 'Add More Invoices'
                  : 'Add Invoices & Complete'}
              </Typography>
              <TouchableOpacity
                onPress={() => !actionLoading && resetCompleteModal()}>
                <Typography variant="h3" color={theme.colors.gray[400]}>
                  ×
                </Typography>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {!checkWorkDone ? (
                <>
                  {addMoreMode && (
                    <View style={styles.infoBanner}>
                      <Typography variant="caption" color="#1d4ed8">
                        This checkout already has{' '}
                        {checkout.invoiceNumbers?.length || 0} invoice(s). Add
                        more below; the full list is re-checked on complete.
                      </Typography>
                    </View>
                  )}
                  <Typography
                    variant="small"
                    weight="semibold"
                    color={theme.colors.gray[700]}
                    style={{marginBottom: 8}}>
                    Invoice Numbers
                  </Typography>
                  <View style={styles.chipInputWrap}>
                    <View style={styles.chipRow}>
                      {invoiceNumbers.map((inv, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={styles.chip}
                          onPress={() => removeInvoice(inv)}>
                          <Typography variant="caption" color="#1d4ed8">
                            {inv} ×
                          </Typography>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <RNTextInput
                      value={currentInput}
                      onChangeText={handleInvoiceInputChange}
                      onSubmitEditing={commitCurrentInput}
                      onBlur={commitCurrentInput}
                      blurOnSubmit={false}
                      placeholder="Type invoice # and press return or comma"
                      placeholderTextColor={theme.colors.gray[400]}
                      style={styles.chipTextInput}
                    />
                  </View>
                  <Typography
                    variant="caption"
                    color={theme.colors.gray[500]}
                    style={{marginTop: 6, marginBottom: 14}}>
                    Press return or comma to add. Tap a chip to remove.
                  </Typography>

                  <Typography
                    variant="small"
                    weight="semibold"
                    color={theme.colors.gray[700]}
                    style={{marginBottom: 8}}>
                    Invoice Type
                  </Typography>
                  <View style={styles.typeToggle}>
                    {(['closed', 'pending'] as const).map(t => (
                      <TouchableOpacity
                        key={t}
                        style={[
                          styles.typeOption,
                          invoiceType === t && styles.typeOptionActive,
                        ]}
                        onPress={() => setInvoiceType(t)}>
                        <Typography
                          variant="small"
                          weight="semibold"
                          color={
                            invoiceType === t
                              ? theme.colors.primary[600]
                              : theme.colors.gray[500]
                          }>
                          {t === 'closed' ? 'Closed' : 'Pending'}
                        </Typography>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : (
                comparisonData && (
                  <>
                    <View style={styles.successBanner}>
                      <Typography variant="caption" color="#059669">
                        {comparisonData.summary?.fetchedInvoices} of{' '}
                        {comparisonData.summary?.totalInvoices} invoices fetched.
                        Matched: {comparisonData.summary?.matched} |
                        Discrepancies: {comparisonData.summary?.discrepancies}
                      </Typography>
                    </View>
                    <View style={styles.compHeaderRow}>
                      <Typography
                        variant="caption"
                        weight="bold"
                        color={theme.colors.gray[500]}
                        style={{flex: 2}}>
                        ITEM
                      </Typography>
                      <Typography
                        variant="caption"
                        weight="bold"
                        color={theme.colors.gray[500]}
                        style={styles.compNumCol}>
                        TAKEN
                      </Typography>
                      <Typography
                        variant="caption"
                        weight="bold"
                        color={theme.colors.gray[500]}
                        style={styles.compNumCol}>
                        SOLD
                      </Typography>
                      <Typography
                        variant="caption"
                        weight="bold"
                        color={theme.colors.gray[500]}
                        style={styles.compNumCol}>
                        DIFF
                      </Typography>
                    </View>
                    {(comparisonData.comparison?.discrepancies || []).map(
                      (item: any, idx: number) => (
                        <View
                          key={idx}
                          style={[
                            styles.compRow,
                            item.status !== 'matched' && {
                              backgroundColor: '#fffbeb',
                            },
                          ]}>
                          <View style={{flex: 2}}>
                            <Typography variant="caption" weight="semibold">
                              {item.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color={
                                item.status === 'matched'
                                  ? '#059669'
                                  : item.status === 'excess'
                                  ? '#2563eb'
                                  : '#dc2626'
                              }>
                              {item.status === 'matched'
                                ? 'Matched'
                                : item.status === 'excess'
                                ? 'Excess (Returns)'
                                : 'Shortage'}
                            </Typography>
                          </View>
                          <Typography variant="caption" style={styles.compNumCol}>
                            {item.quantityTaken}
                          </Typography>
                          <Typography variant="caption" style={styles.compNumCol}>
                            {item.quantitySold}
                          </Typography>
                          <Typography
                            variant="caption"
                            weight="bold"
                            color={
                              item.difference === 0
                                ? '#059669'
                                : item.difference > 0
                                ? '#2563eb'
                                : '#dc2626'
                            }
                            style={styles.compNumCol}>
                            {item.difference > 0
                              ? `+${item.difference}`
                              : item.difference}
                          </Typography>
                        </View>
                      ),
                    )}
                  </>
                )
              )}
            </ScrollView>
            <View style={styles.modalFooter}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={resetCompleteModal}
                disabled={!!actionLoading}
                style={{flex: 1}}
              />
              {!checkWorkDone ? (
                <Button
                  title="Check Work"
                  variant="secondary"
                  onPress={handleCheckWork}
                  loading={actionLoading === 'check-work'}
                  disabled={invoiceNumbers.length === 0}
                  style={{flex: 1}}
                />
              ) : (
                <Button
                  title={addMoreMode ? 'Update Checkout' : 'Complete Checkout'}
                  variant="primary"
                  onPress={handleComplete}
                  loading={actionLoading === 'complete'}
                  style={{flex: 1}}
                />
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Cancel Modal */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="fade"
        onRequestClose={() => !actionLoading && setShowCancelModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Typography variant="h3" weight="bold">
                Cancel Checkout
              </Typography>
              <TouchableOpacity
                onPress={() => !actionLoading && setShowCancelModal(false)}>
                <Typography variant="h3" color={theme.colors.gray[400]}>
                  ×
                </Typography>
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={styles.warnBanner}>
                <Typography variant="caption" color="#b45309">
                  This will cancel the checkout. This action cannot be undone.
                </Typography>
              </View>
              <Typography
                variant="small"
                weight="semibold"
                color={theme.colors.gray[700]}
                style={{marginBottom: 8}}>
                Reason for Cancellation
              </Typography>
              <RNTextInput
                value={cancelReason}
                onChangeText={setCancelReason}
                placeholder="Enter reason for cancelling this checkout"
                placeholderTextColor={theme.colors.gray[400]}
                multiline
                numberOfLines={3}
                style={styles.reasonInput}
              />
            </View>
            <View style={styles.modalFooter}>
              <Button
                title="Close"
                variant="ghost"
                onPress={() => setShowCancelModal(false)}
                disabled={!!actionLoading}
                style={{flex: 1}}
              />
              <Button
                title="Cancel Checkout"
                variant="danger"
                onPress={handleCancel}
                loading={actionLoading === 'cancel'}
                style={{flex: 1}}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  actionCard: {
    marginBottom: 12,
    padding: 16,
  },
  stockProcessedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    width: '100%',
    maxWidth: bp.contentMaxWidth,
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalBody: {
    padding: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  chipInputWrap: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#fff',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  chipTextInput: {
    marginTop: 6,
    fontSize: 15,
    color: '#0f172a',
    paddingVertical: 4,
  },
  typeToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  typeOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  typeOptionActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  infoBanner: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  successBanner: {
    backgroundColor: '#ecfdf5',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  warnBanner: {
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  compHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  compRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    borderRadius: 6,
  },
  compNumCol: {
    flex: 1,
    textAlign: 'center',
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 15,
    color: '#0f172a',
  },
});
};
