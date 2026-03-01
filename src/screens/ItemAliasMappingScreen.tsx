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
import itemAliasService from '../services/itemAliasService';
import {
  AlertCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  BoxIcon,
  CheckCircleIcon,
  WarningIcon,
  TagIcon,
  LinkIcon,
} from '../components/icons';

interface ItemAliasMappingScreenProps {
  visible: boolean;
  onClose: () => void;
}

export const ItemAliasMappingScreen: React.FC<ItemAliasMappingScreenProps> = ({
  visible,
  onClose,
}) => {
  const {token} = useAuth();
  const {handleApiError} = useApiErrorHandler();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mappings, setMappings] = useState<any[]>([]);
  const [uniqueItems, setUniqueItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'mapped' | 'unmapped'>('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalUniqueItems: 0,
    mappedItems: 0,
    unmappedItems: 0,
  });

  // Quick Map Modal State
  const [quickMapVisible, setQuickMapVisible] = useState(false);
  const [quickMapItem, setQuickMapItem] = useState<any>(null);
  const [quickCanonicalName, setQuickCanonicalName] = useState('');
  const [quickMapSelectedItems, setQuickMapSelectedItems] = useState<Set<string>>(new Set());
  const [quickMapSearchQuery, setQuickMapSearchQuery] = useState('');

  useEffect(() => {
    if (visible && token) {
      loadData();
    }
  }, [visible, token]);

  useEffect(() => {
    filterItems();
  }, [uniqueItems, searchQuery, filterStatus]);

  const loadData = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);

      const [mappingsData, itemsData] = await Promise.all([
        itemAliasService.getAllMappings(token),
        itemAliasService.getUniqueItems(token),
      ]);

      setMappings(mappingsData || []);
      setUniqueItems(itemsData.items || []);
      setStats(itemsData.stats || {totalUniqueItems: 0, mappedItems: 0, unmappedItems: 0});
    } catch (error: any) {
      console.error('Failed to fetch item alias data:', error);

      // Check if token expired and handle auto-logout
      const wasHandled = await handleApiError(error);
      if (wasHandled) return;

      setError(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterItems = () => {
    let filtered = [...uniqueItems];

    // Search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(
        item =>
          item.itemName.toLowerCase().includes(searchLower) ||
          (item.canonicalName && item.canonicalName.toLowerCase().includes(searchLower)) ||
          (item.itemParent && item.itemParent.toLowerCase().includes(searchLower))
      );
    }

    // Status filter
    if (filterStatus === 'mapped') {
      filtered = filtered.filter(item => item.isMapped);
    } else if (filterStatus === 'unmapped') {
      filtered = filtered.filter(item => !item.isMapped);
    }

    setFilteredItems(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleItemPress = (itemName: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemName)) {
      newExpanded.delete(itemName);
    } else {
      newExpanded.add(itemName);
    }
    setExpandedItems(newExpanded);
  };

  const openQuickMapModal = (item: any) => {
    setQuickMapItem(item);
    setQuickCanonicalName(item.itemName);
    setQuickMapSearchQuery('');

    // Check if item is already mapped
    const currentMapping = mappings.find(m =>
      m.aliases.some((a: any) => a.name === item.itemName)
    );

    if (currentMapping) {
      // Item is already mapped
      setQuickCanonicalName(currentMapping.canonicalName);
      const aliasNames = new Set(currentMapping.aliases.map((a: any) => a.name));
      setQuickMapSelectedItems(aliasNames);
    } else {
      // New mapping
      setQuickMapSelectedItems(new Set([item.itemName]));
    }

    setQuickMapVisible(true);
  };

  const toggleQuickMapItem = (itemName: string) => {
    const newSelected = new Set(quickMapSelectedItems);

    // Don't allow unchecking if it's the only item and the main item
    if (itemName === quickMapItem?.itemName && newSelected.has(itemName) && newSelected.size === 1) {
      Alert.alert('Warning', 'You must select at least the current item');
      return;
    }

    if (newSelected.has(itemName)) {
      newSelected.delete(itemName);
    } else {
      newSelected.add(itemName);
    }
    setQuickMapSelectedItems(newSelected);
  };

  const getFilteredItemsForQuickMap = () => {
    // Get the current mapping for the quick map item
    const currentMapping = mappings.find(m =>
      m.aliases.some((a: any) => a.name === quickMapItem?.itemName)
    );

    return uniqueItems.filter(item => {
      // Exclude items that are mapped to different mappings
      if (item.isMapped && currentMapping && item.canonicalName !== currentMapping.canonicalName) {
        return false;
      }

      // Apply search filter
      if (quickMapSearchQuery) {
        const searchLower = quickMapSearchQuery.toLowerCase();
        return (
          item.itemName.toLowerCase().includes(searchLower) ||
          (item.itemParent && item.itemParent.toLowerCase().includes(searchLower))
        );
      }
      return true;
    });
  };

  const quickMapSubmit = async () => {
    if (!quickCanonicalName.trim()) {
      Alert.alert('Error', 'Please enter a canonical name');
      return;
    }

    if (quickMapSelectedItems.size === 0) {
      Alert.alert('Error', 'Please select at least one item');
      return;
    }

    try {
      setSaving(true);

      // Check if we need to delete existing mapping first
      const currentMapping = mappings.find(m =>
        m.aliases.some((a: any) => a.name === quickMapItem?.itemName)
      );

      if (currentMapping) {
        await itemAliasService.deleteMapping(token!, currentMapping._id);
      }

      // Create new mapping
      await itemAliasService.saveMapping(token!, {
        canonicalName: quickCanonicalName.trim(),
        aliases: Array.from(quickMapSelectedItems),
        description: currentMapping ? 'Updated mapping' : 'Quick mapped',
        autoMerge: true,
      });

      Alert.alert('Success', `Mapped ${quickMapSelectedItems.size} items to "${quickCanonicalName}"`);
      setQuickMapVisible(false);
      setQuickMapItem(null);
      setQuickCanonicalName('');
      setQuickMapSelectedItems(new Set());
      setQuickMapSearchQuery('');
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create mapping');
    } finally {
      setSaving(false);
    }
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
            Item Alias Mapping
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
              Loading item aliases...
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
                  <TagIcon size={18} color={theme.colors.white} />
                  <Typography variant="caption" style={styles.statLabel}>
                    Unique Items
                  </Typography>
                  <Typography variant="h2" weight="bold" style={styles.statValue}>
                    {stats.totalUniqueItems}
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
                    {stats.mappedItems}
                  </Typography>
                  <Typography variant="caption" style={styles.statSubtitle}>
                    {stats.totalUniqueItems > 0
                      ? Math.round((stats.mappedItems / stats.totalUniqueItems) * 100)
                      : 0}
                    % complete
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
                    {stats.unmappedItems}
                  </Typography>
                  <Typography variant="caption" style={styles.statSubtitle}>
                    Needs attention
                  </Typography>
                </View>
              </View>

              <View style={styles.statCardWrapper}>
                <View style={[styles.statCard, {backgroundColor: theme.colors.primary[600]}]}>
                  <LinkIcon size={18} color={theme.colors.white} />
                  <Typography variant="caption" style={styles.statLabel}>
                    Mappings
                  </Typography>
                  <Typography variant="h2" weight="bold" style={styles.statValue}>
                    {mappings.length}
                  </Typography>
                  <Typography variant="caption" style={styles.statSubtitle}>
                    Active
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
                  All Items
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
                placeholder="Search item names..."
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
            {!error && filteredItems.length === 0 && (
              <Card variant="outlined" padding="lg" style={styles.emptyCard}>
                <TagIcon size={48} color={theme.colors.gray[400]} />
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
                    : 'No items available'}
                </Typography>
              </Card>
            )}

            {/* Items List */}
            <View style={styles.itemsList}>
              {filteredItems.map((item, index) => {
                const isExpanded = expandedItems.has(item.itemName);
                const isMapped = Boolean(item.isMapped);

                return (
                  <Card
                    key={item.itemName || index}
                    variant="elevated"
                    padding="none"
                    style={[
                      styles.itemCard,
                      isMapped && styles.itemCardMapped,
                    ]}>
                    <TouchableOpacity
                      onPress={() => handleItemPress(item.itemName)}
                      style={styles.itemHeader}>
                      <View style={styles.itemHeaderLeft}>
                        <View style={styles.chevronContainer}>
                          {isExpanded ? (
                            <ChevronDownIcon size={20} color={theme.colors.gray[600]} />
                          ) : (
                            <ChevronRightIcon size={20} color={theme.colors.gray[600]} />
                          )}
                        </View>
                        <View style={styles.itemInfo}>
                          <Typography variant="body" weight="bold" numberOfLines={1}>
                            {item.itemName}
                          </Typography>
                          <Typography variant="caption" color={theme.colors.gray[500]} numberOfLines={1}>
                            {item.itemParent || 'No parent'}
                          </Typography>
                        </View>
                      </View>
                      <View style={styles.itemHeaderRight}>
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

                    {/* Item Details */}
                    <View style={styles.itemMeta}>
                      <View style={styles.metaRow}>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          Mapped To
                        </Typography>
                        <Typography variant="small" weight="medium" numberOfLines={1} style={{flex: 1, textAlign: 'right'}}>
                          {item.canonicalName || 'Not mapped'}
                        </Typography>
                      </View>
                      <View style={styles.metaRow}>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          Qty on Hand
                        </Typography>
                        <Typography variant="small" weight="medium">
                          {item.qtyOnHand !== undefined ? item.qtyOnHand.toFixed(2) : '0'}
                        </Typography>
                      </View>
                      <View style={styles.metaRow}>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          Occurrences
                        </Typography>
                        <Typography variant="small" weight="medium">
                          {item.occurrences || 0}
                        </Typography>
                      </View>
                    </View>

                    {/* Expanded Content */}
                    {isExpanded && !isMapped && (
                      <View style={styles.expandedContent}>
                        <Button
                          title="Quick Map This Item"
                          variant="primary"
                          onPress={() => openQuickMapModal(item)}
                          fullWidth
                        />
                      </View>
                    )}
                  </Card>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* Quick Map Modal */}
        <Modal
          visible={quickMapVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setQuickMapVisible(false)}>
          <SafeAreaView style={styles.modalContainer} edges={['top', 'left', 'right']}>
            <View style={styles.quickMapHeader}>
              <TouchableOpacity onPress={() => setQuickMapVisible(false)} style={styles.closeButton}>
                <Typography variant="body" color={theme.colors.primary[600]} weight="semibold">
                  Cancel
                </Typography>
              </TouchableOpacity>
              <Typography variant="h3" weight="bold" style={styles.modalTitle}>
                Quick Map
              </Typography>
              <View style={styles.closeButton} />
            </View>

            <ScrollView style={styles.quickMapScroll} contentContainerStyle={styles.quickMapContent}>
              {/* Main Item Info */}
              <Card variant="elevated" padding="md" style={styles.mainItemCard}>
                <Typography variant="small" color={theme.colors.primary[600]} weight="semibold">
                  MAIN ITEM
                </Typography>
                <Typography variant="body" weight="bold" style={{marginTop: 4}}>
                  {quickMapItem?.itemName}
                </Typography>
              </Card>

              {/* Canonical Name Input */}
              <View style={styles.inputSection}>
                <Typography variant="small" weight="semibold" style={styles.inputLabel}>
                  Canonical Name (Master Name) *
                </Typography>
                <RNTextInput
                  style={styles.textInput}
                  placeholder="Enter canonical name"
                  value={quickCanonicalName}
                  onChangeText={setQuickCanonicalName}
                  placeholderTextColor={theme.colors.gray[400]}
                />
                <Typography variant="caption" color={theme.colors.gray[500]} style={{marginTop: 4}}>
                  All selected items will be displayed as this name in reports
                </Typography>
              </View>

              {/* Selected Items */}
              <Card variant="elevated" padding="md" style={styles.selectedItemsCard}>
                <Typography variant="small" weight="semibold" color={theme.colors.success[700]}>
                  Selected Items ({quickMapSelectedItems.size})
                </Typography>
                <View style={styles.selectedItemsContainer}>
                  {Array.from(quickMapSelectedItems).map((name, idx) => (
                    <View key={idx} style={styles.selectedItemChip}>
                      <Typography variant="caption" color={theme.colors.success[700]}>
                        {name}
                      </Typography>
                    </View>
                  ))}
                </View>
              </Card>

              {/* Search Items */}
              <View style={styles.inputSection}>
                <Typography variant="small" weight="semibold" style={styles.inputLabel}>
                  Select Items to Group Together
                </Typography>
                <RNTextInput
                  style={styles.textInput}
                  placeholder="Search items to combine..."
                  value={quickMapSearchQuery}
                  onChangeText={setQuickMapSearchQuery}
                  placeholderTextColor={theme.colors.gray[400]}
                />
              </View>

              {/* Items List */}
              <Card variant="elevated" padding="none" style={styles.itemsListCard}>
                {getFilteredItemsForQuickMap().map((item, idx) => {
                  const isSelected = quickMapSelectedItems.has(item.itemName);
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.selectableItem,
                        isSelected && styles.selectableItemSelected,
                        idx > 0 && styles.selectableItemBorder,
                      ]}
                      onPress={() => toggleQuickMapItem(item.itemName)}>
                      <View style={styles.checkboxContainer}>
                        <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                          {isSelected && <CheckCircleIcon size={16} color={theme.colors.white} />}
                        </View>
                      </View>
                      <View style={styles.selectableItemContent}>
                        <Typography variant="small" weight={isSelected ? 'semibold' : 'regular'} numberOfLines={1}>
                          {item.itemName}
                          {item.itemName === quickMapItem?.itemName && (
                            <Typography variant="caption" color={theme.colors.primary[600]}> (Main)</Typography>
                          )}
                        </Typography>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          {item.itemParent || 'No parent'} • Qty: {item.qtyOnHand?.toFixed(2) || '0'}
                        </Typography>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </Card>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <Button
                  title={`Map ${quickMapSelectedItems.size} Items`}
                  variant="primary"
                  onPress={quickMapSubmit}
                  disabled={saving || !quickCanonicalName.trim()}
                  fullWidth
                />
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.gray[50],
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.white,
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
  quickMapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
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
  quickMapScroll: {
    flex: 1,
  },
  quickMapContent: {
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
  itemsList: {
    gap: theme.spacing.md,
  },
  itemCard: {
    marginBottom: 0,
    overflow: 'hidden',
  },
  itemCardMapped: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.success[500],
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
  itemInfo: {
    flex: 1,
  },
  itemHeaderRight: {
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
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
  mainItemCard: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.primary[50],
  },
  inputSection: {
    marginBottom: theme.spacing.md,
  },
  inputLabel: {
    marginBottom: theme.spacing.sm,
    color: theme.colors.gray[700],
  },
  textInput: {
    backgroundColor: theme.colors.gray[100],
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.gray[900],
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
  },
  selectedItemsCard: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.success[50],
  },
  selectedItemsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: theme.spacing.sm,
  },
  selectedItemChip: {
    backgroundColor: theme.colors.success[100],
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  itemsListCard: {
    marginBottom: theme.spacing.md,
    maxHeight: 400,
  },
  selectableItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.white,
  },
  selectableItemSelected: {
    backgroundColor: theme.colors.success[50],
  },
  selectableItemBorder: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
  },
  checkboxContainer: {
    marginRight: theme.spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: theme.colors.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.white,
  },
  checkboxChecked: {
    borderColor: theme.colors.success[600],
    backgroundColor: theme.colors.success[600],
  },
  selectableItemContent: {
    flex: 1,
  },
  actionButtons: {
    marginTop: theme.spacing.md,
  },
});
