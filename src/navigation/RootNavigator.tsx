// Mini Sems — Root Navigator
// Routes between auth and 4 portal navigators

import React, {useEffect} from 'react';
import {NavigationContainer, DefaultTheme} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {StatusBar} from 'react-native';
import {useAuthStore} from '@stores/authStore';
import {Colors} from '@theme/colors';

// Auth screens
import RoleSelectScreen from '@screens/auth/RoleSelectScreen';
import LoginScreen from '@screens/auth/LoginScreen';
import OTPScreen from '@screens/auth/OTPScreen';
import SplashScreen from '@screens/auth/SplashScreen';

// Portal navigators
import AdminNavigator from './AdminNavigator';
import FacultyNavigator from './FacultyNavigator';
import StudentNavigator from './StudentNavigator';
import ParentNavigator from './ParentNavigator';

import type {RootStackParamList} from '@apptypes/navigation.types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const NavTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.background,
    card: Colors.surface,
    text: Colors.textPrimary,
    border: Colors.border,
    primary: Colors.primary,
  },
};

const RootNavigator: React.FC = () => {
  const {isAuthenticated, user} = useAuthStore();

  const getInitialRoute = (): keyof RootStackParamList => {
    if (!isAuthenticated || !user) return 'Splash';
    switch (user.role) {
      case 'admin':
      case 'super_admin':
        return 'AdminRoot';
      case 'faculty':
        return 'FacultyRoot';
      case 'student':
        return 'StudentRoot';
      case 'parent':
        return 'ParentRoot';
      default:
        return 'RoleSelect';
    }
  };

  return (
    <NavigationContainer theme={NavTheme}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={Colors.background}
        translucent={false}
      />
      <Stack.Navigator
        initialRouteName={getInitialRoute()}
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: {backgroundColor: Colors.background},
        }}>
        {/* Auth Flow */}
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen
          name="RoleSelect"
          component={RoleSelectScreen}
          options={{animation: 'fade'}}
        />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="OTP" component={OTPScreen} />

        {/* Portal Navigators */}
        <Stack.Screen
          name="AdminRoot"
          component={AdminNavigator}
          options={{animation: 'fade'}}
        />
        <Stack.Screen
          name="FacultyRoot"
          component={FacultyNavigator}
          options={{animation: 'fade'}}
        />
        <Stack.Screen
          name="StudentRoot"
          component={StudentNavigator}
          options={{animation: 'fade'}}
        />
        <Stack.Screen
          name="ParentRoot"
          component={ParentNavigator}
          options={{animation: 'fade'}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
