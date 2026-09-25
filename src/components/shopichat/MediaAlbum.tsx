/**
 * Fotos y videos de una misma tanda, juntos en una cuadrícula como WhatsApp
 * (portado de Cobrify, components/chat/AlbumMedia.jsx). Cinco fotos ya no son
 * cinco burbujas que llenan la pantalla.
 *
 * Medidas fijas: 2 fotos = dos cuadrados; 3 = una grande y dos apiladas;
 * 4 o más = 2×2 con "+N" encima de la cuarta.
 */
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { WaMedia, WaMessage } from '../../types/shopichat'
import { IconPlay, IconX } from './icons'

const WIDTH = 240
const GAP = 2
const HALF = (WIDTH - GAP) / 2
const BIG = Math.round(WIDTH * 0.66)
const SMALL = WIDTH - BIG - GAP
const SMALL_H = (BIG - GAP) / 2

const shortDuration = (seconds: number) => {
  const s = Math.round(seconds || 0)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/**
 * Vista previa de un video: el cuadro del segundo 0,5 (el 0 suele salir
 * negro), el botón de play y la duración. Con `#t=0.5` y preload=metadata el
 * navegador baja solo la cabecera y ese pedacito.
 */
export function VideoPreview({ media, compact = false, onOpen }: { media: WaMedia; compact?: boolean; onOpen: () => void }) {
  const { t } = useTranslation('dashboard')
  const [duration, setDuration] = useState(0)
  const [ratio, setRatio] = useState<number | null>(null)
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`relative block overflow-hidden bg-black/5 ${compact ? 'w-full h-full' : 'max-w-full rounded-lg'}`}
      style={compact ? undefined : { width: WIDTH }}
      title={t('shopichat.media.watchVideo')}
    >
      <video
        src={`${media.url}#t=0.5`}
        preload="metadata"
        muted
        playsInline
        onLoadedMetadata={e => {
          const v = e.currentTarget
          if (v.duration && Number.isFinite(v.duration)) setDuration(v.duration)
          if (v.videoWidth && v.videoHeight) setRatio(v.videoWidth / v.videoHeight)
        }}
        className={compact ? 'w-full h-full object-cover' : 'w-full h-auto block'}
        style={compact ? undefined : { aspectRatio: ratio || 4 / 3, objectFit: 'cover' }}
      />
      <span className="absolute inset-0 grid place-items-center">
        <span className={`grid place-items-center rounded-full bg-white/90 shadow ${compact ? 'w-8 h-8' : 'w-12 h-12'}`}>
          <IconPlay className={`${compact ? 'w-3.5 h-3.5' : 'w-5 h-5'} text-[#1e3a5f] translate-x-[1px]`} />
        </span>
      </span>
      {!compact && duration > 0 && (
        <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-full bg-black/50 text-white text-[11px] font-medium">
          {shortDuration(duration)}
        </span>
      )}
    </button>
  )
}

/** El video a pantalla completa. Escape cierra. */
export function VideoViewer({ url, onClose }: { url: string; onClose: () => void }) {
  const { t } = useTranslation('dashboard')
  useEffect(() => {
    const keys = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', keys)
    return () => window.removeEventListener('keydown', keys)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[80] bg-black/95 flex items-center justify-center" onClick={onClose}>
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
        style={{ top: 'calc(env(safe-area-inset-top) + 1rem)' }}
        aria-label={t('shopichat.common.close')}
      >
        <IconX className="w-5 h-5" />
      </button>
      <video src={url} controls autoPlay playsInline onClick={e => e.stopPropagation()} className="max-w-[92vw] max-h-[85vh] rounded-lg" />
    </div>
  )
}

interface CellProps {
  m: WaMessage
  w: number
  h: number
  more: number
  onOpenPhoto: (m: WaMessage) => void
  onOpenVideo: (m: WaMessage) => void
}

function Cell({ m, w, h, more, onOpenPhoto, onOpenVideo }: CellProps) {
  if (!m.media) return null
  return (
    <div className="relative overflow-hidden bg-black/5" style={{ width: w, height: h }}>
      {m.type === 'video' ? (
        <VideoPreview media={m.media} compact onOpen={() => onOpenVideo(m)} />
      ) : (
        <button type="button" onClick={() => onOpenPhoto(m)} className="block w-full h-full">
          <img src={m.media.thumbUrl || m.media.url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
        </button>
      )}
      {more > 0 && (
        <span className="absolute inset-0 grid place-items-center bg-black/45 text-white text-2xl font-semibold pointer-events-none">+{more}</span>
      )}
    </div>
  )
}

export default function MediaAlbum({ messages, onOpenPhoto, onOpenVideo }: { messages: WaMessage[]; onOpenPhoto: (m: WaMessage) => void; onOpenVideo: (m: WaMessage) => void }) {
  const p = { onOpenPhoto, onOpenVideo }
  const n = messages.length
  if (n === 2) {
    return (
      <div className="flex rounded-lg overflow-hidden" style={{ gap: GAP, width: WIDTH }}>
        <Cell m={messages[0]} w={HALF} h={HALF} more={0} {...p} />
        <Cell m={messages[1]} w={HALF} h={HALF} more={0} {...p} />
      </div>
    )
  }
  if (n === 3) {
    return (
      <div className="flex rounded-lg overflow-hidden" style={{ gap: GAP, width: WIDTH }}>
        <Cell m={messages[0]} w={BIG} h={BIG} more={0} {...p} />
        <div className="flex flex-col" style={{ gap: GAP }}>
          <Cell m={messages[1]} w={SMALL} h={SMALL_H} more={0} {...p} />
          <Cell m={messages[2]} w={SMALL} h={SMALL_H} more={0} {...p} />
        </div>
      </div>
    )
  }
  return (
    <div className="flex flex-col rounded-lg overflow-hidden" style={{ gap: GAP, width: WIDTH }}>
      <div className="flex" style={{ gap: GAP }}>
        <Cell m={messages[0]} w={HALF} h={HALF} more={0} {...p} />
        <Cell m={messages[1]} w={HALF} h={HALF} more={0} {...p} />
      </div>
      <div className="flex" style={{ gap: GAP }}>
        <Cell m={messages[2]} w={HALF} h={HALF} more={0} {...p} />
        <Cell m={messages[3]} w={HALF} h={HALF} more={n - 4} {...p} />
      </div>
    </div>
  )
}
