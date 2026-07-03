import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput as RNTextInput,
  Modal,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {useAuth} from '../contexts/AuthContext';
import {useApiErrorHandler} from '../hooks/useApiErrorHandler';
import {useTheme} from '../contexts/ThemeContext';
import {Theme} from '../theme';
import {useBreakpoint, BreakpointInfo} from '../utils/breakpoints';
import activityLogService from '../services/activityLogService';
import {PickerModal} from '../components/molecules/PickerModal';
import {
  TimelineIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FilterIcon,
  RefreshIcon,
  CloseIcon,
} from '../components/icons';
import {formatDateTime} from '../utils/dateUtils';

interface ActivityLogScreenProps {
  visible: boolean;
  onClose: () => void;
}

export const ActivityLogScreen: React.FC<ActivityLogScreenProps> = ({
  visible,
  onClose,
}) => {
  const {token, user} = useAuth();
  const {handleApiError} = useApiErrorHandler();
  const theme = useTheme();
  const bp = useBreakpoint();
  const styles = useMemo(() => makeStyles(theme, bp), [theme, bp]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    resource: '',
    action: '',
    device: '',
    success: '',
    search: '',
    employeeId: '',
    startDate: '',
    endDate: '',
  });

  // Tabs (admin): All / Sales / Stock Changes / Deletions -> /activities endpoints.
  type ActivityTab = 'all' | 'sales' | 'stock' | 'deletions';
  const [activeTab, setActiveTab] = useState<ActivityTab>('all');
  const [employees, setEmployees] = useState<any[]>([]);
  const [showEmployeePicker, setShowEmployeePicker] = useState(false);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (visible && token) {
      loadData();
    }
  }, [visible, token, filters, activeTab]);

  // Load the employee list for the filter dropdown (admin only).
  useEffect(() => {
    if (visible && token && isAdmin && employees.length === 0) {
      activityLogService
        .getActivityEmployees(token)
        .then(setEmployees)
        .catch(err => console.error('Load activity employees error:', err));
    }
  }, [visible, token, isAdmin]);

  // Build the query params for the employee-activities endpoints.
  const buildActivityParams = (pageNum: number) => {
    const base: any = {
      page: pageNum,
      limit: 50,
      employeeId: filters.employeeId,
      startDate: filters.startDate,
      endDate: filters.endDate,
    };
    // The /activities (all) endpoint additionally supports action/resource/search.
    if (activeTab === 'all') {
      base.action = filters.action;
      base.resource = filters.resource;
      base.search = filters.search;
    }
    return base;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [logsData, statsData] = await Promise.all([
        isAdmin
          ? activityLogService.getEmployeeActivities(
              token!,
              activeTab,
              buildActivityParams(1),
            )
          : activityLogService.getMyActivities(token!, {
              page: 1,
              limit: 50,
              resource: filters.resource,
              action: filters.action,
              device: filters.device,
              success: filters.success,
              search: filters.search,
            }),
        isAdmin ? activityLogService.getActivityStats(token!, {}) : Promise.resolve(null),
      ]);

      const nextLogs = isAdmin
        ? (logsData as any).activities || []
        : (logsData as any).logs || [];
      setLogs(nextLogs);
      setStats(statsData);
      setPage(1);
      setHasMore(((logsData as any).pagination?.pages || 1) > 1);
    } catch (error: any) {
      console.error('Load activity logs error:', error);
      await handleApiError(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMore = async () => {
    if (!hasMore || loading) return;

    try {
      const nextPage = page + 1;
      const logsData = isAdmin
        ? await activityLogService.getEmployeeActivities(
            token!,
            activeTab,
            buildActivityParams(nextPage),
          )
        : await activityLogService.getMyActivities(token!, {
            page: nextPage,
            limit: 50,
            resource: filters.resource,
            action: filters.action,
            device: filters.device,
            success: filters.success,
            search: filters.search,
          });

      const moreLogs = isAdmin
        ? (logsData as any).activities || []
        : (logsData as any).logs || [];
      setLogs(prev => [...prev, ...moreLogs]);
      setPage(nextPage);
      setHasMore(nextPage < ((logsData as any).pagination?.pages || 1));
    } catch (error) {
      console.error('Load more error:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({...prev, [key]: value}));
  };

  const clearFilters = () => {
    setFilters({
      resource: '',
      action: '',
      device: '',
      success: '',
      search: '',
      employeeId: '',
      startDate: '',
      endDate: '',
    });
  };

  const getEmployeeLabel = (empId: string) => {
    if (!empId) return 'All Employees';
    const emp = employees.find(e => (e._id || e.id) === empId);
    if (!emp) return 'All Employees';
    return `${emp.fullName || emp.username}${emp.username ? ` (${emp.username})` : ''}`;
  };

  const getActionColor = (action: string) => {
    const colors: {[key: string]: string} = {
      CREATE: theme.colors.success[600],
      UPDATE: theme.colors.info[600],
      DELETE: theme.colors.error[600],
      VIEW: theme.colors.gray[600],
      LOGIN: theme.colors.primary[600],
      LOGOUT: theme.colors.gray[600],
      SYNC: theme.colors.primary[600],
      VERIFY: theme.colors.success[600],
      APPROVE: theme.colors.success[600],
      REJECT: theme.colors.error[600],
      CANCEL: theme.colors.error[600],
    };
    return colors[action] || theme.colors.gray[600];
  };

  const getActionBgColor = (action: string) => {
    const colors: {[key: string]: string} = {
      CREATE: theme.colors.success[100],
      UPDATE: theme.colors.info[100],
      DELETE: theme.colors.error[100],
      VIEW: theme.colors.gray[100],
      LOGIN: theme.colors.primary[100],
      LOGOUT: theme.colors.gray[100],
      SYNC: theme.colors.primary[100],
      VERIFY: theme.colors.success[100],
      APPROVE: theme.colors.success[100],
      REJECT: theme.colors.error[100],
      CANCEL: theme.colors.error[100],
    };
    return colors[action] || theme.colors.gray[100];
  };

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'mobile':
        return '📱';
      case 'tablet':
        return '📱';
      case 'desktop':
        return '💻';
      case 'web':
        return '🌐';
      default:
        return '❓';
    }
  };

  const renderStatsCard = () => {
    if (!isAdmin || !stats) return null;

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.statCardPrimary]}>
            <TimelineIcon size={24} color={theme.colors.primary[600]} />
            <Typography variant="h3" weight="bold" style={styles.statValue}>
              {stats.totalLogs.toLocaleString()}
            </Typography>
            <Typography variant="caption" color={theme.colors.gray[600]}>
              Total Activities
            </Typography>
          </View>

          <View style={[styles.statCard, styles.statCardSuccess]}>
            <CheckCircleIcon size={24} color={theme.colors.success[600]} />
            <Typography variant="h3" weight="bold" style={styles.statValue}>
              {stats.successfulActions.toLocaleString()}
            </Typography>
            <Typography variant="caption" color={theme.colors.gray[600]}>
              Successful
            </Typography>
          </View>

          <View style={[styles.statCard, styles.statCardError]}>
            <XCircleIcon size={24} color={theme.colors.error[600]} />
            <Typography variant="h3" weight="bold" style={styles.statValue}>
              {stats.failedActions.toLocaleString()}
            </Typography>
            <Typography variant="caption" color={theme.colors.gray[600]}>
              Failed
            </Typography>
          </View>

          <View style={[styles.statCard, styles.statCardInfo]}>
            <Typography variant="h3" weight="bold" style={styles.statValue}>
              {stats.successRate}%
            </Typography>
            <Typography variant="caption" color={theme.colors.gray[600]}>
              Success Rate
            </Typography>
          </View>
        </View>
      </View>
    );
  };

  const renderFilters = () => (
    <Modal
      visible={showFilters}
      animationType="slide"
      transparent
      onRequestClose={() => setShowFilters(false)}>
      <View style={styles.filterModal}>
        <View style={styles.filterContainer}>
          <View style={styles.filterHeader}>
            <Typography variant="h3" weight="bold">
              Filters
            </Typography>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <CloseIcon size={24} color={theme.colors.gray[600]} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterContent}>
            {/* Employee (admin only) */}
            {isAdmin && (
              <View style={styles.filterGroup}>
                <Typography
                  variant="small"
                  weight="semibold"
                  style={styles.filterLabel}>
                  Employee
                </Typography>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setShowEmployeePicker(true)}>
                  <Typography
                    variant="body"
                    color={
                      filters.employeeId
                        ? theme.colors.gray[900]
                        : theme.colors.gray[400]
                    }
                    numberOfLines={1}
                    style={{flex: 1}}>
                    {getEmployeeLabel(filters.employeeId)}
                  </Typography>
                  <ChevronDownIcon size={20} color={theme.colors.gray[400]} />
                </TouchableOpacity>
              </View>
            )}

            {/* Date range (admin only) */}
            {isAdmin && (
              <View style={styles.filterGroup}>
                <Typography
                  variant="small"
                  weight="semibold"
                  style={styles.filterLabel}>
                  Date Range
                </Typography>
                <View style={styles.dateRow}>
                  <View style={styles.dateField}>
                    <Typography
                      variant="caption"
                      color={theme.colors.gray[500]}
                      style={{marginBottom: 4}}>
                      Start (YYYY-MM-DD)
                    </Typography>
                    <RNTextInput
                      style={styles.filterInput}
                      value={filters.startDate}
                      onChangeText={value =>
                        handleFilterChange('startDate', value)
                      }
                      placeholder="2026-01-01"
                      placeholderTextColor={theme.colors.gray[400]}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  <View style={styles.dateField}>
                    <Typography
                      variant="caption"
                      color={theme.colors.gray[500]}
                      style={{marginBottom: 4}}>
                      End (YYYY-MM-DD)
                    </Typography>
                    <RNTextInput
                      style={styles.filterInput}
                      value={filters.endDate}
                      onChangeText={value =>
                        handleFilterChange('endDate', value)
                      }
                      placeholder="2026-12-31"
                      placeholderTextColor={theme.colors.gray[400]}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Search */}
            <View style={styles.filterGroup}>
              <Typography
                variant="small"
                weight="semibold"
                style={styles.filterLabel}>
                Search
              </Typography>
              <RNTextInput
                style={styles.filterInput}
                value={filters.search}
                onChangeText={value => handleFilterChange('search', value)}
                placeholder="User, email, endpoint..."
                placeholderTextColor={theme.colors.gray[400]}
              />
            </View>

            {/* Resource */}
            {(!isAdmin || activeTab === 'all') && (
            <View style={styles.filterGroup}>
              <Typography
                variant="small"
                weight="semibold"
                style={styles.filterLabel}>
                Resource
              </Typography>
              <View style={styles.filterChips}>
                {['', 'USER', 'INVENTORY', 'INVOICE', 'ORDER', 'STOCK'].map(
                  resource => (
                    <TouchableOpacity
                      key={resource}
                      style={[
                        styles.filterChip,
                        filters.resource === resource &&
                          styles.filterChipActive,
                      ]}
                      onPress={() => handleFilterChange('resource', resource)}>
                      <Typography
                        variant="small"
                        weight="semibold"
                        color={
                          filters.resource === resource
                            ? theme.colors.white
                            : theme.colors.gray[700]
                        }>
                        {resource || 'All'}
                      </Typography>
                    </TouchableOpacity>
                  ),
                )}
              </View>
            </View>
            )}

            {/* Action */}
            {(!isAdmin || activeTab === 'all') && (
            <View style={styles.filterGroup}>
              <Typography
                variant="small"
                weight="semibold"
                style={styles.filterLabel}>
                Action
              </Typography>
              <View style={styles.filterChips}>
                {[
                  '',
                  'CREATE',
                  'UPDATE',
                  'DELETE',
                  'VIEW',
                  'LOGIN',
                  'SYNC',
                ].map(action => (
                  <TouchableOpacity
                    key={action}
                    style={[
                      styles.filterChip,
                      filters.action === action && styles.filterChipActive,
                    ]}
                    onPress={() => handleFilterChange('action', action)}>
                    <Typography
                      variant="small"
                      weight="semibold"
                      color={
                        filters.action === action
                          ? theme.colors.white
                          : theme.colors.gray[700]
                      }>
                      {action || 'All'}
                    </Typography>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            )}

            {/* Device */}
            {!isAdmin && (
            <View style={styles.filterGroup}>
              <Typography
                variant="small"
                weight="semibold"
                style={styles.filterLabel}>
                Device
              </Typography>
              <View style={styles.filterChips}>
                {['', 'web', 'mobile', 'desktop'].map(device => (
                  <TouchableOpacity
                    key={device}
                    style={[
                      styles.filterChip,
                      filters.device === device && styles.filterChipActive,
                    ]}
                    onPress={() => handleFilterChange('device', device)}>
                    <Typography
                      variant="small"
                      weight="semibold"
                      color={
                        filters.device === device
                          ? theme.colors.white
                          : theme.colors.gray[700]
                      }>
                      {device || 'All'}
                    </Typography>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            )}

            {/* Status */}
            {!isAdmin && (
            <View style={styles.filterGroup}>
              <Typography
                variant="small"
                weight="semibold"
                style={styles.filterLabel}>
                Status
              </Typography>
              <View style={styles.filterChips}>
                {[
                  {label: 'All', value: ''},
                  {label: 'Success', value: 'true'},
                  {label: 'Failed', value: 'false'},
                ].map(item => (
                  <TouchableOpacity
                    key={item.value}
                    style={[
                      styles.filterChip,
                      filters.success === item.value &&
                        styles.filterChipActive,
                    ]}
                    onPress={() => handleFilterChange('success', item.value)}>
                    <Typography
                      variant="small"
                      weight="semibold"
                      color={
                        filters.success === item.value
                          ? theme.colors.white
                          : theme.colors.gray[700]
                      }>
                      {item.label}
                    </Typography>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            )}
          </ScrollView>

          <View style={styles.filterFooter}>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={clearFilters}>
              <Typography
                variant="body"
                weight="semibold"
                color={theme.colors.gray[700]}>
                Clear All
              </Typography>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => {
                setShowFilters(false);
                loadData();
              }}>
              <Typography
                variant="body"
                weight="semibold"
                color={theme.colors.white}>
                Apply Filters
              </Typography>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderLogItem = (log: any) => {
    const isExpanded = expandedLog === log._id;

    return (
      <TouchableOpacity
        key={log._id}
        style={styles.logCard}
        onPress={() => setExpandedLog(isExpanded ? null : log._id)}>
        <View style={styles.logHeader}>
          <View style={styles.logHeaderLeft}>
            <View
              style={[
                styles.actionBadge,
                {backgroundColor: getActionBgColor(log.action)},
              ]}>
              <Typography
                variant="caption"
                weight="bold"
                style={{color: getActionColor(log.action)}}>
                {log.action}
              </Typography>
            </View>
            <Typography variant="small" weight="semibold">
              {log.resource}
            </Typography>
          </View>
          <View style={styles.logHeaderRight}>
            {log.success ? (
              <CheckCircleIcon size={20} color={theme.colors.success[600]} />
            ) : (
              <XCircleIcon size={20} color={theme.colors.error[600]} />
            )}
            {isExpanded ? (
              <ChevronUpIcon size={20} color={theme.colors.gray[600]} />
            ) : (
              <ChevronDownIcon size={20} color={theme.colors.gray[600]} />
            )}
          </View>
        </View>

        <View style={styles.logInfo}>
          <Typography variant="caption" color={theme.colors.gray[600]}>
            {log.performedByName ||
              log.performedBy?.fullName ||
              log.performedBy?.username ||
              'Unknown User'}
          </Typography>
          <Typography variant="caption" color={theme.colors.gray[500]}>
            {' • '}
          </Typography>
          <Typography variant="caption" color={theme.colors.gray[600]}>
            {formatDateTime(log.timestamp)}
          </Typography>
        </View>

        {isExpanded && (
          <View style={styles.logDetails}>
            <View style={styles.logDetailRow}>
              <Typography variant="caption" color={theme.colors.gray[500]}>
                Email:
              </Typography>
              <Typography variant="caption" weight="medium">
                {log.performedByEmail || 'N/A'}
              </Typography>
            </View>

            <View style={styles.logDetailRow}>
              <Typography variant="caption" color={theme.colors.gray[500]}>
                Device:
              </Typography>
              <Typography variant="caption" weight="medium">
                {getDeviceIcon(log.device)} {log.device}
              </Typography>
            </View>

            <View style={styles.logDetailRow}>
              <Typography variant="caption" color={theme.colors.gray[500]}>
                Browser:
              </Typography>
              <Typography variant="caption" weight="medium">
                {log.browser || 'Unknown'}
              </Typography>
            </View>

            <View style={styles.logDetailRow}>
              <Typography variant="caption" color={theme.colors.gray[500]}>
                IP Address:
              </Typography>
              <Typography variant="caption" weight="medium">
                {log.ipAddress || 'Unknown'}
              </Typography>
            </View>

            {log.endpoint && (
              <View style={styles.logDetailRow}>
                <Typography variant="caption" color={theme.colors.gray[500]}>
                  Endpoint:
                </Typography>
                <Typography
                  variant="caption"
                  weight="medium"
                  style={styles.endpointText}>
                  {log.method} {log.endpoint}
                </Typography>
              </View>
            )}

            <View style={styles.logDetailRow}>
              <Typography variant="caption" color={theme.colors.gray[500]}>
                Duration:
              </Typography>
              <Typography variant="caption" weight="medium">
                {log.duration || 0} ms
              </Typography>
            </View>

            {log.resourceName && (
              <View style={styles.logDetailRow}>
                <Typography variant="caption" color={theme.colors.gray[500]}>
                  Resource Name:
                </Typography>
                <Typography variant="caption" weight="medium">
                  {log.resourceName}
                </Typography>
              </View>
            )}

            {log.errorMessage && (
              <View style={styles.errorContainer}>
                <AlertCircleIcon size={16} color={theme.colors.error[600]} />
                <Typography
                  variant="caption"
                  color={theme.colors.error[700]}
                  style={{marginLeft: 8}}>
                  {log.errorMessage}
                </Typography>
              </View>
            )}

            {log.details && Object.keys(log.details).length > 0 && (
              <View style={styles.detailsContainer}>
                <Typography
                  variant="caption"
                  weight="bold"
                  color={theme.colors.gray[700]}
                  style={{marginBottom: 8}}>
                  Additional Details:
                </Typography>
                {Object.entries(log.details).map(([key, value]) => {
                  // Skip null, undefined, or empty values
                  if (value === null || value === undefined || value === '') return null;

                  // Format the key to be more readable
                  const formattedKey = key
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/^./, str => str.toUpperCase())
                    .trim();

                  // Format the value
                  let formattedValue: string;
                  if (typeof value === 'object') {
                    formattedValue = JSON.stringify(value);
                  } else if (typeof value === 'boolean') {
                    formattedValue = value ? 'Yes' : 'No';
                  } else {
                    formattedValue = String(value);
                  }

                  return (
                    <View key={key} style={styles.logDetailRow}>
                      <Typography variant="caption" color={theme.colors.gray[500]}>
                        {formattedKey}:
                      </Typography>
                      <Typography
                        variant="caption"
                        weight="medium"
                        style={{flex: 1, marginLeft: 8}}>
                        {formattedValue}
                      </Typography>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Typography variant="h2" weight="bold">
              Activity Logs
            </Typography>
            <Typography
              variant="body"
              color={theme.colors.gray[500]}
              style={{marginTop: 4}}>
              {isAdmin ? 'All system activities' : 'Your activity history'}
            </Typography>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <CloseIcon size={24} color={theme.colors.gray[600]} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        {renderStatsCard()}

        {/* Tabs (admin only) */}
        {isAdmin && (
          <View style={styles.tabBarWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabBar}>
              {(
                [
                  {id: 'all', label: 'All'},
                  {id: 'sales', label: 'Sales'},
                  {id: 'stock', label: 'Stock Changes'},
                  {id: 'deletions', label: 'Deletions'},
                ] as {id: ActivityTab; label: string}[]
              ).map(tab => (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.tab,
                    activeTab === tab.id && styles.tabActive,
                  ]}
                  onPress={() => setActiveTab(tab.id)}>
                  <Typography
                    variant="small"
                    weight="semibold"
                    color={
                      activeTab === tab.id
                        ? theme.colors.primary[600]
                        : theme.colors.gray[600]
                    }>
                    {tab.label}
                  </Typography>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Action Bar */}
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilters(true)}>
            <FilterIcon size={20} color={theme.colors.primary[600]} />
            <Typography
              variant="small"
              weight="semibold"
              color={theme.colors.primary[600]}
              style={{marginLeft: 8}}>
              Filters
            </Typography>
          </TouchableOpacity>

          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <RefreshIcon size={20} color={theme.colors.gray[600]} />
          </TouchableOpacity>
        </View>

        {/* Logs List */}
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onScroll={({nativeEvent}) => {
            const {layoutMeasurement, contentOffset, contentSize} =
              nativeEvent;
            const isCloseToBottom =
              layoutMeasurement.height + contentOffset.y >=
              contentSize.height - 20;
            if (isCloseToBottom) {
              loadMore();
            }
          }}
          scrollEventThrottle={400}>
          {loading && logs.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator
                size="large"
                color={theme.colors.primary[600]}
              />
              <Typography
                variant="body"
                color={theme.colors.gray[600]}
                style={{marginTop: 16}}>
                Loading activity logs...
              </Typography>
            </View>
          ) : logs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <TimelineIcon size={64} color={theme.colors.gray[400]} />
              <Typography
                variant="h3"
                weight="semibold"
                color={theme.colors.gray[700]}
                style={{marginTop: 16}}>
                No Activity Logs
              </Typography>
              <Typography
                variant="body"
                color={theme.colors.gray[500]}
                style={{marginTop: 8, textAlign: 'center'}}>
                {Object.values(filters).some(v => v)
                  ? 'Try adjusting your filters'
                  : 'No activities recorded yet'}
              </Typography>
            </View>
          ) : (
            <View style={styles.logsContainer}>
              {logs.map(log => renderLogItem(log))}
              {hasMore && !loading && (
                <TouchableOpacity
                  style={styles.loadMoreButton}
                  onPress={loadMore}>
                  <Typography
                    variant="body"
                    weight="semibold"
                    color={theme.colors.primary[600]}>
                    Load More
                  </Typography>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>

        {renderFilters()}

        {/* Employee filter picker (admin) */}
        <PickerModal
          visible={showEmployeePicker}
          onClose={() => setShowEmployeePicker(false)}
          items={[
            {label: 'All Employees', value: ''},
            ...employees.map(emp => ({
              label: `${emp.fullName || emp.username}${
                emp.username ? ` (${emp.username})` : ''
              }`,
              value: emp._id || emp.id,
            })),
          ]}
          selectedValue={filters.employeeId}
          onValueChange={value => handleFilterChange('employeeId', value)}
          placeholder="Select Employee"
          getLabel={item => item.label}
          getValue={item => item.value}
        />
      </SafeAreaView>
    </Modal>
  );
};

const makeStyles = (theme: Theme, bp: BreakpointInfo) => {
  const actionBtnMaxWidth = bp.isWide ? 560 : bp.isDesktop ? 480 : undefined;
  const btnPadScale = bp.isWide ? 1.3 : bp.isDesktop ? 1.15 : 1;
  const rb = (n: number) => Math.round(n);
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.gray[50],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  statsContainer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    maxWidth: bp.contentMaxWidth,
    alignSelf: 'center',
    width: '100%',
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  statCardPrimary: {
    backgroundColor: theme.colors.primary[50],
  },
  statCardSuccess: {
    backgroundColor: theme.colors.success[50],
  },
  statCardError: {
    backgroundColor: theme.colors.error[50],
  },
  statCardInfo: {
    backgroundColor: theme.colors.info[50],
  },
  statValue: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.white,
  },
  tabBarWrap: {
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
    maxWidth: bp.contentMaxWidth,
    alignSelf: 'center',
    width: '100%',
  },
  tab: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: theme.colors.primary[600],
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.white,
  },
  dateRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  dateField: {
    flex: 1,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary[300],
    backgroundColor: theme.colors.primary[50],
  },
  refreshButton: {
    padding: theme.spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xl * 3,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xl * 3,
    paddingHorizontal: theme.spacing.xl,
  },
  logsContainer: {
    padding: theme.spacing.lg,
    maxWidth: bp.contentMaxWidth,
    alignSelf: 'center',
    width: '100%',
  },
  logCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  logHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  logHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  actionBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.md,
  },
  logInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  logDetails: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
    gap: theme.spacing.sm,
  },
  logDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  endpointText: {
    fontFamily: 'monospace',
    fontSize: theme.typography.roles.caption.fontSize,
    flex: 1,
    textAlign: 'right',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.error[50],
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
  },
  detailsContainer: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.gray[50],
    borderRadius: theme.borderRadius.md,
  },
  loadMoreButton: {
    padding: theme.spacing.md,
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary[300],
    marginTop: theme.spacing.md,
  },
  filterModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterContainer: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '80%',
    width: bp.isMobile ? '100%' : '70%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  filterContent: {
    padding: theme.spacing.lg,
  },
  filterGroup: {
    marginBottom: theme.spacing.lg,
  },
  filterLabel: {
    marginBottom: theme.spacing.sm,
    color: theme.colors.gray[700],
  },
  filterInput: {
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.typography.roles.body.fontSize,
    color: theme.colors.gray[900],
    backgroundColor: theme.colors.white,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  filterChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.gray[100],
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary[600],
    borderColor: theme.colors.primary[600],
  },
  filterFooter: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
    maxWidth: actionBtnMaxWidth,
    alignSelf: actionBtnMaxWidth ? 'center' : 'stretch',
    width: '100%',
  },
  clearButton: {
    flex: 1,
    paddingVertical: rb(theme.spacing.md * btnPadScale),
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    backgroundColor: theme.colors.gray[100],
  },
  applyButton: {
    flex: 2,
    paddingVertical: rb(theme.spacing.md * btnPadScale),
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    backgroundColor: theme.colors.primary[600],
  },
  });
};
