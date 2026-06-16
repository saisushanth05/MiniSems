// Mini Sems — Faculty Navigator

import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {Colors} from '@theme/colors';
import {FontFamily} from '@theme/typography';
import {BorderRadius, Shadow} from '@theme/spacing';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import FacultyDashboard from '@screens/faculty/FacultyDashboard';
import QuestionBuilder from '@screens/faculty/QuestionBuilder';
import ExamBuilder from '@screens/faculty/ExamBuilder';
import LiveExamMonitor from '@screens/faculty/LiveExamMonitor';
import ResultsReview from '@screens/faculty/ResultsReview';
import ProfileScreen from '@screens/ProfileScreen';

import type {FacultyTabParamList, FacultyStackParamList} from '@apptypes/navigation.types';

const Tab = createBottomTabNavigator<FacultyTabParamList>();
const Stack = createNativeStackNavigator<FacultyStackParamList>();

const TAB_ICONS: Record<string, string> = {
  Dashboard: '🏠',
  Questions: '❓',
  Exams: '📝',
  Monitor: '👁️',
  Results: '🏆',
};

const FacultyTabs: React.FC = () => {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          {
            height: 56 + (insets.bottom > 0 ? insets.bottom : 8),
            paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          }
        ],
        tabBarActiveTintColor: Colors.secondary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({focused}) => (
          <View style={[styles.tabIconContainer, focused && styles.tabIconActive]}>
            <Text style={styles.tabIcon}>{TAB_ICONS[route.name]}</Text>
          </View>
        ),
      })}>
    <Tab.Screen name="Dashboard" component={FacultyDashboard} />
    <Tab.Screen name="Questions" component={QuestionBuilder} options={{tabBarLabel: 'Questions'}} />
    <Tab.Screen name="Exams" component={ExamBuilder} options={{tabBarLabel: 'Exams'}} />
    <Tab.Screen name="Monitor" component={LiveExamMonitor} options={{tabBarLabel: 'Monitor'}} />
    <Tab.Screen name="Results" component={ResultsReview} options={{tabBarLabel: 'Results'}} />
  </Tab.Navigator>
  );
};

const FacultyNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{headerShown: false}}>
    <Stack.Screen name="FacultyTabs" component={FacultyTabs} />
    <Stack.Screen
      name="ExamMonitor"
      component={LiveExamMonitor}
      options={{animation: 'slide_from_right'}}
    />
    <Stack.Screen
      name="ResultDetail"
      component={ResultsReview}
      options={{animation: 'slide_from_right'}}
    />
    <Stack.Screen
      name="Profile"
      component={ProfileScreen}
      options={{animation: 'slide_from_right'}}
    />
  </Stack.Navigator>
);

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 6,
    ...Shadow.md,
  },
  tabLabel: {fontFamily: FontFamily.medium, fontSize: 10, marginTop: 2},
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 28,
    borderRadius: BorderRadius.sm,
  },
  tabIconActive: {backgroundColor: Colors.secondarySurface},
  tabIcon: {fontSize: 18},
});

export default FacultyNavigator;
