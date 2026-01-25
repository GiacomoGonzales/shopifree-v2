import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { orderService } from '../../lib/firebase'
import { useToast } from '../../components/ui/Toast'
import { getCurrencySymbol } from '../../lib/currency'
import type { Order } from '../../types'

interface Customer {
  phone: string
  name: string
  email?: string
  orderCount: number
  totalSpent: number
  lastOrderDate: Date
  orders: Order[]
}

type SortField = 'name' | 'orderCount' | 'totalSpent' | 'lastOrderDate'
type SortOrder = 'asc' | 'desc'
type OrderCountFilter = 'all' | '1' | '2-5' | '5+'
type SpendingFilter = 'all' | 'low' | 'medium' | 'high'

const ITEMS_PER_PAGE = 10

export default function Customers() {
  const { t, i18n } = useTranslation('dashboard')
  const { store } = useAuth()
  const { showToast } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)

  // Sorting
  const [sortField, setSortField] = useState<SortField>('totalSpent')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  // Filters
  const [orderCountFilter, setOrderCountFilter] = useState<OrderCountFilter>('all')
  const [spendingFilter, setSpendingFilter] = useState<SpendingFilter>('all')
  const [showFilters, setShowFilters] = useState(false)

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
        showToast(t('customers.fetchError'), 'error')
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [store, showToast, t])

  // Extract unique customers from orders
  const customers = useMemo(() => {
    const customerMap = new Map<string, Customer>()

    orders.forEach(order => {
      if (!order.customer?.phone) return

      const phone = order.customer.phone
      const existing = customerMap.get(phone)

      if (existing) {
        existing.orderCount += 1
        existing.totalSpent += order.total || 0
        existing.orders.push(order)
        if (order.customer.name) existing.name = order.customer.name
        if (order.customer.email) existing.email = order.customer.email
        if (order.createdAt && new Date(order.createdAt) > existing.lastOrderDate) {
          existing.lastOrderDate = new Date(order.createdAt)
        }
      } else {
        customerMap.set(phone, {
          phone,
          name: order.customer.name || '-',
          email: order.customer.email,
          orderCount: 1,
          totalSpent: order.total || 0,
          lastOrderDate: order.createdAt ? new Date(order.createdAt) : new Date(),
          orders: [order]
        })
      }
    })

    return Array.from(customerMap.values())
  }, [orders])

  // Calculate stats
  const stats = useMemo(() => {
    const totalCustomers = customers.length
    const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0)
    const avgOrderValue = totalRevenue / Math.max(orders.length, 1)
    const repeatCustomers = customers.filter(c => c.orderCount > 1).length
    const repeatRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0

    return { totalCustomers, totalRevenue, avgOrderValue, repeatCustomers, repeatRate }
  }, [customers, orders])

  // Calculate spending thresholds for filters
  const spendingThresholds = useMemo(() => {
    if (customers.length === 0) return { low: 0, medium: 0 }
    const sorted = [...customers].sort((a, b) => a.totalSpent - b.totalSpent)
    const lowIndex = Math.floor(sorted.length * 0.33)
    const medIndex = Math.floor(sorted.length * 0.66)
    return {
      low: sorted[lowIndex]?.totalSpent || 0,
      medium: sorted[medIndex]?.totalSpent || 0
    }
  }, [customers])

  // Filter and sort customers
  const filteredCustomers = useMemo(() => {
    let result = [...customers]

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter(customer =>
        customer.name.toLowerCase().includes(query) ||
        customer.phone.includes(query) ||
        customer.email?.toLowerCase().includes(query)
      )
    }

    // Order count filter
    if (orderCountFilter !== 'all') {
      result = result.filter(customer => {
        switch (orderCountFilter) {
          case '1': return customer.orderCount === 1
          case '2-5': return customer.orderCount >= 2 && customer.orderCount <= 5
          case '5+': return customer.orderCount > 5
          default: return true
        }
      })
    }

    // Spending filter
    if (spendingFilter !== 'all') {
      result = result.filter(customer => {
        switch (spendingFilter) {
          case 'low': return customer.totalSpent <= spendingThresholds.low
          case 'medium': return customer.totalSpent > spendingThresholds.low && customer.totalSpent <= spendingThresholds.medium
          case 'high': return customer.totalSpent > spendingThresholds.medium
          default: return true
        }
      })
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'orderCount':
          comparison = a.orderCount - b.orderCount
          break
        case 'totalSpent':
          comparison = a.totalSpent - b.totalSpent
          break
        case 'lastOrderDate':
          comparison = a.lastOrderDate.getTime() - b.lastOrderDate.getTime()
          break
      }
      return sortOrder === 'desc' ? -comparison : comparison
    })

    return result
  }, [customers, searchQuery, orderCountFilter, spendingFilter, sortField, sortOrder, spendingThresholds])

  // Pagination
  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE)
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredCustomers.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredCustomers, currentPage])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, orderCountFilter, spendingFilter, sortField, sortOrder])

  const formatDate = (date: Date | undefined) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString(lang === 'es' ? 'es-PE' : 'en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
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

  const activeFiltersCount = [orderCountFilter !== 'all', spendingFilter !== 'all'].filter(Boolean).length

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
          <h1 className="text-xl sm:text-2xl font-bold text-[#1e3a5f]">{t('customers.title')}</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            {customers.length} {customers.length === 1 ? t('customers.customer') : t('customers.customers')}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1e3a5f]">{stats.totalCustomers}</p>
              <p className="text-xs text-gray-500">{t('customers.totalCustomers')}</p>
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
              <p className="text-xs text-gray-500">{t('customers.totalRevenue')}</p>
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
              <p className="text-xs text-gray-500">{t('customers.avgOrder')}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1e3a5f]">{stats.repeatRate.toFixed(0)}%</p>
              <p className="text-xs text-gray-500">{t('customers.repeatRate')}</p>
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
            placeholder={t('customers.searchPlaceholder')}
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
          <span className="font-medium">{t('customers.filters')}</span>
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
            {/* Order count filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('customers.orderCountFilter')}
              </label>
              <div className="flex flex-wrap gap-2">
                {(['all', '1', '2-5', '5+'] as OrderCountFilter[]).map(value => (
                  <button
                    key={value}
                    onClick={() => setOrderCountFilter(value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      orderCountFilter === value
                        ? 'bg-[#1e3a5f] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {value === 'all' ? t('customers.all') : value === '1' ? '1 ' + t('customers.order') : value === '5+' ? '5+ ' + t('customers.ordersLabel') : value + ' ' + t('customers.ordersLabel')}
                  </button>
                ))}
              </div>
            </div>

            {/* Spending filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('customers.spendingFilter')}
              </label>
              <div className="flex flex-wrap gap-2">
                {(['all', 'low', 'medium', 'high'] as SpendingFilter[]).map(value => (
                  <button
                    key={value}
                    onClick={() => setSpendingFilter(value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      spendingFilter === value
                        ? 'bg-[#1e3a5f] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {t(`customers.spending.${value}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Clear filters */}
          {activeFiltersCount > 0 && (
            <button
              onClick={() => {
                setOrderCountFilter('all')
                setSpendingFilter('all')
              }}
              className="mt-4 text-sm text-[#2d6cb5] hover:underline"
            >
              {t('customers.clearFilters')}
            </button>
          )}
        </div>
      )}

      {/* Results info */}
      {(searchQuery || activeFiltersCount > 0) && (
        <p className="text-sm text-gray-500">
          {t('customers.showingResults', { count: filteredCustomers.length, total: customers.length })}
        </p>
      )}

      {/* Customers list */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
          <div className="w-20 h-20 bg-gradient-to-br from-[#f0f7ff] to-white border border-[#38bdf8]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-[#2d6cb5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[#1e3a5f] mb-2">
            {searchQuery || activeFiltersCount > 0 ? t('customers.noResults') : t('customers.empty.title')}
          </h3>
          <p className="text-gray-600">
            {searchQuery || activeFiltersCount > 0 ? t('customers.tryDifferentFilters') : t('customers.empty.description')}
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
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      {t('customers.customer')}
                      <SortIcon field="name" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('customers.phone')}
                  </th>
                  <th
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('orderCount')}
                  >
                    <div className="flex items-center gap-1">
                      {t('customers.orders')}
                      <SortIcon field="orderCount" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('totalSpent')}
                  >
                    <div className="flex items-center gap-1">
                      {t('customers.totalSpent')}
                      <SortIcon field="totalSpent" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('lastOrderDate')}
                  >
                    <div className="flex items-center gap-1">
                      {t('customers.lastOrder')}
                      <SortIcon field="lastOrderDate" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('customers.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedCustomers.map(customer => (
                  <tr key={customer.phone} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-[#1e3a5f]">{customer.name}</p>
                        {customer.email && (
                          <p className="text-sm text-gray-500">{customer.email}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {customer.phone}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                        customer.orderCount > 5 ? 'bg-green-100 text-green-800' :
                        customer.orderCount > 1 ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {customer.orderCount}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-[#2d6cb5]">
                        {currencySymbol}{customer.totalSpent.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(customer.lastOrderDate)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedCustomer(customer)}
                        className="text-[#2d6cb5] hover:text-[#1e3a5f] font-medium text-sm"
                      >
                        {t('customers.view')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {paginatedCustomers.map(customer => (
              <div
                key={customer.phone}
                className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => setSelectedCustomer(customer)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-[#1e3a5f]">{customer.name}</span>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                    customer.orderCount > 5 ? 'bg-green-100 text-green-800' :
                    customer.orderCount > 1 ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {customer.orderCount} {customer.orderCount === 1 ? t('customers.order') : t('customers.ordersLabel')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">{customer.phone}</p>
                  <span className="font-bold text-[#2d6cb5]">
                    {currencySymbol}{customer.totalSpent.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                {t('customers.pagination', {
                  start: (currentPage - 1) * ITEMS_PER_PAGE + 1,
                  end: Math.min(currentPage * ITEMS_PER_PAGE, filteredCustomers.length),
                  total: filteredCustomers.length
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

      {/* Customer detail modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-[#1e3a5f]">{selectedCustomer.name}</h3>
                <p className="text-sm text-gray-500">{selectedCustomer.phone}</p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal content */}
            <div className="p-6 space-y-6">
              {/* Customer stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-[#f0f7ff] to-white border border-[#38bdf8]/20 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-1">{t('customers.totalOrders')}</p>
                  <p className="text-2xl font-bold text-[#1e3a5f]">{selectedCustomer.orderCount}</p>
                </div>
                <div className="bg-gradient-to-br from-[#f0f7ff] to-white border border-[#38bdf8]/20 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-1">{t('customers.totalSpent')}</p>
                  <p className="text-2xl font-bold text-[#2d6cb5]">
                    {currencySymbol}{selectedCustomer.totalSpent.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Contact info */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">{t('customers.contactInfo')}</h4>
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <p className="text-sm">
                    <span className="text-gray-500">{t('customers.phone')}:</span>{' '}
                    <a href={`tel:${selectedCustomer.phone}`} className="font-medium text-[#2d6cb5] hover:underline">
                      {selectedCustomer.phone}
                    </a>
                  </p>
                  {selectedCustomer.email && (
                    <p className="text-sm">
                      <span className="text-gray-500">Email:</span>{' '}
                      <a href={`mailto:${selectedCustomer.email}`} className="font-medium text-[#2d6cb5] hover:underline">
                        {selectedCustomer.email}
                      </a>
                    </p>
                  )}
                </div>
              </div>

              {/* Order history */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">{t('customers.orderHistory')}</h4>
                <div className="bg-gray-50 rounded-xl divide-y divide-gray-200 max-h-60 overflow-y-auto">
                  {selectedCustomer.orders
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map(order => (
                      <div key={order.id} className="p-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-[#1e3a5f]">{order.orderNumber}</span>
                          <span className="font-semibold text-[#2d6cb5]">
                            {currencySymbol}{(order.total || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <span>{formatDate(order.createdAt)}</span>
                          <span className="capitalize">{order.status}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* WhatsApp button */}
              <a
                href={`https://wa.me/${selectedCustomer.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-all"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                {t('customers.contactWhatsApp')}
              </a>
            </div>

            {/* Modal footer */}
            <div className="p-6 border-t border-gray-100">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all"
              >
                {t('customers.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
