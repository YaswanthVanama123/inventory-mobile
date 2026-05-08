import React, {useState, useEffect} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput as RNTextInput,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {Button} from '../components/atoms/Button';
import {useAuth} from '../contexts/AuthContext';
import {useApiErrorHandler} from '../hooks/useApiErrorHandler';
import {theme} from '../theme';
import screenPermissionService, {Screen} from '../services/screenPermissionService';
import {
  GridIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  RefreshIcon,
  CheckCircleIcon,
  XCircleIcon,
  SearchIcon,
  CheckIcon,
  XIcon,
} from '../components/icons';

interface ScreenManagementScreenProps {
  visible: boolean;
  onClose: () => void;
}

export const ScreenManagementScreen: React.FC<ScreenManagementScreenProps> = ({
  visible,
  onClose,
}) => {
  const {token} = useAuth();
  const {handleApiError} = useApiErrorHandler();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [filteredScreens, setFilteredScreens] = useState<Screen[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  const categories = [
    'Dashboard',
    'RouteStar',
    'CustomerConnect',
    'Reports',
    'Settings',
    'Stock',
    'Checkouts',
    'Manual PO Items',
    'Vendors',
    'Inventory Items',
    'Discrepancies',
    'Other',
  ];

  useEffect(() => {
    if (visible && token) {
      loadData();
    }
  }, [visible, token]);

  useEffect(() => {
    filterScreens();
  }, [searchQuery, categoryFilter, screens]);

  const loadData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const data = await screenPermissionService.getAllScreens(token);
      console.log('[ScreenManagementScreen] Data loaded:', data?.length || 0);
      setScreens(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Failed to fetch screens:', error);
      const wasHandled = await handleApiError(error);
      if (wasHandled) return;
      setError(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterScreens = () => {
    let filtered = screens;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        screen =>
          screen.displayName.toLowerCase().includes(query) ||
          screen.name.toLowerCase().includes(query) ||
          screen.path.toLowerCase().includes(query)
      );
    }

    if (categoryFilter) {
      filtered = filtered.filter(screen => screen.category === categoryFilter);
    }

    setFilteredScreens(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleInitialize = () => {
    Alert.alert(
      'Initialize Screens',
      'This will create default screens based on your application routes. Continue?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Initialize',
          onPress: async () => {
            try {
              setLoading(true);
              await screenPermissionService.initializeScreens(token!);
              Alert.alert('Success', 'Screens initialized successfully');
              loadData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to initialize screens');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDelete = (screen: Screen) => {
    Alert.alert(
      'Delete Screen',
      `Are you sure you want to delete "${screen.displayName}"? All user permissions for this screen will also be deleted.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await screenPermissionService.deleteScreen(token!, screen._id);
              Alert.alert('Success', 'Screen deleted successfully');
              loadData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete screen');
            }
          },
        },
      ]
    );
  };

  const renderScreenItem = (screen: Screen) => (
    <Card key={screen._id} variant="elevated" padding="md" style={styles.screenCard}>
      <View style={styles.screenHeader}>
        <View style={styles.screenInfo}>
          <Typography variant="body" weight="semibold">
            {screen.displayName}
          </Typography>
          <Typography variant="caption" color={theme.colors.gray[500]} style={styles.screenName}>
            {screen.name}
          </Typography>
          <Typography
            variant="caption"
            color={theme.colors.gray[500]}
            style={styles.screenPath}>
            {screen.path}
          </Typography>
        </View>
        <TouchableOpacity onPress={() => handleDelete(screen)} style={styles.deleteButton}>
          <TrashIcon size={18} color={theme.colors.error[600]} />
        </TouchableOpacity>
      </View>

      <View style={styles.screenDetails}>
        <View style={styles.badge}>
          <Typography variant="caption" color={theme.colors.info[700]} weight="medium">
            {screen.category}
          </Typography>
        </View>

        <View style={styles.statusRow}>
          <View style={styles.statusItem}>
            {screen.isActive ? (
              <>
                <CheckCircleIcon size={14} color={theme.colors.success[600]} />
                <Typography variant="caption" color={theme.colors.success[600]}>
                  Active
                </Typography>
              </>
            ) : (
              <>
                <XCircleIcon size={14} color={theme.colors.error[600]} />
                <Typography variant="caption" color={theme.colors.error[600]}>
                  Inactive
                </Typography>
              </>
            )}
          </View>

          {screen.isDefault && (
            <View style={styles.defaultBadge}>
              <CheckIcon size={12} color={theme.colors.primary[700]} />
              <Typography variant="caption" color={theme.colors.primary[700]} weight="medium">
                Default
              </Typography>
            </View>
          )}
        </View>
      </View>
    </Card>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconContainer, styles.headerIcon]}>
              <GridIcon size={22} color={theme.colors.accent[600]} />
            </View>
            <View>
              <Typography variant="h2" weight="bold">
                Screen Management
              </Typography>
              <Typography variant="caption" color={theme.colors.gray[500]}>
                Manage application screens
              </Typography>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <XIcon size={24} color={theme.colors.gray[600]} />
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            variant="outline"
            size="sm"
            onPress={handleInitialize}
            style={styles.actionButton}>
            <RefreshIcon size={16} color={theme.colors.gray[700]} />
            <Typography variant="small" weight="medium" color={theme.colors.gray[700]}>
              Initialize Screens
            </Typography>
          </Button>
        </View>

        {/* Search and Filter */}
        <View style={styles.filterSection}>
          <View style={styles.searchContainer}>
            <SearchIcon size={18} color={theme.colors.gray[400]} />
            <RNTextInput
              style={styles.searchInput}
              placeholder="Search screens..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={theme.colors.gray[400]}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <XIcon size={18} color={theme.colors.gray[400]} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Category Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContainer}>
          <TouchableOpacity
            style={[
              styles.categoryPill,
              !categoryFilter && styles.categoryPillActive,
            ]}
            onPress={() => setCategoryFilter('')}>
            <Typography
              variant="caption"
              weight="medium"
              color={
                !categoryFilter ? theme.colors.white : theme.colors.gray[700]
              }>
              All
            </Typography>
          </TouchableOpacity>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryPill,
                categoryFilter === cat && styles.categoryPillActive,
              ]}
              onPress={() => setCategoryFilter(cat === categoryFilter ? '' : cat)}>
              <Typography
                variant="caption"
                weight="medium"
                color={
                  categoryFilter === cat
                    ? theme.colors.white
                    : theme.colors.gray[700]
                }>
                {cat}
              </Typography>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Content */}
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary[600]} />
            <Typography
              variant="body"
              color={theme.colors.gray[500]}
              style={styles.loadingText}>
              Loading screens...
            </Typography>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Typography variant="body" color={theme.colors.error[600]}>
              {error}
            </Typography>
            <Button variant="outline" size="sm" onPress={loadData} style={styles.retryButton}>
              Retry
            </Button>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.colors.primary[600]}
              />
            }>
            {filteredScreens.length === 0 ? (
              <View style={styles.emptyContainer}>
                <GridIcon size={48} color={theme.colors.gray[300]} />
                <Typography
                  variant="body"
                  color={theme.colors.gray[500]}
                  style={styles.emptyText}>
                  {searchQuery || categoryFilter
                    ? 'No screens match your filters'
                    : 'No screens found'}
                </Typography>
              </View>
            ) : (
              <>
                <View style={styles.statsRow}>
                  <Typography variant="small" color={theme.colors.gray[600]}>
                    {filteredScreens.length} screen{filteredScreens.length !== 1 ? 's' : ''} found
                  </Typography>
                </View>
                {filteredScreens.map(renderScreenItem)}
              </>
            )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    backgroundColor: theme.colors.accent[100],
  },
  closeButton: {
    padding: theme.spacing.sm,
  },
  actions: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  actionButton: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    backgroundColor: theme.colors.white,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.gray[100],
    borderRadius: 10,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.gray[900],
    padding: 0,
  },
  categoryScroll: {
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  categoryContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.gray[100],
  },
  categoryPillActive: {
    backgroundColor: theme.colors.primary[600],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
  },
  statsRow: {
    marginBottom: theme.spacing.md,
  },
  screenCard: {
    marginBottom: theme.spacing.md,
  },
  screenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  screenInfo: {
    flex: 1,
  },
  screenName: {
    marginTop: 2,
  },
  screenPath: {
    marginTop: 2,
    fontFamily: 'monospace',
  },
  deleteButton: {
    padding: theme.spacing.sm,
  },
  screenDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.info[100],
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary[100],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  retryButton: {
    marginTop: theme.spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: theme.spacing.xl * 2,
  },
  emptyText: {
    marginTop: theme.spacing.md,
  },
});
