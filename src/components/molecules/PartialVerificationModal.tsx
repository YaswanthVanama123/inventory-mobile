import React, {useState, useEffect} from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput as RNTextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {Typography} from '../atoms/Typography';
import {Card} from '../atoms/Card';
import {theme} from '../../theme';
import {XIcon, CheckCircleIcon} from '../icons';

interface VerificationHistoryEntry {
  receivedQty: number;
  verifiedAt: string;
  notes?: string;
}

interface PartialVerificationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (receivedQty: number, notes: string) => void;
  order: any;
  loading?: boolean;
}

export const PartialVerificationModal: React.FC<PartialVerificationModalProps> = ({
  visible,
  onClose,
  onConfirm,
  order,
  loading = false,
}) => {
  const [receivedQty, setReceivedQty] = useState('');
  const [notes, setNotes] = useState('');

  const expectedQty = order?.qty || 0;
  const previouslyReceived = order?.receivedQuantity || 0;
  const remainingQty = Math.max(0, expectedQty - previouslyReceived);
  const verificationHistory = order?.verificationHistory || [];

  useEffect(() => {
    if (visible) {
      // Default to remaining quantity
      setReceivedQty(remainingQty.toString());
      setNotes('');
    }
  }, [visible, remainingQty]);

  const handleConfirm = () => {
    const qty = parseFloat(receivedQty);
    if (isNaN(qty) || qty <= 0) {
      return;
    }
    onConfirm(qty, notes.trim());
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const isValid = receivedQty && parseFloat(receivedQty) > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Card variant="elevated" padding="none" style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <Typography variant="h3" weight="bold">
                  Verify Item Arrival
                </Typography>
                <Typography
                  variant="caption"
                  color={theme.colors.gray[500]}
                  style={styles.subtitle}>
                  Record partial or full receipt
                </Typography>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <XIcon size={24} color={theme.colors.gray[600]} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView}>
              {/* Order Details */}
              <View style={styles.section}>
                <Typography
                  variant="small"
                  weight="semibold"
                  color={theme.colors.gray[700]}
                  style={styles.sectionTitle}>
                  Order Information
                </Typography>
                <View style={styles.infoGrid}>
                  <View style={styles.infoRow}>
                    <Typography variant="caption" color={theme.colors.gray[500]}>
                      Order #
                    </Typography>
                    <Typography variant="small" weight="medium">
                      {order?.orderNumber}
                    </Typography>
                  </View>
                  <View style={styles.infoRow}>
                    <Typography variant="caption" color={theme.colors.gray[500]}>
                      SKU
                    </Typography>
                    <Typography variant="small" weight="medium">
                      {order?.sku}
                    </Typography>
                  </View>
                  <View style={styles.infoRow}>
                    <Typography variant="caption" color={theme.colors.gray[500]}>
                      Item
                    </Typography>
                    <Typography variant="small" weight="medium" numberOfLines={2}>
                      {order?.name}
                    </Typography>
                  </View>
                  <View style={styles.infoRow}>
                    <Typography variant="caption" color={theme.colors.gray[500]}>
                      Vendor
                    </Typography>
                    <Typography variant="small" weight="medium">
                      {order?.vendor || 'N/A'}
                    </Typography>
                  </View>
                </View>
              </View>

              {/* Quantity Information */}
              <View style={styles.section}>
                <Typography
                  variant="small"
                  weight="semibold"
                  color={theme.colors.gray[700]}
                  style={styles.sectionTitle}>
                  Quantity Details
                </Typography>
                <View style={styles.quantityGrid}>
                  <View style={styles.quantityCard}>
                    <Typography variant="caption" color={theme.colors.gray[500]}>
                      Ordered
                    </Typography>
                    <Typography variant="h2" weight="bold" color={theme.colors.gray[900]}>
                      {expectedQty}
                    </Typography>
                  </View>
                  <View style={styles.quantityCard}>
                    <Typography variant="caption" color={theme.colors.gray[500]}>
                      Already Received
                    </Typography>
                    <Typography variant="h2" weight="bold" color={theme.colors.success[600]}>
                      {previouslyReceived}
                    </Typography>
                  </View>
                  <View style={styles.quantityCard}>
                    <Typography variant="caption" color={theme.colors.gray[500]}>
                      Still Needed
                    </Typography>
                    <Typography variant="h2" weight="bold" color={theme.colors.warning[600]}>
                      {remainingQty}
                    </Typography>
                  </View>
                </View>
              </View>

              {/* Input Section */}
              <View style={styles.section}>
                <Typography
                  variant="small"
                  weight="semibold"
                  color={theme.colors.gray[700]}
                  style={styles.sectionTitle}>
                  How many did you receive now?
                </Typography>
                <RNTextInput
                  style={styles.input}
                  value={receivedQty}
                  onChangeText={setReceivedQty}
                  keyboardType="numeric"
                  placeholder="Enter quantity received"
                  placeholderTextColor={theme.colors.gray[400]}
                />
              </View>

              {/* Notes Section */}
              <View style={styles.section}>
                <Typography
                  variant="small"
                  weight="semibold"
                  color={theme.colors.gray[700]}
                  style={styles.sectionTitle}>
                  Notes (Optional)
                </Typography>
                <RNTextInput
                  style={[styles.input, styles.textArea]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add any notes about this receipt..."
                  placeholderTextColor={theme.colors.gray[400]}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {/* Verification History */}
              {verificationHistory.length > 0 && (
                <View style={styles.section}>
                  <Typography
                    variant="small"
                    weight="semibold"
                    color={theme.colors.gray[700]}
                    style={styles.sectionTitle}>
                    Previous Receipts ({verificationHistory.length})
                  </Typography>
                  <View style={styles.historyContainer}>
                    {verificationHistory.map((entry: VerificationHistoryEntry, index: number) => (
                      <View key={index} style={styles.historyItem}>
                        <View style={styles.historyHeader}>
                          <View style={styles.historyBadge}>
                            <CheckCircleIcon size={16} color={theme.colors.success[600]} />
                            <Typography
                              variant="caption"
                              weight="semibold"
                              color={theme.colors.success[700]}
                              style={{marginLeft: 4}}>
                              Receipt #{index + 1}
                            </Typography>
                          </View>
                          <Typography variant="caption" color={theme.colors.gray[500]}>
                            {formatDate(entry.verifiedAt)}
                          </Typography>
                        </View>
                        <View style={styles.historyDetails}>
                          <View style={styles.historyRow}>
                            <Typography variant="caption" color={theme.colors.gray[500]}>
                              Quantity Received:
                            </Typography>
                            <Typography variant="small" weight="bold" color={theme.colors.primary[600]}>
                              {entry.receivedQty}
                            </Typography>
                          </View>
                          {entry.notes && (
                            <View style={styles.historyRow}>
                              <Typography variant="caption" color={theme.colors.gray[500]}>
                                Notes:
                              </Typography>
                              <Typography variant="caption" color={theme.colors.gray[700]}>
                                {entry.notes}
                              </Typography>
                            </View>
                          )}
                        </View>
                      </View>
                    ))}
                    {/* Total */}
                    <View style={styles.historyTotal}>
                      <Typography variant="small" weight="semibold" color={theme.colors.gray[700]}>
                        Total Previously Received:
                      </Typography>
                      <Typography variant="h3" weight="bold" color={theme.colors.success[600]}>
                        {previouslyReceived}
                      </Typography>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Footer Actions */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                disabled={loading}>
                <Typography variant="body" weight="semibold" color={theme.colors.gray[700]}>
                  Cancel
                </Typography>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  (!isValid || loading) && styles.confirmButtonDisabled,
                ]}
                onPress={handleConfirm}
                disabled={!isValid || loading}>
                {loading ? (
                  <ActivityIndicator size="small" color={theme.colors.white} />
                ) : (
                  <>
                    <CheckCircleIcon size={20} color={theme.colors.white} />
                    <Typography
                      variant="body"
                      weight="semibold"
                      color={theme.colors.white}
                      style={{marginLeft: 8}}>
                      Verify Receipt
                    </Typography>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Card>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    maxHeight: '90%',
  },
  card: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  headerContent: {
    flex: 1,
  },
  subtitle: {
    marginTop: 4,
  },
  closeButton: {
    padding: 4,
    marginLeft: theme.spacing.md,
  },
  scrollView: {
    maxHeight: 500,
  },
  section: {
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[100],
  },
  sectionTitle: {
    marginBottom: theme.spacing.md,
  },
  infoGrid: {
    gap: theme.spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  quantityGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  quantityCard: {
    flex: 1,
    backgroundColor: theme.colors.gray[50],
    borderRadius: 12,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  input: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
    borderRadius: 12,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 16,
    color: theme.colors.gray[900],
  },
  textArea: {
    minHeight: 80,
    paddingTop: theme.spacing.sm,
  },
  historyContainer: {
    gap: theme.spacing.sm,
  },
  historyItem: {
    backgroundColor: theme.colors.gray[50],
    borderRadius: 12,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  historyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.success[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  historyDetails: {
    gap: 4,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  historyTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.success[50],
    borderRadius: 12,
    padding: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.success[200],
  },
  footer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
  },
  cancelButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: theme.colors.gray[100],
  },
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: theme.spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary[600],
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
});
