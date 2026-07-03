import React, {useState, useEffect, useMemo, useCallback} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  TextInput as RNTextInput,
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
import reportService, {SalesReportData} from '../services/reportService';
import {
  AlertCircleIcon,
  DollarIcon,
  BarChartIcon,
  FileTextIcon,
  TagIcon,
  ClipboardIcon,
} from '../components/icons';

interface SalesAnalyticsReportScreenProps {
  visible: boolean;
  onClose: () => void;
}

// --- date helpers (no date-fns dependency in mobile) --------------------
const fmt = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const subDays = (days: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
};
const startOfMonth = (): Date => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
};
const endOfMonth = (): Date => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
};

const money = (n: number | undefined): string =>
  `$${Number(n || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}`;
const money2 = (n: number | undefined): string =>
  `$${Number(n || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

export const SalesAnalyticsReportScreen: React.FC<SalesAnalyticsReportScreenProps> = ({
  visible,
  onClose,
}) => {
  const theme = useTheme();
  const bp = useBreakpoint();
  const styles = useMemo(() => makeStyles(theme, bp), [theme, bp]);
  const {token} = useAuth();
  const {handleApiError} = useApiErrorHandler();

  const [startDate, setStartDate] = useState(fmt(startOfMonth()));
  const [endDate, setEndDate] = useState(fmt(endOfMonth()));
  const [category, setCategory] = useState('');

  const [data, setData] = useState<SalesReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      setError(null);
      setLoading(true);
      const res = await reportService.sales(token, {
        startDate,
        endDate,
        category: category || undefined,
      });
      setData(res);
    } catch (e: any) {
      const handled = await handleApiError(e);
      if (!handled) {
        setError(e?.message || 'Failed to load sales report');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, startDate, endDate, category, handleApiError]);

  useEffect(() => {
    if (visible && token) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, token, startDate, endDate, category]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const applyQuickRange = (mode: 'last7' | 'last30' | 'month') => {
    if (mode === 'last7') {
      setStartDate(fmt(subDays(7)));
      setEndDate(fmt(new Date()));
    } else if (mode === 'last30') {
      setStartDate(fmt(subDays(30)));
      setEndDate(fmt(new Date()));
    } else {
      setStartDate(fmt(startOfMonth()));
      setEndDate(fmt(endOfMonth()));
    }
  };

  const summary = data?.summary;
  const categoryStats = data?.categoryStats || [];
  // Backend does not send a percentage; compute it client-side from sales.
  const totalCategorySales = categoryStats.reduce((s, c) => s + (c.sales || 0), 0);

  const summaryCards = [
    {
      label: 'Total Sales',
      value: money(summary?.totalSales),
      icon: <DollarIcon size={22} color={theme.colors.primary[600]} />,
      bg: theme.colors.primary[50],
    },
    {
      label: 'Total Profit',
      value: money(summary?.totalProfit),
      icon: <BarChartIcon size={22} color={theme.colors.success[600]} />,
      bg: theme.colors.success[50],
    },
    {
      label: 'Total Orders',
      value: Number(summary?.totalInvoices || 0).toLocaleString(),
      icon: <ClipboardIcon size={22} color={theme.colors.accent[600]} />,
      bg: theme.colors.accent[100],
    },
    {
      label: 'Avg Order Value',
      value: money2(summary?.averageOrderValue),
      icon: <DollarIcon size={22} color={theme.colors.warning[600]} />,
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
            Sales Analytics
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
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.contentWrap}>
            {/* Filters */}
            <Card variant="elevated" padding="lg" style={styles.section}>
              <Typography variant="body" weight="bold" style={styles.sectionTitle}>
                Filters
              </Typography>
              <View style={styles.filterRow}>
                <View style={styles.filterField}>
                  <Typography variant="caption" color={theme.colors.gray[600]} weight="semibold" style={styles.formLabel}>
                    Start Date
                  </Typography>
                  <RNTextInput
                    style={styles.formInput}
                    placeholder="YYYY-MM-DD"
                    value={startDate}
                    onChangeText={setStartDate}
                    autoCapitalize="none"
                    placeholderTextColor={theme.colors.gray[400]}
                  />
                </View>
                <View style={styles.filterField}>
                  <Typography variant="caption" color={theme.colors.gray[600]} weight="semibold" style={styles.formLabel}>
                    End Date
                  </Typography>
                  <RNTextInput
                    style={styles.formInput}
                    placeholder="YYYY-MM-DD"
                    value={endDate}
                    onChangeText={setEndDate}
                    autoCapitalize="none"
                    placeholderTextColor={theme.colors.gray[400]}
                  />
                </View>
              </View>
              <View style={styles.formField}>
                <Typography variant="caption" color={theme.colors.gray[600]} weight="semibold" style={styles.formLabel}>
                  Category (optional)
                </Typography>
                <RNTextInput
                  style={styles.formInput}
                  placeholder="All categories"
                  value={category}
                  onChangeText={setCategory}
                  placeholderTextColor={theme.colors.gray[400]}
                />
              </View>
              <View style={styles.quickRow}>
                {(
                  [
                    {key: 'last7', label: 'Last 7'},
                    {key: 'last30', label: 'Last 30'},
                    {key: 'month', label: 'This Month'},
                  ] as const
                ).map(q => (
                  <TouchableOpacity
                    key={q.key}
                    style={styles.quickChip}
                    onPress={() => applyQuickRange(q.key)}>
                    <Typography variant="caption" weight="semibold" color={theme.colors.gray[700]}>
                      {q.label}
                    </Typography>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>

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
                  Loading sales data...
                </Typography>
              </View>
            ) : (
              <>
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
                    </Card>
                  ))}
                </View>

                {/* Profit margin note */}
                {summary && (
                  <Card variant="outlined" padding="md" style={styles.marginCard}>
                    <Typography variant="small" color={theme.colors.gray[600]}>
                      Profit margin:{' '}
                      <Typography variant="small" weight="bold" color={theme.colors.success[700]}>
                        {Number(summary.profitMargin || 0)}%
                      </Typography>
                    </Typography>
                  </Card>
                )}

                {/* Category breakdown table */}
                <Card variant="elevated" padding="lg" style={styles.section}>
                  <View style={styles.tableTitleRow}>
                    <TagIcon size={18} color={theme.colors.gray[600]} />
                    <Typography variant="body" weight="bold" style={{marginLeft: 8}}>
                      Category Breakdown
                    </Typography>
                  </View>

                  {categoryStats.length === 0 ? (
                    <View style={styles.emptyBlock}>
                      <Typography variant="body" color={theme.colors.gray[500]} align="center">
                        No category data for this range
                      </Typography>
                    </View>
                  ) : (
                    <View style={styles.table}>
                      <View style={[styles.tableRow, styles.tableHeaderRow]}>
                        <Typography variant="caption" weight="bold" color={theme.colors.gray[600]} style={styles.colCategory}>
                          Category
                        </Typography>
                        <Typography variant="caption" weight="bold" color={theme.colors.gray[600]} style={styles.colNum}>
                          Sales
                        </Typography>
                        <Typography variant="caption" weight="bold" color={theme.colors.gray[600]} style={styles.colNumSmall}>
                          Qty
                        </Typography>
                        <Typography variant="caption" weight="bold" color={theme.colors.gray[600]} style={styles.colNumSmall}>
                          %
                        </Typography>
                      </View>
                      {categoryStats.map((c, idx) => {
                        const pct =
                          totalCategorySales > 0
                            ? ((c.sales || 0) / totalCategorySales) * 100
                            : 0;
                        return (
                          <View
                            key={`${c.category}-${idx}`}
                            style={[
                              styles.tableRow,
                              idx % 2 === 1 ? styles.tableRowAlt : null,
                            ]}>
                            <Typography variant="small" style={styles.colCategory} numberOfLines={1}>
                              {c.category}
                            </Typography>
                            <Typography variant="small" weight="medium" style={styles.colNum}>
                              {money(c.sales)}
                            </Typography>
                            <Typography variant="small" style={styles.colNumSmall}>
                              {Number(c.quantity || 0).toLocaleString()}
                            </Typography>
                            <Typography variant="small" weight="semibold" color={theme.colors.primary[700]} style={styles.colNumSmall}>
                              {pct.toFixed(1)}%
                            </Typography>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </Card>

                {/* TODO note */}
                <Card variant="outlined" padding="md" style={styles.todoCard}>
                  <View style={styles.errorContent}>
                    <FileTextIcon size={18} color={theme.colors.gray[500]} />
                    <Typography variant="caption" color={theme.colors.gray[500]} style={styles.errorText}>
                      TODO: sales-trend charts and CSV/PDF export are available on the
                      web app. Charts and file export are not yet implemented on mobile.
                    </Typography>
                  </View>
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
    sectionTitle: {
      marginBottom: theme.spacing.md,
    },
    filterRow: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    filterField: {
      flex: 1,
      marginBottom: theme.spacing.md,
    },
    formField: {
      marginBottom: theme.spacing.md,
    },
    formLabel: {
      marginBottom: 6,
    },
    formInput: {
      backgroundColor: theme.colors.white,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: theme.typography.roles.body.fontSize,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
      color: theme.colors.gray[900],
    },
    quickRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    quickChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: theme.colors.gray[100],
    },
    loadingBlock: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl * 2,
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
    marginCard: {
      marginBottom: theme.spacing.md,
      backgroundColor: theme.colors.success[50],
    },
    tableTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    table: {
      borderRadius: 8,
      overflow: 'hidden',
    },
    tableRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 8,
    },
    tableHeaderRow: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.gray[200],
    },
    tableRowAlt: {
      backgroundColor: theme.colors.gray[50],
    },
    colCategory: {
      flex: 2,
    },
    colNum: {
      flex: 1.3,
      textAlign: 'right',
    },
    colNumSmall: {
      flex: 1,
      textAlign: 'right',
    },
    emptyBlock: {
      paddingVertical: theme.spacing.lg,
    },
    todoCard: {
      marginBottom: theme.spacing.md,
      backgroundColor: theme.colors.gray[100],
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
