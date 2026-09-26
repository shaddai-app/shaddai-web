import dayjs from 'dayjs';
import 'dayjs/locale/es';
import 'dayjs/locale/pt';
import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';
import { initReactI18next } from 'react-i18next';

export const LANGUAGES = ['es', 'en', 'pt'] as const;
export type Language = (typeof LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = 'es';

void i18n
  .use(LanguageDetector)
  .use(resourcesToBackend((lng: string, ns: string) => import(`../locales/${lng}/${ns}.json`)))
  .use(initReactI18next)
  .init({
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: LANGUAGES,
    nonExplicitSupportedLngs: true, // es-AR -> es, pt-BR -> pt
    load: 'languageOnly',
    ns: ['common'],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    // Antes del login se detecta del navegador; luego manda la preferencia del usuario/cuenta.
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'shaddai-lang',
      caches: ['localStorage'],
    },
  });

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
  dayjs.locale(lng);
});

export default i18n;
