import { useMemo } from 'react'
import type { ChatMessage } from '../../../lib/chatService'
import { conEnlaces, hora, separadorFecha } from './utilidades'

// Mensajes seguidos del mismo remitente en menos de 5 min forman una tanda:
// sin repetir etiqueta ni hora, para que un ida y vuelta no parezcan 20 tarjetas.
const TANDA_MS = 5 * 60 * 1000

/**
 * Burbujas de la conversación agrupadas por día. El separador de fecha se
 * queda pegado arriba mientras se recorre ese día. Colores: tú en azul,
 * Sofía en gris claro, el cliente en blanco con borde.
 */
export default function Mensajes({ mensajes, leidoPorUsuario, onImagen }: {
  mensajes: ChatMessage[]
  /** unreadByUser === 0 del chat vivo. */
  leidoPorUsuario: boolean
  onImagen: (url: string) => void
}) {
  // El "leído" va solo en el ÚLTIMO mensaje tuyo (como WhatsApp): unreadByUser
  // dice el estado de lectura más reciente, no el de cada mensaje.
  const ultimoAdmin = useMemo(() => {
    for (let i = mensajes.length - 1; i >= 0; i--) if (mensajes[i].senderType === 'admin') return mensajes[i].id
    return null
  }, [mensajes])

  const grupos = useMemo(() => {
    const g: Array<{ dia: string; mensajes: ChatMessage[] }> = []
    for (const m of mensajes) {
      const dia = m.createdAt.toDateString()
      const ult = g[g.length - 1]
      if (ult && ult.dia === dia) ult.mensajes.push(m)
      else g.push({ dia, mensajes: [m] })
    }
    return g
  }, [mensajes])

  return (
    <>
      {grupos.map(grupo => (
        <div key={grupo.dia} className="mb-1">
          <div className="sticky top-0 z-[1] flex justify-center py-2">
            <span className="text-[11px] text-gray-500 bg-white px-2.5 py-0.5 rounded-full border border-gray-200 tabular-nums">{separadorFecha(grupo.mensajes[0].createdAt)}</span>
          </div>
          {grupo.mensajes.map((m, i, arr) => {
            const prev = arr[i - 1]
            const next = arr[i + 1]
            const primero = !(prev && prev.senderType === m.senderType && m.createdAt.getTime() - prev.createdAt.getTime() < TANDA_MS)
            const ultimo = !(next && next.senderType === m.senderType && next.createdAt.getTime() - m.createdAt.getTime() < TANDA_MS)
            const esAdmin = m.senderType === 'admin'
            const esSofia = m.senderType === 'assistant'
            const imagenes = m.imageUrls ?? []
            return (
              <div key={m.id} className={`flex ${esAdmin ? 'justify-end' : 'justify-start'} ${ultimo ? 'mb-3' : 'mb-0.5'}`}>
                <div
                  className={`max-w-[75%] px-3 py-1.5 rounded-lg ${m.pending ? 'opacity-70' : ''} ${
                    esAdmin ? 'bg-blue-600 text-white'
                    : esSofia ? 'bg-gray-100 text-gray-900'
                    : 'bg-white text-gray-900 border border-gray-200'
                  }`}
                >
                  {esSofia && primero && <p className="text-[11px] font-medium text-gray-500 mb-0.5">Sofía (IA)</p>}
                  {imagenes.length > 0 && (
                    <div className={`mb-1 grid gap-1 ${imagenes.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                      {imagenes.map((url, j) => (
                        <img
                          key={url}
                          src={url}
                          alt={`Imagen ${j + 1}`}
                          onClick={() => onImagen(url)}
                          className={`rounded cursor-zoom-in ${imagenes.length === 1 ? 'max-w-full max-h-48 object-contain' : 'aspect-square w-full object-cover'}`}
                        />
                      ))}
                    </div>
                  )}
                  {m.text && m.text !== 'Imagen' && (
                    <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">{conEnlaces(m.text, esAdmin)}</p>
                  )}
                  {ultimo && (
                    <p className={`mt-0.5 text-right text-[10.5px] tabular-nums ${esAdmin ? 'text-white/70' : 'text-gray-400'}`}>
                      {hora(m.createdAt)}
                      {esAdmin && m.id === ultimoAdmin && (
                        <span className="ml-1">{m.pending ? '· enviando' : leidoPorUsuario ? '· leído' : '· enviado'}</span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </>
  )
}
