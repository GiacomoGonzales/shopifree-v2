import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { orderService } from '../../lib/firebase'
import { useToast } from '../../components/ui/Toast'
import { getCurrencySymbol } from '../../lib/currency'
import type { Order } from '../../types'

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
type SortField = 'orderNumber' | 'customer' | 'total' | 'createdAt'
type SortOrder = 'asc' | 'desc'
type DateFilter = 'all' | 'today' | 'week' | 'month'
type PaymentFilter = 'all' | 'whatsapp' | 'mercadopago' | 'transfer'

const ITEMS_PER_PAGE = 10

const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string; dot: string }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500' },
  confirmed: { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' },
  preparing: { bg: 'bg-orange-100', text: 'text-orange-800', dot: 'bg-orange-500' },
  ready: { bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-500' },
  delivered: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' }
}

const STATUS_LABELS: Record<OrderStatus, Record<string, string>> = {
  pending: { es: 'Pendiente', en: 'Pending' },
  confirmed: { es: 'Confirmado', en: 'Confirmed' },
  preparing: { es: 'Preparando', en: 'Preparing' },
  ready: { es: 'Listo', en: 'Ready' },
  delivered: { es: 'Entregado', en: 'Delivered' },
  cancelled: { es: 'Cancelado', en: 'Cancelled' }
}

export default function Orders() {
  const { t, i18n } = useTranslation('dashboard')
  const { store } = useAuth()
  const { showToast } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)

  // Search
  const [searchQuery, setSearchQuery] = useState('')

  // Filters
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all')
  const [showFilters, setShowFilters] = useState(false)

  // Sorting
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)

  const lang = i18n.language?.startsWith('es') ? 'es' : 'en'
  const currencySymbol = getCurrencySymbol(store?.currency || 'USD')

  useEffect(() => {
    const fetchOrders = async () => {
      if (!store) return

      try {
        const ordersData = await orderService.getAll(store.id, 500)
        setOrders(ordersData)
      } catch (error) {
        console.error('Error fetching orders:', error)
        showToast(t('orders.fetchError'), 'error')
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [store, showToast, t])

  // Calculate stats
  const stats = useMemo(() => {
    const totalOrders = orders.length
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0)
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    const pendingOrders = orders.filter(o => o.status === 'pending').length
    const todayOrders = orders.filter(o => {
      const orderDate = new Date(o.createdAt)
      const today = new Date()
      return orderDate.toDateString() === today.toDateString()
    }).length

    return { totalOrders, totalRevenue, avgOrderValue, pendingOrders, todayOrders }
  }, [orders])

  // Filter orders
  const filteredOrders = useMemo(() => {
    let result = [...orders]

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter(order =>
        order.orderNumber?.toLowerCase().includes(query) ||
        order.customer?.name?.toLowerCase().includes(query) ||
        order.customer?.phone?.includes(query)
      )
    }

    // Status filter
    if (filterStatus !== 'all') {
      result = result.filter(order => order.status === filterStatus)
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date()
      result = result.filter(order => {
        const orderDate = new Date(order.createdAt)
        switch (dateFilter) {
          case 'today':
            return orderDate.toDateString() === now.toDateString()
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            return orderDate >= weekAgo
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            return orderDate >= monthAgo
          default:
            return true
        }
      })
    }

    // Payment filter
    if (paymentFilter !== 'all') {
      result = result.filter(order => order.paymentMethod === paymentFilter)
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'orderNumber':
          comparison = (a.orderNumber || '').localeCompare(b.orderNumber || '')
          break
        case 'customer':
          comparison = (a.customer?.name || '').localeCompare(b.customer?.name || '')
          break
        case 'total':
          comparison = (a.total || 0) - (b.total || 0)
          break
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
      }
      return sortOrder === 'desc' ? -comparison : comparison
    })

    return result
  }, [orders, searchQuery, filterStatus, dateFilter, paymentFilter, sortField, sortOrder])

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE)
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredOrders.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredOrders, currentPage])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterStatus, dateFilter, paymentFilter, sortField, sortOrder])

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    if (!store) return

    setUpdatingStatus(orderId)
    try {
      await orderService.updateStatus(store.id, orderId, newStatus)
      setOrders(orders.map(o =>
        o.id === orderId ? { ...o, status: newStatus, updatedAt: new Date() } : o
      ))
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus, updatedAt: new Date() })
      }
      showToast(t('orders.statusUpdated'), 'success')
    } catch (error) {
      console.error('Error updating order status:', error)
      showToast(t('orders.statusError'), 'error')
    } finally {
      setUpdatingStatus(null)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const formatDate = (date: Date | undefined) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString(lang === 'es' ? 'es-PE' : 'en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatShortDate = (date: Date | undefined) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString(lang === 'es' ? 'es-PE' : 'en-US', {
      day: '2-digit',
      month: 'short'
    })
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }
    return sortOrder === 'desc' ? (
      <svg className="w-4 h-4 text-[#2d6cb5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-[#2d6cb5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    )
  }

  const activeFiltersCount = [
    dateFilter !== 'all',
    paymentFilter !== 'all'
  ].filter(Boolean).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a5f]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1e3a5f]">{t('orders.title')}</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            {orders.length} {orders.length === 1 ? t('orders.order') : t('orders.orders')}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1e3a5f]">{stats.totalOrders}</p>
              <p className="text-xs text-gray-500">{t('orders.totalOrders')}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1e3a5f]">{currencySymbol}{stats.totalRevenue.toFixed(0)}</p>
              <p className="text-xs text-gray-500">{t('orders.totalRevenue')}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1e3a5f]">{currencySymbol}{stats.avgOrderValue.toFixed(0)}</p>
              <p className="text-xs text-gray-500">{t('orders.avgOrder')}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1e3a5f]">{stats.pendingOrders}</p>
              <p className="text-xs text-gray-500">{t('orders.pendingOrders')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search bar */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('orders.searchPlaceholder')}
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2d6cb5]/20 focus:border-[#2d6cb5] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filter toggle button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all ${
            showFilters || activeFiltersCount > 0
              ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="font-medium">{t('orders.filters')}</span>
          {activeFiltersCount > 0 && (
            <span className="w-5 h-5 bg-white text-[#1e3a5f] rounded-full text-xs font-bold flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Date filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('orders.dateFilter.label')}
              </label>
              <div className="flex flex-wrap gap-2">
                {(['all', 'today', 'week', 'month'] as DateFilter[]).map(value => (
                  <button
                    key={value}
                    onClick={() => setDateFilter(value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      dateFilter === value
                        ? 'bg-[#1e3a5f] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {t(`orders.dateFilter.${value}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('orders.paymentFilter.label')}
              </label>
              <div className="flex flex-wrap gap-2">
                {(['all', 'whatsapp', 'mercadopago', 'transfer'] as PaymentFilter[]).map(value => (
                  <button
                    key={value}
                    onClick={() => setPaymentFilter(value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      paymentFilter === value
                        ? 'bg-[#1e3a5f] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {t(`orders.paymentFilter.${value}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Clear filters */}
          {activeFiltersCount > 0 && (
            <button
              onClick={() => {
                setDateFilter('all')
                setPaymentFilter('all')
              }}
              className="mt-4 text-sm text-[#2d6cb5] hover:underline"
            >
              {t('orders.clearFilters')}
            </button>
          )}
        </div>
      )}

      {/* Status filter - always visible */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterStatus('all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            filterStatus === 'all'
              ? 'bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white shadow-lg shadow-[#1e3a5f]/20'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          {t('orders.all')}
          <span className={`px-1.5 py-0.5 rounded-md text-xs ${filterStatus === 'all' ? 'bg-white/20' : 'bg-gray-100'}`}>
            {orders.length}
          </span>
        </button>
        {(['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'] as OrderStatus[]).map(status => {
          const count = orders.filter(o => o.status === status).length
          if (count === 0 && filterStatus !== status) return null
          return (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filterStatus === status
                  ? 'bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white shadow-lg shadow-[#1e3a5f]/20'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[status].dot}`}></span>
              {STATUS_LABELS[status][lang]}
              <span className={`px-1.5 py-0.5 rounded-md text-xs ${filterStatus === status ? 'bg-white/20' : 'bg-gray-100'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Results info */}
      {(searchQuery || filterStatus !== 'all' || activeFiltersCount > 0) && (
        <p className="text-sm text-gray-500">
          {t('orders.showingResults', { count: filteredOrders.length, total: orders.length })}
        </p>
      )}

      {/* Orders list */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
          <div className="w-20 h-20 bg-gradient-to-br from-[#f0f7ff] to-white border border-[#38bdf8]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-[#2d6cb5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[#1e3a5f] mb-2">
            {searchQuery || activeFiltersCount > 0 || filterStatus !== 'all' ? t('orders.noResults') : t('orders.empty.title')}
          </h3>
          <p className="text-gray-600">
            {searchQuery || activeFiltersCount > 0 || filterStatus !== 'all' ? t('orders.tryDifferentFilters') : t('orders.empty.description')}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('orderNumber')}
                  >
                    <div className="flex items-center gap-1">
                      {t('orders.orderNumber')}
                      <SortIcon field="orderNumber" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('customer')}
                  >
                    <div className="flex items-center gap-1">
                      {t('orders.customer')}
                      <SortIcon field="customer" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('total')}
                  >
                    <div className="flex items-center gap-1">
                      {t('orders.total')}
                      <SortIcon field="total" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('orders.status')}
                  </th>
                  <th
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('createdAt')}
                  >
                    <div className="flex items-center gap-1">
                      {t('orders.date')}
                      <SortIcon field="createdAt" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('orders.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedOrders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-semibold text-[#1e3a5f]">{order.orderNumber}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{order.customer?.name || '-'}</p>
                        <p className="text-sm text-gray-500">{order.customer?.phone || '-'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-[#2d6cb5]">
                        {currencySymbol}{order.total?.toFixed(2) || '0.00'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[order.status as OrderStatus]?.bg || 'bg-gray-100'} ${STATUS_COLORS[order.status as OrderStatus]?.text || 'text-gray-800'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[order.status as OrderStatus]?.dot || 'bg-gray-500'}`}></span>
                        {STATUS_LABELS[order.status as OrderStatus]?.[lang] || order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="text-[#2d6cb5] hover:text-[#1e3a5f] font-medium text-sm"
                      >
                        {t('orders.view')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {paginatedOrders.map(order => (
              <div
                key={order.id}
                className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => setSelectedOrder(order)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-[#1e3a5f]">{order.orderNumber}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[order.status as OrderStatus]?.bg || 'bg-gray-100'} ${STATUS_COLORS[order.status as OrderStatus]?.text || 'text-gray-800'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[order.status as OrderStatus]?.dot || 'bg-gray-500'}`}></span>
                    {STATUS_LABELS[order.status as OrderStatus]?.[lang] || order.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{order.customer?.name || '-'}</p>
                    <p className="text-xs text-gray-500">{formatShortDate(order.createdAt)}</p>
                  </div>
                  <span className="font-bold text-[#2d6cb5]">
                    {currencySymbol}{order.total?.toFixed(2) || '0.00'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                {t('orders.pagination', {
                  start: (currentPage - 1) * ITEMS_PER_PAGE + 1,
                  end: Math.min(currentPage * ITEMS_PER_PAGE, filteredOrders.length),
                  total: filteredOrders.length
                })}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Page numbers */}
                <div className="hidden sm:flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                          currentPage === pageNum
                            ? 'bg-[#1e3a5f] text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>

                <span className="sm:hidden text-sm text-gray-600">
                  {currentPage} / {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Order detail modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-[#1e3a5f]">{selectedOrder.orderNumber}</h3>
                <p className="text-sm text-gray-500">{formatDate(selectedOrder.createdAt)}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal content */}
            <div className="p-6 space-y-6">
              {/* Status selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('orders.status')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'] as OrderStatus[]).map(status => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(selectedOrder.id, status)}
                      disabled={updatingStatus === selectedOrder.id}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${
                        selectedOrder.status === status
                          ? `${STATUS_COLORS[status].bg} ${STATUS_COLORS[status].text} ring-2 ring-offset-2`
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[status].dot}`}></span>
                      {updatingStatus === selectedOrder.id && selectedOrder.status !== status ? (
                        <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        STATUS_LABELS[status][lang]
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer info */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">{t('orders.customerInfo')}</h4>
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <p className="text-sm"><span className="text-gray-500">{t('orders.name')}:</span> <span className="font-medium">{selectedOrder.customer?.name || '-'}</span></p>
                  <p className="text-sm">
                    <span className="text-gray-500">{t('orders.phone')}:</span>{' '}
                    <a href={`tel:${selectedOrder.customer?.phone}`} className="font-medium text-[#2d6cb5] hover:underline">
                      {selectedOrder.customer?.phone || '-'}
                    </a>
                  </p>
                  {selectedOrder.customer?.email && (
                    <p className="text-sm"><span className="text-gray-500">Email:</span> <span className="font-medium">{selectedOrder.customer.email}</span></p>
                  )}
                </div>
              </div>

              {/* Delivery info */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">{t('orders.deliveryInfo')}</h4>
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <p className="text-sm">
                    <span className="text-gray-500">{t('orders.method')}:</span>{' '}
                    <span className="font-medium">
                      {selectedOrder.deliveryMethod === 'pickup' ? t('orders.pickup') : t('orders.delivery')}
                    </span>
                  </p>
                  {selectedOrder.deliveryMethod === 'delivery' && selectedOrder.deliveryAddress && (
                    <p className="text-sm">
                      <span className="text-gray-500">{t('orders.address')}:</span>{' '}
                      <span className="font-medium">
                        {selectedOrder.deliveryAddress.street}, {selectedOrder.deliveryAddress.city}
                        {selectedOrder.deliveryAddress.state && `, ${selectedOrder.deliveryAddress.state}`}
                        {selectedOrder.deliveryAddress.reference && ` (${selectedOrder.deliveryAddress.reference})`}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* Order items */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">{t('orders.items')}</h4>
                <div className="bg-gray-50 rounded-xl divide-y divide-gray-200 max-h-48 overflow-y-auto">
                  {selectedOrder.items?.map((item, index) => (
                    <div key={index} className="p-4 flex justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{item.productName}</p>
                        <p className="text-sm text-gray-500">x{item.quantity}</p>
                      </div>
                      <p className="font-semibold text-[#2d6cb5]">
                        {currencySymbol}{(item.itemTotal || item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <span className="text-lg font-semibold text-gray-900">{t('orders.total')}</span>
                <span className="text-xl font-bold text-[#1e3a5f]">
                  {currencySymbol}{selectedOrder.total?.toFixed(2) || '0.00'}
                </span>
              </div>

              {/* Payment info */}
              <div className="pt-2">
                <p className="text-sm text-gray-500">
                  {t('orders.paymentMethod')}: <span className="font-medium capitalize">{selectedOrder.paymentMethod}</span>
                </p>
              </div>

              {/* WhatsApp button */}
              {selectedOrder.customer?.phone && (
                <a
                  href={`https://wa.me/${selectedOrder.customer.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-all"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  {t('orders.contactWhatsApp')}
                </a>
              )}
            </div>

            {/* Modal footer */}
            <div className="p-6 border-t border-gray-100">
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all"
              >
                {t('orders.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
