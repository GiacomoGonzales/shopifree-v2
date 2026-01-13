import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import type { User } from '../../types'

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export default function Account() {
  const { t } = useTranslation('dashboard')
  const { firebaseUser } = useAuth()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // Personal data
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [avatar, setAvatar] = useState('')

  // Company data
  const [companyName, setCompanyName] = useState('')
  const [taxId, setTaxId] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [companyCity, setCompanyCity] = useState('')
  const [companyCountry, setCompanyCountry] = useState('')

  useEffect(() => {
    const fetchUserData = async () => {
      if (!firebaseUser) return

      try {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data() as User
          setFirstName(userData.firstName || '')
          setLastName(userData.lastName || '')
          setPhone(userData.phone || '')
          setAvatar(userData.avatar || '')
          if (userData.company) {
            setCompanyName(userData.company.name || '')
            setTaxId(userData.company.taxId || '')
            setCompanyAddress(userData.company.address || '')
            setCompanyCity(userData.company.city || '')
            setCompanyCountry(userData.company.country || '')
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [firebaseUser])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingAvatar(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
      formData.append('folder', 'shopifree/avatars')

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      )

      if (!response.ok) throw new Error('Upload failed')
      const data = await response.json()
      setAvatar(data.secure_url)
    } catch (error) {
      console.error('Error uploading avatar:', error)
      showToast(t('account.toast.avatarError'), 'error')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSave = async () => {
    if (!firebaseUser) return

    setSaving(true)
    try {
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        id: firebaseUser.uid,
        email: firebaseUser.email,
        firstName: firstName || null,
        lastName: lastName || null,
        phone: phone || null,
        avatar: avatar || null,
        company: {
          name: companyName || null,
          taxId: taxId || null,
          address: companyAddress || null,
          city: companyCity || null,
          country: companyCountry || null
        },
        updatedAt: new Date()
      }, { merge: true })
      showToast(t('account.toast.saved'), 'success')
    } catch (error) {
      console.error('Error saving user data:', error)
      showToast(t('account.toast.error'), 'error')
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
          <h1 className="text-2xl font-bold text-[#1e3a5f]">{t('account.title')}</h1>
          <p className="text-gray-600 mt-1">{t('account.subtitle')}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white rounded-xl hover:from-[#2d6cb5] hover:to-[#38bdf8] transition-all font-semibold disabled:opacity-50 shadow-lg shadow-[#1e3a5f]/20"
        >
          {saving ? t('account.saving') : t('account.saveChanges')}
        </button>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left Column - Personal Data */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm h-fit">
          <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">{t('account.personal.title')}</h2>

          {/* Avatar */}
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
            <div
              onClick={() => avatarInputRef.current?.click()}
              className="w-16 h-16 bg-gradient-to-br from-[#38bdf8] to-[#2d6cb5] rounded-2xl overflow-hidden cursor-pointer hover:opacity-90 transition-all flex items-center justify-center shadow-lg shadow-[#38bdf8]/20 flex-shrink-0"
            >
              {uploadingAvatar ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : avatar ? (
                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-white">
                  {firstName?.[0]?.toUpperCase() || firebaseUser?.email?.[0]?.toUpperCase() || '?'}
                </span>
              )}
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
            <div>
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="text-sm font-medium text-[#2d6cb5] hover:text-[#1e3a5f]"
              >
                {t('account.personal.changePhoto')}
              </button>
              {avatar && (
                <button
                  onClick={() => setAvatar('')}
                  className="block text-sm text-red-600 hover:text-red-700 mt-1"
                >
                  {t('account.personal.removePhoto')}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1e3a5f] mb-1">{t('account.personal.firstName')}</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={t('account.personal.firstNamePlaceholder')}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1e3a5f] mb-1">{t('account.personal.lastName')}</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={t('account.personal.lastNamePlaceholder')}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1e3a5f] mb-1">{t('account.personal.email')}</label>
                <input
                  type="email"
                  value={firebaseUser?.email || ''}
                  disabled
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1e3a5f] mb-1">{t('account.personal.phone')}</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t('account.personal.phonePlaceholder')}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Billing Data */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm h-fit">
          <h2 className="text-lg font-semibold text-[#1e3a5f] mb-1">{t('account.billing.title')}</h2>
          <p className="text-sm text-gray-600 mb-4">{t('account.billing.subtitle')}</p>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1e3a5f] mb-1">{t('account.billing.companyName')}</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder={t('account.billing.companyNamePlaceholder')}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1e3a5f] mb-1">{t('account.billing.taxId')}</label>
                <input
                  type="text"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder={t('account.billing.taxIdPlaceholder')}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1e3a5f] mb-1">{t('account.billing.address')}</label>
              <input
                type="text"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                placeholder={t('account.billing.addressPlaceholder')}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1e3a5f] mb-1">{t('account.billing.city')}</label>
                <input
                  type="text"
                  value={companyCity}
                  onChange={(e) => setCompanyCity(e.target.value)}
                  placeholder={t('account.billing.cityPlaceholder')}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1e3a5f] mb-1">{t('account.billing.country')}</label>
                <select
                  value={companyCountry}
                  onChange={(e) => setCompanyCountry(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                >
                  <option value="">{t('account.billing.selectCountry')}</option>
                  <option value="PE">{t('account.billing.countries.PE')}</option>
                  <option value="MX">{t('account.billing.countries.MX')}</option>
                  <option value="CO">{t('account.billing.countries.CO')}</option>
                  <option value="AR">{t('account.billing.countries.AR')}</option>
                  <option value="CL">{t('account.billing.countries.CL')}</option>
                  <option value="EC">{t('account.billing.countries.EC')}</option>
                  <option value="VE">{t('account.billing.countries.VE')}</option>
                  <option value="US">{t('account.billing.countries.US')}</option>
                  <option value="ES">{t('account.billing.countries.ES')}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security - Full Width */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[#1e3a5f] mb-1">{t('account.security.title')}</h2>
            <p className="text-sm text-gray-600">{t('account.security.subtitle')}</p>
          </div>
          <button
            onClick={() => showToast(t('account.toast.comingSoon'), 'info')}
            className="w-full sm:w-auto px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium text-sm flex-shrink-0"
          >
            {t('account.security.changePassword')}
          </button>
        </div>
      </div>
    </div>
  )
}
