import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Capacitor } from '@capacitor/core'
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore'
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, verifyBeforeUpdateEmail, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { auth } from '../../lib/firebase'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import { useToast } from '../../components/ui/Toast'
import { PLAN_FEATURES, type PlanType } from '../../lib/stripe'
import type { User } from '../../types'

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export default function Account() {
  const { t } = useTranslation('dashboard')
  const { localePath } = useLanguage()
  const { firebaseUser, store } = useAuth()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // Personal data
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [avatar, setAvatar] = useState('')

  // Password change
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  // Email change
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [changingEmail, setChangingEmail] = useState(false)

  const isGoogleUser = firebaseUser?.providerData?.some(p => p.providerId === 'google.com') && !firebaseUser?.providerData?.some(p => p.providerId === 'password')

  // Usage stats
  const [productCount, setProductCount] = useState(0)
  const [categoryCount, setCategoryCount] = useState(0)
  const [loadingUsage, setLoadingUsage] = useState(true)

  // Subscription data
  const currentPlan = (store?.plan || 'free') as PlanType
  const planInfo = PLAN_FEATURES[currentPlan]
  const subscription = store?.subscription
  const hasActiveSubscription = subscription?.status === 'active'
  const limits = planInfo.limits

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
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [firebaseUser])

  // Fetch usage stats
  useEffect(() => {
    async function fetchUsage() {
      if (!store?.id) return
      try {
        const productsRef = collection(db, 'stores', store.id, 'products')
        const productsSnap = await getDocs(productsRef)
        setProductCount(productsSnap.size)

        const categoriesRef = collection(db, 'stores', store.id, 'categories')
        const categoriesSnap = await getDocs(categoriesRef)
        setCategoryCount(categoriesSnap.size)
      } catch (error) {
        console.error('Error fetching usage:', error)
      } finally {
        setLoadingUsage(false)
      }
    }
    fetchUsage()
  }, [store?.id])

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

  const handleChangePassword = async () => {
    if (!firebaseUser) return

    if (newPassword.length < 6) {
      showToast(t('account.security.passwordTooShort'), 'error')
      return
    }
    if (newPassword !== confirmPassword) {
      showToast(t('account.security.passwordMismatch'), 'error')
      return
    }

    setChangingPassword(true)
    try {
      const credential = EmailAuthProvider.credential(firebaseUser.email!, currentPassword)
      await reauthenticateWithCredential(firebaseUser, credential)
      await updatePassword(firebaseUser, newPassword)
      showToast(t('account.security.passwordChanged'), 'success')
      setShowPasswordForm(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        showToast(t('account.security.wrongPassword'), 'error')
      } else {
        showToast(t('account.toast.error'), 'error')
      }
    } finally {
      setChangingPassword(false)
    }
  }

  const handleChangeEmail = async () => {
    if (!firebaseUser || !newEmail) return

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) {
      showToast(t('account.security.invalidEmail'), 'error')
      return
    }

    if (newEmail === firebaseUser.email) {
      showToast(t('account.security.sameEmail'), 'error')
      return
    }

    setChangingEmail(true)
    try {
      // Re-authenticate based on provider
      if (isGoogleUser) {
        const provider = new GoogleAuthProvider()
        await signInWithPopup(auth, provider)
      } else {
        const credential = EmailAuthProvider.credential(firebaseUser.email!, emailPassword)
        await reauthenticateWithCredential(firebaseUser, credential)
      }

      await verifyBeforeUpdateEmail(firebaseUser, newEmail)
      showToast(t('account.security.emailVerificationSent'), 'success')
      setShowEmailForm(false)
      setNewEmail('')
      setEmailPassword('')
    } catch (error: any) {
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        showToast(t('account.security.wrongPassword'), 'error')
      } else if (error.code === 'auth/email-already-in-use') {
        showToast(t('account.security.emailInUse'), 'error')
      } else {
        showToast(t('account.toast.error'), 'error')
      }
    } finally {
      setChangingEmail(false)
    }
  }

  const handleManageSubscription = async () => {
    if (!firebaseUser) return

    setPortalLoading(true)
    try {
      const apiBase = import.meta.env.DEV ? 'https://shopifree.app' : ''
      const response = await fetch(
        `${apiBase}/api/create-checkout`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'portal', userId: firebaseUser.uid })
        }
      )

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        showToast(t('subscription.toast.noSubscription'), 'info')
      }
    } catch (error) {
      console.error('Error opening portal:', error)
      showToast(t('subscription.toast.portalError'), 'error')
    } finally {
      setPortalLoading(false)
    }
  }

  // Usage helpers
  const getUsagePercentage = (current: number, limit: number) => {
    if (limit === -1) return 0
    return Math.min(100, (current / limit) * 100)
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const plans: PlanType[] = ['free', 'pro', 'business']

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
        <h1 className="text-2xl font-bold text-[#1e3a5f]">{t('account.title')}</h1>
        <p className="text-gray-600 mt-1">{t('account.subtitle')}</p>
      </div>

      <div className="space-y-6">
        {/* Personal Data */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">{t('account.personal.title')}</h2>

          <div className="flex flex-col sm:flex-row gap-6">
            {/* Avatar */}
            <div className="flex items-center gap-4 sm:border-r sm:border-gray-100 sm:pr-6">
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

            {/* Form Fields */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1e3a5f] mb-1">{t('account.personal.firstName')}</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={t('account.personal.firstNamePlaceholder')}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1e3a5f] mb-1">{t('account.personal.lastName')}</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={t('account.personal.lastNamePlaceholder')}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1e3a5f] mb-1">{t('account.personal.email')}</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={firebaseUser?.email || ''}
                    disabled
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed text-sm"
                  />
                  <button
                    onClick={() => setShowEmailForm(!showEmailForm)}
                    className="px-3 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-all text-sm font-medium flex-shrink-0"
                    title={t('account.security.changeEmail')}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
                {showEmailForm && (
                  <div className="mt-3 p-4 bg-[#f0f7ff] rounded-xl space-y-3">
                    <p className="text-xs text-gray-500">{t('account.security.emailChangeHint')}</p>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder={t('account.security.newEmail')}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all text-sm"
                    />
                    {!isGoogleUser && (
                      <input
                        type="password"
                        value={emailPassword}
                        onChange={(e) => setEmailPassword(e.target.value)}
                        placeholder={t('account.security.currentPassword')}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all text-sm"
                      />
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={handleChangeEmail}
                        disabled={changingEmail || !newEmail || (!isGoogleUser && !emailPassword)}
                        className="px-4 py-2 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white rounded-xl text-sm font-medium hover:from-[#2d6cb5] hover:to-[#38bdf8] transition-all disabled:opacity-50"
                      >
                        {changingEmail ? t('account.security.changing') : t('account.security.sendVerification')}
                      </button>
                      <button
                        onClick={() => {
                          setShowEmailForm(false)
                          setNewEmail('')
                          setEmailPassword('')
                        }}
                        className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all text-sm font-medium"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1e3a5f] mb-1">{t('account.personal.phone')}</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t('account.personal.phonePlaceholder')}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* My Plan */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                currentPlan === 'free'
                  ? 'bg-gray-100'
                  : currentPlan === 'pro'
                  ? 'bg-gradient-to-br from-[#38bdf8] to-[#2d6cb5] shadow-[#38bdf8]/20'
                  : 'bg-gradient-to-br from-purple-500 to-purple-700 shadow-purple-500/20'
              }`}>
                {currentPlan === 'free' ? (
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-[#1e3a5f]">{planInfo.name}</h2>
                  {hasActiveSubscription && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      {t('subscription.status.active')}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{t(`plan.${currentPlan}Description`)}</p>
              </div>
            </div>
            {!Capacitor.isNativePlatform() && (
              <Link
                to={localePath('/dashboard/plan')}
                className="px-4 py-2 text-sm font-medium text-[#2d6cb5] hover:text-[#1e3a5f] hover:bg-[#f0f7ff] rounded-xl transition-all"
              >
                {t('subscription.changePlan')} →
              </Link>
            )}
          </div>

          {/* Usage Stats */}
          {loadingUsage ? (
            <div className="animate-pulse h-16 bg-gray-100 rounded-xl"></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Products */}
              <div className="bg-[#f0f7ff] rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-[#1e3a5f]">{t('subscription.usage.products')}</span>
                  <span className="text-sm text-gray-500">
                    {productCount}/{limits.products === -1 ? '∞' : limits.products}
                  </span>
                </div>
                <div className="h-2 bg-white rounded-full overflow-hidden">
                  {limits.products !== -1 ? (
                    <div
                      className={`h-full rounded-full transition-all ${getUsageColor(getUsagePercentage(productCount, limits.products))}`}
                      style={{ width: `${Math.max(5, getUsagePercentage(productCount, limits.products))}%` }}
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-r from-green-400 to-green-500 rounded-full" />
                  )}
                </div>
              </div>

              {/* Categories */}
              <div className="bg-[#f0f7ff] rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-[#1e3a5f]">{t('subscription.usage.categories')}</span>
                  <span className="text-sm text-gray-500">
                    {categoryCount}/{limits.categories === -1 ? '∞' : limits.categories}
                  </span>
                </div>
                <div className="h-2 bg-white rounded-full overflow-hidden">
                  {limits.categories !== -1 ? (
                    <div
                      className={`h-full rounded-full transition-all ${getUsageColor(getUsagePercentage(categoryCount, limits.categories))}`}
                      style={{ width: `${Math.max(5, getUsagePercentage(categoryCount, limits.categories))}%` }}
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-r from-green-400 to-green-500 rounded-full" />
                  )}
                </div>
              </div>

              {/* Images */}
              <div className="bg-[#f0f7ff] rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-[#1e3a5f]">{t('subscription.usage.imagesPerProduct')}</span>
                  <span className="text-sm text-gray-500">{limits.imagesPerProduct}</span>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`h-2 flex-1 rounded ${
                        i <= limits.imagesPerProduct
                          ? 'bg-gradient-to-r from-[#38bdf8] to-[#2d6cb5]'
                          : 'bg-white'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Plan Cards - hidden on native iOS app */}
          {!Capacitor.isNativePlatform() && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {plans.map((plan) => {
                  const info = PLAN_FEATURES[plan]
                  const isCurrentPlan = plan === currentPlan
                  const isUpgrade = plans.indexOf(plan) > plans.indexOf(currentPlan)

                  return (
                    <div
                      key={plan}
                      className={`relative rounded-xl border p-4 transition-all ${
                        isCurrentPlan
                          ? 'border-[#38bdf8] bg-[#f0f7ff]'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      {isCurrentPlan && (
                        <span className="absolute -top-2.5 left-3 px-2 py-0.5 bg-[#38bdf8] text-white text-xs font-medium rounded-full">
                          {t('subscription.currentPlan')}
                        </span>
                      )}

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-[#1e3a5f]">{info.name}</h4>
                          <p className="text-sm text-gray-500">
                            {info.price > 0 ? `$${info.price}/mes` : t('plan.badge.free')}
                          </p>
                        </div>
                        {!isCurrentPlan && (
                          isUpgrade ? (
                            <Link
                              to={localePath('/dashboard/plan')}
                              className="px-3 py-1.5 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white rounded-lg text-xs font-medium hover:from-[#2d6cb5] hover:to-[#38bdf8] transition-all"
                            >
                              {t('plan.buttons.upgrade')}
                            </Link>
                          ) : (
                            <button
                              onClick={handleManageSubscription}
                              disabled={portalLoading}
                              className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition-all disabled:opacity-50"
                            >
                              {t('subscription.downgrade')}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Security & Danger Zone */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Change Password */}
            <div className="flex-1 sm:border-r sm:border-gray-100 sm:pr-6">
              {isGoogleUser ? (
                <div className="flex items-center gap-3">
                  <div>
                    <h3 className="font-medium text-[#1e3a5f]">{t('account.security.changePassword')}</h3>
                    <p className="text-sm text-gray-500">{t('account.security.googleAccount')}</p>
                  </div>
                </div>
              ) : !showPasswordForm ? (
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-[#1e3a5f]">{t('account.security.changePassword')}</h3>
                    <p className="text-sm text-gray-500">{t('account.security.subtitle')}</p>
                  </div>
                  <button
                    onClick={() => setShowPasswordForm(true)}
                    className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all text-sm font-medium"
                  >
                    {t('common.edit')}
                  </button>
                </div>
              ) : (
                <div>
                  <h3 className="font-medium text-[#1e3a5f] mb-3">{t('account.security.changePassword')}</h3>
                  <div className="space-y-3">
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder={t('account.security.currentPassword')}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all text-sm"
                    />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t('account.security.newPassword')}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all text-sm"
                    />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t('account.security.confirmPassword')}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleChangePassword}
                        disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                        className="px-4 py-2 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white rounded-xl text-sm font-medium hover:from-[#2d6cb5] hover:to-[#38bdf8] transition-all disabled:opacity-50"
                      >
                        {changingPassword ? t('account.security.changing') : t('common.save')}
                      </button>
                      <button
                        onClick={() => {
                          setShowPasswordForm(false)
                          setCurrentPassword('')
                          setNewPassword('')
                          setConfirmPassword('')
                        }}
                        className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all text-sm font-medium"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Cancel Subscription */}
            {hasActiveSubscription && (
              <div className="flex-1 flex items-center justify-between sm:border-r sm:border-gray-100 sm:pr-6">
                <div>
                  <h3 className="font-medium text-[#1e3a5f]">{t('subscription.cancelSubscription')}</h3>
                  <p className="text-sm text-gray-500">{t('subscription.danger.description')}</p>
                </div>
                <button
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                  className="px-4 py-2 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-all text-sm font-medium disabled:opacity-50"
                >
                  {t('common.cancel')}
                </button>
              </div>
            )}

            {/* Delete Catalog */}
            <div className="flex-1 flex items-center justify-between">
              <div>
                <h3 className="font-medium text-red-600">{t('account.danger.deleteCatalog')}</h3>
                <p className="text-sm text-gray-500">{t('account.danger.description')}</p>
              </div>
              <button
                onClick={() => showToast(t('account.toast.comingSoon'), 'info')}
                className="px-4 py-2 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-all text-sm font-medium"
              >
                {t('common.delete')}
              </button>
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
            {saving ? t('account.saving') : t('account.saveChanges')}
          </button>
        </div>
      </div>
    </div>
  )
}
