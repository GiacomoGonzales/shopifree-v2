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

const CJ_BASE = 'https://developers.cjdropshipping.com/api2.0/v1'

// Get CJ API key: store's own key or platform fallback for preview
async function getStoreApiKey(storeId: string, requireOwn = false): Promise<{ apiKey: string; isOwn: boolean }> {
  const firestore = getDb()
  const storeDoc = await firestore.collection('stores').doc(storeId).get()
  if (!storeDoc.exists) throw new Error('Store not found')

  const storeKey = storeDoc.data()?.integrations?.cjApiKey
  if (storeKey) return { apiKey: storeKey, isOwn: true }

  if (requireOwn) {
    throw new Error('Para importar productos necesitas configurar tu API Key de CJ en Integraciones.')
  }

  // Fallback to platform key for preview/browsing
  const platformKey = process.env.CJ_API_KEY
  if (!platformKey) throw new Error('CJ Dropshipping no disponible.')

  return { apiKey: platformKey, isOwn: false }
}

// Get or refresh CJ token, cached per store (or platform)
async function getCJToken(storeId: string, requireOwn = false): Promise<string> {
  const { apiKey, isOwn } = await getStoreApiKey(storeId, requireOwn)
  const firestore = getDb()
  const tokenDocPath = isOwn
    ? `stores/${storeId}/config/cj-token`
    : 'config/cj-platform-token'
  const tokenDoc = await firestore.doc(tokenDocPath).get()
  const data = tokenDoc.data()

  // Check if token exists and is still valid (with 1 hour buffer)
  if (data?.accessToken && data?.expiresAt) {
    const expiresAt = data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt)
    if (expiresAt.getTime() > Date.now() + 3600000) {
      return data.accessToken
    }
  }

  // Try refresh token first
  if (data?.refreshToken) {
    try {
      const refreshRes = await fetch(`${CJ_BASE}/authentication/refreshAccessToken`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: data.refreshToken })
      })
      const refreshData = await refreshRes.json()
      if (refreshData.code === 200 && refreshData.data?.accessToken) {
        await firestore.doc(tokenDocPath).set({
          accessToken: refreshData.data.accessToken,
          refreshToken: refreshData.data.refreshToken,
          expiresAt: new Date(refreshData.data.accessTokenExpiryDate),
          refreshExpiresAt: new Date(refreshData.data.refreshTokenExpiryDate),
          updatedAt: new Date()
        })
        return refreshData.data.accessToken
      }
    } catch {
      // Fall through to full auth
    }
  }

  // Full auth with API key (already resolved above)
  console.log('[cj] Requesting new access token...')
  const authRes = await fetch(`${CJ_BASE}/authentication/getAccessToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey })
  })
  const authData = await authRes.json()
  console.log('[cj] Auth response code:', authData.code, 'message:', authData.message)

  if (!authData.data?.accessToken) {
    throw new Error(`CJ auth failed: ${authData.message || 'API Key invalida. Intenta de nuevo en 5 minutos.'}`)
  }

  await firestore.doc(tokenDocPath).set({
    accessToken: authData.data.accessToken,
    refreshToken: authData.data.refreshToken,
    expiresAt: new Date(authData.data.accessTokenExpiryDate),
    refreshExpiresAt: new Date(authData.data.refreshTokenExpiryDate),
    updatedAt: new Date()
  })

  return authData.data.accessToken
}

async function cjFetch(storeId: string, path: string, params?: Record<string, string>): Promise<any> {
  const token = await getCJToken(storeId)
  const url = new URL(`${CJ_BASE}${path}`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
    })
  }

  const res = await fetch(url.toString(), {
    headers: { 'CJ-Access-Token': token }
  })
  return res.json()
}

async function cjPost(storeId: string, path: string, body: Record<string, any>): Promise<any> {
  const token = await getCJToken(storeId)
  const res = await fetch(`${CJ_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'CJ-Access-Token': token
    },
    body: JSON.stringify(body)
  })
  return res.json()
}

// Search products
async function handleSearch(storeId: string, body: Record<string, any>) {
  const { keyword, categoryId, page, pageSize, minPrice, maxPrice, orderBy } = body

  const params: Record<string, string> = {
    page: String(page || 1),
    size: String(Math.min(pageSize || 20, 50)),
  }
  if (keyword) params.keyWord = keyword
  if (categoryId) params.categoryId = categoryId
  if (minPrice) params.startSellPrice = String(minPrice)
  if (maxPrice) params.endSellPrice = String(maxPrice)
  if (orderBy !== undefined) params.orderBy = String(orderBy)

  const data = await cjFetch(storeId, '/product/listV2', params)

  if (data.code !== 200) {
    return { status: 400, data: { error: data.message || 'Search failed' } }
  }

  // V2 response: data.content[].productList[]
  const productList = data.data?.content?.flatMap((c: any) => c.productList || []) || []

  const products = productList.map((p: any) => {
    // sellPrice can be "2.34 -- 2.70" or a number
    const priceStr = String(p.sellPrice || '0')
    const price = parseFloat(priceStr.split('--')[0].trim()) || 0

    return {
      pid: p.id,
      name: p.nameEn || p.name || '',
      image: p.bigImage || '',
      sellPrice: price,
      categoryName: p.threeCategoryName || '',
      productType: p.productType,
    }
  })

  return {
    status: 200,
    data: {
      products,
      total: data.data?.totalRecords || 0,
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20
    }
  }
}

// Get product details
async function handleDetails(storeId: string, body: Record<string, any>) {
  const { pid } = body
  if (!pid) return { status: 400, data: { error: 'pid is required' } }

  const params: Record<string, string> = {
    pid,
    features: 'enable_description'
  }

  const data = await cjFetch(storeId, '/product/query', params)

  if (data.code !== 200 || !data.data) {
    return { status: 404, data: { error: 'Product not found' } }
  }

  const p = data.data

  // productImage can be a JSON string array or a regular string
  let images: string[] = []
  try {
    if (typeof p.productImage === 'string' && p.productImage.startsWith('[')) {
      images = JSON.parse(p.productImage)
    } else if (p.productImage) {
      images = [p.productImage]
    }
  } catch {
    if (p.bigImage) images = [p.bigImage]
  }

  // sellPrice can be string "2.34" or "2.34 -- 2.70"
  const priceStr = String(p.sellPrice || '0')
  const sellPrice = parseFloat(priceStr.split('--')[0].trim()) || 0

  // Parse variants with full data
  const variants = (p.variants || []).map((v: any) => ({
    vid: v.vid,
    name: v.variantNameEn || v.variantName || '',
    image: v.variantImage || '',
    sellPrice: parseFloat(String(v.variantSellPrice || '0')) || 0,
    sku: v.variantSku || '',
    variantKey: v.variantKey || '',
    weight: v.variantWeight || null,
    length: v.variantLength || null,
    width: v.variantWidth || null,
    height: v.variantHeight || null,
  }))

  // Extract variation groups from variantKey (e.g., "Cherry wood-IPhone11" → ["Cherry wood", "IPhone11"])
  // productKeyEn tells us the attribute names (e.g., "Color-Style")
  const variantKeyNames = (p.productKeyEn || '').split('-').map((k: string) => k.trim()).filter(Boolean)

  // Parse weight (can be "15.00-38.00" or a number)
  const weightStr = String(p.productWeight || '0')
  const weight = parseFloat(weightStr.split('-')[0].trim()) || 0

  // Parse materials
  let materials: string[] = []
  try {
    materials = p.materialNameEnSet || (typeof p.materialNameEn === 'string' && p.materialNameEn.startsWith('[') ? JSON.parse(p.materialNameEn) : [])
  } catch { /* ignore */ }

  return {
    status: 200,
    data: {
      pid: p.pid,
      sku: p.productSku || '',
      name: p.productNameEn || p.productName || '',
      description: p.description || '',
      image: p.bigImage || images[0] || '',
      images,
      sellPrice,
      suggestSellPrice: p.suggestSellPrice || null,
      weight,
      categoryName: p.categoryName || '',
      materials,
      variants,
      variantKeyNames,
    }
  }
}

// Get categories
async function handleCategories(storeId: string) {
  const data = await cjFetch(storeId, '/product/getCategory')

  if (data.code !== 200) {
    return { status: 400, data: { error: 'Failed to fetch categories' } }
  }

  return { status: 200, data: { categories: data.data || [] } }
}

// Estimate freight cost from CJ warehouse to destination country
async function handleFreight(storeId: string, body: Record<string, any>) {
  const { vid, countryCode, quantity } = body
  if (!vid || !countryCode) {
    return { status: 400, data: { error: 'vid and countryCode are required' } }
  }

  const data = await cjPost(storeId, '/logistic/freightCalculate', {
    endCountryCode: countryCode,
    products: [{ quantity: quantity || 1, vid }]
  })

  if (data.code !== 200 || !data.data) {
    return { status: 400, data: { error: data.message || 'Freight calculation failed' } }
  }

  const options = (data.data || []).map((opt: any) => ({
    carrier: opt.logisticName || '',
    days: opt.estimatedDeliveryDays || opt.logisticAging || '',
    costUSD: parseFloat(String(opt.logisticPrice || '0')) || 0,
  })).filter((o: any) => o.costUSD > 0)

  // Sort by price ascending
  options.sort((a: any, b: any) => a.costUSD - b.costUSD)

  return { status: 200, data: { options } }
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
      case 'search':
        result = await handleSearch(storeId, body)
        break
      case 'details':
        result = await handleDetails(storeId, body)
        break
      case 'categories':
        result = await handleCategories(storeId)
        break
      case 'freight':
        result = await handleFreight(storeId, body)
        break
      default:
        return res.status(400).json({ error: 'Invalid action. Use "search", "details", "categories", or "freight"' })
    }

    return res.status(result.status).json(result.data)
  } catch (error) {
    console.error('[cj] Error:', error)
    const err = error as Error
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
