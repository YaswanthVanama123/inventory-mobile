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
  Switch,
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
import couponService, {
  Coupon,
  CouponStats,
  PaymentType,
  CouponPayload,
  PaymentTypePayload,
} from '../services/couponService';
import useDebounce from '../hooks/useDebounce';
import {useServerPagination} from '../hooks/useServerPagination';
import {
  AlertCircleIcon,
  TagIcon,
  DollarIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  CheckCircleIcon,
} from '../components/icons';

interface CouponsScreenProps {
  visible: boolean;
  onClose: () => void;
}

type Tab = 'coupons' | 'payments';

const isCouponExpired = (expiryDate?: string) =>
  !!expiryDate && new Date(expiryDate) < new Date();
const isCouponUsedUp = (c: Coupon) =>
  !!c.usageLimit && (c.usedCount ?? 0) >= (c.usageLimit ?? 0);

export const CouponsScreen: React.FC<CouponsScreenProps> = ({
  visible,
  onClose,
}) => {
  const theme = useTheme();
  const bp = useBreakpoint();
  const styles = useMemo(() => makeStyles(theme, bp), [theme, bp]);
  const {token, user} = useAuth();
  const isAdmin = user?.role === 'admin';
  const {handleApiError} = useApiErrorHandler();

  const [activeTab, setActiveTab] = useState<Tab>('coupons');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 400);

  // Coupon stats
  const [stats, setStats] = useState<CouponStats>({
    active: 0,
    inactive: 0,
    expired: 0,
    total: 0,
  });

  // Payment types (single array from backend, client-paginated below)
  const [allPayments, setAllPayments] = useState<PaymentType[]>([]);

  // ---- Coupon form ----
  const [couponFormVisible, setCouponFormVisible] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [cCode, setCCode] = useState('');
  const [cDescription, setCDescription] = useState('');
  const [cDiscountType, setCDiscountType] = useState<'percentage' | 'fixed'>(
    'percentage',
  );
  const [cDiscountValue, setCDiscountValue] = useState('');
  const [cMinimumPurchase, setCMinimumPurchase] = useState('');
  const [cMaxDiscount, setCMaxDiscount] = useState('');
  const [cUsageLimit, setCUsageLimit] = useState('');
  const [cExpiryDate, setCExpiryDate] = useState('');
  const [cIsActive, setCIsActive] = useState(true);

  // ---- Payment type form ----
  const [paymentFormVisible, setPaymentFormVisible] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentType | null>(null);
  const [pName, setPName] = useState('');
  const [pDisplayName, setPDisplayName] = useState('');
  const [pDescription, setPDescription] = useState('');
  const [pIcon, setPIcon] = useState('credit-card');
  const [pOrder, setPOrder] = useState('0');
  const [pIsActive, setPIsActive] = useState(true);

  const [submitting, setSubmitting] = useState(false);

  // Coupons: server-side numbered pagination with search.
  const couponsPg = useServerPagination<Coupon>(
    async (pg, limit) => {
      try {
        const res = await couponService.getCoupons(token!, {
          search: debouncedSearch,
          page: pg,
          limit,
        });
        return {items: res.coupons, total: res.total, pages: res.pages};
      } catch (e) {
        await handleApiError(e);
        throw e;
      }
    },
    {
      pageSize: 20,
      resetKey: debouncedSearch,
      enabled: !!(visible && token && activeTab === 'coupons'),
    },
  );

  // Payment types: fetched as one array, client-paginated.
  const paymentsPg = useServerPagination<PaymentType>(
    async (pg, limit) => {
      try {
        const list = await couponService.getPaymentTypes(token!);
        setAllPayments(list);
        const q = debouncedSearch.trim().toLowerCase();
        const filtered = q
          ? list.filter(
              p =>
                (p.displayName || '').toLowerCase().includes(q) ||
                (p.name || '').toLowerCase().includes(q),
            )
          : list;
        const start = (pg - 1) * limit;
        return {
          items: filtered.slice(start, start + limit),
          total: filtered.length,
          pages: Math.max(1, Math.ceil(filtered.length / limit)),
        };
      } catch (e) {
        await handleApiError(e);
        throw e;
      }
    },
    {
      pageSize: 20,
      resetKey: debouncedSearch,
      enabled: !!(visible && token && activeTab === 'payments'),
    },
  );

  const fetchStats = async () => {
    if (!token) return;
    try {
      const s = await couponService.getCouponStats(token);
      setStats(s);
    } catch (e) {
      // Stats are best-effort; ignore failures.
    }
  };

  useEffect(() => {
    if (visible && token && activeTab === 'coupons') {
      fetchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, token, activeTab, debouncedSearch]);

  const reloadCurrent = () => {
    if (activeTab === 'coupons') {
      couponsPg.refetch();
      fetchStats();
    } else {
      paymentsPg.refetch();
    }
  };

  // ----- Coupon handlers -----
  const resetCouponForm = () => {
    setEditingCoupon(null);
    setCCode('');
    setCDescription('');
    setCDiscountType('percentage');
    setCDiscountValue('');
    setCMinimumPurchase('');
    setCMaxDiscount('');
    setCUsageLimit('');
    setCExpiryDate('');
    setCIsActive(true);
  };

  const handleAddCoupon = () => {
    resetCouponForm();
    setCouponFormVisible(true);
  };

  const handleEditCoupon = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setCCode(coupon.code || '');
    setCDescription(coupon.description || '');
    setCDiscountType(coupon.discountType || 'percentage');
    setCDiscountValue(String(coupon.discountValue ?? ''));
    setCMinimumPurchase(String(coupon.minimumPurchase ?? ''));
    setCMaxDiscount(coupon.maxDiscount != null ? String(coupon.maxDiscount) : '');
    setCUsageLimit(coupon.usageLimit != null ? String(coupon.usageLimit) : '');
    setCExpiryDate(
      coupon.expiryDate
        ? new Date(coupon.expiryDate).toISOString().split('T')[0]
        : '',
    );
    setCIsActive(coupon.isActive !== false);
    setCouponFormVisible(true);
  };

  const handleCloseCouponForm = () => {
    if (submitting) return;
    setCouponFormVisible(false);
    resetCouponForm();
  };

  const handleSubmitCoupon = async () => {
    if (!token) return;
    if (!cCode.trim()) {
      Alert.alert('Validation', 'Coupon code is required');
      return;
    }
    if (!cDescription.trim()) {
      Alert.alert('Validation', 'Description is required');
      return;
    }
    if (!cExpiryDate.trim()) {
      Alert.alert('Validation', 'Expiry date is required (YYYY-MM-DD)');
      return;
    }
    const discountValue = parseFloat(cDiscountValue);
    if (isNaN(discountValue)) {
      Alert.alert('Validation', 'Discount value must be a number');
      return;
    }
    const payload: CouponPayload = {
      code: cCode.trim().toUpperCase(),
      description: cDescription.trim(),
      discountType: cDiscountType,
      discountValue,
      minimumPurchase: cMinimumPurchase ? parseFloat(cMinimumPurchase) || 0 : 0,
      maxDiscount: cMaxDiscount ? parseFloat(cMaxDiscount) : null,
      usageLimit: cUsageLimit ? parseInt(cUsageLimit, 10) : null,
      expiryDate: cExpiryDate.trim(),
      isActive: cIsActive,
    };
    try {
      setSubmitting(true);
      if (editingCoupon) {
        await couponService.updateCoupon(token, editingCoupon._id, payload);
      } else {
        await couponService.createCoupon(token, payload);
      }
      setCouponFormVisible(false);
      resetCouponForm();
      couponsPg.refetch();
      fetchStats();
      Alert.alert(
        'Success',
        `Coupon ${editingCoupon ? 'updated' : 'created'} successfully`,
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save coupon');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCoupon = (coupon: Coupon) => {
    Alert.alert(
      'Delete Coupon',
      `Are you sure you want to delete "${coupon.code}"?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await couponService.deleteCoupon(token!, coupon._id);
              Alert.alert('Success', 'Coupon deleted successfully');
              couponsPg.refetch();
              fetchStats();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete coupon');
            }
          },
        },
      ],
    );
  };

  // ----- Payment type handlers -----
  const resetPaymentForm = () => {
    setEditingPayment(null);
    setPName('');
    setPDisplayName('');
    setPDescription('');
    setPIcon('credit-card');
    setPOrder('0');
    setPIsActive(true);
  };

  const handleAddPayment = () => {
    resetPaymentForm();
    setPaymentFormVisible(true);
  };

  const handleEditPayment = (payment: PaymentType) => {
    setEditingPayment(payment);
    setPName(payment.name || '');
    setPDisplayName(payment.displayName || '');
    setPDescription(payment.description || '');
    setPIcon(payment.icon || 'credit-card');
    setPOrder(String(payment.order ?? 0));
    setPIsActive(payment.isActive !== false);
    setPaymentFormVisible(true);
  };

  const handleClosePaymentForm = () => {
    if (submitting) return;
    setPaymentFormVisible(false);
    resetPaymentForm();
  };

  const handleSubmitPayment = async () => {
    if (!token) return;
    if (!pName.trim()) {
      Alert.alert('Validation', 'Name (internal) is required');
      return;
    }
    if (!pDisplayName.trim()) {
      Alert.alert('Validation', 'Display name is required');
      return;
    }
    const payload: PaymentTypePayload = {
      name: pName.trim().toLowerCase(),
      displayName: pDisplayName.trim(),
      description: pDescription.trim() || undefined,
      icon: pIcon.trim() || 'credit-card',
      order: parseInt(pOrder, 10) || 0,
      isActive: pIsActive,
    };
    try {
      setSubmitting(true);
      if (editingPayment) {
        await couponService.updatePaymentType(token, editingPayment._id, payload);
      } else {
        await couponService.createPaymentType(token, payload);
      }
      setPaymentFormVisible(false);
      resetPaymentForm();
      paymentsPg.refetch();
      Alert.alert(
        'Success',
        `Payment type ${editingPayment ? 'updated' : 'created'} successfully`,
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save payment type');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePayment = (payment: PaymentType) => {
    Alert.alert(
      'Delete Payment Type',
      `Are you sure you want to delete "${payment.displayName || payment.name}"?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await couponService.deletePaymentType(token!, payment._id);
              Alert.alert('Success', 'Payment type deleted successfully');
              paymentsPg.refetch();
            } catch (err: any) {
              Alert.alert(
                'Error',
                err?.message || 'Failed to delete payment type',
              );
            }
          },
        },
      ],
    );
  };

  const pg = activeTab === 'coupons' ? couponsPg : paymentsPg;

  const renderTabs = () => (
    <View style={styles.tabRow}>
      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'coupons' && styles.tabButtonActive]}
        onPress={() => setActiveTab('coupons')}>
        <TagIcon
          size={16}
          color={
            activeTab === 'coupons'
              ? theme.colors.white
              : theme.colors.gray[600]
          }
        />
        <Typography
          variant="small"
          weight="semibold"
          color={
            activeTab === 'coupons'
              ? theme.colors.white
              : theme.colors.gray[600]
          }
          style={{marginLeft: 6}}>
          Coupons
        </Typography>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.tabButton,
          activeTab === 'payments' && styles.tabButtonActive,
        ]}
        onPress={() => setActiveTab('payments')}>
        <DollarIcon
          size={16}
          color={
            activeTab === 'payments'
              ? theme.colors.white
              : theme.colors.gray[600]
          }
        />
        <Typography
          variant="small"
          weight="semibold"
          color={
            activeTab === 'payments'
              ? theme.colors.white
              : theme.colors.gray[600]
          }
          style={{marginLeft: 6}}>
          Payment Types
        </Typography>
      </TouchableOpacity>
    </View>
  );

  const renderStats = () => (
    <View style={styles.statsRow}>
      <Card variant="outlined" padding="md" style={styles.statCard}>
        <Typography variant="caption" color={theme.colors.gray[500]}>
          Total
        </Typography>
        <Typography variant="h3" weight="bold">
          {stats.total}
        </Typography>
      </Card>
      <Card variant="outlined" padding="md" style={styles.statCard}>
        <Typography variant="caption" color={theme.colors.gray[500]}>
          Active
        </Typography>
        <Typography variant="h3" weight="bold" color={theme.colors.success[600]}>
          {stats.active}
        </Typography>
      </Card>
      <Card variant="outlined" padding="md" style={styles.statCard}>
        <Typography variant="caption" color={theme.colors.gray[500]}>
          Inactive
        </Typography>
        <Typography variant="h3" weight="bold" color={theme.colors.gray[600]}>
          {stats.inactive}
        </Typography>
      </Card>
      <Card variant="outlined" padding="md" style={styles.statCard}>
        <Typography variant="caption" color={theme.colors.gray[500]}>
          Expired
        </Typography>
        <Typography variant="h3" weight="bold" color={theme.colors.error[600]}>
          {stats.expired}
        </Typography>
      </Card>
    </View>
  );

  const renderListHeader = () => (
    <View>
      {renderTabs()}
      {activeTab === 'coupons' && renderStats()}
      {isAdmin && (
        <View style={styles.addButtonContainer}>
          <Button
            title={activeTab === 'coupons' ? 'Add New Coupon' : 'Add Payment Type'}
            variant="primary"
            onPress={activeTab === 'coupons' ? handleAddCoupon : handleAddPayment}
            leftIcon={<PlusIcon size={16} color={theme.colors.white} />}
            fullWidth
          />
        </View>
      )}
      <View style={styles.searchContainer}>
        <RNTextInput
          style={styles.searchInput}
          placeholder={
            activeTab === 'coupons'
              ? 'Search by code or description'
              : 'Search by name'
          }
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          placeholderTextColor={theme.colors.gray[400]}
        />
      </View>
      {pg.error && (
        <Card variant="outlined" padding="lg" style={styles.errorCard}>
          <View style={styles.errorContent}>
            <AlertCircleIcon size={24} color={theme.colors.error[500]} />
            <Typography
              variant="body"
              color={theme.colors.error[700]}
              style={styles.errorText}>
              {pg.error}
            </Typography>
          </View>
        </Card>
      )}
    </View>
  );

  const renderCoupon = (coupon: Coupon) => {
    const expired = isCouponExpired(coupon.expiryDate);
    const usedUp = isCouponUsedUp(coupon);
    const canUse = coupon.isActive !== false && !expired && !usedUp;
    const badgeColor = canUse
      ? theme.colors.success[600]
      : expired
      ? theme.colors.error[600]
      : theme.colors.gray[500];
    const badgeBg = canUse
      ? theme.colors.success[100]
      : expired
      ? theme.colors.error[100]
      : theme.colors.gray[100];
    const badgeLabel = canUse
      ? 'Active'
      : expired
      ? 'Expired'
      : usedUp
      ? 'Used Up'
      : 'Inactive';
    return (
      <Card variant="elevated" padding="none" style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <View style={styles.itemHeaderLeft}>
            <View style={styles.iconContainer}>
              <TagIcon size={20} color={theme.colors.primary[600]} />
            </View>
            <View style={styles.itemInfo}>
              <Typography variant="body" weight="bold" numberOfLines={1}>
                {coupon.code}
              </Typography>
              {!!coupon.description && (
                <Typography
                  variant="caption"
                  color={theme.colors.gray[500]}
                  numberOfLines={1}>
                  {coupon.description}
                </Typography>
              )}
            </View>
          </View>
          <View style={[styles.statusBadge, {backgroundColor: badgeBg}]}>
            <Typography variant="caption" weight="semibold" color={badgeColor}>
              {badgeLabel}
            </Typography>
          </View>
        </View>

        <View style={styles.itemMeta}>
          <View style={styles.metaRow}>
            <Typography variant="caption" color={theme.colors.gray[500]}>
              Discount
            </Typography>
            <Typography variant="small" weight="medium">
              {coupon.discountType === 'fixed' ? '$' : ''}
              {coupon.discountValue}
              {coupon.discountType === 'percentage' ? '%' : ''}
              {coupon.maxDiscount ? ` (max $${coupon.maxDiscount})` : ''}
            </Typography>
          </View>
          {!!coupon.minimumPurchase && coupon.minimumPurchase > 0 && (
            <View style={styles.metaRow}>
              <Typography variant="caption" color={theme.colors.gray[500]}>
                Min. Purchase
              </Typography>
              <Typography variant="small" weight="medium">
                ${coupon.minimumPurchase}
              </Typography>
            </View>
          )}
          <View style={styles.metaRow}>
            <Typography variant="caption" color={theme.colors.gray[500]}>
              Usage
            </Typography>
            <Typography variant="small" weight="medium">
              {coupon.usedCount ?? 0}
              {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ' uses'}
            </Typography>
          </View>
          <View style={styles.metaRow}>
            <Typography variant="caption" color={theme.colors.gray[500]}>
              Expires
            </Typography>
            <Typography variant="small" weight="medium">
              {coupon.expiryDate
                ? new Date(coupon.expiryDate).toLocaleDateString()
                : '-'}
            </Typography>
          </View>
        </View>

        {isAdmin && (
          <View style={styles.expandedContent}>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={() => handleEditCoupon(coupon)}>
                <EditIcon size={16} color={theme.colors.primary[600]} />
                <Typography
                  variant="small"
                  weight="semibold"
                  color={theme.colors.primary[600]}
                  style={{marginLeft: 8}}>
                  Edit
                </Typography>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDeleteCoupon(coupon)}>
                <TrashIcon size={16} color={theme.colors.error[600]} />
                <Typography
                  variant="small"
                  weight="semibold"
                  color={theme.colors.error[600]}
                  style={{marginLeft: 8}}>
                  Delete
                </Typography>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Card>
    );
  };

  const renderPayment = (payment: PaymentType) => (
    <Card variant="elevated" padding="none" style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={styles.itemHeaderLeft}>
          <View style={styles.iconContainer}>
            <DollarIcon size={20} color={theme.colors.primary[600]} />
          </View>
          <View style={styles.itemInfo}>
            <Typography variant="body" weight="bold" numberOfLines={1}>
              {payment.displayName}
            </Typography>
            <Typography
              variant="caption"
              color={theme.colors.gray[500]}
              numberOfLines={1}>
              {payment.name}
            </Typography>
          </View>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                payment.isActive !== false
                  ? theme.colors.success[100]
                  : theme.colors.gray[100],
            },
          ]}>
          {payment.isActive !== false && (
            <CheckCircleIcon size={14} color={theme.colors.success[600]} />
          )}
          <Typography
            variant="caption"
            weight="semibold"
            color={
              payment.isActive !== false
                ? theme.colors.success[600]
                : theme.colors.gray[500]
            }
            style={payment.isActive !== false ? {marginLeft: 4} : {}}>
            {payment.isActive !== false ? 'Active' : 'Inactive'}
          </Typography>
        </View>
      </View>

      {!!payment.description && (
        <View style={styles.itemMeta}>
          <Typography variant="small" color={theme.colors.gray[600]}>
            {payment.description}
          </Typography>
        </View>
      )}

      {isAdmin && (
        <View style={styles.expandedContent}>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => handleEditPayment(payment)}>
              <EditIcon size={16} color={theme.colors.primary[600]} />
              <Typography
                variant="small"
                weight="semibold"
                color={theme.colors.primary[600]}
                style={{marginLeft: 8}}>
                Edit
              </Typography>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDeletePayment(payment)}>
              <TrashIcon size={16} color={theme.colors.error[600]} />
              <Typography
                variant="small"
                weight="semibold"
                color={theme.colors.error[600]}
                style={{marginLeft: 8}}>
                Delete
              </Typography>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Card>
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
            <Typography
              variant="body"
              color={theme.colors.primary[600]}
              weight="semibold">
              Close
            </Typography>
          </TouchableOpacity>
          <Typography variant="h3" weight="bold" style={styles.modalTitle}>
            Coupons &amp; Payments
          </Typography>
          <TouchableOpacity onPress={reloadCurrent} style={styles.refreshButton}>
            <Typography
              variant="small"
              color={theme.colors.primary[600]}
              weight="semibold">
              Refresh
            </Typography>
          </TouchableOpacity>
        </View>

        {pg.loading && !pg.refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary[600]} />
            <Typography
              variant="body"
              color={theme.colors.gray[600]}
              style={{marginTop: 16}}>
              Loading...
            </Typography>
          </View>
        ) : activeTab === 'coupons' ? (
          <PaginatedList
            data={couponsPg.items}
            keyExtractor={(item, index) => item._id || String(index)}
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, styles.contentWrap]}
            refreshing={couponsPg.refreshing}
            onRefresh={couponsPg.refresh}
            resetKey={`coupons-${searchQuery}`}
            pagedMode
            scrollTopKey={couponsPg.page}
            ListFooterComponent={
              couponsPg.total > 0 ? (
                <Pagination
                  currentPage={couponsPg.page}
                  totalPages={couponsPg.totalPages}
                  totalItems={couponsPg.total}
                  pageSize={couponsPg.pageSize}
                  onPageChange={couponsPg.setPage}
                  onPageSizeChange={couponsPg.setPageSize}
                />
              ) : null
            }
            ItemSeparatorComponent={() => <View style={{height: 12}} />}
            ListHeaderComponent={renderListHeader()}
            ListEmptyComponent={
              pg.error ? null : (
                <Card variant="outlined" padding="lg" style={styles.emptyCard}>
                  <TagIcon size={48} color={theme.colors.gray[400]} />
                  <Typography
                    variant="h3"
                    weight="semibold"
                    color={theme.colors.gray[700]}
                    style={styles.emptyTitle}>
                    No coupons found
                  </Typography>
                  <Typography
                    variant="body"
                    color={theme.colors.gray[500]}
                    align="center">
                    {searchQuery
                      ? 'Try adjusting your search'
                      : isAdmin
                      ? 'Create your first coupon to get started'
                      : 'No coupons have been configured'}
                  </Typography>
                </Card>
              )
            }
            renderItem={({item}) => renderCoupon(item)}
          />
        ) : (
          <PaginatedList
            data={paymentsPg.items}
            keyExtractor={(item, index) => item._id || String(index)}
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, styles.contentWrap]}
            refreshing={paymentsPg.refreshing}
            onRefresh={paymentsPg.refresh}
            resetKey={`payments-${searchQuery}`}
            pagedMode
            scrollTopKey={paymentsPg.page}
            ListFooterComponent={
              paymentsPg.total > 0 ? (
                <Pagination
                  currentPage={paymentsPg.page}
                  totalPages={paymentsPg.totalPages}
                  totalItems={paymentsPg.total}
                  pageSize={paymentsPg.pageSize}
                  onPageChange={paymentsPg.setPage}
                  onPageSizeChange={paymentsPg.setPageSize}
                />
              ) : null
            }
            ItemSeparatorComponent={() => <View style={{height: 12}} />}
            ListHeaderComponent={renderListHeader()}
            ListEmptyComponent={
              pg.error ? null : (
                <Card variant="outlined" padding="lg" style={styles.emptyCard}>
                  <DollarIcon size={48} color={theme.colors.gray[400]} />
                  <Typography
                    variant="h3"
                    weight="semibold"
                    color={theme.colors.gray[700]}
                    style={styles.emptyTitle}>
                    No payment types found
                  </Typography>
                  <Typography
                    variant="body"
                    color={theme.colors.gray[500]}
                    align="center">
                    {searchQuery
                      ? 'Try adjusting your search'
                      : isAdmin
                      ? 'Add payment methods for your customers'
                      : 'No payment types have been configured'}
                  </Typography>
                </Card>
              )
            }
            renderItem={({item}) => renderPayment(item)}
          />
        )}
      </SafeAreaView>

      {/* Add / Edit Coupon form */}
      <Modal
        visible={couponFormVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseCouponForm}>
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={handleCloseCouponForm}
              style={styles.closeButton}
              disabled={submitting}>
              <Typography
                variant="body"
                weight="semibold"
                color={
                  submitting ? theme.colors.gray[400] : theme.colors.primary[600]
                }>
                Cancel
              </Typography>
            </TouchableOpacity>
            <Typography variant="h3" weight="bold" style={styles.modalTitle}>
              {editingCoupon ? 'Edit Coupon' : 'Add New Coupon'}
            </Typography>
            <View style={styles.refreshButton} />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.contentWrap}>
              <View style={styles.formField}>
                <Typography
                  variant="small"
                  weight="semibold"
                  color={theme.colors.gray[700]}
                  style={styles.formLabel}>
                  Coupon Code *
                </Typography>
                <RNTextInput
                  style={styles.formInput}
                  placeholder="SUMMER25"
                  value={cCode}
                  onChangeText={t => setCCode(t.toUpperCase())}
                  autoCapitalize="characters"
                  placeholderTextColor={theme.colors.gray[400]}
                />
              </View>

              <View style={styles.formField}>
                <Typography
                  variant="small"
                  weight="semibold"
                  color={theme.colors.gray[700]}
                  style={styles.formLabel}>
                  Description *
                </Typography>
                <RNTextInput
                  style={styles.formInput}
                  placeholder="25% off on all items"
                  value={cDescription}
                  onChangeText={setCDescription}
                  placeholderTextColor={theme.colors.gray[400]}
                />
              </View>

              <View style={styles.formField}>
                <Typography
                  variant="small"
                  weight="semibold"
                  color={theme.colors.gray[700]}
                  style={styles.formLabel}>
                  Discount Type
                </Typography>
                <View style={styles.segmentRow}>
                  {(['percentage', 'fixed'] as const).map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.segmentButton,
                        cDiscountType === type && styles.segmentButtonActive,
                      ]}
                      onPress={() => setCDiscountType(type)}>
                      <Typography
                        variant="small"
                        weight="semibold"
                        color={
                          cDiscountType === type
                            ? theme.colors.white
                            : theme.colors.gray[600]
                        }>
                        {type === 'percentage' ? 'Percentage (%)' : 'Fixed ($)'}
                      </Typography>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formField}>
                <Typography
                  variant="small"
                  weight="semibold"
                  color={theme.colors.gray[700]}
                  style={styles.formLabel}>
                  Discount Value *
                </Typography>
                <RNTextInput
                  style={styles.formInput}
                  placeholder="25"
                  value={cDiscountValue}
                  onChangeText={setCDiscountValue}
                  keyboardType="decimal-pad"
                  placeholderTextColor={theme.colors.gray[400]}
                />
              </View>

              <View style={styles.formField}>
                <Typography
                  variant="small"
                  weight="semibold"
                  color={theme.colors.gray[700]}
                  style={styles.formLabel}>
                  Minimum Purchase ($)
                </Typography>
                <RNTextInput
                  style={styles.formInput}
                  placeholder="0"
                  value={cMinimumPurchase}
                  onChangeText={setCMinimumPurchase}
                  keyboardType="decimal-pad"
                  placeholderTextColor={theme.colors.gray[400]}
                />
              </View>

              <View style={styles.formField}>
                <Typography
                  variant="small"
                  weight="semibold"
                  color={theme.colors.gray[700]}
                  style={styles.formLabel}>
                  Max Discount ($)
                </Typography>
                <RNTextInput
                  style={styles.formInput}
                  placeholder="Leave empty for no limit"
                  value={cMaxDiscount}
                  onChangeText={setCMaxDiscount}
                  keyboardType="decimal-pad"
                  placeholderTextColor={theme.colors.gray[400]}
                />
              </View>

              <View style={styles.formField}>
                <Typography
                  variant="small"
                  weight="semibold"
                  color={theme.colors.gray[700]}
                  style={styles.formLabel}>
                  Usage Limit
                </Typography>
                <RNTextInput
                  style={styles.formInput}
                  placeholder="Leave empty for unlimited"
                  value={cUsageLimit}
                  onChangeText={setCUsageLimit}
                  keyboardType="number-pad"
                  placeholderTextColor={theme.colors.gray[400]}
                />
              </View>

              <View style={styles.formField}>
                <Typography
                  variant="small"
                  weight="semibold"
                  color={theme.colors.gray[700]}
                  style={styles.formLabel}>
                  Expiry Date * (YYYY-MM-DD)
                </Typography>
                <RNTextInput
                  style={styles.formInput}
                  placeholder="2026-12-31"
                  value={cExpiryDate}
                  onChangeText={setCExpiryDate}
                  autoCapitalize="none"
                  placeholderTextColor={theme.colors.gray[400]}
                />
              </View>

              <View style={styles.formToggleRow}>
                <View style={{flex: 1}}>
                  <Typography variant="body" weight="semibold">
                    Active
                  </Typography>
                  <Typography variant="caption" color={theme.colors.gray[500]}>
                    Inactive coupons cannot be applied
                  </Typography>
                </View>
                <Switch
                  value={cIsActive}
                  onValueChange={setCIsActive}
                  trackColor={{
                    false: theme.colors.gray[300],
                    true: theme.colors.primary[600],
                  }}
                  thumbColor={theme.colors.white}
                />
              </View>

              <Button
                title={
                  submitting
                    ? 'Saving...'
                    : editingCoupon
                    ? 'Update Coupon'
                    : 'Create Coupon'
                }
                variant="primary"
                onPress={handleSubmitCoupon}
                disabled={submitting}
                loading={submitting}
                fullWidth
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Add / Edit Payment Type form */}
      <Modal
        visible={paymentFormVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClosePaymentForm}>
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={handleClosePaymentForm}
              style={styles.closeButton}
              disabled={submitting}>
              <Typography
                variant="body"
                weight="semibold"
                color={
                  submitting ? theme.colors.gray[400] : theme.colors.primary[600]
                }>
                Cancel
              </Typography>
            </TouchableOpacity>
            <Typography variant="h3" weight="bold" style={styles.modalTitle}>
              {editingPayment ? 'Edit Payment Type' : 'Add Payment Type'}
            </Typography>
            <View style={styles.refreshButton} />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.contentWrap}>
              <View style={styles.formField}>
                <Typography
                  variant="small"
                  weight="semibold"
                  color={theme.colors.gray[700]}
                  style={styles.formLabel}>
                  Name (Internal) *
                </Typography>
                <RNTextInput
                  style={styles.formInput}
                  placeholder="cash"
                  value={pName}
                  onChangeText={t => setPName(t.toLowerCase())}
                  autoCapitalize="none"
                  placeholderTextColor={theme.colors.gray[400]}
                />
              </View>

              <View style={styles.formField}>
                <Typography
                  variant="small"
                  weight="semibold"
                  color={theme.colors.gray[700]}
                  style={styles.formLabel}>
                  Display Name *
                </Typography>
                <RNTextInput
                  style={styles.formInput}
                  placeholder="Cash Payment"
                  value={pDisplayName}
                  onChangeText={setPDisplayName}
                  placeholderTextColor={theme.colors.gray[400]}
                />
              </View>

              <View style={styles.formField}>
                <Typography
                  variant="small"
                  weight="semibold"
                  color={theme.colors.gray[700]}
                  style={styles.formLabel}>
                  Description
                </Typography>
                <RNTextInput
                  style={[styles.formInput, styles.formTextArea]}
                  placeholder="Pay with cash at counter"
                  value={pDescription}
                  onChangeText={setPDescription}
                  multiline
                  placeholderTextColor={theme.colors.gray[400]}
                />
              </View>

              <View style={styles.formField}>
                <Typography
                  variant="small"
                  weight="semibold"
                  color={theme.colors.gray[700]}
                  style={styles.formLabel}>
                  Icon Name
                </Typography>
                <RNTextInput
                  style={styles.formInput}
                  placeholder="credit-card"
                  value={pIcon}
                  onChangeText={setPIcon}
                  autoCapitalize="none"
                  placeholderTextColor={theme.colors.gray[400]}
                />
              </View>

              <View style={styles.formField}>
                <Typography
                  variant="small"
                  weight="semibold"
                  color={theme.colors.gray[700]}
                  style={styles.formLabel}>
                  Order
                </Typography>
                <RNTextInput
                  style={styles.formInput}
                  placeholder="0"
                  value={pOrder}
                  onChangeText={setPOrder}
                  keyboardType="number-pad"
                  placeholderTextColor={theme.colors.gray[400]}
                />
              </View>

              <View style={styles.formToggleRow}>
                <View style={{flex: 1}}>
                  <Typography variant="body" weight="semibold">
                    Active
                  </Typography>
                  <Typography variant="caption" color={theme.colors.gray[500]}>
                    Inactive payment types are hidden from checkout
                  </Typography>
                </View>
                <Switch
                  value={pIsActive}
                  onValueChange={setPIsActive}
                  trackColor={{
                    false: theme.colors.gray[300],
                    true: theme.colors.primary[600],
                  }}
                  thumbColor={theme.colors.white}
                />
              </View>

              <Button
                title={
                  submitting
                    ? 'Saving...'
                    : editingPayment
                    ? 'Update Payment Type'
                    : 'Create Payment Type'
                }
                variant="primary"
                onPress={handleSubmitPayment}
                disabled={submitting}
                loading={submitting}
                fullWidth
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
    tabRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    tabButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: theme.colors.white,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
    },
    tabButtonActive: {
      backgroundColor: theme.colors.primary[600],
      borderColor: theme.colors.primary[600],
    },
    statsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    statCard: {
      flexGrow: 1,
      flexBasis: '47%',
    },
    addButtonContainer: {
      marginBottom: theme.spacing.md,
    },
    searchContainer: {
      marginBottom: theme.spacing.md,
    },
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
    itemCard: {
      marginBottom: 0,
      overflow: 'hidden',
    },
    itemHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing.md,
    },
    itemHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 12,
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: theme.colors.primary[100],
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemInfo: {
      flex: 1,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      marginLeft: 8,
    },
    itemMeta: {
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
    actionButtons: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 8,
      borderWidth: 1,
    },
    editButton: {
      backgroundColor: theme.colors.primary[50],
      borderColor: theme.colors.primary[200],
    },
    deleteButton: {
      backgroundColor: theme.colors.error[50],
      borderColor: theme.colors.error[200],
    },
    formField: {
      marginBottom: theme.spacing.md,
    },
    formLabel: {
      marginBottom: 6,
    },
    formInput: {
      backgroundColor: theme.colors.white,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: theme.typography.roles.body.fontSize,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
      color: theme.colors.gray[900],
    },
    formTextArea: {
      minHeight: 88,
      paddingTop: 12,
      textAlignVertical: 'top',
    },
    segmentRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    segmentButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: theme.colors.white,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
    },
    segmentButtonActive: {
      backgroundColor: theme.colors.primary[600],
      borderColor: theme.colors.primary[600],
    },
    formToggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: theme.colors.white,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
      marginBottom: theme.spacing.lg,
      gap: 12,
    },
  });
