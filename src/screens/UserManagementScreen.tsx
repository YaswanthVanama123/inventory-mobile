import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  TextInput as RNTextInput,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {Button} from '../components/atoms/Button';
import {PaginatedList} from '../components/molecules/PaginatedList';
import {UserFormModal} from '../components/molecules/UserFormModal';
import {ResetPasswordModal} from '../components/molecules/ResetPasswordModal';
import {UserScreenPermissionsModal} from '../components/molecules/UserScreenPermissionsModal';
import {useAuth} from '../contexts/AuthContext';
import {useApiErrorHandler} from '../hooks/useApiErrorHandler';
import {useTheme} from '../contexts/ThemeContext';
import {Theme} from '../theme';
import {useBreakpoint, BreakpointInfo} from '../utils/breakpoints';
import userService from '../services/userService';
import {
  AlertCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  UserIcon,
  CheckCircleIcon,
  WarningIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  KeyIcon,
  ShieldIcon,
} from '../components/icons';

interface UserManagementScreenProps {
  visible: boolean;
  onClose: () => void;
}

export const UserManagementScreen: React.FC<UserManagementScreenProps> = ({
  visible,
  onClose,
}) => {
  const {token, user: currentUser} = useAuth();
  const {handleApiError} = useApiErrorHandler();
  const theme = useTheme();
  const bp = useBreakpoint();
  const styles = useMemo(() => makeStyles(theme, bp), [theme, bp]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'admin' | 'employee'>('all');
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    admins: 0,
    employees: 0,
  });
  const [userFormVisible, setUserFormVisible] = useState(false);
  const [resetPasswordVisible, setResetPasswordVisible] = useState(false);
  const [permissionsVisible, setPermissionsVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  useEffect(() => {
    if (visible && token) {
      loadData();
    }
  }, [visible, token]);
  const filteredUsers = users.filter((u: any) => {
    if (filterStatus === 'active') return u.isActive;
    if (filterStatus === 'inactive') return !u.isActive;
    if (filterStatus === 'admin') return u.role === 'admin';
    if (filterStatus === 'employee') return u.role === 'employee';
    return true;
  });
  useEffect(() => {
    const timer = setTimeout(() => {
      if (visible && token) {
        loadData();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  const loadData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const params: any = {
        page: 1,
        limit: 100,
      };
      if (searchQuery) params.search = searchQuery;
      const data = await userService.getAll(token, params);
      setUsers(data.users || []);
      setStats(data.stats || {total: 0, active: 0, inactive: 0, admins: 0, employees: 0});
    } catch (error: any) {
      console.error('Failed to fetch users:', error);
      const wasHandled = await handleApiError(error);
      if (wasHandled) return;
      setError(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };
  const handleUserPress = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };
  const handleAddUser = () => {
    setSelectedUser(null);
    setUserFormVisible(true);
  };
  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setUserFormVisible(true);
  };
  const handleResetPassword = (user: any) => {
    setSelectedUser(user);
    setResetPasswordVisible(true);
  };
  const handleManagePermissions = (user: any) => {
    setSelectedUser(user);
    setPermissionsVisible(true);
  };
  const handleToggleStatus = async (user: any) => {
    Alert.alert(
      user.isActive ? 'Deactivate User' : 'Activate User',
      `Are you sure you want to ${user.isActive ? 'deactivate' : 'activate'} ${user.fullName}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: user.isActive ? 'Deactivate' : 'Activate',
          style: user.isActive ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await userService.update(token!, user._id, {
                isActive: !user.isActive,
              });
              Alert.alert('Success', `User ${user.isActive ? 'deactivated' : 'activated'} successfully`);
              loadData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to update user status');
            }
          },
        },
      ]
    );
  };
  const handleDeleteUser = (user: any) => {
    if (user._id === currentUser?._id) {
      Alert.alert('Error', 'You cannot delete your own account');
      return;
    }
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${user.fullName}? This action cannot be undone.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await userService.deleteUser(token!, user._id);
              Alert.alert('Success', 'User deleted successfully');
              loadData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete user');
            }
          },
        },
      ]
    );
  };
  const getUserStatusColor = (isActive: boolean) => {
    return isActive ? theme.colors.success[600] : theme.colors.error[600];
  };
  const getUserStatusBgColor = (isActive: boolean) => {
    return isActive ? theme.colors.success[100] : theme.colors.error[100];
  };
  const getRoleBadgeColor = (role: string) => {
    return role === 'admin' ? theme.colors.primary[600] : theme.colors.gray[600];
  };
  const getRoleBadgeBgColor = (role: string) => {
    return role === 'admin' ? theme.colors.primary[100] : theme.colors.gray[200];
  };
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Typography variant="body" color={theme.colors.primary[600]} weight="semibold">
              Close
            </Typography>
          </TouchableOpacity>
          <Typography variant="h3" weight="bold" style={styles.modalTitle}>
            User Management
          </Typography>
          <TouchableOpacity onPress={handleAddUser} style={styles.addButton}>
            <PlusIcon size={20} color={theme.colors.primary[600]} />
          </TouchableOpacity>
        </View>
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary[600]} />
            <Typography
              variant="body"
              color={theme.colors.gray[600]}
              style={{marginTop: 16}}>
              Loading users...
            </Typography>
          </View>
        ) : (
          <PaginatedList
            data={filteredUsers}
            keyExtractor={(item, index) => item._id || String(index)}
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, styles.contentWrap]}
            refreshing={refreshing}
            onRefresh={onRefresh}
            resetKey={`${searchQuery}|${filterStatus}`}
            ItemSeparatorComponent={() => <View style={{height: 12}} />}
            ListHeaderComponent={
              <View>
                {/* Stats Cards - Neutral, professional */}
                <View style={styles.statsGrid}>
                  <View style={styles.statCardWrapper}>
                    <View style={styles.statCard}>
                      <View style={styles.statIconBadge}>
                        <UserIcon size={18} color={theme.colors.gray[700]} />
                      </View>
                      <Typography variant="caption" color={theme.colors.gray[500]} style={styles.statLabel}>
                        TOTAL USERS
                      </Typography>
                      <Typography variant="h2" weight="bold" style={styles.statValue}>
                        {stats.total}
                      </Typography>
                    </View>
                  </View>
                  <View style={styles.statCardWrapper}>
                    <View style={styles.statCard}>
                      <View style={styles.statIconBadge}>
                        <CheckCircleIcon size={18} color={theme.colors.gray[700]} />
                      </View>
                      <Typography variant="caption" color={theme.colors.gray[500]} style={styles.statLabel}>
                        ACTIVE
                      </Typography>
                      <Typography variant="h2" weight="bold" style={styles.statValue}>
                        {stats.active}
                      </Typography>
                    </View>
                  </View>
                  <View style={styles.statCardWrapper}>
                    <View style={styles.statCard}>
                      <View style={styles.statIconBadge}>
                        <WarningIcon size={18} color={theme.colors.gray[700]} />
                      </View>
                      <Typography variant="caption" color={theme.colors.gray[500]} style={styles.statLabel}>
                        INACTIVE
                      </Typography>
                      <Typography variant="h2" weight="bold" style={styles.statValue}>
                        {stats.inactive}
                      </Typography>
                    </View>
                  </View>
                  <View style={styles.statCardWrapper}>
                    <View style={styles.statCard}>
                      <View style={styles.statIconBadge}>
                        <UserIcon size={18} color={theme.colors.gray[700]} />
                      </View>
                      <Typography variant="caption" color={theme.colors.gray[500]} style={styles.statLabel}>
                        ADMINS
                      </Typography>
                      <Typography variant="h2" weight="bold" style={styles.statValue}>
                        {stats.admins}
                      </Typography>
                    </View>
                  </View>
                </View>

                {/* Filter Tabs + Search */}
                <View style={styles.stickyHeaderContainer}>
                  {/* Filter Tabs */}
                  <View style={styles.tabsContainer}>
                    <TouchableOpacity
                      style={[
                        styles.tab,
                        filterStatus === 'all' && styles.tabActive,
                      ]}
                      onPress={() => setFilterStatus('all')}>
                      <Typography
                        variant="small"
                        weight="semibold"
                        color={
                          filterStatus === 'all'
                            ? theme.colors.white
                            : theme.colors.gray[600]
                        }>
                        All
                      </Typography>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.tab,
                        filterStatus === 'active' && styles.tabActive,
                      ]}
                      onPress={() => setFilterStatus('active')}>
                      <Typography
                        variant="small"
                        weight="semibold"
                        color={
                          filterStatus === 'active'
                            ? theme.colors.white
                            : theme.colors.gray[600]
                        }>
                        Active
                      </Typography>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.tab,
                        filterStatus === 'inactive' && styles.tabActive,
                      ]}
                      onPress={() => setFilterStatus('inactive')}>
                      <Typography
                        variant="small"
                        weight="semibold"
                        color={
                          filterStatus === 'inactive'
                            ? theme.colors.white
                            : theme.colors.gray[600]
                        }>
                        Inactive
                      </Typography>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.tab,
                        filterStatus === 'admin' && styles.tabActive,
                      ]}
                      onPress={() => setFilterStatus('admin')}>
                      <Typography
                        variant="small"
                        weight="semibold"
                        color={
                          filterStatus === 'admin'
                            ? theme.colors.white
                            : theme.colors.gray[600]
                        }>
                        Admin
                      </Typography>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.tab,
                        filterStatus === 'employee' && styles.tabActive,
                      ]}
                      onPress={() => setFilterStatus('employee')}>
                      <Typography
                        variant="small"
                        weight="semibold"
                        color={
                          filterStatus === 'employee'
                            ? theme.colors.white
                            : theme.colors.gray[600]
                        }>
                        Employee
                      </Typography>
                    </TouchableOpacity>
                  </View>
                  {/* Search Bar */}
                  <View style={styles.searchContainer}>
                    <RNTextInput
                      style={styles.searchInput}
                      placeholder="Search by name or email"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholderTextColor={theme.colors.gray[400]}
                    />
                  </View>
                </View>

                {/* Error State */}
                {error && (
                  <Card variant="outlined" padding="lg" style={styles.errorCard}>
                    <View style={styles.errorContent}>
                      <AlertCircleIcon size={24} color={theme.colors.error[500]} />
                      <Typography
                        variant="body"
                        color={theme.colors.error[700]}
                        style={styles.errorText}>
                        {error}
                      </Typography>
                    </View>
                  </Card>
                )}
              </View>
            }
            ListEmptyComponent={
              error ? null : (
                <Card variant="outlined" padding="lg" style={styles.emptyCard}>
                  <UserIcon size={48} color={theme.colors.gray[400]} />
                  <Typography
                    variant="h3"
                    weight="semibold"
                    color={theme.colors.gray[700]}
                    style={styles.emptyTitle}>
                    No users found
                  </Typography>
                  <Typography
                    variant="body"
                    color={theme.colors.gray[500]}
                    align="center">
                    {searchQuery || filterStatus !== 'all'
                      ? 'Try adjusting your search or filter'
                      : 'Add a user to get started'}
                  </Typography>
                </Card>
              )
            }
            renderItem={({item: user}) => {
              const isExpanded = expandedUsers.has(user._id);
              const isCurrentUser = user._id === currentUser?._id;
              return (
                <Card
                  variant="elevated"
                  padding="none"
                  style={styles.userCard}>
                  <TouchableOpacity
                    onPress={() => handleUserPress(user._id)}
                    style={styles.userHeader}>
                    <View style={styles.userHeaderLeft}>
                      <View style={styles.chevronContainer}>
                        {isExpanded ? (
                          <ChevronDownIcon size={20} color={theme.colors.gray[600]} />
                        ) : (
                          <ChevronRightIcon size={20} color={theme.colors.gray[600]} />
                        )}
                      </View>
                      <View style={styles.userInfo}>
                        <View style={styles.userNameRow}>
                          <Typography variant="body" weight="bold" numberOfLines={1}>
                            {user.fullName}
                          </Typography>
                          {isCurrentUser && (
                            <View style={styles.youBadge}>
                              <Typography variant="caption" color={theme.colors.primary[600]} weight="semibold">
                                You
                              </Typography>
                            </View>
                          )}
                        </View>
                        <Typography variant="caption" color={theme.colors.gray[500]} numberOfLines={1}>
                          @{user.username}
                        </Typography>
                      </View>
                    </View>
                    <View style={styles.userHeaderRight}>
                      <View style={[styles.statusBadge, {backgroundColor: getUserStatusBgColor(user.isActive)}]}>
                        <Typography
                          variant="caption"
                          weight="semibold"
                          color={getUserStatusColor(user.isActive)}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Typography>
                      </View>
                    </View>
                  </TouchableOpacity>
                  {/* User Meta */}
                  <View style={styles.userMeta}>
                    <View style={styles.metaRow}>
                      <Typography variant="caption" color={theme.colors.gray[500]}>
                        Email
                      </Typography>
                      <Typography variant="small" weight="medium" numberOfLines={1} style={{flex: 1, textAlign: 'right'}}>
                        {user.email}
                      </Typography>
                    </View>
                    <View style={styles.metaRow}>
                      <Typography variant="caption" color={theme.colors.gray[500]}>
                        Role
                      </Typography>
                      <View style={[styles.roleBadge, {backgroundColor: getRoleBadgeBgColor(user.role)}]}>
                        <Typography
                          variant="caption"
                          weight="semibold"
                          color={getRoleBadgeColor(user.role)}>
                          {user.role === 'admin' ? 'Administrator' : 'Employee'}
                        </Typography>
                      </View>
                    </View>
                    {user.truckNumber && (
                      <View style={styles.metaRow}>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          Route Name
                        </Typography>
                        <Typography variant="small" weight="medium">
                          {user.truckNumber}
                        </Typography>
                      </View>
                    )}
                  </View>
                  {/* Expanded Content - Actions */}
                  {isExpanded && (
                    <View style={styles.expandedContent}>
                      <View style={styles.actionsRow}>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleEditUser(user)}>
                          <EditIcon size={16} color={theme.colors.primary[600]} />
                          <Typography variant="small" color={theme.colors.primary[600]} weight="medium">
                            Edit
                          </Typography>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleResetPassword(user)}>
                          <KeyIcon size={16} color={theme.colors.primary[600]} />
                          <Typography variant="small" color={theme.colors.primary[600]} weight="medium">
                            Reset Password
                          </Typography>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleManagePermissions(user)}>
                          <ShieldIcon size={16} color={theme.colors.primary[600]} />
                          <Typography variant="small" color={theme.colors.primary[600]} weight="medium">
                            Permissions
                          </Typography>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleToggleStatus(user)}>
                          <CheckCircleIcon size={16} color={user.isActive ? theme.colors.error[600] : theme.colors.success[600]} />
                          <Typography variant="small" color={user.isActive ? theme.colors.error[600] : theme.colors.success[600]} weight="medium">
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </Typography>
                        </TouchableOpacity>
                        {!isCurrentUser && (
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleDeleteUser(user)}>
                            <TrashIcon size={16} color={theme.colors.error[600]} />
                            <Typography variant="small" color={theme.colors.error[600]} weight="medium">
                              Delete
                            </Typography>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  )}
                </Card>
              );
            }}
          />
        )}
        {/* User Form Modal */}
        <UserFormModal
          visible={userFormVisible}
          onClose={() => setUserFormVisible(false)}
          onSuccess={loadData}
          token={token!}
          user={selectedUser}
        />
        {/* Reset Password Modal */}
        <ResetPasswordModal
          visible={resetPasswordVisible}
          onClose={() => setResetPasswordVisible(false)}
          onSuccess={loadData}
          token={token!}
          user={selectedUser}
        />
        {/* Screen Permissions Modal */}
        <UserScreenPermissionsModal
          visible={permissionsVisible}
          onClose={() => setPermissionsVisible(false)}
          onSuccess={loadData}
          token={token!}
          user={selectedUser}
        />
      </SafeAreaView>
    </Modal>
  );
};
const makeStyles = (theme: Theme, bp: BreakpointInfo) => {
  // Stat grid: 2 cols on phone, 4 on tablet+
  const statCols = bp.isWide ? 4 : bp.isDesktop ? 4 : bp.isTablet ? 4 : 2;
  const statCardBasis = `${100 / statCols}%` as any;

  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.gray[50],
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
    backgroundColor: theme.colors.white,
  },
  closeButton: {
    paddingVertical: 4,
    width: 60,
  },
  addButton: {
    paddingVertical: 4,
    width: 60,
    alignItems: 'flex-end',
  },
  modalTitle: {
    flex: 1,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing.lg,
  },
  contentWrap: {
    width: '100%',
    maxWidth: bp.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: bp.gutter,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    width: '100%',
    maxWidth: bp.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: bp.gutter,
    paddingTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  stickyHeaderContainer: {
    backgroundColor: theme.colors.gray[50],
    paddingHorizontal: bp.gutter,
    paddingBottom: theme.spacing.md,
    maxWidth: bp.contentMaxWidth,
    width: '100%',
    alignSelf: 'center',
  },
  statCardWrapper: {
    width: statCardBasis,
    padding: 6,
  },
  statCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    minHeight: 110,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
  },
  statIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  statLabel: {
    fontSize: theme.typography.roles.caption.fontSize,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  statValue: {
    fontSize: theme.typography.roles.heading.fontSize,
    color: theme.colors.gray[900],
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: theme.spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: theme.colors.gray[200],
  },
  tabActive: {
    backgroundColor: theme.colors.primary[600],
  },
  searchContainer: {
    marginBottom: 0,
  },
  searchInput: {
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: theme.typography.roles.sideheading.fontSize,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
    color: theme.colors.gray[900],
  },
  errorCard: {
    marginBottom: theme.spacing.lg,
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.error[50],
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    flex: 1,
  },
  emptyCard: {
    marginTop: theme.spacing.md,
    alignItems: 'center',
    paddingVertical: theme.spacing.xl * 2,
  },
  emptyTitle: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  usersList: {
    gap: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  userCard: {
    marginBottom: 0,
    overflow: 'hidden',
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
  },
  userHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  chevronContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  youBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: theme.colors.primary[100],
  },
  userHeaderRight: {
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  userMeta: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
    padding: theme.spacing.md,
    backgroundColor: theme.colors.gray[50],
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
    actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
  },
  });
};
