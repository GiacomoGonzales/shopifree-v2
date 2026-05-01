import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useLanguage } from '../../hooks/useLanguage'
import { auth } from '../../lib/firebase'
import { apiUrl } from '../../utils/apiBase'
import type { Store } from '../../types'

const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  active: 'Activa',
  past_due: 'Pago pendiente',
  canceled: 'Cancelada',
  unpaid: 'Impagada',
  trialing: 'Prueba',
}

const toDate = (d: any): Date => {
  if (!d) return new Date(0)
  if (d.toDate) return d.toDate()
  if (d instanceof Date) return d
  return new Date(d)
}

interface Payment {
  id: string
  amount: number
  currency: string
  status: string
  created: number
  periodStart: number
  periodEnd: number
  customerEmail: string | null
  customerId: string
  storeName: string | null
  storeSubdomain: string | null
  storePlan: string | null
  storeId: string | null
  invoiceUrl: string | null
  invoicePdf: string | null
  description: string | null
}

export default function PaidStores() {
  const { localePath } = useLanguage()
  const [stores, setStores] = useState<(Store & { id: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'past_due' | 'canceled'>('all')
  const [tab, setTab] = useState<'stores' | 'payments'>('stores')

  // Payment history state
  const [payments, setPayments] = useState<Payment[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [paymentsError, setPaymentsError] = useState(false)
  const [paymentsLoaded, setPaymentsLoaded] = useState(false)
  const [paymentsHasMore, setPaymentsHasMore] = useState(false)
  const [paymentsLastId, setPaymentsLastId] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    const fetchPaidStores = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'stores'))
        const allStores = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as (Store & { id: string })[]

        const paid = allStores.filter(s =>
          (s.plan === 'pro' || s.plan === 'business') && s.subscription
        )

        paid.sort((a, b) => {
          const dateA = toDate(a.subscription?.currentPeriodStart)
          const dateB = toDate(b.subscription?.currentPeriodStart)
          return dateB.getTime() - dateA.getTime()
        })

        setStores(paid)
      } catch (error) {
        console.error('Error fetching paid stores:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPaidStores()
  }, [])

  const fetchPayments = async (startingAfter?: string) => {
    if (!auth.currentUser) return

    const isLoadMore = !!startingAfter
    if (isLoadMore) {
      setLoadingMore(true)
    } else {
      setPaymentsLoading(true)
    }

    try {
      const token = await auth.currentUser.getIdToken()

      const res = await fetch(apiUrl('/api/sync-subscription'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'list-payments',
          limit: 30,
          ...(startingAfter && { starting_after: startingAfter })
        })
      })

      if (!res.ok) throw new Error('Failed to fetch payments')

      const data = await res.json()

      if (isLoadMore) {
        setPayments(prev => [...prev, ...data.payments])
      } else {
        setPayments(data.payments)
      }
      setPaymentsHasMore(data.hasMore)
      setPaymentsLastId(data.lastId)
      setPaymentsLoaded(true)
    } catch (error) {
      console.error('Error fetching payments:', error)
      setPaymentsError(true)
    } finally {
      setPaymentsLoading(false)
      setLoadingMore(false)
    }
  }

  // Load payments when switching to payments tab (runs once)
  useEffect(() => {
    if (tab === 'payments' && !paymentsLoaded && !paymentsLoading && !paymentsError) {
      fetchPayments()
    }
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  const filteredStores = filter === 'all'
    ? stores
    : stores.filter(s => s.subscription?.status === filter)

  const totalActive = stores.filter(s => s.subscription?.status === 'active' || s.subscription?.status === 'trialing').length
  const totalPaymentsAmount = payments.reduce((sum, p) => sum + p.amount, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-200 border-t-gray-900" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Tiendas que han pagado</h1>
        <p className="text-sm text-gray-500 mt-0.5">Suscripciones activas, pasadas e historial de pagos</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total pagadas" value={stores.length} />
        <StatCard label="Activas ahora" value={totalActive} />
        <StatCard label="Pro" value={stores.filter(s => s.plan === 'pro').length} />
        <StatCard label="Business" value={stores.filter(s => s.plan === 'business').length} />
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 border-b border-gray-200">
        <TabButton active={tab === 'stores'} onClick={() => setTab('stores')}>Tiendas</TabButton>
        <TabButton active={tab === 'payments'} onClick={() => setTab('payments')}>Historial de pagos</TabButton>
      </div>

      {/* === STORES TAB === */}
      {tab === 'stores' && (
        <>
          {/* Filter tabs */}
          <div className="flex gap-1.5 flex-wrap">
            {(['all', 'active', 'past_due', 'canceled'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
                  filter === f
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                {f === 'all' ? `Todas (${stores.length})` :
                 f === 'active' ? `Activas (${stores.filter(s => s.subscription?.status === 'active' || s.subscription?.status === 'trialing').length})` :
                 f === 'past_due' ? `Pago pendiente (${stores.filter(s => s.subscription?.status === 'past_due').length})` :
                 `Canceladas (${stores.filter(s => s.subscription?.status === 'canceled').length})`}
              </button>
            ))}
          </div>

          {/* Store list */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {filteredStores.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-12">No hay tiendas en esta categoría</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredStores.map(store => {
                  const sub = store.subscription
                  // Prefer planExpiresAt (canonical "until when do they have
                  // access") over Stripe's currentPeriodEnd. They diverge for
                  // restored stores: a customer whose sub Stripe canceled but
                  // who paid through e.g. May 23 has planExpiresAt=May 23 and
                  // currentPeriodEnd=null.
                  const accessUntil = (() => {
                    if (store.planExpiresAt) return toDate(store.planExpiresAt)
                    if (sub?.currentPeriodEnd) return toDate(sub.currentPeriodEnd)
                    return null
                  })()
                  const daysLeft = accessUntil
                    ? Math.ceil((accessUntil.getTime() - Date.now()) / 86400000)
                    : null
                  const stillHasAccess = accessUntil !== null && accessUntil.getTime() > Date.now()
                  const status = sub?.status || 'unknown'

                  return (
                    <div key={store.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-3">
                        {store.logo ? (
                          <img src={store.logo} alt={store.name} className="w-10 h-10 rounded-md object-cover shrink-0" />
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center shrink-0">
                            <span className="text-gray-600 font-medium">{store.name.charAt(0)}</span>
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              to={localePath(`/admin/stores/${store.id}`)}
                              className="font-medium text-gray-900 hover:underline text-[14px]"
                            >
                              {store.name}
                            </Link>
                            <PlanBadge plan={store.plan} />
                            <StatusBadge status={status}>
                              {SUBSCRIPTION_STATUS_LABELS[status] || status}
                            </StatusBadge>
                          </div>

                          <p className="text-[12px] text-gray-500 mt-0.5 truncate">
                            {store.subdomain}.shopifree.app
                            {store.email && <span className="ml-2">· {store.email}</span>}
                          </p>

                          <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500 flex-wrap">
                            {sub?.stripeCustomerId && (
                              <span title="Stripe Customer ID">
                                Stripe: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] text-gray-700">{sub.stripeCustomerId}</code>
                              </span>
                            )}
                            {/* Active / trialing → straight "Vence: X". Canceled or
                                past_due but still in their paid period → "Acceso hasta X"
                                so the operator knows the customer keeps service even
                                with a non-active Stripe status (e.g. restored stores). */}
                            {accessUntil && (status === 'active' || status === 'trialing') && (
                              <span>
                                Vence: <span className={daysLeft !== null && daysLeft <= 7 ? 'text-gray-900 font-medium' : 'text-gray-700'}>
                                  {accessUntil.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  {daysLeft !== null && daysLeft > 0 && ` (${daysLeft}d)`}
                                </span>
                              </span>
                            )}
                            {accessUntil && stillHasAccess && (status === 'canceled' || status === 'past_due') && (
                              <span className="font-medium text-gray-900">
                                Acceso hasta {accessUntil.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
                                {daysLeft !== null && daysLeft > 0 && ` (${daysLeft}d)`}
                              </span>
                            )}
                            {/* "Cancela al vencer" only meaningful while sub is still
                                active and the cancel is scheduled. After it's already
                                canceled the access-until line above conveys what's
                                left, and the badge already says "Cancelada". */}
                            {status === 'active' && sub?.cancelAtPeriodEnd && (
                              <span className="text-gray-700">Cancela al vencer</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <a
                            href={`https://${store.subdomain}.shopifree.app`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                            title="Ver tienda"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                          <button
                            onClick={() => navigator.clipboard.writeText(store.id)}
                            className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                            title="Copiar ID"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* === PAYMENTS TAB === */}
      {tab === 'payments' && (
        <div className="space-y-4">
          {/* Total collected */}
          {payments.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Total recaudado (cargado)</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1 tabular-nums">
                ${totalPaymentsAmount.toFixed(2)} <span className="text-sm font-normal text-gray-500">USD</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">{payments.length} pagos registrados</p>
            </div>
          )}

          {paymentsLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-200 border-t-gray-900" />
            </div>
          ) : payments.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <p className="text-sm text-gray-500">No hay pagos registrados en Stripe</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="divide-y divide-gray-100">
                {payments.map(payment => {
                  const date = new Date(payment.created * 1000)

                  return (
                    <div key={payment.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-3">
                        {/* Amount badge */}
                        <div className="w-10 h-10 bg-gray-100 border border-gray-200 rounded-md flex items-center justify-center shrink-0">
                          <span className="text-gray-900 font-semibold text-[12px] tabular-nums">${payment.amount}</span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {payment.storeId ? (
                              <Link
                                to={localePath(`/admin/stores/${payment.storeId}`)}
                                className="font-medium text-gray-900 hover:underline text-[14px]"
                              >
                                {payment.storeName || 'Tienda desconocida'}
                              </Link>
                            ) : (
                              <span className="font-medium text-gray-900 text-[14px]">
                                {payment.customerEmail || 'Cliente desconocido'}
                              </span>
                            )}
                            {payment.storePlan && <PlanBadge plan={payment.storePlan} />}
                            <span className="px-2 py-0.5 text-[10px] rounded-sm font-medium uppercase tracking-wide border border-gray-900 text-gray-900">
                              Pagado
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mt-1 text-[12px] text-gray-500 flex-wrap">
                            <span>{date.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            <span>{date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</span>
                            {payment.storeSubdomain && (
                              <span>· {payment.storeSubdomain}.shopifree.app</span>
                            )}
                          </div>

                          {payment.description && (
                            <p className="text-[11px] text-gray-500 mt-1 truncate">{payment.description}</p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {payment.invoiceUrl && (
                            <a
                              href={payment.invoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                              title="Ver factura"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          )}
                          {payment.invoicePdf && (
                            <a
                              href={payment.invoicePdf}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                              title="Descargar PDF"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Load more */}
              {paymentsHasMore && (
                <div className="p-4 text-center border-t border-gray-200">
                  <button
                    onClick={() => paymentsLastId && fetchPayments(paymentsLastId)}
                    disabled={loadingMore}
                    className="px-4 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <span className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/30 border-t-white" />
                        Cargando...
                      </span>
                    ) : 'Cargar más pagos'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ──────────────── helpers ────────────────

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-2xl font-semibold text-gray-900 mt-1 tabular-nums">{value}</p>
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
        active
          ? 'text-gray-900 border-gray-900'
          : 'text-gray-500 hover:text-gray-900 border-transparent'
      }`}
    >
      {children}
    </button>
  )
}

function PlanBadge({ plan }: { plan?: string }) {
  const base = 'px-2 py-0.5 text-[10px] rounded-sm font-medium uppercase tracking-wide'
  if (plan === 'pro') return <span className={`${base} bg-gray-900 text-white`}>Pro</span>
  if (plan === 'business') return <span className={`${base} bg-black text-white`}>Business</span>
  return <span className={`${base} border border-gray-200 text-gray-600`}>Free</span>
}

function StatusBadge({ status, children }: { status?: string; children: React.ReactNode }) {
  const urgent = status === 'past_due' || status === 'canceled' || status === 'unpaid'
  return (
    <span
      className={`px-2 py-0.5 text-[11px] rounded-sm font-medium border ${
        urgent ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-700'
      }`}
    >
      {children}
    </span>
  )
}
