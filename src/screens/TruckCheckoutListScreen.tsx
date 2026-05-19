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
import {useNavigation} from '@react-navigation/native';
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
  ChevronDownIcon,
  ChevronRightIcon,
} from '../components/icons';
import {formatDateTime} from '../utils/dateUtils';

type TabType = 'checkouts' | 'sales';
type SubTabType = 'all' | 'mine' | 'employees';

export const TruckCheckoutListScreen = () => {
  const {token, user} = useAuth();
  const navigation = useNavigation<any>();
  const {handleApiError} = useApiErrorHandler();
  const [activeTab, setActiveTab] = useState<TabType>('checkouts');
  const [checkoutsSubTab, setCheckoutsSubTab] = useState<SubTabType>('all');
  const [salesSubTab, setSalesSubTab] = useState<SubTabType>('all');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isMounted, setIsMounted] = useState(true);
  const [checkouts, setCheckouts] = useState<any[]>([]);
  const [expandedCheckout, setExpandedCheckout] = useState<string | null>(null);
  const [pagination, setPagination] = useState({total: 0, page: 1, limit: 50, pages: 0});
  const [employees, setEmployees] = useState<any[]>([]);
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [employeeCheckouts, setEmployeeCheckouts] = useState<any[]>([]);
  const [salesTracking, setSalesTracking] = useState<any[]>([]);
  const [salesSummary, setSalesSummary] = useState<any>({});
  const [salesEmployees, setSalesEmployees] = useState<any[]>([]);
  const [expandedSalesEmployee, setExpandedSalesEmployee] = useState<string | null>(null);
  const [employeeSalesTracking, setEmployeeSalesTracking] = useState<any[]>([]);
  const [myItems, setMyItems] = useState<any[]>([]);
  const [myTotals, setMyTotals] = useState<{checkedOut: number; remaining: number}>({checkedOut: 0, remaining: 0});
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
      } else if (checkoutsSubTab === 'mine') {
        loadMyCheckouts();
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
  const loadMyCheckouts = async () => {
    if (!token || !user) return;
    try {
      setLoading(true);
      const myName = user.fullName || user.username;
      const result = await truckCheckoutService.getCheckouts(token, {
        employeeName: myName,
        limit: 500,
      });
      const allCheckouts: any[] = result.checkouts || [];
      const itemMap = new Map<string, any>();
      allCheckouts.forEach((checkout: any) => {
        const items: any[] = checkout.itemName
          ? [{itemName: checkout.itemName, quantity: checkout.quantityTaking || 0}]
          : (checkout.itemsTaken || []).map((it: any) => ({
              itemName: it.itemName || it.name,
              quantity: it.quantity || 0,
            }));
        items.forEach(it => {
          if (!it.itemName) return;
          const key = it.itemName;
          if (!itemMap.has(key)) {
            itemMap.set(key, {
              itemName: it.itemName,
              totalCheckedOut: 0,
              totalSold: 0,
              checkoutCount: 0,
              trucks: new Set<string>(),
              lastCheckout: null as Date | null,
            });
          }
          const entry = itemMap.get(key);
          entry.totalCheckedOut += Number(it.quantity) || 0;
          entry.checkoutCount += 1;
          if (checkout.truckNumber) entry.trucks.add(checkout.truckNumber);
          const cdate = checkout.checkoutDate ? new Date(checkout.checkoutDate) : null;
          if (cdate && (!entry.lastCheckout || cdate > entry.lastCheckout)) {
            entry.lastCheckout = cdate;
          }
        });
      });
      const items = Array.from(itemMap.values()).map(e => ({
        ...e,
        trucks: Array.from(e.trucks).join(', '),
        remaining: e.totalCheckedOut - e.totalSold,
      }));
      const totals = items.reduce(
        (acc, it) => {
          acc.checkedOut += it.totalCheckedOut;
          acc.remaining += it.remaining;
          return acc;
        },
        {checkedOut: 0, remaining: 0},
      );
      if (isMounted) {
        setMyItems(items);
        setMyTotals(totals);
      }
    } catch (error: any) {
      console.error('Load my checkouts error:', error);
      const wasHandled = await handleApiError(error);
      if (!wasHandled && isMounted) {
        setMyItems([]);
        setMyTotals({checkedOut: 0, remaining: 0});
      }
    } finally {
      if (isMounted) setLoading(false);
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
      } else if (checkoutsSubTab === 'mine') {
        loadMyCheckouts().finally(() => setRefreshing(false));
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
  const getStatusBadge = (status: string) => {
    const config: any = {
      checked_out: {color: theme.colors.primary[600], label: 'Checked Out'},
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
      Shortage: {color: theme.colors.primary[600], label: 'Shortage'},
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
              style={[styles.subTab, checkoutsSubTab === 'mine' && styles.subTabActive]}
              onPress={() => {
                setCheckoutsSubTab('mine');
                setExpandedEmployee(null);
                setEmployeeCheckouts([]);
                setCheckouts([]);
              }}>
              <Typography
                variant="small"
                weight={checkoutsSubTab === 'mine' ? 'semibold' : 'medium'}
                color={
                  checkoutsSubTab === 'mine'
                    ? theme.colors.primary[600]
                    : theme.colors.gray[600]
                }>
                My Checkouts
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
        {!(activeTab === 'checkouts' && checkoutsSubTab === 'mine') && (
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
                placeholder="Search by employee or route name"
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
        )}
        {/* Checkouts Tab */}
        {activeTab === 'checkouts' && checkoutsSubTab === 'all' && (
          <Card variant="elevated" padding="none" style={styles.contentCard}>
            <View style={styles.contentCardHeader}>
              <Typography variant="body" weight="semibold">
                Checkouts ({pagination.total} records)
              </Typography>
            </View>
            {loading && checkouts.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary[600]} />
              </View>
            ) : checkouts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <TruckIcon size={48} color={theme.colors.gray[300]} />
                <Typography variant="body" color={theme.colors.gray[500]} style={{marginTop: 12}}>
                  No checkouts found
                </Typography>
              </View>
            ) : (
              checkouts.map((checkout: any) => {
                const isExpanded = expandedCheckout === checkout._id;
                const itemDisplay = checkout.itemName
                  ? {name: checkout.itemName, qty: checkout.quantityTaking || 0}
                  : {
                      name: `${checkout.itemsTaken?.length || 0} items`,
                      qty: checkout.itemsTaken?.reduce(
                        (sum: number, item: any) => sum + item.quantity,
                        0,
                      ) || 0,
                    };
                return (
                  <View key={checkout._id} style={styles.checkoutRowContainer}>
                    {/* Clickable Row Header */}
                    <TouchableOpacity
                      style={[
                        styles.checkoutRowHeader,
                        isExpanded && styles.checkoutRowHeaderExpanded,
                      ]}
                      onPress={() =>
                        setExpandedCheckout(isExpanded ? null : checkout._id)
                      }
                      activeOpacity={0.7}>
                      {/* Chevron */}
                      <View style={styles.chevronContainer}>
                        {isExpanded ? (
                          <ChevronDownIcon size={18} color={theme.colors.primary[600]} />
                        ) : (
                          <ChevronRightIcon size={18} color={theme.colors.gray[400]} />
                        )}
                      </View>

                      {/* Item Info */}
                      <View style={styles.checkoutRowInfo}>
                        <View style={styles.checkoutRowTitleRow}>
                          <Typography variant="body" weight="semibold" numberOfLines={1} style={{flex: 1}}>
                            {itemDisplay.name}
                          </Typography>
                          <View style={styles.qtyBadge}>
                            <Typography variant="caption" color={theme.colors.gray[600]} weight="semibold">
                              Qty: {itemDisplay.qty}
                            </Typography>
                          </View>
                        </View>
                        <View style={styles.checkoutRowMeta}>
                          <Typography variant="caption" color={theme.colors.primary[600]} weight="semibold">
                            {checkout.employeeName}
                          </Typography>
                          <Typography variant="caption" color={theme.colors.gray[400]}>
                            {' • Truck: '}{checkout.truckNumber || '-'}
                          </Typography>
                          <Typography variant="caption" color={theme.colors.gray[400]}>
                            {' • '}{formatDateTime(checkout.checkoutDate)}
                          </Typography>
                        </View>
                      </View>

                      {/* Status Badge */}
                      <View style={{marginLeft: 8}}>
                        {getStatusBadge(checkout.status)}
                      </View>
                    </TouchableOpacity>

                    {/* Expanded Detail Panel */}
                    {isExpanded && (
                      <View style={styles.expandedPanel}>
                        {/* Quantity Grid */}
                        <View style={styles.expandedQuantityGrid}>
                          <View style={styles.expandedQuantityBox}>
                            <Typography variant="caption" color={theme.colors.gray[500]}>
                              Employee
                            </Typography>
                            <Typography variant="small" weight="bold" color={theme.colors.primary[700]}>
                              {checkout.employeeName}
                            </Typography>
                          </View>
                          <View style={styles.expandedQuantityBox}>
                            <Typography variant="caption" color={theme.colors.gray[500]}>
                              Truck
                            </Typography>
                            <Typography variant="small" weight="bold">
                              {checkout.truckNumber || 'N/A'}
                            </Typography>
                          </View>
                          <View style={styles.expandedQuantityBox}>
                            <Typography variant="caption" color={theme.colors.gray[500]}>
                              Qty
                            </Typography>
                            <Typography variant="small" weight="bold">
                              {itemDisplay.qty}
                            </Typography>
                          </View>
                        </View>

                        {/* Details Section */}
                        <View style={styles.expandedDetailSection}>
                          {checkout.employeeId && (
                            <View style={styles.expandedDetailRow}>
                              <Typography variant="caption" color={theme.colors.gray[500]}>
                                Employee ID
                              </Typography>
                              <Typography variant="small" weight="semibold">
                                {checkout.employeeId}
                              </Typography>
                            </View>
                          )}
                          <View style={styles.expandedDetailRow}>
                            <Typography variant="caption" color={theme.colors.gray[500]}>
                              Checkout Date
                            </Typography>
                            <Typography variant="small" weight="semibold">
                              {formatDateTime(checkout.checkoutDate)}
                            </Typography>
                          </View>
                          {checkout.completedDate && (
                            <View style={styles.expandedDetailRow}>
                              <Typography variant="caption" color={theme.colors.gray[500]}>
                                Completed
                              </Typography>
                              <Typography variant="small" weight="semibold">
                                {formatDateTime(checkout.completedDate)}
                              </Typography>
                            </View>
                          )}
                          <View style={styles.expandedDetailRow}>
                            <Typography variant="caption" color={theme.colors.gray[500]}>
                              Status
                            </Typography>
                            {getStatusBadge(checkout.status)}
                          </View>
                          <View style={styles.expandedDetailRow}>
                            <Typography variant="caption" color={theme.colors.gray[500]}>
                              Invoices
                            </Typography>
                            <Typography variant="small" weight="semibold">
                              {checkout.invoiceNumbers && checkout.invoiceNumbers.length > 0
                                ? `${checkout.invoiceNumbers.length} invoices`
                                : 'None'}
                            </Typography>
                          </View>
                        </View>

                        {/* Items List if multi-item */}
                        {checkout.itemsTaken && checkout.itemsTaken.length > 0 && (
                          <View style={styles.expandedItemsSection}>
                            <Typography variant="caption" weight="semibold" color={theme.colors.gray[600]} style={{marginBottom: 8}}>
                              Items ({checkout.itemsTaken.length})
                            </Typography>
                            {checkout.itemsTaken.slice(0, 5).map((item: any, idx: number) => (
                              <View key={idx} style={styles.expandedItemRow}>
                                <Typography variant="small" color={theme.colors.gray[700]} numberOfLines={1} style={{flex: 1}}>
                                  {item.itemName || item.name}
                                </Typography>
                                <Typography variant="small" weight="bold">
                                  x{item.quantity}
                                </Typography>
                              </View>
                            ))}
                            {checkout.itemsTaken.length > 5 && (
                              <Typography variant="caption" color={theme.colors.gray[500]} style={{marginTop: 4}}>
                                +{checkout.itemsTaken.length - 5} more items
                              </Typography>
                            )}
                          </View>
                        )}

                        {/* Invoice Numbers */}
                        {checkout.invoiceNumbers && checkout.invoiceNumbers.length > 0 && (
                          <View style={styles.expandedInvoicesSection}>
                            <Typography variant="caption" weight="semibold" color={theme.colors.gray[600]} style={{marginBottom: 8}}>
                              Invoice Numbers
                            </Typography>
                            {checkout.invoiceNumbers.map((inv: string, idx: number) => (
                              <View key={idx} style={styles.invoiceChip}>
                                <Typography variant="caption" color={theme.colors.gray[700]}>
                                  {inv}
                                </Typography>
                              </View>
                            ))}
                          </View>
                        )}

                        {/* View Details Button */}
                        <TouchableOpacity
                          style={styles.viewDetailsButton}
                          onPress={() =>
                            navigation.navigate('CheckoutDetail', {
                              checkoutId: checkout._id,
                            })
                          }>
                          <Typography
                            variant="small"
                            weight="semibold"
                            color={theme.colors.primary[600]}>
                            View Full Details →
                          </Typography>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </Card>
        )}
        {/* My Checkouts */}
        {activeTab === 'checkouts' && checkoutsSubTab === 'mine' && (
          <Card variant="elevated" padding="md" style={styles.contentCard}>
            <View style={styles.myCheckoutHeader}>
              <View style={{flex: 1}}>
                <Typography variant="body" weight="semibold">
                  My Checkouts by Item
                </Typography>
                <Typography variant="caption" color={theme.colors.gray[500]}>
                  {(user?.fullName || user?.username) ?? 'You'} — {myItems.length} unique items
                </Typography>
              </View>
              <View style={styles.myCheckoutTotalsRow}>
                <View style={{alignItems: 'center'}}>
                  <Typography variant="caption" color={theme.colors.gray[500]}>
                    CHECKED OUT
                  </Typography>
                  <Typography variant="h3" weight="bold" color={theme.colors.primary[600]}>
                    {myTotals.checkedOut}
                  </Typography>
                </View>
                <View style={{alignItems: 'center'}}>
                  <Typography variant="caption" color={theme.colors.gray[500]}>
                    LEFT
                  </Typography>
                  <Typography variant="h3" weight="bold" color={theme.colors.success[600]}>
                    {myTotals.remaining}
                  </Typography>
                </View>
              </View>
            </View>
            {loading && myItems.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary[600]} />
              </View>
            ) : myItems.length === 0 ? (
              <View style={styles.emptyContainer}>
                <TruckIcon size={48} color={theme.colors.gray[300]} />
                <Typography variant="body" color={theme.colors.gray[500]} style={{marginTop: 12}}>
                  No checkouts found for you
                </Typography>
              </View>
            ) : (
              myItems.map((it: any, idx: number) => (
                <View key={`${it.itemName}-${idx}`} style={styles.myItemCard}>
                  <Typography variant="body" weight="bold" numberOfLines={2}>
                    {it.itemName}
                  </Typography>
                  <View style={styles.myItemMeta}>
                    <Typography variant="caption" color={theme.colors.gray[500]}>
                      Trucks: {it.trucks || '-'}
                    </Typography>
                    <Typography variant="caption" color={theme.colors.gray[500]}>
                      {' • '}{it.checkoutCount} checkouts
                    </Typography>
                    {it.lastCheckout && (
                      <Typography variant="caption" color={theme.colors.gray[500]}>
                        {' • Last: '}{formatDateTime(it.lastCheckout)}
                      </Typography>
                    )}
                  </View>
                  <View style={styles.myItemStatsRow}>
                    <View style={styles.myItemStat}>
                      <Typography variant="caption" color={theme.colors.gray[500]}>
                        OUT
                      </Typography>
                      <Typography variant="body" weight="bold" color={theme.colors.primary[600]}>
                        {it.totalCheckedOut}
                      </Typography>
                    </View>
                    <View style={styles.myItemStat}>
                      <Typography variant="caption" color={theme.colors.gray[500]}>
                        SOLD
                      </Typography>
                      <Typography variant="body" weight="bold">
                        {it.totalSold}
                      </Typography>
                    </View>
                    <View style={styles.myItemStat}>
                      <Typography variant="caption" color={theme.colors.gray[500]}>
                        LEFT
                      </Typography>
                      <Typography variant="body" weight="bold" color={theme.colors.success[600]}>
                        {it.remaining}
                      </Typography>
                    </View>
                  </View>
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
                <Typography variant="caption" weight="medium" color={theme.colors.primary[700]} style={styles.summaryLabel}>
                  Shortage
                </Typography>
                <View style={styles.summaryValueRow}>
                  <ClockIcon size={28} color={theme.colors.primary[600]} />
                  <Typography variant="h3" weight="bold" color={theme.colors.primary[700]} style={styles.summaryValue}>
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
                        <Typography variant="caption" color={theme.colors.primary[600]} weight="semibold">
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
  contentCardHeader: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  checkoutRowContainer: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[100],
  },
  checkoutRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  checkoutRowHeaderExpanded: {
    backgroundColor: '#eff6ff40',
  },
  chevronContainer: {
    marginRight: 10,
  },
  checkoutRowInfo: {
    flex: 1,
  },
  checkoutRowTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qtyBadge: {
    backgroundColor: theme.colors.gray[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  checkoutRowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    flexWrap: 'wrap',
  },
  expandedPanel: {
    padding: 14,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[100],
    backgroundColor: '#fafbfc',
  },
  expandedQuantityGrid: {
    flexDirection: 'row',
    backgroundColor: theme.colors.white,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
  },
  expandedQuantityBox: {
    flex: 1,
    alignItems: 'center',
  },
  expandedDetailSection: {
    marginTop: 12,
    backgroundColor: theme.colors.white,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
  },
  expandedDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  expandedItemsSection: {
    marginTop: 10,
    backgroundColor: theme.colors.white,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
  },
  expandedItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[50],
  },
  expandedInvoicesSection: {
    marginTop: 10,
    backgroundColor: theme.colors.white,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
  },
  invoiceChip: {
    backgroundColor: theme.colors.gray[50],
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 4,
  },
  viewDetailsButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.primary[50],
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
    backgroundColor: theme.colors.primary[50],
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
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
  myCheckoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  myCheckoutTotalsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  myItemCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
  },
  myItemMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 10,
  },
  myItemStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    backgroundColor: theme.colors.gray[50],
    borderRadius: 8,
  },
  myItemStat: {
    alignItems: 'center',
  },
});
