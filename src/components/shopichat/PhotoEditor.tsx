/**
 * Pintar sobre una foto antes de mandarla, como WhatsApp (portado de Cobrify,
 * components/chat/EditorFoto.jsx).
 *
 * La foto se dibuja en un canvas del TAMAÑO REAL (tope 2048 px) y los trazos
 * se guardan en coordenadas de ese canvas: lo pintado cae donde se ve, sin
 * importar de qué tamaño se muestre. El borrador quita el trazo entero.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ComponentType } from 'react'
import { useTranslation } from 'react-i18next'
import { IconEraser, IconHighlighter, IconPencil, IconSend, IconTrash, IconUndo } from './icons'

/**
 * La dirección con la que el editor pide la foto. El <img> de la burbuja la
 * pide SIN CORS y el CDN puede cachear esa respuesta sin cabecera de permiso;
 * si el editor pidiera la misma URL con crossOrigin, recibiría la cacheada y
 * el canvas quedaría "manchado". Con un parámetro propio no se cruzan. Las
 * blob: (foto recién elegida) no llevan CORS y no se tocan.
 */
const urlForEditing = (url: string) =>
  /^https?:\/\//i.test(url) ? `${url}${url.includes('?') ? '&' : '?'}edit=1` : url

const COLORS = ['#F0332C', '#FFFFFF', '#000000', '#FFC400', '#22C55E', '#2D7FF9', '#A855F7']
const WIDTHS = [6, 12, 22]
const MAX = 2048

type Tool = 'pen' | 'marker' | 'eraser'
interface Stroke { color: string; width: number; marker: boolean; points: { x: number; y: number }[] }

interface Props {
  url: string
  onClose: () => void
  onSend: (file: File, caption: string) => Promise<void>
}

export default function PhotoEditor({ url, onClose, onSend }: Props) {
  const { t } = useTranslation('dashboard')
  const canvas = useRef<HTMLCanvasElement>(null)
  const base = useRef<HTMLImageElement | null>(null)
  const strokes = useRef<Stroke[]>([])
  const painting = useRef(false)

  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState(COLORS[0])
  const [widthIdx, setWidthIdx] = useState(1)
  const [hasStrokes, setHasStrokes] = useState(false)
  const [caption, setCaption] = useState('')
  const [sending, setSending] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const redraw = useCallback(() => {
    const c = canvas.current
    const img = base.current
    if (!c || !img) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, c.width, c.height)
    ctx.drawImage(img, 0, 0, c.width, c.height)
    for (const s of strokes.current) {
      ctx.save()
      ctx.globalAlpha = s.marker ? 0.5 : 1
      ctx.strokeStyle = s.color
      ctx.lineWidth = s.width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      s.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
      // Un toque suelto tiene que dejar un punto.
      if (s.points.length === 1) ctx.lineTo(s.points[0].x + 0.1, s.points[0].y)
      ctx.stroke()
      ctx.restore()
    }
  }, [])

  // `crossOrigin` para poder exportar después: sin esto toBlob falla.
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight))
      const c = canvas.current
      if (!c) return
      c.width = Math.round(img.naturalWidth * scale)
      c.height = Math.round(img.naturalHeight * scale)
      base.current = img
      redraw()
      setReady(true)
    }
    img.onerror = () => setError(t('shopichat.editor.loadError'))
    img.src = urlForEditing(url)
  }, [url, redraw, t])

  useEffect(() => {
    const keys = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', keys)
    return () => window.removeEventListener('keydown', keys)
  }, [onClose])

  const pointAt = (e: React.PointerEvent) => {
    const c = canvas.current!
    const box = c.getBoundingClientRect()
    return { x: ((e.clientX - box.left) / box.width) * c.width, y: ((e.clientY - box.top) / box.height) * c.height }
  }

  const strokeAt = (p: { x: number; y: number }) => {
    const margin = Math.max(14, (canvas.current?.width || 0) * 0.02)
    for (let i = strokes.current.length - 1; i >= 0; i -= 1) {
      const s = strokes.current[i]
      if (s.points.some(q => Math.hypot(q.x - p.x, q.y - p.y) <= margin + s.width / 2)) return i
    }
    return -1
  }

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!ready) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    const p = pointAt(e)
    if (tool === 'eraser') {
      const i = strokeAt(p)
      if (i >= 0) {
        strokes.current.splice(i, 1)
        setHasStrokes(strokes.current.length > 0)
        redraw()
      }
      return
    }
    painting.current = true
    strokes.current.push({ color, width: WIDTHS[widthIdx] * (tool === 'marker' ? 2.2 : 1), marker: tool === 'marker', points: [p] })
    setHasStrokes(true)
    redraw()
  }

  const moveP = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!painting.current) return
    strokes.current[strokes.current.length - 1].points.push(pointAt(e))
    redraw()
  }

  const up = () => { painting.current = false }

  const undo = () => {
    strokes.current.pop()
    setHasStrokes(strokes.current.length > 0)
    redraw()
  }

  const clear = () => {
    strokes.current = []
    setHasStrokes(false)
    redraw()
  }

  const send = () => {
    if (sending || !canvas.current) return
    setSending(true)
    canvas.current.toBlob(async blob => {
      if (!blob) { setError(t('shopichat.editor.exportError')); setSending(false); return }
      try {
        await onSend(new File([blob], 'foto.jpg', { type: 'image/jpeg' }), caption.trim())
      } catch (e) {
        setError((e as Error).message || t('shopichat.errors.sendFailed'))
        setSending(false)
      }
    }, 'image/jpeg', 0.85)
  }

  const toolBtn = (id: Tool, Icon: ComponentType<{ className?: string }>, title: string) => (
    <button
      type="button"
      onClick={() => setTool(id)}
      title={title}
      className={`p-2 rounded-lg ${tool === id ? 'bg-white/25 text-white' : 'text-white/70 hover:bg-white/10'}`}
    >
      <Icon className="w-5 h-5" />
    </button>
  )

  return (
    <div className="fixed inset-0 z-[90] bg-neutral-900 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-between px-4 py-3">
        <button type="button" onClick={onClose} className="text-white/80 hover:text-white text-[14px] px-2 py-1">
          {t('shopichat.common.cancel')}
        </button>
        <div className="flex items-center gap-1">
          <button type="button" onClick={undo} disabled={!hasStrokes} title={t('shopichat.editor.undo')} className="p-2 rounded-lg text-white/80 hover:bg-white/10 disabled:opacity-30">
            <IconUndo className="w-5 h-5" />
          </button>
          <button type="button" onClick={clear} disabled={!hasStrokes} title={t('shopichat.editor.clear')} className="p-2 rounded-lg text-white/80 hover:bg-white/10 disabled:opacity-30">
            <IconTrash className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex items-center justify-center px-3">
        <canvas
          ref={canvas}
          onPointerDown={down}
          onPointerMove={moveP}
          onPointerUp={up}
          onPointerLeave={up}
          className="max-h-full max-w-full touch-none cursor-crosshair rounded-lg"
        />
      </div>

      {error && <p className="text-center text-red-300 text-[13px] py-1">{error}</p>}

      <div className="px-4 py-3 space-y-3">
        <div className="flex items-center gap-1 flex-wrap">
          {toolBtn('pen', IconPencil, t('shopichat.editor.pen'))}
          {toolBtn('marker', IconHighlighter, t('shopichat.editor.marker'))}
          {toolBtn('eraser', IconEraser, t('shopichat.editor.eraser'))}
          <span className="mx-1 w-px h-6 bg-white/15" />
          {WIDTHS.map((w, i) => (
            <button key={w} type="button" onClick={() => setWidthIdx(i)} className={`w-8 h-8 grid place-items-center rounded-full ${widthIdx === i ? 'bg-white/25' : 'hover:bg-white/10'}`}>
              <span className="rounded-full bg-white block" style={{ width: 5 + i * 5, height: 5 + i * 5 }} />
            </button>
          ))}
          <span className="flex-1" />
          {COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => { setColor(c); if (tool === 'eraser') setTool('pen') }}
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-full mx-0.5"
              style={{ background: c, boxShadow: color === c ? '0 0 0 2.5px white' : '0 0 0 1px rgba(255,255,255,.35)' }}
            />
          ))}
        </div>
        <div className="flex items-end gap-2">
          <input
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder={t('shopichat.composer.captionPlaceholder')}
            className="flex-1 min-w-0 bg-white/10 text-white placeholder:text-white/40 rounded-full px-4 py-2 text-[14px] outline-none"
          />
          <button
            type="button"
            onClick={send}
            disabled={!ready || sending}
            className="w-10 h-10 grid place-items-center rounded-full bg-[#38bdf8] text-white disabled:opacity-50"
            title={t('shopichat.composer.send')}
          >
            {sending ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <IconSend className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}
