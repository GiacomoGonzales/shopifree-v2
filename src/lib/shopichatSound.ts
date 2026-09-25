/**
 * EL SONIDO DE LOS MENSAJES NUEVOS de ShopiChat (portado de Cobrify,
 * utils/sonidoDelChat.js).
 *
 * Dos sonidos, como en el celular:
 *  - "alert": dos notas, para lo que entra donde NO estás mirando (otra
 *    conversación, otra pantalla del panel o la ventana de lado);
 *  - "bubble": un toque corto y suave para lo que entra en la conversación
 *    abierta mientras la miras.
 *
 * Se arman con Web Audio: no hay archivo que bajar y suenan igual en todos
 * lados. Prendido o apagado es de ESTE dispositivo (localStorage).
 *
 * El navegador no deja sonar a una página que todavía no se tocó. Mientras
 * pase eso, `blocked` es verdadero y el botón lo dice; el primer clic o tecla
 * en cualquier parte lo destraba.
 */
import { useEffect, useSyncExternalStore } from 'react'

const KEY = 'shopichatSound'
// Lo último que sonó, compartido entre pestañas: con el panel abierto dos
// veces suena una sola.
const KEY_LAST = 'shopichatSoundLast'
// Una ráfaga (un álbum de fotos, tres mensajes seguidos) suena una sola vez.
const MIN_GAP_MS = 1200
// Un contexto recién creado arranca suspendido un instante aunque el
// navegador lo deje sonar: sin esta espera el aviso parpadearía en cada carga.
const GRACE_MS = 1500

export type SoundShape = 'alert' | 'bubble'

const readPref = () => {
  try { return localStorage.getItem(KEY) !== 'off' } catch { return true }
}

let enabled = readPref()
let ctx: AudioContext | null = null
let createdAt = 0
let lastSound: { at: number; shape: SoundShape | null } = { at: -Infinity, shape: null }
let snapshot = { enabled, blocked: false }
const listeners = new Set<() => void>()

function notify() {
  const blocked = enabled && !!ctx && ctx.state !== 'running' && performance.now() - createdAt >= GRACE_MS
  if (snapshot.enabled !== enabled || snapshot.blocked !== blocked) snapshot = { enabled, blocked }
  listeners.forEach(f => f())
}

function context(): AudioContext | null {
  if (ctx) return ctx
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
  } catch {
    return null
  }
  createdAt = performance.now()
  ctx.addEventListener?.('statechange', notify)
  setTimeout(notify, GRACE_MS + 50)
  // En captura: un clic que otro componente frena con stopPropagation igual
  // cuenta. pointerup porque con el dedo el permiso llega al levantarlo.
  const wake = () => { if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}) }
  for (const type of ['pointerdown', 'pointerup', 'keydown']) {
    window.addEventListener(type, wake, true)
  }
  return ctx
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', e => {
    if (e.key !== KEY) return
    enabled = readPref()
    notify()
  })
}

/** Una nota con algo de campana: la fundamental y su octava bajita. */
function note(c: AudioContext, hz: number, start: number, volume: number, length: number) {
  for (const [mult, peak, dur] of [[1, volume, length], [2, volume * 0.25, length * 0.35]]) {
    const osc = c.createOscillator()
    const env = c.createGain()
    osc.type = 'sine'
    osc.frequency.value = hz * mult
    env.gain.setValueAtTime(0.0001, start)
    env.gain.linearRampToValueAtTime(peak, start + 0.005)
    env.gain.exponentialRampToValueAtTime(0.0001, start + dur)
    osc.connect(env).connect(c.destination)
    osc.onended = () => env.disconnect()
    osc.start(start)
    osc.stop(start + dur + 0.05)
  }
}

const SHAPES: Record<SoundShape, (c: AudioContext, t: number) => void> = {
  // La (880 Hz) y Mi (1318,5 Hz): una quinta para arriba.
  alert: (c, t) => {
    note(c, 880, t, 0.5, 0.45)
    note(c, 1318.51, t + 0.11, 0.46, 0.8)
  },
  // Una gota: sube de tono en 60 ms y se apaga enseguida.
  bubble: (c, t) => {
    const osc = c.createOscillator()
    const env = c.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(420, t)
    osc.frequency.exponentialRampToValueAtTime(760, t + 0.06)
    env.gain.setValueAtTime(0.0001, t)
    env.gain.linearRampToValueAtTime(0.3, t + 0.004)
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.18)
    osc.connect(env).connect(c.destination)
    osc.onended = () => env.disconnect()
    osc.start(t)
    osc.stop(t + 0.21)
  },
}

function play(shape: SoundShape): boolean {
  const c = context()
  if (!c || c.state !== 'running') return false
  SHAPES[shape](c, c.currentTime + 0.02)
  return true
}

/** Suena de muestra. Solo desde un clic: ahí el navegador siempre deja. */
function tryIt() {
  const c = context()
  if (!c) return
  if (c.state === 'running') play('alert')
  else c.resume().then(() => play('alert')).catch(() => {})
}

export const soundEnabled = () => enabled

// La primera pestaña que anota el mensaje lo toca; la otra lo ve anotado.
function firstTime(key: string): boolean {
  try {
    if (localStorage.getItem(KEY_LAST) === key) return false
    localStorage.setItem(KEY_LAST, key)
  } catch { /* sin almacenamiento suena igual; a lo sumo, dos veces */ }
  return true
}

/**
 * Suena por un mensaje que acaba de entrar.
 * @param key el mismo mensaje da la misma clave en todas las pestañas.
 * @returns si el sonido quedó a cargo de la página (si no, la notificación del
 *   sistema puede poner el suyo).
 */
export function playNewMessage(shape: SoundShape, key: string): boolean {
  if (!enabled) return false
  const c = context()
  if (!c || c.state !== 'running') return false
  const now = performance.now()
  // Dentro de la misma ráfaga no se repite, salvo que lo nuevo sea un aviso y
  // lo que sonó una burbuja: lo que entra en otra conversación importa más.
  const recent = now - lastSound.at < MIN_GAP_MS
  if (recent && !(shape === 'alert' && lastSound.shape === 'bubble')) return true
  lastSound = { at: now, shape }
  const once = () => { if (firstTime(key)) play(shape) }
  if (navigator.locks?.request) {
    navigator.locks.request('shopichat-sound', once).catch(once)
  } else {
    once()
  }
  return true
}

const subscribe = (f: () => void) => {
  listeners.add(f)
  return () => { listeners.delete(f) }
}
const read = () => snapshot

/** Para el botón de sonido: si está prendido, si el navegador lo bloquea, y las acciones. */
export function useShopiChatSound() {
  const state = useSyncExternalStore(subscribe, read, read)
  // El contexto se crea al montar y no al primer mensaje: así se sabe
  // enseguida si hace falta el toque para destrabarlo.
  useEffect(() => { context() }, [])
  return {
    ...state,
    toggle: () => {
      enabled = !enabled
      try { localStorage.setItem(KEY, enabled ? 'on' : 'off') } catch { /* queda por esta visita */ }
      notify()
      if (enabled) tryIt()
    },
    unlock: tryIt,
  }
}
