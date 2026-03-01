import React, {useState, useEffect} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {useAuth} from '../contexts/AuthContext';
import {useApiErrorHandler} from '../hooks/useApiErrorHandler';
import {theme} from '../theme';
import invoiceService from '../services/invoiceService';
import {AlertCircleIcon, FileTextIcon} from '../components/icons';

interface InvoiceDetailScreenProps {
  visible: boolean;
  invoiceId: string | null;
  onClose: () => void;
}

export const InvoiceDetailScreen: React.FC<InvoiceDetailScreenProps> = ({
  visible,
  invoiceId,
  onClose,
}) => {
  const {token} = useAuth();
  const {handleApiError} = useApiErrorHandler();
  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && invoiceId && token) {
      fetchInvoiceDetails();
    } else if (visible && !invoiceId) {
      setError('No invoice ID provided');
    }
  }, [visible, invoiceId, token]);

  const fetchInvoiceDetails = async () => {
    if (!invoiceId || !token) {
      console.log('Cannot fetch: missing invoiceId or token');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('Fetching invoice details for:', invoiceId);

      // Check if it's an invoice number (contains letters) or MongoDB ID (only hex)
      const isInvoiceNumber = /[A-Za-z]/.test(invoiceId);
      console.log('Is invoice number:', isInvoiceNumber);

      let data;
      if (isInvoiceNumber) {
        // Use RouteStar invoice endpoint with invoice number
        data = await invoiceService.getInvoiceByNumber(token, invoiceId);
      } else {
        // Use regular invoice endpoint with MongoDB ID
        data = await invoiceService.getInvoiceById(token, invoiceId);
      }

      console.log('Invoice data received:', data);

      // Log items structure for debugging
      if (data.items && data.items.length > 0) {
        console.log('First item structure:', JSON.stringify(data.items[0], null, 2));
        console.log('First item fields:', Object.keys(data.items[0]));
      } else if (data.lineItems && data.lineItems.length > 0) {
        console.log('First lineItem structure:', JSON.stringify(data.lineItems[0], null, 2));
        console.log('First lineItem fields:', Object.keys(data.lineItems[0]));
      }

      setInvoice(data);
    } catch (error: any) {
      console.error('Failed to fetch invoice details:', error);

      // Check if token expired and handle auto-logout
      const wasHandled = await handleApiError(error);
      if (wasHandled) return;

      setError(error.message || 'Failed to load invoice details');
      setInvoice(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${(amount || 0).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const getStatusColor = (status: string) => {
    const colors: {[key: string]: string} = {
      draft: theme.colors.gray[500],
      pending: theme.colors.warning[600],
      issued: theme.colors.primary[600],
      paid: theme.colors.success[600],
      cancelled: theme.colors.error[600],
    };
    return colors[status?.toLowerCase()] || theme.colors.gray[500];
  };

  const getPaymentStatusColor = (paymentStatus: string) => {
    const colors: {[key: string]: string} = {
      pending: theme.colors.warning[600],
      paid: theme.colors.success[600],
      overdue: theme.colors.error[600],
    };
    return colors[paymentStatus?.toLowerCase()] || theme.colors.gray[500];
  };

  const getStatusBgColor = (status: string) => {
    const colors: {[key: string]: string} = {
      draft: theme.colors.gray[100],
      pending: theme.colors.warning[100],
      issued: theme.colors.primary[100],
      paid: theme.colors.success[100],
      cancelled: theme.colors.error[100],
    };
    return colors[status?.toLowerCase()] || theme.colors.gray[100];
  };

  const getPaymentStatusBgColor = (paymentStatus: string) => {
    const colors: {[key: string]: string} = {
      pending: theme.colors.warning[100],
      paid: theme.colors.success[100],
      overdue: theme.colors.error[100],
    };
    return colors[paymentStatus?.toLowerCase()] || theme.colors.gray[100];
  };

  const handleDownloadPDF = async () => {
    if (!invoice || !token) return;

    Alert.alert(
      'Download PDF',
      'PDF download functionality will be available in the next update.',
      [{text: 'OK'}]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <View style={styles.modalHeaderLeft}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Typography variant="body" color={theme.colors.primary[600]} weight="semibold">
                Close
              </Typography>
            </TouchableOpacity>
          </View>
          <Typography variant="h3" weight="bold" style={styles.modalTitle}>
            Invoice Details
          </Typography>
          <View style={styles.modalHeaderRight}>
            {invoice && (
              <TouchableOpacity onPress={handleDownloadPDF} style={styles.actionButton}>
                <Typography variant="small" color={theme.colors.primary[600]} weight="semibold">
                  PDF
                </Typography>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary[600]} />
            <Typography
              variant="body"
              color={theme.colors.gray[600]}
              style={{marginTop: 16}}>
              Loading invoice...
            </Typography>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Card variant="outlined" padding="lg" style={styles.errorCard}>
              <View style={styles.errorContent}>
                <AlertCircleIcon size={20} color={theme.colors.error[500]} />
                <Typography
                  variant="body"
                  color={theme.colors.error[700]}
                  style={styles.errorText}>
                  {error}
                </Typography>
              </View>
            </Card>
          </View>
        ) : invoice ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            {/* Invoice Header Card */}
            <Card variant="elevated" padding="lg" style={styles.invoiceHeaderCard}>
              <View style={styles.invoiceHeaderTop}>
                <FileTextIcon size={32} color={theme.colors.primary[600]} />
                <View style={styles.badgesContainer}>
                  <View
                    style={[
                      styles.badge,
                      {backgroundColor: getStatusBgColor(invoice.status)},
                    ]}>
                    <Typography
                      variant="caption"
                      weight="semibold"
                      color={getStatusColor(invoice.status)}>
                      {invoice.status || 'Draft'}
                    </Typography>
                  </View>
                  <View
                    style={[
                      styles.badge,
                      {backgroundColor: getPaymentStatusBgColor(invoice.paymentStatus)},
                    ]}>
                    <Typography
                      variant="caption"
                      weight="semibold"
                      color={getPaymentStatusColor(invoice.paymentStatus)}>
                      {invoice.paymentStatus || 'Pending'}
                    </Typography>
                  </View>
                </View>
              </View>
              <Typography variant="h2" weight="bold" style={styles.invoiceNumber}>
                #{invoice.invoiceNumber}
              </Typography>
              {invoice.invoiceType && (
                <Typography variant="small" color={theme.colors.gray[500]}>
                  {invoice.invoiceType}
                </Typography>
              )}
            </Card>

            {/* Customer Information */}
            <Card variant="elevated" padding="lg" style={styles.section}>
              <Typography variant="body" weight="semibold" style={styles.sectionTitle}>
                Customer Information
              </Typography>
              <View style={styles.infoRow}>
                <Typography variant="small" color={theme.colors.gray[500]}>
                  Customer Name
                </Typography>
                <Typography variant="body" weight="medium">
                  {invoice.customer?.name || invoice.customerName || 'Unknown'}
                </Typography>
              </View>
              {invoice.customer?.email && (
                <View style={styles.infoRow}>
                  <Typography variant="small" color={theme.colors.gray[500]}>
                    Email
                  </Typography>
                  <Typography variant="small" color={theme.colors.gray[700]}>
                    {invoice.customer.email}
                  </Typography>
                </View>
              )}
              {invoice.customer?.phone && (
                <View style={styles.infoRow}>
                  <Typography variant="small" color={theme.colors.gray[500]}>
                    Phone
                  </Typography>
                  <Typography variant="small" color={theme.colors.gray[700]}>
                    {invoice.customer.phone}
                  </Typography>
                </View>
              )}
            </Card>

            {/* Invoice Details */}
            <Card variant="elevated" padding="lg" style={styles.section}>
              <Typography variant="body" weight="semibold" style={styles.sectionTitle}>
                Invoice Details
              </Typography>
              <View style={styles.infoRow}>
                <Typography variant="small" color={theme.colors.gray[500]}>
                  Invoice Date
                </Typography>
                <Typography variant="small" weight="medium">
                  {formatDate(invoice.date || invoice.invoiceDate || invoice.createdAt)}
                </Typography>
              </View>
              {invoice.dueDate && (
                <View style={styles.infoRow}>
                  <Typography variant="small" color={theme.colors.gray[500]}>
                    Due Date
                  </Typography>
                  <Typography variant="small" weight="medium">
                    {formatDate(invoice.dueDate)}
                  </Typography>
                </View>
              )}
              {invoice.invoiceType && (
                <View style={styles.infoRow}>
                  <Typography variant="small" color={theme.colors.gray[500]}>
                    Type
                  </Typography>
                  <Typography variant="small" weight="medium">
                    {invoice.invoiceType}
                  </Typography>
                </View>
              )}
            </Card>

            {/* Additional Information */}
            {(invoice.assignedTo || invoice.serviceNotes || invoice.notes) && (
              <Card variant="elevated" padding="lg" style={styles.section}>
                <Typography variant="body" weight="semibold" style={styles.sectionTitle}>
                  Additional Information
                </Typography>
                {invoice.assignedTo && (
                  <View style={styles.infoRow}>
                    <Typography variant="small" color={theme.colors.gray[500]}>
                      Assigned To
                    </Typography>
                    <Typography variant="small" weight="medium">
                      {invoice.assignedTo}
                    </Typography>
                  </View>
                )}
                {invoice.serviceNotes && (
                  <View style={styles.infoRow}>
                    <Typography variant="small" color={theme.colors.gray[500]}>
                      Service Notes
                    </Typography>
                    <Typography variant="small" color={theme.colors.gray[700]}>
                      {invoice.serviceNotes}
                    </Typography>
                  </View>
                )}
                {invoice.notes && (
                  <View style={styles.infoRow}>
                    <Typography variant="small" color={theme.colors.gray[500]}>
                      Notes
                    </Typography>
                    <Typography variant="small" color={theme.colors.gray[700]}>
                      {invoice.notes}
                    </Typography>
                  </View>
                )}
              </Card>
            )}

            {/* Line Items */}
            {((invoice.items && invoice.items.length > 0) || (invoice.lineItems && invoice.lineItems.length > 0)) && (
              <Card variant="elevated" padding="lg" style={styles.section}>
                <Typography variant="body" weight="semibold" style={styles.sectionTitle}>
                  Line Items ({(invoice.items || invoice.lineItems).length})
                </Typography>
                {(invoice.items || invoice.lineItems).map((item: any, index: number) => {
                  console.log(`Item ${index}:`, JSON.stringify(item, null, 2));

                  // Try multiple field name variations
                  const itemName = item.item || item.itemName || item.name || item.description ||
                                   item.product || item.service || item.sku || item.itemCode ||
                                   'Item';

                  return (
                    <View key={index} style={styles.lineItem}>
                      <View style={styles.lineItemHeader}>
                        <Typography variant="body" weight="semibold" style={{flex: 1}}>
                          {itemName}
                        </Typography>
                        <Typography variant="body" weight="bold" color={theme.colors.success[600]}>
                          {formatCurrency(item.amount || item.total || item.subtotal || item.lineTotal || 0)}
                        </Typography>
                      </View>
                      <View style={styles.lineItemDetails}>
                        {(item.description && item.description !== itemName) && (
                          <Typography variant="small" color={theme.colors.gray[600]}>
                            {item.description}
                          </Typography>
                        )}
                        <View style={styles.lineItemMeta}>
                          <Typography variant="caption" color={theme.colors.gray[500]}>
                            Qty: {item.qty || item.quantity || item.count || 0}
                          </Typography>
                          <Typography variant="caption" color={theme.colors.gray[500]}>
                            •
                          </Typography>
                          <Typography variant="caption" color={theme.colors.gray[500]}>
                            Rate: {formatCurrency(item.rate || item.price || item.unitPrice || item.priceEach || 0)}
                          </Typography>
                          {(item.class || item.category) && (
                            <>
                              <Typography variant="caption" color={theme.colors.gray[500]}>
                                •
                              </Typography>
                              <Typography variant="caption" color={theme.colors.gray[500]}>
                                {item.class || item.category}
                              </Typography>
                            </>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </Card>
            )}

            {/* Invoice Total */}
            <Card variant="elevated" padding="lg" style={styles.section}>
              <Typography variant="body" weight="semibold" style={styles.sectionTitle}>
                Invoice Total
              </Typography>
              <View style={styles.totalRow}>
                <Typography variant="small" color={theme.colors.gray[600]}>
                  Subtotal
                </Typography>
                <Typography variant="small" weight="medium">
                  {formatCurrency(invoice.subtotal || invoice.subtotalAmount || 0)}
                </Typography>
              </View>
              {(invoice.tax || invoice.taxAmount) > 0 && (
                <View style={styles.totalRow}>
                  <Typography variant="small" color={theme.colors.gray[600]}>
                    Tax
                  </Typography>
                  <Typography variant="small" weight="medium">
                    {formatCurrency(invoice.tax || invoice.taxAmount || 0)}
                  </Typography>
                </View>
              )}
              {(invoice.discount || invoice.discountAmount) > 0 && (
                <View style={styles.totalRow}>
                  <Typography variant="small" color={theme.colors.gray[600]}>
                    Discount
                  </Typography>
                  <Typography variant="small" weight="medium" color={theme.colors.success[600]}>
                    -{formatCurrency(invoice.discount || invoice.discountAmount || 0)}
                  </Typography>
                </View>
              )}
              <View style={styles.totalDivider} />
              <View style={styles.totalRow}>
                <Typography variant="h3" weight="bold">
                  Total
                </Typography>
                <Typography variant="h3" weight="bold" color={theme.colors.primary[600]}>
                  {formatCurrency(invoice.total || invoice.totalAmount || 0)}
                </Typography>
              </View>
            </Card>

            {/* Sync Information */}
            {(invoice.syncedAt || invoice.lastUpdated || invoice.stockStatus) && (
              <Card variant="elevated" padding="lg" style={styles.section}>
                <Typography variant="body" weight="semibold" style={styles.sectionTitle}>
                  Sync Information
                </Typography>
                {invoice.syncedAt && (
                  <View style={styles.infoRow}>
                    <Typography variant="small" color={theme.colors.gray[500]}>
                      Synced At
                    </Typography>
                    <Typography variant="small" weight="medium">
                      {formatDate(invoice.syncedAt)}
                    </Typography>
                  </View>
                )}
                {invoice.lastUpdated && (
                  <View style={styles.infoRow}>
                    <Typography variant="small" color={theme.colors.gray[500]}>
                      Last Updated
                    </Typography>
                    <Typography variant="small" weight="medium">
                      {formatDate(invoice.lastUpdated)}
                    </Typography>
                  </View>
                )}
                {invoice.stockStatus && (
                  <View style={styles.infoRow}>
                    <Typography variant="small" color={theme.colors.gray[500]}>
                      Stock Status
                    </Typography>
                    <View
                      style={[
                        styles.stockStatusBadge,
                        {
                          backgroundColor:
                            invoice.stockStatus === 'Processed'
                              ? theme.colors.success[100]
                              : theme.colors.warning[100],
                        },
                      ]}>
                      <Typography
                        variant="caption"
                        weight="semibold"
                        color={
                          invoice.stockStatus === 'Processed'
                            ? theme.colors.success[700]
                            : theme.colors.warning[700]
                        }>
                        {invoice.stockStatus}
                      </Typography>
                    </View>
                  </View>
                )}
              </Card>
            )}
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.gray[50],
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[100],
    backgroundColor: theme.colors.white,
    ...theme.shadows.xs,
  },
  modalHeaderLeft: {
    width: 60,
  },
  modalHeaderRight: {
    width: 60,
    alignItems: 'flex-end',
  },
  modalTitle: {
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    paddingVertical: 4,
  },
  actionButton: {
    paddingVertical: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  errorCard: {
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl,
  },
  invoiceHeaderCard: {
    marginBottom: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    ...theme.shadows.md,
  },
  invoiceHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  badgesContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
  },
  invoiceNumber: {
    fontFamily: 'monospace',
    marginBottom: theme.spacing.xs,
  },
  section: {
    marginBottom: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    ...theme.shadows.sm,
  },
  sectionTitle: {
    marginBottom: theme.spacing.lg,
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSizes.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  lineItem: {
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[100],
  },
  lineItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  lineItemDetails: {
    gap: 6,
  },
  lineItemMeta: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  totalDivider: {
    height: 1.5,
    backgroundColor: theme.colors.gray[200],
    marginVertical: theme.spacing.lg,
  },
  stockStatusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
  },
});
