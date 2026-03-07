import React, {useState} from 'react';
import {View, StyleSheet, Alert, ScrollView, TouchableOpacity} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {useAuth} from '../contexts/AuthContext';
import {theme} from '../theme';
import {LogoutIcon, UserIcon, ChevronRightIcon, FileTextIcon, ClipboardIcon, LinkIcon, TagIcon, BoxIcon, SettingsIcon, ClockIcon, AlertCircleIcon, TruckIcon} from '../components/icons';
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

export const AccountScreen = () => {
  const {user, logout} = useAuth();
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
        </Card>

        {/* Orders & Vendors Section */}
        <View style={styles.sectionHeader}>
          <Typography variant="small" weight="bold" color={theme.colors.gray[500]}>
            ORDERS & VENDORS
          </Typography>
        </View>
        <Card variant="elevated" padding="none" style={styles.menuCard}>
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
        </Card>

        {/* Reports Section */}
        <View style={styles.sectionHeader}>
          <Typography variant="small" weight="bold" color={theme.colors.gray[500]}>
            REPORTS
          </Typography>
        </View>
        <Card variant="elevated" padding="none" style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setSalesReportVisible(true)}
            activeOpacity={0.7}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconContainer, styles.reportsIconBg]}>
                <FileTextIcon size={18} color={theme.colors.warning[600]} />
              </View>
              <Typography variant="body" weight="medium">
                Sales Report
              </Typography>
            </View>
            <ChevronRightIcon size={18} color={theme.colors.gray[400]} />
          </TouchableOpacity>
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
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
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
    backgroundColor: theme.colors.warning[100],
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
  footer: {
    marginTop: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
  },
});
