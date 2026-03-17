import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'

let db: Firestore

function getDb(): Firestore {
  if (!db) {
    if (!getApps().length) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey
        })
      })
    }
    db = getFirestore()
  }
  return db
}

const PRINTFUL_BASE = 'https://api.printful.com'

// Get Printful token from store's integrations
async function getStoreToken(storeId: string, requireOwn = false): Promise<string> {
  const firestore = getDb()
  const storeDoc = await firestore.collection('stores').doc(storeId).get()
  if (!storeDoc.exists) throw new Error('Store not found')

  const token = storeDoc.data()?.integrations?.printfulToken
  if (token) return token

  if (requireOwn) {
    throw new Error('Para usar Printful necesitas configurar tu Private Token en Integraciones.')
  }

  // No platform fallback for Printful — each store needs their own token
  throw new Error('Printful no configurado. Agrega tu Private Token en Integraciones.')
}

// Authenticated fetch to Printful API
async function printfulFetch(token: string, path: string, options?: RequestInit): Promise<any> {
  const res = await fetch(`${PRINTFUL_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  })

  const data = await res.json()

  if (data.code < 200 || data.code >= 300) {
    throw new Error(data.result || data.error?.message || `Printful API error ${data.code}`)
  }

  return data
}

// Unauthenticated catalog fetch (no token needed, lower rate limit)
async function printfulCatalogFetch(path: string): Promise<any> {
  const res = await fetch(`${PRINTFUL_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
  })

  const data = await res.json()

  if (data.code < 200 || data.code >= 300) {
    throw new Error(data.result || data.error?.message || `Printful catalog error ${data.code}`)
  }

  return data
}

// List all catalog products (blank products available for printing)
async function handleCatalog(_storeId: string, body: Record<string, any>) {
  const { categoryId } = body

  let path = '/products'
  if (categoryId) path += `?category_id=${categoryId}`

  const data = await printfulCatalogFetch(path)

  const products = (data.result || []).map((p: any) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    image: p.image,
    brand: p.brand,
    model: p.model,
    type: p.type,
    variantCount: p.variant_count,
    currency: p.currency,
  }))

  return { status: 200, data: { products } }
}

// Get product details with all variants
async function handleProduct(_storeId: string, body: Record<string, any>) {
  const { productId } = body
  if (!productId) return { status: 400, data: { error: 'productId is required' } }

  const data = await printfulCatalogFetch(`/products/${productId}`)

  const product = data.result?.product
  const variants = data.result?.variants || []

  if (!product) {
    return { status: 404, data: { error: 'Product not found' } }
  }

  // Group variants by size and color
  const mappedVariants = variants.map((v: any) => ({
    id: v.id,
    name: v.name,
    size: v.size,
    color: v.color,
    colorCode: v.color_code,
    colorCode2: v.color_code2,
    image: v.image,
    price: parseFloat(v.price) || 0,
    inStock: v.in_stock,
    availabilityRegions: v.availability_regions || {},
  }))

  return {
    status: 200,
    data: {
      product: {
        id: product.id,
        title: product.title,
        description: product.description,
        brand: product.brand,
        model: product.model,
        image: product.image,
        type: product.type,
        variantCount: product.variant_count,
        currency: product.currency,
        files: product.files || [],             // Available print file placements (front, back, etc.)
        options: product.options || [],           // Product options (thread colors, etc.)
        dimensions: product.dimensions || null,
      },
      variants: mappedVariants,
    }
  }
}

// Get size guide for a product
async function handleSizes(_storeId: string, body: Record<string, any>) {
  const { productId, unit } = body
  if (!productId) return { status: 400, data: { error: 'productId is required' } }

  const path = `/products/${productId}/sizes${unit ? `?unit=${unit}` : ''}`
  const data = await printfulCatalogFetch(path)

  return { status: 200, data: { sizeTable: data.result } }
}

// Calculate shipping rates
async function handleShipping(storeId: string, body: Record<string, any>) {
  const { recipient, items } = body
  if (!recipient || !items) {
    return { status: 400, data: { error: 'recipient and items are required' } }
  }

  const token = await getStoreToken(storeId, true)
  const data = await printfulFetch(token, '/shipping/rates', {
    method: 'POST',
    body: JSON.stringify({ recipient, items }),
  })

  const rates = (data.result || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    rate: parseFloat(r.rate) || 0,
    currency: r.currency,
    minDeliveryDays: r.minDeliveryDays,
    maxDeliveryDays: r.maxDeliveryDays,
  }))

  return { status: 200, data: { rates } }
}

// Estimate order costs without creating
async function handleEstimate(storeId: string, body: Record<string, any>) {
  const { recipient, items } = body
  if (!recipient || !items) {
    return { status: 400, data: { error: 'recipient and items are required' } }
  }

  const token = await getStoreToken(storeId, true)
  const data = await printfulFetch(token, '/orders/estimate-costs', {
    method: 'POST',
    body: JSON.stringify({ recipient, items }),
  })

  return { status: 200, data: { costs: data.result } }
}

// Upload a design file (by URL)
async function handleFileUpload(storeId: string, body: Record<string, any>) {
  const { url, filename } = body
  if (!url) return { status: 400, data: { error: 'url is required' } }

  const token = await getStoreToken(storeId, true)
  const data = await printfulFetch(token, '/files', {
    method: 'POST',
    body: JSON.stringify({ url, filename }),
  })

  return {
    status: 200,
    data: {
      file: {
        id: data.result.id,
        url: data.result.url,
        previewUrl: data.result.preview_url,
        thumbnailUrl: data.result.thumbnail_url,
        filename: data.result.filename,
        status: data.result.status,
        width: data.result.width,
        height: data.result.height,
        dpi: data.result.dpi,
      }
    }
  }
}

// Generate product mockups
async function handleMockup(storeId: string, body: Record<string, any>) {
  const { productId, variantIds, files } = body
  if (!productId || !files) {
    return { status: 400, data: { error: 'productId and files are required' } }
  }

  const token = await getStoreToken(storeId, true)
  const data = await printfulFetch(token, `/mockup-generator/create-task/${productId}`, {
    method: 'POST',
    body: JSON.stringify({
      variant_ids: variantIds || [],
      files,
    }),
  })

  return {
    status: 200,
    data: { taskKey: data.result.task_key, status: data.result.status }
  }
}

// Check mockup generation task result
async function handleMockupResult(storeId: string, body: Record<string, any>) {
  const { taskKey } = body
  if (!taskKey) return { status: 400, data: { error: 'taskKey is required' } }

  const token = await getStoreToken(storeId, true)
  const data = await printfulFetch(token, `/mockup-generator/task?task_key=${taskKey}`)

  return {
    status: 200,
    data: {
      status: data.result.status,
      mockups: data.result.mockups || [],
      error: data.result.error || null,
    }
  }
}

// Create a draft order on Printful
async function handleCreateOrder(storeId: string, body: Record<string, any>) {
  const { orderId } = body
  if (!orderId) return { status: 400, data: { error: 'orderId is required' } }

  const firestore = getDb()
  const token = await getStoreToken(storeId, true)

  // Get order from Firestore
  const orderDoc = await firestore.doc(`stores/${storeId}/orders/${orderId}`).get()
  if (!orderDoc.exists) return { status: 404, data: { error: 'Order not found' } }
  const order = orderDoc.data()!

  if (!order.deliveryAddress || !order.customer) {
    return { status: 400, data: { error: 'Order must have delivery address and customer info' } }
  }

  if (order.printfulOrderId) {
    return { status: 400, data: { error: `Order already submitted to Printful: ${order.printfulOrderId}` } }
  }

  // Build Printful order items from order items that have printfulProductId
  const printfulItems: any[] = []

  for (const item of order.items || []) {
    const productDoc = await firestore.doc(`stores/${storeId}/products/${item.productId}`).get()
    if (!productDoc.exists) continue
    const product = productDoc.data()!

    if (!product.printfulProductId) continue

    const pfVariants = product.printfulVariants || []

    if (pfVariants.length > 0 && item.selectedVariations?.length) {
      const selectedKey = item.selectedVariations.map((v: any) => v.value).join('-')
      const match = pfVariants.find((pv: any) => pv.variantKey === selectedKey)

      if (match) {
        printfulItems.push({
          variant_id: match.variantId,
          quantity: item.quantity,
          files: product.printfulFiles || [],
        })
      } else {
        // Fallback to first variant
        printfulItems.push({
          variant_id: pfVariants[0].variantId,
          quantity: item.quantity,
          files: product.printfulFiles || [],
        })
      }
    } else if (pfVariants.length > 0) {
      printfulItems.push({
        variant_id: pfVariants[0].variantId,
        quantity: item.quantity,
        files: product.printfulFiles || [],
      })
    }
  }

  if (printfulItems.length === 0) {
    return { status: 400, data: { error: 'No Printful products found in this order' } }
  }

  const addr = order.deliveryAddress || {}

  try {
    // Create draft order
    const data = await printfulFetch(token, '/orders', {
      method: 'POST',
      body: JSON.stringify({
        external_id: orderId,
        recipient: {
          name: order.customer.name || '',
          address1: addr.street || '',
          city: addr.city || '',
          state_code: addr.state || '',
          country_code: addr.country || 'US',
          zip: addr.zipCode || '',
          email: order.customer.email || '',
          phone: order.customer.phone || '',
        },
        items: printfulItems,
      }),
    })

    const pfOrder = data.result
    const pfOrderId = pfOrder.id

    // Confirm the draft order (submits for fulfillment)
    await printfulFetch(token, `/orders/${pfOrderId}/confirm`, {
      method: 'POST',
    })

    // Save to Firestore
    await firestore.doc(`stores/${storeId}/orders/${orderId}`).update({
      printfulOrderId: pfOrderId,
      fulfillmentProvider: 'printful',
      fulfillmentStatus: 'submitted',
      fulfillmentError: null,
      updatedAt: new Date(),
    })

    return { status: 200, data: { printfulOrderId: pfOrderId } }
  } catch (error) {
    const err = error as Error
    await firestore.doc(`stores/${storeId}/orders/${orderId}`).update({
      fulfillmentProvider: 'printful',
      fulfillmentStatus: 'failed',
      fulfillmentError: err.message,
      updatedAt: new Date(),
    })
    return { status: 400, data: { error: err.message } }
  }
}

// Check Printful order status
async function handleOrderStatus(storeId: string, body: Record<string, any>) {
  const { printfulOrderId } = body
  if (!printfulOrderId) return { status: 400, data: { error: 'printfulOrderId is required' } }

  const token = await getStoreToken(storeId, true)
  const data = await printfulFetch(token, `/orders/${printfulOrderId}`)

  const order = data.result
  const shipments = order.shipments || []
  const firstShipment = shipments[0] || {}

  return {
    status: 200,
    data: {
      printfulOrderId: order.id,
      status: order.status,
      trackingNumber: firstShipment.tracking_number || '',
      trackingUrl: firstShipment.tracking_url || '',
      carrier: firstShipment.carrier || '',
      shipDate: firstShipment.ship_date || '',
    }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { action, storeId, ...body } = req.body

    if (!storeId) {
      return res.status(400).json({ error: 'storeId is required' })
    }

    let result: { status: number; data: Record<string, any> }

    switch (action) {
      case 'catalog':
        result = await handleCatalog(storeId, body)
        break
      case 'product':
        result = await handleProduct(storeId, body)
        break
      case 'sizes':
        result = await handleSizes(storeId, body)
        break
      case 'shipping':
        result = await handleShipping(storeId, body)
        break
      case 'estimate':
        result = await handleEstimate(storeId, body)
        break
      case 'fileUpload':
        result = await handleFileUpload(storeId, body)
        break
      case 'mockup':
        result = await handleMockup(storeId, body)
        break
      case 'mockupResult':
        result = await handleMockupResult(storeId, body)
        break
      case 'createOrder':
        result = await handleCreateOrder(storeId, body)
        break
      case 'orderStatus':
        result = await handleOrderStatus(storeId, body)
        break
      default:
        return res.status(400).json({ error: 'Invalid action' })
    }

    return res.status(result.status).json(result.data)
  } catch (error) {
    console.error('[printful] Error:', error)
    const err = error as Error
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
