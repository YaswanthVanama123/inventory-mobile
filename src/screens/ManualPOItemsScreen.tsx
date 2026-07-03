import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  TextInput as RNTextInput,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {Button} from '../components/atoms/Button';
import {PaginatedList} from '../components/molecules/PaginatedList';
import {Pagination} from '../components/molecules/Pagination';
import {PickerModal} from '../components/molecules/PickerModal';
import {useAuth} from '../contexts/AuthContext';
import {useApiErrorHandler} from '../hooks/useApiErrorHandler';
import {useTheme} from '../contexts/ThemeContext';
import {Theme} from '../theme';
import {useBreakpoint, BreakpointInfo} from '../utils/breakpoints';
import manualPOItemService, {ManualPOItem, RouteStarPickerItem} from '../services/manualPOItemService';
import vendorService, {Vendor} from '../services/vendorService';
import useDebounce from '../hooks/useDebounce';
import {useServerPagination} from '../hooks/useServerPagination';
import {
  AlertCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClipboardIcon,
  PlusIcon,
  EditIcon,
  XCircleIcon,
  CheckCircleIcon,
} from '../components/icons';

interface ManualPOItemsScreenProps {
  visible: boolean;
  onClose: () => void;
}

export const ManualPOItemsScreen: React.FC<ManualPOItemsScreenProps> = ({
  visible,
  onClose,
}) => {
  const theme = useTheme();
  const bp = useBreakpoint();
  const styles = useMemo(() => makeStyles(theme, bp), [theme, bp]);
  const {token} = useAuth();
  const {handleApiError} = useApiErrorHandler();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Form modal state — handles both create and edit. Mirrors the webapp
  // ManualPOItems.jsx behavior: SKU is optional on create (auto-generated
  // server-side if blank) and editable on update with cascade rename.
  const [formVisible, setFormVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<ManualPOItem | null>(null);
  const [formSku, setFormSku] = useState('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formVendorId, setFormVendorId] = useState('');
  const [formVendorName, setFormVendorName] = useState('');
  // Mapped inventory item (canonical / RouteStar item). Persisting this on
  // edit is CRITICAL — omitting it silently drops the mapping server-side.
  const [formMappedItemId, setFormMappedItemId] = useState('');
  const [formMappedItemName, setFormMappedItemName] = useState('');
  const [formItemType, setFormItemType] = useState('');
  const [routeStarItems, setRouteStarItems] = useState<RouteStarPickerItem[]>([]);
  const [mappedItemPickerVisible, setMappedItemPickerVisible] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorPickerVisible, setVendorPickerVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load active vendors and the mapped-item picker source.
  useEffect(() => {
    if (visible && token) {
      vendorService
        .getActiveVendors(token)
        .then(setVendors)
        .catch(() => setVendors([]));
      manualPOItemService
        .getRouteStarItems(token)
        .then(setRouteStarItems)
        .catch(() => setRouteStarItems([]));
    }
  }, [visible, token]);

  // Server-side pagination: 20 items per page, more load on scroll.
  const {
    items,
    loading,
    refreshing,
    error,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    refresh,
    refetch,
  } = useServerPagination<ManualPOItem>(
    async (pg, limit) => {
      try {
        const res = await manualPOItemService.getManualPOItems(token!, {search: debouncedSearch, page: pg, limit});
        return {items: res.items, total: res.total, pages: res.pages};
      } catch (e) {
        await handleApiError(e);
        throw e;
      }
    },
    {pageSize: 20, resetKey: debouncedSearch, enabled: !!(visible && token)},
  );
  const loadData = refetch;
  const onRefresh = refresh;

  const handleItemPress = (sku: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(sku)) {
      newExpanded.delete(sku);
    } else {
      newExpanded.add(sku);
    }
    setExpandedItems(newExpanded);
  };

  const resetForm = () => {
    setFormSku('');
    setFormName('');
    setFormDescription('');
    setFormIsActive(true);
    setFormVendorId('');
    setFormVendorName('');
    setFormMappedItemId('');
    setFormMappedItemName('');
    setFormItemType('');
    setEditingItem(null);
  };

  const handleAddNew = () => {
    resetForm();
    setFormVisible(true);
  };

  const handleEdit = (item: ManualPOItem) => {
    setEditingItem(item);
    setFormSku(item.sku || '');
    setFormName(item.name || '');
    setFormDescription(item.description || '');
    setFormIsActive(item.isActive);
    // vendorId may be a populated object or a raw id.
    setFormVendorId(item.vendorId?._id || item.vendorId || '');
    setFormVendorName(item.vendorName || item.vendorId?.name || '');
    // Preserve the existing mapping so it isn't dropped on save.
    setFormMappedItemId(item.mappedCategoryItemId || '');
    setFormMappedItemName(item.mappedCategoryItemName || '');
    setFormItemType(item.itemType || (item.mappedCategoryItemId ? 'canonical' : ''));
    setFormVisible(true);
  };

  const handleVendorChange = (vendorId: string) => {
    const vendor = vendors.find(v => v._id === vendorId);
    setFormVendorId(vendorId);
    setFormVendorName(vendor ? vendor.name : '');
  };

  const handleMappedItemChange = (itemId: string) => {
    const item = routeStarItems.find(i => i._id === itemId);
    setFormMappedItemId(itemId);
    setFormMappedItemName(item ? item.itemName : '');
    setFormItemType(item ? item.type || '' : '');
  };

  const handleCloseForm = () => {
    if (submitting) return;
    setFormVisible(false);
    resetForm();
  };

  const handleSubmitForm = async () => {
    if (!token) return;
    if (!formName.trim()) {
      Alert.alert('Validation', 'Item name is required');
      return;
    }
    const trimmedSku = formSku.trim().toUpperCase();
    const payload: Partial<ManualPOItem> = {
      name: formName.trim(),
      description: formDescription.trim() || undefined,
      isActive: formIsActive,
      // Vendor is informational/tracking only (mirrors the webapp form).
      vendorId: formVendorId || null,
      vendorName: formVendorName || null,
      // CRITICAL: always send the mapping so editing doesn't drop it.
      mappedCategoryItemId: formMappedItemId || null,
      mappedCategoryItemName: formMappedItemName || null,
      itemType: formItemType || undefined,
    } as Partial<ManualPOItem>;
    // Only forward SKU when the user supplied something — blank means
    // "auto-generate" on create, "leave unchanged" on edit.
    if (trimmedSku) {
      (payload as any).sku = trimmedSku;
    }
    try {
      setSubmitting(true);
      if (editingItem) {
        await manualPOItemService.updateManualPOItem(token, editingItem.sku, payload);
      } else {
        await manualPOItemService.createManualPOItem(token, payload);
      }
      setFormVisible(false);
      resetForm();
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = (item: ManualPOItem) => {
    const newStatus = !item.isActive;
    const action = newStatus ? 'activate' : 'deactivate';
    Alert.alert(
      newStatus ? 'Activate Item' : 'Deactivate Item',
      newStatus
        ? `Are you sure you want to activate "${item.name}"?`
        : `Are you sure you want to deactivate "${item.name}"?\n\nInactive items cannot be added to new orders, but existing orders remain unchanged.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: newStatus ? 'Activate' : 'Deactivate',
          style: newStatus ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await manualPOItemService.updateManualPOItem(token!, item.sku, {isActive: newStatus});
              Alert.alert('Success', `Item ${action}d successfully`);
              loadData();
            } catch (error: any) {
              Alert.alert('Error', error.message || `Failed to ${action} item`);
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
            Manual PO Items
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
              Loading items...
            </Typography>
          </View>
        ) : (
          <PaginatedList
            data={items}
            keyExtractor={(item, index) => item.sku || String(index)}
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, styles.contentWrap]}
            refreshing={refreshing}
            onRefresh={onRefresh}
            resetKey={searchQuery}
            pagedMode
            scrollTopKey={page}
            ListFooterComponent={
              total > 0 ? (
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={total}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              ) : null
            }
            ItemSeparatorComponent={() => <View style={{height: 12}} />}
            ListHeaderComponent={
              <View>
                {/* Add New Button */}
                <View style={styles.addButtonContainer}>
                  <Button
                    title="Add New Item"
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
                    placeholder="Search by SKU or name..."
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
              </View>
            }
            ListEmptyComponent={
              error ? null : (
                <Card variant="outlined" padding="lg" style={styles.emptyCard}>
                  <ClipboardIcon size={48} color={theme.colors.gray[400]} />
                  <Typography
                    variant="h3"
                    weight="semibold"
                    color={theme.colors.gray[700]}
                    style={styles.emptyTitle}>
                    No items found
                  </Typography>
                  <Typography
                    variant="body"
                    color={theme.colors.gray[500]}
                    align="center">
                    {searchQuery
                      ? 'Try adjusting your search'
                      : 'Add your first manual PO item to get started'}
                  </Typography>
                </Card>
              )
            }
            renderItem={({item}) => {
              const isExpanded = expandedItems.has(item.sku);
              return (
                <Card
                  variant="elevated"
                  padding="none"
                  style={styles.itemCard}>
                  <TouchableOpacity
                    onPress={() => handleItemPress(item.sku)}
                    style={styles.itemHeader}>
                    <View style={styles.itemHeaderLeft}>
                      <View style={styles.chevronContainer}>
                        {isExpanded ? (
                          <ChevronDownIcon size={20} color={theme.colors.gray[600]} />
                        ) : (
                          <ChevronRightIcon size={20} color={theme.colors.gray[600]} />
                        )}
                      </View>
                      <View style={styles.iconContainer}>
                        <ClipboardIcon size={20} color={theme.colors.primary[600]} />
                      </View>
                      <View style={styles.itemInfo}>
                        <Typography variant="body" weight="bold" numberOfLines={1}>
                          {item.sku}
                        </Typography>
                        <Typography variant="caption" color={theme.colors.gray[500]} numberOfLines={1}>
                          {item.name}
                        </Typography>
                      </View>
                    </View>
                    <View style={styles.itemHeaderRight}>
                      <View style={[
                        styles.statusBadge,
                        {backgroundColor: item.isActive ? theme.colors.success[100] : theme.colors.gray[100]}
                      ]}>
                        {item.isActive && (
                          <CheckCircleIcon size={14} color={theme.colors.success[600]} />
                        )}
                        <Typography
                          variant="caption"
                          weight="semibold"
                          color={item.isActive ? theme.colors.success[600] : theme.colors.gray[500]}
                          style={item.isActive ? {marginLeft: 4} : {}}>
                          {item.isActive ? 'Active' : 'Inactive'}
                        </Typography>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Item Meta */}
                  <View style={styles.itemMeta}>
                    <View style={styles.metaRow}>
                      <Typography variant="caption" color={theme.colors.gray[500]}>
                        Mapped Category
                      </Typography>
                      {item.mappedCategoryItemName ? (
                        <View style={styles.mappedBadge}>
                          <Typography variant="small" weight="medium" color={theme.colors.success[700]}>
                            {item.mappedCategoryItemName}
                          </Typography>
                        </View>
                      ) : (
                        <View style={styles.unmappedBadge}>
                          <Typography variant="small" weight="medium" color={theme.colors.gray[500]}>
                            Not Mapped
                          </Typography>
                        </View>
                      )}
                    </View>
                    {item.description && (
                      <View style={styles.metaRow}>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          Description
                        </Typography>
                        <Typography variant="small" style={{flex: 1, textAlign: 'right'}}>
                          {item.description}
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
                          onPress={() => handleEdit(item)}>
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
                          style={[
                            styles.actionButton,
                            item.isActive ? styles.deactivateButton : styles.activateButton,
                          ]}
                          onPress={() => handleToggleActive(item)}>
                          {item.isActive ? (
                            <XCircleIcon size={16} color={theme.colors.error[600]} />
                          ) : (
                            <CheckCircleIcon size={16} color={theme.colors.success[600]} />
                          )}
                          <Typography
                            variant="small"
                            weight="semibold"
                            color={item.isActive ? theme.colors.error[600] : theme.colors.success[600]}
                            style={{marginLeft: 8}}>
                            {item.isActive ? 'Deactivate' : 'Activate'}
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

      {/* Create / Edit form */}
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
                color={submitting ? theme.colors.gray[400] : theme.colors.primary[600]}
                weight="semibold">
                Cancel
              </Typography>
            </TouchableOpacity>
            <Typography variant="h3" weight="bold" style={styles.modalTitle}>
              {editingItem ? 'Edit Item' : 'Add New Item'}
            </Typography>
            <View style={styles.refreshButton} />
          </View>

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            <View style={styles.contentWrap}>
            <View style={styles.formField}>
              <Typography variant="small" weight="semibold" color={theme.colors.gray[700]} style={styles.formLabel}>
                SKU
              </Typography>
              <RNTextInput
                style={[styles.searchInput, styles.formInput]}
                value={formSku}
                onChangeText={setFormSku}
                autoCapitalize="characters"
                autoCorrect={false}
                placeholder={editingItem ? '' : 'Leave blank to auto-generate'}
                placeholderTextColor={theme.colors.gray[400]}
              />
              <Typography variant="caption" color={theme.colors.gray[500]} style={styles.formHint}>
                {editingItem
                  ? 'Editing the SKU will rename it on every linked manual order. Must be unique.'
                  : 'Optional. Leave blank to auto-generate. Must be unique if you set one.'}
              </Typography>
            </View>

            <View style={styles.formField}>
              <Typography variant="small" weight="semibold" color={theme.colors.gray[700]} style={styles.formLabel}>
                Item Name *
              </Typography>
              <RNTextInput
                style={[styles.searchInput, styles.formInput]}
                value={formName}
                onChangeText={setFormName}
                placeholder="Enter item name"
                placeholderTextColor={theme.colors.gray[400]}
              />
            </View>

            <View style={styles.formField}>
              <Typography variant="small" weight="semibold" color={theme.colors.gray[700]} style={styles.formLabel}>
                Description
              </Typography>
              <RNTextInput
                style={[styles.searchInput, styles.formInput, styles.formTextArea]}
                value={formDescription}
                onChangeText={setFormDescription}
                placeholder="Optional description"
                placeholderTextColor={theme.colors.gray[400]}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formField}>
              <Typography variant="small" weight="semibold" color={theme.colors.gray[700]} style={styles.formLabel}>
                Map to Inventory Item
              </Typography>
              <TouchableOpacity
                style={[styles.searchInput, styles.vendorSelect]}
                onPress={() => setMappedItemPickerVisible(true)}
                activeOpacity={0.7}>
                <Typography
                  variant="body"
                  color={formMappedItemName ? theme.colors.gray[900] : theme.colors.gray[400]}
                  numberOfLines={1}
                  style={{flex: 1}}>
                  {formMappedItemName || 'Select canonical or RouteStar item...'}
                </Typography>
                <ChevronDownIcon size={18} color={theme.colors.gray[500]} />
              </TouchableOpacity>
              {formMappedItemName ? (
                <TouchableOpacity onPress={() => handleMappedItemChange('')} activeOpacity={0.7}>
                  <Typography variant="caption" color={theme.colors.primary[600]} style={styles.formHint}>
                    Clear mapping
                  </Typography>
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.formField}>
              <Typography variant="small" weight="semibold" color={theme.colors.gray[700]} style={styles.formLabel}>
                Vendor
              </Typography>
              <TouchableOpacity
                style={[styles.searchInput, styles.vendorSelect]}
                onPress={() => setVendorPickerVisible(true)}
                activeOpacity={0.7}>
                <Typography
                  variant="body"
                  color={formVendorName ? theme.colors.gray[900] : theme.colors.gray[400]}>
                  {formVendorName || 'Select vendor (optional)'}
                </Typography>
                <ChevronDownIcon size={18} color={theme.colors.gray[500]} />
              </TouchableOpacity>
              {formVendorName ? (
                <TouchableOpacity onPress={() => handleVendorChange('')} activeOpacity={0.7}>
                  <Typography variant="caption" color={theme.colors.primary[600]} style={styles.formHint}>
                    Clear vendor
                  </Typography>
                </TouchableOpacity>
              ) : null}
            </View>

            <TouchableOpacity
              style={styles.formToggleRow}
              onPress={() => setFormIsActive(prev => !prev)}
              disabled={submitting}
              activeOpacity={0.7}>
              <View style={styles.formToggleLabel}>
                <Typography variant="body" weight="semibold">
                  Active
                </Typography>
                <Typography variant="caption" color={theme.colors.gray[500]}>
                  Inactive items can't be added to new orders
                </Typography>
              </View>
              <View
                style={[
                  styles.formToggle,
                  {
                    backgroundColor: formIsActive
                      ? theme.colors.success[500]
                      : theme.colors.gray[300],
                  },
                ]}>
                <View
                  style={[
                    styles.formToggleKnob,
                    {alignSelf: formIsActive ? 'flex-end' : 'flex-start'},
                  ]}
                />
              </View>
            </TouchableOpacity>

            <View style={styles.formActions}>
              <Button
                title={editingItem ? 'Save Changes' : 'Create Item'}
                variant="primary"
                onPress={handleSubmitForm}
                disabled={submitting}
                fullWidth
              />
            </View>
            </View>{/* contentWrap */}
          </ScrollView>

          <PickerModal
            visible={vendorPickerVisible}
            onClose={() => setVendorPickerVisible(false)}
            items={vendors}
            selectedValue={formVendorId}
            onValueChange={handleVendorChange}
            placeholder="Select vendor"
            getLabel={(v: Vendor) => v.name}
            getValue={(v: Vendor) => v._id}
          />

          <PickerModal
            visible={mappedItemPickerVisible}
            onClose={() => setMappedItemPickerVisible(false)}
            items={routeStarItems}
            selectedValue={formMappedItemId}
            onValueChange={handleMappedItemChange}
            placeholder="Map to Inventory Item"
            getLabel={(i: RouteStarPickerItem) =>
              i.mergedCount && i.mergedCount > 1
                ? `${i.itemName} (${i.mergedCount} merged)`
                : i.itemName
            }
            getValue={(i: RouteStarPickerItem) => i._id}
          />
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
  contentWrap: {
    width: '100%',
    maxWidth: bp.contentMaxWidth,
    alignSelf: 'center',
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
  itemsList: {
    gap: theme.spacing.md,
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
  itemInfo: {
    flex: 1,
  },
  itemHeaderRight: {
    marginLeft: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
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
  mappedBadge: {
    backgroundColor: theme.colors.success[50],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unmappedBadge: {
    backgroundColor: theme.colors.gray[100],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
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
  deactivateButton: {
    backgroundColor: theme.colors.error[50],
    borderColor: theme.colors.error[200],
  },
  activateButton: {
    backgroundColor: theme.colors.success[50],
    borderColor: theme.colors.success[200],
  },
  formField: {
    marginBottom: theme.spacing.md,
  },
  formLabel: {
    marginBottom: 6,
  },
  formInput: {
    fontSize: theme.typography.roles.body.fontSize,
  },
  vendorSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  formHint: {
    marginTop: 4,
  },
  formTextArea: {
    minHeight: 84,
    paddingTop: 12,
  },
  formToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
    marginBottom: theme.spacing.lg,
  },
  formToggleLabel: {
    flex: 1,
    paddingRight: 12,
  },
  formToggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    padding: 2,
    justifyContent: 'center',
  },
  formToggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
  },
  formActions: {
    marginTop: theme.spacing.md,
  },
});
