/**
 * Inventory Management Mobile App
 *
 * @format
 */

import React from 'react';
import {StatusBar, StyleSheet} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AuthProvider} from './src/contexts/AuthContext';
import {LoginScreen} from './src/screens/LoginScreen';
import {theme} from './src/theme';

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={theme.colors.gray[50]}
        />
        <LoginScreen />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;
