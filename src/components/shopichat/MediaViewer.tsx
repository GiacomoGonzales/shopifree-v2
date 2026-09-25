/**
 * Visor de imágenes a pantalla completa (portado de Cobrify,
 * components/chat/VisorMedia.jsx).
 *
 * Abre mostrando la MINIATURA que ya está en caché y encima carga el
 * original: el visor nunca aparece en blanco. Navega entre todas las imágenes
 * de la conversación con flechas o teclado; Escape cierra. Arriba: editar
 * (pintar encima), reenviar y descargar.
 */
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { WaMedia } from '../../types/shopichat'
import { IconChevronLeft, IconChevronRight, IconDownload, IconForward, IconPencil, IconX } from './icons'

interface Props {
  images: WaMedia[]
  initialIndex?: number
  onClose: () => void
  onEdit?: (m: WaMedia) => void
  onForward?: (m: WaMedia) => void
}

export default function MediaViewer({ images, initialIndex = 0, onClose, onEdit, onForward }: Props) {
  const { t } = useTranslation('dashboard')
  const [i, setI] = useState(initialIndex)
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null)
  const current = images[i]

  const move = useCallback((step: number) => {
    setI(prev => (prev + step + images.length) % images.length)
  }, [images.length])

  useEffect(() => {
    const keys = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight' && images.length > 1) move(1)
      else if (e.key === 'ArrowLeft' && images.length > 1) move(-1)
    }
    window.addEventListener('keydown', keys)
    return () => window.removeEventListener('keydown', keys)
  }, [onClose, move, images.length])

  // Precarga del original: cuando termina, reemplaza a la miniatura ampliada.
  useEffect(() => {
    if (!current?.url) return undefined
    let alive = true
    const img = new Image()
    img.onload = () => { if (alive) setLoadedUrl(current.url) }
    img.src = current.url
    return () => { alive = false }
  }, [current?.url])

  if (!current) return null
  const ready = loadedUrl === current.url

  return (
    <div className="fixed inset-0 z-[80] bg-black/90 flex flex-col" onClick={onClose}>
      <div
        className="flex items-center justify-between px-4 py-3 text-white/80"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
        onClick={e => e.stopPropagation()}
      >
        <span className="text-[13px]">{images.length > 1 ? `${i + 1} / ${images.length}` : ''}</span>
        <div className="flex items-center gap-1">
          {onEdit && (
            <button type="button" onClick={() => onEdit(current)} className="p-2 hover:text-white rounded-lg hover:bg-white/10" title={t('shopichat.media.edit')}>
              <IconPencil className="w-5 h-5" />
            </button>
          )}
          {onForward && (
            <button type="button" onClick={() => onForward(current)} className="p-2 hover:text-white rounded-lg hover:bg-white/10" title={t('shopichat.actions.forward')}>
              <IconForward className="w-5 h-5" />
            </button>
          )}
          <a href={current.url} target="_blank" rel="noopener noreferrer" download className="p-2 hover:text-white rounded-lg hover:bg-white/10" title={t('shopichat.media.download')}>
            <IconDownload className="w-5 h-5" />
          </a>
          <button type="button" onClick={onClose} className="p-2 hover:text-white rounded-lg hover:bg-white/10" aria-label={t('shopichat.common.close')}>
            <IconX className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-2 pb-4 min-h-0">
        {images.length > 1 && (
          <button type="button" onClick={e => { e.stopPropagation(); move(-1) }} className="p-2 text-white/60 hover:text-white flex-none">
            <IconChevronLeft className="w-8 h-8" />
          </button>
        )}
        <img
          key={current.url}
          src={ready ? current.url : current.thumbUrl || current.url}
          alt=""
          onClick={e => e.stopPropagation()}
          className={`max-h-full max-w-full min-w-0 object-contain transition-[filter] duration-200 ${ready ? '' : 'blur-[1px]'}`}
        />
        {images.length > 1 && (
          <button type="button" onClick={e => { e.stopPropagation(); move(1) }} className="p-2 text-white/60 hover:text-white flex-none">
            <IconChevronRight className="w-8 h-8" />
          </button>
        )}
      </div>
    </div>
  )
}
