/**
 * Link de pago de un pedido existente: /pay/{storeId}/{orderId}.
 *
 * Lo manda el comerciante por WhatsApp desde ShopiChat ("Paga aquí: <link>").
 * El comprador no puede leer pedidos en Firestore, así que el resumen viene de
 * GET /api/pay-order (solo campos seguros y montos recalculados en el
 * servidor). El cobro usa los MISMOS endpoints que el checkout, que vuelven a
 * validar el pedido y calculan el monto en el servidor (nunca el del
 * navegador): Mercado Pago (Checkout Pro), PayPal y GoCuotas redirigen a la
 * pasarela y vuelven a /payment/success; Stripe se paga acá mismo.
 */
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import type { Stripe } from '@stripe/stripe-js'
import { apiUrl } from '../../utils/apiBase'
import { formatPrice } from '../../lib/currency'
import { getThemeTranslations } from '../../themes/shared/translations'
import { confirmStripePayment, createPaymentIntent, getStoreStripe } from '../../lib/stripe-payments'

interface PayData {
  store: {
    name: string
    logo: string | null
    currency: string
    language: string
    subdomain: string | null
    customDomain: string | null
    whatsapp: string | null
    stripePublishableKey: string | null
  }
  order: {
    orderNumber: string
    firstName: string | null
    items: { name: string; quantity: number; unitPrice: number; variations: string[] }[]
    subtotal: number
    shipping: number
    discount: number
    couponCode: string | null
    total: number
    deliveryMethod: 'pickup' | 'delivery'
    paymentMethod: string
    paymentStatus: string
  }
  payable: boolean
  reason: string | null
}

type Lang = 'es' | 'en' | 'pt'
const TEXTS: Record<Lang, Record<string, string>> = {
  es: {
    title: 'Pagar pedido', hi: 'Hola {name}, este es tu pedido', pay: 'Pagar {amount}', payWith: 'Pagar con {method}',
    loading: 'Cargando tu pedido…', notFound: 'Este link de pago no existe o ya no está disponible.',
    paid: '¡Este pedido ya está pagado! Gracias por tu compra.', cancelled: 'Este pedido fue cancelado.',
    unavailable: 'Este pedido no se puede pagar online en este momento. Escríbenos por WhatsApp para coordinar.',
    error: 'No pudimos iniciar el pago. Intenta de nuevo en unos minutos.', secure: 'Pago seguro procesado por {method}',
    redirecting: 'Te estamos llevando a {method}…', pickup: 'Recojo en tienda', delivery: 'Envío a domicilio', coupon: 'Cupón',
    contact: 'Escribir por WhatsApp', outOfStock: '"{item}" ya no tiene stock suficiente. Escríbenos por WhatsApp para coordinar.',
  },
  en: {
    title: 'Pay order', hi: 'Hi {name}, here is your order', pay: 'Pay {amount}', payWith: 'Pay with {method}',
    loading: 'Loading your order…', notFound: "This payment link doesn't exist or is no longer available.",
    paid: 'This order is already paid. Thanks for your purchase!', cancelled: 'This order was cancelled.',
    unavailable: "This order can't be paid online right now. Message us on WhatsApp to sort it out.",
    error: "We couldn't start the payment. Please try again in a few minutes.", secure: 'Secure payment processed by {method}',
    redirecting: 'Taking you to {method}…', pickup: 'Store pickup', delivery: 'Home delivery', coupon: 'Coupon',
    contact: 'Message on WhatsApp', outOfStock: '"{item}" is no longer in stock. Message us on WhatsApp to sort it out.',
  },
  pt: {
    title: 'Pagar pedido', hi: 'Olá {name}, este é o seu pedido', pay: 'Pagar {amount}', payWith: 'Pagar com {method}',
    loading: 'Carregando seu pedido…', notFound: 'Este link de pagamento não existe ou não está mais disponível.',
    paid: 'Este pedido já está pago! Obrigado pela compra.', cancelled: 'Este pedido foi cancelado.',
    unavailable: 'Este pedido não pode ser pago online agora. Fale conosco pelo WhatsApp.',
    error: 'Não foi possível iniciar o pagamento. Tente novamente em alguns minutos.', secure: 'Pagamento seguro processado por {method}',
    redirecting: 'Levando você para {method}…', pickup: 'Retirada na loja', delivery: 'Entrega em domicílio', coupon: 'Cupom',
    contact: 'Falar no WhatsApp', outOfStock: '"{item}" não tem mais estoque suficiente. Fale conosco pelo WhatsApp.',
  },
}

const METHOD_NAMES: Record<string, string> = {
  mercadopago: 'Mercado Pago', stripe: 'Stripe', paypal: 'PayPal', gocuotas: 'GoCuotas',
}

const fill = (s: string, vars: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')

/**
 * En desarrollo la API apunta a producción, donde /api/pay-order puede no
 * existir todavía (Vercel devuelve el index.html). Solo en DEV, si quien abre
 * el link es el dueño logueado, se lee el pedido directo de Firestore.
 */
async function devFallback(storeId: string, orderId: string): Promise<PayData | null> {
  if (!import.meta.env.DEV) return null
  try {
    const [{ doc, getDoc }, { db }] = await Promise.all([import('firebase/firestore'), import('../../lib/firebase')])
    const [s, o] = await Promise.all([getDoc(doc(db, 'stores', storeId)), getDoc(doc(db, 'stores', storeId, 'orders', orderId))])
    if (!s.exists() || !o.exists()) return null
    const st = s.data() as Record<string, unknown>
    const od = o.data() as Record<string, unknown> & {
      items?: { productName: string; quantity: number; price: number; selectedVariations?: { value: string }[] }[]
      customer?: { name?: string }
      discount?: { amount?: number; code?: string }
    }
    const payments = (st.payments || {}) as Record<string, { enabled?: boolean; publishableKey?: string }>
    const method = String(od.paymentMethod || '')
    const paid = od.paymentStatus === 'paid'
    return {
      store: {
        name: String(st.name || ''), logo: (st.logo as string) || null, currency: String(st.currency || 'USD'),
        language: String(st.language || 'es'), subdomain: (st.subdomain as string) || null, customDomain: (st.customDomain as string) || null,
        whatsapp: (st.whatsapp as string) || null, stripePublishableKey: method === 'stripe' ? payments.stripe?.publishableKey || null : null,
      },
      order: {
        orderNumber: String(od.orderNumber || ''), firstName: (od.customer?.name || '').split(' ')[0] || null,
        items: (od.items || []).map(it => ({ name: it.productName, quantity: it.quantity, unitPrice: it.price, variations: (it.selectedVariations || []).map(v => v.value) })),
        subtotal: Number(od.subtotal) || 0, shipping: Number(od.shippingCost) || 0, discount: Number(od.discount?.amount) || 0,
        couponCode: od.discount?.code || null, total: Number(od.total) || 0,
        deliveryMethod: od.deliveryMethod === 'delivery' ? 'delivery' : 'pickup', paymentMethod: method, paymentStatus: String(od.paymentStatus || 'pending'),
      },
      payable: !paid && od.status !== 'cancelled' && Boolean(payments[method]?.enabled),
      reason: paid ? 'already_paid' : od.status === 'cancelled' ? 'cancelled' : null,
    }
  } catch {
    return null
  }
}

async function loadPayData(storeId: string, orderId: string): Promise<PayData | null> {
  try {
    const res = await fetch(apiUrl(`/api/pay-order?storeId=${encodeURIComponent(storeId)}&orderId=${encodeURIComponent(orderId)}`))
    const isJson = (res.headers.get('content-type') || '').includes('application/json')
    if (res.ok && isJson) return (await res.json()) as PayData
    if (!isJson) return devFallback(storeId, orderId)
    return null
  } catch {
    return devFallback(storeId, orderId)
  }
}

export default function PayOrder() {
  const { storeId = '', orderId = '' } = useParams<{ storeId: string; orderId: string }>()
  const [data, setData] = useState<PayData | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stripeSecret, setStripeSecret] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    loadPayData(storeId, orderId).then(d => { if (alive) setData(d) })
    return () => { alive = false }
  }, [storeId, orderId])

  const lang: Lang = useMemo(() => {
    const l = (data?.store.language || navigator.language || 'es').slice(0, 2)
    return (l === 'en' || l === 'pt' ? l : 'es') as Lang
  }, [data])
  const tx = TEXTS[lang]
  const theme = getThemeTranslations(lang)

  useEffect(() => {
    document.title = data?.store.name ? `${tx.title} · ${data.store.name}` : tx.title
  }, [data, tx.title])

  const stripePromise = useMemo<Promise<Stripe | null> | null>(
    () => (data?.store.stripePublishableKey ? getStoreStripe(data.store.stripePublishableKey) : null),
    [data]
  )

  if (data === undefined) return <Shell><Spinner label={tx.loading} /></Shell>
  if (data === null) return <Shell><Notice text={tx.notFound} /></Shell>

  const { store, order } = data
  const money = (n: number) => formatPrice(n, store.currency)
  const methodName = METHOD_NAMES[order.paymentMethod] || order.paymentMethod
  const storeHome = store.customDomain ? `https://${store.customDomain}` : store.subdomain ? `https://${store.subdomain}.shopifree.app` : null
  const waLink = store.whatsapp ? `https://wa.me/${store.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`${theme.orderNumber}: ${order.orderNumber}`)}` : null

  // Para /payment/success: recupera el pedido al volver de la pasarela.
  const savePending = (extra: Record<string, unknown> = {}) => {
    try {
      localStorage.setItem('pendingOrder', JSON.stringify({
        orderId, storeId, orderNumber: order.orderNumber, language: lang, storeName: store.name,
        storeWhatsapp: store.whatsapp, storeSubdomain: store.subdomain, storeCustomDomain: store.customDomain,
        currency: store.currency, deliveryMethod: order.deliveryMethod,
        items: order.items.map(it => ({
          productName: it.name, quantity: it.quantity, itemTotal: Math.round(it.unitPrice * it.quantity * 100) / 100,
          selectedVariations: it.variations.map(v => ({ name: '', value: v })),
        })),
        subtotal: order.subtotal, shippingCost: order.shipping, total: order.total, paymentMethod: order.paymentMethod,
        ...extra,
      }))
    } catch { /* sin almacenamiento: /payment/success usa los parámetros de la URL */ }
  }

  const post = async (path: string, body: Record<string, unknown>) => {
    const res = await fetch(apiUrl(path), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const json = await res.json().catch(() => ({})) as Record<string, unknown>
    if (!res.ok) throw new Error(typeof json.error === 'string' ? json.error : tx.error)
    return json
  }

  const pay = async () => {
    setBusy(true)
    setError(null)
    const origin = window.location.origin
    try {
      if (order.paymentMethod === 'mercadopago') {
        const r = await post('/api/create-mp-preference', { storeId, orderId, orderNumber: order.orderNumber, origin })
        if (typeof r.init_point !== 'string') throw new Error(tx.error)
        savePending()
        window.location.href = r.init_point
      } else if (order.paymentMethod === 'paypal') {
        const r = await post('/api/create-paypal-order', { storeId, orderId, orderNumber: order.orderNumber, origin })
        if (typeof r.approveUrl !== 'string') throw new Error(tx.error)
        savePending({ paypalOrderId: r.paypalOrderId })
        window.location.href = r.approveUrl
      } else if (order.paymentMethod === 'gocuotas') {
        const r = await post('/api/create-gocuotas-checkout', { storeId, orderId, orderNumber: order.orderNumber, origin })
        if (typeof r.url_init !== 'string') throw new Error(tx.error)
        savePending()
        window.location.href = r.url_init
      } else if (order.paymentMethod === 'stripe') {
        // El monto que se manda se ignora: el servidor lo recalcula del pedido.
        const { clientSecret } = await createPaymentIntent(storeId, orderId, order.total, store.currency)
        setStripeSecret(clientSecret)
        setBusy(false)
      } else {
        throw new Error(tx.unavailable)
      }
    } catch (e) {
      const msg = e instanceof Error && e.message ? e.message : tx.error
      // OUT_OF_STOCK del servidor: 'stockInsufficient:{producto}:{disponible}'
      // (el nombre puede traer ':' → se toma todo entre el primer y el último ':')
      setError(msg.startsWith('stockInsufficient:')
        ? tx.outOfStock.replace('{item}', msg.slice('stockInsufficient:'.length, msg.lastIndexOf(':')))
        : msg)
      setBusy(false)
    }
  }

  const onStripePaid = () => {
    savePending()
    window.location.href = `/payment/success?orderId=${encodeURIComponent(orderId)}&storeId=${encodeURIComponent(storeId)}&orderNumber=${encodeURIComponent(order.orderNumber)}`
  }

  const blocked = !data.payable
  const blockedText = data.reason === 'already_paid' ? tx.paid : data.reason === 'cancelled' ? tx.cancelled : tx.unavailable

  return (
    <Shell>
      <div className="flex items-center gap-3 mb-5">
        {store.logo
          ? <img src={store.logo} alt="" className="w-11 h-11 rounded-xl object-contain bg-white border border-gray-100" />
          : <span className="w-11 h-11 rounded-xl bg-gray-900 text-white grid place-items-center font-semibold">{store.name.slice(0, 1)}</span>}
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{store.name}</p>
          <p className="text-xs text-gray-500">{theme.orderNumber}: {order.orderNumber}</p>
        </div>
      </div>

      {order.firstName && <p className="text-sm text-gray-600 mb-3">{fill(tx.hi, { name: order.firstName })}</p>}

      <div className="rounded-2xl border border-gray-200 bg-white">
        <ul className="divide-y divide-gray-100">
          {order.items.map((it, i) => (
            <li key={i} className="flex items-start gap-3 px-4 py-3 text-sm">
              <span className="text-gray-500 tabular-nums">{it.quantity}×</span>
              <span className="flex-1 min-w-0">
                <span className="block text-gray-900">{it.name}</span>
                {it.variations.length > 0 && <span className="block text-xs text-gray-500">{it.variations.join(' / ')}</span>}
              </span>
              <span className="text-gray-900 tabular-nums">{money(it.unitPrice * it.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="border-t border-gray-100 px-4 py-3 space-y-1 text-sm">
          <Row label={theme.subtotal} value={money(order.subtotal)} />
          {order.discount > 0 && <Row label={`${theme.discount}${order.couponCode ? ` (${order.couponCode})` : ''}`} value={`-${money(order.discount)}`} />}
          <Row label={order.deliveryMethod === 'delivery' ? `${theme.shipping}` : tx.pickup} value={order.deliveryMethod === 'delivery' ? money(order.shipping) : '—'} />
          <div className="flex items-center justify-between pt-2 text-base font-semibold text-gray-900">
            <span>{theme.total}</span>
            <span className="tabular-nums">{money(order.total)}</span>
          </div>
        </div>
      </div>

      <div className="mt-5">
        {blocked ? (
          <Notice text={blockedText} tone={data.reason === 'already_paid' ? 'success' : 'neutral'} />
        ) : stripeSecret && stripePromise ? (
          <Elements stripe={stripePromise} options={{ clientSecret: stripeSecret, appearance: { theme: 'stripe' } }}>
            <StripeForm storeId={storeId} orderId={orderId} label={fill(tx.pay, { amount: money(order.total) })} failText={theme.paymentRejected} onPaid={onStripePaid} />
          </Elements>
        ) : (
          <button
            type="button"
            onClick={pay}
            disabled={busy}
            className="w-full py-3.5 rounded-xl bg-gray-900 text-white font-semibold hover:bg-gray-800 disabled:opacity-60"
          >
            {busy ? fill(tx.redirecting, { method: methodName }) : `${fill(tx.pay, { amount: money(order.total) })} · ${methodName}`}
          </button>
        )}
        {error && <p className="mt-3 text-sm text-red-600 text-center">{error}</p>}
        {!blocked && <p className="mt-3 text-xs text-gray-400 text-center">{fill(tx.secure, { method: methodName })}</p>}
      </div>

      <div className="mt-6 flex flex-col items-center gap-2 text-sm">
        {waLink && <a href={waLink} target="_blank" rel="noopener noreferrer" className="text-emerald-700 font-medium hover:underline">{tx.contact}</a>}
        {storeHome && <a href={storeHome} className="text-gray-500 hover:underline">{theme.backToStore}</a>}
      </div>
    </Shell>
  )
}

function StripeForm({ storeId, orderId, label, failText, onPaid }: { storeId: string; orderId: string; label: string; failText: string; onPaid: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setProcessing(true)
    setError(null)
    try {
      const { error: err, paymentIntent } = await stripe.confirmPayment({ elements, redirect: 'if_required' })
      if (err) throw new Error(err.message || failText)
      if (!paymentIntent || (paymentIntent.status !== 'succeeded' && paymentIntent.status !== 'processing')) throw new Error(failText)
      // El servidor verifica el PaymentIntent contra el pedido y lo marca pagado.
      await confirmStripePayment(storeId, orderId, paymentIntent.id)
      onPaid()
    } catch (x) {
      setError(x instanceof Error ? x.message : failText)
      setProcessing(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <PaymentElement />
      <button type="submit" disabled={!stripe || processing} className="w-full py-3.5 rounded-xl bg-gray-900 text-white font-semibold hover:bg-gray-800 disabled:opacity-60">
        {processing ? '…' : label}
      </button>
      {error && <p className="text-sm text-red-600 text-center">{error}</p>}
    </form>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:py-14">
      <div className="mx-auto w-full max-w-md">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-gray-600">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}

function Spinner({ label }: { label: string }) {
  return (
    <div className="py-24 flex flex-col items-center gap-3 text-gray-500">
      <span className="w-8 h-8 rounded-full border-2 border-gray-300 border-t-gray-700 animate-spin" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

function Notice({ text, tone = 'neutral' }: { text: string; tone?: 'neutral' | 'success' }) {
  return (
    <div className={`rounded-xl px-4 py-4 text-sm text-center ${tone === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-white text-gray-700 border border-gray-200'}`}>
      {text}
    </div>
  )
}
