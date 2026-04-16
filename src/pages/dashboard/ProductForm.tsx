import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Capacitor } from '@capacitor/core'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import { productService, categoryService, db } from '../../lib/firebase'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import type { Warehouse } from '../../types'
import { useToast } from '../../components/ui/Toast'
import { canAddProduct, getMaxImagesPerProduct, canUploadVideo, getEffectivePlan } from '../../lib/stripe'
import { getBusinessTypeFeatures, normalizeBusinessType } from '../../hooks/useBusinessType'
import { getVideoThumbnail } from '../../utils/cloudinary'
import type { Category, ModifierGroup, ProductVariation } from '../../types'
import {
  ModifiersSection,
  PrepTimeSection,
  VariationsSection,
  DurationSection,
  CustomOrderSection,
  SpecsSection,
  WarrantySection,
  PetTypeSection,
} from '../../components/dashboard/product-form'

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export default function ProductForm() {
  const { t } = useTranslation('dashboard')
  const { localePath } = useLanguage()
  const { productId } = useParams<{ productId: string }>()
  const isEditing = productId && productId !== 'new'
  const { store } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const [categories, setCategories] = useState<Category[]>([])
  const [productCount, setProductCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  // === CAMPOS BÁSICOS ===
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [video, setVideo] = useState<string | null>(null)
  const [uploadingVideo, setUploadingVideo] = useState(false)
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
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('')
  const [brand, setBrand] = useState('')
  const [tags, setTags] = useState('')
  const [weight, setWeight] = useState('')
  const [length, setLength] = useState('')
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [featured, setFeatured] = useState(false)

  // === BUSINESS TYPE SPECIFIC FIELDS ===
  // Food
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([])
  const [prepTime, setPrepTime] = useState<{ min: number; max: number; unit: 'min' | 'hr' } | undefined>()

  // Fashion/Pets/General
  const [variations, setVariations] = useState<ProductVariation[]>([])
  const [combinations, setCombinations] = useState<import('../../types').VariantCombination[]>([])

  // Beauty
  const [duration, setDuration] = useState<{ value: number; unit: 'min' | 'hr' } | undefined>()

  // Craft
  const [customizable, setCustomizable] = useState(false)
  const [customizationInstructions, setCustomizationInstructions] = useState<string | undefined>()
  const [availableQuantity, setAvailableQuantity] = useState<number | undefined>()

  // Tech
  const [specs, setSpecs] = useState<Array<{ key: string; value: string }>>([])
  const [warranty, setWarranty] = useState<{ months: number; description?: string } | undefined>()
  const [model, setModel] = useState<string | undefined>()

  // Pets
  const [petType, setPetType] = useState<'dog' | 'cat' | 'bird' | 'fish' | 'small' | 'other' | undefined>()
  const [petAge, setPetAge] = useState<'puppy' | 'adult' | 'senior' | 'all' | undefined>()

  // Get business type features
  const businessType = normalizeBusinessType(store?.businessType)
  const features = getBusinessTypeFeatures(businessType)

  useEffect(() => {
    const fetchData = async () => {
      if (!store) return

      try {
        const [categoriesData, productsData, warehousesSnap] = await Promise.all([
          categoryService.getAll(store.id),
          productService.getAll(store.id),
          getDocs(query(collection(db, `stores/${store.id}/warehouses`), orderBy('createdAt'))),
        ])
        setCategories(categoriesData)
        setProductCount(productsData.length)
        const wList = warehousesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Warehouse))
        setWarehouses(wList)
        const defaultW = wList.find(w => w.isDefault)
        if (defaultW) setSelectedWarehouseId(defaultW.id)

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
            setVideo(productData.video || null)
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

            // Business type specific fields
            // Food
            setModifierGroups(productData.modifierGroups || [])
            setPrepTime(productData.prepTime)

            // Fashion/Pets/General
            setVariations(productData.variations || [])
            setCombinations(productData.combinations || [])

            // Beauty
            setDuration(productData.duration)

            // Craft
            setCustomizable(productData.customizable || false)
            setCustomizationInstructions(productData.customizationInstructions)
            setAvailableQuantity(productData.availableQuantity)

            // Tech
            setSpecs(productData.specs || [])
            setWarranty(productData.warranty)
            setModel(productData.model)

            // Pets
            setPetType(productData.petType)
            setPetAge(productData.petAge)
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

  const plan = store ? getEffectivePlan(store) : 'free'
  const maxImages = getMaxImagesPerProduct(plan)
  const videoAllowed = canUploadVideo(plan)

  const uploadFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    if (fileArray.length === 0) return

    // Check limit
    const remainingSlots = maxImages - images.length
    if (remainingSlots <= 0) {
      showToast(maxImages === 1
        ? t('productForm.photos.limitError', { count: maxImages })
        : t('productForm.photos.limitErrorPlural', { count: maxImages }), 'error')
      return
    }

    const filesToUpload = fileArray.slice(0, remainingSlots)
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

      if (filesToUpload.length < fileArray.length) {
        showToast(t('productForm.photos.partialUpload', { uploaded: filesToUpload.length, total: fileArray.length }), 'info')
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      showToast(t('productForm.photos.uploadError'), 'error')
    } finally {
      setUploading(false)
      // Clear file input
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    await uploadFiles(files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (!files || files.length === 0) return

    // Filter only image files
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'))
    if (imageFiles.length === 0) {
      showToast(t('productForm.photos.invalidFormat', 'Solo se permiten archivos de imagen'), 'error')
      return
    }

    await uploadFiles(imageFiles)
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

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('video/')) {
      showToast(t('productForm.video.invalidFormat'), 'error')
      return
    }

    if (file.size > 100 * 1024 * 1024) {
      showToast(t('productForm.video.tooLarge'), 'error')
      return
    }

    setUploadingVideo(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
      formData.append('folder', 'shopifree/products')

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`,
        { method: 'POST', body: formData }
      )

      if (!response.ok) throw new Error('Upload failed')
      const data = await response.json()
      setVideo(data.secure_url)
    } catch (error) {
      console.error('Error uploading video:', error)
      showToast(t('productForm.video.uploadError'), 'error')
    } finally {
      setUploadingVideo(false)
      if (videoInputRef.current) videoInputRef.current.value = ''
    }
  }

  const handleRemoveVideo = () => setVideo(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!store) return

    // Check product limit for new products
    if (!isEditing) {
      const effectivePlan = getEffectivePlan(store)
      const limitCheck = canAddProduct(effectivePlan, productCount)
      if (!limitCheck.allowed) {
        showToast(limitCheck.message || t('productForm.limitReached'), 'error')
        navigate(localePath('/dashboard/plan'))
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
      if (video) {
        productData.video = video
      } else if (isEditing) {
        productData.video = null
      }
      if (categoryId) productData.categoryId = categoryId
      if (comparePrice) productData.comparePrice = parseFloat(comparePrice)
      if (cost) productData.cost = parseFloat(cost)
      if (sku) productData.sku = sku
      if (barcode) productData.barcode = barcode
      if (stock) productData.stock = parseInt(stock)
      if (lowStockAlert) productData.lowStockAlert = parseInt(lowStockAlert)
      // Assign stock to selected warehouse when creating
      if (!isEditing && trackStock && selectedWarehouseId) {
        const totalStock = combinations.length > 0
          ? combinations.reduce((sum, c) => sum + c.stock, 0)
          : (stock ? parseInt(stock) : 0)
        if (totalStock > 0) {
          productData.warehouseStock = { [selectedWarehouseId]: totalStock }
        }
        // Assign each combination's stock to the selected warehouse
        if (combinations.length > 0) {
          productData.combinations = combinations.map(c => ({
            ...c,
            warehouseStock: c.stock > 0 ? { [selectedWarehouseId]: c.stock } : undefined,
          }))
        }
      }
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

      // === BUSINESS TYPE SPECIFIC FIELDS ===
      // Food
      if (features.showModifiers && modifierGroups.length > 0) {
        productData.hasModifiers = true
        productData.modifierGroups = modifierGroups
      }
      if (features.showPrepTime && prepTime) {
        productData.prepTime = prepTime
      }

      // Variants + Combinations
      if (features.showVariants && variations.length > 0) {
        productData.hasVariations = true
        productData.variations = variations
        if (combinations.length > 0) {
          productData.combinations = combinations
          // Stock total = suma de stock de combinaciones
          if (trackStock) {
            productData.stock = combinations.reduce((sum, c) => sum + c.stock, 0)
          }
        }
      }

      // Beauty
      if (features.showServiceDuration && duration) {
        productData.duration = duration
      }

      // Craft
      if (features.showCustomOrder) {
        productData.customizable = customizable
        if (customizable && customizationInstructions) {
          productData.customizationInstructions = customizationInstructions
        }
      }
      if (features.showLimitedStock && availableQuantity !== undefined) {
        productData.availableQuantity = availableQuantity
      }

      // Tech
      if (features.showSpecs && specs.length > 0) {
        productData.specs = specs.filter(s => s.key && s.value)
      }
      if (features.showWarranty && warranty) {
        productData.warranty = warranty
      }
      if (features.showModel && model) {
        productData.model = model
      }

      // Pets
      if (features.showPetType && petType) {
        productData.petType = petType
      }
      if (features.showPetAge && petAge) {
        productData.petAge = petAge
      }

      if (isEditing && productId) {
        await productService.update(store.id, productId, productData as Parameters<typeof productService.update>[2])
        showToast(t('productForm.updated'), 'success')
      } else {
        await productService.create(store.id, productData as Parameters<typeof productService.create>[1])
        showToast(t('productForm.created'), 'success')
      }

      navigate(localePath('/dashboard/products'))
    } catch (error) {
      console.error('Error saving product:', error)
      showToast(t('productForm.saveError'), 'error')
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
          <h1 className="text-xl font-semibold text-gray-900">
            {isEditing ? t('productForm.editTitle') : t('productForm.newTitle')}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEditing ? t('productForm.editDescription') : t('productForm.newDescription')}
          </p>
        </div>
        {!Capacitor.isNativePlatform() && (
          <div className="flex gap-3">
            <button
              onClick={() => navigate(localePath('/dashboard/products'))}
              className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium text-sm"
            >
              {t('productForm.cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !name || !price}
              className="px-6 py-2.5 bg-[#1e3a5f] text-white rounded-xl hover:bg-[#2d6cb5] transition-all font-semibold disabled:opacity-50 shadow-sm"
            >
              {saving ? t('productForm.saving') : isEditing ? t('productForm.save') : t('productForm.create')}
            </button>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Basic Info */}
          <div className="space-y-6">
            {/* Image upload - Multiple images */}
            <div className="bg-white rounded-xl border border-gray-200/60 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-[#1e3a5f]">
                  {t('productForm.photos.title')}
                </label>
                <span className="text-xs text-gray-500">
                  {maxImages === 1
                    ? t('productForm.photos.countSingular', { count: images.length, max: maxImages })
                    : t('productForm.photos.count', { count: images.length, max: maxImages })}
                </span>
              </div>

              {/* Image Gallery */}
              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {images.map((img, index) => (
                    <div key={img} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200">
                      <img src={img} alt={`${t('productForm.photos.title')} ${index + 1}`} className="w-full h-full object-cover" />
                      {index === 0 && (
                        <span className="absolute top-1 left-1 bg-[#1e3a5f] text-white text-[10px] px-1.5 py-0.5 rounded">
                          {t('productForm.photos.main')}
                        </span>
                      )}
                      {/* Overlay controls - visible on mobile, hover on desktop */}
                      <div className="absolute inset-0 bg-black/50 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                        {index > 0 && (
                          <button
                            type="button"
                            onClick={() => handleMoveImage(index, 'up')}
                            className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-100"
                            title={t('productForm.photos.moveLeft')}
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
                            title={t('productForm.photos.moveRight')}
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
                          title={t('productForm.photos.delete')}
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
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl overflow-hidden cursor-pointer transition-all ${
                    isDragging
                      ? 'border-[#38bdf8] bg-[#e0f2fe]'
                      : 'border-[#38bdf8]/30 hover:border-[#38bdf8] bg-gradient-to-br from-[#f0f7ff] to-white'
                  } ${images.length === 0 ? 'aspect-[4/3]' : 'py-6'}`}
                >
                  <div className="flex flex-col items-center justify-center h-full p-4 text-gray-500">
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2d6cb5] mb-2"></div>
                        <p className="text-[#2d6cb5] font-medium">{t('productForm.photos.uploading')}</p>
                      </>
                    ) : (
                      <>
                        <div className={`w-10 h-10 bg-[#1e3a5f] rounded-xl flex items-center justify-center mb-2 shadow-sm transition-transform ${isDragging ? 'scale-110' : ''}`}>
                          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                        <p className="text-[#1e3a5f] font-medium text-sm">
                          {isDragging
                            ? t('productForm.photos.dropHere', 'Suelta la imagen aqui')
                            : images.length === 0
                              ? t('productForm.photos.clickToUpload')
                              : t('productForm.photos.addMore')}
                        </p>
                        {!isDragging && (
                          <p className="text-xs text-gray-400 mt-1">
                            {maxImages > 1 ? t('productForm.photos.selectMultiple') : t('productForm.photos.dragAndDrop', 'o arrastra y suelta')}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ) : (
                maxImages === 1 && !Capacitor.isNativePlatform() ? (
                  <div className="bg-gradient-to-r from-[#f0f7ff] to-white rounded-xl border border-[#38bdf8]/20 p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-[#1e3a5f] rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-[#1e3a5f]">{t('productForm.photos.wantMore')}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{t('productForm.photos.proImages')}</p>
                        <a
                          href={localePath('/dashboard/plan')}
                          className="inline-flex items-center gap-1 mt-2 px-3 py-1.5 bg-[#1e3a5f] text-white text-xs font-semibold rounded-lg hover:bg-[#2d6cb5] transition-all shadow-md"
                        >
                          {t('productForm.photos.upgradeForMore')}
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-sm text-gray-600">{t('productForm.photos.limitReached')}</p>
                  </div>
                )
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

            {/* Video Upload */}
            <div className="bg-white rounded-xl border border-gray-200/60 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-[#1e3a5f]">
                  {t('productForm.video.title')}
                </label>
                <span className="text-xs text-gray-500">
                  {t('productForm.video.optional')}
                </span>
              </div>

              {videoAllowed ? (
                <>
                  {video ? (
                    <div className="relative group">
                      <div className="aspect-video rounded-xl overflow-hidden border border-gray-200 bg-black">
                        <img
                          src={getVideoThumbnail(video)}
                          alt={t('productForm.video.preview')}
                          className="w-full h-full object-cover"
                        />
                        {/* Play icon overlay */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-14 h-14 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={handleRemoveVideo}
                        className="absolute top-2 right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => !uploadingVideo && videoInputRef.current?.click()}
                      className="border-2 border-dashed border-[#38bdf8]/30 hover:border-[#38bdf8] rounded-xl cursor-pointer transition-all bg-gradient-to-br from-[#f0f7ff] to-white py-8"
                    >
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        {uploadingVideo ? (
                          <>
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2d6cb5] mb-2"></div>
                            <p className="text-[#2d6cb5] font-medium">{t('productForm.video.uploading')}</p>
                          </>
                        ) : (
                          <>
                            <div className="w-10 h-10 bg-[#1e3a5f] rounded-xl flex items-center justify-center mb-2 shadow-sm">
                              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <p className="text-[#1e3a5f] font-medium text-sm">{t('productForm.video.clickToUpload')}</p>
                            <p className="text-xs text-gray-400 mt-1">{t('productForm.video.formats')}</p>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {t('productForm.video.reelsOnly')}
                  </p>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    onChange={handleVideoUpload}
                    className="hidden"
                  />
                </>
              ) : (
                <div className="bg-gradient-to-r from-[#f0f7ff] to-white rounded-xl border border-[#38bdf8]/20 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-[#1e3a5f] rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#1e3a5f]">{t('productForm.video.proTitle')}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{t('productForm.video.proDescription')}</p>
                      <a
                        href={localePath('/dashboard/plan')}
                        className="inline-flex items-center gap-1 mt-2 px-3 py-1.5 bg-[#1e3a5f] text-white text-xs font-semibold rounded-lg hover:bg-[#2d6cb5] transition-all shadow-md"
                      >
                        {t('productForm.video.upgradeToPro')}
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Basic Fields */}
            <div className="bg-white rounded-xl border border-gray-200/60 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">{t('productForm.basic.title')}</h2>
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-[#1e3a5f] mb-1">
                    {t('productForm.basic.name')} *
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('productForm.basic.namePlaceholder')}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all"
                  />
                </div>

                {/* Price & Compare Price */}
                <div className={features.showComparePrice ? "grid grid-cols-2 gap-4" : ""}>
                  <div>
                    <label htmlFor="price" className="block text-sm font-medium text-[#1e3a5f] mb-1">
                      {t('productForm.basic.price')} *
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
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all"
                    />
                  </div>
                  {features.showComparePrice && (
                    <div>
                      <label htmlFor="comparePrice" className="block text-sm font-medium text-[#1e3a5f] mb-1">
                        {t('productForm.basic.comparePrice')}
                      </label>
                      <input
                        id="comparePrice"
                        type="number"
                        min="0"
                        step="0.01"
                        value={comparePrice}
                        onChange={(e) => setComparePrice(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all"
                      />
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-[#1e3a5f] mb-1">
                    {t('productForm.basic.description')}
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder={t('productForm.basic.descriptionPlaceholder')}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Organization - Category & Tags (always show if categories exist or tags enabled) */}
            {(categories.length > 0 || features.showTags) && (
              <div className="bg-white rounded-xl border border-gray-200/60 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">{t('productForm.organization.title')}</h2>
                <div className="space-y-4">
                  {/* Category */}
                  {categories.length > 0 && (
                    <div>
                      <label htmlFor="category" className="block text-sm font-medium text-[#1e3a5f] mb-1">
                        {t('productForm.basic.category')}
                      </label>
                      <select
                        id="category"
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all"
                      >
                        <option value="">{t('productForm.basic.noCategory')}</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {/* Tags */}
                  {features.showTags && (
                    <div>
                      <label htmlFor="tags" className="block text-sm font-medium text-[#1e3a5f] mb-1">{t('productForm.organization.tags')}</label>
                      <input
                        id="tags"
                        type="text"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        placeholder={t('productForm.organization.tagsPlaceholder')}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8]"
                      />
                      <p className="text-xs text-gray-400 mt-1">{t('productForm.organization.tagsHint')}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Right Column - Visibility + Business Type Sections + Advanced Options */}
          <div className="space-y-6">
            {/* Visibility */}
            <div className="bg-white rounded-xl border border-gray-200/60 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">{t('productForm.visibility.title')}</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-[#f0f7ff] rounded-xl">
                  <span className="text-sm text-[#1e3a5f] font-medium">
                    {active ? t('productForm.visibility.visible') : t('productForm.visibility.hidden')}
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
                    <span className="text-sm text-gray-800 font-medium">{t('productForm.visibility.featured')}</span>
                    <p className="text-xs text-gray-500">{t('productForm.visibility.featuredDescription')}</p>
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

            {/* === BUSINESS TYPE SPECIFIC SECTIONS === */}

            {/* Food: Modifiers */}
            {features.showModifiers && (
              <ModifiersSection
                modifierGroups={modifierGroups}
                onChange={setModifierGroups}
              />
            )}

            {/* Food: Prep Time */}
            {features.showPrepTime && (
              <PrepTimeSection
                prepTime={prepTime}
                onChange={setPrepTime}
              />
            )}

            {/* Variations moved inside Inventory block below */}

            {/* Beauty: Duration */}
            {features.showServiceDuration && (
              <DurationSection
                duration={duration}
                onChange={setDuration}
              />
            )}

            {/* Craft: Custom Order */}
            {(features.showCustomOrder || features.showLimitedStock) && (
              <CustomOrderSection
                customizable={customizable}
                customizationInstructions={customizationInstructions}
                availableQuantity={availableQuantity}
                onCustomizableChange={setCustomizable}
                onInstructionsChange={setCustomizationInstructions}
                onQuantityChange={setAvailableQuantity}
              />
            )}

            {/* Tech: Specs */}
            {features.showSpecs && (
              <SpecsSection
                specs={specs}
                model={model}
                onChange={setSpecs}
                onModelChange={setModel}
              />
            )}

            {/* Tech: Warranty */}
            {features.showWarranty && (
              <WarrantySection
                warranty={warranty}
                onChange={setWarranty}
              />
            )}

            {/* Pets: Pet Type */}
            {features.showPetType && (
              <PetTypeSection
                petType={petType}
                petAge={petAge}
                onPetTypeChange={setPetType}
                onPetAgeChange={setPetAge}
              />
            )}
            {/* Inventory + Variants — unified block */}
            {(features.showSku || features.showBarcode || features.showStock || features.showCost || features.showVariants) && (
              <div className="bg-white rounded-xl border border-gray-200/60 p-5 space-y-4">
                <h2 className="text-sm font-medium text-gray-900">{t('productForm.inventory.title')}</h2>

                {/* SKU, Barcode, Cost */}
                <div className="grid grid-cols-2 gap-3">
                  {features.showSku && (
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">SKU</label>
                      <input type="text" value={sku} onChange={e => setSku(e.target.value)} placeholder="ABC-123"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40" />
                    </div>
                  )}
                  {features.showBarcode && (
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Codigo de barras</label>
                      <input type="text" value={barcode} onChange={e => setBarcode(e.target.value)} placeholder="7501234567890"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40" />
                    </div>
                  )}
                  {features.showCost && (
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Costo (no visible)</label>
                      <input type="number" min="0" step="0.01" value={cost} onChange={e => setCost(e.target.value)} placeholder="0.00"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40" />
                    </div>
                  )}
                </div>

                {/* Track Stock toggle */}
                {features.showStock && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">Controlar stock</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={trackStock} onChange={e => setTrackStock(e.target.checked)} className="sr-only peer" />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2d6cb5]" />
                    </label>
                  </div>
                )}

                {/* Stock fields when trackStock is on */}
                {trackStock && (
                  <>
                    {!isEditing && warehouses.length > 0 && (
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Almacen destino</label>
                        <select value={selectedWarehouseId} onChange={e => setSelectedWarehouseId(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40">
                          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}{w.isDefault ? ' (Principal)' : ''}</option>)}
                        </select>
                      </div>
                    )}

                    {combinations.length > 0 ? (
                      <p className="text-xs text-gray-400">
                        {isEditing ? 'Stock por combinacion (se gestiona desde Inventario)' : 'Stock inicial por combinacion (abajo)'}
                        {' — '}{combinations.reduce((s, c) => s + c.stock, 0)} uds total
                      </p>
                    ) : isEditing ? (
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">Stock actual</span>
                        <span className="text-sm font-medium text-gray-900">{stock || 0} uds</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Stock inicial</label>
                          <input type="number" min="0" value={stock} onChange={e => setStock(e.target.value)} placeholder="0"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Alerta bajo stock</label>
                          <input type="number" min="0" value={lowStockAlert} onChange={e => setLowStockAlert(e.target.value)} placeholder="5"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40" />
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Variants + Combinations inside inventory */}
                {features.showVariants && (
                  <VariationsSection
                    variations={variations}
                    onChange={setVariations}
                    combinations={combinations}
                    onCombinationsChange={setCombinations}
                    trackStock={trackStock}
                    basePrice={price ? parseFloat(price) : undefined}
                    isEditing={!!isEditing}
                  />
                )}
              </div>
            )}

            {/* Brand - only show if enabled */}
            {features.showBrand && (
              <div className="bg-white rounded-xl border border-gray-200/60 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">{t('productForm.organization.brand')}</h2>
                <div>
                  <input
                    id="brand"
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder={t('productForm.organization.brandPlaceholder')}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8]"
                  />
                </div>
              </div>
            )}

            {/* Shipping - only show if enabled */}
            {features.showShipping && (
              <div className="bg-white rounded-xl border border-gray-200/60 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">{t('productForm.shipping.title')}</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="weight" className="block text-sm font-medium text-[#1e3a5f] mb-1">{t('productForm.shipping.weight')}</label>
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
                    <label htmlFor="length" className="block text-sm font-medium text-[#1e3a5f] mb-1">{t('productForm.shipping.length')}</label>
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
                    <label htmlFor="width" className="block text-sm font-medium text-[#1e3a5f] mb-1">{t('productForm.shipping.width')}</label>
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
                    <label htmlFor="height" className="block text-sm font-medium text-[#1e3a5f] mb-1">{t('productForm.shipping.height')}</label>
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
            )}
          </div>
        </div>
      </form>

      {/* Native: sticky bottom action bar */}
      {Capacitor.isNativePlatform() && (
        <div className="sticky bottom-0 -mx-4 mt-4 bg-white border-t border-gray-200/60 px-4 py-3 flex gap-3">
          <button
            onClick={() => navigate(localePath('/dashboard/products'))}
            className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium text-sm"
          >
            {t('productForm.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !name || !price}
            className="flex-1 px-4 py-3 bg-[#1e3a5f] text-white rounded-xl hover:bg-[#2d6cb5] transition-all font-semibold disabled:opacity-50 shadow-sm"
          >
            {saving ? t('productForm.saving') : isEditing ? t('productForm.save') : t('productForm.create')}
          </button>
        </div>
      )}
    </div>
  )
}
