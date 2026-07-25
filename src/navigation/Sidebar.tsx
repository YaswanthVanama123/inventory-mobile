import React, {useMemo} from 'react';
import {View, ScrollView, TouchableOpacity, StyleSheet} from 'react-native';
import {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {useTheme} from '../contexts/ThemeContext';
import {Theme} from '../theme';
import {useAuth} from '../contexts/AuthContext';
import {useUserScreens} from '../hooks/useUserScreens';
import {useExtraScreens, ExtraScreenKey} from '../contexts/ExtraScreensContext';
import {
  HomeIcon,
  BoxIcon,
  InventoryIcon,
  ClipboardIcon,
  TruckIcon,
  FileTextIcon,
  LinkIcon,
  TagIcon,
  BarChartIcon,
  TimelineIcon,
  ClockIcon,
  SettingsIcon,
  ShieldIcon,
  GridIcon,
  UserIcon,
  AlertCircleIcon,
  WarningIcon,
  RefreshIcon,
  CheckCircleIcon,
} from '../components/icons';

export const SIDEBAR_WIDTH = 270;

type IconType = React.ComponentType<{size?: number; color?: string}>;

type SideItem =
  | {kind: 'tab'; label: string; Icon: IconType; tab: string; paths: string[]}
  | {kind: 'extra'; label: string; Icon: IconType; screen: ExtraScreenKey; path: string; adminOnly?: boolean};

type SideGroup = {title: string; items: SideItem[]};

// Mirrors the webapp sidebar structure and order.
const GROUPS: SideGroup[] = [
  {
    title: 'CORE',
    items: [{kind: 'tab', label: 'Dashboard', Icon: HomeIcon, tab: 'Home', paths: ['/dashboard']}],
  },
  {
    title: 'INVENTORY',
    items: [
      {kind: 'tab', label: 'Stock', Icon: BoxIcon, tab: 'Stock', paths: ['/stock']},
      {kind: 'extra', label: 'Stock Reconciliation', Icon: BoxIcon, screen: 'stockReconciliation', path: '/stock-reconciliation', adminOnly: true},
      {kind: 'tab', label: 'Inventory Items', Icon: InventoryIcon, tab: 'Inventory', paths: ['/inventory']},
      {kind: 'extra', label: 'Item Catalog', Icon: InventoryIcon, screen: 'inventoryCatalog', path: '/inventory'},
      {kind: 'extra', label: 'Discrepancies', Icon: AlertCircleIcon, screen: 'discrepancyManagement', path: '/discrepancies'},
    ],
  },
  {
    title: 'DAILY OPERATIONS',
    items: [
      {kind: 'tab', label: 'Orders', Icon: ClipboardIcon, tab: 'Orders', paths: ['/orders']},
      {kind: 'tab', label: 'Truck Checkouts', Icon: TruckIcon, tab: 'Checkout', paths: ['/truck-checkouts']},
      {kind: 'extra', label: 'Purchase Orders', Icon: FileTextIcon, screen: 'orders', path: '/orders'},
      {kind: 'extra', label: 'Approvals', Icon: CheckCircleIcon, screen: 'approvals', path: '/approvals'},
    ],
  },
  {
    title: 'ROUTESTAR',
    items: [
      {kind: 'extra', label: 'RouteStar Items', Icon: BoxIcon, screen: 'routeStarItems', path: '/routestar/items'},
      {kind: 'extra', label: 'RouteStar Customers', Icon: UserIcon, screen: 'routeStarCustomers', path: '/routestar/customers'},
      {kind: 'extra', label: 'Closed Invoice Customers', Icon: UserIcon, screen: 'closedInvoiceCustomers', path: '/routestar/closed-invoice-customers'},
      {kind: 'extra', label: 'Model Mapping', Icon: LinkIcon, screen: 'modelMapping', path: '/routestar/model-mapping'},
      {kind: 'extra', label: 'Item Alias Mapping', Icon: TagIcon, screen: 'itemAlias', path: '/routestar/item-alias-mapping'},
    ],
  },
  {
    title: 'MASTER DATA',
    items: [
      {kind: 'extra', label: 'Vendors', Icon: TruckIcon, screen: 'vendors', path: '/vendors'},
      {kind: 'extra', label: 'Manual PO Items', Icon: ClipboardIcon, screen: 'manualPOItems', path: '/manual-po-items'},
    ],
  },
  {
    title: 'REPORTS & ANALYTICS',
    items: [
      {kind: 'extra', label: 'Reports Hub', Icon: BarChartIcon, screen: 'reportsHub', path: '/reports'},
      {kind: 'extra', label: 'Sales Report', Icon: FileTextIcon, screen: 'salesReport', path: '/routestar/sales-report'},
      {kind: 'extra', label: 'Sales Analytics', Icon: BarChartIcon, screen: 'salesAnalytics', path: '/reports/sales'},
      {kind: 'extra', label: 'Low Stock Report', Icon: WarningIcon, screen: 'lowStockReport', path: '/reports/low-stock'},
      {kind: 'extra', label: 'Customer Export', Icon: FileTextIcon, screen: 'customerExport', path: '/reports/customer-export'},
      {kind: 'extra', label: 'Items Invoice Usage', Icon: BarChartIcon, screen: 'itemsInvoiceUsage', path: '/routestar/items-invoice-usage'},
      {kind: 'extra', label: 'Employee Activities', Icon: TimelineIcon, screen: 'activityLog', path: '/activities', adminOnly: true},
      {kind: 'extra', label: 'Fetch History', Icon: ClockIcon, screen: 'fetchHistory', path: '/system/fetch-history'},
    ],
  },
  {
    title: 'SYSTEM & ADMIN',
    items: [
      {kind: 'extra', label: 'Users', Icon: SettingsIcon, screen: 'userManagement', path: '/users', adminOnly: true},
      {kind: 'extra', label: 'Screen Permissions', Icon: ShieldIcon, screen: 'screenPermissions', path: '/admin/screen-permissions', adminOnly: true},
      {kind: 'extra', label: 'Screen Management', Icon: GridIcon, screen: 'screenManagement', path: '/admin/screens', adminOnly: true},
      {kind: 'extra', label: 'QuickBooks Sync', Icon: RefreshIcon, screen: 'quickBooksSync', path: '/system/quickbooks-sync', adminOnly: true},
      {kind: 'extra', label: 'Settings', Icon: SettingsIcon, screen: 'settings', path: '/settings', adminOnly: true},
    ],
  },
  {
    title: 'PERSONAL',
    items: [{kind: 'tab', label: 'Account', Icon: UserIcon, tab: 'Account', paths: []}],
  },
];

export const Sidebar: React.FC<BottomTabBarProps> = ({state, navigation}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const {user} = useAuth();
  const {hasAccessToScreen, hasAccessToAnyScreen} = useUserScreens();
  const {openScreen, openKey, close} = useExtraScreens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const isAdmin = user?.role === 'admin';
  const activeTab = state.routes[state.index]?.name;

  const canSee = (path: string) => isAdmin || hasAccessToScreen(path);

  const isVisible = (item: SideItem): boolean => {
    if (item.kind === 'tab') {
      if (item.tab === 'Account') return true;
      return isAdmin || hasAccessToAnyScreen(item.paths);
    }
    if (item.adminOnly && !isAdmin) return false;
    return canSee(item.path);
  };

  const isActive = (item: SideItem): boolean => {
    if (item.kind === 'tab') return activeTab === item.tab && openKey == null;
    return openKey === item.screen;
  };

  const onPressItem = (item: SideItem) => {
    if (item.kind === 'tab') {
      close();
      navigation.navigate(item.tab as never);
    } else {
      openScreen(item.screen);
    }
  };

  const initials = (() => {
    const source = user?.fullName || user?.username || '';
    const parts = source.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '·';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

  return (
    <View style={[styles.root, {paddingTop: insets.top + 16, paddingBottom: insets.bottom + 12}]}>
      <View style={styles.header}>
        <View style={styles.logoMark}>
          <BoxIcon size={20} color={theme.colors.white} />
        </View>
        <View style={{flex: 1}}>
          <Typography variant="sideheading" weight="bold" numberOfLines={1}>
            Inventory NVA
          </Typography>
          <Typography variant="caption" color={theme.colors.gray[500]}>
            {isAdmin ? 'Administrator' : 'Employee'}
          </Typography>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {GROUPS.map(group => {
          const items = group.items.filter(isVisible);
          if (items.length === 0) return null;
          return (
            <View key={group.title} style={styles.group}>
              <Typography variant="caption" weight="semibold" color={theme.colors.gray[400]} style={styles.groupTitle}>
                {group.title}
              </Typography>
              {items.map(item => {
                const active = isActive(item);
                const Icon = item.Icon;
                return (
                  <TouchableOpacity
                    key={item.label}
                    style={[styles.item, active && styles.itemActive]}
                    onPress={() => onPressItem(item)}
                    activeOpacity={0.7}>
                    <Icon size={18} color={active ? theme.colors.primary[600] : theme.colors.gray[500]} />
                    <Typography
                      variant="body"
                      weight={active ? 'semibold' : 'normal'}
                      color={active ? theme.colors.primary[700] : theme.colors.gray[700]}
                      numberOfLines={1}
                      style={styles.itemLabel}>
                      {item.label}
                    </Typography>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}
      </ScrollView>

      <TouchableOpacity style={styles.footer} onPress={() => { close(); navigation.navigate('Account' as never); }} activeOpacity={0.7}>
        <View style={styles.avatar}>
          <Typography variant="caption" weight="bold" color={theme.colors.brand.text}>
            {initials}
          </Typography>
        </View>
        <View style={{flex: 1}}>
          <Typography variant="caption" weight="semibold" numberOfLines={1}>
            {user?.fullName || user?.username || 'Account'}
          </Typography>
          <Typography variant="caption" color={theme.colors.gray[500]} numberOfLines={1}>
            View account
          </Typography>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      width: SIDEBAR_WIDTH,
      height: '100%',
      backgroundColor: theme.colors.white,
      borderRightWidth: 1,
      borderRightColor: theme.colors.gray[200],
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 18,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.gray[100],
    },
    logoMark: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: theme.colors.primary[600],
      alignItems: 'center',
      justifyContent: 'center',
    },
    scroll: {flex: 1},
    scrollContent: {paddingVertical: 12, paddingHorizontal: 12},
    group: {marginBottom: 14},
    groupTitle: {letterSpacing: 0.6, marginBottom: 6, marginLeft: 10},
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderRadius: 10,
      marginBottom: 2,
    },
    itemActive: {backgroundColor: theme.colors.primary[50]},
    itemLabel: {flex: 1},
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginHorizontal: 12,
      paddingTop: 12,
      paddingHorizontal: 10,
      borderTopWidth: 1,
      borderTopColor: theme.colors.gray[100],
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.brand.bg,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
