import React from 'react';
import {View, ActivityIndicator} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {DashboardScreen} from '../screens/DashboardScreen';
import {InventoryScreen} from '../screens/InventoryScreen';
import {StockScreen} from '../screens/StockScreen';
import {CheckoutStackNavigator} from './CheckoutStackNavigator';
import {OrderStackNavigator} from './OrderStackNavigator';
import {AccountScreen} from '../screens/AccountScreen';
import {HomeIcon, InventoryIcon, BoxIcon, TruckIcon, UserIcon, ClipboardIcon} from '../components/icons';
import {useTheme} from '../contexts/ThemeContext';
import {useAuth} from '../contexts/AuthContext';
import {useUserScreens} from '../hooks/useUserScreens';
import {useBreakpoint} from '../utils/breakpoints';
import {ExtraScreensProvider} from '../contexts/ExtraScreensContext';
import {Sidebar} from './Sidebar';

export type MainTabParamList = {
  Home: undefined;
  Inventory: undefined;
  Stock: undefined;
  Orders: undefined;
  Checkout: undefined;
  Account: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

type TabDef = {
  name: keyof MainTabParamList;
  component: React.ComponentType<any>;
  icon: React.ComponentType<{size: number; color: string}>;
  paths: string[];
};

const TABS: TabDef[] = [
  {name: 'Home', component: DashboardScreen, icon: HomeIcon, paths: ['/dashboard']},
  {name: 'Inventory', component: InventoryScreen, icon: InventoryIcon, paths: ['/inventory']},
  {name: 'Stock', component: StockScreen, icon: BoxIcon, paths: ['/stock']},
  {name: 'Orders', component: OrderStackNavigator, icon: ClipboardIcon, paths: ['/orders']},
  {name: 'Checkout', component: CheckoutStackNavigator, icon: TruckIcon, paths: ['/truck-checkouts']},
];

export const MainTabNavigator = () => {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const {user} = useAuth();
  const {hasAccessToAnyScreen, loading} = useUserScreens();
  const breakpoint = useBreakpoint();
  const isAdmin = user?.role === 'admin';

  if (loading) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.white}}>
        <ActivityIndicator size="large" color={theme.colors.primary[600]} />
      </View>
    );
  }

  const visibleTabs = TABS.filter(t => isAdmin || hasAccessToAnyScreen(t.paths));

  // On Mac / desktop-width, render a left sidebar (matching the webapp) instead
  // of the bottom tab bar. Phone & small tablet keep the bottom tabs.
  const wide = breakpoint.isDesktop || breakpoint.isWide;

  const labelFontSize = breakpoint.isWide ? 16 : breakpoint.isDesktop ? 15 : breakpoint.isTablet ? 13 : 11;
  const labelMarginBottom = breakpoint.isWide ? 8 : breakpoint.isDesktop ? 7 : breakpoint.isTablet ? 6 : 4;
  const iconSize = breakpoint.isWide ? 30 : breakpoint.isDesktop ? 28 : breakpoint.isTablet ? 26 : 24;
  const barPaddingTop = breakpoint.isWide ? 14 : breakpoint.isDesktop ? 12 : breakpoint.isTablet ? 10 : 8;
  const barPaddingBottom = insets.bottom > 0 ? insets.bottom : barPaddingTop;
  const barBaseHeight = breakpoint.isWide ? 80 : breakpoint.isDesktop ? 72 : breakpoint.isTablet ? 66 : 56;
  const barHeight = barBaseHeight + (insets.bottom > 0 ? insets.bottom : 0);
  const itemPaddingVertical = breakpoint.isWide ? 6 : breakpoint.isDesktop ? 5 : breakpoint.isTablet ? 4 : 0;
  const labelLetterSpacing = breakpoint.isMobile ? 0.1 : 0.2;

  return (
    <ExtraScreensProvider>
    <Tab.Navigator
      tabBar={wide ? props => <Sidebar {...props} /> : undefined}
      screenOptions={{
        headerShown: false,
        tabBarPosition: wide ? 'left' : 'bottom',
        tabBarActiveTintColor: theme.colors.primary[600],
        tabBarInactiveTintColor: theme.colors.gray[400],
        tabBarStyle: {
          backgroundColor: theme.colors.white,
          borderTopColor: theme.colors.gray[200],
          borderTopWidth: 1,
          paddingBottom: barPaddingBottom,
          paddingTop: barPaddingTop,
          height: barHeight,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarItemStyle: {
          paddingVertical: itemPaddingVertical,
        },
        tabBarLabelStyle: {
          fontSize: labelFontSize,
          fontWeight: '600',
          marginBottom: labelMarginBottom,
          letterSpacing: labelLetterSpacing,
        },
        tabBarIconStyle: {
          marginTop: breakpoint.isMobile ? 0 : 2,
        },
      }}>
      {visibleTabs.map(t => {
        const Icon = t.icon;
        return (
          <Tab.Screen
            key={t.name}
            name={t.name}
            component={t.component}
            options={{
              tabBarIcon: ({color}) => <Icon size={iconSize} color={color} />,
            }}
          />
        );
      })}
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{
          tabBarIcon: ({color}) => <UserIcon size={iconSize} color={color} />,
        }}
      />
    </Tab.Navigator>
    </ExtraScreensProvider>
  );
};
