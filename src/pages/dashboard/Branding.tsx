import { useState, useEffect, useRef, useCallback, type JSX } from 'react'
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore'
import { useTranslation } from 'react-i18next'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import { themes } from '../../themes'
import { getThemeComponent } from '../../themes/components'
import type { Store, StoreAnnouncement, StoreTrustBadges, StoreFlashSale, StoreSocialProof, Product, Category } from '../../types'
import '../../themes/shared/animations.css'
import { getTrustBadgeText, ALL_BADGE_IDS } from '../../themes/shared/trustBadgeDefaults'
import type { TrustBadgeId } from '../../themes/shared/trustBadgeDefaults'

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

// Predefined cover images from Unsplash (free for commercial use)
const COVER_IMAGES = {
  restaurant: [
    { id: 'pizza-1', url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1920&q=80&fit=crop', label: 'Pizza' },
    { id: 'pizza-2', url: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=1920&q=80&fit=crop', label: 'Pizza italiana' },
    { id: 'burger-1', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1920&q=80&fit=crop', label: 'Hamburguesa' },
    { id: 'burger-2', url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=1920&q=80&fit=crop', label: 'Burger gourmet' },
    { id: 'sushi-1', url: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=1920&q=80&fit=crop', label: 'Sushi' },
    { id: 'pasta-1', url: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=1920&q=80&fit=crop', label: 'Pasta' },
  ],
  bakery: [
    { id: 'bread-1', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1920&q=80&fit=crop', label: 'Pan artesanal' },
    { id: 'croissant-1', url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=1920&q=80&fit=crop', label: 'Croissants' },
    { id: 'pastry-1', url: 'https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=1920&q=80&fit=crop', label: 'Pasteles' },
    { id: 'coffee-1', url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1920&q=80&fit=crop', label: 'Cafe y pan' },
    { id: 'donut-1', url: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=1920&q=80&fit=crop', label: 'Donuts' },
    { id: 'cake-1', url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=1920&q=80&fit=crop', label: 'Torta' },
  ],
  beauty: [
    { id: 'makeup-1', url: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1920&q=80&fit=crop', label: 'Maquillaje' },
    { id: 'skincare-1', url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1920&q=80&fit=crop', label: 'Skincare' },
    { id: 'cosmetics-1', url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1920&q=80&fit=crop', label: 'Cosmeticos' },
    { id: 'lipstick-1', url: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=1920&q=80&fit=crop', label: 'Labiales' },
    { id: 'spa-1', url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1920&q=80&fit=crop', label: 'Spa' },
    { id: 'nails-1', url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=1920&q=80&fit=crop', label: 'Unas' },
  ],
  fashion: [
    { id: 'clothing-1', url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920&q=80&fit=crop', label: 'Tienda ropa' },
    { id: 'fashion-1', url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80&fit=crop', label: 'Moda' },
    { id: 'shoes-1', url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=1920&q=80&fit=crop', label: 'Zapatillas' },
    { id: 'bags-1', url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=1920&q=80&fit=crop', label: 'Bolsos' },
    { id: 'jewelry-1', url: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1920&q=80&fit=crop', label: 'Joyeria' },
    { id: 'watches-1', url: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=1920&q=80&fit=crop', label: 'Relojes' },
  ],
  pets: [
    { id: 'dog-1', url: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1920&q=80&fit=crop', label: 'Perro feliz' },
    { id: 'dog-2', url: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=1920&q=80&fit=crop', label: 'Perros jugando' },
    { id: 'cat-1', url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=1920&q=80&fit=crop', label: 'Gato' },
    { id: 'cat-2', url: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=1920&q=80&fit=crop', label: 'Gato tierno' },
    { id: 'petfood-1', url: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=1920&q=80&fit=crop', label: 'Comida mascotas' },
    { id: 'pets-1', url: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1920&q=80&fit=crop', label: 'Perro y gato' },
  ],
  grocery: [
    { id: 'fruits-1', url: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=1920&q=80&fit=crop', label: 'Frutas' },
    { id: 'vegetables-1', url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=1920&q=80&fit=crop', label: 'Verduras' },
    { id: 'market-1', url: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1920&q=80&fit=crop', label: 'Mercado' },
    { id: 'organic-1', url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1920&q=80&fit=crop', label: 'Organico' },
    { id: 'grocery-1', url: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1920&q=80&fit=crop', label: 'Abarrotes' },
    { id: 'healthy-1', url: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1920&q=80&fit=crop', label: 'Saludable' },
  ],
  tech: [
    { id: 'tech-1', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1920&q=80&fit=crop', label: 'Tecnologia' },
    { id: 'laptop-1', url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1920&q=80&fit=crop', label: 'Laptop' },
    { id: 'phone-1', url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1920&q=80&fit=crop', label: 'Smartphone' },
    { id: 'gadgets-1', url: 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=1920&q=80&fit=crop', label: 'Gadgets' },
    { id: 'gaming-1', url: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=1920&q=80&fit=crop', label: 'Gaming' },
    { id: 'workspace-1', url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1920&q=80&fit=crop', label: 'Workspace' },
  ],
}

type CoverCategory = keyof typeof COVER_IMAGES

export default function Branding() {
  const { t } = useTranslation('dashboard')
  const { firebaseUser } = useAuth()
  const { showToast } = useToast()
  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)

  // Logo
  const [logo, setLogo] = useState('')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // Image crop modal (generic for logo and hero images)
  const [cropImage, setCropImage] = useState<string | null>(null)
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [cropType, setCropType] = useState<'logo' | 'heroDesktop' | 'heroMobile'>('logo')

  // Hero Image Desktop
  const [heroImage, setHeroImage] = useState('')
  const [uploadingHero, setUploadingHero] = useState(false)
  const heroInputRef = useRef<HTMLInputElement>(null)

  // Hero Image Mobile
  const [heroImageMobile, setHeroImageMobile] = useState('')
  const [uploadingHeroMobile, setUploadingHeroMobile] = useState(false)
  const heroMobileInputRef = useRef<HTMLInputElement>(null)

  // Theme
  const [selectedTheme, setSelectedTheme] = useState('minimal')

  // Announcement
  const [announcement, setAnnouncement] = useState<StoreAnnouncement>({
    enabled: false,
    text: '',
    link: '',
    backgroundColor: '#1e3a5f',
    textColor: '#ffffff'
  })

  // Trust Badges
  const [trustBadges, setTrustBadges] = useState<StoreTrustBadges>({
    enabled: false,
    badges: ALL_BADGE_IDS.map(id => ({ id, enabled: true })),
  })
  // Flash Sale
  const [flashSale, setFlashSale] = useState<StoreFlashSale>({
    enabled: false,
    endDate: '',
    text: '',
    backgroundColor: '#dc2626',
    textColor: '#ffffff'
  })

  // Social Proof
  const [socialProof, setSocialProof] = useState<StoreSocialProof>({
    enabled: false
  })

  // Unified saving for conversion features
  const [savingConversion, setSavingConversion] = useState(false)

  // Theme Preview
  const [previewTheme, setPreviewTheme] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  // Theme category filter
  const themeCarouselRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Cover selection
  const [showCoverSelector, setShowCoverSelector] = useState(false)
  const [coverCategory, setCoverCategory] = useState<CoverCategory>('restaurant')

  useEffect(() => {
    const fetchStore = async () => {
      if (!firebaseUser) return

      try {
        const storesRef = collection(db, 'stores')
        const storeQuery = query(storesRef, where('ownerId', '==', firebaseUser.uid))
        const storeSnapshot = await getDocs(storeQuery)

        if (!storeSnapshot.empty) {
          const storeData = storeSnapshot.docs[0].data() as Store
          const storeWithId = { ...storeData, id: storeSnapshot.docs[0].id }
          setStore(storeWithId)
          setLogo(storeData.logo || '')
          setHeroImage(storeData.heroImage || '')
          setHeroImageMobile(storeData.heroImageMobile || '')
          setSelectedTheme(storeData.themeId || 'minimal')
          if (storeData.announcement) {
            setAnnouncement(storeData.announcement)
          }
          if (storeData.trustBadges) {
            setTrustBadges(storeData.trustBadges)
          }
          if (storeData.flashSale) {
            setFlashSale(storeData.flashSale)
          }
          if (storeData.socialProof) {
            setSocialProof(storeData.socialProof)
          }

          // Fetch products and categories for preview (simple queries to avoid index requirement)
          const [productsSnapshot, categoriesSnapshot] = await Promise.all([
            getDocs(collection(db, 'stores', storeWithId.id, 'products')),
            getDocs(collection(db, 'stores', storeWithId.id, 'categories'))
          ])

          // Filter active products and sort by createdAt on client side
          const productsData = productsSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }) as Product)
            .filter(p => p.active !== false)
            .sort((a, b) => {
              const getTime = (date: unknown): number => {
                if (!date) return 0
                if (date instanceof Date) return date.getTime()
                if (typeof date === 'object' && 'toDate' in date && typeof (date as { toDate: () => Date }).toDate === 'function') {
                  return (date as { toDate: () => Date }).toDate().getTime()
                }
                return 0
              }
              return getTime(b.createdAt) - getTime(a.createdAt)
            })

          // Sort categories by order on client side
          const categoriesData = categoriesSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }) as Category)
            .sort((a, b) => (a.order || 0) - (b.order || 0))

          setProducts(productsData)
          setCategories(categoriesData)
        }
      } catch (error) {
        console.error('Error fetching store:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStore()
  }, [firebaseUser])

  const uploadImage = async (file: File, folder: string, highQuality = false): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
    formData.append('folder', `shopifree/${folder}`)

    // For hero images, use good quality (balance between quality and file size)
    if (highQuality) {
      formData.append('quality', 'auto:good')
    }

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData }
    )

    if (!response.ok) throw new Error('Upload failed')
    const data = await response.json()
    return data.secure_url
  }

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Create URL for preview
    const imageUrl = URL.createObjectURL(file)
    setCropFile(file)
    setCropImage(imageUrl)
    setCropType('logo')

    // Reset input so user can select same file again if needed
    e.target.value = ''
  }

  const handleHeroSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const imageUrl = URL.createObjectURL(file)
    setCropFile(file)
    setCropImage(imageUrl)
    setCropType('heroDesktop')
    e.target.value = ''
  }

  const handleHeroMobileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const imageUrl = URL.createObjectURL(file)
    setCropFile(file)
    setCropImage(imageUrl)
    setCropType('heroMobile')
    e.target.value = ''
  }

  const handleCropComplete = async (croppedBlob: Blob) => {
    const currentCropType = cropType
    setCropImage(null)

    if (!store) return

    // Set appropriate loading state
    if (currentCropType === 'logo') {
      setUploadingLogo(true)
    } else if (currentCropType === 'heroDesktop') {
      setUploadingHero(true)
    } else {
      setUploadingHeroMobile(true)
    }

    try {
      const folder = currentCropType === 'logo' ? 'logos' : 'heroes'
      const fileName = cropFile?.name || (currentCropType === 'logo' ? 'logo.png' : 'hero.jpg')
      const file = new File([croppedBlob], fileName, { type: croppedBlob.type })
      const url = await uploadImage(file, folder, currentCropType !== 'logo')

      // Update state and save to Firestore immediately
      const fieldToUpdate = currentCropType === 'logo' ? 'logo'
        : currentCropType === 'heroDesktop' ? 'heroImage'
        : 'heroImageMobile'

      await updateDoc(doc(db, 'stores', store.id), {
        [fieldToUpdate]: url,
        updatedAt: new Date()
      })

      // Update local state
      if (currentCropType === 'logo') {
        setLogo(url)
      } else if (currentCropType === 'heroDesktop') {
        setHeroImage(url)
      } else {
        setHeroImageMobile(url)
      }

      showToast(t('branding.toast.saved'), 'success')
    } catch (error) {
      console.error('Error uploading image:', error)
      showToast(t(currentCropType === 'logo' ? 'branding.toast.logoError' : 'branding.toast.imageError'), 'error')
    } finally {
      if (currentCropType === 'logo') {
        setUploadingLogo(false)
      } else if (currentCropType === 'heroDesktop') {
        setUploadingHero(false)
      } else {
        setUploadingHeroMobile(false)
      }
      setCropFile(null)
    }
  }

  const handleCropCancel = () => {
    if (cropImage) {
      URL.revokeObjectURL(cropImage)
    }
    setCropImage(null)
    setCropFile(null)
  }

  // Delete image handlers (auto-save)
  const handleDeleteLogo = async () => {
    if (!store) return
    try {
      await updateDoc(doc(db, 'stores', store.id), {
        logo: null,
        updatedAt: new Date()
      })
      setLogo('')
      showToast(t('branding.toast.saved'), 'success')
    } catch (error) {
      console.error('Error deleting logo:', error)
      showToast(t('branding.toast.error'), 'error')
    }
  }

  const handleDeleteHeroDesktop = async () => {
    if (!store) return
    try {
      await updateDoc(doc(db, 'stores', store.id), {
        heroImage: null,
        updatedAt: new Date()
      })
      setHeroImage('')
      showToast(t('branding.toast.saved'), 'success')
    } catch (error) {
      console.error('Error deleting hero image:', error)
      showToast(t('branding.toast.error'), 'error')
    }
  }

  const handleDeleteHeroMobile = async () => {
    if (!store) return
    try {
      await updateDoc(doc(db, 'stores', store.id), {
        heroImageMobile: null,
        updatedAt: new Date()
      })
      setHeroImageMobile('')
      showToast(t('branding.toast.saved'), 'success')
    } catch (error) {
      console.error('Error deleting hero mobile image:', error)
      showToast(t('branding.toast.error'), 'error')
    }
  }

  // Select predefined cover image (from Unsplash)
  const handleSelectCover = async (imageUrl: string) => {
    if (!store) return

    setUploadingHero(true)
    setShowCoverSelector(false)

    try {
      await updateDoc(doc(db, 'stores', store.id), {
        heroImage: imageUrl,
        updatedAt: new Date()
      })
      setHeroImage(imageUrl)
      showToast(t('branding.toast.saved'), 'success')
    } catch (error) {
      console.error('Error saving cover image:', error)
      showToast(t('branding.toast.error'), 'error')
    } finally {
      setUploadingHero(false)
    }
  }

  const handleSaveConversion = async () => {
    if (!store) return

    setSavingConversion(true)
    try {
      await updateDoc(doc(db, 'stores', store.id), {
        announcement,
        trustBadges,
        flashSale,
        socialProof,
        updatedAt: new Date()
      })
      showToast(t('branding.toast.saved'), 'success')
    } catch (error) {
      console.error('Error saving conversion features:', error)
      showToast(t('branding.toast.error'), 'error')
    } finally {
      setSavingConversion(false)
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1e3a5f]">{t('branding.title')}</h1>
        <p className="text-gray-600 mt-1">{t('branding.subtitle')}</p>
      </div>

      {/* Theme Selector - Carousel by Category */}
      <div className="bg-white rounded-2xl border border-gray-100 py-6 shadow-sm">
        <div className="px-4 md:px-6">
          <h2 className="text-lg font-semibold text-[#1e3a5f] mb-1">{t('branding.theme.title')}</h2>
          <p className="text-sm text-gray-600 mb-5">
            {t('branding.theme.description')}
          </p>
        </div>

        <div className="space-y-6">
          {([
            { key: 'all', label: t('branding.theme.categories.general'), desc: t('branding.theme.categoryDesc.general'), categories: ['all'] },
            { key: 'retail', label: t('branding.theme.categories.retail'), desc: t('branding.theme.categoryDesc.retail'), categories: ['retail'] },
            { key: 'restaurant', label: t('branding.theme.categories.restaurant'), desc: t('branding.theme.categoryDesc.restaurant'), categories: ['restaurant'] },
            { key: 'specialized', label: t('branding.theme.categories.specialized') || 'Especializado', desc: t('branding.theme.categoryDesc.specialized'), categories: ['tech', 'cosmetics', 'grocery', 'pets'] },
          ] as const).map((group) => {
            const groupThemes = themes.filter(th => (group.categories as readonly string[]).includes(th.category))
            if (groupThemes.length === 0) return null
            const scrollKey = group.key
            return (
              <div key={group.key}>
                <div className="flex items-center justify-between mb-2 px-4 md:px-6">
                  <div>
                    <h3 className="text-sm font-semibold text-[#1e3a5f]">{group.label}</h3>
                    <p className="text-xs text-gray-400">{group.desc}</p>
                  </div>
                  <div className="hidden md:flex items-center gap-1">
                    <button
                      onClick={() => {
                        const el = themeCarouselRefs.current[scrollKey]
                        if (el) el.scrollBy({ left: -240, behavior: 'smooth' })
                      }}
                      className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                    >
                      <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        const el = themeCarouselRefs.current[scrollKey]
                        if (el) el.scrollBy({ left: 240, behavior: 'smooth' })
                      }}
                      className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                    >
                      <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div
                  ref={(el) => { themeCarouselRefs.current[scrollKey] = el }}
                  className="carousel-container flex gap-3 pb-2 scroll-pl-4 md:scroll-pl-6"
                >
                  {groupThemes.map((theme, themeIndex) => {
                    const isSelected = selectedTheme === theme.id
                    const isFirst = themeIndex === 0
                    const isLast = themeIndex === groupThemes.length - 1
                    return (
                      <div
                        key={theme.id}
                        className={`carousel-item w-[120px] sm:w-[150px] md:w-[160px] flex-shrink-0 relative rounded-xl sm:rounded-2xl overflow-hidden border-2 transition-all group ${isFirst ? 'ml-4 md:ml-6' : ''} ${isLast ? 'mr-4 md:mr-6' : ''} ${
                          isSelected
                            ? 'border-[#2d6cb5] ring-2 ring-[#38bdf8]/30'
                            : 'border-gray-200 hover:border-[#38bdf8]/50'
                        }`}
                      >
                        <button
                          onClick={() => setSelectedTheme(theme.id)}
                          className="w-full text-left"
                        >
                          {/* Mini Preview */}
                          <div
                            className="aspect-square p-2 sm:p-3 flex flex-col relative"
                            style={{ backgroundColor: theme.colors?.background || '#ffffff' }}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="w-6 h-2 rounded-full" style={{ backgroundColor: theme.colors?.primary || '#000' }} />
                              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.colors?.accent || '#666' }} />
                            </div>
                            <div className="grid grid-cols-2 gap-1">
                              {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="rounded aspect-square" style={{ backgroundColor: theme.colors?.primary ? `${theme.colors.primary}15` : '#f3f4f6' }} />
                              ))}
                            </div>
                            <div className="mt-2 flex items-center gap-1">
                              <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: theme.colors?.primary || '#000' }} />
                              <div className="w-6 h-6 rounded-lg" style={{ backgroundColor: theme.colors?.accent || '#666' }} />
                            </div>
                            {/* Preview overlay */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span
                                onClick={(e) => { e.stopPropagation(); setPreviewTheme(theme.id) }}
                                className="px-3 py-1.5 bg-white text-[#1e3a5f] text-xs font-semibold rounded-lg hover:bg-gray-100 transition-colors cursor-pointer flex items-center gap-1.5"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                {t('branding.theme.preview')}
                              </span>
                            </div>
                          </div>
                          {/* Theme Name */}
                          <div className="px-2 py-1.5 sm:px-3 sm:py-2 bg-white border-t border-gray-100">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-xs sm:text-sm text-[#1e3a5f] truncate">{theme.name}</span>
                              {theme.isNew && (
                                <span className="px-1.5 py-0.5 bg-gradient-to-r from-[#38bdf8] to-[#2d6cb5] text-white text-[10px] font-bold rounded-full flex-shrink-0 ml-1">
                                  NEW
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] sm:text-[11px] text-gray-500 truncate mt-0.5 hidden sm:block">{theme.description}</p>
                          </div>
                        </button>
                        {/* Selected indicator */}
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-6 h-6 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] rounded-full flex items-center justify-center shadow-lg z-10">
                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Logo */}
      <div className="mt-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">{t('branding.logo.title')}</h2>
          <div className="flex items-start gap-4">
            <div
              onClick={() => logoInputRef.current?.click()}
              className="w-24 h-24 bg-gradient-to-br from-[#f0f7ff] to-white border-2 border-dashed border-[#38bdf8]/30 rounded-2xl overflow-hidden cursor-pointer hover:border-[#38bdf8] transition-all flex items-center justify-center flex-shrink-0"
            >
              {uploadingLogo ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#2d6cb5]"></div>
              ) : logo ? (
                <img src={logo} alt="Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <div className="text-center p-2">
                  <svg className="w-6 h-6 text-[#38bdf8] mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="text-[10px] text-gray-500">{t('branding.logo.upload')}</span>
                </div>
              )}
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoSelect}
              className="hidden"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-600 mb-2">
                {t('branding.logo.description')}
              </p>
              {logo && (
                <button
                  onClick={handleDeleteLogo}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  {t('branding.logo.delete')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Catalog Layout + Visual Effects | Hero Images */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Left Column: Layout + Effects in one card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm h-fit">
          {store && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-lg font-semibold text-[#1e3a5f]">{t('branding.layout.title')}</h2>
                {store.plan === 'free' && (
                  <span className="px-2 py-0.5 bg-gradient-to-r from-[#38bdf8] to-[#2d6cb5] text-white text-[10px] font-bold rounded-full uppercase">
                    PRO
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-6">{t('branding.layout.subtitle')}</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {([
                  { id: 'grid' as const, icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                    </svg>
                  )},
                  { id: 'masonry' as const, icon: (
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <rect x="3" y="3" width="7" height="10" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <rect x="14" y="3" width="7" height="6" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <rect x="3" y="16" width="7" height="5" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <rect x="14" y="12" width="7" height="9" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )},
                  { id: 'magazine' as const, icon: (
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <rect x="3" y="3" width="11" height="11" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <rect x="17" y="3" width="4" height="5" rx="1" strokeLinecap="round" strokeLinejoin="round" />
                      <rect x="17" y="11" width="4" height="5" rx="1" strokeLinecap="round" strokeLinejoin="round" />
                      <rect x="3" y="17" width="4" height="4" rx="1" strokeLinecap="round" strokeLinejoin="round" />
                      <rect x="10" y="17" width="4" height="4" rx="1" strokeLinecap="round" strokeLinejoin="round" />
                      <rect x="17" y="19" width="4" height="2" rx="0.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )},
                  { id: 'carousel' as const, icon: (
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <rect x="2" y="6" width="6" height="12" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <rect x="9" y="4" width="6" height="16" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <rect x="16" y="6" width="6" height="12" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )},
                  { id: 'list' as const, icon: (
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <rect x="3" y="4" width="7" height="5" rx="1" strokeLinecap="round" strokeLinejoin="round" />
                      <line x1="13" y1="5" x2="21" y2="5" strokeLinecap="round" />
                      <line x1="13" y1="8" x2="18" y2="8" strokeLinecap="round" />
                      <rect x="3" y="12" width="7" height="5" rx="1" strokeLinecap="round" strokeLinejoin="round" />
                      <line x1="13" y1="13" x2="21" y2="13" strokeLinecap="round" />
                      <line x1="13" y1="16" x2="18" y2="16" strokeLinecap="round" />
                    </svg>
                  )},
                ] as const).map((layout) => {
                  const isSelected = (store.themeSettings?.productLayout || 'grid') === layout.id
                  const isPremium = layout.id !== 'grid'
                  const isDisabled = isPremium && store.plan === 'free'

                  return (
                    <button
                      key={layout.id}
                      onClick={async () => {
                        if (isDisabled) return
                        try {
                          await updateDoc(doc(db, 'stores', store.id), {
                            'themeSettings.productLayout': layout.id,
                            updatedAt: new Date()
                          })
                          setStore({ ...store, themeSettings: { ...store.themeSettings, productLayout: layout.id } })
                          showToast(t('branding.toast.saved'), 'success')
                        } catch {
                          showToast(t('branding.toast.error'), 'error')
                        }
                      }}
                      className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                        isSelected
                          ? 'border-[#2d6cb5] bg-[#f0f7ff]'
                          : isDisabled
                            ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                            : 'border-gray-200 hover:border-[#38bdf8]/50 bg-white'
                      }`}
                    >
                      <div className={`mb-2 ${isSelected ? 'text-[#2d6cb5]' : 'text-gray-400'}`}>
                        {layout.icon}
                      </div>
                      <div className="font-medium text-sm text-[#1e3a5f]">
                        {t(`branding.layout.${layout.id}`)}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {t(`branding.layout.${layout.id}Desc`)}
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Upgrade prompt for free plan */}
              {store.plan === 'free' && (
                <div className="flex items-center gap-3 p-3 bg-[#f0f7ff] rounded-xl mt-4">
                  <svg className="w-5 h-5 text-[#2d6cb5] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <p className="text-sm text-[#1e3a5f]">
                    {t('branding.layout.upgradeMessage')}{' '}
                    <a href="/dashboard/plan" className="font-semibold text-[#2d6cb5] hover:underline">
                      {t('branding.layout.viewPlans')}
                    </a>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Product Pagination */}
          {store && (
            <div className="border-t border-gray-100 pt-6 mt-6">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-medium text-[#1e3a5f]">{t('branding.pagination.title')}</h3>
                {store.plan === 'free' && (
                  <span className="px-2 py-0.5 bg-gradient-to-r from-[#38bdf8] to-[#2d6cb5] text-white text-[10px] font-bold rounded-full uppercase">
                    PRO
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-6">{t('branding.pagination.subtitle')}</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {([
                  { id: 'none' as const, icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                    </svg>
                  )},
                  { id: 'load-more' as const, icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m0 0l6.75-6.75M12 19.5l-6.75-6.75" />
                    </svg>
                  )},
                  { id: 'infinite-scroll' as const, icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0 4.14-3.36 7.5-7.5 7.5S4.5 16.14 4.5 12 7.86 4.5 12 4.5s7.5 3.36 7.5 7.5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l2.5 2.5" />
                    </svg>
                  )},
                  { id: 'classic' as const, icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
                    </svg>
                  )},
                ] as const).map((option) => {
                  const isSelected = (store.themeSettings?.paginationType || 'none') === option.id
                  const isPremium = option.id !== 'none'
                  const isDisabled = isPremium && store.plan === 'free'
                  const labelKey = option.id === 'load-more' ? 'loadMore' : option.id === 'infinite-scroll' ? 'infiniteScroll' : option.id
                  const descKey = option.id === 'load-more' ? 'loadMoreDesc' : option.id === 'infinite-scroll' ? 'infiniteScrollDesc' : `${option.id}Desc`

                  return (
                    <button
                      key={option.id}
                      onClick={async () => {
                        if (isDisabled) return
                        try {
                          await updateDoc(doc(db, 'stores', store.id), {
                            'themeSettings.paginationType': option.id,
                            updatedAt: new Date()
                          })
                          setStore({ ...store, themeSettings: { ...store.themeSettings, paginationType: option.id } })
                          showToast(t('branding.toast.saved'), 'success')
                        } catch {
                          showToast(t('branding.toast.error'), 'error')
                        }
                      }}
                      className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                        isSelected
                          ? 'border-[#2d6cb5] bg-[#f0f7ff]'
                          : isDisabled
                            ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                            : 'border-gray-200 hover:border-[#38bdf8]/50 bg-white'
                      }`}
                    >
                      <div className={`mb-2 ${isSelected ? 'text-[#2d6cb5]' : 'text-gray-400'}`}>
                        {option.icon}
                      </div>
                      <div className="font-medium text-sm text-[#1e3a5f]">
                        {t(`branding.pagination.${labelKey}`)}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {t(`branding.pagination.${descKey}`)}
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Upgrade prompt for free plan */}
              {store.plan === 'free' && (
                <div className="flex items-center gap-3 p-3 bg-[#f0f7ff] rounded-xl mt-4">
                  <svg className="w-5 h-5 text-[#2d6cb5] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <p className="text-sm text-[#1e3a5f]">
                    {t('branding.pagination.upgradeMessage')}{' '}
                    <a href="/dashboard/plan" className="font-semibold text-[#2d6cb5] hover:underline">
                      {t('branding.pagination.viewPlans')}
                    </a>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Product View Mode */}
          {store && (
            <div className="border-t border-gray-100 pt-6 mt-6">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-medium text-[#1e3a5f]">{t('branding.viewMode.title')}</h3>
                {store.plan === 'free' && (
                  <span className="px-2 py-0.5 bg-gradient-to-r from-[#38bdf8] to-[#2d6cb5] text-white text-[10px] font-bold rounded-full uppercase">
                    PRO
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-6">{t('branding.viewMode.subtitle')}</p>

              <div className="grid grid-cols-2 gap-3">
                {([
                  { id: 'drawer' as const, icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6z" />
                    </svg>
                  ), labelKey: 'drawer', descKey: 'drawerDesc', premium: false },
                  { id: 'reels' as const, icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 12h7.5M12 8.25v7.5" />
                    </svg>
                  ), labelKey: 'reels', descKey: 'reelsDesc', premium: true },
                ] as const).map((option) => {
                  const isSelected = (store.themeSettings?.productViewMode || 'drawer') === option.id
                  const isDisabled = option.premium && store.plan === 'free'

                  return (
                    <button
                      key={option.id}
                      onClick={async () => {
                        if (isDisabled) return
                        try {
                          await updateDoc(doc(db, 'stores', store.id), {
                            'themeSettings.productViewMode': option.id,
                            updatedAt: new Date()
                          })
                          setStore({ ...store, themeSettings: { ...store.themeSettings, productViewMode: option.id } })
                          showToast(t('branding.toast.saved'), 'success')
                        } catch {
                          showToast(t('branding.toast.error'), 'error')
                        }
                      }}
                      className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                        isSelected
                          ? 'border-[#2d6cb5] bg-[#f0f7ff]'
                          : isDisabled
                            ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                            : 'border-gray-200 hover:border-[#38bdf8]/50 bg-white'
                      }`}
                    >
                      <div className={`mb-2 ${isSelected ? 'text-[#2d6cb5]' : 'text-gray-400'}`}>
                        {option.icon}
                      </div>
                      <div className="font-medium text-sm text-[#1e3a5f]">
                        {t(`branding.viewMode.${option.labelKey}`)}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {t(`branding.viewMode.${option.descKey}`)}
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {store.plan === 'free' && (
                <div className="flex items-center gap-3 p-3 bg-[#f0f7ff] rounded-xl mt-4">
                  <svg className="w-5 h-5 text-[#2d6cb5] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <p className="text-sm text-[#1e3a5f]">
                    {t('branding.viewMode.upgradeMessage')}{' '}
                    <a href="/dashboard/plan" className="font-semibold text-[#2d6cb5] hover:underline">
                      {t('branding.viewMode.viewPlans')}
                    </a>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Visual Effects */}
          {store && (
            <div className="border-t border-gray-100 pt-6 mt-6">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-medium text-[#1e3a5f]">{t('branding.effects.title')}</h3>
                {store.plan === 'free' && (
                  <span className="px-2 py-0.5 bg-gradient-to-r from-[#38bdf8] to-[#2d6cb5] text-white text-[10px] font-bold rounded-full uppercase">
                    PRO
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-4">{t('branding.effects.subtitle')}</p>

              <div className="space-y-3">
                {/* Scroll Reveal */}
                <div className={`flex items-center justify-between p-3 rounded-xl border ${store.plan === 'free' ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200'}`}>
                  <div className="flex-1 mr-4">
                    <span className="font-medium text-sm text-[#1e3a5f]">{t('branding.effects.scrollReveal')}</span>
                    <p className="text-xs text-gray-500 mt-0.5">{t('branding.effects.scrollRevealDesc')}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={store.themeSettings?.scrollReveal || false}
                      disabled={store.plan === 'free'}
                      onChange={async (e) => {
                        const newValue = e.target.checked
                        try {
                          await updateDoc(doc(db, 'stores', store.id), {
                            'themeSettings.scrollReveal': newValue,
                            updatedAt: new Date()
                          })
                          setStore({ ...store, themeSettings: { ...store.themeSettings, scrollReveal: newValue } })
                          showToast(t('branding.toast.saved'), 'success')
                        } catch {
                          showToast(t('branding.toast.error'), 'error')
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className={`w-11 h-6 rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                      store.plan === 'free'
                        ? 'bg-gray-200 cursor-not-allowed'
                        : 'bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#38bdf8] peer-checked:after:translate-x-full peer-checked:after:border-white peer-checked:bg-gradient-to-r peer-checked:from-[#1e3a5f] peer-checked:to-[#2d6cb5]'
                    }`}></div>
                  </label>
                </div>

                {/* Image Swap on Hover */}
                <div className={`flex items-center justify-between p-3 rounded-xl border ${store.plan === 'free' ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200'}`}>
                  <div className="flex-1 mr-4">
                    <span className="font-medium text-sm text-[#1e3a5f]">{t('branding.effects.imageSwap')}</span>
                    <p className="text-xs text-gray-500 mt-0.5">{t('branding.effects.imageSwapDesc')}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={store.themeSettings?.imageSwapOnHover || false}
                      disabled={store.plan === 'free'}
                      onChange={async (e) => {
                        const newValue = e.target.checked
                        try {
                          await updateDoc(doc(db, 'stores', store.id), {
                            'themeSettings.imageSwapOnHover': newValue,
                            updatedAt: new Date()
                          })
                          setStore({ ...store, themeSettings: { ...store.themeSettings, imageSwapOnHover: newValue } })
                          showToast(t('branding.toast.saved'), 'success')
                        } catch {
                          showToast(t('branding.toast.error'), 'error')
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className={`w-11 h-6 rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                      store.plan === 'free'
                        ? 'bg-gray-200 cursor-not-allowed'
                        : 'bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#38bdf8] peer-checked:after:translate-x-full peer-checked:after:border-white peer-checked:bg-gradient-to-r peer-checked:from-[#1e3a5f] peer-checked:to-[#2d6cb5]'
                    }`}></div>
                  </label>
                </div>

                {/* Upgrade prompt for free plan */}
                {store.plan === 'free' && (
                  <div className="flex items-center gap-3 p-3 bg-[#f0f7ff] rounded-xl">
                    <svg className="w-5 h-5 text-[#2d6cb5] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <p className="text-sm text-[#1e3a5f]">
                      {t('branding.effects.upgradeMessage')}{' '}
                      <a href="/dashboard/plan" className="font-semibold text-[#2d6cb5] hover:underline">
                        {t('branding.effects.viewPlans')}
                      </a>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Hero Images */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm h-fit">
          <h2 className="text-lg font-semibold text-[#1e3a5f] mb-2">{t('branding.hero.title')}</h2>
          <p className="text-sm text-gray-600 mb-6">
            {t('branding.hero.description')}
          </p>

          <div className="space-y-6">
            {/* Desktop Image */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-[#2d6cb5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="font-medium text-[#1e3a5f]">{t('branding.hero.desktop')}</span>
                <span className="text-xs text-gray-400">{t('branding.hero.desktopSize')}</span>
              </div>
              <div
                onClick={() => heroInputRef.current?.click()}
                className="w-full aspect-[16/5] bg-gradient-to-br from-[#f0f7ff] to-white border-2 border-dashed border-[#38bdf8]/30 rounded-xl overflow-hidden cursor-pointer hover:border-[#38bdf8] transition-all flex items-center justify-center"
              >
                {uploadingHero ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2d6cb5]"></div>
                ) : heroImage ? (
                  <img src={heroImage} alt="Hero Desktop" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4">
                    <svg className="w-8 h-8 text-[#38bdf8] mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <p className="text-sm text-gray-500">{t('branding.hero.uploadHorizontal')}</p>
                  </div>
                )}
              </div>
              <input
                ref={heroInputRef}
                type="file"
                accept="image/*"
                onChange={handleHeroSelect}
                className="hidden"
              />
              {heroImage && (
                <button
                  onClick={handleDeleteHeroDesktop}
                  className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  {t('branding.hero.delete')}
                </button>
              )}
            </div>

            {/* Mobile Image */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-[#2d6cb5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span className="font-medium text-[#1e3a5f]">{t('branding.hero.mobile')}</span>
                <span className="text-xs text-gray-400">{t('branding.hero.mobileSize')}</span>
              </div>
              <div
                onClick={() => heroMobileInputRef.current?.click()}
                className="w-full aspect-[3/2] max-w-[280px] bg-gradient-to-br from-[#f0f7ff] to-white border-2 border-dashed border-[#38bdf8]/30 rounded-xl overflow-hidden cursor-pointer hover:border-[#38bdf8] transition-all flex items-center justify-center"
              >
                {uploadingHeroMobile ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2d6cb5]"></div>
                ) : heroImageMobile ? (
                  <img src={heroImageMobile} alt="Hero Mobile" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4">
                    <svg className="w-8 h-8 text-[#38bdf8] mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <p className="text-sm text-gray-500">{t('branding.hero.uploadSquare')}</p>
                  </div>
                )}
              </div>
              <input
                ref={heroMobileInputRef}
                type="file"
                accept="image/*"
                onChange={handleHeroMobileSelect}
                className="hidden"
              />
              {heroImageMobile && (
                <button
                  onClick={handleDeleteHeroMobile}
                  className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  {t('branding.hero.delete')}
                </button>
              )}
            </div>
          </div>

          {/* Gallery + Tip */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-4">
            <p className="text-xs text-gray-400">
              <span className="font-medium">{t('branding.hero.tip')}</span> {t('branding.hero.tipText')}
            </p>
            <button
              onClick={() => setShowCoverSelector(true)}
              className="text-xs text-[#2d6cb5] font-semibold hover:underline whitespace-nowrap flex-shrink-0"
            >
              {t('branding.hero.browseGallery')}
            </button>
          </div>
        </div>
      </div>

      {/* Conversion Features - Single unified card */}
      {store && (
        <div className="mt-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            {/* Header */}
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-lg font-semibold text-[#1e3a5f]">{t('branding.conversion.title')}</h2>
              {store.plan === 'free' && (
                <span className="px-2 py-0.5 bg-gradient-to-r from-[#38bdf8] to-[#2d6cb5] text-white text-[10px] font-bold rounded-full uppercase">
                  PRO
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-6">{t('branding.conversion.description')}</p>

            {/* Two-column grid for sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left column: Announcement + Flash Sale */}
              <div className="space-y-0">
                {/* Section 1: Announcement Bar */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-[#1e3a5f]">{t('branding.announcement.title')}</h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={announcement.enabled}
                        disabled={store.plan === 'free'}
                        onChange={(e) => setAnnouncement({ ...announcement, enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className={`w-11 h-6 rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                        store.plan === 'free'
                          ? 'bg-gray-200 cursor-not-allowed'
                          : 'bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#38bdf8] peer-checked:after:translate-x-full peer-checked:after:border-white peer-checked:bg-gradient-to-r peer-checked:from-[#1e3a5f] peer-checked:to-[#2d6cb5]'
                      }`}></div>
                    </label>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">{t('branding.announcement.description')}</p>

                  {announcement.enabled && store.plan !== 'free' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-[#1e3a5f] mb-1">{t('branding.announcement.message')}</label>
                        <input
                          type="text"
                          value={announcement.text}
                          onChange={(e) => setAnnouncement({ ...announcement, text: e.target.value })}
                          placeholder={t('branding.announcement.messagePlaceholder')}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#38bdf8] focus:border-transparent outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#1e3a5f] mb-1">{t('branding.announcement.link')}</label>
                        <input
                          type="url"
                          value={announcement.link || ''}
                          onChange={(e) => setAnnouncement({ ...announcement, link: e.target.value })}
                          placeholder={t('branding.announcement.linkPlaceholder')}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#38bdf8] focus:border-transparent outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-[#1e3a5f] mb-1">{t('branding.announcement.backgroundColor')}</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={announcement.backgroundColor}
                              onChange={(e) => setAnnouncement({ ...announcement, backgroundColor: e.target.value })}
                              className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer flex-shrink-0"
                            />
                            <input
                              type="text"
                              value={announcement.backgroundColor}
                              onChange={(e) => setAnnouncement({ ...announcement, backgroundColor: e.target.value })}
                              className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#1e3a5f] mb-1">{t('branding.announcement.textColor')}</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={announcement.textColor}
                              onChange={(e) => setAnnouncement({ ...announcement, textColor: e.target.value })}
                              className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer flex-shrink-0"
                            />
                            <input
                              type="text"
                              value={announcement.textColor}
                              onChange={(e) => setAnnouncement({ ...announcement, textColor: e.target.value })}
                              className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Marquee mode toggle */}
                      <div className="flex items-center justify-between p-4 rounded-xl border bg-white border-gray-200">
                        <div className="flex-1 mr-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[#1e3a5f]">{t('branding.announcement.marquee')}</span>
                          </div>
                          <p className="text-sm text-gray-500 mt-0.5">{t('branding.announcement.marqueeDesc')}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={announcement.mode === 'marquee'}
                            onChange={(e) => setAnnouncement({ ...announcement, mode: e.target.checked ? 'marquee' : 'static' })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#38bdf8] peer-checked:after:translate-x-full peer-checked:after:border-white peer-checked:bg-gradient-to-r peer-checked:from-[#1e3a5f] peer-checked:to-[#2d6cb5]"></div>
                        </label>
                      </div>

                      {/* Preview */}
                      {announcement.text && (
                        <div>
                          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('branding.announcement.preview')}</div>
                          <div
                            className="py-2.5 px-4 text-sm font-medium rounded-lg overflow-hidden"
                            style={{
                              backgroundColor: announcement.backgroundColor,
                              color: announcement.textColor
                            }}
                          >
                            {announcement.mode === 'marquee' ? (
                              <div className="overflow-hidden">
                                <div className="animate-marquee">
                                  {[0, 1, 2].map((i) => (
                                    <span key={i} className="inline-flex items-center gap-8 px-4">
                                      <span>{announcement.text}</span>
                                      <span style={{ opacity: 0.4 }}>&#x2022;</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center">{announcement.text}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Section 3: Flash Sale */}
                <div className="border-t border-gray-100 pt-5 mt-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-[#1e3a5f]">{t('branding.flashSale.title')}</h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={flashSale.enabled}
                        disabled={store.plan === 'free'}
                        onChange={(e) => setFlashSale({ ...flashSale, enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className={`w-11 h-6 rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                        store.plan === 'free'
                          ? 'bg-gray-200 cursor-not-allowed'
                          : 'bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#38bdf8] peer-checked:after:translate-x-full peer-checked:after:border-white peer-checked:bg-gradient-to-r peer-checked:from-[#1e3a5f] peer-checked:to-[#2d6cb5]'
                      }`}></div>
                    </label>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">{t('branding.flashSale.description')}</p>

                  {flashSale.enabled && store.plan !== 'free' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('branding.flashSale.endDate')}</label>
                        <input
                          type="datetime-local"
                          value={flashSale.endDate ? flashSale.endDate.slice(0, 16) : ''}
                          onChange={(e) => setFlashSale({ ...flashSale, endDate: new Date(e.target.value).toISOString() })}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#38bdf8] focus:border-transparent outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('branding.flashSale.customText')}</label>
                        <input
                          type="text"
                          value={flashSale.text || ''}
                          onChange={(e) => setFlashSale({ ...flashSale, text: e.target.value })}
                          placeholder={t('branding.flashSale.customTextPlaceholder')}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#38bdf8] focus:border-transparent outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('branding.flashSale.bgColor')}</label>
                          <div className="flex gap-2 items-center">
                            <input
                              type="color"
                              value={flashSale.backgroundColor || '#dc2626'}
                              onChange={(e) => setFlashSale({ ...flashSale, backgroundColor: e.target.value })}
                              className="w-10 h-10 rounded-lg cursor-pointer border-0"
                            />
                            <input
                              type="text"
                              value={flashSale.backgroundColor || '#dc2626'}
                              onChange={(e) => setFlashSale({ ...flashSale, backgroundColor: e.target.value })}
                              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('branding.flashSale.textColor')}</label>
                          <div className="flex gap-2 items-center">
                            <input
                              type="color"
                              value={flashSale.textColor || '#ffffff'}
                              onChange={(e) => setFlashSale({ ...flashSale, textColor: e.target.value })}
                              className="w-10 h-10 rounded-lg cursor-pointer border-0"
                            />
                            <input
                              type="text"
                              value={flashSale.textColor || '#ffffff'}
                              onChange={(e) => setFlashSale({ ...flashSale, textColor: e.target.value })}
                              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Live preview */}
                      {flashSale.endDate && (
                        <div>
                          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('branding.flashSale.preview')}</div>
                          <div
                            className="py-2.5 px-4 rounded-xl text-center text-sm font-semibold"
                            style={{
                              backgroundColor: flashSale.backgroundColor || '#dc2626',
                              color: flashSale.textColor || '#ffffff'
                            }}
                          >
                            {flashSale.text || 'Flash Sale!'} {new Date(flashSale.endDate) > new Date() ? '\u23F1' : ''}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right column: Trust Badges + Social Proof */}
              <div className="space-y-0">
                {/* Section 2: Trust Badges */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-[#1e3a5f]">{t('branding.trustBadges.title')}</h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={trustBadges.enabled}
                        disabled={store.plan === 'free'}
                        onChange={(e) => setTrustBadges({ ...trustBadges, enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className={`w-11 h-6 rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                        store.plan === 'free'
                          ? 'bg-gray-200 cursor-not-allowed'
                          : 'bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#38bdf8] peer-checked:after:translate-x-full peer-checked:after:border-white peer-checked:bg-gradient-to-r peer-checked:from-[#1e3a5f] peer-checked:to-[#2d6cb5]'
                      }`}></div>
                    </label>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">{t('branding.trustBadges.description')}</p>

                  {trustBadges.enabled && store.plan !== 'free' && (
                    <>
                      {/* Badge cards grid */}
                      <div className="grid grid-cols-2 gap-3">
                        {(ALL_BADGE_IDS as readonly TrustBadgeId[]).map((badgeId) => {
                          const badge = trustBadges.badges.find(b => b.id === badgeId)
                          return (
                            <TrustBadgeCard
                              key={badgeId}
                              badgeId={badgeId}
                              badge={badge}
                              isDisabled={false}
                              language={store.language || 'es'}
                              onToggle={() => {
                                const updated = trustBadges.badges.map(b =>
                                  b.id === badgeId ? { ...b, enabled: !b.enabled } : b
                                )
                                if (!badge) {
                                  updated.push({ id: badgeId, enabled: true })
                                }
                                setTrustBadges({ ...trustBadges, badges: updated })
                              }}
                              onTextChange={(text) => {
                                const updated = trustBadges.badges.map(b =>
                                  b.id === badgeId ? { ...b, text: text || undefined } : b
                                )
                                if (!badge) {
                                  updated.push({ id: badgeId, enabled: true, text: text || undefined })
                                }
                                setTrustBadges({ ...trustBadges, badges: updated })
                              }}
                            />
                          )
                        })}
                      </div>

                      {/* Live preview strip */}
                      {trustBadges.badges.some(b => b.enabled) && (
                        <div className="mt-4">
                          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('branding.trustBadges.preview')}</div>
                          <div className="py-3.5 px-4 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl border border-gray-100 overflow-x-auto scrollbar-hide">
                            <div className="flex items-center justify-center gap-5 md:gap-8 min-w-max">
                              {trustBadges.badges.filter(b => b.enabled).map((badge) => (
                                <div key={badge.id} className="flex items-center gap-2.5 flex-shrink-0">
                                  <div className="w-8 h-8 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center text-[#2d6cb5]">
                                    <TrustBadgeIcon id={badge.id} />
                                  </div>
                                  <span className="text-xs font-semibold text-[#1e3a5f] whitespace-nowrap">
                                    {badge.text || getTrustBadgeText(badge.id, store.language || 'es')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Section 4: Social Proof */}
                <div className="border-t border-gray-100 pt-5 mt-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-[#1e3a5f]">{t('branding.socialProof.title')}</h3>
                      <p className="text-sm text-gray-500 mt-1">{t('branding.socialProof.description')}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-4">
                      <input
                        type="checkbox"
                        checked={socialProof.enabled}
                        disabled={store.plan === 'free'}
                        onChange={(e) => setSocialProof({ ...socialProof, enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className={`w-11 h-6 rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                        store.plan === 'free'
                          ? 'bg-gray-200 cursor-not-allowed'
                          : 'bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#38bdf8] peer-checked:after:translate-x-full peer-checked:after:border-white peer-checked:bg-gradient-to-r peer-checked:from-[#1e3a5f] peer-checked:to-[#2d6cb5]'
                      }`}></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Upgrade prompt (free only) */}
            {store.plan === 'free' && (
              <div className="flex items-center gap-3 p-3 bg-[#f0f7ff] rounded-xl mt-6">
                <svg className="w-5 h-5 text-[#2d6cb5] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <p className="text-sm text-[#1e3a5f]">
                  {t('branding.effects.upgradeMessage')}{' '}
                  <a href="/dashboard/plan" className="font-semibold text-[#2d6cb5] hover:underline">
                    {t('branding.effects.viewPlans')}
                  </a>
                </p>
              </div>
            )}

            {/* Save button - right aligned */}
            {store.plan !== 'free' && (
              <div className="flex justify-end mt-6">
                <button
                  onClick={handleSaveConversion}
                  disabled={savingConversion}
                  className="px-6 py-3 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white rounded-xl hover:from-[#2d6cb5] hover:to-[#38bdf8] transition-all font-semibold disabled:opacity-50 shadow-lg shadow-[#1e3a5f]/20"
                >
                  {savingConversion ? t('branding.saving') : t('branding.saveChanges')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Image Crop Modal */}
      {cropImage && (
        <ImageCropModal
          imageSrc={cropImage}
          onCrop={handleCropComplete}
          onCancel={handleCropCancel}
          aspectRatio={cropType === 'logo' ? 1 : cropType === 'heroDesktop' ? 16/5 : 3/2}
          title={t(cropType === 'logo' ? 'branding.logo.cropTitle' : 'branding.hero.cropTitle')}
          description={t(cropType === 'logo' ? 'branding.logo.cropDescription' : 'branding.hero.cropDescription')}
        />
      )}

      {/* Theme Preview Modal */}
      {previewTheme && store && (
        <ThemePreviewModal
          themeId={previewTheme}
          store={{
            ...store,
            logo,
            heroImage,
            heroImageMobile,
            announcement,
            trustBadges,
            themeId: previewTheme
          }}
          products={products}
          categories={categories}
          onClose={() => setPreviewTheme(null)}
          onSelect={async () => {
            try {
              await updateDoc(doc(db, 'stores', store.id), {
                themeId: previewTheme,
                updatedAt: new Date()
              })
              setSelectedTheme(previewTheme)
              setPreviewTheme(null)
              showToast(t('branding.theme.saved'), 'success')
            } catch (error) {
              console.error('Error saving theme:', error)
              showToast(t('branding.toast.error'), 'error')
            }
          }}
        />
      )}

      {/* Cover Selector Modal */}
      {showCoverSelector && (
        <CoverSelectorModal
          category={coverCategory}
          onCategoryChange={setCoverCategory}
          onSelect={handleSelectCover}
          onClose={() => setShowCoverSelector(false)}
        />
      )}
    </div>
  )
}

// Cover Selector Modal Component
interface CoverSelectorModalProps {
  category: CoverCategory
  onCategoryChange: (category: CoverCategory) => void
  onSelect: (url: string) => void
  onClose: () => void
}

function CoverSelectorModal({ category, onCategoryChange, onSelect, onClose }: CoverSelectorModalProps) {
  const { t } = useTranslation('dashboard')

  const categories: { id: CoverCategory; label: string }[] = [
    { id: 'restaurant', label: t('branding.hero.stockCategories.restaurant') },
    { id: 'bakery', label: t('branding.hero.stockCategories.bakery') },
    { id: 'beauty', label: t('branding.hero.stockCategories.beauty') },
    { id: 'fashion', label: t('branding.hero.stockCategories.fashion') },
    { id: 'pets', label: t('branding.hero.stockCategories.pets') },
    { id: 'grocery', label: t('branding.hero.stockCategories.grocery') },
    { id: 'tech', label: t('branding.hero.stockCategories.tech') },
  ]

  const images = COVER_IMAGES[category]

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <h3 className="text-lg font-semibold text-[#1e3a5f]">
            {t('branding.hero.selectCover')}
          </h3>
          <button
            onClick={onClose}
            className="p-2 -m-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Category tabs */}
        <div className="px-6 py-3 border-b border-gray-100 flex-shrink-0 overflow-x-auto">
          <div className="flex gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onCategoryChange(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  category === cat.id
                    ? 'bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Image grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {images.map((image) => (
              <button
                key={image.id}
                onClick={() => onSelect(image.url)}
                className="group relative aspect-[16/9] rounded-xl overflow-hidden border-2 border-transparent hover:border-[#2d6cb5] transition-all"
              >
                <img
                  src={image.url.replace('w=1920', 'w=400')}
                  alt={image.label}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="px-4 py-2 bg-white text-[#1e3a5f] rounded-lg font-medium text-sm">
                    {image.label}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            {t('branding.hero.close')}
          </button>
        </div>
      </div>
    </div>
  )
}

// Theme Preview Modal Component
interface ThemePreviewModalProps {
  themeId: string
  store: Store
  products: Product[]
  categories: Category[]
  onClose: () => void
  onSelect: () => Promise<void>
}

function ThemePreviewModal({ themeId, store, products, categories, onClose, onSelect }: ThemePreviewModalProps) {
  const { t } = useTranslation('dashboard')
  const [saving, setSaving] = useState(false)
  const ThemeComponent = getThemeComponent(themeId)
  const themeName = themes.find(th => th.id === themeId)?.name || themeId

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  const handleSelect = async () => {
    setSaving(true)
    await onSelect()
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col animate-fadeIn bg-white">
      {/* Full screen theme preview */}
      <div className="flex-1 overflow-auto">
        <ThemeComponent
          store={store}
          products={products}
          categories={categories}
        />
      </div>

      {/* Floating bottom bar - subtle pill design */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-2 px-2 py-2 bg-black/70 backdrop-blur-md rounded-full shadow-2xl border border-white/10">
          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            title={t('branding.theme.close')}
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Theme name */}
          <span className="text-white/80 text-sm px-2 hidden sm:block">
            {themeName}
          </span>

          {/* Divider */}
          <div className="w-px h-6 bg-white/20 hidden sm:block" />

          {/* Use theme button */}
          <button
            onClick={handleSelect}
            disabled={saving}
            className="px-4 py-2 bg-white text-gray-900 rounded-full hover:bg-gray-100 transition-all font-medium text-sm disabled:opacity-70 flex items-center gap-2"
          >
            {saving && (
              <div className="w-4 h-4 border-2 border-gray-400 border-t-gray-900 rounded-full animate-spin" />
            )}
            {saving ? t('branding.saving') : t('branding.theme.useTheme')}
          </button>
        </div>
      </div>
    </div>
  )
}

// Image Crop Modal Component - supports different aspect ratios
interface ImageCropModalProps {
  imageSrc: string
  onCrop: (blob: Blob) => void
  onCancel: () => void
  aspectRatio: number // width/height ratio: 1 for square, 16/5 for desktop hero, 3/2 for mobile hero
  title: string
  description: string
}

// Small icon component for trust badge preview in dashboard
function TrustBadgeIcon({ id }: { id: TrustBadgeId }) {
  const icons: Record<TrustBadgeId, JSX.Element> = {
    shipping: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>,
    secure: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>,
    returns: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" /></svg>,
    quality: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>,
    support: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" /></svg>,
    freeShipping: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>,
    natural: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    madeWithLove: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>,
  }
  return icons[id] || null
}

function TrustBadgeCard({ badgeId, badge, isDisabled, language, onToggle, onTextChange }: {
  badgeId: TrustBadgeId
  badge: { id: TrustBadgeId; enabled: boolean; text?: string } | undefined
  isDisabled: boolean
  language: string
  onToggle: () => void
  onTextChange: (text: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const isEnabled = badge?.enabled ?? true

  return (
    <div
      className={`relative rounded-2xl border-2 p-4 transition-all duration-200 ${
        isDisabled
          ? 'bg-gray-50 border-gray-100 opacity-50 cursor-not-allowed'
          : isEnabled
            ? 'bg-[#f0f7ff] border-[#2d6cb5]/30 shadow-sm'
            : 'bg-white border-gray-200 hover:border-gray-300 cursor-pointer'
      }`}
      onClick={() => {
        if (isDisabled || editing) return
        onToggle()
      }}
    >
      {/* Selected check */}
      {isEnabled && !isDisabled && (
        <div className="absolute top-2.5 right-2.5 w-5 h-5 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      {/* Icon */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors ${
        isEnabled && !isDisabled
          ? 'bg-gradient-to-br from-[#1e3a5f] to-[#2d6cb5] text-white'
          : 'bg-gray-100 text-gray-400'
      }`}>
        <TrustBadgeIcon id={badgeId} />
      </div>

      {/* Label / editable text */}
      {editing && isEnabled && !isDisabled ? (
        <input
          autoFocus
          type="text"
          value={badge?.text || ''}
          placeholder={getTrustBadgeText(badgeId, language)}
          onClick={(e) => e.stopPropagation()}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => { if (e.key === 'Enter') setEditing(false) }}
          onChange={(e) => onTextChange(e.target.value)}
          className="w-full text-sm font-medium text-[#1e3a5f] bg-white/80 border border-[#38bdf8]/30 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#38bdf8]/40"
        />
      ) : (
        <div className="flex items-center gap-1.5 min-h-[28px]">
          <span className={`text-sm font-medium leading-tight ${isEnabled && !isDisabled ? 'text-[#1e3a5f]' : 'text-gray-500'}`}>
            {badge?.text || getTrustBadgeText(badgeId, language)}
          </span>
          {isEnabled && !isDisabled && (
            <button
              onClick={(e) => { e.stopPropagation(); setEditing(true) }}
              className="p-0.5 text-[#38bdf8] hover:text-[#2d6cb5] transition-colors flex-shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function ImageCropModal({ imageSrc, onCrop, onCancel, aspectRatio, title, description }: ImageCropModalProps) {
  const { t } = useTranslation('dashboard')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [imageLoaded, setImageLoaded] = useState(false)

  // Calculate crop dimensions based on aspect ratio
  // Max width is 400px for wide images, height adjusts based on ratio
  const maxWidth = aspectRatio >= 1 ? 400 : 280
  const cropWidth = aspectRatio >= 1 ? maxWidth : Math.round(maxWidth * aspectRatio)
  const cropHeight = aspectRatio >= 1 ? Math.round(maxWidth / aspectRatio) : maxWidth

  // Output dimensions for different types
  const getOutputDimensions = () => {
    if (aspectRatio === 1) {
      return { width: 512, height: 512 } // Logo
    } else if (aspectRatio > 2) {
      return { width: 1920, height: Math.round(1920 / aspectRatio) } // Desktop hero (16:5 = 3.2)
    } else {
      return { width: 1200, height: Math.round(1200 / aspectRatio) } // Mobile hero (3:2 = 1.5)
    }
  }

  // Load image
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageRef.current = img

      // Calculate initial scale to cover crop area
      const scaleX = cropWidth / img.width
      const scaleY = cropHeight / img.height
      const initialScale = Math.max(scaleX, scaleY)
      setScale(initialScale)

      // Center image
      setPosition({
        x: (cropWidth - img.width * initialScale) / 2,
        y: (cropHeight - img.height * initialScale) / 2
      })

      setImageLoaded(true)
    }
    img.src = imageSrc
  }, [imageSrc, cropWidth, cropHeight])

  // Draw preview
  useEffect(() => {
    if (!canvasRef.current || !imageRef.current || !imageLoaded) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = '#f3f4f6'
    ctx.fillRect(0, 0, cropWidth, cropHeight)

    // Draw image
    const img = imageRef.current
    ctx.drawImage(
      img,
      position.x,
      position.y,
      img.width * scale,
      img.height * scale
    )
  }, [scale, position, imageLoaded, cropWidth, cropHeight])

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }, [position])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }, [isDragging, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    setIsDragging(true)
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y })
  }, [position])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return
    const touch = e.touches[0]
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    })
  }, [isDragging, dragStart])

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Zoom handlers
  const handleZoomIn = () => setScale(s => Math.min(s * 1.2, 5))
  const handleZoomOut = () => setScale(s => Math.max(s / 1.2, 0.1))

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    if (e.deltaY < 0) {
      setScale(s => Math.min(s * 1.1, 5))
    } else {
      setScale(s => Math.max(s / 1.1, 0.1))
    }
  }, [])

  // Generate cropped image
  const handleCrop = () => {
    if (!imageRef.current) return

    const { width: outputWidth, height: outputHeight } = getOutputDimensions()
    const outputCanvas = document.createElement('canvas')
    outputCanvas.width = outputWidth
    outputCanvas.height = outputHeight
    const ctx = outputCanvas.getContext('2d')
    if (!ctx) return

    // White/transparent background
    ctx.fillStyle = aspectRatio === 1 ? '#ffffff' : '#f3f4f6'
    ctx.fillRect(0, 0, outputWidth, outputHeight)

    // Calculate scale factor from preview to output
    const scaleFactorX = outputWidth / cropWidth
    const scaleFactorY = outputHeight / cropHeight

    // Draw image with same transform but scaled
    const img = imageRef.current
    ctx.drawImage(
      img,
      position.x * scaleFactorX,
      position.y * scaleFactorY,
      img.width * scale * scaleFactorX,
      img.height * scale * scaleFactorY
    )

    // Convert to blob (use JPEG for hero images for smaller file size)
    const format = aspectRatio === 1 ? 'image/png' : 'image/jpeg'
    const quality = aspectRatio === 1 ? 1 : 0.9
    outputCanvas.toBlob((blob) => {
      if (blob) onCrop(blob)
    }, format, quality)
  }

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-[#1e3a5f]">
            {title}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {description}
          </p>
        </div>

        {/* Crop area */}
        <div className="p-6 overflow-x-auto">
          <div
            ref={containerRef}
            className="relative mx-auto overflow-hidden rounded-xl bg-gray-100"
            style={{ width: cropWidth, height: cropHeight }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
          >
            <canvas
              ref={canvasRef}
              width={cropWidth}
              height={cropHeight}
              className="cursor-move"
            />

            {/* Overlay guide */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 border-2 border-[#2d6cb5] rounded-xl" />
              {/* Corner markers */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-[#2d6cb5] rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-[#2d6cb5] rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-[#2d6cb5] rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-[#2d6cb5] rounded-br-xl" />
            </div>

            {/* Loading indicator */}
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2d6cb5]" />
              </div>
            )}
          </div>

          {/* Zoom controls */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <button
              onClick={handleZoomOut}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              title={t('branding.logo.zoomOut', 'Alejar')}
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>

            <input
              type="range"
              min="0.1"
              max="3"
              step="0.01"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#2d6cb5]"
            />

            <button
              onClick={handleZoomIn}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              title={t('branding.logo.zoomIn', 'Acercar')}
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            {t('branding.logo.cancel', 'Cancelar')}
          </button>
          <button
            onClick={handleCrop}
            disabled={!imageLoaded}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white rounded-xl font-medium hover:from-[#2d6cb5] hover:to-[#38bdf8] transition-all disabled:opacity-50"
          >
            {t('branding.logo.apply', 'Aplicar')}
          </button>
        </div>
      </div>
    </div>
  )
}
