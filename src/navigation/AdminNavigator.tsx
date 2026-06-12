// Mini Sems — Admin Navigator (Bottom Tab + Stack)

import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {Colors} from '@theme/colors';
import {FontFamily, FontSize} from '@theme/typography';
import {BorderRadius, Shadow} from '@theme/spacing';

// Screens
import AdminDashboard from '@screens/admin/AdminDashboard';
import StudentManagement from '@screens/admin/StudentManagement';
import FacultyManagement from '@screens/admin/FacultyManagement';
import ExamCalendar from '@screens/admin/ExamCalendar';
import ReportsAnalytics from '@screens/admin/ReportsAnalytics';
import AddStudentScreen from '@screens/admin/AddStudentScreen';
import AddFacultyScreen from '@screens/admin/AddFacultyScreen';
import BulkUploadScreen from '@screens/admin/BulkUploadScreen';

import type {AdminTabParamList, AdminStackParamList} from '@apptypes/navigation.types';

const Tab = createBottomTabNavigator<AdminTabParamList>();
const Stack = createNativeStackNavigator<AdminStackParamList>();

const TAB_ICONS: Record<string, {active: string; inactive: string}> = {
  Dashboard: {active: '🏠', inactive: '🏠'},
  Students: {active: '👥', inactive: '👥'},
  Faculty: {active: '👨‍🏫', inactive: '👨‍🏫'},
  Calendar: {active: '📅', inactive: '📅'},
  Reports: {active: '📊', inactive: '📊'},
};

const AdminTabs: React.FC = () => (
  <Tab.Navigator
    screenOptions={({route}) => ({
      headerShown: false,
      tabBarStyle: styles.tabBar,
      tabBarActiveTintColor: Colors.primary,
      tabBarInactiveTintColor: Colors.textMuted,
      tabBarLabelStyle: styles.tabLabel,
      tabBarIcon: ({focused, color}) => {
        const icons = TAB_ICONS[route.name];
        return (
          <View style={[styles.tabIconContainer, focused && styles.tabIconActive]}>
            <Text style={styles.tabIcon}>{focused ? icons.active : icons.inactive}</Text>
          </View>
        );
      },
    })}>
    <Tab.Screen name="Dashboard" component={AdminDashboard} options={{tabBarLabel: 'Dashboard'}} />
    <Tab.Screen name="Students" component={StudentManagement} options={{tabBarLabel: 'Students'}} />
    <Tab.Screen name="Faculty" component={FacultyManagement} options={{tabBarLabel: 'Faculty'}} />
    <Tab.Screen name="Calendar" component={ExamCalendar} options={{tabBarLabel: 'Calendar'}} />
    <Tab.Screen name="Reports" component={ReportsAnalytics} options={{tabBarLabel: 'Reports'}} />
  </Tab.Navigator>
);

const AdminNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{headerShown: false}}>
    <Stack.Screen name="AdminTabs" component={AdminTabs} />
    <Stack.Screen
      name="AddStudent"
      component={AddStudentScreen}
      options={{animation: 'slide_from_bottom', presentation: 'modal'}}
    />
    <Stack.Screen
      name="AddFaculty"
      component={AddFacultyScreen}
      options={{animation: 'slide_from_bottom', presentation: 'modal'}}
    />
    <Stack.Screen
      name="BulkUpload"
      component={BulkUploadScreen}
      options={{animation: 'slide_from_bottom', presentation: 'modal'}}
    />
  </Stack.Navigator>
);

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    height: 64,
    paddingBottom: 8,
    paddingTop: 6,
    ...Shadow.md,
  },
  tabLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    marginTop: 2,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 28,
    borderRadius: BorderRadius.sm,
  },
  tabIconActive: {
    backgroundColor: Colors.primarySurface,
  },
  tabIcon: {
    fontSize: 18,
  },
});

export default AdminNavigator;
