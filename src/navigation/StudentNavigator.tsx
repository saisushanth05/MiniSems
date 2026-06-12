// Mini Sems — Student Navigator

import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import StudentDashboard from '@screens/student/StudentDashboard';
import ExamLobby from '@screens/student/ExamLobby';
import ExamInterface from '@screens/student/ExamInterface';
import ExamResult from '@screens/student/ExamResult';
import MyPerformance from '@screens/student/MyPerformance';
import type {StudentStackParamList} from '@apptypes/navigation.types';

const Stack = createNativeStackNavigator<StudentStackParamList>();

const StudentNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{headerShown: false}}>
    <Stack.Screen name="StudentDashboard" component={StudentDashboard} />
    <Stack.Screen
      name="ExamLobby"
      component={ExamLobby}
      options={{animation: 'slide_from_right'}}
    />
    <Stack.Screen
      name="ExamInterface"
      component={ExamInterface}
      options={{
        animation: 'fade',
        gestureEnabled: false, // Prevent swipe back during exam
      }}
    />
    <Stack.Screen
      name="ExamResult"
      component={ExamResult}
      options={{animation: 'slide_from_bottom', gestureEnabled: false}}
    />
    <Stack.Screen
      name="MyPerformance"
      component={MyPerformance}
      options={{animation: 'slide_from_right'}}
    />
  </Stack.Navigator>
);

export default StudentNavigator;
