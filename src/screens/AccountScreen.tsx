import React, {useState, useMemo} from 'react';
import {View, StyleSheet, Alert, ScrollView, TouchableOpacity} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {useAuth} from '../contexts/AuthContext';
import {useUserScreens} from '../hooks/useUserScreens';
import {useTheme, useThemeContext} from '../contexts/ThemeContext';
import {Theme} from '../theme';
import {LogoutIcon, UserIcon, ChevronRightIcon, FileTextIcon, ClipboardIcon, LinkIcon, TagIcon, BoxIcon, SettingsIcon, ClockIcon, AlertCircleIcon, TruckIcon, TimelineIcon, ShieldIcon, GridIcon, BarChartIcon} from '../components/icons';
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

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
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
  // Self-service deactivation. Same effect as the admin's "Inactive" toggle
  // — the account is deactivated (not hard-deleted), so an admin can reactivate
  // later if needed. We log the user out immediately on success because a
  // deactivated account can't sign in again.
  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will deactivate your account. You will be signed out immediately and won\'t be able to sign in again unless an administrator reactivates the account. Are you sure you want to continue?',
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
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* User Info Card */}
        {user && (
          <Card variant="elevated" padding="lg" style={styles.userCard}>
            <View style={styles.userIcon}>
              <UserIcon size={28} color={theme.colors.primary[600]} />
            </View>
            <Typography variant="h2" weight="bold" align="center">
              {user.fullName || user.username}
            </Typography>
            <Typography
              variant="body"
              color={theme.colors.gray[500]}
              align="center"
              style={styles.userEmail}>
              {user.email}
            </Typography>
            <View style={styles.roleBadge}>
              <Typography variant="small" weight="bold" color={theme.colors.primary[700]}>
                {user.role === 'admin' ? 'ADMINISTRATOR' : 'EMPLOYEE'}
              </Typography>
            </View>
          </Card>
        )}

        {/* Admin Section */}
        {user?.role === 'admin' && (
          <>
            <View style={styles.sectionHeader}>
              <Typography variant="small" weight="bold" color={theme.colors.gray[500]}>
                ADMINISTRATION
              </Typography>
            </View>
            <Card variant="elevated" padding="none" style={styles.menuCard}>
              {canSee('/users') && (
                <>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => setUserManagementVisible(true)}
                    activeOpacity={0.7}>
                    <View style={styles.menuItemLeft}>
                      <View style={[styles.menuIconContainer, styles.adminIconBg]}>
                        <SettingsIcon size={18} color={theme.colors.accent[600]} />
                      </View>
                      <View style={styles.menuTextContainer}>
                        <Typography variant="body" weight="semibold">
                          User Management
                        </Typography>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          Manage users and permissions
                        </Typography>
                      </View>
                    </View>
                    <ChevronRightIcon size={18} color={theme.colors.gray[400]} />
                  </TouchableOpacity>
                  <View style={styles.menuSeparator} />
                </>
              )}
              {canSee('/activities') && (
                <>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => setActivityLogVisible(true)}
                    activeOpacity={0.7}>
                    <View style={styles.menuItemLeft}>
                      <View style={[styles.menuIconContainer, styles.adminIconBg]}>
                        <TimelineIcon size={18} color={theme.colors.accent[600]} />
                      </View>
                      <View style={styles.menuTextContainer}>
                        <Typography variant="body" weight="semibold">
                          Activity Logs
                        </Typography>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          View all system activities
                        </Typography>
                      </View>
                    </View>
                    <ChevronRightIcon size={18} color={theme.colors.gray[400]} />
                  </TouchableOpacity>
                  <View style={styles.menuSeparator} />
                </>
              )}
              {canSee('/admin/screen-permissions') && (
                <>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => setScreenPermissionsVisible(true)}
                    activeOpacity={0.7}>
                    <View style={styles.menuItemLeft}>
                      <View style={[styles.menuIconContainer, styles.adminIconBg]}>
                        <ShieldIcon size={18} color={theme.colors.accent[600]} />
                      </View>
                      <View style={styles.menuTextContainer}>
                        <Typography variant="body" weight="semibold">
                          Screen Permissions
                        </Typography>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          Manage user screen access
                        </Typography>
                      </View>
                    </View>
                    <ChevronRightIcon size={18} color={theme.colors.gray[400]} />
                  </TouchableOpacity>
                  <View style={styles.menuSeparator} />
                </>
              )}
              {canSee('/admin/screens') && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => setScreenManagementVisible(true)}
                  activeOpacity={0.7}>
                  <View style={styles.menuItemLeft}>
                    <View style={[styles.menuIconContainer, styles.adminIconBg]}>
                      <GridIcon size={18} color={theme.colors.accent[600]} />
                    </View>
                    <View style={styles.menuTextContainer}>
                      <Typography variant="body" weight="semibold">
                        Screen Management
                      </Typography>
                      <Typography variant="caption" color={theme.colors.gray[500]}>
                        Manage app screens
                      </Typography>
                    </View>
                  </View>
                  <ChevronRightIcon size={18} color={theme.colors.gray[400]} />
                </TouchableOpacity>
              )}
            </Card>
          </>
        )}

        {/* Inventory Section */}
        <View style={styles.sectionHeader}>
          <Typography variant="small" weight="bold" color={theme.colors.gray[500]}>
            INVENTORY MANAGEMENT
          </Typography>
        </View>
        <Card variant="elevated" padding="none" style={styles.menuCard}>
          {canSee('/routestar/model-mapping') && (
            <>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setModelMappingVisible(true)}
                activeOpacity={0.7}>
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIconContainer, styles.inventoryIconBg]}>
                    <LinkIcon size={18} color={theme.colors.info[600]} />
                  </View>
                  <Typography variant="body" weight="medium">
                    Model Mapping
                  </Typography>
                </View>
                <ChevronRightIcon size={18} color={theme.colors.gray[400]} />
              </TouchableOpacity>
              <View style={styles.menuSeparator} />
            </>
          )}
          {canSee('/routestar/item-alias-mapping') && (
            <>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setItemAliasVisible(true)}
                activeOpacity={0.7}>
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIconContainer, styles.inventoryIconBg]}>
                    <TagIcon size={18} color={theme.colors.info[600]} />
                  </View>
                  <Typography variant="body" weight="medium">
                    Item Alias Mapping
                  </Typography>
                </View>
                <ChevronRightIcon size={18} color={theme.colors.gray[400]} />
              </TouchableOpacity>
              <View style={styles.menuSeparator} />
            </>
          )}
          {canSee('/routestar/items') && (
            <>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setRouteStarItemsVisible(true)}
                activeOpacity={0.7}>
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIconContainer, styles.inventoryIconBg]}>
                    <BoxIcon size={18} color={theme.colors.info[600]} />
                  </View>
                  <Typography variant="body" weight="medium">
                    RouteStar Items
                  </Typography>
                </View>
                <ChevronRightIcon size={18} color={theme.colors.gray[400]} />
              </TouchableOpacity>
              <View style={styles.menuSeparator} />
            </>
          )}
          {canSee('/manual-po-items') && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setManualPOItemsVisible(true)}
              activeOpacity={0.7}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconContainer, styles.inventoryIconBg]}>
                  <ClipboardIcon size={18} color={theme.colors.info[600]} />
                </View>
                <Typography variant="body" weight="medium">
                  Manual PO Items
                </Typography>
              </View>
              <ChevronRightIcon size={18} color={theme.colors.gray[400]} />
            </TouchableOpacity>
          )}
        </Card>

        {/* Orders & Vendors Section */}
        <View style={styles.sectionHeader}>
          <Typography variant="small" weight="bold" color={theme.colors.gray[500]}>
            ORDERS & VENDORS
          </Typography>
        </View>
        <Card variant="elevated" padding="none" style={styles.menuCard}>
          {canSee('/orders') && (
            <>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setOrdersVisible(true)}
                activeOpacity={0.7}>
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIconContainer, styles.ordersIconBg]}>
                    <ClipboardIcon size={18} color={theme.colors.success[600]} />
                  </View>
                  <Typography variant="body" weight="medium">
                    Purchase Orders
                  </Typography>
                </View>
                <ChevronRightIcon size={18} color={theme.colors.gray[400]} />
              </TouchableOpacity>
              <View style={styles.menuSeparator} />
            </>
          )}
          {canSee('/vendors') && (
            <>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setVendorManagementVisible(true)}
                activeOpacity={0.7}>
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIconContainer, styles.ordersIconBg]}>
                    <TruckIcon size={18} color={theme.colors.success[600]} />
                  </View>
                  <Typography variant="body" weight="medium">
                    Vendors
                  </Typography>
                </View>
                <ChevronRightIcon size={18} color={theme.colors.gray[400]} />
              </TouchableOpacity>
              <View style={styles.menuSeparator} />
            </>
          )}
          {canSee('/system/fetch-history') && (
            <>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setFetchHistoryVisible(true)}
                activeOpacity={0.7}>
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIconContainer, styles.ordersIconBg]}>
                    <ClockIcon size={18} color={theme.colors.success[600]} />
                  </View>
                  <Typography variant="body" weight="medium">
                    Fetch History
                  </Typography>
                </View>
                <ChevronRightIcon size={18} color={theme.colors.gray[400]} />
              </TouchableOpacity>
              <View style={styles.menuSeparator} />
            </>
          )}
          {canSee('/discrepancies') && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setDiscrepancyManagementVisible(true)}
              activeOpacity={0.7}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconContainer, styles.ordersIconBg]}>
                  <AlertCircleIcon size={18} color={theme.colors.success[600]} />
                </View>
                <Typography variant="body" weight="medium">
                  Discrepancy Management
                </Typography>
              </View>
              <ChevronRightIcon size={18} color={theme.colors.gray[400]} />
            </TouchableOpacity>
          )}
        </Card>

        {/* Reports Section */}
        <View style={styles.sectionHeader}>
          <Typography variant="small" weight="bold" color={theme.colors.gray[500]}>
            REPORTS
          </Typography>
        </View>
        <Card variant="elevated" padding="none" style={styles.menuCard}>
          {canSee('/routestar/sales-report') && (
            <>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setSalesReportVisible(true)}
                activeOpacity={0.7}>
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIconContainer, styles.reportsIconBg]}>
                    <FileTextIcon size={18} color={theme.colors.primary[600]} />
                  </View>
                  <Typography variant="body" weight="medium">
                    Sales Report
                  </Typography>
                </View>
                <ChevronRightIcon size={18} color={theme.colors.gray[400]} />
              </TouchableOpacity>
              <View style={styles.menuSeparator} />
            </>
          )}
          {canSee('/routestar/items-invoice-usage') && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setItemsInvoiceUsageVisible(true)}
              activeOpacity={0.7}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconContainer, styles.reportsIconBg]}>
                  <BarChartIcon size={18} color={theme.colors.primary[600]} />
                </View>
                <Typography variant="body" weight="medium">
                  Items Invoice Usage
                </Typography>
              </View>
              <ChevronRightIcon size={18} color={theme.colors.gray[400]} />
            </TouchableOpacity>
          )}
        </Card>

        {/* Appearance */}
        <View style={styles.sectionHeader}>
          <Typography variant="small" weight="bold" color={theme.colors.gray[500]}>
            APPEARANCE
          </Typography>
        </View>
        <Card variant="elevated" padding="none" style={styles.menuCard}>
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconContainer, styles.reportsIconBg]}>
                <SettingsIcon size={18} color={theme.colors.primary[600]} />
              </View>
              <View style={styles.menuTextContainer}>
                <Typography variant="body" weight="semibold">
                  Theme
                </Typography>
                <Typography variant="caption" color={theme.colors.gray[500]}>
                  Currently: {mode === 'dark' ? 'Dark' : 'Light'}
                  {preference === 'system' ? ' (System)' : ''}
                </Typography>
              </View>
            </View>
          </View>
          <View style={styles.themeOptionsRow}>
            {(['light', 'dark', 'system'] as const).map(opt => {
              const active = preference === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[styles.themeOption, active && styles.themeOptionActive]}
                  onPress={() => setPreference(opt)}>
                  <Typography
                    variant="small"
                    weight={active ? 'bold' : 'medium'}
                    color={active ? theme.colors.white : theme.colors.gray[700]}>
                    {opt === 'light' ? 'Light' : opt === 'dark' ? 'Dark' : 'System'}
                  </Typography>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}>
          <LogoutIcon size={18} color={theme.colors.white} />
          <Typography variant="body" weight="bold" color={theme.colors.white}>
            Logout
          </Typography>
        </TouchableOpacity>

        {/* Delete Account Button — deactivates the account (matches admin
            "Inactive" behavior). Available to both admin and employee. */}
        <TouchableOpacity
          style={styles.deleteAccountButton}
          onPress={handleDeleteAccount}
          activeOpacity={0.8}>
          <AlertCircleIcon size={18} color={theme.colors.error[600]} />
          <Typography variant="body" weight="semibold" color={theme.colors.error[600]}>
            Delete Account
          </Typography>
        </TouchableOpacity>
        <Typography
          variant="caption"
          color={theme.colors.gray[500]}
          align="center"
          style={styles.deleteAccountHint}>
          Your account will be deactivated. An administrator can reactivate it later.
        </Typography>

        {/* App Version */}
        <View style={styles.footer}>
          <Typography variant="caption" color={theme.colors.gray[400]} align="center">
            Inventory Management v1.0.0
          </Typography>
        </View>
      </ScrollView>
      {/* Sales Report Modal */}
      <SalesReportScreen
        visible={salesReportVisible}
        onClose={() => setSalesReportVisible(false)}
      />
      {/* Orders Modal */}
      <OrdersScreen
        visible={ordersVisible}
        onClose={() => setOrdersVisible(false)}
      />
      {/* Model Category Mapping Modal */}
      <ModelCategoryMappingScreen
        visible={modelMappingVisible}
        onClose={() => setModelMappingVisible(false)}
      />
      {/* Item Alias Mapping Modal */}
      <ItemAliasMappingScreen
        visible={itemAliasVisible}
        onClose={() => setItemAliasVisible(false)}
      />
      {/* RouteStar Items Modal */}
      <RouteStarItemsScreen
        visible={routeStarItemsVisible}
        onClose={() => setRouteStarItemsVisible(false)}
      />
      {/* User Management Modal */}
      {user?.role === 'admin' && (
        <UserManagementScreen
          visible={userManagementVisible}
          onClose={() => setUserManagementVisible(false)}
        />
      )}
      {/* Fetch History Modal */}
      <FetchHistoryScreen
        visible={fetchHistoryVisible}
        onClose={() => setFetchHistoryVisible(false)}
      />
      {/* Discrepancy Management Modal */}
      <DiscrepancyManagementScreen
        visible={discrepancyManagementVisible}
        onClose={() => setDiscrepancyManagementVisible(false)}
      />
      {/* Manual PO Items Modal */}
      <ManualPOItemsScreen
        visible={manualPOItemsVisible}
        onClose={() => setManualPOItemsVisible(false)}
      />
      {/* Vendor Management Modal */}
      <VendorManagementScreen
        visible={vendorManagementVisible}
        onClose={() => setVendorManagementVisible(false)}
      />
      {/* Activity Log Modal */}
      {user?.role === 'admin' && (
        <ActivityLogScreen
          visible={activityLogVisible}
          onClose={() => setActivityLogVisible(false)}
        />
      )}
      {/* Screen Permissions Management Modal */}
      {user?.role === 'admin' && (
        <ScreenPermissionsManagementScreen
          visible={screenPermissionsVisible}
          onClose={() => setScreenPermissionsVisible(false)}
        />
      )}
      {/* Screen Management Modal */}
      {user?.role === 'admin' && (
        <ScreenManagementScreen
          visible={screenManagementVisible}
          onClose={() => setScreenManagementVisible(false)}
        />
      )}
      {/* Items Invoice Usage Modal */}
      <ItemsInvoiceUsageScreen
        visible={itemsInvoiceUsageVisible}
        onClose={() => setItemsInvoiceUsageVisible(false)}
      />
    </SafeAreaView>
  );
};
const makeStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.gray[50],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl * 2,
  },
  userCard: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  userIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: theme.colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  userEmail: {
    marginTop: theme.spacing.xs,
  },
  roleBadge: {
    marginTop: theme.spacing.md,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary[100],
  },
  sectionHeader: {
    paddingHorizontal: theme.spacing.sm,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  menuCard: {
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    minHeight: 60,
  },
  menuSeparator: {
    height: 1,
    backgroundColor: theme.colors.gray[200],
    marginLeft: 68,
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
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminIconBg: {
    backgroundColor: theme.colors.accent[100],
  },
  inventoryIconBg: {
    backgroundColor: theme.colors.info[100],
  },
  ordersIconBg: {
    backgroundColor: theme.colors.success[100],
  },
  reportsIconBg: {
    backgroundColor: theme.colors.primary[100],
  },
  themeOptionsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  themeOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: theme.colors.gray[100],
  },
  themeOptionActive: {
    backgroundColor: theme.colors.primary[600],
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.error[600],
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 10,
    shadowColor: theme.colors.error[600],
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginTop: theme.spacing.md,
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.white,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: theme.colors.error[200],
    marginTop: theme.spacing.md,
  },
  deleteAccountHint: {
    marginTop: 8,
    paddingHorizontal: theme.spacing.md,
  },
  footer: {
    marginTop: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
  },
});
