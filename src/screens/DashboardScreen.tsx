import React, {useState, useEffect, useRef, useMemo} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  Animated,
  TouchableOpacity,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {LineChart, BarChart, PieChart} from 'react-native-chart-kit';
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
} from '../components/icons';
import dashboardService from '../services/dashboardService';
import {formatDateTime} from '../utils/dateUtils';

const screenWidth = Dimensions.get('window').width;

interface StatTileProps {
  theme: Theme;
  label: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down';
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}

const StatTile: React.FC<StatTileProps> = ({theme, label, value, change, trend, icon, iconBg}) => {
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.statTileWrapper}>
      <Card variant="elevated" padding="md" style={styles.statTileCard}>
        <View style={styles.statTileTop}>
          <View style={[styles.statTileIcon, {backgroundColor: iconBg}]}>{icon}</View>
          {change ? (
            <View
              style={[
                styles.statTileTrend,
                trend === 'up' && {backgroundColor: theme.colors.success[50]},
                trend === 'down' && {backgroundColor: theme.colors.error[50]},
                !trend && {backgroundColor: theme.colors.gray[100]},
              ]}>
              <Typography
                variant="caption"
                weight="semibold"
                color={
                  trend === 'up'
                    ? theme.colors.success[600]
                    : trend === 'down'
                    ? theme.colors.error[600]
                    : theme.colors.gray[600]
                }>
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
      </Card>
    </View>
  );
};

export const DashboardScreen = () => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const {token, user} = useAuth();
  const {handleApiError} = useApiErrorHandler();
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
  const statsScale = useRef(new Animated.Value(0.9)).current;
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
    if (dashboardData && !loading) {
      fadeAnim1.setValue(0);
      fadeAnim2.setValue(0);
      fadeAnim3.setValue(0);
      slideAnim1.setValue(30);
      slideAnim2.setValue(30);
      slideAnim3.setValue(30);
      statsOpacity.setValue(0);
      statsScale.setValue(0.9);
      Animated.parallel([
        Animated.timing(statsOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(statsScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
      Animated.stagger(150, [
        Animated.parallel([
          Animated.timing(fadeAnim1, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.spring(slideAnim1, {
            toValue: 0,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(fadeAnim2, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.spring(slideAnim2, {
            toValue: 0,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(fadeAnim3, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.spring(slideAnim3, {
            toValue: 0,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
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
    style: {
      borderRadius: 16,
    },
    propsForLabels: {
      fontSize: 11,
      fontWeight: '600',
    },
    propsForBackgroundLines: {
      strokeDasharray: '3 3',
      stroke: '#e2e8f0',
      strokeWidth: 1,
    },
    propsForDots: {
      r: '5',
      strokeWidth: '2',
      stroke: '#ffffff',
    },
    strokeWidth: 3,
    fillShadowGradient: theme.colors.primary[600],
    fillShadowGradientOpacity: 0.1,
  };
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary[600]} />
        <Typography variant="body" color={theme.colors.text.tertiary} style={{marginTop: 16}}>
          Loading dashboard...
        </Typography>
      </SafeAreaView>
    );
  }
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
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {/* Header */}
        <View style={styles.header}>
          <View style={{flex: 1}}>
            <Typography variant="caption" color={theme.colors.gray[500]} style={styles.headerEyebrow}>
              {greeting()}
            </Typography>
            <Typography variant="h3" weight="semibold" style={styles.headerTitle}>
              {displayName}
            </Typography>
            <Typography variant="small" color={theme.colors.gray[500]} style={{marginTop: 2}}>
              {todayLabel}
            </Typography>
          </View>
          <TouchableOpacity onPress={onRefresh} style={styles.headerAction} activeOpacity={0.7}>
            <RefreshIcon size={18} color={theme.colors.gray[700]} />
          </TouchableOpacity>
        </View>

        {/* Section: Overview */}
        <View style={styles.sectionHeader}>
          <Typography variant="caption" weight="semibold" color={theme.colors.gray[500]} style={styles.sectionLabel}>
            OVERVIEW
          </Typography>
        </View>

        {/* Stats Grid - Refined neutral cards */}
        <Animated.View
          style={[
            styles.statsGrid,
            {
              opacity: statsOpacity,
              transform: [{scale: statsScale}],
            },
          ]}>
          <StatTile
            theme={theme}
            label="Total Revenue"
            value={`$${(data.kpis?.totalRevenue / 1000).toFixed(1)}K`}
            change={data.kpis?.revenueChange || '+12.5%'}
            trend="up"
            iconBg={theme.colors.gray[100]}
            iconColor={theme.colors.gray[700]}
            icon={<DollarIcon size={18} color={theme.colors.gray[700]} />}
          />
          <StatTile
            theme={theme}
            label="Total Orders"
            value={data.kpis?.totalOrders?.toLocaleString() || '1,234'}
            change={data.kpis?.ordersChange || '+8.3%'}
            trend="up"
            iconBg={theme.colors.gray[100]}
            iconColor={theme.colors.gray[700]}
            icon={<ClipboardIcon size={18} color={theme.colors.gray[700]} />}
          />
          <StatTile
            theme={theme}
            label="Orders Cost"
            value={`$${((data.kpis?.totalPurchaseAmount || 0) / 1000).toFixed(1)}K`}
            change={`${data.kpis?.purchaseCostChange > 0 ? '+' : ''}${data.kpis?.purchaseCostChange || '0'}%`}
            trend={data.kpis?.purchaseCostChange >= 0 ? 'down' : 'up'}
            iconBg={theme.colors.gray[100]}
            iconColor={theme.colors.gray[700]}
            icon={<FileTextIcon size={18} color={theme.colors.gray[700]} />}
          />
          <StatTile
            theme={theme}
            label="Profit / Loss"
            value={`$${((data.kpis?.totalProfit || 0) / 1000).toFixed(1)}K`}
            change={`${data.kpis?.profitMargin || '0'}% margin`}
            trend={data.kpis?.totalProfit >= 0 ? 'up' : 'down'}
            iconBg={theme.colors.gray[100]}
            iconColor={theme.colors.gray[700]}
            icon={<DollarIcon size={18} color={theme.colors.gray[700]} />}
          />
          <StatTile
            theme={theme}
            label="Low Stock"
            value={data.kpis?.lowStock?.toString() || '23'}
            change="Needs attention"
            iconBg={theme.colors.gray[100]}
            iconColor={theme.colors.gray[700]}
            icon={<WarningIcon size={18} color={theme.colors.gray[700]} />}
          />
          <StatTile
            theme={theme}
            label="Inventory Value"
            value={`$${((data.kpis?.inventoryValue || 0) / 1000).toFixed(1)}K`}
            change="Total worth"
            iconBg={theme.colors.gray[100]}
            iconColor={theme.colors.gray[700]}
            icon={<BoxIcon size={18} color={theme.colors.gray[700]} />}
          />
        </Animated.View>

        {/* Section: Analytics */}
        <View style={styles.sectionHeader}>
          <Typography variant="caption" weight="semibold" color={theme.colors.gray[500]} style={styles.sectionLabel}>
            ANALYTICS
          </Typography>
        </View>

        {/* Revenue & Profit Trend */}
        <Animated.View
          style={{
            opacity: fadeAnim1,
            transform: [{translateY: slideAnim1}],
          }}>
          <Card variant="elevated" padding="lg" style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View style={{flex: 1}}>
                <Typography variant="h3" weight="semibold" style={styles.chartTitle}>
                  Revenue & Profit Trend
                </Typography>
                <Typography variant="caption" color={theme.colors.gray[500]} style={{marginTop: 4}}>
                  Last 6 months performance
                </Typography>
              </View>
              <View style={styles.growthBadge}>
                <ArrowRightIcon size={14} color={theme.colors.success[600]} style={{transform: [{rotate: '-45deg'}]}} />
                <Typography variant="caption" weight="semibold" color={theme.colors.success[600]}>
                  +24.5%
                </Typography>
              </View>
            </View>
            <LineChart
              data={data.revenueTrend}
              width={screenWidth - 72}
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
            />
          </Card>
        </Animated.View>
        {/* Top Selling Products */}
        <Animated.View
          style={{
            opacity: fadeAnim2,
            transform: [{translateY: slideAnim2}],
          }}>
          <Card variant="elevated" padding="lg" style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View style={{flex: 1}}>
                <Typography variant="h3" weight="semibold" style={styles.chartTitle}>
                  Top Selling Products
                </Typography>
                <Typography variant="caption" color={theme.colors.gray[500]} style={{marginTop: 4}}>
                  Best performers this month
                </Typography>
              </View>
              <View style={[styles.growthBadge, {backgroundColor: theme.colors.primary[50]}]}>
                <InventoryIcon size={14} color={theme.colors.primary[600]} />
                <Typography variant="caption" weight="semibold" color={theme.colors.primary[600]} style={{marginLeft: 4}}>
                  Top 5
                </Typography>
              </View>
            </View>
            <BarChart
              data={{
                ...data.topProducts,
                labels: data.topProducts.labels.map((label: string) =>
                  label.length > 8 ? label.substring(0, 8) + '...' : label
                ),
              }}
              width={screenWidth - 72}
              height={240}
              chartConfig={{
                ...chartConfig,
                barPercentage: 0.7,
                fillShadowGradientFrom: theme.colors.primary[500],
                fillShadowGradientTo: theme.colors.primary[600],
                fillShadowGradientOpacity: 1,
                propsForLabels: {
                  fontSize: 9,
                  fontWeight: '500',
                  rotation: 0,
                },
              }}
              style={styles.chart}
              withInnerLines={false}
              fromZero
              showValuesOnTopOfBars
              yAxisLabel="$"
              yAxisSuffix=""
              segments={4}
            />
          </Card>
        </Animated.View>
        {/* Invoice Status */}
        <Animated.View
          style={{
            opacity: fadeAnim3,
            transform: [{translateY: slideAnim3}],
          }}>
          <Card variant="elevated" padding="lg" style={styles.chartCard}>
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
                <Typography variant="caption" weight="semibold" color={theme.colors.primary[600]} style={{marginLeft: 4}}>
                  {data.statusDistribution?.length || 0} Types
                </Typography>
              </View>
            </View>
            <PieChart
              data={data.statusDistribution}
              width={screenWidth - 72}
              height={220}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              style={styles.chart}
              hasLegend
            />
          </Card>
        </Animated.View>
        {/* Recent Activity */}
        <Card variant="elevated" padding="lg" style={styles.activityCard}>
          <Typography variant="h3" weight="semibold" style={styles.sectionTitle}>
            Recent Activity
          </Typography>
          <View style={styles.activityList}>
            {(data.recentActivity || []).length === 0 ? (
              <Typography variant="small" color={theme.colors.gray[500]}>
                No recent activity yet.
              </Typography>
            ) : (
              (data.recentActivity || []).slice(0, 4).map((activity: any) => (
                <View key={activity.id} style={styles.activityItem}>
                  <View style={styles.activityIcon}>
                    <ClipboardIcon size={16} color={theme.colors.primary[600]} />
                  </View>
                  <View style={styles.activityContent}>
                    <Typography variant="small" weight="medium">
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
                </View>
              ))
            )}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};
const makeStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.gray[50],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.gray[50],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxxl,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  headerEyebrow: {
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    color: theme.colors.gray[900],
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Section labels
  sectionHeader: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  sectionLabel: {
    letterSpacing: 1.2,
  },
  // Stat tiles
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: theme.spacing.md,
  },
  statTileWrapper: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  statTileCard: {
    minHeight: 120,
  },
  statTileTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
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
  },
  statTileLabel: {
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  statTileValue: {
    fontSize: 22,
    color: theme.colors.gray[900],
  },
  // Charts
  chartCard: {
    marginBottom: theme.spacing.md,
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
    backgroundColor: theme.colors.success[50],
    borderRadius: theme.borderRadius.md,
  },
  chartTitle: {
    fontSize: 17,
    color: theme.colors.gray[900],
  },
  chart: {
    marginVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  // Activity
  activityCard: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    marginBottom: theme.spacing.md,
    fontSize: 17,
    color: theme.colors.gray[900],
  },
  activityList: {
    gap: 10,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.gray[50],
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.primary[50],
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
});
