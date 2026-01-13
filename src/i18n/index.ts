import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import translations
import esCommon from './locales/es/common.json'
import esLanding from './locales/es/landing.json'
import esAuth from './locales/es/auth.json'
import esDashboard from './locales/es/dashboard.json'

import enCommon from './locales/en/common.json'
import enLanding from './locales/en/landing.json'
import enAuth from './locales/en/auth.json'
import enDashboard from './locales/en/dashboard.json'

export const supportedLanguages = ['es', 'en'] as const
export type SupportedLanguage = typeof supportedLanguages[number]

export const languageNames: Record<SupportedLanguage, string> = {
  es: 'Español',
  en: 'English'
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: {
        common: esCommon,
        landing: esLanding,
        auth: esAuth,
        dashboard: esDashboard
      },
      en: {
        common: enCommon,
        landing: enLanding,
        auth: enAuth,
        dashboard: enDashboard
      }
    },
    fallbackLng: 'es',
    supportedLngs: supportedLanguages,
    defaultNS: 'common',
    ns: ['common', 'landing', 'auth', 'dashboard'],
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['path', 'navigator'],
      lookupFromPathIndex: 0
    }
  })

export default i18n
