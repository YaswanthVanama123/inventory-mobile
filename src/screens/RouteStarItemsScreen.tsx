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
  Switch,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {Button} from '../components/atoms/Button';
import {PickerModal} from '../components/molecules/PickerModal';
import {useAuth} from '../contexts/AuthContext';
import {useApiErrorHandler} from '../hooks/useApiErrorHandler';
import {theme} from '../theme';
import routeStarItemsService from '../services/routeStarItemsService';
import {
  AlertCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  BoxIcon,
  CheckCircleIcon,
  WarningIcon,
  TagIcon,
} from '../components/icons';

interface RouteStarItemsScreenProps {
  visible: boolean;
  onClose: () => void;
}

export const RouteStarItemsScreen: React.FC<RouteStarItemsScreenProps> = ({
  visible,
  onClose,
}) => {
  const {token} = useAuth();
  const {handleApiError} = useApiErrorHandler();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterForUse, setFilterForUse] = useState(false);
  const [filterForSell, setFilterForSell] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    forUse: 0,
    forSell: 0,
    both: 0,
    unmarked: 0,
  });

  useEffect(() => {
    if (visible && token) {
      loadData();
    }
  }, [visible, token, filterForUse, filterForSell]);

  // Debounced search
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

      const params: any = {
        page: 1,
        limit: 100,
      };

      if (searchQuery) params.search = searchQuery;
      if (filterForUse) params.forUse = true;
      if (filterForSell) params.forSell = true;

      const [itemsData, statsData] = await Promise.all([
        routeStarItemsService.getItems(token, params),
        routeStarItemsService.getStats(token),
      ]);

      setItems(itemsData.items || []);
      setStats(statsData || {total: 0, forUse: 0, forSell: 0, both: 0, unmarked: 0});
    } catch (error: any) {
      console.error('Failed to fetch RouteS tar items:', error);

      // Check if token expired and handle auto-logout
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

  const handleItemPress = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const handleFlagChange = async (itemId: string, flagType: 'forUse' | 'forSell', currentValue: boolean) => {
    try {
      const updatedItem = await routeStarItemsService.updateItemFlags(token!, itemId, {
        [flagType]: !currentValue,
      });

      // Update local state
      setItems(prevItems =>
        prevItems.map(item =>
          item._id === itemId ? {...item, [flagType]: updatedItem[flagType]} : item
        )
      );

      // Refresh stats
      const statsData = await routeStarItemsService.getStats(token!);
      setStats(statsData);

      Alert.alert('Success', 'Item updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update item');
    }
  };

  const handleCategoryChange = async (itemId: string, newCategory: string) => {
    try {
      const updatedItem = await routeStarItemsService.updateItemFlags(token!, itemId, {
        itemCategory: newCategory,
      });

      // Update local state
      setItems(prevItems =>
        prevItems.map(item =>
          item._id === itemId ? {...item, itemCategory: updatedItem.itemCategory} : item
        )
      );

      Alert.alert('Success', 'Item category updated');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update category');
    }
  };

  const handleSync = async () => {
    Alert.alert(
      'Sync Items',
      'This will fetch the latest items from RouteStar. Continue?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Sync',
          onPress: async () => {
            try {
              setSyncing(true);
              const result = await routeStarItemsService.syncItems(token!);
              Alert.alert('Success', result.message || 'Items synced successfully');
              loadData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to sync items');
            } finally {
              setSyncing(false);
            }
          },
        },
      ]
    );
  };

  const getItemStatus = (item: any) => {
    if (item.forUse && item.forSell) return 'both';
    if (item.forUse) return 'forUse';
    if (item.forSell) return 'forSell';
    return 'unmarked';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'both':
        return theme.colors.primary[600];
      case 'forUse':
        return theme.colors.primary[600];
      case 'forSell':
        return theme.colors.success[600];
      default:
        return theme.colors.warning[600];
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'both':
        return theme.colors.primary[100];
      case 'forUse':
        return theme.colors.primary[100];
      case 'forSell':
        return theme.colors.success[100];
      default:
        return theme.colors.warning[100];
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'both':
        return 'Both';
      case 'forUse':
        return 'For Use';
      case 'forSell':
        return 'For Sell';
      default:
        return 'Unmarked';
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
            RouteStar Items
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
            {/* Stats Cards */}
            <View style={styles.statsGrid}>
              <View style={[styles.statCardWrapper, {width: '50%'}]}>
                <View style={[styles.statCard, {backgroundColor: theme.colors.gray[600]}]}>
                  <BoxIcon size={18} color={theme.colors.white} />
                  <Typography variant="caption" style={styles.statLabel}>
                    Total Items
                  </Typography>
                  <Typography variant="h2" weight="bold" style={styles.statValue}>
                    {stats.total}
                  </Typography>
                </View>
              </View>

              <View style={[styles.statCardWrapper, {width: '50%'}]}>
                <View style={[styles.statCard, {backgroundColor: theme.colors.primary[600]}]}>
                  <CheckCircleIcon size={18} color={theme.colors.white} />
                  <Typography variant="caption" style={styles.statLabel}>
                    For Use
                  </Typography>
                  <Typography variant="h2" weight="bold" style={styles.statValue}>
                    {stats.forUse}
                  </Typography>
                </View>
              </View>

              <View style={[styles.statCardWrapper, {width: '33.33%'}]}>
                <View style={[styles.statCard, {backgroundColor: theme.colors.success[600]}]}>
                  <TagIcon size={16} color={theme.colors.white} />
                  <Typography variant="caption" style={styles.statLabel}>
                    For Sell
                  </Typography>
                  <Typography variant="h3" weight="bold" style={styles.statValue}>
                    {stats.forSell}
                  </Typography>
                </View>
              </View>

              <View style={[styles.statCardWrapper, {width: '33.33%'}]}>
                <View style={[styles.statCard, {backgroundColor: theme.colors.primary[700]}]}>
                  <CheckCircleIcon size={16} color={theme.colors.white} />
                  <Typography variant="caption" style={styles.statLabel}>
                    Both
                  </Typography>
                  <Typography variant="h3" weight="bold" style={styles.statValue}>
                    {stats.both}
                  </Typography>
                </View>
              </View>

              <View style={[styles.statCardWrapper, {width: '33.33%'}]}>
                <View style={[styles.statCard, {backgroundColor: theme.colors.warning[600]}]}>
                  <WarningIcon size={16} color={theme.colors.white} />
                  <Typography variant="caption" style={styles.statLabel}>
                    Unmarked
                  </Typography>
                  <Typography variant="h3" weight="bold" style={styles.statValue}>
                    {stats.unmarked}
                  </Typography>
                </View>
              </View>
            </View>

            {/* Sync Button */}
            <View style={styles.syncButtonContainer}>
              <Button
                title={syncing ? 'Syncing...' : 'Sync Items'}
                variant="primary"
                onPress={handleSync}
                disabled={syncing}
                fullWidth
              />
            </View>

            {/* Filters */}
            <Card variant="elevated" padding="md" style={styles.filterCard}>
              <View style={styles.filterRow}>
                <Typography variant="small" weight="medium">
                  Show only "For Use"
                </Typography>
                <Switch
                  value={filterForUse}
                  onValueChange={setFilterForUse}
                  trackColor={{false: theme.colors.gray[300], true: theme.colors.primary[600]}}
                  thumbColor={theme.colors.white}
                />
              </View>
              <View style={styles.filterRow}>
                <Typography variant="small" weight="medium">
                  Show only "For Sell"
                </Typography>
                <Switch
                  value={filterForSell}
                  onValueChange={setFilterForSell}
                  trackColor={{false: theme.colors.gray[300], true: theme.colors.success[600]}}
                  thumbColor={theme.colors.white}
                />
              </View>
            </Card>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <RNTextInput
                style={styles.searchInput}
                placeholder="Search items..."
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
                <BoxIcon size={48} color={theme.colors.gray[400]} />
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
                    : 'Sync items to get started'}
                </Typography>
              </Card>
            )}

            {/* Items List */}
            <View style={styles.itemsList}>
              {items.map((item, index) => {
                const isExpanded = expandedItems.has(item._id);
                const status = getItemStatus(item);

                return (
                  <Card
                    key={item._id || index}
                    variant="elevated"
                    padding="none"
                    style={styles.itemCard}>
                    <TouchableOpacity
                      onPress={() => handleItemPress(item._id)}
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
                        <View style={[styles.statusBadge, {backgroundColor: getStatusBgColor(status)}]}>
                          <Typography
                            variant="caption"
                            weight="semibold"
                            color={getStatusColor(status)}>
                            {getStatusLabel(status)}
                          </Typography>
                        </View>
                      </View>
                    </TouchableOpacity>

                    {/* Item Meta */}
                    <View style={styles.itemMeta}>
                      <View style={styles.metaRow}>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          Category
                        </Typography>
                        <Typography variant="small" weight="medium">
                          {item.itemCategory || 'Item'}
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
                      {item.description && (
                        <View style={styles.metaRow}>
                          <Typography variant="caption" color={theme.colors.gray[500]} numberOfLines={2} style={{flex: 1}}>
                            {item.description}
                          </Typography>
                        </View>
                      )}
                    </View>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <View style={styles.expandedContent}>
                        <View style={styles.flagSection}>
                          <View style={styles.flagRow}>
                            <Typography variant="small" weight="medium">
                              For Use
                            </Typography>
                            <Switch
                              value={item.forUse || false}
                              onValueChange={() => handleFlagChange(item._id, 'forUse', item.forUse)}
                              trackColor={{false: theme.colors.gray[300], true: theme.colors.primary[600]}}
                              thumbColor={theme.colors.white}
                            />
                          </View>
                          <View style={styles.flagRow}>
                            <Typography variant="small" weight="medium">
                              For Sell
                            </Typography>
                            <Switch
                              value={item.forSell || false}
                              onValueChange={() => handleFlagChange(item._id, 'forSell', item.forSell)}
                              trackColor={{false: theme.colors.gray[300], true: theme.colors.success[600]}}
                              thumbColor={theme.colors.white}
                            />
                          </View>
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: theme.spacing.lg,
  },
  statCardWrapper: {
    padding: 4,
  },
  statCard: {
    borderRadius: 12,
    padding: 12,
    minHeight: 100,
  },
  statLabel: {
    color: '#ffffff',
    fontSize: 11,
    opacity: 0.9,
    marginTop: 6,
    marginBottom: 4,
  },
  statValue: {
    color: '#ffffff',
    fontSize: 22,
  },
  syncButtonContainer: {
    marginBottom: theme.spacing.md,
  },
  filterCard: {
    marginBottom: theme.spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
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
  flagSection: {
    gap: theme.spacing.md,
  },
  flagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
  },
});
