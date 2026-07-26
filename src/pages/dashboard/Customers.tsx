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

  // Inline edit of a customer's contact data. Customers aren't their own
  // documents — they're aggregated from orders — so saving propagates the new
  // name/phone/email to every order belonging to this customer.
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [savingCustomer, setSavingCustomer] = useState(false)

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

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter(customer =>
        customer.name.toLowerCase().includes(query) ||
        customer.phone.includes(query) ||
        customer.email?.toLowerCase().includes(query)
      )
    }

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

    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'name': comparison = a.name.localeCompare(b.name); break
        case 'orderCount': comparison = a.orderCount - b.orderCount; break
        case 'totalSpent': comparison = a.totalSpent - b.totalSpent; break
        case 'lastOrderDate': comparison = a.lastOrderDate.getTime() - b.lastOrderDate.getTime(); break
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

  const closeModal = () => {
    setSelectedCustomer(null)
    setEditMode(false)
  }

  const startEdit = () => {
    if (!selectedCustomer) return
    setEditName(selectedCustomer.name === '-' ? '' : selectedCustomer.name)
    setEditPhone(selectedCustomer.phone)
    setEditEmail(selectedCustomer.email || '')
    setEditMode(true)
  }

  const handleSaveCustomer = async () => {
    if (!store || !selectedCustomer) return
    const phone = editPhone.trim()
    if (!phone) {
      showToast(t('customers.phoneRequired', { defaultValue: 'El teléfono es obligatorio' }), 'error')
      return
    }
    const name = editName.trim()
    const email = editEmail.trim()
    const newCustomer: { name?: string; phone: string; email?: string } = { phone }
    if (name) newCustomer.name = name
    if (email) newCustomer.email = email

    setSavingCustomer(true)
    try {
      const targetOrders = selectedCustomer.orders.filter(o => o.id)
      await Promise.all(targetOrders.map(o => orderService.update(store.id, o.id!, { customer: newCustomer })))

      // Reflect the change locally so the aggregated list recomputes.
      const ids = new Set(targetOrders.map(o => o.id))
      setOrders(prev => prev.map(o => (ids.has(o.id) ? { ...o, customer: newCustomer } : o)))

      showToast(t('customers.updated', { defaultValue: 'Cliente actualizado' }), 'success')
      closeModal()
    } catch (error) {
      console.error('Error updating customer:', error)
      showToast(t('customers.updateError', { defaultValue: 'No se pudo actualizar el cliente' }), 'error')
    } finally {
      setSavingCustomer(false)
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

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-3.5 h-3.5 text-[#C3CFDB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }
    return sortOrder === 'desc' ? (
      <svg className="w-3.5 h-3.5 text-[#0284C7]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    ) : (
      <svg className="w-3.5 h-3.5 text-[#0284C7]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    )
  }

  const activeFiltersCount = [orderCountFilter !== 'all', spendingFilter !== 'all'].filter(Boolean).length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a5f]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#1e3a5f]">{t('customers.title')}</h1>
          <p className="text-[#8898AA] mt-1">
            {customers.length} {customers.length === 1 ? t('customers.customer') : t('customers.customers')}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: t('customers.totalCustomers'), value: String(stats.totalCustomers), color: 'blue' },
          { label: t('customers.totalRevenue'), value: `${currencySymbol}${stats.totalRevenue.toFixed(0)}`, color: 'emerald' },
          { label: t('customers.avgOrder'), value: `${currencySymbol}${stats.avgOrderValue.toFixed(0)}`, color: 'violet' },
          { label: t('customers.repeatRate'), value: `${stats.repeatRate.toFixed(0)}%`, color: 'amber' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-[14px] border border-[#E6EBF1] p-4">
            <p className="text-xs text-[#8898AA] mb-1">{card.label}</p>
            <p className="text-xl font-bold text-[#1e3a5f]">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-[#A9B6C6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('customers.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2 bg-white border border-[#E6EBF1] rounded-lg text-sm placeholder:text-[#A9B6C6] focus:outline-none focus:ring-2 focus:ring-[#0284C7]/20 focus:border-[#0284C7] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#A9B6C6] hover:text-[#425466]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
            showFilters || activeFiltersCount > 0
              ? 'bg-[#1e3a5f] text-white border-gray-900'
              : 'bg-white text-[#425466] border-[#E6EBF1] hover:bg-[#F6F9FC]'
          }`}
        >
{t('customers.filters')}
          {activeFiltersCount > 0 && (
            <span className="w-5 h-5 bg-white text-[#1e3a5f] rounded-full text-xs font-medium flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-white rounded-[14px] border border-[#E6EBF1] p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#8898AA] uppercase tracking-wider mb-2">
                {t('customers.orderCountFilter')}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(['all', '1', '2-5', '5+'] as OrderCountFilter[]).map(value => (
                  <button
                    key={value}
                    onClick={() => setOrderCountFilter(value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      orderCountFilter === value
                        ? 'bg-[#1e3a5f] text-white'
                        : 'bg-[#F1F5F9] text-[#425466] hover:bg-[#E1E8EF]'
                    }`}
                  >
                    {value === 'all' ? t('customers.all') : value === '1' ? '1 ' + t('customers.order') : value === '5+' ? '5+ ' + t('customers.ordersLabel') : value + ' ' + t('customers.ordersLabel')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8898AA] uppercase tracking-wider mb-2">
                {t('customers.spendingFilter')}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(['all', 'low', 'medium', 'high'] as SpendingFilter[]).map(value => (
                  <button
                    key={value}
                    onClick={() => setSpendingFilter(value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      spendingFilter === value
                        ? 'bg-[#1e3a5f] text-white'
                        : 'bg-[#F1F5F9] text-[#425466] hover:bg-[#E1E8EF]'
                    }`}
                  >
                    {t(`customers.spending.${value}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {activeFiltersCount > 0 && (
            <button
              onClick={() => { setOrderCountFilter('all'); setSpendingFilter('all') }}
              className="mt-3 text-xs text-[#0284C7] hover:underline"
            >
              {t('customers.clearFilters')}
            </button>
          )}
        </div>
      )}

      {/* Results info */}
      {(searchQuery || activeFiltersCount > 0) && (
        <p className="text-sm text-[#A9B6C6]">
          {t('customers.showingResults', { count: filteredCustomers.length, total: customers.length })}
        </p>
      )}

      {/* Customers list */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-[14px] border border-[#E6EBF1] p-12 text-center">
          <div className="w-16 h-16 bg-[#F1F5F9] rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#A9B6C6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-[#1e3a5f] mb-1">
            {searchQuery || activeFiltersCount > 0 ? t('customers.noResults') : t('customers.empty.title')}
          </h3>
          <p className="text-sm text-[#8898AA]">
            {searchQuery || activeFiltersCount > 0 ? t('customers.tryDifferentFilters') : t('customers.empty.description')}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-[14px] border border-[#E6EBF1] overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F6F9FC]">
                <tr>
                  <th
                    className="px-5 py-3 text-left text-xs font-medium text-[#8898AA] uppercase tracking-wider cursor-pointer hover:text-[#425466]"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      {t('customers.customer')}
                      <SortIcon field="name" />
                    </div>
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-[#8898AA] uppercase tracking-wider">
                    {t('customers.phone')}
                  </th>
                  <th
                    className="px-5 py-3 text-left text-xs font-medium text-[#8898AA] uppercase tracking-wider cursor-pointer hover:text-[#425466]"
                    onClick={() => handleSort('orderCount')}
                  >
                    <div className="flex items-center gap-1">
                      {t('customers.orders')}
                      <SortIcon field="orderCount" />
                    </div>
                  </th>
                  <th
                    className="px-5 py-3 text-left text-xs font-medium text-[#8898AA] uppercase tracking-wider cursor-pointer hover:text-[#425466]"
                    onClick={() => handleSort('totalSpent')}
                  >
                    <div className="flex items-center gap-1">
                      {t('customers.totalSpent')}
                      <SortIcon field="totalSpent" />
                    </div>
                  </th>
                  <th
                    className="px-5 py-3 text-left text-xs font-medium text-[#8898AA] uppercase tracking-wider cursor-pointer hover:text-[#425466]"
                    onClick={() => handleSort('lastOrderDate')}
                  >
                    <div className="flex items-center gap-1">
                      {t('customers.lastOrder')}
                      <SortIcon field="lastOrderDate" />
                    </div>
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-[#8898AA] uppercase tracking-wider">
                    {t('customers.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedCustomers.map(customer => (
                  <tr key={customer.phone} className="hover:bg-[#F6F9FC]/50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-[#1e3a5f]">{customer.name}</p>
                      {customer.email && (
                        <p className="text-xs text-[#A9B6C6]">{customer.email}</p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm text-[#8898AA]">
                      {customer.phone}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        customer.orderCount > 5 ? 'bg-green-50 text-green-700' :
                        customer.orderCount > 1 ? 'bg-[#F0F9FF] text-[#0369A1]' :
                        'bg-[#F1F5F9] text-[#425466]'
                      }`}>
                        {customer.orderCount}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-sm font-medium text-[#1e3a5f]">
                        {currencySymbol}{customer.totalSpent.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-[#A9B6C6]">
                      {formatDate(customer.lastOrderDate)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => setSelectedCustomer(customer)}
                        className="text-[#0284C7] hover:text-[#0369A1] text-sm font-medium"
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
          <div className="md:hidden divide-y divide-gray-50">
            {paginatedCustomers.map(customer => (
              <div
                key={customer.phone}
                className="p-4 hover:bg-[#F6F9FC]/50 transition-colors cursor-pointer"
                onClick={() => setSelectedCustomer(customer)}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-[#1e3a5f]">{customer.name}</span>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    customer.orderCount > 5 ? 'bg-green-50 text-green-700' :
                    customer.orderCount > 1 ? 'bg-[#F0F9FF] text-[#0369A1]' :
                    'bg-[#F1F5F9] text-[#425466]'
                  }`}>
                    {customer.orderCount} {customer.orderCount === 1 ? t('customers.order') : t('customers.ordersLabel')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#A9B6C6]">{customer.phone}</p>
                  <span className="text-sm font-medium text-[#1e3a5f]">
                    {currencySymbol}{customer.totalSpent.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-[#E6EBF1]">
              <p className="text-xs text-[#A9B6C6]">
                {t('customers.pagination', {
                  start: (currentPage - 1) * ITEMS_PER_PAGE + 1,
                  end: Math.min(currentPage * ITEMS_PER_PAGE, filteredCustomers.length),
                  total: filteredCustomers.length
                })}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-[#E6EBF1] text-[#8898AA] hover:bg-[#F6F9FC] disabled:opacity-30 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

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
                        className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                          currentPage === pageNum
                            ? 'bg-[#1e3a5f] text-white'
                            : 'text-[#8898AA] hover:bg-[#F1F5F9]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>

                <span className="sm:hidden text-xs text-[#8898AA]">
                  {currentPage} / {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-[#E6EBF1] text-[#8898AA] hover:bg-[#F6F9FC] disabled:opacity-30 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b border-[#E6EBF1]">
              <div>
                <h3 className="text-base font-bold text-[#1e3a5f]">
                  {editMode ? t('customers.editCustomer', { defaultValue: 'Editar cliente' }) : selectedCustomer.name}
                </h3>
                <p className="text-sm text-[#A9B6C6]">{selectedCustomer.phone}</p>
              </div>
              <div className="flex items-center gap-1">
                {!editMode && (
                  <button
                    onClick={startEdit}
                    className="p-1.5 text-[#A9B6C6] hover:text-[#0284C7] hover:bg-[#F0F9FF] rounded-lg transition-all"
                    aria-label={t('customers.edit', { defaultValue: 'Editar' })}
                    title={t('customers.edit', { defaultValue: 'Editar' })}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={closeModal}
                  className="p-1.5 text-[#A9B6C6] hover:text-[#425466] hover:bg-[#F1F5F9] rounded-lg transition-all"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal content */}
            <div className="p-5 space-y-5">
              {editMode && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[#8898AA] uppercase tracking-wider mb-1.5">
                      {t('customers.customer')}
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder={t('customers.customer')}
                      className="w-full px-3 py-2 bg-white border border-[#E6EBF1] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0284C7]/20 focus:border-[#0284C7] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#8898AA] uppercase tracking-wider mb-1.5">
                      {t('customers.phone')}
                    </label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder={t('customers.phone')}
                      className="w-full px-3 py-2 bg-white border border-[#E6EBF1] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0284C7]/20 focus:border-[#0284C7] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#8898AA] uppercase tracking-wider mb-1.5">
                      Email
                    </label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="email@ejemplo.com"
                      className="w-full px-3 py-2 bg-white border border-[#E6EBF1] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0284C7]/20 focus:border-[#0284C7] transition-all"
                    />
                  </div>
                  <p className="text-xs text-[#A9B6C6]">
                    {t('customers.editHint', { defaultValue: 'Los cambios se aplicarán a todos los pedidos de este cliente.' })}
                  </p>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setEditMode(false)}
                      disabled={savingCustomer}
                      className="flex-1 py-2.5 border border-[#E6EBF1] text-[#425466] rounded-xl text-sm font-medium hover:bg-[#F6F9FC] transition-all disabled:opacity-50"
                    >
                      {t('customers.cancel', { defaultValue: 'Cancelar' })}
                    </button>
                    <button
                      onClick={handleSaveCustomer}
                      disabled={savingCustomer}
                      className="flex-1 py-2.5 bg-[#1e3a5f] text-white rounded-xl text-sm font-medium hover:bg-[#1e3a5f] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {savingCustomer && <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>}
                      {t('customers.save', { defaultValue: 'Guardar' })}
                    </button>
                  </div>
                </div>
              )}
              {!editMode && (<>
              {/* Customer stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#F6F9FC] rounded-xl p-4">
                  <p className="text-xs text-[#8898AA] mb-1">{t('customers.totalOrders')}</p>
                  <p className="text-xl font-bold text-[#1e3a5f]">{selectedCustomer.orderCount}</p>
                </div>
                <div className="bg-[#F6F9FC] rounded-xl p-4">
                  <p className="text-xs text-[#8898AA] mb-1">{t('customers.totalSpent')}</p>
                  <p className="text-xl font-bold text-[#1e3a5f]">
                    {currencySymbol}{selectedCustomer.totalSpent.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Contact info */}
              <div>
                <h4 className="text-xs font-medium text-[#8898AA] uppercase tracking-wider mb-2">{t('customers.contactInfo')}</h4>
                <div className="bg-[#F6F9FC] rounded-xl p-4 space-y-2">
                  <p className="text-sm">
                    <span className="text-[#A9B6C6]">{t('customers.phone')}:</span>{' '}
                    <a href={`tel:${selectedCustomer.phone}`} className="font-medium text-[#0284C7] hover:underline">
                      {selectedCustomer.phone}
                    </a>
                  </p>
                  {selectedCustomer.email && (
                    <p className="text-sm">
                      <span className="text-[#A9B6C6]">Email:</span>{' '}
                      <a href={`mailto:${selectedCustomer.email}`} className="font-medium text-[#0284C7] hover:underline">
                        {selectedCustomer.email}
                      </a>
                    </p>
                  )}
                </div>
              </div>

              {/* Order history */}
              <div>
                <h4 className="text-xs font-medium text-[#8898AA] uppercase tracking-wider mb-2">{t('customers.orderHistory')}</h4>
                <div className="bg-[#F6F9FC] rounded-xl divide-y divide-[#EEF2F6] max-h-52 overflow-y-auto">
                  {selectedCustomer.orders
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map(order => (
                      <div key={order.id} className="px-4 py-3">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-sm font-medium text-[#1e3a5f]">{order.orderNumber}</span>
                          <span className="text-sm font-medium text-[#1e3a5f]">
                            {currencySymbol}{(order.total || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-[#A9B6C6]">
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
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-all"
              >
{t('customers.contactWhatsApp')}
              </a>
              </>)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
