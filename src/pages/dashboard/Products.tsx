import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Capacitor } from '@capacitor/core'
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, horizontalListSortingStrategy, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import { productService, categoryService } from '../../lib/firebase'
import { useToast } from '../../components/ui/Toast'
import { getCurrencySymbol } from '../../lib/currency'
import { canAddProduct, canAddCategory, getRemainingProducts, getRemainingCategories, getPlanLimits, getEffectivePlan, PLAN_FEATURES } from '../../lib/stripe'
import ProductImport from '../../components/dashboard/ProductImport'
import type { Product, Category } from '../../types'

function SortableProductCard({ product, children }: { product: Product; children: (dragHandleProps: { attributes: ReturnType<typeof useSortable>['attributes']; listeners: ReturnType<typeof useSortable>['listeners']; isDragging: boolean }) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: product.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <div ref={setNodeRef} style={style}>
      {children({ attributes, listeners, isDragging })}
    </div>
  )
}

function SortableCategoryTab({ category, children }: { category: Category; children: (props: { attributes: ReturnType<typeof useSortable>['attributes']; listeners: ReturnType<typeof useSortable>['listeners']; isDragging: boolean }) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <div ref={setNodeRef} style={style}>
      {children({ attributes, listeners, isDragging })}
    </div>
  )
}

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
  const [openCategoryMenu, setOpenCategoryMenu] = useState<string | null>(null)
  const [savingCategory, setSavingCategory] = useState(false)

  // Limit warning modal
  const [showLimitModal, setShowLimitModal] = useState(false)
  const [limitMessage, setLimitMessage] = useState('')

  // Import modals
  const [showImportModal, setShowImportModal] = useState(false)

  // Close category menu when clicking outside
  useEffect(() => {
    if (!openCategoryMenu) return
    const handleClick = () => setOpenCategoryMenu(null)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [openCategoryMenu])

  // Plan limits - use effective plan (considers subscription status)
  const plan = store ? getEffectivePlan(store) : 'free'
  const productLimit = canAddProduct(plan, products.length)
  const categoryLimit = canAddCategory(plan, categories.length)
  const remainingProducts = getRemainingProducts(plan, products.length)
  const remainingCategories = getRemainingCategories(plan, categories.length)

  // Calculate hidden products (over plan limit)
  const planLimits = getPlanLimits(plan)
  const maxProducts = planLimits.products
  const activeProducts = products.filter(p => p.active).length
  const hiddenProducts = maxProducts !== -1 && activeProducts > maxProducts
    ? activeProducts - maxProducts
    : 0

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

  // Drag & drop reorder
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )
  const [isReordering, setIsReordering] = useState(false)

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !store) return

    const sourceList = selectedCategory
      ? selectedCategory === 'uncategorized'
        ? products.filter(p => !p.categoryId)
        : products.filter(p => p.categoryId === selectedCategory)
      : products

    const oldIndex = sourceList.findIndex(p => p.id === active.id)
    const newIndex = sourceList.findIndex(p => p.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(sourceList, oldIndex, newIndex)
    const updatedItems = reordered.map((p, i) => ({ ...p, order: i }))

    // Update local state - merge back with products not in current filter
    if (selectedCategory) {
      const otherProducts = products.filter(p => !sourceList.some(sp => sp.id === p.id))
      setProducts([...otherProducts, ...updatedItems])
    } else {
      setProducts(updatedItems)
    }

    // Persist to Firestore
    setIsReordering(true)
    try {
      await Promise.all(
        updatedItems.map(p => productService.update(store.id, p.id, { order: p.order }))
      )
    } catch (error) {
      console.error('Error reordering products:', error)
      showToast(t('products.reorderError') || 'Error al reordenar', 'error')
    } finally {
      setIsReordering(false)
    }
  }

  const handleCategoryDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !store) return

    const sorted = [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    const oldIndex = sorted.findIndex(c => c.id === active.id)
    const newIndex = sorted.findIndex(c => c.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(sorted, oldIndex, newIndex)
    const updated = reordered.map((c, i) => ({ ...c, order: i }))
    setCategories(updated)

    try {
      await Promise.all(
        updated.map(c => categoryService.update(store.id, c.id, { order: c.order }))
      )
    } catch (error) {
      console.error('Error reordering categories:', error)
      showToast('Error al reordenar categorias', 'error')
    }
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

  const sortedCategories = [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  const filteredProducts = (selectedCategory
    ? selectedCategory === 'uncategorized'
      ? products.filter(p => !p.categoryId)
      : products.filter(p => p.categoryId === selectedCategory)
    : products
  ).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

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
          <h1 className="text-xl sm:text-xl font-semibold text-gray-900">{t('products.title')}</h1>
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
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Link
            to={localePath('/dashboard/dropshipping')}
            className="w-full sm:w-auto px-4 py-2.5 bg-white border border-emerald-300 text-emerald-700 rounded-xl hover:bg-emerald-50 transition-all text-sm font-semibold flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Dropshipping
          </Link>
          <button
            onClick={() => setShowImportModal(true)}
            className="w-full sm:w-auto px-4 py-2.5 bg-white border border-[#38bdf8] text-[#2d6cb5] rounded-xl hover:bg-[#f0f7ff] transition-all text-sm font-semibold flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            {t('products.import')}
          </button>
          <button
            onClick={handleAddProduct}
            className={`w-full sm:w-auto px-4 py-2.5 rounded-xl transition-all text-sm font-semibold text-center ${
              productLimit.allowed
                ? 'bg-[#1e3a5f] text-white hover:bg-[#2d6cb5] shadow-sm'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {t('products.add')}
          </button>
        </div>
      </div>

      {/* Hidden products warning - products over plan limit are hidden from catalog */}
      {hiddenProducts > 0 && !Capacitor.isNativePlatform() && (
        <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-xl p-4 border border-red-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-red-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-900">
                {hiddenProducts === 1
                  ? '1 producto oculto en tu catálogo'
                  : `${hiddenProducts} productos ocultos en tu catálogo`}
              </p>
              <p className="text-xs text-red-700 mt-0.5">
                Tu plan {PLAN_FEATURES[plan].name} permite {maxProducts} productos. Los demás no se muestran a tus clientes.
              </p>
            </div>
            <Link
              to={localePath('/dashboard/plan')}
              className="px-4 py-2 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl hover:from-red-600 hover:to-rose-600 transition-all text-xs font-semibold shadow-lg shadow-red-500/20 flex-shrink-0"
            >
              Actualizar plan
            </Link>
          </div>
        </div>
      )}

      {/* Near-limit warning banner */}
      {hiddenProducts === 0 && plan === 'free' && !Capacitor.isNativePlatform() && remainingProducts !== 'unlimited' && remainingProducts > 0 && remainingProducts <= 3 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-400/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900">
                {t('products.nearLimit.title', { remaining: remainingProducts })}
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                {t('products.nearLimit.description')}
              </p>
            </div>
            <Link
              to={localePath('/dashboard/plan')}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all text-xs font-semibold shadow-lg shadow-amber-500/20 flex-shrink-0"
            >
              {t('products.nearLimit.upgrade')}
            </Link>
          </div>
        </div>
      )}

      {/* Categories tabs */}
      <div className="bg-white rounded-xl border border-gray-200/60 p-4 shadow-sm">
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

        {/* Mobile: vertical list for clean drag & drop */}
        <div className="flex flex-col gap-1.5 sm:hidden">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
              selectedCategory === null
                ? 'bg-[#1e3a5f] text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t('products.categories.all')} ({getProductCount(null)})
          </button>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCategoryDragEnd}>
            <SortableContext items={sortedCategories.map(c => c.id)} strategy={verticalListSortingStrategy}>
              {sortedCategories.map(category => (
                <SortableCategoryTab key={category.id} category={category}>
                  {({ attributes, listeners }) => (
                    <div className={`relative flex items-center gap-2 rounded-xl transition-all ${
                      selectedCategory === category.id
                        ? 'bg-[#1e3a5f] shadow-sm'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}>
                      <button
                        {...attributes}
                        {...listeners}
                        className={`pl-3 py-2.5 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none ${
                          selectedCategory === category.id ? 'text-white/50' : 'text-gray-300'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <circle cx="9" cy="6" r="1.5" />
                          <circle cx="15" cy="6" r="1.5" />
                          <circle cx="9" cy="12" r="1.5" />
                          <circle cx="15" cy="12" r="1.5" />
                          <circle cx="9" cy="18" r="1.5" />
                          <circle cx="15" cy="18" r="1.5" />
                        </svg>
                      </button>

                      <button
                        onClick={() => setSelectedCategory(category.id)}
                        className={`flex-1 py-2.5 text-sm font-medium text-left ${
                          selectedCategory === category.id ? 'text-white' : 'text-gray-700'
                        }`}
                      >
                        {category.name} ({getProductCount(category.id)})
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenCategoryMenu(openCategoryMenu === category.id ? null : category.id)
                        }}
                        className={`pr-3 py-2.5 ${
                          selectedCategory === category.id ? 'text-white/60' : 'text-gray-400'
                        }`}
                      >
                        ⋮
                      </button>

                      {openCategoryMenu === category.id && (
                        <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200/60 z-10 min-w-[120px]">
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenCategoryMenu(null); openEditCategory(category) }}
                            className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 rounded-t-lg"
                          >
                            {t('products.categories.edit')}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenCategoryMenu(null); handleDeleteCategory(category) }}
                            className="block w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50 rounded-b-lg"
                          >
                            {t('products.categories.delete')}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </SortableCategoryTab>
              ))}
            </SortableContext>
          </DndContext>

          {products.some(p => !p.categoryId) && (
            <button
              onClick={() => setSelectedCategory('uncategorized')}
              className={`w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                selectedCategory === 'uncategorized'
                  ? 'bg-[#1e3a5f] text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('products.categories.uncategorized')} ({getProductCount('uncategorized')})
            </button>
          )}
        </div>

        {/* Desktop: horizontal tabs */}
        <div className="hidden sm:flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              selectedCategory === null
                ? 'bg-[#1e3a5f] text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t('products.categories.all')} ({getProductCount(null)})
          </button>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCategoryDragEnd}>
            <SortableContext items={sortedCategories.map(c => c.id)} strategy={horizontalListSortingStrategy}>
              {sortedCategories.map(category => (
                <SortableCategoryTab key={category.id} category={category}>
                  {({ attributes, listeners }) => (
                    <div className="relative group flex items-center gap-1">
                      <button
                        {...attributes}
                        {...listeners}
                        className="w-5 h-5 flex items-center justify-center text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none rounded transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <circle cx="9" cy="6" r="1.5" />
                          <circle cx="15" cy="6" r="1.5" />
                          <circle cx="9" cy="12" r="1.5" />
                          <circle cx="15" cy="12" r="1.5" />
                          <circle cx="9" cy="18" r="1.5" />
                          <circle cx="15" cy="18" r="1.5" />
                        </svg>
                      </button>

                      <button
                        onClick={() => setSelectedCategory(category.id)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          selectedCategory === category.id
                            ? 'bg-[#1e3a5f] text-white shadow-sm'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {category.name} ({getProductCount(category.id)})
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenCategoryMenu(openCategoryMenu === category.id ? null : category.id)
                        }}
                        className="w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all text-xs"
                      >
                        ⋮
                      </button>

                      {openCategoryMenu === category.id && (
                        <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200/60 z-10 min-w-[120px]">
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenCategoryMenu(null); openEditCategory(category) }}
                            className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 rounded-t-lg"
                          >
                            {t('products.categories.edit')}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenCategoryMenu(null); handleDeleteCategory(category) }}
                            className="block w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50 rounded-b-lg"
                          >
                            {t('products.categories.delete')}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </SortableCategoryTab>
              ))}
            </SortableContext>
          </DndContext>

          {products.some(p => !p.categoryId) && (
            <button
              onClick={() => setSelectedCategory('uncategorized')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                selectedCategory === 'uncategorized'
                  ? 'bg-[#1e3a5f] text-white shadow-sm'
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
        <div className="bg-white rounded-xl border border-gray-200/60 p-12 text-center shadow-sm">
          <div className="w-20 h-20 bg-gray-50 border border-gray-200/60 rounded-xl flex items-center justify-center mx-auto mb-4">
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
                ? 'bg-[#1e3a5f] text-white hover:bg-[#2d6cb5] shadow-sm'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {t('products.addProduct')}
          </button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={filteredProducts.map(p => p.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.map((product) => (
                <SortableProductCard key={product.id} product={product}>
                  {({ attributes, listeners }) => (
                    <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden hover:shadow-lg hover:shadow-[#1e3a5f]/10 transition-all group">
                      {/* Drag handle */}
                      <div className="flex items-center justify-between px-3 pt-2">
                        <button
                          {...attributes}
                          {...listeners}
                          className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none rounded-lg hover:bg-gray-100 transition-colors"
                          title={t('products.reorder') || 'Reordenar'}
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="9" cy="6" r="1.5" />
                            <circle cx="15" cy="6" r="1.5" />
                            <circle cx="9" cy="12" r="1.5" />
                            <circle cx="15" cy="12" r="1.5" />
                            <circle cx="9" cy="18" r="1.5" />
                            <circle cx="15" cy="18" r="1.5" />
                          </svg>
                        </button>
                        {isReordering && (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-[#2d6cb5]"></div>
                        )}
                      </div>

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
                  )}
                </SortableProductCard>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-[#1e3a5f] mb-4">
              {editingCategory ? t('products.categories.editTitle') : t('products.categories.newTitle')}
            </h3>
            <form onSubmit={handleSaveCategory}>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder={t('products.categories.namePlaceholder')}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all mb-4"
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
                  className="flex-1 px-4 py-3 bg-[#1e3a5f] text-white rounded-xl hover:bg-[#2d6cb5] transition-all font-medium disabled:opacity-50"
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
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl flex items-center justify-center mx-auto mb-4">
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
              {!Capacitor.isNativePlatform() && (
                <Link
                  to={localePath('/dashboard/plan')}
                  className="block w-full px-4 py-3 bg-[#1e3a5f] text-white text-center rounded-xl hover:bg-[#2d6cb5] transition-all font-semibold shadow-sm"
                >
                  {t('products.limit.upgrade', { price: PLAN_FEATURES.pro.price })}
                </Link>
              )}
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
