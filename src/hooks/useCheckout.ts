import { useState, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import type { Store, Order, OrderItem, Coupon } from '../types'
import type { CartItem } from './useCart'
import { orderService, couponService, productService, db } from '../lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { createPreference, cartToPreference, processPayment } from '../lib/mercadopago'
import { resolveShippingCost } from '../lib/shipping'
import { findCombination, getDisplayImage, getDisplayPrice } from '../lib/variants'
import { apiUrl } from '../utils/apiBase'

export type CheckoutStep = 'customer' | 'delivery' | 'payment' | 'brick' | 'stripe' | 'confirmation'

// LocalStorage key for saved customer data (per store)
const getCustomerStorageKey = (storeId: string) => `shopifree_customer_${storeId}`

// Saved customer data structure
interface SavedCustomerData {
  customer?: {
    name: string
    phone: string
    email?: string
  }
  delivery?: {
    method: 'pickup' | 'delivery'
    address?: {
      state?: string
      city?: string
      district?: string
      street: string
      reference?: string
    }
  }
  savedAt: number
}

// Load saved customer data from localStorage
const loadSavedCustomerData = (storeId: string): Partial<SavedCustomerData> | null => {
  try {
    const key = getCustomerStorageKey(storeId)
    const saved = localStorage.getItem(key)
    if (!saved) return null

    const data = JSON.parse(saved) as SavedCustomerData

    // Expire after 30 days
    const thirtyDays = 30 * 24 * 60 * 60 * 1000
    if (Date.now() - data.savedAt > thirtyDays) {
      localStorage.removeItem(key)
      return null
    }

    return data
  } catch {
    return null
  }
}

// Save customer data to localStorage
const saveCustomerData = (storeId: string, customer: CustomerData, delivery: DeliveryData) => {
  try {
    const key = getCustomerStorageKey(storeId)
    const data: SavedCustomerData = {
      customer: {
        name: customer.name,
        phone: customer.phone,
        ...(customer.email && { email: customer.email })
      },
      delivery: {
        method: delivery.method,
        ...(delivery.address && {
          address: {
            ...(delivery.address.state && { state: delivery.address.state }),
            ...(delivery.address.city && { city: delivery.address.city }),
            ...(delivery.address.district && { district: delivery.address.district }),
            street: delivery.address.street,
            ...(delivery.address.reference && { reference: delivery.address.reference })
          }
        })
      },
      savedAt: Date.now()
    }
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    // Ignore localStorage errors
  }
}

export interface CustomerData {
  name: string
  phone: string
  email?: string
}

export interface DeliveryData {
  method: 'pickup' | 'delivery'
  address?: {
    country?: string
    state?: string
    city?: string
    district?: string
    street: string
    reference?: string
    zipCode?: string
  }
  observations?: string
}

export interface CheckoutData {
  customer?: CustomerData
  delivery?: DeliveryData
  paymentMethod?: 'whatsapp' | 'mercadopago' | 'stripe' | 'paypal' | 'transfer'
}

interface UseCheckoutOptions {
  store: Store
  items: CartItem[]
  totalPrice: number
  onOrderComplete?: (order: Order) => void
}

export function useCheckout({ store, items, totalPrice, onOrderComplete }: UseCheckoutOptions) {
  const [step, setStep] = useState<CheckoutStep>('customer')
  // Load saved customer data synchronously so it's available on first render
  const [data, setData] = useState<CheckoutData>(() => {
    const savedData = loadSavedCustomerData(store.id)
    if (savedData) {
      return {
        customer: savedData.customer,
        delivery: savedData.delivery
      }
    }
    return {}
  })
  const [order, setOrder] = useState<Order | null>(null)
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null)
  const [preferenceId, setPreferenceId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Coupon state
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)

  // Calculate discount amount
  const discountAmount = appliedCoupon
    ? appliedCoupon.discountType === 'percentage'
      ? Math.round(totalPrice * appliedCoupon.discountValue) / 100
      : Math.min(appliedCoupon.discountValue, totalPrice)
    : 0

  // Apply a coupon code
  const applyCoupon = useCallback(async (code: string) => {
    setCouponError(null)
    setCouponLoading(true)
    try {
      const result = await couponService.validateCode(store.id, code, totalPrice)
      if (result.valid && result.coupon) {
        setAppliedCoupon(result.coupon)
      } else {
        setCouponError(result.error || 'couponInvalid')
      }
    } catch {
      setCouponError('couponInvalid')
    } finally {
      setCouponLoading(false)
    }
  }, [store.id, totalPrice])

  // Remove applied coupon
  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null)
    setCouponError(null)
  }, [])

  // Calculate shipping cost based on store settings, delivery method, and zone
  const calculateShippingCost = useCallback((): number => {
    if (!data.delivery?.method || data.delivery.method === 'pickup') {
      return 0
    }
    return resolveShippingCost(store, totalPrice, data.delivery?.address?.state)
  }, [data.delivery?.method, data.delivery?.address?.state, store, totalPrice])

  const shippingCost = calculateShippingCost()
  const shippingLoading = false
  const finalTotal = totalPrice - discountAmount + shippingCost

  const updateData = useCallback((updates: Partial<CheckoutData>) => {
    setData(prev => ({ ...prev, ...updates }))
  }, [])

  const goToStep = useCallback((newStep: CheckoutStep) => {
    setStep(newStep)
    setError(null)
  }, [])

  const goBack = useCallback(() => {
    setError(null)
    switch (step) {
      case 'delivery':
        setStep('customer')
        break
      case 'payment':
        setStep('delivery')
        break
      case 'brick':
        setStep('payment')
        break
      case 'stripe':
        setStep('payment')
        break
      case 'confirmation':
        // Can't go back from confirmation
        break
    }
  }, [step])

  const goNext = useCallback(() => {
    setError(null)
    switch (step) {
      case 'customer':
        setStep('delivery')
        break
      case 'delivery':
        setStep('payment')
        break
      case 'payment':
        // Payment step triggers order creation
        break
    }
  }, [step])

  // Convert cart items to order items (removing undefined values for Firestore)
  const createOrderItems = useCallback((): OrderItem[] => {
    return items.map(item => {
      // Resolve the actual price the customer is paying for THIS line. When a
      // variant combination is selected, its price wins (variant pricing); the
      // legacy product price is the fallback. This is the source of truth for
      // the order — `item.itemPrice` already reflects this from the drawer,
      // but we recompute here defensively in case anything bypassed the drawer.
      const variantPrice = getDisplayPrice(item.product, item.selectedVariants)
      // Image: prefer variant-specific image when present
      const lineImage = getDisplayImage(item.product, item.selectedVariants)
      // Combination metadata: track which exact variant was sold for fulfillment
      const combo = findCombination(item.product, item.selectedVariants)

      const orderItem: OrderItem = {
        productId: item.product.id,
        productName: item.product.name,
        price: variantPrice,
        quantity: item.quantity,
        itemTotal: item.itemPrice * item.quantity,
      }

      if (lineImage) {
        orderItem.productImage = lineImage
      }

      if (item.selectedVariants && Object.keys(item.selectedVariants).length > 0) {
        orderItem.selectedVariations = Object.entries(item.selectedVariants).map(([name, value]) => ({ name, value }))
      }

      if (combo) {
        orderItem.combinationId = combo.id
        if (combo.sku) orderItem.combinationSku = combo.sku
      }

      if (item.selectedModifiers && item.selectedModifiers.length > 0) {
        orderItem.selectedModifiers = item.selectedModifiers.map(mod => ({
          groupName: mod.groupName,
          options: mod.options.map(opt => ({ name: opt.name, price: opt.price }))
        }))
      }

      if (item.product.cjProductId) {
        orderItem.cjProductId = item.product.cjProductId
      }
      if (item.product.printfulProductId) {
        orderItem.printfulProductId = item.product.printfulProductId
      }

      return orderItem
    })
  }, [items])

  // Create order in Firestore
  const createOrder = useCallback(async (paymentMethod: 'whatsapp' | 'mercadopago' | 'stripe' | 'paypal' | 'transfer'): Promise<Order> => {
    if (!data.customer || !data.delivery) {
      throw new Error('Missing customer or delivery data')
    }

    // Build customer object without undefined values
    const customer: { name: string; phone: string; email?: string } = {
      name: data.customer.name,
      phone: data.customer.phone
    }
    if (data.customer.email) {
      customer.email = data.customer.email
    }

    // Calculate shipping for the order
    const orderShippingCost = calculateShippingCost()
    const orderTotal = totalPrice - discountAmount + orderShippingCost

    // Build order data without undefined values
    const orderData: Partial<Order> = {
      storeId: store.id,
      items: createOrderItems(),
      customer,
      deliveryMethod: data.delivery.method,
      subtotal: totalPrice,
      total: orderTotal,
      paymentMethod,
      paymentStatus: 'pending',
      status: 'pending'
    }

    // Only add shippingCost if it's greater than 0 (Firestore doesn't accept undefined)
    if (orderShippingCost > 0) {
      orderData.shippingCost = orderShippingCost
    }

    // Add discount if coupon applied
    if (appliedCoupon && discountAmount > 0) {
      orderData.discount = {
        code: appliedCoupon.code,
        type: appliedCoupon.discountType,
        value: appliedCoupon.discountValue,
        amount: discountAmount
      }
    }

    // Only add delivery address for delivery method
    if (data.delivery.method === 'delivery' && data.delivery.address) {
      const address: { state?: string; city?: string; district?: string; street: string; reference?: string } = {
        street: data.delivery.address.street
      }
      if (data.delivery.address.state) {
        address.state = data.delivery.address.state
      }
      if (data.delivery.address.city) {
        address.city = data.delivery.address.city
      }
      if (data.delivery.address.district) {
        address.district = data.delivery.address.district
      }
      if (data.delivery.address.reference) {
        address.reference = data.delivery.address.reference
      }
      orderData.deliveryAddress = address
    }

    // Add observations/notes if provided
    if (data.delivery.observations) {
      orderData.notes = data.delivery.observations
    }

    // Validate stock before creating the order. Three paths, in order of
    // preference, mirroring the rest of the system:
    //   (a) Modern: product has combinations[] → check + decrement combo stock.
    //   (b) Legacy variant: product has variations[].options[].stock but no
    //       combinations → check + decrement option-level stock.
    //   (c) Simple: product.stock for products without variants.
    const stockItems: { productId: string; quantity: number; name: string }[] = []
    const variantStockUpdates: { productId: string; variationName: string; optionValue: string; quantity: number; productName: string }[] = []
    const combinationStockUpdates: { productId: string; combinationId: string; quantity: number }[] = []

    for (const item of items) {
      if (!item.product.trackStock) continue

      const freshProduct = await productService.get(store.id, item.product.id)
      if (!freshProduct || !freshProduct.trackStock) continue

      // (a) Modern: combinations[]
      if (item.selectedVariants && freshProduct.combinations?.length) {
        const combo = findCombination(freshProduct, item.selectedVariants)
        if (!combo) {
          throw new Error(`stockInsufficient:${item.product.name}:0`)
        }
        if (!combo.available) {
          throw new Error(`stockInsufficient:${item.product.name}:0`)
        }
        if (combo.stock < item.quantity) {
          const variantLabel = Object.values(item.selectedVariants).join(' / ')
          throw new Error(`stockInsufficient:${item.product.name} (${variantLabel}):${combo.stock}`)
        }
        combinationStockUpdates.push({
          productId: item.product.id,
          combinationId: combo.id,
          quantity: item.quantity,
        })
        continue
      }

      // (b) Legacy variant-level stock
      if (item.selectedVariants && freshProduct.variations?.length) {
        let hasVariantStock = false
        for (const [varName, varValue] of Object.entries(item.selectedVariants)) {
          const variation = freshProduct.variations.find(v => v.name === varName)
          const option = variation?.options.find(o => o.value === varValue)
          if (option && typeof option.stock === 'number') {
            hasVariantStock = true
            if (option.stock < item.quantity) {
              throw new Error(`stockInsufficient:${item.product.name} (${varValue}):${option.stock}`)
            }
            variantStockUpdates.push({
              productId: item.product.id,
              variationName: varName,
              optionValue: varValue,
              quantity: item.quantity,
              productName: item.product.name
            })
          }
        }
        if (hasVariantStock) continue
      }

      // (c) Simple product
      if (typeof freshProduct.stock === 'number') {
        if (freshProduct.stock < item.quantity) {
          throw new Error(`stockInsufficient:${item.product.name}:${freshProduct.stock}`)
        }
        stockItems.push({ productId: item.product.id, quantity: item.quantity, name: item.product.name })
      }
    }

    const { id: orderId, orderNumber } = await orderService.create(store.id, orderData)

    // Decrement product-level stock (simple products)
    if (stockItems.length > 0) {
      productService.decrementStock(store.id, stockItems).catch(() => {})
    }

    // Decrement combination-level stock (modern variant model). This also
    // recomputes product.stock and warehouseStock from the combinations so
    // the dashboard inventory view stays consistent.
    if (combinationStockUpdates.length > 0) {
      productService.decrementCombinationStock(store.id, combinationStockUpdates).catch(() => {})
    }

    // Decrement legacy option-level stock (only for products that haven't
    // been migrated to combinations[]).
    if (variantStockUpdates.length > 0) {
      productService.decrementVariantStock(store.id, variantStockUpdates).catch(() => {})
    }

    // Increment coupon uses after successful order creation
    if (appliedCoupon) {
      couponService.incrementUses(store.id, appliedCoupon.id).catch(() => {})
    }

    // Build the order object from the data we have (no need to fetch)
    const createdOrder: Order = {
      id: orderId,
      storeId: store.id,
      orderNumber,
      items: orderData.items!,
      customer: orderData.customer,
      deliveryMethod: orderData.deliveryMethod,
      deliveryAddress: orderData.deliveryAddress,
      subtotal: totalPrice,
      shippingCost: orderShippingCost > 0 ? orderShippingCost : undefined,
      discount: orderData.discount,
      total: orderTotal,
      status: 'pending',
      paymentMethod,
      paymentStatus: 'pending',
      notes: orderData.notes,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Fire Purchase pixel event for flows that finalize here (whatsapp/transfer).
    // For mercadopago/stripe we fire it from PaymentSuccess once the gateway confirms.
    if (paymentMethod === 'whatsapp' || paymentMethod === 'transfer') {
      import('../lib/pixels').then(({ trackPurchase }) => {
        trackPurchase({
          transactionId: orderNumber,
          currency: store.currency || 'USD',
          value: orderTotal,
          items: (orderData.items || []).map(it => ({
            id: it.productId,
            name: it.productName,
            price: it.price,
            quantity: it.quantity,
          })),
        })
      }).catch(() => { /* silent */ })
    }

    return createdOrder
  }, [store.id, store.currency, data, totalPrice, discountAmount, appliedCoupon, createOrderItems])

  // WhatsApp message translations
  const getMessageLabels = useCallback(() => {
    const lang = store.language || 'es'
    const businessType = store.businessType || 'general'

    // Adapt "items" label based on business type
    const getItemsLabel = () => {
      if (lang === 'en') {
        switch (businessType) {
          case 'food': return 'Items'
          case 'beauty': return 'Services'
          default: return 'Products'
        }
      }
      // Spanish (default)
      switch (businessType) {
        case 'food': return 'Pedido'
        case 'beauty': return 'Servicios'
        default: return 'Productos'
      }
    }

    if (lang === 'en') {
      return {
        newOrder: 'New Order',
        customer: 'Customer',
        name: 'Name',
        phone: 'Phone',
        delivery: 'Delivery',
        pickup: 'Store pickup',
        homeDelivery: 'Home delivery',
        ref: 'Ref',
        items: getItemsLabel(),
        subtotal: 'Subtotal',
        discount: 'Discount',
        shipping: 'Shipping',
        freeShipping: 'Free',
        total: 'Total',
        notes: 'Notes'
      }
    }

    // Spanish (default)
    return {
      newOrder: 'Nuevo Pedido',
      customer: 'Cliente',
      name: 'Nombre',
      phone: 'Tel',
      delivery: 'Entrega',
      pickup: 'Retiro en tienda',
      homeDelivery: 'Delivery',
      ref: 'Ref',
      items: getItemsLabel(),
      subtotal: 'Subtotal',
      discount: 'Descuento',
      shipping: 'Envío',
      freeShipping: 'Gratis',
      total: 'Total',
      notes: 'Notas'
    }
  }, [store.language, store.businessType])

  // Build WhatsApp message with full order details
  const buildWhatsAppMessage = useCallback((order: Order): string => {
    const currency = store.currency || 'USD'
    const currencySymbol = currency === 'PEN' ? 'S/' : currency === 'MXN' ? '$' : currency === 'COP' ? '$' : currency === 'ARS' ? '$' : '$'
    const labels = getMessageLabels()

    let message = `*${labels.newOrder} ${order.orderNumber}*\n\n`

    // Customer info
    message += `*${labels.customer}:*\n`
    message += `${labels.name}: ${order.customer?.name || '-'}\n`
    message += `${labels.phone}: ${order.customer?.phone || '-'}\n`
    if (order.customer?.email) {
      message += `Email: ${order.customer.email}\n`
    }
    message += `\n`

    // Delivery info
    message += `*${labels.delivery}:*\n`
    if (order.deliveryMethod === 'pickup') {
      message += `${labels.pickup}\n`
    } else if (order.deliveryMethod === 'delivery' && order.deliveryAddress) {
      message += `${labels.homeDelivery}\n`
      const addressParts = [order.deliveryAddress.street, order.deliveryAddress.city]
      if (order.deliveryAddress.state) {
        addressParts.push(order.deliveryAddress.state)
      }
      message += `${addressParts.join(', ')}\n`
      if (order.deliveryAddress.reference) {
        message += `${labels.ref}: ${order.deliveryAddress.reference}\n`
      }
    }
    message += `\n`

    // Order items
    message += `*${labels.items}:*\n`
    order.items.forEach(item => {
      message += `${item.quantity}x ${item.productName} - ${currencySymbol}${item.itemTotal.toFixed(2)}\n`
      // Show selected modifiers if any
      if (item.selectedModifiers && item.selectedModifiers.length > 0) {
        item.selectedModifiers.forEach(mod => {
          mod.options.forEach(opt => {
            message += `   + ${opt.name}${opt.price > 0 ? ` (+${currencySymbol}${opt.price.toFixed(2)})` : ''}\n`
          })
        })
      }
      // Show selected variations if any
      if (item.selectedVariations && item.selectedVariations.length > 0) {
        const variations = item.selectedVariations.map(v => `${v.name}: ${v.value}`).join(', ')
        message += `   (${variations})\n`
      }
    })
    message += `\n`

    // Totals
    const hasDiscount = order.discount && order.discount.amount > 0
    const hasShipping = order.shippingCost && order.shippingCost > 0
    if (hasDiscount || hasShipping) {
      message += `${labels.subtotal}: ${currencySymbol}${order.subtotal.toFixed(2)}\n`
      if (hasDiscount) {
        message += `${labels.discount} (${order.discount!.code}): -${currencySymbol}${order.discount!.amount.toFixed(2)}\n`
      }
      if (hasShipping) {
        message += `${labels.shipping}: ${currencySymbol}${order.shippingCost!.toFixed(2)}\n`
      }
    }
    message += `*${labels.total}: ${currencySymbol}${order.total.toFixed(2)}*\n`

    // Notes if any
    if (order.notes) {
      message += `\n*${labels.notes}:* ${order.notes}\n`
    }

    return message
  }, [store.currency, getMessageLabels])

  // Process WhatsApp payment
  const processWhatsApp = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const createdOrder = await createOrder('whatsapp')
      setOrder(createdOrder)

      // Save customer data for future orders
      if (data.customer && data.delivery) {
        saveCustomerData(store.id, data.customer, data.delivery)
      }

      // Build WhatsApp URL with full order details
      const phone = store.whatsapp.replace(/\D/g, '')
      const message = encodeURIComponent(buildWhatsAppMessage(createdOrder))
      const waUrl = `https://wa.me/${phone}?text=${message}`

      // Stash the wa.me URL so the OrderConfirmation screen's "Enviar por WhatsApp"
      // button opens the chat. We intentionally DO NOT auto-redirect here — the user
      // sees the full order summary first and taps the button when ready.
      setWhatsappUrl(waUrl)

      // Show confirmation
      setStep('confirmation')
      // Don't call onOrderComplete here — the themes wire it to clearCart +
      // close-drawer, which would dismiss the confirmation screen. Stripe/Brick
      // flows do the same: onOrderComplete fires from handleBackToStore when the
      // user taps "Volver a la tienda".
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating order')
    } finally {
      setLoading(false)
    }
  }, [createOrder, store.id, store.whatsapp, data.customer, data.delivery, onOrderComplete, buildWhatsAppMessage])

  // Whether we're in brick mode (inline card form vs redirect)
  const brickMode = step === 'brick'

  // Process MercadoPago payment - now routes to Brick when publicKey exists
  const processMercadoPago = useCallback(async () => {
    if (!store.payments?.mercadopago?.enabled) {
      setError('MercadoPago no esta habilitado')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const createdOrder = await createOrder('mercadopago')
      setOrder(createdOrder)

      // Save customer data for future orders
      if (data.customer && data.delivery) {
        saveCustomerData(store.id, data.customer, data.delivery)
      }

      // If store has publicKey, create preference and show the Brick inline
      if (store.payments.mercadopago.publicKey) {
        // Create preference for Brick (needed for mercadoPago wallet payments)
        const mpItems = items.map((item, index) => ({
          id: item.product.id || `item-${index}`,
          name: item.product.name,
          price: item.itemPrice,
          quantity: item.quantity
        }))
        const preference = cartToPreference(mpItems, store.currency, createdOrder.id)
        if (data.customer) {
          preference.payer = {
            name: data.customer.name,
            email: data.customer.email,
            phone: { number: data.customer.phone }
          }
        }
        const result = await createPreference(store.id, createdOrder.id, createdOrder.orderNumber, preference)
        setPreferenceId(result.preference_id)

        // Save pendingOrder for MP Wallet redirect (wallet redirects away from site)
        localStorage.setItem('pendingOrder', JSON.stringify({
          orderId: createdOrder.id,
          storeId: store.id,
          orderNumber: createdOrder.orderNumber,
          language: store.language || 'es',
          storeName: store.name,
          storeWhatsapp: store.whatsapp,
          storeSubdomain: store.subdomain,
          currency: store.currency || 'USD',
          customer: data.customer,
          deliveryMethod: data.delivery?.method,
          deliveryAddress: data.delivery?.address,
          observations: data.delivery?.observations,
          items: createdOrder.items,
          subtotal: createdOrder.subtotal,
          shippingCost: createdOrder.shippingCost || 0,
          total: createdOrder.total
        }))

        setLoading(false)
        setStep('brick')
        return
      }

      // Otherwise, fallback to Checkout Pro redirect
      await redirectToCheckoutPro(createdOrder)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error processing payment')
      setLoading(false)
    }
  }, [store, items, data.customer, data.delivery, createOrder])

  // Process PayPal payment — creates the order on Shopifree, calls our
  // serverless route to open a PayPal Order on the merchant's behalf, then
  // redirects the buyer to PayPal's approve URL. PayPal redirects back to
  // /payment/success?paypal=1&orderId=...&storeId=... where PaymentSuccess
  // calls /api/process-paypal-payment to capture the funds.
  const processPayPal = useCallback(async () => {
    if (!store.payments?.paypal?.enabled) {
      setError('PayPal no está habilitado')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const createdOrder = await createOrder('paypal')
      setOrder(createdOrder)
      if (data.customer && data.delivery) {
        saveCustomerData(store.id, data.customer, data.delivery)
      }

      const ppItems = items.map((item, index) => ({
        name: item.product.name || `item-${index}`,
        quantity: item.quantity,
        unit_price: item.itemPrice,
      }))

      const res = await fetch(apiUrl('/api/create-paypal-order'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: store.id,
          orderId: createdOrder.id,
          orderNumber: createdOrder.orderNumber,
          items: ppItems,
          total: createdOrder.total,
          currency: store.currency || 'USD',
          origin: window.location.origin,
        }),
      })
      const text = await res.text()
      const json = text ? JSON.parse(text) : {}
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
      if (!json.approveUrl) throw new Error('PayPal did not return an approve URL')

      // Save pendingOrder so the return page can re-hydrate state if the
      // merchant uses a custom domain or the buyer's session is lost.
      localStorage.setItem('pendingOrder', JSON.stringify({
        orderId: createdOrder.id,
        storeId: store.id,
        orderNumber: createdOrder.orderNumber,
        paypalOrderId: json.paypalOrderId,
        language: store.language || 'es',
        storeName: store.name,
        storeWhatsapp: store.whatsapp,
        storeSubdomain: store.subdomain,
        currency: store.currency || 'USD',
        customer: data.customer,
        deliveryMethod: data.delivery?.method,
        deliveryAddress: data.delivery?.address,
        observations: data.delivery?.observations,
        items: createdOrder.items,
        subtotal: createdOrder.subtotal,
        shippingCost: createdOrder.shippingCost || 0,
        total: createdOrder.total,
        paymentMethod: 'paypal',
      }))

      window.location.href = json.approveUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error processing PayPal payment')
      setLoading(false)
    }
  }, [store, items, data.customer, data.delivery, createOrder])

  // Redirect to Checkout Pro (used as fallback)
  const redirectToCheckoutPro = useCallback(async (existingOrder?: Order) => {
    const orderToUse = existingOrder || order
    if (!orderToUse) return

    try {
      setLoading(true)

      // Build MP preference items from cart
      const mpItems = items.map((item, index) => ({
        id: item.product.id || `item-${index}`,
        name: item.product.name,
        price: item.itemPrice,
        quantity: item.quantity
      }))

      const preference = cartToPreference(mpItems, store.currency, orderToUse.id)

      // Add customer info if available
      if (data.customer) {
        preference.payer = {
          name: data.customer.name,
          email: data.customer.email,
          phone: { number: data.customer.phone }
        }
      }

      // Call server-side API route
      const result = await createPreference(store.id, orderToUse.id, orderToUse.orderNumber, preference)

      // Store full order info in localStorage for payment return page
      localStorage.setItem('pendingOrder', JSON.stringify({
        orderId: orderToUse.id,
        storeId: store.id,
        orderNumber: orderToUse.orderNumber,
        language: store.language || 'es',
        storeName: store.name,
        storeWhatsapp: store.whatsapp,
        storeSubdomain: store.subdomain,
        currency: store.currency || 'USD',
        customer: data.customer,
        deliveryMethod: data.delivery?.method,
        deliveryAddress: data.delivery?.address,
        observations: data.delivery?.observations,
        items: orderToUse.items,
        subtotal: orderToUse.subtotal,
        shippingCost: orderToUse.shippingCost || 0,
        total: orderToUse.total
      }))

      // Redirect to MercadoPago
      if (Capacitor.isNativePlatform()) {
        // Native: open in in-app browser, then check order status when user returns
        const { Browser } = await import('@capacitor/browser')
        const pendingOrderId = orderToUse.id
        const pendingStoreId = store.id

        const onBrowserFinished = async () => {
          Browser.removeAllListeners()
          // Check if the order was confirmed by webhook while user was paying
          try {
            const orderDoc = await getDoc(doc(db, 'stores', pendingStoreId, 'orders', pendingOrderId))
            const confirmedOrder = orderDoc.exists()
              ? { id: orderDoc.id, storeId: pendingStoreId, ...orderDoc.data() } as Order
              : null
            setOrder(confirmedOrder || orderToUse)
            setStep('confirmation')
            onOrderComplete?.(confirmedOrder || orderToUse)
            localStorage.removeItem('pendingOrder')
          } catch {
            // Fallback: show confirmation with what we have
            setStep('confirmation')
            onOrderComplete?.(orderToUse)
            localStorage.removeItem('pendingOrder')
          }
          setLoading(false)
        }

        Browser.addListener('browserFinished', onBrowserFinished)
        await Browser.open({ url: result.init_point })
      } else {
        // Web: standard redirect
        window.location.href = result.init_point
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error processing payment')
      setLoading(false)
    }
  }, [order, store, items, data.customer, data.delivery, onOrderComplete])

  // Fallback from Brick to Checkout Pro redirect
  const fallbackToCheckoutPro = useCallback(() => {
    redirectToCheckoutPro()
  }, [redirectToCheckoutPro])

  // Process payment from the Brick form data
  const processBrickPayment = useCallback(async (formData: Record<string, unknown>) => {
    if (!order) return

    setLoading(true)
    setError(null)

    try {
      const result = await processPayment(store.id, order.id, formData)

      if (result.status === 'approved') {
        const paidOrder = { ...order, paymentStatus: 'paid' as const, status: 'confirmed' as const, paymentId: String(result.payment_id) }
        setOrder(paidOrder)
        setStep('confirmation')
        // Don't call onOrderComplete here - it closes the drawer before confirmation shows.
        // It will be called when user clicks "Back to Store" from the confirmation page.
      } else if (result.status === 'in_process' || result.status === 'pending') {
        const pendingOrder = { ...order, paymentId: String(result.payment_id) }
        setOrder(pendingOrder)
        setStep('confirmation')
      } else {
        // rejected - pass status_detail for specific error message
        const detail = `paymentRejected:${result.status_detail || 'unknown'}`
        setError(detail)
        throw new Error(detail)
      }
    } catch (err) {
      if (!err || !(err instanceof Error) || !err.message.startsWith('paymentRejected:')) {
        setError(err instanceof Error ? err.message : 'Error processing payment')
      }
    } finally {
      setLoading(false)
    }
  }, [order, store.id, onOrderComplete])

  // Whether we're in stripe mode (inline payment element)
  const stripeMode = step === 'stripe'

  // Process Stripe payment - creates order then shows Payment Element
  const processStripe = useCallback(async () => {
    if (!store.payments?.stripe?.enabled) {
      setError('Stripe is not enabled')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const createdOrder = await createOrder('stripe')
      setOrder(createdOrder)

      // Save customer data for future orders
      if (data.customer && data.delivery) {
        saveCustomerData(store.id, data.customer, data.delivery)
      }

      setLoading(false)
      setStep('stripe')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error processing payment')
      setLoading(false)
    }
  }, [store, data.customer, data.delivery, createOrder])

  // Handle Stripe payment completion from StripeElement
  const processStripePaymentComplete = useCallback((result: { status: string; paymentId: string }) => {
    if (!order) return

    if (result.status === 'succeeded') {
      const paidOrder = { ...order, paymentStatus: 'paid' as const, status: 'confirmed' as const, paymentId: result.paymentId }
      setOrder(paidOrder)
      setStep('confirmation')
    } else if (result.status === 'processing') {
      const pendingOrder = { ...order, paymentId: result.paymentId }
      setOrder(pendingOrder)
      setStep('confirmation')
    } else {
      setError('paymentRejected')
    }
  }, [order])

  // Process bank transfer
  const processTransfer = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const createdOrder = await createOrder('transfer')
      setOrder(createdOrder)

      // Save customer data for future orders
      if (data.customer && data.delivery) {
        saveCustomerData(store.id, data.customer, data.delivery)
      }

      setStep('confirmation')
      // Don't call onOrderComplete here - it closes the drawer before confirmation shows.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating order')
    } finally {
      setLoading(false)
    }
  }, [createOrder, store.id, data.customer, data.delivery])

  // Validate customer data
  const validateCustomer = useCallback((): boolean => {
    if (!data.customer?.name?.trim()) {
      setError('nameRequired')
      return false
    }
    if (!data.customer?.phone?.trim()) {
      setError('phoneRequired')
      return false
    }
    return true
  }, [data.customer])

  // Validate delivery data
  const validateDelivery = useCallback((): boolean => {
    if (!data.delivery?.method) {
      return false
    }
    if (data.delivery.method === 'delivery') {
      if (!data.delivery.address?.street?.trim()) {
        setError('addressRequired')
        return false
      }
      if (!data.delivery.address?.city?.trim()) {
        setError('cityRequired')
        return false
      }
    }
    return true
  }, [data.delivery])

  return {
    step,
    data,
    order,
    whatsappUrl,
    preferenceId,
    loading,
    error,
    shippingCost,
    shippingLoading,
    finalTotal,
    discountAmount,
    appliedCoupon,
    couponError,
    couponLoading,
    brickMode,
    stripeMode,
    setStep: goToStep,
    goBack,
    goNext,
    updateData,
    validateCustomer,
    validateDelivery,
    applyCoupon,
    removeCoupon,
    processWhatsApp,
    processMercadoPago,
    processStripe,
    processStripePaymentComplete,
    processTransfer,
    processPayPal,
    processBrickPayment,
    fallbackToCheckoutPro
  }
}
