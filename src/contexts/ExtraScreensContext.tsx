import React, {createContext, useContext, useState, useCallback, ReactNode} from 'react';
import {useAuth} from './AuthContext';
import {SalesReportScreen} from '../screens/SalesReportScreen';
import {OrdersScreen} from '../screens/OrdersScreen';
import {ModelCategoryMappingScreen} from '../screens/ModelCategoryMappingScreen';
import {ItemAliasMappingScreen} from '../screens/ItemAliasMappingScreen';
import {RouteStarItemsScreen} from '../screens/RouteStarItemsScreen';
import {UserManagementScreen} from '../screens/UserManagementScreen';
import {FetchHistoryScreen} from '../screens/FetchHistoryScreen';
import {DiscrepancyManagementScreen} from '../screens/DiscrepancyManagementScreen';
import {ManualPOItemsScreen} from '../screens/ManualPOItemsScreen';
import {VendorManagementScreen} from '../screens/VendorManagementScreen';
import {ActivityLogScreen} from '../screens/ActivityLogScreen';
import {ScreenPermissionsManagementScreen} from '../screens/ScreenPermissionsManagementScreen';
import {ScreenManagementScreen} from '../screens/ScreenManagementScreen';
import {ItemsInvoiceUsageScreen} from '../screens/ItemsInvoiceUsageScreen';

// Screens that historically lived as modals opened from the Account screen.
// They are centralized here so BOTH the sidebar (wide) and the Account menu
// (phone) can open them, and so they render once at the app root.
export type ExtraScreenKey =
  | 'salesReport'
  | 'orders'
  | 'modelMapping'
  | 'itemAlias'
  | 'routeStarItems'
  | 'userManagement'
  | 'fetchHistory'
  | 'discrepancyManagement'
  | 'manualPOItems'
  | 'vendors'
  | 'activityLog'
  | 'screenPermissions'
  | 'screenManagement'
  | 'itemsInvoiceUsage';

interface ExtraScreensContextValue {
  openKey: ExtraScreenKey | null;
  openScreen: (key: ExtraScreenKey) => void;
  close: () => void;
}

const ExtraScreensContext = createContext<ExtraScreensContextValue | undefined>(undefined);

export const useExtraScreens = (): ExtraScreensContextValue => {
  const ctx = useContext(ExtraScreensContext);
  if (!ctx) {
    throw new Error('useExtraScreens must be used within an ExtraScreensProvider');
  }
  return ctx;
};

export const ExtraScreensProvider: React.FC<{children: ReactNode}> = ({children}) => {
  const {user} = useAuth();
  const isAdmin = user?.role === 'admin';
  const [openKey, setOpenKey] = useState<ExtraScreenKey | null>(null);
  const openScreen = useCallback((key: ExtraScreenKey) => setOpenKey(key), []);
  const close = useCallback(() => setOpenKey(null), []);
  const is = (key: ExtraScreenKey) => openKey === key;

  return (
    <ExtraScreensContext.Provider value={{openKey, openScreen, close}}>
      {children}
      <SalesReportScreen visible={is('salesReport')} onClose={close} />
      <OrdersScreen visible={is('orders')} onClose={close} />
      <ModelCategoryMappingScreen visible={is('modelMapping')} onClose={close} />
      <ItemAliasMappingScreen visible={is('itemAlias')} onClose={close} />
      <RouteStarItemsScreen visible={is('routeStarItems')} onClose={close} />
      <FetchHistoryScreen visible={is('fetchHistory')} onClose={close} />
      <DiscrepancyManagementScreen visible={is('discrepancyManagement')} onClose={close} />
      <ManualPOItemsScreen visible={is('manualPOItems')} onClose={close} />
      <VendorManagementScreen visible={is('vendors')} onClose={close} />
      <ItemsInvoiceUsageScreen visible={is('itemsInvoiceUsage')} onClose={close} />
      {isAdmin && <UserManagementScreen visible={is('userManagement')} onClose={close} />}
      {isAdmin && <ActivityLogScreen visible={is('activityLog')} onClose={close} />}
      {isAdmin && <ScreenPermissionsManagementScreen visible={is('screenPermissions')} onClose={close} />}
      {isAdmin && <ScreenManagementScreen visible={is('screenManagement')} onClose={close} />}
    </ExtraScreensContext.Provider>
  );
};
