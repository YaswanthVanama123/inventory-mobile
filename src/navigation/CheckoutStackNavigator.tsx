import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {TruckCheckoutListScreen} from '../screens/TruckCheckoutListScreen';
import {TruckCheckoutScreen} from '../screens/TruckCheckoutScreen';
import {TruckCheckoutDetailScreen} from '../screens/TruckCheckoutDetailScreen';
import {useTheme} from '../contexts/ThemeContext';
import {ScreenHeader} from '../components/molecules/ScreenHeader';

export type CheckoutStackParamList = {
  CheckoutList: undefined;
  CheckoutForm: undefined;
  CheckoutDetail: {checkoutId: string};
};

const Stack = createNativeStackNavigator<CheckoutStackParamList>();
export const CheckoutStackNavigator = () => {
  const theme = useTheme();
  const headerStyle = {backgroundColor: theme.colors.white};
  const headerTitleStyle = {
    fontSize: theme.typography.roles.sideheading.fontSize,
    fontWeight: '600' as const,
    color: theme.colors.gray[900],
  };
  return (
    <Stack.Navigator
      screenOptions={{
        headerShadowVisible: false,
        headerTitleAlign: 'center',
        header: ({navigation, options, back}) => (
          <ScreenHeader
            title={options.title}
            canGoBack={!!back}
            onBack={() => navigation.goBack()}
          />
        ),
      }}>
      <Stack.Screen
        name="CheckoutList"
        component={TruckCheckoutListScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="CheckoutForm"
        component={TruckCheckoutScreen}
        options={{
          headerShown: true,
          title: 'New Checkout',
          headerStyle,
          headerTitleStyle,
          headerTintColor: theme.colors.gray[900],
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="CheckoutDetail"
        component={TruckCheckoutDetailScreen}
        options={{
          headerShown: true,
          title: 'Checkout Details',
          headerStyle,
          headerTitleStyle,
          headerTintColor: theme.colors.gray[900],
          headerBackTitle: 'Back',
        }}
      />
    </Stack.Navigator>
  );
};
