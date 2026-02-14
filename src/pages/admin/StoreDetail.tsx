import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db, analyticsService, productService, categoryService, orderService } from '../../lib/firebase'
import { useLanguage } from '../../hooks/useLanguage'
import { getCurrencySymbol } from '../../lib/currency'
import type { Store, Order, AnalyticsSummary, DailyStats, TopProduct, DeviceStats, ReferrerStats } from '../../types'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const DEVICE_COLORS = ['#6366f1', '#22c55e']

const REFERRER_COLORS: Record<string, string> = {
  direct: '#6366f1',
  whatsapp: '#22c55e',
  instagram: '#e11d48',
  facebook: '#3b82f6',
  google: '#f59e0b',
  tiktok: '#000000',
  other: '#9ca3af'
}

const REFERRER_LABELS: Record<string, string> = {
  direct: 'Directo',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  facebook: 'Facebook',
  google: 'Google',
  tiktok: 'TikTok',
  other: 'Otro'
}

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  paid: 'bg-green-100/80 text-green-700',
  pending: 'bg-yellow-100/80 text-yellow-700',
  failed: 'bg-red-100/80 text-red-700',
  refunded: 'bg-gray-100/80 text-gray-600'
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: 'Pagado',
  pending: 'Pendiente',
  failed: 'Fallido',
  refunded: 'Reembolsado'
}

function toDate(d: any): Date {
  if (!d) return new Date(0)
  if (d.toDate) return d.toDate()
  if (d instanceof Date) return d
  return new Date(d)
}

function deriveTopSelling(orders: Order[]) {
  const map: Record<string, { productName: string; quantitySold: number; revenue: number }> = {}
  orders.forEach(order => {
    order.items?.forEach(item => {
      if (!map[item.productId]) {
        map[item.productId] = { productName: item.productName, quantitySold: 0, revenue: 0 }
      }
      map[item.productId].quantitySold += item.quantity
      map[item.productId].revenue += item.itemTotal || item.price * item.quantity
    })
  })
  return Object.values(map).sort((a, b) => b.quantitySold - a.quantitySold).slice(0, 5)
}

interface OwnerInfo {
  email: string
  firstName?: string
  lastName?: string
}

export default function StoreDetail() {
  const { storeId } = useParams<{ storeId: string }>()
  const { localePath } = useLanguage()

  const [store, setStore] = useState<(Store & { id: string }) | null>(null)
  const [owner, setOwner] = useState<OwnerInfo | null>(null)
  const [loading, setLoading] = useState(true)

  // KPI states
  const [totalProducts, setTotalProducts] = useState(0)
  const [totalCategories, setTotalCategories] = useState(0)
  const [allOrders, setAllOrders] = useState<Order[]>([])

  // Analytics states
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [deviceStats, setDeviceStats] = useState<DeviceStats | null>(null)
  const [referrerStats, setReferrerStats] = useState<ReferrerStats[]>([])

  useEffect(() => {
    if (!storeId) return

    const fetchAll = async () => {
      setLoading(true)
      try {
        // Fetch store
        const storeSnap = await getDoc(doc(db, 'stores', storeId))
        if (!storeSnap.exists()) {
          setLoading(false)
          return
        }
        const storeData = { id: storeSnap.id, ...storeSnap.data() } as Store & { id: string }
        setStore(storeData)

        // Fetch owner
        if (storeData.ownerId) {
          const userSnap = await getDoc(doc(db, 'users', storeData.ownerId))
          if (userSnap.exists()) {
            const userData = userSnap.data()
            setOwner({ email: userData.email, firstName: userData.firstName, lastName: userData.lastName })
          }
        }

        // Fetch KPIs and analytics in parallel
        const endDate = new Date()
        endDate.setHours(23, 59, 59, 999)
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - 29)
        startDate.setHours(0, 0, 0, 0)

        const [products, categories, orders, analytics] = await Promise.all([
          productService.getAll(storeId),
          categoryService.getAll(storeId),
          orderService.getAll(storeId, 9999),
          analyticsService.getFullAnalytics(storeId, startDate, endDate)
        ])

        setTotalProducts(products.length)
        setTotalCategories(categories.length)
        setAllOrders(orders)
        setSummary(analytics.summary)
        setDailyStats(analytics.dailyStats)
        setTopProducts(analytics.topProducts)
        setDeviceStats(analytics.deviceStats)
        setReferrerStats(analytics.referrerStats)
      } catch (error) {
        console.error('Error loading store detail:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [storeId])

  const currencySymbol = getCurrencySymbol(store?.currency || 'USD')

  const totalRevenue = useMemo(() =>
    allOrders.reduce((sum, o) => sum + (o.total || 0), 0),
    [allOrders]
  )

  const recentOrders = useMemo(() => allOrders.slice(0, 5), [allOrders])

  const topSelling = useMemo(() => deriveTopSelling(allOrders), [allOrders])

  const devicePieData = useMemo(() => {
    if (!deviceStats) return []
    const total = deviceStats.mobile + deviceStats.desktop
    if (total === 0) return []
    return [
      { name: 'Mobile', value: deviceStats.mobile },
      { name: 'Desktop', value: deviceStats.desktop }
    ]
  }, [deviceStats])

  const referrerChartData = useMemo(() =>
    referrerStats.map(r => ({
      source: REFERRER_LABELS[r.source] || r.source,
      count: r.count,
      fill: REFERRER_COLORS[r.source] || '#9ca3af'
    })),
    [referrerStats]
  )

  const funnelData = useMemo(() => {
    if (!summary) return []
    return [
      { name: 'Visitas', value: summary.pageViews, color: '#3b82f6' },
      { name: 'Vistas producto', value: summary.productViews, color: '#10b981' },
      { name: 'Agregar carrito', value: summary.cartAdds, color: '#f59e0b' },
      { name: 'WhatsApp', value: summary.whatsappClicks, color: '#22c55e' }
    ]
  }, [summary])

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
      </div>
    )
  }

  if (!store) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Tienda no encontrada</p>
        <Link to={localePath('/admin/stores')} className="text-violet-600 hover:underline">
          Volver a tiendas
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <Link
        to={localePath('/admin/stores')}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-violet-600 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Volver a tiendas
      </Link>

      {/* Header */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-black/5 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {store.logo ? (
            <img src={store.logo} alt={store.name} className="w-16 h-16 rounded-xl object-cover ring-1 ring-black/5" />
          ) : (
            <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-2xl text-violet-600 font-bold">{store.name.charAt(0)}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{store.name}</h1>
              <span className={`px-3 py-1 text-xs rounded-full font-medium capitalize ${
                store.plan === 'free' ? 'bg-gray-100/80 text-gray-600' :
                store.plan === 'pro' ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white' :
                'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
              }`}>
                {store.plan}
              </span>
              {store.subscription && (
                <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                  store.subscription.status === 'active' ? 'bg-green-100/80 text-green-700' :
                  store.subscription.status === 'trialing' ? 'bg-blue-100/80 text-blue-700' :
                  store.subscription.status === 'past_due' ? 'bg-yellow-100/80 text-yellow-700' :
                  'bg-red-100/80 text-red-700'
                }`}>
                  {store.subscription.status}
                </span>
              )}
            </div>
            <a
              href={`https://${store.subdomain}.shopifree.app`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-600 hover:text-violet-700 hover:underline text-sm font-medium"
            >
              {store.subdomain}.shopifree.app
            </a>
            <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-sm text-gray-500">
              {owner && (
                <span>
                  <span className="text-gray-400">Owner:</span>{' '}
                  {owner.firstName || owner.lastName
                    ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim()
                    : owner.email}
                </span>
              )}
              {store.businessType && (
                <span><span className="text-gray-400">Tipo:</span> {store.businessType}</span>
              )}
              <span><span className="text-gray-400">Moneda:</span> {store.currency}</span>
              <span><span className="text-gray-400">Idioma:</span> {store.language || 'es'}</span>
              <span>
                <span className="text-gray-400">Creada:</span>{' '}
                {toDate(store.createdAt).toLocaleDateString()}
              </span>
              <span>
                <span className="text-gray-400">Actualizada:</span>{' '}
                {toDate(store.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Productos" value={totalProducts} icon={
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
        } gradient="from-violet-500 to-indigo-500" />
        <KPICard label="Categorias" value={totalCategories} icon={
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
        } gradient="from-blue-500 to-cyan-500" />
        <KPICard label="Pedidos" value={allOrders.length} icon={
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
        } gradient="from-emerald-500 to-green-500" />
        <KPICard label="Ingresos" value={`${currencySymbol}${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} icon={
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        } gradient="from-amber-500 to-orange-500" />
        <KPICard label="Visitas" value={summary?.pageViews ?? 0} icon={
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
        } gradient="from-pink-500 to-rose-500" sub="ultimos 30 dias" />
        <KPICard label="Vistas producto" value={summary?.productViews ?? 0} icon={
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
        } gradient="from-teal-500 to-emerald-500" sub="ultimos 30 dias" />
        <KPICard label="Agregar carrito" value={summary?.cartAdds ?? 0} icon={
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
        } gradient="from-yellow-500 to-amber-500" sub="ultimos 30 dias" />
        <KPICard label="WhatsApp clicks" value={summary?.whatsappClicks ?? 0} icon={
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
        } gradient="from-green-500 to-emerald-500" sub="ultimos 30 dias" />
      </div>

      {/* Recent Orders */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-black/5 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/60">
          <h2 className="text-lg font-semibold text-gray-900">Ultimos pedidos</h2>
        </div>
        {recentOrders.length === 0 ? (
          <div className="text-center py-8 text-gray-400">Sin pedidos</div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-white/50 border-b border-white/60">
                    <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Pedido</th>
                    <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Cliente</th>
                    <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Total</th>
                    <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Pago</th>
                    <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map(order => (
                    <tr key={order.id} className="border-b border-white/60 hover:bg-white/40 transition-colors">
                      <td className="px-6 py-3 text-sm font-medium text-gray-900">{order.orderNumber}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{order.customer?.name || order.customer?.phone || '-'}</td>
                      <td className="px-6 py-3 text-sm font-medium text-gray-900">{currencySymbol}{order.total?.toLocaleString()}</td>
                      <td className="px-6 py-3">
                        <span className={`px-2.5 py-0.5 text-xs rounded-full font-medium ${PAYMENT_STATUS_COLORS[order.paymentStatus || 'pending']}`}>
                          {PAYMENT_STATUS_LABELS[order.paymentStatus || 'pending']}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500">{toDate(order.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-white/60">
              {recentOrders.map(order => (
                <div key={order.id} className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{order.orderNumber}</span>
                    <span className={`px-2 py-0.5 text-[11px] rounded-full font-medium ${PAYMENT_STATUS_COLORS[order.paymentStatus || 'pending']}`}>
                      {PAYMENT_STATUS_LABELS[order.paymentStatus || 'pending']}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{order.customer?.name || order.customer?.phone || '-'}</span>
                    <span className="font-medium text-gray-900">{currencySymbol}{order.total?.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{toDate(order.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Analytics - Last 30 days */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Analiticas (ultimos 30 dias)</h2>

        {/* Daily Traffic Chart */}
        <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-black/5 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Trafico diario</h3>
          {dailyStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={288}>
              <LineChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tickFormatter={formatDateLabel} tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <Tooltip
                  labelFormatter={(label) => formatDateLabel(String(label))}
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="monotone" dataKey="pageViews" name="Visitas" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="productViews" name="Vistas producto" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} activeDot={{ r: 5 }} />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-gray-400">Sin datos de trafico</div>
          )}
        </div>

        {/* Two-column charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top 5 Viewed Products */}
          <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-black/5 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Top 5 productos vistos</h3>
            {topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={256}>
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis
                    type="category"
                    dataKey="productName"
                    tick={{ fontSize: 12 }}
                    stroke="#9ca3af"
                    width={120}
                    tickFormatter={(v) => v.length > 15 ? v.substring(0, 15) + '...' : v}
                  />
                  <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="views" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-400">Sin datos</div>
            )}
          </div>

          {/* Top 5 Selling Products */}
          <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-black/5 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Top 5 productos vendidos</h3>
            {topSelling.length > 0 ? (
              <ResponsiveContainer width="100%" height={256}>
                <BarChart data={topSelling} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis
                    type="category"
                    dataKey="productName"
                    tick={{ fontSize: 12 }}
                    stroke="#9ca3af"
                    width={120}
                    tickFormatter={(v) => v.length > 15 ? v.substring(0, 15) + '...' : v}
                  />
                  <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="quantitySold" name="Vendidos" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-400">Sin datos</div>
            )}
          </div>

          {/* Device Stats */}
          <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-black/5 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Dispositivos</h3>
            {devicePieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={256}>
                <PieChart>
                  <Pie
                    data={devicePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${Math.round((percent || 0) * 100)}%`}
                  >
                    {devicePieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={DEVICE_COLORS[index % DEVICE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-400">Sin datos</div>
            )}
          </div>

          {/* Traffic Sources */}
          <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-black/5 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Fuentes de trafico</h3>
            {referrerChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={256}>
                <BarChart data={referrerChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="source" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="count" name="Visitas" radius={[4, 4, 0, 0]}>
                    {referrerChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-400">Sin datos</div>
            )}
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-black/5 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Embudo de conversion</h3>
          {funnelData.length > 0 && funnelData[0].value > 0 ? (
            <div className="space-y-3">
              {funnelData.map((step, i) => {
                const maxVal = funnelData[0].value || 1
                const pct = Math.round((step.value / maxVal) * 100)
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">{step.name}</span>
                      <span className="font-medium text-gray-900">{step.value.toLocaleString()} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div
                        className="h-2.5 rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: step.color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">Sin datos de conversion</div>
          )}
        </div>
      </div>

      {/* Store Configuration Summary */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-black/5 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuracion</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ConfigItem
            label="MercadoPago"
            value={store.payments?.mercadopago?.accessToken ? 'Configurado' : 'No configurado'}
            ok={!!store.payments?.mercadopago?.accessToken}
          />
          <ConfigItem
            label="Envio habilitado"
            value={store.shipping?.enabled ? 'Si' : 'No'}
            ok={!!store.shipping?.enabled}
          />
          <ConfigItem
            label="Retiro en tienda"
            value={store.shipping?.pickup?.enabled ? 'Si' : 'No'}
            ok={!!store.shipping?.pickup?.enabled}
          />
          <ConfigItem
            label="Dominio personalizado"
            value={store.customDomain || 'No configurado'}
            ok={!!store.customDomain}
          />
          <ConfigItem
            label="Instagram"
            value={store.instagram || 'No'}
            ok={!!store.instagram}
          />
          <ConfigItem
            label="Facebook"
            value={store.facebook || 'No'}
            ok={!!store.facebook}
          />
          <ConfigItem
            label="TikTok"
            value={store.tiktok || 'No'}
            ok={!!store.tiktok}
          />
          <ConfigItem
            label="Tema"
            value={store.themeId || 'default'}
            ok={true}
          />
          <ConfigItem
            label="Color primario"
            value={store.themeSettings?.primaryColor || '#6366f1'}
            ok={true}
            colorSwatch={store.themeSettings?.primaryColor}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────

function KPICard({ label, value, icon, gradient, sub }: {
  label: string
  value: string | number
  icon: React.ReactNode
  gradient: string
  sub?: string
}) {
  return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-black/5 rounded-2xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{typeof value === 'number' ? value.toLocaleString() : value}</p>
          {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`w-9 h-9 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center shadow-lg`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

function ConfigItem({ label, value, ok, colorSwatch }: {
  label: string
  value: string
  ok: boolean
  colorSwatch?: string
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white/40 rounded-xl">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${ok ? 'bg-green-500' : 'bg-gray-300'}`} />
      <div className="min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <div className="flex items-center gap-2">
          {colorSwatch && (
            <div className="w-4 h-4 rounded border border-black/10" style={{ backgroundColor: colorSwatch }} />
          )}
          <p className="text-sm font-medium text-gray-700 truncate">{value}</p>
        </div>
      </div>
    </div>
  )
}
