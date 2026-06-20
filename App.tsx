/**
 * Inventory Management Mobile App
 *
 * @format
 */

import React, {useState} from 'react';
import {StatusBar, View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AuthProvider, useAuth} from './src/contexts/AuthContext';
import {ThemeProvider, useTheme} from './src/contexts/ThemeContext';
import {AppNavigator} from './src/navigation/AppNavigator';
import {AnimatedSplash} from './src/components/AnimatedSplash';

const ThemedStatusBar: React.FC = () => {
  const theme = useTheme();
  return (
    <StatusBar
      barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'}
      backgroundColor={theme.colors.gray[50]}
    />
  );
};

const Root: React.FC = () => {
  const {loading} = useAuth();
  const [splashGone, setSplashGone] = useState(false);
  return (
    <View style={{flex: 1}}>
      <AppNavigator />
      {!splashGone && (
        <AnimatedSplash holding={loading} onFinish={() => setSplashGone(true)} />
      )}
    </View>
  );
};

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <ThemedStatusBar />
          <Root />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
