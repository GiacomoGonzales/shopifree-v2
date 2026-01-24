import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { analyticsService } from '../../lib/firebase'
import type { AnalyticsSummary, DailyStats, TopProduct, DeviceStats } from '../../types'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'

type DateRange = '7days' | '30days'

// Icons
function EyeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}

function ProductIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  )
}

function CartIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

const DEVICE_COLORS = ['#6366f1', '#22c55e']

export default function Analytics() {
  const { t } = useTranslation('dashboard')
  const { store } = useAuth()
  const [dateRange, setDateRange] = useState<DateRange>('7days')
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [deviceStats, setDeviceStats] = useState<DeviceStats | null>(null)

  const { startDate, endDate } = useMemo(() => {
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - (dateRange === '7days' ? 6 : 29))
    return { startDate: start, endDate: end }
  }, [dateRange])

  useEffect(() => {
    if (!store?.id) return

    const fetchData = async () => {
      setLoading(true)
      try {
        const [summaryData, dailyData, topProductsData, deviceData] = await Promise.all([
          analyticsService.getDateRangeStats(store.id, startDate, endDate),
          analyticsService.getDailyStats(store.id, startDate, endDate),
          analyticsService.getTopProducts(store.id, startDate, 5),
          analyticsService.getDeviceStats(store.id, startDate, endDate)
        ])
        setSummary(summaryData)
        setDailyStats(dailyData)
        setTopProducts(topProductsData)
        setDeviceStats(deviceData)
      } catch (error) {
        console.error('Error fetching analytics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [store?.id, startDate, endDate])

  // Format date for chart labels
  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  // Funnel data for conversion visualization
  const funnelData = useMemo(() => {
    if (!summary) return []
    return [
      { name: t('analytics.summary.totalVisits'), value: summary.pageViews, color: '#3b82f6' },
      { name: t('analytics.summary.productViews'), value: summary.productViews, color: '#10b981' },
      { name: t('analytics.summary.cartAdds'), value: summary.cartAdds, color: '#f59e0b' },
      { name: t('analytics.summary.whatsappClicks'), value: summary.whatsappClicks, color: '#22c55e' }
    ]
  }, [summary, t])

  // Conversion rate
  const conversionRate = useMemo(() => {
    if (!summary || summary.pageViews === 0) return 0
    return ((summary.whatsappClicks / summary.pageViews) * 100).toFixed(1)
  }, [summary])

  // Device data for pie chart
  const devicePieData = useMemo(() => {
    if (!deviceStats) return []
    const total = deviceStats.mobile + deviceStats.desktop
    if (total === 0) return []
    return [
      { name: 'Mobile', value: deviceStats.mobile },
      { name: 'Desktop', value: deviceStats.desktop }
    ]
  }, [deviceStats])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a5f]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('analytics.title')}</h1>
          <p className="text-gray-500 mt-1">{t('analytics.subtitle')}</p>
        </div>

        {/* Date Range Selector */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setDateRange('7days')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              dateRange === '7days'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('analytics.dateRange.7days')}
          </button>
          <button
            onClick={() => setDateRange('30days')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              dateRange === '30days'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('analytics.dateRange.30days')}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={<EyeIcon />}
          label={t('analytics.summary.totalVisits')}
          value={summary?.pageViews || 0}
          color="blue"
        />
        <SummaryCard
          icon={<ProductIcon />}
          label={t('analytics.summary.productViews')}
          value={summary?.productViews || 0}
          color="emerald"
        />
        <SummaryCard
          icon={<CartIcon />}
          label={t('analytics.summary.cartAdds')}
          value={summary?.cartAdds || 0}
          color="amber"
        />
        <SummaryCard
          icon={<WhatsAppIcon />}
          label={t('analytics.summary.whatsappClicks')}
          value={summary?.whatsappClicks || 0}
          color="green"
        />
      </div>

      {/* Daily Visits Chart */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('analytics.charts.dailyVisits')}</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart data={dailyStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDateLabel}
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
              />
              <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <Tooltip
                labelFormatter={(label) => formatDateLabel(String(label))}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              />
              <Line
                type="monotone"
                dataKey="pageViews"
                name={t('analytics.summary.totalVisits')}
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Column Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('analytics.charts.topProducts')}</h3>
          {topProducts.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis
                    type="category"
                    dataKey="productName"
                    tick={{ fontSize: 12 }}
                    stroke="#9ca3af"
                    width={120}
                    tickFormatter={(value) => value.length > 15 ? value.substring(0, 15) + '...' : value}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  <Bar dataKey="views" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              {t('analytics.noData')}
            </div>
          )}
        </div>

        {/* Device Distribution */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('analytics.charts.deviceDistribution')}</h3>
          {devicePieData.length > 0 ? (
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              {t('analytics.noData')}
            </div>
          )}
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('analytics.charts.conversionFunnel')}</h3>
        <div className="space-y-4">
          {funnelData.map((item, index) => {
            const percentage = summary?.pageViews ? (item.value / summary.pageViews) * 100 : 0
            return (
              <div key={item.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{item.name}</span>
                  <span className="font-medium text-gray-900">{item.value}</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(percentage, 2)}%`,
                      backgroundColor: item.color
                    }}
                  />
                </div>
                {index < funnelData.length - 1 && (
                  <div className="flex justify-center my-2">
                    <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                )}
              </div>
            )
          })}
          <div className="pt-4 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">{t('analytics.conversionRate')}</span>
              <span className="text-2xl font-bold text-[#1e3a5f]">{conversionRate}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Summary Card Component
interface SummaryCardProps {
  icon: React.ReactNode
  label: string
  value: number
  color: 'blue' | 'emerald' | 'amber' | 'green'
}

function SummaryCard({ icon, label, value, color }: SummaryCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-green-50 text-green-600'
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6">
      <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <div className="text-2xl sm:text-3xl font-bold text-gray-900">{value.toLocaleString()}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
    </div>
  )
}
