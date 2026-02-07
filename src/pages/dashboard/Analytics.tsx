import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import { analyticsService } from '../../lib/firebase'
import { getCurrencySymbol } from '../../lib/currency'
import type { AnalyticsSummary, DailyStats, TopProduct, DeviceStats, ReferrerStats, RevenueMetrics, Order, TrendComparison, DailyRevenue, TopSellingProduct } from '../../types'
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

type DateRange = 'today' | 'yesterday' | '7days' | '30days' | 'thisMonth' | 'lastMonth' | '90days' | 'custom'

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

// ─── Helpers ──────────────────────────────────────────────

function computeTrend(current: number, previous: number): TrendComparison {
  if (previous === 0 && current === 0) return { current, previous, percentChange: 0, direction: 'flat' }
  if (previous === 0) return { current, previous, percentChange: 100, direction: 'up' }
  const percentChange = Math.round(((current - previous) / previous) * 100)
  const direction = percentChange > 0 ? 'up' : percentChange < 0 ? 'down' : 'flat'
  return { current, previous, percentChange: Math.abs(percentChange), direction }
}

function computeDateRange(range: DateRange, customFrom: string, customTo: string) {
  const now = new Date()
  const endDate = new Date()
  endDate.setHours(23, 59, 59, 999)
  const startDate = new Date()
  startDate.setHours(0, 0, 0, 0)

  switch (range) {
    case 'today':
      break
    case 'yesterday':
      startDate.setDate(startDate.getDate() - 1)
      endDate.setDate(endDate.getDate() - 1)
      endDate.setHours(23, 59, 59, 999)
      break
    case '7days':
      startDate.setDate(startDate.getDate() - 6)
      break
    case '30days':
      startDate.setDate(startDate.getDate() - 29)
      break
    case 'thisMonth':
      startDate.setDate(1)
      break
    case 'lastMonth': {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      startDate.setTime(lastMonth.getTime())
      startDate.setHours(0, 0, 0, 0)
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
      endDate.setTime(lastDayLastMonth.getTime())
      endDate.setHours(23, 59, 59, 999)
      break
    }
    case '90days':
      startDate.setDate(startDate.getDate() - 89)
      break
    case 'custom': {
      if (customFrom) {
        const [y, m, d] = customFrom.split('-').map(Number)
        startDate.setFullYear(y, m - 1, d)
        startDate.setHours(0, 0, 0, 0)
      }
      if (customTo) {
        const [y, m, d] = customTo.split('-').map(Number)
        endDate.setFullYear(y, m - 1, d)
        endDate.setHours(23, 59, 59, 999)
      }
      break
    }
  }

  // Previous period: same duration, immediately before
  const durationMs = endDate.getTime() - startDate.getTime()
  const prevEndDate = new Date(startDate.getTime() - 1)
  prevEndDate.setHours(23, 59, 59, 999)
  const prevStartDate = new Date(prevEndDate.getTime() - durationMs)
  prevStartDate.setHours(0, 0, 0, 0)

  return { startDate, endDate, prevStartDate, prevEndDate }
}

function deriveDailyRevenue(orders: Order[], startDate: Date, endDate: Date): DailyRevenue[] {
  const map: Record<string, DailyRevenue> = {}
  orders.forEach(order => {
    const d = order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt)
    const key = d.toISOString().split('T')[0]
    if (!map[key]) map[key] = { date: key, revenue: 0, orders: 0 }
    map[key].revenue += order.total || 0
    map[key].orders++
  })

  const result: DailyRevenue[] = []
  const current = new Date(startDate)
  while (current <= endDate) {
    const key = current.toISOString().split('T')[0]
    result.push(map[key] || { date: key, revenue: 0, orders: 0 })
    current.setDate(current.getDate() + 1)
  }
  return result
}

function deriveTopSelling(orders: Order[]): TopSellingProduct[] {
  const map: Record<string, TopSellingProduct> = {}
  orders.forEach(order => {
    order.items?.forEach(item => {
      if (!map[item.productId]) {
        map[item.productId] = { productId: item.productId, productName: item.productName, quantitySold: 0, revenue: 0 }
      }
      map[item.productId].quantitySold += item.quantity
      map[item.productId].revenue += item.itemTotal || item.price * item.quantity
    })
  })
  return Object.values(map).sort((a, b) => b.quantitySold - a.quantitySold).slice(0, 5)
}

// ─── Main Component ──────────────────────────────────────

export default function Analytics() {
  const { t } = useTranslation('dashboard')
  const { store } = useAuth()
  const { localePath } = useLanguage()
  const currencySymbol = getCurrencySymbol(store?.currency || 'USD')

  const [dateRange, setDateRange] = useState<DateRange>('30days')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [chartTab, setChartTab] = useState<'visits' | 'revenue'>('visits')

  // Data states
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [deviceStats, setDeviceStats] = useState<DeviceStats | null>(null)
  const [referrerStats, setReferrerStats] = useState<ReferrerStats[]>([])
  const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetrics>({ totalRevenue: 0, totalOrders: 0, averageOrderValue: 0 })
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([])
  const [topSelling, setTopSelling] = useState<TopSellingProduct[]>([])

  // Trend states
  const [prevSummary, setPrevSummary] = useState<AnalyticsSummary | null>(null)
  const [prevRevenueMetrics, setPrevRevenueMetrics] = useState<RevenueMetrics>({ totalRevenue: 0, totalOrders: 0, averageOrderValue: 0 })

  const dates = useMemo(() => computeDateRange(dateRange, customFrom, customTo), [dateRange, customFrom, customTo])

  useEffect(() => {
    if (!store?.id) return

    const fetchData = async () => {
      const isInitial = !summary
      if (isInitial) setLoading(true)
      else setRefreshing(true)

      try {
        const [fullAnalytics, prevStats, currentOrders, prevRevenue] = await Promise.all([
          analyticsService.getFullAnalytics(store.id, dates.startDate, dates.endDate),
          analyticsService.getDateRangeStats(store.id, dates.prevStartDate, dates.prevEndDate),
          analyticsService.getOrdersByDateRange(store.id, dates.startDate, dates.endDate),
          analyticsService.getRevenueMetrics(store.id, dates.prevStartDate, dates.prevEndDate)
        ])

        setSummary(fullAnalytics.summary)
        setDailyStats(fullAnalytics.dailyStats)
        setTopProducts(fullAnalytics.topProducts)
        setDeviceStats(fullAnalytics.deviceStats)
        setReferrerStats(fullAnalytics.referrerStats)
        setPrevSummary(prevStats)

        const revenue = {
          totalRevenue: currentOrders.reduce((sum, o) => sum + (o.total || 0), 0),
          totalOrders: currentOrders.length,
          averageOrderValue: currentOrders.length > 0 ? currentOrders.reduce((sum, o) => sum + (o.total || 0), 0) / currentOrders.length : 0
        }
        setRevenueMetrics(revenue)
        setDailyRevenue(deriveDailyRevenue(currentOrders, dates.startDate, dates.endDate))
        setTopSelling(deriveTopSelling(currentOrders))
        setPrevRevenueMetrics(prevRevenue)
      } catch (error) {
        console.error('Error fetching analytics:', error)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    }

    fetchData()
  }, [store?.id, dates])

  // Format date for chart labels
  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  // Funnel data
  const funnelData = useMemo(() => {
    if (!summary) return []
    return [
      { name: t('analytics.summary.totalVisits'), value: summary.pageViews, color: '#3b82f6' },
      { name: t('analytics.summary.productViews'), value: summary.productViews, color: '#10b981' },
      { name: t('analytics.summary.cartAdds'), value: summary.cartAdds, color: '#f59e0b' },
      { name: t('analytics.summary.whatsappClicks'), value: summary.whatsappClicks, color: '#22c55e' }
    ]
  }, [summary, t])

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

  // Trends
  const visitsTrend = useMemo(() => computeTrend(summary?.pageViews || 0, prevSummary?.pageViews || 0), [summary, prevSummary])
  const productViewsTrend = useMemo(() => computeTrend(summary?.productViews || 0, prevSummary?.productViews || 0), [summary, prevSummary])
  const cartAddsTrend = useMemo(() => computeTrend(summary?.cartAdds || 0, prevSummary?.cartAdds || 0), [summary, prevSummary])
  const whatsappTrend = useMemo(() => computeTrend(summary?.whatsappClicks || 0, prevSummary?.whatsappClicks || 0), [summary, prevSummary])
  const revenueTrend = useMemo(() => computeTrend(revenueMetrics.totalRevenue, prevRevenueMetrics.totalRevenue), [revenueMetrics, prevRevenueMetrics])
  const ordersTrend = useMemo(() => computeTrend(revenueMetrics.totalOrders, prevRevenueMetrics.totalOrders), [revenueMetrics, prevRevenueMetrics])
  const aovTrend = useMemo(() => computeTrend(revenueMetrics.averageOrderValue, prevRevenueMetrics.averageOrderValue), [revenueMetrics, prevRevenueMetrics])

  // Merged daily data for dual-axis chart
  const mergedDailyData = useMemo(() => {
    return dailyStats.map((stat, i) => ({
      date: stat.date,
      pageViews: stat.pageViews,
      revenue: dailyRevenue[i]?.revenue || 0,
      orders: dailyRevenue[i]?.orders || 0
    }))
  }, [dailyStats, dailyRevenue])

  // Referrer chart data
  const referrerChartData = useMemo(() => {
    return referrerStats.map(r => ({
      source: t(`analytics.referrers.${r.source}` as const) || r.source,
      count: r.count,
      fill: REFERRER_COLORS[r.source] || '#9ca3af'
    }))
  }, [referrerStats, t])

  // Check plan
  if (store?.plan === 'free' || !store?.plan) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="max-w-md text-center p-8">
          <div className="w-20 h-20 bg-gradient-to-br from-[#38bdf8] to-[#2d6cb5] rounded-2xl mx-auto mb-6 flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[#1e3a5f] mb-3">{t('analytics.upgrade.title')}</h2>
          <p className="text-gray-600 mb-6">{t('analytics.upgrade.description')}</p>
          {!Capacitor.isNativePlatform() && (
            <Link
              to={localePath('/dashboard/plan')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white rounded-xl font-semibold hover:from-[#2d6cb5] hover:to-[#38bdf8] transition-all shadow-lg shadow-[#1e3a5f]/20"
            >
              {t('analytics.upgrade.button')}
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a5f]"></div>
      </div>
    )
  }

  const dateRangeOptions: { value: DateRange; label: string }[] = [
    { value: 'today', label: t('analytics.dateRange.today') },
    { value: 'yesterday', label: t('analytics.dateRange.yesterday') },
    { value: '7days', label: t('analytics.dateRange.7days') },
    { value: '30days', label: t('analytics.dateRange.30days') },
    { value: 'thisMonth', label: t('analytics.dateRange.thisMonth') },
    { value: 'lastMonth', label: t('analytics.dateRange.lastMonth') },
    { value: '90days', label: t('analytics.dateRange.90days') },
    { value: 'custom', label: t('analytics.dateRange.custom') }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('analytics.title')}</h1>
          <p className="text-gray-500 mt-1">{t('analytics.subtitle')}</p>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center gap-3">
          {refreshing && (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-600"></div>
          )}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRange)}
            disabled={refreshing}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {dateRangeOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Custom date inputs */}
      {dateRange === 'custom' && (
        <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl border border-gray-100 p-4">
          <label className="text-sm text-gray-600">{t('analytics.dateRange.from')}</label>
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            max={customTo || undefined}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <label className="text-sm text-gray-600">{t('analytics.dateRange.to')}</label>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            min={customFrom || undefined}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      <div className={`space-y-6 transition-opacity duration-200 ${refreshing ? 'opacity-50 pointer-events-none' : ''}`}>

      {/* Traffic Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label={t('analytics.summary.totalVisits')}
          value={summary?.pageViews || 0}
          color="blue"
          trend={visitsTrend}
        />
        <SummaryCard
          label={t('analytics.summary.productViews')}
          value={summary?.productViews || 0}
          color="emerald"
          trend={productViewsTrend}
        />
        <SummaryCard
          label={t('analytics.summary.cartAdds')}
          value={summary?.cartAdds || 0}
          color="amber"
          trend={cartAddsTrend}
        />
        <SummaryCard
          label={t('analytics.summary.whatsappClicks')}
          value={summary?.whatsappClicks || 0}
          color="green"
          trend={whatsappTrend}
        />
      </div>

      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <SummaryCard
          label={t('analytics.summary.totalRevenue')}
          value={revenueMetrics.totalRevenue}
          color="violet"
          trend={revenueTrend}
          prefix={currencySymbol}
          formatValue={(v) => v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        />
        <SummaryCard
          label={t('analytics.summary.totalOrders')}
          value={revenueMetrics.totalOrders}
          color="indigo"
          trend={ordersTrend}
        />
        <SummaryCard
          label={t('analytics.summary.avgOrderValue')}
          value={revenueMetrics.averageOrderValue}
          color="rose"
          trend={aovTrend}
          prefix={currencySymbol}
          formatValue={(v) => v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        />
      </div>

      {/* Daily Chart with Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {chartTab === 'visits' ? t('analytics.charts.dailyVisits') : t('analytics.charts.dailyRevenue')}
          </h3>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setChartTab('visits')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                chartTab === 'visits' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('analytics.charts.visits')}
            </button>
            <button
              onClick={() => setChartTab('revenue')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                chartTab === 'revenue' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('analytics.charts.revenue')}
            </button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={288}>
          <LineChart data={mergedDailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tickFormatter={formatDateLabel} tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <Tooltip
              labelFormatter={(label) => formatDateLabel(String(label))}
              formatter={((value: number) => chartTab === 'revenue' ? `${currencySymbol}${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : value) as never}
              contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            {chartTab === 'visits' ? (
              <Line type="monotone" dataKey="pageViews" name={t('analytics.summary.totalVisits')} stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} activeDot={{ r: 6 }} />
            ) : (
              <Line type="monotone" dataKey="revenue" name={t('analytics.charts.revenue')} stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 4 }} activeDot={{ r: 6 }} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Two Column: Top Viewed & Top Selling */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Viewed Products */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('analytics.charts.topProducts')}</h3>
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
                  tickFormatter={(value) => value.length > 15 ? value.substring(0, 15) + '...' : value}
                />
                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="views" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">{t('analytics.noData')}</div>
          )}
        </div>

        {/* Top Selling Products */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('analytics.charts.topSelling')}</h3>
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
                  tickFormatter={(value) => value.length > 15 ? value.substring(0, 15) + '...' : value}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={((value: number, name: string) => {
                    if (name === 'revenue') return `${currencySymbol}${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                    return value
                  }) as never}
                />
                <Bar dataKey="quantitySold" name={t('analytics.topSelling.quantitySold')} fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">{t('analytics.noData')}</div>
          )}
        </div>
      </div>

      {/* Two Column: Traffic Sources & Devices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Sources */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('analytics.charts.trafficSources')}</h3>
          {referrerChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={256}>
              <BarChart data={referrerChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis type="category" dataKey="source" tick={{ fontSize: 12 }} stroke="#9ca3af" width={100} />
                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {referrerChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">{t('analytics.noData')}</div>
          )}
        </div>

        {/* Device Distribution */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('analytics.charts.deviceDistribution')}</h3>
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
            <div className="h-64 flex items-center justify-center text-gray-400">{t('analytics.noData')}</div>
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
                    style={{ width: `${Math.max(percentage, 2)}%`, backgroundColor: item.color }}
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
    </div>
  )
}

// ─── Summary Card Component ──────────────────────────────

interface SummaryCardProps {
  label: string
  value: number
  color: 'blue' | 'emerald' | 'amber' | 'green' | 'violet' | 'indigo' | 'rose'
  trend?: TrendComparison
  prefix?: string
  formatValue?: (v: number) => string
}

function SummaryCard({ label, value, color, trend, prefix, formatValue }: SummaryCardProps) {
  const accentColors: Record<string, string> = {
    blue: 'text-blue-600',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    green: 'text-green-600',
    violet: 'text-violet-600',
    indigo: 'text-indigo-600',
    rose: 'text-rose-600'
  }

  const displayValue = formatValue ? formatValue(value) : value.toLocaleString()

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-5">
      <div className="text-xs sm:text-sm text-gray-500 truncate">{label}</div>
      <div className={`text-lg sm:text-2xl font-semibold mt-1 truncate ${accentColors[color]}`}>
        {prefix && <span className="text-sm sm:text-lg">{prefix}</span>}
        {displayValue}
      </div>
      {trend && trend.direction !== 'flat' && (
        <div className={`inline-flex items-center gap-1 mt-1.5 text-xs font-medium ${
          trend.direction === 'up' ? 'text-green-600' : 'text-red-500'
        }`}>
          <span>{trend.direction === 'up' ? '↑' : '↓'}</span>
          <span>{trend.percentChange}%</span>
        </div>
      )}
    </div>
  )
}
