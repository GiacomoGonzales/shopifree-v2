import type { Order } from '../../types'

/**
 * Tablero de recepcion de pedidos: tres etapas, botones grandes.
 *
 * Reemplaza la lista normal de Pedidos cuando el modo recepcion esta activo.
 * Esta pensado para una tablet en el mostrador: se mira de lejos y se toca con
 * el dedo, no con el mouse.
 *
 * ── Las tres etapas ─────────────────────────────────────────────────────
 * No se inventan estados nuevos. Se agrupan los seis que ya existen, asi los
 * pedidos viejos, las estadisticas y la vista normal de Pedidos siguen
 * valiendo tal cual:
 *
 *   NUEVOS      pending                 -> boton "Aceptar"   => confirmed
 *   EN COCINA   confirmed | preparing   -> boton "Listo"     => ready
 *   LISTOS      ready                   -> boton "Entregado" => delivered
 *
 * `delivered` y `cancelled` no aparecen: el tablero muestra lo que falta
 * atender. Lo cerrado se consulta en la vista normal.
 *
 * El cambio de estado se delega al padre (handleStatusChange en Orders.tsx),
 * que ademas descuenta o repone stock. Duplicar eso aca habria dejado dos
 * caminos que se desincronizan.
 */

interface Props {
  orders: Order[]
  onSelectOrder: (order: Order) => void
  onStatusChange: (orderId: string, status: Order['status']) => void
  updatingId: string | null
  currency: string
  formatPrice: (amount: number) => string
}

type EtapaId = 'nuevos' | 'cocina' | 'listos'

const ETAPAS: Array<{
  id: EtapaId
  titulo: string
  estados: Order['status'][]
  accion: string
  siguiente: Order['status']
  color: string
}> = [
  { id: 'nuevos', titulo: 'Nuevos', estados: ['pending'], accion: 'Aceptar', siguiente: 'confirmed', color: '#D97706' },
  { id: 'cocina', titulo: 'En preparacion', estados: ['confirmed', 'preparing'], accion: 'Listo', siguiente: 'ready', color: '#2563EB' },
  { id: 'listos', titulo: 'Listos', estados: ['ready'], accion: 'Entregado', siguiente: 'delivered', color: '#059669' },
]

/** Hace cuanto entro el pedido. En un mostrador importa mas que la hora exacta. */
function haceCuanto(fecha: Date | undefined): string {
  if (!fecha) return ''
  const min = Math.floor((Date.now() - new Date(fecha).getTime()) / 60000)
  if (min < 1) return 'recien'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  return h < 24 ? `hace ${h} h` : `hace ${Math.floor(h / 24)} d`
}

export default function OrderReceptionBoard({
  orders, onSelectOrder, onStatusChange, updatingId, formatPrice,
}: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {ETAPAS.map(etapa => {
        // Mas viejo primero: en un mostrador se atiende por orden de llegada.
        const suyos = orders
          .filter(o => etapa.estados.includes(o.status))
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

        return (
          <section key={etapa.id} className="min-w-0">
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: etapa.color }} />
              <h2 className="text-[0.95rem] font-semibold text-[#1e3a5f]">{etapa.titulo}</h2>
              <span className="text-sm text-[#8898AA] tabular-nums">{suyos.length}</span>
            </div>

            <div className="space-y-3">
              {suyos.length === 0 && (
                <p className="text-sm text-[#A9B6C6] text-center py-8 bg-[#F6F9FC] rounded-[10px] border border-dashed border-[#E6EBF1]">
                  Sin pedidos
                </p>
              )}

              {suyos.map(order => {
                const enCurso = updatingId === order.id
                return (
                  <article
                    key={order.id}
                    className="bg-white rounded-[10px] border border-[#EAF0F6] overflow-hidden"
                    style={{ boxShadow: '0 2px 8px rgba(30,58,95,0.06)' }}
                  >
                    {/* Cabecera: toca para ver el detalle completo */}
                    <button
                      type="button"
                      onClick={() => onSelectOrder(order)}
                      className="w-full text-left p-3.5 hover:bg-[#F8FAFC] transition-colors"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-semibold text-[#1e3a5f]">{order.orderNumber}</span>
                        <span className="text-sm font-semibold text-[#1e3a5f] tabular-nums">
                          {formatPrice(order.total)}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between gap-3 mt-0.5">
                        <span className="text-sm text-[#425466] truncate">
                          {order.customer?.name || 'Sin nombre'}
                        </span>
                        <span className="text-xs text-[#8898AA] shrink-0">{haceCuanto(order.createdAt)}</span>
                      </div>

                      <ul className="mt-2.5 space-y-0.5">
                        {order.items.slice(0, 4).map((item, i) => (
                          <li key={i} className="text-sm text-[#425466] flex gap-2">
                            <span className="font-semibold text-[#1e3a5f] tabular-nums shrink-0">{item.quantity}x</span>
                            <span className="truncate">{item.productName}</span>
                          </li>
                        ))}
                        {order.items.length > 4 && (
                          <li className="text-xs text-[#8898AA]">+{order.items.length - 4} mas</li>
                        )}
                      </ul>
                    </button>

                    {/* Accion de la etapa: alto generoso, se toca con el dedo */}
                    <button
                      type="button"
                      onClick={() => onStatusChange(order.id, etapa.siguiente)}
                      disabled={enCurso}
                      className="w-full py-3 text-[0.95rem] font-semibold text-white transition-opacity disabled:opacity-50"
                      style={{ backgroundColor: etapa.color }}
                    >
                      {enCurso ? '...' : etapa.accion}
                    </button>
                  </article>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
