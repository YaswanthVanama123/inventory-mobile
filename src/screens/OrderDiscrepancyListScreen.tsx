import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import {PaginatedList} from '../components/molecules/PaginatedList';
import {Pagination} from '../components/molecules/Pagination';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {Checkbox} from '../components/atoms/Checkbox';
import {BulkPurgeBar} from '../components/molecules/BulkPurgeBar';
import {useAuth} from '../contexts/AuthContext';
import {useRefetchOnFocus} from '../hooks/useRefetchOnFocus';
import {useApiErrorHandler} from '../hooks/useApiErrorHandler';
import {useTheme} from '../contexts/ThemeContext';
import useDebounce from '../hooks/useDebounce';
import {Theme} from '../theme';
import {useBreakpoint, BreakpointInfo} from '../utils/breakpoints';
import orderDiscrepancyService from '../services/orderDiscrepancyService';
import {
  AlertCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '../components/icons';

interface OrderDiscrepancyListScreenProps {
  navigation: any;
}

export const OrderDiscrepancyListScreen: React.FC<
  OrderDiscrepancyListScreenProps
> = ({navigation}) => {
  const theme = useTheme();
  const bp = useBreakpoint();
  const styles = useMemo(() => makeStyles(theme, bp), [theme, bp]);
  const {token, user} = useAuth();
  const {handleApiError} = useApiErrorHandler();
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [discrepancies, setDiscrepancies] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const [stats, setStats] = useState<any>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebounce(searchText, 400);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    pages: 0,
  });

  useEffect(() => {
    setPage(1);
  }, [typeFilter, debouncedSearch]);

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token, typeFilter, debouncedSearch, page, pageSize]);

  useRefetchOnFocus(() => loadData());

  const loadData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const params: any = {page, limit: pageSize};
      if (typeFilter) params.discrepancyType = typeFilter;
      if (debouncedSearch.trim()) params.orderNumber = debouncedSearch.trim();
      const [discrepanciesResponse, statsResponse] = await Promise.all([
        orderDiscrepancyService.getOrderDiscrepancies(token, params),
        orderDiscrepancyService.getOrderDiscrepancyStats(token),
      ]);
      setDiscrepancies(discrepanciesResponse.discrepancies);
      setPagination(
        discrepanciesResponse.pagination || {
          total: 0,
          page: 1,
          limit: pageSize,
          pages: 0,
        },
      );
      setStats(statsResponse);
    } catch (error: any) {
      console.error('Failed to fetch discrepancies:', error);
      const wasHandled = await handleApiError(error);
      if (!wasHandled) {
        Alert.alert('Error', 'Failed to load order discrepancies');
      }
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleDelete = (discrepancy: any) => {
    Alert.alert(
      'Delete Discrepancy',
      `Are you sure you want to delete this discrepancy?\n\nOrder: #${discrepancy.orderNumber}\nItem: ${discrepancy.itemName}\nDifference: ${discrepancy.discrepancyQuantity > 0 ? '+' : ''}${discrepancy.discrepancyQuantity}\n\nThis action cannot be undone.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!token) return;
            try {
              await orderDiscrepancyService.deleteOrderDiscrepancy(
                token,
                discrepancy._id,
              );
              Alert.alert('Success', 'Order discrepancy deleted');
              loadData();
            } catch (error: any) {
              console.error('Delete error:', error);
              const wasHandled = await handleApiError(error);
              if (!wasHandled) {
                Alert.alert(
                  'Error',
                  error.message || 'Failed to delete discrepancy',
                );
              }
            }
          },
        },
      ],
    );
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Shortage':
        return {bg: theme.colors.warning[50], text: theme.colors.warning[700]};
      case 'Overage':
        return {bg: theme.colors.primary[50], text: theme.colors.primary[700]};
      case 'Matched':
        return {bg: theme.colors.success[50], text: theme.colors.success[700]};
      default:
        return {bg: theme.colors.gray[50], text: theme.colors.gray[600]};
    }
  };

  const getDiffColor = (qty: number) => {
    if (qty > 0) return theme.colors.primary[700];
    if (qty < 0) return theme.colors.warning[700];
    return theme.colors.success[700];
  };

  const filteredDiscrepancies = discrepancies;

  const formatDate = (date: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && !refreshing && !hasLoaded) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[600]} />
          <Typography style={styles.loadingText}>
            Loading discrepancies...
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <View style={styles.header}>
        <Typography variant="h2" style={styles.headerTitle}>
          Order Discrepancies
        </Typography>
        <Typography variant="body2" style={styles.subtitle}>
          Track order verification differences
        </Typography>
      </View>

      {stats && (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Typography variant="body2" style={styles.statLabel}>
              Total
            </Typography>
            <Typography variant="h3" style={styles.statValue}>
              {stats.total || 0}
            </Typography>
          </View>
          <View style={styles.statCard}>
            <Typography variant="body2" style={styles.statLabel}>
              Shortages
            </Typography>
            <Typography variant="h3" style={[styles.statValue, {color: theme.colors.warning[700]}]}>
              {stats.shortages || 0}
            </Typography>
          </View>
          <View style={styles.statCard}>
            <Typography variant="body2" style={styles.statLabel}>
              Overages
            </Typography>
            <Typography variant="h3" style={[styles.statValue, {color: theme.colors.primary[700]}]}>
              {stats.overages || 0}
            </Typography>
          </View>
        </View>
      )}

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by order number"
          placeholderTextColor={theme.colors.gray[400]}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}>
          {[
            {id: '', label: 'All'},
            {id: 'Shortage', label: 'Shortage'},
            {id: 'Overage', label: 'Overage'},
          ].map(filter => {
            const isActive = typeFilter === filter.id;
            return (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.filterButton,
                  isActive && styles.filterButtonActive,
                ]}
                onPress={() => setTypeFilter(filter.id)}>
                <Typography
                  variant="body2"
                  style={[
                    styles.filterButtonText,
                    isActive && styles.filterButtonTextActive,
                  ]}>
                  {filter.label}
                </Typography>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.purgeBarWrap}>
        <BulkPurgeBar
          type="order-discrepancies"
          label="Order Discrepancies"
          selectedIds={Array.from(selectedIds)}
          onDone={() => {
            setSelectedIds(new Set());
            loadData();
          }}
        />
      </View>

      <PaginatedList
        data={filteredDiscrepancies}
        keyExtractor={(item) => item._id}
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={onRefresh}
        pagedMode
        scrollTopKey={`${page}|${pageSize}`}
        resetKey={`${typeFilter}|${debouncedSearch}`}
        ItemSeparatorComponent={() => <View style={{height: 0}} />}
        ListFooterComponent={
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.pages}
            totalItems={pagination.total}
            pageSize={pagination.limit}
            onPageChange={setPage}
            onPageSizeChange={size => {
              setPageSize(size);
              setPage(1);
            }}
          />
        }
        ListEmptyComponent={
          <Card style={styles.emptyCard}>
            <AlertCircleIcon size={48} color={theme.colors.gray[400]} />
            <Typography variant="h4" style={styles.emptyTitle}>
              No Order Discrepancies
            </Typography>
            <Typography variant="body2" style={styles.emptyText}>
              Discrepancies will appear here when orders are verified
            </Typography>
          </Card>
        }
        renderItem={({item: discrepancy}) => {
          const isExpanded = expandedRow === discrepancy._id;
          const typeColors = getTypeColor(discrepancy.discrepancyType);

          return (
            <Card
              style={styles.discrepancyCard}>
              <TouchableOpacity
                style={[
                  styles.rowHeader,
                  isExpanded && styles.rowHeaderExpanded,
                ]}
                onPress={() =>
                  setExpandedRow(isExpanded ? null : discrepancy._id)
                }
                activeOpacity={0.7}>
                <Checkbox
                  checked={selectedIds.has(discrepancy._id)}
                  onChange={() => toggleSelected(discrepancy._id)}
                />
                <View style={styles.chevronContainer}>
                  {isExpanded ? (
                    <ChevronDownIcon size={18} color={theme.colors.primary[600]} />
                  ) : (
                    <ChevronRightIcon size={18} color={theme.colors.gray[400]} />
                  )}
                </View>

                <View style={styles.rowInfo}>
                  <View style={styles.rowTitleRow}>
                    <Typography variant="body2" style={styles.itemName} numberOfLines={1}>
                      {discrepancy.itemName}
                    </Typography>
                    {discrepancy.sku && (
                      <View style={styles.skuBadge}>
                        <Typography variant="body2" style={styles.skuText}>
                          {discrepancy.sku}
                        </Typography>
                      </View>
                    )}
                  </View>
                  <View style={styles.rowMeta}>
                    <Typography variant="body2" style={styles.orderNum}>
                      Order #{discrepancy.orderNumber}
                    </Typography>
                    <Typography variant="body2" style={styles.rowDate}>
                      {' • '}
                      {formatDate(discrepancy.reportedAt)}
                    </Typography>
                  </View>
                </View>

                <View style={styles.rowRight}>
                  <View
                    style={[
                      styles.diffBadge,
                      {
                        backgroundColor:
                          discrepancy.discrepancyQuantity > 0
                            ? theme.colors.primary[100]
                            : discrepancy.discrepancyQuantity < 0
                            ? theme.colors.warning[100]
                            : theme.colors.success[100],
                      },
                    ]}>
                    <Typography
                      variant="body2"
                      style={[
                        styles.diffText,
                        {color: getDiffColor(discrepancy.discrepancyQuantity)},
                      ]}>
                      {discrepancy.discrepancyQuantity > 0 ? '+' : ''}
                      {discrepancy.discrepancyQuantity}
                    </Typography>
                  </View>
                  <View
                    style={[
                      styles.typeBadge,
                      {backgroundColor: typeColors.bg},
                    ]}>
                    <Typography
                      variant="body2"
                      style={[styles.typeText, {color: typeColors.text}]}>
                      {discrepancy.discrepancyType}
                    </Typography>
                  </View>
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.expandedPanel}>
                  <View style={styles.quantityGrid}>
                    <View style={styles.quantityBox}>
                      <Typography variant="body2" style={styles.quantityLabel}>
                        Expected
                      </Typography>
                      <Typography variant="h3" style={styles.quantityValue}>
                        {discrepancy.expectedQuantity}
                      </Typography>
                    </View>
                    <View style={styles.quantityArrow}>
                      <Typography style={styles.arrowText}>→</Typography>
                    </View>
                    <View style={styles.quantityBox}>
                      <Typography variant="body2" style={styles.quantityLabel}>
                        Received
                      </Typography>
                      <Typography variant="h3" style={styles.quantityValue}>
                        {discrepancy.receivedQuantity}
                      </Typography>
                    </View>
                    <View style={styles.quantityArrow}>
                      <Typography style={styles.arrowText}>=</Typography>
                    </View>
                    <View style={styles.quantityBox}>
                      <Typography variant="body2" style={styles.quantityLabel}>
                        Diff
                      </Typography>
                      <Typography
                        variant="h3"
                        style={[
                          styles.quantityValue,
                          {color: getDiffColor(discrepancy.discrepancyQuantity)},
                        ]}>
                        {discrepancy.discrepancyQuantity > 0 ? '+' : ''}
                        {discrepancy.discrepancyQuantity}
                      </Typography>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <View style={styles.detailRow}>
                      <Typography variant="body2" style={styles.detailLabel}>
                        Order #
                      </Typography>
                      <Typography variant="body2" style={styles.detailValue}>
                        {discrepancy.orderNumber}
                      </Typography>
                    </View>
                    <View style={styles.detailRow}>
                      <Typography variant="body2" style={styles.detailLabel}>
                        Item
                      </Typography>
                      <Typography
                        variant="body2"
                        style={styles.detailValue}
                        numberOfLines={1}>
                        {discrepancy.itemName}
                      </Typography>
                    </View>
                    {discrepancy.sku && (
                      <View style={styles.detailRow}>
                        <Typography variant="body2" style={styles.detailLabel}>
                          SKU
                        </Typography>
                        <Typography variant="body2" style={styles.detailValue}>
                          {discrepancy.sku}
                        </Typography>
                      </View>
                    )}
                    {discrepancy.reportedBy && (
                      <View style={styles.detailRow}>
                        <Typography variant="body2" style={styles.detailLabel}>
                          Reported By
                        </Typography>
                        <Typography variant="body2" style={styles.detailValue}>
                          {discrepancy.reportedBy?.fullName ||
                            discrepancy.reportedBy?.username ||
                            'N/A'}
                        </Typography>
                      </View>
                    )}
                    <View style={styles.detailRow}>
                      <Typography variant="body2" style={styles.detailLabel}>
                        Date
                      </Typography>
                      <Typography variant="body2" style={styles.detailValue}>
                        {new Date(discrepancy.reportedAt).toLocaleString()}
                      </Typography>
                    </View>
                    <View style={styles.detailRow}>
                      <Typography variant="body2" style={styles.detailLabel}>
                        Type
                      </Typography>
                      <View
                        style={[
                          styles.typeBadge,
                          {backgroundColor: typeColors.bg},
                        ]}>
                        <Typography
                          variant="body2"
                          style={[styles.typeText, {color: typeColors.text}]}>
                          {discrepancy.discrepancyType}
                        </Typography>
                      </View>
                    </View>
                  </View>

                  {(discrepancy.notes || discrepancy.resolutionNotes) && (
                    <View style={styles.notesSection}>
                      {discrepancy.notes && (
                        <View style={styles.noteBox}>
                          <Typography
                            variant="body2"
                            style={styles.noteLabel}>
                            Notes
                          </Typography>
                          <Typography variant="body2" style={styles.noteText}>
                            {discrepancy.notes}
                          </Typography>
                        </View>
                      )}
                      {discrepancy.resolutionNotes && (
                        <View style={[styles.noteBox, styles.resolutionNoteBox]}>
                          <Typography
                            variant="body2"
                            style={styles.noteLabel}>
                            Resolution Notes
                          </Typography>
                          <Typography variant="body2" style={styles.noteText}>
                            {discrepancy.resolutionNotes}
                          </Typography>
                        </View>
                      )}
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(discrepancy)}>
                    <Typography variant="body2" style={styles.deleteButtonText}>
                      Delete Discrepancy
                    </Typography>
                  </TouchableOpacity>
                </View>
              )}
            </Card>
          );
        }}
      />
    </SafeAreaView>
  );
};

const makeStyles = (theme: Theme, bp: BreakpointInfo) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.gray[50],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: theme.colors.gray[500],
  },
  header: {
    padding: 16,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  subtitle: {
    color: theme.colors.gray[500],
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: theme.colors.white,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.gray[50],
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
  },
  statLabel: {
    color: theme.colors.gray[500],
    fontSize: theme.typography.roles.caption.fontSize,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontWeight: 'bold',
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.white,
  },
  searchInput: {
    backgroundColor: theme.colors.gray[100],
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: theme.typography.roles.body.fontSize,
    color: theme.colors.gray[900],
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  filterContent: {
    gap: 8,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: theme.colors.gray[200],
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary[600],
  },
  filterButtonText: {
    color: theme.colors.gray[700],
    fontWeight: '600',
    fontSize: theme.typography.roles.body.fontSize,
  },
  filterButtonTextActive: {
    color: theme.colors.brand.text,
  },
  purgeBarWrap: {
    paddingHorizontal: bp.gutter,
    paddingBottom: theme.spacing.sm,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 12,
    gap: 8,
    maxWidth: bp.contentMaxWidth,
    alignSelf: 'center',
    width: '100%',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    marginTop: 16,
    color: theme.colors.gray[700],
    fontWeight: '600',
  },
  emptyText: {
    marginTop: 6,
    color: theme.colors.gray[500],
    textAlign: 'center',
  },
  discrepancyCard: {
    marginBottom: 8,
    overflow: 'hidden',
    borderRadius: 12,
    padding: 0,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  rowHeaderExpanded: {
    backgroundColor: `${theme.colors.primary[50]}40`,
  },
  chevronContainer: {
    marginRight: 10,
  },
  rowInfo: {
    flex: 1,
  },
  rowTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemName: {
    fontWeight: '600',
    fontSize: theme.typography.roles.body.fontSize,
    color: theme.colors.gray[900],
    flexShrink: 1,
  },
  skuBadge: {
    backgroundColor: theme.colors.gray[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  skuText: {
    fontSize: theme.typography.roles.caption.fontSize,
    color: theme.colors.gray[500],
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  orderNum: {
    fontSize: theme.typography.roles.caption.fontSize,
    color: theme.colors.gray[600],
    fontWeight: '500',
  },
  rowDate: {
    fontSize: theme.typography.roles.caption.fontSize,
    color: theme.colors.gray[400],
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 6,
    marginLeft: 10,
  },
  diffBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  diffText: {
    fontWeight: 'bold',
    fontSize: theme.typography.roles.body.fontSize,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  typeText: {
    fontSize: theme.typography.roles.caption.fontSize,
    fontWeight: '600',
  },
  expandedPanel: {
    padding: 14,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[100],
    backgroundColor: theme.colors.gray[50],
  },
  quantityGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
  },
  quantityBox: {
    flex: 1,
    alignItems: 'center',
  },
  quantityLabel: {
    fontSize: theme.typography.roles.caption.fontSize,
    color: theme.colors.gray[500],
  },
  quantityValue: {
    fontWeight: 'bold',
    marginTop: 2,
  },
  quantityArrow: {
    paddingHorizontal: 6,
  },
  arrowText: {
    color: theme.colors.gray[400],
    fontSize: theme.typography.roles.sideheading.fontSize,
  },
  detailSection: {
    marginTop: 12,
    backgroundColor: theme.colors.white,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: theme.typography.roles.caption.fontSize,
    color: theme.colors.gray[500],
  },
  detailValue: {
    fontSize: theme.typography.roles.body.fontSize,
    fontWeight: '600',
    color: theme.colors.gray[900],
    maxWidth: '60%',
    textAlign: 'right',
  },
  notesSection: {
    marginTop: 10,
    gap: 8,
  },
  noteBox: {
    backgroundColor: theme.colors.white,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
  },
  resolutionNoteBox: {
    backgroundColor: theme.colors.success[50],
    borderColor: theme.colors.success[200],
  },
  noteLabel: {
    fontSize: theme.typography.roles.caption.fontSize,
    fontWeight: '600',
    color: theme.colors.gray[600],
    marginBottom: 4,
  },
  noteText: {
    fontSize: theme.typography.roles.body.fontSize,
    color: theme.colors.gray[800],
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.error[300],
    backgroundColor: theme.colors.error[50],
  },
  deleteButtonText: {
    color: theme.colors.error[600],
    fontWeight: '600',
    fontSize: theme.typography.roles.body.fontSize,
  },
});
