import React, {useState} from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {Button} from '../components/atoms/Button';
import {TextInput} from '../components/atoms/TextInput';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {Checkbox} from '../components/atoms/Checkbox';
import {ToggleButtonGroup} from '../components/molecules/ToggleButtonGroup';
import {ErrorAlert} from '../components/molecules/ErrorAlert';
import {useAuth} from '../contexts/AuthContext';
import {theme} from '../theme';
import {
  BoxIcon,
  ShieldIcon,
  UserIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  ArrowRightIcon,
} from '../components/icons';

export const LoginScreen = () => {
  const {login} = useAuth();

  const [loginType, setLoginType] = useState<'admin' | 'employee'>('admin');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    username?: string;
    password?: string;
  }>({});
  const [showPassword, setShowPassword] = useState(false);

  const loginOptions = [
    {
      value: 'admin',
      label: 'Administrator',
      icon: <ShieldIcon size={16} color={loginType === 'admin' ? theme.colors.primary[600] : theme.colors.gray[600]} />,
    },
    {
      value: 'employee',
      label: 'Employee',
      icon: <UserIcon size={16} color={loginType === 'employee' ? theme.colors.primary[600] : theme.colors.gray[600]} />,
    },
  ];

  const validateForm = () => {
    const errors: {username?: string; password?: string} = {};

    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (name: 'username' | 'password', value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    if (fieldErrors[name]) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }

    if (error) {
      setError('');
    }
  };

  const handleSubmit = async () => {
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const result = await login(
        formData.username,
        formData.password,
        loginType,
      );

      if (result.success) {
        // TODO: Save rememberMe to AsyncStorage if needed
        // TODO: Navigate to Dashboard
        Alert.alert('Success', 'Login successful!');
      } else {
        setError(result.error || 'Invalid credentials. Please try again.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(
        err.userMessage ||
          err.message ||
          'An error occurred. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.background}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <BoxIcon size={32} color={theme.colors.white} />
            </View>
            <Typography variant="h2" weight="bold" align="center">
              Welcome Back
            </Typography>
            <Typography
              variant="small"
              color={theme.colors.gray[600]}
              align="center"
              style={styles.subtitle}>
              Sign in to access your dashboard
            </Typography>
          </View>

          <Card variant="elevated" padding="lg" style={styles.card}>
            {/* Blue stripe */}
            <View style={styles.blueStripe} />

            {/* Login Type Toggle */}
            <ToggleButtonGroup
              options={loginOptions}
              value={loginType}
              onChange={value => {
                setLoginType(value as 'admin' | 'employee');
                setError('');
                setFieldErrors({});
              }}
            />

            {/* Error Alert */}
            {error ? (
              <ErrorAlert message={error} style={styles.errorAlert} />
            ) : null}

            {/* Form */}
            <View style={styles.form}>
              {/* Username */}
              <TextInput
                label="Username"
                placeholder="Enter your username"
                value={formData.username}
                onChangeText={text => handleChange('username', text)}
                error={fieldErrors.username}
                leftIcon={<UserIcon size={20} color={theme.colors.gray[400]} />}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />

              {/* Password */}
              <TextInput
                label="Password"
                placeholder="Enter your password"
                value={formData.password}
                onChangeText={text => handleChange('password', text)}
                error={fieldErrors.password}
                leftIcon={<LockIcon size={20} color={theme.colors.gray[400]} />}
                rightIcon={
                  showPassword ? (
                    <EyeOffIcon size={20} color={theme.colors.gray[400]} />
                  ) : (
                    <EyeIcon size={20} color={theme.colors.gray[400]} />
                  )
                }
                onRightIconPress={() => setShowPassword(!showPassword)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />

              {/* Remember Me & Forgot Password */}
              <View style={styles.optionsRow}>
                <Checkbox
                  checked={rememberMe}
                  onChange={setRememberMe}
                  label="Remember me"
                  disabled={loading}
                />

                <TouchableOpacity>
                  <Typography
                    variant="small"
                    weight="medium"
                    color={theme.colors.primary[600]}>
                    Forgot password?
                  </Typography>
                </TouchableOpacity>
              </View>

              {/* Submit Button */}
              <Button
                title={loading ? 'Signing in...' : 'Sign in'}
                onPress={handleSubmit}
                loading={loading}
                fullWidth
                leftIcon={
                  !loading ? (
                    <ArrowRightIcon size={20} color={theme.colors.white} />
                  ) : undefined
                }
              />
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Typography variant="small" color={theme.colors.gray[600]}>
                Don't have an account?{' '}
                <Typography
                  variant="small"
                  weight="medium"
                  color={theme.colors.primary[600]}>
                  Contact administrator
                </Typography>
              </Typography>
            </View>
          </Card>

          <Typography
            variant="caption"
            color={theme.colors.gray[500]}
            align="center"
            style={styles.securityText}>
            Protected by enterprise-grade security
          </Typography>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    backgroundColor: theme.colors.gray[50],
  },
  scrollContent: {
    flexGrow: 1,
    padding: theme.spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadows.lg,
  },
  icon: {
    fontSize: 32,
  },
  subtitle: {
    marginTop: theme.spacing.sm,
  },
  card: {
    marginBottom: theme.spacing.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  blueStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: theme.colors.primary[600],
  },
  errorAlert: {
    marginTop: theme.spacing.md,
  },
  form: {
    marginTop: theme.spacing.lg,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  footer: {
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  securityText: {
    marginTop: theme.spacing.xs,
  },
});
