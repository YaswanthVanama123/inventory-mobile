import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {DashboardScreen} from '../screens/DashboardScreen';
import {InventoryScreen} from '../screens/InventoryScreen';
import {StockScreen} from '../screens/StockScreen';
import {InvoicesScreen} from '../screens/InvoicesScreen';
import {AccountScreen} from '../screens/AccountScreen';
import {HomeIcon, InventoryIcon, BoxIcon, FileTextIcon, UserIcon} from '../components/icons';
import {theme} from '../theme';

export type MainTabParamList = {
  Home: undefined;
  Inventory: undefined;
  Stock: undefined;
  Invoices: undefined;
  Account: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabNavigator = () => {
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
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}>
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({color, size}) => (
            <HomeIcon size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Inventory"
        component={InventoryScreen}
        options={{
          tabBarIcon: ({color, size}) => (
            <InventoryIcon size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Stock"
        component={StockScreen}
        options={{
          tabBarIcon: ({color, size}) => (
            <BoxIcon size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Invoices"
        component={InvoicesScreen}
        options={{
          tabBarIcon: ({color, size}) => (
            <FileTextIcon size={size} color={color} />
          ),
        }}
      />
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
