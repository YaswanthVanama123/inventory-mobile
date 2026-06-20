import React, {useMemo} from 'react';
import {NavigationContainer, DefaultTheme, DarkTheme} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {LoginScreen} from '../screens/LoginScreen';
import {WelcomeScreen} from '../screens/WelcomeScreen';
import {MainTabNavigator} from './MainTabNavigator';
import {useAuth} from '../contexts/AuthContext';
import {useTheme} from '../contexts/ThemeContext';

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
export const AppNavigator = () => {
  const theme = useTheme();
  const {isAuthenticated, loading} = useAuth();

  const navTheme = useMemo(() => {
    const base = theme.mode === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: theme.colors.gray[50],
        card: theme.colors.white,
        text: theme.colors.gray[900],
        border: theme.colors.gray[200],
        primary: theme.colors.primary[600],
      },
    };
  }, [theme]);

  if (loading) {
    // The animated splash (rendered above the navigator in App) covers this
    // bootstrap window, so we render nothing here rather than a bare spinner.
    return null;
  }
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
          </>
        ) : (
          <Stack.Screen name="Main" component={MainTabNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
