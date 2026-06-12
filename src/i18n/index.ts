// Mini Sems — i18n Configuration

import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import en from './en';
import te from './te';
import {MMKV} from 'react-native-mmkv';

const storage = new MMKV({id: 'auth-store'});
const savedLanguage = storage.getString('language') || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {translation: en},
      te: {translation: te},
    },
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v4',
  });

export default i18n;
