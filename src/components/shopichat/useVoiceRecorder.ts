/**
 * Grabar una nota de voz en el navegador (portado de Cobrify,
 * components/chat/grabadoraDeVoz.js).
 *
 * El detalle que manda es el FORMATO. MediaRecorder graba en lo que el
 * navegador quiera, y WhatsApp solo acepta unos pocos: mp4 (.m4a), ogg con
 * opus y mp3. Chrome también ofrece webm — que no sirve — así que se pide uno
 * de los buenos y, si ninguno está disponible, no se ofrece el micrófono en
 * vez de grabar algo que Meta va a rechazar.
 *
 * Tope: 5 minutos (una nota razonable). A esta calidad son ~2–3 MB, que entra
 * por el body de la API en base64.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

const MAX_SECONDS = 5 * 60

/** En orden de preferencia. El primero que el navegador sepa grabar, gana. */
const FORMATS = [
  { mime: 'audio/mp4', ext: 'm4a' },
  { mime: 'audio/ogg;codecs=opus', ext: 'ogg' },
  { mime: 'audio/ogg', ext: 'ogg' },
  { mime: 'audio/mpeg', ext: 'mp3' },
]

function recordingFormat() {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return null
  return FORMATS.find(f => MediaRecorder.isTypeSupported(f.mime)) || null
}

/** "0:07" — lo que se lee mientras se graba. */
export const recordingClock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

export type RecorderFailure = 'unsupported' | 'denied' | 'failed'

export function useVoiceRecorder() {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [format] = useState(recordingFormat)
  const recorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const stream = useRef<MediaStream | null>(null)
  const clock = useRef<ReturnType<typeof setInterval> | null>(null)

  // El micrófono se apaga en cuanto la pantalla se desmonta: dejar la luz del
  // micrófono prendida después de salir del chat sería alarmante.
  const releaseMic = useCallback(() => {
    stream.current?.getTracks().forEach(t => t.stop())
    stream.current = null
    if (clock.current) clearInterval(clock.current)
    clock.current = null
  }, [])

  useEffect(() => releaseMic, [releaseMic])

  const start = useCallback(async (): Promise<{ ok: true } | { ok: false; reason: RecorderFailure }> => {
    if (!format) return { ok: false, reason: 'unsupported' }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.current = s
      chunks.current = []
      const mr = new MediaRecorder(s, { mimeType: format.mime })
      mr.ondataavailable = e => { if (e.data.size) chunks.current.push(e.data) }
      recorder.current = mr
      mr.start()
      setSeconds(0)
      setRecording(true)
      clock.current = setInterval(() => {
        setSeconds(v => {
          if (v + 1 >= MAX_SECONDS && mr.state !== 'inactive') mr.stop()
          return v + 1
        })
      }, 1000)
      return { ok: true }
    } catch (e) {
      releaseMic()
      const name = (e as { name?: string })?.name
      return { ok: false, reason: name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'failed' }
    }
  }, [format, releaseMic])

  /** Termina y entrega el archivo listo para mandar (o null si quedó vacío). */
  const stop = useCallback(() => new Promise<File | null>(resolve => {
    const mr = recorder.current
    if (!mr || mr.state === 'inactive' || !format) { resolve(null); return }
    mr.onstop = () => {
      const blob = new Blob(chunks.current, { type: format.mime })
      releaseMic()
      setRecording(false)
      setSeconds(0)
      if (!blob.size) { resolve(null); return }
      // El tipo va SIN los parámetros del códec: el servidor busca el mime
      // exacto y "audio/ogg;codecs=opus" no está en la tabla.
      const clean = format.mime.split(';')[0]
      resolve(new File([blob], `nota-${Date.now()}.${format.ext}`, { type: clean }))
    }
    mr.stop()
  }), [format, releaseMic])

  const cancel = useCallback(() => {
    const mr = recorder.current
    if (mr && mr.state !== 'inactive') { mr.onstop = null; mr.stop() }
    chunks.current = []
    releaseMic()
    setRecording(false)
    setSeconds(0)
  }, [releaseMic])

  return { canRecord: Boolean(format), recording, seconds, start, stop, cancel }
}
