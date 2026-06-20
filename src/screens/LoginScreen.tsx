import React, {useState, useEffect, useMemo, useRef} from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Button} from '../components/atoms/Button';
import {TextInput} from '../components/atoms/TextInput';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {Checkbox} from '../components/atoms/Checkbox';
import {ToggleButtonGroup} from '../components/molecules/ToggleButtonGroup';
import {ErrorAlert} from '../components/molecules/ErrorAlert';
import {useAuth} from '../contexts/AuthContext';
import {useTheme} from '../contexts/ThemeContext';
import {Theme} from '../theme';
import {useBreakpoint, BreakpointInfo} from '../utils/breakpoints';
import storageService from '../services/storageService';
import {
  BoxIcon,
  ShieldIcon,
  UserIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  RefreshIcon,
  TruckIcon,
  FileTextIcon,
  BarChartIcon,
} from '../components/icons';

export const LoginScreen = () => {
  const {login} = useAuth();
  const theme = useTheme();
  const breakpoint = useBreakpoint();
  const styles = useMemo(() => makeStyles(theme, breakpoint), [theme, breakpoint]);

  const [loginType, setLoginType] = useState<'admin' | 'employee'>('admin');
  const [formData, setFormData] = useState({username: '', password: ''});
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{username?: string; password?: string}>({});
  const [showPassword, setShowPassword] = useState(false);

  const blobPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadSavedCredentials();
    Animated.loop(
      Animated.sequence([
        Animated.timing(blobPulse, {toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true}),
        Animated.timing(blobPulse, {toValue: 0, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true}),
      ]),
    ).start();
  }, [blobPulse]);

  const loadSavedCredentials = async () => {
    try {
      const rememberMePreference = await storageService.getRememberMe();
      const savedCreds = await storageService.getSavedCredentials();
      if (rememberMePreference && savedCreds) {
        setFormData({username: savedCreds.username, password: savedCreds.password});
        setRememberMe(true);
      }
    } catch (err) {
      console.error('Error loading saved credentials:', err);
    }
  };

  const validateForm = () => {
    const errors: {username?: string; password?: string} = {};
    if (!formData.username.trim()) errors.username = 'Username is required';
    else if (formData.username.length < 3) errors.username = 'Username must be at least 3 characters';
    if (!formData.password) errors.password = 'Password is required';
    else if (formData.password.length < 6) errors.password = 'Password must be at least 6 characters';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (name: 'username' | 'password', value: string) => {
    setFormData(prev => ({...prev, [name]: value}));
    if (fieldErrors[name]) setFieldErrors(prev => ({...prev, [name]: ''}));
    if (error) setError('');
  };

  const handleSubmit = async () => {
    setError('');
    if (!validateForm()) return;
    setLoading(true);
    try {
      const result = await login(formData.username, formData.password, loginType, rememberMe);
      if (!result.success) {
        setError(result.error || 'Invalid credentials. Please try again.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.userMessage || err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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

  const blobScale = blobPulse.interpolate({inputRange: [0, 1], outputRange: [1, 1.08]});
  const blobOpacity = blobPulse.interpolate({inputRange: [0, 1], outputRange: [0.18, 0.28]});

  const isSplit = !breakpoint.isMobile;

  const features = [
    {Icon: BoxIcon, title: 'Inventory & Stock', detail: 'Real-time levels, alerts, history'},
    {Icon: FileTextIcon, title: 'Orders & POS', detail: 'Purchase orders & invoicing'},
    {Icon: RefreshIcon, title: 'External Sync', detail: 'RouteStar + CustomerConnect'},
    {Icon: TruckIcon, title: 'Truck Checkouts', detail: 'Field reconciliation'},
  ];

  const trustPoints = [
    {Icon: ShieldIcon, label: 'Enterprise security'},
    {Icon: BarChartIcon, label: 'Reports & analytics'},
    {Icon: CheckCircleIcon, label: 'Live sync'},
  ];

  const renderBrandPanel = () => (
    <View style={styles.brandPanel}>
      <Animated.View
        style={[
          styles.brandBlob,
          styles.brandBlobOne,
          {transform: [{scale: blobScale}], opacity: blobOpacity},
        ]}
      />
      <Animated.View
        style={[
          styles.brandBlob,
          styles.brandBlobTwo,
          {transform: [{scale: blobScale}], opacity: blobOpacity},
        ]}
      />
      <View style={styles.brandDotGrid} pointerEvents="none">
        {Array.from({length: 24}).map((_, i) => (
          <View key={i} style={styles.brandDot} />
        ))}
      </View>

      <View style={styles.brandHeader}>
        <View style={styles.brandLogoMark}>
          <BoxIcon size={breakpoint.isWide ? 22 : 18} color={theme.colors.white} />
        </View>
        <Typography variant="small" weight="semibold" color={theme.colors.white}>
          Inventory OS
        </Typography>
        <View style={styles.brandVersionPill}>
          <Typography variant="caption" weight="semibold" color={theme.colors.white}>
            v2.6
          </Typography>
        </View>
      </View>

      <View style={styles.brandHero}>
        <View style={styles.brandStatusChip}>
          <View style={styles.brandStatusDot} />
          <Typography variant="caption" weight="semibold" color={theme.colors.white}>
            Live · all systems syncing
          </Typography>
        </View>
        <Typography
          variant="h1"
          weight="bold"
          color={theme.colors.white}
          style={styles.brandTitle}>
          Run your inventory{'\n'}with confidence.
        </Typography>
        <Typography
          variant="body"
          color={theme.colors.primary[100]}
          style={styles.brandSubtitle}>
          One workspace for stock, orders, invoices, RouteStar sync, and truck checkouts.
          Same data on web, iPad, and Mac.
        </Typography>

        <View style={styles.brandFeatures}>
          {features.map(f => (
            <View key={f.title} style={styles.brandFeatureRow}>
              <View style={styles.brandFeatureIcon}>
                <f.Icon size={16} color={theme.colors.white} />
              </View>
              <View style={{flex: 1}}>
                <Typography variant="small" weight="semibold" color={theme.colors.white}>
                  {f.title}
                </Typography>
                <Typography variant="caption" color={theme.colors.primary[100]}>
                  {f.detail}
                </Typography>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.brandFooter}>
        <View style={styles.brandTrustRow}>
          {trustPoints.map(p => (
            <View key={p.label} style={styles.brandTrustItem}>
              <p.Icon size={12} color={theme.colors.primary[200]} />
              <Typography variant="caption" weight="semibold" color={theme.colors.primary[100]}>
                {p.label}
              </Typography>
            </View>
          ))}
        </View>
        <Typography variant="caption" color={theme.colors.primary[200]} style={{marginTop: 8}}>
          © {new Date().getFullYear()} Inventory Management System
        </Typography>
      </View>
    </View>
  );

  const renderForm = () => (
    <View style={styles.formPanel}>
      <View style={styles.formContainer}>
        <View style={styles.formHeader}>
          {!isSplit && (
            <View style={styles.iconContainer}>
              <BoxIcon size={28} color={theme.colors.white} />
            </View>
          )}
          {isSplit && (
            <View style={styles.formEyebrow}>
              <View style={styles.formEyebrowLine} />
              <Typography variant="caption" weight="semibold" color={theme.colors.primary[600]}>
                SIGN IN
              </Typography>
            </View>
          )}
          <Typography
            variant="h1"
            weight="bold"
            align={isSplit ? 'left' : 'center'}
            style={styles.formTitle}>
            Welcome back
          </Typography>
          <Typography
            variant="body"
            color={theme.colors.gray[600]}
            align={isSplit ? 'left' : 'center'}
            style={styles.formSubtitle}>
            Sign in to access your workspace
          </Typography>
        </View>

        <Card variant="elevated" padding="lg" style={styles.card}>
          <View style={styles.blueStripe} />
          <ToggleButtonGroup
            options={loginOptions}
            value={loginType}
            onChange={value => {
              setLoginType(value as 'admin' | 'employee');
              setError('');
              setFieldErrors({});
            }}
          />
          {error ? <ErrorAlert message={error} style={styles.errorAlert} /> : null}
          <View style={styles.form}>
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
              returnKeyType="next"
              onSubmitEditing={handleSubmit}
              blurOnSubmit={false}
            />
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
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
            />
            <View style={styles.optionsRow}>
              <Checkbox
                checked={rememberMe}
                onChange={setRememberMe}
                label="Remember me"
                disabled={loading}
              />
              <TouchableOpacity activeOpacity={0.7}>
                <Typography variant="small" weight="semibold" color={theme.colors.primary[600]}>
                  Forgot password?
                </Typography>
              </TouchableOpacity>
            </View>
            <Button
              title={loading ? 'Signing in...' : 'Sign in'}
              onPress={handleSubmit}
              loading={loading}
              fullWidth
              size={breakpoint.isMobile ? 'md' : 'lg'}
              leftIcon={
                !loading ? <ArrowRightIcon size={20} color={theme.colors.white} /> : undefined
              }
            />
          </View>
          <View style={styles.cardFooter}>
            <Typography variant="small" color={theme.colors.gray[600]} align={isSplit ? 'left' : 'center'}>
              Don't have an account?{' '}
              <Typography variant="small" weight="semibold" color={theme.colors.primary[600]}>
                Contact administrator
              </Typography>
            </Typography>
          </View>
        </Card>

        <Typography
          variant="caption"
          color={theme.colors.gray[500]}
          align={isSplit ? 'left' : 'center'}
          style={styles.securityText}>
          🔒 Protected by enterprise-grade security
        </Typography>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {isSplit ? (
          <View style={styles.splitContainer}>
            {renderBrandPanel()}
            <ScrollView
              style={styles.formScroll}
              contentContainerStyle={styles.splitFormScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              {renderForm()}
            </ScrollView>
          </View>
        ) : (
          <ScrollView
            style={styles.singleScroll}
            contentContainerStyle={styles.singleScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {renderForm()}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const makeStyles = (theme: Theme, bp: BreakpointInfo) => {
  const isSplit = !bp.isMobile;
  const formMaxWidth = bp.isWide ? 480 : bp.isDesktop ? 460 : 440;
  const brandWidthPct = bp.isWide ? '46%' : bp.isDesktop ? '44%' : '42%';

  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: isSplit ? theme.colors.primary[700] : theme.colors.background.secondary,
    },
    container: {flex: 1},

    splitContainer: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: theme.colors.background.secondary,
    },
    singleScroll: {flex: 1, backgroundColor: theme.colors.background.secondary},
    singleScrollContent: {flexGrow: 1, justifyContent: 'center', padding: theme.spacing.lg},
    formScroll: {flex: 1},
    splitFormScrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: bp.gutter,
      paddingVertical: bp.gutter,
    },

    brandPanel: {
      width: brandWidthPct,
      minWidth: 360,
      maxWidth: 640,
      backgroundColor: theme.colors.primary[700],
      paddingHorizontal: bp.gutter,
      paddingVertical: bp.isWide ? 56 : 40,
      overflow: 'hidden',
      position: 'relative',
      justifyContent: 'space-between',
    },
    brandBlob: {position: 'absolute', borderRadius: 9999},
    brandBlobOne: {
      width: 380, height: 380, top: -140, right: -140,
      backgroundColor: theme.colors.primary[400],
    },
    brandBlobTwo: {
      width: 280, height: 280, bottom: -100, left: -80,
      backgroundColor: theme.colors.accent[500],
    },
    brandDotGrid: {
      position: 'absolute',
      top: 80,
      right: 24,
      width: 110,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      opacity: 0.18,
    },
    brandDot: {width: 5, height: 5, borderRadius: 2.5, backgroundColor: theme.colors.white},

    brandHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      zIndex: 2,
    },
    brandLogoMark: {
      width: bp.isWide ? 40 : 34,
      height: bp.isWide ? 40 : 34,
      borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.25)',
    },
    brandVersionPill: {
      marginLeft: 'auto',
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.18)',
    },

    brandHero: {zIndex: 2, marginTop: bp.isWide ? 64 : 40},
    brandStatusChip: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.18)',
      marginBottom: 18,
    },
    brandStatusDot: {width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.success[400]},
    brandTitle: {
      letterSpacing: -0.6,
      lineHeight: bp.isWide ? 50 : bp.isDesktop ? 44 : 38,
      marginBottom: 14,
    },
    brandSubtitle: {
      lineHeight: bp.isWide ? 26 : 22,
      marginBottom: bp.isWide ? 36 : 28,
      opacity: 0.95,
    },
    brandFeatures: {
      gap: 14,
    },
    brandFeatureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    brandFeatureIcon: {
      width: 36,
      height: 36,
      borderRadius: 11,
      backgroundColor: 'rgba(255,255,255,0.14)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    brandFooter: {zIndex: 2},
    brandTrustRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 14,
      marginTop: 12,
    },
    brandTrustItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },

    formPanel: {
      flex: 1,
      alignItems: isSplit ? 'flex-start' : 'center',
      justifyContent: 'center',
    },
    formContainer: {
      width: '100%',
      maxWidth: formMaxWidth,
    },
    formHeader: {
      alignItems: isSplit ? 'flex-start' : 'center',
      marginBottom: bp.isMobile ? theme.spacing.lg : theme.spacing.xl,
    },
    iconContainer: {
      width: 60,
      height: 60,
      borderRadius: theme.borderRadius.xl,
      backgroundColor: theme.colors.primary[600],
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
      ...theme.shadows.lg,
    },
    formEyebrow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
    },
    formEyebrowLine: {
      width: 24,
      height: 2,
      borderRadius: 1,
      backgroundColor: theme.colors.primary[600],
    },
    formTitle: {
      letterSpacing: -0.5,
      marginBottom: 6,
    },
    formSubtitle: {
      lineHeight: 22,
    },

    card: {
      position: 'relative',
      overflow: 'hidden',
      ...theme.shadows.lg,
    },
    blueStripe: {
      position: 'absolute',
      top: 0, left: 0, right: 0,
      height: 3,
      backgroundColor: theme.colors.primary[600],
    },
    errorAlert: {marginTop: theme.spacing.md},
    form: {
      marginTop: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    optionsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginVertical: theme.spacing.sm,
    },
    cardFooter: {
      alignItems: isSplit ? 'flex-start' : 'center',
      marginTop: theme.spacing.lg,
    },
    securityText: {
      marginTop: theme.spacing.md,
    },
  });
};
