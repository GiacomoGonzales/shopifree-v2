/**
 * Ficha del cliente en ShopiChat — "cliente 360".
 *
 * Vincula la conversación con los pedidos de la tienda POR TELÉFONO: el
 * `customer.phone` de cada pedido se normaliza a dígitos y se compara con el
 * waId por los últimos 9–10 dígitos (samePhone), así da igual si uno trae el
 * código de país y el otro no.
 *
 * Por qué NO una consulta de Firestore por teléfono: `customer.phone` se
 * guarda tal cual lo escribió el comprador ("940 200 754", "+51940200754",
 * "51 940-200-754"...), así que un `where('customer.phone', 'in', variantes)`
 * se perdería pedidos y además pediría un índice compuesto con createdAt. En
 * cambio se bajan los ÚLTIMOS 500 pedidos de la tienda una vez (misma consulta
 * que Pedidos y Clientes, que Firestore suele tener en caché) y se filtran acá;
 * la lista se guarda por tienda unos minutos, así abrir la ficha de diez
 * conversaciones no son diez consultas. Límite conocido: un cliente cuyo
 * único pedido es más viejo que esos 500 no aparece.
 *
 * Secciones: resumen, etiquetas y nota DEL CLIENTE (perfil compartido con la
 * pantalla Clientes), direcciones, pedidos y envíos, lo que más compra,
 * atajos para mandar links, y al final lo propio de ESTA conversación
 * (etiquetas de la bandeja y nota del chat). Todo lo que se "envía" cae en el
 * cuadro de escribir, no sale solo.
 */
import { optimizeImage } from '../../utils/media'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { formatPrice } from '../../lib/currency'
import { formatDeliveryAddress } from '../../lib/customerKey'
import { ORDER_STATUS_COLORS } from '../../lib/orderStatus'
import { MAX_LABELS, formatPhone, setConversationLabels, setConversationNote } from '../../lib/shopichatService'
import { useLanguage } from '../../hooks/useLanguage'
import { useToast } from '../ui/Toast'
import CustomerProfileEditor from '../dashboard/CustomerProfileEditor'
import type { Product, Store } from '../../types'
import type { WaConversation } from '../../types/shopichat'
import { IconBag, IconChevronDown, IconCopy, IconLink, IconMapPin, IconNote, IconPlus, IconSearch, IconSend, IconTag, IconTruck, IconX } from './icons'
import { labelColor, storeUrlOf } from './utils'
// Pedidos y productos de la tienda con caché compartida con el hilo (ver storeData.ts).
import { storeProducts, useCustomerOrders } from './storeData'

const toDateSafe = (v: unknown): Date | null => {
  if (!v) return null
  const d = v instanceof Date ? v : new Date(v as string)
  return Number.isNaN(d.getTime()) ? null : d
}

const ORDERS_PREVIEW = 5

interface Props {
  store: Store
  conversation: WaConversation
  allLabels: string[]
  onInsert: (text: string) => void
  /** Abre "Crear pedido" (vender desde el chat). */
  onCreateOrder?: () => void
  onClose: () => void
}

export default function CustomerPanel({ store, conversation, allLabels, onInsert, onCreateOrder, onClose }: Props) {
  const { t, i18n } = useTranslation('dashboard')
  const { localePath } = useLanguage()
  const { showToast } = useToast()
  const [products, setProducts] = useState<Product[] | null>(null)
  const [pickingProduct, setPickingProduct] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [labelDraft, setLabelDraft] = useState('')
  const [noteDraft, setNoteDraft] = useState(conversation.note || '')
  const [savingNote, setSavingNote] = useState(false)
  const [showAllOrders, setShowAllOrders] = useState(false)
  const [showAllAddresses, setShowAllAddresses] = useState(false)

  const phone = conversation.phone || conversation.waId
  // Los pedidos de este cliente, del más nuevo al más viejo (así los trae getAll).
  // Se recargan solos cuando se crea un pedido desde el chat.
  const { orders: mine, loading: loadingOrders } = useCustomerOrders(store.id, phone)

  // Los productos hacen falta para el link (slug) de "lo que más compra" y
  // para el buscador de "Link de un producto".
  const needProducts = pickingProduct || mine.length > 0
  useEffect(() => {
    if (!needProducts || products) return undefined
    let alive = true
    storeProducts(store.id).then(list => { if (alive) setProducts(list) })
    return () => { alive = false }
  }, [needProducts, products, store.id])

  const currency = store.currency || 'USD'
  const baseUrl = storeUrlOf(store)
  const locale = i18n.language

  const summary = useMemo(() => {
    const valid = mine.filter(o => o.status !== 'cancelled')
    const spent = valid.reduce((s, o) => s + (Number(o.total) || 0), 0)
    const dates = mine.map(o => toDateSafe(o.createdAt)).filter((d): d is Date => Boolean(d))
    const first = dates.length ? new Date(Math.min(...dates.map(d => d.getTime()))) : null
    const last = dates.length ? new Date(Math.max(...dates.map(d => d.getTime()))) : null
    return { count: valid.length, spent, avg: valid.length ? spent / valid.length : 0, first, last, cancelled: mine.length - valid.length }
  }, [mine])

  // Direcciones distintas, la más reciente primero (mine ya viene así).
  const addresses = useMemo(() => {
    const seen = new Map<string, { text: string; last: Date | null; count: number }>()
    for (const o of mine) {
      if (o.deliveryMethod === 'pickup' || !o.deliveryAddress?.street) continue
      const text = formatDeliveryAddress(o.deliveryAddress)
      if (!text) continue
      const k = text.toLowerCase().replace(/[\s.,#-]+/g, ' ').trim()
      const hit = seen.get(k)
      if (hit) hit.count += 1
      else seen.set(k, { text, last: toDateSafe(o.createdAt), count: 1 })
    }
    return [...seen.values()]
  }, [mine])

  // Lo que más compra: por cantidad, sin contar pedidos cancelados.
  const topProducts = useMemo(() => {
    const byId = new Map<string, { id: string; name: string; image?: string; qty: number }>()
    for (const o of mine) {
      if (o.status === 'cancelled') continue
      for (const it of o.items || []) {
        const id = it.productId || it.productName
        if (!id) continue
        const hit = byId.get(id)
        if (hit) {
          hit.qty += Number(it.quantity) || 0
          if (!hit.image && it.productImage) hit.image = it.productImage
        } else {
          byId.set(id, { id, name: it.productName, image: it.productImage, qty: Number(it.quantity) || 0 })
        }
      }
    }
    return [...byId.values()].sort((a, b) => b.qty - a.qty).slice(0, 5)
  }, [mine])

  const productById = useMemo(() => new Map((products || []).map(p => [p.id, p])), [products])

  const labels = conversation.labels || []
  const suggestions = allLabels.filter(l => !labels.includes(l) && l.toLowerCase().includes(labelDraft.trim().toLowerCase())).slice(0, 6)

  const saveLabels = async (next: string[]) => {
    try {
      await setConversationLabels(store.id, conversation.id, next)
    } catch {
      showToast(t('shopichat.errors.labelFailed'), 'error')
    }
  }

  const addLabel = (raw: string) => {
    const l = raw.trim().slice(0, 30)
    if (!l || labels.includes(l)) return
    if (labels.length >= MAX_LABELS) { showToast(t('shopichat.labels.max', { count: MAX_LABELS }), 'error'); return }
    setLabelDraft('')
    void saveLabels([...labels, l])
  }

  const saveNote = async () => {
    setSavingNote(true)
    try {
      await setConversationNote(store.id, conversation.id, noteDraft.trim())
      showToast(noteDraft.trim() ? t('shopichat.note.saved') : t('shopichat.note.deleted'), 'success')
    } catch {
      showToast(t('shopichat.note.error'), 'error')
    } finally {
      setSavingNote(false)
    }
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      showToast(t('shopichat.customer.copied'), 'success')
    } catch { /* sin portapapeles no pasa nada */ }
  }

  const productText = (p: Product) => `${p.name} — ${formatPrice(p.price, currency)}\n${baseUrl}/p/${p.slug}`

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase()
    const list = (products || []).filter(p => p.active !== false)
    return (q ? list.filter(p => p.name.toLowerCase().includes(q)) : list).slice(0, 40)
  }, [products, productSearch])

  const dateOf = (d: Date | null) =>
    d ? d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) : ''

  const relative = (d: Date | null) => {
    if (!d) return ''
    const days = Math.floor((Date.now() - d.getTime()) / 86400000)
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
    if (days < 1) return rtf.format(0, 'day')
    if (days < 30) return rtf.format(-days, 'day')
    if (days < 365) return rtf.format(-Math.floor(days / 30), 'month')
    return rtf.format(-Math.floor(days / 365), 'year')
  }

  const paymentName = (m?: string) => (m ? t(`shopichat.customer.payment.${m}`, { defaultValue: m }) : '')
  const shownOrders = showAllOrders ? mine : mine.slice(0, ORDERS_PREVIEW)
  const shownAddresses = showAllAddresses ? addresses : addresses.slice(0, 3)

  const sectionTitle = 'text-[0.66rem] font-semibold uppercase tracking-[0.07em] text-[#8898AA]'
  const section = 'px-4 py-4 border-b border-[#F1F5F9]'
  const miniBtn = 'inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[#E6EBF1] text-[11px] font-medium text-[#425466] hover:bg-[#F6F9FC]'

  return (
    <aside className="w-full sm:w-80 bg-white border-l border-[#E6EBF1] flex flex-col h-full">
      <div className="px-4 py-3 border-b border-[#E6EBF1] flex items-center justify-between">
        <h3 className="font-semibold text-[#1e3a5f] text-[13px]">{t('shopichat.customer.title')}</h3>
        <button type="button" onClick={onClose} className="text-[#A9B6C6] hover:text-[#425466]" aria-label={t('shopichat.common.close')}>
          <IconX className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        {/* Contacto */}
        <div className={section}>
          <p className="text-[15px] font-semibold text-[#1e3a5f] truncate">{conversation.name || mine[0]?.customer?.name || formatPhone(conversation.waId)}</p>
          <p className="text-[12px] text-[#8898AA]">{formatPhone(conversation.waId)}</p>
          {mine[0]?.customer?.email && <p className="text-[12px] text-[#8898AA] truncate">{mine[0].customer.email}</p>}
          {conversation.optOut && (
            <p className="mt-2 text-[11.5px] text-red-600">{t('shopichat.customer.optOut')}</p>
          )}
        </div>

        {/* Resumen */}
        <div className={section}>
          <p className={sectionTitle}>{t('shopichat.customer.summary')}</p>
          {loadingOrders ? (
            <div className="mt-3 grid grid-cols-2 gap-2 animate-pulse">
              {[0, 1, 2, 3].map(i => <div key={i} className="h-12 rounded-xl bg-[#F1F5F9]" />)}
            </div>
          ) : mine.length === 0 ? (
            <p className="mt-2 text-[12.5px] text-[#8898AA]">{t('shopichat.customer.noOrders')}</p>
          ) : (
            <>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <Stat label={t('shopichat.customer.totalSpent')} value={formatPrice(summary.spent, currency)} />
                <Stat label={t('shopichat.customer.orderCount')} value={String(summary.count)} />
                <Stat label={t('shopichat.customer.avgTicket')} value={formatPrice(summary.avg, currency)} />
                <Stat label={t('shopichat.customer.lastPurchase')} value={relative(summary.last)} title={dateOf(summary.last)} />
              </div>
              <p className="mt-2.5 text-[12px] text-[#425466]">
                {t('shopichat.customer.since')}: <span className="font-medium">{dateOf(summary.first)}</span>
              </p>
              {summary.cancelled > 0 && (
                <p className="mt-0.5 text-[11px] text-[#A9B6C6]">{t('shopichat.customer.cancelledCount', { count: summary.cancelled })}</p>
              )}
            </>
          )}
        </div>

        {onCreateOrder && (
          <div className="px-4 pt-3 pb-1">
            <button
              type="button"
              onClick={onCreateOrder}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#1e3a5f] px-3 py-2 text-[12.5px] font-semibold text-white hover:bg-[#2a4d7a]"
            >
              <IconPlus className="w-4 h-4" />{t('shopichat.sell.createOrder')}
            </button>
          </div>
        )}

        {/* Etiquetas y nota DEL CLIENTE (compartidas con Clientes) */}
        <div className={section}>
          <CustomerProfileEditor
            storeId={store.id}
            phone={phone}
            name={conversation.name || mine[0]?.customer?.name || null}
            variant="panel"
          />
        </div>

        {/* Direcciones */}
        {addresses.length > 0 && (
          <div className={section}>
            <p className={`${sectionTitle} flex items-center gap-1.5`}><IconMapPin className="w-3 h-3" />{t('shopichat.customer.addresses')}</p>
            <div className="mt-2.5 space-y-2">
              {shownAddresses.map((a, i) => (
                <div key={a.text} className="rounded-lg border border-[#E6EBF1] px-2.5 py-2">
                  <p className="text-[12px] text-[#1e3a5f] leading-snug break-words">{a.text}</p>
                  <p className="mt-0.5 text-[10.5px] text-[#A9B6C6]">
                    {i === 0 ? t('shopichat.customer.lastUsed') : dateOf(a.last)}
                    {a.count > 1 && ` · ${t('shopichat.customer.timesUsed', { count: a.count })}`}
                  </p>
                  <div className="mt-1.5 flex gap-1.5">
                    <button type="button" onClick={() => copy(a.text)} className={miniBtn}>
                      <IconCopy className="w-3 h-3" />{t('shopichat.customer.copy')}
                    </button>
                    <button type="button" onClick={() => onInsert(t('shopichat.customer.addressText', { address: a.text }))} className={miniBtn}>
                      <IconSend className="w-3 h-3" />{t('shopichat.customer.sendToChat')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {addresses.length > 3 && (
              <button type="button" onClick={() => setShowAllAddresses(v => !v)} className="mt-2 text-[11.5px] font-medium text-[#0284C7] hover:underline">
                {showAllAddresses ? t('shopichat.customer.showLess') : t('shopichat.customer.showAll', { count: addresses.length })}
              </button>
            )}
          </div>
        )}

        {/* Pedidos y envíos */}
        {mine.length > 0 && (
          <div className={section}>
            <p className={`${sectionTitle} flex items-center gap-1.5`}><IconTruck className="w-3 h-3" />{t('shopichat.customer.ordersHistory')}</p>
            <div className="mt-2.5 space-y-1.5">
              {shownOrders.map(o => {
                const color = ORDER_STATUS_COLORS[o.status]
                const dest = o.deliveryMethod === 'pickup'
                  ? t('shopichat.customer.pickup')
                  : [o.deliveryAddress?.district, o.deliveryAddress?.city].filter(Boolean).join(', ') || o.deliveryAddress?.street || ''
                return (
                  <Link
                    key={o.id}
                    to={`${localePath('/dashboard/orders')}?order=${encodeURIComponent(o.id)}`}
                    className="block rounded-lg border border-[#E6EBF1] px-2.5 py-2 hover:bg-[#F6F9FC]"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-[12px] font-semibold text-[#1e3a5f] truncate">{o.orderNumber}</span>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-px rounded-full text-[10px] font-semibold flex-none ${color?.bg || 'bg-[#F1F5F9]'} ${color?.text || 'text-[#1e3a5f]'}`}>
                        <span className={`w-1 h-1 rounded-full ${color?.dot || 'bg-[#8898AA]'}`} />
                        {t(`shopichat.orderStatus.${o.status}`, { defaultValue: o.status })}
                      </span>
                      <span className="ml-auto text-[12px] font-semibold text-[#1e3a5f] flex-none">{formatPrice(Number(o.total) || 0, currency)}</span>
                    </span>
                    <span className="block mt-0.5 text-[11px] text-[#8898AA] truncate">
                      {dateOf(toDateSafe(o.createdAt))}
                      {o.paymentMethod && ` · ${paymentName(o.paymentMethod)}`}
                      {o.paymentStatus === 'paid' && ` · ${t('shopichat.customer.paid')}`}
                    </span>
                    {(o.deliveryMethod || dest) && (
                      <span className="flex items-center gap-1 mt-0.5 text-[11px] text-[#A9B6C6] min-w-0">
                        {o.deliveryMethod === 'pickup' ? <IconBag className="w-3 h-3 flex-none" /> : <IconTruck className="w-3 h-3 flex-none" />}
                        <span className="truncate">
                          {o.deliveryMethod === 'delivery' ? `${t('shopichat.customer.delivery')}${dest ? ` · ${dest}` : ''}` : dest}
                        </span>
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
            {mine.length > ORDERS_PREVIEW && (
              <button type="button" onClick={() => setShowAllOrders(v => !v)} className="mt-2 inline-flex items-center gap-1 text-[11.5px] font-medium text-[#0284C7] hover:underline">
                <IconChevronDown className={`w-3.5 h-3.5 transition-transform ${showAllOrders ? 'rotate-180' : ''}`} />
                {showAllOrders ? t('shopichat.customer.showLess') : t('shopichat.customer.showAll', { count: mine.length })}
              </button>
            )}
          </div>
        )}

        {/* Lo que más compra */}
        {topProducts.length > 0 && (
          <div className={section}>
            <p className={`${sectionTitle} flex items-center gap-1.5`}><IconBag className="w-3 h-3" />{t('shopichat.customer.topProducts')}</p>
            <div className="mt-2.5 space-y-1.5">
              {topProducts.map(tp => {
                const p = productById.get(tp.id)
                const image = tp.image || p?.image
                const available = Boolean(p && p.active !== false && p.slug)
                return (
                  <div key={tp.id} className="flex items-center gap-2">
                    {image ? (
                      <img src={optimizeImage(image, 'thumbnail')} alt="" className="w-8 h-8 rounded-md object-cover flex-none bg-[#F6F9FC]" loading="lazy" />
                    ) : (
                      <span className="w-8 h-8 rounded-md bg-[#F6F9FC] flex-none" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] text-[#1e3a5f] truncate">{tp.name}</span>
                      <span className="block text-[10.5px] text-[#8898AA]">{t('shopichat.customer.units', { count: tp.qty })}</span>
                    </span>
                    <button
                      type="button"
                      disabled={!available}
                      onClick={() => p && onInsert(productText(p))}
                      title={available ? undefined : t('shopichat.customer.productUnavailable')}
                      className={`${miniBtn} flex-none disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      <IconSend className="w-3 h-3" />{t('shopichat.customer.send')}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Enviar links */}
        <div className={section}>
          <p className={sectionTitle}>{t('shopichat.customer.share')}</p>
          <div className="mt-2.5 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => onInsert(t('shopichat.customer.storeLinkText', { url: baseUrl }))}
              className="inline-flex items-center gap-2 rounded-lg border border-[#E6EBF1] px-3 py-2 text-[12.5px] font-medium text-[#1e3a5f] hover:bg-[#F6F9FC]"
            >
              <IconLink className="w-4 h-4 text-[#0284C7]" />
              {t('shopichat.customer.sendStoreLink')}
            </button>
            <button
              type="button"
              onClick={() => setPickingProduct(v => !v)}
              className="inline-flex items-center gap-2 rounded-lg border border-[#E6EBF1] px-3 py-2 text-[12.5px] font-medium text-[#1e3a5f] hover:bg-[#F6F9FC]"
            >
              <IconBag className="w-4 h-4 text-[#0284C7]" />
              {t('shopichat.customer.sendProductLink')}
            </button>
          </div>
          {pickingProduct && (
            <div className="mt-2.5 rounded-xl border border-[#E6EBF1] overflow-hidden">
              <div className="relative border-b border-[#F1F5F9]">
                <IconSearch className="w-3.5 h-3.5 text-[#A9B6C6] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  autoFocus
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  placeholder={t('shopichat.customer.searchProduct')}
                  className="w-full pl-8 pr-2 py-2 text-[12.5px] outline-none"
                />
              </div>
              <div className="max-h-56 overflow-y-auto">
                {products === null && <p className="px-3 py-3 text-[12px] text-[#A9B6C6]">{t('shopichat.common.loading')}</p>}
                {products !== null && filteredProducts.length === 0 && <p className="px-3 py-3 text-[12px] text-[#A9B6C6]">{t('shopichat.list.noMatches')}</p>}
                {filteredProducts.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onInsert(productText(p))
                      setPickingProduct(false)
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-[#F6F9FC]"
                  >
                    {p.image ? (
                      <img src={optimizeImage(p.image, 'thumbnail')} alt="" className="w-8 h-8 rounded-md object-cover flex-none bg-[#F6F9FC]" loading="lazy" />
                    ) : (
                      <span className="w-8 h-8 rounded-md bg-[#F6F9FC] flex-none" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] text-[#1e3a5f] truncate">{p.name}</span>
                      <span className="block text-[11px] text-[#8898AA]">{formatPrice(p.price, currency)}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ---- Esta conversación (para ordenar la bandeja) ---- */}
        <div className="px-4 pt-4">
          <p className="text-[11px] text-[#A9B6C6]">{t('shopichat.customer.chatSectionHint')}</p>
        </div>

        {/* Etiquetas de la conversación */}
        <div className={section}>
          <p className={`${sectionTitle} flex items-center gap-1.5`}><IconTag className="w-3 h-3" />{t('shopichat.customer.chatLabels')}</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {labels.length === 0 && <span className="text-[12px] text-[#A9B6C6]">{t('shopichat.labels.none')}</span>}
            {labels.map(l => {
              const c = labelColor(l)
              return (
                <span key={l} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ backgroundColor: `${c}1A`, color: c }}>
                  {l}
                  <button type="button" onClick={() => saveLabels(labels.filter(x => x !== l))} className="opacity-60 hover:opacity-100" aria-label={t('shopichat.labels.remove', { label: l })}>
                    <IconX className="w-3 h-3" />
                  </button>
                </span>
              )
            })}
          </div>
          <form
            className="mt-2.5"
            onSubmit={e => { e.preventDefault(); addLabel(labelDraft) }}
          >
            <input
              value={labelDraft}
              onChange={e => setLabelDraft(e.target.value)}
              placeholder={t('shopichat.labels.add')}
              maxLength={30}
              disabled={labels.length >= MAX_LABELS}
              className="w-full px-3 py-1.5 text-[12.5px] bg-[#F6F9FC] border border-[#E6EBF1] rounded-lg outline-none focus:border-[#38bdf8]"
            />
          </form>
          {suggestions.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {suggestions.map(l => (
                <button key={l} type="button" onClick={() => addLabel(l)} className="px-2 py-0.5 rounded-full border border-[#E6EBF1] text-[11px] text-[#425466] hover:bg-[#F6F9FC]">
                  + {l}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Nota de la conversación */}
        <div className="px-4 py-4">
          <p className={`${sectionTitle} flex items-center gap-1.5`}><IconNote className="w-3 h-3" />{t('shopichat.customer.chatNote')}</p>
          <textarea
            value={noteDraft}
            onChange={e => setNoteDraft(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder={t('shopichat.note.placeholder')}
            className="mt-2.5 w-full text-[12.5px] bg-[#F6F9FC] border border-[#E6EBF1] rounded-lg px-3 py-2 outline-none focus:border-[#38bdf8] resize-none"
          />
          <div className="flex justify-end mt-1.5">
            <button
              type="button"
              onClick={saveNote}
              disabled={savingNote || noteDraft.trim() === (conversation.note || '').trim()}
              className="px-3 py-1.5 rounded-lg bg-[#1e3a5f] text-white text-[12px] font-semibold disabled:opacity-40"
            >
              {t('shopichat.note.save')}
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}

function Stat({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="rounded-xl bg-[#F6F9FC] px-3 py-2 min-w-0" title={title}>
      <p className="text-[10.5px] text-[#8898AA] truncate">{label}</p>
      <p className="text-[14px] font-semibold text-[#1e3a5f] truncate">{value}</p>
    </div>
  )
}
