import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supportedLanguages, type SupportedLanguage } from '../i18n'

export function useLanguage() {
  const { lang } = useParams<{ lang: string }>()
  const { i18n } = useTranslation()

  // Get language from URL params, fallback to i18n language, then to 'es'
  const currentLang: SupportedLanguage = (
    lang && supportedLanguages.includes(lang as SupportedLanguage)
      ? lang
      : supportedLanguages.includes(i18n.language as SupportedLanguage)
        ? i18n.language
        : 'es'
  ) as SupportedLanguage

  // Helper to build localized paths
  const localePath = (path: string) => {
    if (path.startsWith('/')) {
      return `/${currentLang}${path}`
    }
    return `/${currentLang}/${path}`
  }

  return {
    lang: currentLang,
    localePath,
    isSpanish: currentLang === 'es',
    isEnglish: currentLang === 'en'
  }
}
