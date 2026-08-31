import React, {useState, useMemo} from 'react';
import {View, StyleSheet, Modal, TextInput as RNTextInput, Alert} from 'react-native';
import {Typography} from '../atoms/Typography';
import {Button} from '../atoms/Button';
import {useAuth} from '../../contexts/AuthContext';
import {useTheme} from '../../contexts/ThemeContext';
import {Theme} from '../../theme';
import dataPurgeService, {PURGE_CONFIRM_PHRASE} from '../../services/dataPurgeService';
import {TrashIcon} from '../icons';

export interface BulkPurgeBarProps {
  /** Purge type key, e.g. 'truck-checkouts' (see dataPurge.service). */
  type: string;
  /** Human name used in the confirmation copy. */
  label: string;
  /** Ids of the currently ticked rows. */
  selectedIds?: string[];
  /** Called after a successful purge so the list can refetch. */
  onDone?: () => void;
}

/**
 * Admin-only bulk purge controls for a list screen.
 *
 * "Delete Selected" removes the ticked rows; "Delete All" removes every record
 * of the type and is gated behind typing the confirm phrase. Both are
 * permanent — no trash, no restore. Renders nothing for non-admins.
 */
export const BulkPurgeBar: React.FC<BulkPurgeBarProps> = ({
  type,
  label,
  selectedIds = [],
  onDone,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const {token, user} = useAuth();
  const isAdmin = user?.role === 'admin';

  const [confirmMode, setConfirmMode] = useState<'selected' | 'all' | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [purging, setPurging] = useState(false);

  if (!isAdmin) return null;

  const closeConfirm = () => {
    setConfirmMode(null);
    setConfirmText('');
  };

  const runPurge = async () => {
    if (!token || !confirmMode) return;
    try {
      setPurging(true);
      if (confirmMode === 'selected') {
        const res = await dataPurgeService.purgeSelected(token, type, selectedIds);
        Alert.alert('Deleted', `Permanently deleted ${res?.deleted ?? selectedIds.length} record(s)`);
      } else {
        const res = await dataPurgeService.purgeAll(token, type);
        Alert.alert('Deleted', `Permanently deleted all ${res?.deleted ?? 0} record(s)`);
      }
      closeConfirm();
      onDone?.();
    } catch (err: any) {
      Alert.alert('Delete failed', err.message || 'Failed to delete records');
    } finally {
      setPurging(false);
    }
  };

  // Deleting a few ticked rows is routine; wiping the whole collection is not,
  // so only that one demands the typed phrase.
  const needsPhrase = confirmMode === 'all';
  const canConfirm = !purging && (!needsPhrase || confirmText === PURGE_CONFIRM_PHRASE);

  return (
    <>
      <View style={styles.bar}>
        <Button
          title={`Delete Selected (${selectedIds.length})`}
          variant="danger"
          size="sm"
          onPress={() => setConfirmMode('selected')}
          disabled={selectedIds.length === 0 || purging}
          style={{flex: 1}}
        />
        <Button
          title="Delete All"
          variant="danger"
          size="sm"
          onPress={() => setConfirmMode('all')}
          disabled={purging}
          style={{flex: 1}}
        />
      </View>

      <Modal
        visible={Boolean(confirmMode)}
        animationType="fade"
        transparent
        onRequestClose={closeConfirm}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <TrashIcon size={22} color={theme.colors.error[600]} />
            </View>
            <Typography variant="h3" weight="bold" align="center">
              Permanently delete
            </Typography>
            <Typography
              variant="small"
              color={theme.colors.error[700]}
              align="center"
              style={{marginTop: 8}}>
              {confirmMode === 'selected'
                ? `Permanently delete ${selectedIds.length} selected ${label} record(s)?`
                : `Permanently delete EVERY ${label} record?`}
            </Typography>
            <Typography
              variant="caption"
              color={theme.colors.gray[600]}
              align="center"
              style={{marginTop: 6}}>
              This cannot be undone. Related stock movements are deleted too and the affected
              stock summaries are rebuilt.
            </Typography>

            {needsPhrase && (
              <>
                <Typography
                  variant="caption"
                  weight="semibold"
                  color={theme.colors.gray[600]}
                  style={{marginTop: 16, marginBottom: 6}}>
                  Type {PURGE_CONFIRM_PHRASE} to confirm
                </Typography>
                <RNTextInput
                  style={styles.input}
                  value={confirmText}
                  onChangeText={setConfirmText}
                  placeholder={PURGE_CONFIRM_PHRASE}
                  placeholderTextColor={theme.colors.gray[400]}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              </>
            )}

            <View style={styles.actions}>
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
                disabled={!canConfirm}
                style={{flex: 1}}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    bar: {flexDirection: 'row', gap: theme.spacing.sm},
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.lg,
    },
    card: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: theme.colors.white,
      borderRadius: 16,
      padding: theme.spacing.lg,
    },
    iconWrap: {
      alignSelf: 'center',
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: theme.colors.error[50],
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.md,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.gray[300],
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: theme.typography.roles.body.fontSize,
      color: theme.colors.gray[900],
      backgroundColor: theme.colors.background.secondary,
    },
    actions: {flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.lg},
  });

export default BulkPurgeBar;
