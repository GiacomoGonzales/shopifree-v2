/**
 * Crear un pedido desde el chat.
 *
 * Mismo camino que una venta manual de Pedidos (NewSaleModal): el dueño lo
 * escribe directo en stores/{storeId}/orders con orderService.create, con
 * `channel: 'whatsapp'` y `manual: true`, así sale en Pedidos, en Clientes y en
 * la ficha 360 del chat. Lo propio de acá:
 *
 *  - Cliente, teléfono y dirección vienen de la conversación y de su último
 *    pedido.
 *  - Pago en efectivo / transferencia / "acordar": se confirma y descuenta el
 *    stock al crearlo (como la venta manual) y el cupón suma su uso.
 *  - Pago online (Mercado Pago, Stripe, PayPal, GoCuotas, las que la tienda
 *    tenga activas): queda pendiente, SIN descontar stock ni sumar el cupón:
 *    lo hace el servidor al confirmar el pago (markOrderPaid), igual que un
 *    pedido del checkout. Por eso sus montos se calculan exactamente como el
 *    servidor (precio del producto/variante, envío de la tienda, cupón) y no se
 *    pueden editar: el cobro exige que coincidan.
 */
import { optimizeImage } from '../../utils/media'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { couponService, orderService } from '../../lib/firebase'
import { decrementOrderStock } from '../../lib/stock'
import { resolveShippingCost } from '../../lib/shipping'
import { volumeUnitPrice } from '../../lib/volumePricing'
import { formatPrice } from '../../lib/currency'
import { onlyDigits } from '../../lib/shopichatService'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../ui/Toast'
import type { Coupon, Order, OrderItem, Product, Store, VariantCombination } from '../../types'
import type { WaConversation } from '../../types/shopichat'
import { storeProducts } from './storeData'
import {
  OFFLINE_METHODS, comboLabel, couponDiscount, enabledOnlineMethods, isOnlineMethod, methodLabel, priceRangeText,
  productStock, round2, sellableCombos, type ChatPaymentMethod,
} from './sell'
import { IconBag, IconSearch, IconTag, IconTrash, IconTruck, IconX } from './icons'

interface Line {
  key: string
  product: Product
  combo: VariantCombination | null
  quantity: number
}

interface Props {
  store: Store
  conversation: WaConversation
  /** Pedidos del cliente (del más nuevo al más viejo), para prellenar. */
  customerOrders: Order[]
  onClose: () => void
  onCreated: (order: Order) => void
}

const lineKey = (p: Product, c: VariantCombination | null) => `${p.id}|${c?.id || ''}`
const basePrice = (p: Product, c: VariantCombination | null) =>
  c && typeof c.price === 'number' ? c.price : Number(p.price) || 0

export default function ChatOrderModal({ store, conversation, customerOrders, onClose, onCreated }: Props) {
  const { t } = useTranslation('dashboard')
  const { firebaseUser } = useAuth()
  const { showToast } = useToast()
  const currency = store.currency || 'USD'
  const money = (n: number) => formatPrice(n, currency)

  const last = customerOrders[0]
  const lastDelivery = customerOrders.find(o => o.deliveryMethod === 'delivery' && o.deliveryAddress?.street)

  const [products, setProducts] = useState<Product[] | null>(null)
  const [search, setSearch] = useState('')
  const [choosingFor, setChoosingFor] = useState<Product | null>(null)
  const [lines, setLines] = useState<Line[]>([])

  const [name, setName] = useState(() => conversation.name || last?.customer?.name || '')
  const [phone, setPhone] = useState(() => {
    const fromWa = /^\d{8,15}$/.test(conversation.waId || '') ? `+${conversation.waId}` : ''
    return fromWa || (conversation.phone ? `+${onlyDigits(conversation.phone)}` : '') || last?.customer?.phone || ''
  })
  const [email, setEmail] = useState(() => last?.customer?.email || '')

  const deliveryAllowed = store.shipping?.deliveryEnabled !== false
  const pickupAllowed = store.shipping?.pickupEnabled !== false
  const [delivery, setDelivery] = useState<'pickup' | 'delivery'>(() => {
    if (!deliveryAllowed) return 'pickup'
    if (!pickupAllowed) return 'delivery'
    return last?.deliveryMethod === 'delivery' ? 'delivery' : 'pickup'
  })
  const [address, setAddress] = useState(() => ({
    street: lastDelivery?.deliveryAddress?.street || '',
    district: lastDelivery?.deliveryAddress?.district || '',
    city: lastDelivery?.deliveryAddress?.city || '',
    state: lastDelivery?.deliveryAddress?.state || '',
    reference: lastDelivery?.deliveryAddress?.reference || '',
  }))
  const [shippingDraft, setShippingDraft] = useState<string | null>(null)

  const onlineMethods = enabledOnlineMethods(store)
  const methods: ChatPaymentMethod[] = [...onlineMethods, ...OFFLINE_METHODS]
  const [method, setMethod] = useState<ChatPaymentMethod>('whatsapp') // 'Acordar' por defecto: el link de pago se elige a propósito
  const online = isOnlineMethod(method)

  const [couponCode, setCouponCode] = useState('')
  const [coupon, setCoupon] = useState<Coupon | null>(null)
  const [checkingCoupon, setCheckingCoupon] = useState(false)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    storeProducts(store.id).then(list => { if (alive) setProducts(list) })
    return () => { alive = false }
  }, [store.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, saving])

  const results = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    return (products || [])
      .filter(p => p.active !== false)
      .filter(p => p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q)
        || (p.combinations || []).some(c => (c.sku || '').toLowerCase().includes(q)))
      .slice(0, 12)
  }, [products, search])

  // ---------------------------------------------------------------- montos
  // Unidades por producto (todas sus variantes) para el precio por cantidad,
  // igual que el carrito y el servidor.
  const priced = useMemo(() => {
    const qtyByProduct = new Map<string, number>()
    for (const l of lines) qtyByProduct.set(l.product.id, (qtyByProduct.get(l.product.id) || 0) + l.quantity)
    return lines.map(l => {
      const list = basePrice(l.product, l.combo)
      const unit = round2(volumeUnitPrice(l.product, list, qtyByProduct.get(l.product.id) || l.quantity))
      return { ...l, list, unit, total: round2(unit * l.quantity) }
    })
  }, [lines])

  const subtotal = round2(priced.reduce((s, l) => s + l.unit * l.quantity, 0))
  const autoShipping = delivery === 'delivery' ? round2(resolveShippingCost(store, subtotal, address.state.trim() || undefined) || 0) : 0
  // En pagos online el envío es el de la tienda; en los demás se puede ajustar.
  const shipping = delivery !== 'delivery'
    ? 0
    : online || shippingDraft === null
      ? autoShipping
      : Math.max(0, round2(parseFloat(shippingDraft) || 0))
  const couponMinOk = !coupon?.minOrderAmount || subtotal >= coupon.minOrderAmount
  const discount = coupon && couponMinOk ? couponDiscount(coupon, subtotal) : 0
  const total = round2(subtotal - discount + shipping)

  // Cada línea es un producto/variante distinto: su cantidad no puede pasar su stock.
  const stockIssue = priced.find(l => {
    const s = productStock(l.product, l.combo)
    return s !== null && l.quantity > s
  })

  const canSave = !saving && lines.length > 0 && name.trim() && total > 0 && !stockIssue && couponMinOk
    && (delivery === 'pickup' || address.street.trim())

  // ---------------------------------------------------------------- líneas
  const add = (p: Product, c: VariantCombination | null) => {
    const key = lineKey(p, c)
    setLines(prev => {
      const hit = prev.find(l => l.key === key)
      if (hit) return prev.map(l => (l.key === key ? { ...l, quantity: l.quantity + 1 } : l))
      return [...prev, { key, product: p, combo: c, quantity: 1 }]
    })
  }

  const pickProduct = (p: Product) => {
    if (sellableCombos(p).length > 0) { setChoosingFor(p); return }
    add(p, null)
    setSearch('')
  }

  const setQty = (key: string, q: number) =>
    setLines(prev => prev.map(l => (l.key === key ? { ...l, quantity: Math.max(1, Math.min(9999, Math.round(q) || 1)) } : l)))

  const applyCoupon = async () => {
    const code = couponCode.trim()
    if (!code) return
    setCheckingCoupon(true)
    try {
      const r = await couponService.validateCode(store.id, code, subtotal)
      if (r.valid && r.coupon) {
        setCoupon(r.coupon)
        setCouponCode('')
      } else {
        showToast(t(`shopichat.sell.couponErrors.${r.error || 'invalid'}`, { defaultValue: t('shopichat.sell.couponErrors.invalid') }), 'error')
      }
    } catch {
      showToast(t('shopichat.sell.couponErrors.invalid'), 'error')
    } finally {
      setCheckingCoupon(false)
    }
  }

  // ---------------------------------------------------------------- crear
  const save = async () => {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      // Stock y precios frescos: la lista puede tener unos minutos.
      const fresh = await storeProducts(store.id, true)
      setProducts(fresh)
      const byId = new Map(fresh.map(p => [p.id, p]))
      const need = new Map<string, { p: Product; c: VariantCombination | null; qty: number; name: string }>()
      for (const l of lines) {
        const p = byId.get(l.product.id)
        if (!p || p.active === false) throw new Error(t('shopichat.sell.errors.unavailable', { name: l.product.name }))
        const c = l.combo ? (p.combinations || []).find(x => x.id === l.combo?.id) || null : null
        if (l.combo && (!c || c.available === false)) throw new Error(t('shopichat.sell.errors.unavailable', { name: `${p.name} (${comboLabel(l.combo)})` }))
        if (online && basePrice(p, c) !== basePrice(l.product, l.combo)) throw new Error(t('shopichat.sell.errors.priceChanged', { name: p.name }))
        const k = lineKey(p, c)
        const prev = need.get(k)
        need.set(k, { p, c, qty: (prev?.qty || 0) + l.quantity, name: c ? `${p.name} (${comboLabel(c)})` : p.name })
      }
      for (const { p, c, qty, name: n } of need.values()) {
        const s = productStock(p, c)
        if (s !== null && s < qty) throw new Error(t('shopichat.sell.errors.stock', { name: n, count: Math.max(0, s) }))
      }

      const items: OrderItem[] = priced.map(l => {
        const it: OrderItem = {
          productId: l.product.id,
          productName: l.product.name,
          price: l.unit,
          quantity: l.quantity,
          itemTotal: l.total,
        }
        const img = l.combo?.image || l.product.image
        if (img) it.productImage = img
        if (l.unit < l.list) it.listPrice = l.list
        if (l.combo) {
          // Una entrada por variante (como el checkout): el servidor valida
          // variante por variante al cobrar.
          it.selectedVariations = Object.entries(l.combo.options || {}).map(([vn, value]) => ({ name: vn, value }))
          it.combinationId = l.combo.id
          if (l.combo.sku) it.combinationSku = l.combo.sku
        }
        return it
      })

      const customer: { name: string; phone: string; email?: string } = { name: name.trim(), phone: phone.trim() || '-' }
      if (email.trim()) customer.email = email.trim()

      const tracked = !online && lines.some(l => l.product.trackStock)
      const data: Partial<Order> = {
        storeId: store.id,
        items,
        customer,
        deliveryMethod: delivery,
        subtotal,
        total,
        paymentMethod: method,
        paymentStatus: 'pending',
        // Online: espera el pago (como un pedido del checkout). Los demás: el
        // comerciante lo está cerrando por chat, queda confirmado.
        status: online ? 'pending' : 'confirmed',
        channel: 'whatsapp',
        manual: true,
        waId: conversation.waId,
      }
      if (shipping > 0) data.shippingCost = shipping
      if (delivery === 'delivery') {
        const a: NonNullable<Order['deliveryAddress']> = { street: address.street.trim() }
        if (address.district.trim()) a.district = address.district.trim()
        if (address.city.trim()) a.city = address.city.trim()
        if (address.state.trim()) a.state = address.state.trim()
        if (address.reference.trim()) a.reference = address.reference.trim()
        data.deliveryAddress = a
      }
      if (coupon && discount > 0) {
        data.discount = { code: coupon.code, type: coupon.discountType, value: coupon.discountValue, amount: discount }
      }
      if (notes.trim()) data.notes = notes.trim()
      if (online) data.payLinkAt = new Date()
      if (tracked) data.stockDecremented = true

      const { id, orderNumber } = await orderService.create(store.id, data)

      if (tracked) {
        try {
          await decrementOrderStock(store.id, { id, items }, { createdBy: firebaseUser?.uid || store.ownerId })
        } catch (err) {
          console.error('[shopichat] no se pudo descontar el stock del pedido', id, err)
        }
      }
      // Online: el uso del cupón lo suma el servidor al confirmar el pago.
      if (!online && coupon && discount > 0) couponService.incrementUses(store.id, coupon.id).catch(() => {})

      onCreated({ ...(data as Order), id, orderNumber, createdAt: new Date(), updatedAt: new Date() })
    } catch (e) {
      const msg = e instanceof Error && e.message ? e.message : t('shopichat.sell.errors.create')
      setError(msg)
      setSaving(false)
    }
  }

  // ---------------------------------------------------------------- vista
  const label = 'text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8898AA]'
  const input = 'w-full px-3 py-2 text-[13px] bg-white border border-[#E6EBF1] rounded-lg outline-none focus:border-[#38bdf8]'

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center sm:p-4" onClick={() => { if (!saving) onClose() }}>
      <div
        className="bg-white rounded-t-[18px] sm:rounded-[14px] shadow-xl w-full sm:max-w-lg max-h-[94vh] flex flex-col"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 border-b border-[#E6EBF1] flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-[#1e3a5f] text-[15px]">{t('shopichat.sell.createOrder')}</h3>
            <p className="text-[11.5px] text-[#8898AA]">{t('shopichat.sell.createOrderHint')}</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="text-[#A9B6C6] hover:text-[#425466]" aria-label={t('shopichat.common.close')}>
            <IconX className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-5">
          {/* Productos */}
          <section>
            <p className={label}>{t('shopichat.sell.products')}</p>
            <div className="relative mt-1.5">
              <IconSearch className="w-4 h-4 text-[#A9B6C6] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setChoosingFor(null) }}
                placeholder={t('shopichat.sell.searchProduct')}
                className={`${input} pl-9`}
              />
              {search.trim() && !choosingFor && (
                <div className="absolute left-0 right-0 top-full mt-1 z-10 bg-white border border-[#E6EBF1] rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  {products === null && <p className="px-3 py-3 text-[12px] text-[#A9B6C6]">{t('shopichat.common.loading')}</p>}
                  {products !== null && results.length === 0 && <p className="px-3 py-3 text-[12px] text-[#A9B6C6]">{t('shopichat.list.noMatches')}</p>}
                  {results.map(p => {
                    const s = productStock(p)
                    return (
                      <button key={p.id} type="button" disabled={s === 0} onClick={() => pickProduct(p)} className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-[#F6F9FC] disabled:opacity-40">
                        {p.image ? <img src={optimizeImage(p.image, 'thumbnail')} alt="" className="w-8 h-8 rounded-md object-cover flex-none" /> : <span className="w-8 h-8 rounded-md bg-[#F6F9FC] flex-none" />}
                        <span className="min-w-0 flex-1">
                          <span className="block text-[12.5px] text-[#1e3a5f] truncate">{p.name}</span>
                          <span className="block text-[11px] text-[#8898AA]">{priceRangeText(p, currency)}{p.sku ? ` · ${p.sku}` : ''}</span>
                        </span>
                        {s !== null && <span className="text-[10.5px] text-[#8898AA] flex-none">{s > 0 ? t('shopichat.sell.inStock', { count: s }) : t('shopichat.sell.outOfStock')}</span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {choosingFor && (
              <div className="mt-2 rounded-lg border border-[#E6EBF1] overflow-hidden">
                <div className="px-3 py-2 bg-[#F6F9FC] flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-[#1e3a5f] truncate">{choosingFor.name}</span>
                  <button type="button" onClick={() => { setChoosingFor(null); setSearch('') }} className="text-[11.5px] font-medium text-[#0284C7]">{t('shopichat.sell.done')}</button>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {sellableCombos(choosingFor).map(c => {
                    const s = productStock(choosingFor, c)
                    return (
                      <button key={c.id} type="button" disabled={s === 0} onClick={() => add(choosingFor, c)} className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[#F6F9FC] disabled:opacity-40 border-t border-[#F1F5F9]">
                        <span className="flex-1 text-[12.5px] text-[#1e3a5f]">{comboLabel(c)}</span>
                        <span className="text-[12px] text-[#425466]">{money(basePrice(choosingFor, c))}</span>
                        {s !== null && <span className="text-[10.5px] text-[#8898AA] w-16 text-right">{s > 0 ? t('shopichat.sell.inStock', { count: s }) : t('shopichat.sell.outOfStock')}</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="mt-2 space-y-1.5">
              {priced.length === 0 && <p className="text-[12px] text-[#A9B6C6]">{t('shopichat.sell.noLines')}</p>}
              {priced.map(l => {
                const s = productStock(l.product, l.combo)
                const over = s !== null && l.quantity > s
                return (
                  <div key={l.key} className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-2 ${over ? 'border-red-200 bg-red-50/40' : 'border-[#E6EBF1]'}`}>
                    {(l.combo?.image || l.product.image)
                      ? <img src={optimizeImage(l.combo?.image || l.product.image || '', 'thumbnail')} alt="" className="w-9 h-9 rounded-md object-cover flex-none" />
                      : <span className="w-9 h-9 rounded-md bg-[#F6F9FC] flex-none" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-medium text-[#1e3a5f] truncate">{l.product.name}</p>
                      <p className="text-[11px] text-[#8898AA] truncate">
                        {l.combo ? `${comboLabel(l.combo)} · ` : ''}{money(l.unit)}
                        {l.unit < l.list && <span className="line-through ml-1">{money(l.list)}</span>}
                        {s !== null && <span className={over ? 'text-red-600 font-semibold' : ''}> · {t('shopichat.sell.inStock', { count: s })}</span>}
                      </p>
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={s ?? undefined}
                      value={l.quantity}
                      onChange={e => setQty(l.key, Number(e.target.value))}
                      className="w-14 px-2 py-1 text-[12.5px] text-center border border-[#E6EBF1] rounded-md outline-none focus:border-[#38bdf8]"
                      aria-label={t('shopichat.sell.quantity')}
                    />
                    <span className="w-20 text-right text-[12.5px] font-semibold text-[#1e3a5f] flex-none">{money(l.total)}</span>
                    <button type="button" onClick={() => setLines(prev => prev.filter(x => x.key !== l.key))} className="p-1 text-[#A9B6C6] hover:text-red-600" aria-label={t('shopichat.sell.remove')}>
                      <IconTrash className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Cliente */}
          <section>
            <p className={label}>{t('shopichat.sell.customer')}</p>
            <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input value={name} onChange={e => setName(e.target.value)} placeholder={`${t('shopichat.sell.name')} *`} className={input} />
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder={t('shopichat.sell.phone')} className={input} type="tel" />
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder={t('shopichat.sell.emailOptional')} className={`${input} sm:col-span-2`} type="email" />
            </div>
          </section>

          {/* Entrega */}
          <section>
            <p className={label}>{t('shopichat.sell.deliveryTitle')}</p>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {(['pickup', 'delivery'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  disabled={m === 'pickup' ? !pickupAllowed : !deliveryAllowed}
                  onClick={() => setDelivery(m)}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-[12.5px] font-medium disabled:opacity-40 ${delivery === m ? 'border-[#1e3a5f] bg-[#1e3a5f] text-white' : 'border-[#E6EBF1] text-[#425466] hover:bg-[#F6F9FC]'}`}
                >
                  {m === 'pickup' ? <IconBag className="w-4 h-4" /> : <IconTruck className="w-4 h-4" />}
                  {t(m === 'pickup' ? 'shopichat.customer.pickup' : 'shopichat.customer.delivery')}
                </button>
              ))}
            </div>
            {delivery === 'delivery' && (
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input value={address.street} onChange={e => setAddress(a => ({ ...a, street: e.target.value }))} placeholder={`${t('shopichat.sell.street')} *`} className={`${input} sm:col-span-2`} />
                <input value={address.district} onChange={e => setAddress(a => ({ ...a, district: e.target.value }))} placeholder={t('shopichat.sell.district')} className={input} />
                <input value={address.city} onChange={e => setAddress(a => ({ ...a, city: e.target.value }))} placeholder={t('shopichat.sell.city')} className={input} />
                <input value={address.state} onChange={e => setAddress(a => ({ ...a, state: e.target.value }))} placeholder={t('shopichat.sell.state')} className={input} />
                <input value={address.reference} onChange={e => setAddress(a => ({ ...a, reference: e.target.value }))} placeholder={t('shopichat.sell.reference')} className={input} />
                <div className="sm:col-span-2 flex items-center gap-2">
                  <span className="text-[12.5px] text-[#425466] flex-1">{t('shopichat.sell.shipping')}</span>
                  {online ? (
                    <span className="text-[12.5px] font-semibold text-[#1e3a5f]" title={t('shopichat.sell.shippingAutoHint')}>
                      {shipping > 0 ? money(shipping) : t('shopichat.sell.free')}
                    </span>
                  ) : (
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={shippingDraft ?? String(autoShipping)}
                      onChange={e => setShippingDraft(e.target.value)}
                      className="w-28 px-2 py-1.5 text-[12.5px] text-right border border-[#E6EBF1] rounded-md outline-none focus:border-[#38bdf8]"
                      aria-label={t('shopichat.sell.shipping')}
                    />
                  )}
                </div>
                {online && <p className="sm:col-span-2 text-[11px] text-[#A9B6C6]">{t('shopichat.sell.shippingAutoHint')}</p>}
              </div>
            )}
          </section>

          {/* Cupón */}
          <section>
            <p className={label}>{t('shopichat.sell.couponOptional')}</p>
            {coupon ? (
              <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[#E6EBF1] px-3 py-2">
                <IconTag className="w-4 h-4 text-[#0284C7]" />
                <span className="font-mono text-[12.5px] font-semibold text-[#1e3a5f]">{coupon.code}</span>
                <span className="text-[12px] text-[#8898AA] flex-1">
                  {couponMinOk ? `-${money(discount)}` : t('shopichat.sell.couponErrors.minAmount')}
                </span>
                <button type="button" onClick={() => setCoupon(null)} className="text-[#A9B6C6] hover:text-[#425466]" aria-label={t('shopichat.sell.remove')}>
                  <IconX className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <form className="mt-1.5 flex gap-2" onSubmit={e => { e.preventDefault(); void applyCoupon() }}>
                <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder={t('shopichat.sell.couponPlaceholder')} className={`${input} font-mono`} />
                <button type="submit" disabled={!couponCode.trim() || checkingCoupon || lines.length === 0} className="px-3 py-2 rounded-lg border border-[#E6EBF1] text-[12.5px] font-semibold text-[#1e3a5f] hover:bg-[#F6F9FC] disabled:opacity-40 flex-none">
                  {t('shopichat.sell.apply')}
                </button>
              </form>
            )}
          </section>

          {/* Pago */}
          <section>
            <p className={label}>{t('shopichat.sell.paymentTitle')}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {methods.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`px-3 py-1.5 rounded-full border text-[12px] font-medium ${method === m ? 'border-[#1e3a5f] bg-[#1e3a5f] text-white' : 'border-[#E6EBF1] text-[#425466] hover:bg-[#F6F9FC]'}`}
                >
                  {methodLabel(t, m)}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-[#A9B6C6]">
              {online ? t('shopichat.sell.onlineHint') : t('shopichat.sell.offlineHint')}
            </p>
          </section>

          <section>
            <p className={label}>{t('shopichat.sell.notes')}</p>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} maxLength={1000} className={`${input} mt-1.5 resize-none`} />
          </section>
        </div>

        {/* Totales */}
        <div className="px-5 py-3 border-t border-[#E6EBF1] space-y-1">
          <Row label={t('shopichat.sell.subtotal')} value={money(subtotal)} />
          {discount > 0 && <Row label={`${t('shopichat.sell.discount')} (${coupon?.code})`} value={`-${money(discount)}`} />}
          {delivery === 'delivery' && <Row label={t('shopichat.sell.shipping')} value={shipping > 0 ? money(shipping) : t('shopichat.sell.free')} />}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[14px] font-semibold text-[#1e3a5f]">{t('shopichat.sell.total')}</span>
            <span className="text-[16px] font-bold text-[#1e3a5f]">{money(total)}</span>
          </div>
          {stockIssue && <p className="text-[11.5px] text-red-600">{t('shopichat.sell.errors.stock', { name: stockIssue.product.name, count: productStock(stockIssue.product, stockIssue.combo) ?? 0 })}</p>}
          {error && <p className="text-[11.5px] text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 text-[13px] font-semibold text-[#425466] hover:bg-[#F6F9FC] rounded-lg">
              {t('shopichat.common.cancel')}
            </button>
            <button type="button" onClick={save} disabled={!canSave} className="px-4 py-2 text-[13px] font-semibold bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2a4d7a] disabled:opacity-40">
              {saving ? t('shopichat.sell.creating') : t('shopichat.sell.createAndInsert')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[12.5px] text-[#425466]">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
