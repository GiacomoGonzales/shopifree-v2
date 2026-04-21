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

// Monochrome palette for charts (ordered by emphasis)
const BW_CHART_COLORS = ['#111827', '#374151', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb', '#f3f4f6']

const REFERRER_LABELS: Record<string, string> = {
  direct: 'Directo',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  facebook: 'Facebook',
  google: 'Google',
  tiktok: 'TikTok',
  other: 'Otro'
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

  const [totalProducts, setTotalProducts] = useState(0)
  const [totalCategories, setTotalCategories] = useState(0)
  const [allOrders, setAllOrders] = useState<Order[]>([])

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
        const storeSnap = await getDoc(doc(db, 'stores', storeId))
        if (!storeSnap.exists()) {
          setLoading(false)
          return
        }
        const storeData = { id: storeSnap.id, ...storeSnap.data() } as Store & { id: string }
        setStore(storeData)

        if (storeData.ownerId) {
          const userSnap = await getDoc(doc(db, 'users', storeData.ownerId))
          if (userSnap.exists()) {
            const userData = userSnap.data()
            setOwner({ email: userData.email, firstName: userData.firstName, lastName: userData.lastName })
          }
        }

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
    referrerStats.map((r, i) => ({
      source: REFERRER_LABELS[r.source] || r.source,
      count: r.count,
      fill: BW_CHART_COLORS[i % BW_CHART_COLORS.length]
    })),
    [referrerStats]
  )

  const funnelData = useMemo(() => {
    if (!summary) return []
    return [
      { name: 'Visitas', value: summary.pageViews },
      { name: 'Vistas producto', value: summary.productViews },
      { name: 'Agregar carrito', value: summary.cartAdds },
      { name: 'WhatsApp', value: summary.whatsappClicks }
    ]
  }, [summary])

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  const tooltipStyle = {
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '12px',
    boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-200 border-t-gray-900" />
      </div>
    )
  }

  if (!store) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4 text-sm">Tienda no encontrada</p>
        <Link to={localePath('/admin/stores')} className="text-gray-900 hover:underline text-sm font-medium">
          Volver a tiendas
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Back navigation */}
      <Link
        to={localePath('/admin/stores')}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 19l-7-7 7-7" />
        </svg>
        Volver a tiendas
      </Link>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {store.logo ? (
            <img src={store.logo} alt={store.name} className="w-14 h-14 rounded-md object-cover flex-shrink-0" />
          ) : (
            <div className="w-14 h-14 bg-gray-100 rounded-md flex items-center justify-center flex-shrink-0">
              <span className="text-xl text-gray-600 font-medium">{store.name.charAt(0)}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-semibold text-gray-900">{store.name}</h1>
              <PlanBadge plan={store.plan} />
              {store.subscription && (
                <StatusBadge status={store.subscription.status}>
                  {store.subscription.status}
                </StatusBadge>
              )}
            </div>
            <a
              href={`https://${store.subdomain}.shopifree.app`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-700 hover:text-gray-900 hover:underline text-sm font-medium"
            >
              {store.subdomain}.shopifree.app
            </a>
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-[12px] text-gray-600">
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Productos" value={totalProducts} />
        <KPICard label="Categorías" value={totalCategories} />
        <KPICard label="Pedidos" value={allOrders.length} />
        <KPICard label="Ingresos" value={`${currencySymbol}${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} />
        <KPICard label="Visitas" value={summary?.pageViews ?? 0} sub="últimos 30 días" />
        <KPICard label="Vistas producto" value={summary?.productViews ?? 0} sub="últimos 30 días" />
        <KPICard label="Agregar carrito" value={summary?.cartAdds ?? 0} sub="últimos 30 días" />
        <KPICard label="WhatsApp clicks" value={summary?.whatsappClicks ?? 0} sub="últimos 30 días" />
      </div>

      {/* Recent Orders */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200">
          <h2 className="text-sm font-medium text-gray-900">Últimos pedidos</h2>
        </div>
        {recentOrders.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500">Sin pedidos</div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-gray-500">Pedido</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-gray-500">Cliente</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-gray-500">Total</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-gray-500">Pago</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-gray-500">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map(order => (
                    <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-[13px] font-medium text-gray-900">{order.orderNumber}</td>
                      <td className="px-4 py-3 text-[13px] text-gray-600">{order.customer?.name || order.customer?.phone || '-'}</td>
                      <td className="px-4 py-3 text-[13px] font-medium text-gray-900 tabular-nums">{currencySymbol}{order.total?.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <PaymentBadge status={order.paymentStatus || 'pending'} />
                      </td>
                      <td className="px-4 py-3 text-[12px] text-gray-500 tabular-nums">{toDate(order.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y divide-gray-100">
              {recentOrders.map(order => (
                <div key={order.id} className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{order.orderNumber}</span>
                    <PaymentBadge status={order.paymentStatus || 'pending'} />
                  </div>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-gray-600">{order.customer?.name || order.customer?.phone || '-'}</span>
                    <span className="font-medium text-gray-900 tabular-nums">{currencySymbol}{order.total?.toLocaleString()}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1 tabular-nums">{toDate(order.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Analytics */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-gray-900">Analíticas (últimos 30 días)</h2>

        {/* Daily Traffic Chart */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="text-[12px] font-medium text-gray-700 mb-4 uppercase tracking-wide">Tráfico diario</h3>
          {dailyStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={288}>
              <LineChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tickFormatter={formatDateLabel} tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <Tooltip
                  labelFormatter={(label) => formatDateLabel(String(label))}
                  contentStyle={tooltipStyle}
                />
                <Line type="monotone" dataKey="pageViews" name="Visitas" stroke="#111827" strokeWidth={1.6} dot={{ fill: '#111827', r: 2 }} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="productViews" name="Vistas producto" stroke="#9ca3af" strokeWidth={1.6} strokeDasharray="4 2" dot={{ fill: '#9ca3af', r: 2 }} activeDot={{ r: 4 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-sm text-gray-500">Sin datos de tráfico</div>
          )}
        </div>

        {/* Two-column charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h3 className="text-[12px] font-medium text-gray-700 mb-4 uppercase tracking-wide">Top 5 productos vistos</h3>
            {topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={256}>
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <YAxis
                    type="category"
                    dataKey="productName"
                    tick={{ fontSize: 11 }}
                    stroke="#9ca3af"
                    width={120}
                    tickFormatter={(v) => v.length > 15 ? v.substring(0, 15) + '...' : v}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="views" fill="#111827" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-sm text-gray-500">Sin datos</div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h3 className="text-[12px] font-medium text-gray-700 mb-4 uppercase tracking-wide">Top 5 productos vendidos</h3>
            {topSelling.length > 0 ? (
              <ResponsiveContainer width="100%" height={256}>
                <BarChart data={topSelling} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <YAxis
                    type="category"
                    dataKey="productName"
                    tick={{ fontSize: 11 }}
                    stroke="#9ca3af"
                    width={120}
                    tickFormatter={(v) => v.length > 15 ? v.substring(0, 15) + '...' : v}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="quantitySold" name="Vendidos" fill="#374151" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-sm text-gray-500">Sin datos</div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h3 className="text-[12px] font-medium text-gray-700 mb-4 uppercase tracking-wide">Dispositivos</h3>
            {devicePieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={256}>
                <PieChart>
                  <Pie
                    data={devicePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${Math.round((percent || 0) * 100)}%`}
                  >
                    {devicePieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={BW_CHART_COLORS[index % BW_CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-sm text-gray-500">Sin datos</div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h3 className="text-[12px] font-medium text-gray-700 mb-4 uppercase tracking-wide">Fuentes de tráfico</h3>
            {referrerChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={256}>
                <BarChart data={referrerChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="source" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" name="Visitas" radius={[2, 2, 0, 0]}>
                    {referrerChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-sm text-gray-500">Sin datos</div>
            )}
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="text-[12px] font-medium text-gray-700 mb-4 uppercase tracking-wide">Embudo de conversión</h3>
          {funnelData.length > 0 && funnelData[0].value > 0 ? (
            <div className="space-y-3">
              {funnelData.map((step, i) => {
                const maxVal = funnelData[0].value || 1
                const pct = Math.round((step.value / maxVal) * 100)
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between text-[13px] mb-1">
                      <span className="text-gray-600">{step.name}</span>
                      <span className="font-medium text-gray-900 tabular-nums">{step.value.toLocaleString()} <span className="text-gray-400">({pct}%)</span></span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-gray-900 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-gray-500">Sin datos de conversión</div>
          )}
        </div>
      </div>

      {/* Store Configuration Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-sm font-medium text-gray-900 mb-4">Configuración</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <ConfigItem
            label="MercadoPago"
            value={store.payments?.mercadopago?.accessToken ? 'Configurado' : 'No configurado'}
            ok={!!store.payments?.mercadopago?.accessToken}
          />
          <ConfigItem
            label="Envío habilitado"
            value={store.shipping?.enabled ? 'Sí' : 'No'}
            ok={!!store.shipping?.enabled}
          />
          <ConfigItem
            label="Retiro en tienda"
            value={store.shipping?.pickupEnabled ? 'Sí' : 'No'}
            ok={!!store.shipping?.pickupEnabled}
          />
          <ConfigItem
            label="Dominio personalizado"
            value={store.customDomain || 'No configurado'}
            ok={!!store.customDomain}
          />
          <ConfigItem label="Instagram" value={store.instagram || 'No'} ok={!!store.instagram} />
          <ConfigItem label="Facebook" value={store.facebook || 'No'} ok={!!store.facebook} />
          <ConfigItem label="TikTok" value={store.tiktok || 'No'} ok={!!store.tiktok} />
          <ConfigItem label="Tema" value={store.themeId || 'default'} ok={true} />
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

function KPICard({ label, value, sub }: {
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-xl font-semibold text-gray-900 mt-1 tabular-nums">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      {sub && <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>}
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
    <div className="flex items-center gap-2.5 p-3 border border-gray-200 rounded-md">
      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ok ? 'bg-gray-900' : 'bg-gray-300'}`} />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-gray-500 uppercase tracking-wide">{label}</p>
        <div className="flex items-center gap-1.5">
          {colorSwatch && (
            <div className="w-3 h-3 rounded-sm border border-gray-200" style={{ backgroundColor: colorSwatch }} />
          )}
          <p className="text-[13px] font-medium text-gray-900 truncate">{value}</p>
        </div>
      </div>
    </div>
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
      className={`px-2 py-0.5 text-[10px] rounded-sm font-medium uppercase tracking-wide border ${
        urgent ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-700'
      }`}
    >
      {children}
    </span>
  )
}

function PaymentBadge({ status }: { status: string }) {
  const paid = status === 'paid'
  return (
    <span
      className={`px-2 py-0.5 text-[10px] rounded-sm font-medium uppercase tracking-wide ${
        paid ? 'bg-gray-900 text-white' : 'border border-gray-200 text-gray-700'
      }`}
    >
      {PAYMENT_STATUS_LABELS[status] || status}
    </span>
  )
}
