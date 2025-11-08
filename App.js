import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import { colors } from './src/theme/colors';

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    primary: colors.primary,
    card: colors.card,
    text: colors.text,
    border: colors.border,
  },
};

const screenOptions = {
  headerShown: false,
  animation: 'slide_from_right',
};

const AppNavigator = () => (
  <Stack.Navigator screenOptions={screenOptions} initialRouteName="Login">
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen name="Dashboard" component={DashboardScreen} />
  </Stack.Navigator>
);

const AppShell = () => {
  const { role } = useAuth();

  useEffect(() => {
    console.log('[Nav] role changed, attempting navigation reset', { role, ready: navigationRef.isReady() });
    if (!navigationRef.isReady()) {
      return;
    }

    if (!role) {
      navigationRef.reset({ index: 0, routes: [{ name: 'Login' }] });
      return;
    }

    if (role === 'resident') {
      navigationRef.reset({ index: 0, routes: [{ name: 'Home' }] });
      return;
    }

    navigationRef.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
  }, [role]);

  return (
    <NavigationContainer theme={navigationTheme} ref={navigationRef}>
      <AppNavigator />
    </NavigationContainer>
  );
};

export default function App() {
  console.log('[App] rendering root component');
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
