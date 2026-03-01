import React, {useState, useEffect} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput as RNTextInput,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../atoms/Typography';
import {Card} from '../atoms/Card';
import {Button} from '../atoms/Button';
import {theme} from '../../theme';
import userService from '../../services/userService';
import {EyeIcon, EyeOffIcon, AlertCircleIcon, CheckIcon} from '../icons';

interface ResetPasswordModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string;
  user: any;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  visible,
  onClose,
  onSuccess,
  token,
  user,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  // Password strength
  const [passwordStrength, setPasswordStrength] = useState({
    hasMinLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });

  useEffect(() => {
    if (visible) {
      resetForm();
    }
  }, [visible]);

  useEffect(() => {
    // Check password strength
    if (newPassword) {
      setPasswordStrength({
        hasMinLength: newPassword.length >= 8,
        hasUpperCase: /[A-Z]/.test(newPassword),
        hasLowerCase: /[a-z]/.test(newPassword),
        hasNumber: /[0-9]/.test(newPassword),
        hasSpecialChar: /[@$!%*?&]/.test(newPassword),
      });
    } else {
      setPasswordStrength({
        hasMinLength: false,
        hasUpperCase: false,
        hasLowerCase: false,
        hasNumber: false,
        hasSpecialChar: false,
      });
    }
  }, [newPassword]);

  const resetForm = () => {
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const validateForm = (): string | null => {
    if (!newPassword) return 'Password is required';
    if (!Object.values(passwordStrength).every(Boolean)) return 'Password does not meet requirements';
    if (newPassword !== confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      Alert.alert('Validation Error', validationError);
      return;
    }

    Alert.alert(
      'Reset Password',
      `Are you sure you want to reset the password for ${user.fullName}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              await userService.resetPassword(token, user._id, newPassword);
              Alert.alert('Success', 'Password reset successfully');
              onSuccess();
              onClose();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to reset password');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
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
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Typography variant="body" color={theme.colors.primary[600]} weight="semibold">
              Cancel
            </Typography>
          </TouchableOpacity>
          <Typography variant="h3" weight="bold" style={styles.modalTitle}>
            Reset Password
          </Typography>
          <View style={styles.closeButton} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* User Info Card */}
          <Card variant="elevated" padding="md" style={styles.userInfoCard}>
            <Typography variant="small" color={theme.colors.gray[600]}>
              Resetting password for:
            </Typography>
            <Typography variant="body" weight="bold" style={{marginTop: 4}}>
              {user?.fullName}
            </Typography>
            <Typography variant="caption" color={theme.colors.gray[500]}>
              @{user?.username}
            </Typography>
          </Card>

          {/* Warning Notice */}
          <Card variant="outlined" padding="md" style={styles.warningCard}>
            <View style={styles.warningContent}>
              <AlertCircleIcon size={20} color={theme.colors.warning[600]} />
              <Typography variant="caption" color={theme.colors.warning[700]} style={{flex: 1}}>
                The user will need to use this new password to login. Make sure to communicate this securely.
              </Typography>
            </View>
          </Card>

          {/* New Password */}
          <View style={styles.inputSection}>
            <Typography variant="small" weight="semibold" style={styles.inputLabel}>
              New Password *
            </Typography>
            <View style={styles.passwordInputContainer}>
              <RNTextInput
                style={styles.passwordInput}
                placeholder="Enter new password"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholderTextColor={theme.colors.gray[400]}
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowNewPassword(!showNewPassword)}>
                {showNewPassword ? (
                  <EyeOffIcon size={20} color={theme.colors.gray[400]} />
                ) : (
                  <EyeIcon size={20} color={theme.colors.gray[400]} />
                )}
              </TouchableOpacity>
            </View>

            {/* Password Strength Indicators */}
            {newPassword && (
              <Card variant="outlined" padding="sm" style={styles.strengthCard}>
                <Typography variant="caption" weight="semibold" style={{marginBottom: 6}}>
                  Password Requirements:
                </Typography>
                <View style={styles.requirementRow}>
                  <CheckIcon
                    size={14}
                    color={passwordStrength.hasMinLength ? theme.colors.success[600] : theme.colors.gray[400]}
                  />
                  <Typography
                    variant="caption"
                    color={passwordStrength.hasMinLength ? theme.colors.success[700] : theme.colors.gray[600]}>
                    At least 8 characters
                  </Typography>
                </View>
                <View style={styles.requirementRow}>
                  <CheckIcon
                    size={14}
                    color={passwordStrength.hasUpperCase ? theme.colors.success[600] : theme.colors.gray[400]}
                  />
                  <Typography
                    variant="caption"
                    color={passwordStrength.hasUpperCase ? theme.colors.success[700] : theme.colors.gray[600]}>
                    One uppercase letter
                  </Typography>
                </View>
                <View style={styles.requirementRow}>
                  <CheckIcon
                    size={14}
                    color={passwordStrength.hasLowerCase ? theme.colors.success[600] : theme.colors.gray[400]}
                  />
                  <Typography
                    variant="caption"
                    color={passwordStrength.hasLowerCase ? theme.colors.success[700] : theme.colors.gray[600]}>
                    One lowercase letter
                  </Typography>
                </View>
                <View style={styles.requirementRow}>
                  <CheckIcon
                    size={14}
                    color={passwordStrength.hasNumber ? theme.colors.success[600] : theme.colors.gray[400]}
                  />
                  <Typography
                    variant="caption"
                    color={passwordStrength.hasNumber ? theme.colors.success[700] : theme.colors.gray[600]}>
                    One number
                  </Typography>
                </View>
                <View style={styles.requirementRow}>
                  <CheckIcon
                    size={14}
                    color={passwordStrength.hasSpecialChar ? theme.colors.success[600] : theme.colors.gray[400]}
                  />
                  <Typography
                    variant="caption"
                    color={passwordStrength.hasSpecialChar ? theme.colors.success[700] : theme.colors.gray[600]}>
                    One special character (@$!%*?&)
                  </Typography>
                </View>
              </Card>
            )}
          </View>

          {/* Confirm Password */}
          <View style={styles.inputSection}>
            <Typography variant="small" weight="semibold" style={styles.inputLabel}>
              Confirm Password *
            </Typography>
            <View style={styles.passwordInputContainer}>
              <RNTextInput
                style={styles.passwordInput}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholderTextColor={theme.colors.gray[400]}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                {showConfirmPassword ? (
                  <EyeOffIcon size={20} color={theme.colors.gray[400]} />
                ) : (
                  <EyeIcon size={20} color={theme.colors.gray[400]} />
                )}
              </TouchableOpacity>
            </View>
            {confirmPassword && newPassword !== confirmPassword && (
              <View style={styles.errorRow}>
                <AlertCircleIcon size={14} color={theme.colors.error[600]} />
                <Typography variant="caption" color={theme.colors.error[600]}>
                  Passwords do not match
                </Typography>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Button
              title="Reset Password"
              variant="danger"
              onPress={handleSubmit}
              disabled={saving}
              fullWidth
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  closeButton: {
    paddingVertical: 4,
    width: 60,
  },
  modalTitle: {
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
  },
  userInfoCard: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.primary[50],
  },
  warningCard: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.warning[50],
    borderColor: theme.colors.warning[300],
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  inputSection: {
    marginBottom: theme.spacing.md,
  },
  inputLabel: {
    marginBottom: theme.spacing.sm,
    color: theme.colors.gray[700],
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.gray[100],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.gray[900],
  },
  eyeButton: {
    padding: 12,
  },
  strengthCard: {
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.gray[50],
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  actionButtons: {
    marginTop: theme.spacing.md,
  },
});
