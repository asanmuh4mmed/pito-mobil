import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import tr from './tr.json';
import en from './en.json';

// Telefonun dilini al (Örn: 'tr-TR' -> 'tr')
const deviceLanguage = getLocales()[0].languageCode;

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v3',
  lng: deviceLanguage === 'tr' ? 'tr' : 'en', // Telefon Türkçeyse Türkçe aç, yoksa İngilizce
  fallbackLng: 'en', // Hata olursa İngilizceye dön
  resources: {
    tr: { translation: tr },
    en: { translation: en },
  },
  interpolation: {
    escapeValue: false, // React zaten güvenli
  },
});

export default i18n;