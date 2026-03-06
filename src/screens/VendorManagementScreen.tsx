import React, {useState, useEffect} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  TextInput as RNTextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {Button} from '../components/atoms/Button';
import {useAuth} from '../contexts/AuthContext';
import {useApiErrorHandler} from '../hooks/useApiErrorHandler';
import {theme} from '../theme';
import vendorService, {Vendor} from '../services/vendorService';
import {
  AlertCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  TruckIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  CheckCircleIcon,
} from '../components/icons';

interface VendorManagementScreenProps {
  visible: boolean;
  onClose: () => void;
}

export const VendorManagementScreen: React.FC<VendorManagementScreenProps> = ({
  visible,
  onClose,
}) => {
  const {token} = useAuth();
  const {handleApiError} = useApiErrorHandler();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedVendors, setExpandedVendors] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && token) {
      loadData();
    }
  }, [visible, token]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (visible && token) {
        loadData();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const data = await vendorService.getVendors(token);
      console.log('[VendorManagementScreen] Data loaded:', data?.length || 0);

      // Ensure data is an array
      const vendors = Array.isArray(data) ? data : [];

      // Filter by search query if present
      let filteredData = vendors;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredData = vendors.filter(
          vendor =>
            vendor.name.toLowerCase().includes(query) ||
            (vendor.email && vendor.email.toLowerCase().includes(query)) ||
            (vendor.phone && vendor.phone.toLowerCase().includes(query))
        );
      }

      setVendors(filteredData);
    } catch (error: any) {
      console.error('Failed to fetch vendors:', error);
      const wasHandled = await handleApiError(error);
      if (wasHandled) return;
      setError(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleVendorPress = (vendorId: string) => {
    const newExpanded = new Set(expandedVendors);
    if (newExpanded.has(vendorId)) {
      newExpanded.delete(vendorId);
    } else {
      newExpanded.add(vendorId);
    }
    setExpandedVendors(newExpanded);
  };

  const handleAddNew = () => {
    Alert.alert('Add New Vendor', 'This feature will be available in the next update');
  };

  const handleEdit = (vendor: Vendor) => {
    Alert.alert('Edit Vendor', `Editing ${vendor.name} will be available in the next update`);
  };

  const handleDelete = (vendor: Vendor) => {
    Alert.alert(
      'Delete Vendor',
      `Are you sure you want to delete "${vendor.name}"?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await vendorService.deleteVendor(token!, vendor._id);
              Alert.alert('Success', 'Vendor deleted successfully');
              loadData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete vendor');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Typography variant="body" color={theme.colors.primary[600]} weight="semibold">
              Close
            </Typography>
          </TouchableOpacity>
          <Typography variant="h3" weight="bold" style={styles.modalTitle}>
            Vendors
          </Typography>
          <TouchableOpacity onPress={loadData} style={styles.refreshButton}>
            <Typography variant="small" color={theme.colors.primary[600]} weight="semibold">
              Refresh
            </Typography>
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary[600]} />
            <Typography
              variant="body"
              color={theme.colors.gray[600]}
              style={{marginTop: 16}}>
              Loading vendors...
            </Typography>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }>
            {/* Add New Button */}
            <View style={styles.addButtonContainer}>
              <Button
                title="Add New Vendor"
                variant="primary"
                onPress={handleAddNew}
                leftIcon={<PlusIcon size={16} color={theme.colors.white} />}
                fullWidth
              />
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <RNTextInput
                style={styles.searchInput}
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={theme.colors.gray[400]}
              />
            </View>

            {/* Error State */}
            {error && (
              <Card variant="outlined" padding="lg" style={styles.errorCard}>
                <View style={styles.errorContent}>
                  <AlertCircleIcon size={24} color={theme.colors.error[500]} />
                  <Typography
                    variant="body"
                    color={theme.colors.error[700]}
                    style={styles.errorText}>
                    {error}
                  </Typography>
                </View>
              </Card>
            )}

            {/* Empty State */}
            {!error && vendors.length === 0 && (
              <Card variant="outlined" padding="lg" style={styles.emptyCard}>
                <TruckIcon size={48} color={theme.colors.gray[400]} />
                <Typography
                  variant="h3"
                  weight="semibold"
                  color={theme.colors.gray[700]}
                  style={styles.emptyTitle}>
                  No vendors found
                </Typography>
                <Typography
                  variant="body"
                  color={theme.colors.gray[500]}
                  align="center">
                  {searchQuery
                    ? 'Try adjusting your search'
                    : 'Add your first vendor to get started'}
                </Typography>
              </Card>
            )}

            {/* Vendors List */}
            <View style={styles.vendorsList}>
              {vendors.map((vendor, index) => {
                const isExpanded = expandedVendors.has(vendor._id);
                return (
                  <Card
                    key={vendor._id || index}
                    variant="elevated"
                    padding="none"
                    style={styles.vendorCard}>
                    <TouchableOpacity
                      onPress={() => handleVendorPress(vendor._id)}
                      style={styles.vendorHeader}>
                      <View style={styles.vendorHeaderLeft}>
                        <View style={styles.chevronContainer}>
                          {isExpanded ? (
                            <ChevronDownIcon size={20} color={theme.colors.gray[600]} />
                          ) : (
                            <ChevronRightIcon size={20} color={theme.colors.gray[600]} />
                          )}
                        </View>
                        <View style={styles.iconContainer}>
                          <TruckIcon size={20} color={theme.colors.primary[600]} />
                        </View>
                        <View style={styles.vendorInfo}>
                          <Typography variant="body" weight="bold" numberOfLines={1}>
                            {vendor.name}
                          </Typography>
                          {vendor.email && (
                            <Typography variant="caption" color={theme.colors.gray[500]} numberOfLines={1}>
                              {vendor.email}
                            </Typography>
                          )}
                        </View>
                      </View>
                      <View style={styles.vendorHeaderRight}>
                        <View style={[
                          styles.statusBadge,
                          {backgroundColor: vendor.isActive ? theme.colors.success[100] : theme.colors.gray[100]}
                        ]}>
                          {vendor.isActive && (
                            <CheckCircleIcon size={14} color={theme.colors.success[600]} />
                          )}
                          <Typography
                            variant="caption"
                            weight="semibold"
                            color={vendor.isActive ? theme.colors.success[600] : theme.colors.gray[500]}
                            style={vendor.isActive ? {marginLeft: 4} : {}}>
                            {vendor.isActive ? 'Active' : 'Inactive'}
                          </Typography>
                        </View>
                      </View>
                    </TouchableOpacity>

                    {/* Vendor Meta */}
                    <View style={styles.vendorMeta}>
                      {vendor.phone && (
                        <View style={styles.metaRow}>
                          <Typography variant="caption" color={theme.colors.gray[500]}>
                            Phone
                          </Typography>
                          <Typography variant="small" weight="medium">
                            {vendor.phone}
                          </Typography>
                        </View>
                      )}
                      {vendor.address && (
                        <View style={styles.metaRow}>
                          <Typography variant="caption" color={theme.colors.gray[500]}>
                            Address
                          </Typography>
                          <Typography variant="small" style={{flex: 1, textAlign: 'right'}}>
                            {vendor.address}
                          </Typography>
                        </View>
                      )}
                      {vendor.notes && (
                        <View style={styles.metaRow}>
                          <Typography variant="caption" color={theme.colors.gray[500]}>
                            Notes
                          </Typography>
                          <Typography variant="small" style={{flex: 1, textAlign: 'right'}}>
                            {vendor.notes}
                          </Typography>
                        </View>
                      )}
                    </View>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <View style={styles.expandedContent}>
                        <View style={styles.actionButtons}>
                          <TouchableOpacity
                            style={[styles.actionButton, styles.editButton]}
                            onPress={() => handleEdit(vendor)}>
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
                            onPress={() => handleDelete(vendor)}>
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
              })}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
    padding: theme.spacing.lg,
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
    fontSize: 16,
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
  vendorsList: {
    gap: theme.spacing.md,
  },
  vendorCard: {
    marginBottom: 0,
    overflow: 'hidden',
  },
  vendorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
  },
  vendorHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  chevronContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: theme.colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendorInfo: {
    flex: 1,
  },
  vendorHeaderRight: {
    marginLeft: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  vendorMeta: {
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
});
