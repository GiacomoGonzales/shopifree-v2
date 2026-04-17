import { useEffect, useMemo, useState } from 'react'
import { productService, orderService } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../ui/Toast'
import { getCurrencySymbol } from '../../lib/currency'
import type { Order, OrderItem, Product } from '../../types'

type Channel = 'online' | 'in_store' | 'whatsapp' | 'instagram' | 'other'
type PaymentMethod = 'cash' | 'transfer' | 'card' | 'whatsapp' | 'mercadopago' | 'transfer' | 'other'
type InitialStatus = 'delivered_paid' | 'delivered_unpaid' | 'preparing' | 'pending'

interface ManualItem {
  productId: string
  productName: string
  image?: string
  quantity: number
  unitPrice: number
  // For combos/variants
  variationName?: string
  optionValue?: string
  _comboId?: string
  // Stock tracking helpers
  trackStock: boolean
  availableStock?: number  // at the moment of adding (for soft warning)
}

interface NewSaleModalProps {
  open: boolean
  onClose: () => void
  onCreated: (order: Order) => void
}

/**
 * Manual sale modal — creates an order from the dashboard (in-store, WhatsApp, etc.).
 * Reuses productService.decrementStock logic from the storefront flow.
 */
export default function NewSaleModal({ open, onClose, onCreated }: NewSaleModalProps) {
  const { store, firebaseUser } = useAuth()
  const { showToast } = useToast()

  const currencySymbol = getCurrencySymbol(store?.currency || 'USD')
  const fmt = (n: number) => `${currencySymbol}${n.toFixed(2)}`

  // Products cache
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)

  // Customer
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')

  // Channel
  const [channel, setChannel] = useState<Channel>('in_store')

  // Items in the sale
  const [items, setItems] = useState<ManualItem[]>([])

  // Product picker
  const [productSearch, setProductSearch] = useState('')
  const [showProductPicker, setShowProductPicker] = useState(false)

  // Variant picker (second layer — opens when selecting a product with combinations)
  const [variantPickerProduct, setVariantPickerProduct] = useState<Product | null>(null)
  const [variantSearch, setVariantSearch] = useState('')

  // Payment / status
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [paymentNote, setPaymentNote] = useState('')
  const [initialStatus, setInitialStatus] = useState<InitialStatus>('delivered_paid')

  // Discount (optional, total discount)
  const [discountAmount, setDiscountAmount] = useState('')

  // Notes
  const [notes, setNotes] = useState('')

  const [saving, setSaving] = useState(false)

  // Load products when opening
  useEffect(() => {
    if (!open || !store) return
    setLoadingProducts(true)
    productService.getAll(store.id)
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false))
  }, [open, store])

  // Reset form on close
  useEffect(() => {
    if (!open) return
    setCustomerName('')
    setCustomerPhone('')
    setCustomerEmail('')
    setChannel('in_store')
    setItems([])
    setProductSearch('')
    setShowProductPicker(false)
    setPaymentMethod('cash')
    setPaymentNote('')
    setInitialStatus('delivered_paid')
    setDiscountAmount('')
    setNotes('')
    setVariantPickerProduct(null)
    setVariantSearch('')
  }, [open])

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products.filter(p => p.active !== false).slice(0, 20)
    const q = productSearch.trim().toLowerCase()
    return products.filter(p =>
      p.active !== false
      && (p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q))
    ).slice(0, 20)
  }, [products, productSearch])

  const addProduct = (product: Product) => {
    const productImage = product.image || undefined
    const hasCombos = product.combinations && product.combinations.length > 0
    if (hasCombos) {
      // Open the variant picker — user will pick ONE specific combo.
      setVariantPickerProduct(product)
      setVariantSearch('')
      setShowProductPicker(false)
      setProductSearch('')
      return
    }
    // Simple product: add or increment
    setItems(prev => {
      const existingIdx = prev.findIndex(it => it.productId === product.id && !it._comboId)
      if (existingIdx !== -1) {
        return prev.map((it, i) => i === existingIdx ? { ...it, quantity: it.quantity + 1 } : it)
      }
      return [...prev, {
        productId: product.id,
        productName: product.name,
        image: productImage,
        quantity: 1,
        unitPrice: product.price || 0,
        trackStock: product.trackStock === true,
        availableStock: product.stock ?? undefined,
      }]
    })
    setShowProductPicker(false)
    setProductSearch('')
  }

  // Called from the variant picker when the user taps a specific combination.
  const addCombo = (product: Product, combo: NonNullable<Product['combinations']>[number]) => {
    const productImage = product.image || undefined
    setItems(prev => {
      const existingIdx = prev.findIndex(it => it._comboId === combo.id)
      if (existingIdx !== -1) {
        return prev.map((it, i) => i === existingIdx ? { ...it, quantity: it.quantity + 1 } : it)
      }
      return [...prev, {
        productId: product.id,
        productName: product.name,
        image: productImage,
        quantity: 1,
        unitPrice: combo.price || product.price || 0,
        variationName: Object.keys(combo.options).join(' / '),
        optionValue: Object.values(combo.options).join(' / '),
        _comboId: combo.id,
        trackStock: product.trackStock === true,
        availableStock: combo.stock,
      }]
    })
    // Keep the variant picker open so user can pick another variant of the same product easily.
    // User closes manually when done.
  }

  const updateItem = (index: number, patch: Partial<ManualItem>) => {
    setItems(prev => prev.map((it, i) => i === index ? { ...it, ...patch } : it))
  }

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const activeItems = items.filter(it => it.quantity > 0)
  const subtotal = activeItems.reduce((s, it) => s + it.unitPrice * it.quantity, 0)
  const discountNum = parseFloat(discountAmount) || 0
  const total = Math.max(0, subtotal - discountNum)
  const totalQty = activeItems.reduce((s, it) => s + it.quantity, 0)

  const stockIssue = activeItems.find(it =>
    it.trackStock && typeof it.availableStock === 'number' && it.quantity > it.availableStock
  )

  const canSave = customerName.trim() && activeItems.length > 0 && total > 0 && !stockIssue

  const handleSave = async () => {
    if (!store || !firebaseUser || !canSave) return
    setSaving(true)
    try {
      // Map to OrderItem shape
      const orderItems: OrderItem[] = activeItems.map(it => {
        const base: OrderItem = {
          productId: it.productId,
          productName: it.productName,
          price: it.unitPrice,
          quantity: it.quantity,
          itemTotal: it.unitPrice * it.quantity,
        }
        if (it.variationName && it.optionValue) {
          base.selectedVariations = [{ name: it.variationName, value: it.optionValue }]
        }
        return base
      })

      // Build order payload
      const customer: { name: string; phone: string; email?: string } = {
        name: customerName.trim(),
        phone: customerPhone.trim() || '-',
      }
      if (customerEmail.trim()) customer.email = customerEmail.trim()

      const statusMap = {
        delivered_paid: { status: 'delivered' as const, paymentStatus: 'paid' as const },
        delivered_unpaid: { status: 'delivered' as const, paymentStatus: 'pending' as const },
        preparing: { status: 'preparing' as const, paymentStatus: 'pending' as const },
        pending: { status: 'pending' as const, paymentStatus: 'pending' as const },
      }
      const { status, paymentStatus } = statusMap[initialStatus]

      const orderData: Partial<Order> = {
        storeId: store.id,
        items: orderItems,
        customer,
        deliveryMethod: 'pickup',
        subtotal,
        total,
        paymentMethod,
        paymentStatus,
        status,
        channel,
        manual: true,
      }
      if (discountNum > 0) {
        orderData.discount = {
          code: 'MANUAL',
          type: 'fixed',
          value: discountNum,
          amount: discountNum,
        }
      }
      if (notes.trim()) orderData.notes = notes.trim()
      if (paymentStatus === 'paid') orderData.paidAt = new Date()
      if (paymentStatus === 'paid' && paymentNote.trim()) orderData.paymentNote = paymentNote.trim()

      // Decrement stock if product is tracked (mirror the storefront flow)
      const stockItems: { productId: string; quantity: number }[] = []
      const variantStockUpdates: { productId: string; variationName: string; optionValue: string; quantity: number }[] = []
      const combinationUpdates: { productId: string; comboId: string; quantity: number }[] = []

      for (const it of activeItems) {
        if (!it.trackStock) continue
        if (it._comboId) {
          // Combination case — manual update after order creation
          combinationUpdates.push({ productId: it.productId, comboId: it._comboId, quantity: it.quantity })
        } else if (it.variationName && it.optionValue) {
          variantStockUpdates.push({
            productId: it.productId,
            variationName: it.variationName,
            optionValue: it.optionValue,
            quantity: it.quantity,
          })
        } else {
          stockItems.push({ productId: it.productId, quantity: it.quantity })
        }
      }

      const { id: orderId, orderNumber } = await orderService.create(store.id, orderData)

      // Stock decrements (fire-and-forget — don't block UI if they fail)
      if (stockItems.length > 0) productService.decrementStock(store.id, stockItems).catch(() => {})
      if (variantStockUpdates.length > 0) productService.decrementVariantStock(store.id, variantStockUpdates).catch(() => {})
      // Combination stock update — use productService.update-like approach
      // Simpler: reload product, mutate combo, save back (kept sequential to be correct)
      for (const upd of combinationUpdates) {
        try {
          const fresh = await productService.get(store.id, upd.productId)
          if (!fresh?.combinations) continue
          const newCombos = fresh.combinations.map(c =>
            c.id === upd.comboId ? { ...c, stock: Math.max(0, c.stock - upd.quantity) } : c
          )
          const newTotal = newCombos.reduce((s, c) => s + (c.stock || 0), 0)
          await productService.update(store.id, upd.productId, {
            combinations: newCombos,
            stock: newTotal,
          })
        } catch (err) { console.error('Combo stock decrement failed:', err) }
      }

      // Build the created order to hand back
      const created: Order = {
        id: orderId,
        storeId: store.id,
        orderNumber,
        items: orderItems,
        customer,
        deliveryMethod: 'pickup',
        subtotal,
        total,
        status,
        paymentMethod,
        paymentStatus,
        channel,
        manual: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      if (orderData.discount) created.discount = orderData.discount
      if (orderData.notes) created.notes = orderData.notes
      if (orderData.paidAt) created.paidAt = orderData.paidAt
      if (orderData.paymentNote) created.paymentNote = orderData.paymentNote

      showToast('Venta registrada', 'success')
      onCreated(created)
      onClose()
    } catch (err) {
      console.error('Error creating manual sale:', err)
      showToast('Error al registrar la venta', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={onClose}>
      <div
        className="relative bg-white w-full sm:max-w-2xl sm:rounded-xl rounded-t-2xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Nueva venta</h2>
            <p className="text-xs text-gray-500 mt-0.5">Registra una venta fuera del checkout online</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Customer */}
          <section>
            <h3 className="text-[11px] text-gray-400 uppercase tracking-wider font-medium mb-2">Cliente</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="Nombre *"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40"
              />
              <input
                type="tel"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                placeholder="Telefono (opcional)"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40"
              />
              <input
                type="email"
                value={customerEmail}
                onChange={e => setCustomerEmail(e.target.value)}
                placeholder="Email (opcional)"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40"
              />
              <select
                value={channel}
                onChange={e => setChannel(e.target.value as Channel)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40"
              >
                <option value="in_store">Tienda fisica</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="instagram">Instagram</option>
                <option value="online">Online</option>
                <option value="other">Otro</option>
              </select>
            </div>
          </section>

          {/* Items */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">Productos</h3>
              <button
                type="button"
                onClick={() => setShowProductPicker(v => !v)}
                className="text-xs text-[#2d6cb5] hover:text-[#1e3a5f] font-medium"
              >
                {showProductPicker ? 'Cerrar' : '+ Agregar producto'}
              </button>
            </div>

            {showProductPicker && (
              <div className="mb-2 border border-gray-200 rounded-lg overflow-hidden">
                <input
                  type="text"
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  placeholder="Buscar por nombre o SKU..."
                  autoFocus
                  className="w-full px-3 py-2 border-b border-gray-100 text-sm focus:outline-none"
                />
                <div className="max-h-48 overflow-y-auto divide-y divide-gray-50">
                  {loadingProducts ? (
                    <p className="text-xs text-gray-400 text-center py-4">Cargando...</p>
                  ) : filteredProducts.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">Sin productos</p>
                  ) : filteredProducts.map(p => {
                    const hasCombos = p.combinations && p.combinations.length > 0
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addProduct(p)}
                        className="w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-50 text-left"
                      >
                        {p.image
                          ? <img src={p.image} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                          : <div className="w-8 h-8 rounded bg-gray-100 flex-shrink-0" />}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-900 truncate">{p.name}</p>
                          <p className="text-[11px] text-gray-400">
                            {fmt(p.price || 0)}
                            {hasCombos && <span className="ml-1">· {p.combinations!.length} combinaciones</span>}
                            {p.trackStock && typeof p.stock === 'number' && !hasCombos && (
                              <span className="ml-1">· {p.stock} en stock</span>
                            )}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {items.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-400">Sin productos. Agregá al menos uno.</p>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-50">
                {items.map((it, idx) => {
                  const overStock = it.trackStock && typeof it.availableStock === 'number' && it.quantity > it.availableStock
                  return (
                    <div key={idx} className={`px-3 py-2 ${overStock ? 'bg-red-50/40' : ''}`}>
                      <div className="flex items-start gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 truncate">{it.productName}</p>
                          {it.optionValue && <p className="text-[11px] text-gray-500">{it.optionValue}</p>}
                          {it.trackStock && typeof it.availableStock === 'number' && (
                            <p className={`text-[10px] ${overStock ? 'text-red-500' : 'text-gray-400'}`}>
                              Stock disponible: {it.availableStock}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="p-1 text-gray-300 hover:text-red-500"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-gray-400 block mb-0.5">Cantidad</label>
                          <input
                            type="number"
                            min="0"
                            value={it.quantity || ''}
                            onChange={e => updateItem(idx, { quantity: Number(e.target.value) || 0 })}
                            className={`w-full px-2 py-1.5 border rounded-md text-sm text-right ${overStock ? 'border-red-300' : 'border-gray-200'}`}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 block mb-0.5">Precio unit.</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={it.unitPrice}
                            onChange={e => updateItem(idx, { unitPrice: Number(e.target.value) || 0 })}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm text-right"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 block mb-0.5">Subtotal</label>
                          <p className="px-2 py-1.5 text-sm text-right font-medium text-gray-700">
                            {fmt(it.unitPrice * it.quantity)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div className="px-3 py-2 bg-gray-50/60 flex items-center justify-between text-xs text-gray-500">
                  <span>{totalQty} unidades</span>
                  <span className="font-medium">Subtotal: {fmt(subtotal)}</span>
                </div>
              </div>
            )}
          </section>

          {/* Discount + Notes */}
          <section>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-gray-400 uppercase tracking-wider font-medium block mb-1">Descuento</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountAmount}
                  onChange={e => setDiscountAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-400 uppercase tracking-wider font-medium block mb-1">Notas</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Opcional"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
            </div>
          </section>

          {/* Payment + Status */}
          <section>
            <h3 className="text-[11px] text-gray-400 uppercase tracking-wider font-medium mb-2">Pago y estado</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Metodo de pago</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                >
                  <option value="cash">Efectivo</option>
                  <option value="transfer">Transferencia</option>
                  <option value="card">Tarjeta</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="mercadopago">MercadoPago</option>
                  <option value="other">Otro</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Estado inicial</label>
                <select
                  value={initialStatus}
                  onChange={e => setInitialStatus(e.target.value as InitialStatus)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                >
                  <option value="delivered_paid">Completada (entregado + pagado)</option>
                  <option value="delivered_unpaid">Entregado, pendiente de pago (fiado)</option>
                  <option value="preparing">En preparacion, sin pagar</option>
                  <option value="pending">Pendiente de confirmar</option>
                </select>
              </div>
            </div>
            {initialStatus === 'delivered_paid' && (
              <input
                type="text"
                value={paymentNote}
                onChange={e => setPaymentNote(e.target.value)}
                placeholder="Nota de pago opcional (ej: ref #123)"
                className="w-full mt-2 px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between gap-3 flex-shrink-0">
          <div>
            <p className="text-[11px] text-gray-400">Total</p>
            <p className="text-xl font-semibold text-gray-900 tabular-nums">{fmt(total)}</p>
            {discountNum > 0 && (
              <p className="text-[10px] text-gray-400">−{fmt(discountNum)} descuento</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !canSave}
              className="px-5 py-2.5 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d6cb5] transition-colors text-sm font-medium disabled:opacity-40"
              title={
                !customerName.trim() ? 'Ingresa el nombre del cliente'
                : activeItems.length === 0 ? 'Agrega al menos un producto'
                : stockIssue ? 'Alguna cantidad supera el stock disponible'
                : ''
              }
            >
              {saving ? 'Guardando...' : 'Registrar venta'}
            </button>
          </div>
        </div>

        {/* Variant picker — second layer, opens when a product with combinations is selected */}
        {variantPickerProduct && (() => {
          const product = variantPickerProduct
          const combos = (product.combinations || []).filter(c => c.available)
          const filtered = variantSearch.trim()
            ? combos.filter(c => Object.values(c.options).join(' ').toLowerCase().includes(variantSearch.trim().toLowerCase()))
            : combos
          return (
            <div className="absolute inset-0 bg-black/40 flex items-end sm:items-center justify-center z-10 p-0 sm:p-4" onClick={() => setVariantPickerProduct(null)}>
              <div
                className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{product.name}</h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">Elegi una variante</p>
                  </div>
                  <button
                    onClick={() => setVariantPickerProduct(null)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Search if many combos */}
                {combos.length > 6 && (
                  <div className="px-4 py-2 border-b border-gray-100">
                    <input
                      type="text"
                      value={variantSearch}
                      onChange={e => setVariantSearch(e.target.value)}
                      placeholder="Buscar variante..."
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-1 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40"
                    />
                  </div>
                )}

                {/* Combo list */}
                <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
                  {filtered.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">Sin variantes disponibles</p>
                  ) : filtered.map(combo => {
                    const label = Object.values(combo.options).join(' / ')
                    const alreadyAddedQty = items.find(it => it._comboId === combo.id)?.quantity || 0
                    const outOfStock = product.trackStock && combo.stock === 0
                    return (
                      <button
                        key={combo.id}
                        type="button"
                        onClick={() => !outOfStock && addCombo(product, combo)}
                        disabled={outOfStock}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-900 truncate">{label}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-gray-500">{fmt(combo.price || product.price || 0)}</span>
                            {product.trackStock && (
                              <span className={`text-[11px] ${outOfStock ? 'text-red-500' : 'text-gray-400'}`}>
                                {outOfStock ? 'Sin stock' : `Stock: ${combo.stock}`}
                              </span>
                            )}
                            {combo.sku && <span className="text-[11px] text-gray-400">· {combo.sku}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          {alreadyAddedQty > 0 && (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[11px] font-medium rounded">
                              +{alreadyAddedQty}
                            </span>
                          )}
                          <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Footer */}
                <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between flex-shrink-0 bg-gray-50/50">
                  <p className="text-[11px] text-gray-500">
                    Toca una variante para agregarla. Podes agregar varias.
                  </p>
                  <button
                    onClick={() => setVariantPickerProduct(null)}
                    className="px-3 py-1.5 text-sm font-medium text-[#1e3a5f] hover:text-[#2d6cb5]"
                  >
                    Listo
                  </button>
                </div>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
