/**
 * Ficha del cliente en ShopiChat (reemplaza a la FichaCliente de Cobrify,
 * que era de negocios/suscripciones/SUNAT).
 *
 * Vincula la conversación con los pedidos de la tienda POR TELÉFONO: el
 * `customer.phone` de cada pedido se normaliza a dígitos y se compara con el
 * waId por los últimos 9–10 dígitos, así da igual si uno trae el código de
 * país y el otro no. Muestra lo gastado, el último pedido, etiquetas, nota
 * interna y atajos para mandar el link de la tienda o de un producto (caen en
 * el cuadro de escribir, no salen solos).
 */
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { orderService, productService } from '../../lib/firebase'
import { formatPrice } from '../../lib/currency'
import { MAX_LABELS, formatPhone, samePhone, setConversationLabels, setConversationNote } from '../../lib/shopichatService'
import { useLanguage } from '../../hooks/useLanguage'
import { useToast } from '../ui/Toast'
import type { Order, Product, Store } from '../../types'
import type { WaConversation } from '../../types/shopichat'
import { IconBag, IconLink, IconNote, IconSearch, IconTag, IconX } from './icons'
import { labelColor, storeUrlOf } from './utils'

// Los pedidos de la tienda se bajan UNA vez por sesión y por tienda: abrir la
// ficha de diez conversaciones no son diez consultas.
const ordersCache = new Map<string, Promise<Order[]>>()
const productsCache = new Map<string, Promise<Product[]>>()

function storeOrders(storeId: string) {
  let p = ordersCache.get(storeId)
  if (!p) {
    p = orderService.getAll(storeId, 500).catch(() => {
      ordersCache.delete(storeId)
      return [] as Order[]
    })
    ordersCache.set(storeId, p)
  }
  return p
}

function storeProducts(storeId: string) {
  let p = productsCache.get(storeId)
  if (!p) {
    p = productService.getAll(storeId).catch(() => {
      productsCache.delete(storeId)
      return [] as Product[]
    })
    productsCache.set(storeId, p)
  }
  return p
}

interface Props {
  store: Store
  conversation: WaConversation
  allLabels: string[]
  onInsert: (text: string) => void
  onClose: () => void
}

export default function CustomerPanel({ store, conversation, allLabels, onInsert, onClose }: Props) {
  const { t, i18n } = useTranslation('dashboard')
  const { localePath } = useLanguage()
  const { showToast } = useToast()
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [products, setProducts] = useState<Product[] | null>(null)
  const [pickingProduct, setPickingProduct] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [labelDraft, setLabelDraft] = useState('')
  const [noteDraft, setNoteDraft] = useState(conversation.note || '')
  const [savingNote, setSavingNote] = useState(false)

  useEffect(() => {
    let alive = true
    storeOrders(store.id).then(list => { if (alive) setOrders(list) })
    return () => { alive = false }
  }, [store.id])

  useEffect(() => {
    if (!pickingProduct || products) return undefined
    let alive = true
    storeProducts(store.id).then(list => { if (alive) setProducts(list.filter(p => p.active !== false)) })
    return () => { alive = false }
  }, [pickingProduct, products, store.id])

  const phone = conversation.phone || conversation.waId
  const mine = useMemo(
    () => (orders || []).filter(o => !o.isTest && samePhone(o.customer?.phone, phone)),
    [orders, phone]
  )
  const valid = mine.filter(o => o.status !== 'cancelled')
  const spent = valid.reduce((s, o) => s + (Number(o.total) || 0), 0)
  const last = mine[0]
  const currency = store.currency || 'USD'
  const baseUrl = storeUrlOf(store)

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

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase()
    const list = products || []
    return (q ? list.filter(p => p.name.toLowerCase().includes(q)) : list).slice(0, 40)
  }, [products, productSearch])

  const dateOf = (o: Order) => {
    const d = o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt as unknown as string)
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const sectionTitle = 'text-[0.66rem] font-semibold uppercase tracking-[0.07em] text-[#8898AA]'

  return (
    <aside className="w-full sm:w-80 bg-white border-l border-[#E6EBF1] flex flex-col h-full">
      <div className="px-4 py-3 border-b border-[#E6EBF1] flex items-center justify-between">
        <h3 className="font-semibold text-[#1e3a5f] text-[13px]">{t('shopichat.customer.title')}</h3>
        <button type="button" onClick={onClose} className="text-[#A9B6C6] hover:text-[#425466]" aria-label={t('shopichat.common.close')}>
          <IconX className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Contacto */}
        <div className="px-4 py-4 border-b border-[#F1F5F9]">
          <p className="text-[15px] font-semibold text-[#1e3a5f] truncate">{conversation.name || formatPhone(conversation.waId)}</p>
          <p className="text-[12px] text-[#8898AA]">{formatPhone(conversation.waId)}</p>
          {conversation.optOut && (
            <p className="mt-2 text-[11.5px] text-red-600">{t('shopichat.customer.optOut')}</p>
          )}
        </div>

        {/* Pedidos */}
        <div className="px-4 py-4 border-b border-[#F1F5F9]">
          <p className={sectionTitle}>{t('shopichat.customer.orders')}</p>
          {orders === null ? (
            <div className="mt-3 space-y-2 animate-pulse">
              <div className="h-4 w-2/3 rounded bg-[#F1F5F9]" />
              <div className="h-4 w-1/2 rounded bg-[#F1F5F9]" />
            </div>
          ) : mine.length === 0 ? (
            <p className="mt-2 text-[12.5px] text-[#8898AA]">{t('shopichat.customer.noOrders')}</p>
          ) : (
            <>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-[#F6F9FC] px-3 py-2">
                  <p className="text-[10.5px] text-[#8898AA]">{t('shopichat.customer.totalSpent')}</p>
                  <p className="text-[15px] font-semibold text-[#1e3a5f]">{formatPrice(spent, currency)}</p>
                </div>
                <div className="rounded-xl bg-[#F6F9FC] px-3 py-2">
                  <p className="text-[10.5px] text-[#8898AA]">{t('shopichat.customer.orderCount')}</p>
                  <p className="text-[15px] font-semibold text-[#1e3a5f]">{valid.length}</p>
                </div>
              </div>
              {last && (
                <p className="mt-2.5 text-[12px] text-[#425466]">
                  {t('shopichat.customer.lastOrder')}: <span className="font-medium">{dateOf(last)}</span>
                </p>
              )}
              <div className="mt-2 space-y-1.5">
                {mine.slice(0, 5).map(o => (
                  <Link
                    key={o.id}
                    to={localePath('/dashboard/orders')}
                    className="flex items-center gap-2 rounded-lg border border-[#E6EBF1] px-2.5 py-2 hover:bg-[#F6F9FC]"
                  >
                    <IconBag className="w-4 h-4 text-[#8898AA] flex-none" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] font-medium text-[#1e3a5f] truncate">{o.orderNumber}</span>
                      <span className="block text-[11px] text-[#8898AA]">
                        {dateOf(o)} · {t(`shopichat.orderStatus.${o.status}`, { defaultValue: o.status })}
                      </span>
                    </span>
                    <span className="text-[12px] font-semibold text-[#1e3a5f] flex-none">{formatPrice(Number(o.total) || 0, currency)}</span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Enviar links */}
        <div className="px-4 py-4 border-b border-[#F1F5F9]">
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
                      onInsert(`${p.name} — ${formatPrice(p.price, currency)}\n${baseUrl}/p/${p.slug}`)
                      setPickingProduct(false)
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-[#F6F9FC]"
                  >
                    {p.image ? (
                      <img src={p.image} alt="" className="w-8 h-8 rounded-md object-cover flex-none bg-[#F6F9FC]" loading="lazy" />
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

        {/* Etiquetas */}
        <div className="px-4 py-4 border-b border-[#F1F5F9]">
          <p className={`${sectionTitle} flex items-center gap-1.5`}><IconTag className="w-3 h-3" />{t('shopichat.labels.title')}</p>
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

        {/* Nota interna */}
        <div className="px-4 py-4">
          <p className={`${sectionTitle} flex items-center gap-1.5`}><IconNote className="w-3 h-3" />{t('shopichat.note.title')}</p>
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
