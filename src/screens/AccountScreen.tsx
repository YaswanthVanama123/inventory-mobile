import React from 'react';
import {View, StyleSheet, Alert, ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {Button} from '../components/atoms/Button';
import {useAuth} from '../contexts/AuthContext';
import {theme} from '../theme';
import {LogoutIcon, UserIcon} from '../components/icons';

export const AccountScreen = () => {
  const {user, logout} = useAuth();

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

        {/* Logout Button */}
        <Button
          title="Logout"
          variant="danger"
          onPress={handleLogout}
          fullWidth
          leftIcon={<LogoutIcon size={20} color={theme.colors.white} />}
        />
      </ScrollView>
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
});
