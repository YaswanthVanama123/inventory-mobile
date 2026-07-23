import React, {useState, useMemo, useCallback} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  TextInput as RNTextInput,
  Image,
  Alert,
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
import inventoryService from '../services/inventoryService';
import useDebounce from '../hooks/useDebounce';
import {useServerPagination} from '../hooks/useServerPagination';
import {
  AlertCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  InventoryIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  TagIcon,
  ClockIcon,
} from '../components/icons';

interface InventoryCatalogScreenProps {
  visible: boolean;
  onClose: () => void;
}

// Units of measurement — identical set/order to the web InventoryForm.
const UNIT_OPTIONS: {label: string; value: string}[] = [
  {label: 'Pieces', value: 'pieces'},
  {label: 'Kilograms (kg)', value: 'kg'},
  {label: 'Grams (g)', value: 'g'},
  {label: 'Pounds (lbs)', value: 'lbs'},
  {label: 'Ounces (oz)', value: 'oz'},
  {label: 'Liters (L)', value: 'liters'},
  {label: 'Milliliters (ml)', value: 'ml'},
  {label: 'Gallons', value: 'gallons'},
  {label: 'Meters (m)', value: 'meters'},
  {label: 'Centimeters (cm)', value: 'cm'},
  {label: 'Feet (ft)', value: 'feet'},
  {label: 'Inches (in)', value: 'inches'},
  {label: 'Boxes', value: 'boxes'},
  {label: 'Packs', value: 'packs'},
  {label: 'Cartons', value: 'cartons'},
  {label: 'Dozens', value: 'dozens'},
  {label: 'Sets', value: 'sets'},
  {label: 'Pairs', value: 'pairs'},
];

const generateSku = (seed: number) => {
  // Mirror the web SKU-YYYYMMDD-HHMMSS-mmm format. `seed` varies the value.
  const now = new Date(seed);
  const p = (n: number, l = 2) => String(n).padStart(l, '0');
  return `SKU-${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(
    now.getHours(),
  )}${p(now.getMinutes())}${p(now.getSeconds())}-${p(now.getMilliseconds(), 3)}`;
};

export const InventoryCatalogScreen: React.FC<InventoryCatalogScreenProps> = ({
  visible,
  onClose,
}) => {
  const theme = useTheme();
  const bp = useBreakpoint();
  const styles = useMemo(() => makeStyles(theme, bp), [theme, bp]);
  const {token, user} = useAuth();
  const isAdmin = user?.role === 'admin';
  const {handleApiError} = useApiErrorHandler();

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [statusFilter, setStatusFilter] = useState<'all' | 'low' | 'adequate'>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Detail view
  const [detailItem, setDetailItem] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  // Form state
  const [formVisible, setFormVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [fName, setFName] = useState('');
  const [fSku, setFSku] = useState('');
  const [fCategory, setFCategory] = useState('');
  const [fUnit, setFUnit] = useState('pieces');
  const [fDescription, setFDescription] = useState('');
  const [fTags, setFTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [unitPickerOpen, setUnitPickerOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<{[k: string]: string}>({});
  const [submitting, setSubmitting] = useState(false);

  const {
    items,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    loading,
    initialLoading,
    refreshing,
    error,
    refresh,
    refetch,
  } = useServerPagination<any>(
    async (pg, limit) => {
      try {
        const res = await inventoryService.getInventoryItems(token!, {
          search: debouncedSearch,
          page: pg,
          limit,
          lowStock: statusFilter === 'low' ? true : undefined,
          adequateStock: statusFilter === 'adequate' ? true : undefined,
          sortBy: 'itemName',
          sortOrder: 'asc',
        });
        return {items: res.items, total: res.total, pages: res.totalPages};
      } catch (e) {
        await handleApiError(e);
        throw e;
      }
    },
    {
      pageSize: 20,
      resetKey: `${debouncedSearch}|${statusFilter}`,
      enabled: !!(visible && token),
    },
  );

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ---- Form helpers ----
  const resetForm = () => {
    setEditingItem(null);
    setFName('');
    setFSku('');
    setFCategory('');
    setFUnit('pieces');
    setFDescription('');
    setFTags([]);
    setTagInput('');
    setFormErrors({});
  };

  const openCreate = () => {
    resetForm();
    setFSku(generateSku(total + Date.now() % 100000)); // seed avoids Date.now() lint but varies
    setFormVisible(true);
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setFName(item.itemName || '');
    setFSku(item.skuCode || '');
    setFCategory(item.category || '');
    setFUnit(item.quantity?.unit || item.unit || 'pieces');
    setFDescription(item.description || '');
    setFTags(item.tags || []);
    setTagInput('');
    setFormErrors({});
    setFormVisible(true);
  };

  const closeForm = () => {
    if (submitting) return;
    setFormVisible(false);
    resetForm();
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !fTags.includes(t)) {
      setFTags(prev => [...prev, t]);
    }
    setTagInput('');
  };
  const removeTag = (t: string) => setFTags(prev => prev.filter(x => x !== t));

  const validate = () => {
    const errs: {[k: string]: string} = {};
    if (!fName.trim()) errs.itemName = 'Item name is required';
    else if (fName.trim().length < 2) errs.itemName = 'Item name must be at least 2 characters';
    if (!fSku.trim()) errs.skuCode = 'SKU code is required';
    else if (fSku.trim().length < 3) errs.skuCode = 'SKU code must be at least 3 characters';
    else if (!/^[A-Z0-9-_]+$/i.test(fSku)) errs.skuCode = 'Only letters, numbers, hyphens and underscores';
    if (!fCategory.trim()) errs.category = 'Category is required';
    if (!fUnit) errs.unit = 'Unit is required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submitForm = async () => {
    if (!token) return;
    if (!validate()) return;
    const payload = {
      itemName: fName.trim(),
      skuCode: fSku.trim(),
      category: fCategory.trim(),
      unit: fUnit,
      description: fDescription.trim(),
      tags: fTags,
      primaryImageIndex: 0,
    };
    try {
      setSubmitting(true);
      if (editingItem) {
        await inventoryService.updateItem(token, editingItem._id || editingItem.id, payload);
      } else {
        await inventoryService.createItem(token, payload);
      }
      setFormVisible(false);
      resetForm();
      await refetch();
      Alert.alert('Success', `Inventory item ${editingItem ? 'updated' : 'created'} successfully`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save inventory item');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (item: any) => {
    Alert.alert(
      'Delete Item',
      `Delete "${item.itemName}" (${item.skuCode})? This cannot be undone.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await inventoryService.deleteItem(token!, item._id || item.id);
              Alert.alert('Success', 'Item deleted');
              refetch();
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Failed to delete item');
            }
          },
        },
      ],
    );
  };

  const openDetail = useCallback(
    async (item: any) => {
      setDetailItem(item);
      const id = item._id || item.id;
      if (!token || !id) return;
      try {
        setActivitiesLoading(true);
        const acts = await inventoryService.getItemActivities(token, id);
        setActivities(Array.isArray(acts) ? acts : []);
      } finally {
        setActivitiesLoading(false);
      }
    },
    [token],
  );

  const renderImages = (item: any) => {
    const imgs: any[] = item?.images || [];
    if (imgs.length === 0) return null;
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 12}}>
        {imgs.map((img, idx) => {
          const path = typeof img === 'object' ? img.path : img;
          return (
            <Image
              key={idx}
              source={{uri: inventoryService.getImageUrl(path)}}
              style={styles.detailImage}
            />
          );
        })}
      </ScrollView>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.headerSide}>
            <Typography variant="body" color={theme.colors.primary[600]} weight="semibold">
              Close
            </Typography>
          </TouchableOpacity>
          <Typography variant="h3" weight="bold" style={styles.modalTitle}>
            Inventory Items
          </Typography>
          <TouchableOpacity onPress={refetch} style={[styles.headerSide, {alignItems: 'flex-end'}]}>
            <Typography variant="small" color={theme.colors.primary[600]} weight="semibold">
              Refresh
            </Typography>
          </TouchableOpacity>
        </View>

        {initialLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary[600]} />
            <Typography variant="body" color={theme.colors.gray[600]} style={{marginTop: 16}}>
              Loading items...
            </Typography>
          </View>
        ) : (
          <PaginatedList
            data={items}
            keyExtractor={(item, index) => item._id || item.id || String(index)}
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, styles.contentWrap]}
            refreshing={refreshing}
            onRefresh={refresh}
            resetKey={`${searchQuery}|${statusFilter}`}
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
                {isAdmin && (
                  <View style={{marginBottom: theme.spacing.md}}>
                    <Button
                      title="Add New Item"
                      variant="primary"
                      onPress={openCreate}
                      leftIcon={<PlusIcon size={16} color={theme.colors.white} />}
                      fullWidth
                    />
                  </View>
                )}
                <View style={{marginBottom: theme.spacing.md}}>
                  <RNTextInput
                    style={styles.searchInput}
                    placeholder="Search by name or SKU"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor={theme.colors.gray[400]}
                  />
                </View>
                <View style={styles.filterRow}>
                  {(['all', 'low', 'adequate'] as const).map(f => (
                    <TouchableOpacity
                      key={f}
                      style={[styles.filterChip, statusFilter === f && styles.filterChipActive]}
                      onPress={() => setStatusFilter(f)}>
                      <Typography
                        variant="caption"
                        weight="semibold"
                        color={statusFilter === f ? theme.colors.primary[600] : theme.colors.gray[500]}>
                        {f === 'all' ? 'All' : f === 'low' ? 'Low Stock' : 'Adequate'}
                      </Typography>
                    </TouchableOpacity>
                  ))}
                </View>
                {error && (
                  <Card variant="outlined" padding="lg" style={styles.errorCard}>
                    <View style={styles.errorContent}>
                      <AlertCircleIcon size={24} color={theme.colors.error[500]} />
                      <Typography variant="body" color={theme.colors.error[700]} style={{flex: 1}}>
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
                  <InventoryIcon size={48} color={theme.colors.gray[400]} />
                  <Typography variant="h3" weight="semibold" color={theme.colors.gray[700]} style={{marginTop: 12}}>
                    No items found
                  </Typography>
                  <Typography variant="body" color={theme.colors.gray[500]} align="center">
                    {searchQuery ? 'Try adjusting your search' : isAdmin ? 'Add your first item to get started' : 'No inventory items yet'}
                  </Typography>
                </Card>
              )
            }
            renderItem={({item}) => {
              const id = item._id || item.id;
              const isExp = expanded.has(id);
              const qty = item.quantity?.available ?? item.availableQuantity ?? item.quantity?.total ?? 0;
              const primary = (item.images || [])[item.primaryImageIndex || 0];
              const primaryPath = typeof primary === 'object' ? primary?.path : primary;
              return (
                <Card variant="elevated" padding="none" style={styles.itemCard}>
                  <TouchableOpacity onPress={() => toggleExpand(id)} style={styles.itemHeader}>
                    <View style={styles.itemHeaderLeft}>
                      {isExp ? (
                        <ChevronDownIcon size={20} color={theme.colors.gray[600]} />
                      ) : (
                        <ChevronRightIcon size={20} color={theme.colors.gray[600]} />
                      )}
                      {primaryPath ? (
                        <Image source={{uri: inventoryService.getImageUrl(primaryPath)}} style={styles.thumb} />
                      ) : (
                        <View style={[styles.thumb, styles.thumbPlaceholder]}>
                          <InventoryIcon size={18} color={theme.colors.primary[600]} />
                        </View>
                      )}
                      <View style={{flex: 1}}>
                        <Typography variant="body" weight="bold" numberOfLines={1}>
                          {item.itemName}
                        </Typography>
                        <Typography variant="caption" color={theme.colors.gray[500]} numberOfLines={1}>
                          {item.skuCode}
                        </Typography>
                      </View>
                    </View>
                    <View style={styles.qtyBadge}>
                      <Typography variant="caption" weight="semibold" color={theme.colors.gray[600]}>
                        {qty} {item.quantity?.unit || item.unit || ''}
                      </Typography>
                    </View>
                  </TouchableOpacity>

                  {isExp && (
                    <View style={styles.expanded}>
                      {item.category ? (
                        <View style={styles.metaRow}>
                          <Typography variant="caption" color={theme.colors.gray[500]}>Category</Typography>
                          <Typography variant="small" weight="medium">{item.category}</Typography>
                        </View>
                      ) : null}
                      {item.description ? (
                        <View style={styles.metaRow}>
                          <Typography variant="caption" color={theme.colors.gray[500]}>Description</Typography>
                          <Typography variant="small" style={{flex: 1, textAlign: 'right'}} numberOfLines={2}>
                            {item.description}
                          </Typography>
                        </View>
                      ) : null}
                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.viewButton]}
                          onPress={() => openDetail(item)}>
                          <Typography variant="small" weight="semibold" color={theme.colors.gray[700]}>
                            View Details
                          </Typography>
                        </TouchableOpacity>
                        {isAdmin && (
                          <>
                            <TouchableOpacity
                              style={[styles.actionButton, styles.editButton]}
                              onPress={() => openEdit(item)}>
                              <EditIcon size={16} color={theme.colors.primary[600]} />
                              <Typography variant="small" weight="semibold" color={theme.colors.primary[600]} style={{marginLeft: 6}}>
                                Edit
                              </Typography>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.actionButton, styles.deleteButton]}
                              onPress={() => confirmDelete(item)}>
                              <TrashIcon size={16} color={theme.colors.error[600]} />
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    </View>
                  )}
                </Card>
              );
            }}
          />
        )}
      </SafeAreaView>

      {/* ---- Detail Modal ---- */}
      <Modal
        visible={!!detailItem}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetailItem(null)}>
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setDetailItem(null)} style={styles.headerSide}>
              <Typography variant="body" color={theme.colors.primary[600]} weight="semibold">
                Back
              </Typography>
            </TouchableOpacity>
            <Typography variant="h3" weight="bold" style={styles.modalTitle} numberOfLines={1}>
              {detailItem?.itemName || 'Item'}
            </Typography>
            <View style={styles.headerSide} />
          </View>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            <View style={styles.contentWrap}>
              {detailItem && (
                <>
                  {renderImages(detailItem)}
                  <Card style={{padding: 16, marginBottom: 12}}>
                    <View style={styles.metaRow}>
                      <Typography variant="caption" color={theme.colors.gray[500]}>SKU</Typography>
                      <Typography variant="small" weight="semibold">{detailItem.skuCode}</Typography>
                    </View>
                    <View style={styles.metaRow}>
                      <Typography variant="caption" color={theme.colors.gray[500]}>Category</Typography>
                      <Typography variant="small" weight="semibold">{detailItem.category || '-'}</Typography>
                    </View>
                    <View style={styles.metaRow}>
                      <Typography variant="caption" color={theme.colors.gray[500]}>Unit</Typography>
                      <Typography variant="small" weight="semibold">{detailItem.quantity?.unit || detailItem.unit || '-'}</Typography>
                    </View>
                    {detailItem.description ? (
                      <View style={[styles.metaRow, {alignItems: 'flex-start'}]}>
                        <Typography variant="caption" color={theme.colors.gray[500]}>Description</Typography>
                        <Typography variant="small" style={{flex: 1, textAlign: 'right', marginLeft: 12}}>
                          {detailItem.description}
                        </Typography>
                      </View>
                    ) : null}
                    {(detailItem.tags || []).length > 0 && (
                      <View style={styles.tagWrap}>
                        {detailItem.tags.map((t: string) => (
                          <View key={t} style={styles.tagChip}>
                            <Typography variant="caption" color={theme.colors.primary[700]}>{t}</Typography>
                          </View>
                        ))}
                      </View>
                    )}
                  </Card>

                  <Card style={{padding: 16}}>
                    <View style={styles.historyHeader}>
                      <ClockIcon size={16} color={theme.colors.gray[500]} />
                      <Typography variant="small" weight="bold" color={theme.colors.gray[700]} style={{marginLeft: 6}}>
                        Activity History
                      </Typography>
                    </View>
                    {activitiesLoading ? (
                      <ActivityIndicator color={theme.colors.primary[600]} style={{marginVertical: 16}} />
                    ) : activities.length === 0 ? (
                      <Typography variant="caption" color={theme.colors.gray[400]} style={{marginTop: 8}}>
                        No activity recorded
                      </Typography>
                    ) : (
                      activities.map((a, idx) => (
                        <View key={a._id || idx} style={styles.historyRow}>
                          <View style={styles.historyBadge}>
                            <Typography variant="caption" weight="bold" color={theme.colors.primary[700]}>
                              {(a.action || 'ACTION').replace(/_/g, ' ')}
                            </Typography>
                          </View>
                          <View style={{flex: 1}}>
                            <Typography variant="caption" color={theme.colors.gray[700]}>
                              {a.performedBy?.fullName || a.performedBy?.name || a.userName || 'System'}
                            </Typography>
                            <Typography variant="caption" color={theme.colors.gray[400]}>
                              {a.createdAt ? new Date(a.createdAt).toLocaleString() : ''}
                            </Typography>
                          </View>
                        </View>
                      ))
                    )}
                  </Card>
                </>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ---- Create / Edit Form Modal ---- */}
      <Modal
        visible={formVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeForm}>
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeForm} style={styles.headerSide} disabled={submitting}>
              <Typography variant="body" weight="semibold" color={submitting ? theme.colors.gray[400] : theme.colors.primary[600]}>
                Cancel
              </Typography>
            </TouchableOpacity>
            <Typography variant="h3" weight="bold" style={styles.modalTitle}>
              {editingItem ? 'Edit Item' : 'Add New Item'}
            </Typography>
            <View style={styles.headerSide} />
          </View>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.contentWrap}>
              {/* Item Name */}
              <View style={styles.formField}>
                <Typography variant="small" weight="semibold" color={theme.colors.gray[700]} style={{marginBottom: 6}}>
                  Item Name *
                </Typography>
                <RNTextInput
                  style={[styles.formInput, formErrors.itemName && styles.inputError]}
                  placeholder="Enter item name"
                  value={fName}
                  onChangeText={setFName}
                  placeholderTextColor={theme.colors.gray[400]}
                />
                {formErrors.itemName ? <Typography variant="caption" color={theme.colors.error[600]}>{formErrors.itemName}</Typography> : null}
              </View>

              {/* SKU */}
              <View style={styles.formField}>
                <Typography variant="small" weight="semibold" color={theme.colors.gray[700]} style={{marginBottom: 6}}>
                  SKU *
                </Typography>
                <RNTextInput
                  style={[styles.formInput, formErrors.skuCode && styles.inputError, !editingItem && styles.inputDisabled]}
                  placeholder="Auto-generated SKU"
                  value={fSku}
                  onChangeText={setFSku}
                  editable={!!editingItem}
                  autoCapitalize="characters"
                  placeholderTextColor={theme.colors.gray[400]}
                />
                <Typography variant="caption" color={theme.colors.gray[500]}>
                  {editingItem ? 'Renaming a SKU updates it everywhere it is used' : 'Auto-generated unique identifier'}
                </Typography>
                {formErrors.skuCode ? <Typography variant="caption" color={theme.colors.error[600]}>{formErrors.skuCode}</Typography> : null}
              </View>

              {/* Category */}
              <View style={styles.formField}>
                <Typography variant="small" weight="semibold" color={theme.colors.gray[700]} style={{marginBottom: 6}}>
                  Category *
                </Typography>
                <RNTextInput
                  style={[styles.formInput, formErrors.category && styles.inputError]}
                  placeholder="Enter category"
                  value={fCategory}
                  onChangeText={setFCategory}
                  placeholderTextColor={theme.colors.gray[400]}
                />
                {formErrors.category ? <Typography variant="caption" color={theme.colors.error[600]}>{formErrors.category}</Typography> : null}
              </View>

              {/* Unit */}
              <View style={styles.formField}>
                <Typography variant="small" weight="semibold" color={theme.colors.gray[700]} style={{marginBottom: 6}}>
                  Unit of Measurement *
                </Typography>
                <TouchableOpacity style={styles.formInput} onPress={() => setUnitPickerOpen(o => !o)}>
                  <Typography variant="body">
                    {UNIT_OPTIONS.find(u => u.value === fUnit)?.label || 'Select unit'}
                  </Typography>
                </TouchableOpacity>
                {unitPickerOpen && (
                  <View style={styles.unitList}>
                    {UNIT_OPTIONS.map(u => (
                      <TouchableOpacity
                        key={u.value}
                        style={styles.unitOption}
                        onPress={() => {
                          setFUnit(u.value);
                          setUnitPickerOpen(false);
                        }}>
                        <Typography variant="small" weight={u.value === fUnit ? 'bold' : 'normal'}>
                          {u.label}
                        </Typography>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Description */}
              <View style={styles.formField}>
                <Typography variant="small" weight="semibold" color={theme.colors.gray[700]} style={{marginBottom: 6}}>
                  Description
                </Typography>
                <RNTextInput
                  style={[styles.formInput, styles.formTextArea]}
                  placeholder="Enter item description"
                  value={fDescription}
                  onChangeText={setFDescription}
                  multiline
                  maxLength={1000}
                  placeholderTextColor={theme.colors.gray[400]}
                />
              </View>

              {/* Tags */}
              <View style={styles.formField}>
                <Typography variant="small" weight="semibold" color={theme.colors.gray[700]} style={{marginBottom: 6}}>
                  Tags
                </Typography>
                <View style={{flexDirection: 'row', gap: 8}}>
                  <RNTextInput
                    style={[styles.formInput, {flex: 1}]}
                    placeholder="Type tag and press Add"
                    value={tagInput}
                    onChangeText={setTagInput}
                    onSubmitEditing={addTag}
                    blurOnSubmit={false}
                    autoCapitalize="none"
                    placeholderTextColor={theme.colors.gray[400]}
                  />
                  <Button title="Add" variant="outline" onPress={addTag} />
                </View>
                {fTags.length > 0 && (
                  <View style={styles.tagWrap}>
                    {fTags.map(t => (
                      <TouchableOpacity key={t} style={styles.tagChip} onPress={() => removeTag(t)}>
                        <Typography variant="caption" color={theme.colors.primary[700]}>{t} ×</Typography>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.imageNote}>
                <TagIcon size={14} color={theme.colors.gray[500]} />
                <Typography variant="caption" color={theme.colors.gray[500]} style={{marginLeft: 6, flex: 1}}>
                  Image upload is available on the web app; existing images are shown in the item detail view.
                </Typography>
              </View>

              <Button
                title={submitting ? 'Saving...' : editingItem ? 'Update Item' : 'Create Item'}
                variant="primary"
                onPress={submitForm}
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
    container: {flex: 1, backgroundColor: theme.colors.gray[50]},
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
    headerSide: {width: 60, paddingVertical: 4},
    modalTitle: {flex: 1, textAlign: 'center'},
    loadingContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},
    scrollView: {flex: 1},
    scrollContent: {paddingBottom: theme.spacing.lg},
    contentWrap: {
      width: '100%',
      maxWidth: bp.contentMaxWidth,
      alignSelf: 'center',
      paddingHorizontal: bp.gutter,
      paddingTop: theme.spacing.lg,
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
    filterRow: {flexDirection: 'row', gap: 8, marginBottom: theme.spacing.md},
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
      backgroundColor: theme.colors.white,
    },
    filterChipActive: {borderColor: theme.colors.primary[600], backgroundColor: theme.colors.primary[50]},
    errorCard: {marginBottom: theme.spacing.lg, backgroundColor: theme.colors.error[50]},
    errorContent: {flexDirection: 'row', alignItems: 'center', gap: 12},
    emptyCard: {alignItems: 'center', paddingVertical: theme.spacing.xl * 2},
    itemCard: {marginBottom: 0, overflow: 'hidden'},
    itemHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: theme.spacing.md},
    itemHeaderLeft: {flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10},
    thumb: {width: 40, height: 40, borderRadius: 8, backgroundColor: theme.colors.gray[100]},
    thumbPlaceholder: {alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary[100]},
    qtyBadge: {backgroundColor: theme.colors.gray[100], paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 8},
    expanded: {borderTopWidth: 1, borderTopColor: theme.colors.gray[200], padding: theme.spacing.md, gap: theme.spacing.sm},
    metaRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6},
    actionButtons: {flexDirection: 'row', gap: theme.spacing.sm, marginTop: 4},
    actionButton: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1},
    viewButton: {flex: 1, backgroundColor: theme.colors.gray[50], borderColor: theme.colors.gray[200]},
    editButton: {flex: 1, backgroundColor: theme.colors.primary[50], borderColor: theme.colors.primary[200]},
    deleteButton: {backgroundColor: theme.colors.error[50], borderColor: theme.colors.error[200]},
    detailImage: {width: 120, height: 120, borderRadius: 10, marginRight: 10, backgroundColor: theme.colors.gray[100]},
    tagWrap: {flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8},
    tagChip: {backgroundColor: theme.colors.primary[100], paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999},
    historyHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 8},
    historyRow: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: theme.colors.gray[100]},
    historyBadge: {backgroundColor: theme.colors.primary[50], paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6},
    formField: {marginBottom: theme.spacing.md},
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
    formTextArea: {minHeight: 88, paddingTop: 12, textAlignVertical: 'top'},
    inputError: {borderColor: theme.colors.error[500], backgroundColor: theme.colors.error[50]},
    inputDisabled: {backgroundColor: theme.colors.gray[100], color: theme.colors.gray[500]},
    unitList: {marginTop: 6, backgroundColor: theme.colors.white, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.gray[200], overflow: 'hidden'},
    unitOption: {paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.gray[100]},
    imageNote: {flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.gray[100], borderRadius: 10, padding: 12, marginBottom: theme.spacing.lg},
  });
