/**
 * Piezas sueltas de la bandeja de chats de soporte (antes dentro de
 * pages/dashboard/SupportChats.tsx).
 */

export interface InfoTienda {
  logo?: string
  subdomain?: string
  plan?: string
  country?: string
}

/**
 * Imagen en cola en la caja de respuesta. `preview` es un blob local que se
 * muestra al instante; `url` es la de R2 cuando termina de subir. No se envía
 * hasta que todas tienen `url`, para no mandar adjuntos a medio subir.
 */
export interface ImagenPendiente {
  id: string
  preview: string
  url: string | null
  subiendo: boolean
}

export const idImagen = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

/**
 * Campanilla de alerta con Web Audio: tres tonos ascendentes (La5, Do#6, Mi6)
 * que se oyen aunque la pestaña esté de fondo.
 */
export function sonarAlerta() {
  try {
    const ctx = new AudioContext()
    const ahora = ctx.currentTime
    ;[880, 1100, 1320].forEach((frecuencia, i) => {
      const osc = ctx.createOscillator()
      const vol = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = frecuencia
      vol.gain.setValueAtTime(0.35, ahora + i * 0.15)
      vol.gain.exponentialRampToValueAtTime(0.01, ahora + i * 0.15 + 0.4)
      osc.connect(vol)
      vol.connect(ctx.destination)
      osc.start(ahora + i * 0.15)
      osc.stop(ahora + i * 0.15 + 0.4)
    })
    setTimeout(() => ctx.close(), 1500)
  } catch {
    // Sin Web Audio: silencio.
  }
}

/** Convierte las URLs del texto en enlaces (en blanco sobre la burbuja azul). */
export function conEnlaces(texto: string, sobreAzul: boolean) {
  const re = /(https?:\/\/[^\s]+)/g
  return texto.split(re).map((parte, i) =>
    /^https?:\/\//.test(parte) ? (
      <a key={i} href={parte} target="_blank" rel="noopener noreferrer" className={`underline ${sobreAzul ? 'text-white' : 'text-blue-700'}`}>
        {parte.replace(/https?:\/\//, '').replace(/\/$/, '')}
      </a>
    ) : (
      <span key={i}>{parte}</span>
    )
  )
}

export const hora = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

/** "Ahora", "5m", "3h", "2d" o la fecha corta. */
export function haceCuanto(d: Date) {
  const min = Math.floor((Date.now() - d.getTime()) / 60000)
  if (min < 1) return 'Ahora'
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  const dias = Math.floor(h / 24)
  if (dias < 7) return `${dias}d`
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

export function separadorFecha(d: Date) {
  const hoy = new Date()
  const ayer = new Date(hoy)
  ayer.setDate(ayer.getDate() - 1)
  if (d.toDateString() === hoy.toDateString()) return 'Hoy'
  if (d.toDateString() === ayer.toDateString()) return 'Ayer'
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })
}
