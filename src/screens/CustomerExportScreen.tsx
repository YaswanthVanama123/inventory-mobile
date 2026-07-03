import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput as RNTextInput,
  Share,
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
import reportService from '../services/reportService';
import {
  AlertCircleIcon,
  CheckCircleIcon,
  FileTextIcon,
  UserIcon,
} from '../components/icons';

interface CustomerExportScreenProps {
  visible: boolean;
  onClose: () => void;
}

const fmt = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Count CSV data rows (excludes the header line and blank trailing lines).
const countRows = (csv: string): number => {
  const lines = csv.split(/\r?\n/).filter(l => l.trim().length > 0);
  return Math.max(0, lines.length - 1);
};

export const CustomerExportScreen: React.FC<CustomerExportScreenProps> = ({
  visible,
  onClose,
}) => {
  const theme = useTheme();
  const bp = useBreakpoint();
  const styles = useMemo(() => makeStyles(theme, bp), [theme, bp]);
  const {token} = useAuth();
  const {handleApiError} = useApiErrorHandler();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [csv, setCsv] = useState<string | null>(null);
  const [rowCount, setRowCount] = useState(0);

  useEffect(() => {
    if (visible) {
      const today = new Date();
      const thirtyAgo = new Date();
      thirtyAgo.setDate(today.getDate() - 30);
      setEndDate(fmt(today));
      setStartDate(fmt(thirtyAgo));
      setCsv(null);
      setRowCount(0);
      setError(null);
    }
  }, [visible]);

  const handleExport = async () => {
    setError(null);
    setCsv(null);
    setRowCount(0);

    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError('Start date must be before end date');
      return;
    }
    if (!token) return;

    try {
      setLoading(true);
      const text = await reportService.exportCustomers(token, startDate, endDate);
      setCsv(text);
      setRowCount(countRows(text));
    } catch (e: any) {
      const handled = await handleApiError(e);
      if (!handled) {
        setError(e?.message || 'Failed to export customers');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!csv) return;
    try {
      await Share.share({
        title: `routestar_customers_${startDate}_to_${endDate}.csv`,
        message: csv,
      });
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Unable to share export');
    }
  };

  // Preview: header + first few data lines so the user can sanity-check.
  const previewLines = useMemo(() => {
    if (!csv) return [];
    return csv.split(/\r?\n/).filter(l => l.trim().length > 0).slice(0, 6);
  }, [csv]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Typography variant="body" color={theme.colors.primary[600]} weight="semibold">
              Close
            </Typography>
          </TouchableOpacity>
          <Typography variant="h3" weight="bold" style={styles.modalTitle}>
            Export Customers
          </Typography>
          <View style={styles.refreshButton} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.contentWrap}>
            <Typography variant="body" color={theme.colors.gray[600]} style={styles.intro}>
              Export unique RouteStar customers from closed invoices within a date
              range.
            </Typography>

            <Card variant="elevated" padding="lg" style={styles.section}>
              <Typography variant="body" weight="bold" style={styles.sectionTitle}>
                Select Date Range
              </Typography>

              <View style={styles.formField}>
                <Typography variant="caption" color={theme.colors.gray[600]} weight="semibold" style={styles.formLabel}>
                  Start Date
                </Typography>
                <RNTextInput
                  style={styles.formInput}
                  placeholder="YYYY-MM-DD"
                  value={startDate}
                  onChangeText={setStartDate}
                  autoCapitalize="none"
                  placeholderTextColor={theme.colors.gray[400]}
                />
              </View>

              <View style={styles.formField}>
                <Typography variant="caption" color={theme.colors.gray[600]} weight="semibold" style={styles.formLabel}>
                  End Date
                </Typography>
                <RNTextInput
                  style={styles.formInput}
                  placeholder="YYYY-MM-DD"
                  value={endDate}
                  onChangeText={setEndDate}
                  autoCapitalize="none"
                  placeholderTextColor={theme.colors.gray[400]}
                />
              </View>

              {error && (
                <View style={styles.inlineError}>
                  <AlertCircleIcon size={18} color={theme.colors.error[500]} />
                  <Typography variant="small" color={theme.colors.error[700]} style={styles.errorText}>
                    {error}
                  </Typography>
                </View>
              )}

              <Button
                title={loading ? 'Exporting...' : 'Generate Export'}
                variant="primary"
                onPress={handleExport}
                disabled={loading}
                loading={loading}
                leftIcon={!loading ? <FileTextIcon size={16} color={theme.colors.white} /> : undefined}
                fullWidth
              />
            </Card>

            {csv !== null && (
              <Card variant="elevated" padding="lg" style={styles.section}>
                <View style={styles.resultHeader}>
                  <CheckCircleIcon size={20} color={theme.colors.success[600]} />
                  <Typography variant="body" weight="bold" color={theme.colors.success[700]} style={{marginLeft: 8}}>
                    Export ready
                  </Typography>
                </View>

                <View style={styles.countRow}>
                  <UserIcon size={18} color={theme.colors.gray[600]} />
                  <Typography variant="body" weight="semibold" style={{marginLeft: 8}}>
                    {rowCount} customer{rowCount === 1 ? '' : 's'}
                  </Typography>
                </View>

                {previewLines.length > 0 && (
                  <View style={styles.previewBox}>
                    <Typography variant="caption" color={theme.colors.gray[500]} weight="semibold" style={{marginBottom: 6}}>
                      Preview
                    </Typography>
                    {previewLines.map((line, idx) => (
                      <Typography
                        key={idx}
                        variant="caption"
                        color={idx === 0 ? theme.colors.gray[700] : theme.colors.gray[600]}
                        weight={idx === 0 ? 'semibold' : 'normal'}
                        numberOfLines={1}
                        style={styles.previewLine}>
                        {line}
                      </Typography>
                    ))}
                    {rowCount > previewLines.length - 1 && (
                      <Typography variant="caption" color={theme.colors.gray[400]} style={{marginTop: 4}}>
                        ...and more
                      </Typography>
                    )}
                  </View>
                )}

                <Button
                  title="Share CSV"
                  variant="outline"
                  onPress={handleShare}
                  fullWidth
                  style={{marginTop: theme.spacing.md}}
                />
                <Typography variant="caption" color={theme.colors.gray[500]} align="center" style={{marginTop: 8}}>
                  Full CSV file download is available on the web app.
                </Typography>
              </Card>
            )}

            <Card variant="outlined" padding="lg" style={styles.section}>
              <Typography variant="body" weight="bold" style={styles.sectionTitle}>
                Export Information
              </Typography>
              <Typography variant="small" color={theme.colors.gray[600]} style={styles.infoLine}>
                Format: CSV (Comma Separated Values)
              </Typography>
              <Typography variant="small" color={theme.colors.gray[600]} style={styles.infoLine}>
                Date filter: based on invoice date from closed invoices
              </Typography>
              <Typography variant="small" color={theme.colors.gray[600]} style={styles.infoLine}>
                Fields: Customer Name, Address, City, State, Pincode, Email, Phone
              </Typography>
              <Typography variant="caption" color={theme.colors.gray[500]} style={{marginTop: theme.spacing.sm, fontStyle: 'italic'}}>
                Only unique customers (case-insensitive) from closed invoices in the
                selected range are exported.
              </Typography>
            </Card>
          </View>
        </ScrollView>
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
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: theme.spacing.xl,
    },
    contentWrap: {
      width: '100%',
      maxWidth: bp.contentMaxWidth,
      alignSelf: 'center',
      paddingHorizontal: bp.gutter,
      paddingTop: theme.spacing.lg,
    },
    intro: {
      marginBottom: theme.spacing.md,
    },
    section: {
      marginBottom: theme.spacing.md,
    },
    sectionTitle: {
      marginBottom: theme.spacing.md,
    },
    formField: {
      marginBottom: theme.spacing.md,
    },
    formLabel: {
      marginBottom: 6,
    },
    formInput: {
      backgroundColor: theme.colors.white,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: theme.typography.roles.body.fontSize,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
      color: theme.colors.gray[900],
    },
    inlineError: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: theme.spacing.md,
      padding: theme.spacing.sm,
      borderRadius: 8,
      backgroundColor: theme.colors.error[50],
    },
    errorText: {
      flex: 1,
    },
    resultHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    countRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    previewBox: {
      backgroundColor: theme.colors.gray[50],
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
      padding: theme.spacing.md,
    },
    previewLine: {
      marginBottom: 2,
    },
    infoLine: {
      marginBottom: 6,
    },
  });
