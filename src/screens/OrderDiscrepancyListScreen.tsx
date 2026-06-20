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
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {useAuth} from '../contexts/AuthContext';
import {useApiErrorHandler} from '../hooks/useApiErrorHandler';
import {useTheme} from '../contexts/ThemeContext';
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
  const [refreshing, setRefreshing] = useState(false);
  const [discrepancies, setDiscrepancies] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token, typeFilter]);

  const loadData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const params: any = {limit: 100};
      if (typeFilter) params.discrepancyType = typeFilter;
      const [discrepanciesResponse, statsResponse] = await Promise.all([
        orderDiscrepancyService.getOrderDiscrepancies(token, params),
        orderDiscrepancyService.getOrderDiscrepancyStats(token),
      ]);
      setDiscrepancies(discrepanciesResponse.discrepancies);
      setStats(statsResponse);
    } catch (error: any) {
      console.error('Failed to fetch discrepancies:', error);
      const wasHandled = await handleApiError(error);
      if (!wasHandled) {
        Alert.alert('Error', 'Failed to load order discrepancies');
      }
    } finally {
      setLoading(false);
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
        return {bg: '#fff7ed', text: '#c2410c'};
      case 'Overage':
        return {bg: '#eff6ff', text: '#1d4ed8'};
      case 'Matched':
        return {bg: '#ecfdf5', text: '#047857'};
      default:
        return {bg: '#f8fafc', text: '#475569'};
    }
  };

  const getDiffColor = (qty: number) => {
    if (qty > 0) return '#1d4ed8';
    if (qty < 0) return '#c2410c';
    return '#047857';
  };

  const filteredDiscrepancies = discrepancies.filter(d => {
    if (searchText) {
      const search = searchText.toLowerCase();
      return (
        d.itemName?.toLowerCase().includes(search) ||
        d.orderNumber?.toLowerCase().includes(search) ||
        (d.sku && d.sku.toLowerCase().includes(search))
      );
    }
    return true;
  });

  const formatDate = (date: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Typography style={styles.loadingText}>
            Loading discrepancies...
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Typography variant="h2" style={styles.headerTitle}>
          Order Discrepancies
        </Typography>
        <Typography variant="body2" style={styles.subtitle}>
          Track order verification differences
        </Typography>
      </View>

      {/* Compact Stats */}
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
            <Typography variant="h3" style={[styles.statValue, {color: '#c2410c'}]}>
              {stats.shortages || 0}
            </Typography>
          </View>
          <View style={styles.statCard}>
            <Typography variant="body2" style={styles.statLabel}>
              Overages
            </Typography>
            <Typography variant="h3" style={[styles.statValue, {color: '#1d4ed8'}]}>
              {stats.overages || 0}
            </Typography>
          </View>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by order number or item..."
          placeholderTextColor="#94a3b8"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* Type Filter */}
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

      {/* Discrepancy List */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {filteredDiscrepancies.length === 0 ? (
          <Card style={styles.emptyCard}>
            <AlertCircleIcon size={48} color="#94a3b8" />
            <Typography variant="h4" style={styles.emptyTitle}>
              No Order Discrepancies
            </Typography>
            <Typography variant="body2" style={styles.emptyText}>
              Discrepancies will appear here when orders are verified
            </Typography>
          </Card>
        ) : (
          filteredDiscrepancies.map(discrepancy => {
            const isExpanded = expandedRow === discrepancy._id;
            const typeColors = getTypeColor(discrepancy.discrepancyType);

            return (
              <Card
                key={discrepancy._id}
                style={styles.discrepancyCard}>
                {/* Clickable Row Header */}
                <TouchableOpacity
                  style={[
                    styles.rowHeader,
                    isExpanded && styles.rowHeaderExpanded,
                  ]}
                  onPress={() =>
                    setExpandedRow(isExpanded ? null : discrepancy._id)
                  }
                  activeOpacity={0.7}>
                  {/* Chevron */}
                  <View style={styles.chevronContainer}>
                    {isExpanded ? (
                      <ChevronDownIcon size={18} color="#2563eb" />
                    ) : (
                      <ChevronRightIcon size={18} color="#94a3b8" />
                    )}
                  </View>

                  {/* Item Info */}
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

                  {/* Right side: diff + type badge */}
                  <View style={styles.rowRight}>
                    <View
                      style={[
                        styles.diffBadge,
                        {
                          backgroundColor:
                            discrepancy.discrepancyQuantity > 0
                              ? '#dbeafe'
                              : discrepancy.discrepancyQuantity < 0
                              ? '#ffedd5'
                              : '#d1fae5',
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

                {/* Expanded Detail Panel */}
                {isExpanded && (
                  <View style={styles.expandedPanel}>
                    {/* Quantity Grid */}
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

                    {/* Details Section */}
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

                    {/* Notes Section */}
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

                    {/* Delete Button */}
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
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const makeStyles = (theme: Theme, bp: BreakpointInfo) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#64748b',
  },
  header: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#64748b',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statLabel: {
    color: '#64748b',
    fontSize: 11,
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
    backgroundColor: '#ffffff',
  },
  searchInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterContent: {
    gap: 8,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: '#e2e8f0',
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  filterButtonText: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 13,
  },
  filterButtonTextActive: {
    color: '#ffffff',
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
    color: '#334155',
    fontWeight: '600',
  },
  emptyText: {
    marginTop: 6,
    color: '#64748b',
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
    backgroundColor: '#eff6ff40',
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
    fontSize: 14,
    color: '#0f172a',
    flexShrink: 1,
  },
  skuBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  skuText: {
    fontSize: 11,
    color: '#64748b',
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  orderNum: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  rowDate: {
    fontSize: 12,
    color: '#94a3b8',
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
    fontSize: 13,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  expandedPanel: {
    padding: 14,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#fafbfc',
  },
  quantityGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quantityBox: {
    flex: 1,
    alignItems: 'center',
  },
  quantityLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  quantityValue: {
    fontWeight: 'bold',
    marginTop: 2,
  },
  quantityArrow: {
    paddingHorizontal: 6,
  },
  arrowText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  detailSection: {
    marginTop: 12,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    maxWidth: '60%',
    textAlign: 'right',
  },
  notesSection: {
    marginTop: 10,
    gap: 8,
  },
  noteBox: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  resolutionNoteBox: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  noteLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  noteText: {
    fontSize: 13,
    color: '#1e293b',
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
  },
  deleteButtonText: {
    color: '#dc2626',
    fontWeight: '600',
    fontSize: 13,
  },
});
