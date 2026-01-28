import { useState, useEffect, useRef, useCallback } from 'react'
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore'
import { useTranslation } from 'react-i18next'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import { themes } from '../../themes'
import { getThemeComponent } from '../../themes/components'
import type { Store, StoreAnnouncement, Product, Category } from '../../types'

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export default function Branding() {
  const { t } = useTranslation('dashboard')
  const { firebaseUser } = useAuth()
  const { showToast } = useToast()
  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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

  // Theme Preview
  const [previewTheme, setPreviewTheme] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  // Theme category filter
  const [themeCategoryFilter, setThemeCategoryFilter] = useState<string>('all')

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

      // Update appropriate state
      if (currentCropType === 'logo') {
        setLogo(url)
      } else if (currentCropType === 'heroDesktop') {
        setHeroImage(url)
      } else {
        setHeroImageMobile(url)
      }
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

  const handleSave = async () => {
    if (!store) return

    setSaving(true)
    try {
      await updateDoc(doc(db, 'stores', store.id), {
        logo: logo || null,
        heroImage: heroImage || null,
        heroImageMobile: heroImageMobile || null,
        themeId: selectedTheme,
        announcement,
        updatedAt: new Date()
      })
      showToast(t('branding.toast.saved'), 'success')
    } catch (error) {
      console.error('Error saving:', error)
      showToast(t('branding.toast.error'), 'error')
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1e3a5f]">{t('branding.title')}</h1>
        <p className="text-gray-600 mt-1">{t('branding.subtitle')}</p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Logo */}
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
                    onClick={() => setLogo('')}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    {t('branding.logo.delete')}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Announcement Bar */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#1e3a5f]">{t('branding.announcement.title')}</h2>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={announcement.enabled}
                  onChange={(e) => setAnnouncement({ ...announcement, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#38bdf8] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-[#1e3a5f] peer-checked:to-[#2d6cb5]"></div>
              </label>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              {t('branding.announcement.description')}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1e3a5f] mb-1">{t('branding.announcement.message')}</label>
                <input
                  type="text"
                  value={announcement.text}
                  onChange={(e) => setAnnouncement({ ...announcement, text: e.target.value })}
                  placeholder={t('branding.announcement.messagePlaceholder')}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1e3a5f] mb-1">{t('branding.announcement.link')}</label>
                <input
                  type="url"
                  value={announcement.link || ''}
                  onChange={(e) => setAnnouncement({ ...announcement, link: e.target.value })}
                  placeholder={t('branding.announcement.linkPlaceholder')}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
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

              {/* Preview */}
              {announcement.enabled && announcement.text && (
                <div>
                  <label className="block text-sm font-medium text-[#1e3a5f] mb-2">{t('branding.announcement.preview')}</label>
                  <div
                    className="py-2.5 px-4 text-center text-sm font-medium rounded-lg"
                    style={{
                      backgroundColor: announcement.backgroundColor,
                      color: announcement.textColor
                    }}
                  >
                    {announcement.text}
                  </div>
                </div>
              )}
            </div>
          </div>
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
                  onClick={() => setHeroImage('')}
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
                  onClick={() => setHeroImageMobile('')}
                  className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  {t('branding.hero.delete')}
                </button>
              )}
            </div>
          </div>

          {/* Tip */}
          <div className="mt-6 p-3 bg-[#f0f7ff] rounded-xl">
            <p className="text-xs text-[#1e3a5f]">
              <span className="font-medium">{t('branding.hero.tip')}</span> {t('branding.hero.tipText')}
            </p>
          </div>
        </div>
      </div>

      {/* Theme Selector - Full Width */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#1e3a5f] mb-2">{t('branding.theme.title')}</h2>
        <p className="text-sm text-gray-600 mb-4">
          {t('branding.theme.description')}
        </p>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { id: 'all', label: t('branding.theme.categories.all'), icon: (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            )},
            { id: 'retail', label: t('branding.theme.categories.retail'), icon: (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            )},
            { id: 'restaurant', label: t('branding.theme.categories.restaurant'), icon: (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20M21 15V2v0a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )},
            { id: 'tech', label: t('branding.theme.categories.tech'), icon: (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            )},
            { id: 'cosmetics', label: t('branding.theme.categories.cosmetics'), icon: (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
              </svg>
            )},
            { id: 'grocery', label: t('branding.theme.categories.grocery'), icon: (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            )},
            { id: 'pets', label: t('branding.theme.categories.pets'), icon: (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2m0-4c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2m4 4c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2m-8 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2m4 8c-2.5 0-4.5 1.5-4.5 3.5 0 1.1.9 2 2 2h5c1.1 0 2-.9 2-2 0-2-2-3.5-4.5-3.5"/>
              </svg>
            )}
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setThemeCategoryFilter(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                themeCategoryFilter === cat.id
                  ? 'bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.icon}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {themes
            .filter((theme) => themeCategoryFilter === 'all' || theme.category === themeCategoryFilter || theme.category === 'all')
            .map((theme) => {
            const isSelected = selectedTheme === theme.id
            return (
              <div
                key={theme.id}
                className={`relative rounded-2xl overflow-hidden border-2 transition-all group ${
                  isSelected
                    ? 'border-[#2d6cb5] ring-2 ring-[#38bdf8]/30'
                    : 'border-gray-200 hover:border-[#38bdf8]/50'
                }`}
              >
                {/* Theme Preview Card */}
                <button
                  onClick={() => setSelectedTheme(theme.id)}
                  className="w-full text-left"
                >
                  {/* Theme Preview */}
                  <div
                    className="aspect-[3/4] p-3 flex flex-col relative"
                    style={{ backgroundColor: theme.colors?.background || '#ffffff' }}
                  >
                    {/* Mini header */}
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className="w-6 h-2 rounded-full"
                        style={{ backgroundColor: theme.colors?.primary || '#000' }}
                      />
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: theme.colors?.accent || '#666' }}
                      />
                    </div>
                    {/* Mini product grid */}
                    <div className="flex-1 grid grid-cols-2 gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="rounded aspect-square"
                          style={{
                            backgroundColor: theme.colors?.primary
                              ? `${theme.colors.primary}15`
                              : '#f3f4f6'
                          }}
                        />
                      ))}
                    </div>
                    {/* Mini footer */}
                    <div className="mt-2 flex items-center gap-1">
                      <div
                        className="flex-1 h-2 rounded-full"
                        style={{ backgroundColor: theme.colors?.primary || '#000' }}
                      />
                      <div
                        className="w-6 h-6 rounded-lg"
                        style={{ backgroundColor: theme.colors?.accent || '#666' }}
                      />
                    </div>

                    {/* Preview overlay on hover */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span
                        onClick={(e) => {
                          e.stopPropagation()
                          setPreviewTheme(theme.id)
                        }}
                        className="px-4 py-2 bg-white text-[#1e3a5f] text-sm font-semibold rounded-lg hover:bg-gray-100 transition-colors cursor-pointer flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        {t('branding.theme.preview')}
                      </span>
                    </div>
                  </div>

                  {/* Theme Info */}
                  <div className="p-3 bg-white border-t border-gray-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm text-[#1e3a5f]">{theme.name}</span>
                      <div className="flex items-center gap-1">
                        {theme.isNew && (
                          <span className="px-1.5 py-0.5 bg-gradient-to-r from-[#38bdf8] to-[#2d6cb5] text-white text-[10px] font-bold rounded-full">
                            NEW
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Category Badge */}
                    <div className="flex items-center gap-1 mb-1">
                      {theme.category === 'restaurant' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#1e3a5f]/10 text-[#1e3a5f] text-[10px] font-medium rounded">
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20M21 15V2v0a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          {t('branding.theme.categories.restaurant')}
                        </span>
                      )}
                      {theme.category === 'tech' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#1e3a5f]/10 text-[#1e3a5f] text-[10px] font-medium rounded">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {t('branding.theme.categories.tech')}
                        </span>
                      )}
                      {theme.category === 'retail' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#1e3a5f]/10 text-[#1e3a5f] text-[10px] font-medium rounded">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                          </svg>
                          {t('branding.theme.categories.retail')}
                        </span>
                      )}
                      {theme.category === 'all' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-medium rounded">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                          </svg>
                          {t('branding.theme.categories.general')}
                        </span>
                      )}
                      {theme.category === 'cosmetics' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#1e3a5f]/10 text-[#1e3a5f] text-[10px] font-medium rounded">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
                          </svg>
                          {t('branding.theme.categories.cosmetics')}
                        </span>
                      )}
                      {theme.category === 'grocery' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#1e3a5f]/10 text-[#1e3a5f] text-[10px] font-medium rounded">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                          </svg>
                          {t('branding.theme.categories.grocery')}
                        </span>
                      )}
                      {theme.category === 'pets' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#1e3a5f]/10 text-[#1e3a5f] text-[10px] font-medium rounded">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2m0-4c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2m4 4c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2m-8 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2m4 8c-2.5 0-4.5 1.5-4.5 3.5 0 1.1.9 2 2 2h5c1.1 0 2-.9 2-2 0-2-2-3.5-4.5-3.5"/>
                          </svg>
                          {t('branding.theme.categories.pets')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2">{theme.description}</p>
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

      {/* Save Button */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white rounded-xl hover:from-[#2d6cb5] hover:to-[#38bdf8] transition-all font-semibold disabled:opacity-50 shadow-lg shadow-[#1e3a5f]/20"
        >
          {saving ? t('branding.saving') : t('branding.saveChanges')}
        </button>
      </div>

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
    <div className="fixed inset-0 z-50 flex flex-col animate-fadeIn">
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
