import { Capacitor } from '@capacitor/core'
import { useTranslation } from 'react-i18next'

/**
 * Botones "Descargar en App Store / Google Play" de la app principal de
 * Shopifree. Dentro de la app nativa no se muestran (ya la tienen).
 */
export const APP_STORE_URL = 'https://apps.apple.com/app/id6758657305'
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=app.shopifree.mobile'

interface Props {
  /** 'sm' para el pie de página o tarjetas chicas. */
  size?: 'sm' | 'md'
  className?: string
}

function AppleLogo({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.37 12.75c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.47.83-.72 0-1.82-.81-3-.79-1.54.02-2.96.9-3.76 2.28-1.6 2.78-.41 6.9 1.15 9.16.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.78.74 2.99.72 1.24-.02 2.02-1.12 2.77-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.39-.92-2.4-3.64zM14.1 6.02c.63-.77 1.06-1.83.94-2.9-.91.04-2.02.61-2.67 1.37-.58.67-1.09 1.76-.96 2.8 1.02.08 2.06-.51 2.69-1.27z" />
    </svg>
  )
}

function PlayLogo({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3.6 2.2c-.25.26-.4.67-.4 1.2v17.2c0 .53.15.94.4 1.2l.07.06L13.3 12.2v-.2L3.67 2.14l-.07.06z" fill="#00D7FE" />
      <path d="M16.5 15.4l-3.2-3.2v-.2l3.2-3.2.07.04 3.8 2.16c1.09.62 1.09 1.63 0 2.25l-3.8 2.16-.07.04z" fill="#FFCE00" />
      <path d="M16.57 15.36L13.3 12.1 3.6 21.8c.36.38.95.43 1.62.05l11.35-6.49" fill="#FF3A44" />
      <path d="M16.57 8.84L5.22 2.36c-.67-.38-1.26-.33-1.62.05l9.7 9.69 3.27-3.26z" fill="#00F076" />
    </svg>
  )
}

export default function AppStoreButtons({ size = 'md', className = '' }: Props) {
  const { t } = useTranslation('common')
  if (Capacitor.isNativePlatform()) return null

  const box = size === 'sm' ? 'h-10 px-3 gap-2 rounded-lg' : 'h-12 px-4 gap-2.5 rounded-xl'
  const logo = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6'
  const small = size === 'sm' ? 'text-[0.55rem]' : 'text-[0.6rem]'
  const big = size === 'sm' ? 'text-[0.9rem]' : 'text-[1.02rem]'
  const btn = `inline-flex items-center ${box} bg-black text-white border border-white/15 hover:bg-neutral-800 transition-colors`

  return (
    <div className={`flex flex-wrap gap-2.5 ${className}`}>
      <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className={btn} aria-label={t('appStores.appStoreAria')}>
        <AppleLogo className={logo} />
        <span className="flex flex-col items-start leading-none">
          <span className={`${small} font-medium opacity-90`}>{t('appStores.appStoreTop')}</span>
          <span className={`${big} font-semibold mt-0.5`}>App Store</span>
        </span>
      </a>
      <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className={btn} aria-label={t('appStores.playStoreAria')}>
        <PlayLogo className={logo} />
        <span className="flex flex-col items-start leading-none">
          <span className={`${small} font-medium opacity-90 uppercase`}>{t('appStores.playStoreTop')}</span>
          <span className={`${big} font-semibold mt-0.5`}>Google Play</span>
        </span>
      </a>
    </div>
  )
}
