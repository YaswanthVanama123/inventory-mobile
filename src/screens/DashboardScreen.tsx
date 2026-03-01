import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  Animated,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {LineChart, BarChart, PieChart} from 'react-native-chart-kit';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {GradientStatCard} from '../components/molecules/GradientStatCard';
import {useAuth} from '../contexts/AuthContext';
import {useApiErrorHandler} from '../hooks/useApiErrorHandler';
import {theme} from '../theme';
import {
  BoxIcon,
  WarningIcon,
  DollarIcon,
  TagIcon,
  ClipboardIcon,
  FileTextIcon,
  InventoryIcon,
  ArrowRightIcon,
} from '../components/icons';
import dashboardService from '../services/dashboardService';

const screenWidth = Dimensions.get('window').width;

export const DashboardScreen = () => {
  const {token} = useAuth();
  const {handleApiError} = useApiErrorHandler();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);

  // Animation values
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

      // Check if token expired and handle auto-logout
      const wasHandled = await handleApiError(error);
      if (wasHandled) return;

      // Use mock data if API fails for other reasons
      setDashboardData(getMockData());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  // Animate charts when data loads
  useEffect(() => {
    if (dashboardData && !loading) {
      // Reset animations on data change
      fadeAnim1.setValue(0);
      fadeAnim2.setValue(0);
      fadeAnim3.setValue(0);
      slideAnim1.setValue(30);
      slideAnim2.setValue(30);
      slideAnim3.setValue(30);
      statsOpacity.setValue(0);
      statsScale.setValue(0.9);

      // Animate stat cards first
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

      // Then stagger chart animations
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
      {name: 'Pending', population: 20, color: '#F59E0B', legendFontColor: '#64748B'},
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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {/* Stats Grid - Modern Gradient Cards */}
        <Animated.View
          style={[
            styles.statsGrid,
            {
              opacity: statsOpacity,
              transform: [{scale: statsScale}],
            },
          ]}>
          <View style={styles.statCardWrapper}>
            <GradientStatCard
              title="Total Revenue"
              value={`$${(data.kpis?.totalRevenue / 1000).toFixed(1)}K`}
              subtitle={data.kpis?.revenueChange || '+12.5%'}
              gradientColor="blue"
              icon={<DollarIcon size={18} color="#ffffff" />}
              trend="up"
              size="md"
            />
          </View>

          <View style={styles.statCardWrapper}>
            <GradientStatCard
              title="Total Orders"
              value={data.kpis?.totalOrders?.toLocaleString() || '1,234'}
              subtitle={data.kpis?.ordersChange || '+8.3%'}
              gradientColor="purple"
              icon={<ClipboardIcon size={18} color="#ffffff" />}
              trend="up"
              size="md"
            />
          </View>

          <View style={styles.statCardWrapper}>
            <GradientStatCard
              title="Low Stock"
              value={data.kpis?.lowStock?.toString() || '23'}
              subtitle="Needs attention"
              gradientColor="orange"
              icon={<WarningIcon size={18} color="#ffffff" />}
              size="md"
            />
          </View>

          <View style={styles.statCardWrapper}>
            <GradientStatCard
              title="Inventory Value"
              value={`$${(data.kpis?.inventoryValue / 1000).toFixed(1)}K`}
              subtitle="Total worth"
              gradientColor="green"
              icon={<BoxIcon size={18} color="#ffffff" />}
              size="md"
            />
          </View>
        </Animated.View>

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
              data={data.topProducts}
              width={screenWidth - 72}
              height={240}
              chartConfig={{
                ...chartConfig,
                barPercentage: 0.7,
                fillShadowGradientFrom: theme.colors.primary[500],
                fillShadowGradientTo: theme.colors.primary[600],
                fillShadowGradientOpacity: 1,
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
            {(data.recentActivity || []).slice(0, 4).map((activity: any) => (
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
                    {activity.timestamp ? new Date(activity.timestamp).toLocaleString() : 'Recently'}
                  </Typography>
                </View>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xxxl,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 0,
    marginBottom: theme.spacing.xl,
  },
  statCardWrapper: {
    width: '50%',
    padding: theme.spacing.xs,
  },
  chartCard: {
    marginBottom: theme.spacing.lg,
    marginHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.xl,
    ...theme.shadows.md,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.colors.success[50],
    borderRadius: theme.borderRadius.lg,
  },
  chartTitle: {
    fontSize: theme.typography.fontSizes.xl,
    color: theme.colors.text.primary,
  },
  chart: {
    marginVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
  },
  activityCard: {
    marginBottom: theme.spacing.lg,
    marginHorizontal: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  sectionTitle: {
    marginBottom: theme.spacing.md,
    fontSize: theme.typography.fontSizes.xl,
    color: theme.colors.text.primary,
  },
  activityList: {
    gap: theme.spacing.sm,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.background.secondary,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  activityContent: {
    flex: 1,
  },
  activityTime: {
    marginTop: theme.spacing.xs,
  },
});
