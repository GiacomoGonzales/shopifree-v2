import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import type { Store } from '../../types'

interface Stats {
  totalStores: number
  totalUsers: number
  planDistribution: {
    free: number
    pro: number
    business: number
  }
  recentStores: (Store & { id: string })[]
}

export default function AdminDashboard() {
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

        // Get recent stores (last 5)
        const recentStores = stores
          .sort((a, b) => {
            const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)
            const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt)
            return dateB.getTime() - dateA.getTime()
          })
          .slice(0, 5)

        setStats({
          totalStores: stores.length,
          totalUsers: usersSnapshot.size,
          planDistribution,
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a5f]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">Vista general de la plataforma</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#38bdf8] to-[#2d6cb5] rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <p className="text-3xl font-bold text-[#1e3a5f]">{stats?.totalStores || 0}</p>
              <p className="text-gray-600 text-sm">Tiendas totales</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#1e3a5f] to-[#2d6cb5] rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <p className="text-3xl font-bold text-[#1e3a5f]">{stats?.totalUsers || 0}</p>
              <p className="text-gray-600 text-sm">Usuarios totales</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-3xl font-bold text-[#1e3a5f]">{stats?.planDistribution.pro || 0}</p>
              <p className="text-gray-600 text-sm">Planes Pro</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div>
              <p className="text-3xl font-bold text-[#1e3a5f]">{stats?.planDistribution.business || 0}</p>
              <p className="text-gray-600 text-sm">Planes Business</p>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">Distribucion de planes</h2>
          <div className="space-y-4">
            {['free', 'pro', 'business'].map((plan) => {
              const count = stats?.planDistribution[plan as keyof typeof stats.planDistribution] || 0
              const total = stats?.totalStores || 1
              const percentage = Math.round((count / total) * 100)

              return (
                <div key={plan}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize text-gray-600">{plan}</span>
                    <span className="font-medium text-[#1e3a5f]">{count} ({percentage}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        plan === 'free' ? 'bg-gray-400' :
                        plan === 'pro' ? 'bg-[#2d6cb5]' :
                        'bg-purple-500'
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
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#1e3a5f]">Tiendas recientes</h2>
            <Link to="/admin/stores" className="text-sm text-[#2d6cb5] hover:underline">
              Ver todas
            </Link>
          </div>
          <div className="space-y-3">
            {stats?.recentStores.map((store) => (
              <div key={store.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  {store.logo ? (
                    <img src={store.logo} alt={store.name} className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 bg-gradient-to-br from-[#f0f7ff] to-white border border-[#38bdf8]/20 rounded-lg flex items-center justify-center">
                      <span className="text-[#2d6cb5] font-bold">{store.name.charAt(0)}</span>
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-[#1e3a5f]">{store.name}</p>
                    <p className="text-xs text-gray-500">{store.subdomain}.shopifree.app</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full font-medium capitalize ${
                  store.plan === 'free' ? 'bg-gray-100 text-gray-600' :
                  store.plan === 'pro' ? 'bg-blue-100 text-blue-700' :
                  'bg-purple-100 text-purple-700'
                }`}>
                  {store.plan}
                </span>
              </div>
            ))}
            {(!stats?.recentStores || stats.recentStores.length === 0) && (
              <p className="text-gray-500 text-center py-4">No hay tiendas registradas</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
