import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {TruckCheckoutListScreen} from '../screens/TruckCheckoutListScreen';
import {TruckCheckoutScreen} from '../screens/TruckCheckoutScreen';
import {TruckCheckoutDetailScreen} from '../screens/TruckCheckoutDetailScreen';
import {TouchableOpacity} from 'react-native';
import {Typography} from '../components/atoms/Typography';
import {PlusIcon} from '../components/icons';
import {useTheme} from '../contexts/ThemeContext';

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
    fontSize: 18,
    fontWeight: '600' as const,
    color: theme.colors.gray[900],
  };
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="CheckoutList"
        component={TruckCheckoutListScreen}
        options={({navigation}) => ({
          headerShown: true,
          title: 'Truck Checkouts',
          headerStyle,
          headerTitleStyle,
          headerTintColor: theme.colors.gray[900],
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('CheckoutForm')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.colors.primary[600],
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
                gap: 4,
              }}>
              <PlusIcon size={16} color={theme.colors.white} />
              <Typography variant="small" weight="semibold" color={theme.colors.white}>
                New
              </Typography>
            </TouchableOpacity>
          ),
        })}
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
