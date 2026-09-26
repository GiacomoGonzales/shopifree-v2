/**
 * Una conversación de ShopiChat: el hilo, las burbujas y el cuadro de
 * escribir. Portado de la bandeja de Cobrify (pages/Chat.jsx), que ya pasó por
 * meses de uso real; los comentarios explican el porqué de cada detalle.
 *
 * Se monta con `key={waId}`: al cambiar de conversación todo el estado propio
 * (lo escrito, la cita, los provisionales, el visor...) se reinicia solo.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { Order, Product, Store } from '../../types'
import type {
  WaConversation,
  WaConversationStatus,
  WaMedia,
  WaMessage,
  WaPendingMessage,
  WaQuickReply,
  WaTemplate,
  WaTemplatesDoc,
} from '../../types/shopichat'
import {
  ACCEPTED_FILES,
  ShopiChatApiError,
  canSendMime,
  clearUnread,
  dayKey,
  formatPhone,
  formatRemaining,
  formatTime,
  markRead,
  prepareMedia,
  react as reactToMessage,
  retryMedia,
  sendMedia,
  sendPreparedMedia,
  sendProductCard,
  sendTemplate,
  sendText,
  sentMessageId,
  setConversationAiPaused,
  subscribeMessages,
  toDate,
  toMillis,
  validateFile,
  windowRemainingMs,
  type TemplateValues,
} from '../../lib/shopichatService'
import { useToast } from '../ui/Toast'
import { orderService } from '../../lib/firebase'
import { formatPrice } from '../../lib/currency'
import { ORDER_STATUS_COLORS } from '../../lib/orderStatus'
import { useLanguage } from '../../hooks/useLanguage'
import WhatsAppText from './WhatsAppText'
import MediaAlbum, { VideoPreview, VideoViewer } from './MediaAlbum'
import MediaViewer from './MediaViewer'
import PhotoEditor from './PhotoEditor'
import MediaPanel from './MediaPanel'
import ForwardSheet from './ForwardSheet'
import TemplatePicker from './TemplatePicker'
import CustomerPanel from './CustomerPanel'
import ProductPicker from './ProductPicker'
import CouponPicker from './CouponPicker'
import ChatOrderModal from './ChatOrderModal'
import AiAssist from './AiAssist'
import { invalidateStoreOrders, useCustomerOrders, useLiveOrders } from './storeData'
import { canPayOnline, isOnlineMethod, methodLabel, orderSummaryText, payLinkFor, productCaption, productImage } from './sell'
import { VoiceNote, VoiceNoteBar } from './VoiceNotes'
import { recordingClock, useVoiceRecorder } from './useVoiceRecorder'
import { labelColor } from './utils'
import {
  IconAlert, IconArrowDown, IconArrowLeft, IconCamera, IconCheck, IconCheckCheck, IconClock, IconFile,
  IconBag, IconBot, IconForward, IconLink, IconMapPin, IconMic, IconMore, IconNote, IconPaperclip, IconPencil, IconPlus, IconRefresh,
  IconReply, IconSearch, IconSend, IconSmilePlus, IconTag, IconTrash, IconUpload, IconUser, IconX,
} from './icons'

/**
 * Un entrante cuyo archivo todavía no está en R2. El webhook lo baja de Meta
 * justo después de guardar el mensaje: los primeros minutos es "cargando";
 * si el archivado falló (o nunca llegó), se ofrece reintentar ('retry-media').
 */
const ARCHIVE_GRACE_MS = 3 * 60 * 1000
function MissingMedia({ message, now, onRetry }: { message: WaMessage; now: number; onRetry: () => Promise<unknown> }) {
  const { t } = useTranslation('dashboard')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const media = message.media
  const canRetry = message.direction === 'in' && Boolean(media?.mediaId)
  const archiving = canRetry && !media?.archiveError && !failed && now - toMillis(message.timestamp) < ARCHIVE_GRACE_MS
  const typeLabel = t(`shopichat.types.${message.type}`)
  if (archiving || busy) {
    return (
      <p className="flex items-center gap-1.5 text-[13px] italic opacity-70 mb-1">
        <span className="inline-block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
        {t('shopichat.thread.mediaLoading', { type: typeLabel })}
      </p>
    )
  }
  return (
    <div className="flex items-center gap-2 mb-1">
      <p className="text-[13px] italic opacity-70">{t('shopichat.thread.mediaUnavailable', { type: typeLabel })}</p>
      {canRetry && (
        <button
          type="button"
          onClick={async () => {
            setBusy(true)
            try { await onRetry(); setFailed(false) } catch { setFailed(true) } finally { setBusy(false) }
          }}
          className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#0284C7] hover:underline"
        >
          <IconRefresh className="w-3 h-3" />{t('shopichat.common.retry')}
        </button>
      )}
    </div>
  )
}

/** Los cuatro de siempre, los que entran en una fila sin apretarse. */
const REACTION_EMOJIS = ['❤️', '👍', '😂', '🙏']
/** Tope de mensajes a reenviar juntos (cada uno es un envío aparte a Meta). */
const MAX_FORWARD = 30

// Lo último que se vio de cada conversación: al volver a ella las burbujas
// salen al instante mientras la suscripción se pone al día.
const seenThreads = new Map<string, WaMessage[]>()

// Medidas con las que se pinta una foto. La burbuja se CIÑE a la foto (como
// WhatsApp) y el espacio queda reservado antes de que baje: sin saltos.
const PHOTO_BORDER = 4
const MAX_W = 320
const MAX_H = 320
function photoSize(media?: { width?: number; height?: number } | null) {
  const { width, height } = media || {}
  if (!width || !height) return null
  return { width: Math.round(Math.min(MAX_W, width, (MAX_H * width) / height)), aspectRatio: `${width} / ${height}` }
}

// Fotos o videos seguidos, del mismo lado, del mismo día y con menos de cinco
// minutos entre sí van juntos en un álbum. Con pie, cita, reacción o a medio
// enviar se quedan solos: no pierden nada al juntarse.
const albumable = (m: WaMessage) =>
  (m.type === 'image' || m.type === 'video') && Boolean(m.media?.url) && !m.text && !m.replyTo
  && !m.reactions?.mine && !m.reactions?.customer && m.status !== 'pending' && m.status !== 'failed'
  && !(m as WaPendingMessage).local

function together(a: WaMessage, b: WaMessage) {
  if (!albumable(a) || !albumable(b) || a.direction !== b.direction) return false
  if (dayKey(a.timestamp) !== dayKey(b.timestamp)) return false
  return Math.abs(toMillis(b.timestamp) - toMillis(a.timestamp)) <= 5 * 60 * 1000
}

/**
 * Un momento de un pedido del cliente, intercalado en el hilo por fecha. NO es
 * un mensaje de WhatsApp: no se manda, solo lo ve el comerciante.
 */
interface OrderEvent { id: string; at: number; kind: 'created' | 'paid' | 'status'; order: Order }

type Element =
  | { kind: 'day'; id: string; label: string }
  | { kind: 'msg'; id: string; message: WaMessage; album?: WaMessage[] }
  | { kind: 'event'; id: string; event: OrderEvent }

/** Pedidos del cliente que se muestran en el hilo (los más recientes). */
const THREAD_ORDERS = 5
const ORDER_EVENTS_PREF = 'shopichat.orderEvents'

function readOrderEventsPref(): boolean {
  try { return localStorage.getItem(ORDER_EVENTS_PREF) !== '0' } catch { return true }
}

const msOf = (v: unknown): number => {
  if (!v) return 0
  const d = v instanceof Date ? v : new Date(v as string)
  return Number.isNaN(d.getTime()) ? 0 : d.getTime()
}

const localStamp = (d: Date) => ({ toDate: () => d, toMillis: () => d.getTime() })

interface ForwardItem { media: WaMedia | null; text: string; summary: string; sticker?: boolean }

interface Props {
  store: Store
  conversation: WaConversation
  conversations: WaConversation[]
  templates: WaTemplatesDoc
  quickReplies: WaQuickReply[]
  /** Asistente IA prendido (waSettings/automations.ai.enabled): muestra el botón ✨. */
  aiEnabled?: boolean
  /** Piloto automático prendido: muestra el interruptor "IA activa/pausada" de la conversación. */
  autopilot?: boolean
  allLabels: string[]
  now: number
  onBack: () => void
  onStatus: (status: WaConversationStatus) => void
  onOpenConversation: (waId: string) => void
}

export default function Thread({
  store, conversation, conversations, templates, quickReplies, aiEnabled, autopilot, allLabels, now, onBack, onStatus, onOpenConversation,
}: Props) {
  const { t, i18n } = useTranslation('dashboard')
  const { showToast } = useToast()
  const { localePath } = useLanguage()
  const storeId = store.id
  const waId = conversation.id
  const locale = i18n.language
  const displayName = conversation.name || formatPhone(conversation.waId)

  // ------------------------------------------------------------------ datos
  const [messages, setMessages] = useState<WaMessage[]>(() => seenThreads.get(waId) || [])
  const [loadingThread, setLoadingThread] = useState(() => !seenThreads.has(waId))
  const [threadError, setThreadError] = useState(false)
  const [pending, setPending] = useState<WaPendingMessage[]>([])

  useEffect(() => subscribeMessages(
    storeId,
    waId,
    list => {
      seenThreads.set(waId, list)
      setMessages(list)
      setLoadingThread(false)
    },
    () => { setThreadError(true); setLoadingThread(false) }
  ), [storeId, waId])

  // ------------------------------------------------------------ composición
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState<WaMessage | null>(null)
  const [attachment, setAttachment] = useState<File | null>(null)
  const [attachmentUrl, setAttachmentUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [suggestionIdx, setSuggestionIdx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const dragDepth = useRef(0)
  const recorder = useVoiceRecorder()
  const textBox = useRef<HTMLTextAreaElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)
  const [hasCamera] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches)
  // Los envíos salen DE A UNO y en orden: dos en paralelo pueden llegarle a
  // Meta al revés y el cliente vería los mensajes desordenados.
  const sendQueue = useRef<Promise<void>>(Promise.resolve())

  // ---------------------------------------------------------- interacción
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [paletteFor, setPaletteFor] = useState<string | null>(null)
  const [optimisticReactions, setOptimisticReactions] = useState<Record<string, { value: string; prev: string }>>({})
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [forwarding, setForwarding] = useState<{ items: ForwardItem[]; summary: string } | null>(null)
  const [sidePanel, setSidePanel] = useState<'customer' | 'media' | null>(() =>
    typeof window !== 'undefined' && window.matchMedia?.('(min-width: 1280px)').matches ? 'customer' : null
  )
  const [templateOpen, setTemplateOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [highlight, setHighlight] = useState<string | null>(null)
  const [headerMenu, setHeaderMenu] = useState(false)
  const [aiToggling, setAiToggling] = useState(false)
  const aiPaused = conversation.aiPaused === true
  const toggleAi = async () => {
    if (aiToggling) return
    setAiToggling(true)
    try {
      await setConversationAiPaused(storeId, waId, !aiPaused)
      showToast(t(aiPaused ? 'shopichat.ai.autopilot.resumed' : 'shopichat.ai.autopilot.paused'), 'success')
    } catch {
      showToast(t('shopichat.ai.autopilot.toggleError'), 'error')
    } finally {
      setAiToggling(false)
    }
  }
  const [awayFromBottom, setAwayFromBottom] = useState(false)

  // ------------------------------------------------------ vender desde el chat
  const [sellMenu, setSellMenu] = useState(false)
  const [productPicker, setProductPicker] = useState(false)
  const [couponPicker, setCouponPicker] = useState(false)
  const [orderModal, setOrderModal] = useState(false)
  // Tarjetas de producto que salen DESPUÉS del texto (las ofrece la IA).
  const [aiCards, setAiCards] = useState<Product[]>([])
  const [showOrderEvents, setShowOrderEvents] = useState(readOrderEventsPref)
  const { orders: customerOrders } = useCustomerOrders(storeId, conversation.phone || conversation.waId)
  const recentOrders = useMemo(() => customerOrders.slice(0, THREAD_ORDERS), [customerOrders])
  // En vivo: un pago confirmado por la pasarela aparece al instante (✅ Pagado).
  const liveOrders = useLiveOrders(storeId, showOrderEvents ? recentOrders : [])

  // ------------------------------------------------------------- ventana 24h
  const remaining = windowRemainingMs(conversation, now)
  const windowOpen = remaining > 0

  // ------------------------------------------------------------------ hilo
  // Un provisional desaparece en cuanto su mensaje real ya está: por el id que
  // devolvió la API o, si la API no lo devolvió, por el mismo texto/tipo.
  const visiblePending = useMemo(() => {
    const ids = new Set(messages.map(m => m.id))
    return pending.filter(p => {
      if (p.sentId) return !ids.has(p.sentId)
      if (p.status === 'failed' || p.status === 'pending') return true
      const at = toMillis(p.timestamp)
      return !messages.some(m => m.direction === 'out' && m.type === p.type && (m.text || '') === (p.text || '') && toMillis(m.timestamp) >= at - 60000)
    })
  }, [messages, pending])

  const thread = useMemo<WaMessage[]>(
    () => [...messages.filter(m => m.type !== 'reaction'), ...visiblePending],
    [messages, visiblePending]
  )

  const byId = useMemo(() => {
    const map = new Map<string, WaMessage>()
    for (const m of thread) map.set(m.id, m)
    return map
  }, [thread])

  // Los pedidos del cliente como momentos del hilo: creado, pagado y su
  // estado actual (el pedido no guarda historial, así que el cambio de estado
  // se fecha con su última actualización).
  const orderEvents = useMemo<OrderEvent[]>(() => {
    if (!showOrderEvents) return []
    const out: OrderEvent[] = []
    for (const o of liveOrders) {
      const created = msOf(o.createdAt)
      if (created) out.push({ id: `ord-${o.id}-created`, at: created, kind: 'created', order: o })
      const paid = o.paymentStatus === 'paid' ? msOf(o.paidAt) : 0
      if (paid) out.push({ id: `ord-${o.id}-paid`, at: paid, kind: 'paid', order: o })
      const updated = msOf(o.updatedAt)
      if (o.status !== 'pending' && updated && updated - created > 60000 && Math.abs(updated - paid) > 60000) {
        out.push({ id: `ord-${o.id}-status`, at: updated, kind: 'status', order: o })
      }
    }
    return out.sort((a, b) => a.at - b.at)
  }, [liveOrders, showOrderEvents])

  // El hilo cortado por días, y las fotos de una misma tanda juntas. Los
  // momentos de pedidos se intercalan por fecha.
  const elements = useMemo<Element[]>(() => {
    const out: Element[] = []
    let prevDay: string | null = null
    const pushDay = (ts: number | WaMessage['timestamp']) => {
      const d = dayKey(ts)
      if (d && d !== prevDay) {
        out.push({ kind: 'day', id: `day-${d}`, label: dayLabel(toDate(ts)) })
        prevDay = d
      }
    }
    let e = 0
    const flushEvents = (until: number) => {
      while (e < orderEvents.length && orderEvents[e].at <= until) {
        const ev = orderEvents[e++]
        pushDay(ev.at)
        out.push({ kind: 'event', id: ev.id, event: ev })
      }
    }
    let i = 0
    while (i < thread.length) {
      const m = thread[i]
      const at = toMillis(m.timestamp)
      if (at) flushEvents(at)
      pushDay(m.timestamp)
      let end = i
      while (end + 1 < thread.length && together(thread[end], thread[end + 1])) end += 1
      if (end > i) {
        const group = thread.slice(i, end + 1)
        out.push({ kind: 'msg', id: group[0].id, message: group[group.length - 1], album: group })
      } else {
        out.push({ kind: 'msg', id: m.id, message: m })
      }
      i = end + 1
    }
    flushEvents(Number.POSITIVE_INFINITY)
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread, orderEvents, locale])

  function dayLabel(d: Date | null): string {
    if (!d) return ''
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return t('shopichat.time.today')
    if (d.toDateString() === yesterday.toDateString()) return t('shopichat.time.yesterday')
    const s = d.toLocaleDateString(locale, {
      weekday: 'long', day: 'numeric', month: 'long',
      ...(d.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}),
    }).replace(',', '')
    return s.charAt(0).toUpperCase() + s.slice(1)
  }

  const images = useMemo(
    () => thread.filter(m => (m.type === 'image' || m.type === 'sticker') && m.media?.url).map(m => m.media as WaMedia),
    [thread]
  )
  const openViewer = (media: WaMedia) => {
    const i = images.findIndex(x => x.url === media.url)
    setViewerIndex(i >= 0 ? i : 0)
  }

  // ---------------------------------------------------------- leído / unread
  // El contador de la conversación ABIERTA se limpia siempre que esté a la
  // vista (si entra un mensaje mientras se mira, el servidor lo sube igual).
  // Y se le avisa a WhatsApp (dos palomitas azules) una vez por mensaje nuevo.
  const lastIncoming = useMemo(() => [...messages].reverse().find(m => m.direction === 'in')?.id || null, [messages])
  const markedFor = useRef<string | null>(null)
  const unread = conversation.unread || 0
  useEffect(() => {
    const run = () => {
      if (document.visibilityState !== 'visible') return
      if (unread > 0) void clearUnread(storeId, waId)
      if (lastIncoming && markedFor.current !== lastIncoming) {
        markedFor.current = lastIncoming
        void markRead(storeId, waId)
      }
    }
    run()
    document.addEventListener('visibilitychange', run)
    return () => document.removeEventListener('visibilitychange', run)
  }, [storeId, waId, unread, lastIncoming])

  // ------------------------------------------------------------------ scroll
  const scroller = useRef<HTMLDivElement>(null)
  const pinnedToBottom = useRef(true)
  const justOpened = useRef(true)
  const userGestureAt = useRef(0)
  const markGesture = () => { userGestureAt.current = performance.now() }

  const goBottom = useCallback((smooth: boolean) => {
    const c = scroller.current
    if (c) c.scrollTo({ top: c.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  // Antes de pintar: al abrir es un salto (el scroll suave queda a medio
  // camino cuando cargan las fotos); con la conversación abierta, un mensaje
  // nuevo baja suave SOLO si el usuario estaba mirando el final.
  useLayoutEffect(() => {
    if (!pinnedToBottom.current) return
    if (justOpened.current) {
      if (thread.length === 0) return
      goBottom(false)
      requestAnimationFrame(() => goBottom(false))
      setTimeout(() => goBottom(false), 150)
      justOpened.current = false
    } else {
      goBottom(true)
    }
  }, [thread, goBottom])

  // Mientras se mire el final, mantenerlo ahí aunque el contenido crezca (una
  // foto que termina de cargar agranda su burbuja).
  const observer = useRef<ResizeObserver | null>(null)
  const contentRef = useCallback((el: HTMLDivElement | null) => {
    observer.current?.disconnect()
    observer.current = null
    if (!el || typeof ResizeObserver === 'undefined') return
    const o = new ResizeObserver(() => { if (pinnedToBottom.current) goBottom(false) })
    o.observe(el)
    observer.current = o
  }, [goBottom])

  const scrollToBottomNow = () => {
    pinnedToBottom.current = true
    setAwayFromBottom(false)
    goBottom(true)
    setTimeout(() => { if (pinnedToBottom.current) goBottom(false) }, 400)
  }

  const goToMessage = (id: string) => {
    setSidePanel(p => (p === 'media' ? null : p))
    setHighlight(id)
    pinnedToBottom.current = false
    setTimeout(() => document.getElementById(`msg-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
    setTimeout(() => setHighlight(null), 2500)
  }

  // ----------------------------------------------------------- cuadro texto
  // Crece con el texto (tope 40% de la ventana), entre por donde entre: tipeo,
  // respuesta rápida, link de producto...
  useLayoutEffect(() => {
    const box = textBox.current
    if (!box) return
    const max = Math.max(120, Math.min(360, Math.round(window.innerHeight * 0.4)))
    box.style.height = 'auto'
    box.style.height = `${Math.min(box.scrollHeight, max)}px`
  }, [text])

  // Al abrir, el cursor va al cuadro — solo en escritorio: en el celular
  // levantaría el teclado y taparía media pantalla.
  useEffect(() => {
    if (!windowOpen) return
    if (!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return
    textBox.current?.focus()
  }, [windowOpen])

  const refocus = () => {
    if (!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return
    textBox.current?.focus()
    requestAnimationFrame(() => textBox.current?.focus())
  }

  // Vista previa del adjunto: una URL por archivo, liberada al cambiarlo.
  useEffect(() => {
    if (!attachment) return undefined
    const url = URL.createObjectURL(attachment)
    // La URL se crea en el efecto porque hay que liberarla al desmontar.
    setAttachmentUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [attachment])

  // Respuestas rápidas: "/" y el atajo.
  const suggestions = useMemo(() => {
    if (!text.startsWith('/')) return []
    const q = text.slice(1).toLowerCase()
    return quickReplies.filter(r => r.shortcut.startsWith(q)).slice(0, 6)
  }, [text, quickReplies])

  const applyQuickReply = (r: WaQuickReply) => {
    const first = (conversation.name || '').split(' ')[0]
    setText(r.text.replace(/\{(nombre|name)\}/gi, first))
    setSuggestionIdx(0)
    setTimeout(() => textBox.current?.focus(), 0)
  }

  // Cerrar las acciones flotantes de un mensaje al tocar fuera o con Escape.
  // "Dentro" es la burbuja y sus botones (data-msg), no toda la fila.
  useEffect(() => {
    const openIn = menuFor || paletteFor
    if (!openIn) return undefined
    const close = () => { setMenuFor(null); setPaletteFor(null) }
    const onDown = (e: Event) => {
      if ((e.target as HTMLElement)?.closest?.(`[data-msg="${openIn}"]`)) return
      close()
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('mousedown', onDown, true)
    document.addEventListener('touchstart', onDown, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown, true)
      document.removeEventListener('touchstart', onDown, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuFor, paletteFor])

  // ------------------------------------------------------------------ envío
  const errorText = (e: unknown) => {
    const err = e as ShopiChatApiError
    if (err?.code === 'WINDOW_CLOSED') return t('shopichat.errors.windowClosed')
    if (err?.code === 'PLAN_REQUIRED') return t('shopichat.errors.planRequired')
    if (err?.code === 'OPTED_OUT') return t('shopichat.customer.optOut')
    if (err?.code === 'NETWORK') return t('shopichat.errors.network')
    if (err?.code === 'UPLOAD_FAILED') return t('shopichat.errors.uploadFailed')
    return err?.message || t('shopichat.errors.sendFailed')
  }

  const patchPending = (id: string, changes: Partial<WaPendingMessage>) =>
    setPending(list => list.map(p => (p.id === id ? { ...p, ...changes } : p)))

  /** Encola un envío con su burbuja provisional. `job` devuelve la respuesta de la API. */
  const enqueue = (bubble: Omit<WaPendingMessage, 'id' | 'local' | 'status' | 'timestamp' | 'direction'>, job: () => Promise<Record<string, unknown>>) => {
    const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const at = new Date()
    const run = () => {
      patchPending(id, { status: 'pending', error: null })
      sendQueue.current = sendQueue.current.then(async () => {
        try {
          const data = await job()
          patchPending(id, { status: 'sent', sentId: sentMessageId(data) })
        } catch (e) {
          patchPending(id, { status: 'failed', error: errorText(e) })
          showToast(errorText(e), 'error')
        }
      })
    }
    setPending(list => [...list, { ...bubble, id, local: true, direction: 'out', status: 'pending', timestamp: localStamp(at), retry: run }])
    pinnedToBottom.current = true
    run()
  }

  const retryPending = (p: WaPendingMessage) => p.retry?.()
  const discardPending = (p: WaPendingMessage) => setPending(list => list.filter(x => x.id !== p.id))

  const sendCurrentText = () => {
    const clean = text.trim()
    if (!clean) return
    const quoted = replyTo && !(replyTo as WaPendingMessage).local ? replyTo.id : null
    setText('')
    setReplyTo(null)
    enqueue({ type: 'text', text: clean, replyTo: quoted }, () => sendText(storeId, waId, clean, quoted))
    // Las tarjetas que sugirió la IA van detrás del texto (la cola respeta el orden).
    const cards = aiCards
    setAiCards([])
    for (const product of cards) {
      const imageUrl = productImage(product)
      const cardCaption = productCaption(store, product)
      enqueue(
        { type: imageUrl ? 'image' : 'text', text: cardCaption, replyTo: null, ...(imageUrl ? { media: { url: imageUrl, mimeType: 'image/jpeg' } } : {}) },
        () => sendProductCard(storeId, waId, { productId: product.id, imageUrl, caption: cardCaption })
      )
    }
    refocus()
  }

  /** Una sugerencia de la IA: al cuadro (editable, no sale sola) y sus tarjetas en espera. */
  const applyAiText = (value: string, products: Product[]) => {
    setText(value)
    setAiCards(products)
    setSuggestionIdx(0)
    setTimeout(() => {
      const box = textBox.current
      if (!box) return
      box.focus()
      box.setSelectionRange(box.value.length, box.value.length)
    }, 0)
  }

  const sendFile = async (file: File, fileCaption = '') => {
    const problem = validateFile(file)
    if (problem) { showToast(t(problem.key, problem.params), 'error'); return }
    let prepared: Awaited<ReturnType<typeof prepareMedia>>
    try {
      prepared = await prepareMedia(file)
    } catch {
      showToast(t('shopichat.errors.fileRead'), 'error')
      return
    }
    const quoted = replyTo && !(replyTo as WaPendingMessage).local ? replyTo.id : null
    setReplyTo(null)
    const previewUrl = prepared.kind === 'image' || prepared.kind === 'audio' || prepared.kind === 'video'
      ? URL.createObjectURL(file)
      : ''
    enqueue(
      {
        type: prepared.kind,
        text: fileCaption,
        replyTo: quoted,
        media: { url: previewUrl, mimeType: prepared.mimeType, filename: prepared.filename },
      },
      // Chico: base64 en el body. Grande (audio/video/documento > ~3 MB):
      // subida directa a R2 con URL prefirmada y envío por URL.
      () => sendPreparedMedia(storeId, waId, prepared, { caption: fileCaption || undefined, replyTo: quoted })
    )
  }

  const takeAttachment = (file?: File | null) => {
    if (!file) return
    if (!windowOpen) { showToast(t('shopichat.errors.windowClosed'), 'error'); return }
    const problem = validateFile(file)
    if (problem) { showToast(t(problem.key, problem.params), 'error'); return }
    setAttachment(file)
    setCaption('')
  }

  const sendAttachment = () => {
    if (!attachment) return
    const f = attachment
    const c = caption.trim()
    setAttachment(null)
    setAttachmentUrl('')
    setCaption('')
    void sendFile(f, c)
  }

  // Pegar una captura con Ctrl/Cmd+V: entra como adjunto por el mismo camino
  // que el clip. Si lo pegado es texto, no se toca nada.
  const takeRef = useRef(takeAttachment)
  useEffect(() => { takeRef.current = takeAttachment })
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = [...(e.clipboardData?.files || [])]
      const f = files.find(x => x.type.startsWith('image/')) || files[0]
      if (!f) return
      e.preventDefault()
      takeRef.current(f)
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [])

  // Soltar un archivo FUERA del hilo abriría el archivo en la pestaña y se
  // perdería lo escrito: se traga.
  useEffect(() => {
    const swallow = (e: DragEvent) => { if (!e.defaultPrevented) e.preventDefault() }
    window.addEventListener('dragover', swallow)
    window.addEventListener('drop', swallow)
    return () => {
      window.removeEventListener('dragover', swallow)
      window.removeEventListener('drop', swallow)
    }
  }, [])

  const startRecording = async () => {
    const r = await recorder.start()
    if (!r.ok) showToast(t(`shopichat.voice.${r.reason}`), 'error')
  }

  const sendVoiceNote = async () => {
    const file = await recorder.stop()
    if (file) void sendFile(file)
  }

  // ------------------------------------------------------------- reacciones
  const myReaction = (m: WaMessage) => {
    const server = m.reactions?.mine || ''
    const o = optimisticReactions[m.id]
    // Lo optimista vale hasta que el servidor cambia: ahí manda el servidor.
    return o && server === o.prev ? o.value : server
  }

  const toggleReaction = async (m: WaMessage, emoji: string) => {
    if ((m as WaPendingMessage).local) return
    setPaletteFor(null)
    setMenuFor(null)
    const current = myReaction(m)
    const next = current === emoji ? '' : emoji
    setOptimisticReactions(r => ({ ...r, [m.id]: { value: next, prev: m.reactions?.mine || '' } }))
    try {
      await reactToMessage(storeId, waId, m.id, next)
    } catch (e) {
      setOptimisticReactions(r => {
        const copy = { ...r }
        delete copy[m.id]
        return copy
      })
      showToast(errorText(e), 'error')
    }
  }

  // ---------------------------------------------------------------- citar
  const summaryOf = (m: WaMessage): string => {
    if (m.text) return m.text
    switch (m.type) {
      case 'image': return `📷 ${t('shopichat.types.image')}`
      case 'video': return `🎬 ${t('shopichat.types.video')}`
      case 'audio': return `🎤 ${t('shopichat.types.audio')}`
      case 'document': return `📄 ${m.media?.filename || t('shopichat.types.document')}`
      case 'sticker': return t('shopichat.types.sticker')
      case 'location': return `📍 ${t('shopichat.types.location')}`
      default: return t('shopichat.types.message')
    }
  }

  const quote = (m: WaMessage) => {
    if ((m as WaPendingMessage).local) { showToast(t('shopichat.errors.waitSending'), 'info'); return }
    setReplyTo(m)
    setMenuFor(null)
    textBox.current?.focus()
  }

  // ------------------------------------------------------------- reenviar
  // La imagen de una plantilla es un enlace externo (no está en nuestro R2 y
  // send-media no la acepta por URL): de una plantilla se reenvía el texto.
  const forwardableMedia = (m: WaMessage) => (m.type !== 'template' && m.media?.url ? m.media : null)

  const canForward = (m: WaMessage) => {
    if ((m as WaPendingMessage).local) return false
    const media = forwardableMedia(m)
    return media ? canSendMime(media.mimeType) : Boolean((m.text || '').trim())
  }

  const forwardItem = (m: WaMessage): ForwardItem => ({
    media: forwardableMedia(m),
    text: m.text || '',
    summary: summaryOf(m),
    sticker: m.type === 'sticker',
  })

  const openForward = (list: WaMessage[]) => {
    const items = list.filter(canForward).map(forwardItem)
    if (!items.length) return
    setForwarding({ items, summary: items.length === 1 ? items[0].summary : t('shopichat.forward.nMessages', { count: items.length }) })
  }

  const forwardTo = async (ids: string[], items: ForwardItem[]) => {
    const failures: string[] = []
    for (const id of ids) {
      try {
        // Uno detrás de otro y en el orden del hilo: si no, Meta podría
        // entregarlos desordenados.
        for (const it of items) {
          if (it.media) {
            // Viaja solo la URL (ya está en nuestro R2). Un sticker va como
            // sticker: un webp mandado como foto Meta lo rechaza.
            await sendMedia(storeId, id, {
              mediaUrl: it.media.url,
              mimeType: it.media.mimeType || 'application/octet-stream',
              filename: it.media.filename,
              caption: it.sticker ? undefined : it.text || undefined,
              asSticker: it.sticker || undefined,
            })
          } else {
            await sendText(storeId, id, it.text)
          }
        }
      } catch (e) {
        failures.push(errorText(e))
      }
    }
    const ok = ids.length - failures.length
    if (ok > 0) {
      showToast(t('shopichat.forward.done', { count: ok }), 'success')
      setSelecting(false)
      setSelected([])
    }
    if (failures.length) throw new Error(failures[0])
  }

  const toggleSelected = (list: WaMessage[]) => {
    const ids = list.filter(canForward).map(m => m.id)
    if (!ids.length) return
    setSelected(v => {
      if (ids.every(id => v.includes(id))) return v.filter(id => !ids.includes(id))
      const add = ids.filter(id => !v.includes(id))
      if (v.length + add.length > MAX_FORWARD) {
        showToast(t('shopichat.forward.max', { count: MAX_FORWARD }), 'error')
        return v
      }
      return [...v, ...add]
    })
  }

  // ------------------------------------------------------------ plantillas
  const onSendTemplate = async (tpl: WaTemplate, values: TemplateValues) => {
    await sendTemplate(storeId, waId, tpl, values)
    showToast(t('shopichat.templates.sent'), 'success')
    setTemplateOpen(false)
  }

  // ------------------------------------------------ vender desde el chat
  /** Deja un texto en el cuadro de escribir (no sale solo). */
  const insertText = (s: string) => {
    setText(prev => (prev.trim() ? `${prev.trimEnd()}\n${s}` : s))
    if (!windowOpen) showToast(t('shopichat.errors.windowClosed'), 'info')
    setTimeout(() => textBox.current?.focus(), 0)
  }

  const sendProduct = ({ product, imageUrl, caption }: { product: Product; imageUrl: string | null; caption: string }) => {
    setProductPicker(false)
    const quoted = replyTo && !(replyTo as WaPendingMessage).local ? replyTo.id : null
    setReplyTo(null)
    enqueue(
      {
        type: imageUrl ? 'image' : 'text',
        text: caption,
        replyTo: quoted,
        ...(imageUrl ? { media: { url: imageUrl, mimeType: 'image/jpeg' } } : {}),
      },
      () => sendProductCard(storeId, waId, { productId: product.id, imageUrl, caption, replyTo: quoted })
    )
  }

  const toggleOrderEvents = () => {
    const next = !showOrderEvents
    setShowOrderEvents(next)
    try { localStorage.setItem(ORDER_EVENTS_PREF, next ? '1' : '0') } catch { /* sin almacenamiento, solo esta vez */ }
  }

  const onOrderCreated = (o: Order) => {
    setOrderModal(false)
    invalidateStoreOrders(storeId)
    if (!showOrderEvents) toggleOrderEvents()
    insertText(orderSummaryText(t, store, o, isOnlineMethod(o.paymentMethod) ? payLinkFor(store, o.id) : null))
    showToast(t('shopichat.sell.orderCreated', { number: o.orderNumber }), 'success')
  }

  /** "Paga aquí: <link>" — habilita el link público del pedido si hacía falta. */
  const insertPayLink = async (o: Order) => {
    try {
      if (!o.payLinkAt) await orderService.update(storeId, o.id, { payLinkAt: new Date() })
      insertText(t('shopichat.sell.payHere', { url: payLinkFor(store, o.id) }))
    } catch {
      showToast(t('shopichat.sell.errors.payLink'), 'error')
    }
  }

  const copyPhone = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone)
      showToast(t('shopichat.common.copiedPhone', { phone }), 'success')
    } catch { /* sin portapapeles no pasa nada */ }
  }

  // Coincidencias de la búsqueda dentro de la conversación.
  const matches = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    if (!q) return []
    return thread.filter(m => (m.text || '').toLowerCase().includes(q))
  }, [thread, searchText])

  const status = conversation.status || 'open'
  const labels = conversation.labels || []

  // ============================================================== render
  const ticks = (m: WaMessage) => {
    if (m.direction !== 'out') return null
    const cls = 'w-3.5 h-3.5'
    if (m.status === 'failed') return <IconAlert className={`${cls} text-red-500`} />
    if (m.status === 'pending') return <IconClock className={`${cls} opacity-70`} />
    if (m.status === 'read') return <IconCheckCheck className={`${cls} text-[#38bdf8]`} />
    if (m.status === 'delivered') return <IconCheckCheck className={cls} />
    return <IconCheck className={cls} />
  }

  const renderEvent = (ev: OrderEvent) => {
    const o = ev.order
    const currency = store.currency || 'USD'
    const time = new Date(ev.at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    const orderLink = `${localePath('/dashboard/orders')}?order=${encodeURIComponent(o.id)}`
    const statusText = t(`shopichat.orderStatus.${o.status}`, { defaultValue: o.status })
    if (ev.kind !== 'created') {
      const paid = ev.kind === 'paid'
      return (
        <div key={ev.id} className="flex justify-center py-0.5" title={t('shopichat.sell.onlyYou')}>
          <Link
            to={orderLink}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-dashed text-[11.5px] font-medium ${paid ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white/90 border-[#CBD5E1] text-[#425466]'}`}
          >
            {paid
              ? <>✅ {t('shopichat.sell.eventPaid', { number: o.orderNumber, total: formatPrice(Number(o.total) || 0, currency) })}</>
              : <><IconBag className="w-3 h-3" />{t('shopichat.sell.eventStatus', { number: o.orderNumber, status: statusText })}</>}
            <span className="opacity-60">· {time}</span>
          </Link>
        </div>
      )
    }
    const color = ORDER_STATUS_COLORS[o.status]
    const items = o.items || []
    return (
      <div key={ev.id} className="flex justify-center py-1">
        <div className="w-full max-w-sm rounded-xl border border-dashed border-[#94A3B8] bg-white/95 px-3 py-2.5 shadow-sm">
          <div className="flex items-center gap-1.5">
            <IconBag className="w-3.5 h-3.5 text-[#0284C7] flex-none" />
            <span className="text-[12px] font-semibold text-[#1e3a5f] truncate">{t('shopichat.sell.eventCreated', { number: o.orderNumber })}</span>
            <span className={`ml-auto inline-flex items-center gap-1 px-1.5 py-px rounded-full text-[10px] font-semibold flex-none ${color?.bg || 'bg-[#F1F5F9]'} ${color?.text || 'text-[#1e3a5f]'}`}>
              <span className={`w-1 h-1 rounded-full ${color?.dot || 'bg-[#8898AA]'}`} />{statusText}
            </span>
            {o.paymentStatus === 'paid' && (
              <span className="px-1.5 py-px rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 flex-none">✅ {t('shopichat.customer.paid')}</span>
            )}
          </div>
          <ul className="mt-1.5 space-y-0.5">
            {items.slice(0, 3).map((it, idx) => (
              <li key={idx} className="text-[11.5px] text-[#425466] truncate">
                {it.quantity} × {it.productName}{it.selectedVariations?.length ? ` (${it.selectedVariations.map(v => v.value).join(' / ')})` : ''}
              </li>
            ))}
            {items.length > 3 && <li className="text-[11px] text-[#A9B6C6]">{t('shopichat.sell.moreItems', { count: items.length - 3 })}</li>}
          </ul>
          <div className="mt-1.5 flex items-center gap-2 text-[11.5px]">
            <span className="font-semibold text-[#1e3a5f]">{formatPrice(Number(o.total) || 0, currency)}</span>
            {o.paymentMethod && <span className="text-[#8898AA] truncate">· {methodLabel(t, o.paymentMethod)}</span>}
            <span className="ml-auto text-[#A9B6C6] flex-none">{time}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Link to={orderLink} className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[#E6EBF1] text-[11px] font-medium text-[#425466] hover:bg-[#F6F9FC]">
              {t('shopichat.sell.viewOrder')}
            </Link>
            <button type="button" onClick={() => insertText(orderSummaryText(t, store, o, canPayOnline(o) && o.payLinkAt ? payLinkFor(store, o.id) : null))} className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[#E6EBF1] text-[11px] font-medium text-[#425466] hover:bg-[#F6F9FC]">
              <IconSend className="w-3 h-3" />{t('shopichat.sell.insertSummary')}
            </button>
            {canPayOnline(o) && (
              <button type="button" onClick={() => void insertPayLink(o)} className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[#BAE6FD] bg-[#F0F9FF] text-[11px] font-semibold text-[#0284C7] hover:bg-[#E0F2FE]">
                <IconLink className="w-3 h-3" />{t('shopichat.sell.payLink')}
              </button>
            )}
          </div>
          <p className="mt-1.5 text-[10px] text-[#A9B6C6]">{t('shopichat.sell.onlyYou')}</p>
        </div>
      </div>
    )
  }

  const renderMessage = (el: Extract<Element, { kind: 'msg' }>) => {
    const m = el.message
    const mine = m.direction === 'out'
    const pend = (m as WaPendingMessage).local ? (m as WaPendingMessage) : null
    const bubbleBg = mine ? 'bg-[#DCF8C6] border-[#CDEBB5]' : 'bg-white border-[#E6EBF1]'

    if (el.album) {
      const all = el.album
      const marked = all.every(x => selected.includes(x.id))
      return (
        <div
          key={el.id}
          id={`msg-${el.id}`}
          onClick={selecting ? () => toggleSelected(all) : undefined}
          className={`flex items-center gap-1 ${selecting ? 'justify-start cursor-pointer' : mine ? 'justify-end' : 'justify-start'}`}
        >
          {selecting && <SelectBox on={marked} disabled={!all.some(canForward)} />}
          <div className={`rounded-2xl p-1 border ${bubbleBg} ${mine ? 'rounded-br-sm' : 'rounded-bl-sm'} ${selecting ? `pointer-events-none ${mine ? 'ml-auto' : ''}` : ''}`}>
            <MediaAlbum messages={all} onOpenPhoto={x => x.media && openViewer(x.media)} onOpenVideo={x => x.media && setVideoUrl(x.media.url)} />
            <div className="flex items-center gap-1 justify-end mt-0.5 pr-1 text-[#8898AA]">
              <span className="text-[11px]">{formatTime(m.timestamp, locale)}</span>
              {ticks(m)}
            </div>
          </div>
        </div>
      )
    }

    const noBubble = m.type === 'sticker'
    const isPhoto = m.type === 'image' || (m.type === 'template' && !!m.media?.url)
    const size = isPhoto ? photoSize(m.media) : null
    const withPhoto = Boolean(m.media?.url && size && !noBubble)
    const bubbleWidth = withPhoto && size ? Math.max(size.width, m.text ? 240 : 0) + PHOTO_BORDER * 2 : null
    const quoted = m.replyTo ? byId.get(m.replyTo) : null
    const mineR = myReaction(m)
    const theirR = m.reactions?.customer || ''
    const hasReaction = Boolean(mineR || theirR)
    const failed = m.status === 'failed'
    const canAct = !pend
    const open = menuFor === m.id

    const actions = canAct && (
      <div data-msg={m.id} className={`${open ? 'flex' : 'hidden md:group-hover:flex'} items-center gap-0.5 shrink-0`}>
        {paletteFor === m.id ? (
          <div className="flex items-center gap-0.5 rounded-full bg-white border border-[#E6EBF1] shadow-sm px-1 py-0.5">
            {REACTION_EMOJIS.map(e => (
              <button
                key={e}
                type="button"
                onClick={() => toggleReaction(m, e)}
                className={`w-7 h-7 rounded-full text-base leading-none hover:bg-[#F6F9FC] ${mineR === e ? 'bg-[#F0F9FF]' : ''}`}
              >
                {e}
              </button>
            ))}
          </div>
        ) : (
          <>
            {windowOpen && (
              <button type="button" onClick={() => quote(m)} title={t('shopichat.actions.reply')} className="w-7 h-7 rounded-full grid place-items-center text-[#A9B6C6] hover:text-[#425466] hover:bg-white">
                <IconReply className="w-4 h-4" />
              </button>
            )}
            {canForward(m) && (
              <button type="button" onClick={() => { setMenuFor(null); openForward([m]) }} title={t('shopichat.actions.forward')} className="w-7 h-7 rounded-full grid place-items-center text-[#A9B6C6] hover:text-[#425466] hover:bg-white">
                <IconForward className="w-4 h-4" />
              </button>
            )}
            {windowOpen && (
              <button type="button" onClick={() => { setMenuFor(m.id); setPaletteFor(m.id) }} title={t('shopichat.actions.react')} className="w-7 h-7 rounded-full grid place-items-center text-[#A9B6C6] hover:text-[#425466] hover:bg-white">
                <IconSmilePlus className="w-4 h-4" />
              </button>
            )}
          </>
        )}
      </div>
    )

    const loc = m.location
    return (
      <div
        key={m.id}
        id={`msg-${m.id}`}
        onClick={selecting ? () => toggleSelected([m]) : undefined}
        className={`group flex items-center gap-1 ${selecting ? 'justify-start cursor-pointer' : mine ? 'justify-end' : 'justify-start'} ${hasReaction ? 'mb-3' : ''} ${highlight === m.id ? 'animate-pulse' : ''}`}
      >
        {selecting && <SelectBox on={selected.includes(m.id)} disabled={!canForward(m)} />}
        {mine && !selecting && actions}
        <div
          data-msg={m.id}
          className={`relative min-w-0 ${m.type === 'document' ? 'w-72 max-w-[85%]' : 'max-w-[min(80%,34rem)]'} ${selecting ? `pointer-events-none ${mine ? 'ml-auto' : ''}` : ''}`}
          style={bubbleWidth ? { width: bubbleWidth, maxWidth: '85%' } : undefined}
        >
          <div
            onClick={e => {
              // En el celular no hay hover: tocar la burbuja saca las acciones.
              if ((e.target as HTMLElement).closest('a, button, img, video, audio, [role="slider"]')) return
              setPaletteFor(null)
              setMenuFor(open ? null : m.id)
            }}
            className={`text-[14px] leading-snug text-[#1e3a5f] ${
              noBubble ? '' : `rounded-2xl border ${bubbleBg} ${withPhoto ? 'p-1' : 'px-3 py-2'} ${mine ? 'rounded-br-sm' : 'rounded-bl-sm'}`
            } ${failed ? 'ring-1 ring-red-300' : ''}`}
          >
            {m.replyTo && (
              <button
                type="button"
                onClick={() => quoted && goToMessage(quoted.id)}
                className={`block w-full text-left mb-1.5 rounded-md px-2 py-1 border-l-[3px] ${mine ? 'bg-white/60 border-[#25D366]' : 'bg-[#F6F9FC] border-[#38bdf8]'}`}
              >
                <span className="block text-[11px] font-semibold text-[#425466]">
                  {quoted ? (quoted.direction === 'out' ? t('shopichat.thread.you') : displayName) : t('shopichat.thread.quoted')}
                </span>
                <span className="block text-[11.5px] text-[#8898AA] truncate">
                  {quoted ? summaryOf(quoted) : t('shopichat.thread.quotedMissing')}
                </span>
              </button>
            )}
            {(m.type === 'template' || m.sentBy === 'auto' || m.sentBy === 'ai' || m.sentBy === 'bot') && (
              <span className="flex items-center gap-1.5 mb-1">
                {/* Enviado por el piloto automático */}
                {m.sentBy === 'ai' && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-px rounded-full bg-[#F3E8FF] text-[#7C3AED] text-[10px] font-semibold uppercase tracking-wide" title={t('shopichat.ai.autopilot.sentByAi')}>
                    <IconBot className="w-2.5 h-2.5" />{t('shopichat.ai.autopilot.badge')}
                  </span>
                )}
                {/* Enviado por el bot propio de la tienda (fase 3C) */}
                {m.sentBy === 'bot' && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-px rounded-full bg-[#E0F2FE] text-[#0284C7] text-[10px] font-semibold uppercase tracking-wide" title={t('shopichat.bot.sentByBot')}>
                    <IconBot className="w-2.5 h-2.5" />{t('shopichat.bot.badge')}
                  </span>
                )}
                {m.type === 'template' && (
                  <span className="text-[10.5px] font-semibold uppercase tracking-wide text-[#8898AA]">{t('shopichat.thread.template')}</span>
                )}
                {/* Aviso automático de pedido (api/whatsapp-notify) */}
                {m.sentBy === 'auto' && (
                  <span className="px-1.5 py-px rounded-full bg-[#E0F2FE] text-[#0284C7] text-[10px] font-semibold uppercase tracking-wide">{t('shopichat.thread.auto')}</span>
                )}
              </span>
            )}
            {(m.type === 'image' || m.type === 'sticker' || m.type === 'template') && m.media?.url && (
              <button type="button" onClick={() => m.media && openViewer(m.media)} className="block max-w-full">
                <img
                  src={m.media.thumbUrl || m.media.url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  style={m.type === 'sticker' ? undefined : size || undefined}
                  className={`rounded-lg bg-black/5 ${withPhoto ? 'mb-0.5' : 'mb-1'} ${
                    m.type === 'sticker' ? 'w-28' : size ? 'max-w-full h-auto' : 'max-w-full sm:max-w-[20rem] max-h-[20rem] object-contain'
                  }`}
                />
              </button>
            )}
            {m.type === 'video' && m.media?.url && (
              <div className="mb-1"><VideoPreview media={m.media} onOpen={() => setVideoUrl(m.media!.url)} /></div>
            )}
            {m.type === 'audio' && m.media?.url && (
              <VoiceNote messageId={m.id} conversationId={waId} url={m.media.url} title={displayName} />
            )}
            {m.type === 'document' && m.media?.url && (
              <a href={m.media.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 rounded-lg bg-white/70 border border-black/5 px-3 py-2.5 mb-1">
                <span className="w-9 h-9 rounded-lg bg-red-500 grid place-items-center flex-none">
                  <IconFile className="w-5 h-5 text-white" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium truncate text-[#1e3a5f]">{m.media.filename || t('shopichat.types.document')}</span>
                  <span className="block text-[11.5px] text-[#8898AA]">{(m.media.mimeType || '').split('/')[1]?.toUpperCase() || t('shopichat.types.file')}</span>
                </span>
              </a>
            )}
            {m.type === 'location' && (
              <a
                href={loc ? `https://maps.google.com/?q=${loc.latitude},${loc.longitude}` : undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg bg-white/70 border border-black/5 px-3 py-2.5 mb-1"
              >
                <IconMapPin className="w-5 h-5 text-red-500 flex-none" />
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-[#1e3a5f] truncate">{loc?.name || t('shopichat.types.location')}</span>
                  {loc?.address && <span className="block text-[11.5px] text-[#8898AA] truncate">{loc.address}</span>}
                </span>
              </a>
            )}
            {['image', 'sticker', 'video', 'audio', 'document'].includes(m.type) && !m.media?.url && (
              pend ? (
                <p className="text-[13px] italic opacity-70 mb-1 truncate">{m.media?.filename || t(`shopichat.types.${m.type}`)}</p>
              ) : (
                <MissingMedia message={m} now={now} onRetry={() => retryMedia(storeId, waId, m.id)} />
              )
            )}
            <div className={withPhoto ? 'px-1.5 pb-0.5' : undefined}>
              {m.text && m.type !== 'location' ? (
                <WhatsAppText text={m.text} linkClassName="underline break-all text-[#0284C7]" onPhoneClick={copyPhone} />
              ) : m.type === 'unsupported' ? (
                <p className="text-[13px] italic opacity-70">{t('shopichat.thread.unsupported')}</p>
              ) : null}
              <div className="flex items-center gap-1 justify-end mt-0.5 text-[#8898AA]">
                {failed && <span className="text-[11px] font-semibold text-red-500">{t('shopichat.thread.notSent')}</span>}
                <span className="text-[11px]">{formatTime(m.timestamp, locale)}</span>
                {ticks(m)}
              </div>
              {failed && pend && (
                <div className="flex items-center justify-end gap-2 mt-1">
                  <button type="button" onClick={() => discardPending(pend)} className="text-[11.5px] text-[#8898AA] hover:underline">{t('shopichat.common.discard')}</button>
                  <button type="button" onClick={() => retryPending(pend)} className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#0284C7] hover:underline">
                    <IconRefresh className="w-3 h-3" />{t('shopichat.common.retry')}
                  </button>
                </div>
              )}
              {failed && !pend && m.error && <p className="text-[11px] text-red-500 mt-0.5 text-right">{m.error}</p>}
            </div>
          </div>
          {hasReaction && (
            <span className={`absolute -bottom-2.5 ${mine ? 'left-2' : 'right-2'} px-1.5 py-0.5 rounded-full bg-white border border-[#E6EBF1] shadow-sm text-[11.5px] leading-none`}>
              {theirR}{mineR}
            </span>
          )}
        </div>
        {!mine && !selecting && actions}
      </div>
    )
  }

  const selectedMessages = thread.filter(m => selected.includes(m.id))

  return (
    <div className="relative flex-1 min-w-0 min-h-0 flex">
      <main
        onDragEnter={e => {
          if (!e.dataTransfer?.types?.includes('Files')) return
          dragDepth.current += 1
          setDragging(true)
        }}
        onDragOver={e => { if (e.dataTransfer?.types?.includes('Files')) e.preventDefault() }}
        onDragLeave={() => {
          dragDepth.current = Math.max(0, dragDepth.current - 1)
          if (dragDepth.current === 0) setDragging(false)
        }}
        onDrop={e => {
          e.preventDefault()
          dragDepth.current = 0
          setDragging(false)
          const files = [...(e.dataTransfer?.files || [])]
          if (files.length > 1) showToast(t('shopichat.composer.oneFile'), 'info')
          takeAttachment(files[0])
        }}
        className="relative flex-1 min-w-0 min-h-0 flex flex-col bg-[#EFEAE2]"
      >
        {dragging && (
          <div className="absolute inset-3 z-40 rounded-2xl border-2 border-dashed border-[#38bdf8] bg-black/5 grid place-items-center pointer-events-none">
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-white shadow-lg border border-[#E6EBF1]">
              <IconUpload className="w-4 h-4 text-[#0284C7]" />
              <p className="text-[13px] font-medium text-[#1e3a5f]">{windowOpen ? t('shopichat.composer.dropHere') : t('shopichat.errors.windowClosed')}</p>
            </div>
          </div>
        )}

        {/* Cabecera */}
        <header className="px-3 sm:px-4 py-2.5 bg-white border-b border-[#E6EBF1] flex items-center gap-2 sm:gap-3">
          <button type="button" onClick={onBack} className="md:hidden p-1 -ml-1 text-[#425466]" aria-label={t('shopichat.common.back')}>
            <IconArrowLeft className="w-5 h-5" />
          </button>
          <button type="button" onClick={() => setSidePanel(p => (p === 'customer' ? null : 'customer'))} className="min-w-0 flex-1 text-left">
            <h2 className="font-semibold text-[#1e3a5f] truncate text-[14px]">{displayName}</h2>
            <p className="text-[11.5px] text-[#8898AA] truncate">
              {formatPhone(conversation.waId)}
              {windowOpen
                ? <span className="hidden sm:inline"> · {t('shopichat.window.remaining', { time: formatRemaining(remaining) })}</span>
                : <span className="text-amber-600"> · {t('shopichat.window.closedShort')}</span>}
            </p>
          </button>
          <div className="flex items-center gap-1 relative flex-none">
            {autopilot && (
              <button
                type="button"
                onClick={toggleAi}
                disabled={aiToggling}
                aria-pressed={!aiPaused}
                title={t(aiPaused ? 'shopichat.ai.autopilot.resumeHint' : 'shopichat.ai.autopilot.pauseHint')}
                className={`h-8 px-2 inline-flex items-center gap-1 rounded-lg text-[11.5px] font-semibold border disabled:opacity-50 ${
                  aiPaused ? 'border-[#E6EBF1] text-[#8898AA] hover:bg-[#F6F9FC]' : 'border-[#E9D5FF] bg-[#FAF5FF] text-[#7C3AED] hover:bg-[#F3E8FF]'
                }`}
              >
                <IconBot className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t(aiPaused ? 'shopichat.ai.autopilot.statePaused' : 'shopichat.ai.autopilot.stateActive')}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setSidePanel(p => (p === 'customer' ? null : 'customer'))}
              className={`h-8 w-8 grid place-items-center rounded-lg hover:bg-[#F6F9FC] ${sidePanel === 'customer' ? 'text-[#0284C7]' : 'text-[#8898AA]'}`}
              title={t('shopichat.customer.title')}
            >
              <IconUser className="w-4 h-4" />
            </button>
            {status !== 'done' ? (
              <button type="button" onClick={() => onStatus('done')} className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#1e3a5f] text-white text-[12px] font-semibold hover:bg-[#2a4d7a]">
                {t('shopichat.status.markDone')}
              </button>
            ) : (
              <button type="button" onClick={() => onStatus('open')} className="px-2.5 sm:px-3 py-1.5 rounded-lg border border-[#E6EBF1] text-[#1e3a5f] text-[12px] font-semibold hover:bg-[#F6F9FC]">
                {t('shopichat.status.reopen')}
              </button>
            )}
            <button type="button" onClick={() => setHeaderMenu(v => !v)} className="h-8 w-8 grid place-items-center rounded-lg text-[#8898AA] hover:bg-[#F6F9FC]" aria-label={t('shopichat.common.more')}>
              <IconMore className="w-4 h-4" />
            </button>
            {headerMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setHeaderMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-40 w-56 rounded-xl bg-white border border-[#E6EBF1] shadow-lg py-1 text-[13px] text-[#425466]">
                  <MenuItem onClick={() => { setHeaderMenu(false); setSearchOpen(v => !v) }}>{t('shopichat.thread.searchIn')}</MenuItem>
                  <MenuItem onClick={() => { setHeaderMenu(false); setSidePanel('media') }}>{t('shopichat.media.title')}</MenuItem>
                  <MenuItem onClick={() => { setHeaderMenu(false); setSelecting(true); setMenuFor(null); setReplyTo(null) }}>{t('shopichat.thread.selectMessages')}</MenuItem>
                  <MenuItem onClick={() => { setHeaderMenu(false); setSidePanel('customer') }}>{t('shopichat.thread.labelsAndNote')}</MenuItem>
                  {status !== 'pending' && <MenuItem onClick={() => { setHeaderMenu(false); onStatus('pending') }}>{t('shopichat.status.markPending')}</MenuItem>}
                  {status === 'pending' && <MenuItem onClick={() => { setHeaderMenu(false); onStatus('open') }}>{t('shopichat.status.markOpen')}</MenuItem>}
                  <MenuItem onClick={() => { setHeaderMenu(false); setTemplateOpen(true) }}>{t('shopichat.templates.send')}</MenuItem>
                  <MenuItem onClick={() => { setHeaderMenu(false); setOrderModal(true) }}>{t('shopichat.sell.createOrder')}</MenuItem>
                  <MenuItem onClick={() => { setHeaderMenu(false); toggleOrderEvents() }}>
                    {showOrderEvents ? t('shopichat.sell.hideOrders') : t('shopichat.sell.showOrders')}
                  </MenuItem>
                </div>
              </>
            )}
          </div>
        </header>

        <VoiceNoteBar onOpen={onOpenConversation} hideIn={waId} className="md:hidden" />

        {searchOpen && (
          <div className="px-4 py-2 bg-white border-b border-[#E6EBF1]">
            <div className="relative">
              <IconSearch className="w-4 h-4 text-[#A9B6C6] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                autoFocus
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Escape') { setSearchOpen(false); setSearchText('') }
                  if (e.key === 'Enter' && matches.length) goToMessage(matches[matches.length - 1].id)
                }}
                placeholder={t('shopichat.thread.searchIn')}
                className="w-full pl-9 pr-3 py-2 text-[13px] bg-[#F6F9FC] rounded-lg outline-none focus:ring-2 focus:ring-[#38bdf8]/40"
              />
            </div>
            {searchText.trim() && (
              <div className="mt-1.5 max-h-40 overflow-y-auto">
                {matches.length === 0 ? (
                  <p className="text-[11.5px] text-[#A9B6C6] py-1">{t('shopichat.list.noMatches')}</p>
                ) : [...matches].reverse().slice(0, 20).map(m => (
                  <button key={m.id} type="button" onClick={() => goToMessage(m.id)} className="w-full text-left px-2 py-1.5 rounded hover:bg-[#F6F9FC] flex items-center gap-2">
                    <span className="text-[11.5px] text-[#425466] truncate flex-1">{m.text}</span>
                    <span className="text-[11px] text-[#A9B6C6] flex-none">{formatTime(m.timestamp, locale)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {conversation.optOut && (
          <div className="px-4 py-2 bg-red-50 border-b border-red-100 text-[11.5px] text-red-700">{t('shopichat.customer.optOut')}</div>
        )}

        {/* La IA derivó la conversación a una persona */}
        {conversation.aiHandoff?.reason && (
          <div className="px-4 py-2 bg-[#FAF5FF] border-b border-[#E9D5FF] flex items-center gap-2 text-[11.5px] text-[#6B21A8]">
            <IconBot className="w-3.5 h-3.5 flex-none" />
            <span className="flex-1 min-w-0">
              <span className="font-semibold">{t('shopichat.ai.autopilot.handoffBanner')}</span> {conversation.aiHandoff.reason}
            </span>
            {autopilot && aiPaused && (
              <button type="button" onClick={toggleAi} disabled={aiToggling} className="flex-none font-semibold text-[#7C3AED] hover:underline disabled:opacity-50">
                {t('shopichat.ai.autopilot.resume')}
              </button>
            )}
          </div>
        )}

        {(labels.length > 0 || conversation.note) && (
          <button type="button" onClick={() => setSidePanel('customer')} className="px-4 py-1.5 bg-white border-b border-[#F1F5F9] flex items-center gap-1.5 flex-wrap text-left">
            {labels.map(l => {
              const c = labelColor(l)
              return <span key={l} className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ backgroundColor: `${c}1A`, color: c }}>{l}</span>
            })}
            {conversation.note && (
              <span className="inline-flex items-center gap-1 text-[11.5px] text-[#8898AA] truncate max-w-full">
                <IconNote className="w-3 h-3 flex-none" />
                <span className="truncate">{conversation.note}</span>
              </span>
            )}
          </button>
        )}

        {/* Hilo */}
        <div className="relative flex-1 min-h-0 flex flex-col">
          <div
            ref={scroller}
            onWheel={markGesture}
            onTouchMove={markGesture}
            onKeyDown={markGesture}
            onPointerDown={e => { if (e.target === e.currentTarget) markGesture() }}
            onScroll={e => {
              const c = e.currentTarget
              const atBottom = c.scrollHeight - c.scrollTop - c.clientHeight < 150
              // Llegar abajo pega el hilo siempre; DESPEGARLO solo si fue el
              // usuario (el navegador también avisa scroll al cambiar el contenido).
              if (atBottom) pinnedToBottom.current = true
              else if (performance.now() - userGestureAt.current < 1200) pinnedToBottom.current = false
              const away = !pinnedToBottom.current
              setAwayFromBottom(prev => (prev === away ? prev : away))
            }}
            className="flex-1 overflow-y-auto overscroll-contain px-3 sm:px-4 py-4"
          >
            <div ref={contentRef} className="space-y-1.5">
              {loadingThread && thread.length === 0 && (
                <div className="space-y-2 animate-pulse" aria-label={t('shopichat.common.loading')}>
                  <div className="h-9 w-48 max-w-[60%] rounded-2xl bg-black/10" />
                  <div className="h-9 w-64 max-w-[70%] rounded-2xl bg-black/10 ml-auto" />
                  <div className="h-9 w-40 max-w-[50%] rounded-2xl bg-black/10" />
                </div>
              )}
              {threadError && <p className="text-center text-[12.5px] text-red-600 py-4">{t('shopichat.errors.threadLoad')}</p>}
              {!loadingThread && !threadError && thread.length === 0 && (
                <p className="text-center text-[12.5px] text-[#8898AA] py-6">{t('shopichat.thread.empty')}</p>
              )}
              {elements.map(el => el.kind === 'day' ? (
                <div key={el.id} className="flex justify-center py-1.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-white/90 border border-[#E6EBF1] text-[11px] font-medium text-[#8898AA]">{el.label}</span>
                </div>
              ) : el.kind === 'event' ? renderEvent(el.event) : renderMessage(el))}
            </div>
          </div>
          {awayFromBottom && (
            <button
              type="button"
              onPointerDown={scrollToBottomNow}
              onClick={scrollToBottomNow}
              className="absolute bottom-4 right-4 z-10 h-9 w-9 grid place-items-center rounded-full bg-white border border-[#E6EBF1] shadow-md text-[#425466]"
              aria-label={t('shopichat.thread.toBottom')}
            >
              <IconArrowDown className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Pie: selección, cuadro de escribir o ventana cerrada */}
        {selecting ? (
          <div className="px-4 py-3 bg-white border-t border-[#E6EBF1] flex items-center gap-3">
            <button type="button" onClick={() => { setSelecting(false); setSelected([]) }} className="px-3 py-2 rounded-lg text-[13px] font-medium text-[#425466] hover:bg-[#F6F9FC]">
              {t('shopichat.common.cancel')}
            </button>
            <span className="flex-1 text-[13px] text-[#8898AA]">
              {selected.length === 0 ? t('shopichat.forward.tapToSelect') : t('shopichat.forward.nMessages', { count: selected.length })}
            </span>
            <button
              type="button"
              disabled={selected.length === 0}
              onClick={() => openForward(selectedMessages)}
              className="px-4 py-2 rounded-lg bg-[#1e3a5f] text-white text-[13px] font-semibold disabled:opacity-40"
            >
              {t('shopichat.actions.forward')}
            </button>
          </div>
        ) : windowOpen ? (
          <>
          {aiCards.length > 0 && (
            <div className="px-3 sm:px-4 pt-2 bg-white border-t border-[#E6EBF1] flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-[#8898AA]">{t('shopichat.ai.cardsAfter')}</span>
              {aiCards.map(p => (
                <span key={p.id} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-[#F0F9FF] text-[#0284C7] text-[11.5px] font-medium max-w-[220px]">
                  <IconBag className="w-3 h-3 flex-none" />
                  <span className="truncate">{p.name}</span>
                  <button type="button" onClick={() => setAiCards(prev => prev.filter(x => x.id !== p.id))} className="p-0.5 rounded-full hover:bg-white" aria-label={t('shopichat.ai.removeCard')}>
                    <IconX className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <form
            onSubmit={e => { e.preventDefault(); sendCurrentText() }}
            className="relative px-2 sm:px-4 py-2.5 bg-white border-t border-[#E6EBF1] flex items-end gap-1 sm:gap-2"
          >
            <input ref={fileInput} type="file" accept={ACCEPTED_FILES} className="hidden" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; takeAttachment(f) }} />
            <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; takeAttachment(f) }} />

            {replyTo && (
              <div className="absolute bottom-full left-2 right-2 sm:left-4 sm:right-4 mb-1 bg-white border border-[#E6EBF1] rounded-lg shadow-sm p-2 flex items-center gap-2.5 z-10">
                <div className="w-1 self-stretch rounded-full bg-[#38bdf8] flex-none" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-[#8898AA]">
                    {t('shopichat.composer.replyingTo', { name: replyTo.direction === 'out' ? t('shopichat.thread.you') : displayName })}
                  </p>
                  <p className="text-[13px] text-[#425466] truncate">{summaryOf(replyTo)}</p>
                </div>
                <button type="button" onClick={() => setReplyTo(null)} className="p-1 text-[#A9B6C6] hover:text-[#425466] flex-none" aria-label={t('shopichat.common.close')}>
                  <IconX className="w-4 h-4" />
                </button>
              </div>
            )}

            {suggestions.length > 0 && (
              <div className="absolute bottom-full left-2 right-2 sm:left-4 sm:right-4 mb-1 bg-white border border-[#E6EBF1] rounded-lg shadow-lg overflow-hidden z-20">
                <div className="px-3.5 py-1.5 bg-[#F6F9FC] border-b border-[#F1F5F9]">
                  <p className="text-[11px] text-[#A9B6C6]">{t('shopichat.composer.quickHint')}</p>
                </div>
                {suggestions.map((r, idx) => (
                  <button
                    key={r.shortcut}
                    type="button"
                    onClick={() => applyQuickReply(r)}
                    onMouseEnter={() => setSuggestionIdx(idx)}
                    className={`w-full text-left px-3.5 py-2 flex items-start gap-3 ${idx === suggestionIdx ? 'bg-[#F0F9FF]' : 'hover:bg-[#F6F9FC]'}`}
                  >
                    <span className="font-mono text-[11.5px] font-semibold text-[#0284C7] bg-[#F0F9FF] px-1.5 py-0.5 rounded flex-none">/{r.shortcut}</span>
                    <span className="text-[13px] text-[#425466] truncate flex-1">{r.text}</span>
                  </button>
                ))}
              </div>
            )}

            {sellMenu && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setSellMenu(false)} />
                <div className="absolute bottom-full left-2 sm:left-4 mb-1 z-30 w-52 rounded-xl bg-white border border-[#E6EBF1] shadow-lg py-1 text-[13px] text-[#425466]">
                  <SellItem icon={<IconBag className="w-4 h-4" />} onClick={() => { setSellMenu(false); setProductPicker(true) }}>{t('shopichat.sell.product')}</SellItem>
                  <SellItem icon={<IconTag className="w-4 h-4" />} onClick={() => { setSellMenu(false); setCouponPicker(true) }}>{t('shopichat.sell.coupon')}</SellItem>
                  <SellItem icon={<IconPlus className="w-4 h-4" />} onClick={() => { setSellMenu(false); setOrderModal(true) }}>{t('shopichat.sell.createOrder')}</SellItem>
                </div>
              </>
            )}

            {!recorder.recording && (
              <>
                <button
                  type="button"
                  onClick={() => setSellMenu(v => !v)}
                  className={`p-2 sm:p-2.5 rounded-full hover:bg-[#F6F9FC] flex-none ${sellMenu ? 'text-[#0284C7]' : 'text-[#8898AA] hover:text-[#1e3a5f]'}`}
                  title={t('shopichat.sell.menu')}
                  aria-label={t('shopichat.sell.menu')}
                  aria-expanded={sellMenu}
                >
                  <IconPlus className="w-5 h-5" />
                </button>
                {aiEnabled && (
                  <AiAssist store={store} waId={waId} text={text} raised={Boolean(replyTo)} onUse={applyAiText} />
                )}
                <button type="button" onClick={() => fileInput.current?.click()} className="p-2 sm:p-2.5 text-[#8898AA] hover:text-[#1e3a5f] rounded-full hover:bg-[#F6F9FC] flex-none" title={t('shopichat.composer.attach')}>
                  <IconPaperclip className="w-5 h-5" />
                </button>
                {hasCamera && (
                  <button type="button" onClick={() => cameraInput.current?.click()} className="p-2 text-[#8898AA] hover:text-[#1e3a5f] rounded-full hover:bg-[#F6F9FC] flex-none" title={t('shopichat.composer.camera')}>
                    <IconCamera className="w-5 h-5" />
                  </button>
                )}
              </>
            )}

            {recorder.recording ? (
              <div className="flex-1 flex items-center gap-3 px-4 py-2.5 bg-[#F6F9FC] rounded-2xl">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-none" />
                <span className="text-[13px] font-medium text-[#425466] tabular-nums">{recordingClock(recorder.seconds)}</span>
                <span className="text-[11.5px] text-[#A9B6C6] hidden sm:inline">{t('shopichat.voice.recording')}</span>
                <button type="button" onClick={recorder.cancel} className="ml-auto p-1.5 text-[#A9B6C6] hover:text-red-600 rounded-full hover:bg-white" title={t('shopichat.voice.discard')}>
                  <IconTrash className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <textarea
                ref={textBox}
                rows={1}
                value={text}
                onChange={e => { setText(e.target.value); setSuggestionIdx(0) }}
                onKeyDown={e => {
                  // Con la lista de atajos abierta, las flechas la recorren y
                  // Enter usa el elegido.
                  if (suggestions.length > 0) {
                    if (e.key === 'ArrowDown') { e.preventDefault(); setSuggestionIdx(i => (i + 1) % suggestions.length); return }
                    if (e.key === 'ArrowUp') { e.preventDefault(); setSuggestionIdx(i => (i - 1 + suggestions.length) % suggestions.length); return }
                    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); applyQuickReply(suggestions[suggestionIdx] || suggestions[0]); return }
                    if (e.key === 'Escape') { e.preventDefault(); setText(''); return }
                  }
                  // Enter envía y Shift+Enter hace salto, solo en escritorio:
                  // en el celular Enter es salto de línea.
                  if (e.key === 'Enter' && !e.shiftKey && !hasCamera) {
                    e.preventDefault()
                    sendCurrentText()
                  }
                }}
                placeholder={quickReplies.length ? t('shopichat.composer.placeholderQuick') : t('shopichat.composer.placeholder')}
                className="flex-1 min-w-0 px-4 py-2.5 bg-[#F6F9FC] border border-[#E6EBF1] rounded-2xl text-[14px] text-[#1e3a5f] outline-none focus:border-[#38bdf8] resize-none leading-5"
              />
            )}

            {/* Con algo escrito el botón envía; sin nada, ofrece el micrófono. */}
            {text.trim() || recorder.recording || !recorder.canRecord ? (
              <button
                type={recorder.recording ? 'button' : 'submit'}
                onMouseDown={e => e.preventDefault()}
                onClick={recorder.recording ? sendVoiceNote : undefined}
                disabled={!recorder.recording && !text.trim()}
                className="p-2.5 bg-[#1e3a5f] text-white rounded-full hover:bg-[#2a4d7a] disabled:opacity-40 flex-none"
                aria-label={t('shopichat.composer.send')}
              >
                <IconSend className="w-5 h-5" />
              </button>
            ) : (
              <button type="button" onClick={startRecording} className="p-2.5 text-[#8898AA] hover:text-[#1e3a5f] rounded-full hover:bg-[#F6F9FC] flex-none" title={t('shopichat.voice.record')} aria-label={t('shopichat.voice.record')}>
                <IconMic className="w-5 h-5" />
              </button>
            )}
          </form>
          </>
        ) : (
          <div className="border-t border-[#E6EBF1] bg-white px-4 py-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-[#1e3a5f]">{t('shopichat.window.closedTitle')}</p>
                <p className="mt-0.5 text-[12px] text-[#8898AA]">{t('shopichat.window.closedBody')}</p>
              </div>
              <button type="button" onClick={() => setTemplateOpen(true)} className="px-4 py-2 rounded-lg bg-[#1e3a5f] text-white text-[13px] font-semibold hover:bg-[#2a4d7a] flex-none">
                {t('shopichat.templates.send')}
              </button>
            </div>
          </div>
        )}
        <div className="bg-white flex-none" style={{ height: 'env(safe-area-inset-bottom)' }} />
      </main>

      {/* Panel lateral: columna en escritorio, superpuesto en pantallas chicas */}
      {sidePanel && (
        <div className="absolute inset-0 z-30 xl:static xl:z-auto flex justify-end bg-black/30 xl:bg-transparent xl:flex-none" onClick={() => setSidePanel(null)}>
          <div className="h-full w-full max-w-xs sm:max-w-sm xl:max-w-none xl:w-auto" onClick={e => e.stopPropagation()}>
            {sidePanel === 'customer' ? (
              <CustomerPanel
                store={store}
                conversation={conversation}
                allLabels={allLabels}
                onClose={() => setSidePanel(null)}
                onInsert={s => {
                  if (!window.matchMedia?.('(min-width: 1280px)').matches) setSidePanel(null)
                  insertText(s)
                }}
                onCreateOrder={() => {
                  if (!window.matchMedia?.('(min-width: 1280px)').matches) setSidePanel(null)
                  setOrderModal(true)
                }}
              />
            ) : (
              <MediaPanel messages={thread} onClose={() => setSidePanel(null)} onOpenImage={m => m.media && openViewer(m.media)} onGoToMessage={goToMessage} />
            )}
          </div>
        </div>
      )}

      {/* Vista previa del adjunto */}
      {attachment && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setAttachment(null)}>
          <div className="bg-white rounded-t-[18px] sm:rounded-[14px] shadow-xl w-full sm:max-w-sm" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-[#E6EBF1] flex items-center justify-between">
              <h3 className="font-semibold text-[#1e3a5f] text-[14px]">{t('shopichat.composer.sendFile')}</h3>
              <button type="button" onClick={() => setAttachment(null)} className="text-[#A9B6C6] hover:text-[#425466]" aria-label={t('shopichat.common.cancel')}>
                <IconX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              {attachment.type.startsWith('image/') ? (
                <div className="relative">
                  {attachmentUrl && <img src={attachmentUrl} alt="" className="rounded-lg max-h-64 mx-auto object-contain" />}
                  <button
                    type="button"
                    onClick={() => attachmentUrl && setEditing(attachmentUrl)}
                    className="absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-black/55 text-white text-[12px] font-medium hover:bg-black/70"
                  >
                    <IconPencil className="w-3.5 h-3.5" />{t('shopichat.media.edit')}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-[#F6F9FC] rounded-lg px-4 py-3">
                  <IconFile className="w-8 h-8 text-red-500 flex-none" />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-[#1e3a5f] truncate">{attachment.name}</p>
                    <p className="text-[11.5px] text-[#A9B6C6]">{(attachment.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                </div>
              )}
              <input
                type="text"
                value={caption}
                onChange={e => setCaption(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); sendAttachment() } }}
                placeholder={t('shopichat.composer.captionPlaceholder')}
                className="w-full mt-4 px-4 py-2.5 bg-[#F6F9FC] border border-[#E6EBF1] rounded-full text-[13px] outline-none focus:border-[#38bdf8]"
              />
            </div>
            <div className="px-5 py-3 border-t border-[#E6EBF1] flex justify-end gap-2">
              <button type="button" onClick={() => setAttachment(null)} className="px-4 py-2 text-[13px] font-semibold text-[#425466] hover:bg-[#F6F9FC] rounded-lg">
                {t('shopichat.common.cancel')}
              </button>
              <button type="button" onClick={sendAttachment} className="px-4 py-2 text-[13px] font-semibold bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2a4d7a]">
                {t('shopichat.composer.send')}
              </button>
            </div>
          </div>
        </div>
      )}

      {videoUrl && <VideoViewer url={videoUrl} onClose={() => setVideoUrl(null)} />}

      {viewerIndex !== null && images.length > 0 && (
        <MediaViewer
          images={images}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
          onEdit={windowOpen ? m => setEditing(m.url) : undefined}
          onForward={m => setForwarding({ items: [{ media: m, text: '', summary: `📷 ${t('shopichat.types.image')}`, sticker: m.mimeType === 'image/webp' }], summary: `📷 ${t('shopichat.types.image')}` })}
        />
      )}

      {editing && (
        <PhotoEditor
          url={editing}
          onClose={() => setEditing(null)}
          onSend={async (file, c) => {
            setEditing(null)
            setViewerIndex(null)
            setAttachment(null)
            setCaption('')
            await sendFile(file, c)
          }}
        />
      )}

      {forwarding && (
        <ForwardSheet
          conversations={conversations}
          summary={forwarding.summary}
          now={now}
          onClose={() => setForwarding(null)}
          onSend={async ids => {
            await forwardTo(ids, forwarding.items)
            setForwarding(null)
          }}
        />
      )}

      {productPicker && (
        <ProductPicker store={store} onClose={() => setProductPicker(false)} onSend={sendProduct} />
      )}

      {couponPicker && (
        <CouponPicker
          store={store}
          onClose={() => setCouponPicker(false)}
          onInsert={s => { setCouponPicker(false); insertText(s) }}
        />
      )}

      {orderModal && (
        <ChatOrderModal
          store={store}
          conversation={conversation}
          customerOrders={customerOrders}
          onClose={() => setOrderModal(false)}
          onCreated={onOrderCreated}
        />
      )}

      {templateOpen && (
        <TemplatePicker
          storeId={storeId}
          templates={templates}
          title={t('shopichat.templates.titleFor', { name: displayName })}
          onClose={() => setTemplateOpen(false)}
          onSend={onSendTemplate}
        />
      )}
    </div>
  )
}

function SellItem({ icon, onClick, children }: { icon: React.ReactNode; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="w-full text-left px-3.5 py-2 hover:bg-[#F6F9FC] flex items-center gap-2.5">
      <span className="text-[#0284C7]">{icon}</span>{children}
    </button>
  )
}

function MenuItem({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="w-full text-left px-3.5 py-2 hover:bg-[#F6F9FC]">
      {children}
    </button>
  )
}

/** Casilla de una burbuja mientras se eligen mensajes para reenviar. */
function SelectBox({ on, disabled = false }: { on: boolean; disabled?: boolean }) {
  if (disabled) return <span className="w-5 h-5 flex-none" aria-hidden="true" />
  return (
    <span className={`w-5 h-5 rounded-full border grid place-items-center flex-none ${on ? 'bg-[#1e3a5f] border-[#1e3a5f] text-white' : 'border-[#A9B6C6] bg-white/80'}`}>
      {on && <IconCheck className="w-3 h-3" />}
    </span>
  )
}
