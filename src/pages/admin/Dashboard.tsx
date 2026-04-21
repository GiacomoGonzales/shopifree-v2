import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
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
  appRequests: (Store & { id: string })[]
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
  const [updatingApp, setUpdatingApp] = useState<string | null>(null)
  const [appUrls, setAppUrls] = useState<Record<string, { android: string; ios: string }>>({})

  const updateAppStatus = async (storeId: string, status: string) => {
    setUpdatingApp(storeId)
    try {
      const updates: Record<string, unknown> = { 'appConfig.status': status }
      if (status === 'published') {
        updates['appConfig.publishedAt'] = new Date()
        const urls = appUrls[storeId]
        if (urls?.android) updates['appConfig.androidUrl'] = urls.android
        if (urls?.ios) updates['appConfig.iosUrl'] = urls.ios
      }
      await updateDoc(doc(db, 'stores', storeId), updates)
      // Update local state
      setStats(prev => prev ? {
        ...prev,
        appRequests: status === 'published'
          ? prev.appRequests.filter(s => s.id !== storeId)
          : prev.appRequests.map(s => s.id === storeId ? { ...s, appConfig: { ...s.appConfig!, status: status as 'requested' | 'building' } } : s)
      } : prev)
    } catch (err) {
      console.error('Error updating app status:', err)
    } finally {
      setUpdatingApp(null)
    }
  }

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

        // App publication requests (requested or building)
        const appRequests = stores
          .filter(s => s.appConfig?.status === 'requested' || s.appConfig?.status === 'building')
          .sort((a, b) => toDate(b.appConfig?.requestedAt).getTime() - toDate(a.appConfig?.requestedAt).getTime())

        setStats({
          totalStores: stores.length,
          totalUsers: usersSnapshot.size,
          planDistribution,
          countryDistribution,
          recentStores,
          appRequests
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

      {/* App Publication Requests */}
      {stats?.appRequests && stats.appRequests.length > 0 && (
        <div className="border border-gray-200 rounded-lg">
          <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-900">
              Solicitudes de app
            </h2>
            <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-sm">
              {stats.appRequests.length}
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            {stats.appRequests.map((store) => (
              <div key={store.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {store.appConfig?.icon ? (
                      <img src={store.appConfig.icon} alt="" className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
                    ) : store.logo ? (
                      <img src={store.logo} alt="" className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center flex-shrink-0">
                        <span className="text-gray-600 font-medium text-sm">{store.name.charAt(0)}</span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{store.appConfig?.appName || store.name}</p>
                      <p className="text-[11px] text-gray-500 truncate">{store.subdomain}.shopifree.app · {store.id}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[11px] rounded-sm font-medium border border-gray-200 text-gray-700 flex-shrink-0">
                    {store.appConfig?.status === 'requested' ? 'Solicitada' : 'En construccion'}
                  </span>
                </div>

                {/* Colors preview */}
                {store.appConfig && (
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-4 h-4 rounded border border-gray-200" style={{ backgroundColor: store.appConfig.primaryColor }} title="Primary" />
                    <div className="w-4 h-4 rounded border border-gray-200" style={{ backgroundColor: store.appConfig.secondaryColor }} title="Secondary" />
                    <div className="w-4 h-4 rounded border border-gray-200" style={{ backgroundColor: store.appConfig.splashColor }} title="Splash" />
                    <span className="text-[11px] text-gray-500 ml-1">Plan: {store.plan}</span>
                  </div>
                )}

                {/* URL inputs for publishing */}
                {store.appConfig?.status === 'building' && (
                  <div className="space-y-2 mb-3">
                    <input
                      type="text"
                      placeholder="Play Store URL"
                      value={appUrls[store.id]?.android || ''}
                      onChange={(e) => setAppUrls(prev => ({ ...prev, [store.id]: { ...prev[store.id], android: e.target.value, ios: prev[store.id]?.ios || '' } }))}
                      className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-900"
                    />
                    <input
                      type="text"
                      placeholder="App Store URL"
                      value={appUrls[store.id]?.ios || ''}
                      onChange={(e) => setAppUrls(prev => ({ ...prev, [store.id]: { android: prev[store.id]?.android || '', ios: e.target.value } }))}
                      className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-900"
                    />
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2">
                  {store.appConfig?.status === 'requested' && (
                    <button
                      onClick={() => updateAppStatus(store.id, 'building')}
                      disabled={updatingApp === store.id}
                      className="px-3 py-1.5 bg-black text-white text-xs font-medium rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                      {updatingApp === store.id ? '...' : 'Marcar en construccion'}
                    </button>
                  )}
                  {store.appConfig?.status === 'building' && (
                    <button
                      onClick={() => updateAppStatus(store.id, 'published')}
                      disabled={updatingApp === store.id}
                      className="px-3 py-1.5 bg-black text-white text-xs font-medium rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                      {updatingApp === store.id ? '...' : 'Marcar como publicada'}
                    </button>
                  )}
                  <button
                    onClick={() => navigator.clipboard.writeText(store.id)}
                    className="px-3 py-1.5 border border-gray-200 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Copiar ID
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Tiendas totales" value={stats?.totalStores || 0} />
        <StatCard label="Usuarios totales" value={stats?.totalUsers || 0} />
        <StatCard label="Planes Pro" value={stats?.planDistribution.pro || 0} />
        <StatCard label="Planes Business" value={stats?.planDistribution.business || 0} />
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
                        <div
                          className="h-full rounded-full bg-gray-900 transition-all"
                          style={{ width: `${percentage}%` }}
                        />
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
                    <div
                      className="h-full rounded-full bg-gray-900 transition-all"
                      style={{ width: `${percentage}%` }}
                    />
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
