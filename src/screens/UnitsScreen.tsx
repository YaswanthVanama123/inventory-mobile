import React, {useState, useMemo} from 'react';
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
import {useAuth} from '../contexts/AuthContext';
import {useApiErrorHandler} from '../hooks/useApiErrorHandler';
import {useTheme} from '../contexts/ThemeContext';
import {Theme} from '../theme';
import {useBreakpoint, BreakpointInfo} from '../utils/breakpoints';
import settingsService, {Unit} from '../services/settingsService';
import useDebounce from '../hooks/useDebounce';
import {useServerPagination} from '../hooks/useServerPagination';
import {
  AlertCircleIcon,
  BoxIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  CheckCircleIcon,
} from '../components/icons';

interface UnitsScreenProps {
  visible: boolean;
  onClose: () => void;
}

export const UnitsScreen: React.FC<UnitsScreenProps> = ({visible, onClose}) => {
  const theme = useTheme();
  const bp = useBreakpoint();
  const styles = useMemo(() => makeStyles(theme, bp), [theme, bp]);
  const {token, user} = useAuth();
  const isAdmin = user?.role === 'admin';
  const {handleApiError} = useApiErrorHandler();

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 400);

  // Add / edit unit form
  const [formVisible, setFormVisible] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [formValue, setFormValue] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Full list of units (for duplicate validation). Units are stored on a single
  // Settings doc, so the backend returns them all in one array.
  const [allUnits, setAllUnits] = useState<Unit[]>([]);

  // Client-side numbered pagination over the fetched units array.
  const {
    items: units,
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
  } = useServerPagination<Unit>(
    async (pg, limit) => {
      try {
        const list = await settingsService.getUnits(token!, true);
        setAllUnits(list);
        const q = debouncedSearch.trim().toLowerCase();
        const filtered = q
          ? list.filter(
              u =>
                (u.value || '').toLowerCase().includes(q) ||
                (u.label || '').toLowerCase().includes(q),
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
    {pageSize: 20, resetKey: debouncedSearch, enabled: !!(visible && token)},
  );
  const loadData = refetch;
  const onRefresh = refresh;

  const resetForm = () => {
    setEditingUnit(null);
    setFormValue('');
    setFormLabel('');
  };

  const handleAddNew = () => {
    resetForm();
    setFormVisible(true);
  };

  const handleEdit = (unit: Unit) => {
    setEditingUnit(unit);
    setFormValue(unit.value || '');
    setFormLabel(unit.label || '');
    setFormVisible(true);
  };

  const handleCloseForm = () => {
    if (submitting) return;
    setFormVisible(false);
    resetForm();
  };

  const handleSubmitForm = async () => {
    if (!token) return;
    if (!formValue.trim() || !formLabel.trim()) {
      Alert.alert('Validation', 'Unit value and label are required');
      return;
    }
    // Duplicate-value validation (matches web): case-insensitive on `value`.
    const normalizedValue = formValue.trim().toLowerCase();
    const isDuplicate = allUnits.some(u => {
      if (editingUnit && u._id === editingUnit._id) return false;
      return (u.value || '').toLowerCase() === normalizedValue;
    });
    if (isDuplicate) {
      Alert.alert('Validation', 'A unit with this value already exists');
      return;
    }
    const payload = {value: formValue.trim(), label: formLabel.trim()};
    try {
      setSubmitting(true);
      if (editingUnit) {
        await settingsService.updateUnit(token, editingUnit._id, payload);
      } else {
        await settingsService.addUnit(token, payload);
      }
      setFormVisible(false);
      resetForm();
      await loadData();
      Alert.alert(
        'Success',
        `Unit ${editingUnit ? 'updated' : 'added'} successfully`,
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save unit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (unit: Unit) => {
    Alert.alert(
      'Delete Unit',
      `Are you sure you want to delete "${unit.label || unit.value}"?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await settingsService.deleteUnit(token!, unit._id);
              Alert.alert('Success', 'Unit deleted successfully');
              loadData();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete unit');
            }
          },
        },
      ],
    );
  };

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
            Measurement Units
          </Typography>
          <TouchableOpacity onPress={loadData} style={styles.refreshButton}>
            <Typography
              variant="small"
              color={theme.colors.primary[600]}
              weight="semibold">
              Refresh
            </Typography>
          </TouchableOpacity>
        </View>

        {initialLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary[600]} />
            <Typography
              variant="body"
              color={theme.colors.gray[600]}
              style={{marginTop: 16}}>
              Loading units...
            </Typography>
          </View>
        ) : (
          <PaginatedList
            data={units}
            keyExtractor={(item, index) => item._id || String(index)}
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
                {isAdmin && (
                  <View style={styles.addButtonContainer}>
                    <Button
                      title="Add Unit"
                      variant="primary"
                      onPress={handleAddNew}
                      leftIcon={<PlusIcon size={16} color={theme.colors.white} />}
                      fullWidth
                    />
                  </View>
                )}
                <View style={styles.searchContainer}>
                  <RNTextInput
                    style={styles.searchInput}
                    placeholder="Search by value or label"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor={theme.colors.gray[400]}
                  />
                </View>
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
                  <BoxIcon size={48} color={theme.colors.gray[400]} />
                  <Typography
                    variant="h3"
                    weight="semibold"
                    color={theme.colors.gray[700]}
                    style={styles.emptyTitle}>
                    No units found
                  </Typography>
                  <Typography
                    variant="body"
                    color={theme.colors.gray[500]}
                    align="center">
                    {searchQuery
                      ? 'Try adjusting your search'
                      : isAdmin
                      ? 'Add your first unit to get started'
                      : 'No units have been configured'}
                  </Typography>
                </Card>
              )
            }
            renderItem={({item: unit}) => (
              <Card variant="elevated" padding="none" style={styles.unitCard}>
                <View style={styles.unitHeader}>
                  <View style={styles.unitHeaderLeft}>
                    <View style={styles.iconContainer}>
                      <BoxIcon size={20} color={theme.colors.primary[600]} />
                    </View>
                    <View style={styles.unitInfo}>
                      <Typography variant="body" weight="bold" numberOfLines={1}>
                        {unit.label}
                      </Typography>
                      <Typography
                        variant="caption"
                        color={theme.colors.gray[500]}
                        numberOfLines={1}>
                        {unit.value}
                      </Typography>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          unit.isActive !== false
                            ? theme.colors.success[100]
                            : theme.colors.gray[100],
                      },
                    ]}>
                    {unit.isActive !== false && (
                      <CheckCircleIcon size={14} color={theme.colors.success[600]} />
                    )}
                    <Typography
                      variant="caption"
                      weight="semibold"
                      color={
                        unit.isActive !== false
                          ? theme.colors.success[600]
                          : theme.colors.gray[500]
                      }
                      style={unit.isActive !== false ? {marginLeft: 4} : {}}>
                      {unit.isActive !== false ? 'Active' : 'Inactive'}
                    </Typography>
                  </View>
                </View>

                {isAdmin && (
                  <View style={styles.expandedContent}>
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.editButton]}
                        onPress={() => handleEdit(unit)}>
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
                        onPress={() => handleDelete(unit)}>
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
            )}
          />
        )}
      </SafeAreaView>

      {/* Add / Edit Unit form */}
      <Modal
        visible={formVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseForm}>
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={handleCloseForm}
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
              {editingUnit ? 'Edit Unit' : 'Add Unit'}
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
                  Value *
                </Typography>
                <RNTextInput
                  style={styles.formInput}
                  placeholder="e.g., kg"
                  value={formValue}
                  onChangeText={setFormValue}
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
                  Label *
                </Typography>
                <RNTextInput
                  style={styles.formInput}
                  placeholder="e.g., Kilograms"
                  value={formLabel}
                  onChangeText={setFormLabel}
                  placeholderTextColor={theme.colors.gray[400]}
                />
              </View>

              <Button
                title={
                  submitting
                    ? 'Saving...'
                    : editingUnit
                    ? 'Save Changes'
                    : 'Add Unit'
                }
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
    unitCard: {
      marginBottom: 0,
      overflow: 'hidden',
    },
    unitHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing.md,
    },
    unitHeaderLeft: {
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
    unitInfo: {
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
  });
