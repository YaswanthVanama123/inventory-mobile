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
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {useAuth} from '../contexts/AuthContext';
import {useTheme} from '../contexts/ThemeContext';
import {Theme} from '../theme';
import {useBreakpoint, BreakpointInfo} from '../utils/breakpoints';
import discrepancyService from '../services/discrepancyService';
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

const TABS = [
  {id: 'all', label: 'All'},
  {id: 'truck-return', label: 'Truck Return'},
  {id: 'stock-check', label: 'Stock Check'},
  {id: 'stock-adjustment', label: 'Adjustment'},
];

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
  const {user} = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [discrepancies, setDiscrepancies] = useState<any[]>([]);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    type: '',
  });

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [discrepancyResponse, summaryResponse] = await Promise.all([
        discrepancyService.getDiscrepancies({
          page: 1,
          limit: 100,
          status: filters.status,
          type: filters.type,
        }),
        discrepancyService.getSummary(),
      ]);
      if (discrepancyResponse.success) {
        setDiscrepancies(discrepancyResponse.data?.discrepancies || []);
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

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
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

  const filteredDiscrepancies = discrepancies.filter(d => {
    const source = getDiscrepancySource(d);
    if (activeTab !== 'all' && source !== activeTab) return false;
    if (searchText) {
      const search = searchText.toLowerCase();
      return (
        d.itemName?.toLowerCase().includes(search) ||
        d.invoiceNumber?.toLowerCase().includes(search) ||
        (d.itemSku && d.itemSku.toLowerCase().includes(search))
      );
    }
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

  if (loading && discrepancies.length === 0) {
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
            placeholder="Search by item, invoice, or SKU..."
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
        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {filteredDiscrepancies.length === 0 ? (
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
          ) : (
            filteredDiscrepancies.map(discrepancy => {
              const isExpanded = expandedRow === discrepancy._id;
              const statusColors = getStatusColor(discrepancy.status);
              const typeColors = getTypeColor(discrepancy.discrepancyType);
              const source = getDiscrepancySource(discrepancy);
              const sourceColors = getSourceColors(source, theme);

              return (
                <Card
                  key={discrepancy._id}
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
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

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
  summaryContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
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
