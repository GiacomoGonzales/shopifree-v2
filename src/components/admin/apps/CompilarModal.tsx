import { useState } from 'react'
import { Aviso, Boton, Campo, Entrada, Modal } from '../ui'
import { buildDe, mensajeError, postAdmin, type Plataforma, type TiendaApp } from './comun'

/**
 * Encola un build (Android o iOS) en GitHub Actions. Antes la versión era un
 * campo suelto en cada fila; ahora se pide aquí, al compilar, y arranca con la
 * última versión de esa plataforma (o 1.0.0 si nunca compiló).
 */
export default function CompilarModal({ tienda, plataforma, onClose, onListo }: {
  tienda: TiendaApp
  plataforma: Plataforma
  onClose: () => void
  onListo: (mensaje: string) => void
}) {
  const [version, setVersion] = useState(buildDe(tienda, plataforma)?.versionName || '1.0.0')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const nombre = plataforma === 'ios' ? 'iOS' : 'Android'

  const compilar = async () => {
    setEnviando(true)
    setError(null)
    try {
      await postAdmin('/api/admin-trigger-app-build', {
        storeId: tienda.id,
        versionName: version.trim() || '1.0.0',
        platform: plataforma,
      })
      onListo(`Build ${nombre} encolado para ${tienda.name}`)
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal
      titulo={`Generar build ${nombre}`}
      subtitulo={tienda.name}
      ancho="sm"
      onClose={() => { if (!enviando) onClose() }}
      pie={<>
        <Boton onClick={onClose} disabled={enviando}>Cancelar</Boton>
        <Boton variante="primario" onClick={compilar} cargando={enviando}>Generar</Boton>
      </>}
    >
      <div className="space-y-3">
        {error && <Aviso tipo="error">{error}</Aviso>}
        <Campo etiqueta="Versión" ayuda={`Corre en GitHub Actions y deja el ${plataforma === 'ios' ? 'IPA' : 'AAB'} firmado. El número de build sube solo.`}>
          <Entrada value={version} onChange={e => setVersion(e.target.value)} placeholder="1.0.0" className="tabular-nums" />
        </Campo>
      </div>
    </Modal>
  )
}
