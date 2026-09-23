import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../hooks/useLanguage'

/**
 * Banner de novedades del inicio del dashboard: anuncia el editor en vivo.
 * La imagen (public/banners/editor-en-vivo.webp) se genera con
 * scripts/generate-banner.mjs; si todavia no existe, se ve una ilustracion
 * dibujada con CSS en su lugar. Se puede cerrar y no vuelve a aparecer en ese
 * navegador.
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
      className="relative overflow-hidden rounded-[14px] bg-white flex flex-col-reverse md:flex-row"
      style={{ border: '1px solid #E6EBF1', boxShadow: '0 10px 28px -22px rgba(30,58,95,.4)' }}
    >
      <div className="flex-1 p-5 sm:p-6 flex flex-col justify-center">
        <span
          className="self-start px-2 py-0.5 text-[0.68rem] font-semibold rounded-full"
          style={{ background: '#E0F2FE', color: '#0284C7' }}
        >
          {t('home.whatsNew.badge')}
        </span>
        <h3 className="mt-2 text-base sm:text-lg font-semibold tracking-tight">{t('home.whatsNew.title')}</h3>
        <p className="mt-1.5 text-[0.85rem] font-normal text-[#425466] max-w-md">{t('home.whatsNew.description')}</p>
        <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[0.8rem] text-[#425466]">
          {(['texts', 'colors', 'fonts', 'phone'] as const).map(key => (
            <li key={key} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] shrink-0" />
              {t(`home.whatsNew.points.${key}`)}
            </li>
          ))}
        </ul>
        <Link
          to={localePath('/dashboard/editor')}
          className="mt-4 self-start px-4 py-2.5 rounded-xl text-white text-[0.82rem] font-semibold transition-opacity hover:opacity-90"
          style={{ background: '#1e3a5f', boxShadow: '0 8px 20px -12px rgba(30,58,95,.7)' }}
        >
          {t('home.whatsNew.cta')}
        </Link>
      </div>

      <div className="relative md:w-[46%] h-44 sm:h-52 md:h-auto shrink-0 bg-gradient-to-br from-[#E0F2FE] via-[#F0F9FF] to-[#EDE9FE]">
        {!imageFailed ? (
          <img
            src={IMAGE}
            alt=""
            onError={() => setImageFailed(true)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <EditorIllustration />
        )}
      </div>

      <button
        onClick={dismiss}
        className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-white/80 hover:bg-white text-[#8898AA] hover:text-[#425466] shadow-sm"
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

/** Mientras no este la imagen: una tienda en miniatura con el panel de colores al costado. */
function EditorIllustration() {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-5" aria-hidden="true">
      <div className="flex gap-2.5 w-full max-w-[340px]">
        <div className="flex-1 rounded-xl bg-white shadow-lg overflow-hidden">
          <div className="h-5 bg-[#1e3a5f]" />
          <div className="p-2.5 space-y-2">
            <div className="h-2.5 w-2/3 rounded border-2 border-dashed border-[#38bdf8]" />
            <div className="grid grid-cols-3 gap-1.5">
              {['#FDE68A', '#BAE6FD', '#FBCFE8'].map(c => <div key={c} className="aspect-square rounded-md" style={{ background: c }} />)}
            </div>
            <div className="h-2 w-1/2 rounded bg-[#E6EBF1]" />
          </div>
        </div>
        <div className="w-20 rounded-xl bg-white shadow-lg p-2 space-y-1.5">
          {['#1e3a5f', '#38bdf8', '#f97316', '#10b981'].map(c => (
            <div key={c} className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded" style={{ background: c }} />
              <span className="flex-1 h-1.5 rounded bg-[#E6EBF1]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
