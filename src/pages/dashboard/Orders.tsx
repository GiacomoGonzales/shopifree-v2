import { useState, useEffect, useMemo } from 'react'
import { formatModifierNames } from '../../lib/modifiers'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { orderService } from '../../lib/firebase'
import { restoreOrderStock, decrementOrderStock } from '../../lib/stock'
import { markOrdersAsSeen } from '../../hooks/useNewOrdersCount'
import { useToast } from '../../components/ui/Toast'
import { getCurrencySymbol } from '../../lib/currency'
import { apiUrl } from '../../utils/apiBase'
import NewSaleModal from '../../components/dashboard/NewSaleModal'
import HelpTip from '../../components/ui/HelpTip'
import type { Order } from '../../types'
import { CARD, LABEL, INPUT, INPUT_SM } from '../../components/dashboard/tokens'

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
type SortField = 'orderNumber' | 'customer' | 'total' | 'createdAt'
type SortOrder = 'asc' | 'desc'
type DateFilter = 'all' | 'today' | 'week' | 'month'
type PaymentFilter = 'all' | 'whatsapp' | 'mercadopago' | 'transfer'
type ViewFilter = 'all' | 'unpaid'  // 'unpaid' = delivered/preparing/etc. but paymentStatus != paid

type Channel = 'online' | 'in_store' | 'whatsapp' | 'instagram' | 'other'

const CHANNEL_LABELS: Record<Channel, string> = {
  online: 'Online',
  in_store: 'Tienda fisica',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  other: 'Otro',
}

const ITEMS_PER_PAGE = 10

const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string; dot: string }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500' },
  confirmed: { bg: 'bg-[#E0F2FE]', text: 'text-[#075985]', dot: 'bg-[#0284C7]' },
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

// Stacked product thumbnails for an order row, so merchants can tell orders
// apart at a glance without opening each one. Shows up to 4 item images
// (placeholder for items without a stored photo) and a "+N" overflow chip.
function OrderItemThumbs({ items, size = 'sm' }: { items?: Order['items']; size?: 'sm' | 'md' }) {
  if (!items?.length) return null
  const max = 4
  const shown = items.slice(0, max)
  const extra = items.length - shown.length
  const box = size === 'md' ? 'w-7 h-7' : 'w-6 h-6'
  return (
    <div className="flex items-center -space-x-1.5">
      {shown.map((it, i) =>
        it.productImage ? (
          <img
            key={i}
            src={it.productImage}
            alt=""
            className={`${box} rounded-md object-cover ring-2 ring-white bg-[#F1F5F9]`}
          />
        ) : (
          <div key={i} className={`${box} rounded-md bg-[#F1F5F9] ring-2 ring-white flex items-center justify-center`}>
            <span className="text-[0.6rem] font-medium text-[#C3CFDB]">Sin foto</span>
          </div>
        )
      )}
      {extra > 0 && (
        <div className={`${box} rounded-md bg-[#F1F5F9] ring-2 ring-white flex items-center justify-center text-[9px] font-semibold text-[#8898AA]`}>
          +{extra}
        </div>
      )}
    </div>
  )
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
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all')
  const [showFilters, setShowFilters] = useState(false)
  // Hide test orders by default so the merchant's normal view shows only
  // real sales. When false, test orders re-appear in the listing AND in
  // counts/stats — useful for cleaning them up.
  const [hideTestOrders, setHideTestOrders] = useState(true)
  // Delete confirmation
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null)

  // Payment action states
  const [markingPaid, setMarkingPaid] = useState(false)
  const [completingSale, setCompletingSale] = useState(false)
  const [paymentNoteInput, setPaymentNoteInput] = useState('')

  // Manual sale modal
  const [showNewSale, setShowNewSale] = useState(false)

  // Sorting
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)

  const lang = i18n.language?.startsWith('es') ? 'es' : 'en'
  const currencySymbol = getCurrencySymbol(store?.currency || 'USD')

  // Clear the "new orders" badge as soon as the user opens this page.
  useEffect(() => {
    if (store?.id) markOrdersAsSeen(store.id)
  }, [store?.id])

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

  // Los pedidos online sin pagar (MercadoPago/Stripe) YA NO se esconden.
  // Antes se filtraban como "carrito abandonado", pero eso producia un
  // fantasma: la campana y el contador de pedidos nuevos los contaban (y la
  // notificacion push llegaba), mientras la lista no los mostraba — el
  // comerciante escuchaba un pedido que no podia encontrar. Y son accionables:
  // con el badge ambar "Pago pendiente" puede contactar al cliente que no
  // completo el cobro. Del dinero no ensucian nada: la caja solo suma
  // paymentStatus === 'paid'.
  const realOrders = useMemo(
    () => orders.filter(o => !hideTestOrders || !o.isTest),
    [orders, hideTestOrders]
  )

  // Calculate stats (only real orders)
  const stats = useMemo(() => {
    const totalOrders = realOrders.length
    const validOrders = realOrders.filter(o => o.status !== 'cancelled')
    // Facturado = ventas confirmadas/entregadas (no canceladas)
    const invoiced = validOrders.reduce((sum, o) => sum + (o.total || 0), 0)
    // Cobrado = lo que realmente entro a caja (paymentStatus === 'paid')
    const collected = validOrders
      .filter(o => o.paymentStatus === 'paid')
      .reduce((sum, o) => sum + (o.total || 0), 0)
    const avgOrderValue = validOrders.length > 0 ? invoiced / validOrders.length : 0
    const pendingOrders = realOrders.filter(o => o.status === 'pending').length

    return { totalOrders, invoiced, collected, avgOrderValue, pendingOrders }
  }, [realOrders])

  // Filter orders (abandoned carts hidden by default)
  const filteredOrders = useMemo(() => {
    let result = [...realOrders]

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

    // View filter: "Por cobrar" = confirmed/preparing/ready/delivered but not paid, not cancelled
    if (viewFilter === 'unpaid') {
      result = result.filter(order =>
        order.status !== 'cancelled'
        && order.status !== 'pending'
        && order.paymentStatus !== 'paid'
        && order.paymentStatus !== 'refunded'
      )
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
  }, [realOrders, searchQuery, filterStatus, dateFilter, paymentFilter, viewFilter, sortField, sortOrder])

  // "Por cobrar" total — sum of confirmed+ orders that haven't been paid
  const unpaidTotal = useMemo(() => {
    return realOrders
      .filter(o =>
        o.status !== 'cancelled'
        && o.status !== 'pending'
        && o.paymentStatus !== 'paid'
        && o.paymentStatus !== 'refunded'
      )
      .reduce((sum, o) => sum + (o.total || 0), 0)
  }, [realOrders])

  const unpaidCount = useMemo(() => {
    return realOrders.filter(o =>
      o.status !== 'cancelled'
      && o.status !== 'pending'
      && o.paymentStatus !== 'paid'
      && o.paymentStatus !== 'refunded'
    ).length
  }, [realOrders])

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

  // Permanently delete an order. Used mainly to clean up test orders the
  // merchant created while probing the checkout flow. The Firestore rule
  // already allows the store owner to delete orders, only the UI was
  // missing — that's what produced the "no me deja borrar" complaint.
  const handleDeleteOrder = async (orderId: string) => {
    if (!store) return
    if (!confirm(t('orders.confirmDelete', { defaultValue: '¿Eliminar este pedido? Esta acción no se puede deshacer.' }))) return
    setDeletingOrderId(orderId)
    try {
      // If the order still holds a stock reservation and was never paid or
      // fulfilled (e.g. an abandoned online order), return its stock before
      // deleting — otherwise the units would stay stuck as "agotado". Paid or
      // delivered orders keep their decrement: the goods really left.
      const order = orders.find(o => o.id === orderId)
      if (order?.stockDecremented && order.paymentStatus !== 'paid' && order.status !== 'delivered') {
        try {
          await restoreOrderStock(store.id, order, { createdBy: store.ownerId, reason: 'Pedido eliminado' })
        } catch (err) {
          console.error('Error restoring stock before delete:', err)
        }
      }
      await orderService.delete(store.id, orderId)
      setOrders(prev => prev.filter(o => o.id !== orderId))
      if (selectedOrder?.id === orderId) setSelectedOrder(null)
      showToast(t('orders.deleted', { defaultValue: 'Pedido eliminado' }), 'success')
    } catch (err) {
      console.error('Error deleting order:', err)
      showToast(t('orders.deleteError', { defaultValue: 'Error al eliminar el pedido' }), 'error')
    } finally {
      setDeletingOrderId(null)
    }
  }

  // Apply an order's stock the first time it's confirmed/paid from the
  // dashboard. Online orders reach the dashboard without stock applied (the
  // unauthenticated storefront can't write products): gateway payments get
  // decremented server-side on confirmation, but manual WhatsApp/transfer orders
  // are only decremented here, when the merchant accepts them. Idempotent via
  // the flag — orders already decremented (POS, gateway) are skipped, so it
  // never double-counts. Returns true if it actually decremented.
  const ensureStockDecremented = async (order: Order): Promise<boolean> => {
    if (!store || order.stockDecremented) return false
    try {
      const did = await decrementOrderStock(store.id, order, { createdBy: store.ownerId })
      if (did) {
        await orderService.update(store.id, order.id, { stockDecremented: true })
        return true
      }
      return false
    } catch (err) {
      console.error('Error applying stock on confirm:', err)
      return false
    }
  }

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    if (!store) return

    setUpdatingStatus(orderId)
    try {
      await orderService.updateStatus(store.id, orderId, newStatus)

      const order = orders.find(o => o.id === orderId)
      let stockFlagPatch: boolean | undefined
      if (newStatus === 'cancelled' && order?.stockDecremented) {
        // Cancelling returns reserved stock to inventory (idempotent via the
        // flag, which we flip off once restored). Without this, cancelled or
        // abandoned orders left their units stuck at "agotado".
        try {
          await restoreOrderStock(store.id, order, { createdBy: store.ownerId, reason: 'Pedido cancelado' })
          await orderService.update(store.id, orderId, { stockDecremented: false })
          stockFlagPatch = false
        } catch (err) {
          console.error('Error restoring stock on cancel:', err)
        }
      } else if (order && newStatus !== 'pending' && newStatus !== 'cancelled') {
        // Accepting an order applies its stock now if it hasn't been already.
        if (await ensureStockDecremented(order)) stockFlagPatch = true
      }

      const patch: Partial<Order> = { status: newStatus, updatedAt: new Date() }
      if (stockFlagPatch !== undefined) patch.stockDecremented = stockFlagPatch
      setOrders(orders.map(o => (o.id === orderId ? { ...o, ...patch } : o)))
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, ...patch })
      }
      showToast(t('orders.statusUpdated'), 'success')
    } catch (error) {
      console.error('Error updating order status:', error)
      showToast(t('orders.statusError'), 'error')
    } finally {
      setUpdatingStatus(null)
    }
  }

  // Mark an order as paid (records paidAt + optional note)
  const handleMarkPaid = async (order: Order, note?: string) => {
    if (!store) return
    setMarkingPaid(true)
    try {
      const now = new Date()
      const update: Partial<Order> = {
        paymentStatus: 'paid',
        paidAt: now,
      }
      if (note && note.trim()) update.paymentNote = note.trim()
      await orderService.update(store.id, order.id, update)
      // Marking a manual order paid confirms the sale → apply its stock (no-op
      // if already decremented by POS or an online gateway).
      if (await ensureStockDecremented(order)) update.stockDecremented = true
      const updated = { ...order, ...update, updatedAt: now } as Order
      setOrders(prev => prev.map(o => o.id === order.id ? updated : o))
      if (selectedOrder?.id === order.id) setSelectedOrder(updated)
      showToast('Pago registrado', 'success')
    } catch (err) {
      console.error('Error marking paid:', err)
      showToast('Error al registrar el pago', 'error')
    } finally {
      setMarkingPaid(false)
    }
  }

  // Complete the sale: delivered + paid in one click
  const handleCompleteSale = async (order: Order) => {
    if (!store) return
    setCompletingSale(true)
    try {
      const now = new Date()
      const update: Partial<Order> = {
        status: 'delivered',
        paymentStatus: 'paid',
        paidAt: order.paidAt || now,
      }
      await orderService.update(store.id, order.id, update)
      // Completing the sale confirms it → apply its stock (no-op if already
      // decremented by POS or an online gateway).
      if (await ensureStockDecremented(order)) update.stockDecremented = true
      const updated = { ...order, ...update, updatedAt: now } as Order
      setOrders(prev => prev.map(o => o.id === order.id ? updated : o))
      if (selectedOrder?.id === order.id) setSelectedOrder(updated)
      showToast('Venta completada', 'success')
    } catch (err) {
      console.error('Error completing sale:', err)
      showToast('Error al completar la venta', 'error')
    } finally {
      setCompletingSale(false)
    }
  }

  const [fulfillingCJ, setFulfillingCJ] = useState(false)
  const [fulfillingPrintful, setFulfillingPrintful] = useState(false)

  const handlePrintfulFulfill = async (order: Order) => {
    if (!store) return
    setFulfillingPrintful(true)
    try {
      const res = await fetch(apiUrl('/api/printful'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'createOrder', storeId: store.id, orderId: order.id })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const updated = { ...order, printfulOrderId: data.printfulOrderId, fulfillmentProvider: 'printful' as const, fulfillmentStatus: 'submitted' as const, updatedAt: new Date() }
      setOrders(orders.map(o => o.id === order.id ? updated : o))
      setSelectedOrder(updated)
      showToast('Orden enviada a Printful', 'success')
    } catch (err: any) {
      showToast(err.message || 'Error enviando a Printful', 'error')
    } finally {
      setFulfillingPrintful(false)
    }
  }

  const handleCheckPrintfulStatus = async (order: Order) => {
    if (!store || !order.printfulOrderId) return
    try {
      const res = await fetch(apiUrl('/api/printful'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'orderStatus', storeId: store.id, printfulOrderId: order.printfulOrderId })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      if (data.trackingNumber) {
        const updated = {
          ...order,
          trackingNumber: data.trackingNumber,
          trackingCarrier: data.carrier,
          fulfillmentStatus: 'shipped' as const,
          updatedAt: new Date(),
        }
        setOrders(orders.map(o => o.id === order.id ? updated : o))
        setSelectedOrder(updated)
        showToast(`Tracking: ${data.trackingNumber}`, 'success')
      } else {
        showToast(`Estado Printful: ${data.status || 'En proceso'}`, 'info')
      }
    } catch (err: any) {
      showToast(err.message || 'Error consultando Printful', 'error')
    }
  }

  const handleCJFulfill = async (order: Order) => {
    if (!store) return
    setFulfillingCJ(true)
    try {
      const res = await fetch(apiUrl('/api/cj'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'createOrder', storeId: store.id, orderId: order.id })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const updated = { ...order, cjOrderId: data.cjOrderId, fulfillmentStatus: 'submitted' as const, updatedAt: new Date() }
      setOrders(orders.map(o => o.id === order.id ? updated : o))
      setSelectedOrder(updated)
      showToast('Orden enviada a CJ Dropshipping', 'success')
    } catch (err: any) {
      showToast(err.message || 'Error enviando a CJ', 'error')
    } finally {
      setFulfillingCJ(false)
    }
  }

  const handleCheckCJStatus = async (order: Order) => {
    if (!store || !order.cjOrderId) return
    try {
      const res = await fetch(apiUrl('/api/cj'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'orderStatus', storeId: store.id, cjOrderId: order.cjOrderId })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      if (data.trackingNumber) {
        const updated = {
          ...order,
          trackingNumber: data.trackingNumber,
          trackingCarrier: data.carrier,
          fulfillmentStatus: 'shipped' as const,
          updatedAt: new Date(),
        }
        setOrders(orders.map(o => o.id === order.id ? updated : o))
        setSelectedOrder(updated)
        showToast(`Tracking: ${data.trackingNumber}`, 'success')
      } else {
        showToast(`Estado CJ: ${data.status || 'En proceso'}`, 'info')
      }
    } catch (err: any) {
      showToast(err.message || 'Error consultando CJ', 'error')
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
    // Cheuron con dos bordes rotados: abajo si ordena descendente, arriba si
    // ascendente, y tenue cuando esa columna no es la que ordena.
    const activo = sortField === field
    const color = activo ? '#0284C7' : '#C3CFDB'
    const arriba = activo && sortOrder !== 'desc'
    return (
      <span
        className="inline-block shrink-0"
        style={{
          width: 6,
          height: 6,
          borderRight: `1.6px solid ${color}`,
          borderBottom: `1.6px solid ${color}`,
          transform: `rotate(${arriba ? -135 : 45}deg)`,
          marginBottom: arriba ? 0 : 3,
        }}
      />
    )
  }

  const getPaymentBadge = (paymentStatus?: string) => {
    if (paymentStatus === 'paid') return { bg: 'bg-green-50 text-green-700', dot: 'bg-green-500', label: lang === 'es' ? 'Pagado' : 'Paid' }
    if (paymentStatus === 'failed') return { bg: 'bg-red-50 text-red-700', dot: 'bg-red-500', label: lang === 'es' ? 'Pago fallido' : 'Payment failed' }
    return { bg: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500', label: lang === 'es' ? 'Pago pendiente' : 'Payment pending' }
  }

  const activeFiltersCount = [
    dateFilter !== 'all',
    paymentFilter !== 'all'
  ].filter(Boolean).length

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
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-[#1e3a5f]">{t('orders.title')}</h1>
          <p className="text-sm text-[#8898AA] mt-0.5">
            {realOrders.length} {realOrders.length === 1 ? t('orders.order') : t('orders.orders')}
          </p>
        </div>
        <button
          onClick={() => setShowNewSale(true)}
          className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d6cb5] transition-colors text-sm font-medium w-full sm:w-auto"
        >
          + Nueva venta
        </button>
      </div>

      {/* Stats Cards — Facturado vs Cobrado with unpaid exposure */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={CARD}>
          <p className={LABEL}>{t('orders.totalOrders')}</p>
          <p className="text-lg sm:text-xl font-semibold tracking-tight text-[#1e3a5f]">{stats.totalOrders}</p>
        </div>
        <div className={CARD}>
          <p className={LABEL}>Facturado</p>
          <p className="text-lg sm:text-xl font-semibold tracking-tight text-[#1e3a5f]">{currencySymbol}{stats.invoiced.toFixed(0)}</p>
          <p className="text-[11px] text-[#A9B6C6] mt-0.5">ventas confirmadas</p>
        </div>
        <div className={CARD}>
          <p className={LABEL}>Cobrado</p>
          <p className="text-xl font-semibold text-green-600">{currencySymbol}{stats.collected.toFixed(0)}</p>
          <p className="text-[11px] text-[#A9B6C6] mt-0.5">dinero en caja</p>
        </div>
        <button
          onClick={() => setViewFilter(viewFilter === 'unpaid' ? 'all' : 'unpaid')}
          className={`bg-white rounded-xl border p-4 text-left transition-all ${
            viewFilter === 'unpaid' ? 'border-amber-400 ring-2 ring-amber-200' : 'border-[#E6EBF1] hover:border-[#D8E2EC]'
          }`}
        >
          <p className={LABEL}>Por cobrar</p>
          <p className={`text-xl font-semibold ${unpaidTotal > 0 ? 'text-amber-600' : 'text-[#1e3a5f]'}`}>
            {currencySymbol}{unpaidTotal.toFixed(0)}
          </p>
          <p className="text-[11px] text-[#A9B6C6] mt-0.5">
            {unpaidCount} pedido{unpaidCount !== 1 ? 's' : ''} {viewFilter === 'unpaid' ? '· ver todos' : '· filtrar'}
          </p>
              </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search bar */}
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('orders.searchPlaceholder')}
            className={`${INPUT} pr-20`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-[0.74rem] font-semibold text-[#8898AA] hover:text-[#425466] transition-colors"
            >
              {t('common.clear', { defaultValue: 'Limpiar' })}
            </button>
          )}
        </div>

        {/* Filter toggle button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
            showFilters || activeFiltersCount > 0
              ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
              : 'bg-white text-[#425466] border-[#E6EBF1] hover:bg-[#F6F9FC]'
          }`}
        >
          {t('orders.filters')}
          {activeFiltersCount > 0 && (
            <span className="w-5 h-5 bg-white text-[#1e3a5f] rounded-full text-xs font-medium flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className={CARD}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>
                {t('orders.dateFilter.label')}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(['all', 'today', 'week', 'month'] as DateFilter[]).map(value => (
                  <button
                    key={value}
                    onClick={() => setDateFilter(value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      dateFilter === value
                        ? 'bg-[#1e3a5f] text-white'
                        : 'bg-[#F1F5F9] text-[#425466] hover:bg-[#E1E8EF]'
                    }`}
                  >
                    {t(`orders.dateFilter.${value}`)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={LABEL}>
                {t('orders.paymentFilter.label')}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(['all', 'whatsapp', 'mercadopago', 'transfer'] as PaymentFilter[]).map(value => (
                  <button
                    key={value}
                    onClick={() => setPaymentFilter(value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      paymentFilter === value
                        ? 'bg-[#1e3a5f] text-white'
                        : 'bg-[#F1F5F9] text-[#425466] hover:bg-[#E1E8EF]'
                    }`}
                  >
                    {t(`orders.paymentFilter.${value}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Test orders toggle — separate row so it stays visible even
              when no other filters are active. */}
          <div className="mt-4 pt-3 border-t border-[#EEF2F6]">
            <label className="flex items-center gap-2 text-sm text-[#425466] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hideTestOrders}
                onChange={e => setHideTestOrders(e.target.checked)}
                className="w-4 h-4 rounded accent-[#1e3a5f] focus:ring-2 focus:ring-[#38bdf8]/40"
              />
              <span>{t('orders.hideTestOrders', { defaultValue: 'Ocultar pedidos de prueba' })}</span>
              <HelpTip
                text="Al crear una venta manual puedes marcarla como 'de prueba'. Esas no descuentan stock, no cuentan en estadísticas, y se ocultan aquí por defecto. Desmarca esta casilla para verlas y eliminarlas."
                learnMoreHref="/es/dashboard/help#pedidos-prueba"
              />
            </label>
          </div>

          {activeFiltersCount > 0 && (
            <button
              onClick={() => { setDateFilter('all'); setPaymentFilter('all') }}
              className="mt-3 text-xs text-[#0284C7] hover:underline"
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
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            filterStatus === 'all'
              ? 'bg-[#1e3a5f] text-white'
              : 'bg-white border border-[#E6EBF1] text-[#425466] hover:bg-[#F6F9FC]'
          }`}
        >
          {t('orders.all')}
          <span className={`px-1.5 py-0.5 rounded-md text-xs ${filterStatus === 'all' ? 'bg-white/20' : 'bg-[#F1F5F9]'}`}>
            {realOrders.length}
          </span>
              </button>
        {(['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'] as OrderStatus[]).map(status => {
          const count = realOrders.filter(o => o.status === status).length
          if (count === 0 && filterStatus !== status) return null
          return (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filterStatus === status
                  ? 'bg-[#1e3a5f] text-white'
                  : 'bg-white border border-[#E6EBF1] text-[#425466] hover:bg-[#F6F9FC]'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[status].dot}`}></span>
              {STATUS_LABELS[status][lang]}
              <span className={`px-1.5 py-0.5 rounded-md text-xs ${filterStatus === status ? 'bg-white/20' : 'bg-[#F1F5F9]'}`}>
                {count}
              </span>
              </button>
          )
        })}
      </div>

      {/* Results info */}
      {(searchQuery || filterStatus !== 'all' || activeFiltersCount > 0) && (
        <p className="text-sm text-[#8898AA]">
          {t('orders.showingResults', { count: filteredOrders.length, total: realOrders.length })}
        </p>
      )}

      {/* Orders list */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-[14px] border border-[#E6EBF1] p-12 text-center">
          <h3 className="text-base font-semibold text-[#1e3a5f] mb-1">
            {searchQuery || activeFiltersCount > 0 || filterStatus !== 'all' ? t('orders.noResults') : t('orders.empty.title')}
          </h3>
          <p className="text-sm text-[#8898AA]">
            {searchQuery || activeFiltersCount > 0 || filterStatus !== 'all' ? t('orders.tryDifferentFilters') : t('orders.empty.description')}
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
                    className="px-5 py-3 text-left text-[0.68rem] font-semibold uppercase tracking-[0.07em] text-[#8898AA] cursor-pointer hover:text-[#425466] transition-colors"
                    onClick={() => handleSort('orderNumber')}
                  >
                    <div className="flex items-center gap-1">
                      {t('orders.orderNumber')}
                      <SortIcon field="orderNumber" />
                    </div>
                  </th>
                  <th
                    className="px-5 py-3 text-left text-[0.68rem] font-semibold uppercase tracking-[0.07em] text-[#8898AA] cursor-pointer hover:text-[#425466] transition-colors"
                    onClick={() => handleSort('customer')}
                  >
                    <div className="flex items-center gap-1">
                      {t('orders.customer')}
                      <SortIcon field="customer" />
                    </div>
                  </th>
                  <th
                    className="px-5 py-3 text-left text-[0.68rem] font-semibold uppercase tracking-[0.07em] text-[#8898AA] cursor-pointer hover:text-[#425466] transition-colors"
                    onClick={() => handleSort('total')}
                  >
                    <div className="flex items-center gap-1">
                      {t('orders.total')}
                      <SortIcon field="total" />
                    </div>
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-[#8898AA] uppercase tracking-wider">
                    {t('orders.status')}
                  </th>
                  <th
                    className="px-5 py-3 text-left text-[0.68rem] font-semibold uppercase tracking-[0.07em] text-[#8898AA] cursor-pointer hover:text-[#425466] transition-colors"
                    onClick={() => handleSort('createdAt')}
                  >
                    <div className="flex items-center gap-1">
                      {t('orders.date')}
                      <SortIcon field="createdAt" />
                    </div>
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-[#8898AA] uppercase tracking-wider">
                    {t('orders.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedOrders.map(order => (
                  <tr key={order.id} className="hover:bg-[#F6F9FC]/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[0.82rem] font-medium text-[#1e3a5f]">{order.orderNumber}</span>
                        {order.isTest && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                            {t('orders.testBadge', { defaultValue: 'Prueba' })}
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5">
                        <OrderItemThumbs items={order.items} />
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div>
                        <p className="font-medium text-[#1e3a5f]">{order.customer?.name || '-'}</p>
                        <p className="text-sm text-[#8898AA]">{order.customer?.phone || '-'}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[0.82rem] font-medium text-[#1e3a5f]">
                          {currencySymbol}{order.total?.toFixed(2) || '0.00'}
                        </span>
                        {order.paymentMethod === 'mercadopago' && (
                          <img src="/mercadopago-logo.webp" alt="MP" className="w-4 h-4 rounded-sm object-cover" />
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold w-fit ${STATUS_COLORS[order.status as OrderStatus]?.bg || 'bg-[#F1F5F9]'} ${STATUS_COLORS[order.status as OrderStatus]?.text || 'text-[#1e3a5f]'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[order.status as OrderStatus]?.dot || 'bg-[#F6F9FC]0'}`}></span>
                          {STATUS_LABELS[order.status as OrderStatus]?.[lang] || order.status}
                        </span>
                        {order.status !== 'cancelled' && (() => {
                          const badge = getPaymentBadge(order.paymentStatus)
                          return (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium w-fit ${badge.bg}`}>
                              <span className={`w-1 h-1 rounded-full ${badge.dot}`}></span>
                              {badge.label}
                            </span>
                          )
                        })()}
                        {order.channel && order.channel !== 'online' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F1F5F9] text-[#425466] w-fit">
                            {CHANNEL_LABELS[order.channel]}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#8898AA]">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="text-[#0284C7] hover:text-[#0369A1] text-sm font-medium"
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
          <div className="md:hidden divide-y divide-gray-50">
            {paginatedOrders.map(order => (
              <div
                key={order.id}
                className="p-4 hover:bg-[#F6F9FC]/50 transition-colors cursor-pointer"
                onClick={() => setSelectedOrder(order)}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[0.82rem] font-medium text-[#1e3a5f]">{order.orderNumber}</span>
                    {order.isTest && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                        {t('orders.testBadge', { defaultValue: 'Prueba' })}
                      </span>
                    )}
                    {order.channel && order.channel !== 'online' && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-[#F1F5F9] text-[#425466]">
                        {CHANNEL_LABELS[order.channel]}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {order.status !== 'cancelled' && (() => {
                      const badge = getPaymentBadge(order.paymentStatus)
                      return (
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${badge.bg}`}>
                          <span className={`w-1 h-1 rounded-full ${badge.dot}`}></span>
                          {badge.label}
                        </span>
                      )
                    })()}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[order.status as OrderStatus]?.bg || 'bg-[#F1F5F9]'} ${STATUS_COLORS[order.status as OrderStatus]?.text || 'text-[#1e3a5f]'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[order.status as OrderStatus]?.dot || 'bg-[#F6F9FC]0'}`}></span>
                      {STATUS_LABELS[order.status as OrderStatus]?.[lang] || order.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <OrderItemThumbs items={order.items} size="md" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#1e3a5f] truncate">{order.customer?.name || '-'}</p>
                      <p className="text-xs text-[#8898AA]">{formatShortDate(order.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[0.82rem] font-medium text-[#1e3a5f]">
                      {currencySymbol}{order.total?.toFixed(2) || '0.00'}
                    </span>
                    {order.paymentMethod === 'mercadopago' && (
                      <img src="/mercadopago-logo.webp" alt="MP" className="w-4 h-4 rounded-sm object-cover" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-[#E6EBF1]">
              <p className="text-xs text-[#A9B6C6]">
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
                  className="px-3 py-1.5 rounded-lg border border-[#E6EBF1] text-[0.9rem] leading-none text-[#425466] hover:bg-[#F6F9FC] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label={t('orders.prevPage', { defaultValue: 'Anterior' })}
                >
                  &lsaquo;
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

                <span className="sm:hidden text-sm text-[#425466]">
                  {currentPage} / {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-[#E6EBF1] text-[0.9rem] leading-none text-[#425466] hover:bg-[#F6F9FC] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label={t('orders.nextPage', { defaultValue: 'Siguiente' })}
                >
                  &rsaquo;
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Order detail modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b border-[#E6EBF1]">
              <div>
                <h3 className="text-base font-bold text-[#1e3a5f]">{selectedOrder.orderNumber}</h3>
                <p className="text-sm text-[#A9B6C6]">{formatDate(selectedOrder.createdAt)}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 text-[#A9B6C6] hover:text-[#425466] hover:bg-[#F1F5F9] rounded-lg transition-all"
              >
                &times;
              </button>
            </div>

            {/* Modal content */}
            <div className="p-5 space-y-5">
              {/* Status selector */}
              <div>
                <label className={LABEL}>
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
                          : 'bg-[#F1F5F9] text-[#425466] hover:bg-[#E1E8EF]'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[status].dot}`}></span>
                      {updatingStatus === selectedOrder.id && selectedOrder.status !== status ? (
                        <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-current" />
                      ) : (
                        STATUS_LABELS[status][lang]
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer info */}
              <div>
                <h4 className="text-[0.68rem] font-semibold uppercase tracking-[0.07em] text-[#8898AA] mb-2">{t('orders.customerInfo')}</h4>
                <div className="bg-[#F6F9FC] rounded-xl p-4 space-y-2">
                  <p className="text-sm"><span className="text-[#8898AA]">{t('orders.name')}:</span> <span className="font-medium">{selectedOrder.customer?.name || '-'}</span></p>
                  <p className="text-sm">
                    <span className="text-[#8898AA]">{t('orders.phone')}:</span>{' '}
                    <a href={`tel:${selectedOrder.customer?.phone}`} className="font-medium text-[#0284C7] hover:underline">
                      {selectedOrder.customer?.phone || '-'}
                    </a>
                  </p>
                  {selectedOrder.customer?.email && (
                    <p className="text-sm"><span className="text-[#8898AA]">Email:</span> <span className="font-medium">{selectedOrder.customer.email}</span></p>
                  )}
                </div>
              </div>

              {/* Delivery info */}
              <div>
                <h4 className="text-[0.68rem] font-semibold uppercase tracking-[0.07em] text-[#8898AA] mb-2">{t('orders.deliveryInfo')}</h4>
                <div className="bg-[#F6F9FC] rounded-xl p-4 space-y-2">
                  <p className="text-sm">
                    <span className="text-[#8898AA]">{t('orders.method')}:</span>{' '}
                    <span className="font-medium">
                      {selectedOrder.deliveryMethod === 'pickup' ? t('orders.pickup') : t('orders.delivery')}
                    </span>
                  </p>
                  {selectedOrder.deliveryMethod === 'delivery' && selectedOrder.deliveryAddress && (
                    <p className="text-sm">
                      <span className="text-[#8898AA]">{t('orders.address')}:</span>{' '}
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
                <h4 className="text-[0.68rem] font-semibold uppercase tracking-[0.07em] text-[#8898AA] mb-2">{t('orders.items')}</h4>
                <div className="bg-[#F6F9FC] rounded-xl divide-y divide-[#EEF2F6] max-h-48 overflow-y-auto">
                  {selectedOrder.items?.map((item, index) => (
                    <div key={index} className="px-4 py-3 flex items-start gap-3">
                      {item.productImage ? (
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          className="w-12 h-12 rounded-lg object-cover bg-[#F1F5F9] shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-[#F1F5F9] flex items-center justify-center shrink-0">
                          <span className="text-[0.6rem] font-medium text-[#C3CFDB]">Sin foto</span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-[#1e3a5f]">{item.productName}</p>
                          {item.cjProductId && (
                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-semibold rounded">CJ</span>
                          )}
                          {item.printfulProductId && (
                            <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-semibold rounded">Printful</span>
                          )}
                        </div>
                        {item.selectedVariations && item.selectedVariations.length > 0 && (
                          <p className="text-xs text-[#425466] mt-0.5">
                            {item.selectedVariations.map(v => `${v.name}: ${v.value}`).join(' · ')}
                          </p>
                        )}
                        {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                          <p className="text-xs text-[#425466] mt-0.5">
                            + {formatModifierNames(item.selectedModifiers)}
                          </p>
                        )}
                        <p className="text-sm text-[#8898AA] mt-0.5">x{item.quantity}</p>
                      </div>
                      <p className="text-sm font-medium text-[#1e3a5f] whitespace-nowrap">
                        {currencySymbol}{(item.itemTotal || item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between pt-4 border-t border-[#E6EBF1]">
                <span className="text-sm font-medium text-[#8898AA]">{t('orders.total')}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-[#1e3a5f]">
                    {currencySymbol}{selectedOrder.total?.toFixed(2) || '0.00'}
                  </span>
                  {selectedOrder.paymentMethod === 'mercadopago' && (
                    <img src="/mercadopago-logo.webp" alt="MercadoPago" className="w-5 h-5 rounded-sm object-cover" />
                  )}
                </div>
              </div>

              {/* Payment info + actions */}
              <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-sm text-[#8898AA]">
                    {t('orders.paymentMethod')}: <span className="font-medium capitalize">{selectedOrder.paymentMethod || '-'}</span>
                  </p>
                  {(() => {
                    const badge = getPaymentBadge(selectedOrder.paymentStatus)
                    return (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${badge.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                        {badge.label}
                      </span>
                    )
                  })()}
                </div>

                {selectedOrder.paidAt && (
                  <p className="text-xs text-[#8898AA]">
                    Pagado el {formatDate(selectedOrder.paidAt as Date)}
                    {selectedOrder.paymentNote && <span className="ml-1 text-[#A9B6C6]">· {selectedOrder.paymentNote}</span>}
                  </p>
                )}

                {/* Action buttons — hidden for cancelled */}
                {selectedOrder.status !== 'cancelled' && selectedOrder.paymentStatus !== 'paid' && (
                  <div className="bg-[#f0f7ff] border border-[#1e3a5f]/15 rounded-xl p-3 space-y-2.5">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#1e3a5f]">Este pedido esta pendiente de pago</p>
                        <p className="text-[11px] text-[#2d6cb5] mt-0.5">Marcalo como pagado cuando recibas el dinero.</p>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={paymentNoteInput}
                      onChange={e => setPaymentNoteInput(e.target.value)}
                      placeholder="Nota opcional (ej: referencia, banco...)"
                      className={INPUT_SM}
                    />
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => { handleMarkPaid(selectedOrder, paymentNoteInput); setPaymentNoteInput('') }}
                        disabled={markingPaid || completingSale}
                        className="flex-1 px-3 py-2 bg-white border border-[#1e3a5f]/25 text-[#1e3a5f] rounded-lg hover:bg-[#1e3a5f]/5 transition-colors text-xs font-medium disabled:opacity-40"
                      >
                        {markingPaid ? 'Registrando...' : 'Marcar como pagado'}
                      </button>
                      {selectedOrder.status !== 'delivered' && (
                        <button
                          onClick={() => { handleCompleteSale(selectedOrder); setPaymentNoteInput('') }}
                          disabled={markingPaid || completingSale}
                          className="flex-1 px-3 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d6cb5] transition-colors text-xs font-medium disabled:opacity-40"
                        >
                          {completingSale ? 'Completando...' : 'Completar venta (entregado + pagado)'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* CJ Dropshipping fulfillment */}
              {selectedOrder.items?.some(item => item.cjProductId) && (
                <div className="border-t border-[#E6EBF1] pt-4">
                  {selectedOrder.cjOrderId ? (
                    <div className="bg-[#F0F9FF] rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-[#0C4A6E]">CJ Dropshipping</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          selectedOrder.fulfillmentStatus === 'shipped' ? 'bg-green-100 text-green-700' :
                          selectedOrder.fulfillmentStatus === 'failed' ? 'bg-red-100 text-red-700' :
                          'bg-[#E0F2FE] text-[#0369A1]'
                        }`}>
                          {selectedOrder.fulfillmentStatus === 'shipped' ? 'Enviado' :
                           selectedOrder.fulfillmentStatus === 'failed' ? 'Error' :
                           'Procesando'}
                        </span>
                      </div>
                      <p className="text-xs text-[#0284C7]">Orden CJ: {selectedOrder.cjOrderId}</p>
                      {selectedOrder.trackingNumber && (
                        <p className="text-xs text-[#0284C7]">
                          Tracking: <span className="font-mono font-medium">{selectedOrder.trackingNumber}</span>
                          {selectedOrder.trackingCarrier && ` (${selectedOrder.trackingCarrier})`}
                        </p>
                      )}
                      {!selectedOrder.trackingNumber && selectedOrder.fulfillmentStatus !== 'failed' && (
                        <button
                          onClick={() => handleCheckCJStatus(selectedOrder)}
                          className="text-xs text-[#0284C7] hover:text-[#0369A1] font-medium"
                        >
                          Verificar estado de envio
                        </button>
                      )}
                      {selectedOrder.fulfillmentError && (
                        <p className="text-xs text-red-500">{selectedOrder.fulfillmentError}</p>
                      )}
                    </div>
                  ) : selectedOrder.fulfillmentStatus === 'failed' ? (
                    <div className="bg-red-50 rounded-xl p-4 space-y-2">
                      <p className="text-sm font-semibold text-red-800">Error al enviar a CJ</p>
                      {selectedOrder.fulfillmentError && (
                        <p className="text-xs text-red-600">{selectedOrder.fulfillmentError}</p>
                      )}
                      <button
                        onClick={() => handleCJFulfill(selectedOrder)}
                        disabled={fulfillingCJ}
                        className="text-xs text-red-600 hover:text-red-800 font-medium"
                      >
                        Reintentar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleCJFulfill(selectedOrder)}
                      disabled={fulfillingCJ || selectedOrder.status === 'pending' || selectedOrder.status === 'cancelled'}
                      className="w-full py-2.5 rounded-xl text-white text-[0.82rem] font-semibold transition-opacity hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
                      style={{ background: '#0F766E' }}
                    >
                      {fulfillingCJ ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Enviando a CJ...
                        </>
                      ) : (
                        <>
                          Enviar a CJ Dropshipping
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Printful fulfillment */}
              {selectedOrder.items?.some(item => item.printfulProductId) && (
                <div className="border-t border-[#E6EBF1] pt-4">
                  {selectedOrder.printfulOrderId ? (
                    <div className="bg-green-50 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-green-900">Printful</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          selectedOrder.fulfillmentStatus === 'shipped' ? 'bg-green-100 text-green-700' :
                          selectedOrder.fulfillmentStatus === 'failed' ? 'bg-red-100 text-red-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {selectedOrder.fulfillmentStatus === 'shipped' ? 'Enviado' :
                           selectedOrder.fulfillmentStatus === 'failed' ? 'Error' :
                           'Procesando'}
                        </span>
                      </div>
                      <p className="text-xs text-green-600">Orden Printful: {selectedOrder.printfulOrderId}</p>
                      {selectedOrder.trackingNumber && (
                        <p className="text-xs text-green-600">
                          Tracking: <span className="font-mono font-medium">{selectedOrder.trackingNumber}</span>
                          {selectedOrder.trackingCarrier && ` (${selectedOrder.trackingCarrier})`}
                        </p>
                      )}
                      {!selectedOrder.trackingNumber && selectedOrder.fulfillmentStatus !== 'failed' && (
                        <button
                          onClick={() => handleCheckPrintfulStatus(selectedOrder)}
                          className="text-xs text-green-500 hover:text-green-700 font-medium"
                        >
                          Verificar estado de envio
                        </button>
                      )}
                      {selectedOrder.fulfillmentError && (
                        <p className="text-xs text-red-500">{selectedOrder.fulfillmentError}</p>
                      )}
                    </div>
                  ) : selectedOrder.fulfillmentStatus === 'failed' && selectedOrder.fulfillmentProvider === 'printful' ? (
                    <div className="bg-red-50 rounded-xl p-4 space-y-2">
                      <p className="text-sm font-semibold text-red-800">Error al enviar a Printful</p>
                      {selectedOrder.fulfillmentError && (
                        <p className="text-xs text-red-600">{selectedOrder.fulfillmentError}</p>
                      )}
                      <button
                        onClick={() => handlePrintfulFulfill(selectedOrder)}
                        disabled={fulfillingPrintful}
                        className="text-xs text-red-600 hover:text-red-800 font-medium"
                      >
                        Reintentar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handlePrintfulFulfill(selectedOrder)}
                      disabled={fulfillingPrintful || selectedOrder.status === 'pending' || selectedOrder.status === 'cancelled'}
                      className="w-full py-2.5 rounded-xl text-white text-[0.82rem] font-semibold transition-opacity hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
                      style={{ background: '#15803D' }}
                    >
                      {fulfillingPrintful ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Enviando a Printful...
                        </>
                      ) : (
                        <>
                          Enviar a Printful
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* WhatsApp button */}
              {selectedOrder.customer?.phone && (
                <a
                  href={`https://wa.me/${selectedOrder.customer.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-all"
                >
                  {t('orders.contactWhatsApp')}
                </a>
              )}

              {/* Delete order — visible only after the modal is open so it
                  doesn't crowd the list. Uses a quieter style so it doesn't
                  compete with the primary actions above. */}
              <button
                onClick={() => handleDeleteOrder(selectedOrder.id)}
                disabled={deletingOrderId === selectedOrder.id}
                className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50"
              >
                {deletingOrderId === selectedOrder.id ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                    {t('orders.deleting', { defaultValue: 'Eliminando...' })}
                  </>
                ) : (
                  <>
                    {t('orders.deleteOrder', { defaultValue: 'Eliminar pedido' })}
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Manual sale modal */}
      <NewSaleModal
        open={showNewSale}
        onClose={() => setShowNewSale(false)}
        onCreated={(order) => {
          setOrders(prev => [order, ...prev])
          showToast(`Venta ${order.orderNumber} registrada`, 'success')
        }}
      />
    </div>
  )
}
