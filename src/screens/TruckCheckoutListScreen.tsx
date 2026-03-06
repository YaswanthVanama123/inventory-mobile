import React, {useState, useEffect} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput as RNTextInput,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../components/atoms/Typography';
import {Card} from '../components/atoms/Card';
import {useAuth} from '../contexts/AuthContext';
import {useApiErrorHandler} from '../hooks/useApiErrorHandler';
import {theme} from '../theme';
import truckCheckoutService from '../services/truckCheckoutService';
import {
  TruckIcon,
  ClockIcon,
  CheckCircleIcon,
  AlertCircleIcon,
} from '../components/icons';

type TabType = 'checkouts' | 'sales';
type SubTabType = 'all' | 'employees';

export const TruckCheckoutListScreen = () => {
  const {token} = useAuth();
  const {handleApiError} = useApiErrorHandler();
  const [activeTab, setActiveTab] = useState<TabType>('checkouts');
  const [checkoutsSubTab, setCheckoutsSubTab] = useState<SubTabType>('all');
  const [salesSubTab, setSalesSubTab] = useState<SubTabType>('all');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isMounted, setIsMounted] = useState(true);
  const [checkouts, setCheckouts] = useState<any[]>([]);
  const [pagination, setPagination] = useState({total: 0, page: 1, limit: 50, pages: 0});
  const [employees, setEmployees] = useState<any[]>([]);
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [employeeCheckouts, setEmployeeCheckouts] = useState<any[]>([]);
  const [salesTracking, setSalesTracking] = useState<any[]>([]);
  const [salesSummary, setSalesSummary] = useState<any>({});
  const [salesEmployees, setSalesEmployees] = useState<any[]>([]);
  const [expandedSalesEmployee, setExpandedSalesEmployee] = useState<string | null>(null);
  const [employeeSalesTracking, setEmployeeSalesTracking] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);
  useEffect(() => {
    if (activeTab === 'checkouts') {
      if (checkoutsSubTab === 'all') {
        loadCheckouts();
      } else {
        loadEmployees();
      }
    } else if (activeTab === 'sales') {
      if (salesSubTab === 'all') {
        loadSalesTracking();
      } else {
        loadSalesEmployees();
      }
    }
  }, [activeTab, checkoutsSubTab, salesSubTab, statusFilter, employeeFilter, searchTerm, pagination.page]);
  const loadCheckouts = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const filters: any = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (employeeFilter.trim()) filters.employeeName = employeeFilter.trim();
      const result = await truckCheckoutService.getCheckouts(token, filters);
      if (isMounted) {
        setCheckouts(result.checkouts || []);
        setPagination(result.pagination || {total: 0, page: 1, limit: 50, pages: 0});
      }
    } catch (error: any) {
      console.error('Load checkouts error:', error);
      const wasHandled = await handleApiError(error);
      if (!wasHandled && isMounted) {
        setCheckouts([]);
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  };
  const loadSalesTracking = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const filters: any = {};
      if (employeeFilter.trim()) filters.employeeName = employeeFilter.trim();
      const result = await truckCheckoutService.getSalesTracking(token, filters);
      if (isMounted) {
        setSalesTracking(result.checkouts || []);
        setSalesSummary(result.summary || {});
      }
    } catch (error: any) {
      console.error('Load sales tracking error:', error);
      const wasHandled = await handleApiError(error);
      if (!wasHandled && isMounted) {
        setSalesTracking([]);
        setSalesSummary({});
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  };
  const loadEmployees = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const filters: any = {};
      if (searchTerm.trim()) filters.search = searchTerm.trim();
      const result = await truckCheckoutService.getAllEmployeesWithStats(token, filters);
      if (isMounted) {
        setEmployees(result || []);
      }
    } catch (error: any) {
      console.error('Load employees error:', error);
      const wasHandled = await handleApiError(error);
      if (!wasHandled && isMounted) {
        setEmployees([]);
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  };
  const loadSalesEmployees = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const filters: any = {};
      const result = await truckCheckoutService.getSalesTracking(token, filters);
      const allSalesTracking = result.checkouts || [];
      const employeeMap = new Map<string, any>();
      allSalesTracking.forEach((item: any) => {
        const key = `${item.employeeName}-${item.truckNumber || 'N/A'}`;
        if (!employeeMap.has(key)) {
          employeeMap.set(key, {
            employeeName: item.employeeName,
            truckNumber: item.truckNumber || 'N/A',
            items: [],
          });
        }
        employeeMap.get(key).items.push(item);
      });
      const groupedEmployees = Array.from(employeeMap.values()).map(emp => ({
        ...emp,
        totalCheckouts: emp.items.length,
        goodCount: emp.items.filter((i: any) => i.status === 'Good').length,
        shortageCount: emp.items.filter((i: any) => i.status === 'Shortage').length,
        overageCount: emp.items.filter((i: any) => i.status === 'Overage').length,
      }));
      if (isMounted) {
        if (searchTerm.trim()) {
          const searchLower = searchTerm.toLowerCase();
          setSalesEmployees(
            groupedEmployees.filter(
              emp =>
                emp.employeeName.toLowerCase().includes(searchLower) ||
                emp.truckNumber.toLowerCase().includes(searchLower),
            ),
          );
        } else {
          setSalesEmployees(groupedEmployees);
        }
      }
    } catch (error: any) {
      console.error('Load sales employees error:', error);
      const wasHandled = await handleApiError(error);
      if (!wasHandled && isMounted) {
        setSalesEmployees([]);
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  };
  const handleEmployeeExpand = async (employeeName: string, truckNumber: string) => {
    const key = `${employeeName}-${truckNumber}`;
    if (expandedEmployee === key) {
      setExpandedEmployee(null);
      setEmployeeCheckouts([]);
      return;
    }
    setExpandedEmployee(key);
    if (!token) return;
    try {
      const filters: any = {
        employeeName,
        limit: 100,
      };
      const result = await truckCheckoutService.getCheckouts(token, filters);
      if (isMounted) {
        const filtered = (result.checkouts || []).filter(
          (c: any) => (c.truckNumber || 'N/A') === truckNumber,
        );
        setEmployeeCheckouts(filtered);
      }
    } catch (error: any) {
      console.error('Load employee checkouts error:', error);
      await handleApiError(error);
    }
  };
  const handleSalesEmployeeExpand = async (employeeName: string, truckNumber: string) => {
    const key = `${employeeName}-${truckNumber}`;
    if (expandedSalesEmployee === key) {
      setExpandedSalesEmployee(null);
      setEmployeeSalesTracking([]);
      return;
    }
    setExpandedSalesEmployee(key);
    if (!token) return;
    try {
      const filters: any = {
        employeeName,
      };
      if (truckNumber !== 'N/A') filters.truckNumber = truckNumber;
      const result = await truckCheckoutService.getSalesTracking(token, filters);
      if (isMounted) {
        setEmployeeSalesTracking(result.checkouts || []);
      }
    } catch (error: any) {
      console.error('Load employee sales tracking error:', error);
      await handleApiError(error);
    }
  };
  const onRefresh = () => {
    setRefreshing(true);
    if (activeTab === 'checkouts') {
      if (checkoutsSubTab === 'all') {
        loadCheckouts().finally(() => setRefreshing(false));
      } else {
        loadEmployees().finally(() => setRefreshing(false));
      }
    } else {
      if (salesSubTab === 'all') {
        loadSalesTracking().finally(() => setRefreshing(false));
      } else {
        loadSalesEmployees().finally(() => setRefreshing(false));
      }
    }
  };
  const formatDate = (date: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  const getStatusBadge = (status: string) => {
    const config: any = {
      checked_out: {color: theme.colors.warning[600], label: 'Checked Out'},
      completed: {color: theme.colors.success[600], label: 'Completed'},
      cancelled: {color: theme.colors.error[600], label: 'Cancelled'},
    };
    const {color, label} = config[status] || config.checked_out;
    return (
      <View style={[styles.badge, {backgroundColor: `${color}20`}]}>
        <Typography variant="caption" style={{color}} weight="semibold">
          {label}
        </Typography>
      </View>
    );
  };
  const getStatusBadgeForTracking = (status: string) => {
    const config: any = {
      Good: {color: theme.colors.success[600], label: 'Good'},
      Shortage: {color: theme.colors.warning[600], label: 'Shortage'},
      Overage: {color: theme.colors.error[600], label: 'Overage'},
    };
    const {color, label} = config[status] || config.Good;
    return (
      <View style={[styles.badge, {backgroundColor: `${color}20`}]}>
        <Typography variant="small" style={{color}} weight="semibold">
          {label}
        </Typography>
      </View>
    );
  };
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TruckIcon size={32} color={theme.colors.primary[600]} />
            <Typography variant="h2" weight="bold" style={styles.headerTitle}>
              Truck Checkouts
            </Typography>
          </View>
          <Typography
            variant="body"
            color={theme.colors.gray[500]}
            style={styles.headerSubtitle}>
            Track items taken by employees in trucks
          </Typography>
        </View>
        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'checkouts' && styles.tabActive]}
            onPress={() => setActiveTab('checkouts')}>
            <Typography
              variant="body"
              weight={activeTab === 'checkouts' ? 'bold' : 'medium'}
              color={
                activeTab === 'checkouts'
                  ? theme.colors.primary[600]
                  : theme.colors.gray[600]
              }>
              Checkouts
            </Typography>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'sales' && styles.tabActive]}
            onPress={() => setActiveTab('sales')}>
            <Typography
              variant="body"
              weight={activeTab === 'sales' ? 'bold' : 'medium'}
              color={
                activeTab === 'sales'
                  ? theme.colors.primary[600]
                  : theme.colors.gray[600]
              }>
              Sales & Remaining
            </Typography>
          </TouchableOpacity>
        </View>
        {/* Sub-Tabs for Checkouts */}
        {activeTab === 'checkouts' && (
          <View style={styles.subTabsContainer}>
            <TouchableOpacity
              style={[styles.subTab, checkoutsSubTab === 'all' && styles.subTabActive]}
              onPress={() => {
                setCheckoutsSubTab('all');
                setExpandedEmployee(null);
                setEmployeeCheckouts([]);
              }}>
              <Typography
                variant="small"
                weight={checkoutsSubTab === 'all' ? 'semibold' : 'medium'}
                color={
                  checkoutsSubTab === 'all'
                    ? theme.colors.primary[600]
                    : theme.colors.gray[600]
                }>
                All Checkouts
              </Typography>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.subTab, checkoutsSubTab === 'employees' && styles.subTabActive]}
              onPress={() => {
                setCheckoutsSubTab('employees');
                setCheckouts([]);
              }}>
              <Typography
                variant="small"
                weight={checkoutsSubTab === 'employees' ? 'semibold' : 'medium'}
                color={
                  checkoutsSubTab === 'employees'
                    ? theme.colors.primary[600]
                    : theme.colors.gray[600]
                }>
                Organize by Employees
              </Typography>
            </TouchableOpacity>
          </View>
        )}
        {/* Sub-Tabs for Sales */}
        {activeTab === 'sales' && (
          <View style={styles.subTabsContainer}>
            <TouchableOpacity
              style={[styles.subTab, salesSubTab === 'all' && styles.subTabActive]}
              onPress={() => {
                setSalesSubTab('all');
                setExpandedSalesEmployee(null);
                setEmployeeSalesTracking([]);
              }}>
              <Typography
                variant="small"
                weight={salesSubTab === 'all' ? 'semibold' : 'medium'}
                color={
                  salesSubTab === 'all'
                    ? theme.colors.primary[600]
                    : theme.colors.gray[600]
                }>
                All Sales
              </Typography>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.subTab, salesSubTab === 'employees' && styles.subTabActive]}
              onPress={() => {
                setSalesSubTab('employees');
                setSalesTracking([]);
              }}>
              <Typography
                variant="small"
                weight={salesSubTab === 'employees' ? 'semibold' : 'medium'}
                color={
                  salesSubTab === 'employees'
                    ? theme.colors.primary[600]
                    : theme.colors.gray[600]
                }>
                Organize by Employees
              </Typography>
            </TouchableOpacity>
          </View>
        )}
        {/* Filters */}
        <Card variant="elevated" padding="md" style={styles.filtersCard}>
          <Typography variant="body" weight="semibold" style={styles.filterTitle}>
            Filters
          </Typography>
          {/* Status filter - only for All Checkouts */}
          {activeTab === 'checkouts' && checkoutsSubTab === 'all' && (
            <View style={styles.filterGroup}>
              <Typography variant="small" color={theme.colors.gray[600]} style={styles.filterLabel}>
                Status
              </Typography>
              <View style={styles.statusFilters}>
                {['all', 'checked_out', 'completed', 'cancelled'].map(status => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusFilter,
                      statusFilter === status && styles.statusFilterActive,
                    ]}
                    onPress={() => setStatusFilter(status)}>
                    <Typography
                      variant="caption"
                      color={
                        statusFilter === status
                          ? theme.colors.white
                          : theme.colors.gray[600]
                      }
                      weight={statusFilter === status ? 'semibold' : 'regular'}>
                      {status === 'all' ? 'All' : status.replace('_', ' ')}
                    </Typography>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          {/* Employee Name filter - only for All Checkouts and All Sales */}
          {((activeTab === 'checkouts' && checkoutsSubTab === 'all') ||
            (activeTab === 'sales' && salesSubTab === 'all')) && (
            <View style={styles.filterGroup}>
              <Typography variant="small" color={theme.colors.gray[600]} style={styles.filterLabel}>
                Employee Name
              </Typography>
              <RNTextInput
                style={styles.filterInput}
                value={employeeFilter}
                onChangeText={setEmployeeFilter}
                placeholder="Filter by employee name"
                placeholderTextColor={theme.colors.gray[400]}
              />
            </View>
          )}
          {/* Search filter - only for Organize by Employees */}
          {((activeTab === 'checkouts' && checkoutsSubTab === 'employees') ||
            (activeTab === 'sales' && salesSubTab === 'employees')) && (
            <View style={styles.filterGroup}>
              <Typography variant="small" color={theme.colors.gray[600]} style={styles.filterLabel}>
                Search
              </Typography>
              <RNTextInput
                style={styles.filterInput}
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholder="Search by employee or truck number"
                placeholderTextColor={theme.colors.gray[400]}
              />
            </View>
          )}
          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={() => {
              setStatusFilter('all');
              setEmployeeFilter('');
              setSearchTerm('');
              setPagination(prev => ({...prev, page: 1}));
            }}>
            <Typography variant="small" color={theme.colors.primary[600]} weight="semibold">
              Clear Filters
            </Typography>
          </TouchableOpacity>
        </Card>
        {/* Checkouts Tab */}
        {activeTab === 'checkouts' && checkoutsSubTab === 'all' && (
          <Card variant="elevated" padding="md" style={styles.contentCard}>
            <Typography variant="body" weight="semibold" style={styles.contentTitle}>
              Checkouts ({pagination.total} records)
            </Typography>
            {loading && checkouts.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary[600]} />
              </View>
            ) : checkouts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Typography variant="body" color={theme.colors.gray[500]}>
                  No checkouts found
                </Typography>
              </View>
            ) : (
              checkouts.map((checkout: any) => (
                <View key={checkout._id} style={styles.checkoutCard}>
                  <View style={styles.checkoutHeader}>
                    <Typography variant="body" weight="bold">
                      {checkout.employeeName}
                    </Typography>
                    {getStatusBadge(checkout.status)}
                  </View>
                  <View style={styles.checkoutRow}>
                    <Typography variant="small" color={theme.colors.gray[500]}>
                      Truck:
                    </Typography>
                    <Typography variant="small">{checkout.truckNumber || '-'}</Typography>
                  </View>
                  <View style={styles.checkoutRow}>
                    <Typography variant="small" color={theme.colors.gray[500]}>
                      Item:
                    </Typography>
                    <View style={{flex: 1}}>
                      {checkout.itemName ? (
                        <>
                          <Typography variant="small" weight="semibold">
                            {checkout.itemName}
                          </Typography>
                          <Typography variant="caption" color={theme.colors.gray[500]}>
                            Qty: {checkout.quantityTaking || 0}
                          </Typography>
                        </>
                      ) : (
                        <>
                          <Typography variant="small" weight="semibold">
                            {checkout.itemsTaken?.length || 0} items
                          </Typography>
                          <Typography variant="caption" color={theme.colors.gray[500]}>
                            Total qty:{' '}
                            {checkout.itemsTaken?.reduce(
                              (sum: number, item: any) => sum + item.quantity,
                              0
                            ) || 0}
                          </Typography>
                        </>
                      )}
                    </View>
                  </View>
                  <View style={styles.checkoutRow}>
                    <Typography variant="small" color={theme.colors.gray[500]}>
                      Date:
                    </Typography>
                    <Typography variant="small">{formatDate(checkout.checkoutDate)}</Typography>
                  </View>
                  {checkout.invoiceNumbers && checkout.invoiceNumbers.length > 0 && (
                    <View style={styles.checkoutRow}>
                      <Typography variant="small" color={theme.colors.gray[500]}>
                        Invoices:
                      </Typography>
                      <Typography variant="small" weight="semibold">
                        {checkout.invoiceNumbers.length} invoices
                      </Typography>
                    </View>
                  )}
                </View>
              ))
            )}
          </Card>
        )}
        {/* Checkouts by Employees */}
        {activeTab === 'checkouts' && checkoutsSubTab === 'employees' && (
          <Card variant="elevated" padding="md" style={styles.contentCard}>
            <Typography variant="body" weight="semibold" style={styles.contentTitle}>
              Employees ({employees.length} total)
            </Typography>
            <Typography variant="caption" color={theme.colors.gray[500]} style={{marginBottom: 12}}>
              Click on an employee to view their checkouts
            </Typography>
            {loading && employees.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary[600]} />
              </View>
            ) : employees.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Typography variant="body" color={theme.colors.gray[500]}>
                  No employees found
                </Typography>
              </View>
            ) : (
              employees.map((emp: any) => {
                const key = `${emp.employeeName}-${emp.truckNumber}`;
                const isExpanded = expandedEmployee === key;
                return (
                  <View key={key} style={styles.employeeCard}>
                    <TouchableOpacity
                      onPress={() => handleEmployeeExpand(emp.employeeName, emp.truckNumber)}
                      style={styles.employeeHeader}>
                      <View style={{flex: 1}}>
                        <Typography variant="body" weight="bold">
                          {emp.employeeName}
                        </Typography>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          Truck: {emp.truckNumber}
                        </Typography>
                      </View>
                      <View style={styles.employeeStats}>
                        <Typography variant="small" color={theme.colors.primary[600]} weight="semibold">
                          {emp.totalCheckouts} checkouts
                        </Typography>
                      </View>
                    </TouchableOpacity>
                    {isExpanded && (
                      <View style={styles.employeeDetails}>
                        {employeeCheckouts.length === 0 ? (
                          <Typography variant="small" color={theme.colors.gray[500]}>
                            No checkouts found
                          </Typography>
                        ) : (
                          employeeCheckouts.map((checkout: any) => (
                            <View key={checkout._id} style={styles.checkoutCard}>
                              <View style={styles.checkoutHeader}>
                                <Typography variant="small" weight="semibold">
                                  {checkout.itemName || `${checkout.itemsTaken?.length || 0} items`}
                                </Typography>
                                {getStatusBadge(checkout.status)}
                              </View>
                              <View style={styles.checkoutRow}>
                                <Typography variant="caption" color={theme.colors.gray[500]}>
                                  Date:
                                </Typography>
                                <Typography variant="caption">{formatDate(checkout.checkoutDate)}</Typography>
                              </View>
                            </View>
                          ))
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </Card>
        )}
        {/* Sales & Remaining Tab - All Sales */}
        {activeTab === 'sales' && salesSubTab === 'all' && (
          <>
            {/* Summary Cards */}
            <View style={styles.summaryContainer}>
              <View style={[styles.summaryCard, styles.summaryCardGood]}>
                <Typography variant="caption" weight="medium" color={theme.colors.success[700]} style={styles.summaryLabel}>
                  Good{'\n'}(Matched)
                </Typography>
                <View style={styles.summaryValueRow}>
                  <CheckCircleIcon size={28} color={theme.colors.success[600]} />
                  <Typography variant="h3" weight="bold" color={theme.colors.success[700]} style={styles.summaryValue}>
                    {salesSummary.good || 0}
                  </Typography>
                </View>
              </View>
              <View style={[styles.summaryCard, styles.summaryCardShortage]}>
                <Typography variant="caption" weight="medium" color={theme.colors.warning[700]} style={styles.summaryLabel}>
                  Shortage
                </Typography>
                <View style={styles.summaryValueRow}>
                  <ClockIcon size={28} color={theme.colors.warning[600]} />
                  <Typography variant="h3" weight="bold" color={theme.colors.warning[700]} style={styles.summaryValue}>
                    {salesSummary.shortage || 0}
                  </Typography>
                </View>
              </View>
              <View style={[styles.summaryCard, styles.summaryCardOverage]}>
                <Typography variant="caption" weight="medium" color={theme.colors.error[700]} style={styles.summaryLabel}>
                  Overage
                </Typography>
                <View style={styles.summaryValueRow}>
                  <AlertCircleIcon size={28} color={theme.colors.error[600]} />
                  <Typography variant="h3" weight="bold" color={theme.colors.error[700]} style={styles.summaryValue}>
                    {salesSummary.overage || 0}
                  </Typography>
                </View>
              </View>
            </View>
            {/* Sales Tracking List */}
            <Card variant="elevated" padding="md" style={styles.contentCard}>
              <Typography variant="body" weight="semibold" style={styles.contentTitle}>
                Sales & Remaining Tracking
              </Typography>
              <Typography variant="caption" color={theme.colors.gray[500]} style={{marginBottom: 12}}>
                Track what was sold vs what was checked out
              </Typography>
              {loading && salesTracking.length === 0 ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.colors.primary[600]} />
                </View>
              ) : salesTracking.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Typography variant="body" color={theme.colors.gray[500]}>
                    No sales tracking data found
                  </Typography>
                </View>
              ) : (
                salesTracking.map((item: any) => (
                  <View key={item.checkoutId} style={styles.salesCard}>
                    <View style={styles.salesHeader}>
                      <View style={{flex: 1}}>
                        <Typography variant="body" weight="bold">
                          {item.employeeName}
                        </Typography>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          Truck: {item.truckNumber || '-'}
                        </Typography>
                      </View>
                      {getStatusBadgeForTracking(item.status)}
                    </View>
                    <Typography variant="body" weight="semibold" style={{marginTop: 8, marginBottom: 8}}>
                      {item.itemName}
                    </Typography>
                    <View style={styles.salesRow}>
                      <Typography variant="small" color={theme.colors.gray[600]}>
                        Checked Out:
                      </Typography>
                      <Typography variant="small" weight="bold">
                        {item.quantityCheckedOut}
                      </Typography>
                    </View>
                    <View style={styles.salesRow}>
                      <Typography variant="small" color={theme.colors.gray[600]}>
                        Sold:
                      </Typography>
                      <Typography variant="small" weight="bold" color={theme.colors.primary[600]}>
                        {item.totalSold}
                      </Typography>
                    </View>
                    <View style={styles.salesRow}>
                      <Typography variant="small" color={theme.colors.gray[600]}>
                        Remaining:
                      </Typography>
                      <Typography variant="small" weight="bold">
                        {item.remaining}
                      </Typography>
                    </View>
                    {item.matchedInvoices > 0 && (
                      <View style={styles.salesRow}>
                        <Typography variant="small" color={theme.colors.gray[600]}>
                          Invoices:
                        </Typography>
                        <Typography variant="small">
                          {item.matchedInvoices} matched
                        </Typography>
                      </View>
                    )}
                  </View>
                ))
              )}
            </Card>
          </>
        )}
        {/* Sales by Employees */}
        {activeTab === 'sales' && salesSubTab === 'employees' && (
          <Card variant="elevated" padding="md" style={styles.contentCard}>
            <Typography variant="body" weight="semibold" style={styles.contentTitle}>
              Employees ({salesEmployees.length} total)
            </Typography>
            <Typography variant="caption" color={theme.colors.gray[500]} style={{marginBottom: 12}}>
              Click on an employee to view their sales tracking
            </Typography>
            {loading && salesEmployees.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary[600]} />
              </View>
            ) : salesEmployees.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Typography variant="body" color={theme.colors.gray[500]}>
                  No employees found
                </Typography>
              </View>
            ) : (
              salesEmployees.map((emp: any) => {
                const key = `${emp.employeeName}-${emp.truckNumber}`;
                const isExpanded = expandedSalesEmployee === key;
                return (
                  <View key={key} style={styles.employeeCard}>
                    <TouchableOpacity
                      onPress={() => handleSalesEmployeeExpand(emp.employeeName, emp.truckNumber)}
                      style={styles.employeeHeader}>
                      <View style={{flex: 1}}>
                        <Typography variant="body" weight="bold">
                          {emp.employeeName}
                        </Typography>
                        <Typography variant="caption" color={theme.colors.gray[500]}>
                          Truck: {emp.truckNumber}
                        </Typography>
                      </View>
                      <View style={styles.employeeStatsRow}>
                        <Typography variant="caption" color={theme.colors.success[600]} weight="semibold">
                          Good: {emp.goodCount}
                        </Typography>
                        <Typography variant="caption" color={theme.colors.warning[600]} weight="semibold">
                          Short: {emp.shortageCount}
                        </Typography>
                        <Typography variant="caption" color={theme.colors.error[600]} weight="semibold">
                          Over: {emp.overageCount}
                        </Typography>
                      </View>
                    </TouchableOpacity>
                    {isExpanded && (
                      <View style={styles.employeeDetails}>
                        {employeeSalesTracking.length === 0 ? (
                          <Typography variant="small" color={theme.colors.gray[500]}>
                            No sales tracking found
                          </Typography>
                        ) : (
                          employeeSalesTracking.map((item: any) => (
                            <View key={item.checkoutId} style={styles.salesCard}>
                              <View style={styles.salesHeader}>
                                <Typography variant="small" weight="semibold">
                                  {item.itemName}
                                </Typography>
                                {getStatusBadgeForTracking(item.status)}
                              </View>
                              <View style={styles.salesRow}>
                                <Typography variant="caption" color={theme.colors.gray[500]}>
                                  Checked Out:
                                </Typography>
                                <Typography variant="caption" weight="bold">
                                  {item.quantityCheckedOut}
                                </Typography>
                              </View>
                              <View style={styles.salesRow}>
                                <Typography variant="caption" color={theme.colors.gray[500]}>
                                  Sold:
                                </Typography>
                                <Typography variant="caption" weight="bold">
                                  {item.totalSold}
                                </Typography>
                              </View>
                              <View style={styles.salesRow}>
                                <Typography variant="caption" color={theme.colors.gray[500]}>
                                  Remaining:
                                </Typography>
                                <Typography variant="caption" weight="bold">
                                  {item.remaining}
                                </Typography>
                              </View>
                            </View>
                          ))
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </Card>
        )}
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
    paddingHorizontal: 0,
    paddingBottom: theme.spacing.lg,
    paddingTop: 0,
  },
  header: {
    marginBottom: 0,
    paddingTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: theme.spacing.xs,
  },
  headerTitle: {
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    padding: 4,
    marginBottom: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: theme.colors.primary[50],
  },
  subTabsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.gray[100],
    borderRadius: 8,
    padding: 3,
    marginBottom: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
  },
  subTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  subTabActive: {
    backgroundColor: theme.colors.white,
  },
  filtersCard: {
    marginBottom: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
  },
  filterTitle: {
    marginBottom: theme.spacing.md,
  },
  filterGroup: {
    marginBottom: theme.spacing.md,
  },
  filterLabel: {
    marginBottom: theme.spacing.xs,
  },
  statusFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusFilter: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.gray[100],
  },
  statusFilterActive: {
    backgroundColor: theme.colors.primary[600],
  },
  filterInput: {
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
    borderRadius: 8,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 14,
    color: theme.colors.gray[900],
    backgroundColor: theme.colors.white,
  },
  clearFiltersButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  contentCard: {
    marginBottom: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
  },
  contentTitle: {
    marginBottom: theme.spacing.md,
  },
  loadingContainer: {
    paddingVertical: theme.spacing.xl * 2,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: theme.spacing.xl * 2,
    alignItems: 'center',
  },
  checkoutCard: {
    backgroundColor: theme.colors.gray[50],
    borderRadius: 12,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
  },
  checkoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  checkoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  employeeCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
    overflow: 'hidden',
  },
  employeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  employeeStats: {
    alignItems: 'flex-end',
  },
  employeeStatsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  employeeDetails: {
    padding: theme.spacing.md,
    paddingTop: 0,
    backgroundColor: theme.colors.gray[50],
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 100,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  summaryCardGood: {
    backgroundColor: theme.colors.success[50],
    borderWidth: 1,
    borderColor: theme.colors.success[200],
  },
  summaryCardShortage: {
    backgroundColor: theme.colors.warning[50],
    borderWidth: 1,
    borderColor: theme.colors.warning[200],
  },
  summaryCardOverage: {
    backgroundColor: theme.colors.error[50],
    borderWidth: 1,
    borderColor: theme.colors.error[200],
  },
  summaryLabel: {
    fontSize: 10,
    lineHeight: 13,
    marginBottom: 4,
  },
  summaryValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryValue: {
    fontSize: 28,
    lineHeight: 32,
  },
  salesCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
  },
  salesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  salesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
});
