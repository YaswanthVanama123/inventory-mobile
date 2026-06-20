import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput as RNTextInput,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {Button} from '../components/atoms/Button';
import {useAuth} from '../contexts/AuthContext';
import {useApiErrorHandler} from '../hooks/useApiErrorHandler';
import {useTheme} from '../contexts/ThemeContext';
import {Theme} from '../theme';
import {useBreakpoint, BreakpointInfo} from '../utils/breakpoints';
import itemsInvoiceUsageService, {
  ItemUsage,
  InvoiceUsageTotals,
} from '../services/itemsInvoiceUsageService';
import {BarChartIcon, SearchIcon, XIcon, BoxIcon, ClockIcon} from '../components/icons';
import {formatDate} from '../utils/dateUtils';

interface ItemsInvoiceUsageScreenProps {
  visible: boolean;
  onClose: () => void;
}

export const ItemsInvoiceUsageScreen: React.FC<ItemsInvoiceUsageScreenProps> = ({
  visible,
  onClose,
}) => {
  const {token} = useAuth();
  const {handleApiError} = useApiErrorHandler();
  const theme = useTheme();
  const bp = useBreakpoint();
  const styles = useMemo(() => makeStyles(theme, bp), [theme, bp]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<ItemUsage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [totals, setTotals] = useState<InvoiceUsageTotals>({
    totalMappedItems: 0,
    totalUniqueItems: 0,
    totalItems: 0,
    totalInvoices: 0,
  });

  useEffect(() => {
    if (visible && token) {
      loadData();
    }
  }, [visible, token]);

  const loadData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);

      const result = await itemsInvoiceUsageService.getItemsUsage(token);

      console.log('[ItemsInvoiceUsageScreen] Data loaded:', result.items?.length || 0);
      setItems(result.items || []);
      setTotals(result.totals);
    } catch (error: any) {
      console.error('Failed to fetch items usage:', error);
      const wasHandled = await handleApiError(error);
      if (wasHandled) return;
      setError(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      item =>
        item.itemName.toLowerCase().includes(q) ||
        item.aliases.some(alias => alias.toLowerCase().includes(q)),
    );
  }, [items, searchQuery]);

  const renderItemCard = (item: ItemUsage, index: number) => (
    <Card key={index} variant="elevated" padding="md" style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={styles.itemHeaderLeft}>
          <View style={styles.itemIconContainer}>
            <BoxIcon size={20} color={theme.colors.primary[600]} />
          </View>
          <View style={styles.itemInfo}>
            <Typography variant="body" weight="semibold">
              {item.itemName}
            </Typography>
            {item.aliases.length > 0 && (
              <Typography variant="caption" color={theme.colors.gray[500]}>
                {item.aliases.length} alias{item.aliases.length !== 1 ? 'es' : ''}
              </Typography>
            )}
          </View>
        </View>
        <View
          style={[
            styles.categoryBadge,
            item.type === 'mapped' && {backgroundColor: theme.colors.accent[100]},
          ]}>
          <Typography
            variant="caption"
            color={
              item.type === 'mapped'
                ? theme.colors.accent[700]
                : theme.colors.info[700]
            }
            weight="medium">
            {item.type === 'mapped' ? 'Mapped' : 'Unique'}
          </Typography>
        </View>
      </View>

      <View style={styles.itemStats}>
        <View style={styles.statItem}>
          <Typography variant="caption" color={theme.colors.gray[500]}>
            Total Quantity
          </Typography>
          <Typography variant="body" weight="bold" color={theme.colors.primary[600]}>
            {item.totalQuantitySold.toLocaleString()}
          </Typography>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Typography variant="caption" color={theme.colors.gray[500]}>
            Invoices
          </Typography>
          <Typography variant="body" weight="bold" color={theme.colors.success[600]}>
            {item.invoiceCount}
          </Typography>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Typography variant="caption" color={theme.colors.gray[500]}>
            Avg/Invoice
          </Typography>
          <Typography variant="body" weight="bold" color={theme.colors.accent[600]}>
            {(item.averageQuantityPerInvoice || 0).toFixed(1)}
          </Typography>
        </View>
      </View>

      {item.lastUsedDate && (
        <View style={styles.lastUsedContainer}>
          <ClockIcon size={12} color={theme.colors.gray[400]} />
          <Typography variant="caption" color={theme.colors.gray[500]}>
            Last used: {formatDate(item.lastUsedDate)}
          </Typography>
        </View>
      )}
    </Card>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconContainer, styles.headerIcon]}>
              <BarChartIcon size={22} color={theme.colors.accent[600]} />
            </View>
            <View>
              <Typography variant="h2" weight="bold">
                Items Invoice Usage
              </Typography>
              <Typography variant="caption" color={theme.colors.gray[500]}>
                Track item usage across invoices
              </Typography>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <XIcon size={24} color={theme.colors.gray[600]} />
          </TouchableOpacity>
        </View>

        {/* Stats Summary */}
        {!loading && totals.totalItems > 0 && (
          <View style={styles.statsContainer}>
            <View style={styles.statsCard}>
              <Typography variant="small" color={theme.colors.gray[600]}>
                Total Items
              </Typography>
              <Typography variant="h2" weight="bold" color={theme.colors.primary[600]}>
                {totals.totalItems}
              </Typography>
            </View>
            <View style={styles.statsSeparator} />
            <View style={styles.statsCard}>
              <Typography variant="small" color={theme.colors.gray[600]}>
                Total Invoices
              </Typography>
              <Typography variant="h2" weight="bold" color={theme.colors.success[600]}>
                {totals.totalInvoices}
              </Typography>
            </View>
          </View>
        )}

        {/* Search */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <SearchIcon size={18} color={theme.colors.gray[400]} />
            <RNTextInput
              style={styles.searchInput}
              placeholder="Search items..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={theme.colors.gray[400]}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <XIcon size={18} color={theme.colors.gray[400]} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Content */}
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary[600]} />
            <Typography
              variant="body"
              color={theme.colors.gray[500]}
              style={styles.loadingText}>
              Loading items usage...
            </Typography>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Typography variant="body" color={theme.colors.error[600]}>
              {error}
            </Typography>
            <Button
              title="Retry"
              variant="outline"
              size="sm"
              onPress={loadData}
              style={styles.retryButton}
            />
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.colors.primary[600]}
              />
            }>
            <View style={styles.contentWrap}>
            {filteredItems.length === 0 ? (
              <View style={styles.emptyContainer}>
                <BarChartIcon size={48} color={theme.colors.gray[300]} />
                <Typography
                  variant="body"
                  color={theme.colors.gray[500]}
                  style={styles.emptyText}>
                  {searchQuery
                    ? 'No items match your search'
                    : 'No invoice usage data available'}
                </Typography>
              </View>
            ) : (
              <>
                <View style={styles.resultsHeader}>
                  <Typography variant="small" color={theme.colors.gray[600]}>
                    {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} found
                  </Typography>
                </View>
                {filteredItems.map(renderItemCard)}
              </>
            )}
            </View>{/* contentWrap */}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const makeStyles = (theme: Theme, bp: BreakpointInfo) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.gray[50],
  },
  contentWrap: {
    width: '100%',
    maxWidth: bp.contentMaxWidth,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: bp.gutter,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    backgroundColor: theme.colors.accent[100],
  },
  closeButton: {
    padding: theme.spacing.sm,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.white,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: bp.gutter,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  statsCard: {
    flex: 1,
    alignItems: 'center',
  },
  statsSeparator: {
    width: 1,
    backgroundColor: theme.colors.gray[200],
    marginHorizontal: theme.spacing.lg,
  },
  searchSection: {
    paddingHorizontal: bp.gutter,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.gray[100],
    borderRadius: 10,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
    maxWidth: bp.contentMaxWidth,
    alignSelf: 'center',
    width: '100%',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.gray[900],
    padding: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: bp.gutter,
  },
  resultsHeader: {
    marginBottom: theme.spacing.md,
  },
  itemCard: {
    marginBottom: theme.spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  itemHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  itemIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.info[100],
  },
  itemStats: {
    flexDirection: 'row',
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.gray[200],
    marginHorizontal: theme.spacing.sm,
  },
  lastUsedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  retryButton: {
    marginTop: theme.spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: theme.spacing.xl * 2,
  },
  emptyText: {
    marginTop: theme.spacing.md,
  },
});
