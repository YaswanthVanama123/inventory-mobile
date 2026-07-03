import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import {PaginatedList} from '../components/molecules/PaginatedList';
import {Pagination} from '../components/molecules/Pagination';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {Button} from '../components/atoms/Button';
import {useAuth} from '../contexts/AuthContext';
import {useTheme} from '../contexts/ThemeContext';
import {Theme} from '../theme';
import {useBreakpoint, BreakpointInfo} from '../utils/breakpoints';
import discrepancyService from '../services/discrepancyService';
import orderDiscrepancyService from '../services/orderDiscrepancyService';
import useDebounce from '../hooks/useDebounce';
import {
  AlertCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '../components/icons';
import {formatDate} from '../utils/dateUtils';

interface DiscrepancyManagementScreenProps {
  visible: boolean;
  onClose: () => void;
}

const TOP_TABS = [
  {id: 'stock', label: 'Checkout / Stock'},
  {id: 'order', label: 'Order'},
];

const TABS = [
  {id: 'all', label: 'All'},
  {id: 'truck-return', label: 'Truck Return'},
  {id: 'stock-check', label: 'Stock Check'},
  {id: 'stock-adjustment', label: 'Adjustment'},
];

const PAGE_SIZE = 20;

const getOrderTypeColors = (type: string) => {
  switch (type) {
    case 'Shortage':
      return {bg: '#fff7ed', text: '#c2410c'};
    case 'Overage':
      return {bg: '#eff6ff', text: '#1d4ed8'};
    case 'Matched':
      return {bg: '#ecfdf5', text: '#047857'};
    default:
      return {bg: '#f8fafc', text: '#475569'};
  }
};

const getOrderDiffColor = (qty: number) => {
  if (qty > 0) return '#1d4ed8';
  if (qty < 0) return '#c2410c';
  return '#047857';
};

const getOrderStatusColors = (status: string, theme: Theme) => {
  switch (status) {
    case 'pending':
      return {bg: theme.colors.primary[100], text: theme.colors.primary[700]};
    case 'approved':
      return {bg: theme.colors.success[100], text: theme.colors.success[700]};
    case 'rejected':
      return {bg: theme.colors.error[100], text: theme.colors.error[700]};
    default:
      return {bg: theme.colors.gray[100], text: theme.colors.gray[700]};
  }
};

const getDiscrepancySource = (discrepancy: any): string => {
  const invoiceNumber = discrepancy.invoiceNumber || '';
  // Truck discrepancies from TruckDiscrepancy collection
  if (discrepancy._discrepancySource === 'truck') return 'truck-return';
  if (invoiceNumber === 'STOCK-ADJUSTMENT') return 'stock-adjustment';
  if (invoiceNumber.startsWith('CHECKOUT-') || discrepancy.invoiceType === 'TruckCheckout')
    return 'stock-check';
  return 'stock-check';
};

const getSourceLabel = (source: string): string => {
  switch (source) {
    case 'truck-return':
      return 'Truck Return';
    case 'stock-check':
      return 'Stock Check';
    case 'stock-adjustment':
      return 'Stock Adjustment';
    default:
      return 'Unknown';
  }
};

const getSourceColors = (source: string, theme: Theme) => {
  switch (source) {
    case 'truck-return':
      return {bg: '#eef2ff', text: '#4338ca'};
    case 'stock-check':
      return {bg: '#ecfdf5', text: '#047857'};
    case 'stock-adjustment':
      return {bg: '#fffbeb', text: '#b45309'};
    default:
      return {bg: theme.colors.gray[100], text: theme.colors.gray[700]};
  }
};

export const DiscrepancyManagementScreen: React.FC<DiscrepancyManagementScreenProps> = ({
  visible,
  onClose,
}) => {
  const theme = useTheme();
  const bp = useBreakpoint();
  const styles = useMemo(() => makeStyles(theme, bp), [theme, bp]);
  const {user, token} = useAuth();
  const [topTab, setTopTab] = useState<'stock' | 'order'>('stock');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [discrepancies, setDiscrepancies] = useState<any[]>([]);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebounce(searchText, 400);
  const [filters, setFilters] = useState({
    status: '',
    type: '',
  });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<{
    total: number;
    page: number;
    limit: number;
    pages: number;
  }>({total: 0, page: 1, limit: PAGE_SIZE, pages: 1});

  // Order tab state
  const [orderDiscrepancies, setOrderDiscrepancies] = useState<any[]>([]);
  const [orderExpandedRow, setOrderExpandedRow] = useState<string | null>(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [orderPage, setOrderPage] = useState(1);
  const [orderPagination, setOrderPagination] = useState<{
    total: number;
    page: number;
    limit: number;
    pages: number;
  }>({total: 0, page: 1, limit: PAGE_SIZE, pages: 1});

  // Reset to page 1 when switching top tab, sub-tab, status filter, or search.
  useEffect(() => {
    setPage(1);
  }, [topTab, activeTab, filters.status, debouncedSearch]);

  useEffect(() => {
    setOrderPage(1);
  }, [topTab, orderStatusFilter]);

  useEffect(() => {
    if (visible && topTab === 'stock') {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, topTab, filters.status, debouncedSearch, page]);

  useEffect(() => {
    if (visible && topTab === 'order') {
      loadOrderData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, topTab, orderStatusFilter, orderPage]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [discrepancyResponse, summaryResponse] = await Promise.all([
        discrepancyService.getDiscrepancies({
          page,
          limit: PAGE_SIZE,
          status: filters.status,
          type: filters.type,
          search: debouncedSearch,
        }),
        discrepancyService.getSummary(),
      ]);
      if (discrepancyResponse.success) {
        setDiscrepancies(discrepancyResponse.data?.discrepancies || []);
        const p = discrepancyResponse.data?.pagination;
        if (p) {
          setPagination({
            total: p.total || 0,
            page: p.page || page,
            limit: p.limit || PAGE_SIZE,
            pages: p.pages || 1,
          });
        }
      }
      if (summaryResponse.success) {
        setSummary(summaryResponse.data);
      }
    } catch (error: any) {
      console.error('Failed to load discrepancies:', error);
      Alert.alert('Error', 'Failed to load discrepancies');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadOrderData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const params: any = {page: orderPage, limit: PAGE_SIZE};
      if (orderStatusFilter) params.status = orderStatusFilter;
      const response = await orderDiscrepancyService.getOrderDiscrepancies(
        token,
        params,
      );
      setOrderDiscrepancies(response.discrepancies || []);
      const p = response.pagination as any;
      setOrderPagination({
        total: p?.total || 0,
        page: p?.page || orderPage,
        limit: p?.limit || PAGE_SIZE,
        pages: p?.pages || 1,
      });
    } catch (error: any) {
      console.error('Failed to load order discrepancies:', error);
      Alert.alert('Error', 'Failed to load order discrepancies');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const reload = () => {
    if (topTab === 'order') {
      loadOrderData();
    } else {
      loadData();
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    reload();
  };

  const handleApprove = async (discrepancyId: string) => {
    Alert.alert(
      'Approve Discrepancy',
      'Are you sure you want to approve this discrepancy?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await discrepancyService.approveDiscrepancy(discrepancyId);
              Alert.alert('Success', 'Discrepancy approved successfully');
              loadData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to approve discrepancy');
            }
          },
        },
      ],
    );
  };

  const handleReject = async (discrepancyId: string) => {
    Alert.alert(
      'Reject Discrepancy',
      'Are you sure you want to reject this discrepancy?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await discrepancyService.rejectDiscrepancy(discrepancyId);
              Alert.alert('Success', 'Discrepancy rejected successfully');
              loadData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to reject discrepancy');
            }
          },
        },
      ],
    );
  };

  const handleDelete = async (discrepancyId: string) => {
    Alert.alert(
      'Delete Discrepancy',
      'Are you sure you want to delete this discrepancy? This action cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await discrepancyService.deleteDiscrepancy(discrepancyId);
              Alert.alert('Success', 'Discrepancy deleted successfully');
              loadData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete discrepancy');
            }
          },
        },
      ],
    );
  };

  const handleOrderApprove = (id: string) => {
    Alert.alert(
      'Approve Discrepancy',
      'Are you sure you want to approve this order discrepancy?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Approve',
          onPress: async () => {
            if (!token) return;
            try {
              await orderDiscrepancyService.approveOrderDiscrepancy(token, id);
              Alert.alert('Success', 'Order discrepancy approved');
              loadOrderData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to approve discrepancy');
            }
          },
        },
      ],
    );
  };

  const handleOrderReject = (id: string) => {
    Alert.alert(
      'Reject Discrepancy',
      'Are you sure you want to reject this order discrepancy?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            if (!token) return;
            try {
              await orderDiscrepancyService.rejectOrderDiscrepancy(token, id);
              Alert.alert('Success', 'Order discrepancy rejected');
              loadOrderData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to reject discrepancy');
            }
          },
        },
      ],
    );
  };

  const handleOrderDelete = (id: string) => {
    Alert.alert(
      'Delete Discrepancy',
      'Are you sure you want to delete this order discrepancy? This action cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!token) return;
            try {
              await orderDiscrepancyService.deleteOrderDiscrepancy(token, id);
              Alert.alert('Success', 'Order discrepancy deleted');
              loadOrderData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete discrepancy');
            }
          },
        },
      ],
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return {bg: theme.colors.primary[100], text: theme.colors.primary[700]};
      case 'Approved':
        return {bg: theme.colors.success[100], text: theme.colors.success[700]};
      case 'Rejected':
        return {bg: theme.colors.error[100], text: theme.colors.error[700]};
      default:
        return {bg: theme.colors.gray[100], text: theme.colors.gray[700]};
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending':
        return <ClockIcon size={14} color={theme.colors.primary[600]} />;
      case 'Approved':
        return <CheckCircleIcon size={14} color={theme.colors.success[600]} />;
      case 'Rejected':
        return <AlertCircleIcon size={14} color={theme.colors.error[600]} />;
      default:
        return <ClockIcon size={14} color={theme.colors.gray[600]} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Overage':
        return {bg: theme.colors.primary[100], text: theme.colors.primary[700]};
      case 'Shortage':
        return {bg: theme.colors.error[100], text: theme.colors.error[700]};
      case 'Damage':
        return {bg: theme.colors.primary[100], text: theme.colors.primary[700]};
      case 'Missing':
        return {bg: '#9333ea20', text: '#9333ea'};
      default:
        return {bg: theme.colors.gray[100], text: theme.colors.gray[700]};
    }
  };

  // Text search runs on the backend; only the source tab is filtered locally.
  const filteredDiscrepancies = discrepancies.filter(d => {
    const source = getDiscrepancySource(d);
    if (activeTab !== 'all' && source !== activeTab) return false;
    return true;
  });

  const getTabCounts = () => {
    const counts: Record<string, number> = {
      all: discrepancies.length,
      'truck-return': 0,
      'stock-check': 0,
      'stock-adjustment': 0,
    };
    discrepancies.forEach(d => {
      const source = getDiscrepancySource(d);
      counts[source] = (counts[source] || 0) + 1;
    });
    return counts;
  };

  const tabCounts = getTabCounts();

  if (
    loading &&
    discrepancies.length === 0 &&
    orderDiscrepancies.length === 0
  ) {
    return (
      <Modal visible={visible} animationType="slide">
        <SafeAreaView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[600]} />
          <Typography
            variant="body"
            color={theme.colors.gray[600]}
            style={{marginTop: 16}}>
            Loading discrepancies...
          </Typography>
        </SafeAreaView>
      </Modal>
    );
  }

  const renderOrderItem = ({item: discrepancy}: {item: any}) => {
    const isExpanded = orderExpandedRow === discrepancy._id;
    const typeColors = getOrderTypeColors(discrepancy.discrepancyType);
    const statusColors = getOrderStatusColors(discrepancy.status, theme);

    return (
      <Card variant="elevated" padding="none" style={styles.discrepancyCard}>
        <TouchableOpacity
          style={[
            styles.discrepancyHeader,
            isExpanded && {backgroundColor: '#f0f9ff'},
          ]}
          onPress={() =>
            setOrderExpandedRow(isExpanded ? null : discrepancy._id)
          }
          activeOpacity={0.7}>
          <View style={styles.discrepancyHeaderLeft}>
            {isExpanded ? (
              <ChevronDownIcon size={18} color={theme.colors.primary[600]} />
            ) : (
              <ChevronRightIcon size={18} color={theme.colors.gray[400]} />
            )}
            <View style={{marginLeft: 10, flex: 1}}>
              <View style={styles.orderTitleRow}>
                <Typography variant="body" weight="semibold" numberOfLines={1}>
                  {discrepancy.itemName}
                </Typography>
                {discrepancy.sku ? (
                  <View style={styles.skuBadge}>
                    <Typography variant="caption" color={theme.colors.gray[600]}>
                      {discrepancy.sku}
                    </Typography>
                  </View>
                ) : null}
              </View>
              <View style={styles.rowMeta}>
                <Typography variant="caption" color={theme.colors.gray[600]}>
                  Order #{discrepancy.orderNumber}
                </Typography>
                <Typography variant="caption" color={theme.colors.gray[400]}>
                  {' • '}
                  {formatDate(discrepancy.reportedAt)}
                </Typography>
              </View>
            </View>
          </View>
          <View style={styles.rowRight}>
            <View
              style={[
                styles.diffBadge,
                {
                  backgroundColor:
                    discrepancy.discrepancyQuantity > 0
                      ? '#dbeafe'
                      : discrepancy.discrepancyQuantity < 0
                      ? '#ffedd5'
                      : '#d1fae5',
                },
              ]}>
              <Typography
                variant="small"
                weight="bold"
                color={getOrderDiffColor(discrepancy.discrepancyQuantity)}>
                {discrepancy.discrepancyQuantity > 0 ? '+' : ''}
                {discrepancy.discrepancyQuantity}
              </Typography>
            </View>
            <View style={[styles.badge, {backgroundColor: typeColors.bg}]}>
              <Typography
                variant="caption"
                weight="semibold"
                color={typeColors.text}>
                {discrepancy.discrepancyType}
              </Typography>
            </View>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedPanel}>
            {/* Status badge */}
            <View style={styles.sourceRow}>
              <View style={[styles.badge, {backgroundColor: statusColors.bg}]}>
                <Typography
                  variant="caption"
                  weight="semibold"
                  color={statusColors.text}>
                  {discrepancy.status}
                </Typography>
              </View>
            </View>

            {/* Quantities Grid */}
            <View style={styles.quantityGrid}>
              <View style={styles.quantityBox}>
                <Typography variant="caption" color={theme.colors.gray[500]}>
                  Expected
                </Typography>
                <Typography variant="h3" weight="bold">
                  {discrepancy.expectedQuantity}
                </Typography>
              </View>
              <View style={styles.quantityArrow}>
                <Typography variant="body" color={theme.colors.gray[400]}>
                  →
                </Typography>
              </View>
              <View style={styles.quantityBox}>
                <Typography variant="caption" color={theme.colors.gray[500]}>
                  Received
                </Typography>
                <Typography variant="h3" weight="bold">
                  {discrepancy.receivedQuantity}
                </Typography>
              </View>
              <View style={styles.quantityArrow}>
                <Typography variant="body" color={theme.colors.gray[400]}>
                  =
                </Typography>
              </View>
              <View style={styles.quantityBox}>
                <Typography variant="caption" color={theme.colors.gray[500]}>
                  Diff
                </Typography>
                <Typography
                  variant="h3"
                  weight="bold"
                  color={getOrderDiffColor(discrepancy.discrepancyQuantity)}>
                  {discrepancy.discrepancyQuantity > 0 ? '+' : ''}
                  {discrepancy.discrepancyQuantity}
                </Typography>
              </View>
            </View>

            {/* Details */}
            <View style={styles.detailSection}>
              <View style={styles.detailRow}>
                <Typography variant="small" color={theme.colors.gray[500]}>
                  Order #
                </Typography>
                <Typography variant="small" weight="semibold">
                  {discrepancy.orderNumber}
                </Typography>
              </View>
              {discrepancy.sku && (
                <View style={styles.detailRow}>
                  <Typography variant="small" color={theme.colors.gray[500]}>
                    SKU
                  </Typography>
                  <Typography variant="small" weight="semibold">
                    {discrepancy.sku}
                  </Typography>
                </View>
              )}
              {discrepancy.reportedBy && (
                <View style={styles.detailRow}>
                  <Typography variant="small" color={theme.colors.gray[500]}>
                    Reported By
                  </Typography>
                  <Typography variant="small" weight="semibold">
                    {discrepancy.reportedBy.fullName ||
                      discrepancy.reportedBy.username ||
                      'N/A'}
                  </Typography>
                </View>
              )}
              <View style={styles.detailRow}>
                <Typography variant="small" color={theme.colors.gray[500]}>
                  Date
                </Typography>
                <Typography variant="small" weight="semibold">
                  {new Date(discrepancy.reportedAt).toLocaleString()}
                </Typography>
              </View>
            </View>

            {/* Approve / Reject for pending */}
            {discrepancy.status === 'pending' && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.approveButton]}
                  onPress={() => handleOrderApprove(discrepancy._id)}>
                  <Typography
                    variant="small"
                    weight="semibold"
                    color={theme.colors.success[700]}>
                    Approve
                  </Typography>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => handleOrderReject(discrepancy._id)}>
                  <Typography
                    variant="small"
                    weight="semibold"
                    color={theme.colors.error[700]}>
                    Reject
                  </Typography>
                </TouchableOpacity>
              </View>
            )}

            {/* Delete (admin) */}
            {user?.role === 'admin' && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleOrderDelete(discrepancy._id)}>
                <Typography
                  variant="small"
                  weight="semibold"
                  color={theme.colors.error[600]}>
                  Delete Discrepancy
                </Typography>
              </TouchableOpacity>
            )}
          </View>
        )}
      </Card>
    );
  };

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Typography variant="h2" weight="bold">
              Stock Discrepancies
            </Typography>
            <Typography variant="body" color={theme.colors.gray[500]} style={{marginTop: 4}}>
              Review and manage inventory differences
            </Typography>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Typography variant="h3" color={theme.colors.gray[600]}>
              ✕
            </Typography>
          </TouchableOpacity>
        </View>

        {/* Top-level Tab Switcher */}
        <View style={styles.topTabContainer}>
          {TOP_TABS.map(tab => {
            const isActive = topTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.topTabButton, isActive && styles.topTabButtonActive]}
                onPress={() => {
                  setTopTab(tab.id as 'stock' | 'order');
                  setExpandedRow(null);
                  setOrderExpandedRow(null);
                }}>
                <Typography
                  variant="body"
                  weight="semibold"
                  color={
                    isActive ? theme.colors.primary[700] : theme.colors.gray[600]
                  }>
                  {tab.label}
                </Typography>
              </TouchableOpacity>
            );
          })}
        </View>

        {topTab === 'stock' && (
          <>
        {/* Record Discrepancy (admin) */}
        {user?.role === 'admin' && (
          <View style={styles.recordButtonContainer}>
            <Button
              title="Record Discrepancy"
              variant="primary"
              size="md"
              fullWidth
              onPress={() => setShowRecordModal(true)}
            />
          </View>
        )}
        {/* Summary Cards */}
        {summary && (
          <View style={styles.summaryContainer}>
            <View style={styles.summaryGrid}>
              <View style={[styles.summaryCard, {backgroundColor: theme.colors.primary[100]}]}>
                <ClockIcon size={20} color={theme.colors.primary[600]} />
                <Typography variant="h3" weight="bold" style={{marginTop: 4}}>
                  {summary.pending || 0}
                </Typography>
                <Typography variant="caption" color={theme.colors.gray[600]}>
                  Pending
                </Typography>
              </View>
              <View style={[styles.summaryCard, {backgroundColor: theme.colors.success[100]}]}>
                <CheckCircleIcon size={20} color={theme.colors.success[600]} />
                <Typography variant="h3" weight="bold" style={{marginTop: 4}}>
                  {summary.approved || 0}
                </Typography>
                <Typography variant="caption" color={theme.colors.gray[600]}>
                  Approved
                </Typography>
              </View>
              <View style={[styles.summaryCard, {backgroundColor: theme.colors.error[100]}]}>
                <AlertCircleIcon size={20} color={theme.colors.error[600]} />
                <Typography variant="h3" weight="bold" style={{marginTop: 4}}>
                  {summary.rejected || 0}
                </Typography>
                <Typography variant="caption" color={theme.colors.gray[600]}>
                  Rejected
                </Typography>
              </View>
            </View>
          </View>
        )}

        {/* Source Tabs */}
        <View style={styles.tabContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabContent}>
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.tabButton, isActive && styles.tabButtonActive]}
                  onPress={() => {
                    setActiveTab(tab.id);
                    setExpandedRow(null);
                  }}>
                  <Typography
                    variant="small"
                    weight="semibold"
                    color={isActive ? theme.colors.primary[700] : theme.colors.gray[600]}>
                    {tab.label}
                  </Typography>
                  <View
                    style={[
                      styles.tabCount,
                      {
                        backgroundColor: isActive
                          ? theme.colors.primary[100]
                          : theme.colors.gray[200],
                      },
                    ]}>
                    <Typography
                      variant="caption"
                      weight="bold"
                      color={isActive ? theme.colors.primary[700] : theme.colors.gray[600]}>
                      {tabCounts[tab.id] || 0}
                    </Typography>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search item, invoice or SKU"
            placeholderTextColor={theme.colors.gray[400]}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        {/* Status Filter */}
        <View style={styles.filterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContent}>
            <TouchableOpacity
              style={[styles.filterButton, !filters.status && styles.filterButtonActive]}
              onPress={() => setFilters({...filters, status: ''})}>
              <Typography
                variant="caption"
                weight="semibold"
                color={!filters.status ? theme.colors.white : theme.colors.gray[700]}>
                All Status
              </Typography>
            </TouchableOpacity>
            {['Pending', 'Approved', 'Rejected'].map(status => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterButton,
                  filters.status === status && styles.filterButtonActive,
                ]}
                onPress={() => setFilters({...filters, status})}>
                <Typography
                  variant="caption"
                  weight="semibold"
                  color={
                    filters.status === status ? theme.colors.white : theme.colors.gray[700]
                  }>
                  {status}
                </Typography>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Discrepancies List */}
        <PaginatedList
          data={filteredDiscrepancies}
          keyExtractor={(item) => item._id}
          style={styles.listContainer}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={onRefresh}
          pagedMode
          scrollTopKey={page}
          resetKey={`${activeTab}|${searchText}|${filters.status}|${page}`}
          ItemSeparatorComponent={() => <View style={{height: 0}} />}
          ListFooterComponent={
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.pages}
              totalItems={pagination.total}
              pageSize={pagination.limit}
              onPageChange={setPage}
            />
          }
          ListEmptyComponent={
            <Card variant="elevated" padding="lg" style={styles.emptyCard}>
              <AlertCircleIcon size={48} color={theme.colors.gray[400]} />
              <Typography
                variant="h3"
                weight="semibold"
                color={theme.colors.gray[700]}
                style={{marginTop: 16}}>
                No Discrepancies Found
              </Typography>
              <Typography variant="body" color={theme.colors.gray[500]} align="center">
                {activeTab !== 'all'
                  ? `No ${getSourceLabel(activeTab).toLowerCase()} discrepancies`
                  : 'There are no discrepancies matching your filters'}
              </Typography>
            </Card>
          }
          renderItem={({item: discrepancy}) => {
            const isExpanded = expandedRow === discrepancy._id;
            const statusColors = getStatusColor(discrepancy.status);
            const typeColors = getTypeColor(discrepancy.discrepancyType);
            const source = getDiscrepancySource(discrepancy);
            const sourceColors = getSourceColors(source, theme);

            return (
              <Card
                variant="elevated"
                padding="none"
                style={styles.discrepancyCard}>
                {/* Clickable Row Header */}
                <TouchableOpacity
                  style={[
                    styles.discrepancyHeader,
                    isExpanded && {backgroundColor: '#f0f9ff'},
                  ]}
                  onPress={() => setExpandedRow(isExpanded ? null : discrepancy._id)}
                  activeOpacity={0.7}>
                  <View style={styles.discrepancyHeaderLeft}>
                    {isExpanded ? (
                      <ChevronDownIcon size={18} color={theme.colors.primary[600]} />
                    ) : (
                      <ChevronRightIcon size={18} color={theme.colors.gray[400]} />
                    )}
                    <View style={{marginLeft: 10, flex: 1}}>
                      <Typography variant="body" weight="semibold" numberOfLines={1}>
                        {discrepancy.itemName}
                      </Typography>
                      <View style={styles.rowMeta}>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          {discrepancy.invoiceNumber}
                        </Typography>
                        <Typography variant="caption" color={theme.colors.gray[400]}>
                          {' • '}
                          {formatDate(discrepancy.reportedAt)}
                        </Typography>
                      </View>
                    </View>
                  </View>
                  <View style={styles.rowRight}>
                    {/* Difference badge */}
                    <View
                      style={[
                        styles.diffBadge,
                        {
                          backgroundColor:
                            discrepancy.difference > 0
                              ? theme.colors.success[100]
                              : theme.colors.error[100],
                        },
                      ]}>
                      <Typography
                        variant="small"
                        weight="bold"
                        color={
                          discrepancy.difference > 0
                            ? theme.colors.success[700]
                            : theme.colors.error[700]
                        }>
                        {discrepancy.difference > 0 ? '+' : ''}
                        {discrepancy.difference}
                      </Typography>
                    </View>
                    {/* Status badge */}
                    <View style={[styles.badge, {backgroundColor: statusColors.bg}]}>
                      {getStatusIcon(discrepancy.status)}
                      <Typography
                        variant="caption"
                        weight="semibold"
                        color={statusColors.text}
                        style={{marginLeft: 4}}>
                        {discrepancy.status}
                      </Typography>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Expanded Detail Panel */}
                {isExpanded && (
                  <View style={styles.expandedPanel}>
                    {/* Source Badge */}
                    {activeTab === 'all' && (
                      <View style={styles.sourceRow}>
                        <View
                          style={[
                            styles.sourceBadge,
                            {backgroundColor: sourceColors.bg},
                          ]}>
                          <Typography
                            variant="caption"
                            weight="semibold"
                            color={sourceColors.text}>
                            {getSourceLabel(source)}
                          </Typography>
                        </View>
                        <View style={[styles.badge, {backgroundColor: typeColors.bg}]}>
                          <Typography
                            variant="caption"
                            weight="semibold"
                            color={typeColors.text}>
                            {discrepancy.discrepancyType}
                          </Typography>
                        </View>
                      </View>
                    )}

                    {/* Quantities Grid */}
                    <View style={styles.quantityGrid}>
                      <View style={styles.quantityBox}>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          System
                        </Typography>
                        <Typography variant="h3" weight="bold">
                          {discrepancy.systemQuantity}
                        </Typography>
                      </View>
                      <View style={styles.quantityArrow}>
                        <Typography variant="body" color={theme.colors.gray[400]}>
                          →
                        </Typography>
                      </View>
                      <View style={styles.quantityBox}>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          Actual
                        </Typography>
                        <Typography variant="h3" weight="bold">
                          {discrepancy.actualQuantity}
                        </Typography>
                      </View>
                      <View style={styles.quantityArrow}>
                        <Typography variant="body" color={theme.colors.gray[400]}>
                          =
                        </Typography>
                      </View>
                      <View style={styles.quantityBox}>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          Diff
                        </Typography>
                        <Typography
                          variant="h3"
                          weight="bold"
                          color={
                            discrepancy.difference > 0
                              ? theme.colors.success[600]
                              : theme.colors.error[600]
                          }>
                          {discrepancy.difference > 0 ? '+' : ''}
                          {discrepancy.difference}
                        </Typography>
                      </View>
                    </View>

                    {/* Details */}
                    <View style={styles.detailSection}>
                      {discrepancy.itemSku && (
                        <View style={styles.detailRow}>
                          <Typography variant="small" color={theme.colors.gray[500]}>
                            SKU
                          </Typography>
                          <Typography variant="small" weight="semibold">
                            {discrepancy.itemSku}
                          </Typography>
                        </View>
                      )}
                      {discrepancy.categoryName && (
                        <View style={styles.detailRow}>
                          <Typography variant="small" color={theme.colors.gray[500]}>
                            Category
                          </Typography>
                          <Typography variant="small" weight="semibold">
                            {discrepancy.categoryName}
                          </Typography>
                        </View>
                      )}
                      <View style={styles.detailRow}>
                        <Typography variant="small" color={theme.colors.gray[500]}>
                          Invoice
                        </Typography>
                        <Typography variant="small" weight="semibold">
                          {discrepancy.invoiceNumber || 'N/A'}
                        </Typography>
                      </View>
                      {discrepancy.reportedBy && (
                        <View style={styles.detailRow}>
                          <Typography variant="small" color={theme.colors.gray[500]}>
                            Reported By
                          </Typography>
                          <Typography variant="small" weight="semibold">
                            {discrepancy.reportedBy.fullName ||
                              discrepancy.reportedBy.username}
                          </Typography>
                        </View>
                      )}
                      <View style={styles.detailRow}>
                        <Typography variant="small" color={theme.colors.gray[500]}>
                          Date
                        </Typography>
                        <Typography variant="small" weight="semibold">
                          {new Date(discrepancy.reportedAt).toLocaleString()}
                        </Typography>
                      </View>
                    </View>

                    {/* Reason & Notes */}
                    {(discrepancy.reason || discrepancy.notes) && (
                      <View style={styles.notesSection}>
                        {discrepancy.reason && (
                          <View style={styles.noteBox}>
                            <Typography
                              variant="caption"
                              weight="semibold"
                              color={theme.colors.gray[600]}>
                              Reason
                            </Typography>
                            <Typography
                              variant="small"
                              color={theme.colors.gray[800]}
                              style={{marginTop: 4}}>
                              {discrepancy.reason}
                            </Typography>
                          </View>
                        )}
                        {discrepancy.notes && (
                          <View style={styles.noteBox}>
                            <Typography
                              variant="caption"
                              weight="semibold"
                              color={theme.colors.gray[600]}>
                              Notes
                            </Typography>
                            <Typography
                              variant="small"
                              color={theme.colors.gray[800]}
                              style={{marginTop: 4}}>
                              {discrepancy.notes}
                            </Typography>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Resolution Info */}
                    {discrepancy.resolvedBy && (
                      <View style={styles.resolutionSection}>
                        <Typography
                          variant="caption"
                          weight="semibold"
                          color={theme.colors.gray[600]}
                          style={{marginBottom: 8}}>
                          Resolution
                        </Typography>
                        <View style={styles.detailRow}>
                          <Typography variant="small" color={theme.colors.gray[500]}>
                            Resolved By
                          </Typography>
                          <Typography variant="small" weight="semibold">
                            {discrepancy.resolvedBy.fullName ||
                              discrepancy.resolvedBy.username}
                          </Typography>
                        </View>
                        {discrepancy.resolvedAt && (
                          <View style={styles.detailRow}>
                            <Typography variant="small" color={theme.colors.gray[500]}>
                              Resolved At
                            </Typography>
                            <Typography variant="small" weight="semibold">
                              {new Date(discrepancy.resolvedAt).toLocaleString()}
                            </Typography>
                          </View>
                        )}
                        {discrepancy.resolutionNotes && (
                          <View style={[styles.noteBox, {marginTop: 8}]}>
                            <Typography
                              variant="small"
                              color={theme.colors.gray[800]}>
                              {discrepancy.resolutionNotes}
                            </Typography>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Delete Button */}
                    {user?.role === 'admin' && (
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDelete(discrepancy._id)}>
                        <Typography
                          variant="small"
                          weight="semibold"
                          color={theme.colors.error[600]}>
                          Delete Discrepancy
                        </Typography>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </Card>
            );
          }}
        />
          </>
        )}

        {topTab === 'order' && (
          <>
            {/* Order Status Filter */}
            <View style={styles.filterContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterContent}>
                {[
                  {id: '', label: 'All Status'},
                  {id: 'pending', label: 'Pending'},
                  {id: 'approved', label: 'Approved'},
                  {id: 'rejected', label: 'Rejected'},
                ].map(opt => {
                  const isActive = orderStatusFilter === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id || 'all'}
                      style={[
                        styles.filterButton,
                        isActive && styles.filterButtonActive,
                      ]}
                      onPress={() => setOrderStatusFilter(opt.id)}>
                      <Typography
                        variant="caption"
                        weight="semibold"
                        color={
                          isActive ? theme.colors.white : theme.colors.gray[700]
                        }>
                        {opt.label}
                      </Typography>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Order Discrepancy List */}
            <PaginatedList
              data={orderDiscrepancies}
              keyExtractor={(item) => item._id}
              style={styles.listContainer}
              contentContainerStyle={styles.listContent}
              refreshing={refreshing}
              onRefresh={onRefresh}
              pagedMode
              scrollTopKey={orderPage}
              resetKey={`${orderStatusFilter}|${orderPage}`}
              ItemSeparatorComponent={() => <View style={{height: 0}} />}
              ListFooterComponent={
                <Pagination
                  currentPage={orderPagination.page}
                  totalPages={orderPagination.pages}
                  totalItems={orderPagination.total}
                  pageSize={orderPagination.limit}
                  onPageChange={setOrderPage}
                />
              }
              ListEmptyComponent={
                <Card variant="elevated" padding="lg" style={styles.emptyCard}>
                  <AlertCircleIcon size={48} color={theme.colors.gray[400]} />
                  <Typography
                    variant="h3"
                    weight="semibold"
                    color={theme.colors.gray[700]}
                    style={{marginTop: 16}}>
                    No Order Discrepancies
                  </Typography>
                  <Typography
                    variant="body"
                    color={theme.colors.gray[500]}
                    align="center">
                    Discrepancies will appear here when orders are verified
                  </Typography>
                </Card>
              }
              renderItem={renderOrderItem}
            />
          </>
        )}
      </SafeAreaView>

      {showRecordModal && (
        <RecordDiscrepancyModal
          theme={theme}
          bp={bp}
          onClose={() => setShowRecordModal(false)}
          onSuccess={() => {
            setShowRecordModal(false);
            loadData();
          }}
        />
      )}
    </Modal>
  );
};

interface RecordDiscrepancyModalProps {
  theme: Theme;
  bp: BreakpointInfo;
  onClose: () => void;
  onSuccess: () => void;
}

const RecordDiscrepancyModal: React.FC<RecordDiscrepancyModalProps> = ({
  theme,
  bp,
  onClose,
  onSuccess,
}) => {
  const styles = useMemo(() => makeRecordStyles(theme, bp), [theme, bp]);
  const [loading, setLoading] = useState(false);
  const [searchingInvoice, setSearchingInvoice] = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const debouncedInvoiceSearch = useDebounce(invoiceSearch, 400);

  const [form, setForm] = useState({
    invoiceNumber: '',
    invoiceId: '',
    invoiceType: 'RouteStarInvoice',
    itemName: '',
    itemSku: '',
    categoryName: '',
    systemQuantity: 0,
    actualQuantity: 0,
    discrepancyType: '',
    reason: '',
    notes: '',
  });
  const [actualQtyText, setActualQtyText] = useState('');

  // Debounced invoice search.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const term = debouncedInvoiceSearch.trim();
      if (term.length < 2) {
        setInvoices([]);
        return;
      }
      try {
        setSearchingInvoice(true);
        const response = await discrepancyService.searchInvoices(term, 10);
        if (!cancelled && response.success) {
          setInvoices(response.data?.invoices || []);
        }
      } catch (error) {
        console.error('Search invoices error:', error);
      } finally {
        if (!cancelled) setSearchingInvoice(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [debouncedInvoiceSearch]);

  // Auto-detect discrepancy type from quantities.
  useEffect(() => {
    const diff = form.actualQuantity - form.systemQuantity;
    let type = '';
    if (diff > 0) type = 'Overage';
    else if (diff < 0) type = 'Shortage';
    setForm(prev => (prev.discrepancyType === type ? prev : {...prev, discrepancyType: type}));
  }, [form.systemQuantity, form.actualQuantity]);

  const handleInvoiceSelect = (invoice: any) => {
    setSelectedInvoice(invoice);
    setInvoiceSearch(invoice.invoiceNumber);
    setInvoices([]);
    setActualQtyText('');
    setForm(prev => ({
      ...prev,
      invoiceNumber: invoice.invoiceNumber,
      invoiceId: invoice._id,
      invoiceType: 'RouteStarInvoice',
      itemName: '',
      itemSku: '',
      systemQuantity: 0,
      actualQuantity: 0,
      discrepancyType: '',
    }));
  };

  const handleLineItemSelect = (item: any) => {
    setActualQtyText('');
    setForm(prev => ({
      ...prev,
      itemName: item.itemName,
      itemSku: item.itemCode || '',
      systemQuantity: Number(item.quantity) || 0,
      actualQuantity: 0,
      discrepancyType: '',
    }));
  };

  const difference = form.actualQuantity - form.systemQuantity;

  const handleSubmit = async () => {
    if (!form.invoiceNumber) {
      Alert.alert('Missing Invoice', 'Please select an invoice.');
      return;
    }
    if (!form.itemName) {
      Alert.alert('Missing Item', 'Please select an item.');
      return;
    }
    if (form.actualQuantity === form.systemQuantity) {
      Alert.alert(
        'No Discrepancy',
        'Actual quantity matches system quantity - no discrepancy to record.',
      );
      return;
    }
    if (!form.discrepancyType) {
      Alert.alert('Missing Type', 'Discrepancy type could not be determined.');
      return;
    }
    try {
      setLoading(true);
      const response = await discrepancyService.createDiscrepancy(form);
      if (response.success) {
        Alert.alert('Success', 'Discrepancy recorded successfully');
        onSuccess();
      } else {
        Alert.alert('Error', response.message || 'Failed to record discrepancy');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error recording discrepancy');
    } finally {
      setLoading(false);
    }
  };

  const diffColor =
    difference > 0
      ? theme.colors.success[600]
      : difference < 0
      ? theme.colors.error[600]
      : theme.colors.gray[600];

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <View style={{flex: 1}}>
              <Typography variant="h3" weight="bold">
                Record Stock Discrepancy
              </Typography>
              <Typography
                variant="caption"
                color={theme.colors.gray[500]}
                style={{marginTop: 2}}>
                Enter the details of the stock count difference
              </Typography>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.sheetClose}>
              <Typography variant="h3" color={theme.colors.gray[600]}>
                ✕
              </Typography>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.sheetBody}
            contentContainerStyle={styles.sheetBodyContent}
            keyboardShouldPersistTaps="handled">
            {/* Invoice search */}
            <Typography variant="small" weight="semibold" style={styles.fieldLabel}>
              Invoice Number *
            </Typography>
            <View style={styles.searchWrap}>
              <TextInput
                style={styles.input}
                placeholder="Search invoice by number..."
                placeholderTextColor={theme.colors.gray[400]}
                value={invoiceSearch}
                onChangeText={text => {
                  setInvoiceSearch(text);
                  if (selectedInvoice) {
                    setSelectedInvoice(null);
                  }
                }}
              />
              {searchingInvoice && (
                <ActivityIndicator
                  style={styles.searchSpinner}
                  size="small"
                  color={theme.colors.primary[600]}
                />
              )}
            </View>
            {invoices.length > 0 && (
              <View style={styles.optionsList}>
                {invoices.map(invoice => (
                  <TouchableOpacity
                    key={invoice._id}
                    style={styles.optionRow}
                    onPress={() => handleInvoiceSelect(invoice)}>
                    <Typography variant="small" weight="semibold">
                      {invoice.invoiceNumber}
                    </Typography>
                    <Typography variant="caption" color={theme.colors.gray[500]}>
                      {invoice.customerName || 'Unknown'}
                      {invoice.invoiceDate
                        ? ` • ${new Date(invoice.invoiceDate).toLocaleDateString()}`
                        : ''}
                    </Typography>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Line item select */}
            {selectedInvoice &&
              Array.isArray(selectedInvoice.lineItems) &&
              selectedInvoice.lineItems.length > 0 && (
                <>
                  <Typography
                    variant="small"
                    weight="semibold"
                    style={styles.fieldLabel}>
                    Select Item *
                  </Typography>
                  <View style={styles.optionsList}>
                    {selectedInvoice.lineItems.map((item: any, index: number) => {
                      const active = form.itemName === item.itemName;
                      return (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.optionRow,
                            active && {backgroundColor: theme.colors.primary[50]},
                          ]}
                          onPress={() => handleLineItemSelect(item)}>
                          <Typography variant="small" weight="semibold">
                            {item.itemName}
                          </Typography>
                          <Typography
                            variant="caption"
                            color={theme.colors.gray[500]}>
                            SKU: {item.itemCode || 'N/A'} • Qty: {item.quantity}
                          </Typography>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

            {/* Quantities + type */}
            {form.itemName ? (
              <>
                <Typography
                  variant="small"
                  weight="semibold"
                  style={styles.fieldLabel}>
                  System Quantity
                </Typography>
                <TextInput
                  style={[styles.input, styles.inputReadonly]}
                  value={String(form.systemQuantity)}
                  editable={false}
                />

                <Typography
                  variant="small"
                  weight="semibold"
                  style={styles.fieldLabel}>
                  Actual Quantity (Physical Count) *
                </Typography>
                <TextInput
                  style={styles.input}
                  placeholder="Enter actual counted quantity"
                  placeholderTextColor={theme.colors.gray[400]}
                  keyboardType="number-pad"
                  value={actualQtyText}
                  onChangeText={text => {
                    setActualQtyText(text);
                    const parsed = parseFloat(text);
                    setForm(prev => ({
                      ...prev,
                      actualQuantity: isNaN(parsed) ? 0 : parsed,
                    }));
                  }}
                />

                <View style={styles.diffBox}>
                  <Typography variant="small" weight="semibold" color={theme.colors.gray[700]}>
                    Difference
                  </Typography>
                  <Typography variant="h3" weight="bold" color={diffColor}>
                    {difference > 0 ? '+' : ''}
                    {difference}
                  </Typography>
                </View>

                <Typography
                  variant="small"
                  weight="semibold"
                  style={styles.fieldLabel}>
                  Discrepancy Type
                </Typography>
                <TextInput
                  style={[styles.input, styles.inputReadonly]}
                  value={form.discrepancyType}
                  placeholder="Auto-detected based on quantities"
                  placeholderTextColor={theme.colors.gray[400]}
                  editable={false}
                />

                <Typography
                  variant="small"
                  weight="semibold"
                  style={styles.fieldLabel}>
                  Reason
                </Typography>
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  placeholder="Explain the reason for this discrepancy..."
                  placeholderTextColor={theme.colors.gray[400]}
                  multiline
                  value={form.reason}
                  onChangeText={text => setForm(prev => ({...prev, reason: text}))}
                />

                <Typography
                  variant="small"
                  weight="semibold"
                  style={styles.fieldLabel}>
                  Additional Notes
                </Typography>
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  placeholder="Any additional information..."
                  placeholderTextColor={theme.colors.gray[400]}
                  multiline
                  value={form.notes}
                  onChangeText={text => setForm(prev => ({...prev, notes: text}))}
                />
              </>
            ) : (
              <Typography
                variant="small"
                color={theme.colors.gray[500]}
                style={{marginTop: theme.spacing.md}}>
                Search and select an invoice, then choose an item to continue.
              </Typography>
            )}
          </ScrollView>

          <View style={styles.sheetFooter}>
            <Button
              title="Cancel"
              variant="outline"
              size="md"
              style={{flex: 1}}
              disabled={loading}
              onPress={onClose}
            />
            <Button
              title="Record Discrepancy"
              variant="primary"
              size="md"
              style={{flex: 1}}
              loading={loading}
              disabled={loading || !form.itemName || !form.discrepancyType}
              onPress={handleSubmit}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const makeRecordStyles = (theme: Theme, bp: BreakpointInfo) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: theme.colors.white,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '90%',
      width: '100%',
      maxWidth: bp.contentMaxWidth,
      alignSelf: 'center',
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.gray[200],
    },
    sheetClose: {padding: 4, marginLeft: 8},
    sheetBody: {flexGrow: 0},
    sheetBodyContent: {
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
    },
    fieldLabel: {
      marginTop: theme.spacing.md,
      marginBottom: 6,
      color: theme.colors.gray[700],
    },
    searchWrap: {justifyContent: 'center'},
    searchSpinner: {position: 'absolute', right: 12},
    input: {
      backgroundColor: theme.colors.gray[50],
      borderWidth: 1,
      borderColor: theme.colors.gray[300],
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: theme.typography.roles.body.fontSize,
      color: theme.colors.gray[900],
    },
    inputReadonly: {
      backgroundColor: theme.colors.gray[100],
      color: theme.colors.gray[600],
    },
    inputMultiline: {
      minHeight: 64,
      textAlignVertical: 'top',
    },
    optionsList: {
      marginTop: 8,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
      borderRadius: 8,
      overflow: 'hidden',
    },
    optionRow: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.gray[100],
    },
    diffBox: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.gray[50],
      borderRadius: 8,
      padding: theme.spacing.md,
      marginTop: theme.spacing.md,
    },
    sheetFooter: {
      flexDirection: 'row',
      gap: 10,
      padding: theme.spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.colors.gray[200],
    },
  });

const makeStyles = (theme: Theme, bp: BreakpointInfo) => StyleSheet.create({
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  closeButton: {
    padding: 8,
  },
  topTabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
    paddingHorizontal: theme.spacing.lg,
  },
  topTabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  topTabButtonActive: {
    borderBottomColor: theme.colors.primary[600],
  },
  orderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  skuBadge: {
    backgroundColor: theme.colors.gray[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: theme.spacing.sm,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  approveButton: {
    backgroundColor: theme.colors.success[100],
    borderColor: theme.colors.success[200] || theme.colors.success[100],
  },
  rejectButton: {
    backgroundColor: theme.colors.error[100],
    borderColor: theme.colors.error[200] || theme.colors.error[100],
  },
  summaryContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.white,
  },
  recordButtonContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.white,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    padding: theme.spacing.sm,
    borderRadius: 10,
    alignItems: 'center',
    minHeight: 80,
    justifyContent: 'center',
  },
  tabContainer: {
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  tabContent: {
    paddingHorizontal: theme.spacing.lg,
    gap: 4,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: 6,
  },
  tabButtonActive: {
    borderBottomColor: theme.colors.primary[600],
  },
  tabCount: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 22,
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.white,
  },
  searchInput: {
    backgroundColor: theme.colors.gray[100],
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: theme.typography.roles.body.fontSize,
    color: theme.colors.gray[900],
  },
  filterContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  filterContent: {
    gap: 8,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: theme.colors.gray[200],
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary[600],
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    maxWidth: bp.contentMaxWidth,
    alignSelf: 'center',
    width: '100%',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl * 2,
  },
  discrepancyCard: {
    marginBottom: theme.spacing.sm,
    overflow: 'hidden',
  },
  discrepancyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
  },
  discrepancyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 6,
    marginLeft: 10,
  },
  diffBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  expandedPanel: {
    padding: theme.spacing.md,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[100],
    backgroundColor: '#fafbfc',
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  sourceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  quantityGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
  },
  quantityBox: {
    flex: 1,
    alignItems: 'center',
  },
  quantityArrow: {
    paddingHorizontal: 6,
  },
  detailSection: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderRadius: 10,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  notesSection: {
    marginTop: theme.spacing.sm,
    gap: 8,
  },
  noteBox: {
    backgroundColor: theme.colors.white,
    borderRadius: 8,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
  },
  resolutionSection: {
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.success[100],
    borderRadius: 8,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.success[200] || theme.colors.gray[200],
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: theme.spacing.sm,
  },
});
