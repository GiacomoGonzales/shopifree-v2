import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { useLanguage } from '../../../hooks/useLanguage'
import { chatService, type Chat, type ChatMessage } from '../../../lib/chatService'
import { uploadImage as subirArchivo } from '../../../utils/uploadImage'
import { Aviso, Boton, Modal } from '../ui'
import Mensajes from './Mensajes'
import Respuesta, { type EnvioFallido } from './Respuesta'
import VisorImagenes from './VisorImagenes'
import Avatar from './Avatar'
import { idImagen, type ImagenPendiente, type InfoTienda } from './utilidades'

/**
 * Una conversación abierta. Se monta con key = id del chat, así que cambiar
 * de chat reinicia todo lo efímero (texto, imágenes en cola, envío fallido,
 * scroll) sin efectos de limpieza: lo de un chat no se cuela en otro.
 */
export default function Conversacion({ chat, tienda, onVolver, onCerrado }: {
  chat: Chat
  tienda: InfoTienda | null | undefined
  onVolver: () => void
  onCerrado: () => void
}) {
  const { firebaseUser } = useAuth()
  const { localePath } = useLanguage()
  // El documento del chat en vivo (IA pausada, escalado, leído por el cliente).
  const [vivo, setVivo] = useState<Chat>(chat)
  const [mensajes, setMensajes] = useState<ChatMessage[]>([])
  const [texto, setTexto] = useState('')
  const [imagenes, setImagenes] = useState<ImagenPendiente[]>([])
  const [enviando, setEnviando] = useState(false)
  const [fallido, setFallido] = useState<EnvioFallido | null>(null)
  const [pausando, setPausando] = useState(false)
  const [confirmarCierre, setConfirmarCierre] = useState(false)
  const [cerrando, setCerrando] = useState(false)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)
  const [arrastrando, setArrastrando] = useState(false)
  const [visor, setVisor] = useState<string | null>(null)
  const [hayNuevo, setHayNuevo] = useState(false)
  const refFin = useRef<HTMLDivElement>(null)
  const [foco, setFoco] = useState(0)
  // Si estabas cerca del final, un mensaje nuevo baja solo; si estabas
  // leyendo arriba, aparece "Nuevo mensaje" y no te mueve. Es ref (no estado)
  // porque se lee sincrónicamente en el efecto de mensajes.
  const cercaDelFinal = useRef(true)
  // dragenter/dragleave saltan también en cada hijo: contar la profundidad
  // evita que el aviso de "soltar" parpadee al pasar sobre una burbuja.
  const profundidad = useRef(0)

  useEffect(() => {
    const a = chatService.subscribeToMessages(chat.id, setMensajes)
    const b = chatService.subscribeToChat(chat.id, c => { if (c) setVivo(c) })
    return () => { a(); b() }
  }, [chat.id])

  useEffect(() => {
    if (cercaDelFinal.current) refFin.current?.scrollIntoView({ behavior: mensajes.length ? 'smooth' : 'auto' })
    else setHayNuevo(true)
    // Llega un mensaje del cliente con el chat abierto: queda leído.
    const ult = mensajes[mensajes.length - 1]
    if (ult?.senderType === 'user') chatService.markAsRead(chat.id, 'admin')
  }, [mensajes, chat.id])

  const urlsImagenes = useMemo(() => mensajes.flatMap(m => m.imageUrls ?? []), [mensajes])

  const alDesplazar = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    cercaDelFinal.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    if (cercaDelFinal.current) setHayNuevo(false)
  }

  const irAlFinal = () => {
    refFin.current?.scrollIntoView({ behavior: 'smooth' })
    cercaDelFinal.current = true
    setHayNuevo(false)
  }

  const subir = async (archivo: File) => {
    const id = idImagen()
    const preview = URL.createObjectURL(archivo)
    setImagenes(prev => [...prev, { id, preview, url: null, subiendo: true }])
    try {
      const url = await subirArchivo(archivo, { folder: 'chat' })
      if (!url) throw new Error('Subida rechazada')
      setImagenes(prev => prev.map(p => (p.id === id ? { ...p, url, subiendo: false } : p)))
    } catch (err) {
      // Se quita la miniatura rota en vez de dejarla en la cola.
      console.error('Error subiendo imagen:', err)
      URL.revokeObjectURL(preview)
      setImagenes(prev => prev.filter(p => p.id !== id))
    }
  }

  const quitarImagen = (id: string) => setImagenes(prev => {
    const p = prev.find(x => x.id === id)
    if (p) URL.revokeObjectURL(p.preview)
    return prev.filter(x => x.id !== id)
  })

  const alPegar = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    let pegada = false
    for (const item of items) {
      if (!item.type.startsWith('image/')) continue
      const f = item.getAsFile()
      if (!f) continue
      if (!pegada) e.preventDefault()
      pegada = true
      subir(f)
    }
  }

  const alSoltar = (e: React.DragEvent) => {
    e.preventDefault()
    profundidad.current = 0
    setArrastrando(false)
    Array.from(e.dataTransfer.files || []).forEach(f => { if (f.type.startsWith('image/')) subir(f) })
  }

  const enviar = useCallback(async (reintento?: EnvioFallido) => {
    const msg = (reintento ? reintento.text : texto).trim()
    const urls = reintento ? (reintento.imageUrls ?? []) : imagenes.filter(p => p.url).map(p => p.url as string)
    if ((!msg && urls.length === 0) || !firebaseUser || enviando) return
    if (!reintento) {
      setTexto('')
      // Se liberan los blobs de las miniaturas; las URLs de R2 siguen.
      setImagenes(prev => { prev.forEach(p => URL.revokeObjectURL(p.preview)); return [] })
    }
    setEnviando(true)
    try {
      await chatService.sendMessage(chat.id, msg || (urls.length > 0 ? 'Imagen' : ''), firebaseUser.uid, 'admin', urls.length > 0 ? urls : undefined)
      // Responder resuelve la escalación de Sofía.
      if (vivo.escalated) await chatService.clearEscalation(chat.id)
      setFallido(null)
    } catch (err) {
      console.error('Error enviando mensaje:', err)
      setFallido({ text: msg, imageUrls: urls.length > 0 ? urls : undefined })
    } finally {
      setEnviando(false)
      setFoco(f => f + 1)
    }
  }, [texto, imagenes, firebaseUser, enviando, chat.id, vivo.escalated])

  const alternarIA = async () => {
    if (pausando) return
    setPausando(true)
    setErrorAccion(null)
    try {
      await chatService.toggleAIPause(chat.id, !vivo.aiPaused)
    } catch (err) {
      setErrorAccion(`No se pudo ${vivo.aiPaused ? 'reanudar' : 'pausar'} la IA: ${err instanceof Error ? err.message : 'error'}`)
    } finally {
      setPausando(false)
    }
  }

  const cerrarChat = async () => {
    setCerrando(true)
    setErrorAccion(null)
    try {
      await chatService.closeChat(chat.id)
      setConfirmarCierre(false)
      onCerrado()
    } catch (err) {
      setConfirmarCierre(false)
      setErrorAccion(`No se pudo cerrar el chat: ${err instanceof Error ? err.message : 'error'}`)
    } finally {
      setCerrando(false)
    }
  }

  return (
    <div
      onDrop={alSoltar}
      onDragEnter={e => { e.preventDefault(); if (++profundidad.current === 1) setArrastrando(true) }}
      onDragOver={e => e.preventDefault()}
      onDragLeave={e => { e.preventDefault(); if (--profundidad.current <= 0) { profundidad.current = 0; setArrastrando(false) } }}
      onPaste={alPegar}
      className={`flex-1 min-w-0 flex flex-col bg-gray-50 relative ${arrastrando ? 'ring-2 ring-inset ring-blue-500' : ''}`}
    >
      {arrastrando && (
        <div className="absolute inset-0 z-10 bg-blue-50/70 flex items-center justify-center pointer-events-none">
          <span className="rounded-md border border-blue-200 bg-white px-3 py-1.5 text-[12.5px] text-blue-700">Suelta la imagen aquí</span>
        </div>
      )}

      <div className="flex items-center gap-2.5 px-3 py-2 border-b border-gray-200 bg-white">
        <button type="button" onClick={onVolver} className="lg:hidden text-[12.5px] text-blue-700 pr-1">← Chats</button>
        <Avatar logo={tienda?.logo} nombre={vivo.storeName} tamano="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5 min-w-0">
            <Link to={localePath(`/admin/tiendas/${vivo.storeId}`)} className="text-[13px] font-medium text-gray-900 hover:underline truncate">{vivo.storeName}</Link>
            {tienda?.plan && <span className="text-[11.5px] text-gray-500 capitalize shrink-0">{tienda.plan}</span>}
            {tienda?.country && <span className="text-[11.5px] text-gray-500 shrink-0">· {tienda.country}</span>}
          </div>
          <div className="flex items-center gap-1.5 text-[11.5px] text-gray-500 min-w-0">
            <span className="truncate">{vivo.userEmail}</span>
            {tienda?.subdomain && (
              <>
                <span>·</span>
                <a href={`https://${tienda.subdomain}.shopifree.app`} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline truncate">{tienda.subdomain}</a>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="hidden sm:inline text-[11.5px] text-gray-500 mr-1">IA {vivo.aiPaused ? 'pausada' : 'activa'}</span>
          <Boton tamano="sm" onClick={alternarIA} disabled={pausando}>{vivo.aiPaused ? 'Reanudar IA' : 'Pausar IA'}</Boton>
          <Boton tamano="sm" variante="peligro" onClick={() => setConfirmarCierre(true)}>Cerrar chat</Boton>
        </div>
      </div>

      {vivo.escalated && vivo.escalationReason && (
        <div className="px-3 py-1.5 border-b border-gray-200 bg-white text-[12px] text-gray-700">
          <span className="font-medium text-gray-900">Escalado por Sofía:</span> {vivo.escalationReason}
        </div>
      )}
      {errorAccion && <Aviso tipo="error" className="m-2">{errorAccion}</Aviso>}

      <div className="flex-1 overflow-y-auto px-3 py-2" onScroll={alDesplazar}>
        <div className="max-w-2xl mx-auto">
          <Mensajes mensajes={mensajes} leidoPorUsuario={vivo.unreadByUser === 0} onImagen={setVisor} />
          <div ref={refFin} />
        </div>
      </div>

      {hayNuevo && (
        <button type="button" onClick={irAlFinal} className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 h-7 px-3 rounded-full bg-blue-600 text-white text-[12px] hover:bg-blue-700">
          Nuevo mensaje ↓
        </button>
      )}

      <Respuesta
        texto={texto}
        onTexto={setTexto}
        imagenes={imagenes}
        onQuitarImagen={quitarImagen}
        onElegirArchivos={fs => Array.from(fs).forEach(subir)}
        enviando={enviando}
        fallido={fallido}
        onReintentar={() => fallido && enviar(fallido)}
        onDescartarFallido={() => setFallido(null)}
        onEnviar={() => enviar()}
        foco={foco}
      />

      {visor && <VisorImagenes urls={urlsImagenes} actual={visor} onCambiar={setVisor} onCerrar={() => setVisor(null)} />}

      {confirmarCierre && (
        <Modal
          titulo="Cerrar chat"
          subtitulo={vivo.storeName}
          ancho="sm"
          onClose={() => { if (!cerrando) setConfirmarCierre(false) }}
          pie={<>
            <Boton onClick={() => setConfirmarCierre(false)} disabled={cerrando}>Cancelar</Boton>
            <Boton variante="peligro" onClick={cerrarChat} cargando={cerrando}>Cerrar chat</Boton>
          </>}
        >
          <p className="text-[12.5px] text-gray-700">La conversación pasa a Cerrados. Si el dueño vuelve a escribir, se abre un chat nuevo.</p>
        </Modal>
      )}
    </div>
  )
}
