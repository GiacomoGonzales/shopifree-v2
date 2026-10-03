import { useState, type ReactNode } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { uploadImage } from '../../../utils/uploadImage'
import { Aviso, Boton, Modal } from '../ui'
import { graficoFunciones, icono512, mensajeError, nombrePaquete, postAdmin, type TiendaApp } from './comun'

/**
 * Datos para Play Console: todo lo que se pega al registrar la app de una
 * tienda, sin ir y venir entre Firestore y el WhatsApp del dueño. Recibe la
 * tienda viva (del listener de la página), así que cuando terminan las
 * capturas o cambia el ícono el modal abierto se actualiza solo.
 */
export default function DatosTiendaModal({ tienda, onClose }: { tienda: TiendaApp; onClose: () => void }) {
  const [copiado, setCopiado] = useState<string | null>(null)
  const [subiendoIcono, setSubiendoIcono] = useState(false)
  const [pidiendoCapturas, setPidiendoCapturas] = useState(false)
  const [nota, setNota] = useState<{ tipo: 'info' | 'error'; texto: string } | null>(null)

  const cfg = tienda.appConfig
  const testers = cfg?.publishInfo?.testers ?? []
  const icono = cfg?.icon
  const nombreApp = cfg?.appName || tienda.name
  const paquete = nombrePaquete(tienda.subdomain)
  const privacidad = `https://${tienda.subdomain}.shopifree.app/privacy`
  const grafico = graficoFunciones(icono, cfg?.primaryColor, cfg?.splashColor)
  const capturas = cfg?.screenshots
  const estadoCapturas = capturas?.status || 'idle'
  // Solo 'running' bloquea: 'queued' puede quedar colgado si el dispatch se
  // perdió (deploy de Vercel a mitad del clic, workflow muerto antes de
  // escribir su estado) y el operador no debe quedar esperando para siempre.
  const capturasOcupadas = estadoCapturas === 'running'
  const urlsCapturas = capturas?.urls ?? []

  const copiar = async (texto: string, campo: string) => {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(campo)
      setTimeout(() => setCopiado(c => (c === campo ? null : c)), 1500)
    } catch {
      setNota({ tipo: 'error', texto: 'No se pudo copiar al portapapeles' })
    }
  }

  // Cambia el ícono cuando el dueño manda uno nuevo por chat o correo en vez de
  // subirlo en Mi App. Mismo destino y formato que MiApp.tsx (PNG en
  // shopifree/app-icons) para que el build y el 512×512 lo tomen igual.
  const cambiarIcono = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return
    setSubiendoIcono(true)
    setNota(null)
    try {
      const url = await uploadImage(archivo, { folder: 'shopifree/app-icons', mimeType: 'image/png' })
      await updateDoc(doc(db, 'stores', tienda.id), { 'appConfig.icon': url })
      setNota({ tipo: 'info', texto: 'Ícono actualizado' })
    } catch (err) {
      setNota({ tipo: 'error', texto: `No se pudo cambiar el ícono: ${mensajeError(err)}` })
    } finally {
      setSubiendoIcono(false)
    }
  }

  const generarCapturas = async () => {
    setPidiendoCapturas(true)
    setNota(null)
    try {
      await postAdmin('/api/admin-trigger-screenshot', { storeId: tienda.id })
      setNota({ tipo: 'info', texto: 'Generando capturas en GitHub Actions (~3 min). Aparecen aquí solas.' })
    } catch (err) {
      setNota({ tipo: 'error', texto: mensajeError(err) })
    } finally {
      setPidiendoCapturas(false)
    }
  }

  const botonCopiar = (texto: string, campo: string, etiqueta = 'Copiar') => (
    <Boton variante="enlace" tamano="sm" onClick={() => copiar(texto, campo)} className="shrink-0">
      {copiado === campo ? 'Copiado' : etiqueta}
    </Boton>
  )

  const fila = (etiqueta: string, valor: string | undefined, campo: string, mono = false) => (
    <div className="flex items-center justify-between gap-3 py-1 border-b border-gray-100 last:border-0">
      <span className="w-40 shrink-0 text-[12px] text-gray-500">{etiqueta}</span>
      <span className={`min-w-0 flex-1 truncate text-[12.5px] ${valor ? 'text-gray-900' : 'text-gray-400'} ${mono ? 'font-mono text-[12px]' : ''}`} title={valor}>{valor || '—'}</span>
      {valor ? botonCopiar(valor, campo) : <span className="w-[52px]" />}
    </div>
  )

  return (
    <Modal titulo="Datos para Play Console" subtitulo={tienda.name} ancho="lg" onClose={onClose} pie={<Boton onClick={onClose}>Cerrar</Boton>}>
      <div className="space-y-5">
        {nota && <Aviso tipo={nota.tipo}>{nota.texto}</Aviso>}

        <Bloque titulo="Ícono de la app">
          {icono ? (
            <div className="flex items-center gap-3">
              <img src={icono} alt={nombreApp} className="w-16 h-16 rounded-lg object-cover border border-gray-200 shrink-0" />
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12.5px]">
                  <a href={icono512(icono)} target="_blank" rel="noopener noreferrer" download className="text-blue-700 hover:underline">Descargar 512×512 PNG</a>
                  <a href={icono} target="_blank" rel="noopener noreferrer" download className="text-blue-700 hover:underline">Original</a>
                </div>
                <p className="text-[11.5px] text-gray-500">El 512×512 es el que pide Play Console en Ficha de tienda → Ícono.</p>
              </div>
            </div>
          ) : (
            <p className="text-[12px] text-gray-500">No subió ícono. Al construir se usa el logo general de la tienda.</p>
          )}
          <label className={`mt-2 inline-flex h-7 items-center rounded-md border border-gray-300 bg-white px-2.5 text-[12px] font-medium text-gray-700 ${subiendoIcono ? 'opacity-50' : 'cursor-pointer hover:bg-gray-50'}`}>
            {subiendoIcono ? 'Subiendo…' : 'Cambiar ícono'}
            <input type="file" accept="image/*" onChange={cambiarIcono} disabled={subiendoIcono} className="hidden" />
          </label>
        </Bloque>

        <Bloque titulo="Gráfico de funciones (1024×500)">
          {grafico ? (
            <div className="space-y-1.5">
              <a href={grafico} target="_blank" rel="noopener noreferrer" className="block border border-gray-200 rounded-md overflow-hidden">
                <img src={grafico} alt={`${nombreApp}, gráfico de funciones`} className="w-full h-auto block" style={{ aspectRatio: '1024 / 500' }} />
              </a>
              <div className="flex items-start justify-between gap-3">
                <p className="text-[11.5px] text-gray-500">Sale del ícono y el color de marca. Se sube en Play Console → Ficha de tienda → Gráfico de funciones.</p>
                <a href={grafico} target="_blank" rel="noopener noreferrer" download className="shrink-0 text-[12.5px] text-blue-700 hover:underline">Descargar</a>
              </div>
            </div>
          ) : (
            <p className="text-[12px] text-gray-500">Sin ícono cargado no se puede generar el gráfico.</p>
          )}
        </Bloque>

        <Bloque titulo="App">
          {fila('Nombre', nombreApp, 'appName')}
          {fila('Package name', paquete, 'packageName', true)}
          {fila('Subdominio', tienda.subdomain, 'subdomain', true)}
          {fila('Política de privacidad', privacidad, 'privacyUrl', true)}
          <p className="text-[11.5px] text-gray-500 mt-1">Este URL va en Play Console → Política de privacidad.</p>
        </Bloque>

        <Bloque titulo="Contacto del dueño">
          {fila('Nombre', tienda.name, 'contactName')}
          {fila('Email', tienda.email, 'contactEmail')}
          {fila('Teléfono / WhatsApp', tienda.whatsapp, 'contactPhone')}
        </Bloque>

        <Bloque
          titulo="Capturas de pantalla (1080×2400)"
          accion={
            <Boton tamano="sm" onClick={generarCapturas} disabled={capturasOcupadas} cargando={pidiendoCapturas}>
              {capturasOcupadas ? 'Generando…' : urlsCapturas.length ? 'Regenerar' : 'Generar capturas'}
            </Boton>
          }
        >
          {estadoCapturas === 'failed' && capturas?.lastError && (
            <Aviso tipo="error" className="mb-2">
              Falló: {capturas.lastError}
              {capturas.runUrl && <> · <a href={capturas.runUrl} target="_blank" rel="noopener noreferrer" className="underline">ver logs</a></>}
            </Aviso>
          )}
          {urlsCapturas.length > 0 ? (
            <>
              <div className="grid grid-cols-4 gap-2">
                {urlsCapturas.map((url, i) => (
                  <a key={url} href={url} target="_blank" rel="noopener noreferrer" download title={`Captura ${i + 1}: clic para descargar`} className="aspect-[9/20] bg-gray-100 rounded-md overflow-hidden border border-gray-200 hover:border-gray-400">
                    <img src={url} alt={`Captura ${i + 1}`} className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
              <p className="mt-2 text-[11.5px] text-gray-500 tabular-nums">{urlsCapturas.length} capturas listas. Clic en cada una para descargarla; van en Play Console → Ficha de tienda → Capturas de teléfono.</p>
            </>
          ) : estadoCapturas === 'idle' ? (
            <p className="text-[12px] text-gray-500">Aún no se generaron. "Generar capturas" corre Playwright en GitHub Actions sobre la tienda en vivo (~3 min).</p>
          ) : estadoCapturas === 'queued' || estadoCapturas === 'running' ? (
            <p className="text-[12px] text-gray-500">{estadoCapturas === 'queued' ? 'En cola…' : 'Generando…'}</p>
          ) : null}
        </Bloque>

        <Bloque
          titulo={`Testers (${testers.length})`}
          accion={testers.length > 0 ? botonCopiar(testers.join(', '), 'allTesters', 'Copiar todos') : undefined}
        >
          {testers.length === 0 ? (
            <p className="text-[12px] text-gray-500">El dueño no agregó correos de testers.</p>
          ) : (
            <ul>
              {testers.map(email => (
                <li key={email} className="flex items-center justify-between gap-2 py-0.5 border-b border-gray-100 last:border-0">
                  <span className="truncate font-mono text-[12px] text-gray-700">{email}</span>
                  {botonCopiar(email, `tester-${email}`)}
                </li>
              ))}
            </ul>
          )}
        </Bloque>
      </div>
    </Modal>
  )
}

function Bloque({ titulo, accion, children }: { titulo: string; accion?: ReactNode; children?: ReactNode }) {
  return (
    <section>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <h3 className="text-[12px] font-semibold text-gray-900">{titulo}</h3>
        {accion}
      </div>
      {children}
    </section>
  )
}
