import React, {useState, useEffect, useMemo, useCallback} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {useAuth} from '../contexts/AuthContext';
import {useApiErrorHandler} from '../hooks/useApiErrorHandler';
import {useTheme} from '../contexts/ThemeContext';
import {Theme} from '../theme';
import {useBreakpoint, BreakpointInfo} from '../utils/breakpoints';
import reportService, {DashboardReportData} from '../services/reportService';
import {
  AlertCircleIcon,
  DollarIcon,
  BarChartIcon,
  ClipboardIcon,
  WarningIcon,
  BoxIcon,
} from '../components/icons';

interface ReportsHubScreenProps {
  visible: boolean;
  onClose: () => void;
}

const money = (n: number | undefined): string =>
  `$${Number(n || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}`;
const money2 = (n: number | undefined): string =>
  `$${Number(n || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

export const ReportsHubScreen: React.FC<ReportsHubScreenProps> = ({
  visible,
  onClose,
}) => {
  const theme = useTheme();
  const bp = useBreakpoint();
  const styles = useMemo(() => makeStyles(theme, bp), [theme, bp]);
  const {token} = useAuth();
  const {handleApiError} = useApiErrorHandler();

  const [data, setData] = useState<DashboardReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      setError(null);
      setLoading(true);
      const res = await reportService.dashboard(token);
      setData(res);
    } catch (e: any) {
      const handled = await handleApiError(e);
      if (!handled) {
        setError(e?.message || 'Failed to load reports');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, handleApiError]);

  useEffect(() => {
    if (visible && token) {
      loadData();
    }
  }, [visible, token, loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const summary = data?.summary;
  const topItems = data?.topSellingItemsDetailed || [];

  const summaryCards = [
    {
      label: 'Total Sales',
      value: money(summary?.totalRevenue),
      sub: `${Number(summary?.revenueChange || 0) >= 0 ? '+' : ''}${Number(
        summary?.revenueChange || 0,
      ).toFixed(1)}% vs last period`,
      icon: <DollarIcon size={22} color={theme.colors.primary[600]} />,
      bg: theme.colors.primary[50],
    },
    {
      label: 'Total Profit',
      value: money(summary?.totalProfit),
      sub: `${Number(summary?.profitMargin || 0).toFixed(1)}% profit margin`,
      icon: <BarChartIcon size={22} color={theme.colors.success[600]} />,
      bg: theme.colors.success[50],
    },
    {
      label: 'Total Orders',
      value: Number(summary?.totalOrders || 0).toLocaleString(),
      sub: `Avg: ${money2(summary?.avgOrderValue)}`,
      icon: <ClipboardIcon size={22} color={theme.colors.accent[600]} />,
      bg: theme.colors.accent[100],
    },
    {
      label: 'Low Stock Items',
      value: Number(summary?.lowStockCount || 0).toLocaleString(),
      sub: `${Number(summary?.reorderCount || 0)} need reorder`,
      icon: <WarningIcon size={22} color={theme.colors.warning[600]} />,
      bg: theme.colors.warning[100],
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Typography variant="body" color={theme.colors.primary[600]} weight="semibold">
              Close
            </Typography>
          </TouchableOpacity>
          <Typography variant="h3" weight="bold" style={styles.modalTitle}>
            Reports
          </Typography>
          <TouchableOpacity onPress={loadData} style={styles.refreshButton}>
            <Typography variant="small" color={theme.colors.primary[600]} weight="semibold">
              Refresh
            </Typography>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}>
          <View style={styles.contentWrap}>
            {error && (
              <Card variant="outlined" padding="lg" style={styles.errorCard}>
                <View style={styles.errorContent}>
                  <AlertCircleIcon size={24} color={theme.colors.error[500]} />
                  <Typography variant="body" color={theme.colors.error[700]} style={styles.errorText}>
                    {error}
                  </Typography>
                </View>
              </Card>
            )}

            {loading && !refreshing ? (
              <View style={styles.loadingBlock}>
                <ActivityIndicator size="large" color={theme.colors.primary[600]} />
                <Typography variant="body" color={theme.colors.gray[600]} style={{marginTop: 12}}>
                  Loading reports...
                </Typography>
              </View>
            ) : (
              <>
                {/* Low stock alert banner */}
                {!!summary?.lowStockCount && summary.lowStockCount > 0 && (
                  <Card variant="outlined" padding="lg" style={styles.alertBanner}>
                    <View style={styles.alertContent}>
                      <View style={styles.alertIcon}>
                        <WarningIcon size={22} color={theme.colors.warning[700]} />
                      </View>
                      <View style={{flex: 1}}>
                        <Typography variant="body" weight="bold" color={theme.colors.warning[800]}>
                          Low Stock Alert
                        </Typography>
                        <Typography variant="small" color={theme.colors.warning[700]} style={{marginTop: 2}}>
                          You have {summary.lowStockCount} item
                          {summary.lowStockCount === 1 ? '' : 's'} with low stock.
                          {summary.reorderCount > 0
                            ? ` ${summary.reorderCount} need reordering.`
                            : ''}
                        </Typography>
                      </View>
                    </View>
                  </Card>
                )}

                {/* Summary cards */}
                <View style={styles.cardsGrid}>
                  {summaryCards.map(c => (
                    <Card key={c.label} variant="elevated" padding="lg" style={styles.summaryCard}>
                      <View style={[styles.summaryIcon, {backgroundColor: c.bg}]}>
                        {c.icon}
                      </View>
                      <Typography variant="caption" color={theme.colors.gray[500]} weight="medium">
                        {c.label}
                      </Typography>
                      <Typography variant="h3" weight="bold" style={styles.summaryValue}>
                        {c.value}
                      </Typography>
                      <Typography variant="caption" color={theme.colors.gray[500]} style={{marginTop: 4}}>
                        {c.sub}
                      </Typography>
                    </Card>
                  ))}
                </View>

                {/* Top selling items */}
                <Card variant="elevated" padding="lg" style={styles.section}>
                  <View style={styles.tableTitleRow}>
                    <BarChartIcon size={18} color={theme.colors.gray[600]} />
                    <Typography variant="body" weight="bold" style={{marginLeft: 8}}>
                      Top Selling Items
                    </Typography>
                  </View>

                  {topItems.length === 0 ? (
                    <View style={styles.emptyBlock}>
                      <BoxIcon size={40} color={theme.colors.gray[400]} />
                      <Typography variant="body" color={theme.colors.gray[500]} align="center" style={{marginTop: 8}}>
                        No sales data yet
                      </Typography>
                    </View>
                  ) : (
                    <View>
                      {topItems.map((item, idx) => (
                        <View
                          key={`${item.skuCode}-${idx}`}
                          style={[
                            styles.itemRow,
                            idx < topItems.length - 1 ? styles.itemRowBorder : null,
                          ]}>
                          <View style={styles.rankBadge}>
                            <Typography variant="caption" weight="bold" color={theme.colors.primary[700]}>
                              {idx + 1}
                            </Typography>
                          </View>
                          <View style={styles.itemInfo}>
                            <Typography variant="small" weight="semibold" numberOfLines={1}>
                              {item.itemName}
                            </Typography>
                            <Typography variant="caption" color={theme.colors.gray[500]} numberOfLines={1}>
                              {item.skuCode} · Qty {Number(item.quantity || 0).toLocaleString()} ·{' '}
                              {Number(item.orderCount || 0)} orders
                            </Typography>
                          </View>
                          <Typography variant="small" weight="bold" color={theme.colors.success[700]}>
                            {money(item.value)}
                          </Typography>
                        </View>
                      ))}
                    </View>
                  )}
                </Card>
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const makeStyles = (theme: Theme, bp: BreakpointInfo) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.gray[50],
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.gray[200],
      backgroundColor: theme.colors.white,
    },
    closeButton: {
      paddingVertical: 4,
      width: 60,
    },
    refreshButton: {
      paddingVertical: 4,
      width: 60,
      alignItems: 'flex-end',
    },
    modalTitle: {
      flex: 1,
      textAlign: 'center',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: theme.spacing.xl,
    },
    contentWrap: {
      width: '100%',
      maxWidth: bp.contentMaxWidth,
      alignSelf: 'center',
      paddingHorizontal: bp.gutter,
      paddingTop: theme.spacing.lg,
    },
    section: {
      marginBottom: theme.spacing.md,
    },
    loadingBlock: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl * 2,
    },
    alertBanner: {
      marginBottom: theme.spacing.md,
      backgroundColor: theme.colors.warning[50],
      borderColor: theme.colors.warning[200],
    },
    alertContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    alertIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: theme.colors.warning[100],
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    summaryCard: {
      width: '48%',
      marginBottom: theme.spacing.md,
    },
    summaryIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.sm,
    },
    summaryValue: {
      marginTop: 2,
    },
    tableTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      gap: 12,
    },
    itemRowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.gray[100],
    },
    rankBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.primary[100],
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemInfo: {
      flex: 1,
    },
    emptyBlock: {
      alignItems: 'center',
      paddingVertical: theme.spacing.lg,
    },
    errorCard: {
      marginBottom: theme.spacing.md,
      backgroundColor: theme.colors.error[50],
    },
    errorContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    errorText: {
      flex: 1,
    },
  });
