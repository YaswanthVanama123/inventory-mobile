import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  TextInput as RNTextInput,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../atoms/Typography';
import {Card} from '../atoms/Card';
import {Button} from '../atoms/Button';
import {Checkbox} from '../atoms/Checkbox';
import {useApiErrorHandler} from '../../hooks/useApiErrorHandler';
import {useTheme} from '../../contexts/ThemeContext';
import {Theme} from '../../theme';
import {useBreakpoint, BreakpointInfo} from '../../utils/breakpoints';
import screenPermissionService, {
  Screen,
} from '../../services/screenPermissionService';
import {
  ShieldIcon,
  CheckIcon,
  XIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LockIcon,
  GridIcon,
} from '../icons';

interface UserScreenPermissionsModalProps {
  visible: boolean;
  token: string;
  user: any | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const UserScreenPermissionsModal: React.FC<
  UserScreenPermissionsModalProps
> = ({visible, token, user, onClose, onSuccess}) => {
  const {handleApiError} = useApiErrorHandler();
  const theme = useTheme();
  const bp = useBreakpoint();
  const styles = useMemo(() => makeStyles(theme, bp), [theme, bp]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [allScreens, setAllScreens] = useState<Screen[]>([]);
  const [selectedScreenIds, setSelectedScreenIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );

  const userId = user ? user._id || user.id : null;

  useEffect(() => {
    if (visible && user && token) {
      loadData();
    }
    if (!visible) {
      setAllScreens([]);
      setSelectedScreenIds([]);
      setSearchTerm('');
      setError(null);
      setExpandedCategories(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, user, token]);

  const loadData = async () => {
    if (!token || !userId) return;
    try {
      setLoading(true);
      setError(null);

      const screens = await screenPermissionService.getAllScreens(token);
      const screensArr = Array.isArray(screens) ? screens : [];
      setAllScreens(screensArr);

      const userScreens = await screenPermissionService.getUserScreens(
        token,
        userId,
      );
      setSelectedScreenIds(userScreens.map(s => s._id));

      const categories = [...new Set(screensArr.map(s => s.category))];
      setExpandedCategories(new Set(categories));
    } catch (err: any) {
      console.error('Failed to load screen permissions:', err);
      const wasHandled = await handleApiError(err);
      if (wasHandled) return;
      setError(err.message || 'Failed to load screen permissions');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredScreens = (): Screen[] => {
    if (!searchTerm) return allScreens;
    const term = searchTerm.toLowerCase();
    return allScreens.filter(
      screen =>
        screen.displayName.toLowerCase().includes(term) ||
        screen.description?.toLowerCase().includes(term) ||
        screen.path.toLowerCase().includes(term),
    );
  };

  const groupScreensByCategory = (screens: Screen[]) => {
    const grouped: Record<string, Screen[]> = {};
    screens.forEach(screen => {
      const category = screen.category || 'Other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(screen);
    });
    Object.keys(grouped).forEach(category => {
      grouped[category].sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return a.displayName.localeCompare(b.displayName);
      });
    });
    return grouped;
  };

  const toggleCategoryExpanded = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleToggleScreen = (screenId: string) => {
    setSelectedScreenIds(prev =>
      prev.includes(screenId)
        ? prev.filter(id => id !== screenId)
        : [...prev, screenId],
    );
  };

  const handleSelectCategory = (category: string) => {
    const categoryIds = allScreens
      .filter(s => s.category === category)
      .map(s => s._id);
    const allSelected = categoryIds.every(id =>
      selectedScreenIds.includes(id),
    );
    if (allSelected) {
      setSelectedScreenIds(prev =>
        prev.filter(id => !categoryIds.includes(id)),
      );
    } else {
      setSelectedScreenIds(prev => {
        const next = [...prev];
        categoryIds.forEach(id => {
          if (!next.includes(id)) next.push(id);
        });
        return next;
      });
    }
  };

  const handleToggleAll = () => {
    const filteredIds = getFilteredScreens().map(s => s._id);
    const allSelected =
      filteredIds.length > 0 &&
      filteredIds.every(id => selectedScreenIds.includes(id));
    if (allSelected) {
      setSelectedScreenIds(prev =>
        prev.filter(id => !filteredIds.includes(id)),
      );
    } else {
      setSelectedScreenIds(prev => {
        const next = [...prev];
        filteredIds.forEach(id => {
          if (!next.includes(id)) next.push(id);
        });
        return next;
      });
    }
  };

  const handleSave = async () => {
    if (!token || !userId) return;
    try {
      setSaving(true);
      await screenPermissionService.updateUserPermissions(
        token,
        userId,
        selectedScreenIds,
      );
      Alert.alert(
        'Success',
        `Permissions updated for ${user?.fullName || 'user'}`,
      );
      onSuccess?.();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update permissions');
    } finally {
      setSaving(false);
    }
  };

  const filteredScreens = getFilteredScreens();
  const groupedScreens = groupScreensByCategory(filteredScreens);
  const totalScreens = allScreens.length;
  const selectedCount = selectedScreenIds.length;
  const defaultCount = allScreens.filter(s => s.isDefault).length;
  const additionalCount =
    selectedCount -
    allScreens.filter(s => s.isDefault && selectedScreenIds.includes(s._id))
      .length;
  const allFilteredSelected =
    filteredScreens.length > 0 &&
    filteredScreens.every(s => selectedScreenIds.includes(s._id));

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => !saving && onClose()}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.topHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}>
              <ShieldIcon size={22} color={theme.colors.accent[600]} />
            </View>
            <View style={{flex: 1}}>
              <Typography variant="h3" weight="bold">
                Screen Permissions
              </Typography>
              <Typography variant="caption" color={theme.colors.gray[500]}>
                Control access to application screens
              </Typography>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => !saving && onClose()}
            style={styles.closeButton}
            disabled={saving}>
            <XIcon size={24} color={theme.colors.gray[600]} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={theme.colors.primary[600]}
            />
            <Typography
              variant="body"
              color={theme.colors.gray[500]}
              style={{marginTop: 16}}>
              Loading permissions...
            </Typography>
          </View>
        ) : (
          <>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}>
              <View style={styles.contentWrap}>
                {/* User banner */}
                {user && (
                  <Card
                    variant="outlined"
                    padding="md"
                    style={styles.userBanner}>
                    <View style={styles.userBannerRow}>
                      <View style={styles.userAvatar}>
                        <Typography
                          variant="body"
                          weight="bold"
                          color={theme.colors.primary[600]}>
                          {(user.fullName || user.username || 'U')
                            .charAt(0)
                            .toUpperCase()}
                        </Typography>
                      </View>
                      <View style={{flex: 1}}>
                        <Typography variant="body" weight="semibold">
                          {user.fullName || user.username}
                        </Typography>
                        {user.email ? (
                          <Typography
                            variant="caption"
                            color={theme.colors.gray[600]}>
                            {user.email}
                          </Typography>
                        ) : null}
                      </View>
                      {user.role ? (
                        <View style={styles.roleBadge}>
                          <Typography
                            variant="caption"
                            weight="medium"
                            color={theme.colors.primary[700]}>
                            {String(user.role).toUpperCase()}
                          </Typography>
                        </View>
                      ) : null}
                    </View>
                  </Card>
                )}

                {error && (
                  <Card
                    variant="outlined"
                    padding="md"
                    style={styles.errorCard}>
                    <Typography
                      variant="body"
                      color={theme.colors.error[700]}>
                      {error}
                    </Typography>
                  </Card>
                )}

                {/* Search */}
                <RNTextInput
                  style={styles.searchInput}
                  placeholder="Search screens by name or path..."
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  placeholderTextColor={theme.colors.gray[400]}
                />

                {/* Summary + select all */}
                <View style={styles.summaryRow}>
                  <View style={styles.summaryLeft}>
                    <Typography
                      variant="small"
                      color={theme.colors.gray[600]}>
                      <Typography
                        variant="small"
                        weight="bold"
                        color={theme.colors.primary[600]}>
                        {selectedCount}
                      </Typography>
                      {` / ${totalScreens} selected`}
                    </Typography>
                    <Typography
                      variant="caption"
                      color={theme.colors.gray[500]}>
                      {defaultCount} default
                    </Typography>
                  </View>
                  <Button
                    title={allFilteredSelected ? 'Deselect All' : 'Select All'}
                    variant="outline"
                    size="sm"
                    onPress={handleToggleAll}
                    disabled={filteredScreens.length === 0}
                  />
                </View>

                {/* Screens grouped by category */}
                {Object.keys(groupedScreens).length === 0 ? (
                  <View style={styles.emptyState}>
                    <GridIcon size={40} color={theme.colors.gray[400]} />
                    <Typography
                      variant="body"
                      weight="semibold"
                      color={theme.colors.gray[700]}
                      style={{marginTop: 12}}>
                      No screens found
                    </Typography>
                    <Typography
                      variant="caption"
                      color={theme.colors.gray[500]}>
                      Try adjusting your search
                    </Typography>
                  </View>
                ) : (
                  Object.entries(groupedScreens).map(([category, screens]) => {
                    const isExpanded = expandedCategories.has(category);
                    const selectedInCategory = screens.filter(s =>
                      selectedScreenIds.includes(s._id),
                    ).length;
                    const totalInCategory = screens.length;
                    const allCategorySelected =
                      selectedInCategory === totalInCategory;

                    return (
                      <Card
                        key={category}
                        variant="elevated"
                        padding="none"
                        style={styles.categoryCard}>
                        <View style={styles.categoryHeader}>
                          <TouchableOpacity
                            style={styles.categoryHeaderLeft}
                            onPress={() => toggleCategoryExpanded(category)}>
                            <View style={{flex: 1}}>
                              <Typography variant="body" weight="semibold">
                                {category}
                              </Typography>
                              <Typography
                                variant="caption"
                                color={theme.colors.gray[500]}>
                                {selectedInCategory} of {totalInCategory}{' '}
                                selected
                              </Typography>
                            </View>
                            {isExpanded ? (
                              <ChevronUpIcon
                                size={20}
                                color={theme.colors.gray[600]}
                              />
                            ) : (
                              <ChevronDownIcon
                                size={20}
                                color={theme.colors.gray[600]}
                              />
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.categorySelectAll}
                            onPress={() => handleSelectCategory(category)}>
                            <Typography
                              variant="caption"
                              weight="medium"
                              color={theme.colors.primary[600]}>
                              {allCategorySelected ? 'Deselect' : 'Select All'}
                            </Typography>
                          </TouchableOpacity>
                        </View>

                        {isExpanded && (
                          <View style={styles.screensList}>
                            {screens.map(screen => {
                              const isSelected = selectedScreenIds.includes(
                                screen._id,
                              );
                              return (
                                <TouchableOpacity
                                  key={screen._id}
                                  style={styles.screenItem}
                                  onPress={() =>
                                    handleToggleScreen(screen._id)
                                  }>
                                  <View style={styles.screenItemLeft}>
                                    <Checkbox
                                      checked={isSelected}
                                      onChange={() =>
                                        handleToggleScreen(screen._id)
                                      }
                                    />
                                    <View style={styles.screenInfo}>
                                      <View style={styles.screenTitleRow}>
                                        <Typography
                                          variant="body"
                                          weight="medium">
                                          {screen.displayName}
                                        </Typography>
                                        {screen.isDefault && (
                                          <View style={styles.defaultBadge}>
                                            <LockIcon
                                              size={10}
                                              color={theme.colors.primary[700]}
                                            />
                                            <Typography
                                              variant="caption"
                                              weight="medium"
                                              color={theme.colors.primary[700]}>
                                              Default
                                            </Typography>
                                          </View>
                                        )}
                                      </View>
                                      {screen.description ? (
                                        <Typography
                                          variant="caption"
                                          color={theme.colors.gray[600]}>
                                          {screen.description}
                                        </Typography>
                                      ) : null}
                                      <Typography
                                        variant="caption"
                                        color={theme.colors.gray[500]}
                                        style={styles.screenPath}>
                                        {screen.path}
                                      </Typography>
                                    </View>
                                  </View>
                                  {isSelected && (
                                    <CheckIcon
                                      size={16}
                                      color={theme.colors.success[600]}
                                    />
                                  )}
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )}
                      </Card>
                    );
                  })
                )}
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <View style={styles.contentWrap}>
                <Typography
                  variant="caption"
                  color={theme.colors.gray[600]}
                  style={styles.footerNote}>
                  Default screens are automatically accessible to all
                  employees. {additionalCount} additional permission
                  {additionalCount === 1 ? '' : 's'}.
                </Typography>
                <View style={styles.footerButtons}>
                  <Button
                    title="Cancel"
                    variant="outline"
                    onPress={() => onClose()}
                    disabled={saving}
                    style={styles.footerButton}
                  />
                  <Button
                    title={saving ? 'Saving...' : 'Save Permissions'}
                    variant="primary"
                    onPress={handleSave}
                    loading={saving}
                    disabled={saving}
                    style={styles.footerButton}
                  />
                </View>
              </View>
            </View>
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const makeStyles = (theme: Theme, bp: BreakpointInfo) =>
  StyleSheet.create({
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
    headerIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.accent[100],
    },
    closeButton: {
      padding: theme.spacing.sm,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scroll: {
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
      paddingTop: theme.spacing.md,
    },
    userBanner: {
      marginBottom: theme.spacing.md,
      backgroundColor: theme.colors.primary[50],
    },
    userBannerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    userAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.white,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: theme.colors.primary[200],
    },
    roleBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: theme.colors.white,
      borderWidth: 1,
      borderColor: theme.colors.primary[200],
    },
    errorCard: {
      marginBottom: theme.spacing.md,
      backgroundColor: theme.colors.error[50],
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
      marginBottom: theme.spacing.md,
    },
    summaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.md,
    },
    summaryLeft: {
      gap: 2,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl * 2,
    },
    categoryCard: {
      marginBottom: theme.spacing.md,
    },
    categoryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      backgroundColor: theme.colors.gray[50],
    },
    categoryHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: theme.spacing.sm,
    },
    categorySelectAll: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.primary[300],
      marginLeft: theme.spacing.sm,
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
    defaultBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.primary[100],
    },
    screenPath: {
      marginTop: 2,
      fontFamily: 'monospace',
    },
    footer: {
      backgroundColor: theme.colors.white,
      borderTopWidth: 1,
      borderTopColor: theme.colors.gray[200],
      paddingVertical: theme.spacing.md,
    },
    footerNote: {
      marginBottom: theme.spacing.sm,
    },
    footerButtons: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    footerButton: {
      flex: 1,
    },
  });
