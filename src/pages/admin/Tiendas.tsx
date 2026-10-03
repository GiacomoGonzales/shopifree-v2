import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Pagina, Seccion, Tabla, Th, Td, Fila, FilaVacia, siguienteOrden, type Orden,
  Filtros, FiltroSelect, Buscador, Estado, Boton, Aviso, Pestanas,
  TarjetaDeFila, ListaTarjetas, useMenuDeFila, BotonDeFila, CajaMenu, ItemMenu, SeparadorMenu,
  Paginacion, Cargando,
} from '../../components/admin/ui'
import CambiarPlanModal from '../../components/admin/tienda/CambiarPlanModal'
import { useToast } from '../../components/ui/Toast'
import { useLanguage } from '../../hooks/useLanguage'
import { syncStoreSubscription } from '../../lib/stripe'
import { cargarTiendas, cargarUsuarios, invalidarTiendas, mapaDuenos, type AdminTienda, type AdminUsuario } from '../../lib/admin/datos'
import { diasHasta, fechaCorta, fechaHora, nombrePais, numero, relativo } from '../../lib/admin/formato'
import { ETIQUETA_ESTADO, ETIQUETA_PLAN, ETIQUETA_STRIPE, TONO_ESTADO, type EstadoComercial } from '../../lib/admin/modelo'

/**
 * Tiendas: una sola tabla con la tienda y su dueño (reemplaza Stores y Users).
 *
 * Los datos salen de la caché de sesión (cargarTiendas / cargarUsuarios): antes
 * esta página tenía un listener vivo sobre toda la colección `stores` y además
 * contaba los productos de cada fila bajando la subcolección entera. Ya no hay
 * columna de productos (está en la ficha, con un count del servidor).
 *
 * Los filtros viven en la URL (?q=, ?estado=, ?plan=, ?vence=, ?pais=,
 * ?vista=) para que el buscador global y los enlaces del Resumen caigan ya
 * filtrados, y para poder compartir una vista.
 */

const POR_PAGINA = 25
const EN_LINEA_MS = 5 * 60 * 1000
const ESTADOS = Object.keys(ETIQUETA_ESTADO) as EstadoComercial[]

const OPCIONES_VENCE: Array<[string, string]> = [
  ['vencidas', 'Vencidas'],
  ['7', 'Vence en 7 días'],
  ['14', 'Vence en 14 días'],
  ['30', 'Vence en 30 días'],
  ['sin', 'Sin fecha'],
]

const solo = (s?: string) => (s || '').replace(/\D/g, '')

/** wa.me con los dígitos del WhatsApp de la tienda o, si no hay, del teléfono del dueño. */
function enlaceWhatsApp(t: AdminTienda, dueno?: AdminUsuario): string | null {
  const n = solo(t.whatsapp) || solo(dueno?.telefono)
  return n.length >= 6 ? `https://wa.me/${n}` : null
}

function cumpleVence(t: AdminTienda, filtro: string): boolean {
  if (filtro === 'sin') return !t.vence
  if (!t.vence) return false
  const dias = diasHasta(t.vence) ?? 0
  if (filtro === 'vencidas') return t.vence.getTime() < Date.now()
  const max = Number(filtro)
  return dias >= 0 && dias <= max
}

function valorOrden(t: AdminTienda, campo: string): number | string | null {
  switch (campo) {
    case 'nombre': return t.nombre.toLowerCase()
    case 'vence': return t.vence?.getTime() ?? null
    case 'actividad': return t.enLinea?.getTime() ?? null
    default: return t.creada?.getTime() ?? null
  }
}

export default function AdminTiendas() {
  const { showToast } = useToast()
  const { localePath } = useLanguage()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const menu = useMenuDeFila()

  const [tiendas, setTiendas] = useState<AdminTienda[] | null>(null)
  const [usuarios, setUsuarios] = useState<AdminUsuario[]>([])
  const [duenos, setDuenos] = useState<Map<string, AdminUsuario>>(new Map())
  const [error, setError] = useState('')
  const [actualizando, setActualizando] = useState(false)
  const [orden, setOrden] = useState<Orden>({ campo: 'creada', direccion: 'desc' })
  const [paginaDe, setPaginaDe] = useState<{ clave: string; n: number }>({ clave: '', n: 0 })
  const [editando, setEditando] = useState<AdminTienda | null>(null)
  const [sincronizando, setSincronizando] = useState<string | null>(null)

  const q = params.get('q') || ''
  const fEstado = params.get('estado') || 'all'
  const fPlan = params.get('plan') || 'all'
  const fVence = params.get('vence') || 'all'
  const fPais = params.get('pais') || 'all'
  const vista = params.get('vista') === 'sin-tienda' ? 'sin-tienda' : 'tiendas'

  // replace:true para no llenar el historial con cada tecla del buscador.
  const ponerParam = (clave: string, valor: string) => {
    const p = new URLSearchParams(params)
    if (!valor || valor === 'all') p.delete(clave)
    else p.set(clave, valor)
    setParams(p, { replace: true })
  }

  const cargar = useCallback(async (forzar = false) => {
    setError('')
    try {
      const [ts, us, mapa] = await Promise.all([cargarTiendas(forzar), cargarUsuarios(forzar), mapaDuenos()])
      setTiendas(ts)
      setUsuarios(us)
      setDuenos(mapa)
    } catch (err) {
      console.error('Error al cargar tiendas:', err)
      setError('No se pudieron cargar las tiendas.')
      setTiendas(prev => prev ?? [])
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const actualizar = async () => {
    setActualizando(true)
    await cargar(true)
    setActualizando(false)
  }

  // ── Usuarios sin tienda: no son dueños de ninguna tienda y su storeId (si
  // lo tienen) no apunta a una tienda que exista. Antes solo se veían en la
  // página Usuarios.
  const sinTienda = useMemo(() => {
    if (!tiendas) return []
    const ids = new Set(tiendas.map(t => t.id))
    const conTienda = new Set(tiendas.map(t => t.ownerId).filter(Boolean) as string[])
    return usuarios
      .filter(u => !conTienda.has(u.id) && !(u.storeId && ids.has(u.storeId)))
      .sort((a, b) => (b.creado?.getTime() ?? 0) - (a.creado?.getTime() ?? 0))
  }, [tiendas, usuarios])

  const resumen = useMemo(() => {
    const ts = tiendas || []
    return {
      total: ts.length,
      pagando: ts.filter(t => t.estado === 'pagando').length,
      prueba: ts.filter(t => t.estado === 'prueba').length,
    }
  }, [tiendas])

  const paises = useMemo(() => {
    const cuenta = new Map<string, number>()
    for (const t of tiendas || []) cuenta.set(t.pais || '', (cuenta.get(t.pais || '') || 0) + 1)
    return [...cuenta.entries()].sort((a, b) => b[1] - a[1])
  }, [tiendas])

  const cuentaEstado = useMemo(() => {
    const c = {} as Record<EstadoComercial, number>
    for (const t of tiendas || []) c[t.estado] = (c[t.estado] || 0) + 1
    return c
  }, [tiendas])

  // ── Búsqueda: nombre, subdominio, correo y teléfono del dueño, WhatsApp de
  // la tienda e ID. Si lo escrito tiene 4+ dígitos también se compara solo
  // con dígitos, para que "+51 999 888" encuentre "51999888…".
  const texto = q.trim().toLowerCase()
  const digitos = solo(q)
  const coincide = useCallback((campos: Array<string | undefined>, telefonos: Array<string | undefined>) => {
    if (!texto) return true
    if (campos.some(c => c && c.toLowerCase().includes(texto))) return true
    if (digitos.length >= 4 && telefonos.some(t => solo(t).includes(digitos))) return true
    return false
  }, [texto, digitos])

  const filtradas = useMemo(() => {
    const lista = (tiendas || []).filter(t => {
      if (fEstado !== 'all' && t.estado !== fEstado) return false
      if (fPlan !== 'all' && t.plan !== fPlan) return false
      if (fPais !== 'all' && (t.pais || '') !== (fPais === 'sin' ? '' : fPais)) return false
      if (fVence !== 'all' && !cumpleVence(t, fVence)) return false
      const d = t.ownerId ? duenos.get(t.ownerId) : undefined
      return coincide([t.nombre, t.subdominio, t.id, d?.email, d?.telefono, t.whatsapp], [d?.telefono, t.whatsapp])
    })
    // Lo que no tiene fecha va siempre al final, ordenes como ordenes.
    const signo = orden.direccion === 'asc' ? 1 : -1
    return lista.sort((a, b) => {
      const va = valorOrden(a, orden.campo)
      const vb = valorOrden(b, orden.campo)
      if (va === null && vb === null) return 0
      if (va === null) return 1
      if (vb === null) return -1
      if (typeof va === 'string' && typeof vb === 'string') return va.localeCompare(vb, 'es') * signo
      return ((va as number) - (vb as number)) * signo
    })
  }, [tiendas, duenos, fEstado, fPlan, fPais, fVence, coincide, orden])

  const usuariosFiltrados = useMemo(
    () => sinTienda.filter(u => coincide([u.email, u.nombre, u.telefono, u.id], [u.telefono])),
    [sinTienda, coincide]
  )

  // La página vuelve a 0 sola cuando cambia cualquier filtro u orden.
  const clave = [vista, q, fEstado, fPlan, fVence, fPais, orden.campo, orden.direccion].join('|')
  const pagina = paginaDe.clave === clave ? paginaDe.n : 0
  const cambiarPagina = (n: number) => { setPaginaDe({ clave, n }); window.scrollTo({ top: 0 }) }
  const paginaTiendas = filtradas.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA)
  const paginaUsuarios = usuariosFiltrados.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA)

  const ordenar = (campo: string) => setOrden(o => siguienteOrden(o, campo, campo === 'nombre' || campo === 'vence' ? 'asc' : 'desc'))
  const hayFiltros = !!q || fEstado !== 'all' || fPlan !== 'all' || fVence !== 'all' || fPais !== 'all'
  const limpiar = () => setParams(vista === 'sin-tienda' ? { vista } : {}, { replace: true })

  const abrirFicha = (t: AdminTienda) => navigate(localePath(`/admin/tiendas/${t.id}`))

  const copiar = async (valor: string, que: string) => {
    try {
      await navigator.clipboard.writeText(valor)
      showToast(`${que} copiado`, 'success')
    } catch {
      showToast('No se pudo copiar', 'error')
    }
  }

  const sincronizar = async (t: AdminTienda) => {
    setSincronizando(t.id)
    try {
      // syncStoreSubscription manda el ID token (el endpoint exige admin o dueño).
      const r = await syncStoreSubscription(t.id)
      showToast(`Sincronizado: ${ETIQUETA_STRIPE[r.status || ''] || r.status || 'sin suscripción'}`, 'success')
      invalidarTiendas()
      await cargar()
    } catch (err) {
      console.error('Error al sincronizar con Stripe:', err)
      showToast((err as Error)?.message || 'No se pudo sincronizar con Stripe', 'error')
    } finally {
      setSincronizando(null)
    }
  }

  // ── Piezas de una fila ──
  const pintarMenuTienda = (t: AdminTienda) => {
    const d = t.ownerId ? duenos.get(t.ownerId) : undefined
    const wa = enlaceWhatsApp(t, d)
    return (
      <CajaMenu posicion={menu.posicion} refMenu={menu.refMenu}>
        <ItemMenu onClick={() => { menu.cerrar(); abrirFicha(t) }}>Abrir ficha</ItemMenu>
        {t.subdominio && (
          <ItemMenu onClick={() => { menu.cerrar(); window.open(`https://${t.subdominio}.shopifree.app`, '_blank', 'noopener') }}>Ver tienda ↗</ItemMenu>
        )}
        {wa && <ItemMenu onClick={() => { menu.cerrar(); window.open(wa, '_blank', 'noopener') }}>WhatsApp al dueño ↗</ItemMenu>}
        <SeparadorMenu />
        {t.stripeCustomerId && (
          <ItemMenu onClick={() => { menu.cerrar(); sincronizar(t) }}>{sincronizando === t.id ? 'Sincronizando…' : 'Sincronizar con Stripe'}</ItemMenu>
        )}
        <ItemMenu onClick={() => { menu.cerrar(); setEditando(t) }}>Cambiar plan</ItemMenu>
        <ItemMenu onClick={() => { menu.cerrar(); copiar(t.id, 'ID') }}>Copiar ID</ItemMenu>
      </CajaMenu>
    )
  }

  const pintarMenuUsuario = (u: AdminUsuario) => {
    const n = solo(u.telefono)
    return (
      <CajaMenu posicion={menu.posicion} refMenu={menu.refMenu}>
        {n.length >= 6 && <ItemMenu onClick={() => { menu.cerrar(); window.open(`https://wa.me/${n}`, '_blank', 'noopener') }}>WhatsApp ↗</ItemMenu>}
        {u.email && <ItemMenu onClick={() => { menu.cerrar(); copiar(u.email, 'Correo') }}>Copiar correo</ItemMenu>}
        <ItemMenu onClick={() => { menu.cerrar(); copiar(u.id, 'ID') }}>Copiar ID</ItemMenu>
      </CajaMenu>
    )
  }

  const textoPlan = (t: AdminTienda) => (
    <>
      {ETIQUETA_PLAN[t.plan]}
      {t.planEfectivo !== t.plan && <span className="text-gray-500"> → {ETIQUETA_PLAN[t.planEfectivo]}</span>}
    </>
  )

  const textoVence = (t: AdminTienda) => {
    if (!t.vence) return <span className="text-gray-400">—</span>
    const rojo = t.vence.getTime() < Date.now() && (t.estado === 'pagando' || t.estado === 'pago_pendiente')
    return (
      <span className={rojo ? 'text-red-600' : ''} title={fechaHora(t.vence)}>
        {fechaCorta(t.vence)} <span className={rojo ? 'text-red-600' : 'text-gray-500'}>{relativo(t.vence)}</span>
      </span>
    )
  }

  const textoActividad = (t: AdminTienda) => {
    if (!t.enLinea) return <span className="text-gray-400">—</span>
    const ahora = Date.now() - t.enLinea.getTime() < EN_LINEA_MS
    return <span title={fechaHora(t.enLinea)} className={ahora ? 'text-gray-900' : 'text-gray-500'}>{ahora ? 'en línea' : relativo(t.enLinea)}</span>
  }

  if (!tiendas) return <Pagina><Cargando /></Pagina>

  const resumenTexto = `${numero(resumen.total)} tiendas · ${numero(resumen.pagando)} pagando · ${numero(resumen.prueba)} en prueba`

  return (
    <Pagina
      resumen={resumenTexto}
      acciones={<Boton onClick={actualizar} cargando={actualizando}>Actualizar</Boton>}
    >
      {error && <Aviso tipo="error">{error}</Aviso>}

      <Pestanas
        opciones={[
          { id: 'tiendas', etiqueta: `Tiendas · ${numero(resumen.total)}` },
          { id: 'sin-tienda', etiqueta: `Usuarios sin tienda · ${numero(sinTienda.length)}` },
        ]}
        valor={vista}
        onCambiar={id => ponerParam('vista', id === 'tiendas' ? '' : id)}
      />

      <Filtros>
        <Buscador
          value={q}
          onChange={e => ponerParam('q', e.target.value)}
          placeholder={vista === 'tiendas' ? 'Nombre, subdominio, correo, teléfono o ID' : 'Correo, nombre o teléfono'}
          ancho="w-full sm:w-80"
        />
        {vista === 'tiendas' && (
          <>
            <FiltroSelect value={fEstado} onChange={e => ponerParam('estado', e.target.value)} aria-label="Estado">
              <option value="all">Todos los estados</option>
              {ESTADOS.map(e => <option key={e} value={e}>{ETIQUETA_ESTADO[e]} ({cuentaEstado[e] || 0})</option>)}
            </FiltroSelect>
            <FiltroSelect value={fPlan} onChange={e => ponerParam('plan', e.target.value)} aria-label="Plan">
              <option value="all">Todos los planes</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="business">Business</option>
            </FiltroSelect>
            <FiltroSelect value={fVence} onChange={e => ponerParam('vence', e.target.value)} aria-label="Vencimiento">
              <option value="all">Cualquier vencimiento</option>
              {OPCIONES_VENCE.map(([v, e]) => <option key={v} value={v}>{e}</option>)}
            </FiltroSelect>
            <FiltroSelect value={fPais} onChange={e => ponerParam('pais', e.target.value)} aria-label="País">
              <option value="all">Todos los países</option>
              {paises.map(([p, n]) => <option key={p || 'sin'} value={p || 'sin'}>{nombrePais(p)} ({n})</option>)}
            </FiltroSelect>
          </>
        )}
        {hayFiltros && <Boton variante="enlace" tamano="sm" onClick={limpiar}>Quitar filtros</Boton>}
      </Filtros>

      {vista === 'tiendas' ? (
        <Seccion sinRelleno>
          <ListaTarjetas vacio="No hay tiendas con estos filtros.">
            {paginaTiendas.map(t => {
              const d = t.ownerId ? duenos.get(t.ownerId) : undefined
              return (
                <TarjetaDeFila
                  key={t.id}
                  titulo={t.nombre}
                  subtitulo={t.subdominio}
                  estado={<Estado tono={TONO_ESTADO[t.estado]} etiqueta={ETIQUETA_ESTADO[t.estado]} />}
                  onClick={() => abrirFicha(t)}
                  datos={[
                    ['Dueño', d ? [d.email, d.telefono].filter(Boolean).join(' · ') : ''],
                    ['Plan', textoPlan(t)],
                    ['Vence', t.vence ? textoVence(t) : ''],
                    ['País', t.pais ? nombrePais(t.pais) : ''],
                    ['Creada', t.creada ? fechaCorta(t.creada) : ''],
                    ['Actividad', t.enLinea ? textoActividad(t) : ''],
                  ]}
                  acciones={<>
                    <BotonDeFila onClick={el => menu.alternar(t.id, el)} />
                    {menu.abiertoEn === t.id && pintarMenuTienda(t)}
                  </>}
                />
              )
            })}
          </ListaTarjetas>

          <div className="hidden sm:block">
            <Tabla>
              <thead>
                <tr>
                  <Th campo="nombre" orden={orden} onOrdenar={ordenar}>Tienda</Th>
                  <Th>Dueño</Th>
                  <Th>Plan</Th>
                  <Th>Estado</Th>
                  <Th campo="vence" orden={orden} onOrdenar={ordenar}>Vence</Th>
                  <Th>País</Th>
                  <Th campo="creada" orden={orden} onOrdenar={ordenar}>Creada</Th>
                  <Th campo="actividad" orden={orden} onOrdenar={ordenar}>Última actividad</Th>
                  <Th ancho={40} />
                </tr>
              </thead>
              <tbody>
                {paginaTiendas.length === 0 && <FilaVacia colSpan={9}>No hay tiendas con estos filtros.</FilaVacia>}
                {paginaTiendas.map(t => {
                  const d = t.ownerId ? duenos.get(t.ownerId) : undefined
                  return (
                    <Fila key={t.id} onClick={() => abrirFicha(t)} seleccionada={menu.abiertoEn === t.id}>
                      <Td className="max-w-[16rem]">
                        <div className="flex items-center gap-2 min-w-0">
                          {t.logo
                            ? <img src={t.logo} alt="" className="w-5 h-5 shrink-0 rounded border border-gray-200 object-cover" loading="lazy" />
                            : <span className="w-5 h-5 shrink-0 rounded border border-gray-200" />}
                          <div className="min-w-0">
                            <div className="truncate font-medium">{t.nombre}</div>
                            <div className="truncate text-[11.5px] text-gray-500">{t.subdominio}</div>
                          </div>
                        </div>
                      </Td>
                      <Td className="max-w-[14rem]">
                        {d ? (
                          <>
                            <div className="truncate">{d.email || '—'}</div>
                            {d.telefono && <div className="truncate text-[11.5px] text-gray-500 tabular-nums">{d.telefono}</div>}
                          </>
                        ) : <span className="text-gray-400">—</span>}
                      </Td>
                      <Td>{textoPlan(t)}</Td>
                      <Td><Estado tono={TONO_ESTADO[t.estado]} etiqueta={ETIQUETA_ESTADO[t.estado]} /></Td>
                      <Td className="tabular-nums">{textoVence(t)}</Td>
                      <Td apagado={!t.pais}>{nombrePais(t.pais)}</Td>
                      <Td className="tabular-nums" apagado title={fechaHora(t.creada)}>{fechaCorta(t.creada)}</Td>
                      <Td className="tabular-nums">{textoActividad(t)}</Td>
                      <Td alinear="der" onClick={e => e.stopPropagation()}>
                        <BotonDeFila onClick={el => menu.alternar(t.id, el)} />
                        {menu.abiertoEn === t.id && pintarMenuTienda(t)}
                      </Td>
                    </Fila>
                  )
                })}
              </tbody>
            </Tabla>
          </div>
          <Paginacion pagina={pagina} porPagina={POR_PAGINA} total={filtradas.length} onCambiar={cambiarPagina} />
        </Seccion>
      ) : (
        <Seccion sinRelleno>
          <ListaTarjetas vacio="No hay usuarios sin tienda.">
            {paginaUsuarios.map(u => (
              <TarjetaDeFila
                key={u.id}
                titulo={u.email || '(sin correo)'}
                subtitulo={u.nombre}
                datos={[
                  ['Teléfono', u.telefono],
                  ['Registrado', u.creado ? fechaCorta(u.creado) : ''],
                ]}
                acciones={<>
                  <BotonDeFila onClick={el => menu.alternar(u.id, el)} />
                  {menu.abiertoEn === u.id && pintarMenuUsuario(u)}
                </>}
              />
            ))}
          </ListaTarjetas>
          <div className="hidden sm:block">
            <Tabla>
              <thead>
                <tr>
                  <Th>Correo</Th>
                  <Th>Nombre</Th>
                  <Th>Teléfono</Th>
                  <Th>Registrado</Th>
                  <Th ancho={40} />
                </tr>
              </thead>
              <tbody>
                {paginaUsuarios.length === 0 && <FilaVacia colSpan={5}>No hay usuarios sin tienda.</FilaVacia>}
                {paginaUsuarios.map(u => (
                  <Fila key={u.id} seleccionada={menu.abiertoEn === u.id}>
                    <Td className="max-w-[18rem] truncate">{u.email || '—'}</Td>
                    <Td apagado={!u.nombre}>{u.nombre || '—'}</Td>
                    <Td className="tabular-nums" apagado={!u.telefono}>{u.telefono || '—'}</Td>
                    <Td className="tabular-nums" apagado title={fechaHora(u.creado)}>{fechaCorta(u.creado)} <span className="text-gray-400">{relativo(u.creado)}</span></Td>
                    <Td alinear="der">
                      <BotonDeFila onClick={el => menu.alternar(u.id, el)} />
                      {menu.abiertoEn === u.id && pintarMenuUsuario(u)}
                    </Td>
                  </Fila>
                ))}
              </tbody>
            </Tabla>
          </div>
          <Paginacion pagina={pagina} porPagina={POR_PAGINA} total={usuariosFiltrados.length} onCambiar={cambiarPagina} />
        </Seccion>
      )}

      {editando && (
        <CambiarPlanModal
          tienda={editando}
          onClose={() => setEditando(null)}
          onGuardado={() => { cargar() }}
        />
      )}
    </Pagina>
  )
}
