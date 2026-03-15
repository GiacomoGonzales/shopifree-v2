import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
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

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  past_due: 'bg-yellow-100 text-yellow-700',
  canceled: 'bg-red-100 text-red-700',
  unpaid: 'bg-red-100 text-red-700',
  trialing: 'bg-blue-100 text-blue-700',
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
  const { firebaseUser } = useAuth()
  const [stores, setStores] = useState<(Store & { id: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'past_due' | 'canceled'>('all')
  const [tab, setTab] = useState<'stores' | 'payments'>('stores')

  // Payment history state
  const [payments, setPayments] = useState<Payment[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)
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
      const params = new URLSearchParams({ limit: '30' })
      if (startingAfter) params.set('starting_after', startingAfter)

      const res = await fetch(apiUrl(`/api/admin-payments?${params}`), {
        headers: { Authorization: `Bearer ${token}` }
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
    } finally {
      setPaymentsLoading(false)
      setLoadingMore(false)
    }
  }

  // Load payments when switching to payments tab
  useEffect(() => {
    if (tab === 'payments' && !paymentsLoaded && !paymentsLoading) {
      fetchPayments()
    }
  }, [tab, paymentsLoaded, paymentsLoading])

  const filteredStores = filter === 'all'
    ? stores
    : stores.filter(s => s.subscription?.status === filter)

  const totalActive = stores.filter(s => s.subscription?.status === 'active' || s.subscription?.status === 'trialing').length
  const totalPaymentsAmount = payments.reduce((sum, p) => sum + p.amount, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-1/4 w-32 h-32 bg-white/10 rounded-full translate-y-1/2" />
        <div className="relative">
          <h1 className="text-2xl font-bold">Tiendas que han pagado</h1>
          <p className="text-emerald-200 mt-1">Suscripciones activas, pasadas e historial de pagos</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-black/5 rounded-2xl p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Total pagadas</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stores.length}</p>
        </div>
        <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-black/5 rounded-2xl p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Activas ahora</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{totalActive}</p>
        </div>
        <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-black/5 rounded-2xl p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Pro</p>
          <p className="text-3xl font-bold text-violet-600 mt-2">{stores.filter(s => s.plan === 'pro').length}</p>
        </div>
        <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-black/5 rounded-2xl p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Business</p>
          <p className="text-3xl font-bold text-amber-600 mt-2">{stores.filter(s => s.plan === 'business').length}</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('stores')}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            tab === 'stores'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25'
              : 'bg-white/60 text-gray-600 hover:bg-white/80 border border-white/80'
          }`}
        >
          Tiendas
        </button>
        <button
          onClick={() => setTab('payments')}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            tab === 'payments'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25'
              : 'bg-white/60 text-gray-600 hover:bg-white/80 border border-white/80'
          }`}
        >
          Historial de pagos
        </button>
      </div>

      {/* === STORES TAB === */}
      {tab === 'stores' && (
        <>
          {/* Filter tabs */}
          <div className="flex gap-2 flex-wrap">
            {(['all', 'active', 'past_due', 'canceled'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  filter === f
                    ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-lg shadow-violet-500/25'
                    : 'bg-white/60 text-gray-600 hover:bg-white/80 border border-white/80'
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
          <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-black/5 rounded-2xl overflow-hidden">
            {filteredStores.length === 0 ? (
              <p className="text-gray-400 text-center py-12">No hay tiendas en esta categoria</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredStores.map(store => {
                  const sub = store.subscription
                  const periodEnd = toDate(sub?.currentPeriodEnd)
                  const daysLeft = Math.ceil((periodEnd.getTime() - Date.now()) / 86400000)
                  const status = sub?.status || 'unknown'

                  return (
                    <div key={store.id} className="p-4 sm:p-5 hover:bg-white/40 transition-colors">
                      <div className="flex items-start gap-4">
                        {store.logo ? (
                          <img src={store.logo} alt={store.name} className="w-12 h-12 rounded-xl object-cover ring-1 ring-black/5 shrink-0" />
                        ) : (
                          <div className="w-12 h-12 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-xl flex items-center justify-center ring-1 ring-black/5 shrink-0">
                            <span className="text-violet-600 font-bold text-lg">{store.name.charAt(0)}</span>
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              to={localePath(`/admin/stores/${store.id}`)}
                              className="font-semibold text-gray-900 hover:text-violet-600 transition-colors"
                            >
                              {store.name}
                            </Link>
                            <span className={`px-2.5 py-0.5 text-xs rounded-full font-medium capitalize ${
                              store.plan === 'pro'
                                ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white'
                                : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                            }`}>
                              {store.plan}
                            </span>
                            <span className={`px-2.5 py-0.5 text-xs rounded-full font-medium ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}>
                              {SUBSCRIPTION_STATUS_LABELS[status] || status}
                            </span>
                          </div>

                          <p className="text-sm text-gray-400 mt-0.5">
                            {store.subdomain}.shopifree.app
                            {store.email && <span className="ml-2">&middot; {store.email}</span>}
                          </p>

                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                            {sub?.stripeCustomerId && (
                              <span title="Stripe Customer ID">
                                Stripe: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">{sub.stripeCustomerId}</code>
                              </span>
                            )}
                            {(status === 'active' || status === 'trialing') && (
                              <span>
                                Vence: <span className={daysLeft <= 7 ? 'text-red-600 font-medium' : 'text-gray-600'}>
                                  {periodEnd.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  {daysLeft > 0 && ` (${daysLeft}d)`}
                                </span>
                              </span>
                            )}
                            {sub?.cancelAtPeriodEnd && (
                              <span className="text-orange-600 font-medium">Cancela al vencer</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={`https://${store.subdomain}.shopifree.app`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all"
                            title="Ver tienda"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                          <button
                            onClick={() => navigator.clipboard.writeText(store.id)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                            title="Copiar ID"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
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
            <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-black/5 rounded-2xl p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Total recaudado (cargado)</p>
              <p className="text-3xl font-bold text-emerald-600 mt-2">
                ${totalPaymentsAmount.toFixed(2)} <span className="text-base font-normal text-gray-400">USD</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">{payments.length} pagos registrados</p>
            </div>
          )}

          {paymentsLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : payments.length === 0 ? (
            <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-black/5 rounded-2xl p-12 text-center">
              <p className="text-gray-400">No hay pagos registrados en Stripe</p>
            </div>
          ) : (
            <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-black/5 rounded-2xl overflow-hidden">
              <div className="divide-y divide-gray-100">
                {payments.map(payment => {
                  const date = new Date(payment.created * 1000)

                  return (
                    <div key={payment.id} className="p-4 sm:p-5 hover:bg-white/40 transition-colors">
                      <div className="flex items-start gap-4">
                        {/* Amount badge */}
                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-green-100 rounded-xl flex items-center justify-center ring-1 ring-black/5 shrink-0">
                          <span className="text-emerald-700 font-bold text-sm">${payment.amount}</span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {payment.storeId ? (
                              <Link
                                to={localePath(`/admin/stores/${payment.storeId}`)}
                                className="font-semibold text-gray-900 hover:text-violet-600 transition-colors"
                              >
                                {payment.storeName || 'Tienda desconocida'}
                              </Link>
                            ) : (
                              <span className="font-semibold text-gray-900">
                                {payment.customerEmail || 'Cliente desconocido'}
                              </span>
                            )}
                            {payment.storePlan && (
                              <span className={`px-2.5 py-0.5 text-xs rounded-full font-medium capitalize ${
                                payment.storePlan === 'pro'
                                  ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white'
                                  : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                              }`}>
                                {payment.storePlan}
                              </span>
                            )}
                            <span className="px-2.5 py-0.5 text-xs rounded-full font-medium bg-green-100 text-green-700">
                              Pagado
                            </span>
                          </div>

                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-400 flex-wrap">
                            <span>{date.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            <span>{date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</span>
                            {payment.storeSubdomain && (
                              <span>&middot; {payment.storeSubdomain}.shopifree.app</span>
                            )}
                          </div>

                          {payment.description && (
                            <p className="text-xs text-gray-400 mt-1 truncate">{payment.description}</p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {payment.invoiceUrl && (
                            <a
                              href={payment.invoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all"
                              title="Ver factura"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          )}
                          {payment.invoicePdf && (
                            <a
                              href={payment.invoicePdf}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                              title="Descargar PDF"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
                <div className="p-4 text-center border-t border-gray-100">
                  <button
                    onClick={() => paymentsLastId && fetchPayments(paymentsLastId)}
                    disabled={loadingMore}
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <span className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Cargando...
                      </span>
                    ) : 'Cargar mas pagos'}
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
