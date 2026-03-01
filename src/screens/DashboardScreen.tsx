import React, {useState, useEffect} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
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
} from '../components/icons';
import dashboardService from '../services/dashboardService';

const screenWidth = Dimensions.get('window').width;

export const DashboardScreen = () => {
  const {token} = useAuth();
  const {handleApiError} = useApiErrorHandler();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);

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
    salesByChannel: [
      {name: 'RouteStar', population: 65, color: '#3B82F6', legendFontColor: '#64748B'},
      {name: 'CustomerConnect', population: 35, color: '#10B981', legendFontColor: '#64748B'},
    ],
  });

  const data = dashboardData || getMockData();

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForLabels: {
      fontSize: 11,
      fontWeight: '500',
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: '#e2e8f0',
      strokeWidth: 1,
    },
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
        {/* Header */}
        <View style={styles.header}>
          <Typography variant="h2" weight="bold" style={styles.headerTitle}>
            Dashboard
          </Typography>
          <Typography
            variant="body"
            color={theme.colors.text.tertiary}
            style={styles.headerSubtitle}>
            Welcome back! Here's your inventory overview
          </Typography>
        </View>

        {/* Stats Grid - Modern Gradient Cards */}
        <View style={styles.statsGrid}>
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
        </View>

        {/* Revenue & Profit Trend */}
        <Card variant="elevated" padding="lg" style={styles.chartCard}>
          <Typography variant="h3" weight="semibold" style={styles.chartTitle}>
            Revenue & Profit Trend
          </Typography>
          <Typography variant="caption" color={theme.colors.gray[500]} style={{marginBottom: 16}}>
            Last 6 months performance
          </Typography>
          <LineChart
            data={data.revenueTrend}
            width={screenWidth - 64}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withInnerLines
            withOuterLines
            withVerticalLines
            withHorizontalLines
            withVerticalLabels
            withHorizontalLabels
            withDots
            withShadow
            fromZero
          />
        </Card>

        {/* Top Selling Products */}
        <Card variant="elevated" padding="lg" style={styles.chartCard}>
          <Typography variant="h3" weight="semibold" style={styles.chartTitle}>
            Top Selling Products
          </Typography>
          <Typography variant="caption" color={theme.colors.gray[500]} style={{marginBottom: 16}}>
            Best performers this month
          </Typography>
          <BarChart
            data={data.topProducts}
            width={screenWidth - 64}
            height={220}
            chartConfig={chartConfig}
            style={styles.chart}
            withInnerLines
            fromZero
            showValuesOnTopOfBars
            yAxisLabel="$"
            yAxisSuffix="k"
          />
        </Card>

        {/* Sales by Channel */}
        <Card variant="elevated" padding="lg" style={styles.chartCard}>
          <Typography variant="h3" weight="semibold" style={styles.chartTitle}>
            Sales by Channel
          </Typography>
          <Typography variant="caption" color={theme.colors.gray[500]} style={{marginBottom: 16}}>
            Distribution across platforms
          </Typography>
          <PieChart
            data={data.salesByChannel}
            width={screenWidth - 64}
            height={220}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            style={styles.chart}
            hasLegend
          />
        </Card>

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
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xxxl,
  },
  header: {
    marginBottom: theme.spacing.xl,
  },
  headerTitle: {
    marginBottom: theme.spacing.xs,
    color: theme.colors.text.primary,
  },
  headerSubtitle: {
    fontSize: theme.typography.fontSizes.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -theme.spacing.xs,
    marginBottom: theme.spacing.xl,
  },
  statCardWrapper: {
    width: '50%',
    padding: theme.spacing.xs,
  },
  chartCard: {
    marginBottom: theme.spacing.lg,
  },
  chartTitle: {
    marginBottom: theme.spacing.xs,
    fontSize: theme.typography.fontSizes.xl,
    color: theme.colors.text.primary,
  },
  chart: {
    marginVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
  },
  activityCard: {
    marginBottom: theme.spacing.lg,
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
