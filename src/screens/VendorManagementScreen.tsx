import React, {useState, useEffect, useMemo} from 'react';
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
  Switch,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {Button} from '../components/atoms/Button';
import {PaginatedList} from '../components/molecules/PaginatedList';
import {useAuth} from '../contexts/AuthContext';
import {useApiErrorHandler} from '../hooks/useApiErrorHandler';
import {useTheme} from '../contexts/ThemeContext';
import {Theme} from '../theme';
import {useBreakpoint, BreakpointInfo} from '../utils/breakpoints';
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
  const theme = useTheme();
  const bp = useBreakpoint();
  const styles = useMemo(() => makeStyles(theme, bp), [theme, bp]);
  const {token} = useAuth();
  const {handleApiError} = useApiErrorHandler();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedVendors, setExpandedVendors] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Add / edit vendor form
  const [formVisible, setFormVisible] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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

  const resetForm = () => {
    setEditingVendor(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormAddress('');
    setFormNotes('');
    setFormIsActive(true);
  };

  const handleAddNew = () => {
    resetForm();
    setFormVisible(true);
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormName(vendor.name || '');
    setFormEmail(vendor.email || '');
    setFormPhone(vendor.phone || '');
    setFormAddress(vendor.address || '');
    setFormNotes(vendor.notes || '');
    setFormIsActive(vendor.isActive !== false);
    setFormVisible(true);
  };

  const handleCloseForm = () => {
    if (submitting) return;
    setFormVisible(false);
    resetForm();
  };

  const handleSubmitForm = async () => {
    if (!token) return;
    if (!formName.trim()) {
      Alert.alert('Validation', 'Vendor name is required');
      return;
    }
    const payload: Partial<Vendor> = {
      name: formName.trim(),
      email: formEmail.trim() || undefined,
      phone: formPhone.trim() || undefined,
      address: formAddress.trim() || undefined,
      notes: formNotes.trim() || undefined,
      isActive: formIsActive,
    };
    try {
      setSubmitting(true);
      if (editingVendor) {
        await vendorService.updateVendor(token, editingVendor._id, payload);
      } else {
        await vendorService.createVendor(token, payload);
      }
      setFormVisible(false);
      resetForm();
      await loadData();
      Alert.alert('Success', `Vendor ${editingVendor ? 'updated' : 'created'} successfully`);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to save vendor');
    } finally {
      setSubmitting(false);
    }
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
          <PaginatedList
            data={vendors}
            keyExtractor={(item, index) => item._id || String(index)}
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, styles.contentWrap]}
            refreshing={refreshing}
            onRefresh={onRefresh}
            resetKey={searchQuery}
            ItemSeparatorComponent={() => <View style={{height: 12}} />}
            ListHeaderComponent={
              <View>
                <View style={styles.addButtonContainer}>
                  <Button
                    title="Add New Vendor"
                    variant="primary"
                    onPress={handleAddNew}
                    leftIcon={<PlusIcon size={16} color={theme.colors.white} />}
                    fullWidth
                  />
                </View>
                <View style={styles.searchContainer}>
                  <RNTextInput
                    style={styles.searchInput}
                    placeholder="Search by name or email"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor={theme.colors.gray[400]}
                  />
                </View>
                {error && (
                  <Card variant="outlined" padding="lg" style={styles.errorCard}>
                    <View style={styles.errorContent}>
                      <AlertCircleIcon size={24} color={theme.colors.error[500]} />
                      <Typography variant="body" color={theme.colors.error[700]} style={styles.errorText}>
                        {error}
                      </Typography>
                    </View>
                  </Card>
                )}
              </View>
            }
            ListEmptyComponent={
              error ? null : (
                <Card variant="outlined" padding="lg" style={styles.emptyCard}>
                  <TruckIcon size={48} color={theme.colors.gray[400]} />
                  <Typography
                    variant="h3"
                    weight="semibold"
                    color={theme.colors.gray[700]}
                    style={styles.emptyTitle}>
                    No vendors found
                  </Typography>
                  <Typography variant="body" color={theme.colors.gray[500]} align="center">
                    {searchQuery ? 'Try adjusting your search' : 'Add your first vendor to get started'}
                  </Typography>
                </Card>
              )
            }
            renderItem={({item: vendor}) => {
              const isExpanded = expandedVendors.has(vendor._id);
              return (
                <Card variant="elevated" padding="none" style={styles.vendorCard}>
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
                      <View
                        style={[
                          styles.statusBadge,
                          {backgroundColor: vendor.isActive ? theme.colors.success[100] : theme.colors.gray[100]},
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
            }}
          />
        )}
      </SafeAreaView>

      {/* Add / Edit Vendor form */}
      <Modal
        visible={formVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseForm}>
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleCloseForm} style={styles.closeButton} disabled={submitting}>
              <Typography
                variant="body"
                weight="semibold"
                color={submitting ? theme.colors.gray[400] : theme.colors.primary[600]}>
                Cancel
              </Typography>
            </TouchableOpacity>
            <Typography variant="h3" weight="bold" style={styles.modalTitle}>
              {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
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
                <Typography variant="small" weight="semibold" color={theme.colors.gray[700]} style={styles.formLabel}>
                  Name *
                </Typography>
                <RNTextInput
                  style={styles.formInput}
                  placeholder="Vendor name"
                  value={formName}
                  onChangeText={setFormName}
                  placeholderTextColor={theme.colors.gray[400]}
                />
              </View>

              <View style={styles.formField}>
                <Typography variant="small" weight="semibold" color={theme.colors.gray[700]} style={styles.formLabel}>
                  Email
                </Typography>
                <RNTextInput
                  style={styles.formInput}
                  placeholder="vendor@example.com"
                  value={formEmail}
                  onChangeText={setFormEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholderTextColor={theme.colors.gray[400]}
                />
              </View>

              <View style={styles.formField}>
                <Typography variant="small" weight="semibold" color={theme.colors.gray[700]} style={styles.formLabel}>
                  Phone
                </Typography>
                <RNTextInput
                  style={styles.formInput}
                  placeholder="Phone number"
                  value={formPhone}
                  onChangeText={setFormPhone}
                  keyboardType="phone-pad"
                  placeholderTextColor={theme.colors.gray[400]}
                />
              </View>

              <View style={styles.formField}>
                <Typography variant="small" weight="semibold" color={theme.colors.gray[700]} style={styles.formLabel}>
                  Address
                </Typography>
                <RNTextInput
                  style={styles.formInput}
                  placeholder="Address"
                  value={formAddress}
                  onChangeText={setFormAddress}
                  placeholderTextColor={theme.colors.gray[400]}
                />
              </View>

              <View style={styles.formField}>
                <Typography variant="small" weight="semibold" color={theme.colors.gray[700]} style={styles.formLabel}>
                  Notes
                </Typography>
                <RNTextInput
                  style={[styles.formInput, styles.formTextArea]}
                  placeholder="Notes (optional)"
                  value={formNotes}
                  onChangeText={setFormNotes}
                  multiline
                  placeholderTextColor={theme.colors.gray[400]}
                />
              </View>

              <View style={styles.formToggleRow}>
                <View style={{flex: 1}}>
                  <Typography variant="body" weight="semibold">
                    Active
                  </Typography>
                  <Typography variant="caption" color={theme.colors.gray[500]}>
                    Inactive vendors are hidden from order forms
                  </Typography>
                </View>
                <Switch
                  value={formIsActive}
                  onValueChange={setFormIsActive}
                  trackColor={{false: theme.colors.gray[300], true: theme.colors.primary[600]}}
                  thumbColor={theme.colors.white}
                />
              </View>

              <Button
                title={submitting ? 'Saving...' : editingVendor ? 'Save Changes' : 'Create Vendor'}
                variant="primary"
                onPress={handleSubmitForm}
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

const makeStyles = (theme: Theme, bp: BreakpointInfo) => StyleSheet.create({
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
