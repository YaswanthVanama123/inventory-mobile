import React, {useState, useEffect} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {useAuth} from '../contexts/AuthContext';
import {theme} from '../theme';
import discrepancyService from '../services/discrepancyService';
import {
  AlertCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '../components/icons';

interface DiscrepancyManagementScreenProps {
  visible: boolean;
  onClose: () => void;
}

export const DiscrepancyManagementScreen: React.FC<DiscrepancyManagementScreenProps> = ({
  visible,
  onClose,
}) => {
  const {user} = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [discrepancies, setDiscrepancies] = useState<any[]>([]);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);
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
      ]
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
      ]
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
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return {bg: theme.colors.warning[100], text: theme.colors.warning[700]};
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
        return <ClockIcon size={16} color={theme.colors.warning[600]} />;
      case 'Approved':
        return <CheckCircleIcon size={16} color={theme.colors.success[600]} />;
      case 'Rejected':
        return <AlertCircleIcon size={16} color={theme.colors.error[600]} />;
      default:
        return <ClockIcon size={16} color={theme.colors.gray[600]} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Overage':
        return {bg: theme.colors.primary[100], text: theme.colors.primary[700]};
      case 'Shortage':
        return {bg: theme.colors.error[100], text: theme.colors.error[700]};
      case 'Damage':
        return {bg: theme.colors.warning[100], text: theme.colors.warning[700]};
      case 'Missing':
        return {bg: '#9333ea20', text: '#9333ea'};
      default:
        return {bg: theme.colors.gray[100], text: theme.colors.gray[700]};
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  if (loading) {
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
              Discrepancy Management
            </Typography>
            <Typography variant="body" color={theme.colors.gray[500]} style={{marginTop: 4}}>
              Review and manage stock discrepancies
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
              <View style={[styles.summaryCard, {backgroundColor: theme.colors.warning[100]}]}>
                <ClockIcon size={24} color={theme.colors.warning[600]} />
                <Typography variant="h2" weight="bold" style={{marginTop: 8}}>
                  {summary.pending || 0}
                </Typography>
                <Typography variant="small" color={theme.colors.gray[600]}>
                  Pending
                </Typography>
              </View>
              <View style={[styles.summaryCard, {backgroundColor: theme.colors.success[100]}]}>
                <CheckCircleIcon size={24} color={theme.colors.success[600]} />
                <Typography variant="h2" weight="bold" style={{marginTop: 8}}>
                  {summary.approved || 0}
                </Typography>
                <Typography variant="small" color={theme.colors.gray[600]}>
                  Approved
                </Typography>
              </View>
              <View style={[styles.summaryCard, {backgroundColor: theme.colors.error[100]}]}>
                <AlertCircleIcon size={24} color={theme.colors.error[600]} />
                <Typography variant="h2" weight="bold" style={{marginTop: 8}}>
                  {summary.rejected || 0}
                </Typography>
                <Typography variant="small" color={theme.colors.gray[600]}>
                  Rejected
                </Typography>
              </View>
            </View>
          </View>
        )}

        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContent}>
            <TouchableOpacity
              style={[styles.filterButton, !filters.status && styles.filterButtonActive]}
              onPress={() => setFilters({...filters, status: ''})}>
              <Typography
                variant="small"
                weight="semibold"
                color={!filters.status ? theme.colors.white : theme.colors.gray[700]}>
                All Status
              </Typography>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                filters.status === 'Pending' && styles.filterButtonActive,
              ]}
              onPress={() => setFilters({...filters, status: 'Pending'})}>
              <Typography
                variant="small"
                weight="semibold"
                color={filters.status === 'Pending' ? theme.colors.white : theme.colors.gray[700]}>
                Pending
              </Typography>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                filters.status === 'Approved' && styles.filterButtonActive,
              ]}
              onPress={() => setFilters({...filters, status: 'Approved'})}>
              <Typography
                variant="small"
                weight="semibold"
                color={filters.status === 'Approved' ? theme.colors.white : theme.colors.gray[700]}>
                Approved
              </Typography>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                filters.status === 'Rejected' && styles.filterButtonActive,
              ]}
              onPress={() => setFilters({...filters, status: 'Rejected'})}>
              <Typography
                variant="small"
                weight="semibold"
                color={filters.status === 'Rejected' ? theme.colors.white : theme.colors.gray[700]}>
                Rejected
              </Typography>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Discrepancies List */}
        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {discrepancies.length === 0 ? (
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
                There are no discrepancies matching your filters
              </Typography>
            </Card>
          ) : (
            discrepancies.map((discrepancy) => {
              const isExpanded = expandedRow === discrepancy._id;
              const statusColors = getStatusColor(discrepancy.status);
              const typeColors = getTypeColor(discrepancy.discrepancyType);

              return (
                <Card key={discrepancy._id} variant="elevated" padding="none" style={styles.discrepancyCard}>
                  <TouchableOpacity
                    style={styles.discrepancyHeader}
                    onPress={() => setExpandedRow(isExpanded ? null : discrepancy._id)}>
                    <View style={styles.discrepancyHeaderLeft}>
                      {isExpanded ? (
                        <ChevronDownIcon size={20} color={theme.colors.gray[600]} />
                      ) : (
                        <ChevronRightIcon size={20} color={theme.colors.gray[600]} />
                      )}
                      <View style={{marginLeft: 12, flex: 1}}>
                        <Typography variant="body" weight="semibold" numberOfLines={1}>
                          {discrepancy.itemName}
                        </Typography>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          SKU: {discrepancy.itemSku || 'N/A'} • {formatDate(discrepancy.reportedAt)}
                        </Typography>
                      </View>
                    </View>
                    <View style={styles.badgeContainer}>
                      <View style={[styles.badge, {backgroundColor: typeColors.bg}]}>
                        <Typography variant="caption" weight="semibold" color={typeColors.text}>
                          {discrepancy.discrepancyType}
                        </Typography>
                      </View>
                      <View style={[styles.badge, {backgroundColor: statusColors.bg}]}>
                        <Typography variant="caption" weight="semibold" color={statusColors.text}>
                          {discrepancy.status}
                        </Typography>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.discrepancyDetails}>
                      <View style={styles.detailRow}>
                        <Typography variant="small" color={theme.colors.gray[600]}>
                          Invoice:
                        </Typography>
                        <Typography variant="small" weight="semibold">
                          {discrepancy.invoiceNumber || 'N/A'}
                        </Typography>
                      </View>
                      <View style={styles.detailRow}>
                        <Typography variant="small" color={theme.colors.gray[600]}>
                          Category:
                        </Typography>
                        <Typography variant="small" weight="semibold">
                          {discrepancy.categoryName || 'N/A'}
                        </Typography>
                      </View>
                      <View style={styles.detailRow}>
                        <Typography variant="small" color={theme.colors.gray[600]}>
                          System Quantity:
                        </Typography>
                        <Typography variant="small" weight="semibold">
                          {discrepancy.systemQuantity}
                        </Typography>
                      </View>
                      <View style={styles.detailRow}>
                        <Typography variant="small" color={theme.colors.gray[600]}>
                          Actual Quantity:
                        </Typography>
                        <Typography variant="small" weight="semibold">
                          {discrepancy.actualQuantity}
                        </Typography>
                      </View>
                      <View style={styles.detailRow}>
                        <Typography variant="small" color={theme.colors.gray[600]}>
                          Difference:
                        </Typography>
                        <Typography
                          variant="small"
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
                      {discrepancy.reason && (
                        <View style={styles.detailRow}>
                          <Typography variant="small" color={theme.colors.gray[600]}>
                            Reason:
                          </Typography>
                          <Typography variant="small" style={{flex: 1, textAlign: 'right'}}>
                            {discrepancy.reason}
                          </Typography>
                        </View>
                      )}
                      {discrepancy.notes && (
                        <View style={styles.detailRow}>
                          <Typography variant="small" color={theme.colors.gray[600]}>
                            Notes:
                          </Typography>
                          <Typography variant="small" style={{flex: 1, textAlign: 'right'}}>
                            {discrepancy.notes}
                          </Typography>
                        </View>
                      )}
                      {discrepancy.reportedBy && (
                        <View style={styles.detailRow}>
                          <Typography variant="small" color={theme.colors.gray[600]}>
                            Reported By:
                          </Typography>
                          <Typography variant="small" weight="semibold">
                            {discrepancy.reportedBy.fullName || discrepancy.reportedBy.username}
                          </Typography>
                        </View>
                      )}

                      {/* Action Buttons */}
                      {user?.role === 'admin' && discrepancy.status === 'Pending' && (
                        <View style={styles.actionButtons}>
                          <TouchableOpacity
                            style={[styles.actionButton, styles.approveButton]}
                            onPress={() => handleApprove(discrepancy._id)}>
                            <CheckCircleIcon size={16} color={theme.colors.white} />
                            <Typography
                              variant="small"
                              weight="semibold"
                              color={theme.colors.white}
                              style={{marginLeft: 8}}>
                              Approve
                            </Typography>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionButton, styles.rejectButton]}
                            onPress={() => handleReject(discrepancy._id)}>
                            <AlertCircleIcon size={16} color={theme.colors.white} />
                            <Typography
                              variant="small"
                              weight="semibold"
                              color={theme.colors.white}
                              style={{marginLeft: 8}}>
                              Reject
                            </Typography>
                          </TouchableOpacity>
                        </View>
                      )}

                      {/* Delete Button (Admin only) */}
                      {user?.role === 'admin' && (
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDelete(discrepancy._id)}>
                          <Typography variant="small" color={theme.colors.error[600]}>
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

const styles = StyleSheet.create({
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
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.white,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 100,
    justifyContent: 'center',
  },
  filterContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  filterContent: {
    gap: 8,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.gray[200],
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary[600],
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl * 2,
  },
  discrepancyCard: {
    marginBottom: theme.spacing.md,
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
  badgeContainer: {
    gap: 4,
    alignItems: 'flex-end',
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  discrepancyDetails: {
    padding: theme.spacing.md,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: theme.spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  approveButton: {
    backgroundColor: theme.colors.success[600],
  },
  rejectButton: {
    backgroundColor: theme.colors.error[600],
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: theme.spacing.sm,
  },
});
