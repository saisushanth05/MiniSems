// Mini Sems — Parent Navigator

import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import ParentDashboard from '@screens/parent/ParentDashboard';
import type {ParentStackParamList} from '@apptypes/navigation.types';

const Stack = createNativeStackNavigator<ParentStackParamList>();

const ParentNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{headerShown: false}}>
    <Stack.Screen name="ParentDashboard" component={ParentDashboard} />
  </Stack.Navigator>
);

export default ParentNavigator;
