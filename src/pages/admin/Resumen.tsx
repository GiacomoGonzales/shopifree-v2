import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { auth, db } from '../../lib/firebase'
import { useLanguage } from '../../hooks/useLanguage'
import { apiUrl } from '../../utils/apiBase'
import {
  Aviso, Boton, Cargando, Cifra, Cifras, Estado, Fila, FilaVacia, ListaTarjetas, Pagina, Pestanas, Seccion,
  Tabla, TarjetaDeFila, Td, Th,
} from '../../components/admin/ui'
import { dinero, fecha, nombrePais, numero, porcentaje, relativo } from '../../lib/admin/formato'
import { ETIQUETA_ESTADO, TONO_ESTADO, type EstadoComercial } from '../../lib/admin/modelo'
import type { PorMoneda, ResumenAdmin, TopItem } from '../../lib/admin/tipos'

/**
 * Resumen del admin. Las cifras NO se calculan aquí: las calcula
 * api/admin-stats (cron diario a las 05:00 de Lima o el botón "Actualizar
 * ahora") y quedan en el documento adminStats/resumen. La página solo lee ese
 * documento, así abre al instante sin bajar la colección de tiendas.
 */

// Gráficos: solo gris y el azul del panel.
const AZUL = '#2563eb'
const GRISES = ['#9ca3af', '#4b5563', '#d1d5db']
const EJE = { fontSize: 11, fill: '#6b7280' }

const ORDEN_ESTADOS: EstadoComercial[] = ['pagando', 'pago_pendiente', 'cortesia', 'prueba', 'prueba_vencida', 'cortesia_vencida', 'cancelada', 'gratis']

type PestanaTop = 'visitas' | 'pedidos' | 'whatsapp' | 'ingresos'
const PESTANAS_TOP: Array<{ id: PestanaTop; etiqueta: string }> = [
  { id: 'visitas', etiqueta: 'Visitas' },
  { id: 'pedidos', etiqueta: 'Pedidos' },
  { id: 'whatsapp', etiqueta: 'WhatsApp' },
  { id: 'ingresos', etiqueta: 'Ingresos' },
]

/** Monedas de mayor a menor monto, para que la principal vaya primero (y en azul). */
function monedasOrdenadas(...grupos: PorMoneda[]): string[] {
  const total: Record<string, number> = {}
  for (const g of grupos) for (const [m, v] of Object.entries(g || {})) total[m] = (total[m] || 0) + v
  return Object.keys(total).sort((a, b) => total[b] - total[a])
}

/** Un monto por línea, cada uno con su moneda. Nunca se suman monedas. */
function Montos({ valores }: { valores: PorMoneda }) {
  const monedas = monedasOrdenadas(valores)
  if (monedas.length === 0) return <>—</>
  return <>{monedas.map(m => <span key={m} className="block">{dinero(valores[m], m)}</span>)}</>
}

function textoMontos(valores: PorMoneda): string {
  const monedas = monedasOrdenadas(valores)
  return monedas.length ? monedas.map(m => dinero(valores[m], m)).join(' · ') : '—'
}

function etiquetaMes(clave: string, largo = false): string {
  const [y, m] = clave.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  return largo
    ? d.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })
    : d.toLocaleDateString('es-PE', { month: 'short' }).replace('.', '')
}

export default function AdminResumen() {
  const { localePath } = useLanguage()
  const navigate = useNavigate()
  const [datos, setDatos] = useState<ResumenAdmin | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [calculando, setCalculando] = useState(false)
  const [errorCalculo, setErrorCalculo] = useState('')
  const [pestana, setPestana] = useState<PestanaTop>('visitas')
  const [todosPaises, setTodosPaises] = useState(false)
  const [monedaTop, setMonedaTop] = useState('')

  useEffect(() => {
    getDoc(doc(db, 'adminStats', 'resumen'))
      .then(snap => setDatos(snap.exists() ? (snap.data() as ResumenAdmin) : null))
      .catch(err => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setCargando(false))
  }, [])

  async function actualizar() {
    if (!auth.currentUser) return
    setCalculando(true)
    setErrorCalculo('')
    try {
      const token = await auth.currentUser.getIdToken()
      const res = await fetch(apiUrl('/api/admin-stats'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.details || json?.error || `Error ${res.status}`)
      setDatos(json as ResumenAdmin)
    } catch (err) {
      setErrorCalculo(`No se pudo calcular: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setCalculando(false)
    }
  }

  const irATienda = (id: string) => navigate(localePath(`/admin/tiendas/${id}`))
  const irAEstado = (e: EstadoComercial) => navigate(localePath(`/admin/tiendas?estado=${e}`))

  // Serie de cobros con una clave por moneda (barras agrupadas, no apiladas:
  // apilar monedas distintas sería sumarlas a ojo).
  const monedasSerie = useMemo(() => datos ? monedasOrdenadas(...datos.serie12m.map(s => s.cobrado)) : [], [datos])
  const serieCobros = useMemo(() => datos?.serie12m.map(s => ({ mes: s.mes, ...s.cobrado })) || [], [datos])

  if (cargando) return <Pagina><Cargando /></Pagina>
  if (error) return <Pagina><Aviso tipo="error">No se pudo leer el resumen: {error}</Aviso></Pagina>

  if (!datos) {
    return (
      <Pagina>
        {errorCalculo && <Aviso tipo="error">{errorCalculo}</Aviso>}
        <Aviso>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>El resumen todavía no se ha calculado. Se calcula solo cada día a las 05:00; puedes calcularlo ahora (tarda hasta un par de minutos).</span>
            <Boton variante="primario" onClick={actualizar} cargando={calculando}>Calcular ahora</Boton>
          </div>
        </Aviso>
      </Pagina>
    )
  }

  const d = datos
  const enPrueba = d.estados.prueba || 0
  // Ingresos: el servidor manda el top 10 de cada moneda; se elige una
  // (por defecto la que más tiendas tiene) y nunca se mezclan en una lista.
  const monedasTop = [...new Set((d.top.ingresos || []).map(t => (t.moneda || 'USD').toUpperCase()))]
    .sort((a, b) => d.top.ingresos.filter(t => t.moneda?.toUpperCase() === b).length - d.top.ingresos.filter(t => t.moneda?.toUpperCase() === a).length)
  const monedaElegida = monedasTop.includes(monedaTop) ? monedaTop : monedasTop[0] || ''
  const top: TopItem[] = pestana === 'ingresos'
    ? (d.top.ingresos || []).filter(t => (t.moneda || 'USD').toUpperCase() === monedaElegida).sort((a, b) => b.valor - a.valor).slice(0, 10)
    : d.top[pestana] || []
  const paises = todosPaises ? d.paises : d.paises.slice(0, 10)
  const colorMoneda = (i: number) => (i === 0 ? AZUL : GRISES[(i - 1) % GRISES.length])

  return (
    <Pagina
      resumen={
        <span title={`${new Date(d.calculadoEn).toLocaleString('es-PE')} · ${d.origen === 'cron' ? 'automático' : 'manual'} · ${Math.round(d.duracionMs / 1000)} s`}>
          Calculado {relativo(d.calculadoEn)}
        </span>
      }
      acciones={<Boton variante="primario" onClick={actualizar} cargando={calculando}>Actualizar ahora</Boton>}
    >
      {errorCalculo && <Aviso tipo="error">{errorCalculo}</Aviso>}

      <Seccion titulo="Tiendas">
        <Cifras>
          <Cifra etiqueta="Tiendas" valor={numero(d.tiendas.total)} nota={`+${numero(d.tiendas.nuevasHoy)} hoy`} />
          <Cifra etiqueta="Nuevas este mes" valor={numero(d.tiendas.nuevasMes)} nota={`Mes anterior al mismo día: ${numero(d.tiendas.nuevasMesAnteriorMismoDia)}`} />
          <Cifra etiqueta="Pagando" valor={numero(d.pagando.total)} nota={`Pro ${numero(d.pagando.pro)} · Business ${numero(d.pagando.business)}`} />
          <Cifra etiqueta="En prueba" valor={numero(enPrueba)} />
          <Cifra
            etiqueta="Conversión de la prueba"
            valor={porcentaje(d.conversion.pagan, d.conversion.terminaronPrueba)}
            nota={`${numero(d.conversion.pagan)} de ${numero(d.conversion.terminaronPrueba)} · últimos ${d.conversion.cohorteDias} días`}
          />
          <Cifra etiqueta="Usuarios" valor={numero(d.usuarios.total)} />
          <Cifra etiqueta="Productos" valor={numero(d.productos.total)} />
        </Cifras>
      </Seccion>

      <Seccion titulo="Dinero" descripcion="Desde Stripe. Cada moneda por separado.">
        <div className="flex flex-col gap-3">
          {d.mrr.error && <Aviso tipo="error">No se pudo calcular el MRR: {d.mrr.error}</Aviso>}
          {d.cobros.error && <Aviso tipo="error">No se pudieron leer los cobros: {d.cobros.error}</Aviso>}
          <Cifras>
            <Cifra
              etiqueta="MRR"
              valor={<Montos valores={d.mrr.porMoneda} />}
              nota={`${numero(d.mrr.suscripciones)} suscripciones · ${numero(d.mrr.anuales)} anuales`}
            />
            <Cifra etiqueta="Cobrado hoy" valor={<Montos valores={d.cobros.hoy} />} />
            <Cifra
              etiqueta="Cobrado este mes"
              valor={<Montos valores={d.cobros.mes} />}
              nota={`Mes anterior al mismo día: ${textoMontos(d.cobros.mesAnteriorMismoDia)}`}
            />
            <Cifra etiqueta="Mes anterior completo" valor={<Montos valores={d.cobros.mesAnterior} />} />
          </Cifras>
        </div>
      </Seccion>

      <div className="grid gap-4 lg:grid-cols-2">
        <Seccion titulo="Altas por mes" descripcion="Tiendas creadas, últimos 12 meses.">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.serie12m} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
                <CartesianGrid vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="mes" tickFormatter={m => etiquetaMes(String(m))} tick={EJE} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                <YAxis allowDecimals={false} tick={EJE} tickLine={false} axisLine={false} width={40} />
                <Tooltip
                  cursor={{ fill: '#f9fafb' }}
                  contentStyle={{ fontSize: 12, borderColor: '#e5e7eb', borderRadius: 6 }}
                  labelFormatter={m => etiquetaMes(String(m), true)}
                  formatter={v => [numero(Number(v)), 'Altas']}
                />
                <Bar dataKey="altas" fill={AZUL} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Seccion>

        <Seccion
          titulo="Cobrado por mes"
          descripcion={monedasSerie.length > 1
            ? monedasSerie.map((m, i) => `${m.toUpperCase()} ${i === 0 ? 'azul' : 'gris'}`).join(' · ')
            : 'Facturas pagadas en Stripe, últimos 12 meses.'}
        >
          {d.cobros.error && monedasSerie.length === 0
            ? <p className="py-10 text-center text-[12.5px] text-gray-500">Sin datos de Stripe.</p>
            : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={serieCobros} margin={{ top: 4, right: 4, bottom: 0, left: -4 }}>
                    <CartesianGrid vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="mes" tickFormatter={m => etiquetaMes(String(m))} tick={EJE} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                    <YAxis tick={EJE} tickLine={false} axisLine={false} width={48} />
                    <Tooltip
                      cursor={{ fill: '#f9fafb' }}
                      contentStyle={{ fontSize: 12, borderColor: '#e5e7eb', borderRadius: 6 }}
                      labelFormatter={m => etiquetaMes(String(m), true)}
                      formatter={(v, nombre) => [dinero(Number(v), String(nombre)), String(nombre).toUpperCase()]}
                    />
                    {monedasSerie.map((m, i) => (
                      <Bar key={m} dataKey={m} name={m} fill={colorMoneda(i)} radius={[2, 2, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
        </Seccion>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Seccion titulo="Estados de las tiendas" sinRelleno>
          <ListaTarjetas>
            {ORDEN_ESTADOS.map(e => (
              <TarjetaDeFila
                key={e}
                titulo={ETIQUETA_ESTADO[e]}
                estado={<span className="tabular-nums text-gray-900">{numero(d.estados[e] || 0)}</span>}
                onClick={() => irAEstado(e)}
              />
            ))}
          </ListaTarjetas>
          <div className="hidden sm:block">
            <Tabla>
              <thead>
                <tr><Th>Estado</Th><Th alinear="der">Tiendas</Th></tr>
              </thead>
              <tbody>
                {ORDEN_ESTADOS.map(e => (
                  <Fila key={e} onClick={() => irAEstado(e)}>
                    <Td>
                      <Link to={localePath(`/admin/tiendas?estado=${e}`)} onClick={ev => ev.stopPropagation()} className="text-blue-700 hover:underline">
                        {ETIQUETA_ESTADO[e]}
                      </Link>
                    </Td>
                    <Td numero>{numero(d.estados[e] || 0)}</Td>
                  </Fila>
                ))}
              </tbody>
            </Tabla>
          </div>
        </Seccion>

        <Seccion
          titulo="Por país"
          sinRelleno
          acciones={d.paises.length > 10 && (
            <Boton variante="enlace" tamano="sm" onClick={() => setTodosPaises(v => !v)}>
              {todosPaises ? 'Ver menos' : `Ver todos (${d.paises.length})`}
            </Boton>
          )}
        >
          <ListaTarjetas vacio="Sin tiendas.">
            {paises.map(p => (
              <TarjetaDeFila
                key={p.pais || '-'}
                titulo={nombrePais(p.pais)}
                datos={[['Tiendas', numero(p.tiendas)], ['Pagando', numero(p.pagando)]]}
              />
            ))}
          </ListaTarjetas>
          <div className="hidden sm:block">
            <Tabla>
              <thead>
                <tr><Th>País</Th><Th alinear="der">Tiendas</Th><Th alinear="der">Pagando</Th></tr>
              </thead>
              <tbody>
                {paises.length === 0 && <FilaVacia colSpan={3}>Sin tiendas.</FilaVacia>}
                {paises.map(p => (
                  <Fila key={p.pais || '-'}>
                    <Td apagado={!p.pais}>{nombrePais(p.pais)}</Td>
                    <Td numero>{numero(p.tiendas)}</Td>
                    <Td numero>{numero(p.pagando)}</Td>
                  </Fila>
                ))}
              </tbody>
            </Tabla>
          </div>
        </Seccion>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Seccion titulo="Top tiendas" descripcion="Desde siempre. Pedidos e ingresos sin cancelados." sinRelleno>
          <div className="px-4 pt-3 pb-2 flex flex-col gap-2">
            <Pestanas opciones={PESTANAS_TOP} valor={pestana} onCambiar={id => setPestana(id as PestanaTop)} />
            {pestana === 'ingresos' && monedasTop.length > 1 && (
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
                {monedasTop.map(m => (
                  <button key={m} type="button" onClick={() => setMonedaTop(m)} className={m === monedaElegida ? 'font-medium text-gray-900' : 'text-blue-700 hover:underline'}>{m}</button>
                ))}
              </div>
            )}
            {d.top.error && <Aviso tipo="error">{d.top.error}</Aviso>}
          </div>
          <ListaTarjetas vacio="Sin datos.">
            {top.map((t, i) => (
              <TarjetaDeFila
                key={t.storeId}
                titulo={`${i + 1}. ${t.nombre}`}
                subtitulo={t.subdominio}
                estado={<span className="tabular-nums text-gray-900">{pestana === 'ingresos' ? dinero(t.valor, t.moneda) : numero(t.valor)}</span>}
                onClick={() => irATienda(t.storeId)}
              />
            ))}
          </ListaTarjetas>
          <div className="hidden sm:block">
            <Tabla>
              <thead>
                <tr><Th ancho={40} alinear="der">#</Th><Th>Tienda</Th><Th alinear="der">{PESTANAS_TOP.find(p => p.id === pestana)?.etiqueta}</Th></tr>
              </thead>
              <tbody>
                {top.length === 0 && <FilaVacia colSpan={3}>Sin datos.</FilaVacia>}
                {top.map((t, i) => (
                  <Fila key={t.storeId} onClick={() => irATienda(t.storeId)}>
                    <Td numero apagado>{i + 1}</Td>
                    <Td>
                      <Link to={localePath(`/admin/tiendas/${t.storeId}`)} onClick={ev => ev.stopPropagation()} className="text-blue-700 hover:underline">{t.nombre}</Link>
                      {t.subdominio && <span className="ml-2 text-gray-500">{t.subdominio}</span>}
                    </Td>
                    <Td numero>{pestana === 'ingresos' ? dinero(t.valor, t.moneda) : numero(t.valor)}</Td>
                  </Fila>
                ))}
              </tbody>
            </Tabla>
          </div>
        </Seccion>

        <Seccion titulo="Vencen esta semana" descripcion="Pagando, cortesía o prueba que vencen en los próximos 7 días." sinRelleno>
          <ListaTarjetas vacio="Nada vence esta semana.">
            {d.venceProximo.map(v => (
              <TarjetaDeFila
                key={v.storeId}
                titulo={v.nombre}
                subtitulo={v.subdominio}
                estado={<Estado etiqueta={ETIQUETA_ESTADO[v.estado]} tono={TONO_ESTADO[v.estado]} />}
                datos={[['Vence', `${fecha(v.vence)} · ${relativo(v.vence)}`]]}
                onClick={() => irATienda(v.storeId)}
              />
            ))}
          </ListaTarjetas>
          <div className="hidden sm:block">
            <Tabla>
              <thead>
                <tr><Th>Tienda</Th><Th>Estado</Th><Th>Vence</Th></tr>
              </thead>
              <tbody>
                {d.venceProximo.length === 0 && <FilaVacia colSpan={3}>Nada vence esta semana.</FilaVacia>}
                {d.venceProximo.map(v => (
                  <Fila key={v.storeId} onClick={() => irATienda(v.storeId)}>
                    <Td>
                      <Link to={localePath(`/admin/tiendas/${v.storeId}`)} onClick={ev => ev.stopPropagation()} className="text-blue-700 hover:underline">{v.nombre}</Link>
                    </Td>
                    <Td><Estado etiqueta={ETIQUETA_ESTADO[v.estado]} tono={TONO_ESTADO[v.estado]} /></Td>
                    <Td>
                      <span className="tabular-nums">{fecha(v.vence)}</span>
                      <span className="ml-2 text-gray-500">{relativo(v.vence)}</span>
                    </Td>
                  </Fila>
                ))}
              </tbody>
            </Tabla>
          </div>
        </Seccion>
      </div>
    </Pagina>
  )
}
