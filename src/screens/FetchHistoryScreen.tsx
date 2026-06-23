import React, {useState, useEffect, useMemo, useRef} from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {PickerModal} from '../components/molecules/PickerModal';
import {PaginatedList} from '../components/molecules/PaginatedList';
import {useAuth} from '../contexts/AuthContext';
import {useApiErrorHandler} from '../hooks/useApiErrorHandler';
import {useTheme} from '../contexts/ThemeContext';
import {Theme} from '../theme';
import {useBreakpoint, BreakpointInfo} from '../utils/breakpoints';
import fetchHistoryService from '../services/fetchHistoryService';
import {
  AlertCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  CheckCircleIcon,
  ClipboardIcon,
  RefreshIcon,
  CloseIcon,
  TimelineIcon,
  XCircleIcon,
} from '../components/icons';
import {formatDate, formatDateTime} from '../utils/dateUtils';

interface FetchHistoryScreenProps {
  visible: boolean;
  onClose: () => void;
}

export const FetchHistoryScreen: React.FC<FetchHistoryScreenProps> = ({visible, onClose}) => {
  const {token, user} = useAuth();
  const {handleApiError} = useApiErrorHandler();
  const theme = useTheme();
  const bp = useBreakpoint();
  const styles = useMemo(() => makeStyles(theme, bp), [theme, bp]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [activeFetches, setActiveFetches] = useState<any[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [filterSource, setFilterSource] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDays, setFilterDays] = useState(10);
  const [sourcePickerVisible, setSourcePickerVisible] = useState(false);
  const [statusPickerVisible, setStatusPickerVisible] = useState(false);
  const [daysPickerVisible, setDaysPickerVisible] = useState(false);
  const [stats, setStats] = useState({
    activeCount: 0,
    todayCount: 0,
    successRate: 100,
    totalCompleted: 0,
    totalFailed: 0,
  });

  const heroFade = useRef(new Animated.Value(1)).current;
  const heroSlide = useRef(new Animated.Value(0)).current;
  const blobPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && token) loadData();
  }, [visible, token, filterSource, filterStatus, filterDays]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (visible && token) {
      interval = setInterval(() => loadData(true), 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [visible, token, filterSource, filterStatus, filterDays]);

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

  const loadData = async (silent = false) => {
    if (!token) return;
    try {
      if (!silent) setLoading(true);
      setError(null);
      const params: any = {page: 1, limit: 100, days: filterDays};
      if (filterSource) params.source = filterSource;
      if (filterStatus) params.status = filterStatus;
      const [historyData, activeFetchesData, statsData] = await Promise.all([
        fetchHistoryService.getHistory(token, params),
        fetchHistoryService.getActiveFetches(token, filterSource),
        fetchHistoryService.getStatistics(token, filterSource, filterDays),
      ]);
      setHistory(historyData.history || []);
      setActiveFetches(activeFetchesData || []);
      setStats(
        statsData || {activeCount: 0, todayCount: 0, successRate: 100, totalCompleted: 0, totalFailed: 0},
      );
    } catch (err: any) {
      console.error('Failed to fetch history:', err);
      const wasHandled = await handleApiError(err);
      if (wasHandled) return;
      if (!silent) setError(err.message || 'Failed to load data');
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

  const handleCancelFetch = (fetch: any) => {
    if (user?.role !== 'admin') {
      Alert.alert('Permission Denied', 'Only admins can cancel fetch operations');
      return;
    }
    Alert.alert(
      'Cancel Fetch',
      'Are you sure you want to cancel this fetch operation?',
      [
        {text: 'No', style: 'cancel'},
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetchHistoryService.cancelFetch(token!, fetch._id);
              Alert.alert('Success', 'Fetch operation cancelled');
              loadData();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to cancel fetch');
            }
          },
        },
      ],
    );
  };

  const getSourceLabel = (source: string, fetchType?: string) => {
    if (source === 'customer_connect') return 'Orders';
    if (source === 'routestar_invoices') {
      if (fetchType === 'pending' || fetchType === 'pending_with_details') return 'Pending Invoices';
      if (fetchType === 'closed' || fetchType === 'closed_with_details') return 'Closed Invoices';
      return 'Invoices';
    }
    if (source === 'routestar_items') return 'Items';
    return source;
  };

  type StatusTone = 'success' | 'primary' | 'error' | 'gray';

  const getStatusTone = (status: string): StatusTone => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'primary';
      case 'failed': return 'error';
      default: return 'gray';
    }
  };

  const tonePalette = (tone: StatusTone) => {
    if (tone === 'gray') {
      return {bg: theme.colors.gray[100], fg: theme.colors.gray[700], strong: theme.colors.gray[500]};
    }
    return {
      bg: theme.colors[tone][50],
      fg: theme.colors[tone][700],
      strong: theme.colors[tone][500],
    };
  };

  const formatDuration = (ms: number) => {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const sourceOptions = [
    {label: 'All Sources', value: ''},
    {label: 'Orders', value: 'customer_connect'},
    {label: 'Invoices', value: 'routestar_invoices'},
    {label: 'Items', value: 'routestar_items'},
  ];
  const statusOptions = [
    {label: 'All Status', value: ''},
    {label: 'In Progress', value: 'in_progress'},
    {label: 'Completed', value: 'completed'},
    {label: 'Failed', value: 'failed'},
    {label: 'Cancelled', value: 'cancelled'},
  ];
  const daysOptions = [
    {label: 'Last 24 hours', value: 1},
    {label: 'Last 3 days', value: 3},
    {label: 'Last 7 days', value: 7},
    {label: 'Last 10 days', value: 10},
  ];

  const blobScale = blobPulse.interpolate({inputRange: [0, 1], outputRange: [1, 1.08]});
  const blobOpacity = blobPulse.interpolate({inputRange: [0, 1], outputRange: [0.18, 0.28]});

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingMark}>
              <TimelineIcon size={22} color={theme.colors.primary[600]} />
            </View>
            <ActivityIndicator size="large" color={theme.colors.primary[600]} />
            <Typography variant="body" color={theme.colors.gray[600]} style={{marginTop: 16}}>
              Loading history...
            </Typography>
          </View>
        ) : (
          <PaginatedList
            data={history}
            keyExtractor={(item, index) => item._id || String(index)}
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, {paddingBottom: 0}]}
            refreshing={refreshing}
            onRefresh={onRefresh}
            resetKey={`${filterSource}|${filterStatus}|${filterDays}`}
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
                          SYSTEM
                        </Typography>
                        <Typography variant="h2" weight="bold" color={theme.colors.brand.text} style={styles.heroTitle}>
                          Fetch History
                        </Typography>
                        <Typography variant="small" color={theme.colors.brand.textMuted}>
                          External sync run history · auto-refresh 30s
                        </Typography>
                      </View>
                      <TouchableOpacity onPress={() => loadData()} style={styles.heroIconBtn} activeOpacity={0.85}>
                        <RefreshIcon size={18} color={theme.colors.brand.text} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.statusChip}>
                      <View style={[styles.statusDot, stats.activeCount > 0 ? {backgroundColor: theme.colors.warning[400]} : null]} />
                      <Typography variant="caption" weight="semibold" color={theme.colors.brand.text}>
                        {stats.activeCount > 0
                          ? `${stats.activeCount} running · ${stats.successRate.toFixed(0)}% success`
                          : `Idle · ${stats.successRate.toFixed(0)}% success rate`}
                      </Typography>
                    </View>

                    <View style={styles.heroMetricsRow}>
                      <View style={styles.heroMetric}>
                        <Typography variant="caption" weight="semibold" color={theme.colors.brand.textMuted} style={styles.heroMetricLabel}>
                          ACTIVE
                        </Typography>
                        <Typography variant="h3" weight="bold" color={theme.colors.brand.text}>
                          {stats.activeCount}
                        </Typography>
                      </View>
                      <View style={styles.heroMetricDivider} />
                      <View style={styles.heroMetric}>
                        <Typography variant="caption" weight="semibold" color={theme.colors.brand.textMuted} style={styles.heroMetricLabel}>
                          TODAY
                        </Typography>
                        <Typography variant="h3" weight="bold" color={theme.colors.brand.text}>
                          {stats.todayCount}
                        </Typography>
                      </View>
                      <View style={styles.heroMetricDivider} />
                      <View style={styles.heroMetric}>
                        <Typography variant="caption" weight="semibold" color={theme.colors.brand.textMuted} style={styles.heroMetricLabel}>
                          SUCCESS
                        </Typography>
                        <Typography variant="h3" weight="bold" color={theme.colors.brand.text}>
                          {stats.successRate.toFixed(0)}%
                        </Typography>
                      </View>
                    </View>
                  </Animated.View>
                </View>

                <View style={styles.contentWrap}>
                  <View style={styles.statsGridWrap}>
                    <View style={[styles.statTile, {backgroundColor: theme.colors.success[50]}]}>
                      <View style={[styles.statTileIcon, {backgroundColor: theme.colors.success[100]}]}>
                        <CheckCircleIcon size={16} color={theme.colors.success[600]} />
                      </View>
                      <Typography variant="caption" weight="semibold" color={theme.colors.success[700]}>
                        Completed
                      </Typography>
                      <Typography variant="h3" weight="bold" color={theme.colors.success[700]}>
                        {stats.totalCompleted}
                      </Typography>
                    </View>
                    <View style={[styles.statTile, {backgroundColor: theme.colors.error[50]}]}>
                      <View style={[styles.statTileIcon, {backgroundColor: theme.colors.error[100]}]}>
                        <XCircleIcon size={16} color={theme.colors.error[600]} />
                      </View>
                      <Typography variant="caption" weight="semibold" color={theme.colors.error[700]}>
                        Failed
                      </Typography>
                      <Typography variant="h3" weight="bold" color={theme.colors.error[700]}>
                        {stats.totalFailed}
                      </Typography>
                    </View>
                    <View style={[styles.statTile, {backgroundColor: theme.colors.primary[50]}]}>
                      <View style={[styles.statTileIcon, {backgroundColor: theme.colors.primary[100]}]}>
                        <RefreshIcon size={16} color={theme.colors.primary[600]} />
                      </View>
                      <Typography variant="caption" weight="semibold" color={theme.colors.primary[700]}>
                        Last {filterDays}d
                      </Typography>
                      <Typography variant="h3" weight="bold" color={theme.colors.primary[700]}>
                        {stats.totalCompleted + stats.totalFailed}
                      </Typography>
                    </View>
                  </View>

                  {activeFetches.length > 0 && (
                    <>
                      <View style={styles.sectionEyebrow}>
                        <View style={styles.eyebrowLine} />
                        <Typography variant="caption" weight="semibold" color={theme.colors.primary[600]}>
                          ACTIVE · {activeFetches.length}
                        </Typography>
                      </View>
                      <View style={styles.activeFetchesList}>
                        {activeFetches.map(fetch => (
                          <Card key={fetch._id} variant="elevated" padding="none" style={styles.activeFetchCard}>
                            <View style={[styles.activeFetchStripe, {backgroundColor: theme.colors.primary[500]}]} />
                            <View style={styles.activeFetchBody}>
                              <View style={[styles.activeFetchIcon, {backgroundColor: theme.colors.primary[50]}]}>
                                <ClockIcon size={16} color={theme.colors.primary[600]} />
                              </View>
                              <View style={{flex: 1}}>
                                <Typography variant="small" weight="semibold">
                                  {getSourceLabel(fetch.source, fetch.fetchType)}
                                </Typography>
                                <Typography variant="caption" color={theme.colors.gray[500]}>
                                  Started {formatDateTime(fetch.startedAt)}
                                </Typography>
                                {fetch.user && (
                                  <Typography variant="caption" color={theme.colors.gray[500]}>
                                    By {fetch.user.fullName || fetch.user.username}
                                  </Typography>
                                )}
                              </View>
                              {user?.role === 'admin' && (
                                <TouchableOpacity
                                  style={styles.cancelButton}
                                  onPress={() => handleCancelFetch(fetch)}
                                  activeOpacity={0.85}>
                                  <Typography variant="caption" color={theme.colors.error[700]} weight="semibold">
                                    Cancel
                                  </Typography>
                                </TouchableOpacity>
                              )}
                            </View>
                          </Card>
                        ))}
                      </View>
                    </>
                  )}

                  <View style={styles.filtersWrap}>
                    <View style={styles.filtersCard}>
                      <Typography variant="caption" weight="semibold" color={theme.colors.gray[600]} style={styles.filtersTitle}>
                        FILTERS
                      </Typography>
                      <View style={styles.filtersRow}>
                        <View style={styles.filterCell}>
                          <Typography variant="caption" color={theme.colors.gray[500]}>
                            Source
                          </Typography>
                          <TouchableOpacity
                            style={styles.filterButton}
                            onPress={() => setSourcePickerVisible(true)}
                            activeOpacity={0.85}>
                            <Typography variant="small" weight="semibold" numberOfLines={1} style={{flex: 1}}>
                              {sourceOptions.find(s => s.value === filterSource)?.label || 'All Sources'}
                            </Typography>
                            <ChevronDownIcon size={14} color={theme.colors.gray[500]} />
                          </TouchableOpacity>
                        </View>
                        <View style={styles.filterCell}>
                          <Typography variant="caption" color={theme.colors.gray[500]}>
                            Status
                          </Typography>
                          <TouchableOpacity
                            style={styles.filterButton}
                            onPress={() => setStatusPickerVisible(true)}
                            activeOpacity={0.85}>
                            <Typography variant="small" weight="semibold" numberOfLines={1} style={{flex: 1}}>
                              {filterStatus
                                ? filterStatus.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                                : 'All Status'}
                            </Typography>
                            <ChevronDownIcon size={14} color={theme.colors.gray[500]} />
                          </TouchableOpacity>
                        </View>
                      </View>
                      <View style={styles.filtersRow}>
                        <View style={styles.filterCell}>
                          <Typography variant="caption" color={theme.colors.gray[500]}>
                            Time period
                          </Typography>
                          <TouchableOpacity
                            style={styles.filterButton}
                            onPress={() => setDaysPickerVisible(true)}
                            activeOpacity={0.85}>
                            <Typography variant="small" weight="semibold" numberOfLines={1} style={{flex: 1}}>
                              {daysOptions.find(d => d.value === filterDays)?.label || 'Last 10 days'}
                            </Typography>
                            <ChevronDownIcon size={14} color={theme.colors.gray[500]} />
                          </TouchableOpacity>
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

                  {!error && history.length > 0 && (
                    <View style={styles.sectionEyebrow}>
                      <View style={styles.eyebrowLine} />
                      <Typography variant="caption" weight="semibold" color={theme.colors.primary[600]}>
                        HISTORY · {history.length}
                      </Typography>
                    </View>
                  )}
                </View>
              </View>
            }
            ListEmptyComponent={
              error ? null : (
                <View style={styles.contentWrap}>
                  <Card variant="elevated" padding="lg" style={styles.emptyCard}>
                    <View style={styles.emptyIconWrap}>
                      <ClipboardIcon size={32} color={theme.colors.primary[600]} />
                    </View>
                    <Typography variant="h3" weight="semibold" color={theme.colors.gray[800]} style={styles.emptyTitle}>
                      No fetch history
                    </Typography>
                    <Typography variant="small" color={theme.colors.gray[500]} align="center">
                      No sync operations match the selected filters.
                    </Typography>
                  </Card>
                </View>
              )
            }
            renderItem={({item, index}) => {
              const isExpanded = expandedItems.has(item._id);
              const tone = getStatusTone(item.status);
              const palette = tonePalette(tone);
              return (
                <View style={styles.contentWrap}>
                  <Card variant="elevated" padding="none" style={styles.historyCard}>
                    <View style={[styles.historyStripe, {backgroundColor: palette.strong}]} />
                    <TouchableOpacity onPress={() => handleItemPress(item._id)} style={styles.historyHeader} activeOpacity={0.85}>
                      <View style={[styles.historyIconWrap, {backgroundColor: palette.bg}]}>
                        {item.status === 'completed' ? (
                          <CheckCircleIcon size={18} color={palette.fg} />
                        ) : item.status === 'in_progress' ? (
                          <ClockIcon size={18} color={palette.fg} />
                        ) : item.status === 'failed' ? (
                          <XCircleIcon size={18} color={palette.fg} />
                        ) : (
                          <AlertCircleIcon size={18} color={palette.fg} />
                        )}
                      </View>
                      <View style={styles.historyInfo}>
                        <Typography variant="body" weight="bold" numberOfLines={1}>
                          {getSourceLabel(item.source, item.fetchType)}
                        </Typography>
                        <Typography variant="caption" color={theme.colors.gray[500]} numberOfLines={1}>
                          {formatDateTime(item.startedAt)}
                          {item.user ? ` · ${item.user.fullName || item.user.username}` : ''}
                        </Typography>
                      </View>
                      <View style={[styles.statusPill, {backgroundColor: palette.bg}]}>
                        <Typography variant="caption" weight="semibold" color={palette.fg}>
                          {item.status.replace('_', ' ')}
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

                    <View style={styles.historyMeta}>
                      <View style={styles.metaRow}>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          Started
                        </Typography>
                        <Typography variant="small" weight="semibold">
                          {formatDate(item.startedAt)}
                        </Typography>
                      </View>
                      <View style={styles.metaRow}>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          Duration
                        </Typography>
                        <Typography variant="small" weight="semibold">
                          {formatDuration(item.duration)}
                        </Typography>
                      </View>
                      {item.results && (
                        <View style={styles.metaRow}>
                          <Typography variant="caption" color={theme.colors.gray[500]}>
                            Fetched
                          </Typography>
                          <Typography variant="small" weight="bold" color={theme.colors.primary[700]}>
                            {item.results.totalFetched || 0}
                          </Typography>
                        </View>
                      )}
                    </View>

                    {isExpanded && (
                      <View style={styles.expandedContent}>
                        {item.results && (
                          <View style={styles.resultsCard}>
                            <Typography
                              variant="caption"
                              weight="semibold"
                              color={theme.colors.gray[600]}
                              style={styles.resultsLabel}>
                              DETAILED RESULTS
                            </Typography>
                            <View style={styles.resultsGrid}>
                              <View style={[styles.resultTile, {backgroundColor: theme.colors.success[50]}]}>
                                <Typography variant="caption" weight="semibold" color={theme.colors.success[700]}>
                                  Created
                                </Typography>
                                <Typography variant="body" weight="bold" color={theme.colors.success[700]}>
                                  {item.results.created || 0}
                                </Typography>
                              </View>
                              <View style={[styles.resultTile, {backgroundColor: theme.colors.primary[50]}]}>
                                <Typography variant="caption" weight="semibold" color={theme.colors.primary[700]}>
                                  Updated
                                </Typography>
                                <Typography variant="body" weight="bold" color={theme.colors.primary[700]}>
                                  {item.results.updated || 0}
                                </Typography>
                              </View>
                              {item.results.detailsSynced !== undefined && (
                                <View style={[styles.resultTile, {backgroundColor: theme.colors.accent[50]}]}>
                                  <Typography variant="caption" weight="semibold" color={theme.colors.accent[700]}>
                                    Details
                                  </Typography>
                                  <Typography variant="body" weight="bold" color={theme.colors.accent[700]}>
                                    {item.results.detailsSynced}
                                  </Typography>
                                </View>
                              )}
                              {item.results.failed > 0 && (
                                <View style={[styles.resultTile, {backgroundColor: theme.colors.error[50]}]}>
                                  <Typography variant="caption" weight="semibold" color={theme.colors.error[700]}>
                                    Failed
                                  </Typography>
                                  <Typography variant="body" weight="bold" color={theme.colors.error[700]}>
                                    {item.results.failed}
                                  </Typography>
                                </View>
                              )}
                            </View>
                          </View>
                        )}
                        {item.errorMessage && (
                          <View style={styles.errorSection}>
                            <View style={styles.errorSectionTop}>
                              <AlertCircleIcon size={14} color={theme.colors.error[600]} />
                              <Typography variant="caption" weight="semibold" color={theme.colors.error[700]}>
                                ERROR
                              </Typography>
                            </View>
                            <Typography variant="small" color={theme.colors.error[700]}>
                              {item.errorMessage}
                            </Typography>
                          </View>
                        )}
                      </View>
                    )}
                  </Card>
                </View>
              );
            }}
          />
        )}

        <PickerModal
          visible={sourcePickerVisible}
          onClose={() => setSourcePickerVisible(false)}
          items={sourceOptions}
          selectedValue={filterSource}
          onValueChange={(value) => {
            setFilterSource(value);
            setSourcePickerVisible(false);
          }}
          placeholder="Select Source"
          getLabel={(item) => item.label}
          getValue={(item) => item.value}
        />
        <PickerModal
          visible={statusPickerVisible}
          onClose={() => setStatusPickerVisible(false)}
          items={statusOptions}
          selectedValue={filterStatus}
          onValueChange={(value) => {
            setFilterStatus(value);
            setStatusPickerVisible(false);
          }}
          placeholder="Select Status"
          getLabel={(item) => item.label}
          getValue={(item) => item.value}
        />
        <PickerModal
          visible={daysPickerVisible}
          onClose={() => setDaysPickerVisible(false)}
          items={daysOptions}
          selectedValue={String(filterDays)}
          onValueChange={(value) => {
            setFilterDays(typeof value === 'number' ? value : Number(value));
            setDaysPickerVisible(false);
          }}
          placeholder="Select Time Period"
          getLabel={(item) => item.label}
          getValue={(item) => String(item.value)}
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
    dotGrid: {position: 'absolute', top: 50, right: 18, width: 90, flexDirection: 'row', flexWrap: 'wrap', gap: 10, opacity: 0.18},
    dot: {width: 4, height: 4, borderRadius: 2, backgroundColor: theme.colors.white},
    heroBody: {
      zIndex: 2,
      width: '100%',
      maxWidth: bp.contentMaxWidth,
      alignSelf: 'center',
    },
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

    // Content wrap: centers & caps all post-hero content
    contentWrap: {
      width: '100%',
      maxWidth: bp.contentMaxWidth,
      alignSelf: 'center',
      paddingHorizontal: bp.gutter,
    },

    statsGridWrap: {
      flexDirection: 'row',
      marginTop: -22,
      gap: 8,
      zIndex: 3,
    },
    statTile: {
      flex: 1, borderRadius: 14, padding: 12, gap: 4,
      ...theme.shadows.sm,
    },
    statTileIcon: {width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 4},

    sectionEyebrow: {
      flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
      marginTop: theme.spacing.lg, marginBottom: theme.spacing.md,
    },
    eyebrowLine: {width: 24, height: 2, borderRadius: 1, backgroundColor: theme.colors.primary[600]},

    activeFetchesList: {gap: theme.spacing.sm},
    activeFetchCard: {overflow: 'hidden', position: 'relative'},
    activeFetchStripe: {position: 'absolute', top: 0, left: 0, bottom: 0, width: 3},
    activeFetchBody: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      padding: theme.spacing.sm + 4,
      paddingLeft: theme.spacing.md,
    },
    activeFetchIcon: {width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center'},
    cancelButton: {
      paddingHorizontal: 12, paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: theme.colors.error[50],
      borderWidth: 1,
      borderColor: theme.colors.error[100],
    },

    filtersWrap: {marginTop: theme.spacing.md},
    filtersCard: {
      backgroundColor: theme.colors.white,
      borderRadius: 14,
      padding: theme.spacing.md,
      borderWidth: 1, borderColor: theme.colors.gray[200],
      gap: theme.spacing.sm,
    },
    filtersTitle: {letterSpacing: 1, marginBottom: 4},
    filtersRow: {flexDirection: 'row', gap: 8},
    filterCell: {flex: 1, gap: 4},
    filterButton: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: theme.colors.background.secondary,
      borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 10,
      borderWidth: 1, borderColor: theme.colors.gray[200],
    },

    errorCard: {
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

    historyList: {gap: theme.spacing.md},
    historyCard: {overflow: 'hidden', position: 'relative'},
    historyStripe: {position: 'absolute', top: 0, left: 0, right: 0, height: 3},
    historyHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      padding: theme.spacing.md,
      paddingTop: theme.spacing.md + 4,
    },
    historyIconWrap: {width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center'},
    historyInfo: {flex: 1, gap: 2},
    statusPill: {paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999},
    chevronCircle: {
      width: 28, height: 28, borderRadius: 14,
      backgroundColor: theme.colors.gray[50],
      alignItems: 'center', justifyContent: 'center',
    },
    historyMeta: {
      borderTopWidth: 1, borderTopColor: theme.colors.gray[100],
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    metaRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},

    expandedContent: {
      borderTopWidth: 1, borderTopColor: theme.colors.gray[100],
      backgroundColor: theme.colors.background.secondary,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    resultsCard: {
      backgroundColor: theme.colors.white,
      borderRadius: 12,
      padding: theme.spacing.md,
      borderWidth: 1, borderColor: theme.colors.gray[200],
    },
    resultsLabel: {letterSpacing: 1, marginBottom: 8},
    resultsGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
    resultTile: {
      flexBasis: '47%', flexGrow: 1,
      paddingHorizontal: 10, paddingVertical: 8,
      borderRadius: 10,
      gap: 2,
    },
    errorSection: {
      backgroundColor: theme.colors.error[50],
      borderRadius: 12,
      padding: theme.spacing.md,
      borderWidth: 1, borderColor: theme.colors.error[200],
      gap: 6,
    },
    errorSectionTop: {flexDirection: 'row', alignItems: 'center', gap: 6},
  });
};
