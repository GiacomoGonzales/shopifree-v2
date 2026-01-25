import { useState, useCallback } from 'react'
import type { Store, Order, OrderItem } from '../types'
import type { CartItem } from './useCart'
import { orderService } from '../lib/firebase'
import { createPreference, getInitPoint, cartToPreference } from '../lib/mercadopago'

export type CheckoutStep = 'customer' | 'delivery' | 'payment' | 'confirmation'

export interface CustomerData {
  name: string
  phone: string
  email?: string
}

export interface DeliveryData {
  method: 'pickup' | 'delivery'
  address?: {
    street: string
    city: string
    reference?: string
  }
  observations?: string
}

export interface CheckoutData {
  customer?: CustomerData
  delivery?: DeliveryData
  paymentMethod?: 'whatsapp' | 'mercadopago' | 'transfer'
}

interface UseCheckoutOptions {
  store: Store
  items: CartItem[]
  totalPrice: number
  onOrderComplete?: (order: Order) => void
}

export function useCheckout({ store, items, totalPrice, onOrderComplete }: UseCheckoutOptions) {
  const [step, setStep] = useState<CheckoutStep>('customer')
  const [data, setData] = useState<CheckoutData>({})
  const [order, setOrder] = useState<Order | null>(null)
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
  const createOrder = useCallback(async (paymentMethod: 'whatsapp' | 'mercadopago' | 'transfer'): Promise<Order> => {
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

    // Build order data without undefined values
    const orderData: Partial<Order> = {
      storeId: store.id,
      items: createOrderItems(),
      customer,
      deliveryMethod: data.delivery.method,
      subtotal: totalPrice,
      total: totalPrice,
      paymentMethod,
      paymentStatus: 'pending',
      status: 'pending'
    }

    // Only add delivery address for delivery method
    if (data.delivery.method === 'delivery' && data.delivery.address) {
      const address: { street: string; city: string; reference?: string } = {
        street: data.delivery.address.street,
        city: data.delivery.address.city
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
      total: totalPrice,
      status: 'pending',
      paymentMethod,
      paymentStatus: 'pending',
      notes: orderData.notes,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    return createdOrder
  }, [store.id, data, totalPrice, createOrderItems])

  // Process WhatsApp payment
  const processWhatsApp = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const createdOrder = await createOrder('whatsapp')
      setOrder(createdOrder)

      // Build WhatsApp URL
      const phone = store.whatsapp.replace(/\D/g, '')
      const message = encodeURIComponent(`Hola, hice el pedido ${createdOrder.orderNumber}`)
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
  }, [createOrder, store.whatsapp, onOrderComplete])

  // Process MercadoPago payment
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

      // Create MercadoPago preference
      const mpItems = items.map((item, index) => ({
        id: item.product.id || `item-${index}`,
        name: item.product.name,
        price: item.itemPrice,
        quantity: item.quantity
      }))

      const preference = cartToPreference(mpItems, store.currency, createdOrder.id)

      // Add customer info if available
      if (data.customer) {
        preference.payer = {
          name: data.customer.name,
          email: data.customer.email,
          phone: { number: data.customer.phone }
        }
      }

      const mpConfig = {
        enabled: true,
        publicKey: store.payments.mercadopago.publicKey || '',
        accessToken: store.payments.mercadopago.accessToken || '',
        environment: store.payments.mercadopago.sandbox ? 'sandbox' as const : 'production' as const
      }

      const result = await createPreference(preference, mpConfig)
      const initPoint = getInitPoint(result, mpConfig.environment)

      // Store order info in sessionStorage for return
      sessionStorage.setItem('pendingOrder', JSON.stringify({
        orderId: createdOrder.id,
        storeId: store.id,
        orderNumber: createdOrder.orderNumber
      }))

      // Redirect to MercadoPago
      window.location.href = initPoint
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error processing payment')
      setLoading(false)
    }
  }, [store, items, data.customer, createOrder])

  // Process bank transfer
  const processTransfer = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const createdOrder = await createOrder('transfer')
      setOrder(createdOrder)
      setStep('confirmation')
      onOrderComplete?.(createdOrder)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating order')
    } finally {
      setLoading(false)
    }
  }, [createOrder, onOrderComplete])

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
    loading,
    error,
    setStep: goToStep,
    goBack,
    goNext,
    updateData,
    validateCustomer,
    validateDelivery,
    processWhatsApp,
    processMercadoPago,
    processTransfer
  }
}
