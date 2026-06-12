// Mini Sems — App.tsx Entry Point
// Root component with all providers

import React, {useEffect} from 'react';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import {I18nextProvider} from 'react-i18next';
import i18n from './src/i18n';
import RootNavigator from './src/navigation/RootNavigator';

const App: React.FC = () => {
  return (
    <I18nextProvider i18n={i18n}>
      <GestureHandlerRootView style={{flex: 1}}>
        <SafeAreaProvider>
          <RootNavigator />
          <Toast />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </I18nextProvider>
  );
};

export default App;
