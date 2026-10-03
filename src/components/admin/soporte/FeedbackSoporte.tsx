import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { collection, deleteDoc, doc, getDocs, orderBy, query, updateDoc } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { useLanguage } from '../../../hooks/useLanguage'
import { fechaHora, numero } from '../../../lib/admin/formato'
import {
  Aviso, Boton, BotonDeFila, CajaMenu, Cargando, Estado, Fila, FilaVacia, Filtros, FiltroSelect, ItemMenu, ListaTarjetas, Modal,
  SeparadorMenu, Seccion, Tabla, TarjetaDeFila, Td, Th, useMenuDeFila,
} from '../ui'

type Tipo = 'bug' | 'suggestion' | 'missing'
type EstadoFb = 'new' | 'read' | 'done'

interface ItemFeedback {
  id: string
  storeId: string
  storeName: string
  email: string
  plan: string
  type: Tipo
  message: string
  status: EstadoFb
  createdAt: Date | null
}

const TIPOS: Record<Tipo, string> = { bug: 'Error', suggestion: 'Sugerencia', missing: 'Falta algo' }
const ESTADOS: Record<EstadoFb, string> = { new: 'Nuevo', read: 'Leído', done: 'Resuelto' }
// Lo nuevo es lo que pide atención: va en negrita; lo resuelto, apagado.
const TONO: Record<EstadoFb, 'normal' | 'tenue'> = { new: 'normal', read: 'normal', done: 'tenue' }

/**
 * Feedback que mandan los dueños desde el dashboard (errores, sugerencias,
 * "falta algo"). Una lectura de la colección; cambiar estado o borrar se
 * refleja en la lista sin volver a leer. Las reglas antes no dejaban
 * actualizar ni borrar y los botones fallaban en silencio: ahora un error se
 * muestra.
 */
export default function FeedbackSoporte({ onNuevos }: { onNuevos: (n: number) => void }) {
  const { localePath } = useLanguage()
  const navigate = useNavigate()
  const [items, setItems] = useState<ItemFeedback[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tipo, setTipo] = useState<string>('all')
  const [estado, setEstado] = useState<string>('all')
  const [borrando, setBorrando] = useState<ItemFeedback | null>(null)
  const [enviando, setEnviando] = useState(false)
  const menu = useMenuDeFila()

  const leer = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const snap = await getDocs(query(collection(db, 'feedback'), orderBy('createdAt', 'desc')))
      setItems(snap.docs.map(d => {
        const r = d.data()
        return {
          id: d.id,
          storeId: r.storeId || '',
          storeName: r.storeName || '',
          email: r.email || '',
          plan: r.plan || 'free',
          type: (r.type in TIPOS ? r.type : 'suggestion') as Tipo,
          message: r.message || '',
          status: (r.status in ESTADOS ? r.status : 'new') as EstadoFb,
          createdAt: r.createdAt?.toDate?.() || (r.createdAt ? new Date(r.createdAt) : null),
        }
      }))
    } catch (err) {
      setError(`No se pudo leer el feedback: ${err instanceof Error ? err.message : 'error'}`)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { leer() }, [leer])

  const nuevos = useMemo(() => items.filter(i => i.status === 'new').length, [items])
  useEffect(() => { if (!cargando) onNuevos(nuevos) }, [nuevos, cargando, onNuevos])

  const cambiarEstado = async (id: string, status: EstadoFb) => {
    setError(null)
    try {
      await updateDoc(doc(db, 'feedback', id), { status })
      setItems(prev => prev.map(i => (i.id === id ? { ...i, status } : i)))
    } catch (err) {
      setError(`No se pudo cambiar el estado: ${err instanceof Error ? err.message : 'error'}`)
    }
  }

  const borrar = async () => {
    if (!borrando) return
    setEnviando(true)
    setError(null)
    try {
      await deleteDoc(doc(db, 'feedback', borrando.id))
      setItems(prev => prev.filter(i => i.id !== borrando.id))
      setBorrando(null)
    } catch (err) {
      setError(`No se pudo eliminar: ${err instanceof Error ? err.message : 'error'}`)
      setBorrando(null)
    } finally {
      setEnviando(false)
    }
  }

  const visibles = items.filter(i => (tipo === 'all' || i.type === tipo) && (estado === 'all' || i.status === estado))
  const cuenta = (t: Tipo) => items.filter(i => i.type === t).length
  const abierto = items.find(i => i.id === menu.abiertoEn) || null
  const hacer = (fn: () => void) => () => { menu.cerrar(); fn() }

  const tienda = (i: ItemFeedback) => i.storeId
    ? <Link to={localePath(`/admin/tiendas/${i.storeId}`)} className="text-blue-700 hover:underline" onClick={e => e.stopPropagation()}>{i.storeName || i.storeId}</Link>
    : <span>{i.storeName || '—'}</span>

  const estadoPalabra = (i: ItemFeedback) => <Estado etiqueta={ESTADOS[i.status]} tono={TONO[i.status]} className={i.status === 'new' ? 'font-medium' : undefined} />

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12.5px] text-gray-500 tabular-nums">
          {numero(items.length)} mensajes · {numero(nuevos)} nuevos · {numero(cuenta('bug'))} errores · {numero(cuenta('suggestion'))} sugerencias · {numero(cuenta('missing'))} falta algo
        </p>
        <Boton tamano="sm" onClick={leer} disabled={cargando}>Actualizar</Boton>
      </div>

      <Filtros>
        <FiltroSelect value={tipo} onChange={e => setTipo(e.target.value)}>
          <option value="all">Todos los tipos</option>
          <option value="bug">Errores</option>
          <option value="suggestion">Sugerencias</option>
          <option value="missing">Falta algo</option>
        </FiltroSelect>
        <FiltroSelect value={estado} onChange={e => setEstado(e.target.value)}>
          <option value="all">Todos los estados</option>
          <option value="new">Nuevos</option>
          <option value="read">Leídos</option>
          <option value="done">Resueltos</option>
        </FiltroSelect>
      </Filtros>

      {error && <Aviso tipo="error">{error}</Aviso>}

      <Seccion sinRelleno>
        {cargando ? <Cargando /> : (
          <>
            <ListaTarjetas vacio="No hay feedback">
              {visibles.map(i => (
                <TarjetaDeFila
                  key={i.id}
                  titulo={<span className="whitespace-pre-wrap font-normal">{i.message}</span>}
                  subtitulo={`${TIPOS[i.type]} · ${fechaHora(i.createdAt)}`}
                  estado={estadoPalabra(i)}
                  acciones={<BotonDeFila onClick={el => menu.alternar(i.id, el)} />}
                  datos={[['Tienda', tienda(i)], ['Email', i.email], ['Plan', <span className="capitalize">{i.plan}</span>]]}
                />
              ))}
            </ListaTarjetas>
            <div className="hidden sm:block">
              <Tabla>
                <thead>
                  <tr>
                    <Th>Fecha</Th>
                    <Th>Tipo</Th>
                    <Th>Mensaje</Th>
                    <Th>Tienda</Th>
                    <Th>Estado</Th>
                    <Th ancho={44} />
                  </tr>
                </thead>
                <tbody>
                  {visibles.length === 0 && <FilaVacia colSpan={6}>No hay feedback</FilaVacia>}
                  {visibles.map(i => (
                    <Fila key={i.id} seleccionada={menu.abiertoEn === i.id}>
                      <Td apagado className="align-top tabular-nums">{fechaHora(i.createdAt)}</Td>
                      <Td className="align-top">{TIPOS[i.type]}</Td>
                      <Td className="align-top whitespace-normal min-w-[280px] max-w-[560px]">
                        <p className="whitespace-pre-wrap break-words leading-snug">{i.message}</p>
                      </Td>
                      <Td className="align-top">
                        <div>{tienda(i)}</div>
                        <div className="text-[11.5px] text-gray-500">{[i.email, i.plan].filter(Boolean).join(' · ')}</div>
                      </Td>
                      <Td className="align-top">{estadoPalabra(i)}</Td>
                      <Td alinear="der" className="align-top"><BotonDeFila onClick={el => menu.alternar(i.id, el)} /></Td>
                    </Fila>
                  ))}
                </tbody>
              </Tabla>
            </div>
          </>
        )}
      </Seccion>

      {abierto && (
        <CajaMenu posicion={menu.posicion} refMenu={menu.refMenu}>
          {abierto.status === 'new' && <ItemMenu onClick={hacer(() => cambiarEstado(abierto.id, 'read'))}>Marcar como leído</ItemMenu>}
          {abierto.status !== 'done' && <ItemMenu onClick={hacer(() => cambiarEstado(abierto.id, 'done'))}>Marcar como resuelto</ItemMenu>}
          {abierto.status === 'done' && <ItemMenu onClick={hacer(() => cambiarEstado(abierto.id, 'new'))}>Reabrir</ItemMenu>}
          {abierto.storeId && <ItemMenu onClick={hacer(() => navigate(localePath(`/admin/tiendas/${abierto.storeId}`)))}>Ficha de la tienda</ItemMenu>}
          <SeparadorMenu />
          <ItemMenu rojo onClick={hacer(() => setBorrando(abierto))}>Eliminar…</ItemMenu>
        </CajaMenu>
      )}

      {borrando && (
        <Modal
          titulo="Eliminar feedback"
          subtitulo={borrando.storeName || borrando.email}
          ancho="sm"
          onClose={() => { if (!enviando) setBorrando(null) }}
          pie={<>
            <Boton onClick={() => setBorrando(null)} disabled={enviando}>Cancelar</Boton>
            <Boton variante="peligro" onClick={borrar} cargando={enviando}>Eliminar</Boton>
          </>}
        >
          <p className="text-[12.5px] text-gray-700">Se borra para siempre. Si solo quieres sacarlo de la vista, márcalo como resuelto.</p>
          <p className="mt-2 text-[12px] text-gray-500 line-clamp-3 whitespace-pre-wrap">{borrando.message}</p>
        </Modal>
      )}
    </>
  )
}
