import React, {useState, useEffect, useMemo, useRef} from 'react';
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
  Animated,
  Easing,
  Switch,
} from 'react-native';
import {PaginatedList} from '../components/molecules/PaginatedList';
import {Pagination} from '../components/molecules/Pagination';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {Button} from '../components/atoms/Button';
import {useAuth} from '../contexts/AuthContext';
import {useApiErrorHandler} from '../hooks/useApiErrorHandler';
import {useTheme} from '../contexts/ThemeContext';
import {Theme} from '../theme';
import {useBreakpoint, BreakpointInfo} from '../utils/breakpoints';
import itemAliasService from '../services/itemAliasService';
import {
  AlertCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  TagIcon,
  LinkIcon,
  EditIcon,
  CloseIcon,
  RefreshIcon,
  SearchIcon,
  PlusIcon,
  TrashIcon,
} from '../components/icons';

interface ItemAliasMappingScreenProps {
  visible: boolean;
  onClose: () => void;
}

export const ItemAliasMappingScreen: React.FC<ItemAliasMappingScreenProps> = ({visible, onClose}) => {
  const theme = useTheme();
  const bp = useBreakpoint();
  const styles = useMemo(() => makeStyles(theme, bp), [theme, bp]);
  const {token} = useAuth();
  const {handleApiError} = useApiErrorHandler();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mappings, setMappings] = useState<any[]>([]);
  const [uniqueItems, setUniqueItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);

  // Client-side numbered pagination over the filtered list.
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'mapped' | 'unmapped'>('all');

  // Filter/search changes send the list back to page 1.
  useEffect(() => {
    setPage(1);
  }, [`${searchQuery}|${filterStatus}`, pageSize]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({totalUniqueItems: 0, mappedItems: 0, unmappedItems: 0});
  const [quickMapVisible, setQuickMapVisible] = useState(false);
  const [quickMapItem, setQuickMapItem] = useState<any>(null);
  const [quickCanonicalName, setQuickCanonicalName] = useState('');
  const [quickMapSelectedItems, setQuickMapSelectedItems] = useState<Set<string>>(new Set());
  const [quickMapSearchQuery, setQuickMapSearchQuery] = useState('');
  const [editMappingVisible, setEditMappingVisible] = useState(false);
  const [editingMapping, setEditingMapping] = useState<any>(null);
  const [editCanonicalName, setEditCanonicalName] = useState('');
  const [editSelectedAliases, setEditSelectedAliases] = useState<Set<string>>(new Set());
  const [editSearchQuery, setEditSearchQuery] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAutoMerge, setEditAutoMerge] = useState(true);
  const [showMappingsSection, setShowMappingsSection] = useState(false);

  // From-scratch "Create Mapping" flow (canonical name + free-text aliases +
  // description + autoMerge), mirroring the webapp modal.
  const [createVisible, setCreateVisible] = useState(false);
  const [createCanonicalName, setCreateCanonicalName] = useState('');
  const [createAliases, setCreateAliases] = useState<string[]>(['']);
  const [createDescription, setCreateDescription] = useState('');
  const [createAutoMerge, setCreateAutoMerge] = useState(true);

  const heroFade = useRef(new Animated.Value(1)).current;
  const heroSlide = useRef(new Animated.Value(0)).current;
  const blobPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && token) loadData();
  }, [visible, token]);

  useEffect(() => {
    filterItems();
  }, [uniqueItems, searchQuery, filterStatus]);

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

  const loadData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const pageData = await itemAliasService.getPageData(token);
      setMappings(pageData.mappings || []);
      setUniqueItems(pageData.items || []);
      setStats(pageData.stats || {totalUniqueItems: 0, mappedItems: 0, unmappedItems: 0});
    } catch (err: any) {
      console.error('Failed to fetch item alias data:', err);
      const wasHandled = await handleApiError(err);
      if (wasHandled) return;
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterItems = () => {
    let filtered = [...uniqueItems];
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(
        item =>
          item.itemName.toLowerCase().includes(searchLower) ||
          (item.canonicalName && item.canonicalName.toLowerCase().includes(searchLower)) ||
          (item.itemParent && item.itemParent.toLowerCase().includes(searchLower)),
      );
    }
    if (filterStatus === 'mapped') filtered = filtered.filter(item => item.isMapped);
    else if (filterStatus === 'unmapped') filtered = filtered.filter(item => !item.isMapped);
    setFilteredItems(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleItemPress = (itemName: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemName)) newExpanded.delete(itemName);
    else newExpanded.add(itemName);
    setExpandedItems(newExpanded);
  };

  const openQuickMapModal = (item: any) => {
    setQuickMapItem(item);
    setQuickCanonicalName(item.itemName);
    setQuickMapSearchQuery('');
    const currentMapping = mappings.find(m => m.aliases.some((a: any) => a.name === item.itemName));
    if (currentMapping) {
      setQuickCanonicalName(currentMapping.canonicalName);
      const aliasNames = new Set<string>(currentMapping.aliases.map((a: any) => a.name));
      setQuickMapSelectedItems(aliasNames);
    } else {
      setQuickMapSelectedItems(new Set([item.itemName]));
    }
    setQuickMapVisible(true);
  };

  const toggleQuickMapItem = (itemName: string) => {
    const newSelected = new Set(quickMapSelectedItems);
    if (itemName === quickMapItem?.itemName && newSelected.has(itemName) && newSelected.size === 1) {
      Alert.alert('Warning', 'You must select at least the current item');
      return;
    }
    if (newSelected.has(itemName)) newSelected.delete(itemName);
    else newSelected.add(itemName);
    setQuickMapSelectedItems(newSelected);
  };

  const getFilteredItemsForQuickMap = () => {
    const currentMapping = mappings.find(m => m.aliases.some((a: any) => a.name === quickMapItem?.itemName));
    return uniqueItems.filter(item => {
      if (item.isMapped && currentMapping && item.canonicalName !== currentMapping.canonicalName) return false;
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
      const currentMapping = mappings.find(m => m.aliases.some((a: any) => a.name === quickMapItem?.itemName));
      const payload = {
        canonicalName: quickCanonicalName.trim(),
        aliases: Array.from(quickMapSelectedItems),
        description: currentMapping ? currentMapping.description || 'Updated mapping' : 'Quick mapped',
        autoMerge: currentMapping ? currentMapping.autoMerge !== false : true,
      };
      if (currentMapping) {
        // Atomic update — no delete-then-recreate window.
        await itemAliasService.updateMapping(token!, currentMapping._id, payload);
      } else {
        await itemAliasService.saveMapping(token!, payload);
      }
      Alert.alert('Success', `Mapped ${quickMapSelectedItems.size} items to "${quickCanonicalName}"`);
      setQuickMapVisible(false);
      setQuickMapItem(null);
      setQuickCanonicalName('');
      setQuickMapSelectedItems(new Set());
      setQuickMapSearchQuery('');
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create mapping');
    } finally {
      setSaving(false);
    }
  };

  const openCreateMapping = () => {
    setCreateCanonicalName('');
    setCreateAliases(['']);
    setCreateDescription('');
    setCreateAutoMerge(true);
    setCreateVisible(true);
  };

  const handleCreateAliasChange = (index: number, value: string) => {
    setCreateAliases(prev => prev.map((a, i) => (i === index ? value : a)));
  };

  const addCreateAliasField = () => {
    setCreateAliases(prev => [...prev, '']);
  };

  const removeCreateAliasField = (index: number) => {
    setCreateAliases(prev => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const createMappingSubmit = async () => {
    if (!createCanonicalName.trim()) {
      Alert.alert('Error', 'Canonical name is required');
      return;
    }
    const cleanAliases = createAliases.map(a => a.trim()).filter(a => a !== '');
    if (cleanAliases.length === 0) {
      Alert.alert('Error', 'At least one alias is required');
      return;
    }
    try {
      setSaving(true);
      await itemAliasService.saveMapping(token!, {
        canonicalName: createCanonicalName.trim(),
        aliases: cleanAliases,
        description: createDescription.trim(),
        autoMerge: createAutoMerge,
      });
      Alert.alert('Success', 'Mapping created successfully');
      setCreateVisible(false);
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create mapping');
    } finally {
      setSaving(false);
    }
  };

  const deleteMapping = (mapping: any) => {
    Alert.alert(
      'Delete Mapping',
      `Are you sure you want to delete the mapping for "${mapping.canonicalName}"?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              await itemAliasService.deleteMapping(token!, mapping._id);
              Alert.alert('Success', `Mapping deleted for ${mapping.canonicalName}`);
              loadData();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete mapping');
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  const openEditMapping = (mapping: any) => {
    setEditingMapping(mapping);
    setEditCanonicalName(mapping.canonicalName);
    const aliasNames = new Set<string>(mapping.aliases.map((a: any) => a.name));
    setEditSelectedAliases(aliasNames);
    setEditSearchQuery('');
    setEditDescription(mapping.description || '');
    setEditAutoMerge(mapping.autoMerge !== false);
    setEditMappingVisible(true);
  };

  const toggleEditAlias = (itemName: string) => {
    const newSelected = new Set(editSelectedAliases);
    if (newSelected.has(itemName)) {
      if (newSelected.size === 1) {
        Alert.alert('Warning', 'You must have at least one alias');
        return;
      }
      newSelected.delete(itemName);
    } else {
      newSelected.add(itemName);
    }
    setEditSelectedAliases(newSelected);
  };

  const getFilteredItemsForEdit = () => {
    return uniqueItems.filter(item => {
      const isAvailable = !item.isMapped || (editingMapping && item.canonicalName === editingMapping.canonicalName);
      if (!isAvailable) return false;
      if (editSearchQuery) {
        const searchLower = editSearchQuery.toLowerCase();
        return (
          item.itemName.toLowerCase().includes(searchLower) ||
          (item.itemParent && item.itemParent.toLowerCase().includes(searchLower))
        );
      }
      return true;
    });
  };

  const editMappingSubmit = async () => {
    if (!editCanonicalName.trim()) {
      Alert.alert('Error', 'Please enter a canonical name');
      return;
    }
    if (editSelectedAliases.size === 0) {
      Alert.alert('Error', 'Please select at least one alias');
      return;
    }
    try {
      setSaving(true);
      // Atomic update via PUT instead of delete-then-recreate (avoids the
      // non-atomic data-loss window if the recreate fails).
      await itemAliasService.updateMapping(token!, editingMapping._id, {
        canonicalName: editCanonicalName.trim(),
        aliases: Array.from(editSelectedAliases),
        description: editDescription.trim(),
        autoMerge: editAutoMerge,
      });
      Alert.alert('Success', `Updated mapping for "${editCanonicalName}"`);
      setEditMappingVisible(false);
      setEditingMapping(null);
      setEditCanonicalName('');
      setEditSelectedAliases(new Set());
      setEditSearchQuery('');
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update mapping');
    } finally {
      setSaving(false);
    }
  };

  const blobScale = blobPulse.interpolate({inputRange: [0, 1], outputRange: [1, 1.08]});
  const blobOpacity = blobPulse.interpolate({inputRange: [0, 1], outputRange: [0.18, 0.28]});

  const completionPct = stats.totalUniqueItems > 0
    ? Math.round((stats.mappedItems / stats.totalUniqueItems) * 100)
    : 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingMark}>
              <TagIcon size={22} color={theme.colors.primary[600]} />
            </View>
            <ActivityIndicator size="large" color={theme.colors.primary[600]} />
            <Typography variant="body" color={theme.colors.gray[600]} style={{marginTop: 16}}>
              Loading item aliases...
            </Typography>
          </View>
        ) : (
          <PaginatedList
            data={pagedRows}
            keyExtractor={(item, index) => item.itemName || String(index)}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            refreshing={refreshing}
            onRefresh={onRefresh}
            resetKey={`${searchQuery}|${filterStatus}`}
            pagedMode
            scrollTopKey={page}
            ListFooterComponent={
              filteredItems.length > 0 ? (
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={filteredItems.length}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              ) : null
            }
            ItemSeparatorComponent={() => <View style={{height: 12}} />}
            ListHeaderComponent={
              <View style={styles.contentWrap}>
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
                          MAPPING
                        </Typography>
                        <Typography variant="h2" weight="bold" color={theme.colors.brand.text} style={styles.heroTitle}>
                          Item Aliases
                        </Typography>
                        <Typography variant="small" color={theme.colors.brand.textMuted}>
                          Group variant names under one canonical item
                        </Typography>
                      </View>
                      <TouchableOpacity onPress={loadData} style={styles.heroIconBtn} activeOpacity={0.85}>
                        <RefreshIcon size={18} color={theme.colors.brand.text} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.statusChip}>
                      <View style={styles.statusDot} />
                      <Typography variant="caption" weight="semibold" color={theme.colors.brand.text}>
                        {completionPct}% mapped · {mappings.length} groups
                      </Typography>
                    </View>

                    <View style={styles.heroMetricsRow}>
                      <View style={styles.heroMetric}>
                        <Typography variant="caption" weight="semibold" color={theme.colors.brand.textMuted} style={styles.heroMetricLabel}>
                          ITEMS
                        </Typography>
                        <Typography variant="h3" weight="bold" color={theme.colors.brand.text}>
                          {stats.totalUniqueItems}
                        </Typography>
                      </View>
                      <View style={styles.heroMetricDivider} />
                      <View style={styles.heroMetric}>
                        <Typography variant="caption" weight="semibold" color={theme.colors.brand.textMuted} style={styles.heroMetricLabel}>
                          MAPPED
                        </Typography>
                        <Typography variant="h3" weight="bold" color={theme.colors.brand.text}>
                          {stats.mappedItems}
                        </Typography>
                      </View>
                      <View style={styles.heroMetricDivider} />
                      <View style={styles.heroMetric}>
                        <Typography variant="caption" weight="semibold" color={theme.colors.brand.textMuted} style={styles.heroMetricLabel}>
                          UNMAPPED
                        </Typography>
                        <Typography variant="h3" weight="bold" color={theme.colors.brand.text}>
                          {stats.unmappedItems}
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
                      placeholder="Search by name"
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

                <View style={styles.tabsWrap}>
                  <View style={styles.tabsCard}>
                    {(
                      [
                        {key: 'all', label: 'All'},
                        {key: 'mapped', label: 'Mapped'},
                        {key: 'unmapped', label: 'Unmapped'},
                      ] as const
                    ).map(opt => {
                      const active = filterStatus === opt.key;
                      return (
                        <TouchableOpacity
                          key={opt.key}
                          style={[styles.tab, active && styles.tabActive]}
                          onPress={() => setFilterStatus(opt.key)}
                          activeOpacity={0.85}>
                          <Typography
                            variant="small"
                            weight="semibold"
                            color={active ? theme.colors.white : theme.colors.gray[700]}>
                            {opt.label}
                          </Typography>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.createButtonWrap}>
                  <Button
                    title="Create Mapping"
                    variant="primary"
                    onPress={openCreateMapping}
                    fullWidth
                    leftIcon={<PlusIcon size={16} color={theme.colors.brand.text} />}
                  />
                </View>

                {mappings.length > 0 && (
                  <View style={styles.mappingsSectionWrap}>
                    <Card variant="elevated" padding="none" style={styles.mappingsCard}>
                      <TouchableOpacity
                        style={styles.mappingsHeader}
                        onPress={() => setShowMappingsSection(!showMappingsSection)}
                        activeOpacity={0.85}>
                        <View style={styles.mappingsHeaderLeft}>
                          <View style={[styles.mappingsHeaderIcon, {backgroundColor: theme.colors.success[50]}]}>
                            <LinkIcon size={14} color={theme.colors.success[600]} />
                          </View>
                          <Typography variant="small" weight="semibold">
                            Existing mappings
                          </Typography>
                          <View style={[styles.countPill, {backgroundColor: theme.colors.success[50]}]}>
                            <Typography variant="caption" weight="semibold" color={theme.colors.success[700]}>
                              {mappings.length}
                            </Typography>
                          </View>
                        </View>
                        {showMappingsSection ? (
                          <ChevronDownIcon size={16} color={theme.colors.gray[600]} />
                        ) : (
                          <ChevronRightIcon size={16} color={theme.colors.gray[600]} />
                        )}
                      </TouchableOpacity>
                      {showMappingsSection && (
                        <View style={styles.mappingsBody}>
                          {mappings.map((mapping: any, idx: number) => (
                            <TouchableOpacity
                              key={mapping._id || idx}
                              style={[styles.mappingItem, idx > 0 && styles.mappingItemBorder]}
                              onPress={() => openEditMapping(mapping)}
                              activeOpacity={0.85}>
                              <View style={styles.mappingItemContent}>
                                <Typography variant="small" weight="bold" numberOfLines={1}>
                                  {mapping.canonicalName}
                                </Typography>
                                <View style={styles.aliasChipsRow}>
                                  {mapping.aliases.slice(0, 3).map((alias: any, aIdx: number) => (
                                    <View key={aIdx} style={styles.aliasChip}>
                                      <Typography variant="caption" color={theme.colors.primary[700]} numberOfLines={1}>
                                        {alias.name}
                                      </Typography>
                                    </View>
                                  ))}
                                  {mapping.aliases.length > 3 && (
                                    <Typography variant="caption" color={theme.colors.gray[500]}>
                                      +{mapping.aliases.length - 3} more
                                    </Typography>
                                  )}
                                </View>
                              </View>
                              <View style={styles.editBadge}>
                                <EditIcon size={14} color={theme.colors.primary[600]} />
                              </View>
                              <TouchableOpacity
                                style={styles.deleteBadge}
                                onPress={() => deleteMapping(mapping)}
                                activeOpacity={0.7}>
                                <TrashIcon size={14} color={theme.colors.error[600]} />
                              </TouchableOpacity>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </Card>
                  </View>
                )}

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

                {!error && filteredItems.length > 0 && (
                  <View style={styles.sectionEyebrow}>
                    <View style={styles.eyebrowLine} />
                    <Typography variant="caption" weight="semibold" color={theme.colors.primary[600]}>
                      ITEMS · {filteredItems.length}
                    </Typography>
                  </View>
                )}
              </View>
            }
            ListEmptyComponent={
              error ? null : (
                <View style={styles.contentWrap}>
                  <Card variant="elevated" padding="lg" style={styles.emptyCard}>
                    <View style={styles.emptyIconWrap}>
                      <TagIcon size={32} color={theme.colors.primary[600]} />
                    </View>
                    <Typography variant="h3" weight="semibold" color={theme.colors.gray[800]} style={styles.emptyTitle}>
                      No items found
                    </Typography>
                    <Typography variant="small" color={theme.colors.gray[500]} align="center">
                      {searchQuery ? 'Try adjusting your search.' : 'No items available yet.'}
                    </Typography>
                  </Card>
                </View>
              )
            }
            renderItem={({item}) => {
              const isExpanded = expandedItems.has(item.itemName);
              const isMapped = Boolean(item.isMapped);
              const stripeColor = isMapped ? theme.colors.success[500] : theme.colors.warning[500];
              return (
                <View style={styles.itemsList}>
                  <Card variant="elevated" padding="none" style={styles.itemCard}>
                    <View style={[styles.itemStripe, {backgroundColor: stripeColor}]} />
                    <TouchableOpacity onPress={() => handleItemPress(item.itemName)} style={styles.itemHeader} activeOpacity={0.85}>
                      <View
                        style={[
                          styles.itemIconWrap,
                          {backgroundColor: isMapped ? theme.colors.success[50] : theme.colors.warning[50]},
                        ]}>
                        <TagIcon
                          size={18}
                          color={isMapped ? theme.colors.success[600] : theme.colors.warning[600]}
                        />
                      </View>
                      <View style={styles.itemInfo}>
                        <Typography variant="body" weight="bold" numberOfLines={1}>
                          {item.itemName}
                        </Typography>
                        <Typography variant="caption" color={theme.colors.gray[500]} numberOfLines={1}>
                          {item.itemParent || 'No parent'} · qty {item.qtyOnHand?.toFixed(2) || '0'}
                        </Typography>
                        {isMapped && item.canonicalName && (
                          <View style={styles.canonicalHint}>
                            <LinkIcon size={11} color={theme.colors.success[600]} />
                            <Typography
                              variant="caption"
                              weight="semibold"
                              color={theme.colors.success[700]}
                              numberOfLines={1}>
                              {item.canonicalName}
                            </Typography>
                          </View>
                        )}
                      </View>
                      <View
                        style={[
                          styles.statusPill,
                          {backgroundColor: isMapped ? theme.colors.success[50] : theme.colors.warning[50]},
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
                      <View style={styles.metaRow}>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          Occurrences
                        </Typography>
                        <Typography variant="small" weight="semibold">
                          {item.occurrences || 0}
                        </Typography>
                      </View>
                      <View style={styles.metaRow}>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          Qty on hand
                        </Typography>
                        <Typography variant="small" weight="semibold">
                          {item.qtyOnHand !== undefined ? item.qtyOnHand.toFixed(2) : '0'}
                        </Typography>
                      </View>
                    </View>

                    {isExpanded && !isMapped && (
                      <View style={styles.expandedContent}>
                        <Button
                          title="Quick map this item"
                          variant="primary"
                          onPress={() => openQuickMapModal(item)}
                          fullWidth
                          leftIcon={<PlusIcon size={14} color={theme.colors.brand.text} />}
                        />
                      </View>
                    )}
                  </Card>
                </View>
              );
            }}
          />
        )}

        <Modal
          visible={quickMapVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setQuickMapVisible(false)}>
          <SafeAreaView style={styles.subModalContainer} edges={['top', 'left', 'right']}>
            <View style={styles.subModalHeader}>
              <TouchableOpacity onPress={() => setQuickMapVisible(false)} style={styles.subModalCloseBtn} activeOpacity={0.7}>
                <CloseIcon size={16} color={theme.colors.gray[600]} />
              </TouchableOpacity>
              <View style={{flex: 1}}>
                <Typography variant="caption" weight="semibold" color={theme.colors.primary[600]} style={{letterSpacing: 1.2}}>
                  QUICK MAP
                </Typography>
                <Typography variant="h3" weight="bold">
                  Group items
                </Typography>
              </View>
            </View>
            {/* Save pinned at the top for quick access. */}
            <View style={styles.topActionBar}>
              <Button
                title={saving ? 'Saving...' : `Map ${quickMapSelectedItems.size} items`}
                variant="primary"
                onPress={quickMapSubmit}
                disabled={saving || !quickCanonicalName.trim()}
                fullWidth
              />
            </View>
            <ScrollView style={{flex: 1}} contentContainerStyle={styles.subModalContent}>
              <View style={styles.mainItemCard}>
                <Typography
                  variant="caption"
                  weight="semibold"
                  color={theme.colors.primary[700]}
                  style={{letterSpacing: 1}}>
                  MAIN ITEM
                </Typography>
                <Typography variant="body" weight="bold" style={{marginTop: 2}}>
                  {quickMapItem?.itemName}
                </Typography>
              </View>

              <View style={styles.inputSection}>
                <Typography variant="caption" weight="semibold" color={theme.colors.gray[600]} style={styles.inputLabel}>
                  CANONICAL NAME *
                </Typography>
                <RNTextInput
                  style={styles.textInput}
                  placeholder="Enter canonical name"
                  value={quickCanonicalName}
                  onChangeText={setQuickCanonicalName}
                  placeholderTextColor={theme.colors.gray[400]}
                />
                <Typography variant="caption" color={theme.colors.gray[500]} style={{marginTop: 4}}>
                  Selected items will display under this name in reports.
                </Typography>
              </View>

              <View style={styles.selectedItemsCard}>
                <View style={styles.selectedItemsHeader}>
                  <CheckCircleIcon size={14} color={theme.colors.success[600]} />
                  <Typography variant="caption" weight="semibold" color={theme.colors.success[700]}>
                    Selected · {quickMapSelectedItems.size}
                  </Typography>
                </View>
                <View style={styles.selectedItemsContainer}>
                  {Array.from(quickMapSelectedItems).map((name, idx) => (
                    <View key={idx} style={styles.selectedItemChip}>
                      <Typography variant="caption" weight="semibold" color={theme.colors.success[700]}>
                        {name}
                      </Typography>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.inputSection}>
                <Typography variant="caption" weight="semibold" color={theme.colors.gray[600]} style={styles.inputLabel}>
                  ADD MORE ITEMS
                </Typography>
                <View style={styles.searchInputRow}>
                  <SearchIcon size={16} color={theme.colors.gray[500]} />
                  <RNTextInput
                    style={styles.searchInputField}
                    placeholder="Search items..."
                    value={quickMapSearchQuery}
                    onChangeText={setQuickMapSearchQuery}
                    placeholderTextColor={theme.colors.gray[400]}
                  />
                </View>
              </View>

              <View style={styles.itemsListCard}>
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
                      onPress={() => toggleQuickMapItem(item.itemName)}
                      activeOpacity={0.85}>
                      <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                        {isSelected && <CheckCircleIcon size={14} color={theme.colors.brand.text} />}
                      </View>
                      <View style={styles.selectableItemContent}>
                        <Typography variant="small" weight={isSelected ? 'bold' : 'normal'} numberOfLines={1}>
                          {item.itemName}
                          {item.itemName === quickMapItem?.itemName && (
                            <Typography variant="caption" color={theme.colors.primary[600]}> · main</Typography>
                          )}
                        </Typography>
                        <Typography variant="caption" color={theme.colors.gray[500]} numberOfLines={1}>
                          {item.itemParent || 'No parent'} · qty {item.qtyOnHand?.toFixed(2) || '0'}
                        </Typography>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>

        <Modal
          visible={editMappingVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setEditMappingVisible(false)}>
          <SafeAreaView style={styles.subModalContainer} edges={['top', 'left', 'right']}>
            <View style={styles.subModalHeader}>
              <TouchableOpacity onPress={() => setEditMappingVisible(false)} style={styles.subModalCloseBtn} activeOpacity={0.7}>
                <CloseIcon size={16} color={theme.colors.gray[600]} />
              </TouchableOpacity>
              <View style={{flex: 1}}>
                <Typography variant="caption" weight="semibold" color={theme.colors.primary[600]} style={{letterSpacing: 1.2}}>
                  EDIT MAPPING
                </Typography>
                <Typography variant="h3" weight="bold">
                  Update aliases
                </Typography>
              </View>
            </View>
            <ScrollView style={{flex: 1}} contentContainerStyle={styles.subModalContent}>
              <View style={styles.inputSection}>
                <Typography variant="caption" weight="semibold" color={theme.colors.gray[600]} style={styles.inputLabel}>
                  CANONICAL NAME *
                </Typography>
                <RNTextInput
                  style={styles.textInput}
                  placeholder="Enter canonical name"
                  value={editCanonicalName}
                  onChangeText={setEditCanonicalName}
                  placeholderTextColor={theme.colors.gray[400]}
                />
              </View>

              <View style={styles.inputSection}>
                <Typography variant="caption" weight="semibold" color={theme.colors.gray[600]} style={styles.inputLabel}>
                  DESCRIPTION
                </Typography>
                <RNTextInput
                  style={styles.textInput}
                  placeholder="Add notes about this mapping..."
                  value={editDescription}
                  onChangeText={setEditDescription}
                  placeholderTextColor={theme.colors.gray[400]}
                />
              </View>

              <View style={styles.autoMergeRow}>
                <View style={{flex: 1, paddingRight: 12}}>
                  <Typography variant="small" weight="semibold">
                    Auto-merge in reports
                  </Typography>
                  <Typography variant="caption" color={theme.colors.gray[500]}>
                    Automatically merge in reports and analytics
                  </Typography>
                </View>
                <Switch
                  value={editAutoMerge}
                  onValueChange={setEditAutoMerge}
                  trackColor={{false: theme.colors.gray[300], true: theme.colors.primary[600]}}
                  thumbColor={theme.colors.white}
                />
              </View>

              <View style={styles.selectedItemsCard}>
                <View style={styles.selectedItemsHeader}>
                  <CheckCircleIcon size={14} color={theme.colors.success[600]} />
                  <Typography variant="caption" weight="semibold" color={theme.colors.success[700]}>
                    Aliases · {editSelectedAliases.size}
                  </Typography>
                </View>
                <View style={styles.selectedItemsContainer}>
                  {Array.from(editSelectedAliases).map((name, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.editAliasChip}
                      onPress={() => toggleEditAlias(name)}
                      activeOpacity={0.85}>
                      <Typography variant="caption" weight="semibold" color={theme.colors.success[700]}>
                        {name}
                      </Typography>
                      <CloseIcon size={11} color={theme.colors.success[700]} />
                    </TouchableOpacity>
                  ))}
                </View>
                <Typography variant="caption" color={theme.colors.gray[500]} style={{marginTop: 6}}>
                  Tap an alias to remove it. Select items below to add new ones.
                </Typography>
              </View>

              <View style={styles.inputSection}>
                <Typography variant="caption" weight="semibold" color={theme.colors.gray[600]} style={styles.inputLabel}>
                  ADD ALIASES
                </Typography>
                <View style={styles.searchInputRow}>
                  <SearchIcon size={16} color={theme.colors.gray[500]} />
                  <RNTextInput
                    style={styles.searchInputField}
                    placeholder="Search unmapped items..."
                    value={editSearchQuery}
                    onChangeText={setEditSearchQuery}
                    placeholderTextColor={theme.colors.gray[400]}
                  />
                </View>
              </View>

              <View style={styles.itemsListCard}>
                {getFilteredItemsForEdit().map((item, idx) => {
                  const isSelected = editSelectedAliases.has(item.itemName);
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.selectableItem,
                        isSelected && styles.selectableItemSelected,
                        idx > 0 && styles.selectableItemBorder,
                      ]}
                      onPress={() => toggleEditAlias(item.itemName)}
                      activeOpacity={0.85}>
                      <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                        {isSelected && <CheckCircleIcon size={14} color={theme.colors.brand.text} />}
                      </View>
                      <View style={styles.selectableItemContent}>
                        <Typography variant="small" weight={isSelected ? 'bold' : 'normal'} numberOfLines={1}>
                          {item.itemName}
                        </Typography>
                        <Typography variant="caption" color={theme.colors.gray[500]} numberOfLines={1}>
                          {item.itemParent || 'No parent'} · qty {item.qtyOnHand?.toFixed(2) || '0'}
                        </Typography>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.actionButtons}>
                <Button
                  title={saving ? 'Saving...' : `Update mapping (${editSelectedAliases.size})`}
                  variant="primary"
                  onPress={editMappingSubmit}
                  disabled={saving || !editCanonicalName.trim() || editSelectedAliases.size === 0}
                  fullWidth
                />
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>

        <Modal
          visible={createVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setCreateVisible(false)}>
          <SafeAreaView style={styles.subModalContainer} edges={['top', 'left', 'right']}>
            <View style={styles.subModalHeader}>
              <TouchableOpacity onPress={() => setCreateVisible(false)} style={styles.subModalCloseBtn} activeOpacity={0.7}>
                <CloseIcon size={16} color={theme.colors.gray[600]} />
              </TouchableOpacity>
              <View style={{flex: 1}}>
                <Typography variant="caption" weight="semibold" color={theme.colors.primary[600]} style={{letterSpacing: 1.2}}>
                  NEW MAPPING
                </Typography>
                <Typography variant="h3" weight="bold">
                  Create mapping
                </Typography>
              </View>
            </View>
            <ScrollView style={{flex: 1}} contentContainerStyle={styles.subModalContent}>
              <View style={styles.inputSection}>
                <Typography variant="caption" weight="semibold" color={theme.colors.gray[600]} style={styles.inputLabel}>
                  CANONICAL NAME *
                </Typography>
                <RNTextInput
                  style={styles.textInput}
                  placeholder="e.g., JRT-2PLY"
                  value={createCanonicalName}
                  onChangeText={setCreateCanonicalName}
                  placeholderTextColor={theme.colors.gray[400]}
                />
                <Typography variant="caption" color={theme.colors.gray[500]} style={{marginTop: 4}}>
                  The master name shown in reports.
                </Typography>
              </View>

              <View style={styles.inputSection}>
                <Typography variant="caption" weight="semibold" color={theme.colors.gray[600]} style={styles.inputLabel}>
                  ALIASES *
                </Typography>
                {createAliases.map((alias, index) => (
                  <View key={index} style={styles.aliasInputRow}>
                    <RNTextInput
                      style={[styles.textInput, {flex: 1}]}
                      placeholder="e.g., jrt-2ply, jrt 2pLy"
                      value={alias}
                      onChangeText={text => handleCreateAliasChange(index, text)}
                      placeholderTextColor={theme.colors.gray[400]}
                    />
                    {createAliases.length > 1 && (
                      <TouchableOpacity
                        style={styles.aliasRemoveBtn}
                        onPress={() => removeCreateAliasField(index)}
                        activeOpacity={0.7}>
                        <CloseIcon size={14} color={theme.colors.error[600]} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                <Button
                  title="Add another alias"
                  variant="outline"
                  onPress={addCreateAliasField}
                  leftIcon={<PlusIcon size={14} color={theme.colors.primary[600]} />}
                  style={{marginTop: 6}}
                />
              </View>

              <View style={styles.inputSection}>
                <Typography variant="caption" weight="semibold" color={theme.colors.gray[600]} style={styles.inputLabel}>
                  DESCRIPTION
                </Typography>
                <RNTextInput
                  style={styles.textInput}
                  placeholder="Add notes about this mapping..."
                  value={createDescription}
                  onChangeText={setCreateDescription}
                  placeholderTextColor={theme.colors.gray[400]}
                />
              </View>

              <View style={styles.autoMergeRow}>
                <View style={{flex: 1, paddingRight: 12}}>
                  <Typography variant="small" weight="semibold">
                    Auto-merge in reports
                  </Typography>
                  <Typography variant="caption" color={theme.colors.gray[500]}>
                    Automatically merge in reports and analytics
                  </Typography>
                </View>
                <Switch
                  value={createAutoMerge}
                  onValueChange={setCreateAutoMerge}
                  trackColor={{false: theme.colors.gray[300], true: theme.colors.primary[600]}}
                  thumbColor={theme.colors.white}
                />
              </View>

              <View style={styles.actionButtons}>
                <Button
                  title={saving ? 'Saving...' : 'Create mapping'}
                  variant="primary"
                  onPress={createMappingSubmit}
                  disabled={saving || !createCanonicalName.trim()}
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

    tabsWrap: {paddingHorizontal: bp.gutter, marginTop: theme.spacing.md},
    tabsCard: {
      flexDirection: 'row', gap: 6,
      backgroundColor: theme.colors.white, borderRadius: 12,
      padding: 6,
      borderWidth: 1, borderColor: theme.colors.gray[200],
    },
    tab: {
      flex: 1, paddingVertical: 10, borderRadius: 10,
      alignItems: 'center', backgroundColor: theme.colors.gray[50],
    },
    tabActive: {backgroundColor: theme.colors.primary[600]},

    mappingsSectionWrap: {paddingHorizontal: bp.gutter, marginTop: theme.spacing.md},
    mappingsCard: {overflow: 'hidden'},
    mappingsHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      padding: theme.spacing.md,
    },
    mappingsHeaderLeft: {flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1},
    mappingsHeaderIcon: {width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center'},
    countPill: {paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999},
    mappingsBody: {borderTopWidth: 1, borderTopColor: theme.colors.gray[100]},
    mappingItem: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      padding: theme.spacing.md,
    },
    mappingItemBorder: {borderTopWidth: 1, borderTopColor: theme.colors.gray[100]},
    mappingItemContent: {flex: 1, gap: 4},
    aliasChipsRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignItems: 'center'},
    aliasChip: {
      paddingHorizontal: 8, paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: theme.colors.primary[50],
    },
    editBadge: {
      width: 28, height: 28, borderRadius: 9,
      backgroundColor: theme.colors.primary[50],
      alignItems: 'center', justifyContent: 'center',
    },
    deleteBadge: {
      width: 28, height: 28, borderRadius: 9,
      backgroundColor: theme.colors.error[50],
      alignItems: 'center', justifyContent: 'center',
      marginLeft: 6,
    },
    createButtonWrap: {paddingHorizontal: bp.gutter, marginTop: theme.spacing.md},
    autoMergeRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: theme.colors.white,
      borderRadius: 12,
      padding: theme.spacing.md,
      borderWidth: 1, borderColor: theme.colors.gray[200],
      marginBottom: theme.spacing.md,
    },
    aliasInputRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8},
    aliasRemoveBtn: {
      width: 36, height: 36, borderRadius: 9,
      backgroundColor: theme.colors.error[50],
      alignItems: 'center', justifyContent: 'center',
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
    canonicalHint: {flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2},
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
    metaRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},

    expandedContent: {
      borderTopWidth: 1, borderTopColor: theme.colors.gray[100],
      backgroundColor: theme.colors.background.secondary,
      padding: theme.spacing.md,
    },

    subModalContainer: {flex: 1, backgroundColor: theme.colors.background.secondary},
    subModalHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.white,
      borderBottomWidth: 1, borderBottomColor: theme.colors.gray[200],
    },
    subModalCloseBtn: {
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: theme.colors.gray[100],
      alignItems: 'center', justifyContent: 'center',
    },
    subModalContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.xxxl,
      maxWidth: bp.contentMaxWidth,
      width: '100%',
      alignSelf: 'center',
    },

    mainItemCard: {
      backgroundColor: theme.colors.primary[50],
      borderRadius: 12,
      padding: theme.spacing.md,
      borderWidth: 1, borderColor: theme.colors.primary[100],
      marginBottom: theme.spacing.md,
    },

    inputSection: {marginBottom: theme.spacing.md},
    inputLabel: {letterSpacing: 1, marginBottom: 6},
    textInput: {
      backgroundColor: theme.colors.white,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: theme.typography.roles.body.fontSize,
      color: theme.colors.gray[900],
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
    },
    searchInputRow: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: theme.colors.white,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
    },
    searchInputField: {flex: 1, fontSize: theme.typography.roles.body.fontSize, color: theme.colors.gray[900], paddingVertical: 0},

    selectedItemsCard: {
      backgroundColor: theme.colors.success[50],
      borderRadius: 12,
      padding: theme.spacing.md,
      borderWidth: 1, borderColor: theme.colors.success[100],
      marginBottom: theme.spacing.md,
    },
    selectedItemsHeader: {flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8},
    selectedItemsContainer: {flexDirection: 'row', flexWrap: 'wrap', gap: 6},
    selectedItemChip: {
      paddingHorizontal: 10, paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: theme.colors.white,
      borderWidth: 1,
      borderColor: theme.colors.success[200],
    },
    editAliasChip: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 10, paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: theme.colors.white,
      borderWidth: 1,
      borderColor: theme.colors.success[200],
    },

    itemsListCard: {
      backgroundColor: theme.colors.white,
      borderRadius: 12,
      borderWidth: 1, borderColor: theme.colors.gray[200],
      overflow: 'hidden',
      marginBottom: theme.spacing.md,
    },
    selectableItem: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      padding: theme.spacing.md,
    },
    selectableItemSelected: {backgroundColor: theme.colors.primary[50]},
    selectableItemBorder: {borderTopWidth: 1, borderTopColor: theme.colors.gray[100]},
    checkbox: {
      width: 22, height: 22, borderRadius: 7,
      borderWidth: 2, borderColor: theme.colors.gray[300],
      alignItems: 'center', justifyContent: 'center',
    },
    checkboxChecked: {
      backgroundColor: theme.colors.primary[600],
      borderColor: theme.colors.primary[600],
    },
    selectableItemContent: {flex: 1, gap: 2},

    actionButtons: {marginTop: theme.spacing.md},
    topActionBar: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.white,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.gray[200],
    },
  });
};
