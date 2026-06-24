import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  ScrollView,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  DimensionValue,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {useAuth} from '../contexts/AuthContext';
import {useApiErrorHandler} from '../hooks/useApiErrorHandler';
import {useTheme} from '../contexts/ThemeContext';
import {Theme} from '../theme';
import {useBreakpoint, BreakpointInfo} from '../utils/breakpoints';
import discrepancyService from '../services/discrepancyService';
import {CheckCircleIcon, TruckIcon, ClipboardIcon} from '../components/icons';
import {formatDate} from '../utils/dateUtils';

interface EmployeeDiscrepanciesScreenProps {
  visible: boolean;
  onClose: () => void;
}

type StatusFilter = 'all' | 'pending' | 'resolved';

// Employee-facing Discrepancies screen: a clean, READ-ONLY view of only the
// discrepancies that belong to the signed-in employee (their truck + items they
// reported). The backend scopes the data by role; this screen adds no admin
// actions (no approve / reject / delete) — it's just "here's what's on you".
export const EmployeeDiscrepanciesScreen: React.FC<EmployeeDiscrepanciesScreenProps> = ({
  visible,
  onClose,
}) => {
  const theme = useTheme();
  const bp = useBreakpoint();
  const styles = useMemo(() => makeStyles(theme, bp), [theme, bp]);
  const {user} = useAuth();
  const {handleApiError} = useApiErrorHandler();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [discrepancies, setDiscrepancies] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    if (visible) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Backend auto-restricts to the employee's own discrepancies by role.
      const res = await discrepancyService.getDiscrepancies({limit: 200});
      setDiscrepancies(res?.data?.discrepancies || []);
    } catch (err: any) {
      await handleApiError(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const isPending = (d: any) => (d.status || '').toLowerCase() === 'pending';

  const filtered = discrepancies.filter(d => {
    if (statusFilter === 'pending') return isPending(d);
    if (statusFilter === 'resolved') return !isPending(d);
    return true;
  });

  const pendingCount = discrepancies.filter(isPending).length;

  // ── Type / status presentation ─────────────────────────────────────────
  const typeStyle = (d: any) => {
    const t = (d.discrepancyType || '').toLowerCase();
    if (t.includes('short') || t.includes('missing')) return theme.colors.error;
    if (t.includes('over')) return theme.colors.info;
    if (t.includes('damage')) return theme.colors.warning;
    return theme.colors.gray;
  };

  const statusStyle = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'pending') return theme.colors.warning;
    if (s === 'rejected') return theme.colors.error;
    return theme.colors.success; // approved / resolved
  };

  const renderCard = (d: any, index: number) => {
    const tone = typeStyle(d);
    const sTone = statusStyle(d.status);
    const isTruck = d._discrepancySource === 'truck';
    const qty = Math.abs(Number(d.difference || 0));
    return (
      <Card
        key={d._id || index}
        variant="elevated"
        padding="md"
        style={styles.card}>
        <View style={[styles.accent, {backgroundColor: tone[500]}]} />
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.typeIcon, {backgroundColor: tone[50]}]}>
              {isTruck ? (
                <TruckIcon size={18} color={tone[600]} />
              ) : (
                <ClipboardIcon size={18} color={tone[600]} />
              )}
            </View>
            <View style={styles.cardTitleWrap}>
              <Typography variant="body" weight="bold" numberOfLines={1}>
                {d.itemName || d.categoryName || 'Item'}
              </Typography>
              <Typography variant="caption" color={theme.colors.gray[500]}>
                {isTruck
                  ? `Truck ${d.truckNumber || '—'}`
                  : d.invoiceNumber || d.itemSku || 'Stock'}
              </Typography>
            </View>
          </View>
          <View style={[styles.statusBadge, {backgroundColor: sTone[50]}]}>
            <Typography variant="caption" weight="semibold" color={sTone[700]}>
              {d.status || 'Pending'}
            </Typography>
          </View>
        </View>

        <View style={styles.cardMeta}>
          <View style={[styles.typePill, {backgroundColor: tone[50]}]}>
            <Typography variant="caption" weight="semibold" color={tone[700]}>
              {d.discrepancyType || 'Discrepancy'}
            </Typography>
          </View>
          <Typography variant="caption" weight="semibold" color={tone[700]}>
            {qty} unit{qty === 1 ? '' : 's'}
          </Typography>
          <View style={styles.metaSpacer} />
          <Typography variant="caption" color={theme.colors.gray[400]}>
            {d.reportedAt ? formatDate(d.reportedAt) : ''}
          </Typography>
        </View>
      </Card>
    );
  };

  const summaryWidth: DimensionValue = '48%';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Typography variant="body" color={theme.colors.primary[600]} weight="semibold">
              Close
            </Typography>
          </TouchableOpacity>
          <Typography variant="h3" weight="bold" style={styles.headerTitle}>
            My Discrepancies
          </Typography>
          <View style={styles.closeBtn} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary[600]} />
          }>
          <View style={styles.contentWrap}>
            <Typography variant="caption" color={theme.colors.gray[500]} style={styles.intro}>
              Differences flagged on your truck and items you reported.
            </Typography>

            {/* Summary */}
            <View style={styles.summaryRow}>
              <Card variant="elevated" padding="md" style={[styles.summaryCard, {width: summaryWidth}]}>
                <Typography variant="caption" color={theme.colors.gray[500]}>
                  Total
                </Typography>
                <Typography variant="h2" weight="bold" color={theme.colors.primary[600]}>
                  {discrepancies.length}
                </Typography>
              </Card>
              <Card variant="elevated" padding="md" style={[styles.summaryCard, {width: summaryWidth}]}>
                <Typography variant="caption" color={theme.colors.gray[500]}>
                  Pending
                </Typography>
                <Typography variant="h2" weight="bold" color={theme.colors.warning[600]}>
                  {pendingCount}
                </Typography>
              </Card>
            </View>

            {/* Filter tabs */}
            <View style={styles.filterTabs}>
              {([
                {key: 'all', label: 'All'},
                {key: 'pending', label: 'Pending'},
                {key: 'resolved', label: 'Resolved'},
              ] as const).map(t => {
                const active = statusFilter === t.key;
                return (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.filterTab, active && styles.filterTabActive]}
                    onPress={() => setStatusFilter(t.key)}
                    activeOpacity={0.85}>
                    <Typography
                      variant="small"
                      weight="semibold"
                      color={active ? theme.colors.white : theme.colors.gray[700]}>
                      {t.label}
                    </Typography>
                  </TouchableOpacity>
                );
              })}
            </View>

            {loading && !refreshing ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={theme.colors.primary[600]} />
              </View>
            ) : filtered.length === 0 ? (
              <Card variant="elevated" padding="lg" style={styles.emptyCard}>
                <View style={[styles.emptyIcon, {backgroundColor: theme.colors.success[50]}]}>
                  <CheckCircleIcon size={28} color={theme.colors.success[600]} />
                </View>
                <Typography variant="h3" weight="semibold" color={theme.colors.gray[800]} style={styles.emptyTitle}>
                  All clear
                </Typography>
                <Typography variant="small" color={theme.colors.gray[500]} align="center">
                  {statusFilter === 'all'
                    ? 'You have no discrepancies — your stock is all accounted for.'
                    : `No ${statusFilter} discrepancies.`}
                </Typography>
              </Card>
            ) : (
              <View style={styles.list}>{filtered.map(renderCard)}</View>
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
      backgroundColor: theme.colors.background.secondary,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: bp.gutter,
      paddingVertical: 14,
      backgroundColor: theme.colors.white,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.gray[100],
    },
    headerTitle: {flex: 1, textAlign: 'center'},
    closeBtn: {minWidth: 56},
    scroll: {flex: 1},
    scrollContent: {paddingBottom: theme.spacing.xxxl},
    contentWrap: {
      width: '100%',
      maxWidth: bp.contentMaxWidth,
      alignSelf: 'center',
      paddingHorizontal: bp.gutter,
      paddingTop: theme.spacing.md,
    },
    intro: {marginBottom: theme.spacing.md},
    summaryRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: 12,
      marginBottom: theme.spacing.md,
    },
    summaryCard: {},
    filterTabs: {
      flexDirection: 'row',
      backgroundColor: theme.colors.gray[100],
      borderRadius: 10,
      padding: 4,
      gap: 4,
      marginBottom: theme.spacing.md,
    },
    filterTab: {
      flex: 1,
      paddingVertical: 9,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterTabActive: {backgroundColor: theme.colors.primary[600]},
    list: {gap: 12},
    card: {overflow: 'hidden'},
    accent: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cardHeaderLeft: {flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12},
    typeIcon: {
      width: 38,
      height: 38,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTitleWrap: {flex: 1},
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      marginLeft: 8,
    },
    cardMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 12,
    },
    typePill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    metaSpacer: {flex: 1},
    center: {paddingVertical: 48, alignItems: 'center'},
    emptyCard: {alignItems: 'center', paddingVertical: theme.spacing.xl},
    emptyIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    emptyTitle: {marginBottom: 4},
  });
