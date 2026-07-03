import React, {useState, useEffect, useMemo, useRef} from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  TextInput as RNTextInput,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import {PaginatedList} from '../components/molecules/PaginatedList';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {Button} from '../components/atoms/Button';
import {PickerModal} from '../components/molecules/PickerModal';
import {useAuth} from '../contexts/AuthContext';
import {useApiErrorHandler} from '../hooks/useApiErrorHandler';
import {useTheme} from '../contexts/ThemeContext';
import {Theme} from '../theme';
import {useBreakpoint, BreakpointInfo} from '../utils/breakpoints';
import modelCategoryService from '../services/modelCategoryService';
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
  LinkIcon,
} from '../components/icons';

interface ModelCategoryMappingScreenProps {
  visible: boolean;
  onClose: () => void;
}

export const ModelCategoryMappingScreen: React.FC<ModelCategoryMappingScreenProps> = ({
  visible,
  onClose,
}) => {
  const theme = useTheme();
  const bp = useBreakpoint();
  const styles = useMemo(() => makeStyles(theme, bp), [theme, bp]);
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
  const [stats, setStats] = useState({total: 0, mapped: 0, unmapped: 0});

  const heroFade = useRef(new Animated.Value(1)).current;
  const heroSlide = useRef(new Animated.Value(0)).current;
  const blobPulse = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    if (visible) {
      heroFade.setValue(0.6);
      heroSlide.setValue(16);
      Animated.parallel([
        Animated.timing(heroFade, {
          toValue: 1,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(heroSlide, {
          toValue: 0,
          duration: 360,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, heroFade, heroSlide]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(blobPulse, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(blobPulse, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [blobPulse]);

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
    } catch (err: any) {
      console.error('Failed to fetch model category data:', err);
      const wasHandled = await handleApiError(err);
      if (wasHandled) return;
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateStats = () => {
    const mapped = models.filter(m => m.categoryItemName).length;
    const unmapped = models.length - mapped;
    setStats({total: models.length, mapped, unmapped});
  };

  const filterModels = () => {
    let filtered = [...models];
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(
        m =>
          m.modelNumber.toLowerCase().includes(searchLower) ||
          (m.orderItemName && m.orderItemName.toLowerCase().includes(searchLower)) ||
          (m.categoryItemName && m.categoryItemName.toLowerCase().includes(searchLower)),
      );
    }
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
    if (newExpanded.has(modelNumber)) newExpanded.delete(modelNumber);
    else newExpanded.add(modelNumber);
    setExpandedModels(newExpanded);
  };

  const handleCategoryChange = (modelNumber: string, categoryItemId: string) => {
    const item = routeStarItems.find(i => i._id === categoryItemId);
    setModels(prevModels =>
      prevModels.map(m =>
        m.modelNumber === modelNumber
          ? {...m, categoryItemId, categoryItemName: item ? item.itemName : null}
          : m,
      ),
    );
  };

  const handleNotesChange = (modelNumber: string, notes: string) => {
    setModels(prevModels =>
      prevModels.map(m => (m.modelNumber === modelNumber ? {...m, notes} : m)),
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
      const newExpanded = new Set(expandedModels);
      newExpanded.delete(modelNumber);
      setExpandedModels(newExpanded);
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save mapping');
    } finally {
      setSaving(false);
    }
  };

  const deleteMapping = async (modelNumber: string) => {
    Alert.alert(
      'Delete Mapping',
      `Are you sure you want to delete the mapping for ${modelNumber}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              await modelCategoryService.deleteMapping(token!, modelNumber);
              Alert.alert('Success', `Mapping deleted for ${modelNumber}`);
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

  const blobScale = blobPulse.interpolate({inputRange: [0, 1], outputRange: [1, 1.08]});
  const blobOpacity = blobPulse.interpolate({inputRange: [0, 1], outputRange: [0.18, 0.28]});

  const completionPct = stats.total > 0 ? Math.round((stats.mapped / stats.total) * 100) : 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingMark}>
              <LinkIcon size={22} color={theme.colors.primary[600]} />
            </View>
            <ActivityIndicator size="large" color={theme.colors.primary[600]} />
            <Typography variant="body" color={theme.colors.gray[600]} style={{marginTop: 16}}>
              Loading model mappings...
            </Typography>
          </View>
        ) : (
          <PaginatedList
            data={filteredModels}
            keyExtractor={(item, index) => item.modelNumber || String(index)}
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, styles.contentWrap]}
            refreshing={refreshing}
            onRefresh={onRefresh}
            resetKey={`${searchQuery}|${filterStatus}`}
            ItemSeparatorComponent={() => <View style={{height: 12}} />}
            ListHeaderComponent={
              <View>
                <View style={styles.hero}>
                  <Animated.View
                    style={[
                      styles.blob,
                      styles.blobOne,
                      {transform: [{scale: blobScale}], opacity: blobOpacity},
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.blob,
                      styles.blobTwo,
                      {transform: [{scale: blobScale}], opacity: blobOpacity},
                    ]}
                  />
                  <View style={styles.dotGrid} pointerEvents="none">
                    {Array.from({length: 18}).map((_, i) => (
                      <View key={i} style={styles.dot} />
                    ))}
                  </View>

                  <Animated.View
                    style={[
                      styles.heroBody,
                      {opacity: heroFade, transform: [{translateY: heroSlide}]},
                    ]}>
                    <View style={styles.heroTopRow}>
                      <TouchableOpacity onPress={onClose} style={styles.heroIconBtn} activeOpacity={0.85}>
                        <CloseIcon size={16} color={theme.colors.brand.text} />
                      </TouchableOpacity>
                      <View style={{flex: 1}}>
                        <Typography
                          variant="caption"
                          weight="semibold"
                          color={theme.colors.brand.textTracked}
                          style={styles.heroEyebrow}>
                          MAPPING
                        </Typography>
                        <Typography variant="h2" weight="bold" color={theme.colors.brand.text} style={styles.heroTitle}>
                          Model Categories
                        </Typography>
                        <Typography variant="small" color={theme.colors.brand.textMuted}>
                          Link order models to RouteStar items
                        </Typography>
                      </View>
                      <TouchableOpacity onPress={loadData} style={styles.heroIconBtn} activeOpacity={0.85}>
                        <RefreshIcon size={18} color={theme.colors.brand.text} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.statusChip}>
                      <View style={styles.statusDot} />
                      <Typography variant="caption" weight="semibold" color={theme.colors.brand.text}>
                        {completionPct}% mapped · {stats.total} models · {routeStarItems.length} items
                      </Typography>
                    </View>

                    <View style={styles.heroMetricsRow}>
                      <View style={styles.heroMetric}>
                        <Typography
                          variant="caption"
                          weight="semibold"
                          color={theme.colors.brand.textMuted}
                          style={styles.heroMetricLabel}>
                          TOTAL
                        </Typography>
                        <Typography variant="h3" weight="bold" color={theme.colors.brand.text}>
                          {stats.total}
                        </Typography>
                      </View>
                      <View style={styles.heroMetricDivider} />
                      <View style={styles.heroMetric}>
                        <Typography
                          variant="caption"
                          weight="semibold"
                          color={theme.colors.brand.textMuted}
                          style={styles.heroMetricLabel}>
                          MAPPED
                        </Typography>
                        <Typography variant="h3" weight="bold" color={theme.colors.brand.text}>
                          {stats.mapped}
                        </Typography>
                      </View>
                      <View style={styles.heroMetricDivider} />
                      <View style={styles.heroMetric}>
                        <Typography
                          variant="caption"
                          weight="semibold"
                          color={theme.colors.brand.textMuted}
                          style={styles.heroMetricLabel}>
                          UNMAPPED
                        </Typography>
                        <Typography variant="h3" weight="bold" color={theme.colors.brand.text}>
                          {stats.unmapped}
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
                      placeholder="Search model or item"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholderTextColor={theme.colors.gray[400]}
                    />
                    {searchQuery ? (
                      <TouchableOpacity
                        onPress={() => setSearchQuery('')}
                        style={styles.searchClear}
                        activeOpacity={0.7}>
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

                {!error && filteredModels.length > 0 && (
                  <View style={styles.sectionEyebrow}>
                    <View style={styles.eyebrowLine} />
                    <Typography variant="caption" weight="semibold" color={theme.colors.primary[600]}>
                      MODELS · {filteredModels.length}
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
                    No models found
                  </Typography>
                  <Typography variant="small" color={theme.colors.gray[500]} align="center">
                    {searchQuery ? 'Try adjusting your search.' : 'No models available yet.'}
                  </Typography>
                </Card>
              )
            }
            renderItem={({item: model}) => {
              const isExpanded = expandedModels.has(model.modelNumber);
              const isMapped = Boolean(model.categoryItemName);
              const stripeColor = isMapped ? theme.colors.success[500] : theme.colors.warning[500];
              return (
                <View style={{paddingHorizontal: bp.gutter}}>
                <Card
                  variant="elevated"
                  padding="none"
                  style={styles.modelCard}>
                  <View style={[styles.modelStripe, {backgroundColor: stripeColor}]} />
                  <TouchableOpacity
                    onPress={() => handleModelPress(model.modelNumber)}
                    style={styles.modelHeader}
                    activeOpacity={0.85}>
                    <View
                      style={[
                        styles.modelIconWrap,
                        {backgroundColor: isMapped ? theme.colors.success[50] : theme.colors.warning[50]},
                      ]}>
                      <BoxIcon
                        size={20}
                        color={isMapped ? theme.colors.success[600] : theme.colors.warning[600]}
                      />
                    </View>
                    <View style={styles.modelInfo}>
                      <Typography variant="body" weight="bold" numberOfLines={1}>
                        {model.modelNumber}
                      </Typography>
                      <Typography variant="caption" color={theme.colors.gray[500]} numberOfLines={1}>
                        {model.orderItemName || 'No item name'}
                      </Typography>
                      {isMapped && (
                        <View style={styles.mappedHint}>
                          <LinkIcon size={11} color={theme.colors.success[600]} />
                          <Typography
                            variant="caption"
                            weight="semibold"
                            color={theme.colors.success[700]}
                            numberOfLines={1}>
                            {model.categoryItemName}
                          </Typography>
                        </View>
                      )}
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

                  {isExpanded && (
                    <View style={styles.expandedContent}>
                      <View style={styles.mappingSection}>
                        <Typography
                          variant="caption"
                          weight="semibold"
                          color={theme.colors.gray[600]}
                          style={styles.sectionLabel}>
                          CURRENT MAPPING
                        </Typography>
                        {isMapped ? (
                          <View style={styles.mappedItemInfo}>
                            <Typography variant="caption" color={theme.colors.success[700]}>
                              Linked to
                            </Typography>
                            <Typography
                              variant="body"
                              weight="semibold"
                              color={theme.colors.success[800]}
                              style={{marginTop: 2}}>
                              {model.categoryItemName}
                            </Typography>
                          </View>
                        ) : (
                          <View style={styles.notMappedInfo}>
                            <Typography variant="small" color={theme.colors.gray[500]}>
                              Not mapped yet
                            </Typography>
                          </View>
                        )}
                      </View>

                      <View style={styles.pickerSection}>
                        <Typography
                          variant="caption"
                          weight="semibold"
                          color={theme.colors.gray[600]}
                          style={styles.sectionLabel}>
                          SELECT CATEGORY
                        </Typography>
                        <TouchableOpacity
                          style={styles.pickerButton}
                          onPress={() => openPickerForModel(model.modelNumber)}
                          activeOpacity={0.85}>
                          <View style={styles.pickerLeft}>
                            <View style={styles.pickerIconWrap}>
                              <TagIcon size={14} color={theme.colors.primary[600]} />
                            </View>
                            <Typography
                              variant="small"
                              color={
                                model.categoryItemId ? theme.colors.gray[900] : theme.colors.gray[500]
                              }
                              numberOfLines={1}
                              style={{flex: 1}}>
                              {model.categoryItemId
                                ? routeStarItems.find(i => i._id === model.categoryItemId)?.itemName ||
                                  'Select category'
                                : `Select from ${routeStarItems.length} items`}
                            </Typography>
                          </View>
                          <ChevronDownIcon size={16} color={theme.colors.gray[500]} />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.pickerSection}>
                        <Typography
                          variant="caption"
                          weight="semibold"
                          color={theme.colors.gray[600]}
                          style={styles.sectionLabel}>
                          NOTES
                        </Typography>
                        <RNTextInput
                          style={styles.notesInput}
                          placeholder="Add notes..."
                          value={model.notes || ''}
                          onChangeText={text => handleNotesChange(model.modelNumber, text)}
                          placeholderTextColor={theme.colors.gray[400]}
                          multiline
                          textAlignVertical="top"
                        />
                      </View>

                      <View style={styles.actionsSection}>
                        <Button
                          title="Save mapping"
                          variant="primary"
                          onPress={() => saveMapping(model.modelNumber)}
                          disabled={saving || !model.categoryItemId}
                          fullWidth
                        />
                        {isMapped && (
                          <Button
                            title="Delete mapping"
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
                </View>
              );
            }}
          />
        )}

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

const makeStyles = (theme: Theme, bp: BreakpointInfo) => {
  const wide = !bp.isMobile;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.brand.bg,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.gray[50],
    },
    loadingMark: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: theme.colors.primary[50],
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.md,
    },
    scrollView: {
      flex: 1,
      backgroundColor: theme.colors.background.secondary,
    },
    scrollContent: {
      paddingBottom: theme.spacing.xxxl,
    },

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
    blobOne: {
      width: wide ? 392 : 280,
      height: wide ? 392 : 280,
      top: wide ? -182 : -130,
      right: wide ? -140 : -100,
      backgroundColor: theme.colors.primary[400],
    },
    blobTwo: {
      width: wide ? 308 : 220,
      height: wide ? 308 : 220,
      bottom: wide ? -154 : -110,
      left: wide ? -98 : -70,
      backgroundColor: theme.colors.accent[500],
    },
    dotGrid: {
      position: 'absolute',
      top: 50,
      right: 18,
      width: 90,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      opacity: 0.18,
    },
    dot: {width: 4, height: 4, borderRadius: 2, backgroundColor: theme.colors.white},
    heroBody: {zIndex: 2, maxWidth: bp.contentMaxWidth, width: '100%', alignSelf: 'center'},
    heroTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    heroEyebrow: {letterSpacing: 1.4, marginBottom: 4},
    heroTitle: {letterSpacing: -0.4, marginBottom: 2},
    heroIconBtn: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: theme.colors.brand.glassBgStrong,
      borderWidth: 1,
      borderColor: theme.colors.brand.glassBorderStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statusChip: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: theme.spacing.sm + 2,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: theme.colors.brand.glassBg,
      borderWidth: 1,
      borderColor: theme.colors.brand.glassBorder,
      marginBottom: theme.spacing.lg,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.success[400],
    },
    heroMetricsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.brand.glassBg,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.brand.glassBorder,
      paddingVertical: theme.spacing.md - 2,
      paddingHorizontal: theme.spacing.sm,
    },
    heroMetric: {flex: 1, alignItems: 'center', gap: 2},
    heroMetricLabel: {letterSpacing: 1.2},
    heroMetricDivider: {
      width: 1,
      height: 28,
      backgroundColor: 'rgba(255,255,255,0.18)',
    },

    searchWrap: {
      paddingHorizontal: bp.gutter,
      marginTop: -22,
      zIndex: 3,
    },
    searchCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.white,
      borderRadius: 14,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
      ...theme.shadows.md,
    },
    searchInput: {
      flex: 1,
      fontSize: theme.typography.roles.body.fontSize,
      color: theme.colors.gray[900],
      paddingVertical: 0,
    },
    searchClear: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.gray[100],
    },

    tabsWrap: {
      paddingHorizontal: bp.gutter,
      marginTop: theme.spacing.md,
    },
    tabsCard: {
      flexDirection: 'row',
      gap: 6,
      backgroundColor: theme.colors.white,
      borderRadius: 12,
      padding: 6,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
    },
    tab: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center',
      backgroundColor: theme.colors.gray[50],
    },
    tabActive: {backgroundColor: theme.colors.primary[600]},

    sectionEyebrow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingHorizontal: bp.gutter,
      marginTop: theme.spacing.lg,
      marginBottom: theme.spacing.md,
    },
    eyebrowLine: {
      width: 24,
      height: 2,
      borderRadius: 1,
      backgroundColor: theme.colors.primary[600],
    },

    errorCard: {
      marginHorizontal: bp.gutter,
      marginTop: theme.spacing.md,
      backgroundColor: theme.colors.error[50],
      borderColor: theme.colors.error[200],
    },
    errorContent: {flexDirection: 'row', alignItems: 'center', gap: 12},
    errorIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: theme.colors.error[100],
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorText: {flex: 1},

    emptyCard: {
      marginHorizontal: bp.gutter,
      marginTop: theme.spacing.md,
      alignItems: 'center',
      paddingVertical: theme.spacing.xl,
    },
    emptyIconWrap: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: theme.colors.primary[50],
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.md,
    },
    emptyTitle: {marginBottom: theme.spacing.xs},

    modelsList: {
      paddingHorizontal: bp.gutter,
      gap: theme.spacing.md,
    },
    modelCard: {overflow: 'hidden', position: 'relative'},
    modelStripe: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 3,
      backgroundColor: theme.colors.primary[500],
    },
    modelHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: theme.spacing.md,
      paddingTop: theme.spacing.md + 4,
    },
    modelIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modelInfo: {flex: 1, gap: 2},
    mappedHint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    statusPill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    chevronCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.gray[50],
      alignItems: 'center',
      justifyContent: 'center',
    },

    expandedContent: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.gray[100],
      backgroundColor: theme.colors.background.secondary,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    sectionLabel: {
      letterSpacing: 1,
      marginBottom: 6,
    },
    mappingSection: {
      backgroundColor: theme.colors.white,
      borderRadius: 12,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
    },
    mappedItemInfo: {
      padding: theme.spacing.sm + 2,
      backgroundColor: theme.colors.success[50],
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.success[100],
    },
    notMappedInfo: {
      padding: theme.spacing.sm + 2,
      backgroundColor: theme.colors.gray[50],
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
    },
    pickerSection: {
      backgroundColor: theme.colors.white,
      borderRadius: 12,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
    },
    pickerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 12,
      backgroundColor: theme.colors.background.secondary,
    },
    pickerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    pickerIconWrap: {
      width: 26,
      height: 26,
      borderRadius: 8,
      backgroundColor: theme.colors.primary[50],
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionsSection: {marginTop: 4},
    notesInput: {
      backgroundColor: theme.colors.background.secondary,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      minHeight: 60,
      fontSize: theme.typography.roles.body.fontSize,
      color: theme.colors.gray[900],
    },
  });
};
