/**
 * ShopiChat — la bandeja de WhatsApp de la tienda.
 * ================================================
 * Portada de la bandeja web de Cobrify (pages/Chat.jsx) y adaptada a
 * Shopifree: todo cuelga de `stores/{storeId}`, se entra desde el panel y es
 * una función del plan Business.
 *
 * Estados:
 *  - plan distinto de Business → pantalla bloqueada (en la app nativa sin
 *    enlaces de compra: regla de Apple, ver useShowUpgradeUI);
 *  - sin número conectado → "Conectar mi WhatsApp" (Embedded Signup);
 *  - conectado → la bandeja: lista a la izquierda y conversación a la derecha
 *    en pantalla grande; en el celular, un panel por vez con "volver".
 *
 * La conversación abierta vive en la URL (`?c=<waId>`): así la abre el toque
 * de una notificación push y el botón atrás del celular vuelve a la lista.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import { useShowUpgradeUI } from '../../hooks/useShowUpgradeUI'
import { setActiveShopiChat } from '../../hooks/useShopiChatAlerts'
import { getEffectivePlan } from '../../lib/stripe'
import { canSeeShopiChat } from '../../lib/shopichatAccess'
import { useToast } from '../../components/ui/Toast'
import {
  DEFAULT_AI_SETTINGS,
  DEFAULT_ORDER_NOTIFICATIONS,
  MAX_CONVERSATIONS,
  formatPhone,
  onlyDigits,
  prefetchMessages,
  samePhone,
  sendTemplateToPhone,
  setConversationStatus,
  subscribeAccount,
  subscribeAutomations,
  subscribeConversations,
  subscribeTemplates,
  toDate,
  windowRemainingMs,
} from '../../lib/shopichatService'
import type {
  WaAccount,
  WaAiSettings,
  WaAiStatus,
  WaConversation,
  WaConversationStatus,
  WaOrderNotifications,
  WaQuickReply,
  WaTemplate,
  WaTemplatesDoc,
} from '../../types/shopichat'
import type { TemplateValues } from '../../lib/shopichatService'
import type { Store } from '../../types'
import ConnectWhatsApp from '../../components/shopichat/ConnectWhatsApp'
import Thread from '../../components/shopichat/Thread'
import SettingsPanel from '../../components/shopichat/SettingsPanel'
import SoundButton from '../../components/shopichat/SoundButton'
import TemplatePicker from '../../components/shopichat/TemplatePicker'
import { VoiceNoteBar } from '../../components/shopichat/VoiceNotes'
import { avatarColor, labelColor } from '../../components/shopichat/utils'
import {
  IconArrowLeft, IconBot, IconChat, IconClock, IconLock, IconNote, IconSearch, IconSettings, IconSparkles, IconWhatsApp,
} from '../../components/shopichat/icons'

const STATUSES: WaConversationStatus[] = ['open', 'pending', 'done']
const statusOf = (c: WaConversation): WaConversationStatus => c.status || 'open'

/**
 * Alto disponible para la bandeja: desde donde empieza hasta el fondo de la
 * ventana. Se mide en vez de adivinarlo porque arriba pueden aparecer avisos
 * del plan o de configuración, y en el celular el teclado achica la ventana.
 */
function useFillHeight() {
  const ref = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | null>(null)
  useLayoutEffect(() => {
    const measure = () => {
      const el = ref.current
      if (!el) return
      const top = el.getBoundingClientRect().top + window.scrollY
      const vh = window.visualViewport?.height || window.innerHeight
      setHeight(Math.max(320, Math.round(vh - top)))
    }
    measure()
    window.addEventListener('resize', measure)
    window.visualViewport?.addEventListener('resize', measure)
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    if (ro && ref.current?.parentElement) ro.observe(ref.current.parentElement)
    return () => {
      window.removeEventListener('resize', measure)
      window.visualViewport?.removeEventListener('resize', measure)
      ro?.disconnect()
    }
  }, [])
  return { ref, height }
}

export default function ShopiChat() {
  const { t } = useTranslation('dashboard')
  const { store, loading, firebaseUser } = useAuth()
  const showUpgrade = useShowUpgradeUI()
  const { localePath } = useLanguage()

  if (loading || !store) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a5f]" />
      </div>
    )
  }

  // Lanzamiento por etapas (ver lib/shopichatAccess): fuera de la lista, al inicio.
  if (!canSeeShopiChat(firebaseUser?.email)) return <Navigate to={localePath('/dashboard')} replace />

  if (getEffectivePlan(store) !== 'business') {
    return (
      <div className="max-w-xl mx-auto py-4 sm:py-10">
        <div className="bg-white rounded-[14px] border border-[#E6EBF1] p-6 sm:p-8 text-center" style={{ boxShadow: '0 10px 28px -22px rgba(30,58,95,.4)' }}>
          <div className="relative w-14 h-14 mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-[#25D366] text-white grid place-items-center">
              <IconWhatsApp className="w-8 h-8" />
            </div>
            <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#1e3a5f] text-white grid place-items-center border-2 border-white">
              <IconLock className="w-3 h-3" />
            </span>
          </div>
          <h1 className="mt-4 text-lg sm:text-xl font-semibold tracking-tight text-[#1e3a5f]">{t('shopichat.locked.title')}</h1>
          <p className="mt-1.5 text-[0.85rem] text-[#8898AA]">{t('shopichat.locked.body')}</p>
          <ul className="mt-5 space-y-2 text-left max-w-sm mx-auto">
            {[t('shopichat.connect.benefit1'), t('shopichat.connect.benefit2'), t('shopichat.connect.benefit3')].map(b => (
              <li key={b} className="flex items-start gap-2 text-[0.82rem] text-[#425466]">
                <IconSparkles className="w-4 h-4 text-[#38bdf8] flex-none mt-0.5" />
                {b}
              </li>
            ))}
          </ul>
          {showUpgrade ? (
            <Link
              to={localePath('/dashboard/plan')}
              className="mt-6 inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#1e3a5f] text-white text-[0.88rem] font-semibold hover:bg-[#2a4d7a]"
            >
              {t('shopichat.locked.cta')}
            </Link>
          ) : (
            <p className="mt-6 text-[0.8rem] text-[#8898AA]">{t('shopichat.locked.native')}</p>
          )}
        </div>
      </div>
    )
  }

  return <ShopiChatConnected store={store} />
}

/** Lee la cuenta y decide entre conectar o la bandeja. */
function ShopiChatConnected({ store }: { store: Store }) {
  const { t } = useTranslation('dashboard')
  const [account, setAccount] = useState<WaAccount | null | undefined>(undefined)
  const [accountError, setAccountError] = useState(false)

  useEffect(() => subscribeAccount(store.id, setAccount, () => setAccountError(true)), [store.id])

  if (account === undefined && !accountError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a5f]" />
      </div>
    )
  }
  if (accountError && account === undefined) {
    return <p className="text-center text-[0.85rem] text-red-600 py-10">{t('shopichat.errors.accountLoad')}</p>
  }
  if (!account || account.status !== 'connected') {
    return <ConnectWhatsApp storeId={store.id} account={account || null} />
  }
  return <Inbox store={store} account={account} />
}

function Inbox({ store, account }: { store: Store; account: WaAccount }) {
  const { t, i18n } = useTranslation('dashboard')
  const { showToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeId = searchParams.get('c')
  const storeId = store.id
  const locale = i18n.language

  const [conversations, setConversations] = useState<WaConversation[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState(false)
  const [templates, setTemplates] = useState<WaTemplatesDoc>({ items: [], syncedAt: null })
  const [quickReplies, setQuickReplies] = useState<WaQuickReply[]>([])
  const [orderNotifications, setOrderNotifications] = useState<WaOrderNotifications>(DEFAULT_ORDER_NOTIFICATIONS)
  const [aiSettings, setAiSettings] = useState<WaAiSettings>(DEFAULT_AI_SETTINGS)
  const [aiStatus, setAiStatus] = useState<WaAiStatus | null>(null)
  const [tab, setTab] = useState<WaConversationStatus>('open')
  const [search, setSearch] = useState('')
  const [labelFilter, setLabelFilter] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  // Se refresca cada minuto para que la ventana de 24 h no quede congelada.
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => subscribeConversations(
    storeId,
    list => { setConversations(list); setLoading(false) },
    () => { setListError(true); setLoading(false) }
  ), [storeId])
  useEffect(() => subscribeTemplates(storeId, setTemplates), [storeId])
  useEffect(() => subscribeAutomations(storeId, a => {
    setQuickReplies(a.quickReplies)
    setOrderNotifications(a.orderNotifications)
    setAiSettings(a.ai)
    setAiStatus(a.aiStatus || null)
  }), [storeId])

  // El panel suena distinto si el mensaje entra en la conversación que se está mirando.
  useEffect(() => {
    setActiveShopiChat(activeId)
    return () => setActiveShopiChat(null)
  }, [activeId])

  // Abrir desde la lista AGREGA una entrada al historial (así el "atrás" del
  // celular vuelve a la lista); pasar de una conversación a otra la reemplaza.
  // Cerrar con la flecha deshace esa entrada si la pusimos nosotros, para no
  // dejar la lista dos veces en el historial.
  const pushedOpen = useRef(false)
  const openConversation = useCallback((waId: string | null) => {
    setSettingsOpen(false)
    if (!waId && activeId && pushedOpen.current) {
      pushedOpen.current = false
      window.history.back()
      return
    }
    const replace = Boolean(activeId) || !waId
    if (waId && !activeId) pushedOpen.current = true
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (waId) next.set('c', waId)
      else next.delete('c')
      next.delete('n')
      return next
    }, { replace })
  }, [setSearchParams, activeId])

  // Si la conversación se cerró con el "atrás" del navegador, ya no hay nada
  // que deshacer.
  useEffect(() => { if (!activeId) pushedOpen.current = false }, [activeId])

  // Al posar el mouse sobre una fila se trae su hilo a la caché local (una vez,
  // y solo si el mouse se queda 200 ms).
  const prefetched = useRef(new Set<string>())
  const prefetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prefetch = (waId: string) => {
    if (prefetchTimer.current) clearTimeout(prefetchTimer.current)
    if (prefetched.current.has(waId)) return
    prefetchTimer.current = setTimeout(() => {
      prefetched.current.add(waId)
      void prefetchMessages(storeId, waId)
    }, 200)
  }

  const active = useMemo(() => conversations.find(c => c.id === activeId) || null, [conversations, activeId])

  // ?c=<dígitos> desde Pedidos/Clientes: el número puede venir con otro
  // formato que el waId (sin código de país, con un 9 de más...). Si hay una
  // conversación con ese teléfono se abre esa; si no, se ofrece empezarla.
  const phoneMatch = useMemo(() => {
    if (active || !activeId || loading) return null
    return conversations.find(c => samePhone(c.waId, activeId) || samePhone(c.phone, activeId)) || null
  }, [active, activeId, loading, conversations])

  useEffect(() => {
    if (!phoneMatch) return
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('c', phoneMatch.id)
      next.delete('n')
      return next
    }, { replace: true })
  }, [phoneMatch, setSearchParams])

  // La conversación que acabamos de abrir con una plantilla: hasta que el
  // servidor la crea y llega por la suscripción se muestra "abriendo…".
  const [startedWaId, setStartedWaId] = useState<string | null>(null)
  const newPhone = !active && !phoneMatch && !loading && activeId && /^\d{8,15}$/.test(activeId) ? activeId : null
  const newName = searchParams.get('n')

  const counts = useMemo(() => {
    const c: Record<WaConversationStatus, number> = { open: 0, pending: 0, done: 0 }
    const unread: Record<WaConversationStatus, number> = { open: 0, pending: 0, done: 0 }
    for (const conv of conversations) {
      c[statusOf(conv)] += 1
      if ((conv.unread || 0) > 0) unread[statusOf(conv)] += 1
    }
    return { c, unread }
  }, [conversations])

  const allLabels = useMemo(() => {
    const set = new Set<string>()
    for (const c of conversations) for (const l of c.labels || []) set.add(l)
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [conversations])

  const searching = search.trim()
  const filtered = useMemo(() => {
    // Con algo escrito se busca en TODAS las pestañas: quien busca a un cliente
    // no sabe si su conversación quedó abierta o completada.
    let list = searching ? conversations : conversations.filter(c => statusOf(c) === tab)
    if (labelFilter) list = list.filter(c => (c.labels || []).includes(labelFilter))
    if (searching) {
      const q = searching.toLowerCase()
      const digits = onlyDigits(searching)
      list = list.filter(c =>
        (c.name || '').toLowerCase().includes(q)
        || (digits.length >= 3 && (onlyDigits(c.waId).includes(digits) || onlyDigits(c.phone).includes(digits)))
      )
    }
    return list
  }, [conversations, tab, labelFilter, searching])

  // Al cambiar el estado la conversación se va de la pestaña: en pantalla
  // grande se abre la siguiente (para despachar de corrido); en el celular se
  // vuelve a la lista.
  const changeStatus = async (status: WaConversationStatus) => {
    if (!activeId) return
    const leaves = status !== tab && !searching
    const i = filtered.findIndex(c => c.id === activeId)
    const next = leaves && i >= 0 ? filtered[i + 1] || filtered[i - 1] || null : null
    try {
      await setConversationStatus(storeId, activeId, status)
      if (!leaves) return
      const wide = window.matchMedia?.('(min-width: 768px)').matches
      openConversation(wide ? next?.id || null : null)
    } catch {
      showToast(t('shopichat.errors.statusFailed'), 'error')
    }
  }

  const relativeTime = (c: WaConversation) => {
    const d = toDate(c.lastMessageAt)
    if (!d) return ''
    const today = new Date(now)
    const yesterday = new Date(now)
    yesterday.setDate(today.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    if (d.toDateString() === yesterday.toDateString()) return t('shopichat.time.yesterday')
    if (now - d.getTime() < 6 * 86400000) return d.toLocaleDateString(locale, { weekday: 'short' })
    return d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: '2-digit' })
  }

  const { ref, height } = useFillHeight()
  const showingPane = Boolean(active) || settingsOpen || Boolean(newPhone)

  return (
    // Márgenes negativos: la bandeja va de borde a borde bajo la barra de
    // arriba, como SupportChats, en vez de "una tarjeta dentro de la página".
    <div className="-m-4 sm:-m-6 lg:-mt-5 lg:-mb-8 lg:-mx-8">
      <div ref={ref} className="bg-white overflow-hidden flex" style={{ height: height ?? 'calc(100vh - 3rem)' }}>
        {/* ---------- Lista ---------- */}
        <aside className={`w-full md:w-80 lg:w-[22rem] md:border-r border-[#E6EBF1] flex-col min-h-0 ${showingPane ? 'hidden md:flex' : 'flex'}`}>
          <div className="px-3 pt-3 pb-2.5 border-b border-[#E6EBF1] space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-[#25D366] text-white grid place-items-center flex-none">
                <IconWhatsApp className="w-4 h-4" />
              </span>
              <div className="min-w-0 flex-1">
                <h1 className="font-semibold text-[#1e3a5f] text-[14px] leading-tight">ShopiChat</h1>
                <p className="text-[11px] text-[#8898AA] truncate">{account.displayNumber || account.verifiedName}</p>
              </div>
              <SoundButton />
              <button
                type="button"
                onClick={() => { openConversation(null); setSettingsOpen(true) }}
                className={`p-1.5 rounded-lg hover:bg-[#F6F9FC] ${settingsOpen ? 'text-[#0284C7]' : 'text-[#8898AA] hover:text-[#1e3a5f]'}`}
                title={t('shopichat.settings.title')}
                aria-label={t('shopichat.settings.title')}
              >
                <IconSettings className="w-[18px] h-[18px]" />
              </button>
            </div>

            <div className="relative">
              <IconSearch className="w-4 h-4 text-[#A9B6C6] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('shopichat.list.search')}
                className="w-full pl-9 pr-3 py-2 text-[13px] bg-[#F6F9FC] border border-[#E6EBF1] rounded-lg outline-none focus:border-[#38bdf8]"
              />
            </div>

            <div className="flex gap-1 p-1 rounded-xl bg-[#F6F9FC] border border-[#E6EBF1]">
              {STATUSES.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTab(s)}
                  className={`flex-1 rounded-lg px-1.5 py-1.5 text-[11.5px] transition-colors ${
                    tab === s ? 'bg-white text-[#1e3a5f] font-semibold shadow-sm' : 'text-[#8898AA] hover:text-[#1e3a5f]'
                  }`}
                >
                  {t(`shopichat.status.${s}`)}
                  {counts.c[s] > 0 && <span className="ml-1 text-[10.5px] text-[#A9B6C6]">{counts.c[s]}</span>}
                  {tab !== s && counts.unread[s] > 0 && <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-[#25D366] align-middle" />}
                </button>
              ))}
            </div>

            {allLabels.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto -mx-3 px-3 pb-0.5" style={{ scrollbarWidth: 'none' }}>
                <button
                  type="button"
                  onClick={() => setLabelFilter(null)}
                  className={`flex-none px-2.5 py-1 rounded-full border text-[11px] font-medium ${!labelFilter ? 'border-[#1e3a5f] bg-[#1e3a5f] text-white' : 'border-[#E6EBF1] text-[#425466] hover:bg-[#F6F9FC]'}`}
                >
                  {t('shopichat.labels.all')}
                </button>
                {allLabels.map(l => {
                  const on = labelFilter === l
                  const c = labelColor(l)
                  return (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLabelFilter(on ? null : l)}
                      className="flex-none inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium"
                      style={on ? { borderColor: c, backgroundColor: `${c}1A`, color: c } : { borderColor: '#E6EBF1', color: '#425466' }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c }} />
                      {l}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <VoiceNoteBar onOpen={id => openConversation(id)} />

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
            {loading && (
              <div className="p-3 space-y-3 animate-pulse">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#F1F5F9]" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-1/2 rounded bg-[#F1F5F9]" />
                      <div className="h-3 w-3/4 rounded bg-[#F1F5F9]" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {listError && <p className="m-3 p-3 rounded-lg bg-red-50 text-[12.5px] text-red-700">{t('shopichat.errors.listLoad')}</p>}
            {!loading && !listError && filtered.length === 0 && (
              <div className="p-6 text-center">
                <IconChat className="w-10 h-10 text-[#E6EBF1] mx-auto mb-3" />
                <p className="text-[13px] text-[#8898AA]">
                  {searching || labelFilter ? t('shopichat.list.noMatches') : t(`shopichat.list.empty.${tab}`)}
                </p>
              </div>
            )}
            {!loading && conversations.length >= MAX_CONVERSATIONS && (
              <p className="px-3 pt-2 text-center text-[11px] text-[#A9B6C6]">{t('shopichat.list.limited', { count: MAX_CONVERSATIONS })}</p>
            )}
            {filtered.map(c => {
              const autopilotOn = aiSettings.enabled && aiSettings.mode === 'autopilot'
              const closed = windowRemainingMs(c, now) <= 0
              const otherTab = searching && statusOf(c) !== tab ? t(`shopichat.status.${statusOf(c)}`) : null
              const unread = c.unread || 0
              const name = c.name || formatPhone(c.waId)
              const initials = (c.name || '').trim()
                ? (c.name || '').trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase()
                : onlyDigits(c.waId).slice(-2)
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => openConversation(c.id)}
                  onMouseEnter={() => prefetch(c.id)}
                  className={`w-full text-left px-3 py-3 border-b border-[#F1F5F9] hover:bg-[#F6F9FC] transition-colors ${c.id === activeId ? 'bg-[#F0F9FF]' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full flex-none grid place-items-center text-white text-[13px] font-semibold" style={{ backgroundColor: avatarColor(c.waId || name) }}>
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[13.5px] truncate ${unread > 0 ? 'font-semibold text-[#1e3a5f]' : 'font-medium text-[#1e3a5f]'}`}>{name}</span>
                        {closed && <span title={t('shopichat.window.closedShort')}><IconClock className="w-3.5 h-3.5 text-[#A9B6C6] flex-none" /></span>}
                        {autopilotOn && !closed && !c.optOut && !c.aiPaused && (
                          <span title={t('shopichat.ai.autopilot.handling')}><IconBot className="w-3.5 h-3.5 text-[#7C3AED] flex-none" /></span>
                        )}
                        {otherTab && <span className="ml-auto text-[10.5px] px-1.5 py-px rounded bg-[#F1F5F9] text-[#8898AA] flex-none">{otherTab}</span>}
                      </div>
                      <p className={`text-[12.5px] truncate mt-0.5 ${unread > 0 ? 'text-[#425466]' : 'text-[#8898AA]'}`}>
                        {c.lastDirection === 'out' && <span className="text-[#A9B6C6]">{t('shopichat.list.you')}: </span>}
                        {c.lastMessage}
                      </p>
                      {((c.labels || []).length > 0 || c.note) && (
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          {(c.labels || []).slice(0, 3).map(l => {
                            const col = labelColor(l)
                            return <span key={l} className="px-1.5 py-px rounded text-[10.5px] font-semibold" style={{ backgroundColor: `${col}1A`, color: col }}>{l}</span>
                          })}
                          {(c.labels || []).length > 3 && <span className="text-[10.5px] text-[#A9B6C6]">+{(c.labels || []).length - 3}</span>}
                          {c.note && <IconNote className="w-3 h-3 text-[#A9B6C6]" />}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-none">
                      <span className={`text-[11px] ${unread > 0 ? 'text-[#15803D] font-semibold' : 'text-[#A9B6C6]'}`}>{relativeTime(c)}</span>
                      {unread > 0 && (
                        <span className="bg-[#25D366] text-white text-[10.5px] font-bold rounded-full px-1.5 min-w-[18px] h-[18px] leading-[18px] text-center">
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        {/* ---------- Conversación / configuración ---------- */}
        <section className={`flex-1 min-w-0 min-h-0 flex ${showingPane ? 'flex' : 'hidden md:flex'}`}>
          {settingsOpen ? (
            <SettingsPanel
              storeId={storeId}
              account={account}
              quickReplies={quickReplies}
              orderNotifications={orderNotifications}
              aiSettings={aiSettings}
              aiStatus={aiStatus}
              templates={templates}
              storeLanguage={store.language}
              onBack={() => setSettingsOpen(false)}
            />
          ) : active ? (
            <Thread
              key={active.id}
              store={store}
              conversation={active}
              conversations={conversations}
              templates={templates}
              quickReplies={quickReplies}
              aiEnabled={aiSettings.enabled}
              autopilot={aiSettings.enabled && aiSettings.mode === 'autopilot'}
              allLabels={allLabels}
              now={now}
              onBack={() => openConversation(null)}
              onStatus={changeStatus}
              onOpenConversation={id => openConversation(id)}
            />
          ) : newPhone ? (
            <NewConversation
              key={newPhone}
              storeId={storeId}
              phone={newPhone}
              name={newName}
              templates={templates}
              opening={startedWaId === newPhone}
              onBack={() => openConversation(null)}
              onStarted={waId => {
                setStartedWaId(waId)
                setSearchParams(prev => {
                  const next = new URLSearchParams(prev)
                  next.set('c', waId)
                  return next
                }, { replace: true })
              }}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-[#fafbfc]">
              <div className="text-center px-6">
                <IconChat className="w-12 h-12 text-[#E6EBF1] mx-auto mb-3" />
                <p className="text-[13px] text-[#8898AA]">
                  {activeId && !loading ? t('shopichat.list.notFound') : t('shopichat.list.pick')}
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

/**
 * "Nueva conversación con +51 …": se llega desde Pedidos o Clientes con un
 * número que todavía no escribió. Sin ventana de 24 h abierta WhatsApp solo
 * deja empezar con una plantilla aprobada; al mandarla el servidor crea la
 * conversación y la bandeja la abre en cuanto aparece en la lista.
 */
function NewConversation({
  storeId, phone, name, templates, opening, onBack, onStarted,
}: {
  storeId: string
  phone: string
  name: string | null
  templates: WaTemplatesDoc
  opening: boolean
  onBack: () => void
  onStarted: (waId: string) => void
}) {
  const { t } = useTranslation('dashboard')
  const { showToast } = useToast()
  const [picking, setPicking] = useState(false)
  const pretty = `+${formatPhone(phone).replace(/^\+/, '')}`
  const display = name ? `${name} (${pretty})` : pretty

  const onSend = async (tpl: WaTemplate, values: TemplateValues) => {
    const r = await sendTemplateToPhone(storeId, phone, tpl, values)
    showToast(t('shopichat.templates.sent'), 'success')
    setPicking(false)
    onStarted(r.waId || phone)
  }

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-[#fafbfc]">
      <div className="px-3 py-2.5 border-b border-[#E6EBF1] bg-white flex items-center gap-2">
        <button type="button" onClick={onBack} className="md:hidden p-1.5 -ml-1 rounded-lg text-[#8898AA] hover:bg-[#F6F9FC]" aria-label={t('shopichat.common.back')}>
          <IconArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-9 h-9 rounded-full flex-none grid place-items-center text-white text-[12px] font-semibold" style={{ backgroundColor: avatarColor(phone) }}>
          {(name || '').trim() ? (name || '').trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase() : phone.slice(-2)}
        </div>
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold text-[#1e3a5f] truncate">{name || pretty}</p>
          {name && <p className="text-[11.5px] text-[#8898AA]">{pretty}</p>}
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        {opening ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#1e3a5f] mx-auto" />
            <p className="mt-3 text-[13px] text-[#8898AA]">{t('shopichat.newConversation.opening')}</p>
          </div>
        ) : (
          <div className="max-w-sm text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#25D366] text-white grid place-items-center mx-auto">
              <IconWhatsApp className="w-7 h-7" />
            </div>
            <h2 className="mt-3 text-[15px] font-semibold text-[#1e3a5f]">{t('shopichat.newConversation.title', { name: display })}</h2>
            <p className="mt-1.5 text-[12.5px] text-[#8898AA]">{t('shopichat.newConversation.body')}</p>
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="mt-5 px-4 py-2 rounded-lg bg-[#1e3a5f] text-white text-[13px] font-semibold hover:bg-[#2a4d7a]"
            >
              {t('shopichat.newConversation.cta')}
            </button>
          </div>
        )}
      </div>
      {picking && (
        <TemplatePicker
          storeId={storeId}
          templates={templates}
          title={t('shopichat.templates.titleFor', { name: display })}
          onClose={() => setPicking(false)}
          onSend={onSend}
        />
      )}
    </div>
  )
}
