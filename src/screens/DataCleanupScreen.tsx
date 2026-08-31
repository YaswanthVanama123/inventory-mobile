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
  RefreshControl,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {Button} from '../components/atoms/Button';
import {Checkbox} from '../components/atoms/Checkbox';
import {ModalHeader} from '../components/molecules/ModalHeader';
import {useAuth} from '../contexts/AuthContext';
import {useTheme} from '../contexts/ThemeContext';
import {Theme} from '../theme';
import {useBreakpoint, BreakpointInfo} from '../utils/breakpoints';
import dataPurgeService, {
  PurgeType,
  PURGE_CONFIRM_PHRASE,
} from '../services/dataPurgeService';
import {WarningIcon, RefreshIcon, TrashIcon} from '../components/icons';

interface DataCleanupScreenProps {
  visible: boolean;
  onClose: () => void;
}

const GROUP_ORDER = ['Orders', 'Operations', 'Stock', 'Synced Data', 'Master Data', 'System'];

type ConfirmTarget =
  | {mode: 'single'; type: PurgeType}
  | {mode: 'bulk'; type: null}
  | null;

export const DataCleanupScreen: React.FC<DataCleanupScreenProps> = ({visible, onClose}) => {
  const theme = useTheme();
  const bp = useBreakpoint();
  const styles = useMemo(() => makeStyles(theme, bp), [theme, bp]);
  const {token, user} = useAuth();
  const isAdmin = user?.role === 'admin';

  const [types, setTypes] = useState<PurgeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [purging, setPurging] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget>(null);
  const [confirmText, setConfirmText] = useState('');

  const loadTypes = useCallback(async () => {
    if (!token) return;
    try {
      const res = await dataPurgeService.getTypes(token);
      setTypes(res.types);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load data types');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    if (visible && token && isAdmin) {
      setLoading(true);
      loadTypes();
    }
  }, [visible, token, isAdmin, loadTypes]);

  const grouped = useMemo(() => {
    const map = new Map<string, PurgeType[]>();
    types.forEach(type => {
      const list = map.get(type.group) || [];
      list.push(type);
      map.set(type.group, list);
    });
    return Array.from(map.entries()).sort(
      (a, b) => GROUP_ORDER.indexOf(a[0]) - GROUP_ORDER.indexOf(b[0]),
    );
  }, [types]);

  const totalRecords = types.reduce((sum, t) => sum + t.count, 0);
  const selectedTypes = types.filter(t => selected.has(t.key));
  const selectedRecords = selectedTypes.reduce((sum, t) => sum + t.count, 0);

  const toggleSelected = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const openConfirm = (target: Exclude<ConfirmTarget, null>) => {
    if (target.mode === 'bulk' && selectedTypes.length === 0) {
      Alert.alert('Nothing selected', 'Select at least one data type first');
      return;
    }
    if (target.mode === 'single' && target.type.count === 0) {
      Alert.alert('Already empty', `${target.type.label} has no records`);
      return;
    }
    setConfirmText('');
    setConfirmTarget(target);
  };

  const closeConfirm = () => {
    setConfirmTarget(null);
    setConfirmText('');
  };

  const runPurge = async () => {
    if (!confirmTarget || !token) return;
    try {
      setPurging(true);
      if (confirmTarget.mode === 'single') {
        const res = await dataPurgeService.purgeAll(token, confirmTarget.type.key);
        Alert.alert(
          'Deleted',
          `Permanently deleted ${res?.deleted ?? 0} ${confirmTarget.type.label} record(s)`,
        );
      } else {
        const res = await dataPurgeService.purgeManyTypes(
          token,
          selectedTypes.map(t => t.key),
        );
        if (res?.failed?.length) {
          Alert.alert('Partly failed', `${res.failed.length} data type(s) could not be purged`);
        } else {
          Alert.alert('Deleted', `Permanently deleted ${res?.totalDeleted ?? 0} record(s)`);
        }
        setSelected(new Set());
      }
      closeConfirm();
      loadTypes();
    } catch (err: any) {
      Alert.alert('Purge failed', err.message || 'Failed to delete records');
    } finally {
      setPurging(false);
    }
  };

  const confirmLabel =
    confirmTarget?.mode === 'single'
      ? `${confirmTarget.type.count} ${confirmTarget.type.label} record(s)`
      : `${selectedRecords} record(s) across ${selectedTypes.length} data type(s)`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ModalHeader
          title="Data Cleanup"
          subtitle="Permanently remove production records"
          onClose={onClose}
        />

        {!isAdmin ? (
          <View style={styles.centered}>
            <WarningIcon size={32} color={theme.colors.warning[600]} />
            <Typography variant="body" color={theme.colors.gray[600]} style={{marginTop: 12}}>
              Administrators only.
            </Typography>
          </View>
        ) : loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.colors.primary[600]} />
            <Typography variant="body" color={theme.colors.gray[600]} style={{marginTop: 16}}>
              Loading data types...
            </Typography>
          </View>
        ) : (
          <>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => {
                    setRefreshing(true);
                    loadTypes();
                  }}
                />
              }>
              <Card variant="outlined" padding="lg" style={styles.warningCard}>
                <View style={styles.warningRow}>
                  <WarningIcon size={22} color={theme.colors.error[600]} />
                  <View style={{flex: 1}}>
                    <Typography variant="small" weight="bold" color={theme.colors.error[700]}>
                      These deletes cannot be undone.
                    </Typography>
                    <Typography
                      variant="caption"
                      color={theme.colors.error[700]}
                      style={{marginTop: 4}}>
                      Records are removed immediately — they do not go to Trash. Related stock
                      movements are deleted with them and the affected stock summaries are
                      rebuilt. Synced data returns on the next sync.
                    </Typography>
                  </View>
                </View>
              </Card>

              <View style={styles.summaryRow}>
                <Typography variant="caption" color={theme.colors.gray[600]}>
                  {totalRecords.toLocaleString()} records · {types.length} data types
                </Typography>
                <TouchableOpacity
                  onPress={loadTypes}
                  style={styles.refreshBtn}
                  activeOpacity={0.8}>
                  <RefreshIcon size={16} color={theme.colors.primary[600]} />
                </TouchableOpacity>
              </View>

              {grouped.map(([group, groupTypes]) => (
                <View key={group} style={styles.group}>
                  <Typography
                    variant="caption"
                    weight="semibold"
                    color={theme.colors.primary[600]}
                    style={styles.groupTitle}>
                    {group.toUpperCase()}
                  </Typography>
                  {groupTypes.map(type => (
                    <Card
                      key={type.key}
                      variant="elevated"
                      padding="md"
                      style={StyleSheet.flatten([
                        styles.typeCard,
                        selected.has(type.key) && styles.typeCardSelected,
                      ])}>
                      <View style={styles.typeRow}>
                        <Checkbox
                          checked={selected.has(type.key)}
                          onChange={() => toggleSelected(type.key)}
                        />
                        <View style={styles.typeInfo}>
                          <Typography variant="body" weight="semibold" numberOfLines={1}>
                            {type.label}
                          </Typography>
                          <Typography variant="caption" color={theme.colors.gray[500]}>
                            {type.description}
                          </Typography>
                        </View>
                        <View style={styles.countWrap}>
                          <Typography
                            variant="h3"
                            weight="bold"
                            color={
                              type.count > 0 ? theme.colors.gray[900] : theme.colors.gray[400]
                            }>
                            {type.count.toLocaleString()}
                          </Typography>
                        </View>
                      </View>
                      <Button
                        title="Delete All"
                        variant="danger"
                        onPress={() => openConfirm({mode: 'single', type})}
                        disabled={type.count === 0 || purging}
                        fullWidth
                        style={{marginTop: 10}}
                      />
                    </Card>
                  ))}
                </View>
              ))}
            </ScrollView>

            <View style={styles.footer}>
              {selectedTypes.length > 0 && (
                <Typography
                  variant="caption"
                  weight="semibold"
                  color={theme.colors.error[700]}
                  style={{marginBottom: 8}}>
                  {selectedRecords.toLocaleString()} record(s) selected across{' '}
                  {selectedTypes.length} type(s)
                </Typography>
              )}
              <Button
                title={`Delete Selected Types (${selectedTypes.length})`}
                variant="danger"
                onPress={() => openConfirm({mode: 'bulk', type: null})}
                disabled={selectedTypes.length === 0 || purging}
                fullWidth
              />
            </View>
          </>
        )}

        <Modal
          visible={Boolean(confirmTarget)}
          animationType="fade"
          transparent
          onRequestClose={closeConfirm}>
          <View style={styles.confirmOverlay}>
            <View style={styles.confirmCard}>
              <View style={styles.confirmIconWrap}>
                <TrashIcon size={22} color={theme.colors.error[600]} />
              </View>
              <Typography variant="h3" weight="bold" align="center">
                Permanently delete data
              </Typography>
              <Typography
                variant="small"
                color={theme.colors.error[700]}
                align="center"
                style={{marginTop: 8}}>
                You are about to permanently delete {confirmLabel}. This cannot be undone.
              </Typography>

              <Typography
                variant="caption"
                weight="semibold"
                color={theme.colors.gray[600]}
                style={{marginTop: 16, marginBottom: 6}}>
                Type {PURGE_CONFIRM_PHRASE} to confirm
              </Typography>
              <RNTextInput
                style={styles.confirmInput}
                value={confirmText}
                onChangeText={setConfirmText}
                placeholder={PURGE_CONFIRM_PHRASE}
                placeholderTextColor={theme.colors.gray[400]}
                autoCapitalize="characters"
                autoCorrect={false}
              />

              <View style={styles.confirmActions}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={closeConfirm}
                  disabled={purging}
                  style={{flex: 1}}
                />
                <Button
                  title={purging ? 'Deleting...' : 'Delete'}
                  variant="danger"
                  onPress={runPurge}
                  disabled={confirmText !== PURGE_CONFIRM_PHRASE || purging}
                  style={{flex: 1}}
                />
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
    container: {flex: 1, backgroundColor: theme.colors.background.secondary},
    centered: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl},
    scroll: {flex: 1},
    scrollContent: {
      padding: bp.gutter,
      paddingBottom: theme.spacing.xxxl,
      width: '100%',
      maxWidth: bp.contentMaxWidth,
      alignSelf: 'center',
    },
    warningCard: {
      backgroundColor: theme.colors.error[50],
      borderColor: theme.colors.error[200],
      marginBottom: theme.spacing.md,
    },
    warningRow: {flexDirection: 'row', gap: 12},
    summaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.md,
    },
    refreshBtn: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: theme.colors.primary[50],
      alignItems: 'center',
      justifyContent: 'center',
    },
    group: {marginBottom: theme.spacing.lg},
    groupTitle: {letterSpacing: 1.2, marginBottom: theme.spacing.sm},
    typeCard: {marginBottom: theme.spacing.sm},
    typeCardSelected: {
      borderWidth: 1,
      borderColor: theme.colors.error[300],
      backgroundColor: theme.colors.error[50],
    },
    typeRow: {flexDirection: 'row', alignItems: 'center', gap: 10},
    typeInfo: {flex: 1, gap: 2},
    countWrap: {alignItems: 'flex-end', minWidth: 60},
    footer: {
      padding: bp.gutter,
      borderTopWidth: 1,
      borderTopColor: theme.colors.gray[200],
      backgroundColor: theme.colors.white,
    },

    confirmOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.lg,
    },
    confirmCard: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: theme.colors.white,
      borderRadius: 16,
      padding: theme.spacing.lg,
    },
    confirmIconWrap: {
      alignSelf: 'center',
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: theme.colors.error[50],
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.md,
    },
    confirmInput: {
      borderWidth: 1,
      borderColor: theme.colors.gray[300],
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: theme.typography.roles.body.fontSize,
      color: theme.colors.gray[900],
      backgroundColor: theme.colors.background.secondary,
    },
    confirmActions: {flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.lg},
  });
