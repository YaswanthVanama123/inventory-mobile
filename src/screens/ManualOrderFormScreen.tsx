import React, {useState, useEffect} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput as RNTextInput,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {useAuth} from '../contexts/AuthContext';
import {useApiErrorHandler} from '../hooks/useApiErrorHandler';
import {theme} from '../theme';
import manualOrderService from '../services/manualOrderService';
import manualPOItemService from '../services/manualPOItemService';
import vendorService from '../services/vendorService';
import {PlusIcon, TrashIcon} from '../components/icons';

interface ManualOrderFormScreenProps {
  navigation: any;
}

interface OrderItem {
  sku: string;
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

export const ManualOrderFormScreen: React.FC<ManualOrderFormScreenProps> = ({
  navigation,
}) => {
  const {token} = useAuth();
  const {handleApiError} = useApiErrorHandler();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [vendors, setVendors] = useState<any[]>([]);
  const [manualPOItems, setManualPOItems] = useState<any[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [orderDate, setOrderDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [items, setItems] = useState<OrderItem[]>([
    {sku: '', name: '', qty: 1, unitPrice: 0, lineTotal: 0},
  ]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  const loadData = async () => {
    if (!token) return;

    try {
      setLoading(true);

      const [orderNumData, vendorsData, itemsData] = await Promise.all([
        manualOrderService.getNextOrderNumber(token),
        vendorService.getActiveVendors(token),
        manualPOItemService.getActiveManualPOItems(token),
      ]);

      setOrderNumber(orderNumData);
      setVendors(vendorsData);
      setManualPOItems(itemsData);
    } catch (error: any) {
      console.error('Failed to load form data:', error);
      const wasHandled = await handleApiError(error);
      if (!wasHandled) {
        Alert.alert('Error', 'Failed to load form data');
      }
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];

    if (field === 'sku') {
      const item = manualPOItems.find(i => i.sku === value);
      if (item) {
        newItems[index].sku = item.sku;
        newItems[index].name = item.name;
      }
    } else {
      (newItems[index] as any)[field] = value;
    }

    // Recalculate line total
    if (field === 'qty' || field === 'unitPrice') {
      const qty = parseFloat(String(newItems[index].qty)) || 0;
      const unitPrice = parseFloat(String(newItems[index].unitPrice)) || 0;
      newItems[index].lineTotal = qty * unitPrice;
    }

    setItems(newItems);
  };

  const handleAddItem = () => {
    setItems([...items, {sku: '', name: '', qty: 1, unitPrice: 0, lineTotal: 0}]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) {
      Alert.alert('Error', 'At least one item is required');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
  };

  const handleSubmit = async () => {
    // Validation
    if (!selectedVendorId) {
      Alert.alert('Validation Error', 'Please select a vendor');
      return;
    }

    if (!orderDate) {
      Alert.alert('Validation Error', 'Order date is required');
      return;
    }

    const validItems = items.filter(item => item.sku && item.qty > 0);
    if (validItems.length === 0) {
      Alert.alert(
        'Validation Error',
        'Please add at least one item with valid SKU and quantity',
      );
      return;
    }

    try {
      setSubmitting(true);

      // Get selected vendor details
      const selectedVendor = vendors.find(v => v._id === selectedVendorId);
      if (!selectedVendor) {
        throw new Error('Selected vendor not found');
      }

      // Prepare order data
      const orderData = {
        vendor: {
          name: selectedVendor.name,
          email: selectedVendor.email || '',
          phone: selectedVendor.phone || '',
          address: selectedVendor.address || '',
        },
        orderDate,
        items: validItems.map(item => ({
          sku: item.sku,
          name: item.name,
          qty: parseFloat(String(item.qty)),
          unitPrice: parseFloat(String(item.unitPrice)),
        })),
        notes,
      };

      await manualOrderService.createManualOrder(token!, orderData);
      Alert.alert(
        'Success',
        'Manual order created successfully and stock processed',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } catch (error: any) {
      console.error('Form submission error:', error);
      const wasHandled = await handleApiError(error);
      if (!wasHandled) {
        Alert.alert('Error', error.message || 'Failed to create order');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[600]} />
          <Typography
            variant="body"
            color={theme.colors.gray[600]}
            style={{marginTop: 16}}>
            Loading form data...
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Order Information Card */}
        <Card style={styles.section}>
          <Typography variant="h3" weight="bold" style={styles.sectionTitle}>
            Order Information
          </Typography>

          {/* Order Number */}
          <View style={styles.field}>
            <Typography variant="body" weight="medium" style={styles.label}>
              Order Number
            </Typography>
            <View style={[styles.input, styles.disabledInput]}>
              <Typography variant="body" color={theme.colors.gray[600]}>
                {orderNumber}
              </Typography>
            </View>
          </View>

          {/* Vendor Selection */}
          <View style={styles.field}>
            <Typography variant="body" weight="medium" style={styles.label}>
              Vendor *
            </Typography>
            <View style={styles.pickerContainer}>
              {vendors.map(vendor => (
                <TouchableOpacity
                  key={vendor._id}
                  style={[
                    styles.pickerOption,
                    selectedVendorId === vendor._id &&
                      styles.pickerOptionSelected,
                  ]}
                  onPress={() => setSelectedVendorId(vendor._id)}>
                  <Typography
                    variant="body"
                    color={
                      selectedVendorId === vendor._id
                        ? theme.colors.primary[700]
                        : theme.colors.gray[700]
                    }>
                    {vendor.name}
                  </Typography>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Order Date */}
          <View style={styles.field}>
            <Typography variant="body" weight="medium" style={styles.label}>
              Order Date *
            </Typography>
            <RNTextInput
              style={styles.input}
              value={orderDate}
              onChangeText={setOrderDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.colors.gray[400]}
            />
          </View>
        </Card>

        {/* Items Card */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Typography variant="h3" weight="bold">
              Order Items
            </Typography>
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddItem}>
              <PlusIcon size={16} color={theme.colors.white} />
              <Typography
                variant="small"
                weight="bold"
                color={theme.colors.white}>
                Add Item
              </Typography>
            </TouchableOpacity>
          </View>

          {items.map((item, index) => (
            <View key={index} style={styles.itemContainer}>
              {/* Item Selection */}
              <View style={styles.field}>
                <Typography variant="small" weight="medium" style={styles.label}>
                  Item *
                </Typography>
                <View style={styles.pickerContainer}>
                  {manualPOItems.map(poItem => (
                    <TouchableOpacity
                      key={poItem.sku}
                      style={[
                        styles.pickerOption,
                        item.sku === poItem.sku && styles.pickerOptionSelected,
                      ]}
                      onPress={() =>
                        handleItemChange(index, 'sku', poItem.sku)
                      }>
                      <Typography
                        variant="small"
                        color={
                          item.sku === poItem.sku
                            ? theme.colors.primary[700]
                            : theme.colors.gray[700]
                        }>
                        {poItem.sku} - {poItem.name}
                      </Typography>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Quantity and Unit Price Row */}
              <View style={styles.row}>
                <View style={[styles.field, {flex: 1}]}>
                  <Typography
                    variant="small"
                    weight="medium"
                    style={styles.label}>
                    Quantity *
                  </Typography>
                  <RNTextInput
                    style={styles.input}
                    value={String(item.qty)}
                    onChangeText={text =>
                      handleItemChange(index, 'qty', text)
                    }
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor={theme.colors.gray[400]}
                  />
                </View>

                <View style={[styles.field, {flex: 1}]}>
                  <Typography
                    variant="small"
                    weight="medium"
                    style={styles.label}>
                    Unit Price *
                  </Typography>
                  <RNTextInput
                    style={styles.input}
                    value={String(item.unitPrice)}
                    onChangeText={text =>
                      handleItemChange(index, 'unitPrice', text)
                    }
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={theme.colors.gray[400]}
                  />
                </View>
              </View>

              {/* Line Total and Remove Button */}
              <View style={styles.itemFooter}>
                <View style={styles.lineTotal}>
                  <Typography variant="small" color={theme.colors.gray[600]}>
                    Line Total:
                  </Typography>
                  <Typography
                    variant="body"
                    weight="bold"
                    color={theme.colors.gray[900]}>
                    ${item.lineTotal.toFixed(2)}
                  </Typography>
                </View>

                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveItem(index)}
                  disabled={items.length === 1}>
                  <TrashIcon
                    size={18}
                    color={
                      items.length === 1
                        ? theme.colors.gray[400]
                        : theme.colors.error[600]
                    }
                  />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Order Total */}
          <View style={styles.orderTotal}>
            <Typography variant="body" color={theme.colors.gray[600]}>
              Order Total
            </Typography>
            <Typography
              variant="h2"
              weight="bold"
              color={theme.colors.success[600]}>
              ${calculateTotal().toFixed(2)}
            </Typography>
          </View>
        </Card>

        {/* Notes Card */}
        <Card style={styles.section}>
          <Typography variant="h3" weight="bold" style={styles.sectionTitle}>
            Notes (Optional)
          </Typography>
          <RNTextInput
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any notes about this order..."
            placeholderTextColor={theme.colors.gray[400]}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </Card>

        {/* Submit Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => navigation.goBack()}
            disabled={submitting}>
            <Typography
              variant="body"
              weight="bold"
              color={theme.colors.gray[700]}>
              Cancel
            </Typography>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.submitButton]}
            onPress={handleSubmit}
            disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color={theme.colors.white} />
            ) : (
              <Typography
                variant="body"
                weight="bold"
                color={theme.colors.white}>
                Create Order
              </Typography>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.gray[50],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    color: theme.colors.gray[700],
  },
  input: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: theme.colors.gray[900],
  },
  disabledInput: {
    backgroundColor: theme.colors.gray[100],
  },
  notesInput: {
    minHeight: 100,
  },
  pickerContainer: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
    borderRadius: 8,
    maxHeight: 200,
  },
  pickerOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  pickerOptionSelected: {
    backgroundColor: theme.colors.primary[50],
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary[600],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  itemContainer: {
    padding: 12,
    backgroundColor: theme.colors.gray[50],
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
  },
  lineTotal: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  removeButton: {
    padding: 8,
  },
  orderTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 2,
    borderTopColor: theme.colors.gray[300],
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
  },
  submitButton: {
    backgroundColor: theme.colors.primary[600],
  },
});
