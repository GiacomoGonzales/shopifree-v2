import { useState, useCallback } from 'react'
import type { Store, Order, OrderItem } from '../types'
import type { CartItem } from './useCart'
import { orderService } from '../lib/firebase'
import { createPreference, cartToPreference, processPayment } from '../lib/mercadopago'
import { resolveShippingCost } from '../lib/shipping'

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
      street: string
      city: string
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
            street: delivery.address.street,
            city: delivery.address.city,
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
    state?: string
    street: string
    city: string
    reference?: string
  }
  observations?: string
}

export interface CheckoutData {
  customer?: CustomerData
  delivery?: DeliveryData
  paymentMethod?: 'whatsapp' | 'mercadopago' | 'stripe' | 'transfer'
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

  // Calculate shipping cost based on store settings, delivery method, and zone
  const calculateShippingCost = useCallback((): number => {
    // If no delivery method selected or pickup, no shipping cost
    if (!data.delivery?.method || data.delivery.method === 'pickup') {
      return 0
    }

    return resolveShippingCost(store, totalPrice, data.delivery?.address?.state)
  }, [data.delivery?.method, data.delivery?.address?.state, store, totalPrice])

  // Get the current shipping cost
  const shippingCost = calculateShippingCost()
  const finalTotal = totalPrice + shippingCost

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
      const orderItem: OrderItem = {
        productId: item.product.id,
        productName: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        itemTotal: item.itemPrice * item.quantity
      }

      // Only add optional fields if they have values
      if (item.product.image) {
        orderItem.productImage = item.product.image
      }

      if (item.selectedVariants && Object.keys(item.selectedVariants).length > 0) {
        orderItem.selectedVariations = Object.entries(item.selectedVariants).map(([name, value]) => ({ name, value }))
      }

      if (item.selectedModifiers && item.selectedModifiers.length > 0) {
        orderItem.selectedModifiers = item.selectedModifiers.map(mod => ({
          groupName: mod.groupName,
          options: mod.options.map(opt => ({ name: opt.name, price: opt.price }))
        }))
      }

      return orderItem
    })
  }, [items])

  // Create order in Firestore
  const createOrder = useCallback(async (paymentMethod: 'whatsapp' | 'mercadopago' | 'stripe' | 'transfer'): Promise<Order> => {
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
    const orderTotal = totalPrice + orderShippingCost

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

    // Only add delivery address for delivery method
    if (data.delivery.method === 'delivery' && data.delivery.address) {
      const address: { state?: string; street: string; city: string; reference?: string } = {
        street: data.delivery.address.street,
        city: data.delivery.address.city
      }
      if (data.delivery.address.state) {
        address.state = data.delivery.address.state
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

    const { id: orderId, orderNumber } = await orderService.create(store.id, orderData)

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
      total: orderTotal,
      status: 'pending',
      paymentMethod,
      paymentStatus: 'pending',
      notes: orderData.notes,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    return createdOrder
  }, [store.id, data, totalPrice, createOrderItems])

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
    if (order.shippingCost && order.shippingCost > 0) {
      message += `${labels.subtotal}: ${currencySymbol}${order.subtotal.toFixed(2)}\n`
      message += `${labels.shipping}: ${currencySymbol}${order.shippingCost.toFixed(2)}\n`
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

      // Save for confirmation page button (backup)
      setWhatsappUrl(waUrl)

      // Show confirmation
      setStep('confirmation')
      onOrderComplete?.(createdOrder)

      // Open WhatsApp directly using location.href (doesn't get blocked like window.open)
      window.location.href = waUrl
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
      window.location.href = result.init_point
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error processing payment')
      setLoading(false)
    }
  }, [order, store, items, data.customer, data.delivery])

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
        onOrderComplete?.(paidOrder)
      } else if (result.status === 'in_process' || result.status === 'pending') {
        const pendingOrder = { ...order, paymentId: String(result.payment_id) }
        setOrder(pendingOrder)
        setStep('confirmation')
        onOrderComplete?.(pendingOrder)
      } else {
        // rejected
        setError('paymentRejected')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error processing payment')
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
      onOrderComplete?.(paidOrder)
    } else if (result.status === 'processing') {
      const pendingOrder = { ...order, paymentId: result.paymentId }
      setOrder(pendingOrder)
      setStep('confirmation')
      onOrderComplete?.(pendingOrder)
    } else {
      setError('paymentRejected')
    }
  }, [order, onOrderComplete])

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
      onOrderComplete?.(createdOrder)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating order')
    } finally {
      setLoading(false)
    }
  }, [createOrder, store.id, data.customer, data.delivery, onOrderComplete])

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
    finalTotal,
    brickMode,
    stripeMode,
    setStep: goToStep,
    goBack,
    goNext,
    updateData,
    validateCustomer,
    validateDelivery,
    processWhatsApp,
    processMercadoPago,
    processStripe,
    processStripePaymentComplete,
    processTransfer,
    processBrickPayment,
    fallbackToCheckoutPro
  }
}
