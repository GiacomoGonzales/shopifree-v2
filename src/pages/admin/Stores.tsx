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
const getExpirationInfo = (
  periodEnd: Date | null,
  trialEnd: Date | null,
  status?: string,
  storeTrialEndsAt?: Date | null,
  storePlanExpiresAt?: Date | null
): { text: string; urgent: boolean; daysLeft: number; showExpiration: boolean; isTrial: boolean } => {
  const now = new Date()

  const isActive = status === 'active' || status === 'trialing'
  const isStripeTrial = status === 'trialing'

  if (isActive) {
    const date = isStripeTrial && trialEnd ? trialEnd : periodEnd
    if (date) {
      const diffMs = date.getTime() - now.getTime()
      const daysLeft = Math.ceil(diffMs / 86400000)
      const prefix = isStripeTrial ? 'Prueba: ' : ''
      return formatExpirationResult(daysLeft, date, prefix, isStripeTrial)
    }
  }

  if (storePlanExpiresAt) {
    const diffMs = storePlanExpiresAt.getTime() - now.getTime()
    const daysLeft = Math.ceil(diffMs / 86400000)
    return formatExpirationResult(daysLeft, storePlanExpiresAt, 'Manual: ', false)
  }

  if (storeTrialEndsAt) {
    const diffMs = storeTrialEndsAt.getTime() - now.getTime()
    const daysLeft = Math.ceil(diffMs / 86400000)
    if (daysLeft >= -7) {
      return formatExpirationResult(daysLeft, storeTrialEndsAt, 'Prueba: ', true)
    }
  }

  return { text: '-', urgent: false, daysLeft: Infinity, showExpiration: false, isTrial: false }
}

const formatExpirationResult = (
  daysLeft: number,
  date: Date,
  prefix: string,
  isTrial: boolean
): { text: string; urgent: boolean; daysLeft: number; showExpiration: boolean; isTrial: boolean } => {
  if (daysLeft < 0) {
    return { text: `${prefix}Vencido`, urgent: true, daysLeft, showExpiration: true, isTrial }
  }
  if (daysLeft === 0) {
    return { text: `${prefix}Hoy`, urgent: true, daysLeft, showExpiration: true, isTrial }
  }
  if (daysLeft <= 3) {
    return { text: `${prefix}${daysLeft}d`, urgent: true, daysLeft, showExpiration: true, isTrial }
  }
  if (daysLeft <= 30) {
    return { text: `${prefix}${daysLeft}d`, urgent: false, daysLeft, showExpiration: true, isTrial }
  }
  return { text: date.toLocaleDateString(), urgent: false, daysLeft, showExpiration: true, isTrial }
}

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes

const LS_KEY = 'admin-stores-columns'

export default function AdminStores() {
  const { showToast } = useToast()
  const { localePath } = useLanguage()
  const [stores, setStores] = useState<(Store & { id: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [editingStore, setEditingStore] = useState<(Store & { id: string }) | null>(null)
  const [planExpiresAt, setPlanExpiresAt] = useState<string>('')
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

  const openEditPlan = (store: Store & { id: string }) => {
    setEditingStore(store)
    if (store.planExpiresAt) {
      const d = store.planExpiresAt instanceof Date
        ? store.planExpiresAt
        : (store.planExpiresAt as any).toDate
          ? (store.planExpiresAt as any).toDate()
          : new Date(store.planExpiresAt as any)
      setPlanExpiresAt(d.toISOString().split('T')[0])
    } else {
      setPlanExpiresAt('')
    }
  }

  const handleUpdatePlan = async (storeId: string, newPlan: 'free' | 'pro' | 'business') => {
    setSaving(true)
    try {
      const updateData: Record<string, unknown> = {
        plan: newPlan,
        updatedAt: new Date()
      }

      if (newPlan === 'free') {
        updateData.planExpiresAt = null
      } else if (planExpiresAt) {
        updateData.planExpiresAt = new Date(planExpiresAt + 'T23:59:59')
      } else {
        updateData.planExpiresAt = null
      }

      await updateDoc(doc(db, 'stores', storeId), updateData)

      const expiresDate = planExpiresAt && newPlan !== 'free' ? new Date(planExpiresAt + 'T23:59:59') : undefined
      setStores(stores.map(s =>
        s.id === storeId ? { ...s, plan: newPlan, planExpiresAt: expiresDate } as typeof s : s
      ))

      const msg = planExpiresAt && newPlan !== 'free'
        ? `Plan ${newPlan} hasta ${planExpiresAt}`
        : `Plan actualizado a ${newPlan}`
      showToast(msg, 'success')
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

      let matchesExpiration = true
      if (filterExpiration !== 'all') {
        const isActive = store.subscription?.status === 'active' || store.subscription?.status === 'trialing'
        const expDate = toDate(store.subscription?.currentPeriodEnd)
        const storeTrialEnd = toDate((store as any).trialEndsAt)

        let effectiveExpDate: Date | null = null
        if (isActive && expDate) {
          effectiveExpDate = expDate
        } else if (storeTrialEnd && storeTrialEnd.getTime() > Date.now() - 7 * 86400000) {
          effectiveExpDate = storeTrialEnd
        }

        if (!effectiveExpDate) {
          matchesExpiration = filterExpiration === 'none'
        } else {
          const daysLeft = Math.ceil((effectiveExpDate.getTime() - Date.now()) / 86400000)
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
          const getEffectiveExp = (store: Store & { id: string }): number => {
            const isActive = store.subscription?.status === 'active' || store.subscription?.status === 'trialing'
            if (isActive) {
              return toDate(store.subscription?.currentPeriodEnd)?.getTime() || Infinity
            }
            const trialEnd = toDate((store as any).trialEndsAt)
            if (trialEnd && trialEnd.getTime() > Date.now() - 7 * 86400000) {
              return trialEnd.getTime()
            }
            return Infinity
          }
          const aExp = getEffectiveExp(a)
          const bExp = getEffectiveExp(b)
          comparison = aExp - bExp
          break
        }
      }
      return sortOrder === 'desc' ? -comparison : comparison
    })

    return result
  }, [stores, searchTerm, filterPlan, filterExpiration, sortField, sortOrder, productCounts])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterPlan, filterExpiration, sortField, sortOrder])

  const totalPages = Math.ceil(filteredStores.length / itemsPerPage)
  const paginatedStores = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredStores.slice(start, start + itemsPerPage)
  }, [filteredStores, currentPage, itemsPerPage])

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
        <svg className="w-3 h-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }
    return sortOrder === 'desc' ? (
      <svg className="w-3 h-3 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    ) : (
      <svg className="w-3 h-3 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-200 border-t-gray-900" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Tiendas</h1>
          <p className="text-sm text-gray-500 mt-0.5">{stores.length} registradas</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Buscar por nombre o subdominio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 placeholder-gray-400"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <select
          value={filterPlan}
          onChange={(e) => setFilterPlan(e.target.value)}
          className="px-3 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
        >
          <option value="all">Todos los planes</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="business">Business</option>
        </select>
        <select
          value={filterExpiration}
          onChange={(e) => setFilterExpiration(e.target.value)}
          className="px-3 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
        >
          <option value="all">Todos los vencimientos</option>
          <option value="expired">Vencidos</option>
          <option value="3days">Vence en 3 días</option>
          <option value="7days">Vence en 7 días</option>
          <option value="14days">Vence en 14 días</option>
          <option value="30days">Vence en 30 días</option>
          <option value="none">Sin suscripción</option>
        </select>

        {/* Column visibility toggle */}
        <div className="relative hidden md:block" ref={columnsRef}>
          <button
            onClick={() => setColumnsOpen(o => !o)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-md hover:bg-gray-50 text-sm text-gray-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
            </svg>
            Columnas
          </button>
          {columnsOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-30">
              {COLUMNS.filter(c => !c.alwaysVisible).map(col => (
                <label
                  key={col.id}
                  className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm text-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={isVisible(col.id)}
                    onChange={() => toggleColumn(col.id)}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                  />
                  {col.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stores Table / Cards */}
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-gray-500 cursor-pointer hover:text-gray-900" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">Tienda <SortIcon field="name" /></div>
                </th>
                {isVisible('subdomain') && (
                <th className="text-left px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-gray-500 cursor-pointer hover:text-gray-900" onClick={() => handleSort('subdomain')}>
                  <div className="flex items-center gap-1">Subdominio <SortIcon field="subdomain" /></div>
                </th>
                )}
                {isVisible('country') && (
                <th className="text-left px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-gray-500">País</th>
                )}
                {isVisible('plan') && (
                <th className="text-left px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-gray-500 cursor-pointer hover:text-gray-900" onClick={() => handleSort('plan')}>
                  <div className="flex items-center gap-1">Plan <SortIcon field="plan" /></div>
                </th>
                )}
                {isVisible('products') && (
                <th className="text-left px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-gray-500 cursor-pointer hover:text-gray-900" onClick={() => handleSort('products')}>
                  <div className="flex items-center gap-1">Productos <SortIcon field="products" /></div>
                </th>
                )}
                {isVisible('online') && (
                <th className="text-left px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-gray-500">En línea</th>
                )}
                {isVisible('activity') && (
                <th className="text-left px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-gray-500 cursor-pointer hover:text-gray-900" onClick={() => handleSort('lastActivity')}>
                  <div className="flex items-center gap-1">Actividad <SortIcon field="lastActivity" /></div>
                </th>
                )}
                {isVisible('subscription') && (
                <th className="text-left px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-gray-500">Suscripción</th>
                )}
                {isVisible('expiration') && (
                <th className="text-left px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-gray-500 cursor-pointer hover:text-gray-900" onClick={() => handleSort('expiration')}>
                  <div className="flex items-center gap-1">Vencimiento <SortIcon field="expiration" /></div>
                </th>
                )}
                {isVisible('createdAt') && (
                <th className="text-left px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-gray-500 cursor-pointer hover:text-gray-900" onClick={() => handleSort('createdAt')}>
                  <div className="flex items-center gap-1">Creada <SortIcon field="createdAt" /></div>
                </th>
                )}
                <th className="text-left px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedStores.map((store) => (
                <tr key={store.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {store.logo ? (
                        <img src={store.logo} alt={store.name} className="w-7 h-7 rounded-md object-cover" />
                      ) : (
                        <div className="w-7 h-7 bg-gray-100 rounded-md flex items-center justify-center">
                          <span className="text-gray-600 font-medium text-xs">{store.name.charAt(0)}</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 text-[13px] truncate">{store.name}</p>
                        <p className="text-[11px] text-gray-500 truncate">{store.whatsapp}</p>
                      </div>
                    </div>
                  </td>
                  {isVisible('subdomain') && (
                  <td className="px-3 py-2">
                    <a
                      href={`https://${store.subdomain}.shopifree.app`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-700 hover:text-gray-900 hover:underline text-[12px] font-medium"
                    >
                      {store.subdomain}
                    </a>
                  </td>
                  )}
                  {isVisible('country') && (
                  <td className="px-3 py-2 text-[13px]">
                    {(() => {
                      const c = countries.find(c => c.code === store.location?.country)
                      return c ? (
                        <span className="flex items-center gap-1.5 text-gray-700">
                          <img src={`https://flagcdn.com/w20/${c.code.toLowerCase()}.png`} alt={c.code} className="w-4 h-auto rounded-sm" />
                          {c.name.es}
                        </span>
                      ) : <span className="text-gray-400">-</span>
                    })()}
                  </td>
                  )}
                  {isVisible('plan') && (
                  <td className="px-3 py-2">
                    <PlanBadge plan={store.plan} />
                  </td>
                  )}
                  {isVisible('products') && (
                  <td className="px-3 py-2">
                    <span className="text-[13px] tabular-nums text-gray-900 font-medium">
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
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-gray-900">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-900" />
                          En línea
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[12px] text-gray-500" title={lastOnline.toLocaleString()}>
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
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
                      if (!date) return <span className="text-gray-400 text-[12px]">-</span>
                      return (
                        <span className="text-[12px] text-gray-700" title={date.toLocaleString()}>
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
                          <StatusBadge status={store.subscription.status}>
                            {SUBSCRIPTION_STATUS_LABELS[store.subscription.status] || store.subscription.status}
                          </StatusBadge>
                          <button
                            onClick={() => handleSyncSubscription(store.id)}
                            disabled={syncingStore === store.id}
                            className="p-1 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                            title="Sincronizar con Stripe"
                          >
                            {syncingStore === store.id ? (
                              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            )}
                          </button>
                        </>
                      ) : (
                        (() => {
                          const toDate = (d: any) => {
                            if (!d) return null
                            if (d.toDate) return d.toDate()
                            if (d instanceof Date) return d
                            return new Date(d)
                          }
                          const trialEndsAt = toDate((store as any).trialEndsAt)
                          if (trialEndsAt && trialEndsAt.getTime() > Date.now()) {
                            return <StatusBadge>Prueba gratuita</StatusBadge>
                          }
                          if (trialEndsAt && trialEndsAt.getTime() <= Date.now()) {
                            return <StatusBadge status="expired">Prueba vencida</StatusBadge>
                          }
                          return <span className="text-gray-400 text-[12px]">Sin suscripción</span>
                        })()
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
                      const storeTrialEndsAt = toDate((store as any).trialEndsAt)
                      const storePlanExpiresAt = toDate((store as any).planExpiresAt)
                      const info = getExpirationInfo(periodEnd, trialEnd, store.subscription?.status, storeTrialEndsAt, storePlanExpiresAt)
                      if (!info.showExpiration) return <span className="text-gray-400 text-[12px]">-</span>
                      return (
                        <span
                          className={`text-[12px] tabular-nums ${info.urgent ? 'font-semibold text-gray-900' : 'text-gray-600'}`}
                          title={(info.isTrial ? (trialEnd || storeTrialEndsAt) : periodEnd)?.toLocaleString()}
                        >
                          {info.text}
                        </span>
                      )
                    })()}
                  </td>
                  )}
                  {isVisible('createdAt') && (
                  <td className="px-3 py-2 text-[12px] text-gray-500 tabular-nums">
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
                        className="px-2 py-1 text-[12px] font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        Ver
                      </Link>
                      <button
                        onClick={() => openEditPlan(store)}
                        className="px-2 py-1 text-[12px] font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 rounded-md transition-colors"
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
        <div className="md:hidden divide-y divide-gray-100">
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
            const storeTrialEndsAt = toDate((store as any).trialEndsAt)
            const storePlanExpiresAt = toDate((store as any).planExpiresAt)
            const expirationInfo = getExpirationInfo(periodEndDate, trialEndDate, store.subscription?.status, storeTrialEndsAt, storePlanExpiresAt)
            const country = countries.find(c => c.code === store.location?.country)
            const createdDate = store.createdAt
              ? (store.createdAt as any).toDate
                ? (store.createdAt as any).toDate().toLocaleDateString()
                : store.createdAt instanceof Date
                  ? store.createdAt.toLocaleDateString()
                  : new Date(store.createdAt).toLocaleDateString()
              : '-'

            return (
            <div key={store.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  {store.logo ? (
                    <img src={store.logo} alt={store.name} className="w-10 h-10 rounded-md object-cover" />
                  ) : (
                    <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center">
                      <span className="text-gray-600 font-medium">{store.name.charAt(0)}</span>
                    </div>
                  )}
                  {lastOnline && (
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${isOnline ? 'bg-gray-900' : 'bg-gray-300'}`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-gray-900 truncate">{store.name}</p>
                    <PlanBadge plan={store.plan} />
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <a
                      href={`https://${store.subdomain}.shopifree.app`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-600 hover:text-gray-900 text-[12px]"
                    >
                      {store.subdomain}.shopifree.app
                    </a>
                    {country && <img src={`https://flagcdn.com/w20/${country.code.toLowerCase()}.png`} alt={country.code} className="w-4 h-auto rounded-sm" />}
                  </div>
                </div>
              </div>

              <div className="mt-3 ml-[52px] grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 w-14">Estado</span>
                  {lastOnline ? (
                    isOnline ? (
                      <span className="inline-flex items-center gap-1 text-gray-900 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-900" />
                        En línea
                      </span>
                    ) : (
                      <span className="text-gray-500">{formatRelativeTime(lastOnline)}</span>
                    )
                  ) : (
                    <span className="text-gray-300">-</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-gray-400 w-14">Prod.</span>
                  <span className="font-medium text-gray-900 tabular-nums">
                    {productCounts[store.id] ?? '...'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-gray-400 w-14">Actividad</span>
                  {activityDate ? (
                    <span className="text-gray-700">{formatRelativeTime(activityDate)}</span>
                  ) : (
                    <span className="text-gray-300">-</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-gray-400 w-14">País</span>
                  <span className="text-gray-700">{country?.name.es || '-'}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-gray-400 w-14">Suscr.</span>
                  {store.subscription ? (
                    <StatusBadge status={store.subscription.status}>
                      {SUBSCRIPTION_STATUS_LABELS[store.subscription.status] || store.subscription.status}
                    </StatusBadge>
                  ) : (
                    storeTrialEndsAt && storeTrialEndsAt.getTime() > Date.now() ? (
                      <StatusBadge>Prueba</StatusBadge>
                    ) : storeTrialEndsAt ? (
                      <StatusBadge status="expired">Prueba vencida</StatusBadge>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-gray-400 w-14">Vence</span>
                  {expirationInfo.showExpiration ? (
                    <span className={`tabular-nums ${expirationInfo.urgent ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                      {expirationInfo.text}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-gray-400 w-14">Creada</span>
                  <span className="text-gray-500 tabular-nums">{createdDate}</span>
                </div>

                <div className="flex items-center gap-2 col-span-2">
                  <span className="text-gray-400 w-14">WhatsApp</span>
                  <span className="text-gray-700">{store.whatsapp || '-'}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-3 ml-[52px]">
                <Link
                  to={localePath('/admin/stores/' + store.id)}
                  className="px-3 py-1.5 text-[12px] font-medium text-white bg-black hover:bg-gray-800 rounded-md transition-colors"
                >
                  Ver detalle
                </Link>
                <button
                  onClick={() => openEditPlan(store)}
                  className="px-3 py-1.5 text-[12px] font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 rounded-md transition-colors"
                >
                  Editar plan
                </button>
              </div>
            </div>
            )
          })}
        </div>

        {filteredStores.length === 0 && (
          <div className="text-center py-12 text-sm text-gray-500">
            No se encontraron tiendas
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-3 py-2 border-t border-gray-200 bg-gray-50">
            <p className="text-[12px] text-gray-500">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, filteredStores.length)} de {filteredStores.length}
            </p>
            <div className="flex items-center gap-0.5">
              <PageBtn onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>«</PageBtn>
              <PageBtn onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>‹</PageBtn>
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
                    className={`px-2.5 py-1 text-[12px] font-medium rounded-md transition-colors ${
                      p === currentPage
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {p}
                  </button>
                ))
              })()}
              <PageBtn onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>›</PageBtn>
              <PageBtn onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>»</PageBtn>
            </div>
          </div>
        )}
      </div>

      {/* Edit Plan Modal */}
      {editingStore && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-gray-200 w-full max-w-md shadow-xl">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">
                Editar plan
              </h3>
              <p className="text-[12px] text-gray-500 mt-0.5 truncate">{editingStore.name}</p>
            </div>

            <div className="px-5 py-4 space-y-2">
              {['free', 'pro', 'business'].map((plan) => (
                <button
                  key={plan}
                  onClick={() => handleUpdatePlan(editingStore.id, plan as 'free' | 'pro' | 'business')}
                  disabled={saving}
                  className={`w-full p-3 rounded-md border text-left transition-colors flex items-center justify-between ${
                    editingStore.plan === plan
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-400 bg-white'
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 capitalize">{plan}</p>
                    <p className="text-[12px] text-gray-500">
                      {plan === 'free' ? 'Gratis' : `$${PLAN_FEATURES[plan as keyof typeof PLAN_FEATURES].price}/mes`}
                    </p>
                  </div>
                  {editingStore.plan === plan && (
                    <span className="px-2 py-0.5 bg-black text-white text-[10px] rounded-sm font-medium tracking-wide">
                      ACTUAL
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="px-5 py-4 border-t border-gray-200 bg-gray-50">
              <label className="block text-[12px] font-medium text-gray-700 mb-1.5">
                Fecha de vencimiento del plan
              </label>
              <input
                type="date"
                value={planExpiresAt}
                onChange={(e) => setPlanExpiresAt(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 text-sm bg-white"
              />
              <p className="text-[11px] text-gray-500 mt-1.5">
                {planExpiresAt
                  ? `El plan vuelve a Free el ${new Date(planExpiresAt).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}`
                  : 'Sin fecha = plan permanente (o hasta que Stripe lo gestione)'}
              </p>
              {planExpiresAt && (
                <button
                  onClick={() => setPlanExpiresAt('')}
                  className="mt-2 text-[11px] text-gray-600 hover:text-gray-900 font-medium underline"
                >
                  Quitar fecha de vencimiento
                </button>
              )}
            </div>

            <div className="px-5 py-3 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setEditingStore(null)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ──────────────── helpers ────────────────

function PlanBadge({ plan }: { plan?: string }) {
  const base = 'px-2 py-0.5 text-[10px] rounded-sm font-medium uppercase tracking-wide'
  if (plan === 'pro') {
    return <span className={`${base} bg-gray-900 text-white`}>Pro</span>
  }
  if (plan === 'business') {
    return <span className={`${base} bg-black text-white`}>Business</span>
  }
  return <span className={`${base} border border-gray-200 text-gray-600`}>Free</span>
}

function StatusBadge({ children, status }: { children: React.ReactNode; status?: string }) {
  const urgent = status === 'past_due' || status === 'unpaid' || status === 'canceled' || status === 'incomplete_expired' || status === 'expired'
  return (
    <span
      className={`px-2 py-0.5 text-[11px] rounded-sm font-medium border ${
        urgent
          ? 'border-gray-900 bg-gray-900 text-white'
          : 'border-gray-200 text-gray-700'
      }`}
    >
      {children}
    </span>
  )
}

function PageBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-2 py-1 text-[12px] font-medium text-gray-700 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  )
}
