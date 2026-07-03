import React, {useMemo, useEffect, useRef, useState} from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
  Modal,
  TextInput as RNTextInput,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {Button} from '../components/atoms/Button';
import authService from '../services/authService';
import {useAuth} from '../contexts/AuthContext';
import {useUserScreens} from '../hooks/useUserScreens';
import {useTheme, useThemeContext} from '../contexts/ThemeContext';
import {Theme} from '../theme';
import {useBreakpoint, BreakpointInfo} from '../utils/breakpoints';
import {useExtraScreens} from '../contexts/ExtraScreensContext';
import {
  LogoutIcon,
  ChevronRightIcon,
  FileTextIcon,
  ClipboardIcon,
  LinkIcon,
  TagIcon,
  BoxIcon,
  SettingsIcon,
  ClockIcon,
  AlertCircleIcon,
  TruckIcon,
  TimelineIcon,
  ShieldIcon,
  GridIcon,
  BarChartIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  TrashIcon,
  UserIcon,
  WarningIcon,
  RefreshIcon,
  KeyIcon,
} from '../components/icons';
import userService from '../services/userService';

type Tone = 'primary' | 'accent' | 'success' | 'warning' | 'info' | 'error';

interface MenuRow {
  Icon: React.FC<{size?: number; color?: string}>;
  title: string;
  subtitle?: string;
  onPress: () => void;
  tone: Tone;
  visible: boolean;
}

interface MenuSectionProps {
  theme: Theme;
  bp: BreakpointInfo;
  eyebrow: string;
  rows: MenuRow[];
}

const MenuSection: React.FC<MenuSectionProps> = ({theme, bp, eyebrow, rows}) => {
  const styles = useMemo(() => makeStyles(theme, bp), [theme, bp]);
  const visibleRows = rows.filter(r => r.visible);
  if (visibleRows.length === 0) return null;
  return (
    <View>
      <View style={styles.sectionEyebrow}>
        <View style={styles.eyebrowLine} />
        <Typography variant="caption" weight="semibold" color={theme.colors.primary[600]}>
          {eyebrow}
        </Typography>
      </View>
      <Card variant="elevated" padding="none" style={styles.menuCard}>
        {visibleRows.map((row, idx) => {
          const palette = theme.colors[row.tone];
          return (
            <View key={row.title}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={row.onPress}
                activeOpacity={0.7}>
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIconContainer, {backgroundColor: palette[50]}]}>
                    <row.Icon size={18} color={palette[600]} />
                  </View>
                  <View style={styles.menuTextContainer}>
                    <Typography variant="body" weight="semibold">
                      {row.title}
                    </Typography>
                    {row.subtitle ? (
                      <Typography variant="caption" color={theme.colors.gray[500]}>
                        {row.subtitle}
                      </Typography>
                    ) : null}
                  </View>
                </View>
                <View style={styles.menuChevronWrap}>
                  <ChevronRightIcon size={16} color={theme.colors.gray[400]} />
                </View>
              </TouchableOpacity>
              {idx < visibleRows.length - 1 && <View style={styles.menuSeparator} />}
            </View>
          );
        })}
      </Card>
    </View>
  );
};

export const AccountScreen = () => {
  const {user, token, logout} = useAuth();

  // Change password modal
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [cpLoading, setCpLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!token) return;
    if (!curPw || !newPw) {
      Alert.alert('Validation', 'Please fill in all fields');
      return;
    }
    if (newPw.length < 6) {
      Alert.alert('Validation', 'New password must be at least 6 characters');
      return;
    }
    if (newPw !== confirmPw) {
      Alert.alert('Validation', 'New password and confirmation do not match');
      return;
    }
    setCpLoading(true);
    const res = await authService.changePassword(token, curPw, newPw);
    setCpLoading(false);
    if (res.success) {
      setShowChangePassword(false);
      setCurPw('');
      setNewPw('');
      setConfirmPw('');
      Alert.alert('Success', 'Your password has been changed');
    } else {
      Alert.alert('Error', res.error || 'Failed to change password');
    }
  };
  const {hasAccessToScreen} = useUserScreens();
  const theme = useTheme();
  const bp = useBreakpoint();
  const styles = useMemo(() => makeStyles(theme, bp), [theme, bp]);
  const {preference, setPreference, mode} = useThemeContext();
  const isAdmin = user?.role === 'admin';
  const canSee = (path: string) => isAdmin || hasAccessToScreen(path);
  const {openScreen} = useExtraScreens();
  // On Mac / desktop the left sidebar already lists these destinations, so the
  // Account screen hides its navigation menu there and just keeps profile,
  // appearance and account actions.
  const sidebarActive = bp.isDesktop || bp.isWide;

  const heroFade = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(20)).current;
  const blobPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroFade, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(heroSlide, {
        toValue: 0,
        duration: 560,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(blobPulse, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(blobPulse, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [heroFade, heroSlide, blobPulse]);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Logout',
          onPress: async () => {
            await logout();
          },
          style: 'destructive',
        },
      ],
      {cancelable: true},
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      "This will deactivate your account. You will be signed out immediately and won't be able to sign in again unless an administrator reactivates the account. Are you sure you want to continue?",
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirm Deletion',
              'This action will deactivate your account. Continue?',
              [
                {text: 'Cancel', style: 'cancel'},
                {
                  text: 'Yes, Delete',
                  style: 'destructive',
                  onPress: async () => {
                    if (!token) {
                      Alert.alert('Error', 'You must be signed in to delete your account.');
                      return;
                    }
                    try {
                      await userService.deactivateOwnAccount(token);
                      await logout();
                    } catch (err: any) {
                      Alert.alert(
                        'Error',
                        err?.message || 'Failed to delete account. Please try again.',
                      );
                    }
                  },
                },
              ],
            );
          },
        },
      ],
      {cancelable: true},
    );
  };

  const blobScale = blobPulse.interpolate({inputRange: [0, 1], outputRange: [1, 1.08]});
  const blobOpacity = blobPulse.interpolate({inputRange: [0, 1], outputRange: [0.18, 0.28]});

  const initials = (() => {
    if (!user) return '·';
    const source = user.fullName || user.username || '';
    const parts = source.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '·';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

  const adminRows: MenuRow[] = [
    {
      Icon: SettingsIcon,
      title: 'User Management',
      subtitle: 'Manage users and permissions',
      tone: 'accent',
      onPress: () => openScreen('userManagement'),
      visible: !!isAdmin && canSee('/users'),
    },
    {
      Icon: TimelineIcon,
      title: 'Activity Logs',
      subtitle: 'View all system activities',
      tone: 'accent',
      onPress: () => openScreen('activityLog'),
      visible: !!isAdmin && canSee('/activities'),
    },
    {
      Icon: ShieldIcon,
      title: 'Screen Permissions',
      subtitle: 'Manage user screen access',
      tone: 'accent',
      onPress: () => openScreen('screenPermissions'),
      visible: !!isAdmin && canSee('/admin/screen-permissions'),
    },
    {
      Icon: GridIcon,
      title: 'Screen Management',
      subtitle: 'Manage app screens',
      tone: 'accent',
      onPress: () => openScreen('screenManagement'),
      visible: !!isAdmin && canSee('/admin/screens'),
    },
    {
      Icon: RefreshIcon,
      title: 'QuickBooks Sync',
      subtitle: 'Snapshot queue and retries',
      tone: 'accent',
      onPress: () => openScreen('quickBooksSync'),
      visible: !!isAdmin && canSee('/system/quickbooks-sync'),
    },
    {
      Icon: SettingsIcon,
      title: 'Settings',
      subtitle: 'Stock cutoff date & low-stock threshold',
      tone: 'accent',
      onPress: () => openScreen('settings'),
      visible: !!isAdmin && canSee('/settings'),
    },
  ];

  const inventoryRows: MenuRow[] = [
    {
      Icon: BoxIcon,
      title: 'Item Catalog',
      subtitle: 'Create, edit and view inventory items',
      tone: 'info',
      onPress: () => openScreen('inventoryCatalog'),
      visible: canSee('/inventory'),
    },
    {
      Icon: LinkIcon,
      title: 'Model Mapping',
      subtitle: 'Link SKUs to canonical models',
      tone: 'info',
      onPress: () => openScreen('modelMapping'),
      visible: canSee('/routestar/model-mapping'),
    },
    {
      Icon: TagIcon,
      title: 'Item Alias Mapping',
      subtitle: 'Resolve external item names',
      tone: 'info',
      onPress: () => openScreen('itemAlias'),
      visible: canSee('/routestar/item-alias-mapping'),
    },
    {
      Icon: BoxIcon,
      title: 'RouteStar Items',
      subtitle: 'Synced items from RouteStar',
      tone: 'info',
      onPress: () => openScreen('routeStarItems'),
      visible: canSee('/routestar/items'),
    },
    {
      Icon: UserIcon,
      title: 'RouteStar Customers',
      subtitle: 'Customer records and locations',
      tone: 'info',
      onPress: () => openScreen('routeStarCustomers'),
      visible: canSee('/routestar/customers'),
    },
    {
      Icon: UserIcon,
      title: 'Closed Invoice Customers',
      subtitle: 'Customers from closed invoices',
      tone: 'info',
      onPress: () => openScreen('closedInvoiceCustomers'),
      visible: canSee('/routestar/closed-invoice-customers'),
    },
    {
      Icon: ClipboardIcon,
      title: 'Manual PO Items',
      subtitle: 'Items captured from manual orders',
      tone: 'info',
      onPress: () => openScreen('manualPOItems'),
      visible: canSee('/manual-po-items'),
    },
    {
      Icon: GridIcon,
      title: 'Units',
      subtitle: 'Units of measurement',
      tone: 'info',
      onPress: () => openScreen('units'),
      visible: !!isAdmin && canSee('/units'),
    },
    {
      Icon: TagIcon,
      title: 'Coupons & Payments',
      subtitle: 'Coupons and payment types',
      tone: 'info',
      onPress: () => openScreen('coupons'),
      visible: !!isAdmin && canSee('/coupons'),
    },
    {
      Icon: BoxIcon,
      title: 'Stock Reconciliation',
      subtitle: 'In-stock / out-of-stock / oversold',
      tone: 'info',
      onPress: () => openScreen('stockReconciliation'),
      visible: !!isAdmin && canSee('/stock-reconciliation'),
    },
  ];

  const ordersRows: MenuRow[] = [
    {
      Icon: ClipboardIcon,
      title: 'Purchase Orders',
      subtitle: 'Browse and review purchase orders',
      tone: 'success',
      onPress: () => openScreen('orders'),
      visible: canSee('/orders'),
    },
    {
      Icon: TruckIcon,
      title: 'Vendors',
      subtitle: 'Vendor records and contacts',
      tone: 'success',
      onPress: () => openScreen('vendors'),
      visible: canSee('/vendors'),
    },
    {
      Icon: ClockIcon,
      title: 'Fetch History',
      subtitle: 'External sync run history',
      tone: 'success',
      onPress: () => openScreen('fetchHistory'),
      visible: canSee('/system/fetch-history'),
    },
    {
      Icon: AlertCircleIcon,
      title: 'Discrepancy Management',
      subtitle: 'Reconcile stock differences',
      tone: 'warning',
      onPress: () => openScreen('discrepancyManagement'),
      visible: canSee('/discrepancies'),
    },
    {
      Icon: CheckCircleIcon,
      title: 'Approvals',
      subtitle: 'Approve invoices & purchase deletions',
      tone: 'success',
      onPress: () => openScreen('approvals'),
      visible: canSee('/approvals'),
    },
  ];

  const reportsRows: MenuRow[] = [
    {
      Icon: BarChartIcon,
      title: 'Reports Hub',
      subtitle: 'Sales, profit, orders & low-stock overview',
      tone: 'primary',
      onPress: () => openScreen('reportsHub'),
      visible: canSee('/reports'),
    },
    {
      Icon: FileTextIcon,
      title: 'Sales Report',
      subtitle: 'Sales by item, customer, period',
      tone: 'primary',
      onPress: () => openScreen('salesReport'),
      visible: canSee('/routestar/sales-report'),
    },
    {
      Icon: BarChartIcon,
      title: 'Sales Analytics',
      subtitle: 'Date-range & category sales breakdown',
      tone: 'primary',
      onPress: () => openScreen('salesAnalytics'),
      visible: canSee('/reports/sales'),
    },
    {
      Icon: WarningIcon,
      title: 'Low Stock Report',
      subtitle: 'Items at or below reorder point',
      tone: 'warning',
      onPress: () => openScreen('lowStockReport'),
      visible: canSee('/reports/low-stock'),
    },
    {
      Icon: FileTextIcon,
      title: 'Customer Export',
      subtitle: 'Export closed-invoice customers (CSV)',
      tone: 'primary',
      onPress: () => openScreen('customerExport'),
      visible: canSee('/reports/customer-export'),
    },
    {
      Icon: BarChartIcon,
      title: 'Items Invoice Usage',
      subtitle: 'Invoice usage breakdown by item',
      tone: 'primary',
      onPress: () => openScreen('itemsInvoiceUsage'),
      visible: canSee('/routestar/items-invoice-usage'),
    },
  ];

  const themeOptions: {key: 'light' | 'dark' | 'system'; label: string}[] = [
    {key: 'light', label: 'Light'},
    {key: 'dark', label: 'Dark'},
    {key: 'system', label: 'System'},
  ];

  const heroStats = [
    {label: 'ROLE', value: isAdmin ? 'Admin' : 'Employee'},
    {label: 'STATUS', value: 'Active'},
    {
      label: 'THEME',
      value:
        preference === 'system'
          ? `System · ${mode === 'dark' ? 'Dark' : 'Light'}`
          : mode === 'dark'
          ? 'Dark'
          : 'Light',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Animated.View
            style={[
              styles.blob,
              styles.blobOne,
              {transform: [{scale: blobScale}], opacity: blobOpacity},
            ]}
          />
          <Animated.View
            style={[
              styles.blob,
              styles.blobTwo,
              {transform: [{scale: blobScale}], opacity: blobOpacity},
            ]}
          />
          <View style={styles.dotGrid} pointerEvents="none">
            {Array.from({length: 18}).map((_, i) => (
              <View key={i} style={styles.dot} />
            ))}
          </View>

          <Animated.View
            style={[
              styles.heroBody,
              {opacity: heroFade, transform: [{translateY: heroSlide}]},
            ]}>
            <View style={styles.heroTopRow}>
              <Typography
                variant="caption"
                weight="semibold"
                color={theme.colors.brand.textTracked}
                style={styles.heroEyebrow}>
                ACCOUNT
              </Typography>
              <View style={styles.statusChip}>
                <View style={styles.statusDot} />
                <Typography variant="caption" weight="semibold" color={theme.colors.brand.text}>
                  Signed in
                </Typography>
              </View>
            </View>

            <View style={styles.identityRow}>
              <View style={styles.avatarWrap}>
                <View style={styles.avatarRing}>
                  <View style={styles.avatar}>
                    <Typography variant="h2" weight="bold" color={theme.colors.brand.text}>
                      {initials}
                    </Typography>
                  </View>
                </View>
                <View style={styles.avatarBadge}>
                  <CheckCircleIcon size={12} color={theme.colors.brand.text} />
                </View>
              </View>
              <View style={styles.identityText}>
                <Typography
                  variant="h2"
                  weight="bold"
                  color={theme.colors.brand.text}
                  style={styles.identityName}>
                  {user?.fullName || user?.username || 'Guest'}
                </Typography>
                <Typography
                  variant="small"
                  color={theme.colors.brand.textMuted}
                  style={styles.identityEmail}>
                  {user?.email || '—'}
                </Typography>
                <View style={styles.rolePill}>
                  <ShieldIcon size={12} color={theme.colors.brand.text} />
                  <Typography variant="caption" weight="semibold" color={theme.colors.brand.text}>
                    {user?.role === 'admin' ? 'ADMINISTRATOR' : 'EMPLOYEE'}
                  </Typography>
                </View>
              </View>
            </View>

            <View style={styles.heroStatsRow}>
              {heroStats.map((s, idx) => (
                <View key={s.label} style={styles.heroStatCell}>
                  <Typography
                    variant="caption"
                    weight="semibold"
                    color={theme.colors.brand.textMuted}>
                    {s.label}
                  </Typography>
                  <Typography variant="small" weight="bold" color={theme.colors.brand.text}>
                    {s.value}
                  </Typography>
                  {idx < heroStats.length - 1 && <View style={styles.heroStatDivider} />}
                </View>
              ))}
            </View>
          </Animated.View>
        </View>

        <View style={styles.body}>
          {!sidebarActive && (
            <>
              <MenuSection theme={theme} bp={bp} eyebrow="ADMINISTRATION" rows={adminRows} />
              <MenuSection theme={theme} bp={bp} eyebrow="INVENTORY MANAGEMENT" rows={inventoryRows} />
              <MenuSection theme={theme} bp={bp} eyebrow="ORDERS & VENDORS" rows={ordersRows} />
              <MenuSection theme={theme} bp={bp} eyebrow="REPORTS" rows={reportsRows} />
            </>
          )}

          <View style={styles.sectionEyebrow}>
            <View style={styles.eyebrowLine} />
            <Typography variant="caption" weight="semibold" color={theme.colors.primary[600]}>
              APPEARANCE
            </Typography>
          </View>
          <Card variant="elevated" padding="none" style={styles.menuCard}>
            <View style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View
                  style={[styles.menuIconContainer, {backgroundColor: theme.colors.primary[50]}]}>
                  <SettingsIcon size={18} color={theme.colors.primary[600]} />
                </View>
                <View style={styles.menuTextContainer}>
                  <Typography variant="body" weight="semibold">
                    Theme
                  </Typography>
                  <Typography variant="caption" color={theme.colors.gray[500]}>
                    Currently {mode === 'dark' ? 'Dark' : 'Light'}
                    {preference === 'system' ? ' · matches system' : ''}
                  </Typography>
                </View>
              </View>
            </View>
            <View style={styles.themeSegment}>
              {themeOptions.map(opt => {
                const active = preference === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.themeOption, active && styles.themeOptionActive]}
                    onPress={() => setPreference(opt.key)}
                    activeOpacity={0.85}>
                    <Typography
                      variant="small"
                      weight={active ? 'bold' : 'semibold'}
                      color={active ? theme.colors.white : theme.colors.gray[700]}>
                      {opt.label}
                    </Typography>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>

          <View style={styles.sectionEyebrow}>
            <View style={styles.eyebrowLine} />
            <Typography variant="caption" weight="semibold" color={theme.colors.primary[600]}>
              ACCOUNT ACTIONS
            </Typography>
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.9}>
            <View style={styles.logoutIconWrap}>
              <LogoutIcon size={20} color={theme.colors.brand.text} />
            </View>
            <View style={{flex: 1}}>
              <Typography variant="body" weight="bold" color={theme.colors.brand.text}>
                Log out
              </Typography>
              <Typography variant="caption" color={theme.colors.brand.textMuted} style={styles.actionSubtitle}>
                End your session on this device
              </Typography>
            </View>
            <View style={styles.logoutArrow}>
              <ArrowRightIcon size={16} color={theme.colors.brand.text} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteAccountButton}
            onPress={() => setShowChangePassword(true)}
            activeOpacity={0.9}>
            <View style={styles.deleteIconWrap}>
              <KeyIcon size={20} color={theme.colors.primary[600]} />
            </View>
            <View style={{flex: 1}}>
              <Typography variant="body" weight="semibold" color={theme.colors.gray[800]}>
                Change password
              </Typography>
              <Typography variant="caption" color={theme.colors.gray[500]} style={styles.actionSubtitle}>
                Update your account password
              </Typography>
            </View>
            <View style={styles.deleteArrow}>
              <ArrowRightIcon size={16} color={theme.colors.gray[400]} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteAccountButton}
            onPress={handleDeleteAccount}
            activeOpacity={0.9}>
            <View style={styles.deleteIconWrap}>
              <TrashIcon size={20} color={theme.colors.error[600]} />
            </View>
            <View style={{flex: 1}}>
              <Typography variant="body" weight="semibold" color={theme.colors.error[700]}>
                Delete account
              </Typography>
              <Typography variant="caption" color={theme.colors.gray[500]} style={styles.actionSubtitle}>
                Deactivates your account · admin can reactivate later
              </Typography>
            </View>
            <View style={styles.deleteArrow}>
              <ArrowRightIcon size={16} color={theme.colors.error[500]} />
            </View>
          </TouchableOpacity>

          <View style={styles.footer}>
            <View style={styles.footerLogo}>
              <BoxIcon size={14} color={theme.colors.primary[600]} />
              <Typography
                variant="caption"
                weight="semibold"
                color={theme.colors.gray[600]}>
                Inventory NVA
              </Typography>
            </View>
            <Typography variant="caption" color={theme.colors.gray[400]} align="center">
              v1.0.0 · made for operations teams
            </Typography>
          </View>
        </View>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        visible={showChangePassword}
        transparent
        animationType="fade"
        onRequestClose={() => !cpLoading && setShowChangePassword(false)}>
        <View style={styles.cpOverlay}>
          <View style={styles.cpCard}>
            <Typography variant="h3" weight="bold" style={{marginBottom: 12}}>
              Change Password
            </Typography>
            <RNTextInput
              style={styles.cpInput}
              placeholder="Current password"
              value={curPw}
              onChangeText={setCurPw}
              secureTextEntry
              placeholderTextColor={theme.colors.gray[400]}
            />
            <RNTextInput
              style={styles.cpInput}
              placeholder="New password (min 6 chars)"
              value={newPw}
              onChangeText={setNewPw}
              secureTextEntry
              placeholderTextColor={theme.colors.gray[400]}
            />
            <RNTextInput
              style={styles.cpInput}
              placeholder="Confirm new password"
              value={confirmPw}
              onChangeText={setConfirmPw}
              secureTextEntry
              placeholderTextColor={theme.colors.gray[400]}
            />
            <View style={styles.cpActions}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => setShowChangePassword(false)}
                disabled={cpLoading}
                style={{flex: 1}}
              />
              <Button
                title="Change Password"
                variant="primary"
                onPress={handleChangePassword}
                loading={cpLoading}
                style={{flex: 1}}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const makeStyles = (theme: Theme, bp: BreakpointInfo) => {
  const wide = !bp.isMobile;
  const actionBtnMaxWidth = bp.isWide ? 560 : bp.isDesktop ? 480 : undefined;
  const btnPadScale = bp.isWide ? 1.3 : bp.isDesktop ? 1.15 : 1;
  const rb = (n: number) => Math.round(n);
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.brand.bg,
    },
    scrollView: {
      flex: 1,
      backgroundColor: theme.colors.background.secondary,
    },
    scrollContent: {
      paddingBottom: theme.spacing.xxxl,
    },

    hero: {
      paddingHorizontal: bp.gutter,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xl + theme.spacing.md,
      backgroundColor: theme.colors.brand.bg,
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
      overflow: 'hidden',
      position: 'relative',
    },
    blob: {
      position: 'absolute',
      borderRadius: 9999,
    },
    blobOne: {
      width: wide ? 392 : 280,
      height: wide ? 392 : 280,
      top: wide ? -182 : -130,
      right: wide ? -140 : -100,
      backgroundColor: theme.colors.primary[400],
    },
    blobTwo: {
      width: wide ? 308 : 220,
      height: wide ? 308 : 220,
      bottom: wide ? -154 : -110,
      left: wide ? -98 : -70,
      backgroundColor: theme.colors.accent[500],
    },
    dotGrid: {
      position: 'absolute',
      top: 50,
      right: 18,
      width: 90,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      opacity: 0.18,
    },
    dot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.white,
    },

    heroBody: {
      zIndex: 2,
      width: '100%',
      maxWidth: bp.contentMaxWidth,
      alignSelf: 'center',
    },
    heroTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.lg,
    },
    heroEyebrow: {
      letterSpacing: 1.4,
    },
    statusChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: theme.spacing.sm + 2,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: theme.colors.brand.glassBg,
      borderWidth: 1,
      borderColor: theme.colors.brand.glassBorder,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.success[400],
    },

    identityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    },
    avatarWrap: {
      position: 'relative',
    },
    avatarRing: {
      width: 76,
      height: 76,
      borderRadius: 38,
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.32)',
      padding: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: 'rgba(255,255,255,0.16)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarBadge: {
      position: 'absolute',
      right: -2,
      bottom: -2,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.colors.success[500],
      borderWidth: 2,
      borderColor: theme.colors.primary[700],
      alignItems: 'center',
      justifyContent: 'center',
    },
    identityText: {
      flex: 1,
    },
    identityName: {
      letterSpacing: -0.4,
    },
    identityEmail: {
      marginTop: 2,
    },
    rolePill: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: theme.spacing.sm,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: theme.colors.brand.glassBgStrong,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    },

    heroStatsRow: {
      flexDirection: 'row',
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.brand.glassBorder,
      paddingVertical: theme.spacing.sm,
    },
    heroStatCell: {
      flex: 1,
      paddingHorizontal: theme.spacing.sm,
      gap: 2,
      position: 'relative',
    },
    heroStatDivider: {
      position: 'absolute',
      right: 0,
      top: 4,
      bottom: 4,
      width: 1,
      backgroundColor: 'rgba(255,255,255,0.18)',
    },

    // Content wrap: centers & caps all post-hero content
    body: {
      width: '100%',
      maxWidth: bp.contentMaxWidth,
      alignSelf: 'center',
      paddingHorizontal: bp.gutter,
    },

    sectionEyebrow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.lg,
      marginBottom: theme.spacing.md,
    },
    eyebrowLine: {
      width: 24,
      height: 2,
      borderRadius: 1,
      backgroundColor: theme.colors.primary[600],
    },

    menuCard: {
      overflow: 'hidden',
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.white,
      minHeight: 64,
    },
    menuSeparator: {
      height: 1,
      backgroundColor: theme.colors.gray[100],
      marginLeft: 64,
    },
    menuItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      flex: 1,
    },
    menuTextContainer: {
      flex: 1,
    },
    menuIconContainer: {
      width: 38,
      height: 38,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuChevronWrap: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.gray[50],
      alignItems: 'center',
      justifyContent: 'center',
    },

    themeSegment: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.md,
    },
    themeOption: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center',
      backgroundColor: theme.colors.gray[100],
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
    },
    themeOptionActive: {
      backgroundColor: theme.colors.primary[600],
      borderColor: theme.colors.primary[600],
      ...theme.shadows.sm,
    },

    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      backgroundColor: theme.colors.brand.bg,
      paddingVertical: rb(theme.spacing.md * btnPadScale),
      paddingHorizontal: theme.spacing.md + 2,
      borderRadius: 18,
      marginTop: theme.spacing.sm,
      ...theme.shadows.lg,
      maxWidth: actionBtnMaxWidth,
      alignSelf: actionBtnMaxWidth ? 'center' : 'stretch',
      width: actionBtnMaxWidth ? '100%' : undefined,
    },
    logoutIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: theme.colors.brand.glassBgStrong,
      borderWidth: 1,
      borderColor: theme.colors.brand.glassBorderStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoutArrow: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: theme.colors.brand.glassBg,
      borderWidth: 1,
      borderColor: theme.colors.brand.glassBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },

    deleteAccountButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      backgroundColor: theme.colors.white,
      paddingVertical: rb(theme.spacing.md * btnPadScale),
      paddingHorizontal: theme.spacing.md + 2,
      borderRadius: 18,
      marginTop: theme.spacing.md,
      borderWidth: 1.5,
      borderColor: theme.colors.error[200],
      ...theme.shadows.xs,
      maxWidth: actionBtnMaxWidth,
      alignSelf: actionBtnMaxWidth ? 'center' : 'stretch',
      width: actionBtnMaxWidth ? '100%' : undefined,
    },
    deleteIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: theme.colors.error[50],
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteArrow: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: theme.colors.error[50],
      alignItems: 'center',
      justifyContent: 'center',
    },
    cpOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    cpCard: {
      backgroundColor: theme.colors.white,
      borderRadius: 16,
      padding: 20,
      width: '100%',
      maxWidth: 460,
      alignSelf: 'center',
    },
    cpInput: {
      backgroundColor: theme.colors.white,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
      color: theme.colors.gray[900],
      marginBottom: 10,
    },
    cpActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 6,
    },
    actionSubtitle: {
      marginTop: 2,
    },

    footer: {
      marginTop: theme.spacing.xl,
      paddingVertical: theme.spacing.lg,
      alignItems: 'center',
      gap: 6,
    },
    footerLogo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
  });
};
