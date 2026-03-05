import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {TruckCheckoutListScreen} from '../screens/TruckCheckoutListScreen';
import {TruckCheckoutScreen} from '../screens/TruckCheckoutScreen';
import {TouchableOpacity} from 'react-native';
import {Typography} from '../components/atoms/Typography';
import {PlusIcon} from '../components/icons';
import {theme} from '../theme';

export type CheckoutStackParamList = {
  CheckoutList: undefined;
  CheckoutForm: undefined;
};

const Stack = createNativeStackNavigator<CheckoutStackParamList>();
export const CheckoutStackNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="CheckoutList"
        component={TruckCheckoutListScreen}
        options={({navigation}) => ({
          headerShown: true,
          title: 'Truck Checkouts',
          headerStyle: {
            backgroundColor: theme.colors.white,
          },
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: '600',
            color: theme.colors.gray[900],
          },
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
