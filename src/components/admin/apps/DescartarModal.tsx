import { useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { Aviso, Boton, Modal } from '../ui'
import { mensajeError, type TiendaApp } from './comun'

/**
 * Descartar = appConfig.status a 'none'. La saca de Activas/Completadas; la
 * configuración (colores, nombre, ícono), los builds y las URLs quedan
 * intactos y el dueño puede volver a pedirla. Antes era un window.confirm.
 */
export default function DescartarModal({ tienda, onClose, onListo }: {
  tienda: TiendaApp
  onClose: () => void
  onListo: (mensaje: string) => void
}) {
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const estado = tienda.appConfig?.status

  const explicacion =
    estado === 'requested' ? 'El dueño podrá volver a pedirla cuando quiera. La configuración (colores, nombre, ícono) se conserva.'
    : estado === 'building' ? 'Está en construcción. Se quita del listado, pero los builds en curso siguen; si hay que cortarlos, hazlo desde GitHub Actions.'
    : estado === 'published' ? 'Está publicada. Solo se quita del listado del admin: la app sigue en Play Store / App Store con sus URLs; esto no la baja de las tiendas.'
    : 'Se quita del listado. La configuración y los builds previos se conservan.'

  const descartar = async () => {
    setEnviando(true)
    setError(null)
    try {
      await updateDoc(doc(db, 'stores', tienda.id), { 'appConfig.status': 'none' })
      onListo(`"${tienda.name}" descartada`)
    } catch (err) {
      setError(mensajeError(err))
      setEnviando(false)
    }
  }

  return (
    <Modal
      titulo="Descartar app"
      subtitulo={tienda.name}
      ancho="sm"
      onClose={() => { if (!enviando) onClose() }}
      pie={<>
        <Boton onClick={onClose} disabled={enviando}>Cancelar</Boton>
        <Boton variante="peligro" onClick={descartar} cargando={enviando}>Descartar</Boton>
      </>}
    >
      <div className="space-y-3">
        {error && <Aviso tipo="error">{error}</Aviso>}
        <p className="text-[12.5px] text-gray-700">{explicacion}</p>
        <p className="text-[12px] text-gray-500">Seguirá visible en la pestaña Todas.</p>
      </div>
    </Modal>
  )
}
