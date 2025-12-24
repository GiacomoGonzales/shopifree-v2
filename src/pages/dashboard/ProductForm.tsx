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

      const productData = {
        name,
        slug,
        price: parseFloat(price),
        description: description || undefined,
        image: image || undefined,
        categoryId: categoryId || undefined,
        active,
        // Avanzados
        comparePrice: comparePrice ? parseFloat(comparePrice) : undefined,
        cost: cost ? parseFloat(cost) : undefined,
        sku: sku || undefined,
        barcode: barcode || undefined,
        stock: stock ? parseInt(stock) : undefined,
        trackStock,
        lowStockAlert: lowStockAlert ? parseInt(lowStockAlert) : undefined,
        brand: brand || undefined,
        tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        weight: weight ? parseFloat(weight) : undefined,
        dimensions: (length || width || height) ? {
          length: length ? parseFloat(length) : undefined,
          width: width ? parseFloat(width) : undefined,
          height: height ? parseFloat(height) : undefined,
        } : undefined,
        featured,
      }

      if (isEditing && productId) {
        await productService.update(store.id, productId, productData)
        showToast('Producto actualizado', 'success')
      } else {
        await productService.create(store.id, productData)
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
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1e3a5f]">
          {isEditing ? 'Editar producto' : 'Nuevo producto'}
        </h1>
        <button
          onClick={() => navigate('/dashboard/products')}
          className="text-gray-600 hover:text-[#1e3a5f] transition-colors"
        >
          Cancelar
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ========== CAMPOS BÁSICOS ========== */}

        {/* Image upload */}
        <div>
          <label className="block text-sm font-semibold text-[#1e3a5f] mb-2">
            Foto del producto
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed border-[#38bdf8]/30 rounded-2xl overflow-hidden cursor-pointer hover:border-[#38bdf8] transition-all bg-gradient-to-br from-[#f0f7ff] to-white ${
              image ? 'aspect-square max-w-xs' : 'aspect-video'
            }`}
          >
            {image ? (
              <img src={image} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-gray-500">
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2d6cb5] mb-2"></div>
                    <p className="text-[#2d6cb5] font-medium">Subiendo...</p>
                  </>
                ) : (
                  <>
                    <div className="w-14 h-14 bg-gradient-to-br from-[#38bdf8] to-[#2d6cb5] rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-[#38bdf8]/20">
                      <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-[#1e3a5f] font-medium">Click para subir foto</p>
                    <p className="text-gray-400 text-sm mt-1">o arrastra y suelta</p>
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

        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-[#1e3a5f] mb-1">
            Nombre del producto *
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Torta de chocolate"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
          />
        </div>

        {/* Price */}
        <div>
          <label htmlFor="price" className="block text-sm font-semibold text-[#1e3a5f] mb-1">
            Precio de venta *
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
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-semibold text-[#1e3a5f] mb-1">
            Descripcion (opcional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Describe tu producto..."
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all resize-none"
          />
        </div>

        {/* Category */}
        {categories.length > 0 && (
          <div>
            <label htmlFor="category" className="block text-sm font-semibold text-[#1e3a5f] mb-1">
              Categoria (opcional)
            </label>
            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
            >
              <option value="">Sin categoria</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Active toggle */}
        <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-[#f0f7ff] to-white rounded-xl border border-[#38bdf8]/20">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#38bdf8] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-[#1e3a5f] peer-checked:to-[#2d6cb5]"></div>
          </label>
          <span className="text-sm text-[#1e3a5f] font-medium">
            {active ? 'Visible en el catalogo' : 'Oculto del catalogo'}
          </span>
        </div>

        {/* ========== OPCIONES AVANZADAS ========== */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
          >
            <span className="text-sm font-semibold text-[#1e3a5f] flex items-center gap-2">
              <svg className="w-5 h-5 text-[#38bdf8]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Opciones avanzadas
            </span>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showAdvanced && (
            <div className="p-4 space-y-5 border-t border-gray-200">
              {/* Precios */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Precios</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="comparePrice" className="block text-sm font-medium text-gray-700 mb-1">
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
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8]"
                    />
                    <p className="text-xs text-gray-400 mt-1">Se mostrara tachado</p>
                  </div>
                  <div>
                    <label htmlFor="cost" className="block text-sm font-medium text-gray-700 mb-1">
                      Costo
                    </label>
                    <input
                      id="cost"
                      type="number"
                      min="0"
                      step="0.01"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8]"
                    />
                    <p className="text-xs text-gray-400 mt-1">No visible al cliente</p>
                  </div>
                </div>
              </div>

              {/* Inventario */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Inventario</h4>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-1">
                      SKU
                    </label>
                    <input
                      id="sku"
                      type="text"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      placeholder="ABC-123"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8]"
                    />
                  </div>
                  <div>
                    <label htmlFor="barcode" className="block text-sm font-medium text-gray-700 mb-1">
                      Codigo de barras
                    </label>
                    <input
                      id="barcode"
                      type="text"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      placeholder="7501234567890"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={trackStock}
                      onChange={(e) => setTrackStock(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#38bdf8] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2d6cb5]"></div>
                  </label>
                  <span className="text-sm text-gray-700">Controlar stock</span>
                </div>

                {trackStock && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-1">
                        Stock disponible
                      </label>
                      <input
                        id="stock"
                        type="number"
                        min="0"
                        value={stock}
                        onChange={(e) => setStock(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8]"
                      />
                    </div>
                    <div>
                      <label htmlFor="lowStockAlert" className="block text-sm font-medium text-gray-700 mb-1">
                        Alerta stock bajo
                      </label>
                      <input
                        id="lowStockAlert"
                        type="number"
                        min="0"
                        value={lowStockAlert}
                        onChange={(e) => setLowStockAlert(e.target.value)}
                        placeholder="5"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Organizacion */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Organizacion</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-1">
                      Marca
                    </label>
                    <input
                      id="brand"
                      type="text"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="Nike, Adidas..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8]"
                    />
                  </div>
                  <div>
                    <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                      Etiquetas
                    </label>
                    <input
                      id="tags"
                      type="text"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="nuevo, oferta, popular"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8]"
                    />
                    <p className="text-xs text-gray-400 mt-1">Separadas por coma</p>
                  </div>
                </div>
              </div>

              {/* Envio */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Envio</h4>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-1">
                      Peso (g)
                    </label>
                    <input
                      id="weight"
                      type="number"
                      min="0"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="500"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8]"
                    />
                  </div>
                  <div>
                    <label htmlFor="length" className="block text-sm font-medium text-gray-700 mb-1">
                      Largo (cm)
                    </label>
                    <input
                      id="length"
                      type="number"
                      min="0"
                      value={length}
                      onChange={(e) => setLength(e.target.value)}
                      placeholder="20"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8]"
                    />
                  </div>
                  <div>
                    <label htmlFor="width" className="block text-sm font-medium text-gray-700 mb-1">
                      Ancho (cm)
                    </label>
                    <input
                      id="width"
                      type="number"
                      min="0"
                      value={width}
                      onChange={(e) => setWidth(e.target.value)}
                      placeholder="15"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8]"
                    />
                  </div>
                  <div>
                    <label htmlFor="height" className="block text-sm font-medium text-gray-700 mb-1">
                      Alto (cm)
                    </label>
                    <input
                      id="height"
                      type="number"
                      min="0"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      placeholder="10"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8]"
                    />
                  </div>
                </div>
              </div>

              {/* Destacado */}
              <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={featured}
                    onChange={(e) => setFeatured(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-yellow-400 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-yellow-500"></div>
                </label>
                <div>
                  <span className="text-sm text-gray-800 font-medium">Producto destacado</span>
                  <p className="text-xs text-gray-500">Se mostrara en la seccion de destacados</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={saving || !name || !price}
          className="w-full py-3.5 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white rounded-xl hover:from-[#2d6cb5] hover:to-[#38bdf8] transition-all font-semibold disabled:opacity-50 shadow-lg shadow-[#1e3a5f]/20"
        >
          {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear producto'}
        </button>
      </form>
    </div>
  )
}
