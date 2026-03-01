import React, {useState} from 'react';
import {View, StyleSheet, Alert, ScrollView, TouchableOpacity} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {Button} from '../components/atoms/Button';
import {useAuth} from '../contexts/AuthContext';
import {theme} from '../theme';
import {LogoutIcon, UserIcon, ChevronRightIcon, FileTextIcon, ClipboardIcon} from '../components/icons';
import {SalesReportScreen} from './SalesReportScreen';
import {OrdersScreen} from './OrdersScreen';

export const AccountScreen = () => {
  const {user, logout} = useAuth();
  const [salesReportVisible, setSalesReportVisible] = useState(false);
  const [ordersVisible, setOrdersVisible] = useState(false);

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
        contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Typography variant="h1" weight="bold" style={styles.headerTitle}>
            Account
          </Typography>
          <Typography
            variant="body"
            color={theme.colors.gray[500]}
            style={styles.headerSubtitle}>
            Manage your profile and preferences
          </Typography>
        </View>

        {/* User Info Card */}
        {user && (
          <Card variant="elevated" padding="lg" style={styles.userCard}>
            <View style={styles.userIcon}>
              <UserIcon size={48} color={theme.colors.primary[600]} />
            </View>
            <Typography variant="h2" weight="bold" align="center">
              {user.fullName || user.username}
            </Typography>
            <Typography
              variant="body"
              color={theme.colors.gray[600]}
              align="center"
              style={styles.userEmail}>
              {user.email}
            </Typography>
            <View style={styles.roleBadge}>
              <Typography variant="small" weight="semibold" color={theme.colors.primary[700]}>
                {user.role === 'admin' ? 'Administrator' : 'Employee'}
              </Typography>
            </View>
          </Card>
        )}

        {/* Menu Items */}
        <Card variant="elevated" padding="none" style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setOrdersVisible(true)}>
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconContainer}>
                <ClipboardIcon size={20} color={theme.colors.primary[600]} />
              </View>
              <Typography variant="body" weight="medium">
                Purchase Orders
              </Typography>
            </View>
            <ChevronRightIcon size={20} color={theme.colors.gray[400]} />
          </TouchableOpacity>

          <View style={styles.menuSeparator} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setSalesReportVisible(true)}>
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconContainer}>
                <FileTextIcon size={20} color={theme.colors.primary[600]} />
              </View>
              <Typography variant="body" weight="medium">
                Sales Report
              </Typography>
            </View>
            <ChevronRightIcon size={20} color={theme.colors.gray[400]} />
          </TouchableOpacity>
        </Card>

        {/* Logout Button */}
        <Button
          title="Logout"
          variant="danger"
          onPress={handleLogout}
          fullWidth
          leftIcon={<LogoutIcon size={20} color={theme.colors.white} />}
        />
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
    paddingTop: theme.spacing.xl,
  },
  header: {
    marginBottom: theme.spacing.xl,
  },
  headerTitle: {
    fontSize: 32,
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  userCard: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  userIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  userEmail: {
    marginTop: theme.spacing.sm,
  },
  roleBadge: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary[100],
  },
  menuCard: {
    marginBottom: theme.spacing.lg,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.white,
  },
  menuSeparator: {
    height: 1,
    backgroundColor: theme.colors.gray[200],
    marginHorizontal: theme.spacing.lg,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: theme.colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
});
