import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { productService, categoryService } from '../../lib/firebase'
import { useToast } from '../../components/ui/Toast'
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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // === CAMPOS BÁSICOS ===
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [image, setImage] = useState('')
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
        const categoriesData = await categoryService.getAll(store.id)
        setCategories(categoriesData)

        if (isEditing && productId) {
          const productData = await productService.get(store.id, productId)
          if (productData) {
            // Básicos
            setName(productData.name)
            setPrice(productData.price.toString())
            setDescription(productData.description || '')
            setImage(productData.image || '')
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

            // Si hay datos avanzados, mostrar la sección
            if (productData.sku || productData.cost || productData.stock || productData.brand) {
              setShowAdvanced(true)
            }
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
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
      setImage(data.secure_url)
    } catch (error) {
      console.error('Error uploading image:', error)
      showToast('Error al subir la imagen', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!store) return

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
      if (image) productData.image = image
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
            {/* Image upload */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <label className="block text-sm font-semibold text-[#1e3a5f] mb-3">
                Foto del producto
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed border-[#38bdf8]/30 rounded-xl overflow-hidden cursor-pointer hover:border-[#38bdf8] transition-all bg-gradient-to-br from-[#f0f7ff] to-white ${
                  image ? 'aspect-square' : 'aspect-[4/3]'
                }`}
              >
                {image ? (
                  <img src={image} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-gray-500">
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2d6cb5] mb-2"></div>
                        <p className="text-[#2d6cb5] font-medium">Subiendo...</p>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-gradient-to-br from-[#38bdf8] to-[#2d6cb5] rounded-xl flex items-center justify-center mb-2 shadow-lg shadow-[#38bdf8]/20">
                          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <p className="text-[#1e3a5f] font-medium text-sm">Click para subir</p>
                      </>
                    )}
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              {image && (
                <button
                  type="button"
                  onClick={() => setImage('')}
                  className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Eliminar foto
                </button>
              )}
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
