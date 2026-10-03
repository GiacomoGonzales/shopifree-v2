import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { chatService, type Chat } from '../../../lib/chatService'
import Conversacion from './Conversacion'
import ListaChats, { type FiltroChats } from './ListaChats'
import { sonarAlerta, type InfoTienda } from './utilidades'

const CLAVE_SILENCIO = 'supportChatsAudioMuted'

/**
 * Bandeja de los chats de soporte con Sofía (antes /dashboard/support-chats,
 * con colores propios). Lista a la izquierda, conversación a la derecha; en
 * el celular, una u otra.
 *
 * Lecturas: un listener sobre los chats activos, dos por la conversación
 * abierta (mensajes y documento), los cerrados se leen a pedido (últimos 50)
 * y cada tienda con chat se lee una sola vez (logo, plan, país).
 */
export default function ChatsSoporte() {
  const [chats, setChats] = useState<Chat[]>([])
  const [seleccionado, setSeleccionado] = useState<Chat | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<FiltroChats>('all')
  const [cerrados, setCerrados] = useState<Chat[]>([])
  const [cargandoCerrados, setCargandoCerrados] = useState(false)
  const [tiendas, setTiendas] = useState<Record<string, InfoTienda | null>>({})
  const pedidas = useRef<Set<string>>(new Set())
  const [silenciado, setSilenciado] = useState(() => {
    try { return localStorage.getItem(CLAVE_SILENCIO) === '1' } catch { return false }
  })
  const noLeidosAntes = useRef(-1) // -1 = primera carga, sin alerta
  const alarma = useRef<ReturnType<typeof setInterval> | null>(null)

  const pararAlerta = useCallback(() => {
    if (alarma.current) { clearInterval(alarma.current); alarma.current = null }
  }, [])

  const sonar = useCallback(() => {
    if (silenciado || alarma.current) return
    sonarAlerta()
    alarma.current = setInterval(sonarAlerta, 3500) // repite hasta que se lea
  }, [silenciado])

  // Silenciar corta en el acto la campanilla que esté sonando.
  useEffect(() => {
    try { localStorage.setItem(CLAVE_SILENCIO, silenciado ? '1' : '0') } catch { /* sin storage */ }
    if (silenciado) pararAlerta()
  }, [silenciado, pararAlerta])

  // Chats activos (escalados primero) y alerta cuando sube el total sin leer.
  useEffect(() => {
    const desuscribir = chatService.subscribeToChats(todos => {
      const ordenados = [...todos].sort((a, b) => Number(b.escalated) - Number(a.escalated))
      setChats(ordenados)
      const total = ordenados.reduce((s, c) => s + c.unreadByAdmin, 0)
      if (noLeidosAntes.current >= 0 && total > noLeidosAntes.current) sonar()
      if (total === 0) pararAlerta()
      noLeidosAntes.current = total
    })
    return () => { desuscribir(); pararAlerta() }
  }, [sonar, pararAlerta])

  // Los cerrados se vuelven a leer cada vez que se entra al filtro (quedan
  // al día tras cerrar uno) sin mantener un listener sobre todo el historial.
  const pedidoCerrados = useRef(0)
  const cambiarFiltro = (f: FiltroChats) => {
    setFiltro(f)
    if (f !== 'closed') return
    const n = ++pedidoCerrados.current
    setCargandoCerrados(true)
    chatService.getClosedChats(50)
      .then(lista => { if (n === pedidoCerrados.current) setCerrados(lista) })
      .catch(err => console.error('Error leyendo chats cerrados:', err))
      .finally(() => { if (n === pedidoCerrados.current) setCargandoCerrados(false) })
  }

  // Datos de la tienda de cada chat: una lectura por tienda, sin listener
  // (logo, plan y país casi no cambian durante una sesión de soporte).
  useEffect(() => {
    const ids = Array.from(new Set([...chats, ...cerrados].map(c => c.storeId))).filter(id => id && !pedidas.current.has(id))
    if (ids.length === 0) return
    ids.forEach(id => pedidas.current.add(id))
    let cancelado = false
    Promise.all(ids.map(async id => {
      try {
        const snap = await getDoc(doc(db, 'stores', id))
        if (!snap.exists()) return [id, null] as const
        const d = snap.data()
        const loc = (d.location || {}) as { country?: string }
        return [id, { logo: d.logo, subdomain: d.subdomain, plan: d.plan, country: d.country || loc.country }] as const
      } catch {
        pedidas.current.delete(id) // se reintenta en la próxima actualización
        return [id, null] as const
      }
    })).then(res => {
      if (cancelado) return
      setTiendas(prev => {
        const sig = { ...prev }
        for (const [id, info] of res) sig[id] = info
        return sig
      })
    })
    return () => { cancelado = true }
  }, [chats, cerrados])

  // Abrir un chat lo marca leído; si los únicos sin leer eran de ese chat, se
  // corta la campanilla.
  const idSel = seleccionado?.id
  useEffect(() => {
    if (!idSel) return
    chatService.markAsRead(idSel, 'admin')
  }, [idSel])
  useEffect(() => {
    if (!idSel) return
    const resto = chats.reduce((s, c) => s + (c.id === idSel ? 0 : c.unreadByAdmin), 0)
    if (resto === 0) pararAlerta()
  }, [idSel, chats, pararAlerta])

  const visibles = useMemo(() => {
    let r = filtro === 'closed' ? cerrados
      : filtro === 'unread' ? chats.filter(c => c.unreadByAdmin > 0)
      : filtro === 'escalated' ? chats.filter(c => c.escalated)
      : filtro === 'paused' ? chats.filter(c => c.aiPaused)
      : chats
    const q = busqueda.trim().toLowerCase()
    if (q) r = r.filter(c => c.storeName.toLowerCase().includes(q) || c.userEmail.toLowerCase().includes(q) || (c.lastMessage || '').toLowerCase().includes(q))
    return r
  }, [chats, cerrados, filtro, busqueda])

  const conteos = useMemo(() => ({
    all: chats.length,
    unread: chats.filter(c => c.unreadByAdmin > 0).length,
    escalated: chats.filter(c => c.escalated).length,
    paused: chats.filter(c => c.aiPaused).length,
    closed: cerrados.length,
  }), [chats, cerrados])

  const abierto = seleccionado !== null

  return (
    // Alto fijo para que la lista y la conversación tengan su propio scroll:
    // pantalla menos cabecera, márgenes y pestañas.
    <div className="flex min-h-[420px] h-[calc(100dvh-10rem)] lg:h-[calc(100dvh-9.5rem)] bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className={`w-full lg:w-80 lg:shrink-0 lg:border-r border-gray-200 flex-col ${abierto ? 'hidden lg:flex' : 'flex'}`}>
        <ListaChats
          chats={visibles}
          totalActivos={chats.length}
          totalCerrados={cerrados.length}
          conteos={conteos}
          filtro={filtro}
          onFiltro={cambiarFiltro}
          busqueda={busqueda}
          onBusqueda={setBusqueda}
          cargandoCerrados={cargandoCerrados}
          seleccionado={idSel ?? null}
          onSeleccionar={setSeleccionado}
          tiendas={tiendas}
          silenciado={silenciado}
          onSilenciar={() => setSilenciado(s => !s)}
        />
      </div>
      <div className={`flex-1 min-w-0 ${abierto ? 'flex' : 'hidden lg:flex'}`}>
        {seleccionado ? (
          <Conversacion
            key={seleccionado.id}
            chat={seleccionado}
            tienda={tiendas[seleccionado.storeId]}
            onVolver={() => setSeleccionado(null)}
            onCerrado={() => setSeleccionado(null)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 bg-gray-50">
            <p className="text-[12.5px] font-medium text-gray-700">Elige una conversación</p>
            <p className="text-[12px] text-gray-500 mt-0.5">Selecciona un chat de la lista para responder.</p>
          </div>
        )}
      </div>
    </div>
  )
}
