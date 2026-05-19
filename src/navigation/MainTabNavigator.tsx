import React from 'react';
import {View, ActivityIndicator} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {DashboardScreen} from '../screens/DashboardScreen';
import {InventoryScreen} from '../screens/InventoryScreen';
import {StockScreen} from '../screens/StockScreen';
import {InvoicesScreen} from '../screens/InvoicesScreen';
import {CheckoutStackNavigator} from './CheckoutStackNavigator';
import {OrderStackNavigator} from './OrderStackNavigator';
import {AccountScreen} from '../screens/AccountScreen';
import {HomeIcon, InventoryIcon, BoxIcon, FileTextIcon, TruckIcon, UserIcon, ClipboardIcon} from '../components/icons';
import {useTheme} from '../contexts/ThemeContext';
import {useAuth} from '../contexts/AuthContext';
import {useUserScreens} from '../hooks/useUserScreens';

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
  const isAdmin = user?.role === 'admin';

  if (loading) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.white}}>
        <ActivityIndicator size="large" color={theme.colors.primary[600]} />
      </View>
    );
  }

  const visibleTabs = TABS.filter(t => isAdmin || hasAccessToAnyScreen(t.paths));

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary[600],
        tabBarInactiveTintColor: theme.colors.gray[400],
        tabBarStyle: {
          backgroundColor: theme.colors.white,
          borderTopColor: theme.colors.gray[200],
          borderTopWidth: 1,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
          height: 56 + (insets.bottom > 0 ? insets.bottom : 0),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginBottom: 4,
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
              tabBarIcon: ({color, size}) => <Icon size={size} color={color} />,
            }}
          />
        );
      })}
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{
          tabBarIcon: ({color, size}) => (
            <UserIcon size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
