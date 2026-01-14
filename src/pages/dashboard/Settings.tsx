import { useState, useEffect } from 'react'
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore'
import { useTranslation } from 'react-i18next'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import type { Store, StoreLocation } from '../../types'

export default function Settings() {
  const { t } = useTranslation('dashboard')
  const { firebaseUser } = useAuth()
  const { showToast } = useToast()
  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Basic info
  const [name, setName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [currency, setCurrency] = useState('PEN')
  const [language, setLanguage] = useState('es')
  const [businessType, setBusinessType] = useState<Store['businessType']>('retail')

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
          setWhatsapp(storeData.whatsapp || '')
          setCurrency(storeData.currency || 'PEN')
          setLanguage(storeData.language || 'es')
          setBusinessType(storeData.businessType || 'retail')

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
      await updateDoc(doc(db, 'stores', store.id), {
        name,
        whatsapp,
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
                    {t('settings.basic.businessType')}
                  </label>
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value as Store['businessType'])}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                  >
                    <option value="retail">{t('settings.basic.businessTypes.retail')}</option>
                    <option value="restaurant">{t('settings.basic.businessTypes.restaurant')}</option>
                    <option value="services">{t('settings.basic.businessTypes.services')}</option>
                    <option value="other">{t('settings.basic.businessTypes.other')}</option>
                  </select>
                </div>

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
                    <option value="PE">{t('settings.location.countries.PE')}</option>
                    <option value="MX">{t('settings.location.countries.MX')}</option>
                    <option value="CO">{t('settings.location.countries.CO')}</option>
                    <option value="AR">{t('settings.location.countries.AR')}</option>
                    <option value="CL">{t('settings.location.countries.CL')}</option>
                    <option value="EC">{t('settings.location.countries.EC')}</option>
                    <option value="VE">{t('settings.location.countries.VE')}</option>
                    <option value="US">{t('settings.location.countries.US')}</option>
                    <option value="ES">{t('settings.location.countries.ES')}</option>
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
                  <input
                    type="text"
                    value={location.state || ''}
                    onChange={(e) => setLocation({ ...location, state: e.target.value })}
                    placeholder={t('settings.location.statePlaceholder')}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                  />
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

          {/* Contact */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">{t('settings.contact.title')}</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
                    {t('settings.contact.whatsapp')}
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </span>
                    <input
                      type="tel"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder={t('settings.contact.whatsappPlaceholder')}
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
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
