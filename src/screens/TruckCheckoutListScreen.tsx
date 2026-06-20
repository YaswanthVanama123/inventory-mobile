import React, {useState, useEffect, useMemo, useRef} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput as RNTextInput,
  Animated,
  Easing,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {useAuth} from '../contexts/AuthContext';
import {useApiErrorHandler} from '../hooks/useApiErrorHandler';
import {useTheme} from '../contexts/ThemeContext';
import {Theme} from '../theme';
import {useBreakpoint, BreakpointInfo} from '../utils/breakpoints';
import truckCheckoutService from '../services/truckCheckoutService';
import {
  TruckIcon,
  ClockIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon,
  RefreshIcon,
  SearchIcon,
  CloseIcon,
  UserIcon,
  FilterIcon,
} from '../components/icons';
import {formatDate, formatDateTime} from '../utils/dateUtils';

const TILE_GAP = 10;

type TabType = 'checkouts' | 'sales';
type SubTabType = 'all' | 'mine' | 'employees';

export const TruckCheckoutListScreen = () => {
  const theme = useTheme();
  const bp = useBreakpoint();
  const styles = useMemo(() => makeStyles(theme, bp), [theme, bp]);
  const {token, user} = useAuth();
  const navigation = useNavigation<any>();
  const {handleApiError} = useApiErrorHandler();
  const [activeTab, setActiveTab] = useState<TabType>('checkouts');
  const [checkoutsSubTab, setCheckoutsSubTab] = useState<SubTabType>('all');
  const [salesSubTab, setSalesSubTab] = useState<SubTabType>('all');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isMounted, setIsMounted] = useState(true);
  const [checkouts, setCheckouts] = useState<any[]>([]);
  const [expandedCheckout, setExpandedCheckout] = useState<string | null>(null);
  const [pagination, setPagination] = useState({total: 0, page: 1, limit: 50, pages: 0});
  const [employees, setEmployees] = useState<any[]>([]);
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [employeeCheckouts, setEmployeeCheckouts] = useState<any[]>([]);
  const [salesTracking, setSalesTracking] = useState<any[]>([]);
  const [salesSummary, setSalesSummary] = useState<any>({});
  const [salesEmployees, setSalesEmployees] = useState<any[]>([]);
  const [expandedSalesEmployee, setExpandedSalesEmployee] = useState<string | null>(null);
  const [employeeSalesTracking, setEmployeeSalesTracking] = useState<any[]>([]);
  const [myItems, setMyItems] = useState<any[]>([]);
  const [myTotals, setMyTotals] = useState<{checkedOut: number; remaining: number}>({checkedOut: 0, remaining: 0});
  const [statusFilter, setStatusFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const heroFade = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(20)).current;
  const blobPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'checkouts') {
      if (checkoutsSubTab === 'all') {
        loadCheckouts();
      } else if (checkoutsSubTab === 'mine') {
        loadMyCheckouts();
      } else {
        loadEmployees();
      }
    } else if (activeTab === 'sales') {
      if (salesSubTab === 'all') {
        loadSalesTracking();
      } else {
        loadSalesEmployees();
      }
    }
  }, [activeTab, checkoutsSubTab, salesSubTab, statusFilter, employeeFilter, searchTerm, pagination.page]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroFade, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(heroSlide, {
        toValue: 0,
        duration: 560,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

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
  }, [heroFade, heroSlide, blobPulse]);

  const loadCheckouts = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const filters: any = {page: pagination.page, limit: pagination.limit};
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (employeeFilter.trim()) filters.employeeName = employeeFilter.trim();
      const result = await truckCheckoutService.getCheckouts(token, filters);
      if (isMounted) {
        setCheckouts(result.checkouts || []);
        setPagination(result.pagination || {total: 0, page: 1, limit: 50, pages: 0});
      }
    } catch (err: any) {
      console.error('Load checkouts error:', err);
      const wasHandled = await handleApiError(err);
      if (!wasHandled && isMounted) setCheckouts([]);
    } finally {
      if (isMounted) setLoading(false);
    }
  };

  const loadMyCheckouts = async () => {
    if (!token || !user) return;
    try {
      setLoading(true);
      const myName = user.fullName || user.username;
      const result = await truckCheckoutService.getCheckouts(token, {employeeName: myName, limit: 500});
      const allCheckouts: any[] = result.checkouts || [];
      const itemMap = new Map<string, any>();
      allCheckouts.forEach((checkout: any) => {
        const items: any[] = checkout.itemName
          ? [{itemName: checkout.itemName, quantity: checkout.quantityTaking || 0}]
          : (checkout.itemsTaken || []).map((it: any) => ({
              itemName: it.itemName || it.name,
              quantity: it.quantity || 0,
            }));
        items.forEach(it => {
          if (!it.itemName) return;
          const key = it.itemName;
          if (!itemMap.has(key)) {
            itemMap.set(key, {
              itemName: it.itemName,
              totalCheckedOut: 0,
              totalSold: 0,
              checkoutCount: 0,
              trucks: new Set<string>(),
              lastCheckout: null as Date | null,
            });
          }
          const entry = itemMap.get(key);
          entry.totalCheckedOut += Number(it.quantity) || 0;
          entry.checkoutCount += 1;
          if (checkout.truckNumber) entry.trucks.add(checkout.truckNumber);
          const cdate = checkout.checkoutDate ? new Date(checkout.checkoutDate) : null;
          if (cdate && (!entry.lastCheckout || cdate > entry.lastCheckout)) {
            entry.lastCheckout = cdate;
          }
        });
      });
      const items = Array.from(itemMap.values()).map(e => ({
        ...e,
        trucks: Array.from(e.trucks).join(', '),
        remaining: e.totalCheckedOut - e.totalSold,
      }));
      const totals = items.reduce(
        (acc, it) => {
          acc.checkedOut += it.totalCheckedOut;
          acc.remaining += it.remaining;
          return acc;
        },
        {checkedOut: 0, remaining: 0},
      );
      if (isMounted) {
        setMyItems(items);
        setMyTotals(totals);
      }
    } catch (err: any) {
      console.error('Load my checkouts error:', err);
      const wasHandled = await handleApiError(err);
      if (!wasHandled && isMounted) {
        setMyItems([]);
        setMyTotals({checkedOut: 0, remaining: 0});
      }
    } finally {
      if (isMounted) setLoading(false);
    }
  };

  const loadSalesTracking = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const filters: any = {};
      if (employeeFilter.trim()) filters.employeeName = employeeFilter.trim();
      const result = await truckCheckoutService.getSalesTracking(token, filters);
      if (isMounted) {
        setSalesTracking(result.checkouts || []);
        setSalesSummary(result.summary || {});
      }
    } catch (err: any) {
      console.error('Load sales tracking error:', err);
      const wasHandled = await handleApiError(err);
      if (!wasHandled && isMounted) {
        setSalesTracking([]);
        setSalesSummary({});
      }
    } finally {
      if (isMounted) setLoading(false);
    }
  };

  const loadEmployees = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const filters: any = {};
      if (searchTerm.trim()) filters.search = searchTerm.trim();
      const result = await truckCheckoutService.getAllEmployeesWithStats(token, filters);
      if (isMounted) setEmployees(result || []);
    } catch (err: any) {
      console.error('Load employees error:', err);
      const wasHandled = await handleApiError(err);
      if (!wasHandled && isMounted) setEmployees([]);
    } finally {
      if (isMounted) setLoading(false);
    }
  };

  const loadSalesEmployees = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const filters: any = {};
      const result = await truckCheckoutService.getSalesTracking(token, filters);
      const allSalesTracking = result.checkouts || [];
      const employeeMap = new Map<string, any>();
      allSalesTracking.forEach((item: any) => {
        const key = `${item.employeeName}-${item.truckNumber || 'N/A'}`;
        if (!employeeMap.has(key)) {
          employeeMap.set(key, {
            employeeName: item.employeeName,
            truckNumber: item.truckNumber || 'N/A',
            items: [],
          });
        }
        employeeMap.get(key).items.push(item);
      });
      const groupedEmployees = Array.from(employeeMap.values()).map(emp => ({
        ...emp,
        totalCheckouts: emp.items.length,
        goodCount: emp.items.filter((i: any) => i.status === 'Good').length,
        shortageCount: emp.items.filter((i: any) => i.status === 'Shortage').length,
        overageCount: emp.items.filter((i: any) => i.status === 'Overage').length,
      }));
      if (isMounted) {
        if (searchTerm.trim()) {
          const searchLower = searchTerm.toLowerCase();
          setSalesEmployees(
            groupedEmployees.filter(
              emp =>
                emp.employeeName.toLowerCase().includes(searchLower) ||
                emp.truckNumber.toLowerCase().includes(searchLower),
            ),
          );
        } else {
          setSalesEmployees(groupedEmployees);
        }
      }
    } catch (err: any) {
      console.error('Load sales employees error:', err);
      const wasHandled = await handleApiError(err);
      if (!wasHandled && isMounted) setSalesEmployees([]);
    } finally {
      if (isMounted) setLoading(false);
    }
  };

  const handleEmployeeExpand = async (employeeName: string, truckNumber: string) => {
    const key = `${employeeName}-${truckNumber}`;
    if (expandedEmployee === key) {
      setExpandedEmployee(null);
      setEmployeeCheckouts([]);
      return;
    }
    setExpandedEmployee(key);
    if (!token) return;
    try {
      const filters: any = {employeeName, limit: 100};
      const result = await truckCheckoutService.getCheckouts(token, filters);
      if (isMounted) {
        const filtered = (result.checkouts || []).filter(
          (c: any) => (c.truckNumber || 'N/A') === truckNumber,
        );
        setEmployeeCheckouts(filtered);
      }
    } catch (err: any) {
      console.error('Load employee checkouts error:', err);
      await handleApiError(err);
    }
  };

  const handleSalesEmployeeExpand = async (employeeName: string, truckNumber: string) => {
    const key = `${employeeName}-${truckNumber}`;
    if (expandedSalesEmployee === key) {
      setExpandedSalesEmployee(null);
      setEmployeeSalesTracking([]);
      return;
    }
    setExpandedSalesEmployee(key);
    if (!token) return;
    try {
      const filters: any = {employeeName};
      if (truckNumber !== 'N/A') filters.truckNumber = truckNumber;
      const result = await truckCheckoutService.getSalesTracking(token, filters);
      if (isMounted) setEmployeeSalesTracking(result.checkouts || []);
    } catch (err: any) {
      console.error('Load employee sales tracking error:', err);
      await handleApiError(err);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (activeTab === 'checkouts') {
      if (checkoutsSubTab === 'all') {
        loadCheckouts().finally(() => setRefreshing(false));
      } else if (checkoutsSubTab === 'mine') {
        loadMyCheckouts().finally(() => setRefreshing(false));
      } else {
        loadEmployees().finally(() => setRefreshing(false));
      }
    } else {
      if (salesSubTab === 'all') {
        loadSalesTracking().finally(() => setRefreshing(false));
      } else {
        loadSalesEmployees().finally(() => setRefreshing(false));
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const config: any = {
      checked_out: {bg: theme.colors.primary[50], fg: theme.colors.primary[700], label: 'Checked Out'},
      completed: {bg: theme.colors.success[50], fg: theme.colors.success[700], label: 'Completed'},
      cancelled: {bg: theme.colors.error[50], fg: theme.colors.error[700], label: 'Cancelled'},
    };
    const {bg, fg, label} = config[status] || config.checked_out;
    return (
      <View style={[styles.statusPill, {backgroundColor: bg}]}>
        <Typography variant="caption" weight="semibold" color={fg}>
          {label}
        </Typography>
      </View>
    );
  };

  const getStatusBadgeForTracking = (status: string) => {
    const config: any = {
      Good: {bg: theme.colors.success[50], fg: theme.colors.success[700], label: 'Good'},
      Shortage: {bg: theme.colors.warning[50], fg: theme.colors.warning[700], label: 'Shortage'},
      Overage: {bg: theme.colors.error[50], fg: theme.colors.error[700], label: 'Overage'},
    };
    const {bg, fg, label} = config[status] || config.Good;
    return (
      <View style={[styles.statusPill, {backgroundColor: bg}]}>
        <Typography variant="caption" weight="semibold" color={fg}>
          {label}
        </Typography>
      </View>
    );
  };

  const blobScale = blobPulse.interpolate({inputRange: [0, 1], outputRange: [1, 1.08]});
  const blobOpacity = blobPulse.interpolate({inputRange: [0, 1], outputRange: [0.18, 0.28]});

  const heroLabel = (() => {
    if (activeTab === 'checkouts') {
      if (checkoutsSubTab === 'all') return `${pagination.total} checkouts`;
      if (checkoutsSubTab === 'mine') return `${myItems.length} my items`;
      return `${employees.length} employees`;
    }
    if (salesSubTab === 'all') return `${salesTracking.length} sales records`;
    return `${salesEmployees.length} employees`;
  })();

  const showFilters =
    !(activeTab === 'checkouts' && checkoutsSubTab === 'mine');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.white}
          />
        }>
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
              <View style={{flex: 1}}>
                <Typography
                  variant="caption"
                  weight="semibold"
                  color={theme.colors.brand.textTracked}
                  style={styles.heroEyebrow}>
                  TRUCK CHECKOUTS
                </Typography>
                <Typography variant="h2" weight="bold" color={theme.colors.brand.text} style={styles.heroTitle}>
                  Field Inventory
                </Typography>
                <Typography variant="small" color={theme.colors.brand.textMuted}>
                  Track items in trucks · reconcile sales
                </Typography>
              </View>
              <TouchableOpacity onPress={onRefresh} style={styles.heroRefresh} activeOpacity={0.85}>
                <RefreshIcon size={18} color={theme.colors.brand.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.statusChip}>
              <View style={styles.statusDot} />
              <Typography variant="caption" weight="semibold" color={theme.colors.brand.text}>
                {heroLabel}
              </Typography>
            </View>

            {activeTab === 'sales' && salesSubTab === 'all' ? (
              <View style={styles.heroMetricsRow}>
                <View style={styles.heroMetric}>
                  <Typography
                    variant="caption"
                    weight="semibold"
                    color={theme.colors.brand.textMuted}
                    style={styles.heroMetricLabel}>
                    GOOD
                  </Typography>
                  <Typography variant="h3" weight="bold" color={theme.colors.brand.text}>
                    {salesSummary.good || 0}
                  </Typography>
                </View>
                <View style={styles.heroMetricDivider} />
                <View style={styles.heroMetric}>
                  <Typography
                    variant="caption"
                    weight="semibold"
                    color={theme.colors.brand.textMuted}
                    style={styles.heroMetricLabel}>
                    SHORTAGE
                  </Typography>
                  <Typography variant="h3" weight="bold" color={theme.colors.brand.text}>
                    {salesSummary.shortage || 0}
                  </Typography>
                </View>
                <View style={styles.heroMetricDivider} />
                <View style={styles.heroMetric}>
                  <Typography
                    variant="caption"
                    weight="semibold"
                    color={theme.colors.brand.textMuted}
                    style={styles.heroMetricLabel}>
                    OVERAGE
                  </Typography>
                  <Typography variant="h3" weight="bold" color={theme.colors.brand.text}>
                    {salesSummary.overage || 0}
                  </Typography>
                </View>
              </View>
            ) : activeTab === 'checkouts' && checkoutsSubTab === 'mine' ? (
              <View style={styles.heroMetricsRow}>
                <View style={styles.heroMetric}>
                  <Typography
                    variant="caption"
                    weight="semibold"
                    color={theme.colors.brand.textMuted}
                    style={styles.heroMetricLabel}>
                    ITEMS
                  </Typography>
                  <Typography variant="h3" weight="bold" color={theme.colors.brand.text}>
                    {myItems.length}
                  </Typography>
                </View>
                <View style={styles.heroMetricDivider} />
                <View style={styles.heroMetric}>
                  <Typography
                    variant="caption"
                    weight="semibold"
                    color={theme.colors.brand.textMuted}
                    style={styles.heroMetricLabel}>
                    OUT
                  </Typography>
                  <Typography variant="h3" weight="bold" color={theme.colors.brand.text}>
                    {myTotals.checkedOut}
                  </Typography>
                </View>
                <View style={styles.heroMetricDivider} />
                <View style={styles.heroMetric}>
                  <Typography
                    variant="caption"
                    weight="semibold"
                    color={theme.colors.brand.textMuted}
                    style={styles.heroMetricLabel}>
                    LEFT
                  </Typography>
                  <Typography variant="h3" weight="bold" color={theme.colors.brand.text}>
                    {myTotals.remaining}
                  </Typography>
                </View>
              </View>
            ) : null}
          </Animated.View>
        </View>

        <View style={styles.contentWrap}>
        <View style={styles.tabsWrap}>
          <View style={styles.tabsCard}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'checkouts' && styles.tabActive]}
              onPress={() => setActiveTab('checkouts')}
              activeOpacity={0.85}>
              <TruckIcon size={14} color={activeTab === 'checkouts' ? theme.colors.white : theme.colors.gray[600]} />
              <Typography
                variant="small"
                weight="semibold"
                color={activeTab === 'checkouts' ? theme.colors.white : theme.colors.gray[700]}>
                Checkouts
              </Typography>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'sales' && styles.tabActive]}
              onPress={() => setActiveTab('sales')}
              activeOpacity={0.85}>
              <CheckCircleIcon size={14} color={activeTab === 'sales' ? theme.colors.white : theme.colors.gray[600]} />
              <Typography
                variant="small"
                weight="semibold"
                color={activeTab === 'sales' ? theme.colors.white : theme.colors.gray[700]}>
                Sales & Remaining
              </Typography>
            </TouchableOpacity>
          </View>
        </View>

        {activeTab === 'checkouts' && (
          <View style={styles.subTabsWrap}>
            {(
              [
                {key: 'all', label: 'All Checkouts'},
                {key: 'mine', label: 'My Items'},
                {key: 'employees', label: 'By Employee'},
              ] as const
            ).map(opt => {
              const active = checkoutsSubTab === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.subTab, active && styles.subTabActive]}
                  onPress={() => {
                    setCheckoutsSubTab(opt.key);
                    setExpandedEmployee(null);
                    setEmployeeCheckouts([]);
                    if (opt.key !== 'all') setCheckouts([]);
                  }}
                  activeOpacity={0.85}>
                  <Typography
                    variant="caption"
                    weight="semibold"
                    color={active ? theme.colors.primary[700] : theme.colors.gray[600]}>
                    {opt.label}
                  </Typography>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {activeTab === 'sales' && (
          <View style={styles.subTabsWrap}>
            {(
              [
                {key: 'all', label: 'All Sales'},
                {key: 'employees', label: 'By Employee'},
              ] as const
            ).map(opt => {
              const active = salesSubTab === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.subTab, active && styles.subTabActive]}
                  onPress={() => {
                    setSalesSubTab(opt.key);
                    setExpandedSalesEmployee(null);
                    setEmployeeSalesTracking([]);
                    if (opt.key !== 'all') setSalesTracking([]);
                  }}
                  activeOpacity={0.85}>
                  <Typography
                    variant="caption"
                    weight="semibold"
                    color={active ? theme.colors.primary[700] : theme.colors.gray[600]}>
                    {opt.label}
                  </Typography>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {showFilters && (
          <View style={styles.filtersWrap}>
            <TouchableOpacity
              style={styles.filtersToggle}
              onPress={() => setFiltersExpanded(prev => !prev)}
              activeOpacity={0.85}>
              <View style={styles.filtersToggleLeft}>
                <View style={styles.filtersToggleIcon}>
                  <FilterIcon size={14} color={theme.colors.primary[600]} />
                </View>
                <Typography variant="small" weight="semibold" color={theme.colors.gray[800]}>
                  Filters
                </Typography>
                {(statusFilter !== 'all' || employeeFilter || searchTerm) && (
                  <View style={styles.filtersBadge}>
                    <Typography variant="caption" weight="semibold" color={theme.colors.brand.text}>
                      Active
                    </Typography>
                  </View>
                )}
              </View>
              {filtersExpanded ? (
                <ChevronDownIcon size={16} color={theme.colors.gray[600]} />
              ) : (
                <ChevronRightIcon size={16} color={theme.colors.gray[600]} />
              )}
            </TouchableOpacity>

            {filtersExpanded && (
              <View style={styles.filtersBody}>
                {activeTab === 'checkouts' && checkoutsSubTab === 'all' && (
                  <View style={styles.filterGroup}>
                    <Typography variant="caption" weight="semibold" color={theme.colors.gray[600]} style={styles.filterLabel}>
                      Status
                    </Typography>
                    <View style={styles.statusFilters}>
                      {['all', 'checked_out', 'completed', 'cancelled'].map(status => (
                        <TouchableOpacity
                          key={status}
                          style={[
                            styles.statusFilter,
                            statusFilter === status && styles.statusFilterActive,
                          ]}
                          onPress={() => setStatusFilter(status)}
                          activeOpacity={0.85}>
                          <Typography
                            variant="caption"
                            weight="semibold"
                            color={statusFilter === status ? theme.colors.white : theme.colors.gray[700]}>
                            {status === 'all' ? 'All' : status.replace('_', ' ')}
                          </Typography>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
                {((activeTab === 'checkouts' && checkoutsSubTab === 'all') ||
                  (activeTab === 'sales' && salesSubTab === 'all')) && (
                  <View style={styles.filterGroup}>
                    <Typography variant="caption" weight="semibold" color={theme.colors.gray[600]} style={styles.filterLabel}>
                      Employee Name
                    </Typography>
                    <View style={styles.filterInputWrap}>
                      <UserIcon size={14} color={theme.colors.gray[500]} />
                      <RNTextInput
                        style={styles.filterInput}
                        value={employeeFilter}
                        onChangeText={setEmployeeFilter}
                        placeholder="Filter by employee name"
                        placeholderTextColor={theme.colors.gray[400]}
                      />
                    </View>
                  </View>
                )}
                {((activeTab === 'checkouts' && checkoutsSubTab === 'employees') ||
                  (activeTab === 'sales' && salesSubTab === 'employees')) && (
                  <View style={styles.filterGroup}>
                    <Typography variant="caption" weight="semibold" color={theme.colors.gray[600]} style={styles.filterLabel}>
                      Search
                    </Typography>
                    <View style={styles.filterInputWrap}>
                      <SearchIcon size={14} color={theme.colors.gray[500]} />
                      <RNTextInput
                        style={styles.filterInput}
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                        placeholder="Search by employee or route name"
                        placeholderTextColor={theme.colors.gray[400]}
                      />
                    </View>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.clearFiltersButton}
                  onPress={() => {
                    setStatusFilter('all');
                    setEmployeeFilter('');
                    setSearchTerm('');
                    setPagination(prev => ({...prev, page: 1}));
                  }}
                  activeOpacity={0.85}>
                  <CloseIcon size={12} color={theme.colors.primary[700]} />
                  <Typography variant="caption" weight="semibold" color={theme.colors.primary[700]}>
                    Clear all filters
                  </Typography>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {activeTab === 'checkouts' && checkoutsSubTab === 'all' && (
          <>
            <View style={styles.sectionEyebrow}>
              <View style={styles.eyebrowLine} />
              <Typography variant="caption" weight="semibold" color={theme.colors.primary[600]}>
                CHECKOUTS · {pagination.total}
              </Typography>
            </View>
            {loading && checkouts.length === 0 ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color={theme.colors.primary[600]} />
              </View>
            ) : checkouts.length === 0 ? (
              <Card variant="elevated" padding="lg" style={styles.emptyCard}>
                <View style={styles.emptyIconWrap}>
                  <TruckIcon size={32} color={theme.colors.primary[600]} />
                </View>
                <Typography variant="h3" weight="semibold" color={theme.colors.gray[800]} style={styles.emptyTitle}>
                  No checkouts found
                </Typography>
                <Typography variant="small" color={theme.colors.gray[500]} align="center">
                  Adjust filters or create a new checkout.
                </Typography>
              </Card>
            ) : (
              <View style={styles.itemsList}>
                {checkouts.map((checkout: any) => {
                  const isExpanded = expandedCheckout === checkout._id;
                  const itemDisplay = checkout.itemName
                    ? {name: checkout.itemName, qty: checkout.quantityTaking || 0}
                    : {
                        name: `${checkout.itemsTaken?.length || 0} items`,
                        qty:
                          checkout.itemsTaken?.reduce(
                            (sum: number, item: any) => sum + item.quantity,
                            0,
                          ) || 0,
                      };
                  const stripeColor =
                    checkout.status === 'completed'
                      ? theme.colors.success[500]
                      : checkout.status === 'cancelled'
                      ? theme.colors.error[500]
                      : theme.colors.primary[500];
                  return (
                    <Card key={checkout._id} variant="elevated" padding="none" style={styles.checkoutCard}>
                      <View style={[styles.checkoutStripe, {backgroundColor: stripeColor}]} />
                      <TouchableOpacity
                        style={styles.checkoutHeader}
                        onPress={() => setExpandedCheckout(isExpanded ? null : checkout._id)}
                        activeOpacity={0.85}>
                        <View style={styles.checkoutAvatar}>
                          <Typography variant="caption" weight="bold" color={theme.colors.primary[700]}>
                            {(checkout.employeeName || '?')
                              .split(' ')
                              .map((p: string) => p[0])
                              .filter(Boolean)
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()}
                          </Typography>
                        </View>
                        <View style={styles.checkoutInfo}>
                          <Typography variant="body" weight="bold" numberOfLines={1}>
                            {itemDisplay.name}
                          </Typography>
                          <Typography variant="caption" color={theme.colors.gray[500]} numberOfLines={1}>
                            {checkout.employeeName} · Truck {checkout.truckNumber || '-'} ·{' '}
                            {formatDateTime(checkout.checkoutDate)}
                          </Typography>
                          <View style={styles.checkoutTags}>
                            <View style={styles.qtyBadge}>
                              <Typography variant="caption" weight="semibold" color={theme.colors.gray[700]}>
                                Qty {itemDisplay.qty}
                              </Typography>
                            </View>
                            {getStatusBadge(checkout.status)}
                          </View>
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
                        <View style={styles.expandedPanel}>
                          <View style={styles.metaGrid}>
                            <View style={styles.metaCell}>
                              <Typography variant="caption" color={theme.colors.gray[500]}>
                                Employee
                              </Typography>
                              <Typography variant="small" weight="bold">
                                {checkout.employeeName}
                              </Typography>
                            </View>
                            <View style={styles.metaCell}>
                              <Typography variant="caption" color={theme.colors.gray[500]}>
                                Truck
                              </Typography>
                              <Typography variant="small" weight="bold">
                                {checkout.truckNumber || 'N/A'}
                              </Typography>
                            </View>
                            <View style={styles.metaCell}>
                              <Typography variant="caption" color={theme.colors.gray[500]}>
                                Qty
                              </Typography>
                              <Typography variant="small" weight="bold" color={theme.colors.primary[700]}>
                                {itemDisplay.qty}
                              </Typography>
                            </View>
                          </View>

                          <View style={styles.detailRow}>
                            <Typography variant="caption" color={theme.colors.gray[500]}>
                              Checkout date
                            </Typography>
                            <Typography variant="small" weight="semibold">
                              {formatDateTime(checkout.checkoutDate)}
                            </Typography>
                          </View>
                          {checkout.completedDate && (
                            <View style={styles.detailRow}>
                              <Typography variant="caption" color={theme.colors.gray[500]}>
                                Completed
                              </Typography>
                              <Typography variant="small" weight="semibold">
                                {formatDateTime(checkout.completedDate)}
                              </Typography>
                            </View>
                          )}
                          <View style={styles.detailRow}>
                            <Typography variant="caption" color={theme.colors.gray[500]}>
                              Invoices
                            </Typography>
                            <Typography variant="small" weight="semibold">
                              {checkout.invoiceNumbers && checkout.invoiceNumbers.length > 0
                                ? `${checkout.invoiceNumbers.length} invoices`
                                : 'None'}
                            </Typography>
                          </View>

                          {checkout.itemsTaken && checkout.itemsTaken.length > 0 && (
                            <View style={styles.itemsListWrap}>
                              <Typography
                                variant="caption"
                                weight="semibold"
                                color={theme.colors.gray[600]}
                                style={{marginBottom: 6}}>
                                Items ({checkout.itemsTaken.length})
                              </Typography>
                              {checkout.itemsTaken.slice(0, 5).map((item: any, idx: number) => (
                                <View key={idx} style={styles.itemRow}>
                                  <Typography
                                    variant="small"
                                    color={theme.colors.gray[700]}
                                    numberOfLines={1}
                                    style={{flex: 1}}>
                                    {item.itemName || item.name}
                                  </Typography>
                                  <Typography variant="small" weight="bold">
                                    × {item.quantity}
                                  </Typography>
                                </View>
                              ))}
                              {checkout.itemsTaken.length > 5 && (
                                <Typography
                                  variant="caption"
                                  color={theme.colors.gray[500]}
                                  style={{marginTop: 4}}>
                                  +{checkout.itemsTaken.length - 5} more items
                                </Typography>
                              )}
                            </View>
                          )}

                          {checkout.invoiceNumbers && checkout.invoiceNumbers.length > 0 && (
                            <View style={styles.invoiceChipsWrap}>
                              <Typography
                                variant="caption"
                                weight="semibold"
                                color={theme.colors.gray[600]}
                                style={{marginBottom: 6}}>
                                Invoice numbers
                              </Typography>
                              <View style={styles.invoiceChipsRow}>
                                {checkout.invoiceNumbers.map((inv: string, idx: number) => (
                                  <View key={idx} style={styles.invoiceChip}>
                                    <Typography variant="caption" color={theme.colors.gray[700]}>
                                      {inv}
                                    </Typography>
                                  </View>
                                ))}
                              </View>
                            </View>
                          )}

                          <TouchableOpacity
                            style={styles.viewDetailsButton}
                            onPress={() =>
                              navigation.navigate('CheckoutDetail', {checkoutId: checkout._id})
                            }
                            activeOpacity={0.85}>
                            <Typography variant="small" weight="semibold" color={theme.colors.primary[700]}>
                              View full details
                            </Typography>
                            <ChevronRightIcon size={14} color={theme.colors.primary[700]} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </Card>
                  );
                })}
              </View>
            )}
          </>
        )}

        {activeTab === 'checkouts' && checkoutsSubTab === 'mine' && (
          <>
            <View style={styles.sectionEyebrow}>
              <View style={styles.eyebrowLine} />
              <Typography variant="caption" weight="semibold" color={theme.colors.primary[600]}>
                MY CHECKOUTS · {myItems.length}
              </Typography>
            </View>
            {loading && myItems.length === 0 ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color={theme.colors.primary[600]} />
              </View>
            ) : myItems.length === 0 ? (
              <Card variant="elevated" padding="lg" style={styles.emptyCard}>
                <View style={styles.emptyIconWrap}>
                  <TruckIcon size={32} color={theme.colors.primary[600]} />
                </View>
                <Typography variant="h3" weight="semibold" color={theme.colors.gray[800]} style={styles.emptyTitle}>
                  No checkouts yet
                </Typography>
                <Typography variant="small" color={theme.colors.gray[500]} align="center">
                  Items you check out will show up here.
                </Typography>
              </Card>
            ) : (
              <View style={styles.itemsList}>
                {myItems.map((it: any, idx: number) => (
                  <Card
                    key={`${it.itemName}-${idx}`}
                    variant="elevated"
                    padding="none"
                    style={styles.myItemCard}>
                    <View style={[styles.checkoutStripe, {backgroundColor: theme.colors.accent[500]}]} />
                    <View style={styles.myItemBody}>
                      <Typography variant="body" weight="bold" numberOfLines={2}>
                        {it.itemName}
                      </Typography>
                      <Typography
                        variant="caption"
                        color={theme.colors.gray[500]}
                        numberOfLines={1}
                        style={{marginTop: 2}}>
                        Truck {it.trucks || '-'} · {it.checkoutCount} checkouts
                        {it.lastCheckout ? ` · last ${formatDateTime(it.lastCheckout)}` : ''}
                      </Typography>
                      <View style={styles.myItemStatsRow}>
                        <View style={[styles.myItemStat, {backgroundColor: theme.colors.primary[50]}]}>
                          <Typography variant="caption" weight="semibold" color={theme.colors.primary[700]}>
                            Out
                          </Typography>
                          <Typography variant="body" weight="bold" color={theme.colors.primary[700]}>
                            {it.totalCheckedOut}
                          </Typography>
                        </View>
                        <View style={[styles.myItemStat, {backgroundColor: theme.colors.warning[50]}]}>
                          <Typography variant="caption" weight="semibold" color={theme.colors.warning[700]}>
                            Sold
                          </Typography>
                          <Typography variant="body" weight="bold" color={theme.colors.warning[700]}>
                            {it.totalSold}
                          </Typography>
                        </View>
                        <View style={[styles.myItemStat, {backgroundColor: theme.colors.success[50]}]}>
                          <Typography variant="caption" weight="semibold" color={theme.colors.success[700]}>
                            Left
                          </Typography>
                          <Typography variant="body" weight="bold" color={theme.colors.success[700]}>
                            {it.remaining}
                          </Typography>
                        </View>
                      </View>
                    </View>
                  </Card>
                ))}
              </View>
            )}
          </>
        )}

        {activeTab === 'checkouts' && checkoutsSubTab === 'employees' && (
          <>
            <View style={styles.sectionEyebrow}>
              <View style={styles.eyebrowLine} />
              <Typography variant="caption" weight="semibold" color={theme.colors.primary[600]}>
                EMPLOYEES · {employees.length}
              </Typography>
            </View>
            {loading && employees.length === 0 ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color={theme.colors.primary[600]} />
              </View>
            ) : employees.length === 0 ? (
              <Card variant="elevated" padding="lg" style={styles.emptyCard}>
                <View style={styles.emptyIconWrap}>
                  <UserIcon size={32} color={theme.colors.primary[600]} />
                </View>
                <Typography variant="h3" weight="semibold" color={theme.colors.gray[800]} style={styles.emptyTitle}>
                  No employees yet
                </Typography>
                <Typography variant="small" color={theme.colors.gray[500]} align="center">
                  Employees with checkouts will appear here.
                </Typography>
              </Card>
            ) : (
              <View style={styles.itemsList}>
                {employees.map((emp: any) => {
                  const key = `${emp.employeeName}-${emp.truckNumber}`;
                  const isExpanded = expandedEmployee === key;
                  return (
                    <Card key={key} variant="elevated" padding="none" style={styles.employeeCard}>
                      <TouchableOpacity
                        onPress={() => handleEmployeeExpand(emp.employeeName, emp.truckNumber)}
                        style={styles.employeeHeader}
                        activeOpacity={0.85}>
                        <View style={styles.checkoutAvatar}>
                          <Typography variant="caption" weight="bold" color={theme.colors.primary[700]}>
                            {(emp.employeeName || '?')
                              .split(' ')
                              .map((p: string) => p[0])
                              .filter(Boolean)
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()}
                          </Typography>
                        </View>
                        <View style={{flex: 1}}>
                          <Typography variant="body" weight="bold">
                            {emp.employeeName}
                          </Typography>
                          <Typography variant="caption" color={theme.colors.gray[500]}>
                            Truck {emp.truckNumber}
                          </Typography>
                        </View>
                        <View style={styles.empCountPill}>
                          <Typography variant="caption" weight="semibold" color={theme.colors.primary[700]}>
                            {emp.totalCheckouts} checkouts
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
                        <View style={styles.expandedPanel}>
                          {employeeCheckouts.length === 0 ? (
                            <Typography variant="small" color={theme.colors.gray[500]}>
                              No checkouts found
                            </Typography>
                          ) : (
                            employeeCheckouts.map((checkout: any) => (
                              <View key={checkout._id} style={styles.subCheckoutCard}>
                                <View style={styles.subCheckoutHeader}>
                                  <Typography variant="small" weight="semibold" numberOfLines={1} style={{flex: 1}}>
                                    {checkout.itemName || `${checkout.itemsTaken?.length || 0} items`}
                                  </Typography>
                                  {getStatusBadge(checkout.status)}
                                </View>
                                <Typography variant="caption" color={theme.colors.gray[500]}>
                                  {formatDate(checkout.checkoutDate)}
                                </Typography>
                              </View>
                            ))
                          )}
                        </View>
                      )}
                    </Card>
                  );
                })}
              </View>
            )}
          </>
        )}

        {activeTab === 'sales' && salesSubTab === 'all' && (
          <>
            <View style={styles.statsGrid}>
              <View style={[styles.statTile, {backgroundColor: theme.colors.success[50]}]}>
                <View style={[styles.statTileIcon, {backgroundColor: theme.colors.success[100]}]}>
                  <CheckCircleIcon size={18} color={theme.colors.success[600]} />
                </View>
                <Typography variant="caption" weight="semibold" color={theme.colors.success[700]}>
                  Good
                </Typography>
                <Typography variant="h3" weight="bold" color={theme.colors.success[700]}>
                  {salesSummary.good || 0}
                </Typography>
              </View>
              <View style={[styles.statTile, {backgroundColor: theme.colors.warning[50]}]}>
                <View style={[styles.statTileIcon, {backgroundColor: theme.colors.warning[100]}]}>
                  <ClockIcon size={18} color={theme.colors.warning[600]} />
                </View>
                <Typography variant="caption" weight="semibold" color={theme.colors.warning[700]}>
                  Shortage
                </Typography>
                <Typography variant="h3" weight="bold" color={theme.colors.warning[700]}>
                  {salesSummary.shortage || 0}
                </Typography>
              </View>
              <View style={[styles.statTile, {backgroundColor: theme.colors.error[50]}]}>
                <View style={[styles.statTileIcon, {backgroundColor: theme.colors.error[100]}]}>
                  <AlertCircleIcon size={18} color={theme.colors.error[600]} />
                </View>
                <Typography variant="caption" weight="semibold" color={theme.colors.error[700]}>
                  Overage
                </Typography>
                <Typography variant="h3" weight="bold" color={theme.colors.error[700]}>
                  {salesSummary.overage || 0}
                </Typography>
              </View>
            </View>

            <View style={styles.sectionEyebrow}>
              <View style={styles.eyebrowLine} />
              <Typography variant="caption" weight="semibold" color={theme.colors.primary[600]}>
                SALES TRACKING · {salesTracking.length}
              </Typography>
            </View>

            {loading && salesTracking.length === 0 ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color={theme.colors.primary[600]} />
              </View>
            ) : salesTracking.length === 0 ? (
              <Card variant="elevated" padding="lg" style={styles.emptyCard}>
                <View style={styles.emptyIconWrap}>
                  <CheckCircleIcon size={32} color={theme.colors.primary[600]} />
                </View>
                <Typography variant="h3" weight="semibold" color={theme.colors.gray[800]} style={styles.emptyTitle}>
                  No tracking data
                </Typography>
                <Typography variant="small" color={theme.colors.gray[500]} align="center">
                  Reconciled checkouts will show up here.
                </Typography>
              </Card>
            ) : (
              <View style={styles.itemsList}>
                {salesTracking.map((item: any) => (
                  <Card key={item.checkoutId} variant="elevated" padding="md" style={styles.salesCard}>
                    <View style={styles.salesCardHeader}>
                      <View style={styles.checkoutAvatar}>
                        <Typography variant="caption" weight="bold" color={theme.colors.primary[700]}>
                          {(item.employeeName || '?')
                            .split(' ')
                            .map((p: string) => p[0])
                            .filter(Boolean)
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()}
                        </Typography>
                      </View>
                      <View style={{flex: 1}}>
                        <Typography variant="body" weight="bold">
                          {item.employeeName}
                        </Typography>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          Truck {item.truckNumber || '-'}
                        </Typography>
                      </View>
                      {getStatusBadgeForTracking(item.status)}
                    </View>
                    <Typography variant="small" weight="semibold" style={{marginTop: 8}}>
                      {item.itemName}
                    </Typography>
                    <View style={styles.salesStatsRow}>
                      <View style={[styles.salesStat, {backgroundColor: theme.colors.primary[50]}]}>
                        <Typography variant="caption" color={theme.colors.primary[700]}>
                          Out
                        </Typography>
                        <Typography variant="small" weight="bold" color={theme.colors.primary[700]}>
                          {item.quantityCheckedOut}
                        </Typography>
                      </View>
                      <View style={[styles.salesStat, {backgroundColor: theme.colors.warning[50]}]}>
                        <Typography variant="caption" color={theme.colors.warning[700]}>
                          Sold
                        </Typography>
                        <Typography variant="small" weight="bold" color={theme.colors.warning[700]}>
                          {item.totalSold}
                        </Typography>
                      </View>
                      <View style={[styles.salesStat, {backgroundColor: theme.colors.success[50]}]}>
                        <Typography variant="caption" color={theme.colors.success[700]}>
                          Left
                        </Typography>
                        <Typography variant="small" weight="bold" color={theme.colors.success[700]}>
                          {item.remaining}
                        </Typography>
                      </View>
                    </View>
                    {item.matchedInvoices > 0 && (
                      <Typography variant="caption" color={theme.colors.gray[500]} style={{marginTop: 6}}>
                        {item.matchedInvoices} matched invoice{item.matchedInvoices === 1 ? '' : 's'}
                      </Typography>
                    )}
                  </Card>
                ))}
              </View>
            )}
          </>
        )}

        {activeTab === 'sales' && salesSubTab === 'employees' && (
          <>
            <View style={styles.sectionEyebrow}>
              <View style={styles.eyebrowLine} />
              <Typography variant="caption" weight="semibold" color={theme.colors.primary[600]}>
                EMPLOYEES · {salesEmployees.length}
              </Typography>
            </View>
            {loading && salesEmployees.length === 0 ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color={theme.colors.primary[600]} />
              </View>
            ) : salesEmployees.length === 0 ? (
              <Card variant="elevated" padding="lg" style={styles.emptyCard}>
                <View style={styles.emptyIconWrap}>
                  <UserIcon size={32} color={theme.colors.primary[600]} />
                </View>
                <Typography variant="h3" weight="semibold" color={theme.colors.gray[800]} style={styles.emptyTitle}>
                  No employees
                </Typography>
              </Card>
            ) : (
              <View style={styles.itemsList}>
                {salesEmployees.map((emp: any) => {
                  const key = `${emp.employeeName}-${emp.truckNumber}`;
                  const isExpanded = expandedSalesEmployee === key;
                  return (
                    <Card key={key} variant="elevated" padding="none" style={styles.employeeCard}>
                      <TouchableOpacity
                        onPress={() => handleSalesEmployeeExpand(emp.employeeName, emp.truckNumber)}
                        style={styles.employeeHeader}
                        activeOpacity={0.85}>
                        <View style={styles.checkoutAvatar}>
                          <Typography variant="caption" weight="bold" color={theme.colors.primary[700]}>
                            {(emp.employeeName || '?')
                              .split(' ')
                              .map((p: string) => p[0])
                              .filter(Boolean)
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()}
                          </Typography>
                        </View>
                        <View style={{flex: 1}}>
                          <Typography variant="body" weight="bold">
                            {emp.employeeName}
                          </Typography>
                          <Typography variant="caption" color={theme.colors.gray[500]}>
                            Truck {emp.truckNumber}
                          </Typography>
                          <View style={styles.empMiniStats}>
                            <Typography variant="caption" weight="semibold" color={theme.colors.success[700]}>
                              Good {emp.goodCount}
                            </Typography>
                            <Typography variant="caption" weight="semibold" color={theme.colors.warning[700]}>
                              Short {emp.shortageCount}
                            </Typography>
                            <Typography variant="caption" weight="semibold" color={theme.colors.error[700]}>
                              Over {emp.overageCount}
                            </Typography>
                          </View>
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
                        <View style={styles.expandedPanel}>
                          {employeeSalesTracking.length === 0 ? (
                            <Typography variant="small" color={theme.colors.gray[500]}>
                              No sales tracking found
                            </Typography>
                          ) : (
                            employeeSalesTracking.map((item: any) => (
                              <View key={item.checkoutId} style={styles.subCheckoutCard}>
                                <View style={styles.subCheckoutHeader}>
                                  <Typography variant="small" weight="semibold" numberOfLines={1} style={{flex: 1}}>
                                    {item.itemName}
                                  </Typography>
                                  {getStatusBadgeForTracking(item.status)}
                                </View>
                                <View style={styles.salesStatsRow}>
                                  <View style={[styles.salesStat, {backgroundColor: theme.colors.primary[50]}]}>
                                    <Typography variant="caption" color={theme.colors.primary[700]}>
                                      Out
                                    </Typography>
                                    <Typography variant="caption" weight="bold" color={theme.colors.primary[700]}>
                                      {item.quantityCheckedOut}
                                    </Typography>
                                  </View>
                                  <View style={[styles.salesStat, {backgroundColor: theme.colors.warning[50]}]}>
                                    <Typography variant="caption" color={theme.colors.warning[700]}>
                                      Sold
                                    </Typography>
                                    <Typography variant="caption" weight="bold" color={theme.colors.warning[700]}>
                                      {item.totalSold}
                                    </Typography>
                                  </View>
                                  <View style={[styles.salesStat, {backgroundColor: theme.colors.success[50]}]}>
                                    <Typography variant="caption" color={theme.colors.success[700]}>
                                      Left
                                    </Typography>
                                    <Typography variant="caption" weight="bold" color={theme.colors.success[700]}>
                                      {item.remaining}
                                    </Typography>
                                  </View>
                                </View>
                              </View>
                            ))
                          )}
                        </View>
                      )}
                    </Card>
                  );
                })}
              </View>
            )}
          </>
        )}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('CheckoutForm')}>
        <View style={styles.fabIconWrap}>
          <PlusIcon size={16} color={theme.colors.primary[700]} />
        </View>
        <Typography variant="small" weight="bold" color={theme.colors.brand.text}>
          New Checkout
        </Typography>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const makeStyles = (theme: Theme, bp: BreakpointInfo) => {
  const wide = !bp.isMobile;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.brand.bg,
    },
    scrollView: {
      flex: 1,
      backgroundColor: theme.colors.background.secondary,
    },
    scrollContent: {
      paddingBottom: 120,
    },

    // Centers all post-hero content and caps its width on large/XL screens.
    contentWrap: {
      width: '100%',
      maxWidth: bp.contentMaxWidth,
      alignSelf: 'center',
      paddingHorizontal: bp.gutter,
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
    blob: {
      position: 'absolute',
      borderRadius: 9999,
    },
    blobOne: {
      width: wide ? 420 : 280,
      height: wide ? 420 : 280,
      top: wide ? -170 : -130,
      right: wide ? -150 : -100,
      backgroundColor: theme.colors.primary[400],
    },
    blobTwo: {
      width: wide ? 320 : 220,
      height: wide ? 320 : 220,
      bottom: wide ? -150 : -110,
      left: wide ? -100 : -70,
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
    dot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.white,
    },
    heroBody: {
      width: '100%',
      maxWidth: bp.contentMaxWidth,
      alignSelf: 'center',
      zIndex: 2,
    },
    heroTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.md,
    },
    heroEyebrow: {
      letterSpacing: 1.4,
      marginBottom: 4,
    },
    heroTitle: {
      letterSpacing: -0.4,
      marginBottom: 2,
    },
    heroRefresh: {
      width: 40,
      height: 40,
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
    heroMetric: {
      flex: 1,
      alignItems: 'center',
      gap: 2,
    },
    heroMetricLabel: {
      letterSpacing: 1.2,
    },
    heroMetricDivider: {
      width: 1,
      height: 28,
      backgroundColor: 'rgba(255,255,255,0.18)',
    },

    tabsWrap: {
      marginTop: -22,
      zIndex: 3,
    },
    tabsCard: {
      flexDirection: 'row',
      gap: 6,
      backgroundColor: theme.colors.white,
      borderRadius: 14,
      padding: 6,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
      ...theme.shadows.md,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: theme.colors.gray[50],
    },
    tabActive: {
      backgroundColor: theme.colors.primary[600],
    },

    subTabsWrap: {
      flexDirection: 'row',
      marginTop: theme.spacing.md,
      gap: 6,
    },
    subTab: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: 10,
      alignItems: 'center',
      backgroundColor: theme.colors.white,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
    },
    subTabActive: {
      backgroundColor: theme.colors.primary[50],
      borderColor: theme.colors.primary[100],
    },

    filtersWrap: {
      marginTop: theme.spacing.md,
    },
    filtersToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.white,
      borderRadius: 12,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
    },
    filtersToggleLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    filtersToggleIcon: {
      width: 26,
      height: 26,
      borderRadius: 8,
      backgroundColor: theme.colors.primary[50],
      alignItems: 'center',
      justifyContent: 'center',
    },
    filtersBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: theme.colors.primary[600],
    },
    filtersBody: {
      backgroundColor: theme.colors.white,
      borderRadius: 12,
      padding: theme.spacing.md,
      marginTop: 6,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
      gap: theme.spacing.md,
    },
    filterGroup: {},
    filterLabel: {
      marginBottom: 6,
    },
    statusFilters: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    statusFilter: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: theme.colors.gray[100],
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
    },
    statusFilterActive: {
      backgroundColor: theme.colors.primary[600],
      borderColor: theme.colors.primary[600],
    },
    filterInputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.colors.background.secondary,
      borderRadius: 10,
      paddingHorizontal: theme.spacing.sm + 4,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
    },
    filterInput: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.gray[900],
      paddingVertical: 0,
    },
    clearFiltersButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
    },

    sectionEyebrow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.lg,
      marginBottom: theme.spacing.md,
    },
    eyebrowLine: {
      width: 24,
      height: 2,
      borderRadius: 1,
      backgroundColor: theme.colors.primary[600],
    },

    statsGrid: {
      flexDirection: 'row',
      marginTop: theme.spacing.md,
      gap: TILE_GAP,
    },
    statTile: {
      flex: 1,
      borderRadius: 14,
      padding: theme.spacing.md,
      gap: 4,
    },
    statTileIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },

    itemsList: {
      gap: theme.spacing.md,
    },

    emptyState: {
      paddingVertical: theme.spacing.xl,
      alignItems: 'center',
    },
    emptyCard: {
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
    emptyTitle: {
      marginBottom: theme.spacing.xs,
    },

    checkoutCard: {
      overflow: 'hidden',
      position: 'relative',
    },
    checkoutStripe: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 3,
      backgroundColor: theme.colors.primary[500],
    },
    checkoutHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: theme.spacing.md,
      paddingTop: theme.spacing.md + 4,
    },
    checkoutAvatar: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: theme.colors.primary[50],
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkoutInfo: {
      flex: 1,
      gap: 4,
    },
    checkoutTags: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
    },
    qtyBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: theme.colors.gray[100],
    },
    statusPill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
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

    expandedPanel: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.md,
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: theme.colors.gray[100],
      backgroundColor: theme.colors.background.secondary,
    },
    metaGrid: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 4,
    },
    metaCell: {
      flex: 1,
      backgroundColor: theme.colors.white,
      borderRadius: 10,
      padding: 10,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    itemsListWrap: {
      backgroundColor: theme.colors.white,
      borderRadius: 10,
      padding: 10,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
    },
    itemRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 4,
    },
    invoiceChipsWrap: {
      backgroundColor: theme.colors.white,
      borderRadius: 10,
      padding: 10,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
    },
    invoiceChipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    invoiceChip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: theme.colors.background.secondary,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
    },
    viewDetailsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: theme.colors.primary[50],
      borderWidth: 1,
      borderColor: theme.colors.primary[100],
      marginTop: 4,
    },

    myItemCard: {
      overflow: 'hidden',
      position: 'relative',
    },
    myItemBody: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md + 4,
      paddingBottom: theme.spacing.md,
      gap: 4,
    },
    myItemStatsRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
    },
    myItemStat: {
      flex: 1,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 10,
      gap: 2,
    },

    employeeCard: {
      overflow: 'hidden',
    },
    employeeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: theme.spacing.md,
    },
    empCountPill: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: theme.colors.primary[50],
    },
    empMiniStats: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 4,
    },

    subCheckoutCard: {
      backgroundColor: theme.colors.white,
      borderRadius: 10,
      padding: theme.spacing.sm + 2,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
      gap: 4,
    },
    subCheckoutHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },

    salesCard: {
      gap: 4,
    },
    salesCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    salesStatsRow: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 8,
    },
    salesStat: {
      flex: 1,
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 8,
      alignItems: 'center',
      gap: 2,
    },

    fab: {
      position: 'absolute',
      bottom: 20,
      right: 16,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primary[600],
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 999,
      gap: 8,
      shadowColor: theme.colors.primary[700],
      shadowOffset: {width: 0, height: 6},
      shadowOpacity: 0.32,
      shadowRadius: 12,
      elevation: 8,
    },
    fabIconWrap: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.white,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
};
