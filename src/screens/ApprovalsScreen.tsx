import React, {useState, useEffect, useMemo, useCallback} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput as RNTextInput,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {Button} from '../components/atoms/Button';
import {Pagination} from '../components/molecules/Pagination';
import {useAuth} from '../contexts/AuthContext';
import {useApiErrorHandler} from '../hooks/useApiErrorHandler';
import {useTheme} from '../contexts/ThemeContext';
import {Theme} from '../theme';
import {useBreakpoint, BreakpointInfo} from '../utils/breakpoints';
import {API_BASE_URL} from '../config/api';
import {
  CheckCircleIcon,
  XCircleIcon,
  DollarIcon,
  TrashIcon,
  ClockIcon,
} from '../components/icons';

interface ApprovalsScreenProps {
  visible: boolean;
  onClose: () => void;
}

type ApprovalsTab = 'invoices' | 'purchase-deletions';

const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
});

export const ApprovalsScreen: React.FC<ApprovalsScreenProps> = ({
  visible,
  onClose,
}) => {
  const theme = useTheme();
  const bp = useBreakpoint();
  const styles = useMemo(() => makeStyles(theme, bp), [theme, bp]);
  const {token} = useAuth();
  const {handleApiError} = useApiErrorHandler();

  const [activeTab, setActiveTab] = useState<ApprovalsTab>('invoices');
  const [pendingInvoices, setPendingInvoices] = useState<any[]>([]);
  const [pendingDeletions, setPendingDeletions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Numbered pagination over the active tab's list.
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Reject-reason prompt state.
  const [promptVisible, setPromptVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectTarget, setRejectTarget] = useState<
    {type: 'invoice' | 'purchase'; id: string} | null
  >(null);

  const fetchPendingInvoices = useCallback(async () => {
    if (!token) return;
    const response = await fetch(`${API_BASE_URL}/invoices?status=pending`, {
      headers: authHeaders(token),
    });
    if (!response.ok) {
      throw new Error('Failed to load pending invoices');
    }
    const json = await response.json();
    const data = json.data || json;
    setPendingInvoices(data.invoices || []);
  }, [token]);

  const fetchPendingDeletions = useCallback(async () => {
    if (!token) return;
    const response = await fetch(
      `${API_BASE_URL}/approvals/purchases/pending`,
      {headers: authHeaders(token)},
    );
    if (!response.ok) {
      throw new Error('Failed to load pending purchase deletions');
    }
    const json = await response.json();
    const data = json.data || json;
    setPendingDeletions(data.purchases || []);
  }, [token]);

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      await Promise.all([fetchPendingInvoices(), fetchPendingDeletions()]);
    } catch (e: any) {
      console.error('Load approvals error:', e);
      await handleApiError(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, fetchPendingInvoices, fetchPendingDeletions, handleApiError]);

  useEffect(() => {
    if (visible && token) {
      loadData();
    }
  }, [visible, token, loadData]);

  // Switching tab or page size starts over at page 1.
  useEffect(() => {
    setPage(1);
  }, [activeTab, pageSize]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Invoice actions --------------------------------------------------------
  const handleApproveInvoice = async (invoiceId: string) => {
    if (!token) return;
    try {
      setProcessing(true);
      const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: authHeaders(token),
        body: JSON.stringify({status: 'approved', paymentStatus: 'paid'}),
      });
      if (!response.ok) {
        throw new Error('Failed to approve invoice');
      }
      Alert.alert('Success', 'Invoice approved successfully');
      await fetchPendingInvoices();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to approve invoice');
    } finally {
      setProcessing(false);
    }
  };

  const submitRejectInvoice = async (invoiceId: string, reason: string) => {
    if (!token) return;
    try {
      setProcessing(true);
      const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: authHeaders(token),
        body: JSON.stringify({status: 'rejected', rejectionReason: reason}),
      });
      if (!response.ok) {
        throw new Error('Failed to reject invoice');
      }
      Alert.alert('Success', 'Invoice rejected');
      await fetchPendingInvoices();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to reject invoice');
    } finally {
      setProcessing(false);
    }
  };

  // Purchase deletion actions ---------------------------------------------
  const handleApproveDeletion = async (purchaseId: string) => {
    if (!token) return;
    try {
      setProcessing(true);
      const response = await fetch(
        `${API_BASE_URL}/approvals/purchases/${purchaseId}/approve`,
        {method: 'POST', headers: authHeaders(token)},
      );
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to approve purchase deletion');
      }
      Alert.alert('Success', 'Purchase deletion approved successfully');
      await fetchPendingDeletions();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to approve purchase deletion');
    } finally {
      setProcessing(false);
    }
  };

  const submitRejectDeletion = async (purchaseId: string, reason: string) => {
    if (!token) return;
    try {
      setProcessing(true);
      const response = await fetch(
        `${API_BASE_URL}/approvals/purchases/${purchaseId}/reject`,
        {
          method: 'POST',
          headers: authHeaders(token),
          body: JSON.stringify({reason}),
        },
      );
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to reject purchase deletion');
      }
      Alert.alert('Success', 'Purchase deletion rejected');
      await fetchPendingDeletions();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to reject purchase deletion');
    } finally {
      setProcessing(false);
    }
  };

  const openRejectPrompt = (type: 'invoice' | 'purchase', id: string) => {
    setRejectTarget({type, id});
    setRejectReason('');
    setPromptVisible(true);
  };

  const handlePromptSubmit = () => {
    const reason = rejectReason.trim();
    setPromptVisible(false);
    if (!rejectTarget || !reason) {
      setRejectTarget(null);
      return;
    }
    const {type, id} = rejectTarget;
    setRejectTarget(null);
    if (type === 'invoice') {
      submitRejectInvoice(id, reason);
    } else {
      submitRejectDeletion(id, reason);
    }
  };

  const pendingCount =
    activeTab === 'invoices' ? pendingInvoices.length : pendingDeletions.length;

  // Client-side numbered pagination over the active tab's pending list.
  const activeList = activeTab === 'invoices' ? pendingInvoices : pendingDeletions;
  const totalPages = Math.max(1, Math.ceil(activeList.length / pageSize));
  const pagedList = useMemo(() => {
    const start = (page - 1) * pageSize;
    return activeList.slice(start, start + pageSize);
  }, [activeList, page, pageSize]);

  // Approving/rejecting can shrink the list past the current page — clamp back.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);


  const renderInvoiceCard = (invoice: any) => (
    <Card key={invoice._id} variant="elevated" padding="lg" style={styles.itemCard}>
      <View style={styles.cardTopRow}>
        <View style={{flex: 1}}>
          <Typography variant="body" weight="bold" numberOfLines={1}>
            Invoice #{invoice.invoiceNumber}
          </Typography>
          <Typography variant="caption" color={theme.colors.gray[500]} style={{marginTop: 2}}>
            {invoice.issueDate
              ? new Date(invoice.issueDate).toLocaleDateString()
              : 'N/A'}
            {' • '}
            {invoice.customer?.name || 'N/A'}
          </Typography>
        </View>
        <View style={styles.amountBox}>
          <Typography variant="body" weight="bold" color={theme.colors.primary[600]}>
            ${Number(invoice.totalAmount || 0).toFixed(2)}
          </Typography>
          <Typography variant="caption" color={theme.colors.gray[500]}>
            {invoice.items?.length || 0} items
          </Typography>
        </View>
      </View>

      <View style={styles.metaBox}>
        <View style={styles.metaRow}>
          <Typography variant="caption" color={theme.colors.gray[500]}>Email</Typography>
          <Typography variant="small" weight="medium" numberOfLines={1} style={styles.metaValue}>
            {invoice.customer?.email || 'N/A'}
          </Typography>
        </View>
        <View style={styles.metaRow}>
          <Typography variant="caption" color={theme.colors.gray[500]}>Phone</Typography>
          <Typography variant="small" weight="medium">
            {invoice.customer?.phone || 'N/A'}
          </Typography>
        </View>
        <View style={styles.metaRow}>
          <Typography variant="caption" color={theme.colors.gray[500]}>Payment</Typography>
          <Typography variant="small" weight="medium">
            {invoice.paymentMethod?.replace('_', ' ') || 'N/A'}
          </Typography>
        </View>
      </View>

      <View style={styles.actionRow}>
        <View style={{flex: 1}}>
          <Button
            title="Approve"
            variant="primary"
            onPress={() => handleApproveInvoice(invoice._id)}
            disabled={processing}
            leftIcon={<CheckCircleIcon size={16} color={theme.colors.white} />}
            fullWidth
          />
        </View>
        <View style={{flex: 1}}>
          <Button
            title="Reject"
            variant="danger"
            onPress={() => openRejectPrompt('invoice', invoice._id)}
            disabled={processing}
            leftIcon={<XCircleIcon size={16} color={theme.colors.white} />}
            fullWidth
          />
        </View>
      </View>
    </Card>
  );

  const renderDeletionCard = (purchase: any) => (
    <Card key={purchase._id} variant="elevated" padding="lg" style={styles.itemCard}>
      <View style={styles.cardTopRow}>
        <View style={{flex: 1}}>
          <Typography variant="body" weight="bold" numberOfLines={1}>
            {purchase.inventoryItem?.name || 'Unknown Item'}
          </Typography>
          <Typography variant="caption" color={theme.colors.gray[500]} style={{marginTop: 2}}>
            {purchase.purchaseDate
              ? `Purchased ${new Date(purchase.purchaseDate).toLocaleDateString()}`
              : 'N/A'}
            {' • '}
            by {purchase.deletionRequestedBy?.username || 'N/A'}
          </Typography>
        </View>
        <View style={styles.amountBox}>
          <Typography variant="body" weight="bold" color={theme.colors.warning[600]}>
            ${Number(purchase.totalCost || 0).toFixed(2)}
          </Typography>
          <Typography variant="caption" color={theme.colors.gray[500]}>
            Qty: {purchase.quantity}
          </Typography>
        </View>
      </View>

      <View style={styles.metaBox}>
        <View style={styles.metaRow}>
          <Typography variant="caption" color={theme.colors.gray[500]}>Supplier</Typography>
          <Typography variant="small" weight="medium" numberOfLines={1} style={styles.metaValue}>
            {purchase.supplier?.name || 'N/A'}
          </Typography>
        </View>
        <View style={styles.metaRow}>
          <Typography variant="caption" color={theme.colors.gray[500]}>Unit Cost</Typography>
          <Typography variant="small" weight="medium">
            ${Number(purchase.unitCost || 0).toFixed(2)}
          </Typography>
        </View>
        {purchase.deletionRequestedAt && (
          <View style={styles.metaRow}>
            <Typography variant="caption" color={theme.colors.gray[500]}>Requested</Typography>
            <Typography variant="small" weight="medium" numberOfLines={1} style={styles.metaValue}>
              {new Date(purchase.deletionRequestedAt).toLocaleString()}
            </Typography>
          </View>
        )}
      </View>

      <View style={styles.actionRow}>
        <View style={{flex: 1}}>
          <Button
            title="Approve"
            variant="primary"
            onPress={() => handleApproveDeletion(purchase._id)}
            disabled={processing}
            leftIcon={<CheckCircleIcon size={16} color={theme.colors.white} />}
            fullWidth
          />
        </View>
        <View style={{flex: 1}}>
          <Button
            title="Reject"
            variant="danger"
            onPress={() => openRejectPrompt('purchase', purchase._id)}
            disabled={processing}
            leftIcon={<XCircleIcon size={16} color={theme.colors.white} />}
            fullWidth
          />
        </View>
      </View>
    </Card>
  );

  const renderEmpty = (label: string) => (
    <Card variant="outlined" padding="lg" style={styles.emptyCard}>
      <CheckCircleIcon size={48} color={theme.colors.gray[400]} />
      <Typography variant="h3" weight="semibold" color={theme.colors.gray[700]} style={{marginTop: 12}}>
        All caught up!
      </Typography>
      <Typography variant="body" color={theme.colors.gray[500]} align="center" style={{marginTop: 6}}>
        There are no {label} requiring approval at this time.
      </Typography>
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
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Typography variant="body" color={theme.colors.primary[600]} weight="semibold">
              Close
            </Typography>
          </TouchableOpacity>
          <Typography variant="h3" weight="bold" style={styles.modalTitle}>
            Approvals
          </Typography>
          <TouchableOpacity onPress={loadData} style={styles.refreshButton}>
            <Typography variant="small" color={theme.colors.primary[600]} weight="semibold">
              Refresh
            </Typography>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'invoices' && styles.tabActive]}
            onPress={() => setActiveTab('invoices')}>
            <DollarIcon
              size={16}
              color={
                activeTab === 'invoices'
                  ? theme.colors.primary[600]
                  : theme.colors.gray[500]
              }
            />
            <Typography
              variant="small"
              weight="semibold"
              color={
                activeTab === 'invoices'
                  ? theme.colors.primary[600]
                  : theme.colors.gray[600]
              }
              style={{marginLeft: 6}}>
              Invoices ({pendingInvoices.length})
            </Typography>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'purchase-deletions' && styles.tabActive]}
            onPress={() => setActiveTab('purchase-deletions')}>
            <TrashIcon
              size={16}
              color={
                activeTab === 'purchase-deletions'
                  ? theme.colors.primary[600]
                  : theme.colors.gray[500]
              }
            />
            <Typography
              variant="small"
              weight="semibold"
              color={
                activeTab === 'purchase-deletions'
                  ? theme.colors.primary[600]
                  : theme.colors.gray[600]
              }
              style={{marginLeft: 6}}>
              Deletions ({pendingDeletions.length})
            </Typography>
          </TouchableOpacity>
        </View>

        {loading && !refreshing && pendingInvoices.length === 0 && pendingDeletions.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.colors.primary[600]} />
            <Typography variant="body" color={theme.colors.gray[600]} style={{marginTop: 16}}>
              Loading approvals...
            </Typography>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }>
            <View style={styles.contentWrap}>
              <View style={styles.countBadge}>
                <ClockIcon size={14} color={theme.colors.primary[600]} />
                <Typography variant="caption" weight="semibold" color={theme.colors.primary[600]} style={{marginLeft: 6}}>
                  {pendingCount} Pending
                </Typography>
              </View>

              {activeTab === 'invoices'
                ? pendingInvoices.length === 0
                  ? renderEmpty('pending invoices')
                  : pagedList.map(renderInvoiceCard)
                : pendingDeletions.length === 0
                ? renderEmpty('pending purchase deletions')
                : pagedList.map(renderDeletionCard)}

              {activeList.length > 0 && (
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={activeList.length}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              )}
            </View>
          </ScrollView>
        )}

        {/* Reject reason prompt */}
        <Modal
          visible={promptVisible}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setPromptVisible(false);
            setRejectTarget(null);
          }}>
          <View style={styles.promptOverlay}>
            <View style={styles.promptCard}>
              <Typography variant="h3" weight="bold">
                Rejection Reason
              </Typography>
              <Typography variant="small" color={theme.colors.gray[600]} style={{marginTop: 4, marginBottom: 12}}>
                Please enter a reason for rejection.
              </Typography>
              <RNTextInput
                style={styles.promptInput}
                value={rejectReason}
                onChangeText={setRejectReason}
                placeholder="Reason"
                placeholderTextColor={theme.colors.gray[400]}
                multiline
                autoFocus
              />
              <View style={styles.promptActions}>
                <View style={{flex: 1}}>
                  <Button
                    title="Cancel"
                    variant="outline"
                    onPress={() => {
                      setPromptVisible(false);
                      setRejectTarget(null);
                    }}
                    fullWidth
                  />
                </View>
                <View style={{flex: 1}}>
                  <Button
                    title="Reject"
                    variant="danger"
                    onPress={handlePromptSubmit}
                    disabled={!rejectReason.trim()}
                    fullWidth
                  />
                </View>
              </View>
            </View>
          </View>
        </Modal>
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
    tabBar: {
      flexDirection: 'row',
      backgroundColor: theme.colors.white,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.gray[200],
      paddingHorizontal: theme.spacing.lg,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabActive: {
      borderBottomColor: theme.colors.primary[600],
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: theme.spacing.lg,
    },
    contentWrap: {
      width: '100%',
      maxWidth: bp.contentMaxWidth,
      alignSelf: 'center',
      paddingHorizontal: bp.gutter,
      paddingTop: theme.spacing.lg,
    },
    countBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: theme.colors.primary[50],
      borderRadius: theme.borderRadius.full,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginBottom: theme.spacing.md,
    },
    itemCard: {
      marginBottom: theme.spacing.md,
    },
    cardTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    amountBox: {
      alignItems: 'flex-end',
    },
    metaBox: {
      marginTop: theme.spacing.md,
      paddingTop: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.gray[200],
      gap: theme.spacing.sm,
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    metaValue: {
      flex: 1,
      textAlign: 'right',
    },
    actionRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
    emptyCard: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl * 2,
    },
    promptOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.lg,
    },
    promptCard: {
      backgroundColor: theme.colors.white,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.lg,
      width: '100%',
      maxWidth: 480,
      alignSelf: 'center',
    },
    promptInput: {
      backgroundColor: theme.colors.gray[100],
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      minHeight: 80,
      textAlignVertical: 'top',
      fontSize: theme.typography.roles.body.fontSize,
      color: theme.colors.gray[900],
      borderWidth: 1,
      borderColor: theme.colors.gray[300],
    },
    promptActions: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
  });
