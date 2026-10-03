/**
 * Cobros: suscripciones de Stripe, pagos cobrados y tiendas por vencer.
 *
 * Reemplaza a las viejas "Pagadas" (PaidStores) y "Planes" (Plans). Cambios de
 * fondo respecto de ellas:
 * - Las tiendas salen de cargarTiendas() (caché por sesión), no de un
 *   getDocs(stores) propio en cada pantalla.
 * - Las fechas pasan por aFecha(): "Próximo cobro" de Planes salía
 *   "Invalid Date" por hacer new Date() sobre un Timestamp de Firestore.
 * - El dinero va siempre con la moneda de cada factura; antes todo se
 *   etiquetaba "USD" aunque Stripe cobrara en otra moneda.
 * - El total histórico (payments-total recorre TODAS las facturas de Stripe)
 *   ya no se pide al abrir la pestaña: solo con el botón.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { auth } from '../../lib/firebase'
import { apiUrl } from '../../utils/apiBase'
import { syncStoreSubscription } from '../../lib/stripe'
import { useLanguage } from '../../hooks/useLanguage'
import { cargarTiendas, invalidarTiendas, mapaDuenos, type AdminTienda, type AdminUsuario } from '../../lib/admin/datos'
import { aFecha, dinero, fecha, fechaHora, numero, relativo } from '../../lib/admin/formato'
import { ETIQUETA_ESTADO, ETIQUETA_PLAN, ETIQUETA_STRIPE, TONO_ESTADO, type EstadoComercial } from '../../lib/admin/modelo'
import {
  Aviso, Boton, BotonDeFila, Buscador, CajaMenu, Cargando, Estado, Fila, FilaVacia, FiltroSelect, Filtros,
  ItemMenu, ListaTarjetas, Pagina, Pestanas, Seccion, SeparadorMenu, Tabla, TarjetaDeFila, Td, Th,
  siguienteOrden, useMenuDeFila, type Orden,
} from '../../components/admin/ui'

type Vista = 'suscripciones' | 'pagos' | 'por-vencer'
const VISTAS: Vista[] = ['suscripciones', 'pagos', 'por-vencer']

type Duenos = Map<string, AdminUsuario>

// ───────────────────────── utilidades ─────────────────────────

const DIA = 86400000

// Fuera de los componentes a propósito: Date.now() dentro del render lo marca
// la regla de pureza de React.
const ahoraMs = () => Date.now()
const yaPaso = (d: Date) => d.getTime() < ahoraMs()

// Algunas tiendas viejas no tienen ownerId: su id de documento es el uid del
// dueño (así lo asume también api/sync-subscription en "cancel").
function duenoDe(t: AdminTienda, duenos: Duenos): AdminUsuario | undefined {
  return (t.ownerId && duenos.get(t.ownerId)) || duenos.get(t.id)
}

/** El WhatsApp de la tienda primero (es el que el dueño atiende); si no, el teléfono de su cuenta. */
function telefonoDe(t: AdminTienda, duenos: Duenos): string | undefined {
  return t.whatsapp || duenoDe(t, duenos)?.telefono || undefined
}

function enlaceWhatsapp(telefono: string, texto: string): string {
  const digitos = telefono.replace(/\D/g, '').replace(/^00/, '')
  return `https://wa.me/${digitos}?text=${encodeURIComponent(texto)}`
}

function fechaLarga(d: Date | null): string {
  return d ? d.toLocaleDateString('es', { day: 'numeric', month: 'long' }) : ''
}

// Mensaje armado según el estado: no es lo mismo avisar el fin de una prueba
// que un cobro fallido o una renovación.
function mensajeWhatsapp(t: AdminTienda, duenos: Duenos): string {
  const nombre = (duenoDe(t, duenos)?.nombre || '').split(' ')[0] || t.nombre
  const plan = ETIQUETA_PLAN[t.plan]
  const cuando = fechaLarga(t.vence)
  switch (t.estado) {
    case 'prueba':
      return `Hola ${nombre}, tu prueba de Shopifree ${plan} termina el ${cuando}. Si quieres seguir con todas las funciones en ${t.nombre}, puedes activar tu plan desde tu panel. ¿Te ayudo con algo?`
    case 'prueba_vencida':
      return `Hola ${nombre}, tu prueba de Shopifree ${plan} terminó el ${cuando}. Si quieres recuperar todas las funciones en ${t.nombre}, puedes activar tu plan desde tu panel. ¿Te ayudo con algo?`
    case 'pago_pendiente':
      return `Hola ${nombre}, te escribo de Shopifree: no pudimos cobrar tu plan ${plan} de ${t.nombre}. Puedes actualizar tu tarjeta desde tu panel, en Plan. ¿Te ayudo con algo?`
    case 'cortesia':
      return `Hola ${nombre}, te escribo de Shopifree: tu acceso al plan ${plan} en ${t.nombre} termina el ${cuando}. ¿Quieres que te ayude a activar tu plan para seguir sin cortes?`
    case 'cortesia_vencida':
      return `Hola ${nombre}, te escribo de Shopifree: tu acceso al plan ${plan} en ${t.nombre} terminó el ${cuando}. ¿Quieres que te ayude a activar tu plan?`
    case 'pagando':
      return t.cancelaAlVencer
        ? `Hola ${nombre}, te escribo de Shopifree: vimos que tu plan ${plan} de ${t.nombre} termina el ${cuando} y no se renovará. ¿Hay algo que podamos mejorar?`
        : `Hola ${nombre}, te escribo de Shopifree: tu plan ${plan} de ${t.nombre} se renueva el ${cuando}. ¿Todo bien con tu tienda?`
    default:
      return `Hola ${nombre}, te escribo de Shopifree sobre tu tienda ${t.nombre}.`
  }
}

/** Fecha + relativo en gris; en rojo si `rojo`. */
function FechaRel({ d, prefijo, rojo = false }: { d: Date | null; prefijo?: string; rojo?: boolean }) {
  if (!d) return <span className="text-gray-400">—</span>
  return (
    <span className="tabular-nums">
      <span className={rojo ? 'text-red-600' : undefined}>{prefijo ? `${prefijo} ${fecha(d)}` : fecha(d)}</span>
      <span className="text-gray-500"> · {relativo(d)}</span>
    </span>
  )
}

function EnlaceTienda({ t }: { t: AdminTienda }) {
  const { localePath } = useLanguage()
  return (
    <Link to={localePath(`/admin/tiendas/${t.id}`)} className="text-gray-900 hover:text-blue-700 hover:underline" onClick={e => e.stopPropagation()}>
      {t.nombre}
    </Link>
  )
}

function Externo({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline" onClick={e => e.stopPropagation()}>
      {children}
    </a>
  )
}

const stripeSub = (id: string) => `https://dashboard.stripe.com/subscriptions/${id}`
const stripeCliente = (id: string) => `https://dashboard.stripe.com/customers/${id}`

/** Ordena con los vacíos siempre al final, sin importar la dirección. */
function comparar(a: number | string | null, b: number | string | null, dir: 'asc' | 'desc'): number {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  const c = typeof a === 'string' ? a.localeCompare(String(b), 'es') : a - (b as number)
  return dir === 'asc' ? c : -c
}

// Llamada autenticada a api/sync-subscription (list-payments / payments-total).
// Misma forma que la vieja página de Pagadas, pero el error se propaga para
// mostrarlo en pantalla en vez de quedar en la consola.
async function llamarCobros<T>(body: Record<string, unknown>): Promise<T> {
  const user = auth.currentUser
  if (!user) throw new Error('No hay sesión iniciada')
  const token = await user.getIdToken()
  const res = await fetch(apiUrl('/api/sync-subscription'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({}))) as T & { error?: string; details?: string }
  if (!res.ok || data?.error) throw new Error(data?.details || data?.error || `Error ${res.status}`)
  return data
}

// ───────────────────────── suscripciones ─────────────────────────

type CategoriaSub = 'pagando' | 'pendiente' | 'cancelada' | 'cancela' | 'otra'

// "Cancelan al vencer" es un subconjunto de "pagando": siguen pagando hasta el
// fin del periodo. Así "pagando" cuadra con la cifra del Resumen.
function categoriaSub(t: AdminTienda): CategoriaSub {
  if (t.estado === 'pagando') return 'pagando'
  if (t.estado === 'pago_pendiente') return 'pendiente'
  if (t.estado === 'cancelada') return 'cancelada'
  return 'otra'
}

const STRIPE_ROJO = new Set(['past_due', 'unpaid', 'incomplete'])
const STRIPE_TENUE = new Set(['canceled', 'incomplete_expired', 'paused'])

function EstadoStripe({ t }: { t: AdminTienda }) {
  const s = t.stripeStatus || ''
  return (
    <Estado
      valor={s}
      etiqueta={ETIQUETA_STRIPE[s] || s || '—'}
      tono={STRIPE_ROJO.has(s) ? 'rojo' : STRIPE_TENUE.has(s) ? 'tenue' : 'normal'}
    />
  )
}

const finPeriodo = (t: AdminTienda) => aFecha((t.crudo.subscription as Record<string, unknown> | undefined)?.currentPeriodEnd)
const inicioPeriodo = (t: AdminTienda) => aFecha((t.crudo.subscription as Record<string, unknown> | undefined)?.currentPeriodStart) || t.creada

/** "Próximo cobro" solo tiene sentido si Stripe va a cobrar; si no, es hasta cuándo tiene acceso. */
function ProximoCobro({ t }: { t: AdminTienda }) {
  const fin = finPeriodo(t)
  if (!fin) return <span className="text-gray-400">—</span>
  const pasado = yaPaso(fin)
  if (t.estado === 'cancelada') return <FechaRel d={fin} prefijo={pasado ? 'Terminó el' : 'Acceso hasta'} />
  if (t.cancelaAlVencer) return <FechaRel d={fin} prefijo="Termina el" />
  return <FechaRel d={fin} rojo={t.estado === 'pago_pendiente' && pasado} />
}

function VistaSuscripciones({ tiendas, duenos, onRecargar }: { tiendas: AdminTienda[]; duenos: Duenos; onRecargar: () => Promise<void> }) {
  const navigate = useNavigate()
  const { localePath } = useLanguage()
  const menu = useMenuDeFila()
  const [filtro, setFiltro] = useState<'pagando' | 'pendiente' | 'cancelada' | 'cancela' | 'todas'>('pagando')
  const [plan, setPlan] = useState('all')
  const [busqueda, setBusqueda] = useState('')
  const [orden, setOrden] = useState<Orden>({ campo: 'proximo', direccion: 'asc' })
  const [aviso, setAviso] = useState<{ tipo: 'info' | 'error'; texto: string } | null>(null)
  const [sincronizando, setSincronizando] = useState<string | null>(null)

  const conStripe = useMemo(() => tiendas.filter(t => t.stripeSubscriptionId), [tiendas])

  const cuentas = useMemo(() => {
    const c = { pagando: 0, pendiente: 0, cancelada: 0, cancela: 0 }
    for (const t of conStripe) {
      const cat = categoriaSub(t)
      if (cat === 'pagando') { c.pagando++; if (t.cancelaAlVencer) c.cancela++ }
      else if (cat === 'pendiente') c.pendiente++
      else if (cat === 'cancelada') c.cancelada++
    }
    return c
  }, [conStripe])

  const filas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    const lista = conStripe.filter(t => {
      const cat = categoriaSub(t)
      if (filtro === 'cancela' ? !(cat === 'pagando' && t.cancelaAlVencer) : filtro !== 'todas' && cat !== filtro) return false
      if (plan !== 'all' && t.plan !== plan) return false
      if (!q) return true
      const d = duenoDe(t, duenos)
      return [t.nombre, t.subdominio, d?.email, d?.nombre, t.stripeCustomerId, t.stripeSubscriptionId]
        .some(v => v && v.toLowerCase().includes(q))
    })
    const valor = (t: AdminTienda): number | string | null => {
      switch (orden.campo) {
        case 'tienda': return t.nombre.toLowerCase()
        case 'plan': return t.plan
        case 'desde': return inicioPeriodo(t)?.getTime() ?? null
        default: return finPeriodo(t)?.getTime() ?? null
      }
    }
    return lista.sort((a, b) => comparar(valor(a), valor(b), orden.direccion))
  }, [conStripe, filtro, plan, busqueda, orden, duenos])

  const ordenar = (campo: string) => setOrden(o => siguienteOrden(o, campo, campo === 'proximo' || campo === 'tienda' ? 'asc' : 'desc'))

  const sincronizar = async (t: AdminTienda) => {
    menu.cerrar()
    setSincronizando(t.id)
    setAviso(null)
    try {
      const r = await syncStoreSubscription(t.id)
      // La tienda cambió en Firestore: la caché de sesión ya no sirve.
      invalidarTiendas()
      await onRecargar()
      setAviso({ tipo: 'info', texto: `${t.nombre}: sincronizada con Stripe (${ETIQUETA_STRIPE[r.status || ''] || r.status || 'sin estado'}, plan ${r.plan || '—'}).` })
    } catch (e) {
      setAviso({ tipo: 'error', texto: `No se pudo sincronizar ${t.nombre}: ${(e as Error).message}` })
    } finally {
      setSincronizando(null)
    }
  }

  const abierta = filas.find(t => t.id === menu.abiertoEn)
  const telAbierta = abierta ? telefonoDe(abierta, duenos) : undefined

  const parte = (n: number, texto: string, f: typeof filtro, rojo = false) => (
    <button type="button" onClick={() => setFiltro(f)} className={`hover:text-gray-900 hover:underline ${rojo && n > 0 ? 'text-red-600' : ''}`}>
      {numero(n)} {texto}
    </button>
  )

  return (
    <>
      <div className="text-[12.5px] text-gray-500 tabular-nums">
        {parte(cuentas.pagando, 'pagando', 'pagando')} · {parte(cuentas.pendiente, 'pago pendiente', 'pendiente', true)} · {parte(cuentas.cancelada, 'canceladas', 'cancelada')} · {parte(cuentas.cancela, 'cancelan al vencer', 'cancela')}
      </div>

      <Filtros>
        <FiltroSelect value={filtro} valorTodos="todas" onChange={e => setFiltro(e.target.value as typeof filtro)}>
          <option value="pagando">Pagando</option>
          <option value="pendiente">Pago pendiente</option>
          <option value="cancelada">Canceladas</option>
          <option value="cancela">Cancelan al vencer</option>
          <option value="todas">Todas</option>
        </FiltroSelect>
        <FiltroSelect value={plan} onChange={e => setPlan(e.target.value)}>
          <option value="all">Todos los planes</option>
          <option value="pro">Pro</option>
          <option value="business">Business</option>
          <option value="free">Free</option>
        </FiltroSelect>
        <Buscador value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar tienda, dueño o ID de Stripe" />
      </Filtros>

      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}

      <Seccion sinRelleno>
        <ListaTarjetas vacio="No hay suscripciones con estos filtros.">
          {filas.map(t => (
            <TarjetaDeFila
              key={t.id}
              titulo={<EnlaceTienda t={t} />}
              subtitulo={t.subdominio}
              estado={<EstadoStripe t={t} />}
              acciones={<BotonDeFila onClick={el => menu.alternar(t.id, el)} />}
              datos={[
                ['Dueño', duenoDe(t, duenos)?.email],
                ['Plan', ETIQUETA_PLAN[t.plan]],
                ['Próximo cobro', <ProximoCobro t={t} />],
                ['Desde', fecha(inicioPeriodo(t))],
                ['Stripe', <Externo href={stripeSub(t.stripeSubscriptionId!)}>Ver en Stripe</Externo>],
              ]}
            />
          ))}
        </ListaTarjetas>
        <div className="hidden sm:block">
          <Tabla>
            <thead>
              <tr>
                <Th campo="tienda" orden={orden} onOrdenar={ordenar}>Tienda</Th>
                <Th>Dueño</Th>
                <Th campo="plan" orden={orden} onOrdenar={ordenar}>Plan</Th>
                <Th>Estado Stripe</Th>
                <Th campo="proximo" orden={orden} onOrdenar={ordenar}>Próximo cobro</Th>
                <Th campo="desde" orden={orden} onOrdenar={ordenar}>Desde</Th>
                <Th ancho={40} />
              </tr>
            </thead>
            <tbody>
              {filas.length === 0 && <FilaVacia colSpan={7}>No hay suscripciones con estos filtros.</FilaVacia>}
              {filas.map(t => (
                <Fila key={t.id} onClick={() => navigate(localePath(`/admin/tiendas/${t.id}`))}>
                  <Td>
                    <EnlaceTienda t={t} />
                    <span className="ml-1.5 text-gray-500">{t.subdominio}</span>
                  </Td>
                  <Td apagado>{duenoDe(t, duenos)?.email || '—'}</Td>
                  <Td>{ETIQUETA_PLAN[t.plan]}</Td>
                  <Td><EstadoStripe t={t} /></Td>
                  <Td><ProximoCobro t={t} /></Td>
                  <Td apagado className="tabular-nums">{fecha(inicioPeriodo(t))}</Td>
                  <Td alinear="der" onClick={e => e.stopPropagation()}>
                    {sincronizando === t.id
                      ? <span className="text-[11.5px] text-gray-500">Sincronizando…</span>
                      : <BotonDeFila onClick={el => menu.alternar(t.id, el)} />}
                  </Td>
                </Fila>
              ))}
            </tbody>
          </Tabla>
        </div>
      </Seccion>

      {abierta && (
        <CajaMenu posicion={menu.posicion} refMenu={menu.refMenu}>
          <ItemMenu onClick={() => { menu.cerrar(); navigate(localePath(`/admin/tiendas/${abierta.id}`)) }}>Abrir ficha</ItemMenu>
          <ItemMenu onClick={() => { menu.cerrar(); window.open(stripeSub(abierta.stripeSubscriptionId!), '_blank', 'noopener') }}>Ver suscripción en Stripe</ItemMenu>
          {abierta.stripeCustomerId && (
            <ItemMenu onClick={() => { menu.cerrar(); window.open(stripeCliente(abierta.stripeCustomerId!), '_blank', 'noopener') }}>Ver cliente en Stripe</ItemMenu>
          )}
          {telAbierta && (
            <ItemMenu onClick={() => { menu.cerrar(); window.open(enlaceWhatsapp(telAbierta, mensajeWhatsapp(abierta, duenos)), '_blank', 'noopener') }}>WhatsApp al dueño</ItemMenu>
          )}
          <SeparadorMenu />
          <ItemMenu onClick={() => sincronizar(abierta)}>Sincronizar con Stripe</ItemMenu>
        </CajaMenu>
      )}
    </>
  )
}

// ───────────────────────── pagos ─────────────────────────

/** Una factura pagada, como la devuelve list-payments (api/sync-subscription.ts). */
interface Pago {
  id: string
  amount: number
  currency: string
  status: string
  created: number
  customerEmail: string | null
  customerId: string
  storeName: string | null
  storeSubdomain: string | null
  storePlan: string | null
  storeId: string | null
  invoiceUrl: string | null
  invoicePdf: string | null
  description: string | null
}

interface RespuestaPagos { payments: Pago[]; hasMore: boolean; lastId: string | null }

// payments-total devuelve el desglose por moneda (porMoneda). totalAmount
// suma todas las monedas juntas y solo queda como respaldo.
interface RespuestaTotal { totalAmount?: number; totalCount?: number; porMoneda?: Record<string, number>; currency?: string }

function sumarPorMoneda(pagos: Pago[]): Array<[string, number]> {
  const m = new Map<string, number>()
  for (const p of pagos) {
    const k = (p.currency || '').toLowerCase()
    m.set(k, (m.get(k) || 0) + (p.amount || 0))
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}

function listaMonedas(pares: Array<[string, number]>): string {
  return pares.length ? pares.map(([mon, n]) => (mon ? dinero(n, mon) : numero(n))).join(' · ') : '—'
}

// El estado de Pagos vive en la página (no en la pestaña) para no volver a
// pedir a Stripe cada vez que se cambia de pestaña.
function usePagos() {
  const [pagos, setPagos] = useState<Pago[]>([])
  const [cargado, setCargado] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [hayMas, setHayMas] = useState(false)
  const [ultimo, setUltimo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState<RespuestaTotal | null>(null)
  const [calculando, setCalculando] = useState(false)
  const [errorTotal, setErrorTotal] = useState<string | null>(null)

  const cargar = useCallback(async (despuesDe?: string) => {
    const mas = !!despuesDe
    if (mas) setCargandoMas(true)
    else setCargando(true)
    setError(null)
    try {
      const data = await llamarCobros<RespuestaPagos>({ action: 'list-payments', limit: 30, ...(despuesDe && { starting_after: despuesDe }) })
      setPagos(prev => (mas ? [...prev, ...data.payments] : data.payments))
      setHayMas(!!data.hasMore)
      setUltimo(data.lastId)
      setCargado(true)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setCargando(false)
      setCargandoMas(false)
    }
  }, [])

  const calcularTotal = useCallback(async () => {
    setCalculando(true)
    setErrorTotal(null)
    try {
      setTotal(await llamarCobros<RespuestaTotal>({ action: 'payments-total' }))
    } catch (e) {
      setErrorTotal((e as Error).message)
    } finally {
      setCalculando(false)
    }
  }, [])

  return { pagos, cargado, cargando, cargandoMas, hayMas, ultimo, error, total, calculando, errorTotal, cargar, calcularTotal }
}

function VistaPagos({ estado, tiendas }: { estado: ReturnType<typeof usePagos>; tiendas: AdminTienda[] }) {
  const { pagos, cargado, cargando, cargandoMas, hayMas, ultimo, error, total, calculando, errorTotal, cargar, calcularTotal } = estado

  // Se pide la primera página al abrir la pestaña por primera vez.
  useEffect(() => {
    if (!cargado && !cargando && !error) cargar()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // La tienda se busca primero por cliente de Stripe en la caché de tiendas
  // (trae el nombre actual); si no, por el storeId que mandó el servidor.
  const porCliente = useMemo(() => new Map(tiendas.filter(t => t.stripeCustomerId).map(t => [t.stripeCustomerId!, t])), [tiendas])
  const porId = useMemo(() => new Map(tiendas.map(t => [t.id, t])), [tiendas])
  const tiendaDe = (p: Pago) => porCliente.get(p.customerId) || (p.storeId ? porId.get(p.storeId) : undefined)

  const totalesLista = useMemo(() => sumarPorMoneda(pagos), [pagos])

  const quien = (p: Pago) => {
    const t = tiendaDe(p)
    if (t) return <EnlaceTienda t={t} />
    return <span className="text-gray-700">{p.storeName || p.customerEmail || 'Cliente desconocido'}</span>
  }

  const enlaces = (p: Pago) => (
    <span className="inline-flex gap-3">
      {p.invoiceUrl ? <Externo href={p.invoiceUrl}>Factura</Externo> : null}
      {p.invoicePdf ? <Externo href={p.invoicePdf}>PDF</Externo> : null}
      {!p.invoiceUrl && !p.invoicePdf && <span className="text-gray-400">—</span>}
    </span>
  )

  const textoTotal = () => {
    if (!total) return null
    const n = total.totalCount !== undefined ? ` en ${numero(total.totalCount)} pagos` : ''
    if (total.porMoneda && Object.keys(total.porMoneda).length) {
      return `Total histórico: ${listaMonedas(Object.entries(total.porMoneda).sort((a, b) => b[1] - a[1]))}${n}.`
    }
    if (total.currency) return `Total histórico: ${dinero(total.totalAmount, total.currency)}${n}.`
    // El servidor suma los montos de todas las monedas sin separarlas: se
    // muestra el número tal cual, sin inventarle una moneda.
    return `Total histórico: ${numero(total.totalAmount)}${n}. Stripe lo devuelve sumando todas las monedas juntas, sin separar.`
  }

  if (cargando && !cargado) return <Seccion sinRelleno><Cargando texto="Cargando pagos de Stripe…" /></Seccion>

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12.5px] text-gray-500 tabular-nums">
          {numero(pagos.length)} pagos cargados · total cargado en esta lista: <span className="text-gray-900">{listaMonedas(totalesLista)}</span>
        </p>
        <Boton tamano="sm" onClick={calcularTotal} cargando={calculando}>Calcular total histórico</Boton>
      </div>

      {calculando && <Aviso>Recorriendo todas las facturas pagadas en Stripe; puede tardar.</Aviso>}
      {total && !calculando && <Aviso>{textoTotal()}</Aviso>}
      {errorTotal && <Aviso tipo="error">No se pudo calcular el total histórico: {errorTotal}</Aviso>}
      {error && (
        <Aviso tipo="error">
          No se pudieron cargar los pagos: {error}{' '}
          <button type="button" className="underline" onClick={() => cargar(cargado && ultimo ? ultimo : undefined)}>Reintentar</button>
        </Aviso>
      )}

      <Seccion sinRelleno>
        <ListaTarjetas vacio={cargado ? 'No hay pagos registrados en Stripe.' : '—'}>
          {pagos.map(p => (
            <TarjetaDeFila
              key={p.id}
              titulo={quien(p)}
              subtitulo={fechaHora(aFecha(p.created))}
              estado={<span className="tabular-nums text-gray-900">{dinero(p.amount, p.currency)}</span>}
              datos={[
                ['Descripción', p.description],
                ['Factura', enlaces(p)],
              ]}
            />
          ))}
        </ListaTarjetas>
        <div className="hidden sm:block">
          <Tabla>
            <thead>
              <tr>
                <Th>Fecha</Th>
                <Th>Tienda</Th>
                <Th alinear="der">Monto</Th>
                <Th>Descripción</Th>
                <Th>Factura</Th>
              </tr>
            </thead>
            <tbody>
              {pagos.length === 0 && <FilaVacia colSpan={5}>{cargado ? 'No hay pagos registrados en Stripe.' : '—'}</FilaVacia>}
              {pagos.map(p => (
                <Fila key={p.id}>
                  <Td apagado className="tabular-nums">{fechaHora(aFecha(p.created))}</Td>
                  <Td>{quien(p)}</Td>
                  <Td numero>{dinero(p.amount, p.currency)}</Td>
                  <Td apagado className="max-w-[22rem] truncate" title={p.description || undefined}>{p.description || '—'}</Td>
                  <Td>{enlaces(p)}</Td>
                </Fila>
              ))}
            </tbody>
          </Tabla>
        </div>
        {hayMas && (
          <div className="flex justify-center border-t border-gray-200 px-3 py-3">
            <Boton tamano="sm" cargando={cargandoMas} onClick={() => ultimo && cargar(ultimo)}>Cargar más</Boton>
          </div>
        )}
      </Seccion>
    </>
  )
}

// ───────────────────────── por vencer ─────────────────────────

const VIGENTES = new Set<EstadoComercial>(['pagando', 'pago_pendiente', 'cortesia', 'prueba'])
const RECIEN_VENCIDAS = new Set<EstadoComercial>(['prueba_vencida', 'cortesia_vencida'])

function TablaVencimientos({ filas, duenos, vacio, menu }: {
  filas: AdminTienda[]
  duenos: Duenos
  vacio: string
  menu: ReturnType<typeof useMenuDeFila>
}) {
  const navigate = useNavigate()
  const { localePath } = useLanguage()
  const estado = (t: AdminTienda) => <Estado valor={t.estado} etiqueta={ETIQUETA_ESTADO[t.estado]} tono={TONO_ESTADO[t.estado]} />
  const vence = (t: AdminTienda) => <FechaRel d={t.vence} rojo={!!t.vence && yaPaso(t.vence)} />
  return (
    <>
      <ListaTarjetas vacio={vacio}>
        {filas.map(t => (
          <TarjetaDeFila
            key={t.id}
            titulo={<EnlaceTienda t={t} />}
            subtitulo={t.subdominio}
            estado={estado(t)}
            acciones={<BotonDeFila onClick={el => menu.alternar(t.id, el)} />}
            datos={[
              ['Dueño', duenoDe(t, duenos)?.email],
              ['Vence', vence(t)],
              ['Plan', ETIQUETA_PLAN[t.plan]],
            ]}
          />
        ))}
      </ListaTarjetas>
      <div className="hidden sm:block">
        <Tabla>
          <thead>
            <tr>
              <Th>Tienda</Th>
              <Th>Dueño</Th>
              <Th>Estado</Th>
              <Th>Vence</Th>
              <Th>Plan</Th>
              <Th ancho={40} />
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 && <FilaVacia colSpan={6}>{vacio}</FilaVacia>}
            {filas.map(t => (
              <Fila key={t.id} onClick={() => navigate(localePath(`/admin/tiendas/${t.id}`))}>
                <Td>
                  <EnlaceTienda t={t} />
                  <span className="ml-1.5 text-gray-500">{t.subdominio}</span>
                </Td>
                <Td apagado>{duenoDe(t, duenos)?.email || '—'}</Td>
                <Td>{estado(t)}</Td>
                <Td>{vence(t)}</Td>
                <Td>{ETIQUETA_PLAN[t.plan]}</Td>
                <Td alinear="der" onClick={e => e.stopPropagation()}>
                  <BotonDeFila onClick={el => menu.alternar(t.id, el)} />
                </Td>
              </Fila>
            ))}
          </tbody>
        </Tabla>
      </div>
    </>
  )
}

function VistaPorVencer({ tiendas, duenos }: { tiendas: AdminTienda[]; duenos: Duenos }) {
  const navigate = useNavigate()
  const { localePath } = useLanguage()
  const menu = useMenuDeFila()
  const [dias, setDias] = useState('7')
  const [copiado, setCopiado] = useState<string | null>(null)

  const { proximas, vencidas } = useMemo(() => {
    const ahora = ahoraMs()
    const limite = ahora + Number(dias) * DIA
    const proximas = tiendas
      .filter(t => VIGENTES.has(t.estado) && t.vence && t.vence.getTime() >= ahora && t.vence.getTime() <= limite)
      .sort((a, b) => a.vence!.getTime() - b.vence!.getTime())
    // Las que vencieron en la última semana: todavía vale la pena escribirles.
    const vencidas = tiendas
      .filter(t => RECIEN_VENCIDAS.has(t.estado) && t.vence && t.vence.getTime() < ahora && t.vence.getTime() >= ahora - 7 * DIA)
      .sort((a, b) => b.vence!.getTime() - a.vence!.getTime())
    return { proximas, vencidas }
  }, [tiendas, dias])

  const abierta = [...proximas, ...vencidas].find(t => t.id === menu.abiertoEn)
  const tel = abierta ? telefonoDe(abierta, duenos) : undefined

  const copiar = async (telefono: string) => {
    menu.cerrar()
    try {
      await navigator.clipboard.writeText(telefono)
      setCopiado(`Teléfono copiado: ${telefono}`)
    } catch {
      setCopiado(`No se pudo copiar. Teléfono: ${telefono}`)
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12.5px] text-gray-500 tabular-nums">
          {numero(proximas.length)} vencen en {dias} días · {numero(vencidas.length)} vencieron en los últimos 7 días
        </p>
        <Filtros>
          <FiltroSelect value={dias} valorTodos="7" onChange={e => setDias(e.target.value)}>
            <option value="7">Próximos 7 días</option>
            <option value="14">Próximos 14 días</option>
            <option value="30">Próximos 30 días</option>
          </FiltroSelect>
        </Filtros>
      </div>

      {copiado && <Aviso>{copiado}</Aviso>}

      <Seccion titulo="Vencen pronto" descripcion="Pagando, pago pendiente, cortesía o prueba, por fecha de vencimiento." sinRelleno>
        <TablaVencimientos filas={proximas} duenos={duenos} menu={menu} vacio={`Nada vence en los próximos ${dias} días.`} />
      </Seccion>

      <Seccion titulo="Vencieron hace poco" descripcion="Pruebas y cortesías que terminaron en los últimos 7 días." sinRelleno>
        <TablaVencimientos filas={vencidas} duenos={duenos} menu={menu} vacio="Nada venció en los últimos 7 días." />
      </Seccion>

      {abierta && (
        <CajaMenu posicion={menu.posicion} refMenu={menu.refMenu}>
          <ItemMenu onClick={() => { menu.cerrar(); navigate(localePath(`/admin/tiendas/${abierta.id}`)) }}>Abrir ficha</ItemMenu>
          {tel ? (
            <>
              <ItemMenu onClick={() => { menu.cerrar(); window.open(enlaceWhatsapp(tel, mensajeWhatsapp(abierta, duenos)), '_blank', 'noopener') }}>WhatsApp al dueño</ItemMenu>
              <ItemMenu onClick={() => copiar(tel)}>Copiar teléfono</ItemMenu>
            </>
          ) : (
            <p className="px-3 py-1.5 text-[12px] text-gray-400">Sin teléfono registrado</p>
          )}
        </CajaMenu>
      )}
    </>
  )
}

// ───────────────────────── página ─────────────────────────

export default function AdminCobros() {
  const [params, setParams] = useSearchParams()
  const vista: Vista = VISTAS.includes(params.get('vista') as Vista) ? (params.get('vista') as Vista) : 'suscripciones'
  const [tiendas, setTiendas] = useState<AdminTienda[] | null>(null)
  const [duenos, setDuenos] = useState<Duenos>(new Map())
  const [error, setError] = useState<string | null>(null)
  const [actualizando, setActualizando] = useState(false)
  const pagos = usePagos()

  // Sin setState antes del primer await: se llama desde un efecto.
  const cargar = useCallback(async (forzar = false) => {
    try {
      const [t, d] = await Promise.all([cargarTiendas(forzar), mapaDuenos(forzar)])
      setTiendas(t)
      setDuenos(d)
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  useEffect(() => {
    // Primera carga (usa la caché de sesión si ya existe).
    Promise.all([cargarTiendas(), mapaDuenos()])
      .then(([t, d]) => { setTiendas(t); setDuenos(d) })
      .catch(e => setError((e as Error).message))
  }, [])

  const actualizar = async () => {
    setActualizando(true)
    await cargar(true)
    setActualizando(false)
  }

  const pendientes = useMemo(() => (tiendas || []).filter(t => t.stripeSubscriptionId && t.estado === 'pago_pendiente').length, [tiendas])

  const cambiarVista = (v: string) => {
    const p = new URLSearchParams(params)
    if (v === 'suscripciones') p.delete('vista')
    else p.set('vista', v)
    setParams(p, { replace: true })
  }

  return (
    <Pagina acciones={<Boton tamano="sm" onClick={actualizar} cargando={actualizando}>Actualizar</Boton>}>
      <Pestanas
        valor={vista}
        onCambiar={cambiarVista}
        opciones={[
          { id: 'suscripciones', etiqueta: 'Suscripciones', aviso: pendientes },
          { id: 'pagos', etiqueta: 'Pagos' },
          { id: 'por-vencer', etiqueta: 'Por vencer' },
        ]}
      />

      {error && <Aviso tipo="error">No se pudieron cargar las tiendas: {error}</Aviso>}

      {/* Pagos no depende de las tiendas para mostrarse (solo para el nombre). */}
      {vista === 'pagos' ? (
        <VistaPagos estado={pagos} tiendas={tiendas || []} />
      ) : !tiendas ? (
        !error && <Seccion sinRelleno><Cargando /></Seccion>
      ) : vista === 'suscripciones' ? (
        <VistaSuscripciones tiendas={tiendas} duenos={duenos} onRecargar={() => cargar()} />
      ) : (
        <VistaPorVencer tiendas={tiendas} duenos={duenos} />
      )}
    </Pagina>
  )
}
