import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../hooks/useLanguage'

interface LanguageSelectorProps {
  className?: string
  variant?: 'light' | 'dark'
}

export default function LanguageSelector({ className = '', variant = 'light' }: LanguageSelectorProps) {
  const { lang } = useLanguage()
  const { i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  const switchLanguage = (newLang: 'es' | 'en') => {
    if (newLang === lang) return

    // Update i18n
    i18n.changeLanguage(newLang)

    // Update URL path
    const currentPath = location.pathname
    const pathParts = currentPath.split('/')

    // Check if first part is a language code
    if (pathParts[1] === 'es' || pathParts[1] === 'en') {
      pathParts[1] = newLang
      navigate(pathParts.join('/') + location.search)
    } else {
      // No language in path, add it
      navigate(`/${newLang}${currentPath}${location.search}`)
    }
  }

  return (
    <div className={`flex items-center gap-1 text-sm ${className}`}>
      <button
        onClick={() => switchLanguage('es')}
        className={`px-1.5 py-0.5 rounded transition-all ${
          lang === 'es'
            ? variant === 'dark' ? 'text-white font-semibold' : 'text-[#1e3a5f] font-semibold'
            : variant === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-gray-400 hover:text-gray-600'
        }`}
        aria-label="Español"
      >
        ES
      </button>
      <span className={variant === 'dark' ? 'text-slate-600' : 'text-gray-300'}>|</span>
      <button
        onClick={() => switchLanguage('en')}
        className={`px-1.5 py-0.5 rounded transition-all ${
          lang === 'en'
            ? variant === 'dark' ? 'text-white font-semibold' : 'text-[#1e3a5f] font-semibold'
            : variant === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-gray-400 hover:text-gray-600'
        }`}
        aria-label="English"
      >
        EN
      </button>
    </div>
  )
}
