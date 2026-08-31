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
import {Pagination} from '../components/molecules/Pagination';
import useDebounce from '../hooks/useDebounce';
import {useServerPagination} from '../hooks/useServerPagination';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {Button} from '../components/atoms/Button';
import {useAuth} from '../contexts/AuthContext';
import {useTheme} from '../contexts/ThemeContext';
import {Theme} from '../theme';
import {useBreakpoint, BreakpointInfo} from '../utils/breakpoints';
import itemCaseQuantityService, {
  CaseQuantityItem,
} from '../services/itemCaseQuantityService';
import {
  AlertCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  BoxIcon,
  CloseIcon,
  RefreshIcon,
  SearchIcon,
} from '../components/icons';

interface CaseQuantityMappingScreenProps {
  visible: boolean;
  onClose: () => void;
}

type FilterKey = 'all' | 'mapped' | 'unmapped' | 'bulk';

// While a row is being edited the units-per-case field holds the raw text so
// the user can clear it before typing a new number.
type EditableItem = Omit<CaseQuantityItem, 'unitsPerCase'> & {
  unitsPerCase: number | string;
};

const FILTERS: {key: FilterKey; label: string}[] = [
  {key: 'all', label: 'All'},
  {key: 'mapped', label: 'Mapped'},
  {key: 'unmapped', label: 'Unmapped'},
  {key: 'bulk', label: 'Bulk'},
];

export const CaseQuantityMappingScreen: React.FC<CaseQuantityMappingScreenProps> = ({
  visible,
  onClose,
}) => {
  const theme = useTheme();
  const bp = useBreakpoint();
  const styles = useMemo(() => makeStyles(theme, bp), [theme, bp]);
  const {token} = useAuth();
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [filterStatus, setFilterStatus] = useState<FilterKey>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({total: 0, mapped: 0, unmapped: 0, bulk: 0});

  const heroFade = useRef(new Animated.Value(1)).current;
  const heroSlide = useRef(new Animated.Value(0)).current;
  const blobPulse = useRef(new Animated.Value(0)).current;

  // Server-side numbered pagination: search + status filter run on the backend
  // over the FULL purchased-item set, not just the page held locally.
  const {
    items: pageItems,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    extra,
    initialLoading,
    refreshing,
    error,
    refresh,
    refetch,
  } = useServerPagination<CaseQuantityItem>(
    async (pg, limit) => {
      const res = await itemCaseQuantityService.getPurchasedItems(token!, {
        page: pg,
        limit,
        search: debouncedSearch || undefined,
        status: filterStatus,
      });
      return {
        items: res.items || [],
        total: res.pagination?.total ?? 0,
        pages: res.pagination?.totalPages ?? 1,
        extra: res.stats,
      };
    },
    {
      pageSize: 20,
      resetKey: `${debouncedSearch}|${filterStatus}`,
      enabled: !!(visible && token),
    },
  );

  // Editable copy of the freshly-fetched page.
  useEffect(() => {
    setItems(pageItems);
  }, [pageItems]);

  useEffect(() => {
    if (extra) setStats(extra as any);
  }, [extra]);

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

  const toggleExpanded = (sku: string) => {
    const next = new Set(expanded);
    if (next.has(sku)) next.delete(sku);
    else next.add(sku);
    setExpanded(next);
  };

  const patchItem = (sku: string, patch: Partial<EditableItem>) => {
    setItems(prev => prev.map(i => (i.sku === sku ? {...i, ...patch} : i)));
  };

  const saveMapping = async (sku: string) => {
    const item = items.find(i => i.sku === sku);
    if (!item) return;
    const unitsPerCase = Number(item.unitsPerCase);
    if (!Number.isFinite(unitsPerCase) || unitsPerCase < 1) {
      Alert.alert('Error', 'Units per case must be 1 or more');
      return;
    }
    try {
      setSaving(true);
      await itemCaseQuantityService.saveMapping(token!, {
        sku: item.sku,
        itemName: item.itemName,
        unitsPerCase,
        purchaseUnitLabel: item.purchaseUnitLabel || 'Case',
        sellingUnitLabel: item.sellingUnitLabel || 'Each',
        notes: item.notes || '',
      });
      Alert.alert('Success', `Case quantity saved for ${sku}`);
      const next = new Set(expanded);
      next.delete(sku);
      setExpanded(next);
      refetch();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save case quantity');
    } finally {
      setSaving(false);
    }
  };

  const deleteMapping = (sku: string) => {
    Alert.alert(
      'Reset Case Quantity',
      `Reset ${sku} back to 1 unit per purchase unit?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              await itemCaseQuantityService.deleteMapping(token!, sku);
              Alert.alert('Success', `Case quantity removed for ${sku}`);
              refetch();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to remove case quantity');
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
        {initialLoading ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingMark}>
              <BoxIcon size={22} color={theme.colors.primary[600]} />
            </View>
            <ActivityIndicator size="large" color={theme.colors.primary[600]} />
            <Typography variant="body" color={theme.colors.gray[600]} style={{marginTop: 16}}>
              Loading purchased items...
            </Typography>
          </View>
        ) : (
          <PaginatedList
            data={items}
            keyExtractor={(item, index) => item.sku || String(index)}
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, styles.contentWrap]}
            refreshing={refreshing}
            onRefresh={refresh}
            resetKey={`${debouncedSearch}|${filterStatus}`}
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
                          Case Quantities
                        </Typography>
                        <Typography variant="small" color={theme.colors.brand.textMuted}>
                          Units contained in one purchased case
                        </Typography>
                      </View>
                      <TouchableOpacity onPress={refetch} style={styles.heroIconBtn} activeOpacity={0.85}>
                        <RefreshIcon size={18} color={theme.colors.brand.text} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.statusChip}>
                      <View style={styles.statusDot} />
                      <Typography variant="caption" weight="semibold" color={theme.colors.brand.text}>
                        {completionPct}% mapped · {stats.bulk} bulk items
                      </Typography>
                    </View>

                    <View style={styles.heroMetricsRow}>
                      {[
                        {label: 'TOTAL', value: stats.total},
                        {label: 'MAPPED', value: stats.mapped},
                        {label: 'UNMAPPED', value: stats.unmapped},
                      ].map((metric, idx) => (
                        <React.Fragment key={metric.label}>
                          {idx > 0 && <View style={styles.heroMetricDivider} />}
                          <View style={styles.heroMetric}>
                            <Typography
                              variant="caption"
                              weight="semibold"
                              color={theme.colors.brand.textMuted}
                              style={styles.heroMetricLabel}>
                              {metric.label}
                            </Typography>
                            <Typography variant="h3" weight="bold" color={theme.colors.brand.text}>
                              {metric.value}
                            </Typography>
                          </View>
                        </React.Fragment>
                      ))}
                    </View>
                  </Animated.View>
                </View>

                <View style={styles.searchWrap}>
                  <View style={styles.searchCard}>
                    <SearchIcon size={18} color={theme.colors.gray[500]} />
                    <RNTextInput
                      style={styles.searchInput}
                      placeholder="Search SKU or item"
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
                    {FILTERS.map(opt => {
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

                {!error && total > 0 && (
                  <View style={styles.sectionEyebrow}>
                    <View style={styles.eyebrowLine} />
                    <Typography variant="caption" weight="semibold" color={theme.colors.primary[600]}>
                      ITEMS · {total}
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
                    No purchased items found
                  </Typography>
                  <Typography variant="small" color={theme.colors.gray[500]} align="center">
                    {searchQuery ? 'Try adjusting your search.' : 'No purchase order items yet.'}
                  </Typography>
                </Card>
              )
            }
            renderItem={({item}) => {
              const isExpanded = expanded.has(item.sku);
              const unitsPerCase = Number(item.unitsPerCase) || 1;
              const isBulk = unitsPerCase > 1;
              const stripeColor = item.isMapped
                ? theme.colors.success[500]
                : theme.colors.warning[500];
              const stockUnits = (item.countedCases || 0) * unitsPerCase;
              return (
                <View style={{paddingHorizontal: bp.gutter}}>
                  <Card variant="elevated" padding="none" style={styles.itemCard}>
                    <View style={[styles.itemStripe, {backgroundColor: stripeColor}]} />
                    <TouchableOpacity
                      onPress={() => toggleExpanded(item.sku)}
                      style={styles.itemHeader}
                      activeOpacity={0.85}>
                      <View
                        style={[
                          styles.itemIconWrap,
                          {
                            backgroundColor: isBulk
                              ? theme.colors.primary[50]
                              : theme.colors.gray[50],
                          },
                        ]}>
                        <BoxIcon
                          size={20}
                          color={isBulk ? theme.colors.primary[600] : theme.colors.gray[500]}
                        />
                      </View>
                      <View style={styles.itemInfo}>
                        <Typography variant="body" weight="bold" numberOfLines={1}>
                          {item.sku}
                        </Typography>
                        <Typography variant="caption" color={theme.colors.gray[500]} numberOfLines={1}>
                          {item.itemName || 'No item name'}
                        </Typography>
                        <Typography variant="caption" color={theme.colors.gray[500]} numberOfLines={1}>
                          {item.countedCases || 0} {item.purchaseUnitLabel || 'Case'} ={' '}
                          {stockUnits} {item.sellingUnitLabel || 'Each'}
                        </Typography>
                      </View>
                      <View
                        style={[
                          styles.qtyPill,
                          {
                            backgroundColor: isBulk
                              ? theme.colors.primary[50]
                              : theme.colors.gray[100],
                          },
                        ]}>
                        <Typography
                          variant="caption"
                          weight="bold"
                          color={isBulk ? theme.colors.primary[700] : theme.colors.gray[600]}>
                          ×{unitsPerCase}
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
                        <View style={styles.fieldSection}>
                          <Typography
                            variant="caption"
                            weight="semibold"
                            color={theme.colors.gray[600]}
                            style={styles.sectionLabel}>
                            UNITS PER CASE
                          </Typography>
                          <RNTextInput
                            style={styles.input}
                            keyboardType="number-pad"
                            value={String(item.unitsPerCase ?? 1)}
                            onChangeText={text =>
                              patchItem(item.sku, {
                                unitsPerCase: text.replace(/[^0-9]/g, ''),
                              })
                            }
                            placeholder="1"
                            placeholderTextColor={theme.colors.gray[400]}
                          />
                          <Typography variant="caption" color={theme.colors.gray[500]} style={{marginTop: 6}}>
                            Buying 1 {item.purchaseUnitLabel || 'Case'} adds{' '}
                            {Number(item.unitsPerCase) || 1} {item.sellingUnitLabel || 'Each'} to
                            stock. A sale removes 1.
                          </Typography>
                        </View>

                        <View style={styles.fieldRow}>
                          <View style={[styles.fieldSection, styles.fieldHalf]}>
                            <Typography
                              variant="caption"
                              weight="semibold"
                              color={theme.colors.gray[600]}
                              style={styles.sectionLabel}>
                              PURCHASE UNIT
                            </Typography>
                            <RNTextInput
                              style={styles.input}
                              value={item.purchaseUnitLabel || ''}
                              onChangeText={text => patchItem(item.sku, {purchaseUnitLabel: text})}
                              placeholder="Case"
                              placeholderTextColor={theme.colors.gray[400]}
                            />
                          </View>
                          <View style={[styles.fieldSection, styles.fieldHalf]}>
                            <Typography
                              variant="caption"
                              weight="semibold"
                              color={theme.colors.gray[600]}
                              style={styles.sectionLabel}>
                              SELLING UNIT
                            </Typography>
                            <RNTextInput
                              style={styles.input}
                              value={item.sellingUnitLabel || ''}
                              onChangeText={text => patchItem(item.sku, {sellingUnitLabel: text})}
                              placeholder="Each"
                              placeholderTextColor={theme.colors.gray[400]}
                            />
                          </View>
                        </View>

                        <View style={styles.fieldSection}>
                          <Typography
                            variant="caption"
                            weight="semibold"
                            color={theme.colors.gray[600]}
                            style={styles.sectionLabel}>
                            NOTES
                          </Typography>
                          <RNTextInput
                            style={[styles.input, styles.notesInput]}
                            placeholder="Add notes..."
                            value={item.notes || ''}
                            onChangeText={text => patchItem(item.sku, {notes: text})}
                            placeholderTextColor={theme.colors.gray[400]}
                            multiline
                            textAlignVertical="top"
                          />
                        </View>

                        <View style={styles.actionsSection}>
                          <Button
                            title="Save case quantity"
                            variant="primary"
                            onPress={() => saveMapping(item.sku)}
                            disabled={saving}
                            fullWidth
                          />
                          {item.isMapped && (
                            <Button
                              title="Reset to 1 per unit"
                              variant="danger"
                              onPress={() => deleteMapping(item.sku)}
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

    itemCard: {overflow: 'hidden', position: 'relative'},
    itemStripe: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 3,
      backgroundColor: theme.colors.primary[500],
    },
    itemHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: theme.spacing.md,
      paddingTop: theme.spacing.md + 4,
    },
    itemIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemInfo: {flex: 1, gap: 2},
    qtyPill: {
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
    fieldSection: {
      backgroundColor: theme.colors.white,
      borderRadius: 12,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
    },
    fieldRow: {flexDirection: 'row', gap: theme.spacing.sm},
    fieldHalf: {flex: 1},
    input: {
      backgroundColor: theme.colors.background.secondary,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: theme.typography.roles.body.fontSize,
      color: theme.colors.gray[900],
    },
    notesInput: {minHeight: 60},
    actionsSection: {marginTop: 4},
  });
};
