import React, {useState, useEffect, useMemo, useCallback} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  TextInput as RNTextInput,
  Alert,
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
import settingsService from '../services/settingsService';
import {AlertCircleIcon, ClockIcon, WarningIcon} from '../components/icons';

interface SettingsScreenProps {
  visible: boolean;
  onClose: () => void;
}

// Normalizes an ISO date (or date-only) string into YYYY-MM-DD for the input.
const toDateInput = (value?: string | null): string => {
  if (!value) return '';
  try {
    return new Date(value).toISOString().split('T')[0];
  } catch {
    return '';
  }
};

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  visible,
  onClose,
}) => {
  const theme = useTheme();
  const bp = useBreakpoint();
  const styles = useMemo(() => makeStyles(theme, bp), [theme, bp]);
  const {token, user} = useAuth();
  const {handleApiError} = useApiErrorHandler();
  const isAdmin = user?.role === 'admin';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stockCutoffDate, setStockCutoffDate] = useState('');
  const [stockCutoffSaving, setStockCutoffSaving] = useState(false);
  const [lowStockThreshold, setLowStockThreshold] = useState('');
  const [thresholdSaving, setThresholdSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const settings = await settingsService.getGeneralSettings(token);
      setStockCutoffDate(toDateInput(settings?.stockCalculationCutoffDate));
      setLowStockThreshold(
        settings?.lowStockThreshold != null
          ? String(settings.lowStockThreshold)
          : '',
      );
    } catch (e: any) {
      console.error('Load settings error:', e);
      setError(e?.message || 'Failed to load settings');
      await handleApiError(e);
    } finally {
      setLoading(false);
    }
  }, [token, handleApiError]);

  useEffect(() => {
    if (visible && token) {
      loadSettings();
    }
  }, [visible, token, loadSettings]);

  const handleUpdateStockCutoffDate = async () => {
    if (!token) return;
    if (!stockCutoffDate) {
      Alert.alert('Validation', 'Please enter a cutoff date (YYYY-MM-DD)');
      return;
    }
    try {
      setStockCutoffSaving(true);
      await settingsService.updateStockCutoffDate(token, stockCutoffDate);
      Alert.alert('Success', 'Stock calculation cutoff date updated successfully');
      loadSettings();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update cutoff date');
    } finally {
      setStockCutoffSaving(false);
    }
  };

  const handleUpdateLowStockThreshold = async () => {
    if (!token) return;
    const parsed = parseInt(lowStockThreshold, 10);
    if (!lowStockThreshold || isNaN(parsed) || parsed <= 0) {
      Alert.alert('Validation', 'Please enter a valid threshold greater than 0');
      return;
    }
    try {
      setThresholdSaving(true);
      await settingsService.updateLowStockThreshold(token, parsed);
      Alert.alert('Success', 'Low stock threshold updated successfully');
      loadSettings();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update threshold');
    } finally {
      setThresholdSaving(false);
    }
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
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Typography variant="body" color={theme.colors.primary[600]} weight="semibold">
              Close
            </Typography>
          </TouchableOpacity>
          <Typography variant="h3" weight="bold" style={styles.modalTitle}>
            Settings
          </Typography>
          <TouchableOpacity onPress={loadSettings} style={styles.refreshButton}>
            <Typography variant="small" color={theme.colors.primary[600]} weight="semibold">
              Refresh
            </Typography>
          </TouchableOpacity>
        </View>

        {!isAdmin ? (
          <View style={styles.centered}>
            <AlertCircleIcon size={48} color={theme.colors.gray[400]} />
            <Typography
              variant="h3"
              weight="semibold"
              color={theme.colors.gray[700]}
              style={{marginTop: 16}}>
              Access Denied
            </Typography>
            <Typography variant="body" color={theme.colors.gray[500]} align="center" style={{marginTop: 8}}>
              You do not have permission to access this page.
            </Typography>
          </View>
        ) : loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.colors.primary[600]} />
            <Typography variant="body" color={theme.colors.gray[600]} style={{marginTop: 16}}>
              Loading settings...
            </Typography>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.contentWrap}>
              {error && (
                <Card variant="outlined" padding="lg" style={styles.errorCard}>
                  <View style={styles.errorContent}>
                    <AlertCircleIcon size={24} color={theme.colors.error[500]} />
                    <Typography variant="body" color={theme.colors.error[700]} style={{flex: 1}}>
                      {error}
                    </Typography>
                  </View>
                </Card>
              )}

              {/* Stock Calculation Cutoff Date */}
              <Card variant="elevated" padding="lg" style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <ClockIcon size={20} color={theme.colors.primary[600]} />
                  <Typography variant="h3" weight="semibold" style={{marginLeft: 8}}>
                    Stock Calculation Cutoff Date
                  </Typography>
                </View>
                <Typography variant="small" color={theme.colors.gray[600]} style={styles.sectionDesc}>
                  Set the date when you switched to the new checkout system.
                  Invoices before this date decrease stock (old behavior); invoices
                  after this date do not (new checkout system).
                </Typography>
                <Typography variant="small" weight="semibold" color={theme.colors.gray[700]} style={styles.formLabel}>
                  Cutoff Date (YYYY-MM-DD)
                </Typography>
                <RNTextInput
                  style={styles.input}
                  value={stockCutoffDate}
                  onChangeText={setStockCutoffDate}
                  placeholder="2025-01-01"
                  placeholderTextColor={theme.colors.gray[400]}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {!!stockCutoffDate && (
                  <Typography variant="caption" color={theme.colors.gray[500]} style={{marginTop: 6}}>
                    Current cutoff: {stockCutoffDate}
                  </Typography>
                )}
                <View style={{marginTop: theme.spacing.md}}>
                  <Button
                    title={stockCutoffSaving ? 'Updating...' : 'Update Cutoff Date'}
                    variant="primary"
                    onPress={handleUpdateStockCutoffDate}
                    disabled={!stockCutoffDate || stockCutoffSaving}
                    loading={stockCutoffSaving}
                    fullWidth
                  />
                </View>
              </Card>

              {/* Low Stock Threshold */}
              <Card variant="elevated" padding="lg" style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <WarningIcon size={20} color={theme.colors.warning[600]} />
                  <Typography variant="h3" weight="semibold" style={{marginLeft: 8}}>
                    Low Stock Threshold
                  </Typography>
                </View>
                <Typography variant="small" color={theme.colors.gray[600]} style={styles.sectionDesc}>
                  Set the quantity threshold for RouteStar items. Items with
                  quantities below this value are marked as "Low Stock" on the
                  dashboard.
                </Typography>
                <Typography variant="small" weight="semibold" color={theme.colors.gray[700]} style={styles.formLabel}>
                  Threshold Quantity
                </Typography>
                <RNTextInput
                  style={styles.input}
                  value={lowStockThreshold}
                  onChangeText={setLowStockThreshold}
                  placeholder="e.g., 10"
                  placeholderTextColor={theme.colors.gray[400]}
                  keyboardType="number-pad"
                />
                {!!lowStockThreshold && (
                  <Typography variant="caption" color={theme.colors.gray[500]} style={{marginTop: 6}}>
                    Items with quantity below {lowStockThreshold} will be marked as low stock
                  </Typography>
                )}
                <View style={{marginTop: theme.spacing.md}}>
                  <Button
                    title={thresholdSaving ? 'Updating...' : 'Update Threshold'}
                    variant="primary"
                    onPress={handleUpdateLowStockThreshold}
                    disabled={!lowStockThreshold || thresholdSaving}
                    loading={thresholdSaving}
                    fullWidth
                  />
                </View>
              </Card>
            </View>
          </ScrollView>
        )}
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
    errorCard: {
      marginBottom: theme.spacing.lg,
      backgroundColor: theme.colors.error[50],
    },
    errorContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    sectionCard: {
      marginBottom: theme.spacing.lg,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    sectionDesc: {
      marginBottom: theme.spacing.md,
    },
    formLabel: {
      marginBottom: 6,
    },
    input: {
      backgroundColor: theme.colors.white,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: theme.typography.roles.body.fontSize,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
      color: theme.colors.gray[900],
    },
  });
