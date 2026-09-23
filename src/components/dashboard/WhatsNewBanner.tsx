import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../hooks/useLanguage'

/**
 * Banner publicitario de novedades del inicio del dashboard: anuncia el editor
 * en vivo. La imagen (public/banners/editor-en-vivo.webp) se genera con
 * scripts/generate-banner.mjs a partir de una captura real del editor; si no
 * esta, queda el fondo azul con su brillo. Se puede cerrar y no vuelve a
 * aparecer en ese navegador.
 */
const DISMISS_KEY = 'sf-whatsnew-live-editor'
const IMAGE = '/banners/editor-en-vivo.webp'

function wasDismissed() {
  try { return localStorage.getItem(DISMISS_KEY) === '1' } catch { return false }
}

export default function WhatsNewBanner() {
  const { t } = useTranslation('dashboard')
  const { localePath } = useLanguage()
  const [dismissed, setDismissed] = useState(wasDismissed)
  const [imageFailed, setImageFailed] = useState(false)

  if (dismissed) return null

  const dismiss = () => {
    setDismissed(true)
    try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* sin almacenamiento: vuelve a salir la proxima vez */ }
  }

  return (
    <div
      className="relative overflow-hidden rounded-[18px] text-white"
      style={{ background: 'linear-gradient(135deg, #0b1b33 0%, #13294b 55%, #1e3a5f 100%)', boxShadow: '0 24px 48px -28px rgba(11,27,51,.85)' }}
    >
      {/* Imagen: arriba en celular; en pantallas grandes ocupa toda la tarjeta y el texto va encima a la izquierda. */}
      <div className={`relative aspect-[3/2] md:aspect-auto md:absolute md:inset-0 ${imageFailed ? 'hidden md:block' : ''}`}>
        {!imageFailed && (
          <img
            src={IMAGE}
            alt=""
            onError={() => setImageFailed(true)}
            className="absolute inset-0 w-full h-full object-cover md:object-right"
          />
        )}
        {/* Brillo celeste de fondo (se ve tambien sin imagen) */}
        <div className="absolute -right-24 top-1/2 -translate-y-1/2 w-[28rem] h-[28rem] rounded-full bg-[#38bdf8]/20 blur-3xl pointer-events-none" />
        {/* Degradado para que el texto siempre se lea sobre la imagen */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1b33] via-transparent to-transparent md:bg-gradient-to-r md:from-[#0b1b33] md:via-[#0b1b33]/80 md:to-transparent" />
      </div>

      <div className="relative p-6 sm:p-8 md:p-10 md:min-h-[360px] lg:min-h-[400px] md:max-w-[52%] flex flex-col justify-center">
        <span className="self-start inline-flex items-center gap-1.5 px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wider rounded-full bg-[#38bdf8] text-[#0b1b33]">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2l1.8 5.6L19.5 9l-5.7 1.8L12 16.5l-1.8-5.7L4.5 9l5.7-1.4L12 2zm7 11l.9 2.6 2.6.9-2.6.9L19 20l-.9-2.6-2.6-.9 2.6-.9L19 13z" />
          </svg>
          {t('home.whatsNew.badge')}
        </span>
        <h2 className="mt-4 text-2xl sm:text-3xl lg:text-[2.6rem] font-bold tracking-tight leading-[1.1]">
          {t('home.whatsNew.title')}
        </h2>
        <p className="mt-3 text-[0.95rem] sm:text-base text-white/75 font-normal max-w-md">
          {t('home.whatsNew.description')}
        </p>
        <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-1.5 text-[0.85rem] text-white/85">
          {(['texts', 'colors', 'fonts', 'phone'] as const).map(key => (
            <li key={key} className="flex items-center gap-2">
              <svg className="w-4 h-4 text-[#38bdf8] shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              {t(`home.whatsNew.points.${key}`)}
            </li>
          ))}
        </ul>
        <Link
          to={localePath('/dashboard/editor')}
          className="mt-6 self-start inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-[#0b1b33] text-sm font-bold transition-transform hover:scale-[1.03]"
          style={{ boxShadow: '0 12px 30px -10px rgba(56,189,248,.6)' }}
        >
          {t('home.whatsNew.cta')}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </div>

      <button
        onClick={dismiss}
        className="absolute top-3 right-3 p-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white/80 hover:text-white backdrop-blur"
        title={t('home.whatsNew.dismiss')}
        aria-label={t('home.whatsNew.dismiss')}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
