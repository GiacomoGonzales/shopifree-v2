import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { productService, categoryService } from '../../lib/firebase'
import { useToast } from '../../components/ui/Toast'
import { canAddProduct, getMaxImagesPerProduct, type PlanType } from '../../lib/stripe'
import type { Category } from '../../types'

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export default function ProductForm() {
  const { productId } = useParams<{ productId: string }>()
  const isEditing = productId && productId !== 'new'
  const { store } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [categories, setCategories] = useState<Category[]>([])
  const [productCount, setProductCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  // === CAMPOS BÁSICOS ===
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [active, setActive] = useState(true)

  // === CAMPOS AVANZADOS ===
  const [comparePrice, setComparePrice] = useState('')
  const [cost, setCost] = useState('')
  const [sku, setSku] = useState('')
  const [barcode, setBarcode] = useState('')
  const [stock, setStock] = useState('')
  const [trackStock, setTrackStock] = useState(false)
  const [lowStockAlert, setLowStockAlert] = useState('')
  const [brand, setBrand] = useState('')
  const [tags, setTags] = useState('')
  const [weight, setWeight] = useState('')
  const [length, setLength] = useState('')
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [featured, setFeatured] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      if (!store) return

      try {
        const [categoriesData, productsData] = await Promise.all([
          categoryService.getAll(store.id),
          productService.getAll(store.id)
        ])
        setCategories(categoriesData)
        setProductCount(productsData.length)

        if (isEditing && productId) {
          const productData = await productService.get(store.id, productId)
          if (productData) {
            // Básicos
            setName(productData.name)
            setPrice(productData.price.toString())
            setDescription(productData.description || '')
            // Load images - prefer images array, fallback to legacy image field
            if (productData.images?.length) {
              setImages(productData.images)
            } else if (productData.image) {
              setImages([productData.image])
            } else {
              setImages([])
            }
            setCategoryId(productData.categoryId || '')
            setActive(productData.active)

            // Avanzados
            setComparePrice(productData.comparePrice?.toString() || '')
            setCost(productData.cost?.toString() || '')
            setSku(productData.sku || '')
            setBarcode(productData.barcode || '')
            setStock(productData.stock?.toString() || '')
            setTrackStock(productData.trackStock || false)
            setLowStockAlert(productData.lowStockAlert?.toString() || '')
            setBrand(productData.brand || '')
            setTags(productData.tags?.join(', ') || '')
            setWeight(productData.weight?.toString() || '')
            setLength(productData.dimensions?.length?.toString() || '')
            setWidth(productData.dimensions?.width?.toString() || '')
            setHeight(productData.dimensions?.height?.toString() || '')
            setFeatured(productData.featured || false)
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [store, isEditing, productId])

  const plan = (store?.plan || 'free') as PlanType
  const maxImages = getMaxImagesPerProduct(plan)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // Check limit
    const remainingSlots = maxImages - images.length
    if (remainingSlots <= 0) {
      showToast(`Limite de ${maxImages} ${maxImages === 1 ? 'imagen' : 'imagenes'} alcanzado. Actualiza a Pro para mas.`, 'error')
      return
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots)
    setUploading(true)

    try {
      const uploadPromises = filesToUpload.map(async (file) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
        formData.append('folder', 'shopifree/products')

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
          { method: 'POST', body: formData }
        )

        if (!response.ok) throw new Error('Upload failed')
        const data = await response.json()
        return data.secure_url
      })

      const uploadedUrls = await Promise.all(uploadPromises)
      setImages(prev => [...prev, ...uploadedUrls])

      if (filesToUpload.length < files.length) {
        showToast(`Solo se subieron ${filesToUpload.length} de ${files.length} imagenes (limite del plan)`, 'info')
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      showToast('Error al subir la imagen', 'error')
    } finally {
      setUploading(false)
      // Clear file input
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleMoveImage = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === images.length - 1) return

    const newImages = [...images]
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    ;[newImages[index], newImages[swapIndex]] = [newImages[swapIndex], newImages[index]]
    setImages(newImages)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!store) return

    // Check product limit for new products
    if (!isEditing) {
      const plan = (store.plan || 'free') as PlanType
      const limitCheck = canAddProduct(plan, productCount)
      if (!limitCheck.allowed) {
        showToast(limitCheck.message || 'Has alcanzado el limite de productos', 'error')
        navigate('/dashboard/plan')
        return
      }
    }

    setSaving(true)
    try {
      const slug = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')

      // Build product data dynamically to avoid undefined values (Firebase rejects them)
      const productData: Record<string, unknown> = {
        name,
        slug,
        price: parseFloat(price),
        active,
        trackStock,
        featured,
        tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      }

      // Add optional fields only if they have values
      if (description) productData.description = description
      // Save first image as main image (backwards compatible) + all images
      if (images.length > 0) {
        productData.image = images[0]
        productData.images = images
      }
      if (categoryId) productData.categoryId = categoryId
      if (comparePrice) productData.comparePrice = parseFloat(comparePrice)
      if (cost) productData.cost = parseFloat(cost)
      if (sku) productData.sku = sku
      if (barcode) productData.barcode = barcode
      if (stock) productData.stock = parseInt(stock)
      if (lowStockAlert) productData.lowStockAlert = parseInt(lowStockAlert)
      if (brand) productData.brand = brand
      if (weight) productData.weight = parseFloat(weight)

      // Add dimensions only if at least one dimension is provided
      if (length || width || height) {
        const dimensions: Record<string, number> = {}
        if (length) dimensions.length = parseFloat(length)
        if (width) dimensions.width = parseFloat(width)
        if (height) dimensions.height = parseFloat(height)
        productData.dimensions = dimensions
      }

      if (isEditing && productId) {
        await productService.update(store.id, productId, productData as Parameters<typeof productService.update>[2])
        showToast('Producto actualizado', 'success')
      } else {
        await productService.create(store.id, productData as Parameters<typeof productService.create>[1])
        showToast('Producto creado', 'success')
      }

      navigate('/dashboard/products')
    } catch (error) {
      console.error('Error saving product:', error)
      showToast('Error al guardar el producto', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a5f]"></div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">
            {isEditing ? 'Editar producto' : 'Nuevo producto'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEditing ? 'Modifica los datos del producto' : 'Agrega un nuevo producto a tu catalogo'}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/dashboard/products')}
            className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !name || !price}
            className="px-6 py-2.5 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white rounded-xl hover:from-[#2d6cb5] hover:to-[#38bdf8] transition-all font-semibold disabled:opacity-50 shadow-lg shadow-[#1e3a5f]/20"
          >
            {saving ? 'Guardando...' : isEditing ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Basic Info */}
          <div className="space-y-6">
            {/* Image upload - Multiple images */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-[#1e3a5f]">
                  Fotos del producto
                </label>
                <span className="text-xs text-gray-500">
                  {images.length}/{maxImages} {maxImages === 1 ? 'imagen' : 'imagenes'}
                </span>
              </div>

              {/* Image Gallery */}
              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {images.map((img, index) => (
                    <div key={img} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200">
                      <img src={img} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                      {index === 0 && (
                        <span className="absolute top-1 left-1 bg-[#1e3a5f] text-white text-[10px] px-1.5 py-0.5 rounded">
                          Principal
                        </span>
                      )}
                      {/* Overlay controls */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                        {index > 0 && (
                          <button
                            type="button"
                            onClick={() => handleMoveImage(index, 'up')}
                            className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-100"
                            title="Mover izquierda"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                        )}
                        {index < images.length - 1 && (
                          <button
                            type="button"
                            onClick={() => handleMoveImage(index, 'down')}
                            className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-100"
                            title="Mover derecha"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="w-7 h-7 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600"
                          title="Eliminar"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload area */}
              {images.length < maxImages ? (
                <div
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  className={`border-2 border-dashed border-[#38bdf8]/30 rounded-xl overflow-hidden cursor-pointer hover:border-[#38bdf8] transition-all bg-gradient-to-br from-[#f0f7ff] to-white ${
                    images.length === 0 ? 'aspect-[4/3]' : 'py-6'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center h-full p-4 text-gray-500">
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2d6cb5] mb-2"></div>
                        <p className="text-[#2d6cb5] font-medium">Subiendo...</p>
                      </>
                    ) : (
                      <>
                        <div className="w-10 h-10 bg-gradient-to-br from-[#38bdf8] to-[#2d6cb5] rounded-xl flex items-center justify-center mb-2 shadow-lg shadow-[#38bdf8]/20">
                          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                        <p className="text-[#1e3a5f] font-medium text-sm">
                          {images.length === 0 ? 'Click para subir fotos' : 'Agregar mas fotos'}
                        </p>
                        {maxImages > 1 && (
                          <p className="text-xs text-gray-400 mt-1">Puedes seleccionar varias a la vez</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-sm text-gray-600">Limite de imagenes alcanzado</p>
                  {maxImages === 1 && (
                    <a href="/dashboard/plan" className="text-xs text-[#2d6cb5] hover:underline mt-1 inline-block">
                      Actualiza a Pro para subir hasta 5 imagenes
                    </a>
                  )}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple={maxImages > 1}
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {/* Basic Fields */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">Informacion basica</h2>
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-[#1e3a5f] mb-1">
                    Nombre *
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Torta de chocolate"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                  />
                </div>

                {/* Price & Compare Price */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="price" className="block text-sm font-medium text-[#1e3a5f] mb-1">
                      Precio *
                    </label>
                    <input
                      id="price"
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="comparePrice" className="block text-sm font-medium text-[#1e3a5f] mb-1">
                      Precio anterior
                    </label>
                    <input
                      id="comparePrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={comparePrice}
                      onChange={(e) => setComparePrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-[#1e3a5f] mb-1">
                    Descripcion
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Describe tu producto..."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all resize-none"
                  />
                </div>

                {/* Category */}
                {categories.length > 0 && (
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-[#1e3a5f] mb-1">
                      Categoria
                    </label>
                    <select
                      id="category"
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                    >
                      <option value="">Sin categoria</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Visibility */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">Visibilidad</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-[#f0f7ff] rounded-xl">
                  <span className="text-sm text-[#1e3a5f] font-medium">
                    {active ? 'Visible en catalogo' : 'Oculto'}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(e) => setActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#38bdf8] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-[#1e3a5f] peer-checked:to-[#2d6cb5]"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl border border-yellow-200">
                  <div>
                    <span className="text-sm text-gray-800 font-medium">Destacado</span>
                    <p className="text-xs text-gray-500">Aparece en destacados</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={featured}
                      onChange={(e) => setFeatured(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-yellow-400 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Advanced Options */}
          <div className="space-y-6">
            {/* Inventory */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">Inventario</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="sku" className="block text-sm font-medium text-[#1e3a5f] mb-1">SKU</label>
                    <input
                      id="sku"
                      type="text"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      placeholder="ABC-123"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8]"
                    />
                  </div>
                  <div>
                    <label htmlFor="barcode" className="block text-sm font-medium text-[#1e3a5f] mb-1">Codigo de barras</label>
                    <input
                      id="barcode"
                      type="text"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      placeholder="7501234567890"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm text-gray-700">Controlar stock</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={trackStock}
                      onChange={(e) => setTrackStock(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#38bdf8] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2d6cb5]"></div>
                  </label>
                </div>

                {trackStock && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="stock" className="block text-sm font-medium text-[#1e3a5f] mb-1">Stock</label>
                      <input
                        id="stock"
                        type="number"
                        min="0"
                        value={stock}
                        onChange={(e) => setStock(e.target.value)}
                        placeholder="0"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8]"
                      />
                    </div>
                    <div>
                      <label htmlFor="lowStockAlert" className="block text-sm font-medium text-[#1e3a5f] mb-1">Alerta bajo</label>
                      <input
                        id="lowStockAlert"
                        type="number"
                        min="0"
                        value={lowStockAlert}
                        onChange={(e) => setLowStockAlert(e.target.value)}
                        placeholder="5"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8]"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="cost" className="block text-sm font-medium text-[#1e3a5f] mb-1">Costo (no visible)</label>
                  <input
                    id="cost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8]"
                  />
                </div>
              </div>
            </div>

            {/* Organization */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">Organizacion</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="brand" className="block text-sm font-medium text-[#1e3a5f] mb-1">Marca</label>
                  <input
                    id="brand"
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Nike, Adidas..."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8]"
                  />
                </div>
                <div>
                  <label htmlFor="tags" className="block text-sm font-medium text-[#1e3a5f] mb-1">Etiquetas</label>
                  <input
                    id="tags"
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="nuevo, oferta, popular"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8]"
                  />
                  <p className="text-xs text-gray-400 mt-1">Separadas por coma</p>
                </div>
              </div>
            </div>

            {/* Shipping */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">Envio</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="weight" className="block text-sm font-medium text-[#1e3a5f] mb-1">Peso (g)</label>
                  <input
                    id="weight"
                    type="number"
                    min="0"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="500"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8]"
                  />
                </div>
                <div>
                  <label htmlFor="length" className="block text-sm font-medium text-[#1e3a5f] mb-1">Largo (cm)</label>
                  <input
                    id="length"
                    type="number"
                    min="0"
                    value={length}
                    onChange={(e) => setLength(e.target.value)}
                    placeholder="20"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8]"
                  />
                </div>
                <div>
                  <label htmlFor="width" className="block text-sm font-medium text-[#1e3a5f] mb-1">Ancho (cm)</label>
                  <input
                    id="width"
                    type="number"
                    min="0"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    placeholder="15"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8]"
                  />
                </div>
                <div>
                  <label htmlFor="height" className="block text-sm font-medium text-[#1e3a5f] mb-1">Alto (cm)</label>
                  <input
                    id="height"
                    type="number"
                    min="0"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="10"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
