import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {OrdersScreenWrapper} from '../screens/OrdersScreenWrapper';
import {OrderVerificationScreen} from '../screens/OrderVerificationScreen';
import {OrderDiscrepancyListScreen} from '../screens/OrderDiscrepancyListScreen';
import {theme} from '../theme';

export type OrderStackParamList = {
  OrdersList: undefined;
  OrderVerification: {orderId: string};
  OrderDiscrepancies: undefined;
};

const Stack = createNativeStackNavigator<OrderStackParamList>();

export const OrderStackNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="OrdersList"
        component={OrdersScreenWrapper}
        options={{
          headerShown: true,
          title: 'Purchase Orders',
          headerStyle: {
            backgroundColor: theme.colors.white,
          },
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: '600',
            color: theme.colors.gray[900],
          },
        }}
      />
      <Stack.Screen
        name="OrderVerification"
        component={OrderVerificationScreen}
        options={{
          headerShown: true,
          title: 'Verify Order',
          headerStyle: {
            backgroundColor: theme.colors.white,
          },
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: '600',
            color: theme.colors.gray[900],
          },
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="OrderDiscrepancies"
        component={OrderDiscrepancyListScreen}
        options={{
          headerShown: true,
          title: 'Order Discrepancies',
          headerStyle: {
            backgroundColor: theme.colors.white,
          },
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: '600',
            color: theme.colors.gray[900],
          },
          headerBackTitle: 'Back',
        }}
      />
    </Stack.Navigator>
  );
};
