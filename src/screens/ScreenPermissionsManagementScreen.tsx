import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {Button} from '../components/atoms/Button';
import {Checkbox} from '../components/atoms/Checkbox';
import {Pagination} from '../components/molecules/Pagination';
import {useAuth} from '../contexts/AuthContext';
import {useApiErrorHandler} from '../hooks/useApiErrorHandler';
import {useTheme} from '../contexts/ThemeContext';
import {Theme} from '../theme';
import {useBreakpoint, BreakpointInfo} from '../utils/breakpoints';
import screenPermissionService, {
  Screen,
  UserWithPermissions,
} from '../services/screenPermissionService';
import {
  ShieldIcon,
  UserIcon,
  CheckIcon,
  XIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowLeftIcon,
  RefreshIcon,
} from '../components/icons';

interface ScreenPermissionsManagementScreenProps {
  visible: boolean;
  onClose: () => void;
}

export const ScreenPermissionsManagementScreen: React.FC<
  ScreenPermissionsManagementScreenProps
> = ({visible, onClose}) => {
  const {token} = useAuth();
  const {handleApiError} = useApiErrorHandler();
  const theme = useTheme();
  const bp = useBreakpoint();
  const styles = useMemo(() => makeStyles(theme, bp), [theme, bp]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [allScreens, setAllScreens] = useState<Screen[]>([]);
  const [defaultScreenIds, setDefaultScreenIds] = useState<string[]>([]);
  const [users, setUsers] = useState<UserWithPermissions[]>([]);

  // Selected user
  const [selectedUser, setSelectedUser] = useState<UserWithPermissions | null>(null);
  const [userScreenIds, setUserScreenIds] = useState<string[]>([]);

  // Tabs
  const [activeTab, setActiveTab] = useState<'default' | 'users'>('default');

  // Category expansion
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Numbered pagination over the employees list.
  const [userPage, setUserPage] = useState(1);
  const [userPageSize, setUserPageSize] = useState(20);
  const userTotalPages = Math.max(1, Math.ceil(users.length / userPageSize));
  const pagedUsers = useMemo(() => {
    const start = (userPage - 1) * userPageSize;
    return users.slice(start, start + userPageSize);
  }, [users, userPage, userPageSize]);

  // Reloading can shrink the list past the current page — clamp back.
  useEffect(() => {
    if (userPage > userTotalPages) setUserPage(userTotalPages);
  }, [userPage, userTotalPages]);

  useEffect(() => {
    if (visible && token) {
      loadData();
    }
    if (!visible) {
      setSelectedUser(null);
      setUserScreenIds([]);
    }
  }, [visible, token]);

  const loadData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);

      // Fetch screens
      const screensData = await screenPermissionService.getAllScreens(token);
      setAllScreens(Array.isArray(screensData) ? screensData : []);

      // Set default screen IDs
      const defaultIds = screensData
        .filter((screen: Screen) => screen.isDefault)
        .map((screen: Screen) => screen._id);
      setDefaultScreenIds(defaultIds);

      // Expand all categories by default
      const categories = [...new Set(screensData.map((s: Screen) => s.category))];
      setExpandedCategories(new Set(categories));

      // Fetch users
      const usersData = await screenPermissionService.getAllUsersWithPermissions(token);
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (error: any) {
      console.error('Failed to fetch data:', error);
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

  const groupScreensByCategory = (screens: Screen[]) => {
    const grouped: Record<string, Screen[]> = {};
    screens.forEach(screen => {
      if (!grouped[screen.category]) {
        grouped[screen.category] = [];
      }
      grouped[screen.category].push(screen);
    });
    return grouped;
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleToggleDefaultScreen = (screenId: string) => {
    setDefaultScreenIds(prev =>
      prev.includes(screenId) ? prev.filter(id => id !== screenId) : [...prev, screenId]
    );
  };

  const handleSaveDefaultScreens = async () => {
    try {
      setSaving(true);
      await screenPermissionService.updateDefaultScreens(token!, defaultScreenIds);
      Alert.alert('Success', 'Default screens updated successfully');
      await loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update default screens');
    } finally {
      setSaving(false);
    }
  };

  const handleInitializeScreens = () => {
    Alert.alert(
      'Initialize Screens',
      'This will create default screens based on your application routes. Continue?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Initialize',
          onPress: async () => {
            try {
              setSaving(true);
              await screenPermissionService.initializeScreens(token!);
              Alert.alert('Success', 'Screens initialized successfully');
              await loadData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to initialize screens');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const handleSelectUser = async (user: UserWithPermissions) => {
    try {
      setSelectedUser(user);
      const screens = await screenPermissionService.getUserScreens(token!, user._id);
      setUserScreenIds(screens.map(s => s._id));
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load user screens');
    }
  };

  const handleToggleUserScreen = (screenId: string) => {
    setUserScreenIds(prev =>
      prev.includes(screenId) ? prev.filter(id => id !== screenId) : [...prev, screenId]
    );
  };

  const handleSaveUserPermissions = async () => {
    if (!selectedUser) return;
    try {
      setSaving(true);
      await screenPermissionService.updateUserPermissions(
        token!,
        selectedUser._id,
        userScreenIds
      );
      Alert.alert('Success', `Permissions updated for ${selectedUser.name}`);
      await loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update user permissions');
    } finally {
      setSaving(false);
    }
  };

  const renderDefaultScreensTab = () => {
    const groupedScreens = groupScreensByCategory(allScreens);

    return (
      <ScrollView
        style={styles.tabContent}
        contentContainerStyle={styles.tabContentInner}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary[600]}
          />
        }>
        <View style={styles.contentWrap}>
        <View style={styles.header}>
          <Typography variant="body" weight="semibold">
            Default Screens for All Employees
          </Typography>
          <Typography variant="caption" color={theme.colors.gray[500]} style={styles.subtitle}>
            {defaultScreenIds.length} of {allScreens.length} selected
          </Typography>
        </View>

        <Button
          title="Save Changes"
          variant="primary"
          size="sm"
          onPress={handleSaveDefaultScreens}
          disabled={saving}
          style={styles.saveButton}
        />

        {Object.entries(groupedScreens).map(([category, screens]) => {
          const isExpanded = expandedCategories.has(category);
          const enabledCount = screens.filter(s => defaultScreenIds.includes(s._id)).length;

          return (
            <Card key={category} variant="elevated" padding="none" style={styles.categoryCard}>
              <TouchableOpacity
                style={styles.categoryHeader}
                onPress={() => toggleCategory(category)}>
                <View style={styles.categoryHeaderLeft}>
                  <Typography variant="body" weight="semibold">
                    {category}
                  </Typography>
                  <Typography variant="caption" color={theme.colors.gray[500]}>
                    {enabledCount}/{screens.length} enabled
                  </Typography>
                </View>
                {isExpanded ? (
                  <ChevronUpIcon size={20} color={theme.colors.gray[600]} />
                ) : (
                  <ChevronDownIcon size={20} color={theme.colors.gray[600]} />
                )}
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.screensList}>
                  {screens.map(screen => {
                    const isChecked = defaultScreenIds.includes(screen._id);
                    return (
                      <TouchableOpacity
                        key={screen._id}
                        style={styles.screenItem}
                        onPress={() => handleToggleDefaultScreen(screen._id)}>
                        <View style={styles.screenItemLeft}>
                          <Checkbox
                            checked={isChecked}
                            onChange={() => handleToggleDefaultScreen(screen._id)}
                          />
                          <View style={styles.screenInfo}>
                            <Typography variant="body" weight="medium">
                              {screen.displayName}
                            </Typography>
                            <Typography
                              variant="caption"
                              color={theme.colors.gray[500]}
                              style={styles.screenPath}>
                              {screen.path}
                            </Typography>
                          </View>
                        </View>
                        {isChecked && (
                          <CheckIcon size={16} color={theme.colors.success[600]} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </Card>
          );
        })}
        </View>
      </ScrollView>
    );
  };

  const renderUsersTab = () => {
    // Detail view — full width permissions panel for the selected user
    if (selectedUser) {
      const groupedScreens = groupScreensByCategory(allScreens);
      return (
        <ScrollView
          style={styles.tabContent}
          contentContainerStyle={styles.tabContentInner}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary[600]}
            />
          }>
          <View style={styles.contentWrap}>
          <TouchableOpacity
            style={styles.backRow}
            onPress={() => setSelectedUser(null)}>
            <ArrowLeftIcon size={20} color={theme.colors.primary[600]} />
            <Typography variant="body" weight="semibold" color={theme.colors.primary[600]}>
              Back to employees
            </Typography>
          </TouchableOpacity>

          <View style={styles.userScreensHeader}>
            <Typography variant="body" weight="semibold">
              Permissions for {selectedUser.name}
            </Typography>
            <Typography variant="caption" color={theme.colors.gray[500]}>
              {userScreenIds.length} screens selected
            </Typography>
          </View>

          <Button
            title="Save Permissions"
            variant="primary"
            size="sm"
            onPress={handleSaveUserPermissions}
            disabled={saving}
            style={styles.saveButton}
          />

          {Object.entries(groupedScreens).map(([category, screens]) => {
            const isExpanded = expandedCategories.has(category);
            const selectedInCategory = screens.filter(s => userScreenIds.includes(s._id))
              .length;

            return (
              <Card
                key={category}
                variant="elevated"
                padding="none"
                style={styles.categoryCard}>
                <TouchableOpacity
                  style={styles.categoryHeader}
                  onPress={() => toggleCategory(category)}>
                  <View style={styles.categoryHeaderLeft}>
                    <Typography variant="body" weight="semibold">
                      {category}
                    </Typography>
                    <Typography variant="caption" color={theme.colors.gray[500]}>
                      {selectedInCategory}/{screens.length} selected
                    </Typography>
                  </View>
                  {isExpanded ? (
                    <ChevronUpIcon size={20} color={theme.colors.gray[600]} />
                  ) : (
                    <ChevronDownIcon size={20} color={theme.colors.gray[600]} />
                  )}
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.screensList}>
                    {screens.map(screen => {
                      const isDefault = defaultScreenIds.includes(screen._id);
                      const isSelected = userScreenIds.includes(screen._id);

                      return (
                        <TouchableOpacity
                          key={screen._id}
                          style={styles.screenItem}
                          onPress={() => handleToggleUserScreen(screen._id)}>
                          <View style={styles.screenItemLeft}>
                            <Checkbox
                              checked={isSelected}
                              onChange={() => handleToggleUserScreen(screen._id)}
                            />
                            <View style={styles.screenInfo}>
                              <View style={styles.screenTitleRow}>
                                <Typography variant="body" weight="medium">
                                  {screen.displayName}
                                </Typography>
                                {isDefault && (
                                  <View style={styles.defaultBadge}>
                                    <Typography
                                      variant="caption"
                                      color={theme.colors.primary[700]}
                                      weight="medium">
                                      Default
                                    </Typography>
                                  </View>
                                )}
                              </View>
                              <Typography
                                variant="caption"
                                color={theme.colors.gray[500]}
                                style={styles.screenPath}>
                                {screen.path}
                              </Typography>
                            </View>
                          </View>
                          {isSelected && (
                            <CheckIcon size={16} color={theme.colors.success[600]} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </Card>
            );
          })}
          </View>
        </ScrollView>
      );
    }

    // Master view — full width employees list
    return (
      <ScrollView
        style={styles.tabContent}
        contentContainerStyle={styles.tabContentInner}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary[600]}
          />
        }>
        <View style={styles.contentWrap}>
        <Typography
          variant="body"
          weight="semibold"
          style={styles.usersListTitle}>
          Employees ({users.length})
        </Typography>
        <Typography variant="caption" color={theme.colors.gray[500]} style={{marginBottom: 12}}>
          Tap an employee to manage their permissions
        </Typography>
        {pagedUsers.map(user => (
          <TouchableOpacity
            key={user._id}
            style={styles.userCard}
            onPress={() => handleSelectUser(user)}>
            <View style={styles.userAvatar}>
              <Typography variant="body" weight="bold" color={theme.colors.white}>
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </Typography>
            </View>
            <View style={styles.userInfo}>
              <Typography variant="body" weight="semibold">
                {user.name}
              </Typography>
              <Typography variant="caption" color={theme.colors.gray[500]}>
                {user.email}
              </Typography>
              <View style={styles.userStats}>
                <Typography variant="caption" color={theme.colors.gray[600]}>
                  {user.totalScreensCount} screens
                </Typography>
                {user.additionalScreensCount > 0 && (
                  <Typography variant="caption" color={theme.colors.success[600]}>
                    +{user.additionalScreensCount} additional
                  </Typography>
                )}
              </View>
            </View>
            <ChevronDownIcon size={18} color={theme.colors.gray[400]} />
          </TouchableOpacity>
        ))}
        {users.length > 0 && (
          <Pagination
            currentPage={userPage}
            totalPages={userTotalPages}
            totalItems={users.length}
            pageSize={userPageSize}
            onPageChange={setUserPage}
            onPageSizeChange={setUserPageSize}
          />
        )}
        </View>
      </ScrollView>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.topHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconContainer, styles.headerIcon]}>
              <ShieldIcon size={22} color={theme.colors.accent[600]} />
            </View>
            <View>
              <Typography variant="h2" weight="bold">
                Screen Permissions
              </Typography>
              <Typography variant="caption" color={theme.colors.gray[500]}>
                Manage screen access
              </Typography>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <XIcon size={24} color={theme.colors.gray[600]} />
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Initialize"
            variant="outline"
            size="sm"
            onPress={handleInitializeScreens}
            leftIcon={<RefreshIcon size={16} color={theme.colors.gray[700]} />}
            style={styles.actionButton}
          />
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'default' && styles.tabActive]}
            onPress={() => setActiveTab('default')}>
            <Typography
              variant="body"
              weight="semibold"
              color={
                activeTab === 'default' ? theme.colors.primary[600] : theme.colors.gray[500]
              }>
              Default Screens
            </Typography>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'users' && styles.tabActive]}
            onPress={() => setActiveTab('users')}>
            <Typography
              variant="body"
              weight="semibold"
              color={
                activeTab === 'users' ? theme.colors.primary[600] : theme.colors.gray[500]
              }>
              User Permissions
            </Typography>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {loading && !refreshing && allScreens.length === 0 && users.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary[600]} />
            <Typography
              variant="body"
              color={theme.colors.gray[500]}
              style={styles.loadingText}>
              Loading...
            </Typography>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Typography variant="body" color={theme.colors.error[600]}>
              {error}
            </Typography>
            <Button title="Retry" variant="outline" size="sm" onPress={loadData} style={styles.retryButton} />
          </View>
        ) : (
          <>
            {activeTab === 'default' && renderDefaultScreensTab()}
            {activeTab === 'users' && renderUsersTab()}
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const makeStyles = (theme: Theme, bp: BreakpointInfo) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.gray[50],
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    backgroundColor: theme.colors.accent[100],
  },
  closeButton: {
    padding: theme.spacing.sm,
  },
  actions: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  actionButton: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: theme.colors.primary[600],
  },
  tabContent: {
    flex: 1,
  },
  tabContentInner: {
    paddingBottom: theme.spacing.lg,
  },
  contentWrap: {
    width: '100%',
    maxWidth: bp.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: bp.gutter,
    paddingTop: theme.spacing.lg,
  },
  header: {
    marginBottom: theme.spacing.md,
  },
  subtitle: {
    marginTop: 4,
  },
  saveButton: {
    marginBottom: theme.spacing.md,
  },
  categoryCard: {
    marginBottom: theme.spacing.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.gray[50],
  },
  categoryHeaderLeft: {
    flex: 1,
  },
  screensList: {
    padding: theme.spacing.sm,
  },
  screenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.sm,
    borderRadius: 8,
  },
  screenItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    flex: 1,
  },
  screenInfo: {
    flex: 1,
  },
  screenTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  screenPath: {
    marginTop: 2,
    fontFamily: 'monospace',
  },
  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary[100],
  },
  usersTabContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  usersList: {
    width: bp.isMobile ? '90%' : '70%',
    maxWidth: 560,
    backgroundColor: theme.colors.white,
    borderRightWidth: 1,
    borderRightColor: theme.colors.gray[200],
  },
  usersListContent: {
    padding: theme.spacing.md,
  },
  usersListTitle: {
    marginBottom: theme.spacing.md,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: 10,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.gray[50],
  },
  userCardSelected: {
    backgroundColor: theme.colors.primary[50],
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userStats: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: 2,
  },
  userScreensContainer: {
    flex: 1,
  },
  userScreensContent: {
    padding: theme.spacing.lg,
  },
  userScreensHeader: {
    marginBottom: theme.spacing.md,
  },
  noUserSelected: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  noUserText: {
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  retryButton: {
    marginTop: theme.spacing.md,
  },
});
