import React, {useState, useMemo, useEffect, useRef} from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {useAuth} from '../contexts/AuthContext';
import {useUserScreens} from '../hooks/useUserScreens';
import {useTheme, useThemeContext} from '../contexts/ThemeContext';
import {Theme} from '../theme';
import {
  LogoutIcon,
  UserIcon,
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
} from '../components/icons';
import {SalesReportScreen} from './SalesReportScreen';
import {OrdersScreen} from './OrdersScreen';
import {ModelCategoryMappingScreen} from './ModelCategoryMappingScreen';
import {ItemAliasMappingScreen} from './ItemAliasMappingScreen';
import {RouteStarItemsScreen} from './RouteStarItemsScreen';
import {UserManagementScreen} from './UserManagementScreen';
import {FetchHistoryScreen} from './FetchHistoryScreen';
import {DiscrepancyManagementScreen} from './DiscrepancyManagementScreen';
import {ManualPOItemsScreen} from './ManualPOItemsScreen';
import {VendorManagementScreen} from './VendorManagementScreen';
import {ActivityLogScreen} from './ActivityLogScreen';
import {ScreenPermissionsManagementScreen} from './ScreenPermissionsManagementScreen';
import {ScreenManagementScreen} from './ScreenManagementScreen';
import {ItemsInvoiceUsageScreen} from './ItemsInvoiceUsageScreen';
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
  eyebrow: string;
  rows: MenuRow[];
}

const MenuSection: React.FC<MenuSectionProps> = ({theme, eyebrow, rows}) => {
  const styles = useMemo(() => makeStyles(theme), [theme]);
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
  const {hasAccessToScreen} = useUserScreens();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const {preference, setPreference, mode} = useThemeContext();
  const isAdmin = user?.role === 'admin';
  const canSee = (path: string) => isAdmin || hasAccessToScreen(path);

  const [salesReportVisible, setSalesReportVisible] = useState(false);
  const [ordersVisible, setOrdersVisible] = useState(false);
  const [modelMappingVisible, setModelMappingVisible] = useState(false);
  const [itemAliasVisible, setItemAliasVisible] = useState(false);
  const [routeStarItemsVisible, setRouteStarItemsVisible] = useState(false);
  const [userManagementVisible, setUserManagementVisible] = useState(false);
  const [fetchHistoryVisible, setFetchHistoryVisible] = useState(false);
  const [discrepancyManagementVisible, setDiscrepancyManagementVisible] = useState(false);
  const [manualPOItemsVisible, setManualPOItemsVisible] = useState(false);
  const [vendorManagementVisible, setVendorManagementVisible] = useState(false);
  const [activityLogVisible, setActivityLogVisible] = useState(false);
  const [screenPermissionsVisible, setScreenPermissionsVisible] = useState(false);
  const [screenManagementVisible, setScreenManagementVisible] = useState(false);
  const [itemsInvoiceUsageVisible, setItemsInvoiceUsageVisible] = useState(false);

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
      onPress: () => setUserManagementVisible(true),
      visible: !!isAdmin && canSee('/users'),
    },
    {
      Icon: TimelineIcon,
      title: 'Activity Logs',
      subtitle: 'View all system activities',
      tone: 'accent',
      onPress: () => setActivityLogVisible(true),
      visible: !!isAdmin && canSee('/activities'),
    },
    {
      Icon: ShieldIcon,
      title: 'Screen Permissions',
      subtitle: 'Manage user screen access',
      tone: 'accent',
      onPress: () => setScreenPermissionsVisible(true),
      visible: !!isAdmin && canSee('/admin/screen-permissions'),
    },
    {
      Icon: GridIcon,
      title: 'Screen Management',
      subtitle: 'Manage app screens',
      tone: 'accent',
      onPress: () => setScreenManagementVisible(true),
      visible: !!isAdmin && canSee('/admin/screens'),
    },
  ];

  const inventoryRows: MenuRow[] = [
    {
      Icon: LinkIcon,
      title: 'Model Mapping',
      subtitle: 'Link SKUs to canonical models',
      tone: 'info',
      onPress: () => setModelMappingVisible(true),
      visible: canSee('/routestar/model-mapping'),
    },
    {
      Icon: TagIcon,
      title: 'Item Alias Mapping',
      subtitle: 'Resolve external item names',
      tone: 'info',
      onPress: () => setItemAliasVisible(true),
      visible: canSee('/routestar/item-alias-mapping'),
    },
    {
      Icon: BoxIcon,
      title: 'RouteStar Items',
      subtitle: 'Synced items from RouteStar',
      tone: 'info',
      onPress: () => setRouteStarItemsVisible(true),
      visible: canSee('/routestar/items'),
    },
    {
      Icon: ClipboardIcon,
      title: 'Manual PO Items',
      subtitle: 'Items captured from manual orders',
      tone: 'info',
      onPress: () => setManualPOItemsVisible(true),
      visible: canSee('/manual-po-items'),
    },
  ];

  const ordersRows: MenuRow[] = [
    {
      Icon: ClipboardIcon,
      title: 'Purchase Orders',
      subtitle: 'Browse and review purchase orders',
      tone: 'success',
      onPress: () => setOrdersVisible(true),
      visible: canSee('/orders'),
    },
    {
      Icon: TruckIcon,
      title: 'Vendors',
      subtitle: 'Vendor records and contacts',
      tone: 'success',
      onPress: () => setVendorManagementVisible(true),
      visible: canSee('/vendors'),
    },
    {
      Icon: ClockIcon,
      title: 'Fetch History',
      subtitle: 'External sync run history',
      tone: 'success',
      onPress: () => setFetchHistoryVisible(true),
      visible: canSee('/system/fetch-history'),
    },
    {
      Icon: AlertCircleIcon,
      title: 'Discrepancy Management',
      subtitle: 'Reconcile stock differences',
      tone: 'warning',
      onPress: () => setDiscrepancyManagementVisible(true),
      visible: canSee('/discrepancies'),
    },
  ];

  const reportsRows: MenuRow[] = [
    {
      Icon: FileTextIcon,
      title: 'Sales Report',
      subtitle: 'Sales by item, customer, period',
      tone: 'primary',
      onPress: () => setSalesReportVisible(true),
      visible: canSee('/routestar/sales-report'),
    },
    {
      Icon: BarChartIcon,
      title: 'Items Invoice Usage',
      subtitle: 'Invoice usage breakdown by item',
      tone: 'primary',
      onPress: () => setItemsInvoiceUsageVisible(true),
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
                color={theme.colors.primary[200]}
                style={styles.heroEyebrow}>
                ACCOUNT
              </Typography>
              <View style={styles.statusChip}>
                <View style={styles.statusDot} />
                <Typography variant="caption" weight="semibold" color={theme.colors.white}>
                  Signed in
                </Typography>
              </View>
            </View>

            <View style={styles.identityRow}>
              <View style={styles.avatarWrap}>
                <View style={styles.avatarRing}>
                  <View style={styles.avatar}>
                    <Typography variant="h2" weight="bold" color={theme.colors.white}>
                      {initials}
                    </Typography>
                  </View>
                </View>
                <View style={styles.avatarBadge}>
                  <CheckCircleIcon size={12} color={theme.colors.white} />
                </View>
              </View>
              <View style={styles.identityText}>
                <Typography
                  variant="h2"
                  weight="bold"
                  color={theme.colors.white}
                  style={styles.identityName}>
                  {user?.fullName || user?.username || 'Guest'}
                </Typography>
                <Typography
                  variant="small"
                  color={theme.colors.primary[100]}
                  style={styles.identityEmail}>
                  {user?.email || '—'}
                </Typography>
                <View style={styles.rolePill}>
                  <ShieldIcon size={12} color={theme.colors.white} />
                  <Typography variant="caption" weight="semibold" color={theme.colors.white}>
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
                    color={theme.colors.primary[100]}>
                    {s.label}
                  </Typography>
                  <Typography variant="small" weight="bold" color={theme.colors.white}>
                    {s.value}
                  </Typography>
                  {idx < heroStats.length - 1 && <View style={styles.heroStatDivider} />}
                </View>
              ))}
            </View>
          </Animated.View>
        </View>

        <View style={styles.body}>
          <MenuSection theme={theme} eyebrow="ADMINISTRATION" rows={adminRows} />
          <MenuSection theme={theme} eyebrow="INVENTORY MANAGEMENT" rows={inventoryRows} />
          <MenuSection theme={theme} eyebrow="ORDERS & VENDORS" rows={ordersRows} />
          <MenuSection theme={theme} eyebrow="REPORTS" rows={reportsRows} />

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
            activeOpacity={0.85}>
            <View style={styles.logoutIconWrap}>
              <LogoutIcon size={18} color={theme.colors.white} />
            </View>
            <View style={{flex: 1}}>
              <Typography variant="body" weight="bold" color={theme.colors.white}>
                Logout
              </Typography>
              <Typography variant="caption" color={theme.colors.primary[100]}>
                End your session on this device
              </Typography>
            </View>
            <ChevronRightIcon size={18} color={theme.colors.white} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteAccountButton}
            onPress={handleDeleteAccount}
            activeOpacity={0.85}>
            <View style={styles.deleteIconWrap}>
              <AlertCircleIcon size={18} color={theme.colors.error[600]} />
            </View>
            <View style={{flex: 1}}>
              <Typography variant="body" weight="semibold" color={theme.colors.error[700]}>
                Delete Account
              </Typography>
              <Typography variant="caption" color={theme.colors.gray[500]}>
                Deactivates your account · admin can reactivate later
              </Typography>
            </View>
            <ChevronRightIcon size={18} color={theme.colors.error[400]} />
          </TouchableOpacity>

          <View style={styles.footer}>
            <View style={styles.footerLogo}>
              <BoxIcon size={14} color={theme.colors.primary[600]} />
              <Typography
                variant="caption"
                weight="semibold"
                color={theme.colors.gray[600]}>
                Inventory OS
              </Typography>
            </View>
            <Typography variant="caption" color={theme.colors.gray[400]} align="center">
              v1.0.0 · made for operations teams
            </Typography>
          </View>
        </View>
      </ScrollView>

      <SalesReportScreen
        visible={salesReportVisible}
        onClose={() => setSalesReportVisible(false)}
      />
      <OrdersScreen visible={ordersVisible} onClose={() => setOrdersVisible(false)} />
      <ModelCategoryMappingScreen
        visible={modelMappingVisible}
        onClose={() => setModelMappingVisible(false)}
      />
      <ItemAliasMappingScreen
        visible={itemAliasVisible}
        onClose={() => setItemAliasVisible(false)}
      />
      <RouteStarItemsScreen
        visible={routeStarItemsVisible}
        onClose={() => setRouteStarItemsVisible(false)}
      />
      {user?.role === 'admin' && (
        <UserManagementScreen
          visible={userManagementVisible}
          onClose={() => setUserManagementVisible(false)}
        />
      )}
      <FetchHistoryScreen
        visible={fetchHistoryVisible}
        onClose={() => setFetchHistoryVisible(false)}
      />
      <DiscrepancyManagementScreen
        visible={discrepancyManagementVisible}
        onClose={() => setDiscrepancyManagementVisible(false)}
      />
      <ManualPOItemsScreen
        visible={manualPOItemsVisible}
        onClose={() => setManualPOItemsVisible(false)}
      />
      <VendorManagementScreen
        visible={vendorManagementVisible}
        onClose={() => setVendorManagementVisible(false)}
      />
      {user?.role === 'admin' && (
        <ActivityLogScreen
          visible={activityLogVisible}
          onClose={() => setActivityLogVisible(false)}
        />
      )}
      {user?.role === 'admin' && (
        <ScreenPermissionsManagementScreen
          visible={screenPermissionsVisible}
          onClose={() => setScreenPermissionsVisible(false)}
        />
      )}
      {user?.role === 'admin' && (
        <ScreenManagementScreen
          visible={screenManagementVisible}
          onClose={() => setScreenManagementVisible(false)}
        />
      )}
      <ItemsInvoiceUsageScreen
        visible={itemsInvoiceUsageVisible}
        onClose={() => setItemsInvoiceUsageVisible(false)}
      />
    </SafeAreaView>
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.primary[700],
    },
    scrollView: {
      flex: 1,
      backgroundColor: theme.colors.background.secondary,
    },
    scrollContent: {
      paddingBottom: theme.spacing.xxxl,
    },

    hero: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xl + theme.spacing.md,
      backgroundColor: theme.colors.primary[700],
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
      width: 280,
      height: 280,
      top: -130,
      right: -100,
      backgroundColor: theme.colors.primary[400],
    },
    blobTwo: {
      width: 220,
      height: 220,
      bottom: -110,
      left: -70,
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
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.18)',
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
      backgroundColor: 'rgba(255,255,255,0.14)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    },

    heroStatsRow: {
      flexDirection: 'row',
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.18)',
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

    body: {
      paddingHorizontal: theme.spacing.lg,
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
      backgroundColor: theme.colors.primary[600],
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      borderRadius: 14,
      marginTop: theme.spacing.sm,
      ...theme.shadows.md,
    },
    logoutIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 11,
      backgroundColor: 'rgba(255,255,255,0.18)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.22)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    deleteAccountButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      backgroundColor: theme.colors.white,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      borderRadius: 14,
      marginTop: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.error[100],
    },
    deleteIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 11,
      backgroundColor: theme.colors.error[50],
      alignItems: 'center',
      justifyContent: 'center',
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
