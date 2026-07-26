/**
 * Inicio del dashboard
 * ==========================================================================
 * Rediseño alineado con la landing (jul 2026): bordes de 1px en #E6EBF1,
 * radios de 14px, sombras teñidas de navy y jerarquía tipográfica —
 * semibold para títulos, medium para el cuerpo. Nada en peso 800: la fuente
 * cae a Segoe UI en Windows y en extrabold se ve tosca.
 *
 * Sin iconos SVG a propósito. La información se distingue por tamaño, peso y
 * color; donde hace falta señalar estado alcanza un punto de color o el texto
 * de la acción, que además se lee sin adivinar qué significa el dibujo.
 *
 * Lo que cambió respecto de la versión anterior:
 *   · 4 KPIs con comparación contra el periodo anterior, en vez de 3 contadores
 *     sueltos (productos / visitas / clicks) que no decían si el negocio subía.
 *   · Dos reportes: barras por día (visitas, pedidos o ingresos) y dona de
 *     fuentes de tráfico. Ambos en CSS a mano — recharts pesa 382 KB y solo se
 *     justifica en la página de Estadísticas.
 *   · Pedidos recientes con estado, que antes solo existían en /dashboard/orders.
 *   · Fuera los bloques promocionales que competían con los datos: temas
 *     recomendados, buzón de sugerencias y la grilla de planes. El aviso de
 *     prueba/prueba vencida quedó unificado en uno solo.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import { productService, analyticsService, categoryService, orderService } from '../../lib/firebase'
import { getCurrencySymbol } from '../../lib/currency'
import { PLAN_FEATURES, type PlanType } from '../../lib/stripe'
import type { Product, Category, Order } from '../../types'

/* ── Periodos y métricas ─────────────────────────────────────────────── */

type Period = 'today' | 'd7' | 'd30'
type Metric = 'visits' | 'orders' | 'revenue'

const PERIODS: Period[] = ['today', 'd7', 'd30']
const PERIOD_DAYS: Record<Period, number> = { today: 1, d7: 7, d30: 30 }
const METRICS: Metric[] = ['visits', 'orders', 'revenue']

/** Un punto de la serie diaria que alimenta el gráfico de barras. */
interface DayPoint {
  date: string
  visits: number
  orders: number
  revenue: number
}

interface Metrics {
  visits: number
  prevVisits: number
  orders: number
  prevOrders: number
  revenue: number
  prevRevenue: number
  pending: number
  series: DayPoint[]
  /** true cuando la serie abarca más días que el periodo elegido (caso "Hoy"). */
  seriesIsWeek: boolean
  sources: { source: string; count: number }[]
}

/* ── Utilidades ──────────────────────────────────────────────────────── */

const DAY_MS = 86_400_000

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/**
 * Clave YYYY-MM-DD en UTC. Tiene que coincidir con la que arma
 * analyticsService.getFullAnalytics, o los pedidos no se cruzan con las visitas.
 */
function dayKey(d: Date) {
  return d.toISOString().slice(0, 10)
}

/**
 * Los carritos abandonados son pedidos que nunca se pagaron en la pasarela.
 * Mismo criterio que /dashboard/orders: si se cuentan, los KPIs mienten.
 */
function isAbandoned(o: Pick<Order, 'paymentMethod' | 'paymentStatus' | 'status'>) {
  return (
    (o.paymentMethod === 'mercadopago' || o.paymentMethod === 'stripe') &&
    o.paymentStatus !== 'paid' &&
    o.paymentStatus !== 'failed' &&
    o.status === 'pending'
  )
}

/**
 * Techo "redondo" para el eje Y. La escalera es fina a propósito: con solo
 * 1/2/5/10 un máximo de 1420 saltaba a 2000 y de 6 pedidos a 10, dejando la
 * barra más alta a dos tercios del gráfico.
 */
const NICE_STEPS = [1, 1.5, 2, 3, 4, 5, 6, 8, 10]

function niceCeil(v: number) {
  if (v <= 0) return 0
  const mag = Math.pow(10, Math.floor(Math.log10(v)))
  // Con magnitudes chicas solo escalones enteros: para una tienda con 1 visita,
  // un eje que dice "1,5" no significa nada.
  const steps = mag >= 10 ? NICE_STEPS : NICE_STEPS.filter(Number.isInteger)
  const n = v / mag
  const i = steps.findIndex(s => n <= s)
  // Si el máximo cae justo en un escalón, subimos al siguiente. Una barra que
  // llega al borde del gráfico parece cortada — y con un solo día con datos
  // parecía un bloque sólido de lado a lado.
  const step = steps[steps[i] === n ? Math.min(i + 1, steps.length - 1) : i] ?? 10
  return step * mag
}

function compact(n: number) {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`
  return String(Math.round(n))
}

/** Variación porcentual; null cuando no hay nada que comparar. */
function deltaOf(current: number, previous: number) {
  if (previous === 0) return current > 0 ? { pct: 100, up: true } : null
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct === 0) return null
  return { pct: Math.abs(pct), up: pct > 0 }
}

const SOURCE_COLORS: Record<string, string> = {
  whatsapp: '#16A34A',
  instagram: '#EC4899',
  facebook: '#1877F2',
  google: '#F59E0B',
  tiktok: '#334155',
  direct: '#38bdf8',
  other: '#A9B6C6',
}

const STATUS_STYLE: Record<Order['status'], { bg: string; tx: string }> = {
  pending: { bg: '#FEF3C7', tx: '#B45309' },
  confirmed: { bg: '#DBEAFE', tx: '#1D4ED8' },
  preparing: { bg: '#FFEDD5', tx: '#C2410C' },
  ready: { bg: '#EDE9FE', tx: '#6D28D9' },
  delivered: { bg: '#DCFCE7', tx: '#16A34A' },
  cancelled: { bg: '#FEE2E2', tx: '#B91C1C' },
}

/* ── Piezas de UI ────────────────────────────────────────────────────── */

/**
 * KPI sin icono: un punto del color de la métrica, el rótulo en versalitas y
 * el número grande. El signo del porcentaje ya dice si subió o bajó, así que
 * tampoco hace falta una flecha.
 */
function KpiCard({
  label,
  value,
  dot,
  delta,
  deltaLabel,
}: {
  label: string
  value: string
  dot: string
  delta: { pct: number; up: boolean } | null
  deltaLabel: string
}) {
  return (
    <div className="bg-white rounded-[14px] border border-[#E6EBF1] p-3.5 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dot }} />
          <span className="text-[0.66rem] font-semibold uppercase tracking-[0.07em] text-[#8898AA] truncate">
            {label}
          </span>
        </span>
        {delta ? (
          <span
            className="text-[0.7rem] font-semibold shrink-0"
            style={{ color: delta.up ? '#16A34A' : '#DC2626' }}
          >
            {delta.up ? '+' : '−'}
            {delta.pct}%
          </span>
        ) : (
          <span className="text-[0.66rem] font-medium text-[#A9B6C6] shrink-0 truncate">{deltaLabel}</span>
        )}
      </div>
      <p className="text-[1.6rem] sm:text-[1.75rem] font-semibold mt-2.5 leading-none tracking-tight text-[#1e3a5f]">
        {value}
      </p>
    </div>
  )
}

/**
 * Barras por día. Hecho a mano a propósito: una librería de gráficos para siete
 * rectángulos multiplicaría por diez el peso de esta pantalla.
 */
function BarsChart({
  series,
  metric,
  format,
  dayInitials,
  emptyLabel,
}: {
  series: DayPoint[]
  metric: Metric
  format: (n: number) => string
  dayInitials: string[]
  emptyLabel: string
}) {
  const values = series.map(d => d[metric])
  const max = Math.max(...values, 0)
  const hasData = max > 0
  const top = niceCeil(max) || 1
  const peak = values.lastIndexOf(max)
  // Con 30 barras no caben 30 etiquetas debajo; se muestra una de cada N.
  const labelEvery = series.length > 10 ? Math.ceil(series.length / 8) : 1
  // Sin datos no hay escala que mostrar, y la marca del medio solo si cae
  // exacta: con techo 5 diría "3" en la línea del 2,5.
  const axis = !hasData ? ['', '', ''] : [format(top), Number.isInteger(top / 2) ? format(top / 2) : '', '0']

  return (
    <div className="flex gap-2.5 pt-6">
      <div
        className="flex flex-col justify-between text-right shrink-0 text-[0.6rem] font-medium text-[#A9B6C6]"
        style={{ width: 34, height: '9rem' }}
      >
        {axis.map((label, i) => (
          <span key={i}>{label}</span>
        ))}
      </div>
      <div className="flex-1 min-w-0">
        <div className="relative" style={{ height: '9rem' }}>
          {[50, 100].map(p => (
            <div key={p} className="absolute left-0 right-0" style={{ bottom: `${p}%`, borderTop: '1px dashed #E6EBF1' }} />
          ))}
          <div className="absolute left-0 right-0 bottom-0" style={{ borderTop: '1px solid #E6EBF1' }} />
          {!hasData && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-medium text-[#A9B6C6]">{emptyLabel}</span>
            </div>
          )}
          <div className="relative flex items-end gap-[3px] sm:gap-1.5" style={{ height: '100%' }}>
            {series.map((d, i) => {
              const pct = hasData ? (d[metric] / top) * 100 : 0
              const isPeak = hasData && i === peak
              return (
                <div key={d.date} className="group relative flex-1 min-w-0 h-full flex items-end">
                  <div
                    className="w-full rounded-t-[5px] transition-all"
                    style={{
                      height: `${Math.max(pct, d[metric] > 0 ? 3 : 0)}%`,
                      background: isPeak
                        ? 'linear-gradient(180deg,#38bdf8,#0284C7)'
                        : 'linear-gradient(180deg,#CDE9FB,#7FCDF3)',
                    }}
                  />
                  {/* El valor exacto solo al pasar el cursor: 30 números fijos serían ruido. */}
                  <span
                    className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[0.6rem] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100"
                    style={{ bottom: `calc(${Math.max(pct, 0)}% + 6px)`, background: '#1e3a5f' }}
                  >
                    {format(d[metric])}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
        <div className="flex gap-[3px] sm:gap-1.5 mt-1.5">
          {series.map((d, i) => {
            const date = new Date(`${d.date}T00:00:00Z`)
            const label = series.length > 10 ? String(date.getUTCDate()) : dayInitials[date.getUTCDay()] || ''
            return (
              <span key={d.date} className="flex-1 min-w-0 text-center text-[0.6rem] font-medium text-[#8898AA]">
                {i % labelEvery === 0 ? label : ''}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** Tramos del conic-gradient: cada fuente ocupa su porcentaje del total. */
function conicStops(sources: { source: string; count: number }[], total: number) {
  const stops: string[] = []
  let acc = 0
  for (const s of sources) {
    const from = (acc / total) * 100
    acc += s.count
    stops.push(`${SOURCE_COLORS[s.source] || SOURCE_COLORS.other} ${from}% ${(acc / total) * 100}%`)
  }
  return stops.join(', ')
}

/** Dona de fuentes de tráfico con conic-gradient — sin SVG y sin dependencias. */
function SourcesDonut({
  sources,
  total,
  labelOf,
}: {
  sources: { source: string; count: number }[]
  total: number
  labelOf: (source: string) => string
}) {
  const stops = conicStops(sources, total)

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0" style={{ width: 88, height: 88 }}>
        <div style={{ width: 88, height: 88, borderRadius: '50%', background: `conic-gradient(${stops})` }} />
        <div
          className="absolute flex items-center justify-center"
          style={{ inset: 15, borderRadius: '50%', background: '#fff' }}
        >
          <span className="text-[0.95rem] font-semibold text-[#1e3a5f]">{compact(total)}</span>
        </div>
      </div>
      <div className="space-y-1.5 min-w-0">
        {sources.map(s => (
          <p key={s.source} className="flex items-center gap-2 text-[0.74rem] font-medium text-[#425466]">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: SOURCE_COLORS[s.source] || SOURCE_COLORS.other }}
            />
            <span className="truncate">{labelOf(s.source)}</span>
            <span className="text-[#8898AA]">{Math.round((s.count / total) * 100)}%</span>
          </p>
        ))}
      </div>
    </div>
  )
}

/* ── Página ──────────────────────────────────────────────────────────── */

export default function DashboardHome() {
  const { t } = useTranslation('dashboard')
  const { localePath } = useLanguage()
  const { store } = useAuth()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const [period, setPeriod] = useState<Period>('d7')
  const [metric, setMetric] = useState<Metric>('visits')
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(true)

  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [onboardingDismissed, setOnboardingDismissed] = useState(false)
  const [linkShared, setLinkShared] = useState(false)

  useEffect(() => {
    if (!store) return
    setOnboardingDismissed(!!store.onboardingDismissed)
    setLinkShared(localStorage.getItem(`linkShared_${store.id}`) === 'true')
  }, [store])

  /* Catálogo, categorías y últimos pedidos: no dependen del periodo. */
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!store) return
      try {
        const [productsData, categoriesData, ordersData] = await Promise.all([
          productService.getAll(store.id),
          categoryService.getAll(store.id),
          orderService.getAll(store.id, 15),
        ])
        if (cancelled) return
        setProducts(productsData)
        setCategories(categoriesData)
        // Fuera carritos abandonados y cancelados: los KPIs tampoco los cuentan
        // (getOrdersByDateRange filtra los cancelados), y ver "Pedidos: 0"
        // encima de una lista con cinco pedidos hace desconfiar del tablero.
        // Los cancelados siguen visibles en /dashboard/orders, que tiene filtro.
        setRecentOrders(ordersData.filter(o => !isAbandoned(o) && o.status !== 'cancelled').slice(0, 5))
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [store])

  /* Métricas del periodo + el periodo anterior, para poder comparar. */
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!store) return
      setMetricsLoading(true)
      try {
        const days = PERIOD_DAYS[period]
        const end = new Date()
        const start = startOfDay(new Date(end.getTime() - (days - 1) * DAY_MS))
        const prevEnd = new Date(start.getTime() - 1)
        const prevStart = startOfDay(new Date(prevEnd.getTime() - (days - 1) * DAY_MS))

        // Con "Hoy" el gráfico tendría una sola barra, así que la serie siempre
        // abarca al menos una semana.
        const chartDays = Math.max(days, 7)
        const chartStart = startOfDay(new Date(end.getTime() - (chartDays - 1) * DAY_MS))
        const needsChartFetch = chartDays !== days

        const [cur, prev, curOrders, prevOrders, chartAnalytics, chartOrders] = await Promise.all([
          analyticsService.getFullAnalytics(store.id, start, end),
          analyticsService.getFullAnalytics(store.id, prevStart, prevEnd),
          analyticsService.getOrdersByDateRange(store.id, start, end),
          analyticsService.getOrdersByDateRange(store.id, prevStart, prevEnd),
          needsChartFetch ? analyticsService.getFullAnalytics(store.id, chartStart, end) : Promise.resolve(null),
          needsChartFetch ? analyticsService.getOrdersByDateRange(store.id, chartStart, end) : Promise.resolve(null),
        ])
        if (cancelled) return

        const realCur = curOrders.filter(o => !isAbandoned(o))
        const realPrev = prevOrders.filter(o => !isAbandoned(o))

        const byDay: Record<string, { orders: number; revenue: number }> = {}
        for (const o of (chartOrders ?? curOrders).filter(x => !isAbandoned(x))) {
          const created = o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt as unknown as string)
          if (Number.isNaN(created.getTime())) continue
          const key = dayKey(created)
          byDay[key] = byDay[key] || { orders: 0, revenue: 0 }
          byDay[key].orders++
          byDay[key].revenue += o.total || 0
        }

        const series: DayPoint[] = (chartAnalytics ?? cur).dailyStats.map(d => ({
          date: d.date,
          visits: d.pageViews,
          orders: byDay[d.date]?.orders || 0,
          revenue: byDay[d.date]?.revenue || 0,
        }))

        setMetrics({
          visits: cur.summary.pageViews,
          prevVisits: prev.summary.pageViews,
          orders: realCur.length,
          prevOrders: realPrev.length,
          revenue: realCur.reduce((s, o) => s + (o.total || 0), 0),
          prevRevenue: realPrev.reduce((s, o) => s + (o.total || 0), 0),
          pending: realCur.filter(o => o.status === 'pending').length,
          series,
          seriesIsWeek: needsChartFetch,
          sources: cur.referrerStats,
        })
      } catch (error) {
        console.error('Error fetching metrics:', error)
      } finally {
        if (!cancelled) setMetricsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [store, period])

  const dismissOnboarding = useCallback(async () => {
    if (!store) return
    setOnboardingDismissed(true)
    await updateDoc(doc(db, 'stores', store.id), { onboardingDismissed: true, updatedAt: new Date() })
  }, [store])

  const markLinkShared = useCallback(() => {
    if (!store) return
    setLinkShared(true)
    localStorage.setItem(`linkShared_${store.id}`, 'true')
  }, [store])

  /* Prueba gratuita: un solo aviso, activo o vencido. */
  const trial = (() => {
    if (!store?.trialEndsAt || store.subscription?.status === 'active') return null
    const raw = store.trialEndsAt
    const trialEnd =
      raw instanceof Date
        ? raw
        : typeof raw === 'object' && 'toDate' in raw
          ? (raw as { toDate: () => Date }).toDate()
          : new Date(raw as string)
    if (Number.isNaN(trialEnd.getTime())) return null
    const daysLeft = Math.ceil((trialEnd.getTime() - Date.now()) / DAY_MS)
    if (daysLeft > 0 && store.plan === 'pro' && !store.subscription) {
      return { expired: false as const, daysLeft }
    }
    if (trialEnd.getTime() < Date.now() && store.plan === 'free') {
      return { expired: true as const, daysLeft: 0 }
    }
    return null
  })()

  const catalogUrl = store
    ? store.customDomain
      ? `https://${store.customDomain}`
      : `https://${store.subdomain}.shopifree.app`
    : ''

  const copyLink = () => {
    navigator.clipboard.writeText(catalogUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(catalogUrl)}`

  const downloadQR = async () => {
    try {
      const fileName = `${store?.subdomain || 'tienda'}-qr.png`
      const response = await fetch(qrCodeUrl)
      const blob = await response.blob()

      if (Capacitor.isNativePlatform()) {
        const reader = new FileReader()
        const base64 = await new Promise<string>(resolve => {
          reader.onloadend = () => resolve((reader.result as string).split(',')[1])
          reader.readAsDataURL(blob)
        })
        const result = await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache })
        await Share.share({ title: fileName, url: result.uri })
      } else {
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error downloading QR:', error)
    }
  }

  const currency = getCurrencySymbol(store?.currency || 'USD')
  const money = useCallback((n: number) => `${currency}${compact(n)}`, [currency])
  const formatMetric = useCallback((n: number) => (metric === 'revenue' ? money(n) : compact(n)), [metric, money])

  const dayInitials = useMemo(
    () => t('home.charts.dayInitials', { defaultValue: 'D,L,M,M,J,V,S' }).split(','),
    [t]
  )

  /* Top 4 fuentes + el resto agrupado, para que la leyenda no crezca sin fin. */
  const donut = useMemo(() => {
    const all = (metrics?.sources || []).filter(s => s.count > 0)
    const total = all.reduce((s, x) => s + x.count, 0)
    if (!total) return null
    const top = all.slice(0, 4)
    const rest = all.slice(4).reduce((s, x) => s + x.count, 0)
    return { total, segments: rest > 0 ? [...top, { source: 'other', count: rest }] : top }
  }, [metrics])

  const periodLabel = t(`home.period.${period}`)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a5f]"></div>
      </div>
    )
  }

  const kpis = [
    {
      key: 'visits',
      value: compact(metrics?.visits ?? 0),
      dot: '#38bdf8',
      delta: deltaOf(metrics?.visits ?? 0, metrics?.prevVisits ?? 0),
    },
    {
      key: 'orders',
      value: compact(metrics?.orders ?? 0),
      dot: '#7C3AED',
      delta: deltaOf(metrics?.orders ?? 0, metrics?.prevOrders ?? 0),
    },
    {
      key: 'revenue',
      value: money(metrics?.revenue ?? 0),
      dot: '#16A34A',
      delta: deltaOf(metrics?.revenue ?? 0, metrics?.prevRevenue ?? 0),
    },
    {
      key: 'pending',
      value: compact(metrics?.pending ?? 0),
      dot: '#F59E0B',
      delta: null,
    },
  ]

  /* Botones del link: texto en vez de iconos, se entienden sin adivinar. */
  const linkActions = [
    { key: 'open', href: catalogUrl, label: t('home.actions.open'), title: t('home.openCatalog') },
    { key: 'qr', onClick: () => setShowQR(true), label: t('home.actions.qr'), title: t('home.showQR') },
    {
      key: 'copy',
      onClick: copyLink,
      label: copied ? t('home.actions.copied') : t('home.actions.copy'),
      title: copied ? t('home.copied') : t('home.copyLink'),
      active: copied,
    },
  ]

  return (
    <>
      <div className="space-y-5 sm:space-y-6 text-[#1e3a5f]">
        {/* Cabecera + selector de periodo */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight">{t('home.title')}</h1>
            <p className="text-[0.8rem] mt-0.5 font-normal text-[#8898AA]">
              {store?.name} · {periodLabel}
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F6F9FC] border border-[#E6EBF1] self-start sm:self-auto">
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-[0.74rem] font-medium transition-all ${
                  period === p ? 'bg-white text-[#1e3a5f] shadow-sm font-semibold' : 'text-[#8898AA] hover:text-[#425466]'
                }`}
              >
                {t(`home.period.${p}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Prueba gratuita: activa o vencida, un único aviso */}
        {trial && !Capacitor.isNativePlatform() && (
          <div
            className="rounded-[14px] p-4 sm:p-5 bg-white"
            style={{
              border: `1px solid ${trial.expired ? '#FECACA' : '#E6EBF1'}`,
              boxShadow: '0 10px 28px -22px rgba(30,58,95,.4)',
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h3 className="text-sm font-semibold">
                    {trial.expired ? t('home.trialExpired.title') : t('home.trial.title')}
                  </h3>
                  {!trial.expired && (
                    <span
                      className="px-2 py-0.5 text-[0.68rem] font-semibold rounded-full whitespace-nowrap"
                      style={{ background: '#E0F2FE', color: '#0284C7' }}
                    >
                      {trial.daysLeft === 1 ? t('home.trial.lastDay') : t('home.trial.daysLeft', { days: trial.daysLeft })}
                    </span>
                  )}
                </div>
                <p className="text-[0.82rem] mt-1 font-normal text-[#425466]">
                  {trial.expired ? t('home.trialExpired.description') : t('home.trial.description')}
                </p>
              </div>
              <Link
                to={localePath('/dashboard/plan')}
                className="px-4 py-2.5 rounded-xl text-white text-[0.82rem] font-semibold text-center shrink-0 transition-opacity hover:opacity-90"
                style={{ background: '#1e3a5f', boxShadow: '0 8px 20px -12px rgba(30,58,95,.7)' }}
              >
                {trial.expired ? t('home.trialExpired.renew') : t('home.trial.subscribe')}
              </Link>
            </div>
          </div>
        )}

        {/* Configuración inicial — desaparece sola al completarse */}
        {!onboardingDismissed &&
          store &&
          (() => {
            const steps = [
              { key: 'addProduct', done: products.length > 0, link: '/dashboard/products/new' },
              { key: 'uploadLogo', done: !!store.logo, link: '/dashboard/branding' },
              {
                key: 'chooseTheme',
                done: !!store.themeId && store.themeId !== 'minimal',
                link: '/dashboard/branding',
              },
              { key: 'shareStore', done: linkShared, link: null },
              {
                key: 'setupPayments',
                done: !!store.payments?.mercadopago?.enabled || !!store.payments?.stripe?.enabled,
                link: '/dashboard/payments',
              },
            ]
            const completed = steps.filter(s => s.done).length
            if (completed === steps.length) return null

            return (
              <div className="bg-white rounded-[14px] border border-[#E6EBF1] p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-sm font-semibold">{t('home.onboarding.title')}</h2>
                    <p className="text-[0.74rem] mt-0.5 font-normal text-[#8898AA]">
                      {t('home.onboarding.progress', { completed, total: steps.length })}
                    </p>
                  </div>
                  <button
                    onClick={dismissOnboarding}
                    className="text-[0.74rem] font-medium text-[#A9B6C6] hover:text-[#425466] transition-colors"
                  >
                    {t('home.onboarding.dismiss')}
                  </button>
                </div>
                <div className="h-1.5 bg-[#F0F4F8] rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(completed / steps.length) * 100}%`,
                      background: 'linear-gradient(90deg,#38bdf8,#0284C7)',
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  {steps.map(step => (
                    <div
                      key={step.key}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                      style={{ background: step.done ? '#F7FAF8' : '#F6F9FC' }}
                    >
                      {/* Punto lleno = hecho, aro vacio = pendiente. Sin tilde dibujada. */}
                      <span
                        className="w-[18px] h-[18px] rounded-full shrink-0"
                        style={
                          step.done
                            ? { background: '#16A34A', boxShadow: 'inset 0 0 0 4px #fff, 0 0 0 1px #16A34A' }
                            : { boxShadow: 'inset 0 0 0 2px #D8E2EC' }
                        }
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-[0.84rem] font-medium ${step.done ? 'text-[#8898AA] line-through' : 'text-[#1e3a5f]'}`}
                        >
                          {t(`home.onboarding.${step.key}`)}
                        </p>
                        {!step.done && (
                          <p className="text-[0.74rem] font-normal text-[#8898AA]">
                            {t(`home.onboarding.${step.key}Desc`)}
                          </p>
                        )}
                      </div>
                      {!step.done &&
                        (step.link ? (
                          <Link
                            to={localePath(step.link)}
                            className="px-3 py-1.5 rounded-lg text-[0.74rem] font-semibold shrink-0 transition-colors"
                            style={{ background: '#fff', border: '1px solid #E6EBF1', color: '#0284C7' }}
                          >
                            {t('home.onboarding.go')}
                          </Link>
                        ) : (
                          <button
                            onClick={() => {
                              copyLink()
                              markLinkShared()
                            }}
                            className="px-3 py-1.5 rounded-lg text-[0.74rem] font-semibold shrink-0 transition-colors"
                            style={{ background: '#fff', border: '1px solid #E6EBF1', color: '#0284C7' }}
                          >
                            {t('home.actions.copy')}
                          </button>
                        ))}
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

        {/* KPIs */}
        <div className={`grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 ${metricsLoading ? 'opacity-50' : ''}`}>
          {kpis.map(k => (
            <KpiCard
              key={k.key}
              label={t(`home.kpi.${k.key}`)}
              value={k.value}
              dot={k.dot}
              delta={k.delta}
              deltaLabel={k.key === 'pending' ? t('home.kpi.pendingHint') : t('home.kpi.noChange')}
            />
          ))}
        </div>

        {/*
          Reportes. Las dos tarjetas de esta fila tienen que ser de alto
          parecido: las celdas de un grid se estiran a la más alta, y cuando
          "Pedidos recientes" vivía en la columna derecha, con cinco pedidos
          medía el doble que el gráfico — la tarjeta de barras se estiraba con
          ella y quedaba media pantalla en blanco debajo de las barras.
        */}
        <div className="grid lg:grid-cols-[1.55fr_1fr] gap-2.5 sm:gap-4">
          {/* Barras */}
          <div className={`bg-white rounded-[14px] border border-[#E6EBF1] p-4 sm:p-5 ${metricsLoading ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{t(`home.charts.metric.${metric}`)}</p>
                <p className="text-[0.74rem] mt-0.5 font-normal text-[#8898AA]">
                  {metrics?.seriesIsWeek ? t('home.charts.last7') : periodLabel}
                </p>
              </div>
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#F6F9FC] border border-[#E6EBF1] shrink-0">
                {METRICS.map(m => (
                  <button
                    key={m}
                    onClick={() => setMetric(m)}
                    className={`px-2 py-1 rounded-md text-[0.7rem] transition-all ${
                      metric === m
                        ? 'bg-white text-[#0284C7] shadow-sm font-semibold'
                        : 'text-[#8898AA] hover:text-[#425466] font-medium'
                    }`}
                  >
                    {t(`home.charts.metric.${m}`)}
                  </button>
                ))}
              </div>
            </div>
            {metrics && metrics.series.length > 0 ? (
              <BarsChart
                series={metrics.series}
                metric={metric}
                format={formatMetric}
                dayInitials={dayInitials}
                emptyLabel={t('home.charts.noData')}
              />
            ) : (
              <div className="h-40 flex items-center justify-center text-xs font-medium text-[#A9B6C6]">
                {t('home.charts.noData')}
              </div>
            )}
          </div>

          {/* Fuentes de tráfico. El contenido va centrado en vertical: así los
              pocos píxeles que sobran cuando el gráfico de al lado es más alto
              se reparten arriba y abajo, en vez de acumularse debajo. */}
          <div
            className={`bg-white rounded-[14px] border border-[#E6EBF1] p-4 sm:p-5 flex flex-col ${metricsLoading ? 'opacity-50' : ''}`}
          >
            <p className="text-sm font-semibold">{t('home.charts.sourcesTitle')}</p>
            <div className="flex-1 flex items-center justify-center py-4">
              {donut ? (
                <SourcesDonut
                  sources={donut.segments}
                  total={donut.total}
                  labelOf={s => t(`home.sources.${s}`, { defaultValue: s })}
                />
              ) : (
                <span className="text-xs font-medium text-[#A9B6C6]">{t('home.charts.noData')}</span>
              )}
            </div>
          </div>
        </div>

        {/* Pedidos recientes, a lo ancho: una línea por pedido */}
        <div className="bg-white rounded-[14px] border border-[#E6EBF1] p-4 sm:p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold">{t('home.recentOrders.title')}</p>
            {recentOrders.length > 0 && (
              <Link
                to={localePath('/dashboard/orders')}
                className="text-[0.74rem] font-semibold text-[#0284C7] hover:text-[#1e3a5f] transition-colors"
              >
                {t('home.viewAll')}
              </Link>
            )}
          </div>
          {recentOrders.length === 0 ? (
            <p className="text-[0.8rem] font-normal text-[#8898AA] py-2">{t('home.recentOrders.empty')}</p>
          ) : (
            <div className="divide-y divide-[#EEF2F6]">
              {recentOrders.map(order => {
                const style = STATUS_STYLE[order.status] || STATUS_STYLE.pending
                const phone = order.customer?.phone?.replace(/\D/g, '')
                return (
                  <div key={order.id} className="flex items-center gap-3 py-2.5">
                    <Link
                      to={localePath('/dashboard/orders')}
                      className="flex-1 min-w-0 flex flex-wrap items-baseline gap-x-2 group"
                    >
                      <span className="text-[0.8rem] font-medium group-hover:text-[#0284C7] transition-colors">
                        #{order.orderNumber}
                      </span>
                      {order.customer?.name && (
                        <span className="text-[0.78rem] font-normal text-[#8898AA] truncate">{order.customer.name}</span>
                      )}
                    </Link>
                    <span className="text-[0.8rem] font-semibold shrink-0 tabular-nums">
                      {currency}
                      {(order.total || 0).toFixed(2)}
                    </span>
                    <span
                      className="text-[0.66rem] font-semibold rounded-full px-2 py-0.5 whitespace-nowrap shrink-0"
                      style={{ background: style.bg, color: style.tx }}
                    >
                      {t(`home.orderStatus.${order.status}`, { defaultValue: order.status })}
                    </span>
                    {phone && (
                      <a
                        href={`https://wa.me/${phone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={t('home.recentOrders.contact')}
                        className="text-[0.66rem] font-semibold rounded-full px-2 py-0.5 whitespace-nowrap shrink-0 transition-opacity hover:opacity-80"
                        style={{ background: '#DCFCE7', color: '#15803D' }}
                      >
                        {t('home.actions.whatsapp')}
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Link de la tienda */}
        <div className="bg-white rounded-[14px] border border-[#E6EBF1] p-4 sm:p-5">
          <p className="text-sm font-semibold mb-3">{t('home.yourLink')}</p>
          <div className="space-y-2.5 sm:space-y-0 sm:flex sm:items-center sm:gap-2.5">
            <code
              className="block w-full px-3.5 py-2.5 rounded-xl text-[0.8rem] font-medium truncate"
              style={{ background: '#F6F9FC', border: '1px solid #E6EBF1', color: '#0284C7' }}
            >
              {catalogUrl}
            </code>
            <div className="flex gap-2 sm:shrink-0">
              {linkActions.map(action => {
                const className =
                  'flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-[0.78rem] font-semibold text-center transition-colors whitespace-nowrap'
                const style = action.active
                  ? { background: '#DCFCE7', border: '1px solid #BBF7D0', color: '#15803D' }
                  : { background: '#F6F9FC', border: '1px solid #E6EBF1', color: '#425466' }
                return action.href ? (
                  <a
                    key={action.key}
                    href={action.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={action.title}
                    className={className}
                    style={{ background: '#1e3a5f', border: '1px solid #1e3a5f', color: '#fff' }}
                  >
                    {action.label}
                  </a>
                ) : (
                  <button key={action.key} onClick={action.onClick} title={action.title} className={className} style={style}>
                    {action.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Productos recientes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">{t('home.recentProducts')}</h2>
            {products.length > 0 && (
              <Link
                to={localePath('/dashboard/products')}
                className="text-[0.74rem] font-semibold text-[#0284C7] hover:text-[#1e3a5f] transition-colors"
              >
                {t('home.viewAll')}
              </Link>
            )}
          </div>

          {products.length === 0 ? (
            <div className="bg-white rounded-[14px] border border-[#E6EBF1] p-10 text-center">
              <h3 className="text-sm font-semibold mb-1.5">{t('home.noProductsTitle')}</h3>
              <p className="text-[0.84rem] font-normal text-[#8898AA] mb-5">{t('home.noProductsDesc')}</p>
              <Link
                to={localePath('/dashboard/products/new')}
                className="inline-flex px-5 py-2.5 rounded-xl text-white text-[0.84rem] font-semibold transition-opacity hover:opacity-90"
                style={{ background: '#1e3a5f', boxShadow: '0 8px 20px -12px rgba(30,58,95,.7)' }}
              >
                {t('home.addFirstProduct')}
              </Link>
            </div>
          ) : (
            <div
              className="scrollbar-hide -mx-4 sm:-mx-6 lg:mx-0 overflow-x-auto pb-2 snap-x snap-mandatory scroll-pl-4 sm:scroll-pl-6 lg:scroll-pl-0"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <div className="flex gap-3 px-4 sm:px-6 lg:px-0 after:content-[''] after:shrink-0 after:w-1">
                {products.slice(0, 5).map(product => (
                  <Link
                    key={product.id}
                    to={localePath(`/dashboard/products/${product.id}`)}
                    className="shrink-0 w-36 sm:w-44 bg-white rounded-[14px] border border-[#E6EBF1] overflow-hidden transition-all snap-start group hover:-translate-y-0.5"
                    style={{ boxShadow: '0 8px 24px -20px rgba(30,58,95,.5)' }}
                  >
                    <div className="aspect-square" style={{ background: '#F6F9FC' }}>
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-[0.7rem] font-medium text-[#C3CFDB]">{t('home.noPhoto')}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="text-[0.82rem] font-medium truncate group-hover:text-[#0284C7] transition-colors">
                        {product.name}
                      </h3>
                      <p className="text-[0.76rem] font-semibold mt-0.5 text-[#0284C7]">
                        {currency}
                        {product.price.toFixed(2)}
                      </p>
                    </div>
                  </Link>
                ))}
                <Link
                  to={localePath('/dashboard/products')}
                  className="shrink-0 w-36 sm:w-44 rounded-[14px] flex flex-col items-center justify-center snap-start transition-all hover:-translate-y-0.5"
                  style={{ background: '#F6F9FC', border: '1px solid #E6EBF1' }}
                >
                  <span className="text-[0.82rem] font-semibold text-[#0284C7]">{t('home.viewAll')}</span>
                  <span className="text-[0.72rem] font-normal text-[#8898AA] mt-1">
                    {products.length} {t('home.products').toLowerCase()}
                  </span>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Uso del plan — solo en el plan gratuito */}
        {store?.plan === 'free' &&
          !Capacitor.isNativePlatform() &&
          (() => {
            const limits = PLAN_FEATURES[(store.plan || 'free') as PlanType].limits
            const rows = [
              { label: t('home.products'), used: products.length, max: limits.products },
              { label: t('home.planUsage.categories'), used: categories.length, max: limits.categories },
            ]
            const nearLimit = rows.some(r => r.max !== -1 && r.used / r.max >= 0.7)

            return (
              <div
                className="bg-white rounded-[14px] p-4 sm:p-5"
                style={{ border: `1px solid ${nearLimit ? '#FED7AA' : '#E6EBF1'}` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold">{t('home.planUsage.title')}</h3>
                    <span className="text-[0.72rem] font-normal text-[#8898AA]">
                      {PLAN_FEATURES[(store.plan || 'free') as PlanType].name}
                    </span>
                  </div>
                  <Link
                    to={localePath('/dashboard/plan')}
                    className="text-[0.74rem] font-semibold text-[#0284C7] hover:text-[#1e3a5f] transition-colors"
                  >
                    {t('home.planUsage.upgrade')}
                  </Link>
                </div>
                <div className="space-y-3">
                  {rows.map(row => {
                    const pct = row.max === -1 ? 0 : Math.min(100, Math.round((row.used / row.max) * 100))
                    return (
                      <div key={row.label}>
                        <div className="flex items-center justify-between text-[0.76rem] mb-1.5">
                          <span className="font-normal text-[#425466]">{row.label}</span>
                          <span className="font-semibold" style={{ color: pct >= 80 ? '#C2410C' : '#1e3a5f' }}>
                            {row.used}/{row.max === -1 ? '∞' : row.max}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#F0F4F8' }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              background:
                                pct >= 80
                                  ? 'linear-gradient(90deg,#FB923C,#EF4444)'
                                  : 'linear-gradient(90deg,#38bdf8,#0284C7)',
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                  <div className="flex items-center justify-between text-[0.76rem]">
                    <span className="font-normal text-[#425466]">{t('home.planUsage.images')}</span>
                    <span className="font-semibold">
                      {limits.imagesPerProduct} {t('home.planUsage.perProduct')}
                    </span>
                  </div>
                </div>
                {nearLimit && (
                  <Link
                    to={localePath('/dashboard/plan')}
                    className="mt-4 block text-center px-4 py-2.5 rounded-xl text-white text-[0.82rem] font-semibold transition-opacity hover:opacity-90"
                    style={{ background: '#1e3a5f' }}
                  >
                    {t('home.planUsage.unlockMore')}
                  </Link>
                )}
              </div>
            )
          })()}
      </div>

      {/* Modal del QR */}
      {showQR && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowQR(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-[#1e3a5f]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">{t('home.qrTitle')}</h3>
              <button
                onClick={() => setShowQR(false)}
                className="text-[0.78rem] font-medium text-[#8898AA] hover:text-[#425466] transition-colors"
              >
                {t('home.actions.close')}
              </button>
            </div>
            <div
              className="p-4 rounded-xl flex items-center justify-center mb-4"
              style={{ background: '#fff', border: '1px solid #E6EBF1' }}
            >
              <img src={qrCodeUrl} alt="QR" className="w-48 h-48" />
            </div>
            <p className="text-center text-[0.8rem] font-normal text-[#8898AA] mb-4 break-all">{catalogUrl}</p>
            <button
              onClick={downloadQR}
              className="w-full py-3 rounded-xl text-white text-[0.86rem] font-semibold transition-opacity hover:opacity-90"
              style={{ background: '#1e3a5f' }}
            >
              {t('home.downloadQR')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
