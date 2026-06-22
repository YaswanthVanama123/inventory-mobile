import React, {useState, useEffect, useRef, useMemo} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Easing,
  TouchableOpacity,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {LineChart, BarChart, PieChart} from 'react-native-chart-kit';
import {useNavigation} from '@react-navigation/native';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {useAuth} from '../contexts/AuthContext';
import {useApiErrorHandler} from '../hooks/useApiErrorHandler';
import {useTheme} from '../contexts/ThemeContext';
import {Theme} from '../theme';
import {
  BoxIcon,
  WarningIcon,
  DollarIcon,
  ClipboardIcon,
  FileTextIcon,
  InventoryIcon,
  ArrowRightIcon,
  RefreshIcon,
  TruckIcon,
  TimelineIcon,
  CheckCircleIcon,
  BarChartIcon,
} from '../components/icons';
import dashboardService from '../services/dashboardService';
import {formatDateTime} from '../utils/dateUtils';
import {useBreakpoint, BreakpointInfo} from '../utils/breakpoints';

const TILE_GAP = 12;

type Tone = 'primary' | 'accent' | 'success' | 'warning' | 'error' | 'info';

interface StatTileProps {
  theme: Theme;
  label: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  Icon: React.FC<{size?: number; color?: string}>;
  tone: Tone;
  width: number;
}

const StatTile: React.FC<StatTileProps> = ({theme, label, value, change, trend, Icon, tone, width}) => {
  const bp = useBreakpoint();
  const styles = useMemo(() => makeStyles(theme, bp), [theme, bp]);
  const palette = theme.colors[tone];
  const trendColor =
    trend === 'up'
      ? theme.colors.success[700]
      : trend === 'down'
      ? theme.colors.error[700]
      : theme.colors.gray[600];
  const trendBg =
    trend === 'up'
      ? theme.colors.success[50]
      : trend === 'down'
      ? theme.colors.error[50]
      : theme.colors.gray[100];

  return (
    <View style={[styles.statTileWrapper, {width}]}>
      <View style={styles.statTileCard}>
        <View style={[styles.statTileAccent, {backgroundColor: palette[500]}]} />
        <View style={styles.statTileTop}>
          <View style={[styles.statTileIcon, {backgroundColor: palette[50]}]}>
            <Icon size={18} color={palette[600]} />
          </View>
          {change ? (
            <View style={[styles.statTileTrend, {backgroundColor: trendBg}]}>
              <Typography variant="caption" weight="semibold" color={trendColor} numberOfLines={1}>
                {change}
              </Typography>
            </View>
          ) : null}
        </View>
        <Typography variant="caption" color={theme.colors.gray[500]} style={styles.statTileLabel}>
          {label}
        </Typography>
        <Typography variant="h3" weight="bold" style={styles.statTileValue}>
          {value}
        </Typography>
      </View>
    </View>
  );
};

interface QuickAction {
  Icon: React.FC<{size?: number; color?: string}>;
  label: string;
  tone: Tone;
  route?: string;
}

export const DashboardScreen = () => {
  const theme = useTheme();
  const bp = useBreakpoint();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme, bp), [theme, bp]);
  const {token, user} = useAuth();
  const {handleApiError} = useApiErrorHandler();
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);

  const fadeAnim1 = useRef(new Animated.Value(0)).current;
  const fadeAnim2 = useRef(new Animated.Value(0)).current;
  const fadeAnim3 = useRef(new Animated.Value(0)).current;
  const slideAnim1 = useRef(new Animated.Value(30)).current;
  const slideAnim2 = useRef(new Animated.Value(30)).current;
  const slideAnim3 = useRef(new Animated.Value(30)).current;
  const statsOpacity = useRef(new Animated.Value(0)).current;
  const statsScale = useRef(new Animated.Value(0.94)).current;
  const heroFade = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(20)).current;
  const blobPulse = useRef(new Animated.Value(0)).current;

  const fetchDashboardData = async () => {
    try {
      if (token) {
        const data = await dashboardService.getDashboardData(token);
        console.log('Dashboard data:', data);
        setDashboardData(data);
      }
    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error);
      const wasHandled = await handleApiError(error);
      if (wasHandled) return;
      setDashboardData(getMockData());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

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

  useEffect(() => {
    if (dashboardData && !loading) {
      heroFade.setValue(0);
      heroSlide.setValue(20);
      fadeAnim1.setValue(0);
      fadeAnim2.setValue(0);
      fadeAnim3.setValue(0);
      slideAnim1.setValue(30);
      slideAnim2.setValue(30);
      slideAnim3.setValue(30);
      statsOpacity.setValue(0);
      statsScale.setValue(0.94);

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

      Animated.parallel([
        Animated.timing(statsOpacity, {
          toValue: 1,
          duration: 500,
          delay: 120,
          useNativeDriver: true,
        }),
        Animated.spring(statsScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          delay: 120,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.stagger(150, [
        Animated.parallel([
          Animated.timing(fadeAnim1, {toValue: 1, duration: 600, useNativeDriver: true}),
          Animated.spring(slideAnim1, {toValue: 0, tension: 50, friction: 7, useNativeDriver: true}),
        ]),
        Animated.parallel([
          Animated.timing(fadeAnim2, {toValue: 1, duration: 600, useNativeDriver: true}),
          Animated.spring(slideAnim2, {toValue: 0, tension: 50, friction: 7, useNativeDriver: true}),
        ]),
        Animated.parallel([
          Animated.timing(fadeAnim3, {toValue: 1, duration: 600, useNativeDriver: true}),
          Animated.spring(slideAnim3, {toValue: 0, tension: 50, friction: 7, useNativeDriver: true}),
        ]),
      ]).start();
    }
  }, [dashboardData, loading]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const getMockData = () => ({
    kpis: {
      totalRevenue: 45200,
      revenueChange: '+12.5%',
      totalOrders: 1234,
      ordersChange: '+8.3%',
      avgOrderValue: 36.65,
      inventoryValue: 85600,
      lowStock: 23,
      lowStockChange: '-5%',
    },
    revenueTrend: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [
        {
          data: [25000, 28000, 32000, 35000, 40000, 45000],
          color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
          strokeWidth: 3,
        },
        {
          data: [18000, 20000, 23000, 26000, 30000, 35000],
          color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
          strokeWidth: 3,
        },
      ],
      legend: ['Revenue', 'Profit'],
    },
    topProducts: {
      labels: ['Bulk Soap', 'Paper Towels', 'Tissue', 'Napkins', 'Cleaners'],
      datasets: [{data: [8500, 7200, 6800, 5900, 5200]}],
    },
    statusDistribution: [
      {name: 'Completed', population: 65, color: '#10B981', legendFontColor: '#64748B'},
      {name: 'Pending', population: 20, color: '#3B82F6', legendFontColor: '#64748B'},
      {name: 'Closed', population: 12, color: '#3B82F6', legendFontColor: '#64748B'},
      {name: 'Cancelled', population: 3, color: '#EF4444', legendFontColor: '#64748B'},
    ],
  });

  const data = dashboardData || getMockData();

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#f8fafc',
    backgroundGradientFromOpacity: 0,
    backgroundGradientToOpacity: 0,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(71, 85, 105, ${opacity})`,
    style: {borderRadius: 16},
    propsForLabels: {fontSize: theme.typography.roles.caption.fontSize, fontWeight: '600'},
    propsForBackgroundLines: {
      strokeDasharray: '3 3',
      stroke: '#e2e8f0',
      strokeWidth: 1,
    },
    propsForDots: {r: '5', strokeWidth: '2', stroke: '#ffffff'},
    strokeWidth: 3,
    fillShadowGradient: theme.colors.primary[600],
    fillShadowGradientOpacity: 0.1,
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'GOOD MORNING';
    if (h < 17) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  };

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const displayName = (() => {
    if (user?.role === 'admin') return 'Admin';
    const first = user?.fullName?.trim().split(' ')[0];
    if (first && first.toLowerCase() !== 'system') return first;
    return user?.username || 'Dashboard';
  })();

  const quickActions: QuickAction[] = [
    {Icon: InventoryIcon, label: 'Inventory', tone: 'primary', route: 'Inventory'},
    {Icon: BoxIcon, label: 'Stock', tone: 'accent', route: 'Stock'},
    {Icon: ClipboardIcon, label: 'Orders', tone: 'success', route: 'Orders'},
    {Icon: TruckIcon, label: 'Checkout', tone: 'warning', route: 'Checkout'},
  ];

  const navigateToTab = (route?: string) => {
    if (!route) return;
    try {
      navigation.navigate(route as never);
    } catch (e) {}
  };

  const blobScale = blobPulse.interpolate({inputRange: [0, 1], outputRange: [1, 1.08]});
  const blobOpacity = blobPulse.interpolate({inputRange: [0, 1], outputRange: [0.18, 0.28]});

  // Responsive layout: cap content width on large/XL screens and grow the
  // grid from 2 columns (phone) up to 6 (XL), mirroring the webapp dashboard.
  // Subtract the real left/right safe-area insets and floor the tile width so
  // exactly 2 cards always fit per row on phones (no overflow → no 1-per-row).
  const contentWidth = Math.min(bp.width, bp.contentMaxWidth) - insets.left - insets.right;
  const innerWidth = contentWidth - bp.gutter * 2;
  const tileGap = bp.isMobile ? TILE_GAP : 16;
  const statCols = bp.isWide ? 6 : bp.isDesktop ? 4 : bp.isTablet ? 3 : 2;
  const tileWidth = Math.floor((innerWidth - tileGap * (statCols - 1)) / statCols);
  const quickCols = 4;
  const quickWidth = Math.floor((innerWidth - tileGap * (quickCols - 1)) / quickCols);
  // Charts live inside an elevated Card with `lg` padding (spacing.xl on each side).
  const chartWidth = innerWidth - theme.spacing.xl * 2;

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <View style={styles.loadingMark}>
          <BoxIcon size={22} color={theme.colors.primary[600]} />
        </View>
        <ActivityIndicator size="large" color={theme.colors.primary[600]} />
        <Typography variant="body" color={theme.colors.text.tertiary} style={{marginTop: 16}}>
          Loading dashboard...
        </Typography>
      </SafeAreaView>
    );
  }

  const revenueValue = `$${((data.kpis?.totalRevenue || 0) / 1000).toFixed(1)}K`;
  const revenueChange = data.kpis?.revenueChange || '+12.5%';

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
                  {greeting()}
                </Typography>
                <Typography variant="h2" weight="bold" color={theme.colors.brand.text} style={styles.heroName}>
                  {displayName}
                </Typography>
                <Typography variant="small" color={theme.colors.brand.textMuted} style={styles.heroDate}>
                  {todayLabel}
                </Typography>
              </View>
              <TouchableOpacity onPress={onRefresh} style={styles.heroRefresh} activeOpacity={0.85}>
                <RefreshIcon size={18} color={theme.colors.brand.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.statusChip}>
              <View style={styles.statusDot} />
              <Typography variant="caption" weight="semibold" color={theme.colors.brand.text}>
                Live · all systems syncing
              </Typography>
            </View>

            <View style={styles.heroKpiCard}>
              <View style={{flex: 1}}>
                <Typography
                  variant="caption"
                  weight="semibold"
                  color={theme.colors.brand.textMuted}
                  style={styles.heroKpiLabel}>
                  TOTAL REVENUE
                </Typography>
                <Typography variant="h1" weight="bold" color={theme.colors.brand.text} style={styles.heroKpiValue}>
                  {revenueValue}
                </Typography>
                <View style={styles.heroDeltaRow}>
                  <View style={styles.heroDeltaPill}>
                    <Typography variant="caption" weight="semibold" color={theme.colors.success[300]}>
                      ▲ {revenueChange}
                    </Typography>
                  </View>
                  <Typography variant="caption" color={theme.colors.brand.textMuted}>
                    vs last period
                  </Typography>
                </View>
              </View>
              <View style={styles.heroKpiIcon}>
                <BarChartIcon size={26} color={theme.colors.brand.text} />
              </View>
            </View>
          </Animated.View>
        </View>

        <View style={styles.contentWrap}>
          <View style={styles.quickActionsWrap}>
            {quickActions.map(qa => {
              const palette = theme.colors[qa.tone];
              return (
                <TouchableOpacity
                  key={qa.label}
                  style={[styles.quickAction, {width: quickWidth}]}
                  onPress={() => navigateToTab(qa.route)}
                  activeOpacity={0.8}>
                  <View style={[styles.quickActionIcon, {backgroundColor: palette[50]}]}>
                    <qa.Icon size={20} color={palette[600]} />
                  </View>
                  <Typography variant="caption" weight="semibold" color={theme.colors.gray[700]}>
                    {qa.label}
                  </Typography>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.sectionEyebrow}>
            <View style={styles.eyebrowLine} />
            <Typography variant="caption" weight="semibold" color={theme.colors.primary[600]}>
              OVERVIEW
            </Typography>
          </View>

          <Animated.View
            style={[
              styles.statsGrid,
              {opacity: statsOpacity, transform: [{scale: statsScale}]},
            ]}>
            <StatTile
              theme={theme}
              label="Total Orders"
              value={data.kpis?.totalOrders?.toLocaleString() || '1,234'}
              change={data.kpis?.ordersChange || '+8.3%'}
              trend="up"
              tone="primary"
              Icon={ClipboardIcon}
              width={tileWidth}
            />
            <StatTile
              theme={theme}
              label="Orders Cost"
              value={`$${((data.kpis?.totalPurchaseAmount || 0) / 1000).toFixed(1)}K`}
              change={`${data.kpis?.purchaseCostChange > 0 ? '+' : ''}${data.kpis?.purchaseCostChange || '0'}%`}
              trend={data.kpis?.purchaseCostChange >= 0 ? 'down' : 'up'}
              tone="accent"
              Icon={FileTextIcon}
              width={tileWidth}
            />
            <StatTile
              theme={theme}
              label="Profit / Loss"
              value={`$${((data.kpis?.totalProfit || 0) / 1000).toFixed(1)}K`}
              change={`${data.kpis?.profitMargin || '0'}% margin`}
              trend={data.kpis?.totalProfit >= 0 ? 'up' : 'down'}
              tone="success"
              Icon={DollarIcon}
              width={tileWidth}
            />
            <StatTile
              theme={theme}
              label="Low Stock"
              value={data.kpis?.lowStock?.toString() || '23'}
              change="Needs attention"
              trend="neutral"
              tone="warning"
              Icon={WarningIcon}
              width={tileWidth}
            />
            <StatTile
              theme={theme}
              label="Inventory Value"
              value={`$${((data.kpis?.inventoryValue || 0) / 1000).toFixed(1)}K`}
              change="Total worth"
              trend="neutral"
              tone="info"
              Icon={BoxIcon}
              width={tileWidth}
            />
            <StatTile
              theme={theme}
              label="Avg Order"
              value={`$${(data.kpis?.avgOrderValue || 36.65).toFixed(2)}`}
              change="per invoice"
              trend="neutral"
              tone="primary"
              Icon={DollarIcon}
              width={tileWidth}
            />
          </Animated.View>

          <View style={styles.sectionEyebrow}>
            <View style={styles.eyebrowLine} />
            <Typography variant="caption" weight="semibold" color={theme.colors.primary[600]}>
              ANALYTICS
            </Typography>
          </View>

          <Animated.View style={{opacity: fadeAnim1, transform: [{translateY: slideAnim1}]}}>
            <Card variant="elevated" padding="lg" style={styles.chartCard}>
              <View style={styles.chartCardStripe} />
              <View style={styles.chartHeader}>
                <View style={{flex: 1}}>
                  <Typography variant="h3" weight="semibold" style={styles.chartTitle}>
                    Revenue & Profit Trend
                  </Typography>
                  <Typography variant="caption" color={theme.colors.gray[500]} style={{marginTop: 4}}>
                    Last 6 months performance
                  </Typography>
                </View>
                <View style={[styles.growthBadge, {backgroundColor: theme.colors.success[50]}]}>
                  <View style={styles.growthArrow}>
                    <ArrowRightIcon size={14} color={theme.colors.success[600]} />
                  </View>
                  <Typography variant="caption" weight="semibold" color={theme.colors.success[600]}>
                    +24.5%
                  </Typography>
                </View>
              </View>
              <LineChart
                data={data.revenueTrend}
                width={chartWidth}
                height={200}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                withInnerLines
                withOuterLines
                withVerticalLines={false}
                withHorizontalLines
                withVerticalLabels
                withHorizontalLabels
                withDots
                withShadow={false}
                fromZero
                formatYLabel={y => `$${Math.round(Number(y) / 1000)}k`}
              />
            </Card>
          </Animated.View>

          <Animated.View style={{opacity: fadeAnim2, transform: [{translateY: slideAnim2}]}}>
            <Card variant="elevated" padding="lg" style={styles.chartCard}>
              <View style={[styles.chartCardStripe, {backgroundColor: theme.colors.accent[500]}]} />
              <View style={styles.chartHeader}>
                <View style={{flex: 1}}>
                  <Typography variant="h3" weight="semibold" style={styles.chartTitle}>
                    Top Selling Products
                  </Typography>
                  <Typography variant="caption" color={theme.colors.gray[500]} style={{marginTop: 4}}>
                    Best performers this month
                  </Typography>
                </View>
                <View style={[styles.growthBadge, {backgroundColor: theme.colors.accent[50]}]}>
                  <InventoryIcon size={14} color={theme.colors.accent[600]} />
                  <Typography
                    variant="caption"
                    weight="semibold"
                    color={theme.colors.accent[600]}
                    style={{marginLeft: 4}}>
                    Top 5
                  </Typography>
                </View>
              </View>
              <BarChart
                data={{
                  ...data.topProducts,
                  labels: data.topProducts.labels.map((label: string) =>
                    label.length > 6 ? label.substring(0, 6) : label,
                  ),
                  datasets: (data.topProducts.datasets || []).map((ds: any) => ({
                    ...ds,
                    data: (ds.data || []).map((v: number) => Math.round((v || 0) / 1000)),
                  })),
                }}
                width={chartWidth}
                height={240}
                chartConfig={{
                  ...chartConfig,
                  barPercentage: 0.7,
                  fillShadowGradientFrom: theme.colors.primary[500],
                  fillShadowGradientTo: theme.colors.primary[600],
                  fillShadowGradientOpacity: 1,
                  propsForLabels: {fontSize: theme.typography.roles.caption.fontSize, fontWeight: '500', rotation: 0},
                }}
                style={styles.chart}
                withInnerLines={false}
                fromZero
                yAxisLabel="$"
                yAxisSuffix="k"
                segments={4}
              />
            </Card>
          </Animated.View>

          <Animated.View style={{opacity: fadeAnim3, transform: [{translateY: slideAnim3}]}}>
            <Card variant="elevated" padding="lg" style={styles.chartCard}>
              <View style={[styles.chartCardStripe, {backgroundColor: theme.colors.success[500]}]} />
              <View style={styles.chartHeader}>
                <View style={{flex: 1}}>
                  <Typography variant="h3" weight="semibold" style={styles.chartTitle}>
                    Invoice Status
                  </Typography>
                  <Typography variant="caption" color={theme.colors.gray[500]} style={{marginTop: 4}}>
                    Order status distribution
                  </Typography>
                </View>
                <View style={[styles.growthBadge, {backgroundColor: theme.colors.primary[50]}]}>
                  <ClipboardIcon size={14} color={theme.colors.primary[600]} />
                  <Typography
                    variant="caption"
                    weight="semibold"
                    color={theme.colors.primary[600]}
                    style={{marginLeft: 4}}>
                    {data.statusDistribution?.length || 0} Types
                  </Typography>
                </View>
              </View>
              <PieChart
                data={data.statusDistribution}
                width={chartWidth}
                height={200}
                chartConfig={chartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft={`${Math.round(chartWidth / 4)}`}
                style={styles.chart}
                hasLegend={false}
              />
              <View style={styles.pieLegend}>
                {(data.statusDistribution || []).map((s: any, i: number) => (
                  <View key={i} style={styles.pieLegendItem}>
                    <View style={[styles.pieLegendDot, {backgroundColor: s.color}]} />
                    <Typography variant="caption" color={theme.colors.gray[700]} numberOfLines={1}>
                      {s.name}
                    </Typography>
                  </View>
                ))}
              </View>
            </Card>
          </Animated.View>

          <View style={styles.sectionEyebrow}>
            <View style={styles.eyebrowLine} />
            <Typography variant="caption" weight="semibold" color={theme.colors.primary[600]}>
              RECENT ACTIVITY
            </Typography>
          </View>

          <Card variant="elevated" padding="lg" style={styles.activityCard}>
            <View style={styles.activityHeader}>
              <View style={styles.activityHeaderIcon}>
                <TimelineIcon size={16} color={theme.colors.primary[600]} />
              </View>
              <Typography variant="h3" weight="semibold" style={styles.activityHeaderTitle}>
                What's happening
              </Typography>
              <View style={styles.activityHeaderPill}>
                <View style={styles.activityLiveDot} />
                <Typography variant="caption" weight="semibold" color={theme.colors.success[700]}>
                  live
                </Typography>
              </View>
            </View>
            <View style={styles.activityList}>
              {(data.recentActivity || []).length === 0 ? (
                <View style={styles.activityEmpty}>
                  <View style={styles.activityEmptyIcon}>
                    <TimelineIcon size={18} color={theme.colors.gray[400]} />
                  </View>
                  <Typography variant="small" color={theme.colors.gray[500]}>
                    No recent activity yet.
                  </Typography>
                  <Typography variant="caption" color={theme.colors.gray[400]} style={{marginTop: 2}}>
                    Activity will show up here as your team works.
                  </Typography>
                </View>
              ) : (
                (data.recentActivity || []).slice(0, 5).map((activity: any, idx: number) => {
                  const palettes: Tone[] = ['primary', 'accent', 'success', 'warning', 'info'];
                  const tone = palettes[idx % palettes.length];
                  const palette = theme.colors[tone];
                  const ActivityIcon = idx % 3 === 0 ? CheckCircleIcon : idx % 3 === 1 ? RefreshIcon : ClipboardIcon;
                  return (
                    <View key={activity.id || idx} style={styles.activityItem}>
                      <View style={[styles.activityIcon, {backgroundColor: palette[50]}]}>
                        <ActivityIcon size={16} color={palette[600]} />
                      </View>
                      <View style={styles.activityContent}>
                        <Typography variant="small" weight="semibold">
                          {activity.message}
                        </Typography>
                        <Typography
                          variant="caption"
                          color={theme.colors.gray[500]}
                          style={styles.activityTime}>
                          {activity.user ? `${activity.user} • ` : ''}
                          {activity.timestamp ? formatDateTime(activity.timestamp) : 'Recently'}
                        </Typography>
                      </View>
                      <View style={[styles.activityDotMark, {backgroundColor: palette[500]}]} />
                    </View>
                  );
                })
              )}
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const makeStyles = (theme: Theme, bp: BreakpointInfo) => {
  const wide = !bp.isMobile;
  const tileGap = bp.isMobile ? TILE_GAP : 16;

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
      top: wide ? -170 : -120,
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
      top: 60,
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
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    heroEyebrow: {
      letterSpacing: 1.4,
      marginBottom: 4,
    },
    heroName: {
      letterSpacing: -0.4,
    },
    heroDate: {
      marginTop: 2,
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

    heroKpiCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      borderRadius: 18,
      backgroundColor: theme.colors.brand.glassBg,
      borderWidth: 1,
      borderColor: theme.colors.brand.glassBorder,
    },
    heroKpiLabel: {
      letterSpacing: 1.4,
      marginBottom: 4,
    },
    heroKpiValue: {
      letterSpacing: -0.6,
    },
    heroDeltaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginTop: 6,
    },
    heroDeltaPill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: 'rgba(34,197,94,0.18)',
      borderWidth: 1,
      borderColor: 'rgba(34,197,94,0.32)',
    },
    heroKpiIcon: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: theme.colors.brand.glassBgStrong,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: theme.spacing.md,
    },

    quickActionsWrap: {
      flexDirection: 'row',
      marginTop: -22,
      marginBottom: theme.spacing.md,
      gap: tileGap,
      zIndex: 3,
    },
    quickAction: {
      backgroundColor: theme.colors.white,
      borderRadius: 16,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
      ...theme.shadows.sm,
    },
    quickActionIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
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
      flexWrap: 'wrap',
      gap: tileGap,
      marginBottom: theme.spacing.sm,
    },
    statTileWrapper: {},
    statTileCard: {
      backgroundColor: theme.colors.white,
      borderRadius: 16,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
      minHeight: 124,
      overflow: 'hidden',
      position: 'relative',
      ...theme.shadows.xs,
    },
    statTileAccent: {
      position: 'absolute',
      left: 0,
      top: 12,
      bottom: 12,
      width: 3,
      borderTopRightRadius: 3,
      borderBottomRightRadius: 3,
    },
    statTileTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
      paddingLeft: 6,
      gap: 6,
    },
    statTileIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statTileTrend: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      flexShrink: 1,
    },
    statTileLabel: {
      letterSpacing: 0.3,
      marginBottom: 4,
      paddingLeft: 6,
    },
    statTileValue: {
      fontSize: theme.typography.roles.subheading.fontSize,
      color: theme.colors.gray[900],
      paddingLeft: 6,
    },

    chartCard: {
      marginBottom: theme.spacing.md,
      paddingTop: theme.spacing.lg + 4,
      overflow: 'hidden',
      position: 'relative',
    },
    chartCardStripe: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 3,
      backgroundColor: theme.colors.primary[500],
    },
    chartHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.lg,
    },
    growthBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: theme.borderRadius.md,
    },
    growthArrow: {
      transform: [{rotate: '-45deg'}],
    },
    chartTitle: {
      fontSize: theme.typography.roles.sideheading.fontSize,
      color: theme.colors.gray[900],
    },
    chart: {
      marginVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
    },
    pieLegend: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: theme.spacing.md,
      marginTop: theme.spacing.sm,
    },
    pieLegendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    pieLegendDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },

    activityCard: {
      marginBottom: theme.spacing.lg,
    },
    activityHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    activityHeaderIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: theme.colors.primary[50],
      alignItems: 'center',
      justifyContent: 'center',
    },
    activityHeaderTitle: {
      flex: 1,
      fontSize: theme.typography.roles.sideheading.fontSize,
      color: theme.colors.gray[900],
    },
    activityHeaderPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: theme.colors.success[50],
    },
    activityLiveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.success[500],
    },
    activityList: {
      gap: 8,
    },
    activityItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      borderRadius: 12,
      backgroundColor: theme.colors.gray[50],
      borderWidth: 1,
      borderColor: theme.colors.gray[100],
    },
    activityIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.md,
    },
    activityContent: {
      flex: 1,
    },
    activityTime: {
      marginTop: 2,
    },
    activityDotMark: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginLeft: theme.spacing.sm,
    },
    activityEmpty: {
      alignItems: 'center',
      paddingVertical: theme.spacing.lg,
    },
    activityEmptyIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: theme.colors.gray[100],
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.sm,
    },
  });
};
