import React, {useState, useEffect} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput as RNTextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {useAuth} from '../contexts/AuthContext';
import {useApiErrorHandler} from '../hooks/useApiErrorHandler';
import {theme} from '../theme';
import orderDiscrepancyService from '../services/orderDiscrepancyService';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  AlertCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '../components/icons';

interface OrderDiscrepancyListScreenProps {
  navigation: any;
}

export const OrderDiscrepancyListScreen: React.FC<
  OrderDiscrepancyListScreenProps
> = ({navigation}) => {
  const {token, user} = useAuth();
  const {handleApiError} = useApiErrorHandler();
  const isAdmin = user?.role === 'admin';
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [discrepancies, setDiscrepancies] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token, statusFilter, typeFilter]);
  const loadData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const params: any = {limit: 100};
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.discrepancyType = typeFilter;
      const [discrepanciesResponse, statsResponse] = await Promise.all([
        orderDiscrepancyService.getOrderDiscrepancies(token, params),
        orderDiscrepancyService.getOrderDiscrepancyStats(token),
      ]);
      setDiscrepancies(discrepanciesResponse.discrepancies);
      setStats(statsResponse);
    } catch (error: any) {
      console.error('Failed to fetch discrepancies:', error);
      const wasHandled = await handleApiError(error);
      if (!wasHandled) {
        Alert.alert('Error', 'Failed to load order discrepancies');
      }
    } finally {
      setLoading(false);
    }
  };
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };
  const handleApprove = (discrepancy: any) => {
    Alert.alert(
      'Approve Discrepancy',
      `This will approve the discrepancy and automatically adjust stock for ${discrepancy.itemName}.\n\nStock Movement: ${
        discrepancy.discrepancyType === 'Shortage' ? 'OUT' : 'IN'
      } ${Math.abs(discrepancy.discrepancyQuantity)} units`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Approve',
          onPress: async () => {
            if (!token) return;
            try {
              await orderDiscrepancyService.approveOrderDiscrepancy(
                token,
                discrepancy._id,
              );
              Alert.alert(
                'Success',
                'Order discrepancy approved and stock adjusted',
              );
              loadData();
            } catch (error: any) {
              console.error('Approve error:', error);
              const wasHandled = await handleApiError(error);
              if (!wasHandled) {
                Alert.alert(
                  'Error',
                  error.message || 'Failed to approve discrepancy',
                );
              }
            }
          },
        },
      ],
    );
  };
  const handleReject = (discrepancy: any) => {
    Alert.alert(
      'Reject Discrepancy',
      `This will reject the discrepancy for ${discrepancy.itemName}. No stock adjustments will be made.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            if (!token) return;
            try {
              await orderDiscrepancyService.rejectOrderDiscrepancy(
                token,
                discrepancy._id,
              );
              Alert.alert('Success', 'Order discrepancy rejected');
              loadData();
            } catch (error: any) {
              console.error('Reject error:', error);
              const wasHandled = await handleApiError(error);
              if (!wasHandled) {
                Alert.alert(
                  'Error',
                  error.message || 'Failed to reject discrepancy',
                );
              }
            }
          },
        },
      ],
    );
  };
  const getStatusBadge = (status: string) => {
    const config: any = {
      pending: {color: theme.colors.warning, label: 'Pending', icon: ClockIcon},
      approved: {
        color: theme.colors.success,
        label: 'Approved',
        icon: CheckCircleIcon,
      },
      rejected: {color: theme.colors.error, label: 'Rejected', icon: XCircleIcon},
    };
    const {color, label, icon: Icon} = config[status] || config.pending;
    return (
      <View style={[styles.badge, {backgroundColor: color + '20'}]}>
        <Icon size={14} color={color} />
        <Typography variant="body2" style={[styles.badgeText, {color}]}>
          {label}
        </Typography>
      </View>
    );
  };
  const getTypeBadge = (type: string) => {
    const config: any = {
      Shortage: {color: theme.colors.warning, label: 'Shortage'},
      Overage: {color: theme.colors.info, label: 'Overage'},
      Matched: {color: theme.colors.success, label: 'Matched'},
    };
    const {color, label} = config[type] || {
      color: theme.colors.textSecondary,
      label: type,
    };
    return (
      <View style={[styles.badge, {backgroundColor: color + '20'}]}>
        <Typography variant="body2" style={[styles.badgeText, {color}]}>
          {label}
        </Typography>
      </View>
    );
  };
  const formatDate = (date: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Typography style={styles.loadingText}>
            Loading discrepancies...
          </Typography>
        </View>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {/* Header */}
        <View style={styles.header}>
          <Typography variant="h2">Order Discrepancies</Typography>
          <Typography variant="body2" style={styles.subtitle}>
            Track and manage order verification discrepancies
          </Typography>
        </View>
        {/* Stats Cards */}
        {stats && (
          <View style={styles.statsRow}>
            <Card style={styles.statCard}>
              <Typography variant="body2" style={styles.statLabel}>
                Total
              </Typography>
              <Typography variant="h2">{stats.total || 0}</Typography>
            </Card>
            <Card style={styles.statCard}>
              <Typography variant="body2" style={styles.statLabel}>
                Pending
              </Typography>
              <Typography variant="h2" style={{color: theme.colors.warning}}>
                {stats.pending || 0}
              </Typography>
            </Card>
            <Card style={styles.statCard}>
              <Typography variant="body2" style={styles.statLabel}>
                Shortages
              </Typography>
              <Typography variant="h2" style={{color: theme.colors.warning}}>
                {stats.shortages || 0}
              </Typography>
            </Card>
            <Card style={styles.statCard}>
              <Typography variant="body2" style={styles.statLabel}>
                Overages
              </Typography>
              <Typography variant="h2" style={{color: theme.colors.info}}>
                {stats.overages || 0}
              </Typography>
            </Card>
          </View>
        )}
        {/* Filters */}
        <Card style={styles.card}>
          <TouchableOpacity
            style={styles.filterHeader}
            onPress={() => setShowFilters(!showFilters)}>
            <Typography variant="h4">Filters</Typography>
            {showFilters ? (
              <ChevronUpIcon size={20} color={theme.colors.text} />
            ) : (
              <ChevronDownIcon size={20} color={theme.colors.text} />
            )}
          </TouchableOpacity>
          {showFilters && (
            <View style={styles.filterContent}>
              <View style={styles.filterRow}>
                <View style={styles.filterItem}>
                  <Typography variant="body2" style={styles.filterLabel}>
                    Status
                  </Typography>
                  <View style={styles.filterButtons}>
                    <TouchableOpacity
                      style={[
                        styles.filterButton,
                        statusFilter === '' && styles.filterButtonActive,
                      ]}
                      onPress={() => setStatusFilter('')}>
                      <Typography
                        variant="body2"
                        style={[
                          styles.filterButtonText,
                          statusFilter === '' &&
                            styles.filterButtonTextActive,
                        ]}>
                        All
                      </Typography>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.filterButton,
                        statusFilter === 'pending' &&
                          styles.filterButtonActive,
                      ]}
                      onPress={() => setStatusFilter('pending')}>
                      <Typography
                        variant="body2"
                        style={[
                          styles.filterButtonText,
                          statusFilter === 'pending' &&
                            styles.filterButtonTextActive,
                        ]}>
                        Pending
                      </Typography>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.filterButton,
                        statusFilter === 'approved' &&
                          styles.filterButtonActive,
                      ]}
                      onPress={() => setStatusFilter('approved')}>
                      <Typography
                        variant="body2"
                        style={[
                          styles.filterButtonText,
                          statusFilter === 'approved' &&
                            styles.filterButtonTextActive,
                        ]}>
                        Approved
                      </Typography>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.filterButton,
                        statusFilter === 'rejected' &&
                          styles.filterButtonActive,
                      ]}
                      onPress={() => setStatusFilter('rejected')}>
                      <Typography
                        variant="body2"
                        style={[
                          styles.filterButtonText,
                          statusFilter === 'rejected' &&
                            styles.filterButtonTextActive,
                        ]}>
                        Rejected
                      </Typography>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.filterItem}>
                  <Typography variant="body2" style={styles.filterLabel}>
                    Type
                  </Typography>
                  <View style={styles.filterButtons}>
                    <TouchableOpacity
                      style={[
                        styles.filterButton,
                        typeFilter === '' && styles.filterButtonActive,
                      ]}
                      onPress={() => setTypeFilter('')}>
                      <Typography
                        variant="body2"
                        style={[
                          styles.filterButtonText,
                          typeFilter === '' && styles.filterButtonTextActive,
                        ]}>
                        All
                      </Typography>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.filterButton,
                        typeFilter === 'Shortage' && styles.filterButtonActive,
                      ]}
                      onPress={() => setTypeFilter('Shortage')}>
                      <Typography
                        variant="body2"
                        style={[
                          styles.filterButtonText,
                          typeFilter === 'Shortage' &&
                            styles.filterButtonTextActive,
                        ]}>
                        Shortage
                      </Typography>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.filterButton,
                        typeFilter === 'Overage' && styles.filterButtonActive,
                      ]}
                      onPress={() => setTypeFilter('Overage')}>
                      <Typography
                        variant="body2"
                        style={[
                          styles.filterButtonText,
                          typeFilter === 'Overage' &&
                            styles.filterButtonTextActive,
                        ]}>
                        Overage
                      </Typography>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          )}
        </Card>
        {/* Discrepancies List */}
        <Card style={styles.card}>
          <Typography variant="h3" style={styles.sectionTitle}>
            Discrepancies ({discrepancies.length})
          </Typography>
          {discrepancies.length === 0 ? (
            <View style={styles.emptyState}>
              <AlertCircleIcon size={48} color={theme.colors.textSecondary} />
              <Typography style={styles.emptyText}>
                No discrepancies found
              </Typography>
            </View>
          ) : (
            discrepancies.map(discrepancy => (
              <View key={discrepancy._id}>
                <TouchableOpacity
                  style={styles.discrepancyItem}
                  onPress={() =>
                    setExpandedId(
                      expandedId === discrepancy._id ? null : discrepancy._id,
                    )
                  }>
                  <View style={styles.discrepancyHeader}>
                    <View style={styles.discrepancyInfo}>
                      <Typography variant="h4">
                        #{discrepancy.orderNumber}
                      </Typography>
                      <Typography
                        variant="body2"
                        style={styles.discrepancySubtext}>
                        {discrepancy.itemName}
                      </Typography>
                      <Typography
                        variant="body2"
                        style={styles.discrepancySku}>
                        {discrepancy.sku}
                      </Typography>
                    </View>
                    <View style={styles.discrepancyRight}>
                      {getStatusBadge(discrepancy.status)}
                      {getTypeBadge(discrepancy.discrepancyType)}
                    </View>
                  </View>
                  <View style={styles.quantityRow}>
                    <View style={styles.quantityItem}>
                      <Typography variant="body2" style={styles.quantityLabel}>
                        Expected
                      </Typography>
                      <Typography variant="h4">
                        {discrepancy.expectedQuantity}
                      </Typography>
                    </View>
                    <View style={styles.quantityItem}>
                      <Typography variant="body2" style={styles.quantityLabel}>
                        Received
                      </Typography>
                      <Typography variant="h4">
                        {discrepancy.receivedQuantity}
                      </Typography>
                    </View>
                    <View style={styles.quantityItem}>
                      <Typography variant="body2" style={styles.quantityLabel}>
                        Difference
                      </Typography>
                      <Typography
                        variant="h4"
                        style={{
                          color:
                            discrepancy.discrepancyQuantity > 0
                              ? theme.colors.info
                              : discrepancy.discrepancyQuantity < 0
                              ? theme.colors.warning
                              : theme.colors.success,
                        }}>
                        {discrepancy.discrepancyQuantity > 0 ? '+' : ''}
                        {discrepancy.discrepancyQuantity}
                      </Typography>
                    </View>
                  </View>
                  {expandedId === discrepancy._id && (
                    <View style={styles.expandedContent}>
                      {discrepancy.notes && (
                        <View style={styles.expandedItem}>
                          <Typography
                            variant="body2"
                            style={styles.expandedLabel}>
                            Notes:
                          </Typography>
                          <Typography variant="body2">
                            {discrepancy.notes}
                          </Typography>
                        </View>
                      )}
                      <View style={styles.expandedItem}>
                        <Typography variant="body2" style={styles.expandedLabel}>
                          Reported By:
                        </Typography>
                        <Typography variant="body2">
                          {discrepancy.reportedBy?.fullName ||
                            discrepancy.reportedBy?.username ||
                            'N/A'}
                        </Typography>
                        <Typography
                          variant="body2"
                          style={styles.expandedSubtext}>
                          {formatDate(discrepancy.reportedAt)}
                        </Typography>
                      </View>
                      {discrepancy.resolvedBy && (
                        <View style={styles.expandedItem}>
                          <Typography
                            variant="body2"
                            style={styles.expandedLabel}>
                            Resolved By:
                          </Typography>
                          <Typography variant="body2">
                            {discrepancy.resolvedBy.fullName ||
                              discrepancy.resolvedBy.username}
                          </Typography>
                          <Typography
                            variant="body2"
                            style={styles.expandedSubtext}>
                            {formatDate(discrepancy.resolvedAt)}
                          </Typography>
                        </View>
                      )}
                      {discrepancy.resolutionNotes && (
                        <View style={styles.expandedItem}>
                          <Typography
                            variant="body2"
                            style={styles.expandedLabel}>
                            Resolution Notes:
                          </Typography>
                          <Typography variant="body2">
                            {discrepancy.resolutionNotes}
                          </Typography>
                        </View>
                      )}
                    </View>
                  )}
                  {isAdmin && discrepancy.status === 'pending' && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.approveButton}
                        onPress={() => handleApprove(discrepancy)}>
                        <CheckCircleIcon
                          size={16}
                          color={theme.colors.white}
                        />
                        <Typography style={styles.approveButtonText}>
                          Approve
                        </Typography>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.rejectButton}
                        onPress={() => handleReject(discrepancy)}>
                        <XCircleIcon size={16} color={theme.colors.white} />
                        <Typography style={styles.rejectButtonText}>
                          Reject
                        </Typography>
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
    padding: theme.spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
  },
  header: {
    marginBottom: theme.spacing.md,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  statLabel: {
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  card: {
    marginBottom: theme.spacing.md,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterContent: {
    marginTop: theme.spacing.md,
  },
  filterRow: {
    gap: theme.spacing.md,
  },
  filterItem: {
    marginBottom: theme.spacing.md,
  },
  filterLabel: {
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    fontWeight: 'bold',
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  filterButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterButtonText: {
    color: theme.colors.text,
  },
  filterButtonTextActive: {
    color: theme.colors.white,
    fontWeight: 'bold',
  },
  sectionTitle: {
    marginBottom: theme.spacing.md,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
  },
  discrepancyItem: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  discrepancyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  discrepancyInfo: {
    flex: 1,
  },
  discrepancySubtext: {
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  discrepancySku: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: theme.spacing.xs,
  },
  discrepancyRight: {
    gap: theme.spacing.xs,
    alignItems: 'flex-end',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: theme.borderRadius.sm,
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  quantityItem: {
    alignItems: 'center',
  },
  quantityLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginBottom: theme.spacing.xs,
  },
  expandedContent: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  expandedItem: {
    marginBottom: theme.spacing.sm,
  },
  expandedLabel: {
    fontWeight: 'bold',
    marginBottom: theme.spacing.xs,
  },
  expandedSubtext: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: theme.spacing.xs,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
  },
  approveButtonText: {
    color: theme.colors.white,
    fontWeight: 'bold',
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.error,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
  },
  rejectButtonText: {
    color: theme.colors.white,
    fontWeight: 'bold',
  },
});
