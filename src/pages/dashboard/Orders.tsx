import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { orderService } from '../../lib/firebase'
import { useToast } from '../../components/ui/Toast'
import { getCurrencySymbol } from '../../lib/currency'
import type { Order } from '../../types'

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'

const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  confirmed: { bg: 'bg-blue-100', text: 'text-blue-800' },
  preparing: { bg: 'bg-orange-100', text: 'text-orange-800' },
  ready: { bg: 'bg-purple-100', text: 'text-purple-800' },
  delivered: { bg: 'bg-green-100', text: 'text-green-800' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-800' }
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
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)

  const lang = i18n.language?.startsWith('es') ? 'es' : 'en'

  useEffect(() => {
    const fetchOrders = async () => {
      if (!store) return

      try {
        const ordersData = await orderService.getAll(store.id, 100)
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

  const filteredOrders = orders.filter(order => {
    // Filter by status
    if (filterStatus !== 'all' && order.status !== filterStatus) {
      return false
    }
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      const matchesOrderNumber = order.orderNumber?.toLowerCase().includes(query)
      const matchesName = order.customer?.name?.toLowerCase().includes(query)
      const matchesPhone = order.customer?.phone?.includes(query)
      return matchesOrderNumber || matchesName || matchesPhone
    }
    return true
  })

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

      {/* Search bar */}
      <div className="relative">
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

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            filterStatus === 'all'
              ? 'bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white shadow-lg shadow-[#1e3a5f]/20'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {t('orders.all')} ({orders.length})
        </button>
        {(['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'] as OrderStatus[]).map(status => {
          const count = orders.filter(o => o.status === status).length
          return (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filterStatus === status
                  ? 'bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white shadow-lg shadow-[#1e3a5f]/20'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {STATUS_LABELS[status][lang]} ({count})
            </button>
          )
        })}
      </div>

      {/* Orders list */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
          <div className="w-20 h-20 bg-gradient-to-br from-[#f0f7ff] to-white border border-[#38bdf8]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-[#2d6cb5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[#1e3a5f] mb-2">
            {t('orders.empty.title')}
          </h3>
          <p className="text-gray-600">
            {t('orders.empty.description')}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('orders.orderNumber')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('orders.customer')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('orders.total')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('orders.status')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('orders.date')}
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('orders.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map(order => (
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
                        {getCurrencySymbol(store?.currency || 'USD')}{order.total?.toFixed(2) || '0.00'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[order.status as OrderStatus]?.bg || 'bg-gray-100'} ${STATUS_COLORS[order.status as OrderStatus]?.text || 'text-gray-800'}`}>
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
            {filteredOrders.map(order => (
              <div
                key={order.id}
                className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => setSelectedOrder(order)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-[#1e3a5f]">{order.orderNumber}</span>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[order.status as OrderStatus]?.bg || 'bg-gray-100'} ${STATUS_COLORS[order.status as OrderStatus]?.text || 'text-gray-800'}`}>
                    {STATUS_LABELS[order.status as OrderStatus]?.[lang] || order.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{order.customer?.name || '-'}</p>
                    <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                  </div>
                  <span className="font-bold text-[#2d6cb5]">
                    {getCurrencySymbol(store?.currency || 'USD')}{order.total?.toFixed(2) || '0.00'}
                  </span>
                </div>
              </div>
            ))}
          </div>
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
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${
                        selectedOrder.status === status
                          ? `${STATUS_COLORS[status].bg} ${STATUS_COLORS[status].text} ring-2 ring-offset-2 ring-${STATUS_COLORS[status].text.replace('text-', '')}`
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {updatingStatus === selectedOrder.id && selectedOrder.status !== status ? (
                        <span className="flex items-center gap-1">
                          <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        </span>
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
                  <p className="text-sm"><span className="text-gray-500">{t('orders.phone')}:</span> <span className="font-medium">{selectedOrder.customer?.phone || '-'}</span></p>
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
                        {selectedOrder.deliveryAddress.reference && ` (${selectedOrder.deliveryAddress.reference})`}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* Order items */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">{t('orders.items')}</h4>
                <div className="bg-gray-50 rounded-xl divide-y divide-gray-200">
                  {selectedOrder.items?.map((item, index) => (
                    <div key={index} className="p-4 flex justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{item.productName}</p>
                        <p className="text-sm text-gray-500">x{item.quantity}</p>
                      </div>
                      <p className="font-semibold text-[#2d6cb5]">
                        {getCurrencySymbol(store?.currency || 'USD')}{(item.itemTotal || item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <span className="text-lg font-semibold text-gray-900">{t('orders.total')}</span>
                <span className="text-xl font-bold text-[#1e3a5f]">
                  {getCurrencySymbol(store?.currency || 'USD')}{selectedOrder.total?.toFixed(2) || '0.00'}
                </span>
              </div>

              {/* Payment info */}
              <div className="pt-2">
                <p className="text-sm text-gray-500">
                  {t('orders.paymentMethod')}: <span className="font-medium capitalize">{selectedOrder.paymentMethod}</span>
                </p>
              </div>
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
