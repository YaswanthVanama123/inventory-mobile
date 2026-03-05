import React, {useState, useEffect} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput as RNTextInput,
  Modal,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {useAuth} from '../contexts/AuthContext';
import {useApiErrorHandler} from '../hooks/useApiErrorHandler';
import {theme} from '../theme';
import truckCheckoutService from '../services/truckCheckoutService';
import {
  BoxIcon,
  AlertCircleIcon,
  TruckIcon,
  ChevronDownIcon,
  SearchIcon,
  CheckCircleIcon,
} from '../components/icons';

export const TruckCheckoutScreen = () => {
  const {token, user} = useAuth();
  const {handleApiError} = useApiErrorHandler();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isMounted, setIsMounted] = useState(true);

  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [quantityTaking, setQuantityTaking] = useState('');
  const [remainingQuantity, setRemainingQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingItems, setSearchingItems] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [showDiscrepancyModal, setShowDiscrepancyModal] = useState(false);
  const [discrepancyInfo, setDiscrepancyInfo] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);
  useEffect(() => {
    if (showItemPicker) {
      const delayDebounce = setTimeout(() => {
        searchItems();
      }, searchQuery ? 300 : 0);
      return () => clearTimeout(delayDebounce);
    }
  }, [searchQuery, showItemPicker]);
  const searchItems = async () => {
    if (!token) return;
    try {
      setSearchingItems(true);
      const items = await truckCheckoutService.searchItems(
        token,
        searchQuery,
        true,
        100
      );
      if (isMounted) {
        setSearchResults(items);
      }
    } catch (error: any) {
      console.error('Search items error:', error);
      const wasHandled = await handleApiError(error);
      if (!wasHandled && isMounted) {
        setSearchResults([]);
      }
    } finally {
      if (isMounted) {
        setSearchingItems(false);
      }
    }
  };
  const handleItemSelect = (item: any) => {
    setSelectedItem(item);
    setSearchQuery(item.itemName);
    setShowItemPicker(false);
    setValidationError('');
  };
  const validateStockMath = () => {
    if (!selectedItem || !quantityTaking || !remainingQuantity) {
      return true;
    }
    const taking = parseFloat(quantityTaking);
    const remaining = parseFloat(remainingQuantity);
    const currentStock = selectedItem.currentStock || 0;
    const expectedRemaining = currentStock - taking;
    if (remaining !== expectedRemaining) {
      setValidationError(
        `Math Error: Current stock (${currentStock}) - Taking (${taking}) should equal ${expectedRemaining}, but you entered ${remaining}`
      );
      return false;
    }
    setValidationError('');
    return true;
  };
  const handleQuantityTakingChange = (value: string) => {
    setQuantityTaking(value);
    setValidationError('');
  };
  const handleRemainingQuantityChange = (value: string) => {
    setRemainingQuantity(value);
    setValidationError('');
  };
  const handleCheckout = async () => {
    if (!user || !user.fullName?.trim()) {
      Alert.alert('Error', 'Employee name is required. Please update your profile.');
      return;
    }
    if (!user.truckNumber?.trim()) {
      Alert.alert('Error', 'Truck number is required. Please update your profile.');
      return;
    }
    if (!selectedItem) {
      Alert.alert('Error', 'Please select an item');
      return;
    }
    const taking = parseFloat(quantityTaking);
    const remaining = parseFloat(remainingQuantity);
    if (!taking || taking <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity to take');
      return;
    }
    if (isNaN(remaining)) {
      Alert.alert('Error', 'Please enter remaining quantity');
      return;
    }
    if (!validateStockMath()) {
      const currentStock = selectedItem.currentStock || 0;
      const expectedRemaining = currentStock - taking;
      const difference = remaining - expectedRemaining;
      setDiscrepancyInfo({
        itemName: selectedItem.itemName,
        currentStock,
        taking,
        expectedRemaining,
        userEnteredRemaining: remaining,
        difference,
        discrepancyType: difference > 0 ? 'Overage' : 'Shortage',
      });
      setShowDiscrepancyModal(true);
      return;
    }
    await submitCheckout(false);
  };
  const submitCheckout = async (acceptDiscrepancy: boolean) => {
    if (!token || !user) return;
    try {
      setSubmitting(true);
      const checkoutData = {
        employeeName: user.fullName!.trim(),
        truckNumber: user.truckNumber!.trim(),
        itemName: selectedItem.itemName,
        quantityTaking: parseFloat(quantityTaking),
        remainingQuantity: parseFloat(remainingQuantity),
        notes: notes.trim(),
        checkoutDate: new Date().toISOString(),
        acceptDiscrepancy,
      };
      console.log('[TruckCheckout] Submitting:', checkoutData);
      const result = await truckCheckoutService.createCheckout(
        token,
        checkoutData
      );
      if (!result.success && result.requiresConfirmation) {
        const validation = result.validation;
        setDiscrepancyInfo({
          itemName: selectedItem.itemName,
          currentStock: validation.currentStock,
          taking: validation.quantityTaking,
          expectedRemaining: validation.systemCalculatedRemaining,
          userEnteredRemaining: validation.userRemainingQuantity,
          difference: validation.discrepancyDifference,
          discrepancyType: validation.discrepancyType,
        });
        setShowDiscrepancyModal(true);
        return;
      }
      if (result.success) {
        setShowDiscrepancyModal(false);
        Alert.alert(
          'Success',
          result.discrepancy
            ? 'Checkout created with discrepancy adjustment'
            : 'Checkout created successfully',
          [
            {
              text: 'OK',
              onPress: () => {
                setSelectedItem(null);
                setSearchQuery('');
                setQuantityTaking('');
                setRemainingQuantity('');
                setNotes('');
                setValidationError('');
              },
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('Create checkout error:', error);
      const wasHandled = await handleApiError(error);
      if (!wasHandled) {
        Alert.alert('Error', error.message || 'Failed to create checkout');
      }
    } finally {
      if (isMounted) {
        setSubmitting(false);
      }
    }
  };
  const onRefresh = () => {
    setRefreshing(true);
    if (showItemPicker) {
      searchItems().finally(() => setRefreshing(false));
    } else {
      setRefreshing(false);
    }
  };
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TruckIcon size={32} color={theme.colors.primary[600]} />
            <Typography variant="h2" weight="bold" style={styles.headerTitle}>
              Truck Checkout
            </Typography>
          </View>
          <Typography
            variant="body"
            color={theme.colors.gray[500]}
            style={styles.headerSubtitle}>
            Check out items to truck with stock validation
          </Typography>
        </View>
        <Card variant="elevated" padding="lg" style={styles.formCard}>
          {/* Employee Name */}
          <View style={styles.formGroup}>
            <Typography variant="body" weight="semibold" style={styles.label}>
              Employee Name *
            </Typography>
            <RNTextInput
              style={[styles.input, styles.inputDisabled]}
              value={user?.fullName || 'Not set'}
              editable={false}
              placeholderTextColor={theme.colors.gray[400]}
            />
          </View>
          {/* Truck Number */}
          <View style={styles.formGroup}>
            <Typography variant="body" weight="semibold" style={styles.label}>
              Truck Number *
            </Typography>
            <RNTextInput
              style={[styles.input, styles.inputDisabled]}
              value={user?.truckNumber || 'Not set'}
              editable={false}
              placeholderTextColor={theme.colors.gray[400]}
            />
          </View>
          {/* Item Selector */}
          <View style={styles.formGroup}>
            <Typography variant="body" weight="semibold" style={styles.label}>
              Select Item *
            </Typography>
            <TouchableOpacity
              style={styles.itemSelector}
              onPress={() => setShowItemPicker(true)}>
              <View style={styles.itemSelectorContent}>
                {selectedItem ? (
                  <>
                    <BoxIcon size={20} color={theme.colors.primary[600]} />
                    <View style={styles.itemSelectorText}>
                      <Typography variant="body" weight="medium">
                        {selectedItem.itemName}
                      </Typography>
                      <Typography variant="caption" color={theme.colors.gray[500]}>
                        Current Stock: {selectedItem.currentStock || 0}
                      </Typography>
                    </View>
                  </>
                ) : (
                  <>
                    <SearchIcon size={20} color={theme.colors.gray[400]} />
                    <Typography
                      variant="body"
                      color={theme.colors.gray[400]}
                      style={{marginLeft: 12}}>
                      Search and select item
                    </Typography>
                  </>
                )}
              </View>
              <ChevronDownIcon size={20} color={theme.colors.gray[400]} />
            </TouchableOpacity>
          </View>
          {/* Quantity Taking */}
          <View style={styles.formGroup}>
            <Typography variant="body" weight="semibold" style={styles.label}>
              Quantity Taking *
            </Typography>
            <RNTextInput
              style={styles.input}
              value={quantityTaking}
              onChangeText={handleQuantityTakingChange}
              placeholder="Enter quantity to take"
              placeholderTextColor={theme.colors.gray[400]}
              keyboardType="numeric"
              editable={!!selectedItem}
            />
          </View>
          {/* Remaining Quantity */}
          <View style={styles.formGroup}>
            <Typography variant="body" weight="semibold" style={styles.label}>
              Remaining Quantity After Taking *
            </Typography>
            <RNTextInput
              style={styles.input}
              value={remainingQuantity}
              onChangeText={handleRemainingQuantityChange}
              onBlur={validateStockMath}
              placeholder="Enter remaining quantity"
              placeholderTextColor={theme.colors.gray[400]}
              keyboardType="numeric"
              editable={!!selectedItem}
            />
            {selectedItem && quantityTaking && (
              <Typography
                variant="caption"
                color={theme.colors.gray[500]}
                style={{marginTop: 4}}>
                Expected: {selectedItem.currentStock || 0} - {parseFloat(quantityTaking) || 0} ={' '}
                {(selectedItem.currentStock || 0) - (parseFloat(quantityTaking) || 0)}
              </Typography>
            )}
          </View>
          {/* Validation Error */}
          {validationError && (
            <View style={styles.errorBox}>
              <AlertCircleIcon size={20} color={theme.colors.error[600]} />
              <Typography
                variant="small"
                color={theme.colors.error[700]}
                style={{flex: 1, marginLeft: 8}}>
                {validationError}
              </Typography>
            </View>
          )}
          {/* Notes */}
          <View style={styles.formGroup}>
            <Typography variant="body" weight="semibold" style={styles.label}>
              Notes
            </Typography>
            <RNTextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional notes"
              placeholderTextColor={theme.colors.gray[400]}
              multiline
              numberOfLines={3}
            />
          </View>
          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (loading || submitting) && styles.submitButtonDisabled,
            ]}
            onPress={handleCheckout}
            disabled={loading || submitting}>
            {submitting ? (
              <ActivityIndicator color={theme.colors.white} />
            ) : (
              <Typography variant="body" weight="bold" color={theme.colors.white}>
                Create Checkout
              </Typography>
            )}
          </TouchableOpacity>
        </Card>
      </ScrollView>
      {/* Item Picker Modal */}
      <Modal
        visible={showItemPicker}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowItemPicker(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Typography variant="h3" weight="bold">
              Select Item
            </Typography>
            <TouchableOpacity onPress={() => setShowItemPicker(false)}>
              <Typography variant="body" color={theme.colors.primary[600]}>
                Close
              </Typography>
            </TouchableOpacity>
          </View>
          {/* Search Input */}
          <View style={styles.searchContainer}>
            <SearchIcon size={20} color={theme.colors.gray[400]} />
            <RNTextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search RouteStarItems..."
              placeholderTextColor={theme.colors.gray[400]}
              autoFocus
            />
          </View>
          {/* Search Results */}
          <ScrollView style={styles.itemsList} showsVerticalScrollIndicator={false}>
            {searchingItems && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary[600]} />
                <Typography
                  variant="body"
                  color={theme.colors.gray[600]}
                  style={{marginTop: 12}}>
                  Searching items...
                </Typography>
              </View>
            )}
            {!searchingItems && searchResults.length === 0 && (
              <View style={styles.emptyContainer}>
                <BoxIcon size={48} color={theme.colors.gray[300]} />
                <Typography
                  variant="body"
                  color={theme.colors.gray[500]}
                  style={{marginTop: 12}}>
                  {searchQuery
                    ? 'No items found matching your search'
                    : 'No items available for checkout'}
                </Typography>
              </View>
            )}
            {!searchingItems &&
              searchResults.map((item: any, index: number) => (
                <TouchableOpacity
                  key={`${item.itemName}-${index}`}
                  style={styles.itemCard}
                  onPress={() => handleItemSelect(item)}>
                  <View style={styles.itemCardLeft}>
                    <BoxIcon size={24} color={theme.colors.primary[600]} />
                    <View style={styles.itemCardInfo}>
                      <Typography variant="body" weight="semibold">
                        {item.itemName}
                      </Typography>
                      <Typography variant="caption" color={theme.colors.gray[500]}>
                        Stock: {item.currentStock || 0} • Purchased:{' '}
                        {item.totalPurchased || 0} • Sold: {item.totalSold || 0}
                      </Typography>
                    </View>
                  </View>
                  {selectedItem?.itemName === item.itemName && (
                    <CheckCircleIcon size={24} color={theme.colors.success[600]} />
                  )}
                </TouchableOpacity>
              ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
      {/* Discrepancy Confirmation Modal */}
      <Modal
        visible={showDiscrepancyModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => !submitting && setShowDiscrepancyModal(false)}>
        <View style={styles.discrepancyModalOverlay}>
          <View style={styles.discrepancyModalContent}>
            <View style={styles.discrepancyHeader}>
              <AlertCircleIcon size={32} color={theme.colors.error[600]} />
              <Typography variant="h3" weight="bold" style={{marginTop: 12}}>
                Stock Discrepancy Detected
              </Typography>
            </View>
            {discrepancyInfo && (
              <View style={styles.discrepancyBody}>
                <Typography variant="body" color={theme.colors.gray[700]} style={{marginBottom: 16}}>
                  The remaining quantity you entered doesn't match the system calculation.
                </Typography>
                <View style={styles.discrepancyRow}>
                  <Typography variant="small" color={theme.colors.gray[500]}>
                    Item:
                  </Typography>
                  <Typography variant="small" weight="bold">
                    {discrepancyInfo.itemName}
                  </Typography>
                </View>
                <View style={styles.discrepancyRow}>
                  <Typography variant="small" color={theme.colors.gray[500]}>
                    Current Stock:
                  </Typography>
                  <Typography variant="small" weight="bold">
                    {discrepancyInfo.currentStock}
                  </Typography>
                </View>
                <View style={styles.discrepancyRow}>
                  <Typography variant="small" color={theme.colors.gray[500]}>
                    Taking:
                  </Typography>
                  <Typography variant="small" weight="bold">
                    {discrepancyInfo.taking}
                  </Typography>
                </View>
                <View style={[styles.discrepancyRow, styles.divider]}>
                  <Typography variant="small" color={theme.colors.gray[500]}>
                    Expected Remaining:
                  </Typography>
                  <Typography variant="small" weight="bold" color={theme.colors.primary[600]}>
                    {discrepancyInfo.expectedRemaining}
                  </Typography>
                </View>
                <View style={styles.discrepancyRow}>
                  <Typography variant="small" color={theme.colors.gray[500]}>
                    You Entered:
                  </Typography>
                  <Typography variant="small" weight="bold" color={theme.colors.error[600]}>
                    {discrepancyInfo.userEnteredRemaining}
                  </Typography>
                </View>
                <View style={[styles.discrepancyRow, {marginTop: 16}]}>
                  <Typography variant="small" color={theme.colors.gray[500]}>
                    Difference:
                  </Typography>
                  <Typography
                    variant="body"
                    weight="bold"
                    color={
                      discrepancyInfo.difference > 0
                        ? theme.colors.success[600]
                        : theme.colors.error[600]
                    }>
                    {discrepancyInfo.difference > 0 ? '+' : ''}
                    {discrepancyInfo.difference} ({discrepancyInfo.discrepancyType})
                  </Typography>
                </View>
                <View style={styles.warningBox}>
                  <Typography variant="small" color={theme.colors.warning[700]}>
                    Accepting this will automatically create an approved discrepancy and adjust
                    stock accordingly.
                  </Typography>
                </View>
              </View>
            )}
            <View style={styles.discrepancyFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowDiscrepancyModal(false)}
                disabled={submitting}>
                <Typography variant="body" color={theme.colors.gray[700]}>
                  Cancel
                </Typography>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.acceptButton, submitting && styles.submitButtonDisabled]}
                onPress={() => submitCheckout(true)}
                disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator color={theme.colors.white} />
                ) : (
                  <Typography variant="body" weight="bold" color={theme.colors.white}>
                    Accept & Create Checkout
                  </Typography>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.gray[50],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
  },
  header: {
    marginBottom: theme.spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: theme.spacing.xs,
  },
  headerTitle: {
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  formCard: {
    marginBottom: theme.spacing.xl,
  },
  formGroup: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    marginBottom: theme.spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
    borderRadius: 12,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 16,
    color: theme.colors.gray[900],
    backgroundColor: theme.colors.white,
  },
  inputDisabled: {
    backgroundColor: theme.colors.gray[100],
    color: theme.colors.gray[600],
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: theme.spacing.sm,
  },
  itemSelector: {
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
    borderRadius: 12,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.white,
  },
  itemSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemSelectorText: {
    marginLeft: 12,
    flex: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.error[50],
    borderRadius: 8,
    marginBottom: theme.spacing.md,
  },
  submitButton: {
    backgroundColor: theme.colors.primary[600],
    borderRadius: 12,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.gray[50],
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.gray[900],
    paddingVertical: 8,
  },
  itemsList: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xl * 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xl * 2,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  itemCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  itemCardInfo: {
    flex: 1,
  },
  discrepancyModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  discrepancyModalContent: {
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    overflow: 'hidden',
  },
  discrepancyHeader: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.error[50],
  },
  discrepancyBody: {
    padding: theme.spacing.xl,
  },
  discrepancyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  divider: {
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  warningBox: {
    backgroundColor: theme.colors.warning[50],
    padding: theme.spacing.md,
    borderRadius: 8,
    marginTop: 16,
  },
  discrepancyFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: theme.spacing.lg,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
  },
  acceptButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: theme.colors.error[600],
    minWidth: 200,
    alignItems: 'center',
  },
});
