import { useState, useEffect, useRef } from 'react'
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingLogo(true)
    try {
      const url = await uploadImage(file, 'logos')
      setLogo(url)
    } catch (error) {
      console.error('Error uploading logo:', error)
      showToast(t('branding.toast.logoError'), 'error')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingHero(true)
    try {
      const url = await uploadImage(file, 'heroes', true)
      setHeroImage(url)
    } catch (error) {
      console.error('Error uploading hero:', error)
      showToast(t('branding.toast.imageError'), 'error')
    } finally {
      setUploadingHero(false)
    }
  }

  const handleHeroMobileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingHeroMobile(true)
    try {
      const url = await uploadImage(file, 'heroes', true)
      setHeroImageMobile(url)
    } catch (error) {
      console.error('Error uploading hero mobile:', error)
      showToast(t('branding.toast.imageError'), 'error')
    } finally {
      setUploadingHeroMobile(false)
    }
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
                onChange={handleLogoUpload}
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
                onChange={handleHeroUpload}
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
                onChange={handleHeroMobileUpload}
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
        <p className="text-sm text-gray-600 mb-6">
          {t('branding.theme.description')}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {themes.map((theme) => {
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
                      {theme.isNew && (
                        <span className="px-1.5 py-0.5 bg-gradient-to-r from-[#38bdf8] to-[#2d6cb5] text-white text-[10px] font-bold rounded-full">
                          NEW
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
          onSelect={() => {
            setSelectedTheme(previewTheme)
            setPreviewTheme(null)
            showToast(t('branding.theme.selected'), 'success')
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
  onSelect: () => void
}

function ThemePreviewModal({ themeId, store, products, categories, onClose, onSelect }: ThemePreviewModalProps) {
  const { t } = useTranslation('dashboard')
  const ThemeComponent = getThemeComponent(themeId)
  const themeName = themes.find(th => th.id === themeId)?.name || themeId

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

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
            onClick={onSelect}
            className="px-4 py-2 bg-white text-gray-900 rounded-full hover:bg-gray-100 transition-all font-medium text-sm"
          >
            {t('branding.theme.useTheme')}
          </button>
        </div>
      </div>
    </div>
  )
}
