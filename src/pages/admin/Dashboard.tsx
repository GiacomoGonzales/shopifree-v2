import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useLanguage } from '../../hooks/useLanguage'
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

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get all stores
        const storesSnapshot = await getDocs(collection(db, 'stores'))
        const stores = storesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as (Store & { id: string })[]

        // Get all users
        const usersSnapshot = await getDocs(collection(db, 'users'))

        // Calculate plan distribution
        const planDistribution = {
          free: 0,
          pro: 0,
          business: 0
        }

        stores.forEach(store => {
          const plan = store.plan as keyof typeof planDistribution
          if (planDistribution[plan] !== undefined) {
            planDistribution[plan]++
          }
        })

        // Calculate country distribution
        const countryCounts: Record<string, number> = {}
        stores.forEach(store => {
          const code = store.location?.country || 'N/A'
          countryCounts[code] = (countryCounts[code] || 0) + 1
        })
        const countryDistribution = Object.entries(countryCounts)
          .map(([code, count]) => ({ code, count }))
          .sort((a, b) => b.count - a.count)

        // Get recent stores (last 5)
        const toDate = (d: any) => {
          if (!d) return new Date(0)
          if (d.toDate) return d.toDate()
          if (d instanceof Date) return d
          return new Date(d)
        }
        const recentStores = stores
          .sort((a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime())
          .slice(0, 5)

        setStats({
          totalStores: stores.length,
          totalUsers: usersSnapshot.size,
          planDistribution,
          countryDistribution,
          recentStores
        })
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-1/4 w-32 h-32 bg-white/10 rounded-full translate-y-1/2" />
        <div className="relative">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-violet-200 mt-1">Vista general de la plataforma</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-black/5 rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Tiendas totales</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.totalStores || 0}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/25">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-black/5 rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Usuarios totales</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.totalUsers || 0}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-black/5 rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Planes Pro</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.planDistribution.pro || 0}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/25">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-black/5 rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Planes Business</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.planDistribution.business || 0}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/25">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Country Distribution */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-black/5 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Tiendas por pais</h2>
        {stats?.countryDistribution && stats.countryDistribution.length > 0 ? (
          <div className="space-y-3">
            {stats.countryDistribution.map(({ code, count }) => {
              const total = stats.totalStores || 1
              const percentage = Math.round((count / total) * 100)
              const name = code === 'N/A' ? 'Sin pais' : (COUNTRY_NAMES[code] || code)
              const flag = code === 'N/A' ? '' : countryCodeToFlag(code)

              return (
                <div key={code} className="flex items-center gap-3">
                  <span className="text-xl w-8 text-center shrink-0">{flag || '—'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 truncate">{name}</span>
                      <span className="font-medium text-gray-900 shrink-0 ml-2">{count} ({percentage}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-4">No hay datos de paises</p>
        )}
      </div>

      {/* Plan Distribution + Recent Stores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-black/5 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribucion de planes</h2>
          <div className="space-y-4">
            {['free', 'pro', 'business'].map((plan) => {
              const count = stats?.planDistribution[plan as keyof typeof stats.planDistribution] || 0
              const total = stats?.totalStores || 1
              const percentage = Math.round((count / total) * 100)

              return (
                <div key={plan}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize text-gray-500">{plan}</span>
                    <span className="font-medium text-gray-900">{count} ({percentage}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        plan === 'free' ? 'bg-gray-300' :
                        plan === 'pro' ? 'bg-gradient-to-r from-violet-500 to-indigo-500' :
                        'bg-gradient-to-r from-amber-500 to-orange-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent Stores */}
        <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-black/5 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Tiendas recientes</h2>
            <Link to={localePath('/admin/stores')} className="text-sm text-violet-600 hover:text-violet-700 font-medium">
              Ver todas
            </Link>
          </div>
          <div className="space-y-3">
            {stats?.recentStores.map((store) => (
              <div key={store.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/50 transition-colors">
                <div className="flex items-center gap-3">
                  {store.logo ? (
                    <img src={store.logo} alt={store.name} className="w-10 h-10 rounded-lg object-cover ring-1 ring-black/5" />
                  ) : (
                    <div className="w-10 h-10 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-lg flex items-center justify-center ring-1 ring-black/5">
                      <span className="text-violet-600 font-bold">{store.name.charAt(0)}</span>
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{store.name}</p>
                    <p className="text-xs text-gray-400">{store.subdomain}.shopifree.app</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 text-xs rounded-full font-medium capitalize ${
                  store.plan === 'free' ? 'bg-gray-100/80 text-gray-600' :
                  store.plan === 'pro' ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white' :
                  'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                }`}>
                  {store.plan}
                </span>
              </div>
            ))}
            {(!stats?.recentStores || stats.recentStores.length === 0) && (
              <p className="text-gray-400 text-center py-4">No hay tiendas registradas</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
