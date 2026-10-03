import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  collection, count, doc, getAggregateFromServer, getCountFromServer, getDoc, query, serverTimestamp, setDoc, sum, where,
} from 'firebase/firestore'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  Pagina, Seccion, Tabla, Th, Td, Fila, FilaVacia, Estado, Boton, Aviso, Pestanas,
  ListaDatos, Dato, Cifras, Cifra, TarjetaDeFila, ListaTarjetas, AreaTexto, Cargando, cn,
} from '../../components/admin/ui'
import CambiarPlanModal from '../../components/admin/tienda/CambiarPlanModal'
import PagosDeTienda from '../../components/admin/tienda/PagosDeTienda'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import { db, analyticsService, orderService } from '../../lib/firebase'
import { syncStoreSubscription } from '../../lib/stripe'
import { armarTienda, invalidarTiendas, type AdminTienda } from '../../lib/admin/datos'
import { aFecha, dinero, fecha, fechaCorta, fechaHora, nombrePais, numero, porcentaje, relativo } from '../../lib/admin/formato'
import { ETIQUETA_ESTADO, ETIQUETA_PLAN, ETIQUETA_STRIPE, TONO_ESTADO } from '../../lib/admin/modelo'
import type { AnalyticsSummary, DailyStats, Order, TopProduct } from '../../types'

/**
 * Ficha de una tienda (reemplaza StoreDetail).
 *
 * Lecturas: al abrir, el documento de la tienda y el de su dueño (2). Cada
 * pestaña carga lo suyo solo la primera vez que se abre:
 *  - Resumen: counts/sumas del servidor (productos, categorías, pedidos +
 *    ingresos) en vez de bajar las colecciones; los eventos de analytics de
 *    30 días (un documento por evento, igual que antes) y los últimos 500
 *    pedidos para "más vendidos" (antes bajaba hasta 9.999).
 *  - Pedidos: los últimos 20 (o los ya bajados por Resumen).
 *  - Notas: 1 documento (adminNotes/{storeId}).
 * El resto (Suscripción, Dueño, Configuración, Historial, App) sale de los dos
 * documentos ya leídos.
 */

type Crudo = Record<string, unknown>

const PESTANAS = [
  { id: 'resumen', etiqueta: 'Resumen' },
  { id: 'suscripcion', etiqueta: 'Suscripción' },
  { id: 'dueno', etiqueta: 'Dueño' },
  { id: 'pedidos', etiqueta: 'Pedidos' },
  { id: 'configuracion', etiqueta: 'Configuración' },
  { id: 'notas', etiqueta: 'Notas' },
  { id: 'historial', etiqueta: 'Historial' },
  { id: 'app', etiqueta: 'App' },
]

const ESTADO_PEDIDO: Record<string, string> = {
  pending: 'Pendiente', confirmed: 'Confirmado', preparing: 'Preparando', ready: 'Listo', delivered: 'Entregado', cancelled: 'Cancelado',
}
const ESTADO_PAGO: Record<string, string> = { paid: 'Pagado', pending: 'Pendiente', failed: 'Fallido', refunded: 'Reembolsado' }
const ESTADO_APP: Record<string, string> = { none: 'Sin solicitar', requested: 'Solicitada', building: 'En construcción', published: 'Publicada' }
const ESTADO_BUILD: Record<string, string> = { idle: 'Sin compilar', queued: 'En cola', running: 'Compilando', success: 'Lista', failed: 'Falló' }
const TIPO_NEGOCIO: Record<string, string> = {
  fashion: 'Moda', food: 'Comida', grocery: 'Abarrotes', cosmetics: 'Cosmética', tech: 'Tecnología', pets: 'Mascotas',
  craft: 'Artesanía', general: 'General', retail: 'Retail', restaurant: 'Restaurante', services: 'Servicios', other: 'Otro', beauty: 'Belleza',
}
const IDIOMA: Record<string, string> = { es: 'Español', en: 'Inglés', pt: 'Portugués' }

// Gráficos: gris + el azul del admin. Sin sombras en el tooltip.
const AZUL = '#2563eb'
const GRIS = '#9ca3af'
const EJE = { fontSize: 11, fill: '#6b7280' }
const TOOLTIP = { backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, boxShadow: 'none' }

const solo = (s?: unknown) => String(s || '').replace(/\D/g, '')
const siNo = (v: unknown) => (v ? 'Sí' : 'No')
const obj = (v: unknown): Crudo => (v && typeof v === 'object' ? v as Crudo : {})

function nombreDueno(u: Crudo | null): string {
  if (!u) return ''
  return [u.firstName, u.lastName].filter(Boolean).join(' ') || String(u.displayName || u.name || '')
}

function EnlaceExterno({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">{children}</a>
}

// Botón secundario hecho enlace (abrir la tienda, WhatsApp): mismo aspecto que <Boton>.
const CLASE_BOTON_ENLACE = 'inline-flex items-center justify-center h-8 px-3 rounded-md border border-gray-300 bg-white text-[12.5px] font-medium text-gray-700 whitespace-nowrap hover:bg-gray-50 hover:text-gray-900'

interface DatosResumen {
  productos: number | null
  categorias: number | null
  pedidos: number | null
  ingresos: number | null
  /** true si el count con status != cancelled falló y se muestra el total. */
  pedidosIncluyenCancelados: boolean
  analytics: { summary: AnalyticsSummary; dailyStats: DailyStats[]; topProducts: TopProduct[] } | null
}

export default function AdminTiendaFicha() {
  const { storeId = '' } = useParams<{ storeId: string }>()
  const { localePath } = useLanguage()
  const { firebaseUser } = useAuth()
  const { showToast } = useToast()
  const [params, setParams] = useSearchParams()
  const tab = PESTANAS.some(p => p.id === params.get('tab')) ? params.get('tab')! : 'resumen'

  const [tienda, setTienda] = useState<AdminTienda | null>(null)
  const [dueno, setDueno] = useState<Crudo | null>(null)
  const [cargando, setCargando] = useState(true)
  const [noExiste, setNoExiste] = useState(false)
  const [editando, setEditando] = useState(false)
  const [sincronizando, setSincronizando] = useState(false)

  const [resumen, setResumen] = useState<DatosResumen | null>(null)
  const [pedidos500, setPedidos500] = useState<Order[] | null>(null)
  const [pedidos20, setPedidos20] = useState<Order[] | null>(null)

  const cargarTienda = useCallback(async () => {
    try {
      const snap = await getDoc(doc(db, 'stores', storeId))
      if (!snap.exists()) { setNoExiste(true); return }
      const t = armarTienda(snap.id, snap.data())
      setTienda(t)
      if (t.ownerId) {
        const u = await getDoc(doc(db, 'users', t.ownerId)).catch(() => null)
        setDueno(u?.exists() ? u.data() : null)
      }
    } catch (err) {
      console.error('Error al cargar la tienda:', err)
      setNoExiste(true)
    } finally {
      setCargando(false)
    }
  }, [storeId])

  useEffect(() => { cargarTienda() }, [cargarTienda])

  // ── Resumen: se carga una vez, al abrir la pestaña ──
  useEffect(() => {
    if (tab !== 'resumen' || resumen || !tienda) return
    let vivo = true
    const pedidosRef = collection(db, 'stores', storeId, 'orders')
    const fin = new Date(); fin.setHours(23, 59, 59, 999)
    const inicio = new Date(); inicio.setDate(inicio.getDate() - 29); inicio.setHours(0, 0, 0, 0)

    // allSettled: si una lectura falla (permisos, índice) el resto se muestra igual.
    Promise.allSettled([
      getCountFromServer(collection(db, 'stores', storeId, 'products')),
      getCountFromServer(collection(db, 'stores', storeId, 'categories')),
      getAggregateFromServer(query(pedidosRef, where('status', '!=', 'cancelled')), { pedidos: count(), ingresos: sum('total') }),
      analyticsService.getFullAnalytics(storeId, inicio, fin),
      orderService.getAll(storeId, 500),
    ]).then(async ([prod, cat, agg, ana, ped]) => {
      let pedidos: number | null = null
      let ingresos: number | null = null
      let incluyen = false
      if (agg.status === 'fulfilled') {
        pedidos = agg.value.data().pedidos
        ingresos = agg.value.data().ingresos
      } else {
        console.warn('Count de pedidos sin cancelados falló, uso el total:', agg.reason)
        const total = await getCountFromServer(pedidosRef).catch(() => null)
        pedidos = total ? total.data().count : null
        incluyen = true
      }
      if (!vivo) return
      setResumen({
        productos: prod.status === 'fulfilled' ? prod.value.data().count : null,
        categorias: cat.status === 'fulfilled' ? cat.value.data().count : null,
        pedidos,
        ingresos,
        pedidosIncluyenCancelados: incluyen,
        analytics: ana.status === 'fulfilled' ? ana.value : null,
      })
      setPedidos500(ped.status === 'fulfilled' ? ped.value : [])
    })
    return () => { vivo = false }
  }, [tab, resumen, tienda, storeId])

  // ── Pedidos: los últimos 20 (si Resumen ya bajó 500, se reusan) ──
  useEffect(() => {
    if (tab !== 'pedidos' || pedidos20 || pedidos500 || !tienda) return
    let vivo = true
    orderService.getAll(storeId, 20)
      .then(p => { if (vivo) setPedidos20(p) })
      .catch(err => { console.error('Error al cargar pedidos:', err); if (vivo) setPedidos20([]) })
    return () => { vivo = false }
  }, [tab, pedidos20, pedidos500, tienda, storeId])

  const ultimosPedidos = pedidos500 ? pedidos500.slice(0, 20) : pedidos20

  const cambiarTab = (id: string) => {
    const p = new URLSearchParams(params)
    if (id === 'resumen') p.delete('tab')
    else p.set('tab', id)
    setParams(p, { replace: true })
  }

  const sincronizar = async () => {
    if (!tienda) return
    setSincronizando(true)
    try {
      const r = await syncStoreSubscription(tienda.id)
      showToast(`Sincronizado: ${ETIQUETA_STRIPE[r.status || ''] || r.status || 'sin suscripción'}`, 'success')
      invalidarTiendas()
      await cargarTienda()
    } catch (err) {
      console.error('Error al sincronizar con Stripe:', err)
      showToast((err as Error)?.message || 'No se pudo sincronizar con Stripe', 'error')
    } finally {
      setSincronizando(false)
    }
  }

  if (cargando) return <Pagina><Cargando /></Pagina>
  if (noExiste || !tienda) {
    return (
      <Pagina>
        <Aviso tipo="error">No existe una tienda con el ID {storeId}.</Aviso>
        <Link to={localePath('/admin/tiendas')} className="text-[12.5px] text-blue-700 hover:underline">← Volver a Tiendas</Link>
      </Pagina>
    )
  }

  const t = tienda
  const c = t.crudo
  const moneda = t.moneda || 'USD'
  const telDueno = dueno?.phone as string | undefined
  const numWa = solo(t.whatsapp) || solo(telDueno)
  const wa = numWa.length >= 6 ? `https://wa.me/${numWa}` : null
  const urlTienda = t.subdominio ? `https://${t.subdominio}.shopifree.app` : null

  return (
    <Pagina>
      <Link to={localePath('/admin/tiendas')} className="self-start text-[12.5px] text-gray-500 hover:text-gray-900">← Tiendas</Link>

      {/* Cabecera de la ficha (sin h1: el título lo pone el layout). */}
      <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {t.logo
            ? <img src={t.logo} alt="" className="w-10 h-10 shrink-0 rounded-md border border-gray-200 object-cover" />
            : <span className="w-10 h-10 shrink-0 rounded-md border border-gray-200" />}
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-gray-900 truncate">{t.nombre}</p>
            {urlTienda && <p className="text-[12.5px] truncate"><EnlaceExterno href={urlTienda}>{t.subdominio}.shopifree.app</EnlaceExterno></p>}
            <p className="text-[12.5px] text-gray-600">
              <Estado tono={TONO_ESTADO[t.estado]} etiqueta={ETIQUETA_ESTADO[t.estado]} />
              {' · '}{ETIQUETA_PLAN[t.plan]}
              {t.planEfectivo !== t.plan && <span className="text-gray-500"> → {ETIQUETA_PLAN[t.planEfectivo]}</span>}
              {t.vence && <span className="text-gray-500"> · vence {fechaCorta(t.vence)} ({relativo(t.vence)})</span>}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {urlTienda && <a href={urlTienda} target="_blank" rel="noopener noreferrer" className={CLASE_BOTON_ENLACE}>Ver tienda ↗</a>}
          {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className={CLASE_BOTON_ENLACE}>WhatsApp ↗</a>}
          {t.stripeCustomerId && <Boton onClick={sincronizar} cargando={sincronizando}>Sincronizar con Stripe</Boton>}
          <Boton variante="primario" onClick={() => setEditando(true)}>Cambiar plan</Boton>
        </div>
      </div>

      <Pestanas opciones={PESTANAS} valor={tab} onCambiar={cambiarTab} />

      {tab === 'resumen' && <PestanaResumen datos={resumen} pedidos={pedidos500} moneda={moneda} />}

      {tab === 'suscripcion' && (
        <>
          <Seccion
            titulo="Suscripción"
            acciones={<>
              {t.stripeCustomerId && <Boton tamano="sm" onClick={sincronizar} cargando={sincronizando}>Sincronizar</Boton>}
              <Boton tamano="sm" onClick={() => setEditando(true)}>Cambiar plan</Boton>
            </>}
          >
            <ListaDatos>
              <Dato etiqueta="Plan guardado">{ETIQUETA_PLAN[t.plan]}</Dato>
              <Dato etiqueta="Plan efectivo">{ETIQUETA_PLAN[t.planEfectivo]}</Dato>
              <Dato etiqueta="Estado comercial"><Estado tono={TONO_ESTADO[t.estado]} etiqueta={ETIQUETA_ESTADO[t.estado]} /></Dato>
              <Dato etiqueta="Estado en Stripe">{t.stripeStatus ? <Estado valor={t.stripeStatus} etiqueta={ETIQUETA_STRIPE[t.stripeStatus] || t.stripeStatus} /> : null}</Dato>
              <Dato etiqueta="Periodo actual">
                {obj(c.subscription).currentPeriodEnd
                  ? `${fecha(obj(c.subscription).currentPeriodStart)} – ${fecha(obj(c.subscription).currentPeriodEnd)}`
                  : null}
              </Dato>
              <Dato etiqueta="Cancela al vencer">{t.stripeSubscriptionId ? siNo(t.cancelaAlVencer) : null}</Dato>
              <Dato etiqueta="Prueba hasta">{c.trialEndsAt ? `${fecha(c.trialEndsAt)} (${relativo(c.trialEndsAt)})` : null}</Dato>
              <Dato etiqueta="Acceso manual hasta">
                {c.planExpiresAt ? `${fecha(c.planExpiresAt)} (${relativo(c.planExpiresAt)})` : c.planExpiresAt === null && t.plan !== 'free' ? 'Indefinido' : null}
              </Dato>
              <Dato etiqueta="Cliente Stripe">
                {t.stripeCustomerId && <EnlaceExterno href={`https://dashboard.stripe.com/customers/${t.stripeCustomerId}`}><span className="font-mono text-[12px]">{t.stripeCustomerId}</span> ↗</EnlaceExterno>}
              </Dato>
              <Dato etiqueta="Suscripción Stripe">
                {t.stripeSubscriptionId && <EnlaceExterno href={`https://dashboard.stripe.com/subscriptions/${t.stripeSubscriptionId}`}><span className="font-mono text-[12px]">{t.stripeSubscriptionId}</span> ↗</EnlaceExterno>}
              </Dato>
            </ListaDatos>
          </Seccion>
          <Seccion titulo="Pagos">
            {t.stripeCustomerId
              ? <PagosDeTienda customerId={t.stripeCustomerId} />
              : <p className="text-[12.5px] text-gray-600">Esta tienda no tiene cliente en Stripe: nunca pagó con tarjeta.</p>}
          </Seccion>
        </>
      )}

      {tab === 'dueno' && (
        <Seccion titulo="Dueño" acciones={solo(telDueno).length >= 6 ? <a href={`https://wa.me/${solo(telDueno)}`} target="_blank" rel="noopener noreferrer" className={cn(CLASE_BOTON_ENLACE, 'h-7 px-2.5 text-[12px]')}>WhatsApp ↗</a> : null}>
          {!dueno ? (
            <p className="text-[12.5px] text-gray-500">{t.ownerId ? `No se encontró el usuario ${t.ownerId}.` : 'La tienda no tiene dueño asignado.'}</p>
          ) : (
            <ListaDatos>
              <Dato etiqueta="Nombre">{nombreDueno(dueno)}</Dato>
              <Dato etiqueta="Correo">{dueno.email ? <a href={`mailto:${dueno.email}`} className="text-blue-700 hover:underline">{String(dueno.email)}</a> : null}</Dato>
              <Dato etiqueta="Teléfono">{telDueno ? <span className="tabular-nums">{telDueno}</span> : null}</Dato>
              <Dato etiqueta="Empresa">
                {typeof dueno.company === 'string'
                  ? dueno.company
                  : [obj(dueno.company).name, obj(dueno.company).taxId].filter(Boolean).join(' · ')}
              </Dato>
              <Dato etiqueta="Registrado">{dueno.createdAt ? `${fecha(dueno.createdAt)} (${relativo(dueno.createdAt)})` : null}</Dato>
              <Dato etiqueta="Cliente Stripe">
                {dueno.stripeCustomerId ? <EnlaceExterno href={`https://dashboard.stripe.com/customers/${dueno.stripeCustomerId}`}><span className="font-mono text-[12px]">{String(dueno.stripeCustomerId)}</span> ↗</EnlaceExterno> : null}
              </Dato>
              <Dato etiqueta="ID de usuario"><span className="font-mono text-[12px]">{t.ownerId}</span></Dato>
            </ListaDatos>
          )}
        </Seccion>
      )}

      {tab === 'pedidos' && <PestanaPedidos pedidos={ultimosPedidos} moneda={moneda} />}

      {tab === 'configuracion' && <PestanaConfiguracion c={c} t={t} />}

      {tab === 'notas' && <PestanaNotas storeId={storeId} autor={firebaseUser?.email || ''} />}

      {tab === 'historial' && <PestanaHistorial c={c} dueno={dueno} />}

      {tab === 'app' && (
        <Seccion titulo="App" acciones={c.appConfig ? <Link to={localePath(`/admin/apps/${storeId}`)} className="text-[12.5px] text-blue-700 hover:underline">Ver app →</Link> : null}>
          {!c.appConfig ? (
            <p className="text-[12.5px] text-gray-500">Sin app.</p>
          ) : (() => {
            const a = obj(c.appConfig)
            const b = obj(a.build)
            const bi = obj(a.buildIos)
            return (
              <ListaDatos>
                <Dato etiqueta="Estado">{ESTADO_APP[String(a.status)] || String(a.status || '')}</Dato>
                <Dato etiqueta="Nombre">{a.appName as string}</Dato>
                <Dato etiqueta="Solicitada">{a.requestedAt ? fecha(a.requestedAt) : null}</Dato>
                <Dato etiqueta="Publicada">{a.publishedAt ? fecha(a.publishedAt) : null}</Dato>
                <Dato etiqueta="Android">{a.androidUrl ? <EnlaceExterno href={String(a.androidUrl)}>Play Store ↗</EnlaceExterno> : null}{a.androidIsTesting ? <span className="text-gray-500"> (prueba cerrada)</span> : null}</Dato>
                <Dato etiqueta="iOS">{a.iosUrl ? <EnlaceExterno href={String(a.iosUrl)}>App Store ↗</EnlaceExterno> : null}</Dato>
                <Dato etiqueta="Build Android">{b.status ? <Estado valor={String(b.status)} etiqueta={`${ESTADO_BUILD[String(b.status)] || b.status}${b.versionName ? ` · v${b.versionName}` : ''}`} /> : null}</Dato>
                <Dato etiqueta="Build iOS">{bi.status ? <Estado valor={String(bi.status)} etiqueta={`${ESTADO_BUILD[String(bi.status)] || bi.status}${bi.versionName ? ` · v${bi.versionName}` : ''}`} /> : null}</Dato>
              </ListaDatos>
            )
          })()}
        </Seccion>
      )}

      {editando && (
        <CambiarPlanModal tienda={t} onClose={() => setEditando(false)} onGuardado={() => { cargarTienda() }} />
      )}
    </Pagina>
  )
}

// ─────────────────────────── Resumen ───────────────────────────

function PestanaResumen({ datos, pedidos, moneda }: { datos: DatosResumen | null; pedidos: Order[] | null; moneda: string }) {
  // Más vendidos sobre los últimos 500 pedidos no cancelados.
  const topVendidos = useMemo(() => {
    const mapa: Record<string, { producto: string; cantidad: number }> = {}
    for (const p of pedidos || []) {
      if (p.status === 'cancelled') continue
      for (const it of p.items || []) {
        const k = it.productId || it.productName
        if (!mapa[k]) mapa[k] = { producto: it.productName, cantidad: 0 }
        mapa[k].cantidad += it.quantity || 0
      }
    }
    return Object.values(mapa).sort((a, b) => b.cantidad - a.cantidad).slice(0, 5)
  }, [pedidos])

  if (!datos) return <Cargando />
  const s = datos.analytics?.summary
  const embudo = s ? [
    { nombre: 'Visitas', valor: s.pageViews },
    { nombre: 'Vistas de producto', valor: s.productViews },
    { nombre: 'Agregar al carrito', valor: s.cartAdds },
    { nombre: 'Clics a WhatsApp', valor: s.whatsappClicks },
  ] : []
  const fechaEje = (v: string) => new Date(v + 'T12:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
  const corto = (v: string) => (v.length > 16 ? v.slice(0, 16) + '…' : v)

  return (
    <>
      <Seccion titulo="Cifras">
        <Cifras>
          <Cifra etiqueta="Productos" valor={numero(datos.productos)} />
          <Cifra etiqueta="Categorías" valor={numero(datos.categorias)} />
          <Cifra etiqueta="Pedidos" valor={numero(datos.pedidos)} nota={datos.pedidosIncluyenCancelados ? 'incluye cancelados' : 'sin cancelados'} />
          <Cifra etiqueta="Ingresos" valor={datos.ingresos === null ? '—' : dinero(datos.ingresos, moneda)} nota="sin cancelados" />
        </Cifras>
        <div className="mt-4 border-t border-gray-100 pt-3">
          <p className="mb-2 text-[11.5px] text-gray-500">Últimos 30 días</p>
          {s ? (
            <Cifras>
              <Cifra etiqueta="Visitas" valor={numero(s.pageViews)} />
              <Cifra etiqueta="Vistas de producto" valor={numero(s.productViews)} />
              <Cifra etiqueta="Agregar al carrito" valor={numero(s.cartAdds)} />
              <Cifra etiqueta="Clics a WhatsApp" valor={numero(s.whatsappClicks)} />
            </Cifras>
          ) : <p className="text-[12.5px] text-gray-500">No se pudieron leer las analíticas.</p>}
        </div>
      </Seccion>

      <Seccion titulo="Tráfico diario" descripcion="Últimos 30 días">
        {datos.analytics && datos.analytics.dailyStats.some(d => d.pageViews || d.productViews) ? (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={datos.analytics.dailyStats} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="date" tickFormatter={fechaEje} tick={EJE} stroke="#e5e7eb" minTickGap={16} />
              <YAxis tick={EJE} stroke="#e5e7eb" allowDecimals={false} />
              <Tooltip labelFormatter={l => fechaEje(String(l))} contentStyle={TOOLTIP} />
              <Line type="monotone" dataKey="pageViews" name="Visitas" stroke={AZUL} strokeWidth={1.6} dot={false} />
              <Line type="monotone" dataKey="productViews" name="Vistas de producto" stroke={GRIS} strokeWidth={1.4} dot={false} />
              <Legend wrapperStyle={{ fontSize: 12 }} iconType="plainline" />
            </LineChart>
          </ResponsiveContainer>
        ) : <p className="py-6 text-center text-[12.5px] text-gray-500">Sin visitas en 30 días.</p>}
      </Seccion>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Seccion titulo="Más vistos" descripcion="Vistas de producto, últimos 30 días">
          {datos.analytics && datos.analytics.topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={datos.analytics.topProducts} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" tick={EJE} stroke="#e5e7eb" allowDecimals={false} />
                <YAxis type="category" dataKey="productName" tick={EJE} stroke="#e5e7eb" width={120} tickFormatter={corto} />
                <Tooltip contentStyle={TOOLTIP} cursor={{ fill: '#f9fafb' }} />
                <Bar dataKey="views" name="Vistas" fill={AZUL} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="py-6 text-center text-[12.5px] text-gray-500">Sin datos.</p>}
        </Seccion>

        <Seccion titulo="Más vendidos" descripcion="Unidades, sobre los últimos 500 pedidos (sin cancelados)">
          {topVendidos.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topVendidos} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" tick={EJE} stroke="#e5e7eb" allowDecimals={false} />
                <YAxis type="category" dataKey="producto" tick={EJE} stroke="#e5e7eb" width={120} tickFormatter={corto} />
                <Tooltip contentStyle={TOOLTIP} cursor={{ fill: '#f9fafb' }} />
                <Bar dataKey="cantidad" name="Unidades" fill={AZUL} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="py-6 text-center text-[12.5px] text-gray-500">Sin ventas.</p>}
        </Seccion>
      </div>

      <Seccion titulo="Embudo" descripcion="Últimos 30 días, sobre las visitas">
        {embudo.length > 0 && embudo[0].valor > 0 ? (
          <div className="space-y-2.5">
            {embudo.map(paso => (
              <div key={paso.nombre}>
                <div className="mb-1 flex items-center justify-between text-[12.5px]">
                  <span className="text-gray-600">{paso.nombre}</span>
                  <span className="tabular-nums text-gray-900">{numero(paso.valor)} <span className="text-gray-500">{porcentaje(paso.valor, embudo[0].valor)}</span></span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-100">
                  <div className="h-1.5 rounded-full bg-blue-600" style={{ width: `${Math.min(100, (paso.valor / embudo[0].valor) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : <p className="py-6 text-center text-[12.5px] text-gray-500">Sin visitas en 30 días.</p>}
      </Seccion>
    </>
  )
}

// ─────────────────────────── Pedidos ───────────────────────────

function PestanaPedidos({ pedidos, moneda }: { pedidos: Order[] | null; moneda: string }) {
  if (!pedidos) return <Cargando />
  const cliente = (p: Order) => p.customer?.name || p.customer?.phone || ''
  return (
    <Seccion titulo="Últimos 20 pedidos" sinRelleno>
      <ListaTarjetas vacio="Sin pedidos.">
        {pedidos.map(p => (
          <TarjetaDeFila
            key={p.id}
            titulo={p.orderNumber || p.id}
            subtitulo={cliente(p)}
            estado={<Estado valor={p.status} etiqueta={ESTADO_PEDIDO[p.status] || p.status} />}
            datos={[
              ['Total', <span className="tabular-nums">{dinero(p.total, moneda)}</span>],
              ['Pago', <Estado valor={p.paymentStatus || 'pending'} etiqueta={ESTADO_PAGO[p.paymentStatus || 'pending'] || p.paymentStatus} />],
              ['Fecha', fechaHora(p.createdAt)],
            ]}
          />
        ))}
      </ListaTarjetas>
      <div className="hidden sm:block">
        <Tabla>
          <thead>
            <tr>
              <Th>Número</Th>
              <Th>Cliente</Th>
              <Th alinear="der">Total</Th>
              <Th>Estado</Th>
              <Th>Pago</Th>
              <Th>Fecha</Th>
            </tr>
          </thead>
          <tbody>
            {pedidos.length === 0 && <FilaVacia colSpan={6}>Sin pedidos.</FilaVacia>}
            {pedidos.map(p => (
              <Fila key={p.id}>
                <Td className="font-medium">{p.orderNumber || p.id}</Td>
                <Td apagado={!cliente(p)} className="max-w-[16rem] truncate">{cliente(p) || '—'}</Td>
                <Td numero>{dinero(p.total, moneda)}</Td>
                <Td><Estado valor={p.status} etiqueta={ESTADO_PEDIDO[p.status] || p.status} /></Td>
                <Td><Estado valor={p.paymentStatus || 'pending'} etiqueta={ESTADO_PAGO[p.paymentStatus || 'pending'] || p.paymentStatus} /></Td>
                <Td apagado className="tabular-nums" title={fechaHora(p.createdAt)}>{fechaCorta(p.createdAt)} <span className="text-gray-400">{relativo(p.createdAt)}</span></Td>
              </Fila>
            ))}
          </tbody>
        </Tabla>
      </div>
    </Seccion>
  )
}

// ─────────────────────────── Configuración ───────────────────────────

function PestanaConfiguracion({ c, t }: { c: Crudo; t: AdminTienda }) {
  const pagos = obj(c.payments)
  const shipping = obj(c.shipping)
  const tema = obj(c.themeSettings)
  // Una pasarela cuenta como conectada si está activada y tiene su secreto
  // guardado (secretConfigured) o la credencial vieja en el documento.
  const conectadas = [
    ['MercadoPago', obj(pagos.mercadopago), 'accessToken'],
    ['Stripe', obj(pagos.stripe), 'secretKey'],
    ['PayPal', obj(pagos.paypal), 'clientSecret'],
    ['GOcuotas', obj(pagos.gocuotas), 'password'],
  ].filter(([, p, legado]) => {
    const x = p as Crudo
    return x.enabled && (x.secretConfigured || x[legado as string])
  }).map(([n]) => n as string)

  return (
    <Seccion titulo="Configuración">
      <ListaDatos>
        <Dato etiqueta="Pagos conectados">{conectadas.length ? conectadas.join(', ') : 'Ninguno'}</Dato>
        <Dato etiqueta="Pedido por WhatsApp">{siNo(obj(pagos.whatsapp).enabled !== false)}</Dato>
        <Dato etiqueta="Envío con costo">{shipping.enabled ? `Sí · ${dinero(Number(shipping.cost) || 0, t.moneda || 'USD')}` : 'No'}</Dato>
        <Dato etiqueta="Delivery">{siNo(shipping.deliveryEnabled !== false)}</Dato>
        <Dato etiqueta="Recojo en tienda">{siNo(shipping.pickupEnabled !== false)}</Dato>
        <Dato etiqueta="Dominio propio">{t.dominio || 'No'}</Dato>
        <Dato etiqueta="WhatsApp">{t.whatsapp ? <span className="tabular-nums">{t.whatsapp}</span> : null}</Dato>
        <Dato etiqueta="Instagram">{(c.instagram as string) || 'No'}</Dato>
        <Dato etiqueta="Facebook">{(c.facebook as string) || 'No'}</Dato>
        <Dato etiqueta="TikTok">{(c.tiktok as string) || 'No'}</Dato>
        <Dato etiqueta="Tema">{(c.themeId as string) || 'Predeterminado'}</Dato>
        <Dato etiqueta="Color principal">{tema.primaryColor ? <span className="font-mono text-[12px]">{String(tema.primaryColor)}</span> : 'Predeterminado'}</Dato>
        <Dato etiqueta="Idioma">{IDIOMA[String(c.language || 'es')] || String(c.language)}</Dato>
        <Dato etiqueta="Moneda">{t.moneda}</Dato>
        <Dato etiqueta="País">{nombrePais(t.pais)}</Dato>
        <Dato etiqueta="Tipo de negocio">{c.businessType ? TIPO_NEGOCIO[String(c.businessType)] || String(c.businessType) : null}</Dato>
        <Dato etiqueta="ID de tienda"><span className="font-mono text-[12px]">{t.id}</span></Dato>
      </ListaDatos>
    </Seccion>
  )
}

// ─────────────────────────── Notas ───────────────────────────

function PestanaNotas({ storeId, autor }: { storeId: string; autor: string }) {
  const { showToast } = useToast()
  const [texto, setTexto] = useState<string | null>(null)
  const [original, setOriginal] = useState('')
  const [meta, setMeta] = useState<{ cuando: Date | null; autor: string }>({ cuando: null, autor: '' })
  const [guardando, setGuardando] = useState(false)
  const [errorLectura, setErrorLectura] = useState(false)

  useEffect(() => {
    let vivo = true
    getDoc(doc(db, 'adminNotes', storeId))
      .then(s => {
        if (!vivo) return
        const d = s.exists() ? s.data() : {}
        setTexto(String(d.texto || ''))
        setOriginal(String(d.texto || ''))
        setMeta({ cuando: aFecha(d.actualizadoEn), autor: String(d.autor || '') })
      })
      // Si la lectura falla NO se muestra el editor vacío: guardar pisaría la
      // nota que ya existe con un texto en blanco.
      .catch(err => { console.error('Error al leer notas:', err); if (vivo) setErrorLectura(true) })
    return () => { vivo = false }
  }, [storeId])

  const guardar = async () => {
    if (texto === null) return
    setGuardando(true)
    try {
      await setDoc(doc(db, 'adminNotes', storeId), { texto, actualizadoEn: serverTimestamp(), autor })
      setOriginal(texto)
      setMeta({ cuando: new Date(), autor })
      showToast('Nota guardada', 'success')
    } catch (err) {
      console.error('Error al guardar la nota:', err)
      showToast('No se pudo guardar la nota', 'error')
    } finally {
      setGuardando(false)
    }
  }

  if (errorLectura) return <Aviso tipo="error">No se pudieron leer las notas. Recarga la página para intentarlo de nuevo.</Aviso>
  if (texto === null) return <Cargando />
  return (
    <Seccion titulo="Notas internas" descripcion="Solo las ve el equipo admin; el dueño de la tienda no.">
      <AreaTexto value={texto} onChange={e => setTexto(e.target.value)} rows={8} className="min-h-[160px]" placeholder="Acuerdos, contexto, pendientes con esta tienda…" />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11.5px] text-gray-500">
          {meta.cuando ? `Guardado ${relativo(meta.cuando)}${meta.autor ? ` por ${meta.autor}` : ''}` : 'Sin notas todavía.'}
        </span>
        <Boton variante="primario" onClick={guardar} cargando={guardando} disabled={texto === original}>Guardar</Boton>
      </div>
    </Seccion>
  )
}

// ─────────────────────────── Historial ───────────────────────────

/**
 * No hay un registro de eventos en el servidor: la línea de tiempo se arma
 * con las fechas que ya guardan la tienda, su suscripción, su app y el dueño.
 * Lo que cambió y no dejó fecha (p. ej. un cambio de plan manual viejo) no
 * aparece.
 */
function PestanaHistorial({ c, dueno }: { c: Crudo; dueno: Crudo | null }) {
  const sub = obj(c.subscription)
  const app = obj(c.appConfig)
  const eventos = ([
    [dueno?.createdAt, 'El dueño se registra'],
    [c.createdAt, 'Tienda creada'],
    [c.trialEndsAt, 'Fin de la prueba gratis'],
    [sub.currentPeriodStart, 'Inicio del periodo de Stripe'],
    [sub.trialEnd, 'Fin de la prueba de Stripe'],
    [sub.currentPeriodEnd, sub.cancelAtPeriodEnd ? 'Fin del periodo de Stripe (cancela)' : 'Fin del periodo de Stripe (renueva)'],
    [c.planExpiresAt, 'Fin del acceso manual'],
    [app.requestedAt, 'App solicitada'],
    [app.publishedAt, 'App publicada'],
    [obj(app.build).finishedAt, 'Último build Android'],
    [obj(app.buildIos).finishedAt, 'Último build iOS'],
    [c.updatedAt, 'Última modificación de la tienda'],
    [c.lastOnlineAt, 'Última vez en línea (dueño en el panel)'],
  ] as Array<[unknown, string]>)
    .map(([f, e]) => ({ cuando: aFecha(f), evento: e }))
    .filter((x): x is { cuando: Date; evento: string } => !!x.cuando)
    .sort((a, b) => b.cuando.getTime() - a.cuando.getTime())

  // "Ahora" fijo al abrir la pestaña (la regla de pureza de React no deja
  // llamar Date.now() en cada render).
  const [ahora] = useState(() => Date.now())
  return (
    <Seccion titulo="Historial" descripcion="Armado con las fechas guardadas; no hay registro de cada cambio.">
      {eventos.length === 0 ? <p className="text-[12.5px] text-gray-500">Sin fechas.</p> : (
        <ol className="border-l border-gray-200 ml-1">
          {eventos.map((x, i) => {
            const futuro = x.cuando.getTime() > ahora
            return (
              <li key={i} className="relative pl-4 pb-3 last:pb-0">
                <span className={cn('absolute -left-[3.5px] top-1.5 h-1.5 w-1.5 rounded-full', futuro ? 'bg-white border border-gray-400' : 'bg-gray-400')} />
                <p className={cn('text-[12.5px]', futuro ? 'text-gray-500' : 'text-gray-900')}>{x.evento}{futuro && ' (próximo)'}</p>
                <p className="text-[11.5px] text-gray-500 tabular-nums">{fechaHora(x.cuando)} · {relativo(x.cuando)}</p>
              </li>
            )
          })}
        </ol>
      )}
    </Seccion>
  )
}
