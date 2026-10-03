import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../hooks/useLanguage'
import { ADMIN_EMAILS } from '../../lib/adminAccess'
import { cargarTiendas } from '../../lib/admin/datos'
import { numero } from '../../lib/admin/formato'
import {
  Aviso, Boton, Campo, Entrada, Fila, FilaVacia, ListaTarjetas, Modal, Pagina, Seccion, Tabla, TarjetaDeFila, Td, Th,
} from '../../components/admin/ui'
import { mensajeError, postAdmin } from '../../components/admin/apps/comun'

interface Desfase {
  storeId: string
  productId: string
  productName: string
  productStock: number | null
  combinationSum: number
  drift: number
  fixed: boolean
}

interface RespuestaStock {
  mode: 'dryRun' | 'apply'
  scope: string
  storesScanned: number
  driftedProducts: number
  drifts: Desfase[]
}

const PROYECTO = import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined

const ENLACES: Array<{ nombre: string; url: string; nota: string }> = [
  { nombre: 'Stripe', url: 'https://dashboard.stripe.com', nota: 'Suscripciones, cobros y webhooks' },
  { nombre: 'Firebase', url: PROYECTO ? `https://console.firebase.google.com/project/${PROYECTO}/overview` : 'https://console.firebase.google.com', nota: PROYECTO ? `Proyecto ${PROYECTO}: Firestore, Auth, reglas` : 'Firestore, Auth, reglas' },
  { nombre: 'Vercel', url: 'https://vercel.com/dashboard', nota: 'Deploys, dominios, variables de entorno, cron' },
  { nombre: 'App Store Connect', url: 'https://appstoreconnect.apple.com/apps', nota: 'Apps iOS de las tiendas' },
  { nombre: 'Google Play Console', url: 'https://play.google.com/console', nota: 'Apps Android de las tiendas' },
  { nombre: 'Cloudflare', url: 'https://dash.cloudflare.com', nota: 'R2 (imágenes) y transformaciones' },
]

/**
 * Configuración del admin: quién es admin (solo lectura), herramientas de
 * mantenimiento y enlaces a las consolas externas.
 */
export default function AdminConfiguracion() {
  const { localePath } = useLanguage()
  const [storeId, setStoreId] = useState('')
  const [revisando, setRevisando] = useState(false)
  const [aplicando, setAplicando] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const [resultado, setResultado] = useState<RespuestaStock | null>(null)
  // El alcance de la última revisión: "Aplicar" arregla exactamente eso, no
  // lo que haya quedado escrito después en el campo.
  const [alcance, setAlcance] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [nombres, setNombres] = useState<Map<string, string>>(new Map())

  // Nombres de tienda para la tabla. Usa la lista compartida del admin (ya
  // cacheada si se pasó por Tiendas); solo se pide si hay filas que mostrar.
  useEffect(() => {
    if (!resultado?.drifts.length) return
    cargarTiendas().then(ts => setNombres(new Map(ts.map(t => [t.id, t.nombre])))).catch(() => { /* se muestra el id */ })
  }, [resultado])

  const llamar = async (arreglar: boolean, id: string | null) => {
    const qs = new URLSearchParams()
    if (id) qs.set('storeId', id)
    if (arreglar) qs.set('fix', 'true')
    const q = qs.toString()
    return postAdmin<RespuestaStock>(`/api/admin-resync-stock${q ? `?${q}` : ''}`)
  }

  const revisar = async () => {
    const id = storeId.trim() || null
    setRevisando(true)
    setError(null)
    setResultado(null)
    try {
      setResultado(await llamar(false, id))
      setAlcance(id)
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setRevisando(false)
    }
  }

  const aplicar = async () => {
    setAplicando(true)
    setError(null)
    try {
      setResultado(await llamar(true, alcance))
      setConfirmar(false)
    } catch (err) {
      setError(mensajeError(err))
      setConfirmar(false)
    } finally {
      setAplicando(false)
    }
  }

  const desfases = resultado?.drifts ?? []
  const pendientes = resultado?.mode === 'dryRun' ? desfases.length : 0
  const tienda = (id: string) => <Link to={localePath(`/admin/tiendas/${id}`)} className="text-blue-700 hover:underline">{nombres.get(id) || id}</Link>
  const diferencia = (d: Desfase) => `${d.drift > 0 ? '+' : ''}${numero(d.drift)}`

  return (
    <Pagina>
      <Seccion
        titulo="Administradores"
        descripcion="Pueden entrar a este panel con el email verificado. Solo lectura."
      >
        <ul className="divide-y divide-gray-100 text-[12.5px]">
          {ADMIN_EMAILS.map(email => <li key={email} className="py-1.5 font-mono text-[12px] text-gray-900">{email}</li>)}
        </ul>
        <Aviso className="mt-3">
          La misma lista vive en tres lugares y deben ser iguales: src/lib/adminAccess.ts (este panel), firestore.rules (isAdmin()) y
          api/_shared/admin.ts (endpoints del servidor). Para sumar o quitar un admin hay que cambiar los tres y desplegar las reglas.
        </Aviso>
      </Seccion>

      <Seccion
        titulo="Reparar stock"
        descripcion="Busca productos con variantes cuyo stock general no coincide con la suma del stock de sus variantes (la tienda pública usa el general para mostrar «agotado»). Primero revisa sin tocar nada; después aplica el arreglo."
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Campo etiqueta="ID de la tienda (opcional)" ayuda="Vacío revisa todas las tiendas; puede tardar hasta un minuto." className="sm:w-80">
            <Entrada value={storeId} onChange={e => setStoreId(e.target.value)} placeholder="Todas las tiendas" className="font-mono" />
          </Campo>
          <div className="flex gap-2 sm:pb-[22px]">
            <Boton onClick={revisar} cargando={revisando} disabled={aplicando}>Revisar (sin cambios)</Boton>
            <Boton variante="primario" onClick={() => setConfirmar(true)} disabled={!resultado || resultado.mode !== 'dryRun' || pendientes === 0 || revisando}>Aplicar arreglo</Boton>
          </div>
        </div>

        {error && <Aviso tipo="error" className="mt-3">{error}</Aviso>}

        {resultado && (
          <div className="mt-4 space-y-2">
            <p className="text-[12.5px] text-gray-700 tabular-nums">
              {resultado.mode === 'apply' ? 'Arreglo aplicado' : 'Revisión'} · {alcance ? `tienda ${alcance}` : 'todas las tiendas'} · {numero(resultado.storesScanned)} tiendas revisadas ·{' '}
              {resultado.mode === 'apply' ? `${numero(desfases.filter(d => d.fixed).length)} productos corregidos` : `${numero(resultado.driftedProducts)} productos desfasados`}
            </p>
            <div className="border border-gray-200 rounded-md">
              <ListaTarjetas vacio="Todo cuadra: ningún producto desfasado.">
                {desfases.map(d => (
                  <TarjetaDeFila
                    key={`${d.storeId}/${d.productId}`}
                    titulo={d.productName}
                    subtitulo={tienda(d.storeId)}
                    estado={resultado.mode === 'apply' ? (d.fixed ? 'Corregido' : 'Sin cambio') : undefined}
                    datos={[
                      ['Stock general', <span className="tabular-nums">{d.productStock === null ? 'vacío' : numero(d.productStock)}</span>],
                      ['Suma variantes', <span className="tabular-nums">{numero(d.combinationSum)}</span>],
                      ['Diferencia', <span className="tabular-nums">{diferencia(d)}</span>],
                    ]}
                  />
                ))}
              </ListaTarjetas>
              <div className="hidden sm:block">
                <Tabla>
                  <thead>
                    <tr>
                      <Th>Tienda</Th>
                      <Th>Producto</Th>
                      <Th alinear="der">Stock general</Th>
                      <Th alinear="der">Suma variantes</Th>
                      <Th alinear="der">Diferencia</Th>
                      {resultado.mode === 'apply' && <Th>Resultado</Th>}
                    </tr>
                  </thead>
                  <tbody>
                    {desfases.length === 0 && <FilaVacia colSpan={6}>Todo cuadra: ningún producto desfasado.</FilaVacia>}
                    {desfases.map(d => (
                      <Fila key={`${d.storeId}/${d.productId}`}>
                        <Td>{tienda(d.storeId)}</Td>
                        <Td className="max-w-[320px] truncate" title={d.productId}>{d.productName}</Td>
                        <Td numero>{d.productStock === null ? <span className="text-gray-400">vacío</span> : numero(d.productStock)}</Td>
                        <Td numero>{numero(d.combinationSum)}</Td>
                        <Td numero>{diferencia(d)}</Td>
                        {resultado.mode === 'apply' && <Td apagado={!d.fixed}>{d.fixed ? 'Corregido' : 'Sin cambio'}</Td>}
                      </Fila>
                    ))}
                  </tbody>
                </Tabla>
              </div>
            </div>
          </div>
        )}
      </Seccion>

      <Seccion titulo="Enlaces útiles">
        <ul className="divide-y divide-gray-100">
          {ENLACES.map(e => (
            <li key={e.nombre} className="flex flex-col gap-0.5 py-1.5 sm:flex-row sm:items-baseline sm:gap-3">
              <a href={e.url} target="_blank" rel="noopener noreferrer" className="w-44 shrink-0 text-[12.5px] text-blue-700 hover:underline">{e.nombre} ↗</a>
              <span className="text-[12px] text-gray-500">{e.nota}</span>
            </li>
          ))}
        </ul>
      </Seccion>

      {confirmar && resultado && (
        <Modal
          titulo="Aplicar arreglo de stock"
          subtitulo={alcance ? `Tienda ${alcance}` : 'Todas las tiendas'}
          ancho="sm"
          onClose={() => { if (!aplicando) setConfirmar(false) }}
          pie={<>
            <Boton onClick={() => setConfirmar(false)} disabled={aplicando}>Cancelar</Boton>
            <Boton variante="primario" onClick={aplicar} cargando={aplicando}>Aplicar</Boton>
          </>}
        >
          <p className="text-[12.5px] text-gray-700">
            Se igualará el stock general de <span className="tabular-nums font-medium">{numero(pendientes)}</span> productos a la suma de sus variantes
            (y el stock por almacén a la suma por almacén). Las variantes no se tocan.
          </p>
          <p className="mt-2 text-[12px] text-gray-500">El servidor vuelve a revisar al aplicar, así que se corrige lo que esté desfasado en ese momento.</p>
        </Modal>
      )}
    </Pagina>
  )
}
