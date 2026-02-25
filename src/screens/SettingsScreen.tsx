import React from 'react';
import {View, StyleSheet, TouchableOpacity, Alert, ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {Button} from '../components/atoms/Button';
import {useAuth} from '../contexts/AuthContext';
import {theme} from '../theme';
import {LogoutIcon, UserIcon} from '../components/icons';

export const SettingsScreen = () => {
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
          <Typography variant="h2" weight="bold">
            Settings
          </Typography>
        </View>

        {/* User Info Card */}
        {user && (
          <Card variant="elevated" padding="lg" style={styles.userCard}>
            <View style={styles.userIcon}>
              <UserIcon size={32} color={theme.colors.primary[600]} />
            </View>
            <Typography variant="h3" weight="semibold" align="center">
              {user.fullName || user.username}
            </Typography>
            <Typography
              variant="small"
              color={theme.colors.gray[600]}
              align="center"
              style={styles.userEmail}>
              {user.email}
            </Typography>
            <View style={styles.roleBadge}>
              <Typography variant="caption" color={theme.colors.primary[600]}>
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
  },
  header: {
    marginBottom: theme.spacing.lg,
  },
  userCard: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  userIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary[100],
  },
});
