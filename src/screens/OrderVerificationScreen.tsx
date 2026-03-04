import React, {useState, useEffect} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput as RNTextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {useAuth} from '../contexts/AuthContext';
import {useApiErrorHandler} from '../hooks/useApiErrorHandler';
import {theme} from '../theme';
import ordersService from '../services/ordersService';
import orderDiscrepancyService from '../services/orderDiscrepancyService';
import {
  CheckCircleIcon,
  ClipboardIcon,
  AlertCircleIcon,
  ArrowLeftIcon,
} from '../components/icons';

interface OrderVerificationScreenProps {
  route: any;
  navigation: any;
}

interface OrderItem {
  sku: string;
  name: string;
  itemName?: string;
  qty: number;
  receivedQuantity: number;
  notes?: string;
}

export const OrderVerificationScreen: React.FC<
  OrderVerificationScreenProps
> = ({route, navigation}) => {
  const {orderId} = route.params;
  const {token} = useAuth();
  const {handleApiError} = useApiErrorHandler();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState('');
  const [hasDiscrepancies, setHasDiscrepancies] = useState(false);

  useEffect(() => {
    if (orderId && token) {
      fetchOrder();
    }
  }, [orderId, token]);

  useEffect(() => {
    // Check if there are any discrepancies
    const discrepancies = items.some(
      item => parseFloat(item.receivedQuantity.toString()) !== item.qty,
    );
    setHasDiscrepancies(discrepancies);
  }, [items]);

  const fetchOrder = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await ordersService.getOrderById(token, orderId);

      if (response) {
        setOrder(response);
        // Initialize items with expected quantities
        setItems(
          response.items.map((item: any) => ({
            ...item,
            receivedQuantity: item.qty, // Default to expected quantity
            itemName: item.name,
          })),
        );
      }
    } catch (error: any) {
      console.error('Fetch order error:', error);
      const wasHandled = await handleApiError(error);
      if (!wasHandled) {
        Alert.alert('Error', 'Failed to load order details');
      }
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index].receivedQuantity = parseFloat(value) || 0;
    setItems(newItems);
  };

  const handleAllGood = async () => {
    if (!token || !orderId) return;

    Alert.alert(
      'Confirm All Good',
      'Are you sure all items were received as expected?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setSubmitting(true);
              await orderDiscrepancyService.verifyOrder(token, orderId, {
                allGood: true,
                notes: notes.trim() || 'All items received as expected',
              });

              Alert.alert(
                'Success',
                'Order verified successfully - all items correct',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ],
              );
            } catch (error: any) {
              console.error('Verify order error:', error);
              const wasHandled = await handleApiError(error);
              if (!wasHandled) {
                Alert.alert(
                  'Error',
                  error.message || 'Failed to verify order',
                );
              }
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };

  const handleSubmitWithDiscrepancies = async () => {
    if (!token || !orderId) return;

    Alert.alert(
      'Submit Discrepancies',
      'This will record the discrepancies for admin approval.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Submit',
          onPress: async () => {
            try {
              setSubmitting(true);

              // Prepare items data
              const itemsData = items.map(item => ({
                sku: item.sku,
                itemName: item.itemName || item.name,
                expectedQuantity: item.qty,
                receivedQuantity: parseFloat(item.receivedQuantity.toString()) || 0,
                notes: item.notes || '',
              }));

              const response = await orderDiscrepancyService.verifyOrder(
                token,
                orderId,
                {
                  allGood: false,
                  items: itemsData,
                  notes: notes.trim(),
                },
              );

              const discrepancyCount = response.discrepancies?.length || 0;
              Alert.alert(
                'Success',
                `Order verified with ${discrepancyCount} discrepancy(ies) recorded`,
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ],
              );
            } catch (error: any) {
              console.error('Submit discrepancies error:', error);
              const wasHandled = await handleApiError(error);
              if (!wasHandled) {
                Alert.alert(
                  'Error',
                  error.message || 'Failed to submit discrepancies',
                );
              }
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Typography style={styles.loadingText}>Loading order...</Typography>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <AlertCircleIcon size={48} color={theme.colors.error} />
          <Typography style={styles.errorText}>Order not found</Typography>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Typography style={styles.backButtonText}>Go Back</Typography>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (order.status === 'received' || order.status === 'completed') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <CheckCircleIcon size={48} color={theme.colors.success} />
          <Typography style={styles.infoText}>Already Verified</Typography>
          <Typography style={styles.infoSubtext}>
            This order has already been verified.
          </Typography>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Typography style={styles.backButtonText}>Go Back</Typography>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backIcon}
            onPress={() => navigation.goBack()}>
            <ArrowLeftIcon size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Typography variant="h2">Verify Order Receipt</Typography>
            <Typography variant="body2" style={styles.subtitle}>
              Check received items and record any discrepancies
            </Typography>
          </View>
        </View>

        {/* Order Info */}
        <Card style={styles.card}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Typography variant="body2" style={styles.infoLabel}>
                Order Number
              </Typography>
              <Typography variant="h3">{order.orderNumber}</Typography>
            </View>
            <View style={styles.infoItem}>
              <Typography variant="body2" style={styles.infoLabel}>
                Vendor
              </Typography>
              <Typography variant="h3">{order.vendor?.name}</Typography>
            </View>
          </View>
          <View style={styles.infoItem}>
            <Typography variant="body2" style={styles.infoLabel}>
              Order Date
            </Typography>
            <Typography variant="h3">
              {new Date(order.orderDate).toLocaleDateString()}
            </Typography>
          </View>
        </Card>

        {/* Instructions */}
        <Card style={[styles.card, styles.infoCard]}>
          <Typography variant="h4" style={styles.instructionTitle}>
            Instructions
          </Typography>
          <Typography variant="body2" style={styles.instructionText}>
            • Enter the actual quantity received for each item
          </Typography>
          <Typography variant="body2" style={styles.instructionText}>
            • If all items match exactly, click "All Good"
          </Typography>
          <Typography variant="body2" style={styles.instructionText}>
            • If there are differences, they will be recorded as discrepancies
            for admin approval
          </Typography>
        </Card>

        {/* Items List */}
        <Card style={styles.card}>
          <Typography variant="h3" style={styles.sectionTitle}>
            Order Items ({items.length})
          </Typography>

          {items.map((item, index) => {
            const received = parseFloat(item.receivedQuantity.toString()) || 0;
            const expected = item.qty;
            const difference = received - expected;
            const hasDiscrepancy = difference !== 0;

            return (
              <View
                key={index}
                style={[
                  styles.itemRow,
                  hasDiscrepancy && styles.itemRowDiscrepancy,
                ]}>
                <View style={styles.itemInfo}>
                  <Typography variant="h4">{item.name}</Typography>
                  <Typography variant="body2" style={styles.itemSku}>
                    {item.sku}
                  </Typography>
                </View>

                <View style={styles.quantityRow}>
                  <View style={styles.quantityItem}>
                    <Typography variant="body2" style={styles.quantityLabel}>
                      Expected
                    </Typography>
                    <Typography variant="h4">{expected}</Typography>
                  </View>

                  <View style={styles.quantityItem}>
                    <Typography variant="body2" style={styles.quantityLabel}>
                      Received
                    </Typography>
                    <RNTextInput
                      style={styles.quantityInput}
                      value={item.receivedQuantity.toString()}
                      onChangeText={value => handleQuantityChange(index, value)}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.quantityItem}>
                    <Typography variant="body2" style={styles.quantityLabel}>
                      Difference
                    </Typography>
                    {hasDiscrepancy ? (
                      <Typography
                        variant="h4"
                        style={[
                          styles.differenceText,
                          difference > 0
                            ? styles.differenceOver
                            : styles.differenceShort,
                        ]}>
                        {difference > 0 ? '+' : ''}
                        {difference}
                      </Typography>
                    ) : (
                      <Typography
                        variant="h4"
                        style={styles.differenceMatched}>
                        -
                      </Typography>
                    )}
                  </View>
                </View>

                {hasDiscrepancy && (
                  <View
                    style={[
                      styles.statusBadge,
                      difference > 0
                        ? styles.statusOverage
                        : styles.statusShortage,
                    ]}>
                    <Typography
                      variant="body2"
                      style={styles.statusBadgeText}>
                      {difference > 0 ? 'Overage' : 'Shortage'}
                    </Typography>
                  </View>
                )}
              </View>
            );
          })}
        </Card>

        {/* Notes */}
        <Card style={styles.card}>
          <Typography variant="h4" style={styles.notesLabel}>
            Notes (Optional)
          </Typography>
          <RNTextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any notes about this order verification..."
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            numberOfLines={3}
          />
        </Card>

        {/* Discrepancy Warning */}
        {hasDiscrepancies && (
          <Card style={[styles.card, styles.warningCard]}>
            <AlertCircleIcon size={20} color={theme.colors.warning} />
            <Typography variant="body2" style={styles.warningText}>
              Some items have quantity differences. These will be recorded as
              discrepancies and sent to admin for approval.
            </Typography>
          </Card>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={submitting}>
            <Typography style={styles.cancelButtonText}>Cancel</Typography>
          </TouchableOpacity>

          {!hasDiscrepancies ? (
            <TouchableOpacity
              style={[
                styles.allGoodButton,
                submitting && styles.buttonDisabled,
              ]}
              onPress={handleAllGood}
              disabled={submitting}>
              {submitting ? (
                <ActivityIndicator size="small" color={theme.colors.white} />
              ) : (
                <>
                  <CheckCircleIcon size={20} color={theme.colors.white} />
                  <Typography style={styles.allGoodButtonText}>
                    All Good - Everything Matches
                  </Typography>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.submitButton,
                submitting && styles.buttonDisabled,
              ]}
              onPress={handleSubmitWithDiscrepancies}
              disabled={submitting}>
              {submitting ? (
                <ActivityIndicator size="small" color={theme.colors.white} />
              ) : (
                <>
                  <ClipboardIcon size={20} color={theme.colors.white} />
                  <Typography style={styles.submitButtonText}>
                    Submit with Discrepancies
                  </Typography>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
    padding: theme.spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  errorText: {
    marginTop: theme.spacing.md,
    color: theme.colors.error,
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoText: {
    marginTop: theme.spacing.md,
    color: theme.colors.success,
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoSubtext: {
    marginTop: theme.spacing.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  backButton: {
    marginTop: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
  },
  backButtonText: {
    color: theme.colors.white,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  backIcon: {
    padding: theme.spacing.sm,
  },
  headerContent: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  card: {
    marginBottom: theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  infoCard: {
    backgroundColor: theme.colors.info + '20',
  },
  instructionTitle: {
    marginBottom: theme.spacing.sm,
    fontWeight: 'bold',
  },
  instructionText: {
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  sectionTitle: {
    marginBottom: theme.spacing.md,
    fontWeight: 'bold',
  },
  itemRow: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  itemRowDiscrepancy: {
    backgroundColor: theme.colors.warning + '20',
  },
  itemInfo: {
    marginBottom: theme.spacing.sm,
  },
  itemSku: {
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  quantityItem: {
    flex: 1,
    alignItems: 'center',
  },
  quantityLabel: {
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    fontSize: 12,
  },
  quantityInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    minWidth: 60,
    textAlign: 'center',
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  differenceText: {
    fontWeight: 'bold',
  },
  differenceOver: {
    color: theme.colors.info,
  },
  differenceShort: {
    color: theme.colors.warning,
  },
  differenceMatched: {
    color: theme.colors.success,
  },
  statusBadge: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    alignSelf: 'flex-start',
  },
  statusOverage: {
    backgroundColor: theme.colors.info,
  },
  statusShortage: {
    backgroundColor: theme.colors.warning,
  },
  statusBadgeText: {
    color: theme.colors.white,
    fontWeight: 'bold',
    fontSize: 12,
  },
  notesLabel: {
    marginBottom: theme.spacing.sm,
    fontWeight: 'bold',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  warningCard: {
    backgroundColor: theme.colors.warning + '20',
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningText: {
    flex: 1,
    marginLeft: theme.spacing.sm,
    color: theme.colors.text,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  cancelButton: {
    flex: 1,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelButtonText: {
    color: theme.colors.text,
    fontWeight: 'bold',
  },
  allGoodButton: {
    flex: 2,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  allGoodButtonText: {
    color: theme.colors.white,
    fontWeight: 'bold',
  },
  submitButton: {
    flex: 2,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  submitButtonText: {
    color: theme.colors.white,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
