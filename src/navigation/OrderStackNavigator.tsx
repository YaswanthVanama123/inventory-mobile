import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {OrdersScreenWrapper} from '../screens/OrdersScreenWrapper';
import {OrderVerificationScreen} from '../screens/OrderVerificationScreen';
import {OrderDiscrepancyListScreen} from '../screens/OrderDiscrepancyListScreen';
import {ManualOrderFormScreen} from '../screens/ManualOrderFormScreen';
import {useTheme} from '../contexts/ThemeContext';

export type OrderStackParamList = {
  OrdersList: undefined;
  OrderVerification: {orderId: string};
  OrderDiscrepancies: undefined;
  ManualOrderForm: undefined;
};

const Stack = createNativeStackNavigator<OrderStackParamList>();
export const OrderStackNavigator = () => {
  const theme = useTheme();
  const headerStyle = {backgroundColor: theme.colors.white};
  const headerTitleStyle = {
    fontSize: 18,
    fontWeight: '600' as const,
    color: theme.colors.gray[900],
  };
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="OrdersList"
        component={OrdersScreenWrapper}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="OrderVerification"
        component={OrderVerificationScreen}
        options={{
          headerShown: true,
          title: 'Verify Order',
          headerStyle,
          headerTitleStyle,
          headerTintColor: theme.colors.gray[900],
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="OrderDiscrepancies"
        component={OrderDiscrepancyListScreen}
        options={{
          headerShown: true,
          title: 'Order Discrepancies',
          headerStyle,
          headerTitleStyle,
          headerTintColor: theme.colors.gray[900],
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="ManualOrderForm"
        component={ManualOrderFormScreen}
        options={{
          headerShown: true,
          title: 'Create Manual Order',
          headerStyle,
          headerTitleStyle,
          headerTintColor: theme.colors.gray[900],
          headerBackTitle: 'Back',
        }}
      />
    </Stack.Navigator>
  );
};
