import React, {useState, useEffect, useMemo, useRef} from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  TextInput as RNTextInput,
  Alert,
  Switch,
  Animated,
  Easing,
} from 'react-native';
import {PaginatedList} from '../components/molecules/PaginatedList';
import {Pagination} from '../components/molecules/Pagination';
import {PickerModal} from '../components/molecules/PickerModal';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {Button} from '../components/atoms/Button';
import {useAuth} from '../contexts/AuthContext';
import {useApiErrorHandler} from '../hooks/useApiErrorHandler';
import {useTheme} from '../contexts/ThemeContext';
import {Theme} from '../theme';
import {useBreakpoint, BreakpointInfo} from '../utils/breakpoints';
import routeStarItemsService from '../services/routeStarItemsService';
import useDebounce from '../hooks/useDebounce';
import {useServerPagination} from '../hooks/useServerPagination';
import {
  AlertCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  BoxIcon,
  CheckCircleIcon,
  WarningIcon,
  TagIcon,
  CloseIcon,
  RefreshIcon,
  SearchIcon,
  TrashIcon,
} from '../components/icons';

interface RouteStarItemsScreenProps {
  visible: boolean;
  onClose: () => void;
}

export const RouteStarItemsScreen: React.FC<RouteStarItemsScreenProps> = ({
  visible,
  onClose,
}) => {
  const theme = useTheme();
  const bp = useBreakpoint();
  const styles = useMemo(() => makeStyles(theme, bp), [theme, bp]);
  const {token, user} = useAuth();
  const {handleApiError} = useApiErrorHandler();
  const isAdmin = user?.role === 'admin';
  const [syncing, setSyncing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 500);
  const [filterForUse, setFilterForUse] = useState(false);
  const [filterForSell, setFilterForSell] = useState(false);
  const [filterMapped, setFilterMapped] = useState('all');
  const [selectedParent, setSelectedParent] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({total: 0, forUse: 0, forSell: 0, both: 0, unmarked: 0});
  const [filterOptions, setFilterOptions] = useState<{itemParents: string[]; types: string[]}>({
    itemParents: [],
    types: [],
  });
  const [parentPickerVisible, setParentPickerVisible] = useState(false);
  const [typePickerVisible, setTypePickerVisible] = useState(false);

  const heroFade = useRef(new Animated.Value(1)).current;
  const heroSlide = useRef(new Animated.Value(0)).current;
  const blobPulse = useRef(new Animated.Value(0)).current;

  const filterKey = `${debouncedSearch}|${filterForUse}|${filterForSell}|${filterMapped}|${selectedParent}|${selectedType}|${selectedCategory}`;

  // Server-side numbered pagination — replaces the old hardcoded limit:100/page:1.
  const {
    items,
    setItems,
    loading,
    initialLoading,
    refreshing,
    error,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    extra,
    refresh,
    refetch,
  } = useServerPagination<any>(
    async (pg, limit) => {
      const params: any = {page: pg, limit};
      if (debouncedSearch) params.search = debouncedSearch;
      if (filterForUse) params.forUse = true;
      if (filterForSell) params.forSell = true;
      if (filterMapped !== 'all') params.mapped = filterMapped;
      if (selectedParent !== 'all') params.itemParent = selectedParent;
      if (selectedType !== 'all') params.type = selectedType;
      if (selectedCategory !== 'all') params.itemCategory = selectedCategory;
      try {
        const data = await routeStarItemsService.getItemsWithStats(token!, params);
        return {
          items: data.items || [],
          total: data.pagination?.total ?? (data.items ? data.items.length : 0),
          pages: data.pagination?.pages ?? 1,
          extra: {stats: data.stats, filters: data.filters},
        };
      } catch (e) {
        await handleApiError(e);
        throw e;
      }
    },
    {pageSize: 50, resetKey: filterKey, enabled: !!(visible && token)},
  );
  const loadData = refetch;
  const onRefresh = refresh;

  // Keep stats + filter dropdown options in sync with the latest page fetch.
  useEffect(() => {
    if (extra?.stats) setStats(extra.stats);
    if (extra?.filters) setFilterOptions(extra.filters);
  }, [extra]);

  useEffect(() => {
    if (visible) {
      heroFade.setValue(0.6);
      heroSlide.setValue(16);
      Animated.parallel([
        Animated.timing(heroFade, {toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true}),
        Animated.timing(heroSlide, {toValue: 0, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true}),
      ]).start();
    }
  }, [visible, heroFade, heroSlide]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(blobPulse, {toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true}),
        Animated.timing(blobPulse, {toValue: 0, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true}),
      ]),
    ).start();
  }, [blobPulse]);

  const handleItemPress = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) newExpanded.delete(itemId);
    else newExpanded.add(itemId);
    setExpandedItems(newExpanded);
  };

  const handleFlagChange = async (itemId: string, flagType: 'forUse' | 'forSell', currentValue: boolean) => {
    try {
      const updatedItem = await routeStarItemsService.updateItemFlags(token!, itemId, {
        [flagType]: !currentValue,
      });
      setItems(prevItems =>
        prevItems.map(item =>
          item._id === itemId ? {...item, [flagType]: updatedItem[flagType]} : item,
        ),
      );
      const statsData = await routeStarItemsService.getStats(token!);
      setStats(statsData);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update item');
    }
  };

  const handleCategoryChange = async (itemId: string, newCategory: string) => {
    try {
      const updatedItem = await routeStarItemsService.updateItemFlags(token!, itemId, {
        itemCategory: newCategory,
      });
      setItems(prevItems =>
        prevItems.map(item =>
          item._id === itemId ? {...item, itemCategory: updatedItem.itemCategory} : item,
        ),
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update item category');
    }
  };

  const handleDeleteAll = () => {
    Alert.alert(
      'Delete All Items',
      'Are you sure you want to delete ALL items? This action cannot be undone!',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              const result = await routeStarItemsService.deleteAllItems(token!);
              Alert.alert('Success', result?.message || 'All items deleted');
              loadData();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete items');
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
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
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to sync items');
            } finally {
              setSyncing(false);
            }
          },
        },
      ],
    );
  };

  const blobScale = blobPulse.interpolate({inputRange: [0, 1], outputRange: [1, 1.08]});
  const blobOpacity = blobPulse.interpolate({inputRange: [0, 1], outputRange: [0.18, 0.28]});

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {initialLoading ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingMark}>
              <BoxIcon size={22} color={theme.colors.primary[600]} />
            </View>
            <ActivityIndicator size="large" color={theme.colors.primary[600]} />
            <Typography variant="body" color={theme.colors.gray[600]} style={{marginTop: 16}}>
              Loading items...
            </Typography>
          </View>
        ) : (
          <PaginatedList
            data={items}
            keyExtractor={(item, index) => item._id || String(index)}
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, styles.contentWrap]}
            refreshing={refreshing}
            onRefresh={onRefresh}
            resetKey={filterKey}
            pagedMode
            scrollTopKey={page}
            ListFooterComponent={
              total > 0 ? (
                <View style={{paddingHorizontal: bp.gutter, marginTop: theme.spacing.md}}>
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    totalItems={total}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                  />
                </View>
              ) : null
            }
            ItemSeparatorComponent={() => <View style={{height: 12}} />}
            ListHeaderComponent={
              <View>
                <View style={styles.hero}>
                  <Animated.View style={[styles.blob, styles.blobOne, {transform: [{scale: blobScale}], opacity: blobOpacity}]} />
                  <Animated.View style={[styles.blob, styles.blobTwo, {transform: [{scale: blobScale}], opacity: blobOpacity}]} />
                  <View style={styles.dotGrid} pointerEvents="none">
                    {Array.from({length: 18}).map((_, i) => <View key={i} style={styles.dot} />)}
                  </View>

                  <Animated.View style={[styles.heroBody, {opacity: heroFade, transform: [{translateY: heroSlide}]}]}>
                    <View style={styles.heroTopRow}>
                      <TouchableOpacity onPress={onClose} style={styles.heroIconBtn} activeOpacity={0.85}>
                        <CloseIcon size={16} color={theme.colors.brand.text} />
                      </TouchableOpacity>
                      <View style={{flex: 1}}>
                        <Typography variant="caption" weight="semibold" color={theme.colors.brand.textTracked} style={styles.heroEyebrow}>
                          ROUTESTAR
                        </Typography>
                        <Typography variant="h2" weight="bold" color={theme.colors.brand.text} style={styles.heroTitle}>
                          Items Catalog
                        </Typography>
                        <Typography variant="small" color={theme.colors.brand.textMuted}>
                          Synced from RouteStar · use vs sell flags
                        </Typography>
                      </View>
                      <TouchableOpacity onPress={loadData} style={styles.heroIconBtn} activeOpacity={0.85}>
                        <RefreshIcon size={18} color={theme.colors.brand.text} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.statusChip}>
                      <View style={styles.statusDot} />
                      <Typography variant="caption" weight="semibold" color={theme.colors.brand.text}>
                        {stats.total} items · {stats.both} both · {stats.unmarked} unmarked
                      </Typography>
                    </View>

                    <View style={styles.heroMetricsRow}>
                      <View style={styles.heroMetric}>
                        <Typography variant="caption" weight="semibold" color={theme.colors.brand.textMuted} style={styles.heroMetricLabel}>
                          TOTAL
                        </Typography>
                        <Typography variant="h3" weight="bold" color={theme.colors.brand.text}>
                          {stats.total}
                        </Typography>
                      </View>
                      <View style={styles.heroMetricDivider} />
                      <View style={styles.heroMetric}>
                        <Typography variant="caption" weight="semibold" color={theme.colors.brand.textMuted} style={styles.heroMetricLabel}>
                          FOR USE
                        </Typography>
                        <Typography variant="h3" weight="bold" color={theme.colors.brand.text}>
                          {stats.forUse}
                        </Typography>
                      </View>
                      <View style={styles.heroMetricDivider} />
                      <View style={styles.heroMetric}>
                        <Typography variant="caption" weight="semibold" color={theme.colors.brand.textMuted} style={styles.heroMetricLabel}>
                          FOR SELL
                        </Typography>
                        <Typography variant="h3" weight="bold" color={theme.colors.brand.text}>
                          {stats.forSell}
                        </Typography>
                      </View>
                    </View>
                  </Animated.View>
                </View>

                <View style={styles.searchWrap}>
                  <View style={styles.searchCard}>
                    <SearchIcon size={18} color={theme.colors.gray[500]} />
                    <RNTextInput
                      style={styles.searchInput}
                      placeholder="Search items..."
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholderTextColor={theme.colors.gray[400]}
                    />
                    {searchQuery ? (
                      <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClear} activeOpacity={0.7}>
                        <CloseIcon size={14} color={theme.colors.gray[500]} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>

                <View style={styles.actionWrap}>
                  <Button
                    title={syncing ? 'Syncing items...' : 'Sync items from RouteStar'}
                    variant="primary"
                    onPress={handleSync}
                    disabled={syncing || deleting}
                    fullWidth
                    leftIcon={<RefreshIcon size={16} color={theme.colors.brand.text} />}
                  />
                  {isAdmin && (
                    <Button
                      title={deleting ? 'Deleting...' : 'Delete All'}
                      variant="danger"
                      onPress={handleDeleteAll}
                      disabled={syncing || deleting}
                      fullWidth
                      leftIcon={<TrashIcon size={16} color={theme.colors.white} />}
                      style={{marginTop: theme.spacing.sm}}
                    />
                  )}
                </View>

                <View style={styles.filtersWrap}>
                  <View style={styles.filterCard}>
                    <TouchableOpacity
                      style={styles.dropdownRow}
                      onPress={() => setParentPickerVisible(true)}
                      activeOpacity={0.7}>
                      <Typography variant="small" weight="semibold" color={theme.colors.gray[600]}>
                        Parent
                      </Typography>
                      <View style={styles.dropdownValue}>
                        <Typography
                          variant="small"
                          color={selectedParent !== 'all' ? theme.colors.gray[900] : theme.colors.gray[500]}
                          numberOfLines={1}>
                          {selectedParent === 'all' ? 'All Parents' : selectedParent}
                        </Typography>
                        <ChevronDownIcon size={16} color={theme.colors.gray[500]} />
                      </View>
                    </TouchableOpacity>
                    <View style={styles.filterDivider} />
                    <TouchableOpacity
                      style={styles.dropdownRow}
                      onPress={() => setTypePickerVisible(true)}
                      activeOpacity={0.7}>
                      <Typography variant="small" weight="semibold" color={theme.colors.gray[600]}>
                        Type
                      </Typography>
                      <View style={styles.dropdownValue}>
                        <Typography
                          variant="small"
                          color={selectedType !== 'all' ? theme.colors.gray[900] : theme.colors.gray[500]}
                          numberOfLines={1}>
                          {selectedType === 'all' ? 'All Types' : selectedType}
                        </Typography>
                        <ChevronDownIcon size={16} color={theme.colors.gray[500]} />
                      </View>
                    </TouchableOpacity>
                    <View style={styles.filterDivider} />
                    <View style={styles.filterRowVertical}>
                      <Typography variant="caption" weight="semibold" color={theme.colors.gray[600]} style={styles.filterLabel}>
                        CATEGORY
                      </Typography>
                      <View style={styles.statusFiltersRow}>
                        {(['all', 'Item', 'Service'] as const).map(opt => {
                          const active = selectedCategory === opt;
                          return (
                            <TouchableOpacity
                              key={opt}
                              onPress={() => setSelectedCategory(opt)}
                              style={[styles.statusFilterPill, active && styles.statusFilterPillActive]}
                              activeOpacity={0.85}>
                              <Typography
                                variant="caption"
                                weight="semibold"
                                color={active ? theme.colors.white : theme.colors.gray[700]}>
                                {opt === 'all' ? 'All' : opt}
                              </Typography>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.filtersWrap}>
                  <View style={styles.filterCard}>
                    <View style={styles.filterRow}>
                      <View style={styles.filterRowLeft}>
                        <View style={[styles.filterIconWrap, {backgroundColor: theme.colors.primary[50]}]}>
                          <CheckCircleIcon size={14} color={theme.colors.primary[600]} />
                        </View>
                        <Typography variant="small" weight="semibold">
                          Show only "For Use"
                        </Typography>
                      </View>
                      <Switch
                        value={filterForUse}
                        onValueChange={setFilterForUse}
                        trackColor={{false: theme.colors.gray[300], true: theme.colors.primary[600]}}
                        thumbColor={theme.colors.white}
                      />
                    </View>
                    <View style={styles.filterDivider} />
                    <View style={styles.filterRow}>
                      <View style={styles.filterRowLeft}>
                        <View style={[styles.filterIconWrap, {backgroundColor: theme.colors.success[50]}]}>
                          <TagIcon size={14} color={theme.colors.success[600]} />
                        </View>
                        <Typography variant="small" weight="semibold">
                          Show only "For Sell"
                        </Typography>
                      </View>
                      <Switch
                        value={filterForSell}
                        onValueChange={setFilterForSell}
                        trackColor={{false: theme.colors.gray[300], true: theme.colors.success[600]}}
                        thumbColor={theme.colors.white}
                      />
                    </View>
                    <View style={styles.filterDivider} />
                    <View style={styles.filterRowVertical}>
                      <Typography variant="caption" weight="semibold" color={theme.colors.gray[600]} style={styles.filterLabel}>
                        STATUS
                      </Typography>
                      <View style={styles.statusFiltersRow}>
                        {(['all', 'mapped', 'unmapped'] as const).map(opt => {
                          const active = filterMapped === opt;
                          return (
                            <TouchableOpacity
                              key={opt}
                              onPress={() => setFilterMapped(opt)}
                              style={[styles.statusFilterPill, active && styles.statusFilterPillActive]}
                              activeOpacity={0.85}>
                              <Typography
                                variant="caption"
                                weight="semibold"
                                color={active ? theme.colors.white : theme.colors.gray[700]}>
                                {opt === 'all' ? 'All' : opt === 'mapped' ? 'Mapped' : 'Unmapped'}
                              </Typography>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                </View>

                {error && (
                  <Card variant="outlined" padding="lg" style={styles.errorCard}>
                    <View style={styles.errorContent}>
                      <View style={styles.errorIconWrap}>
                        <AlertCircleIcon size={22} color={theme.colors.error[600]} />
                      </View>
                      <Typography variant="body" color={theme.colors.error[700]} style={styles.errorText}>
                        {error}
                      </Typography>
                    </View>
                  </Card>
                )}

                {!error && items.length > 0 && (
                  <View style={styles.sectionEyebrow}>
                    <View style={styles.eyebrowLine} />
                    <Typography variant="caption" weight="semibold" color={theme.colors.primary[600]}>
                      ITEMS · {items.length}
                    </Typography>
                  </View>
                )}
              </View>
            }
            ListEmptyComponent={
              error ? null : (
                <Card variant="elevated" padding="lg" style={styles.emptyCard}>
                  <View style={styles.emptyIconWrap}>
                    <BoxIcon size={32} color={theme.colors.primary[600]} />
                  </View>
                  <Typography variant="h3" weight="semibold" color={theme.colors.gray[800]} style={styles.emptyTitle}>
                    No items found
                  </Typography>
                  <Typography variant="small" color={theme.colors.gray[500]} align="center">
                    {searchQuery ? 'Try adjusting your search.' : 'Sync items to get started.'}
                  </Typography>
                </Card>
              )
            }
            renderItem={({item}) => {
              const isExpanded = expandedItems.has(item._id);
              const isMapped = !!item.isMapped;
              const stripeColor = isMapped ? theme.colors.success[500] : theme.colors.warning[500];
              return (
                <View style={styles.itemRow}>
                <Card variant="elevated" padding="none" style={styles.itemCard}>
                  <View style={[styles.itemStripe, {backgroundColor: stripeColor}]} />
                  <TouchableOpacity onPress={() => handleItemPress(item._id)} style={styles.itemHeader} activeOpacity={0.85}>
                    <View
                      style={[
                        styles.itemIconWrap,
                        {backgroundColor: isMapped ? theme.colors.success[50] : theme.colors.warning[50]},
                      ]}>
                      <BoxIcon size={20} color={isMapped ? theme.colors.success[600] : theme.colors.warning[600]} />
                    </View>
                    <View style={styles.itemInfo}>
                      <View style={styles.itemNameRow}>
                        <Typography variant="body" weight="bold" numberOfLines={1} style={{flexShrink: 1}}>
                          {item.itemName}
                        </Typography>
                        {/* Alias-mapped rows are MERGED under their canonical
                            name by the backend, so the alias spellings are not
                            separate rows. Surface that here (as the webapp
                            does) or the aliases look like they vanished. */}
                        {item.mergedCount > 1 ? (
                          <View style={styles.mergedPill}>
                            <Typography
                              variant="caption"
                              weight="semibold"
                              color={theme.colors.primary[700]}>
                              {item.mergedCount} merged
                            </Typography>
                          </View>
                        ) : null}
                        {/* Canonical group built only from CustomerConnect /
                            Manual PO names — no RouteStarItem behind it, so
                            usage flags can't be set. */}
                        {item.hasMasterRecord === false ? (
                          <View style={styles.noMasterPill}>
                            <Typography
                              variant="caption"
                              weight="semibold"
                              color={theme.colors.warning[700]}>
                              no master record
                            </Typography>
                          </View>
                        ) : null}
                      </View>
                      <Typography variant="caption" color={theme.colors.gray[500]} numberOfLines={1}>
                        {item.itemParent || 'No parent'}
                      </Typography>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: isMapped
                            ? theme.colors.success[50]
                            : theme.colors.warning[50],
                        },
                      ]}>
                      <Typography
                        variant="caption"
                        weight="semibold"
                        color={isMapped ? theme.colors.success[700] : theme.colors.warning[700]}>
                        {isMapped ? 'Mapped' : 'Unmapped'}
                      </Typography>
                    </View>
                    <View style={styles.chevronCircle}>
                      {isExpanded ? (
                        <ChevronDownIcon size={14} color={theme.colors.gray[700]} />
                      ) : (
                        <ChevronRightIcon size={14} color={theme.colors.gray[700]} />
                      )}
                    </View>
                  </TouchableOpacity>

                  <View style={styles.itemMeta}>
                    <View style={styles.metaTagsRow}>
                      {item.forUse ? (
                        <View style={[styles.tagPill, {backgroundColor: theme.colors.primary[50]}]}>
                          <CheckCircleIcon size={11} color={theme.colors.primary[600]} />
                          <Typography variant="caption" weight="semibold" color={theme.colors.primary[700]}>
                            For Use
                          </Typography>
                        </View>
                      ) : null}
                      {item.forSell ? (
                        <View style={[styles.tagPill, {backgroundColor: theme.colors.success[50]}]}>
                          <TagIcon size={11} color={theme.colors.success[600]} />
                          <Typography variant="caption" weight="semibold" color={theme.colors.success[700]}>
                            For Sell
                          </Typography>
                        </View>
                      ) : null}
                      {!item.forUse && !item.forSell ? (
                        <View style={[styles.tagPill, {backgroundColor: theme.colors.gray[100]}]}>
                          <WarningIcon size={11} color={theme.colors.gray[600]} />
                          <Typography variant="caption" weight="semibold" color={theme.colors.gray[700]}>
                            Unmarked
                          </Typography>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.metaRow}>
                      <Typography variant="caption" color={theme.colors.gray[500]}>
                        Category
                      </Typography>
                      <Typography variant="small" weight="semibold">
                        {item.itemCategory || 'Item'}
                      </Typography>
                    </View>
                    <View style={styles.metaRow}>
                      <Typography variant="caption" color={theme.colors.gray[500]}>
                        Qty on Hand
                      </Typography>
                      <Typography variant="small" weight="bold">
                        {item.qtyOnHand !== undefined ? item.qtyOnHand.toFixed(2) : '0'}
                      </Typography>
                    </View>
                    {item.mergedCount > 1 && Array.isArray(item.variations) ? (
                      <View style={styles.metaRow}>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          Merged from
                        </Typography>
                        <Typography
                          variant="caption"
                          weight="semibold"
                          numberOfLines={2}
                          style={{flex: 1, textAlign: 'right'}}>
                          {item.variations.join(', ')}
                        </Typography>
                      </View>
                    ) : null}
                    {item.description ? (
                      <Typography variant="caption" color={theme.colors.gray[500]} numberOfLines={2}>
                        {item.description}
                      </Typography>
                    ) : null}
                  </View>

                  {isExpanded && (
                    <View style={styles.expandedContent}>
                      <Typography
                        variant="caption"
                        weight="semibold"
                        color={theme.colors.gray[600]}
                        style={styles.expandedLabel}>
                        FLAGS
                      </Typography>
                      {item.hasMasterRecord === false ? (
                        <Typography
                          variant="caption"
                          color={theme.colors.warning[700]}
                          style={{marginBottom: 8}}>
                          Not in the RouteStar master list — sync from RouteStar
                          to set usage flags.
                        </Typography>
                      ) : null}
                      <View style={styles.flagCard}>
                        <View style={styles.flagRow}>
                          <View style={styles.flagRowLeft}>
                            <View style={[styles.flagIconWrap, {backgroundColor: theme.colors.primary[50]}]}>
                              <CheckCircleIcon size={14} color={theme.colors.primary[600]} />
                            </View>
                            <Typography variant="small" weight="semibold">
                              For Use
                            </Typography>
                          </View>
                          <Switch
                            value={item.forUse || false}
                            disabled={item.hasMasterRecord === false}
                            onValueChange={() => handleFlagChange(item._id, 'forUse', item.forUse)}
                            trackColor={{false: theme.colors.gray[300], true: theme.colors.primary[600]}}
                            thumbColor={theme.colors.white}
                          />
                        </View>
                        <View style={styles.flagDivider} />
                        <View style={styles.flagRow}>
                          <View style={styles.flagRowLeft}>
                            <View style={[styles.flagIconWrap, {backgroundColor: theme.colors.success[50]}]}>
                              <TagIcon size={14} color={theme.colors.success[600]} />
                            </View>
                            <Typography variant="small" weight="semibold">
                              For Sell
                            </Typography>
                          </View>
                          <Switch
                            value={item.forSell || false}
                            disabled={item.hasMasterRecord === false}
                            onValueChange={() => handleFlagChange(item._id, 'forSell', item.forSell)}
                            trackColor={{false: theme.colors.gray[300], true: theme.colors.success[600]}}
                            thumbColor={theme.colors.white}
                          />
                        </View>
                      </View>

                      <Typography
                        variant="caption"
                        weight="semibold"
                        color={theme.colors.gray[600]}
                        style={[styles.expandedLabel, {marginTop: theme.spacing.md}]}>
                        ITEM CATEGORY
                      </Typography>
                      <View style={styles.categoryPillsRow}>
                        {(['Item', 'Service'] as const).map(cat => {
                          const active = (item.itemCategory || 'Item') === cat;
                          return (
                            <TouchableOpacity
                              key={cat}
                              onPress={() => handleCategoryChange(item._id, cat)}
                              disabled={item.hasMasterRecord === false}
                              style={[
                                styles.categoryPill,
                                active && styles.categoryPillActive,
                                item.hasMasterRecord === false && {opacity: 0.4},
                              ]}
                              activeOpacity={0.85}>
                              <Typography
                                variant="small"
                                weight="semibold"
                                color={active ? theme.colors.white : theme.colors.gray[700]}>
                                {cat}
                              </Typography>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </Card>
                </View>
              );
            }}
          />
        )}

        <PickerModal
          visible={parentPickerVisible}
          onClose={() => setParentPickerVisible(false)}
          items={[{label: 'All Parents', value: 'all'}, ...filterOptions.itemParents.map(p => ({label: p, value: p}))]}
          selectedValue={selectedParent}
          onValueChange={setSelectedParent}
          placeholder="Select Parent"
          getLabel={(o: any) => o.label}
          getValue={(o: any) => o.value}
        />
        <PickerModal
          visible={typePickerVisible}
          onClose={() => setTypePickerVisible(false)}
          items={[{label: 'All Types', value: 'all'}, ...filterOptions.types.map(t => ({label: t, value: t}))]}
          selectedValue={selectedType}
          onValueChange={setSelectedType}
          placeholder="Select Type"
          getLabel={(o: any) => o.label}
          getValue={(o: any) => o.value}
        />
      </SafeAreaView>
    </Modal>
  );
};

const makeStyles = (theme: Theme, bp: BreakpointInfo) => {
  const wide = !bp.isMobile;
  return StyleSheet.create({
    container: {flex: 1, backgroundColor: theme.colors.brand.bg},
    loadingContainer: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.gray[50]},
    loadingMark: {
      width: 56, height: 56, borderRadius: 16,
      backgroundColor: theme.colors.primary[50],
      alignItems: 'center', justifyContent: 'center',
      marginBottom: theme.spacing.md,
    },
    scrollView: {flex: 1, backgroundColor: theme.colors.background.secondary},
    scrollContent: {paddingBottom: theme.spacing.xxxl},

    contentWrap: {
      width: '100%',
      maxWidth: bp.contentMaxWidth,
      alignSelf: 'center',
    },

    hero: {
      paddingHorizontal: bp.gutter,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xl + theme.spacing.md,
      backgroundColor: theme.colors.brand.bg,
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
      overflow: 'hidden',
      position: 'relative',
    },
    blob: {position: 'absolute', borderRadius: 9999},
    blobOne: {width: wide ? 392 : 280, height: wide ? 392 : 280, top: wide ? -182 : -130, right: wide ? -140 : -100, backgroundColor: theme.colors.primary[400]},
    blobTwo: {width: wide ? 308 : 220, height: wide ? 308 : 220, bottom: wide ? -154 : -110, left: wide ? -98 : -70, backgroundColor: theme.colors.accent[500]},
    dotGrid: {position: 'absolute', top: 50, right: 18, width: 90, flexDirection: 'row', flexWrap: 'wrap', gap: 10, opacity: 0.18},
    dot: {width: 4, height: 4, borderRadius: 2, backgroundColor: theme.colors.white},
    heroBody: {zIndex: 2, maxWidth: bp.contentMaxWidth, width: '100%', alignSelf: 'center'},
    heroTopRow: {flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.md},
    heroEyebrow: {letterSpacing: 1.4, marginBottom: 4},
    heroTitle: {letterSpacing: -0.4, marginBottom: 2},
    heroIconBtn: {
      width: 36, height: 36, borderRadius: 12,
      backgroundColor: theme.colors.brand.glassBgStrong,
      borderWidth: 1, borderColor: theme.colors.brand.glassBorderStrong,
      alignItems: 'center', justifyContent: 'center',
    },
    statusChip: {
      alignSelf: 'flex-start',
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: theme.spacing.sm + 2, paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: theme.colors.brand.glassBg,
      borderWidth: 1, borderColor: theme.colors.brand.glassBorder,
      marginBottom: theme.spacing.lg,
    },
    statusDot: {width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.success[400]},
    heroMetricsRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: theme.colors.brand.glassBg,
      borderRadius: 14,
      borderWidth: 1, borderColor: theme.colors.brand.glassBorder,
      paddingVertical: theme.spacing.md - 2, paddingHorizontal: theme.spacing.sm,
    },
    heroMetric: {flex: 1, alignItems: 'center', gap: 2},
    heroMetricLabel: {letterSpacing: 1.2},
    heroMetricDivider: {width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.18)'},

    searchWrap: {paddingHorizontal: bp.gutter, marginTop: -22, zIndex: 3},
    searchCard: {
      flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
      backgroundColor: theme.colors.white, borderRadius: 14,
      paddingHorizontal: theme.spacing.md, paddingVertical: 10,
      borderWidth: 1, borderColor: theme.colors.gray[200],
      ...theme.shadows.md,
    },
    searchInput: {flex: 1, fontSize: theme.typography.roles.body.fontSize, color: theme.colors.gray[900], paddingVertical: 0},
    searchClear: {
      width: 22, height: 22, borderRadius: 11,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: theme.colors.gray[100],
    },

    actionWrap: {paddingHorizontal: bp.gutter, marginTop: theme.spacing.md},

    filtersWrap: {paddingHorizontal: bp.gutter, marginTop: theme.spacing.md},
    filterCard: {
      backgroundColor: theme.colors.white, borderRadius: 14,
      borderWidth: 1, borderColor: theme.colors.gray[200],
      overflow: 'hidden',
    },
    filterRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm + 4,
    },
    filterRowLeft: {flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1},
    filterIconWrap: {
      width: 28, height: 28, borderRadius: 9,
      alignItems: 'center', justifyContent: 'center',
    },
    filterDivider: {height: 1, backgroundColor: theme.colors.gray[100], marginHorizontal: theme.spacing.md},
    dropdownRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm + 4,
    },
    dropdownValue: {flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '60%'},
    categoryPillsRow: {flexDirection: 'row', gap: 6, marginTop: 4},
    categoryPill: {
      flex: 1, paddingVertical: 10, borderRadius: 10,
      alignItems: 'center',
      backgroundColor: theme.colors.white,
      borderWidth: 1, borderColor: theme.colors.gray[200],
    },
    categoryPillActive: {backgroundColor: theme.colors.primary[600], borderColor: theme.colors.primary[600]},
    filterRowVertical: {paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm + 4},
    filterLabel: {letterSpacing: 1, marginBottom: 8},
    statusFiltersRow: {flexDirection: 'row', gap: 6},
    statusFilterPill: {
      paddingHorizontal: 12, paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: theme.colors.gray[100],
      borderWidth: 1, borderColor: theme.colors.gray[200],
    },
    statusFilterPillActive: {
      backgroundColor: theme.colors.primary[600],
      borderColor: theme.colors.primary[600],
    },

    sectionEyebrow: {
      flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
      paddingHorizontal: bp.gutter,
      marginTop: theme.spacing.lg, marginBottom: theme.spacing.md,
    },
    eyebrowLine: {width: 24, height: 2, borderRadius: 1, backgroundColor: theme.colors.primary[600]},

    errorCard: {
      marginHorizontal: bp.gutter,
      marginTop: theme.spacing.md,
      backgroundColor: theme.colors.error[50],
      borderColor: theme.colors.error[200],
    },
    errorContent: {flexDirection: 'row', alignItems: 'center', gap: 12},
    errorIconWrap: {
      width: 40, height: 40, borderRadius: 12,
      backgroundColor: theme.colors.error[100],
      alignItems: 'center', justifyContent: 'center',
    },
    errorText: {flex: 1},

    emptyCard: {
      marginHorizontal: bp.gutter,
      marginTop: theme.spacing.md,
      alignItems: 'center',
      paddingVertical: theme.spacing.xl,
    },
    emptyIconWrap: {
      width: 56, height: 56, borderRadius: 16,
      backgroundColor: theme.colors.primary[50],
      alignItems: 'center', justifyContent: 'center',
      marginBottom: theme.spacing.md,
    },
    emptyTitle: {marginBottom: theme.spacing.xs},

    itemNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    mergedPill: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
      backgroundColor: theme.colors.primary[50],
    },
    noMasterPill: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
      backgroundColor: theme.colors.warning[50],
    },
    itemRow: {paddingHorizontal: bp.gutter},
    itemsList: {paddingHorizontal: bp.gutter, gap: theme.spacing.md},
    itemCard: {overflow: 'hidden', position: 'relative'},
    itemStripe: {position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: theme.colors.primary[500]},
    itemHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      padding: theme.spacing.md,
      paddingTop: theme.spacing.md + 4,
    },
    itemIconWrap: {width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center'},
    itemInfo: {flex: 1, gap: 2},
    statusPill: {paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999},
    chevronCircle: {
      width: 28, height: 28, borderRadius: 14,
      backgroundColor: theme.colors.gray[50],
      alignItems: 'center', justifyContent: 'center',
    },
    itemMeta: {
      borderTopWidth: 1, borderTopColor: theme.colors.gray[100],
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    metaTagsRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4},
    tagPill: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 10, paddingVertical: 4,
      borderRadius: 999,
    },
    metaRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},

    expandedContent: {
      borderTopWidth: 1, borderTopColor: theme.colors.gray[100],
      backgroundColor: theme.colors.background.secondary,
      padding: theme.spacing.md,
    },
    expandedLabel: {letterSpacing: 1, marginBottom: 8},
    flagCard: {
      backgroundColor: theme.colors.white, borderRadius: 12,
      borderWidth: 1, borderColor: theme.colors.gray[200],
      overflow: 'hidden',
    },
    flagRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm + 4,
    },
    flagRowLeft: {flexDirection: 'row', alignItems: 'center', gap: 10},
    flagIconWrap: {width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center'},
    flagDivider: {height: 1, backgroundColor: theme.colors.gray[100], marginHorizontal: theme.spacing.md},
  });
};
