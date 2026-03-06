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
import manualPOItemService, {ManualPOItem} from '../services/manualPOItemService';
import {
  AlertCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClipboardIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
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
  const {token} = useAuth();
  const {handleApiError} = useApiErrorHandler();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<ManualPOItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
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
      const data = await manualPOItemService.getManualPOItems(token);
      console.log('[ManualPOItemsScreen] Data loaded:', data?.length || 0);

      // Ensure data is an array
      const items = Array.isArray(data) ? data : [];

      // Filter by search query if present
      let filteredData = items;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredData = items.filter(
          item =>
            item.sku.toLowerCase().includes(query) ||
            item.name.toLowerCase().includes(query) ||
            (item.description && item.description.toLowerCase().includes(query))
        );
      }

      setItems(filteredData);
    } catch (error: any) {
      console.error('Failed to fetch manual PO items:', error);
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

  const handleItemPress = (sku: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(sku)) {
      newExpanded.delete(sku);
    } else {
      newExpanded.add(sku);
    }
    setExpandedItems(newExpanded);
  };

  const handleAddNew = () => {
    Alert.alert('Add New Item', 'This feature will be available in the next update');
  };

  const handleEdit = (item: ManualPOItem) => {
    Alert.alert('Edit Item', `Editing ${item.name} will be available in the next update`);
  };

  const handleDelete = (item: ManualPOItem) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.name}"?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await manualPOItemService.deleteManualPOItem(token!, item.sku);
              Alert.alert('Success', 'Item deleted successfully');
              loadData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete item');
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

            {/* Empty State */}
            {!error && items.length === 0 && (
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
            )}

            {/* Items List */}
            <View style={styles.itemsList}>
              {items.map((item, index) => {
                const isExpanded = expandedItems.has(item.sku);
                return (
                  <Card
                    key={item.sku || index}
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
                      {item.mappedCategoryItemName && (
                        <View style={styles.metaRow}>
                          <Typography variant="caption" color={theme.colors.gray[500]}>
                            Mapped Category
                          </Typography>
                          <Typography variant="small" weight="medium">
                            {item.mappedCategoryItemName}
                          </Typography>
                        </View>
                      )}
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
                            style={[styles.actionButton, styles.deleteButton]}
                            onPress={() => handleDelete(item)}>
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
