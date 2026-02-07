import { useState, useEffect } from 'react'
import { collection, query, where, getDocs, doc, updateDoc, setDoc, deleteDoc, getDoc } from 'firebase/firestore'
import { useTranslation } from 'react-i18next'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import { validateSubdomain, createSubdomain, deleteSubdomain } from '../../lib/subdomain'
import type { Store, StoreLocation, StoreShipping } from '../../types'
import { statesByCountry, stateLabel, phoneCodeByCountry, countries } from '../../data/states'
import {
  type BusinessType,
  getAllBusinessTypes,
  getBusinessTypeConfig,
  normalizeBusinessType,
} from '../../hooks/useBusinessType'
import BusinessTypeIcon from '../../components/ui/BusinessTypeIcon'

// Get currency symbol for display
const currencySymbols: Record<string, string> = {
  PEN: 'S/',
  USD: '$',
  MXN: '$',
  COP: '$',
  ARS: '$',
  CLP: '$',
  BRL: 'R$',
  EUR: '€',
  BOB: 'Bs',
  PYG: '₲',
  UYU: '$U',
  GTQ: 'Q',
  HNL: 'L',
  NIO: 'C$',
  CRC: '₡',
  DOP: 'RD$'
}

export default function Settings() {
  const { t } = useTranslation('dashboard')
  const { firebaseUser } = useAuth()
  const { showToast } = useToast()
  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Basic info
  const [name, setName] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [originalSubdomain, setOriginalSubdomain] = useState('')
  const [subdomainError, setSubdomainError] = useState('')
  const [savingSubdomain, setSavingSubdomain] = useState(false)
  const [whatsapp, setWhatsapp] = useState('')
  const [currency, setCurrency] = useState('PEN')
  const [language, setLanguage] = useState('es')
  const [businessType, setBusinessType] = useState<BusinessType>('general')

  // About
  const [slogan, setSlogan] = useState('')
  const [description, setDescription] = useState('')

  // Location
  const [location, setLocation] = useState<StoreLocation>({
    address: '',
    city: '',
    state: '',
    country: 'PE'
  })

  // Contact
  const [email, setEmail] = useState('')
  const [instagram, setInstagram] = useState('')
  const [facebook, setFacebook] = useState('')
  const [tiktok, setTiktok] = useState('')

  // Shipping
  const [shipping, setShipping] = useState<StoreShipping>({
    enabled: false,
    cost: 0,
    freeAbove: undefined,
    pickupEnabled: true,
    deliveryEnabled: true
  })

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

          // Basic
          setName(storeData.name || '')
          setSubdomain(storeData.subdomain || '')
          setOriginalSubdomain(storeData.subdomain || '')

          // Parse WhatsApp: strip country code prefix so we only show the local number
          const rawPhone = storeData.whatsapp || ''
          const storeCountry = storeData.location?.country || 'PE'
          const code = phoneCodeByCountry[storeCountry] || '+51'
          const digitsOnly = rawPhone.replace(/[^\d]/g, '')
          const codeDigits = code.replace('+', '')
          if (digitsOnly.startsWith(codeDigits)) {
            setWhatsapp(digitsOnly.slice(codeDigits.length))
          } else {
            setWhatsapp(digitsOnly)
          }

          setCurrency(storeData.currency || 'PEN')
          setLanguage(storeData.language || 'es')
          setBusinessType(normalizeBusinessType(storeData.businessType))

          // About
          setSlogan(storeData.about?.slogan || '')
          setDescription(storeData.about?.description || '')

          // Location
          if (storeData.location) {
            setLocation(storeData.location)
          }

          // Contact
          setEmail(storeData.email || '')
          setInstagram(storeData.instagram || '')
          setFacebook(storeData.facebook || '')
          setTiktok(storeData.tiktok || '')

          // Shipping
          if (storeData.shipping) {
            setShipping(storeData.shipping)
          }
        }
      } catch (error) {
        console.error('Error fetching store:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStore()
  }, [firebaseUser])

  const handleSave = async () => {
    if (!store) return

    setSaving(true)
    try {
      // Combine country code + local number
      const phoneCode = phoneCodeByCountry[location.country] || '+51'
      const fullWhatsapp = `${phoneCode}${whatsapp.replace(/[^\d]/g, '')}`

      await updateDoc(doc(db, 'stores', store.id), {
        name,
        whatsapp: fullWhatsapp,
        currency,
        language,
        businessType,
        about: {
          slogan: slogan || null,
          description: description || null
        },
        location,
        email: email || null,
        instagram: instagram || null,
        facebook: facebook || null,
        tiktok: tiktok || null,
        shipping: {
          enabled: shipping.enabled,
          cost: shipping.cost || 0,
          ...(shipping.freeAbove ? { freeAbove: shipping.freeAbove } : { freeAbove: null }),
          pickupEnabled: shipping.pickupEnabled !== false,
          deliveryEnabled: shipping.deliveryEnabled !== false,
          coverageMode: shipping.coverageMode || 'nationwide',
          ...(shipping.coverageMode === 'zones' && shipping.allowedZones?.length
            ? { allowedZones: shipping.allowedZones }
            : { allowedZones: null }),
          ...(shipping.localCost != null ? { localCost: shipping.localCost } : { localCost: null }),
          ...(shipping.nationalCost != null ? { nationalCost: shipping.nationalCost } : { nationalCost: null }),
        },
        updatedAt: new Date()
      })
      showToast(t('settings.toast.saved'), 'success')
    } catch (error) {
      console.error('Error saving settings:', error)
      showToast(t('settings.toast.error'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSubdomainChange = (value: string) => {
    // Normalize: lowercase, no spaces, only valid chars
    const normalized = value
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
    setSubdomain(normalized)
    setSubdomainError('')
  }

  const handleSubdomainSave = async () => {
    if (!store || subdomain === originalSubdomain) return

    // Validate format
    const validation = validateSubdomain(subdomain)
    if (validation !== true) {
      setSubdomainError(validation)
      return
    }

    setSavingSubdomain(true)
    setSubdomainError('')

    try {
      // Check if subdomain is already taken in Firestore
      const subdomainDoc = await getDoc(doc(db, 'subdomains', subdomain))
      if (subdomainDoc.exists()) {
        setSubdomainError(t('settings.subdomain.taken'))
        setSavingSubdomain(false)
        return
      }

      // 1. Create new subdomain in Vercel (non-blocking)
      try {
        await createSubdomain(subdomain)
      } catch (vercelError) {
        console.warn('[Settings] Error creating subdomain in Vercel:', vercelError)
        // Continue anyway - subdomain might already exist or Vercel will handle it
      }

      // 2. Update store document with new subdomain
      await updateDoc(doc(db, 'stores', store.id), {
        subdomain,
        updatedAt: new Date()
      })

      // 3. Create new subdomain document in Firestore
      await setDoc(doc(db, 'subdomains', subdomain), {
        storeId: store.id,
        createdAt: new Date()
      })

      // 4. Delete old subdomain document from Firestore
      if (originalSubdomain) {
        await deleteDoc(doc(db, 'subdomains', originalSubdomain))
      }

      // 5. Delete old subdomain from Vercel (non-blocking)
      if (originalSubdomain) {
        deleteSubdomain(originalSubdomain).catch(err => {
          console.warn('[Settings] Error deleting old subdomain from Vercel:', err)
        })
      }

      setOriginalSubdomain(subdomain)
      setStore({ ...store, subdomain })
      showToast(t('settings.subdomain.saved'), 'success')

    } catch (error) {
      console.error('Error changing subdomain:', error)
      showToast(t('settings.subdomain.error'), 'error')
    } finally {
      setSavingSubdomain(false)
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
        <h1 className="text-2xl font-bold text-[#1e3a5f]">{t('settings.title')}</h1>
        <p className="text-gray-600 mt-1">{t('settings.subtitle')}</p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">{t('settings.basic.title')}</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
                  {t('settings.basic.storeName')}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                />
              </div>

              {/* Subdomain */}
              <div>
                <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
                  {t('settings.subdomain.label')}
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={subdomain}
                      onChange={(e) => handleSubdomainChange(e.target.value)}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all ${
                        subdomainError ? 'border-red-300' : 'border-gray-200'
                      }`}
                      placeholder="mi-tienda"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                      .shopifree.app
                    </span>
                  </div>
                  {subdomain !== originalSubdomain && (
                    <button
                      onClick={handleSubdomainSave}
                      disabled={savingSubdomain || !subdomain}
                      className="px-4 py-3 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white rounded-xl hover:from-[#2d6cb5] hover:to-[#38bdf8] transition-all font-medium disabled:opacity-50 whitespace-nowrap"
                    >
                      {savingSubdomain ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        </span>
                      ) : (
                        t('settings.subdomain.change')
                      )}
                    </button>
                  )}
                </div>
                {subdomainError && (
                  <p className="text-sm text-red-500 mt-1">{subdomainError}</p>
                )}
                {!subdomainError && subdomain === originalSubdomain && (
                  <p className="text-xs text-gray-500 mt-1">
                    {t('settings.subdomain.hint')}
                  </p>
                )}
                {!subdomainError && subdomain !== originalSubdomain && (
                  <p className="text-xs text-amber-600 mt-1">
                    {t('settings.subdomain.warning')}
                  </p>
                )}
              </div>

              {/* Business Type Selection */}
              <div>
                <label className="block text-sm font-medium text-[#1e3a5f] mb-2">
                  {t('settings.basic.businessType')}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {getAllBusinessTypes().map((bt) => {
                    const lang = language === 'en' ? 'en' : language === 'pt' ? 'pt' : 'es'
                    const labels = bt.labels[lang]
                    const isSelected = businessType === bt.type
                    return (
                      <button
                        key={bt.type}
                        type="button"
                        onClick={() => setBusinessType(bt.type)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                          isSelected
                            ? 'border-[#38bdf8] bg-[#f0f7ff]'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className={isSelected ? 'text-[#1e3a5f]' : 'text-gray-500'}>
                          <BusinessTypeIcon type={bt.type} className="w-6 h-6" />
                        </span>
                        <span className={`text-xs font-medium text-center leading-tight ${
                          isSelected ? 'text-[#1e3a5f]' : 'text-gray-600'
                        }`}>
                          {labels.name.split(' / ')[0]}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
                    {t('settings.basic.currency')}
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                  >
                    <option value="PEN">{t('settings.basic.currencies.PEN')}</option>
                    <option value="USD">{t('settings.basic.currencies.USD')}</option>
                    <option value="MXN">{t('settings.basic.currencies.MXN')}</option>
                    <option value="COP">{t('settings.basic.currencies.COP')}</option>
                    <option value="ARS">{t('settings.basic.currencies.ARS')}</option>
                    <option value="CLP">{t('settings.basic.currencies.CLP')}</option>
                    <option value="BRL">{t('settings.basic.currencies.BRL')}</option>
                    <option value="EUR">{t('settings.basic.currencies.EUR')}</option>
                    <option value="BOB">{t('settings.basic.currencies.BOB')}</option>
                    <option value="PYG">{t('settings.basic.currencies.PYG')}</option>
                    <option value="UYU">{t('settings.basic.currencies.UYU')}</option>
                    <option value="GTQ">{t('settings.basic.currencies.GTQ')}</option>
                    <option value="HNL">{t('settings.basic.currencies.HNL')}</option>
                    <option value="NIO">{t('settings.basic.currencies.NIO')}</option>
                    <option value="CRC">{t('settings.basic.currencies.CRC')}</option>
                    <option value="DOP">{t('settings.basic.currencies.DOP')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
                  {t('settings.basic.language', 'Idioma de la tienda')}
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                >
                  <option value="es">Espanol</option>
                  <option value="en">English</option>
                  <option value="pt">Portugues</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {t('settings.basic.languageHint', 'Idioma de botones y textos de tu catalogo (Carrito, Agregar, etc.)')}
                </p>
              </div>

              {/* Business Type Features Preview */}
              {businessType && businessType !== 'general' && (
                <div className="mt-4 p-4 bg-gradient-to-br from-[#f0f7ff] to-white rounded-xl border border-[#38bdf8]/20">
                  <p className="text-sm font-medium text-[#1e3a5f] mb-2">
                    {t('settings.basic.featuresEnabled', 'Funciones habilitadas:')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const config = getBusinessTypeConfig(businessType)
                      const features = config.features
                      // Only show product-related features, not form field visibility options
                      const featureLabels: Record<string, string> = {
                        showModifiers: t('settings.basic.features.modifiers', 'Modificadores'),
                        showPrepTime: t('settings.basic.features.prepTime', 'Tiempo de preparacion'),
                        showVariants: t('settings.basic.features.variants', 'Variantes'),
                        showServiceDuration: t('settings.basic.features.duration', 'Duracion'),
                        showBookingCTA: t('settings.basic.features.booking', 'Boton de reserva'),
                        showCustomOrder: t('settings.basic.features.customOrder', 'Pedido personalizado'),
                        showLimitedStock: t('settings.basic.features.limitedStock', 'Stock limitado'),
                        showSpecs: t('settings.basic.features.specs', 'Especificaciones'),
                        showWarranty: t('settings.basic.features.warranty', 'Garantia'),
                        showModel: t('settings.basic.features.model', 'Modelo'),
                        showPetType: t('settings.basic.features.petType', 'Tipo de mascota'),
                        showPetAge: t('settings.basic.features.petAge', 'Edad de mascota'),
                        multipleImages: t('settings.basic.features.gallery', 'Galeria'),
                      }
                      return Object.entries(features)
                        .filter(([key, enabled]) => enabled && featureLabels[key])
                        .map(([feature]) => (
                          <span
                            key={feature}
                            className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-[#38bdf8]/10 text-[#1e3a5f] rounded-full"
                          >
                            {featureLabels[feature] || feature}
                          </span>
                        ))
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* About */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">{t('settings.about.title')}</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
                  {t('settings.about.slogan')}
                </label>
                <input
                  type="text"
                  value={slogan}
                  onChange={(e) => setSlogan(e.target.value)}
                  placeholder={t('settings.about.sloganPlaceholder')}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
                  {t('settings.about.description')}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder={t('settings.about.descriptionPlaceholder')}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Location */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">{t('settings.location.title')}</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
                    {t('settings.location.country')}
                  </label>
                  <select
                    value={location.country}
                    onChange={(e) => setLocation({ ...location, country: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                  >
                    {countries.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {language === 'en' ? c.name.en : c.name.es}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
                    {t('settings.location.city')}
                  </label>
                  <input
                    type="text"
                    value={location.city || ''}
                    onChange={(e) => setLocation({ ...location, city: e.target.value })}
                    placeholder={t('settings.location.cityPlaceholder')}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
                    {t('settings.location.state')}
                  </label>
                  {(statesByCountry[location.country] || []).length > 0 ? (
                    <select
                      value={location.state || ''}
                      onChange={(e) => setLocation({ ...location, state: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                    >
                      <option value="">{(stateLabel[location.country]?.es || t('settings.location.state')) + '...'}</option>
                      {(statesByCountry[location.country] || []).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={location.state || ''}
                      onChange={(e) => setLocation({ ...location, state: e.target.value })}
                      placeholder={t('settings.location.statePlaceholder')}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
                    {t('settings.location.address')}
                  </label>
                  <input
                    type="text"
                    value={location.address || ''}
                    onChange={(e) => setLocation({ ...location, address: e.target.value })}
                    placeholder={t('settings.location.addressPlaceholder')}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Shipping / Delivery Methods */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">{t('settings.shipping.title')}</h2>

            <div className="space-y-4">
              {/* Pickup toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-[#1e3a5f]">{t('settings.shipping.pickupEnabled')}</p>
                  <p className="text-sm text-gray-500">{t('settings.shipping.pickupHint')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newPickup = !(shipping.pickupEnabled !== false)
                    if (!newPickup && shipping.deliveryEnabled === false) return
                    setShipping({ ...shipping, pickupEnabled: newPickup })
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    shipping.pickupEnabled !== false ? 'bg-[#38bdf8]' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
                      shipping.pickupEnabled !== false ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Delivery toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-[#1e3a5f]">{t('settings.shipping.deliveryEnabled')}</p>
                  <p className="text-sm text-gray-500">{t('settings.shipping.deliveryHint')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newDelivery = !(shipping.deliveryEnabled !== false)
                    if (!newDelivery && shipping.pickupEnabled === false) return
                    setShipping({ ...shipping, deliveryEnabled: newDelivery })
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    shipping.deliveryEnabled !== false ? 'bg-[#38bdf8]' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
                      shipping.deliveryEnabled !== false ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Validation message */}
              {shipping.pickupEnabled === false && shipping.deliveryEnabled === false && (
                <p className="text-sm text-red-500">{t('settings.shipping.atLeastOneMethod')}</p>
              )}

              {/* Shipping cost toggle - only relevant if delivery is enabled */}
              {shipping.deliveryEnabled !== false && (
                <>
                  <hr className="border-gray-100" />

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[#1e3a5f]">{t('settings.shipping.enableLabel')}</p>
                      <p className="text-sm text-gray-500">{t('settings.shipping.enableHint')}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShipping({ ...shipping, enabled: !shipping.enabled })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        shipping.enabled ? 'bg-[#38bdf8]' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
                          shipping.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Shipping cost */}
                  {shipping.enabled && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
                          {t('settings.shipping.cost')}
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                            {currencySymbols[currency] || '$'}
                          </span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={shipping.cost || ''}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9.]/g, '')
                              setShipping({ ...shipping, cost: parseFloat(val) || 0 })
                            }}
                            placeholder="0.00"
                            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{t('settings.shipping.costHint')}</p>
                      </div>

                      {/* Free shipping above */}
                      <div>
                        <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
                          {t('settings.shipping.freeAbove')}
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                            {currencySymbols[currency] || '$'}
                          </span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={shipping.freeAbove || ''}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9.]/g, '')
                              setShipping({
                                ...shipping,
                                freeAbove: val ? parseFloat(val) : undefined
                              })
                            }}
                            placeholder={t('settings.shipping.freeAbovePlaceholder')}
                            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{t('settings.shipping.freeAboveHint')}</p>
                      </div>

                      <hr className="border-gray-100" />

                      {/* Coverage mode selector */}
                      <div>
                        <label className="block text-sm font-medium text-[#1e3a5f] mb-2">
                          {t('settings.shipping.coverageMode', 'Cobertura de envio')}
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['nationwide', 'zones', 'local'] as const).map((mode) => {
                            const labels = {
                              nationwide: t('settings.shipping.coverageNationwide', 'Nacional'),
                              zones: t('settings.shipping.coverageZones', 'Zonas'),
                              local: t('settings.shipping.coverageLocal', 'Local')
                            }
                            const hints = {
                              nationwide: t('settings.shipping.coverageNationwideHint', 'Todo el pais'),
                              zones: t('settings.shipping.coverageZonesHint', 'Solo algunas zonas'),
                              local: t('settings.shipping.coverageLocalHint', 'Solo tu ciudad')
                            }
                            const isSelected = (shipping.coverageMode || 'nationwide') === mode
                            return (
                              <button
                                key={mode}
                                type="button"
                                onClick={() => setShipping({ ...shipping, coverageMode: mode })}
                                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center ${
                                  isSelected
                                    ? 'border-[#38bdf8] bg-[#f0f7ff]'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <span className={`text-sm font-medium ${isSelected ? 'text-[#1e3a5f]' : 'text-gray-600'}`}>
                                  {labels[mode]}
                                </span>
                                <span className={`text-xs ${isSelected ? 'text-[#1e3a5f]/70' : 'text-gray-400'}`}>
                                  {hints[mode]}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Zone selector - only for 'zones' mode */}
                      {(shipping.coverageMode === 'zones') && (statesByCountry[location.country] || []).length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-[#1e3a5f]">
                              {t('settings.shipping.selectZones', 'Zonas de envio')}
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                const allStates = statesByCountry[location.country] || []
                                const allSelected = (shipping.allowedZones || []).length === allStates.length
                                setShipping({
                                  ...shipping,
                                  allowedZones: allSelected ? [] : [...allStates]
                                })
                              }}
                              className="text-xs text-[#38bdf8] hover:text-[#1e3a5f] font-medium"
                            >
                              {(shipping.allowedZones || []).length === (statesByCountry[location.country] || []).length
                                ? t('settings.shipping.deselectAll', 'Deseleccionar todos')
                                : t('settings.shipping.selectAll', 'Seleccionar todos')
                              }
                            </button>
                          </div>
                          <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-3 space-y-1">
                            {(statesByCountry[location.country] || []).map((state) => {
                              const isChecked = (shipping.allowedZones || []).includes(state)
                              return (
                                <label key={state} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-gray-50 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      const current = shipping.allowedZones || []
                                      const updated = isChecked
                                        ? current.filter((z) => z !== state)
                                        : [...current, state]
                                      setShipping({ ...shipping, allowedZones: updated })
                                    }}
                                    className="rounded border-gray-300 text-[#38bdf8] focus:ring-[#38bdf8]"
                                  />
                                  <span className="text-sm text-gray-700">{state}</span>
                                  {state === location.state && (
                                    <span className="text-xs text-[#38bdf8] font-medium ml-auto">
                                      {t('settings.shipping.yourZone', 'Tu zona')}
                                    </span>
                                  )}
                                </label>
                              )
                            })}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {(shipping.allowedZones || []).length} {t('settings.shipping.zonesSelected', 'zonas seleccionadas')}
                          </p>
                        </div>
                      )}

                      {/* Differentiated costs - only for 'zones' mode */}
                      {(shipping.coverageMode === 'zones') && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
                              {t('settings.shipping.localCost', 'Costo envio local')}
                            </label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                                {currencySymbols[currency] || '$'}
                              </span>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={shipping.localCost ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9.]/g, '')
                                  setShipping({ ...shipping, localCost: val ? parseFloat(val) : undefined })
                                }}
                                placeholder="0.00"
                                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {t('settings.shipping.localCostHint', 'Envios dentro de tu zona')}
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
                              {t('settings.shipping.nationalCost', 'Costo envio nacional')}
                            </label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                                {currencySymbols[currency] || '$'}
                              </span>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={shipping.nationalCost ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9.]/g, '')
                                  setShipping({ ...shipping, nationalCost: val ? parseFloat(val) : undefined })
                                }}
                                placeholder="0.00"
                                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {t('settings.shipping.nationalCostHint', 'Envios a otras zonas')}
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Contact */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">{t('settings.contact.title')}</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
                    WhatsApp
                  </label>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium shrink-0">
                      <span>{countries.find(c => c.code === location.country)?.flag}</span>
                      <span>{phoneCodeByCountry[location.country] || '+51'}</span>
                    </div>
                    <input
                      type="tel"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value.replace(/[^\d]/g, ''))}
                      placeholder="999888777"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
                    {t('settings.contact.email')}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('settings.contact.emailPlaceholder')}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
                    {t('settings.contact.instagram')}
                  </label>
                  <input
                    type="text"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder={t('settings.contact.instagramPlaceholder')}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
                    {t('settings.contact.facebook')}
                  </label>
                  <input
                    type="text"
                    value={facebook}
                    onChange={(e) => setFacebook(e.target.value)}
                    placeholder={t('settings.contact.facebookPlaceholder')}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
                    {t('settings.contact.tiktok')}
                  </label>
                  <input
                    type="text"
                    value={tiktok}
                    onChange={(e) => setTiktok(e.target.value)}
                    placeholder={t('settings.contact.tiktokPlaceholder')}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white rounded-xl hover:from-[#2d6cb5] hover:to-[#38bdf8] transition-all font-semibold disabled:opacity-50 shadow-lg shadow-[#1e3a5f]/20"
        >
          {saving ? t('settings.saving') : t('settings.saveChanges')}
        </button>
      </div>
    </div>
  )
}
