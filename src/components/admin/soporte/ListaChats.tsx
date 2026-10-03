import type { Chat } from '../../../lib/chatService'
import { Boton, Buscador, FiltroSelect } from '../ui'
import Avatar from './Avatar'
import { haceCuanto, type InfoTienda } from './utilidades'

export type FiltroChats = 'all' | 'unread' | 'escalated' | 'paused' | 'closed'

const OPCIONES: Array<{ valor: FiltroChats; etiqueta: string }> = [
  { valor: 'all', etiqueta: 'Todos' },
  { valor: 'unread', etiqueta: 'No leídos' },
  { valor: 'escalated', etiqueta: 'Escalados' },
  { valor: 'paused', etiqueta: 'IA pausada' },
  { valor: 'closed', etiqueta: 'Cerrados' },
]

/** Columna izquierda: búsqueda, filtro, sonido y la lista de conversaciones. */
export default function ListaChats({
  chats, totalActivos, totalCerrados, conteos, filtro, onFiltro, busqueda, onBusqueda,
  cargandoCerrados, seleccionado, onSeleccionar, tiendas, silenciado, onSilenciar,
}: {
  chats: Chat[]
  totalActivos: number
  totalCerrados: number
  conteos: Record<FiltroChats, number>
  filtro: FiltroChats
  onFiltro: (f: FiltroChats) => void
  busqueda: string
  onBusqueda: (q: string) => void
  cargandoCerrados: boolean
  seleccionado: string | null
  onSeleccionar: (c: Chat) => void
  tiendas: Record<string, InfoTienda | null>
  silenciado: boolean
  onSilenciar: () => void
}) {
  const total = filtro === 'closed' ? totalCerrados : totalActivos
  const titulo = chats.length === total
    ? filtro === 'closed' ? `${total} cerrado${total !== 1 ? 's' : ''}` : `${total} conversaci${total !== 1 ? 'ones' : 'ón'}`
    : `${chats.length} de ${total}`

  return (
    <>
      <div className="p-3 border-b border-gray-200 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[12px] text-gray-500 tabular-nums">{titulo}</p>
          <button
            type="button"
            onClick={onSilenciar}
            className="text-[12px] text-gray-500 hover:text-gray-900"
            title={silenciado ? 'Activar alertas sonoras' : 'Silenciar alertas sonoras'}
          >
            Sonido: <span className={silenciado ? 'text-gray-500' : 'text-gray-900 font-medium'}>{silenciado ? 'apagado' : 'encendido'}</span>
          </button>
        </div>
        <Buscador ancho="w-full" value={busqueda} onChange={e => onBusqueda(e.target.value)} placeholder="Buscar tienda, email, mensaje" />
        <FiltroSelect value={filtro} onChange={e => onFiltro(e.target.value as FiltroChats)} className="w-full sm:w-full">
          {OPCIONES.map(o => (
            // Cerrados no tiene número hasta abrirlo (se lee a pedido).
            <option key={o.valor} value={o.valor}>{o.etiqueta}{conteos[o.valor] > 0 ? ` (${conteos[o.valor]})` : ''}</option>
          ))}
        </FiltroSelect>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtro === 'closed' && cargandoCerrados && <p className="px-4 py-8 text-center text-[12.5px] text-gray-500">Cargando…</p>}
        {!(filtro === 'closed' && cargandoCerrados) && chats.length === 0 && (
          <div className="px-6 py-10 text-center">
            <p className="text-[12.5px] text-gray-500">
              {busqueda ? 'Sin coincidencias para tu búsqueda'
                : filtro === 'closed' ? 'No hay conversaciones cerradas'
                : filtro !== 'all' ? 'Sin coincidencias con el filtro'
                : 'No hay conversaciones aún'}
            </p>
            {(filtro !== 'all' || busqueda) && (
              <Boton variante="enlace" tamano="sm" className="mt-1" onClick={() => { onFiltro('all'); onBusqueda('') }}>Limpiar filtros</Boton>
            )}
          </div>
        )}

        {chats.map(c => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSeleccionar(c)}
            className={`w-full text-left px-3 py-2.5 border-b border-gray-100 transition-colors ${seleccionado === c.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
          >
            <div className="flex items-start gap-2.5">
              <Avatar logo={tiendas[c.storeId]?.logo} nombre={c.storeName} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className={`text-[12.5px] truncate ${c.unreadByAdmin > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-900'}`}>{c.storeName}</p>
                  <span className="text-[11px] text-gray-500 shrink-0 tabular-nums">{haceCuanto(c.lastMessageAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className="text-[12px] text-gray-500 truncate">
                    {c.lastMessageBy === 'admin' && <span className="text-gray-400">Tú: </span>}
                    {c.lastMessageBy === 'assistant' && <span className="text-gray-400">Sofía: </span>}
                    {c.lastMessage}
                  </p>
                  {c.unreadByAdmin > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[10.5px] font-medium leading-[18px] text-center tabular-nums shrink-0">{c.unreadByAdmin}</span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 truncate mt-0.5">
                  {c.userEmail}
                  {c.escalated && <span className="text-gray-900 font-medium"> · Escalado</span>}
                  {c.aiPaused && <span className="text-gray-500"> · IA pausada</span>}
                </p>
                {c.escalated && c.escalationReason && (
                  <p className="text-[11px] text-gray-700 truncate mt-0.5" title={c.escalationReason}>Motivo: {c.escalationReason}</p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </>
  )
}
