import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { productService, categoryService, storage } from '../../lib/firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { useToast } from '../../components/ui/Toast'
import { apiUrl } from '../../utils/apiBase'
import { getCurrencySymbol } from '../../lib/currency'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../hooks/useLanguage'
import type { Category } from '../../types'

// Fallback rates in case API fails
const FALLBACK_RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, MXN: 17.5, COP: 4200, PEN: 3.75, ARS: 900,
  CLP: 950, BRL: 5.1, VES: 36.5, UYU: 39, BOB: 6.9, PYG: 7300,
  GTQ: 7.8, HNL: 24.7, NIO: 36.7, CRC: 510, PAB: 1, DOP: 58,
}

async function getExchangeRates(): Promise<Record<string, number>> {
  const CACHE_KEY = 'cj_exchange_rates'
  const CACHE_TTL = 24 * 60 * 60 * 1000
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      const { rates, timestamp } = JSON.parse(cached)
      if (Date.now() - timestamp < CACHE_TTL) return rates
    }
    const res = await fetch('https://open.er-api.com/v6/latest/USD')
    const data = await res.json()
    if (data.result === 'success' && data.rates) {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ rates: data.rates, timestamp: Date.now() }))
      return data.rates
    }
  } catch { /* fall through */ }
  return FALLBACK_RATES
}

interface CJProduct {
  pid: string
  name: string
  image: string
  sellPrice: number
  categoryName?: string
}

interface CJVariant {
  vid: string
  name: string
  image: string
  sellPrice: number
  sku: string
  variantKey: string
  weight?: number
}

interface CJProductDetail {
  pid: string
  sku: string
  name: string
  description: string
  image: string
  images: string[]
  sellPrice: number
  suggestSellPrice?: string
  weight?: number
  categoryName?: string
  materials?: string[]
  variants: CJVariant[]
  variantKeyNames: string[]
}

// Printful types
interface PrintfulCatalogProduct {
  id: number
  title: string
  description: string
  image: string
  brand: string
  model: string
  type: string
  variantCount: number
  currency: string
}

interface PrintfulVariant {
  id: number
  name: string
  size: string
  color: string
  colorCode: string
  colorCode2?: string
  image: string
  price: number
  inStock: boolean
  availabilityRegions: Record<string, string>
}

interface PrintfulProductDetail {
  product: {
    id: number
    title: string
    description: string
    brand: string
    model: string
    image: string
    type: string
    variantCount: number
    currency: string
    files: { id: string; type: string; title: string }[]
    dimensions: any
  }
  variants: PrintfulVariant[]
}

export default function Dropshipping() {
  const { store } = useAuth()
  const { showToast } = useToast()
  const { localePath } = useLanguage()
  const navigate = useNavigate()

  const isBusiness = store?.plan === 'business'
  const currency = store?.currency || 'USD'
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES)

  useEffect(() => { getExchangeRates().then(setRates) }, [])

  const rate = rates[currency] || FALLBACK_RATES[currency] || 1

  // Provider selection
  const [activeProvider, setActiveProvider] = useState<string | null>(null)

  const PROVIDERS = [
    {
      id: 'cj',
      name: 'CJ Dropshipping',
      description: 'Envio mundial desde China y bodegas locales. Entrega en 7-20 dias. Ideal para LATAM, USA y Europa.',
      logo: 'https://cjdropshipping.com/favicon.ico',
      active: true,
    },
    {
      id: 'printful',
      name: 'Printful',
      description: 'Print on demand: camisetas, tazas, posters con tu diseño. Bodegas en USA, EU y Mexico. Entrega 3-7 dias.',
      logo: '/printful-logo.png',
      active: true,
    },
    {
      id: 'printify',
      name: 'Printify',
      description: '900+ productos personalizables. Proveedores en USA, EU, UK, Australia y China. Entrega 3-12 dias.',
      logo: 'https://printify.com/pfh/assets/legacy/favicons/favicon-32x32.png',
      active: false,
    },
    {
      id: 'aliexpress',
      name: 'AliExpress',
      description: 'Millones de productos desde China. Precios muy bajos. Entrega 15-40 dias. Ideal para todo el mundo.',
      logo: 'https://ae01.alicdn.com/images/eng/wholesale/icon/aliexpress.ico',
      active: false,
    },
    {
      id: 'spocket',
      name: 'Spocket',
      description: 'Productos de USA y Europa con envio rapido 2-5 dias. Ideal para vender en Norteamerica y Europa.',
      logo: 'https://www.spocket.co/favicon.ico',
      active: false,
    },
    {
      id: 'dropi',
      name: 'Dropi',
      description: 'Bodegas en Colombia, Mexico, Chile y Peru. Entrega 1-3 dias. Ideal para vender en Latinoamerica.',
      logo: 'https://dropi.co/favicon.ico',
      active: false,
    },
  ]

  // Search state
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<CJProduct[]>([])
  const [searching, setSearching] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  // Quick browse categories (search by keyword)
  const BROWSE_CATEGORIES = [
    { label: 'Moda mujer', keyword: 'women fashion dress' },
    { label: 'Moda hombre', keyword: 'men casual shirt' },
    { label: 'Celulares', keyword: 'phone accessories case' },
    { label: 'Audifonos', keyword: 'wireless earbuds bluetooth' },
    { label: 'Relojes', keyword: 'smart watch fitness' },
    { label: 'Belleza', keyword: 'skincare beauty tools' },
    { label: 'Joyeria', keyword: 'jewelry necklace ring' },
    { label: 'Hogar', keyword: 'home decor led lights' },
    { label: 'Cocina', keyword: 'kitchen gadgets organizer' },
    { label: 'Deportes', keyword: 'yoga fitness gym' },
    { label: 'Mascotas', keyword: 'pet dog cat toy' },
    { label: 'Bolsos', keyword: 'women handbag crossbody' },
    { label: 'Lentes', keyword: 'sunglasses polarized fashion' },
    { label: 'Niños', keyword: 'kids toys educational' },
    { label: 'Auto', keyword: 'car accessories interior' },
    { label: 'Camping', keyword: 'outdoor camping portable' },
  ]
  const [activeCategory, setActiveCategory] = useState<string>('')

  // Featured products
  const [featured, setFeatured] = useState<CJProduct[]>([])
  const [loadingFeatured, setLoadingFeatured] = useState(true)

  // Detail state
  const [selectedProduct, setSelectedProduct] = useState<CJProductDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Translation state
  const [translatedDesc, setTranslatedDesc] = useState<string>('')
  const [translating, setTranslating] = useState(false)
  const [translatingName, setTranslatingName] = useState(false)

  // Import state
  const [importName, setImportName] = useState('')
  const [importPrice, setImportPrice] = useState('')
  const [importing, setImporting] = useState(false)

  // Freight estimation state
  const [freightOptions, setFreightOptions] = useState<{ carrier: string; days: string; costUSD: number }[]>([])
  const [freightLoading, setFreightLoading] = useState(false)

  // Store categories for import
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')

  const hasCJKey = !!store?.integrations?.cjApiKey
  const hasPrintfulToken = !!store?.integrations?.printfulToken

  // Printful state
  const [pfCatalog, setPfCatalog] = useState<PrintfulCatalogProduct[]>([])
  const [pfCatalogLoading, setPfCatalogLoading] = useState(false)
  const [pfCatalogSearch, setPfCatalogSearch] = useState('')
  const [pfProduct, setPfProduct] = useState<PrintfulProductDetail | null>(null)
  const [pfProductLoading, setPfProductLoading] = useState(false)
  const [pfSelectedVariants, setPfSelectedVariants] = useState<number[]>([])
  const [pfDesignUrl, setPfDesignUrl] = useState('')
  const [pfDesignPlacement, setPfDesignPlacement] = useState('front')
  const [pfMockupUrl, setPfMockupUrl] = useState('')
  const [pfMockupLoading, setPfMockupLoading] = useState(false)
  const [pfImporting, setPfImporting] = useState(false)
  const [pfImportName, setPfImportName] = useState('')
  const [pfImportPrice, setPfImportPrice] = useState('')
  const [pfShippingRates, setPfShippingRates] = useState<{ name: string; rate: number; currency: string; minDeliveryDays: number; maxDeliveryDays: number }[]>([])
  const [pfShippingLoading, setPfShippingLoading] = useState(false)
  const [pfDesignUploading, setPfDesignUploading] = useState(false)
  const pfFileInputRef = useRef<HTMLInputElement>(null)

  const printfulPost = useCallback(async (body: Record<string, any>) => {
    const res = await fetch(apiUrl('/api/printful'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, storeId: store?.id })
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    return data
  }, [store?.id])

  // Load Printful catalog
  useEffect(() => {
    if (!store?.id || activeProvider !== 'printful') return
    if (pfCatalog.length > 0) return

    setPfCatalogLoading(true)
    printfulPost({ action: 'catalog' })
      .then(data => { if (data.products) setPfCatalog(data.products) })
      .catch(() => {})
      .finally(() => setPfCatalogLoading(false))
  }, [store?.id, activeProvider, printfulPost])

  // Load store categories when Printful is selected
  useEffect(() => {
    if (!store?.id || activeProvider !== 'printful') return
    if (categories.length > 0) return
    categoryService.getAll(store.id).then(cats => setCategories(cats.filter(c => c.active)))
  }, [store?.id, activeProvider])

  const pfViewProduct = async (productId: number) => {
    setPfProductLoading(true)
    setPfMockupUrl('')
    setPfDesignUrl('')
    setPfShippingRates([])
    setPfSelectedVariants([])
    try {
      const data = await printfulPost({ action: 'product', productId })
      if (data.product) {
        setPfProduct(data)
        setPfImportName(data.product.title)
        // Select all in-stock variants by default
        const inStock = (data.variants || []).filter((v: PrintfulVariant) => v.inStock).map((v: PrintfulVariant) => v.id)
        setPfSelectedVariants(inStock)
        // Set default price based on average variant cost
        const prices = (data.variants || []).map((v: PrintfulVariant) => v.price).filter((p: number) => p > 0)
        if (prices.length > 0) {
          const avgCost = prices.reduce((a: number, b: number) => a + b, 0) / prices.length
          const suggestedPrice = Math.ceil(avgCost * rate * 2.5)
          setPfImportPrice(String(suggestedPrice))
        }
        // Set default placement
        if (data.product.files?.length > 0) {
          setPfDesignPlacement(data.product.files[0].type || 'front')
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Error cargando producto', 'error')
    } finally {
      setPfProductLoading(false)
    }
  }

  const pfUploadDesign = async (file: File) => {
    if (!store?.id || !pfProduct) return
    setPfDesignUploading(true)
    setPfMockupUrl('')
    try {
      const ext = file.name.split('.').pop() || 'png'
      const path = `stores/${store.id}/printful-designs/${pfProduct.product.id}.${ext}`
      const storageRef = ref(storage, path)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)
      setPfDesignUrl(url)
      // Auto-generate mockup
      setPfMockupLoading(true)
      setPfDesignUploading(false)
      const data = await printfulPost({
        action: 'mockup',
        productId: pfProduct.product.id,
        variantIds: pfSelectedVariants.slice(0, 5),
        files: [{ placement: pfDesignPlacement, image_url: url }],
      })
      if (data.taskKey) {
        let attempts = 0
        const poll = async () => {
          attempts++
          if (attempts > 30) { setPfMockupLoading(false); return }
          const result = await printfulPost({ action: 'mockupResult', taskKey: data.taskKey })
          if (result.status === 'completed' && result.mockups?.length > 0) {
            const firstMockup = result.mockups[0]
            if (firstMockup.mockup_url) setPfMockupUrl(firstMockup.mockup_url)
            else if (firstMockup.extra?.length > 0) setPfMockupUrl(firstMockup.extra[0].url)
            setPfMockupLoading(false)
          } else if (result.status === 'failed') {
            showToast('Error generando mockup', 'error')
            setPfMockupLoading(false)
          } else {
            setTimeout(poll, 2000)
          }
        }
        setTimeout(poll, 3000)
      }
    } catch (err: any) {
      showToast(err.message || 'Error subiendo diseño', 'error')
      setPfDesignUploading(false)
      setPfMockupLoading(false)
    }
  }

  const pfGenerateMockup = async () => {
    if (!pfProduct || !pfDesignUrl) return
    setPfMockupLoading(true)
    try {
      const data = await printfulPost({
        action: 'mockup',
        productId: pfProduct.product.id,
        variantIds: pfSelectedVariants.slice(0, 5),
        files: [{ placement: pfDesignPlacement, image_url: pfDesignUrl }],
      })
      if (data.taskKey) {
        // Poll for result
        let attempts = 0
        const poll = async () => {
          attempts++
          if (attempts > 30) { setPfMockupLoading(false); return }
          const result = await printfulPost({ action: 'mockupResult', taskKey: data.taskKey })
          if (result.status === 'completed' && result.mockups?.length > 0) {
            const firstMockup = result.mockups[0]
            if (firstMockup.mockup_url) setPfMockupUrl(firstMockup.mockup_url)
            else if (firstMockup.extra?.length > 0) setPfMockupUrl(firstMockup.extra[0].url)
            setPfMockupLoading(false)
          } else if (result.status === 'failed') {
            showToast('Error generando mockup', 'error')
            setPfMockupLoading(false)
          } else {
            setTimeout(poll, 2000)
          }
        }
        setTimeout(poll, 3000)
      }
    } catch (err: any) {
      showToast(err.message || 'Error generando mockup', 'error')
      setPfMockupLoading(false)
    }
  }

  const pfCalcShipping = async () => {
    if (!pfProduct || pfSelectedVariants.length === 0) return
    setPfShippingLoading(true)
    try {
      const countryCode = store?.location?.country || 'US'
      const data = await printfulPost({
        action: 'shipping',
        recipient: { country_code: countryCode },
        items: [{ variant_id: pfSelectedVariants[0], quantity: 1 }],
      })
      if (data.rates) setPfShippingRates(data.rates)
    } catch { /* silent */ }
    finally { setPfShippingLoading(false) }
  }

  const pfImportProduct = async () => {
    if (!store || !pfProduct || !pfImportName.trim() || !pfImportPrice) return
    setPfImporting(true)
    try {
      const slug = pfImportName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')

      const selectedVars = pfProduct.variants.filter(v => pfSelectedVariants.includes(v.id))

      // Build variations (Color + Size groups)
      const colors = new Map<string, { code: string; image: string }>()
      const sizes = new Set<string>()
      for (const v of selectedVars) {
        if (v.color && !colors.has(v.color)) {
          colors.set(v.color, { code: v.colorCode, image: v.image })
        }
        if (v.size) sizes.add(v.size)
      }

      const variations: any[] = []
      if (colors.size > 0) {
        variations.push({
          id: `var-${Math.random().toString(36).substring(2, 9)}`,
          name: 'Color',
          options: Array.from(colors.entries()).map(([color, info]) => ({
            id: `opt-${Math.random().toString(36).substring(2, 9)}`,
            value: color,
            image: info.image || undefined,
            available: true,
          })).map(o => {
            const opt: Record<string, unknown> = { id: o.id, value: o.value, available: o.available }
            if (o.image) opt.image = o.image
            return opt
          })
        })
      }
      if (sizes.size > 0) {
        variations.push({
          id: `var-${Math.random().toString(36).substring(2, 9)}`,
          name: 'Size',
          options: Array.from(sizes).map(size => ({
            id: `opt-${Math.random().toString(36).substring(2, 9)}`,
            value: size,
            available: true,
          }))
        })
      }

      // Build Printful variant mapping for fulfillment
      const printfulVariants = selectedVars.map(v => ({
        variantKey: [v.color, v.size].filter(Boolean).join('-'),
        variantId: v.id,
        retailPrice: parseFloat(pfImportPrice),
        costPrice: v.price,
      }))

      // Build design files for order fulfillment
      const printfulFiles = pfDesignUrl ? [{ type: pfDesignPlacement, url: pfDesignUrl }] : []

      const productData: Record<string, unknown> = {
        name: pfImportName.trim(),
        slug,
        price: parseFloat(pfImportPrice),
        image: pfMockupUrl || pfProduct.product.image || '',
        images: pfMockupUrl ? [pfMockupUrl, pfProduct.product.image].filter(Boolean) : [pfProduct.product.image].filter(Boolean),
        description: pfProduct.product.description || '',
        active: true,
        printfulProductId: pfProduct.product.id,
        printfulVariants,
        printfulFiles,
        categoryId: selectedCategoryId || null,
      }

      if (variations.length > 0) {
        productData.hasVariations = true
        productData.variations = variations
      }

      await productService.create(store.id, productData as any)
      showToast('Producto Printful importado', 'success')
      setPfProduct(null)
      setPfMockupUrl('')
      setPfDesignUrl('')
      setPfImportName('')
      setPfImportPrice('')
      setPfSelectedVariants([])
    } catch (err) {
      console.error('Error importing Printful product:', err)
      showToast('Error importando producto', 'error')
    } finally {
      setPfImporting(false)
    }
  }

  const pfGoBack = () => {
    setPfProduct(null)
    setPfMockupUrl('')
    setPfDesignUrl('')
    setPfImportName('')
    setPfImportPrice('')
    setPfSelectedVariants([])
    setPfShippingRates([])
    setSelectedCategoryId('')
  }

  // Filter Printful catalog by search
  const pfFilteredCatalog = pfCatalogSearch
    ? pfCatalog.filter(p =>
        p.title.toLowerCase().includes(pfCatalogSearch.toLowerCase()) ||
        p.type.toLowerCase().includes(pfCatalogSearch.toLowerCase()) ||
        p.brand.toLowerCase().includes(pfCatalogSearch.toLowerCase())
      )
    : pfCatalog

  const cjPost = useCallback(async (body: Record<string, any>) => {
    const res = await fetch(apiUrl('/api/cj'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, storeId: store?.id })
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    return data
  }, [store?.id])

  // Load featured products when CJ is selected
  const featuredAbort = useRef(false)

  useEffect(() => {
    if (!store?.id || activeProvider !== 'cj') return
    if (featured.length > 0) return // already loaded

    featuredAbort.current = false

    // Single request for featured products to avoid rate limits
    cjPost({ action: 'search', keyword: 'best seller trending', page: 1, pageSize: 40 })
      .then(data => {
        if (!featuredAbort.current && data.products) {
          setFeatured(data.products)
        }
      })
      .catch(() => {})
      .finally(() => { if (!featuredAbort.current) setLoadingFeatured(false) })

    // Load store categories
    categoryService.getAll(store.id).then(cats => setCategories(cats.filter(c => c.active)))
  }, [store?.id, cjPost, activeProvider])

  const search = async (newPage = 1, keywordOverride?: string) => {
    const searchKeyword = keywordOverride ?? (activeCategory || keyword.trim())
    if (!searchKeyword) return
    featuredAbort.current = true
    setSearching(true)
    try {
      const data = await cjPost({ action: 'search', keyword: searchKeyword, page: newPage, pageSize: 20 })
      if (data.products) {
        setResults(data.products)
        setTotal(data.total || 0)
        setPage(newPage)
      }
    } catch (err: any) {
      showToast(err.message || 'Error buscando productos', 'error')
    } finally {
      setSearching(false)
    }
  }

  const browseCategory = (cat: typeof BROWSE_CATEGORIES[0]) => {
    if (activeCategory === cat.keyword) {
      setActiveCategory('')
      setResults([])
      setTotal(0)
      return
    }
    featuredAbort.current = true
    setActiveCategory(cat.keyword)
    setKeyword('')
    setLoadingFeatured(false)
    search(1, cat.keyword)
  }

  const viewDetail = async (pid: string) => {
    setLoadingDetail(true)
    setFreightOptions([])
    setTranslatedDesc('')
    try {
      const data = await cjPost({ action: 'details', pid })
      if (data.pid) {
        setSelectedProduct(data)
        setImportName(data.name)
        const localCost = data.sellPrice * rate
        const suggestedPrice = Math.ceil(localCost * 2.5)
        setImportPrice(String(suggestedPrice))

        const countryCode = store?.location?.country
        if (countryCode) {
          const variants = data.variants || []
          let vid: string | undefined
          if (variants.length > 0) {
            const sorted = [...variants].sort((a: CJVariant, b: CJVariant) => (b.weight || 0) - (a.weight || 0))
            vid = sorted[0].vid
          }
          setFreightLoading(true)
          cjPost({ action: 'freight', vid: vid || data.pid, countryCode })
            .then(freight => { if (freight.options) setFreightOptions(freight.options) })
            .catch(() => {})
            .finally(() => setFreightLoading(false))
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Error cargando producto', 'error')
    } finally {
      setLoadingDetail(false)
    }
  }

  const buildVariations = (product: CJProductDetail) => {
    if (!product.variants.length || !product.variantKeyNames.length) return undefined
    const groups: Record<string, Set<string>> = {}
    const imagesByValue: Record<string, string> = {}
    for (const name of product.variantKeyNames) groups[name] = new Set()
    for (const v of product.variants) {
      const parts = v.variantKey.split('-').map(s => s.trim())
      product.variantKeyNames.forEach((name, i) => {
        if (parts[i]) {
          groups[name].add(parts[i])
          if (i === 0 && v.image) imagesByValue[parts[i]] = v.image
        }
      })
    }
    return product.variantKeyNames
      .filter(name => groups[name]?.size > 0)
      .map(name => ({
        id: `var-${Math.random().toString(36).substring(2, 9)}`,
        name,
        options: Array.from(groups[name]).map(value => ({
          id: `opt-${Math.random().toString(36).substring(2, 9)}`,
          value,
          image: imagesByValue[value] || undefined,
          available: true,
        }))
      }))
  }

  const importProduct = async () => {
    if (!store || !selectedProduct || !importName.trim() || !importPrice) return
    setImporting(true)
    try {
      const slug = importName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')

      const variations = buildVariations(selectedProduct)
      const productData: Record<string, unknown> = {
        name: importName.trim(),
        slug,
        price: parseFloat(importPrice),
        image: selectedProduct.image || '',
        images: selectedProduct.images?.slice(0, 10) || [],
        description: translatedDesc || selectedProduct.description || '',
        active: true,
        cjProductId: selectedProduct.pid,
        categoryId: selectedCategoryId || null,
      }
      if (selectedProduct.sku) productData.sku = selectedProduct.sku
      if (selectedProduct.weight) productData.weight = selectedProduct.weight
      if (variations && variations.length > 0) {
        productData.hasVariations = true
        // Strip undefined values from variation options
        productData.variations = variations.map(v => ({
          ...v,
          options: v.options.map(o => {
            const opt: Record<string, unknown> = { id: o.id, value: o.value, available: o.available }
            if (o.image) opt.image = o.image
            return opt
          })
        }))
      }

      // Save CJ variant mapping for fulfillment (vid + sku per combination)
      if (selectedProduct.variants.length > 0) {
        productData.cjVariants = selectedProduct.variants.map(v => ({
          variantKey: v.variantKey || '',
          vid: v.vid || '',
          sku: v.sku || '',
          sellPrice: v.sellPrice || 0,
        }))
      }
      await productService.create(store.id, productData as any)
      showToast('Producto importado con variantes', 'success')
      setSelectedProduct(null)
    } catch (err) {
      console.error('Error importing:', err)
      showToast('Error importando producto', 'error')
    } finally {
      setImporting(false)
    }
  }

  const goBack = () => {
    setSelectedProduct(null)
    setImportName('')
    setImportPrice('')
    setFreightOptions([])
    setSelectedCategoryId('')
    setTranslatedDesc('')
  }

  const totalPages = Math.ceil(total / 20)
  const hasSearchResults = results.length > 0
  const showingProducts = hasSearchResults ? results : featured
  const showingLabel = hasSearchResults ? `${total} productos encontrados` : 'Productos destacados'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          {(selectedProduct || pfProduct || activeProvider) && (
            <button
              onClick={() => selectedProduct ? goBack() : pfProduct ? pfGoBack() : setActiveProvider(null)}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              {(selectedProduct || pfProduct) ? 'Importar producto' : activeProvider ? PROVIDERS.find(p => p.id === activeProvider)?.name || 'Dropshipping' : 'Dropshipping'}
            </h1>
            <p className="text-sm text-gray-400">
              {(selectedProduct || pfProduct)
                ? (pfProduct ? 'Sube tu diseño, ajusta nombre y precio' : 'Ajusta nombre y precio antes de importar')
                : activeProvider
                  ? 'Explora y agrega productos a tu tienda'
                  : 'Elige un proveedor para explorar productos'}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate(localePath('/dashboard/products'))}
          className="w-full sm:w-auto px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 bg-gray-50 sm:bg-transparent hover:bg-gray-100 rounded-xl transition-colors font-medium"
        >
          Mis productos
        </button>
      </div>

      {/* === PRINTFUL PRODUCT DETAIL === */}
      {activeProvider === 'printful' && pfProduct ? (
        <div className="max-w-2xl space-y-5">
          {/* Product preview */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
              <img
                src={pfMockupUrl || pfProduct.product.image}
                alt={pfProduct.product.title}
                className="w-full sm:w-40 h-48 sm:h-40 object-cover rounded-xl ring-1 ring-black/5 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">{pfProduct.product.title}</h2>
                <p className="text-xs text-gray-400 mb-1">{pfProduct.product.brand} - {pfProduct.product.model}</p>
                <p className="text-xs text-gray-400">{pfProduct.variants.length} variantes disponibles</p>
                {pfProduct.variants.length > 0 && (
                  <p className="text-sm font-bold text-red-600 mt-2">
                    Costo desde ${Math.min(...pfProduct.variants.map(v => v.price)).toFixed(2)} USD
                    {currency !== 'USD' && (
                      <span className="text-xs font-medium text-gray-400 ml-2">
                        ({getCurrencySymbol(currency)}{Math.ceil(Math.min(...pfProduct.variants.map(v => v.price)) * rate)} {currency})
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Design upload */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Tu diseño</h3>
            {pfProduct.product.files?.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Ubicacion del diseño</label>
                <div className="flex gap-2 flex-wrap">
                  {pfProduct.product.files.map((f: any) => (
                    <button
                      key={f.type || f.id}
                      onClick={() => setPfDesignPlacement(f.type || f.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        pfDesignPlacement === (f.type || f.id)
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {f.title || f.type}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <input
              ref={pfFileInputRef}
              type="file"
              accept="image/png,image/jpeg,application/pdf"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) pfUploadDesign(file)
                e.target.value = ''
              }}
            />
            {pfDesignUrl && !pfDesignUploading && !pfMockupLoading ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <img src={pfDesignUrl} alt="Diseño" className="w-16 h-16 object-contain rounded-lg ring-1 ring-black/5 bg-gray-50" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">Diseño subido</p>
                    <p className="text-xs text-gray-400 truncate">{pfDesignUrl.split('/').pop()?.split('?')[0]}</p>
                  </div>
                  <button
                    onClick={() => pfFileInputRef.current?.click()}
                    className="px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    Cambiar
                  </button>
                </div>
                {pfMockupUrl ? (
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-2">Mockup generado</p>
                    <img src={pfMockupUrl} alt="Mockup" className="w-full max-w-xs rounded-xl ring-1 ring-black/5" />
                    <button
                      onClick={pfGenerateMockup}
                      className="mt-2 text-xs text-green-600 hover:text-green-700 font-medium"
                    >
                      Regenerar mockup
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (pfDesignUploading || pfMockupLoading) ? (
              <div className="flex items-center justify-center gap-3 py-8">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
                <span className="text-sm text-gray-600">
                  {pfDesignUploading ? 'Subiendo diseño...' : 'Generando mockup...'}
                </span>
              </div>
            ) : (
              <button
                onClick={() => pfFileInputRef.current?.click()}
                className="w-full py-8 border-2 border-dashed border-gray-200 rounded-xl hover:border-green-300 hover:bg-green-50/50 transition-all flex flex-col items-center gap-2 group"
              >
                <svg className="w-8 h-8 text-gray-300 group-hover:text-green-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium text-gray-500 group-hover:text-green-600">Sube tu diseño</span>
                <span className="text-xs text-gray-400">PNG, JPG o PDF — minimo 150 DPI</span>
              </button>
            )}
          </div>

          {/* Edit fields */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre del producto</label>
              <input
                type="text"
                value={pfImportName}
                onChange={e => setPfImportName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Precio de venta ({currency})
              </label>
              <input
                type="number"
                step="0.01"
                value={pfImportPrice}
                onChange={e => setPfImportPrice(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-300 text-sm"
              />
              {pfImportPrice && pfProduct.variants.length > 0 && (() => {
                const avgCost = pfProduct.variants.reduce((a, b) => a + b.price, 0) / pfProduct.variants.length
                const costInLocal = avgCost * rate
                const profit = parseFloat(pfImportPrice) - costInLocal
                return (
                  <p className="text-xs text-gray-400 mt-1.5">
                    Ganancia estimada: <span className={`font-medium ${profit > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {getCurrencySymbol(currency)}{profit.toFixed(2)} {currency}
                    </span>
                    {' '}por venta (costo promedio)
                  </p>
                )
              })()}
            </div>
            {categories.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Categoria</label>
                <select
                  value={selectedCategoryId}
                  onChange={e => setSelectedCategoryId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-300 text-sm bg-white"
                >
                  <option value="">Sin categoria</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Variants selection */}
          {pfProduct.variants.length > 0 && (() => {
            const colors = new Map<string, { code: string; count: number }>()
            const sizes = new Set<string>()
            for (const v of pfProduct.variants) {
              if (v.color && !colors.has(v.color)) colors.set(v.color, { code: v.colorCode, count: 0 })
              if (v.color) colors.get(v.color)!.count++
              if (v.size) sizes.add(v.size)
            }
            return (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">Variantes</p>
                  <button
                    onClick={() => {
                      if (pfSelectedVariants.length === pfProduct!.variants.length) {
                        setPfSelectedVariants([])
                      } else {
                        setPfSelectedVariants(pfProduct!.variants.map(v => v.id))
                      }
                    }}
                    className="text-xs text-green-600 hover:text-green-700 font-medium"
                  >
                    {pfSelectedVariants.length === pfProduct.variants.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
                  </button>
                </div>
                {colors.size > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1.5">Colores ({colors.size})</p>
                    <div className="flex gap-2 flex-wrap">
                      {Array.from(colors.entries()).map(([color, info]) => (
                        <span key={color} className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded-lg text-xs">
                          <span
                            className="w-3 h-3 rounded-full border border-gray-200"
                            style={{ backgroundColor: info.code || '#ccc' }}
                          />
                          {color}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {sizes.size > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1.5">Tallas ({sizes.size})</p>
                    <div className="flex gap-2 flex-wrap">
                      {Array.from(sizes).map(size => (
                        <span key={size} className="px-2.5 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-medium">{size}</span>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-400">{pfSelectedVariants.length} de {pfProduct.variants.length} variantes seleccionadas</p>
              </div>
            )
          })()}

          {/* Shipping estimation */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-green-900 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Envio Printful a {store?.location?.country || '?'}
              </p>
              {!pfShippingLoading && pfShippingRates.length === 0 && pfSelectedVariants.length > 0 && (
                <button
                  onClick={pfCalcShipping}
                  className="text-xs text-green-600 hover:text-green-700 font-medium"
                >
                  Calcular
                </button>
              )}
            </div>
            {pfShippingLoading ? (
              <div className="flex items-center gap-2 py-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>
                <span className="text-xs text-green-600">Calculando envio...</span>
              </div>
            ) : pfShippingRates.length > 0 ? (
              <div className="space-y-1.5">
                {pfShippingRates.map((r, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2 text-xs">
                    <span className="font-medium text-gray-700">{r.name}</span>
                    <span className="text-gray-400">{r.minDeliveryDays}-{r.maxDeliveryDays} dias</span>
                    <span className="font-bold text-green-700">
                      ${r.rate.toFixed(2)} {r.currency}
                      {currency !== 'USD' && r.currency === 'USD' && (
                        <span className="font-normal text-gray-400 ml-1">
                          ({getCurrencySymbol(currency)}{Math.ceil(r.rate * rate)})
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-green-600">Selecciona variantes y calcula el costo de envio</p>
            )}
          </div>

          {/* Import button or prompts */}
          {!isBusiness ? (
            <div className="bg-gray-50 rounded-xl p-5 text-center space-y-3">
              <p className="text-sm font-medium text-gray-900">Importar productos requiere el plan Business</p>
              <p className="text-xs text-gray-500">Explora el catalogo. Para importar, actualiza a Business.</p>
              <Link
                to={localePath('/dashboard/plan')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-all"
              >
                Ver planes
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          ) : hasPrintfulToken ? (
            <button
              onClick={pfImportProduct}
              disabled={pfImporting || !pfImportName.trim() || !pfImportPrice || pfSelectedVariants.length === 0}
              className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {pfImporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Importando...
                </>
              ) : `Importar a mi tienda (${pfSelectedVariants.length} variantes)`}
            </button>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
              <p className="text-sm text-green-800 font-medium">Conecta tu cuenta de Printful para importar.</p>
              <p className="text-xs text-green-600">Crea una cuenta gratis en printful.com y pega tu Private Token en Integraciones.</p>
              <div className="flex gap-2">
                <a
                  href="https://www.printful.com/auth/signup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center py-2.5 bg-green-600 text-white rounded-lg font-semibold text-sm hover:bg-green-700 transition-all"
                >
                  Crear cuenta Printful
                </a>
                <button
                  onClick={() => navigate(localePath('/dashboard/integrations'))}
                  className="flex-1 py-2.5 bg-white border border-green-200 text-green-700 rounded-lg font-semibold text-sm hover:bg-green-50 transition-all"
                >
                  Integraciones
                </button>
              </div>
            </div>
          )}
        </div>

      ) : activeProvider === 'printful' ? (
        /* === PRINTFUL CATALOG BROWSE === */
        <div className="space-y-5">
          {/* Search/filter */}
          <div className="flex gap-2">
            <input
              type="text"
              value={pfCatalogSearch}
              onChange={e => setPfCatalogSearch(e.target.value)}
              placeholder="Filtrar catalogo (ej: t-shirt, mug, poster)..."
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-300 text-base sm:text-sm"
            />
          </div>

          {/* Catalog grid */}
          {pfCatalogLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : pfFilteredCatalog.length > 0 ? (
            <>
              <p className="text-sm text-gray-400">{pfFilteredCatalog.length} productos en catalogo</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {pfFilteredCatalog.map(product => (
                  <button
                    key={product.id}
                    onClick={() => pfViewProduct(product.id)}
                    className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-lg hover:border-green-200 transition-all text-left group"
                  >
                    <div className="aspect-square bg-gray-50">
                      <img
                        src={product.image}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs text-gray-700 font-medium line-clamp-2 leading-tight">{product.title}</p>
                      <p className="text-xs text-gray-400 mt-1">{product.variantCount} variantes</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : pfCatalogSearch ? (
            <div className="text-center py-20">
              <p className="text-gray-400">No se encontraron productos para "{pfCatalogSearch}"</p>
            </div>
          ) : null}

          {/* Loading detail overlay */}
          {pfProductLoading && (
            <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-2xl shadow-xl flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
                <span className="text-sm text-gray-600">Cargando producto...</span>
              </div>
            </div>
          )}
        </div>

      ) : !activeProvider ? (
        /* === PROVIDER SELECTION === */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {PROVIDERS.map(provider => (
            <button
              key={provider.id}
              onClick={() => provider.active && setActiveProvider(provider.id)}
              disabled={!provider.active}
              className={`relative flex flex-col items-center text-center rounded-2xl border p-6 transition-all ${
                provider.active
                  ? 'border-gray-200 hover:border-blue-300 hover:shadow-lg cursor-pointer bg-white'
                  : 'border-gray-100 bg-gray-50/50 cursor-default'
              }`}
            >
              {!provider.active && (
                <span className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-gray-200 text-gray-400 text-[10px] font-medium rounded-full">
                  Pronto
                </span>
              )}
              <img
                src={provider.logo}
                alt={provider.name}
                className={`w-14 h-14 object-contain rounded-2xl mb-3 ${!provider.active ? 'opacity-40 grayscale' : ''}`}
                onError={e => { (e.target as HTMLImageElement).src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect width="56" height="56" rx="12" fill="%23f3f4f6"/><text x="28" y="34" text-anchor="middle" font-size="20" fill="%239ca3af">${provider.name[0]}</text></svg>` }}
              />
              <h3 className={`font-semibold text-sm ${provider.active ? 'text-gray-900' : 'text-gray-400'}`}>{provider.name}</h3>
              <p className={`text-xs mt-1 leading-relaxed ${provider.active ? 'text-gray-400' : 'text-gray-300'}`}>{provider.description}</p>
              {provider.active && (
                <div className="mt-3 text-xs font-semibold text-blue-600">
                  Explorar →
                </div>
              )}
            </button>
          ))}
        </div>
      ) : selectedProduct ? (
        /* === DETAIL / IMPORT VIEW === */
        <div className="max-w-2xl space-y-5">
          {/* Product preview */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
              <img
                src={selectedProduct.image}
                alt={selectedProduct.name}
                className="w-full sm:w-40 h-48 sm:h-40 object-cover rounded-xl ring-1 ring-black/5 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">{selectedProduct.name}</h2>
                <p className="text-xs text-gray-400 mb-1">Precio CJ (costo)</p>
                <p className="text-xl font-bold text-red-600">
                  ${selectedProduct.sellPrice} USD
                  {currency !== 'USD' && (
                    <span className="text-sm font-medium text-gray-400 ml-2">
                      ({getCurrencySymbol(currency)}{Math.ceil(selectedProduct.sellPrice * rate)} {currency})
                    </span>
                  )}
                </p>
                {selectedProduct.images.length > 0 && (
                  <div className="flex gap-2 mt-3 overflow-x-auto">
                    {selectedProduct.images.slice(0, 6).map((img, i) => (
                      <img key={i} src={img} alt="" className="w-14 h-14 object-cover rounded-lg ring-1 ring-black/5 shrink-0" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Edit fields */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-gray-700">Nombre del producto</label>
                {!translatingName && (
                  <button
                    onClick={async () => {
                      setTranslatingName(true)
                      try {
                        const lang = store?.language || 'es'
                        const data = await cjPost({ action: 'translate', text: importName, targetLang: lang })
                        if (data.translated) setImportName(data.translated)
                      } catch { /* silent */ }
                      finally { setTranslatingName(false) }
                    }}
                    className="text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors"
                  >
                    Traducir
                  </button>
                )}
                {translatingName && (
                  <div className="flex items-center gap-1.5">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                    <span className="text-xs text-blue-400">Traduciendo...</span>
                  </div>
                )}
              </div>
              <input
                type="text"
                value={importName}
                onChange={e => setImportName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Precio de venta ({currency})
              </label>
              <input
                type="number"
                step="0.01"
                value={importPrice}
                onChange={e => setImportPrice(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
              />
              {importPrice && selectedProduct.sellPrice && (() => {
                const costInLocal = selectedProduct.sellPrice * rate
                const profit = parseFloat(importPrice) - costInLocal
                return (
                  <p className="text-xs text-gray-400 mt-1.5">
                    Ganancia estimada: <span className={`font-medium ${profit > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {getCurrencySymbol(currency)}{profit.toFixed(2)} {currency}
                    </span>
                    {' '}por venta
                  </p>
                )
              })()}
            </div>
            {categories.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Categoria</label>
                <select
                  value={selectedCategoryId}
                  onChange={e => setSelectedCategoryId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm bg-white"
                >
                  <option value="">Sin categoria</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Product details */}
          <div className="flex flex-wrap gap-3 text-xs">
            {selectedProduct.sku && (
              <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-gray-500">SKU: {selectedProduct.sku}</span>
            )}
            {selectedProduct.weight && selectedProduct.weight > 0 && (
              <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-gray-500">Peso: {selectedProduct.weight}g</span>
            )}
            {selectedProduct.materials && selectedProduct.materials.length > 0 && (
              <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-gray-500">Material: {selectedProduct.materials.join(', ')}</span>
            )}
          </div>

          {/* CJ Shipping estimation */}
          {(freightLoading || freightOptions.length > 0) && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Envio CJ a {store?.location?.country || '?'}
              </p>
              {freightLoading ? (
                <div className="flex items-center gap-2 py-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  <span className="text-xs text-blue-600">Calculando envio...</span>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    {freightOptions.map((opt, i) => (
                      <div key={i} className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2 text-xs">
                        <span className="font-medium text-gray-700">{opt.carrier}</span>
                        <span className="text-gray-400">{opt.days}</span>
                        <span className="font-bold text-blue-700">
                          ${opt.costUSD.toFixed(2)} USD
                          {currency !== 'USD' && (
                            <span className="font-normal text-gray-400 ml-1">
                              ({getCurrencySymbol(currency)}{Math.ceil(opt.costUSD * rate)})
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    Incluye este costo en tu precio de envio al cliente
                    {selectedProduct.variants.length > 1 && (
                      <span className="block text-blue-400 mt-0.5">
                        Estimado para la variante mas pesada — puede variar
                      </span>
                    )}
                  </p>
                </>
              )}
            </div>
          )}

          {/* Variants */}
          {selectedProduct.variants.length > 0 && selectedProduct.variantKeyNames.length > 0 && (() => {
            const groups: Record<string, Set<string>> = {}
            for (const name of selectedProduct.variantKeyNames) groups[name] = new Set()
            for (const v of selectedProduct.variants) {
              const parts = v.variantKey.split('-').map(s => s.trim())
              selectedProduct.variantKeyNames.forEach((name, i) => {
                if (parts[i]) groups[name].add(parts[i])
              })
            }
            return (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
                {selectedProduct.variantKeyNames.map(name => (
                  groups[name].size > 0 && (
                    <div key={name}>
                      <p className="text-sm font-medium text-gray-700 mb-1.5">{name} ({groups[name].size})</p>
                      <div className="flex gap-2 flex-wrap">
                        {Array.from(groups[name]).map(val => (
                          <span key={val} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">{val}</span>
                        ))}
                      </div>
                    </div>
                  )
                ))}
                <p className="text-xs text-gray-400">{selectedProduct.variants.length} combinaciones totales</p>
              </div>
            )
          })()}

          {/* Description */}
          {selectedProduct.description && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700">Descripcion</p>
                {!translatedDesc && !translating && (
                  <button
                    onClick={async () => {
                      setTranslating(true)
                      try {
                        const lang = store?.language || 'es'
                        const data = await cjPost({ action: 'translate', text: selectedProduct.description, targetLang: lang })
                        if (data.translated) setTranslatedDesc(data.translated)
                      } catch { /* silent */ }
                      finally { setTranslating(false) }
                    }}
                    className="text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors"
                  >
                    Traducir
                  </button>
                )}
                {translating && (
                  <div className="flex items-center gap-1.5">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                    <span className="text-xs text-blue-400">Traduciendo...</span>
                  </div>
                )}
                {translatedDesc && (
                  <button
                    onClick={() => setTranslatedDesc('')}
                    className="text-xs text-gray-400 hover:text-gray-600 font-medium transition-colors"
                  >
                    Ver original
                  </button>
                )}
              </div>
              <div
                className="text-xs text-gray-500 max-h-48 overflow-y-auto prose prose-xs"
                dangerouslySetInnerHTML={{ __html: translatedDesc || selectedProduct.description }}
              />
            </div>
          )}

          {/* Import button or upgrade prompt */}
          {!isBusiness ? (
            <div className="bg-gray-50 rounded-xl p-5 text-center space-y-3">
              <p className="text-sm font-medium text-gray-900">
                Importar productos requiere el plan Business
              </p>
              <p className="text-xs text-gray-500">
                Explora todos los productos que quieras. Para importarlos a tu tienda, actualiza a Business.
              </p>
              <Link
                to={localePath('/dashboard/plan')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-all"
              >
                Ver planes
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          ) : hasCJKey ? (
            <button
              onClick={importProduct}
              disabled={importing || !importName.trim() || !importPrice}
              className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {importing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Importando...
                </>
              ) : 'Importar a mi tienda'}
            </button>
          ) : (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3">
              <p className="text-sm text-orange-800 font-medium">
                Conecta tu cuenta de CJ Dropshipping para importar.
              </p>
              <p className="text-xs text-orange-600">
                Registrate gratis en cjdropshipping.com y pega tu API Key en Integraciones.
              </p>
              <div className="flex gap-2">
                <a
                  href="https://cjdropshipping.com/register"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center py-2.5 bg-orange-500 text-white rounded-lg font-semibold text-sm hover:bg-orange-600 transition-all"
                >
                  Crear cuenta CJ
                </a>
                <button
                  onClick={() => navigate(localePath('/dashboard/integrations'))}
                  className="flex-1 py-2.5 bg-white border border-orange-200 text-orange-700 rounded-lg font-semibold text-sm hover:bg-orange-50 transition-all"
                >
                  Integraciones
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* === BROWSE VIEW === */
        <div className="space-y-5">
          {/* Search bar */}
          <form onSubmit={e => { e.preventDefault(); setActiveCategory(''); search() }} className="flex gap-2">
            <input
              type="text"
              value={keyword}
              onChange={e => { setKeyword(e.target.value); if (activeCategory) setActiveCategory('') }}
              placeholder="Buscar productos (ej: camiseta, reloj, funda)..."
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 text-base sm:text-sm"
            />
            <button
              type="submit"
              disabled={searching || !keyword.trim()}
              className="px-6 py-3 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white rounded-xl font-semibold hover:from-[#2d6cb5] hover:to-[#38bdf8] transition-all disabled:opacity-50 text-sm"
            >
              {searching ? '...' : 'Buscar'}
            </button>
          </form>

          {/* Browse categories */}
          <div className="flex gap-2 flex-wrap justify-center sm:justify-start">
            {BROWSE_CATEGORIES.map(cat => (
              <button
                key={cat.keyword}
                onClick={() => browseCategory(cat)}
                className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeCategory === cat.keyword
                    ? 'bg-[#1e3a5f] text-white shadow-md'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Products grid */}
          {searching || loadingFeatured ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2d6cb5]"></div>
            </div>
          ) : showingProducts.length > 0 ? (
            <>
              <p className="text-sm text-gray-400">{showingLabel}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {showingProducts.map(product => (
                  <button
                    key={product.pid}
                    onClick={() => viewDetail(product.pid)}
                    className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-lg hover:border-blue-200 transition-all text-left group"
                  >
                    <div className="aspect-square bg-gray-50">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs text-gray-700 font-medium line-clamp-2 leading-tight">
                        {product.name}
                      </p>
                      <p className="text-sm font-bold text-[#1e3a5f] mt-1">
                        ${product.sellPrice} USD
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Pagination (only for search results) */}
              {hasSearchResults && totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    onClick={() => search(page - 1)}
                    disabled={page <= 1}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-gray-500">{page} / {totalPages}</span>
                  <button
                    onClick={() => search(page + 1)}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </>
          ) : (keyword || activeCategory) ? (
            <div className="text-center py-20">
              <p className="text-gray-400">No se encontraron productos</p>
            </div>
          ) : null}

          {/* Loading detail overlay */}
          {loadingDetail && (
            <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-2xl shadow-xl flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#2d6cb5]"></div>
                <span className="text-sm text-gray-600">Cargando producto...</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
