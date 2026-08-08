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
import StockEditModal from '../../components/dashboard/StockEditModal'
import { optimizeImage } from '../../utils/cloudinary'
import { uploadImage as uploadToStorage } from '../../utils/uploadImage'
import type { Product, Category } from '../../types'

// Constraints for the category image upload. Mirrors the rules we use for
// product / logo / hero uploads so merchants get a consistent message.
const CATEGORY_IMAGE_MAX_BYTES = 2 * 1024 * 1024
const CATEGORY_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

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


/**
 * Agarre de arrastre dibujado con CSS: dos columnas de tres puntos. Antes era
 * un <svg> con seis <circle>, repetido en cada producto y cada categoria.
 */
function GripDots({ tone = '#C3CFDB' }: { tone?: string }) {
  return (
    <span
      className="block shrink-0"
      style={{
        width: 10,
        height: 15,
        backgroundImage: `radial-gradient(${tone} 1.1px, transparent 1.3px)`,
        backgroundSize: '5px 5px',
      }}
    />
  )
}

/* Menus contextuales (categoria y producto): mismo aspecto en los tres sitios. */
const MENU_CLASS =
  'absolute right-0 top-full mt-1 bg-white rounded-xl border border-[#E6EBF1] z-20 min-w-[140px] overflow-hidden'
const MENU_SHADOW = { boxShadow: '0 12px 32px -16px rgba(30,58,95,.45)' }
const MENU_ITEM =
  'block w-full px-3.5 py-2 text-[0.78rem] font-medium text-left text-[#425466] hover:bg-[#F6F9FC] transition-colors'
const MENU_ITEM_DANGER =
  'block w-full px-3.5 py-2 text-[0.78rem] font-medium text-left text-[#DC2626] hover:bg-[#FEF2F2] transition-colors'

export default function Products() {
  const { t } = useTranslation('dashboard')
  const { localePath } = useLanguage()
  const { store, firebaseUser } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  // Category management
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryImage, setNewCategoryImage] = useState<string | undefined>(undefined)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [openCategoryMenu, setOpenCategoryMenu] = useState<string | null>(null)
  const [savingCategory, setSavingCategory] = useState(false)
  const [uploadingCategoryImage, setUploadingCategoryImage] = useState(false)
  const categoryImageInputRef = useRef<HTMLInputElement>(null)

  // Limit warning modal
  const [showLimitModal, setShowLimitModal] = useState(false)
  const [limitMessage, setLimitMessage] = useState('')

  // Import modals
  const [showImportModal, setShowImportModal] = useState(false)

  // Quick stock edit modal — opened from the per-product "Stock" button so
  // merchants can change variant quantities without going to Finance →
  // Purchases or Finance → Inventory.
  const [stockEditingProduct, setStockEditingProduct] = useState<Product | null>(null)

  // Per-product actions menu (kebab ⋮). Merchants couldn't find the delete
  // action — one reported "hay que tocar una esquina para poder borrar" after
  // confusing the drag handle with a menu — so all actions now live behind an
  // explicit three-dots menu.
  const [openProductMenu, setOpenProductMenu] = useState<string | null>(null)

  // Close category menu when clicking outside
  useEffect(() => {
    if (!openCategoryMenu) return
    const handleClick = () => setOpenCategoryMenu(null)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [openCategoryMenu])

  // Close product menu when clicking outside
  useEffect(() => {
    if (!openProductMenu) return
    const handleClick = () => setOpenProductMenu(null)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [openProductMenu])

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
    setNewCategoryImage(undefined)
    setShowCategoryModal(true)
  }

  const handleCategoryImageUpload = async (file: File) => {
    if (!CATEGORY_IMAGE_TYPES.includes(file.type)) {
      showToast(t('products.categories.imageBadType', { defaultValue: 'Formato no soportado. Usa JPG, PNG o WebP.' }), 'error')
      return
    }
    if (file.size > CATEGORY_IMAGE_MAX_BYTES) {
      showToast(t('products.categories.imageTooLarge', { defaultValue: 'La imagen debe pesar menos de 2 MB' }), 'error')
      return
    }

    setUploadingCategoryImage(true)
    try {
      // Stage the URL — it only persists to Firestore when the user clicks Save.
      const url = await uploadToStorage(file, { folder: 'shopifree/categories' })
      setNewCategoryImage(url)
    } catch (error) {
      console.error('Error uploading category image:', error)
      showToast(t('products.categories.imageError', { defaultValue: 'Error al subir imagen' }), 'error')
    } finally {
      setUploadingCategoryImage(false)
    }
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

    // Se renumera SIEMPRE la lista completa, 0..n-1.
    //
    // La version anterior, con una categoria seleccionada, repartia entre los
    // productos movidos "los slots que ya ocupaban": slots = sus `order`
    // actuales, ordenados. Eso falla en cuanto hay empates, y los empates son
    // la norma: ProductForm nunca asignaba `order` al crear, asi que
    // productService.create le ponia 0 a todo. Con slots = [0,0,0...] se
    // reescribia 0 en todos y en Firestore no cambiaba nada — pero el estado
    // local si se reordenaba, asi que en el panel parecia haber funcionado y en
    // la tienda no pasaba nada. Ese era el reporte.
    //
    // Renumerando todo, ademas, cada arrastre normaliza de una vez los empates
    // heredados de la tienda.
    const fullSorted = [...products].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    let nextFull: typeof products
    if (selectedCategory) {
      // Los productos del filtro conservan los HUECOS que ocupaban en la lista
      // global (por posicion, no por valor de `order`), y adentro van en el
      // nuevo orden. Los de otras categorias no se mueven de lugar.
      const slots = sourceList
        .map(p => fullSorted.findIndex(q => q.id === p.id))
        .filter(i => i !== -1)
        .sort((a, b) => a - b)
      nextFull = [...fullSorted]
      slots.forEach((slot, i) => { nextFull[slot] = reordered[i] })
    } else {
      nextFull = reordered
    }

    const updatedAll = nextFull.map((p, i) => ({ ...p, order: i }))
    setProducts(updatedAll)

    // Solo se escriben los que realmente cambiaron de posicion.
    const changed = updatedAll.filter(p => {
      const before = products.find(q => q.id === p.id)
      return before?.order !== p.order
    })
    if (changed.length === 0) return

    setIsReordering(true)
    try {
      await Promise.all(
        changed.map(p => productService.update(store.id, p.id, { order: p.order }))
      )
    } catch (error) {
      console.error('Error reordering products:', error)
      showToast(t('products.reorderError'), 'error')
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
      showToast(t('products.categories.reorderError'), 'error')
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
      const imageUrl = await uploadToStorage(file, { folder: 'shopifree/products' })

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
        // `image: null` clears the field in Firestore when the user removed
        // the existing image. The Category type declares `image?: string`,
        // hence the cast — `null` is a Firestore value, not a TS type.
        await categoryService.update(store.id, editingCategory.id, {
          name: newCategoryName.trim(),
          slug,
          image: (newCategoryImage ?? null) as unknown as string | undefined
        })
        setCategories(categories.map(c =>
          c.id === editingCategory.id
            ? { ...c, name: newCategoryName.trim(), slug, image: newCategoryImage }
            : c
        ))
        showToast(t('products.categories.updated'), 'success')
      } else {
        const categoryId = await categoryService.create(store.id, {
          name: newCategoryName.trim(),
          slug,
          order: categories.length,
          image: newCategoryImage
        })
        setCategories([...categories, {
          id: categoryId,
          storeId: store.id,
          name: newCategoryName.trim(),
          slug,
          image: newCategoryImage,
          order: categories.length,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }])
        showToast(t('products.categories.created'), 'success')
      }

      setShowCategoryModal(false)
      setNewCategoryName('')
      setNewCategoryImage(undefined)
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
    setNewCategoryImage(category.image)
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

  const search = searchQuery.trim().toLowerCase()
  const filteredProducts = (selectedCategory
    ? selectedCategory === 'uncategorized'
      ? products.filter(p => !p.categoryId)
      : products.filter(p => p.categoryId === selectedCategory)
    : products
  )
    .filter(p => !search || p.name.toLowerCase().includes(search))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

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

  const currency = getCurrencySymbol(store?.currency || 'USD')

  /** Pestaña de categoría — mismo aspecto en la lista móvil y en las de escritorio. */
  const tabClass = (active: boolean) =>
    `rounded-xl border text-[0.8rem] transition-colors ${
      active
        ? 'bg-[#1e3a5f] border-[#1e3a5f] text-white font-semibold'
        : 'bg-white border-[#E6EBF1] text-[#425466] font-medium hover:bg-[#F6F9FC]'
    }`

  return (
    <div className="space-y-4 sm:space-y-5 text-[#1e3a5f]">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight">{t('products.title')}</h1>
          <p className="text-[0.82rem] mt-0.5 font-normal text-[#8898AA]">
            {products.length === 1
              ? t('products.subtitle', { count: products.length })
              : t('products.subtitle_plural', { count: products.length })}
            {remainingProducts !== 'unlimited' && (
              <span className={remainingProducts <= 3 ? 'text-[#C2410C] font-medium' : ''}>
                {' · '}
                {t('products.remaining', { count: remainingProducts })}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Link
            to={localePath('/dashboard/dropshipping')}
            className="px-3.5 py-2.5 rounded-xl text-[0.8rem] font-semibold text-center transition-colors hover:bg-[#F0FDF4]"
            style={{ background: '#fff', border: '1px solid #BBF7D0', color: '#15803D' }}
          >
            Dropshipping
          </Link>
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3.5 py-2.5 rounded-xl text-[0.8rem] font-semibold transition-colors hover:bg-[#F0F9FF]"
            style={{ background: '#fff', border: '1px solid #BAE6FD', color: '#0284C7' }}
          >
            {t('products.import')}
          </button>
          <button
            onClick={handleAddProduct}
            className={`px-4 py-2.5 rounded-xl text-[0.8rem] font-semibold transition-opacity ${
              productLimit.allowed ? 'text-white hover:opacity-90' : 'cursor-not-allowed'
            }`}
            style={
              productLimit.allowed
                ? { background: '#1e3a5f', boxShadow: '0 8px 20px -12px rgba(30,58,95,.7)' }
                : { background: '#F1F5F9', color: '#A9B6C6' }
            }
          >
            {t('products.add')}
          </button>
        </div>
      </div>

      {/* Productos ocultos por superar el límite del plan */}
      {hiddenProducts > 0 && !Capacitor.isNativePlatform() && (
        <div className="rounded-[14px] bg-white p-4 sm:px-5" style={{ border: '1px solid #FECACA' }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              {/* La clave plural se elige a mano: i18next v25 usa el formato
                  JSON v4 (_one/_other), así que el sufijo _plural que usa el
                  resto del archivo no lo resuelve `count` por sí solo. */}
              <p className="text-[0.86rem] font-semibold" style={{ color: '#B91C1C' }}>
                {hiddenProducts === 1
                  ? t('products.hiddenWarning.title', { count: hiddenProducts })
                  : t('products.hiddenWarning.title_plural', { count: hiddenProducts })}
              </p>
              <p className="text-[0.78rem] mt-0.5 font-normal text-[#8898AA]">
                {t('products.hiddenWarning.description', { plan: PLAN_FEATURES[plan].name, max: maxProducts })}
              </p>
            </div>
            <Link
              to={localePath('/dashboard/plan')}
              className="px-3.5 py-2 rounded-xl text-white text-[0.78rem] font-semibold text-center shrink-0 transition-opacity hover:opacity-90"
              style={{ background: '#DC2626' }}
            >
              {t('products.hiddenWarning.upgrade')}
            </Link>
          </div>
        </div>
      )}

      {/* Aviso de cercanía al límite */}
      {hiddenProducts === 0 &&
        plan === 'free' &&
        !Capacitor.isNativePlatform() &&
        remainingProducts !== 'unlimited' &&
        remainingProducts > 0 &&
        remainingProducts <= 3 && (
          <div className="rounded-[14px] bg-white p-4 sm:px-5" style={{ border: '1px solid #FDE68A' }}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[0.86rem] font-semibold" style={{ color: '#92400E' }}>
                  {t('products.nearLimit.title', { remaining: remainingProducts })}
                </p>
                <p className="text-[0.78rem] mt-0.5 font-normal text-[#8898AA]">{t('products.nearLimit.description')}</p>
              </div>
              <Link
                to={localePath('/dashboard/plan')}
                className="px-3.5 py-2 rounded-xl text-white text-[0.78rem] font-semibold text-center shrink-0 transition-opacity hover:opacity-90"
                style={{ background: '#1e3a5f' }}
              >
                {t('products.nearLimit.upgrade')}
              </Link>
            </div>
          </div>
        )}

      {/* Categorías */}
      <div className="bg-white rounded-[14px] border border-[#E6EBF1] p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-[0.86rem] font-semibold">{t('products.categories.title')}</h3>
            {remainingCategories !== 'unlimited' && (
              <p
                className={`text-[0.74rem] mt-0.5 ${
                  remainingCategories <= 1 ? 'font-medium text-[#C2410C]' : 'font-normal text-[#8898AA]'
                }`}
              >
                {t('products.remaining', { count: remainingCategories })}
              </p>
            )}
          </div>
          <button
            onClick={handleAddCategory}
            className={`text-[0.78rem] font-semibold transition-colors ${
              categoryLimit.allowed ? 'text-[#0284C7] hover:text-[#1e3a5f]' : 'text-[#A9B6C6] cursor-not-allowed'
            }`}
          >
            {t('products.categories.new')}
          </button>
        </div>

        {/* Móvil: lista vertical, para que el arrastre sea claro */}
        <div className="flex flex-col gap-1.5 sm:hidden">
          <button onClick={() => setSelectedCategory(null)} className={`w-full px-4 py-2.5 text-left ${tabClass(selectedCategory === null)}`}>
            {t('products.categories.all')} ({getProductCount(null)})
          </button>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCategoryDragEnd}>
            <SortableContext items={sortedCategories.map(c => c.id)} strategy={verticalListSortingStrategy}>
              {sortedCategories.map(category => {
                const active = selectedCategory === category.id
                return (
                  <SortableCategoryTab key={category.id} category={category}>
                    {({ attributes, listeners }) => (
                      <div className={`relative flex items-center ${tabClass(active)}`}>
                        <button
                          {...attributes}
                          {...listeners}
                          className="pl-3 pr-1 py-3 flex items-center cursor-grab active:cursor-grabbing touch-none"
                          aria-label={t('products.reorder', { defaultValue: 'Reordenar' })}
                        >
                          <GripDots tone={active ? 'rgba(255,255,255,.55)' : '#C3CFDB'} />
                        </button>

                        <button onClick={() => setSelectedCategory(category.id)} className="flex-1 py-2.5 text-left">
                          {category.name} ({getProductCount(category.id)})
                        </button>

                        <button
                          onClick={e => {
                            e.stopPropagation()
                            setOpenCategoryMenu(openCategoryMenu === category.id ? null : category.id)
                          }}
                          className={`px-3 py-2.5 leading-none ${active ? 'text-white/70' : 'text-[#A9B6C6]'}`}
                          aria-label={t('products.actions', { defaultValue: 'Acciones' })}
                        >
                          ⋮
                        </button>

                        {openCategoryMenu === category.id && (
                          <div className={MENU_CLASS} style={MENU_SHADOW}>
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                setOpenCategoryMenu(null)
                                openEditCategory(category)
                              }}
                              className={MENU_ITEM}
                            >
                              {t('products.categories.edit')}
                            </button>
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                setOpenCategoryMenu(null)
                                handleDeleteCategory(category)
                              }}
                              className={MENU_ITEM_DANGER}
                            >
                              {t('products.categories.delete')}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </SortableCategoryTab>
                )
              })}
            </SortableContext>
          </DndContext>

          {products.some(p => !p.categoryId) && (
            <button
              onClick={() => setSelectedCategory('uncategorized')}
              className={`w-full px-4 py-2.5 text-left ${tabClass(selectedCategory === 'uncategorized')}`}
            >
              {t('products.categories.uncategorized')} ({getProductCount('uncategorized')})
            </button>
          )}
        </div>

        {/* Escritorio: pestañas horizontales */}
        <div className="hidden sm:flex flex-wrap gap-2">
          <button onClick={() => setSelectedCategory(null)} className={`px-3.5 py-2 ${tabClass(selectedCategory === null)}`}>
            {t('products.categories.all')} ({getProductCount(null)})
          </button>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCategoryDragEnd}>
            <SortableContext items={sortedCategories.map(c => c.id)} strategy={horizontalListSortingStrategy}>
              {sortedCategories.map(category => {
                const active = selectedCategory === category.id
                return (
                  <SortableCategoryTab key={category.id} category={category}>
                    {({ attributes, listeners }) => (
                      <div className={`relative flex items-center ${tabClass(active)}`}>
                        <button
                          {...attributes}
                          {...listeners}
                          className="pl-2.5 pr-1 py-2.5 flex items-center cursor-grab active:cursor-grabbing touch-none"
                          aria-label={t('products.reorder', { defaultValue: 'Reordenar' })}
                        >
                          <GripDots tone={active ? 'rgba(255,255,255,.55)' : '#C3CFDB'} />
                        </button>

                        <button onClick={() => setSelectedCategory(category.id)} className="py-2">
                          {category.name} ({getProductCount(category.id)})
                        </button>

                        <button
                          onClick={e => {
                            e.stopPropagation()
                            setOpenCategoryMenu(openCategoryMenu === category.id ? null : category.id)
                          }}
                          className={`px-2.5 py-2 leading-none ${active ? 'text-white/70' : 'text-[#A9B6C6]'}`}
                          aria-label={t('products.actions', { defaultValue: 'Acciones' })}
                        >
                          ⋮
                        </button>

                        {openCategoryMenu === category.id && (
                          <div className={MENU_CLASS} style={MENU_SHADOW}>
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                setOpenCategoryMenu(null)
                                openEditCategory(category)
                              }}
                              className={MENU_ITEM}
                            >
                              {t('products.categories.edit')}
                            </button>
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                setOpenCategoryMenu(null)
                                handleDeleteCategory(category)
                              }}
                              className={MENU_ITEM_DANGER}
                            >
                              {t('products.categories.delete')}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </SortableCategoryTab>
                )
              })}
            </SortableContext>
          </DndContext>

          {products.some(p => !p.categoryId) && (
            <button
              onClick={() => setSelectedCategory('uncategorized')}
              className={`px-3.5 py-2 ${tabClass(selectedCategory === 'uncategorized')}`}
            >
              {t('products.categories.uncategorized')} ({getProductCount('uncategorized')})
            </button>
          )}
        </div>
      </div>

      {/* Buscador. Sin lupa: el placeholder ya dice qué hace. */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={t('products.search', { defaultValue: 'Buscar producto por nombre...' })}
          className="w-full pl-4 pr-20 py-2.5 rounded-xl bg-white border border-[#E6EBF1] text-[0.82rem] font-medium text-[#1e3a5f] placeholder:text-[#A9B6C6] placeholder:font-normal transition-colors focus:outline-none focus:border-[#38bdf8] focus:ring-2 focus:ring-[#38bdf8]/15"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[0.74rem] font-semibold text-[#8898AA] hover:text-[#425466] transition-colors"
          >
            {t('common.clear', { defaultValue: 'Limpiar' })}
          </button>
        )}
      </div>

      {/* Productos */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-[14px] border border-[#E6EBF1] p-10 text-center">
          <h3 className="text-[0.92rem] font-semibold mb-1.5">
            {selectedCategory || search ? t('products.empty.titleFiltered') : t('products.empty.title')}
          </h3>
          <p className="text-[0.84rem] font-normal text-[#8898AA] mb-5">
            {selectedCategory || search ? t('products.empty.descriptionFiltered') : t('products.empty.description')}
          </p>
          <button
            onClick={handleAddProduct}
            className={`inline-flex px-5 py-2.5 rounded-xl text-[0.84rem] font-semibold transition-opacity ${
              productLimit.allowed ? 'text-white hover:opacity-90' : 'cursor-not-allowed'
            }`}
            style={
              productLimit.allowed
                ? { background: '#1e3a5f', boxShadow: '0 8px 20px -12px rgba(30,58,95,.7)' }
                : { background: '#F1F5F9', color: '#A9B6C6' }
            }
          >
            {t('products.addProduct')}
          </button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={filteredProducts.map(p => p.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {filteredProducts.map(product => (
                <SortableProductCard key={product.id} product={product}>
                  {({ attributes, listeners }) => (
                    <div
                      className="bg-white rounded-[14px] border border-[#E6EBF1] overflow-hidden transition-all group hover:-translate-y-0.5"
                      style={{ boxShadow: '0 8px 24px -20px rgba(30,58,95,.5)' }}
                    >
                      {/* Arrastre + menú */}
                      <div className="flex items-center justify-between px-2.5 pt-2">
                        <button
                          {...attributes}
                          {...listeners}
                          className="w-7 h-7 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none rounded-lg hover:bg-[#F6F9FC] transition-colors"
                          title={t('products.reorder', { defaultValue: 'Reordenar' })}
                        >
                          <GripDots />
                        </button>
                        <div className="relative flex items-center gap-1">
                          {isReordering && (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-[#0284C7]"></div>
                          )}
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              setOpenProductMenu(openProductMenu === product.id ? null : product.id)
                            }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-[#8898AA] hover:text-[#425466] hover:bg-[#F6F9FC] transition-colors leading-none"
                            aria-label={t('products.actions', { defaultValue: 'Acciones' })}
                          >
                            ⋮
                          </button>

                          {openProductMenu === product.id && (
                            <div className={MENU_CLASS} style={MENU_SHADOW}>
                              <Link
                                to={localePath(`/dashboard/products/${product.id}`)}
                                onClick={e => {
                                  e.stopPropagation()
                                  setOpenProductMenu(null)
                                }}
                                className={MENU_ITEM}
                              >
                                {t('products.edit')}
                              </Link>
                              {product.trackStock && (
                                <button
                                  onClick={e => {
                                    e.stopPropagation()
                                    setOpenProductMenu(null)
                                    setStockEditingProduct(product)
                                  }}
                                  className={MENU_ITEM}
                                >
                                  {t('products.stockEdit.button', { defaultValue: 'Stock' })}
                                </button>
                              )}
                              <button
                                onClick={e => {
                                  e.stopPropagation()
                                  setOpenProductMenu(null)
                                  handleDeleteProduct(product.id)
                                }}
                                className={MENU_ITEM_DANGER}
                              >
                                {t('products.delete')}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Imagen */}
                      <div className="aspect-square relative" style={{ background: '#F6F9FC' }}>
                        {product.image ? (
                          <Link to={localePath(`/dashboard/products/${product.id}`)}>
                            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                          </Link>
                        ) : uploadingProductId === product.id ? (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#0284C7]"></div>
                            <p className="text-[0.72rem] font-medium text-[#0284C7]">{t('products.uploading')}</p>
                          </div>
                        ) : (
                          <div
                            onClick={() => fileInputRefs.current[product.id]?.click()}
                            onDrop={e => handleDrop(product.id, e)}
                            onDragOver={handleDragOver}
                            className="w-full h-full flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors hover:bg-[#F0F9FF] border-2 border-dashed border-transparent hover:border-[#BAE6FD]"
                          >
                            <p className="text-[0.76rem] font-semibold text-[#0284C7]">{t('products.addPhoto')}</p>
                            <p className="text-[0.7rem] font-normal text-[#A9B6C6]">{t('products.clickOrDrag')}</p>
                            <input
                              ref={el => {
                                fileInputRefs.current[product.id] = el
                              }}
                              type="file"
                              accept="image/*"
                              onChange={e => handleFileChange(product.id, e)}
                              className="hidden"
                            />
                          </div>
                        )}
                        {!product.active && (
                          <div
                            className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[0.64rem] font-semibold"
                            style={{ background: 'rgba(30,58,95,.85)', color: '#fff' }}
                          >
                            {t('products.hidden')}
                          </div>
                        )}
                      </div>

                      {/* Datos */}
                      <Link to={localePath(`/dashboard/products/${product.id}`)} className="block p-3.5">
                        <h3 className="text-[0.84rem] font-medium truncate group-hover:text-[#0284C7] transition-colors">
                          {product.name}
                        </h3>
                        <p className="text-[0.8rem] font-semibold mt-0.5 text-[#0284C7]">
                          {currency}
                          {product.price.toFixed(2)}
                        </p>
                        {product.categoryId && (
                          <p className="text-[0.72rem] font-normal text-[#8898AA] mt-1 truncate">
                            {categories.find(c => c.id === product.categoryId)?.name}
                          </p>
                        )}
                      </Link>
                    </div>
                  )}
                </SortableProductCard>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Edición rápida de stock (variantes + almacenes) */}
      {stockEditingProduct && store && firebaseUser && (
        <StockEditModal
          storeId={store.id}
          userId={firebaseUser.uid}
          product={stockEditingProduct}
          onClose={() => setStockEditingProduct(null)}
          onSaved={updated => {
            // Actualiza la lista local para que el stock nuevo se vea sin
            // volver a pedir los productos a Firestore.
            setProducts(prev => prev.map(p => (p.id === updated.id ? updated : p)))
          }}
        />
      )}

      {/* Modal de categoría */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-2xl text-[#1e3a5f]">
            <h3 className="text-base font-semibold mb-4">
              {editingCategory ? t('products.categories.editTitle') : t('products.categories.newTitle')}
            </h3>
            <form onSubmit={handleSaveCategory}>
              {/* Imagen opcional. El recorte cuadrado lo aplica Cloudinary al
                  renderizar, así que sirve cualquier imagen. */}
              <div className="flex items-start gap-3 mb-4">
                <div
                  className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 group"
                  style={{ border: '1px solid #E6EBF1' }}
                >
                  {newCategoryImage ? (
                    <>
                      <img src={optimizeImage(newCategoryImage, 'thumbnail')} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => categoryImageInputRef.current?.click()}
                        className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/45 transition-colors"
                      >
                        {uploadingCategoryImage ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <span className="text-[0.72rem] font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                            {t('products.categories.changeImage', { defaultValue: 'Cambiar' })}
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation()
                          setNewCategoryImage(undefined)
                        }}
                        className="absolute top-0 right-0 w-5 h-5 rounded-bl-lg text-white text-[0.7rem] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: '#DC2626' }}
                        title={t('products.categories.removeImage', { defaultValue: 'Quitar imagen' })}
                      >
                        ×
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => categoryImageInputRef.current?.click()}
                      className="w-full h-full flex items-center justify-center text-[0.72rem] font-semibold transition-colors"
                      style={{ background: '#F6F9FC', color: '#0284C7' }}
                    >
                      {uploadingCategoryImage ? (
                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        t('products.categories.uploadImage', { defaultValue: 'Subir foto' })
                      )}
                    </button>
                  )}
                  <input
                    ref={categoryImageInputRef}
                    type="file"
                    accept={CATEGORY_IMAGE_TYPES.join(',')}
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) handleCategoryImageUpload(file)
                      e.target.value = ''
                    }}
                  />
                </div>
                <div className="flex-1">
                  <p className="text-[0.78rem] font-semibold">
                    {t('products.categories.imageLabel', { defaultValue: 'Imagen (opcional)' })}
                  </p>
                  <p className="text-[0.74rem] mt-0.5 font-normal text-[#8898AA] leading-relaxed">
                    {t('products.categories.imageHelp', {
                      defaultValue: 'Cuadrada idealmente. JPG, PNG o WebP, máx 2 MB.',
                    })}
                  </p>
                </div>
              </div>

              <input
                type="text"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                placeholder={t('products.categories.namePlaceholder')}
                className="w-full px-3.5 py-2.5 mb-4 rounded-xl bg-[#F6F9FC] border border-[#E6EBF1] text-[0.84rem] font-medium text-[#1e3a5f] placeholder:text-[#A9B6C6] placeholder:font-normal transition-colors focus:outline-none focus:bg-white focus:border-[#38bdf8] focus:ring-2 focus:ring-[#38bdf8]/15"
                autoFocus
              />
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryModal(false)
                    setNewCategoryName('')
                    setNewCategoryImage(undefined)
                    setEditingCategory(null)
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl text-[0.82rem] font-semibold transition-colors hover:bg-[#EEF3F8]"
                  style={{ background: '#F6F9FC', border: '1px solid #E6EBF1', color: '#425466' }}
                >
                  {t('products.categories.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={!newCategoryName.trim() || savingCategory || uploadingCategoryImage}
                  className="flex-1 px-4 py-2.5 rounded-xl text-white text-[0.82rem] font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
                  style={{ background: '#1e3a5f' }}
                >
                  {savingCategory ? t('products.categories.saving') : t('products.categories.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Importación */}
      {showImportModal && (
        <ProductImport
          onClose={() => setShowImportModal(false)}
          onSuccess={refreshProducts}
          categories={categories.map(c => ({ id: c.id, name: c.name }))}
        />
      )}

      {/* Límite del plan alcanzado */}
      {showLimitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-2xl text-[#1e3a5f]">
            <h3 className="text-base font-semibold mb-1.5">{t('products.limit.title')}</h3>
            <p className="text-[0.84rem] font-normal text-[#8898AA] mb-5">{limitMessage}</p>
            <div className="space-y-2.5">
              {!Capacitor.isNativePlatform() && (
                <Link
                  to={localePath('/dashboard/plan')}
                  className="block w-full px-4 py-2.5 rounded-xl text-white text-[0.84rem] font-semibold text-center transition-opacity hover:opacity-90"
                  style={{ background: '#1e3a5f', boxShadow: '0 8px 20px -12px rgba(30,58,95,.7)' }}
                >
                  {t('products.limit.upgrade', { price: PLAN_FEATURES.pro.price })}
                </Link>
              )}
              <button
                onClick={() => setShowLimitModal(false)}
                className="block w-full px-4 py-2.5 rounded-xl text-[0.84rem] font-semibold transition-colors hover:bg-[#EEF3F8]"
                style={{ background: '#F6F9FC', border: '1px solid #E6EBF1', color: '#425466' }}
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
