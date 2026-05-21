import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs } from 'firebase/firestore'
import { db, auth } from '../../lib/firebase'
import { useLanguage } from '../../hooks/useLanguage'
import { apiUrl } from '../../utils/apiBase'
import type { Store } from '../../types'

interface Stats {
  totalStores: number
  totalUsers: number
  planDistribution: {
    free: number
    pro: number
    business: number
  }
  countryDistribution: { code: string; count: number }[]
  recentStores: (Store & { id: string })[]
}

interface RankingEntry {
  id: string
  name: string
  subdomain: string
  logo?: string
  plan?: string
  value: number
}

interface Rankings {
  topByViews: RankingEntry[]
  topByOrders: RankingEntry[]
  topByRevenue: RankingEntry[]
  topByWhatsApp: RankingEntry[]
}

const COUNTRY_NAMES: Record<string, string> = {
  CO: 'Colombia',
  PE: 'Peru',
  MX: 'Mexico',
  AR: 'Argentina',
  CL: 'Chile',
  EC: 'Ecuador',
  VE: 'Venezuela',
  BR: 'Brasil',
  UY: 'Uruguay',
  PY: 'Paraguay',
  BO: 'Bolivia',
  PA: 'Panama',
  CR: 'Costa Rica',
  GT: 'Guatemala',
  HN: 'Honduras',
  SV: 'El Salvador',
  NI: 'Nicaragua',
  DO: 'Rep. Dominicana',
  CU: 'Cuba',
  PR: 'Puerto Rico',
  US: 'Estados Unidos',
  ES: 'Espana',
}

function countryCodeToFlag(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65))
    .join('')
}

export default function AdminDashboard() {
  const { localePath } = useLanguage()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  // Rankings se fetchean en paralelo a las stats principales via endpoint
  // dedicado (/api/admin-rankings) que agrega collectionGroup queries
  // server-side. Es independiente del loading de stats — si tarda mas el
  // ranking, el dashboard se renderiza con un placeholder.
  const [rankings, setRankings] = useState<Rankings | null>(null)
  const [rankingsLoading, setRankingsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const storesSnapshot = await getDocs(collection(db, 'stores'))
        const stores = storesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as (Store & { id: string })[]

        const usersSnapshot = await getDocs(collection(db, 'users'))

        const planDistribution = { free: 0, pro: 0, business: 0 }
        stores.forEach(store => {
          const plan = store.plan as keyof typeof planDistribution
          if (planDistribution[plan] !== undefined) planDistribution[plan]++
        })

        const countryCounts: Record<string, number> = {}
        stores.forEach(store => {
          const code = store.location?.country || 'N/A'
          countryCounts[code] = (countryCounts[code] || 0) + 1
        })
        const countryDistribution = Object.entries(countryCounts)
          .map(([code, count]) => ({ code, count }))
          .sort((a, b) => b.count - a.count)

        const toDate = (d: unknown) => {
          if (!d) return new Date(0)
          if (typeof d === 'object' && d !== null && 'toDate' in d) return (d as { toDate: () => Date }).toDate()
          if (d instanceof Date) return d
          return new Date(d as string)
        }
        const recentStores = stores
          .sort((a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime())
          .slice(0, 5)

        setStats({
          totalStores: stores.length,
          totalUsers: usersSnapshot.size,
          planDistribution,
          countryDistribution,
          recentStores,
        })
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  useEffect(() => {
    const fetchRankings = async () => {
      if (!auth.currentUser) return
      try {
        const token = await auth.currentUser.getIdToken()
        const res = await fetch(apiUrl('/api/admin-rankings'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Failed to fetch rankings')
        const data = (await res.json()) as Rankings
        setRankings(data)
      } catch (error) {
        console.error('Error fetching rankings:', error)
      } finally {
        setRankingsLoading(false)
      }
    }

    fetchRankings()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-200 border-t-gray-900" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Vista general de la plataforma</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Tiendas totales" value={stats?.totalStores || 0} />
        <StatCard label="Usuarios totales" value={stats?.totalUsers || 0} />
        <StatCard label="Planes Pro" value={stats?.planDistribution.pro || 0} />
        <StatCard label="Planes Business" value={stats?.planDistribution.business || 0} />
      </div>

      {/* Top Rankings — 4 listas paralelas con los top performers por metrica. */}
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-900">Top tiendas</h2>
          <span className="text-[11px] text-gray-500">Acumulado total</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <RankingCard
            title="Mas visitadas"
            subtitle="Page views totales"
            entries={rankings?.topByViews}
            loading={rankingsLoading}
            localePath={localePath}
            formatValue={v => v.toLocaleString('es')}
          />
          <RankingCard
            title="Mas pedidos"
            subtitle="Pedidos no cancelados"
            entries={rankings?.topByOrders}
            loading={rankingsLoading}
            localePath={localePath}
            formatValue={v => v.toLocaleString('es')}
          />
          <RankingCard
            title="Mas generado"
            subtitle="Suma de pedidos (gross)"
            entries={rankings?.topByRevenue}
            loading={rankingsLoading}
            localePath={localePath}
            formatValue={v => `$${v.toFixed(0)}`}
          />
          <RankingCard
            title="Mas clicks WhatsApp"
            subtitle="Engagement con vendedor"
            entries={rankings?.topByWhatsApp}
            loading={rankingsLoading}
            localePath={localePath}
            formatValue={v => v.toLocaleString('es')}
          />
        </div>
      </div>

      {/* Country Distribution */}
      <div className="border border-gray-200 rounded-lg">
        <div className="px-5 py-3 border-b border-gray-200">
          <h2 className="text-sm font-medium text-gray-900">Tiendas por pais</h2>
        </div>
        <div className="p-5">
          {stats?.countryDistribution && stats.countryDistribution.length > 0 ? (
            <div className="space-y-3">
              {stats.countryDistribution.map(({ code, count }) => {
                const total = stats.totalStores || 1
                const percentage = Math.round((count / total) * 100)
                const name = code === 'N/A' ? 'Sin pais' : (COUNTRY_NAMES[code] || code)
                const flag = code === 'N/A' ? '' : countryCodeToFlag(code)

                return (
                  <div key={code} className="flex items-center gap-3">
                    <span className="text-base w-6 text-center shrink-0">{flag || '—'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-[13px] mb-1">
                        <span className="text-gray-600 truncate">{name}</span>
                        <span className="font-medium text-gray-900 shrink-0 ml-2 tabular-nums">{count} <span className="text-gray-400">({percentage}%)</span></span>
                      </div>
                      <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gray-900 transition-all" style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No hay datos de paises</p>
          )}
        </div>
      </div>

      {/* Plan Distribution + Recent Stores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border border-gray-200 rounded-lg">
          <div className="px-5 py-3 border-b border-gray-200">
            <h2 className="text-sm font-medium text-gray-900">Distribucion de planes</h2>
          </div>
          <div className="p-5 space-y-4">
            {['free', 'pro', 'business'].map((plan) => {
              const count = stats?.planDistribution[plan as keyof typeof stats.planDistribution] || 0
              const total = stats?.totalStores || 1
              const percentage = Math.round((count / total) * 100)

              return (
                <div key={plan}>
                  <div className="flex justify-between text-[13px] mb-1">
                    <span className="capitalize text-gray-600">{plan}</span>
                    <span className="font-medium text-gray-900 tabular-nums">{count} <span className="text-gray-400">({percentage}%)</span></span>
                  </div>
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gray-900 transition-all" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent Stores */}
        <div className="border border-gray-200 rounded-lg">
          <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-900">Tiendas recientes</h2>
            <Link to={localePath('/admin/stores')} className="text-[12px] text-gray-600 hover:text-gray-900 font-medium">
              Ver todas →
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {stats?.recentStores.map((store) => (
              <div key={store.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  {store.logo ? (
                    <img src={store.logo} alt={store.name} className="w-9 h-9 rounded-md object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-9 bg-gray-100 rounded-md flex items-center justify-center flex-shrink-0">
                      <span className="text-gray-600 font-medium text-sm">{store.name.charAt(0)}</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{store.name}</p>
                    <p className="text-[11px] text-gray-500 truncate">{store.subdomain}.shopifree.app</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 text-[11px] rounded-sm font-medium capitalize border border-gray-200 text-gray-700 flex-shrink-0">
                  {store.plan}
                </span>
              </div>
            ))}
            {(!stats?.recentStores || stats.recentStores.length === 0) && (
              <p className="text-sm text-gray-500 text-center py-6">No hay tiendas registradas</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-2xl font-semibold text-gray-900 mt-1 tabular-nums">{value}</p>
    </div>
  )
}

function RankingCard({
  title,
  subtitle,
  entries,
  loading,
  localePath,
  formatValue,
}: {
  title: string
  subtitle: string
  entries: RankingEntry[] | undefined
  loading: boolean
  localePath: (path: string) => string
  formatValue: (v: number) => string
}) {
  return (
    <div className="border border-gray-200 rounded-lg">
      <div className="px-5 py-3 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        <p className="text-[11px] text-gray-500 mt-0.5">{subtitle}</p>
      </div>
      <div className="divide-y divide-gray-100">
        {loading ? (
          <div className="px-5 py-6 flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-200 border-t-gray-900" />
          </div>
        ) : !entries || entries.length === 0 ? (
          <p className="text-[13px] text-gray-500 text-center py-6">Sin datos todavia</p>
        ) : (
          entries.map((entry, idx) => (
            <Link
              key={entry.id}
              to={localePath(`/admin/stores/${entry.id}`)}
              className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50 transition-colors"
            >
              <span className="text-[11px] font-medium text-gray-400 tabular-nums w-4">{idx + 1}</span>
              {entry.logo ? (
                <img src={entry.logo} alt="" className="w-7 h-7 rounded-md object-cover flex-shrink-0" />
              ) : (
                <div className="w-7 h-7 bg-gray-100 rounded-md flex items-center justify-center flex-shrink-0">
                  <span className="text-gray-600 font-medium text-[11px]">{entry.name.charAt(0)}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-gray-900 truncate">{entry.name}</p>
                <p className="text-[10px] text-gray-500 truncate">{entry.subdomain}.shopifree.app</p>
              </div>
              <span className="text-[13px] font-semibold text-gray-900 tabular-nums flex-shrink-0">
                {formatValue(entry.value)}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
