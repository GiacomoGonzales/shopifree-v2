import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { numero } from '../../lib/admin/formato'
import { Aviso, Cargando, Pagina, Pestanas, Seccion } from '../../components/admin/ui'
import { compilando, esActiva, esCompletada, type Plataforma, type TiendaApp } from '../../components/admin/apps/comun'
import { useNota } from '../../components/admin/apps/useNota'
import TablaApps, { type AccionApp } from '../../components/admin/apps/TablaApps'
import PublicarModal from '../../components/admin/apps/PublicarModal'
import CompilarModal from '../../components/admin/apps/CompilarModal'
import DescartarModal from '../../components/admin/apps/DescartarModal'
import DatosTiendaModal from '../../components/admin/apps/DatosTiendaModal'

type Vista = 'activas' | 'completadas' | 'todas'

type Abierto =
  | { tipo: 'compilar'; id: string; plataforma: Plataforma }
  | { tipo: 'publicar' | 'datos' | 'descartar'; id: string }

/**
 * Apps de las tiendas: builds de Android/iOS (GitHub Actions), URLs de las
 * tiendas de apps y datos para Play Console.
 *
 * Un solo listener sobre las tiendas con appConfig. Antes había una lectura
 * inicial más un listener POR TIENDA, y todos se recreaban cada vez que
 * cambiaba la cantidad. El estado del build tiene que verse en vivo mientras
 * compila, por eso es onSnapshot y no una lectura suelta.
 */
export default function AdminApps() {
  const [tiendas, setTiendas] = useState<TiendaApp[]>([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [vista, setVista] = useState<Vista>('activas')
  // Se guarda solo el id: la tienda se busca en la lista viva para que un
  // modal abierto (p. ej. Datos, esperando capturas) se actualice solo.
  const [abierto, setAbierto] = useState<Abierto | null>(null)
  const { nota, info, limpiar } = useNota()

  useEffect(() => {
    const q = query(collection(db, 'stores'), where('appConfig', '!=', null))
    return onSnapshot(q, snap => {
      const filas = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<TiendaApp, 'id'>) }))
      filas.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      setTiendas(filas)
      setErrorCarga(null)
      setCargando(false)
    }, err => {
      console.error('[admin/apps]', err)
      setErrorCarga(err.message)
      setCargando(false)
    })
  }, [])

  const resumen = useMemo(() => {
    let solicitadas = 0, enCompilacion = 0, conError = 0
    for (const t of tiendas) {
      if (t.appConfig?.status === 'requested') solicitadas++
      const b = [t.appConfig?.build, t.appConfig?.buildIos]
      if (b.some(compilando)) enCompilacion++
      if (b.some(x => x?.status === 'failed')) conError++
    }
    return { total: tiendas.length, solicitadas, enCompilacion, conError }
  }, [tiendas])

  const activas = useMemo(() => tiendas.filter(esActiva), [tiendas])
  const completadas = useMemo(() => tiendas.filter(esCompletada), [tiendas])
  const visibles = vista === 'activas' ? activas : vista === 'completadas' ? completadas : tiendas

  const vacio = tiendas.length === 0
    ? 'Ninguna tienda tiene app configurada todavía'
    : vista === 'activas' ? 'No hay solicitudes activas ni builds en curso'
    : vista === 'completadas' ? 'Ninguna app publicada todavía'
    : 'Ninguna tienda tiene app configurada todavía'

  const alAccionar = (t: TiendaApp, a: AccionApp) => {
    limpiar()
    setAbierto(a.tipo === 'compilar' ? { tipo: 'compilar', id: t.id, plataforma: a.plataforma } : { tipo: a.tipo, id: t.id })
  }
  const listo = (mensaje: string) => { setAbierto(null); info(mensaje) }
  const tiendaAbierta = abierto ? tiendas.find(t => t.id === abierto.id) || null : null

  return (
    <Pagina
      resumen={
        <>
          {numero(resumen.total)} tiendas con app · {numero(resumen.solicitadas)} solicitadas · {numero(resumen.enCompilacion)} compilando
          {' · '}<span className={resumen.conError > 0 ? 'text-red-600' : undefined}>{numero(resumen.conError)} con error</span>
        </>
      }
    >
      <Pestanas
        valor={vista}
        onCambiar={id => setVista(id as Vista)}
        opciones={[
          { id: 'activas', etiqueta: `Activas ${activas.length}` },
          { id: 'completadas', etiqueta: `Completadas ${completadas.length}` },
          { id: 'todas', etiqueta: `Todas ${tiendas.length}` },
        ]}
      />

      {nota && <Aviso tipo={nota.tipo}>{nota.texto}</Aviso>}
      {errorCarga && <Aviso tipo="error">No se pudieron leer las tiendas: {errorCarga}</Aviso>}

      <Seccion sinRelleno>
        {cargando ? <Cargando /> : <TablaApps tiendas={visibles} vacio={vacio} onAccion={alAccionar} />}
      </Seccion>

      <p className="text-[11.5px] text-gray-500">
        Activas: solicitudes y builds en curso. Completadas: publicadas en Play Store / App Store. Todas: incluye las descartadas.
        Los builds corren en GitHub Actions y se actualizan aquí solos.
      </p>

      {abierto && tiendaAbierta && abierto.tipo === 'compilar' && (
        <CompilarModal tienda={tiendaAbierta} plataforma={abierto.plataforma} onClose={() => setAbierto(null)} onListo={listo} />
      )}
      {abierto && tiendaAbierta && abierto.tipo === 'publicar' && (
        <PublicarModal tienda={tiendaAbierta} onClose={() => setAbierto(null)} onListo={listo} />
      )}
      {abierto && tiendaAbierta && abierto.tipo === 'descartar' && (
        <DescartarModal tienda={tiendaAbierta} onClose={() => setAbierto(null)} onListo={listo} />
      )}
      {abierto && tiendaAbierta && abierto.tipo === 'datos' && (
        <DatosTiendaModal tienda={tiendaAbierta} onClose={() => setAbierto(null)} />
      )}
    </Pagina>
  )
}
