import { useState } from 'react'
import { Aviso, Boton, Campo, Casilla, Entrada, Modal } from '../ui'
import { mensajeError, postAdmin, type TiendaApp } from './comun'

/**
 * URLs de descarga (Play Store y App Store) en un solo modal: se pega una o
 * las dos, y se puede editar cualquiera después sin tocar la otra. Se puede
 * usar aunque el build no esté listo: los artefactos de GitHub Actions
 * caducan (~90 días) y eso no debe impedir guardar el link que el dueño ya
 * tiene publicado.
 */
export default function PublicarModal({ tienda, onClose, onListo }: {
  tienda: TiendaApp
  onClose: () => void
  onListo: (mensaje: string) => void
}) {
  const cfg = tienda.appConfig
  const [android, setAndroid] = useState(cfg?.androidUrl || '')
  const [ios, setIos] = useState(cfg?.iosUrl || '')
  // La primera vez se asume prueba cerrada (casi todas empiezan ahí); después
  // se respeta lo guardado y solo hay que desmarcar al pasar a producción.
  const [enPrueba, setEnPrueba] = useState(cfg?.androidIsTesting ?? !cfg?.androidUrl)
  const [avisarDueno, setAvisarDueno] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const a = android.trim()
  const i = ios.trim()

  const guardar = async () => {
    if (!a && !i) { setError('Pega al menos un URL (Play Store o App Store)'); return }
    setGuardando(true)
    setError(null)
    try {
      await postAdmin('/api/admin-mark-app-published', {
        storeId: tienda.id,
        ...(a && { androidUrl: a }),
        ...(i && { iosUrl: i }),
        // Siempre se manda el flag para que desmarcarlo (paso a producción)
        // se guarde aunque el URL no cambie.
        androidIsTesting: !!a && enPrueba,
        notifyOwner: avisarDueno,
      })
      onListo(`${tienda.name} marcada como publicada`)
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      titulo="URLs de descarga"
      subtitulo={tienda.name}
      onClose={() => { if (!guardando) onClose() }}
      pie={<>
        <Boton onClick={onClose} disabled={guardando}>Cancelar</Boton>
        <Boton variante="primario" onClick={guardar} cargando={guardando} disabled={!a && !i}>Guardar</Boton>
      </>}
    >
      <div className="space-y-4">
        {error && <Aviso tipo="error">{error}</Aviso>}
        <div>
          <Campo etiqueta="URL de Play Store (Android)" ayuda="Cópiala de Play Console → Ficha de tienda principal.">
            <Entrada type="url" value={android} onChange={e => setAndroid(e.target.value)} placeholder="https://play.google.com/store/apps/details?id=..." />
          </Campo>
          {a && (
            <div className="mt-2">
              <Casilla etiqueta="Es un URL de prueba cerrada" checked={enPrueba} onChange={e => setEnPrueba(e.target.checked)} />
              <p className="text-[11.5px] text-gray-500 mt-0.5 ml-5">Márcalo si el link todavía apunta a una pista de prueba y no a la ficha pública. Desmárcalo cuando la app ya esté en producción.</p>
            </div>
          )}
        </div>
        <Campo etiqueta="URL de App Store (iOS)" ayuda="Cópiala de App Store Connect → Mis apps → URL pública.">
          <Entrada type="url" value={ios} onChange={e => setIos(e.target.value)} placeholder="https://apps.apple.com/app/id..." />
        </Campo>
        <p className="text-[11.5px] text-gray-500">Al menos un URL es obligatorio. Deja el otro en blanco si la app aún no está en esa tienda.</p>
        <div>
          <Casilla etiqueta="Enviar email al dueño" checked={avisarDueno} onChange={e => setAvisarDueno(e.target.checked)} />
          <p className="text-[11.5px] text-gray-500 mt-0.5 ml-5">Le llega un aviso con los links de descarga.</p>
        </div>
      </div>
    </Modal>
  )
}
