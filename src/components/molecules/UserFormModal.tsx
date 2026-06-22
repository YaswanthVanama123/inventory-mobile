import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput as RNTextInput,
  Alert,
  Switch,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../atoms/Typography';
import {Card} from '../atoms/Card';
import {Button} from '../atoms/Button';
import {PickerModal} from './PickerModal';
import {useTheme} from '../../contexts/ThemeContext';
import {Theme} from '../../theme';
import userService from '../../services/userService';
import screenPermissionService, {Screen} from '../../services/screenPermissionService';
import {ChevronDownIcon, EyeIcon, EyeOffIcon, AlertCircleIcon, CheckIcon} from '../icons';

interface UserFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string;
  user?: any | null;
}

export const UserFormModal: React.FC<UserFormModalProps> = ({
  visible,
  onClose,
  onSuccess,
  token,
  user,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const isEditMode = Boolean(user);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('employee');
  const [truckNumber, setTruckNumber] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rolePickerVisible, setRolePickerVisible] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    hasMinLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });
  // Screen permissions for new employees — mirrors webapp UserForm behavior.
  const [allScreens, setAllScreens] = useState<Screen[]>([]);
  const [defaultScreens, setDefaultScreens] = useState<Screen[]>([]);
  const [selectedScreenIds, setSelectedScreenIds] = useState<string[]>([]);
  const [loadingScreens, setLoadingScreens] = useState(false);

  // Load screens when a new employee is being created
  useEffect(() => {
    if (!isEditMode && role === 'employee' && visible && allScreens.length === 0 && token) {
      const fetchScreens = async () => {
        try {
          setLoadingScreens(true);
          const [screens, defaults] = await Promise.all([
            screenPermissionService.getAllScreens(token),
            screenPermissionService.getDefaultScreens(token),
          ]);
          setAllScreens(screens || []);
          setDefaultScreens(defaults || []);
        } catch (err) {
          console.error('Error fetching screens:', err);
        } finally {
          setLoadingScreens(false);
        }
      };
      fetchScreens();
    }
  }, [isEditMode, role, visible, token, allScreens.length]);

  const toggleScreen = (screenId: string) => {
    setSelectedScreenIds(prev =>
      prev.includes(screenId) ? prev.filter(id => id !== screenId) : [...prev, screenId],
    );
  };
  useEffect(() => {
    if (visible) {
      if (isEditMode && user) {
        setUsername(user.username || '');
        setEmail(user.email || '');
        setFullName(user.fullName || '');
        setRole(user.role || 'employee');
        setTruckNumber(user.truckNumber || '');
        setIsActive(user.isActive ?? true);
        setPassword('');
        setConfirmPassword('');
      } else {
        resetForm();
      }
    }
  }, [visible, user, isEditMode]);
  useEffect(() => {
    if (password) {
      setPasswordStrength({
        hasMinLength: password.length >= 8,
        hasUpperCase: /[A-Z]/.test(password),
        hasLowerCase: /[a-z]/.test(password),
        hasNumber: /[0-9]/.test(password),
        hasSpecialChar: /[@$!%*?&]/.test(password),
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
  }, [password]);
  const resetForm = () => {
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setRole('employee');
    setTruckNumber('');
    setIsActive(true);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setSelectedScreenIds([]);
  };
  const validateForm = (): string | null => {
    if (!isEditMode) {
      if (!username.trim()) return 'Username is required';
      if (username.length < 3 || username.length > 50) return 'Username must be 3-50 characters';
      if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Username can only contain letters, numbers, and underscores';
      if (!password) return 'Password is required';
      if (!Object.values(passwordStrength).every(Boolean)) return 'Password does not meet requirements';
      if (password !== confirmPassword) return 'Passwords do not match';
    } else {
      // In edit mode, password is optional but must meet requirements if provided
      if (password) {
        if (!Object.values(passwordStrength).every(Boolean)) return 'Password does not meet requirements';
        if (password !== confirmPassword) return 'Passwords do not match';
      }
    }
    if (!email.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Invalid email format';
    if (!fullName.trim()) return 'Full name is required';
    return null;
  };
  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      Alert.alert('Validation Error', validationError);
      return;
    }
    try {
      setSaving(true);
      if (isEditMode) {
        const updateData: any = {
          email: email.trim(),
          fullName: fullName.trim(),
          role,
          isActive,
          truckNumber: truckNumber.trim() || undefined,
        };
        // Include password if admin is resetting it
        if (password) {
          updateData.password = password;
        }
        await userService.update(token, user._id, updateData);
        Alert.alert('Success', password ? 'User updated and password reset successfully' : 'User updated successfully');
      } else {
        const created = await userService.create(token, {
          username: username.trim(),
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          role,
          truckNumber: truckNumber.trim() || undefined,
        });
        // For new employees, save selected screen permissions. Mirrors
        // webapp UserForm. Reads _id || id defensively because the backend
        // response includes both.
        if (role === 'employee') {
          try {
            const createdUser = created?.user || {};
            const newUserId = createdUser._id || createdUser.id;
            if (newUserId) {
              await screenPermissionService.updateUserPermissions(
                token,
                newUserId,
                selectedScreenIds,
              );
            }
          } catch (permErr: any) {
            console.error('Error saving screen permissions:', permErr);
            Alert.alert(
              'Warning',
              'User created, but screen permissions update failed. You can update them later in Screen Permissions.',
            );
          }
        }
        Alert.alert('Success', 'User created successfully');
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || `Failed to ${isEditMode ? 'update' : 'create'} user`);
    } finally {
      setSaving(false);
    }
  };
  const handleRoleSelect = (value: string) => {
    setRole(value);
    setRolePickerVisible(false);
  };
  const roleOptions = [
    {label: 'Administrator', value: 'admin'},
    {label: 'Employee', value: 'employee'},
  ];
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
            {isEditMode ? 'Edit User' : 'Add User'}
          </Typography>
          <View style={styles.closeButton} />
        </View>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Username (Create only) */}
          {!isEditMode && (
            <View style={styles.inputSection}>
              <Typography variant="small" weight="semibold" style={styles.inputLabel}>
                Username *
              </Typography>
              <RNTextInput
                style={styles.textInput}
                placeholder="Enter username"
                value={username}
                onChangeText={setUsername}
                placeholderTextColor={theme.colors.gray[400]}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Typography variant="caption" color={theme.colors.gray[500]} style={{marginTop: 4}}>
                3-50 characters, letters, numbers, and underscores only
              </Typography>
            </View>
          )}
          {/* Email */}
          <View style={styles.inputSection}>
            <Typography variant="small" weight="semibold" style={styles.inputLabel}>
              Email *
            </Typography>
            <RNTextInput
              style={styles.textInput}
              placeholder="Enter email"
              value={email}
              onChangeText={setEmail}
              placeholderTextColor={theme.colors.gray[400]}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          {/* Full Name */}
          <View style={styles.inputSection}>
            <Typography variant="small" weight="semibold" style={styles.inputLabel}>
              Full Name *
            </Typography>
            <RNTextInput
              style={styles.textInput}
              placeholder="Enter full name"
              value={fullName}
              onChangeText={setFullName}
              placeholderTextColor={theme.colors.gray[400]}
              autoCapitalize="words"
            />
          </View>
          {/* Role */}
          <View style={styles.inputSection}>
            <Typography variant="small" weight="semibold" style={styles.inputLabel}>
              Role *
            </Typography>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setRolePickerVisible(true)}>
              <Typography variant="body" color={role ? theme.colors.gray[900] : theme.colors.gray[400]}>
                {role === 'admin' ? 'Administrator' : 'Employee'}
              </Typography>
              <ChevronDownIcon size={20} color={theme.colors.gray[400]} />
            </TouchableOpacity>
          </View>
          {/* Route Name */}
          <View style={styles.inputSection}>
            <Typography variant="small" weight="semibold" style={styles.inputLabel}>
              Route Name (Optional)
            </Typography>
            <RNTextInput
              style={styles.textInput}
              placeholder="Enter route name"
              value={truckNumber}
              onChangeText={setTruckNumber}
              placeholderTextColor={theme.colors.gray[400]}
              autoCapitalize="characters"
            />
          </View>
          {/* Screen Permissions (new employee only) — mirrors webapp UserForm */}
          {!isEditMode && role === 'employee' && (
            <Card variant="outlined" padding="md" style={styles.permissionsCard}>
              <Typography variant="small" weight="semibold" style={styles.inputLabel}>
                Screen Permissions
              </Typography>
              <Typography variant="caption" color={theme.colors.gray[500]} style={{marginBottom: 12}}>
                Default screens are always included. Tick any additional screens this employee can access.
              </Typography>
              {loadingScreens ? (
                <Typography variant="caption" color={theme.colors.gray[500]}>
                  Loading screens…
                </Typography>
              ) : (
                <>
                  {defaultScreens.length > 0 && (
                    <View style={styles.permissionsGroup}>
                      <View style={styles.permissionsGroupHeader}>
                        <CheckIcon size={14} color={theme.colors.success[600]} />
                        <Typography variant="caption" weight="semibold" color={theme.colors.gray[700]}>
                          Default (always included)
                        </Typography>
                      </View>
                      <View style={styles.permissionPillsRow}>
                        {defaultScreens.map(screen => (
                          <View key={screen._id} style={styles.permissionPillDefault}>
                            <CheckIcon size={12} color={theme.colors.success[700]} />
                            <Typography variant="caption" color={theme.colors.success[700]}>
                              {screen.displayName}
                            </Typography>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                  {allScreens.filter(s => !s.isDefault).length > 0 && (
                    <View style={styles.permissionsGroup}>
                      <Typography
                        variant="caption"
                        weight="semibold"
                        color={theme.colors.gray[700]}
                        style={{marginBottom: 8}}>
                        Additional (optional)
                      </Typography>
                      <View style={styles.permissionPillsRow}>
                        {allScreens
                          .filter(s => !s.isDefault)
                          .sort((a, b) => a.displayName.localeCompare(b.displayName))
                          .map(screen => {
                            const selected = selectedScreenIds.includes(screen._id);
                            return (
                              <TouchableOpacity
                                key={screen._id}
                                style={[
                                  styles.permissionPill,
                                  selected && styles.permissionPillSelected,
                                ]}
                                onPress={() => toggleScreen(screen._id)}
                                disabled={saving}
                                activeOpacity={0.7}>
                                {selected ? (
                                  <CheckIcon size={12} color={theme.colors.primary[700]} />
                                ) : null}
                                <Typography
                                  variant="caption"
                                  color={
                                    selected ? theme.colors.primary[700] : theme.colors.gray[700]
                                  }>
                                  {screen.displayName}
                                </Typography>
                              </TouchableOpacity>
                            );
                          })}
                      </View>
                    </View>
                  )}
                </>
              )}
            </Card>
          )}
          {/* Password */}
          {!isEditMode ? (
            <>
              <View style={styles.inputSection}>
                <Typography variant="small" weight="semibold" style={styles.inputLabel}>
                  Password *
                </Typography>
                <View style={styles.passwordInputContainer}>
                  <RNTextInput
                    style={styles.passwordInput}
                    placeholder="Enter password"
                    value={password}
                    onChangeText={setPassword}
                    placeholderTextColor={theme.colors.gray[400]}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? (
                      <EyeOffIcon size={20} color={theme.colors.gray[400]} />
                    ) : (
                      <EyeIcon size={20} color={theme.colors.gray[400]} />
                    )}
                  </TouchableOpacity>
                </View>
                {/* Password Strength Indicators */}
                {password && (
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
              <View style={styles.inputSection}>
                <Typography variant="small" weight="semibold" style={styles.inputLabel}>
                  Confirm Password *
                </Typography>
                <View style={styles.passwordInputContainer}>
                  <RNTextInput
                    style={styles.passwordInput}
                    placeholder="Confirm password"
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
                {confirmPassword && password !== confirmPassword && (
                  <View style={styles.errorRow}>
                    <AlertCircleIcon size={14} color={theme.colors.error[600]} />
                    <Typography variant="caption" color={theme.colors.error[600]}>
                      Passwords do not match
                    </Typography>
                  </View>
                )}
              </View>
            </>
          ) : (
            <>
              {/* Admin Password Reset Notice */}
              <Card variant="outlined" padding="md" style={styles.adminNoticeCard}>
                <View style={styles.adminNoticeRow}>
                  <AlertCircleIcon size={20} color={theme.colors.primary[600]} />
                  <View style={{flex: 1, marginLeft: 12}}>
                    <Typography variant="small" weight="semibold" color={theme.colors.primary[700]}>
                      Admin Password Reset
                    </Typography>
                    <Typography variant="caption" color={theme.colors.primary[600]} style={{marginTop: 2}}>
                      As an admin, you can reset this employee's password. Enter a new password below, or leave blank to keep the current password.
                    </Typography>
                  </View>
                </View>
              </Card>

              <View style={styles.inputSection}>
                <Typography variant="small" weight="semibold" style={styles.inputLabel}>
                  New Password (Optional)
                </Typography>
                <View style={styles.passwordInputContainer}>
                  <RNTextInput
                    style={styles.passwordInput}
                    placeholder="Leave blank to keep current"
                    value={password}
                    onChangeText={setPassword}
                    placeholderTextColor={theme.colors.gray[400]}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? (
                      <EyeOffIcon size={20} color={theme.colors.gray[400]} />
                    ) : (
                      <EyeIcon size={20} color={theme.colors.gray[400]} />
                    )}
                  </TouchableOpacity>
                </View>
                <Typography variant="caption" color={theme.colors.gray[500]} style={{marginTop: 4}}>
                  As admin, you can reset without knowing the current password
                </Typography>
                {/* Password Strength Indicators for Edit Mode */}
                {password && (
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
              <View style={styles.inputSection}>
                <Typography variant="small" weight="semibold" style={styles.inputLabel}>
                  Confirm New Password
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
                <Typography variant="caption" color={theme.colors.gray[500]} style={{marginTop: 4}}>
                  Required only if changing password
                </Typography>
                {confirmPassword && password !== confirmPassword && (
                  <View style={styles.errorRow}>
                    <AlertCircleIcon size={14} color={theme.colors.error[600]} />
                    <Typography variant="caption" color={theme.colors.error[600]}>
                      Passwords do not match
                    </Typography>
                  </View>
                )}
              </View>
            </>
          )}
          {/* Status (Edit only) */}
          {isEditMode && (
            <Card variant="outlined" padding="md" style={styles.statusCard}>
              <View style={styles.switchRow}>
                <View>
                  <Typography variant="small" weight="semibold">
                    Account Status
                  </Typography>
                  <Typography variant="caption" color={theme.colors.gray[500]} style={{marginTop: 2}}>
                    {isActive ? 'User can login' : 'User cannot login'}
                  </Typography>
                </View>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{false: theme.colors.gray[300], true: theme.colors.success[600]}}
                  thumbColor={theme.colors.white}
                />
              </View>
            </Card>
          )}
          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Button
              title={isEditMode ? 'Update User' : 'Create User'}
              variant="primary"
              onPress={handleSubmit}
              disabled={saving}
              fullWidth
            />
          </View>
        </ScrollView>
        {/* Role Picker Modal */}
        <PickerModal
          visible={rolePickerVisible}
          onClose={() => setRolePickerVisible(false)}
          items={roleOptions}
          selectedValue={role}
          onValueChange={handleRoleSelect}
          placeholder="Select Role"
          getLabel={(item) => item.label}
          getValue={(item) => item.value}
        />
      </SafeAreaView>
    </Modal>
  );
};
const makeStyles = (theme: Theme) => StyleSheet.create({
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
  inputSection: {
    marginBottom: theme.spacing.md,
  },
  inputLabel: {
    marginBottom: theme.spacing.sm,
    color: theme.colors.gray[700],
  },
  textInput: {
    backgroundColor: theme.colors.gray[100],
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: theme.typography.roles.sideheading.fontSize,
    color: theme.colors.gray[900],
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.gray[100],
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
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
    fontSize: theme.typography.roles.sideheading.fontSize,
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
  statusCard: {
    marginBottom: theme.spacing.md,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionButtons: {
    marginTop: theme.spacing.md,
  },
  adminNoticeCard: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.primary[50],
    borderColor: theme.colors.primary[200],
  },
  adminNoticeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  permissionsCard: {
    marginBottom: theme.spacing.md,
  },
  permissionsGroup: {
    marginTop: 8,
  },
  permissionsGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  permissionPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  permissionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
    backgroundColor: theme.colors.white,
  },
  permissionPillSelected: {
    backgroundColor: theme.colors.primary[50],
    borderColor: theme.colors.primary[200],
  },
  permissionPillDefault: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.success[200],
    backgroundColor: theme.colors.success[50],
  },
});
