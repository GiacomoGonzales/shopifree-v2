/**
 * LAS NOTAS DE VOZ, COMO EN WHATSAPP (portado de Cobrify,
 * components/chat/NotasDeVoz.jsx).
 *
 * Un solo reproductor para toda la bandeja, que vive FUERA de las burbujas:
 *  - al pasar a otra conversación el audio sigue sonando (la barra de arriba
 *    lo deja pausar, cambiar la velocidad, cerrarlo o volver);
 *  - la burbuja tiene play/pausa, una barra que se toca o se arrastra, y la
 *    velocidad a un toque (1× → 1,5× → 2×).
 */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { IconPause, IconPlay, IconX } from './icons'

const SPEEDS = [1, 1.5, 2]
const SPEED_KEY = 'shopichatVoiceSpeed'

function savedSpeed() {
  try {
    const v = Number(localStorage.getItem(SPEED_KEY))
    return SPEEDS.includes(v) ? v : 1
  } catch {
    return 1
  }
}

interface Note {
  messageId: string | null
  conversationId: string | null
  url: string | null
  title: string
}

interface State extends Note {
  playing: boolean
  current: number
  duration: number
  speed: number
}

const NO_NOTE: Omit<State, 'speed'> = {
  messageId: null, conversationId: null, url: null, title: '', playing: false, current: 0, duration: 0,
}

let audio: HTMLAudioElement | null = null
let state: State = { ...NO_NOTE, speed: savedSpeed() }
const listeners = new Set<() => void>()

function publish(changes: Partial<State>) {
  state = { ...state, ...changes }
  listeners.forEach(f => f())
}
const subscribe = (f: () => void) => {
  listeners.add(f)
  return () => { listeners.delete(f) }
}
const read = () => state

// Lo que ya se sabe que dura cada nota, por URL.
const durations = new Map<string, number>()
const validDuration = (d: number) => Number.isFinite(d) && d > 0

/** El <audio> único. Se crea con el primer play, no al cargar la página. */
function theAudio(): HTMLAudioElement {
  if (audio) return audio
  const a = new Audio()
  a.preload = 'auto'
  a.addEventListener('timeupdate', () => publish({ current: a.currentTime }))
  a.addEventListener('durationchange', () => {
    if (!validDuration(a.duration)) return
    if (state.url) durations.set(state.url, a.duration)
    publish({ duration: a.duration })
  })
  a.addEventListener('play', () => publish({ playing: true }))
  a.addEventListener('pause', () => publish({ playing: false }))
  a.addEventListener('ended', () => closeNote())
  audio = a
  return a
}

function begin(note: Note, from = 0) {
  const a = theAudio()
  a.pause()
  publish({ ...note, current: from, duration: (note.url && durations.get(note.url)) || 0, playing: false })
  a.src = note.url || ''
  // `defaultPlaybackRate` sobrevive al cambio de archivo; `playbackRate` no.
  a.defaultPlaybackRate = state.speed
  a.playbackRate = state.speed
  if (from > 0) a.addEventListener('loadedmetadata', () => { a.currentTime = from }, { once: true })
  a.play().catch(() => {})
}

function toggleNote(note: Note) {
  if (state.messageId === note.messageId && audio) {
    if (audio.paused) audio.play().catch(() => {})
    else audio.pause()
    return
  }
  begin(note)
}

function seekNote(note: Note, fraction: number, knownDuration = 0) {
  const f = Math.min(1, Math.max(0, fraction))
  if (state.messageId === note.messageId && audio) {
    const d = state.duration || knownDuration
    if (!d) return
    audio.currentTime = f * d
    publish({ current: f * d })
    return
  }
  const d = knownDuration || (note.url && durations.get(note.url)) || 0
  begin(note, d ? f * d : 0)
}

function skip(seconds: number) {
  if (!audio || !state.messageId) return
  const d = state.duration || 0
  const target = Math.max(0, audio.currentTime + seconds)
  audio.currentTime = d ? Math.min(d, target) : target
  publish({ current: audio.currentTime })
}

function cycleSpeed() {
  const i = SPEEDS.indexOf(state.speed)
  const v = SPEEDS[(i + 1) % SPEEDS.length]
  if (audio) {
    audio.defaultPlaybackRate = v
    audio.playbackRate = v
  }
  try { localStorage.setItem(SPEED_KEY, String(v)) } catch { /* vale por esta sesión */ }
  publish({ speed: v })
}

function closeNote() {
  if (audio) {
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
  }
  publish({ ...NO_NOTE })
}

const useNote = () => useSyncExternalStore(subscribe, read, read)
const speedLabel = (v: number) => `${String(v).replace('.', ',')}×`

function fmt(seconds: number) {
  if (!validDuration(seconds) && seconds !== 0) return '—:—'
  const s = Math.floor(seconds || 0)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Cuánto dura una nota sin reproducir: se pide solo la cabecera del archivo. */
function useDuration(url: string) {
  const [probe, setProbe] = useState<{ url: string; d: number } | null>(null)
  useEffect(() => {
    if (!url || durations.has(url)) return undefined
    const s = new Audio()
    s.preload = 'metadata'
    const ready = () => {
      if (!validDuration(s.duration)) return
      durations.set(url, s.duration)
      setProbe({ url, d: s.duration })
    }
    s.addEventListener('loadedmetadata', ready)
    s.addEventListener('durationchange', ready)
    s.src = url
    return () => {
      s.removeEventListener('loadedmetadata', ready)
      s.removeEventListener('durationchange', ready)
      s.removeAttribute('src')
      s.load()
    }
  }, [url])
  return durations.get(url) || (probe?.url === url ? probe.d : 0)
}

interface BarProps {
  progress: number
  duration: number
  current: number
  onSeek: (f: number) => void
  onSkip: (s: number) => void
  compact?: boolean
  label: string
}

/** Barra de avance: se toca para ir a un punto y se arrastra para buscar. */
function ProgressBar({ progress, duration, current, onSeek, onSkip, compact = false, label }: BarProps) {
  const bar = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const fractionAt = (clientX: number) => {
    const r = bar.current?.getBoundingClientRect()
    if (!r || !r.width) return 0
    return (clientX - r.left) / r.width
  }
  return (
    <div
      ref={bar}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.round(duration || 0)}
      aria-valuenow={Math.round(current || 0)}
      onPointerDown={e => {
        e.stopPropagation()
        dragging.current = true
        e.currentTarget.setPointerCapture?.(e.pointerId)
        onSeek(fractionAt(e.clientX))
      }}
      onPointerMove={e => { if (dragging.current) onSeek(fractionAt(e.clientX)) }}
      onPointerUp={e => {
        dragging.current = false
        e.currentTarget.releasePointerCapture?.(e.pointerId)
      }}
      onPointerCancel={() => { dragging.current = false }}
      onClick={e => e.stopPropagation()}
      onKeyDown={e => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); onSkip(-5) }
        if (e.key === 'ArrowRight') { e.preventDefault(); onSkip(5) }
      }}
      className={`relative flex items-center cursor-pointer touch-none select-none rounded-full ${compact ? 'h-3' : 'h-5'}`}
    >
      <div className="h-1 w-full rounded-full bg-current opacity-20" />
      <div className="absolute left-0 h-1 rounded-full bg-[#1e3a5f]" style={{ width: `${progress * 100}%` }} />
      {!compact && (
        <div className="absolute w-3 h-3 rounded-full bg-[#1e3a5f] -translate-x-1/2 shadow-sm" style={{ left: `${progress * 100}%` }} />
      )}
    </div>
  )
}

/** La nota de voz dentro de su burbuja. */
export function VoiceNote({ messageId, conversationId, url, title }: { messageId: string; conversationId: string; url: string; title: string }) {
  const { t } = useTranslation('dashboard')
  const s = useNote()
  const own = useDuration(url)
  const isThis = s.messageId === messageId
  const duration = (isThis && s.duration) || own
  const current = isThis ? s.current : 0
  const progress = duration ? Math.min(1, current / duration) : 0
  const playing = isThis && s.playing
  const note: Note = { messageId, conversationId, url, title }

  return (
    <div className="flex items-center gap-2.5 w-60 max-w-full py-0.5">
      <button
        type="button"
        onClick={() => toggleNote(note)}
        aria-label={playing ? t('shopichat.voice.pause') : t('shopichat.voice.play')}
        className="w-9 h-9 flex-none grid place-items-center rounded-full bg-[#1e3a5f] text-white hover:bg-[#2a4d7a] transition-colors"
      >
        {playing ? <IconPause className="w-4 h-4" /> : <IconPlay className="w-4 h-4 translate-x-px" />}
      </button>
      <div className="flex-1 min-w-0">
        <ProgressBar
          progress={progress}
          duration={duration}
          current={current}
          label={t('shopichat.voice.progress')}
          onSeek={f => seekNote(note, f, duration)}
          onSkip={sec => (isThis ? skip(sec) : seekNote(note, 0, duration))}
        />
        <span className="block text-[11px] tabular-nums opacity-70 -mt-0.5">
          {fmt(isThis && (playing || current > 0) ? current : duration)}
        </span>
      </div>
      {isThis && (
        <button
          type="button"
          onClick={cycleSpeed}
          title={t('shopichat.voice.speed')}
          className="flex-none min-w-[2.6rem] px-2 py-1 rounded-full bg-[#1e3a5f]/80 text-white text-[11.5px] font-semibold tabular-nums"
        >
          {speedLabel(s.speed)}
        </button>
      )}
    </div>
  )
}

/**
 * La nota que está sonando, fuera de su conversación. No aparece si no hay
 * nada cargado, ni si `hideIn` es justo la conversación de la nota.
 */
export function VoiceNoteBar({ onOpen, hideIn = null, className = '' }: { onOpen?: (id: string) => void; hideIn?: string | null; className?: string }) {
  const { t } = useTranslation('dashboard')
  const s = useNote()
  if (!s.messageId) return null
  if (hideIn && hideIn === s.conversationId) return null
  const progress = s.duration ? Math.min(1, s.current / s.duration) : 0
  return (
    <div className={`relative flex items-center gap-2 px-3 py-2 bg-white border-b border-[#E6EBF1] ${className}`}>
      <button
        type="button"
        onClick={() => toggleNote(s)}
        aria-label={s.playing ? t('shopichat.voice.pause') : t('shopichat.voice.play')}
        className="w-8 h-8 flex-none grid place-items-center rounded-full bg-[#1e3a5f] text-white"
      >
        {s.playing ? <IconPause className="w-3.5 h-3.5" /> : <IconPlay className="w-3.5 h-3.5 translate-x-px" />}
      </button>
      <button type="button" onClick={() => s.conversationId && onOpen?.(s.conversationId)} className="min-w-0 flex-1 text-left">
        <span className="block text-[12.5px] font-medium text-[#1e3a5f] truncate">
          {t('shopichat.voice.barTitle', { name: s.title })}
        </span>
        <span className="block text-[11px] text-[#8898AA] tabular-nums">{fmt(s.current)} / {fmt(s.duration)}</span>
      </button>
      <button
        type="button"
        onClick={cycleSpeed}
        className="flex-none min-w-[2.6rem] px-2 py-1 rounded-full bg-[#1e3a5f]/80 text-white text-[11.5px] font-semibold tabular-nums"
      >
        {speedLabel(s.speed)}
      </button>
      <button type="button" onClick={closeNote} aria-label={t('shopichat.common.close')} className="flex-none p-1.5 rounded-full text-[#A9B6C6] hover:text-[#425466] hover:bg-[#F6F9FC]">
        <IconX className="w-4 h-4" />
      </button>
      <div className="absolute left-0 bottom-0 h-0.5 bg-[#38bdf8]" style={{ width: `${progress * 100}%` }} />
    </div>
  )
}
