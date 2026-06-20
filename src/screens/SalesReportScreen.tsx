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
  Animated,
  Easing,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {useAuth} from '../contexts/AuthContext';
import {useApiErrorHandler} from '../hooks/useApiErrorHandler';
import {useTheme} from '../contexts/ThemeContext';
import {Theme} from '../theme';
import salesReportService from '../services/salesReportService';
import {
  AlertCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  BoxIcon,
  DollarIcon,
  FileTextIcon,
  TagIcon,
  CloseIcon,
  RefreshIcon,
  SearchIcon,
  BarChartIcon,
} from '../components/icons';
import {formatDate} from '../utils/dateUtils';

interface SalesReportScreenProps {
  visible: boolean;
  onClose: () => void;
}

export const SalesReportScreen: React.FC<SalesReportScreenProps> = ({visible, onClose}) => {
  const {token} = useAuth();
  const {handleApiError} = useApiErrorHandler();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const heroFade = useRef(new Animated.Value(1)).current;
  const heroSlide = useRef(new Animated.Value(0)).current;
  const blobPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && token) loadData();
  }, [visible, token]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = items.filter(
        item =>
          item.itemName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.itemParent?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      setFilteredItems(filtered);
    } else {
      setFilteredItems(items);
    }
  }, [searchQuery, items]);

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
      const response = await salesReportService.getSalesReport(token);
      setItems(response.items || []);
      setFilteredItems(response.items || []);
      setTotals(response.totals || {});
    } catch (err: any) {
      console.error('Failed to fetch sales report:', err);
      const wasHandled = await handleApiError(err);
      if (wasHandled) return;
      setError(err.message || 'Failed to load sales report');
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
    if (newExpanded.has(itemId)) newExpanded.delete(itemId);
    else newExpanded.add(itemId);
    setExpandedItems(newExpanded);
  };

  const formatCurrency = (amount: number) => `$${(amount || 0).toFixed(2)}`;

  const blobScale = blobPulse.interpolate({inputRange: [0, 1], outputRange: [1, 1.08]});
  const blobOpacity = blobPulse.interpolate({inputRange: [0, 1], outputRange: [0.18, 0.28]});

  const totalAmount = totals.totalSoldAmount || 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingMark}>
              <BarChartIcon size={22} color={theme.colors.primary[600]} />
            </View>
            <ActivityIndicator size="large" color={theme.colors.primary[600]} />
            <Typography variant="body" color={theme.colors.gray[600]} style={{marginTop: 16}}>
              Loading sales report...
            </Typography>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.white} />
            }>
            <View style={styles.hero}>
              <Animated.View style={[styles.blob, styles.blobOne, {transform: [{scale: blobScale}], opacity: blobOpacity}]} />
              <Animated.View style={[styles.blob, styles.blobTwo, {transform: [{scale: blobScale}], opacity: blobOpacity}]} />
              <View style={styles.dotGrid} pointerEvents="none">
                {Array.from({length: 18}).map((_, i) => <View key={i} style={styles.dot} />)}
              </View>

              <Animated.View style={[styles.heroBody, {opacity: heroFade, transform: [{translateY: heroSlide}]}]}>
                <View style={styles.heroTopRow}>
                  <TouchableOpacity onPress={onClose} style={styles.heroIconBtn} activeOpacity={0.85}>
                    <CloseIcon size={16} color={theme.colors.white} />
                  </TouchableOpacity>
                  <View style={{flex: 1}}>
                    <Typography variant="caption" weight="semibold" color={theme.colors.primary[200]} style={styles.heroEyebrow}>
                      REPORT
                    </Typography>
                    <Typography variant="h2" weight="bold" color={theme.colors.white} style={styles.heroTitle}>
                      Sales Performance
                    </Typography>
                    <Typography variant="small" color={theme.colors.primary[100]}>
                      Item-level sales rollup
                    </Typography>
                  </View>
                  <TouchableOpacity onPress={loadData} style={styles.heroIconBtn} activeOpacity={0.85}>
                    <RefreshIcon size={18} color={theme.colors.white} />
                  </TouchableOpacity>
                </View>

                <View style={styles.heroKpiCard}>
                  <View style={{flex: 1}}>
                    <Typography variant="caption" weight="semibold" color={theme.colors.primary[100]} style={styles.heroKpiLabel}>
                      TOTAL REVENUE
                    </Typography>
                    <Typography variant="h1" weight="bold" color={theme.colors.white} style={styles.heroKpiValue}>
                      {totalAmount >= 1000
                        ? `$${(totalAmount / 1000).toFixed(1)}K`
                        : formatCurrency(totalAmount)}
                    </Typography>
                    <Typography variant="caption" color={theme.colors.primary[100]} style={{marginTop: 4}}>
                      across {totals.totalInvoices || 0} invoices
                    </Typography>
                  </View>
                  <View style={styles.heroKpiIcon}>
                    <DollarIcon size={26} color={theme.colors.white} />
                  </View>
                </View>

                <View style={styles.heroMetricsRow}>
                  <View style={styles.heroMetric}>
                    <Typography variant="caption" weight="semibold" color={theme.colors.primary[100]} style={styles.heroMetricLabel}>
                      ITEMS
                    </Typography>
                    <Typography variant="h3" weight="bold" color={theme.colors.white}>
                      {totals.totalItems || 0}
                    </Typography>
                  </View>
                  <View style={styles.heroMetricDivider} />
                  <View style={styles.heroMetric}>
                    <Typography variant="caption" weight="semibold" color={theme.colors.primary[100]} style={styles.heroMetricLabel}>
                      UNITS SOLD
                    </Typography>
                    <Typography variant="h3" weight="bold" color={theme.colors.white}>
                      {totals.totalSoldQuantity || 0}
                    </Typography>
                  </View>
                  <View style={styles.heroMetricDivider} />
                  <View style={styles.heroMetric}>
                    <Typography variant="caption" weight="semibold" color={theme.colors.primary[100]} style={styles.heroMetricLabel}>
                      INVOICES
                    </Typography>
                    <Typography variant="h3" weight="bold" color={theme.colors.white}>
                      {totals.totalInvoices || 0}
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

            {!error && filteredItems.length === 0 && (
              <Card variant="elevated" padding="lg" style={styles.emptyCard}>
                <View style={styles.emptyIconWrap}>
                  <BoxIcon size={32} color={theme.colors.primary[600]} />
                </View>
                <Typography variant="h3" weight="semibold" color={theme.colors.gray[800]} style={styles.emptyTitle}>
                  No items found
                </Typography>
                <Typography variant="small" color={theme.colors.gray[500]} align="center">
                  {searchQuery ? 'Try adjusting your search.' : 'No sales data available yet.'}
                </Typography>
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

            <View style={styles.itemsList}>
              {filteredItems.map((item, index) => {
                const isExpanded = expandedItems.has(item._id);
                const hasSales = (item.soldQuantity || 0) > 0;
                return (
                  <Card key={item._id || index} variant="elevated" padding="none" style={styles.itemCard}>
                    <View
                      style={[
                        styles.itemStripe,
                        {backgroundColor: hasSales ? theme.colors.success[500] : theme.colors.gray[300]},
                      ]}
                    />
                    <TouchableOpacity onPress={() => handleItemPress(item._id)} style={styles.itemHeader} activeOpacity={0.85}>
                      <View
                        style={[
                          styles.itemIconWrap,
                          {backgroundColor: hasSales ? theme.colors.success[50] : theme.colors.gray[100]},
                        ]}>
                        <TagIcon
                          size={18}
                          color={hasSales ? theme.colors.success[600] : theme.colors.gray[500]}
                        />
                      </View>
                      <View style={styles.itemInfo}>
                        <Typography variant="body" weight="bold" numberOfLines={1}>
                          {item.itemName}
                        </Typography>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          {item.itemParent || 'No parent'} · On hand {item.qtyOnHand || 0}
                        </Typography>
                      </View>
                      <View style={styles.itemStatColumn}>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          Sold
                        </Typography>
                        <Typography
                          variant="body"
                          weight="bold"
                          color={hasSales ? theme.colors.success[700] : theme.colors.gray[500]}>
                          {item.soldQuantity || 0}
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
                        <View style={styles.summaryGrid}>
                          <View style={[styles.summaryTile, {backgroundColor: theme.colors.success[50]}]}>
                            <Typography variant="caption" weight="semibold" color={theme.colors.success[700]}>
                              Sold
                            </Typography>
                            <Typography variant="body" weight="bold" color={theme.colors.success[700]}>
                              {item.soldQuantity || 0}
                            </Typography>
                          </View>
                          <View style={[styles.summaryTile, {backgroundColor: theme.colors.primary[50]}]}>
                            <Typography variant="caption" weight="semibold" color={theme.colors.primary[700]}>
                              Revenue
                            </Typography>
                            <Typography variant="body" weight="bold" color={theme.colors.primary[700]}>
                              {formatCurrency(item.soldAmount || 0)}
                            </Typography>
                          </View>
                          <View style={[styles.summaryTile, {backgroundColor: theme.colors.accent[50]}]}>
                            <Typography variant="caption" weight="semibold" color={theme.colors.accent[700]}>
                              Invoices
                            </Typography>
                            <Typography variant="body" weight="bold" color={theme.colors.accent[700]}>
                              {item.invoiceCount || 0}
                            </Typography>
                          </View>
                        </View>

                        {item.description ? (
                          <View style={styles.descriptionCard}>
                            <Typography variant="caption" weight="semibold" color={theme.colors.gray[600]} style={styles.descriptionLabel}>
                              DESCRIPTION
                            </Typography>
                            <Typography variant="small" color={theme.colors.gray[700]}>
                              {item.description}
                            </Typography>
                          </View>
                        ) : null}

                        {item.invoiceDetails && item.invoiceDetails.length > 0 ? (
                          <>
                            <View style={styles.expandedHeader}>
                              <View style={[styles.expandedHeaderIcon, {backgroundColor: theme.colors.success[50]}]}>
                                <FileTextIcon size={14} color={theme.colors.success[600]} />
                              </View>
                              <Typography variant="small" weight="semibold" color={theme.colors.gray[800]}>
                                Invoice details
                              </Typography>
                              <View style={[styles.countPill, {backgroundColor: theme.colors.success[50]}]}>
                                <Typography variant="caption" weight="semibold" color={theme.colors.success[700]}>
                                  {item.invoiceDetails.length}
                                </Typography>
                              </View>
                            </View>
                            {item.invoiceDetails.map((invoice: any, invIndex: number) => (
                              <View key={invIndex} style={styles.invoiceItem}>
                                <View style={styles.invoiceItemTop}>
                                  <View style={[styles.detailIdBadge, {backgroundColor: theme.colors.success[50]}]}>
                                    <Typography variant="caption" weight="semibold" color={theme.colors.success[700]}>
                                      #{invoice.invoiceNumber}
                                    </Typography>
                                  </View>
                                  <Typography variant="caption" color={theme.colors.gray[500]}>
                                    {formatDate(invoice.invoiceDate)}
                                  </Typography>
                                </View>
                                <View style={styles.detailRow}>
                                  <Typography variant="caption" color={theme.colors.gray[500]}>
                                    Customer
                                  </Typography>
                                  <Typography variant="small" weight="semibold" numberOfLines={1} style={{flex: 1, textAlign: 'right'}}>
                                    {invoice.customer || 'N/A'}
                                  </Typography>
                                </View>
                                <View style={styles.detailRow}>
                                  <Typography variant="caption" color={theme.colors.gray[500]}>
                                    Quantity
                                  </Typography>
                                  <Typography variant="small" weight="bold">
                                    {invoice.quantity}
                                  </Typography>
                                </View>
                                <View style={styles.detailRow}>
                                  <Typography variant="caption" color={theme.colors.gray[500]}>
                                    Rate
                                  </Typography>
                                  <Typography variant="small">
                                    {formatCurrency(invoice.rate || 0)}
                                  </Typography>
                                </View>
                                <View style={styles.detailRow}>
                                  <Typography variant="caption" color={theme.colors.gray[500]}>
                                    Amount
                                  </Typography>
                                  <Typography variant="small" weight="bold" color={theme.colors.success[700]}>
                                    {formatCurrency(invoice.amount || 0)}
                                  </Typography>
                                </View>
                              </View>
                            ))}
                          </>
                        ) : (
                          <View style={styles.noInvoicesContainer}>
                            <FileTextIcon size={20} color={theme.colors.gray[400]} />
                            <Typography variant="small" color={theme.colors.gray[500]}>
                              No invoice entries found
                            </Typography>
                          </View>
                        )}
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

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {flex: 1, backgroundColor: theme.colors.primary[700]},
    loadingContainer: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.gray[50]},
    loadingMark: {
      width: 56, height: 56, borderRadius: 16,
      backgroundColor: theme.colors.primary[50],
      alignItems: 'center', justifyContent: 'center',
      marginBottom: theme.spacing.md,
    },
    scrollView: {flex: 1, backgroundColor: theme.colors.background.secondary},
    scrollContent: {paddingBottom: theme.spacing.xxxl},

    hero: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xl + theme.spacing.md,
      backgroundColor: theme.colors.primary[700],
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
      overflow: 'hidden',
      position: 'relative',
    },
    blob: {position: 'absolute', borderRadius: 9999},
    blobOne: {width: 280, height: 280, top: -130, right: -100, backgroundColor: theme.colors.primary[400]},
    blobTwo: {width: 220, height: 220, bottom: -110, left: -70, backgroundColor: theme.colors.accent[500]},
    dotGrid: {position: 'absolute', top: 50, right: 18, width: 90, flexDirection: 'row', flexWrap: 'wrap', gap: 10, opacity: 0.18},
    dot: {width: 4, height: 4, borderRadius: 2, backgroundColor: theme.colors.white},
    heroBody: {zIndex: 2},
    heroTopRow: {flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.md},
    heroEyebrow: {letterSpacing: 1.4, marginBottom: 4},
    heroTitle: {letterSpacing: -0.4, marginBottom: 2},
    heroIconBtn: {
      width: 36, height: 36, borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.14)',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
      alignItems: 'center', justifyContent: 'center',
    },
    heroKpiCard: {
      flexDirection: 'row', alignItems: 'center',
      padding: theme.spacing.md,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.10)',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
      marginBottom: theme.spacing.md,
    },
    heroKpiLabel: {letterSpacing: 1.4, marginBottom: 4},
    heroKpiValue: {letterSpacing: -0.6},
    heroKpiIcon: {
      width: 56, height: 56, borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.14)',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center', justifyContent: 'center',
      marginLeft: theme.spacing.md,
    },
    heroMetricsRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.10)',
      borderRadius: 14,
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
      paddingVertical: theme.spacing.md - 2, paddingHorizontal: theme.spacing.sm,
    },
    heroMetric: {flex: 1, alignItems: 'center', gap: 2},
    heroMetricLabel: {letterSpacing: 1.2},
    heroMetricDivider: {width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.18)'},

    searchWrap: {paddingHorizontal: theme.spacing.lg, marginTop: -22, zIndex: 3},
    searchCard: {
      flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
      backgroundColor: theme.colors.white, borderRadius: 14,
      paddingHorizontal: theme.spacing.md, paddingVertical: 10,
      borderWidth: 1, borderColor: theme.colors.gray[200],
      ...theme.shadows.md,
    },
    searchInput: {flex: 1, fontSize: 14, color: theme.colors.gray[900], paddingVertical: 0},
    searchClear: {
      width: 22, height: 22, borderRadius: 11,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: theme.colors.gray[100],
    },

    sectionEyebrow: {
      flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.lg, marginBottom: theme.spacing.md,
    },
    eyebrowLine: {width: 24, height: 2, borderRadius: 1, backgroundColor: theme.colors.primary[600]},

    errorCard: {
      marginHorizontal: theme.spacing.lg,
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
      marginHorizontal: theme.spacing.lg,
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

    itemsList: {paddingHorizontal: theme.spacing.lg, gap: theme.spacing.md},
    itemCard: {overflow: 'hidden', position: 'relative'},
    itemStripe: {position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: theme.colors.primary[500]},
    itemHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      padding: theme.spacing.md,
      paddingTop: theme.spacing.md + 4,
    },
    itemIconWrap: {width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center'},
    itemInfo: {flex: 1, gap: 2},
    itemStatColumn: {alignItems: 'flex-end'},
    chevronCircle: {
      width: 28, height: 28, borderRadius: 14,
      backgroundColor: theme.colors.gray[50],
      alignItems: 'center', justifyContent: 'center',
    },

    expandedContent: {
      borderTopWidth: 1, borderTopColor: theme.colors.gray[100],
      backgroundColor: theme.colors.background.secondary,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    summaryGrid: {flexDirection: 'row', gap: 8},
    summaryTile: {flex: 1, paddingHorizontal: 10, paddingVertical: 10, borderRadius: 10, gap: 2},
    descriptionCard: {
      backgroundColor: theme.colors.white, borderRadius: 12,
      padding: theme.spacing.md,
      borderWidth: 1, borderColor: theme.colors.gray[200],
    },
    descriptionLabel: {letterSpacing: 1, marginBottom: 4},

    expandedHeader: {flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, marginTop: 4},
    expandedHeaderIcon: {width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center'},
    countPill: {paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999},

    invoiceItem: {
      backgroundColor: theme.colors.white,
      borderRadius: 12,
      padding: theme.spacing.md,
      borderWidth: 1, borderColor: theme.colors.gray[200],
      gap: 6,
    },
    invoiceItemTop: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4},
    detailIdBadge: {paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999},
    detailRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},

    noInvoicesContainer: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      paddingVertical: theme.spacing.md,
    },
  });
