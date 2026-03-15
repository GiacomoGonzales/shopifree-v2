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
const TOKEN_DOC = 'config/cj-dropshipping'

async function getCJToken(): Promise<string> {
  const firestore = getDb()
  const doc = await firestore.doc(TOKEN_DOC).get()
  const data = doc.data()

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
        await firestore.doc(TOKEN_DOC).set({
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

  // Full auth with API key
  const apiKey = process.env.CJ_API_KEY
  if (!apiKey) throw new Error('CJ_API_KEY not configured')

  const authRes = await fetch(`${CJ_BASE}/authentication/getAccessToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey })
  })
  const authData = await authRes.json()

  if (authData.code !== 200 || !authData.data?.accessToken) {
    throw new Error(`CJ auth failed: ${authData.message || 'Unknown error'}`)
  }

  await firestore.doc(TOKEN_DOC).set({
    accessToken: authData.data.accessToken,
    refreshToken: authData.data.refreshToken,
    expiresAt: new Date(authData.data.accessTokenExpiryDate),
    refreshExpiresAt: new Date(authData.data.refreshTokenExpiryDate),
    updatedAt: new Date()
  })

  return authData.data.accessToken
}

async function cjFetch(path: string, params?: Record<string, string>): Promise<any> {
  const token = await getCJToken()
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

// Search products
async function handleSearch(body: Record<string, any>) {
  const { keyword, categoryId, page, pageSize, minPrice, maxPrice, orderBy } = body

  const params: Record<string, string> = {
    pageNum: String(page || 1),
    pageSize: String(Math.min(pageSize || 20, 50)),
  }
  if (keyword) params.keyWord = keyword
  if (categoryId) params.categoryId = categoryId
  if (minPrice) params.startSellPrice = String(minPrice)
  if (maxPrice) params.endSellPrice = String(maxPrice)
  if (orderBy !== undefined) params.orderBy = String(orderBy)

  const data = await cjFetch('/product/listV2', params)

  if (data.code !== 200) {
    return { status: 400, data: { error: data.message || 'Search failed' } }
  }

  const products = (data.data?.list || []).map((p: any) => ({
    pid: p.pid,
    name: p.productNameEn || p.productName,
    image: p.productImage,
    sellPrice: p.sellPrice,
    categoryName: p.categoryName,
    productType: p.productType,
  }))

  return {
    status: 200,
    data: {
      products,
      total: data.data?.total || 0,
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20
    }
  }
}

// Get product details
async function handleDetails(body: Record<string, any>) {
  const { pid } = body
  if (!pid) return { status: 400, data: { error: 'pid is required' } }

  const params: Record<string, string> = {
    pid,
    features: 'enable_description,enable_category'
  }

  const data = await cjFetch('/product/query', params)

  if (data.code !== 200 || !data.data) {
    return { status: 404, data: { error: 'Product not found' } }
  }

  const p = data.data
  return {
    status: 200,
    data: {
      pid: p.pid,
      name: p.productNameEn || p.productName,
      description: p.description || p.productNameEn || '',
      image: p.productImage,
      images: (p.productImageSet || []).map((img: any) => img.imageUrl || img),
      sellPrice: p.sellPrice,
      weight: p.productWeight,
      categoryName: p.categoryName,
      variants: (p.variants || []).map((v: any) => ({
        vid: v.vid,
        name: v.variantNameEn || v.variantName,
        image: v.variantImage,
        sellPrice: v.variantSellPrice,
        sku: v.variantSku,
      }))
    }
  }
}

// Get categories
async function handleCategories() {
  const data = await cjFetch('/product/getCategory')

  if (data.code !== 200) {
    return { status: 400, data: { error: 'Failed to fetch categories' } }
  }

  return { status: 200, data: { categories: data.data || [] } }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { action, ...body } = req.body

    let result: { status: number; data: Record<string, any> }

    switch (action) {
      case 'search':
        result = await handleSearch(body)
        break
      case 'details':
        result = await handleDetails(body)
        break
      case 'categories':
        result = await handleCategories()
        break
      default:
        return res.status(400).json({ error: 'Invalid action. Use "search", "details", or "categories"' })
    }

    return res.status(result.status).json(result.data)
  } catch (error) {
    console.error('[cj] Error:', error)
    const err = error as Error
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
