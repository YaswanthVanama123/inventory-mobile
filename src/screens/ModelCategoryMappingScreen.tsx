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
import {PickerModal} from '../components/molecules/PickerModal';
import {useAuth} from '../contexts/AuthContext';
import {useApiErrorHandler} from '../hooks/useApiErrorHandler';
import {theme} from '../theme';
import modelCategoryService from '../services/modelCategoryService';
import {
  AlertCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  BoxIcon,
  CheckCircleIcon,
  WarningIcon,
  TagIcon,
} from '../components/icons';

interface ModelCategoryMappingScreenProps {
  visible: boolean;
  onClose: () => void;
}

export const ModelCategoryMappingScreen: React.FC<ModelCategoryMappingScreenProps> = ({
  visible,
  onClose,
}) => {
  const {token} = useAuth();
  const {handleApiError} = useApiErrorHandler();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [models, setModels] = useState<any[]>([]);
  const [routeStarItems, setRouteStarItems] = useState<any[]>([]);
  const [filteredModels, setFilteredModels] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'mapped' | 'unmapped'>('all');
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedModelForPicker, setSelectedModelForPicker] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    mapped: 0,
    unmapped: 0,
  });

  useEffect(() => {
    if (visible && token) {
      loadData();
    }
  }, [visible, token]);

  useEffect(() => {
    filterModels();
  }, [models, searchQuery, filterStatus]);

  useEffect(() => {
    updateStats();
  }, [models]);

  const loadData = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);

      const [modelsData, itemsData] = await Promise.all([
        modelCategoryService.getUniqueModels(token),
        modelCategoryService.getRouteStarItems(token),
      ]);

      setModels(modelsData || []);
      setRouteStarItems(itemsData || []);
    } catch (error: any) {
      console.error('Failed to fetch model category data:', error);

      // Check if token expired and handle auto-logout
      const wasHandled = await handleApiError(error);
      if (wasHandled) return;

      setError(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateStats = () => {
    const mapped = models.filter(m => m.categoryItemName).length;
    const unmapped = models.length - mapped;
    setStats({
      total: models.length,
      mapped,
      unmapped,
    });
  };

  const filterModels = () => {
    let filtered = [...models];

    // Search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(
        m =>
          m.modelNumber.toLowerCase().includes(searchLower) ||
          (m.orderItemName && m.orderItemName.toLowerCase().includes(searchLower)) ||
          (m.categoryItemName && m.categoryItemName.toLowerCase().includes(searchLower))
      );
    }

    // Status filter
    if (filterStatus === 'mapped') {
      filtered = filtered.filter(m => m.categoryItemName);
    } else if (filterStatus === 'unmapped') {
      filtered = filtered.filter(m => !m.categoryItemName);
    }

    setFilteredModels(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleModelPress = (modelNumber: string) => {
    const newExpanded = new Set(expandedModels);
    if (newExpanded.has(modelNumber)) {
      newExpanded.delete(modelNumber);
    } else {
      newExpanded.add(modelNumber);
    }
    setExpandedModels(newExpanded);
  };

  const handleCategoryChange = (modelNumber: string, categoryItemId: string) => {
    const item = routeStarItems.find(i => i._id === categoryItemId);
    setModels(prevModels =>
      prevModels.map(m =>
        m.modelNumber === modelNumber
          ? {
              ...m,
              categoryItemId,
              categoryItemName: item ? item.itemName : null,
            }
          : m
      )
    );
  };

  const openPickerForModel = (modelNumber: string) => {
    setSelectedModelForPicker(modelNumber);
    setPickerVisible(true);
  };

  const handlePickerSelect = (categoryItemId: string) => {
    if (selectedModelForPicker) {
      handleCategoryChange(selectedModelForPicker, categoryItemId);
    }
  };

  const saveMapping = async (modelNumber: string) => {
    const model = models.find(m => m.modelNumber === modelNumber);
    if (!model || !model.categoryItemId) {
      Alert.alert('Error', 'Please select a category first');
      return;
    }

    try {
      setSaving(true);
      await modelCategoryService.saveMapping(token!, {
        modelNumber: model.modelNumber,
        categoryItemName: model.categoryItemName,
        categoryItemId: model.categoryItemId,
        notes: model.notes || '',
      });

      Alert.alert('Success', `Mapping saved for ${modelNumber}`);
      // Collapse the expanded model
      const newExpanded = new Set(expandedModels);
      newExpanded.delete(modelNumber);
      setExpandedModels(newExpanded);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save mapping');
    } finally {
      setSaving(false);
    }
  };

  const deleteMapping = async (modelNumber: string) => {
    Alert.alert(
      'Delete Mapping',
      `Are you sure you want to delete the mapping for ${modelNumber}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              await modelCategoryService.deleteMapping(token!, modelNumber);
              Alert.alert('Success', `Mapping deleted for ${modelNumber}`);
              loadData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete mapping');
            } finally {
              setSaving(false);
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
            Model Mapping
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
              Loading model mappings...
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
            {/* Stats Cards */}
            <View style={styles.statsGrid}>
              <View style={styles.statCardWrapper}>
                <View style={[styles.statCard, {backgroundColor: theme.colors.gray[600]}]}>
                  <BoxIcon size={18} color={theme.colors.white} />
                  <Typography variant="caption" style={styles.statLabel}>
                    Total Models
                  </Typography>
                  <Typography variant="h2" weight="bold" style={styles.statValue}>
                    {stats.total}
                  </Typography>
                </View>
              </View>

              <View style={styles.statCardWrapper}>
                <View style={[styles.statCard, {backgroundColor: theme.colors.success[600]}]}>
                  <CheckCircleIcon size={18} color={theme.colors.white} />
                  <Typography variant="caption" style={styles.statLabel}>
                    Mapped
                  </Typography>
                  <Typography variant="h2" weight="bold" style={styles.statValue}>
                    {stats.mapped}
                  </Typography>
                  <Typography variant="caption" style={styles.statSubtitle}>
                    {stats.total > 0 ? Math.round((stats.mapped / stats.total) * 100) : 0}% complete
                  </Typography>
                </View>
              </View>

              <View style={styles.statCardWrapper}>
                <View style={[styles.statCard, {backgroundColor: theme.colors.warning[600]}]}>
                  <WarningIcon size={18} color={theme.colors.white} />
                  <Typography variant="caption" style={styles.statLabel}>
                    Unmapped
                  </Typography>
                  <Typography variant="h2" weight="bold" style={styles.statValue}>
                    {stats.unmapped}
                  </Typography>
                  <Typography variant="caption" style={styles.statSubtitle}>
                    Needs attention
                  </Typography>
                </View>
              </View>

              <View style={styles.statCardWrapper}>
                <View style={[styles.statCard, {backgroundColor: theme.colors.primary[600]}]}>
                  <TagIcon size={18} color={theme.colors.white} />
                  <Typography variant="caption" style={styles.statLabel}>
                    RouteStar Items
                  </Typography>
                  <Typography variant="h2" weight="bold" style={styles.statValue}>
                    {routeStarItems.length}
                  </Typography>
                  <Typography variant="caption" style={styles.statSubtitle}>
                    Available
                  </Typography>
                </View>
              </View>
            </View>

            {/* Filter Tabs */}
            <View style={styles.tabsContainer}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  filterStatus === 'all' && styles.tabActive,
                ]}
                onPress={() => setFilterStatus('all')}>
                <Typography
                  variant="small"
                  weight="semibold"
                  color={
                    filterStatus === 'all'
                      ? theme.colors.white
                      : theme.colors.gray[600]
                  }>
                  All Models
                </Typography>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tab,
                  filterStatus === 'mapped' && styles.tabActive,
                ]}
                onPress={() => setFilterStatus('mapped')}>
                <Typography
                  variant="small"
                  weight="semibold"
                  color={
                    filterStatus === 'mapped'
                      ? theme.colors.white
                      : theme.colors.gray[600]
                  }>
                  Mapped
                </Typography>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tab,
                  filterStatus === 'unmapped' && styles.tabActive,
                ]}
                onPress={() => setFilterStatus('unmapped')}>
                <Typography
                  variant="small"
                  weight="semibold"
                  color={
                    filterStatus === 'unmapped'
                      ? theme.colors.white
                      : theme.colors.gray[600]
                  }>
                  Unmapped
                </Typography>
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <RNTextInput
                style={styles.searchInput}
                placeholder="Search model numbers..."
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
            {!error && filteredModels.length === 0 && (
              <Card variant="outlined" padding="lg" style={styles.emptyCard}>
                <BoxIcon size={48} color={theme.colors.gray[400]} />
                <Typography
                  variant="h3"
                  weight="semibold"
                  color={theme.colors.gray[700]}
                  style={styles.emptyTitle}>
                  No models found
                </Typography>
                <Typography
                  variant="body"
                  color={theme.colors.gray[500]}
                  align="center">
                  {searchQuery
                    ? 'Try adjusting your search'
                    : 'No models available'}
                </Typography>
              </Card>
            )}

            {/* Models List */}
            <View style={styles.modelsList}>
              {filteredModels.map((model, index) => {
                const isExpanded = expandedModels.has(model.modelNumber);
                const isMapped = Boolean(model.categoryItemName);

                return (
                  <Card
                    key={model.modelNumber || index}
                    variant="elevated"
                    padding="none"
                    style={[
                      styles.modelCard,
                      isMapped && styles.modelCardMapped,
                    ]}>
                    <TouchableOpacity
                      onPress={() => handleModelPress(model.modelNumber)}
                      style={styles.modelHeader}>
                      <View style={styles.modelHeaderLeft}>
                        <View style={styles.chevronContainer}>
                          {isExpanded ? (
                            <ChevronDownIcon size={20} color={theme.colors.gray[600]} />
                          ) : (
                            <ChevronRightIcon size={20} color={theme.colors.gray[600]} />
                          )}
                        </View>
                        <View style={styles.modelInfo}>
                          <Typography variant="body" weight="bold">
                            {model.modelNumber}
                          </Typography>
                          <Typography variant="caption" color={theme.colors.gray[500]} numberOfLines={1}>
                            {model.orderItemName || 'No item name'}
                          </Typography>
                        </View>
                      </View>
                      <View style={styles.modelHeaderRight}>
                        {isMapped ? (
                          <View style={[styles.statusBadge, {backgroundColor: theme.colors.success[100]}]}>
                            <Typography
                              variant="caption"
                              weight="semibold"
                              color={theme.colors.success[600]}>
                              Mapped
                            </Typography>
                          </View>
                        ) : (
                          <View style={[styles.statusBadge, {backgroundColor: theme.colors.error[100]}]}>
                            <Typography
                              variant="caption"
                              weight="semibold"
                              color={theme.colors.error[600]}>
                              Unmapped
                            </Typography>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <View style={styles.expandedContent}>
                        <View style={styles.mappingSection}>
                          <Typography variant="small" weight="semibold" style={styles.sectionLabel}>
                            Current Mapping
                          </Typography>
                          {isMapped ? (
                            <View style={styles.mappedItemInfo}>
                              <Typography variant="small" color={theme.colors.gray[600]}>
                                Mapped to:
                              </Typography>
                              <Typography variant="body" weight="medium" style={{marginTop: 4}}>
                                {model.categoryItemName}
                              </Typography>
                            </View>
                          ) : (
                            <Typography variant="small" color={theme.colors.gray[500]} style={{fontStyle: 'italic'}}>
                              Not mapped yet
                            </Typography>
                          )}
                        </View>

                        <View style={styles.pickerSection}>
                          <Typography variant="small" weight="semibold" style={styles.sectionLabel}>
                            Select Category
                          </Typography>
                          <TouchableOpacity
                            style={styles.pickerButton}
                            onPress={() => openPickerForModel(model.modelNumber)}>
                            <Typography
                              variant="body"
                              color={model.categoryItemId ? theme.colors.gray[900] : theme.colors.gray[500]}
                              numberOfLines={1}
                              style={{flex: 1}}>
                              {model.categoryItemId
                                ? routeStarItems.find(i => i._id === model.categoryItemId)?.itemName || 'Select category'
                                : `Select category (${routeStarItems.length} available)`}
                            </Typography>
                            <ChevronDownIcon size={20} color={theme.colors.gray[400]} />
                          </TouchableOpacity>
                        </View>

                        <View style={styles.actionsSection}>
                          <Button
                            title="Save Mapping"
                            variant="primary"
                            onPress={() => saveMapping(model.modelNumber)}
                            disabled={saving || !model.categoryItemId}
                            fullWidth
                          />
                          {isMapped && (
                            <Button
                              title="Delete Mapping"
                              variant="danger"
                              onPress={() => deleteMapping(model.modelNumber)}
                              disabled={saving}
                              fullWidth
                              style={{marginTop: 8}}
                            />
                          )}
                        </View>
                      </View>
                    )}
                  </Card>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* Picker Modal */}
        <PickerModal
          visible={pickerVisible}
          onClose={() => setPickerVisible(false)}
          items={routeStarItems}
          selectedValue={
            selectedModelForPicker
              ? models.find(m => m.modelNumber === selectedModelForPicker)?.categoryItemId || ''
              : ''
          }
          onValueChange={handlePickerSelect}
          placeholder="Select Category"
          getLabel={(item) => item.itemName}
          getValue={(item) => item._id}
        />
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: theme.spacing.lg,
  },
  statCardWrapper: {
    width: '50%',
    padding: 4,
  },
  statCard: {
    borderRadius: 12,
    padding: 12,
    minHeight: 110,
  },
  statLabel: {
    color: '#ffffff',
    fontSize: 11,
    opacity: 0.9,
    marginTop: 8,
    marginBottom: 4,
  },
  statValue: {
    color: '#ffffff',
    fontSize: 24,
    marginBottom: 4,
  },
  statSubtitle: {
    color: '#ffffff',
    fontSize: 10,
    opacity: 0.85,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: theme.colors.gray[200],
  },
  tabActive: {
    backgroundColor: theme.colors.primary[600],
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
  modelsList: {
    gap: theme.spacing.md,
  },
  modelCard: {
    marginBottom: 0,
    overflow: 'hidden',
  },
  modelCardMapped: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.success[500],
  },
  modelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
  },
  modelHeaderLeft: {
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
  modelInfo: {
    flex: 1,
  },
  modelHeaderRight: {
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
    padding: theme.spacing.md,
    backgroundColor: theme.colors.gray[50],
    gap: theme.spacing.md,
  },
  mappingSection: {
    backgroundColor: theme.colors.white,
    borderRadius: 8,
    padding: theme.spacing.md,
  },
  sectionLabel: {
    marginBottom: theme.spacing.sm,
    color: theme.colors.gray[700],
  },
  mappedItemInfo: {
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.success[50],
    borderRadius: 6,
  },
  pickerSection: {
    backgroundColor: theme.colors.white,
    borderRadius: 8,
    padding: theme.spacing.md,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.white,
    minHeight: 50,
  },
  actionsSection: {
    marginTop: theme.spacing.sm,
  },
});
