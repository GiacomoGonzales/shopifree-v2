import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import { productService, categoryService } from '../../lib/firebase'
import { useToast } from '../../components/ui/Toast'
import { getCurrencySymbol } from '../../lib/currency'
import { canAddProduct, canAddCategory, getRemainingProducts, getRemainingCategories, PLAN_FEATURES, type PlanType } from '../../lib/stripe'
import ProductImport from '../../components/dashboard/ProductImport'
import type { Product, Category } from '../../types'

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export default function Products() {
  const { t } = useTranslation('dashboard')
  const { localePath } = useLanguage()
  const { store } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Category management
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [savingCategory, setSavingCategory] = useState(false)

  // Limit warning modal
  const [showLimitModal, setShowLimitModal] = useState(false)
  const [limitMessage, setLimitMessage] = useState('')

  // Import modal
  const [showImportModal, setShowImportModal] = useState(false)

  // Plan limits
  const plan = (store?.plan || 'free') as PlanType
  const productLimit = canAddProduct(plan, products.length)
  const categoryLimit = canAddCategory(plan, categories.length)
  const remainingProducts = getRemainingProducts(plan, products.length)
  const remainingCategories = getRemainingCategories(plan, categories.length)

  const handleAddProduct = () => {
    if (!productLimit.allowed) {
      setLimitMessage(productLimit.message || t('products.limit.products'))
      setShowLimitModal(true)
      return
    }
    navigate(localePath('/dashboard/products/new'))
  }

  const handleAddCategory = () => {
    if (!categoryLimit.allowed) {
      setLimitMessage(categoryLimit.message || t('products.limit.categories'))
      setShowLimitModal(true)
      return
    }
    setEditingCategory(null)
    setNewCategoryName('')
    setShowCategoryModal(true)
  }

  // Image upload
  const [uploadingProductId, setUploadingProductId] = useState<string | null>(null)
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})

  useEffect(() => {
    const fetchData = async () => {
      if (!store) return

      try {
        const [productsData, categoriesData] = await Promise.all([
          productService.getAll(store.id),
          categoryService.getAll(store.id)
        ])
        setProducts(productsData)
        setCategories(categoriesData)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [store])

  const handleDeleteProduct = async (productId: string) => {
    if (!store) return
    if (!confirm(t('products.confirmDelete'))) return

    try {
      await productService.delete(store.id, productId)
      setProducts(products.filter(p => p.id !== productId))
      showToast(t('products.deleted'), 'success')
    } catch (error) {
      console.error('Error deleting product:', error)
      showToast(t('products.deleteError'), 'error')
    }
  }

  const handleImageUpload = async (productId: string, file: File) => {
    if (!store) return

    setUploadingProductId(productId)
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
      const imageUrl = data.secure_url

      // Update product in Firebase
      await productService.update(store.id, productId, { image: imageUrl })

      // Update local state
      setProducts(products.map(p =>
        p.id === productId ? { ...p, image: imageUrl } : p
      ))

      showToast(t('products.photoAdded'), 'success')
    } catch (error) {
      console.error('Error uploading image:', error)
      showToast(t('products.photoError'), 'error')
    } finally {
      setUploadingProductId(null)
    }
  }

  const handleFileChange = (productId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleImageUpload(productId, file)
    }
  }

  const handleDrop = (productId: string, e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      handleImageUpload(productId, file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!store || !newCategoryName.trim()) return

    setSavingCategory(true)
    try {
      const slug = newCategoryName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')

      if (editingCategory) {
        await categoryService.update(store.id, editingCategory.id, {
          name: newCategoryName.trim(),
          slug
        })
        setCategories(categories.map(c =>
          c.id === editingCategory.id
            ? { ...c, name: newCategoryName.trim(), slug }
            : c
        ))
        showToast(t('products.categories.updated'), 'success')
      } else {
        const categoryId = await categoryService.create(store.id, {
          name: newCategoryName.trim(),
          slug,
          order: categories.length
        })
        setCategories([...categories, {
          id: categoryId,
          storeId: store.id,
          name: newCategoryName.trim(),
          slug,
          order: categories.length,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }])
        showToast(t('products.categories.created'), 'success')
      }

      setShowCategoryModal(false)
      setNewCategoryName('')
      setEditingCategory(null)
    } catch (error) {
      console.error('Error saving category:', error)
      showToast(t('products.categories.saveError'), 'error')
    } finally {
      setSavingCategory(false)
    }
  }

  const handleDeleteCategory = async (category: Category) => {
    if (!store) return
    if (!confirm(t('products.categories.confirmDelete', { name: category.name }))) return

    try {
      await categoryService.delete(store.id, category.id)
      setCategories(categories.filter(c => c.id !== category.id))
      if (selectedCategory === category.id) {
        setSelectedCategory(null)
      }
      showToast(t('products.categories.deleted'), 'success')
    } catch (error) {
      console.error('Error deleting category:', error)
      showToast(t('products.categories.deleteError'), 'error')
    }
  }

  const openEditCategory = (category: Category) => {
    setEditingCategory(category)
    setNewCategoryName(category.name)
    setShowCategoryModal(true)
  }

  const refreshProducts = async () => {
    if (!store) return
    try {
      const productsData = await productService.getAll(store.id)
      setProducts(productsData)
    } catch (error) {
      console.error('Error refreshing products:', error)
    }
  }

  const filteredProducts = selectedCategory
    ? selectedCategory === 'uncategorized'
      ? products.filter(p => !p.categoryId)
      : products.filter(p => p.categoryId === selectedCategory)
    : products

  const getProductCount = (categoryId: string | null) => {
    if (categoryId === null) return products.length
    if (categoryId === 'uncategorized') return products.filter(p => !p.categoryId).length
    return products.filter(p => p.categoryId === categoryId).length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a5f]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1e3a5f]">{t('products.title')}</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            {products.length === 1
              ? t('products.subtitle', { count: products.length })
              : t('products.subtitle_plural', { count: products.length })}
            {remainingProducts !== 'unlimited' && (
              <span className={`ml-2 ${remainingProducts <= 3 ? 'text-orange-500' : 'text-gray-400'}`}>
                ({t('products.remaining', { count: remainingProducts })})
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2.5 bg-white border border-[#38bdf8] text-[#2d6cb5] rounded-xl hover:bg-[#f0f7ff] transition-all text-sm font-semibold flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="hidden sm:inline">{t('products.import')}</span>
          </button>
          <button
            onClick={handleAddProduct}
            className={`px-4 py-2.5 rounded-xl transition-all text-sm font-semibold text-center ${
              productLimit.allowed
                ? 'bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white hover:from-[#2d6cb5] hover:to-[#38bdf8] shadow-lg shadow-[#1e3a5f]/20'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {t('products.add')}
          </button>
        </div>
      </div>

      {/* Categories tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-[#1e3a5f]">{t('products.categories.title')}</h3>
            {remainingCategories !== 'unlimited' && (
              <p className={`text-xs ${remainingCategories <= 1 ? 'text-orange-500' : 'text-gray-400'}`}>
                {t('products.remaining', { count: remainingCategories })}
              </p>
            )}
          </div>
          <button
            onClick={handleAddCategory}
            className={`text-sm font-medium flex items-center gap-1 ${
              categoryLimit.allowed
                ? 'text-[#2d6cb5] hover:text-[#1e3a5f]'
                : 'text-gray-400 cursor-not-allowed'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('products.categories.new')}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              selectedCategory === null
                ? 'bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white shadow-lg shadow-[#1e3a5f]/20'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t('products.categories.all')} ({getProductCount(null)})
          </button>

          {categories.map(category => (
            <div key={category.id} className="relative group">
              <button
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedCategory === category.id
                    ? 'bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white shadow-lg shadow-[#1e3a5f]/20'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.name} ({getProductCount(category.id)})
              </button>

              {/* Edit/Delete dropdown */}
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    openEditCategory(category)
                  }}
                  className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50"
                >
                  {t('products.categories.edit')}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteCategory(category)
                  }}
                  className="block w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50"
                >
                  {t('products.categories.delete')}
                </button>
              </div>
            </div>
          ))}

          {products.some(p => !p.categoryId) && (
            <button
              onClick={() => setSelectedCategory('uncategorized')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                selectedCategory === 'uncategorized'
                  ? 'bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white shadow-lg shadow-[#1e3a5f]/20'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('products.categories.uncategorized')} ({getProductCount('uncategorized')})
            </button>
          )}
        </div>
      </div>

      {/* Products list */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
          <div className="w-20 h-20 bg-gradient-to-br from-[#f0f7ff] to-white border border-[#38bdf8]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-[#2d6cb5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[#1e3a5f] mb-2">
            {selectedCategory ? t('products.empty.titleFiltered') : t('products.empty.title')}
          </h3>
          <p className="text-gray-600 mb-6">
            {selectedCategory ? t('products.empty.descriptionFiltered') : t('products.empty.description')}
          </p>
          <button
            onClick={handleAddProduct}
            className={`inline-flex px-6 py-3 rounded-xl transition-all font-semibold ${
              productLimit.allowed
                ? 'bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white hover:from-[#2d6cb5] hover:to-[#38bdf8] shadow-lg shadow-[#1e3a5f]/20'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {t('products.addProduct')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:shadow-[#1e3a5f]/10 transition-all group"
            >
              {/* Image section */}
              <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 relative">
                {product.image ? (
                  <Link to={localePath(`/dashboard/products/${product.id}`)}>
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </Link>
                ) : uploadingProductId === product.id ? (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2d6cb5] mb-2"></div>
                    <p className="text-xs text-[#2d6cb5] font-medium">{t('products.uploading')}</p>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRefs.current[product.id]?.click()}
                    onDrop={(e) => handleDrop(product.id, e)}
                    onDragOver={handleDragOver}
                    className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-[#f0f7ff] transition-colors border-2 border-dashed border-transparent hover:border-[#38bdf8] rounded-t-2xl"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-[#38bdf8]/20 to-[#2d6cb5]/20 rounded-xl flex items-center justify-center mb-2">
                      <svg className="w-5 h-5 text-[#2d6cb5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <p className="text-xs text-[#2d6cb5] font-medium">{t('products.addPhoto')}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{t('products.clickOrDrag')}</p>
                    <input
                      ref={(el) => { fileInputRefs.current[product.id] = el }}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(product.id, e)}
                      className="hidden"
                    />
                  </div>
                )}
                {!product.active && (
                  <div className="absolute top-2 right-2 px-2 py-1 bg-gray-900/70 text-white text-xs rounded-lg">
                    {t('products.hidden')}
                  </div>
                )}
              </div>

              {/* Product info */}
              <Link to={localePath(`/dashboard/products/${product.id}`)}>
                <div className="p-4">
                  <h3 className="font-semibold text-[#1e3a5f] truncate group-hover:text-[#2d6cb5] transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-[#2d6cb5] font-bold text-sm mt-1">
                    {getCurrencySymbol(store?.currency || 'USD')}{product.price.toFixed(2)}
                  </p>
                  {product.categoryId && (
                    <p className="text-xs text-gray-500 mt-1">
                      {categories.find(c => c.id === product.categoryId)?.name}
                    </p>
                  )}
                </div>
              </Link>

              <div className="px-4 pb-4 flex gap-2">
                <Link
                  to={localePath(`/dashboard/products/${product.id}`)}
                  className="flex-1 px-3 py-2 text-xs font-medium text-[#2d6cb5] bg-[#f0f7ff] hover:bg-[#e0efff] rounded-lg transition-all text-center"
                >
                  {t('products.edit')}
                </Link>
                <button
                  onClick={() => handleDeleteProduct(product.id)}
                  className="px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-all"
                >
                  {t('products.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-[#1e3a5f] mb-4">
              {editingCategory ? t('products.categories.editTitle') : t('products.categories.newTitle')}
            </h3>
            <form onSubmit={handleSaveCategory}>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder={t('products.categories.namePlaceholder')}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all mb-4"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryModal(false)
                    setNewCategoryName('')
                    setEditingCategory(null)
                  }}
                  className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all font-medium"
                >
                  {t('products.categories.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={!newCategoryName.trim() || savingCategory}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white rounded-xl hover:from-[#2d6cb5] hover:to-[#38bdf8] transition-all font-medium disabled:opacity-50"
                >
                  {savingCategory ? t('products.categories.saving') : t('products.categories.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ProductImport
          onClose={() => setShowImportModal(false)}
          onSuccess={refreshProducts}
          categories={categories.map(c => ({ id: c.id, name: c.name }))}
        />
      )}

      {/* Limit Modal */}
      {showLimitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-[#1e3a5f] text-center mb-2">
              {t('products.limit.title')}
            </h3>
            <p className="text-gray-600 text-center mb-6">
              {limitMessage}
            </p>
            <div className="space-y-3">
              <Link
                to={localePath('/dashboard/plan')}
                className="block w-full px-4 py-3 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white text-center rounded-xl hover:from-[#2d6cb5] hover:to-[#38bdf8] transition-all font-semibold shadow-lg shadow-[#1e3a5f]/20"
              >
                {t('products.limit.upgrade', { price: PLAN_FEATURES.pro.price })}
              </Link>
              <button
                onClick={() => setShowLimitModal(false)}
                className="block w-full px-4 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all font-medium"
              >
                {t('products.limit.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
