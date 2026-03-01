import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, doc, updateDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useToast } from '../../components/ui/Toast'
import { useLanguage } from '../../hooks/useLanguage'
import { PLAN_FEATURES } from '../../lib/stripe'
import type { Store } from '../../types'
import { countries } from '../../data/states'

const formatRelativeTime = (date: Date): string => {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Justo ahora'
  if (diffMins < 60) return `Hace ${diffMins}m`
  if (diffHours < 24) return `Hace ${diffHours}h`
  if (diffDays < 7) return `Hace ${diffDays}d`
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} sem`
  if (diffDays < 365) return `Hace ${Math.floor(diffDays / 30)} mes${Math.floor(diffDays / 30) > 1 ? 'es' : ''}`
  return `Hace ${Math.floor(diffDays / 365)} año${Math.floor(diffDays / 365) > 1 ? 's' : ''}`
}

const getActivityColor = (date: Date): string => {
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000)
  if (diffDays <= 3) return 'text-green-600 bg-green-50'
  if (diffDays <= 14) return 'text-blue-600 bg-blue-50'
  if (diffDays <= 30) return 'text-yellow-600 bg-yellow-50'
  return 'text-red-600 bg-red-50'
}

const getActivityDot = (date: Date): string => {
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000)
  if (diffDays <= 3) return 'bg-green-400'
  if (diffDays <= 14) return 'bg-blue-400'
  if (diffDays <= 30) return 'bg-yellow-400'
  return 'bg-red-400'
}

const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  active: 'Activa',
  past_due: 'Pago pendiente',
  canceled: 'Cancelada',
  unpaid: 'Impagada',
  trialing: 'Prueba',
  incomplete: 'Incompleta',
  incomplete_expired: 'Expirada',
  paused: 'Pausada'
}

const COLUMNS: { id: string; label: string; alwaysVisible?: boolean }[] = [
  { id: 'name', label: 'Tienda', alwaysVisible: true },
  { id: 'subdomain', label: 'Subdominio' },
  { id: 'country', label: 'País' },
  { id: 'plan', label: 'Plan' },
  { id: 'products', label: 'Productos' },
  { id: 'online', label: 'En línea' },
  { id: 'activity', label: 'Actividad' },
  { id: 'subscription', label: 'Suscripción' },
  { id: 'expiration', label: 'Vencimiento' },
  { id: 'createdAt', label: 'Creada' },
  { id: 'actions', label: 'Acciones', alwaysVisible: true },
]

// Helper for expiration date formatting and urgency
// Only meaningful for active/trialing subscriptions
const getExpirationInfo = (
  periodEnd: Date | null,
  trialEnd: Date | null,
  status?: string
): { text: string; color: string; daysLeft: number; showExpiration: boolean; isTrial: boolean } => {
  // Only show expiration for active subscriptions
  const isActive = status === 'active' || status === 'trialing'
  const isTrial = status === 'trialing'

  // For trialing users, show trial end date; for active, show period end
  const date = isTrial && trialEnd ? trialEnd : periodEnd

  if (!isActive || !date) {
    return { text: '-', color: 'text-gray-400', daysLeft: Infinity, showExpiration: false, isTrial: false }
  }

  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const daysLeft = Math.ceil(diffMs / 86400000)

  // Trial-specific labels
  const prefix = isTrial ? 'Prueba: ' : ''

  if (daysLeft < 0) {
    return { text: `${prefix}Vencido`, color: 'bg-red-100 text-red-700', daysLeft, showExpiration: true, isTrial }
  }
  if (daysLeft === 0) {
    return { text: `${prefix}Hoy`, color: 'bg-red-100 text-red-700', daysLeft, showExpiration: true, isTrial }
  }
  if (daysLeft <= 3) {
    return { text: `${prefix}${daysLeft}d`, color: 'bg-red-100 text-red-700', daysLeft, showExpiration: true, isTrial }
  }
  if (daysLeft <= 7) {
    return { text: `${prefix}${daysLeft}d`, color: 'bg-yellow-100 text-yellow-700', daysLeft, showExpiration: true, isTrial }
  }
  if (daysLeft <= 14) {
    return { text: `${prefix}${daysLeft}d`, color: isTrial ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700', daysLeft, showExpiration: true, isTrial }
  }
  if (daysLeft <= 30) {
    return { text: `${prefix}${daysLeft}d`, color: 'bg-blue-100 text-blue-700', daysLeft, showExpiration: true, isTrial }
  }
  return { text: date.toLocaleDateString(), color: 'bg-gray-100 text-gray-600', daysLeft, showExpiration: true, isTrial }
}

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes

const LS_KEY = 'admin-stores-columns'

export default function AdminStores() {
  const { showToast } = useToast()
  const { localePath } = useLanguage()
  const [stores, setStores] = useState<(Store & { id: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [editingStore, setEditingStore] = useState<(Store & { id: string }) | null>(null)
  const [saving, setSaving] = useState(false)
  const [syncingStore, setSyncingStore] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPlan, setFilterPlan] = useState<string>('all')
  const [filterExpiration, setFilterExpiration] = useState<string>('all')
  const [productCounts, setProductCounts] = useState<Record<string, number>>({})

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(LS_KEY)
      if (saved) return new Set(JSON.parse(saved))
    } catch { /* ignore */ }
    return new Set(COLUMNS.map(c => c.id))
  })
  const [columnsOpen, setColumnsOpen] = useState(false)
  const columnsRef = useRef<HTMLDivElement>(null)

  const isVisible = (id: string) => visibleColumns.has(id)
  const toggleColumn = (id: string) => {
    setVisibleColumns(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      localStorage.setItem(LS_KEY, JSON.stringify([...next]))
      return next
    })
  }

  // Close dropdown on click outside
  useEffect(() => {
    if (!columnsOpen) return
    const handler = (e: MouseEvent) => {
      if (columnsRef.current && !columnsRef.current.contains(e.target as Node)) {
        setColumnsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [columnsOpen])

  type SortField = 'name' | 'subdomain' | 'plan' | 'createdAt' | 'products' | 'lastActivity' | 'expiration'
  type SortOrder = 'asc' | 'desc'
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // Real-time listener for stores (picks up lastOnlineAt changes instantly)
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'stores'),
      (snapshot) => {
        const storesData = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        })) as (Store & { id: string })[]
        setStores(storesData)
        setLoading(false)
      },
      (error) => {
        console.error('Error fetching stores:', error)
        showToast('Error al cargar las tiendas', 'error')
        setLoading(false)
      }
    )
    return () => unsub()
  }, [])

  const handleSyncSubscription = async (storeId: string) => {
    setSyncingStore(storeId)
    try {
      // Use production API URL when running locally
      const apiUrl = window.location.hostname === 'localhost'
        ? 'https://shopifree.app/api/sync-subscription'
        : '/api/sync-subscription'

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId })
      })

      const data = await response.json()

      if (response.ok) {
        // Update local state
        setStores(prev => prev.map(s =>
          s.id === storeId
            ? {
                ...s,
                plan: data.plan,
                subscription: s.subscription
                  ? { ...s.subscription, status: data.status }
                  : undefined
              } as Store & { id: string }
            : s
        ))
        showToast(`Sincronizado: ${SUBSCRIPTION_STATUS_LABELS[data.status] || data.status}`, 'success')
      } else {
        showToast(data.error || 'Error al sincronizar', 'error')
      }
    } catch (error) {
      console.error('Error syncing subscription:', error)
      showToast('Error al sincronizar con Stripe', 'error')
    } finally {
      setSyncingStore(null)
    }
  }

  const handleUpdatePlan = async (storeId: string, newPlan: 'free' | 'pro' | 'business') => {
    setSaving(true)
    try {
      await updateDoc(doc(db, 'stores', storeId), {
        plan: newPlan,
        updatedAt: new Date()
      })

      setStores(stores.map(s =>
        s.id === storeId ? { ...s, plan: newPlan } : s
      ))

      showToast(`Plan actualizado a ${newPlan}`, 'success')
      setEditingStore(null)
    } catch (error) {
      console.error('Error updating plan:', error)
      showToast('Error al actualizar el plan', 'error')
    } finally {
      setSaving(false)
    }
  }

  const filteredStores = useMemo(() => {
    const toDate = (d: any): Date | null => {
      if (!d) return null
      if (d.toDate) return d.toDate()
      if (d instanceof Date) return d
      return new Date(d)
    }

    let result = stores.filter(store => {
      const matchesSearch = store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           store.subdomain.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesPlan = filterPlan === 'all' || store.plan === filterPlan

      // Expiration filter - only applies to active/trialing subscriptions
      let matchesExpiration = true
      if (filterExpiration !== 'all') {
        const isActive = store.subscription?.status === 'active' || store.subscription?.status === 'trialing'
        const expDate = toDate(store.subscription?.currentPeriodEnd)

        if (!isActive || !expDate) {
          // No active subscription = only match 'none' filter
          matchesExpiration = filterExpiration === 'none'
        } else {
          const daysLeft = Math.ceil((expDate.getTime() - Date.now()) / 86400000)
          switch (filterExpiration) {
            case 'expired': matchesExpiration = daysLeft < 0; break
            case '3days': matchesExpiration = daysLeft >= 0 && daysLeft <= 3; break
            case '7days': matchesExpiration = daysLeft >= 0 && daysLeft <= 7; break
            case '14days': matchesExpiration = daysLeft >= 0 && daysLeft <= 14; break
            case '30days': matchesExpiration = daysLeft >= 0 && daysLeft <= 30; break
            case 'none': matchesExpiration = false; break
          }
        }
      }

      return matchesSearch && matchesPlan && matchesExpiration
    })

    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'subdomain':
          comparison = a.subdomain.localeCompare(b.subdomain)
          break
        case 'plan': {
          const planOrder: Record<string, number> = { free: 0, pro: 1, business: 2 }
          comparison = (planOrder[a.plan || 'free'] || 0) - (planOrder[b.plan || 'free'] || 0)
          break
        }
        case 'createdAt':
          comparison = (toDate(a.createdAt)?.getTime() || 0) - (toDate(b.createdAt)?.getTime() || 0)
          break
        case 'products':
          comparison = (productCounts[a.id] || 0) - (productCounts[b.id] || 0)
          break
        case 'lastActivity':
          comparison = (toDate(a.updatedAt)?.getTime() || 0) - (toDate(b.updatedAt)?.getTime() || 0)
          break
        case 'expiration': {
          // Only consider expiration for active/trialing subscriptions
          const aActive = a.subscription?.status === 'active' || a.subscription?.status === 'trialing'
          const bActive = b.subscription?.status === 'active' || b.subscription?.status === 'trialing'
          const aExp = aActive ? (toDate(a.subscription?.currentPeriodEnd)?.getTime() || Infinity) : Infinity
          const bExp = bActive ? (toDate(b.subscription?.currentPeriodEnd)?.getTime() || Infinity) : Infinity
          comparison = aExp - bExp
          break
        }
      }
      return sortOrder === 'desc' ? -comparison : comparison
    })

    return result
  }, [stores, searchTerm, filterPlan, filterExpiration, sortField, sortOrder, productCounts])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterPlan, filterExpiration, sortField, sortOrder])

  const totalPages = Math.ceil(filteredStores.length / itemsPerPage)
  const paginatedStores = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredStores.slice(start, start + itemsPerPage)
  }, [filteredStores, currentPage, itemsPerPage])

  // Fetch product counts only for visible stores (lazy per page)
  useEffect(() => {
    const missingIds = paginatedStores
      .filter(s => productCounts[s.id] === undefined)
      .map(s => s.id)
    if (missingIds.length === 0) return

    let cancelled = false
    const fetchCounts = async () => {
      const counts: Record<string, number> = {}
      await Promise.all(
        missingIds.map(async (id) => {
          try {
            const snap = await getDocs(collection(db, 'stores', id, 'products'))
            counts[id] = snap.size
          } catch (e) {
            console.warn(`Error counting products for ${id}:`, e)
            counts[id] = 0
          }
        })
      )
      if (!cancelled) {
        setProductCounts(prev => ({ ...prev, ...counts }))
      }
    }
    fetchCounts()
    return () => { cancelled = true }
  }, [paginatedStores])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-3.5 h-3.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }
    return sortOrder === 'desc' ? (
      <svg className="w-3.5 h-3.5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    ) : (
      <svg className="w-3.5 h-3.5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Tiendas</h1>
          <span className="px-2.5 py-1 bg-violet-100 text-violet-700 text-sm font-semibold rounded-full">
            {stores.length}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Buscar por nombre o subdominio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/50 backdrop-blur border border-white/80 rounded-xl focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all text-gray-900 placeholder-gray-400"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <select
          value={filterPlan}
          onChange={(e) => setFilterPlan(e.target.value)}
          className="px-4 py-2.5 bg-white/50 backdrop-blur border border-white/80 rounded-xl focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all text-gray-900"
        >
          <option value="all">Todos los planes</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="business">Business</option>
        </select>
        <select
          value={filterExpiration}
          onChange={(e) => setFilterExpiration(e.target.value)}
          className="px-4 py-2.5 bg-white/50 backdrop-blur border border-white/80 rounded-xl focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all text-gray-900"
        >
          <option value="all">Todos los vencimientos</option>
          <option value="expired">⛔ Vencidos</option>
          <option value="3days">🔴 Vence en 3 días</option>
          <option value="7days">🟡 Vence en 7 días</option>
          <option value="14days">🟠 Vence en 14 días</option>
          <option value="30days">🔵 Vence en 30 días</option>
          <option value="none">Sin suscripción</option>
        </select>

        {/* Column visibility toggle */}
        <div className="relative hidden md:block" ref={columnsRef}>
          <button
            onClick={() => setColumnsOpen(o => !o)}
            className="px-4 py-2.5 bg-white/50 backdrop-blur border border-white/80 rounded-xl hover:bg-white/70 transition-all text-gray-900 text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
            </svg>
            Columnas
          </button>
          {columnsOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white/80 backdrop-blur-xl border border-white/80 rounded-xl shadow-lg shadow-black/10 py-2 z-30">
              {COLUMNS.filter(c => !c.alwaysVisible).map(col => (
                <label
                  key={col.id}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-violet-50/50 cursor-pointer transition-colors text-sm text-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={isVisible(col.id)}
                    onChange={() => toggleColumn(col.id)}
                    className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500/30"
                  />
                  {col.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stores Table / Cards */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-black/5 rounded-2xl overflow-hidden">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/50 border-b border-white/60">
                <th className="text-left px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">
                    Tienda
                    <SortIcon field="name" />
                  </div>
                </th>
                {isVisible('subdomain') && (
                <th className="text-left px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" onClick={() => handleSort('subdomain')}>
                  <div className="flex items-center gap-1">
                    Subdominio
                    <SortIcon field="subdomain" />
                  </div>
                </th>
                )}
                {isVisible('country') && (
                <th className="text-left px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">País</th>
                )}
                {isVisible('plan') && (
                <th className="text-left px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" onClick={() => handleSort('plan')}>
                  <div className="flex items-center gap-1">
                    Plan
                    <SortIcon field="plan" />
                  </div>
                </th>
                )}
                {isVisible('products') && (
                <th className="text-left px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" onClick={() => handleSort('products')}>
                  <div className="flex items-center gap-1">
                    Productos
                    <SortIcon field="products" />
                  </div>
                </th>
                )}
                {isVisible('online') && (
                <th className="text-left px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">En línea</th>
                )}
                {isVisible('activity') && (
                <th className="text-left px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" onClick={() => handleSort('lastActivity')}>
                  <div className="flex items-center gap-1">
                    Actividad
                    <SortIcon field="lastActivity" />
                  </div>
                </th>
                )}
                {isVisible('subscription') && (
                <th className="text-left px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Estado Suscripcion</th>
                )}
                {isVisible('expiration') && (
                <th className="text-left px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" onClick={() => handleSort('expiration')}>
                  <div className="flex items-center gap-1">
                    Vencimiento
                    <SortIcon field="expiration" />
                  </div>
                </th>
                )}
                {isVisible('createdAt') && (
                <th className="text-left px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" onClick={() => handleSort('createdAt')}>
                  <div className="flex items-center gap-1">
                    Creada
                    <SortIcon field="createdAt" />
                  </div>
                </th>
                )}
                <th className="text-left px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedStores.map((store) => (
                <tr key={store.id} className="border-b border-white/60 hover:bg-white/40 transition-colors">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {store.logo ? (
                        <img src={store.logo} alt={store.name} className="w-7 h-7 rounded-md object-cover ring-1 ring-black/5" />
                      ) : (
                        <div className="w-7 h-7 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-md flex items-center justify-center">
                          <span className="text-violet-600 font-bold text-xs">{store.name.charAt(0)}</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{store.name}</p>
                        <p className="text-[11px] text-gray-400 truncate">{store.whatsapp}</p>
                      </div>
                    </div>
                  </td>
                  {isVisible('subdomain') && (
                  <td className="px-3 py-2">
                    <a
                      href={`https://${store.subdomain}.shopifree.app`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-violet-600 hover:text-violet-700 hover:underline text-xs font-medium"
                    >
                      {store.subdomain}
                    </a>
                  </td>
                  )}
                  {isVisible('country') && (
                  <td className="px-3 py-2 text-sm">
                    {(() => {
                      const c = countries.find(c => c.code === store.location?.country)
                      return c ? (
                        <span className="flex items-center gap-1.5">
                          <img src={`https://flagcdn.com/w20/${c.code.toLowerCase()}.png`} alt={c.code} className="w-5 h-auto rounded-sm" />
                          {c.name.es}
                        </span>
                      ) : <span className="text-gray-400">-</span>
                    })()}
                  </td>
                  )}
                  {isVisible('plan') && (
                  <td className="px-3 py-2">
                    <span className={`px-3 py-1 text-xs rounded-full font-medium capitalize ${
                      store.plan === 'free' ? 'bg-gray-100/80 text-gray-600' :
                      store.plan === 'pro' ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white' :
                      'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                    }`}>
                      {store.plan}
                    </span>
                  </td>
                  )}
                  {isVisible('products') && (
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ${
                      (productCounts[store.id] || 0) > 0 ? 'bg-violet-50 text-violet-700' : 'bg-gray-50 text-gray-400'
                    }`}>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      {productCounts[store.id] ?? '...'}
                    </span>
                  </td>
                  )}
                  {isVisible('online') && (
                  <td className="px-3 py-2">
                    {(() => {
                      const toDate = (d: any) => {
                        if (!d) return null
                        if (d.toDate) return d.toDate()
                        if (d instanceof Date) return d
                        return new Date(d)
                      }
                      const lastOnline = toDate(store.lastOnlineAt)
                      if (!lastOnline) return <span className="text-gray-400 text-xs">-</span>
                      const isOnline = Date.now() - lastOnline.getTime() < ONLINE_THRESHOLD_MS
                      return isOnline ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-green-50 text-green-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                          En línea
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-gray-50 text-gray-500" title={lastOnline.toLocaleString()}>
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                          {formatRelativeTime(lastOnline)}
                        </span>
                      )
                    })()}
                  </td>
                  )}
                  {isVisible('activity') && (
                  <td className="px-3 py-2">
                    {(() => {
                      const toDate = (d: any) => {
                        if (!d) return null
                        if (d.toDate) return d.toDate()
                        if (d instanceof Date) return d
                        return new Date(d)
                      }
                      const date = toDate(store.updatedAt)
                      if (!date) return <span className="text-gray-400 text-sm">-</span>
                      return (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${getActivityColor(date)}`} title={date.toLocaleString()}>
                          <span className={`w-1.5 h-1.5 rounded-full ${getActivityDot(date)}`}></span>
                          {formatRelativeTime(date)}
                        </span>
                      )
                    })()}
                  </td>
                  )}
                  {isVisible('subscription') && (
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {store.subscription ? (
                        <>
                          <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                            store.subscription.status === 'active' ? 'bg-green-100/80 text-green-700' :
                            store.subscription.status === 'trialing' ? 'bg-blue-100/80 text-blue-700' :
                            store.subscription.status === 'past_due' ? 'bg-yellow-100/80 text-yellow-700' :
                            'bg-red-100/80 text-red-700'
                          }`}>
                            {SUBSCRIPTION_STATUS_LABELS[store.subscription.status] || store.subscription.status}
                          </span>
                          <button
                            onClick={() => handleSyncSubscription(store.id)}
                            disabled={syncingStore === store.id}
                            className="p-1 text-gray-400 hover:text-violet-600 hover:bg-white/50 rounded transition-all disabled:opacity-50"
                            title="Sincronizar con Stripe"
                          >
                            {syncingStore === store.id ? (
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            )}
                          </button>
                        </>
                      ) : (
                        <span className="text-gray-400 text-sm">Sin suscripcion</span>
                      )}
                    </div>
                  </td>
                  )}
                  {isVisible('expiration') && (
                  <td className="px-3 py-2">
                    {(() => {
                      const toDate = (d: any) => {
                        if (!d) return null
                        if (d.toDate) return d.toDate()
                        if (d instanceof Date) return d
                        return new Date(d)
                      }
                      const periodEnd = toDate(store.subscription?.currentPeriodEnd)
                      const trialEnd = toDate(store.subscription?.trialEnd)
                      const info = getExpirationInfo(periodEnd, trialEnd, store.subscription?.status)
                      if (!info.showExpiration) return <span className="text-gray-400 text-xs">-</span>
                      return (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${info.color}`}
                          title={(info.isTrial ? trialEnd : periodEnd)?.toLocaleString()}
                        >
                          {info.text}
                        </span>
                      )
                    })()}
                  </td>
                  )}
                  {isVisible('createdAt') && (
                  <td className="px-3 py-2 text-sm text-gray-500">
                    {store.createdAt
                      ? (store.createdAt as any).toDate
                        ? (store.createdAt as any).toDate().toLocaleDateString()
                        : store.createdAt instanceof Date
                          ? store.createdAt.toLocaleDateString()
                          : new Date(store.createdAt).toLocaleDateString()
                      : '-'
                    }
                  </td>
                  )}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <Link
                        to={localePath('/admin/stores/' + store.id)}
                        className="px-2 py-1 text-xs font-medium text-violet-600 hover:bg-violet-50 rounded-md transition-all"
                      >
                        Ver
                      </Link>
                      <button
                        onClick={() => setEditingStore(store)}
                        className="px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-50 rounded-md transition-all"
                      >
                        Plan
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-white/60">
          {paginatedStores.map((store) => {
            const toDate = (d: any) => {
              if (!d) return null
              if (d.toDate) return d.toDate()
              if (d instanceof Date) return d
              return new Date(d)
            }
            const lastOnline = toDate(store.lastOnlineAt)
            const isOnline = lastOnline ? Date.now() - lastOnline.getTime() < ONLINE_THRESHOLD_MS : false
            const activityDate = toDate(store.updatedAt)
            const periodEndDate = toDate(store.subscription?.currentPeriodEnd)
            const trialEndDate = toDate(store.subscription?.trialEnd)
            const expirationInfo = getExpirationInfo(periodEndDate, trialEndDate, store.subscription?.status)
            const country = countries.find(c => c.code === store.location?.country)
            const createdDate = store.createdAt
              ? (store.createdAt as any).toDate
                ? (store.createdAt as any).toDate().toLocaleDateString()
                : store.createdAt instanceof Date
                  ? store.createdAt.toLocaleDateString()
                  : new Date(store.createdAt).toLocaleDateString()
              : '-'

            return (
            <div key={store.id} className="p-4 hover:bg-white/40 transition-colors">
              {/* Header: Logo + Name + Online dot + Plan */}
              <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  {store.logo ? (
                    <img src={store.logo} alt={store.name} className="w-11 h-11 rounded-xl object-cover ring-1 ring-black/5" />
                  ) : (
                    <div className="w-11 h-11 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-xl flex items-center justify-center">
                      <span className="text-violet-600 font-bold">{store.name.charAt(0)}</span>
                    </div>
                  )}
                  {/* Online indicator on avatar */}
                  {lastOnline && (
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-gray-900 truncate">{store.name}</p>
                    <span className={`px-2.5 py-0.5 text-[11px] rounded-full font-medium capitalize flex-shrink-0 ${
                      store.plan === 'free' ? 'bg-gray-100/80 text-gray-600' :
                      store.plan === 'pro' ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white' :
                      'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                    }`}>
                      {store.plan}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <a
                      href={`https://${store.subdomain}.shopifree.app`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-violet-600 hover:text-violet-700 text-xs font-medium"
                    >
                      {store.subdomain}.shopifree.app
                    </a>
                    {country && <img src={`https://flagcdn.com/w20/${country.code.toLowerCase()}.png`} alt={country.code} className="w-4 h-auto rounded-sm" />}
                  </div>
                </div>
              </div>

              {/* Info grid */}
              <div className="mt-3 ml-[56px] grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                {/* Online status */}
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400 w-14">Estado</span>
                  {lastOnline ? (
                    isOnline ? (
                      <span className="inline-flex items-center gap-1 text-green-700 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        En línea
                      </span>
                    ) : (
                      <span className="text-gray-500">{formatRelativeTime(lastOnline)}</span>
                    )
                  ) : (
                    <span className="text-gray-300">-</span>
                  )}
                </div>

                {/* Products */}
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400 w-14">Prod.</span>
                  <span className={`font-semibold ${(productCounts[store.id] || 0) > 0 ? 'text-violet-700' : 'text-gray-400'}`}>
                    {productCounts[store.id] ?? '...'}
                  </span>
                </div>

                {/* Activity */}
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400 w-14">Actividad</span>
                  {activityDate ? (
                    <span className={`inline-flex items-center gap-1 font-medium ${getActivityColor(activityDate).replace('bg-', '').split(' ')[0]}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${getActivityDot(activityDate)}`}></span>
                      {formatRelativeTime(activityDate)}
                    </span>
                  ) : (
                    <span className="text-gray-300">-</span>
                  )}
                </div>

                {/* Country */}
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400 w-14">País</span>
                  <span className="text-gray-700">{country?.name.es || '-'}</span>
                </div>

                {/* Subscription */}
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400 w-14">Suscr.</span>
                  {store.subscription ? (
                    <div className="flex items-center gap-1">
                      <span className={`px-1.5 py-0.5 rounded-full font-medium ${
                        store.subscription.status === 'active' ? 'bg-green-100/80 text-green-700' :
                        store.subscription.status === 'trialing' ? 'bg-blue-100/80 text-blue-700' :
                        store.subscription.status === 'past_due' ? 'bg-yellow-100/80 text-yellow-700' :
                        'bg-red-100/80 text-red-700'
                      }`}>
                        {SUBSCRIPTION_STATUS_LABELS[store.subscription.status] || store.subscription.status}
                      </span>
                      <button
                        onClick={() => handleSyncSubscription(store.id)}
                        disabled={syncingStore === store.id}
                        className="p-0.5 text-gray-400 hover:text-violet-600 rounded transition-all disabled:opacity-50"
                      >
                        {syncingStore === store.id ? (
                          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        )}
                      </button>
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </div>

                {/* Expiration */}
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400 w-14">Vence</span>
                  {expirationInfo.showExpiration ? (
                    <span className={`px-1.5 py-0.5 rounded-full font-medium ${expirationInfo.color}`}>
                      {expirationInfo.text}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </div>

                {/* Created date */}
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400 w-14">Creada</span>
                  <span className="text-gray-500">{createdDate}</span>
                </div>

                {/* WhatsApp */}
                <div className="flex items-center gap-1.5 col-span-2">
                  <span className="text-gray-400 w-14">WhatsApp</span>
                  <span className="text-gray-700">{store.whatsapp || '-'}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 mt-3 ml-[56px]">
                <Link
                  to={localePath('/admin/stores/' + store.id)}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-violet-500 hover:bg-violet-600 rounded-lg transition-all"
                >
                  Ver detalle
                </Link>
                <button
                  onClick={() => setEditingStore(store)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all"
                >
                  Editar plan
                </button>
              </div>
            </div>
            )
          })}
        </div>

        {filteredStores.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            No se encontraron tiendas
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-3 py-2 border-t border-white/60">
            <p className="text-sm text-gray-500">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, filteredStores.length)} de {filteredStores.length} tiendas
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 text-sm font-medium text-gray-600 hover:bg-violet-50 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                «
              </button>
              <button
                onClick={() => setCurrentPage(p => p - 1)}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 text-sm font-medium text-gray-600 hover:bg-violet-50 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ‹
              </button>
              {(() => {
                const pages: number[] = []
                let start = Math.max(1, currentPage - 2)
                let end = Math.min(totalPages, start + 4)
                if (end - start < 4) start = Math.max(1, end - 4)
                for (let i = start; i <= end; i++) pages.push(i)
                return pages.map(p => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                      p === currentPage
                        ? 'bg-violet-500 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-violet-50'
                    }`}
                  >
                    {p}
                  </button>
                ))
              })()}
              <button
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1.5 text-sm font-medium text-gray-600 hover:bg-violet-50 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ›
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1.5 text-sm font-medium text-gray-600 hover:bg-violet-50 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Plan Modal */}
      {editingStore && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/80 backdrop-blur-2xl border border-white/50 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Editar plan: {editingStore.name}
            </h3>

            <div className="space-y-3 mb-6">
              {['free', 'pro', 'business'].map((plan) => (
                <button
                  key={plan}
                  onClick={() => handleUpdatePlan(editingStore.id, plan as 'free' | 'pro' | 'business')}
                  disabled={saving || editingStore.plan === plan}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between ${
                    editingStore.plan === plan
                      ? 'border-violet-500 bg-violet-50/50'
                      : 'border-white/80 hover:border-violet-300 bg-white/40'
                  }`}
                >
                  <div>
                    <p className="font-semibold text-gray-900 capitalize">{plan}</p>
                    <p className="text-sm text-gray-500">
                      {plan === 'free' ? 'Gratis' : `$${PLAN_FEATURES[plan as keyof typeof PLAN_FEATURES].price}/mes`}
                    </p>
                  </div>
                  {editingStore.plan === plan && (
                    <span className="px-2.5 py-1 bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-xs rounded-lg font-semibold">
                      Actual
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setEditingStore(null)}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100/80 rounded-xl hover:bg-gray-200/80 transition-all font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
