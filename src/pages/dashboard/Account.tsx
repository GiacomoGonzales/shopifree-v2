import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Capacitor } from '@capacitor/core'
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore'
import { EmailAuthProvider, GoogleAuthProvider, reauthenticateWithCredential, reauthenticateWithPopup, linkWithCredential, unlink, updatePassword, verifyBeforeUpdateEmail, deleteUser } from 'firebase/auth'
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
  const { firebaseUser, store, logout } = useAuth()
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

  // Delete catalog
  const [showDeleteCatalog, setShowDeleteCatalog] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deletingCatalog, setDeletingCatalog] = useState(false)

  // Unlink Google
  const [showUnlinkGoogle, setShowUnlinkGoogle] = useState(false)
  const [unlinkPassword, setUnlinkPassword] = useState('')
  const [unlinkConfirmPassword, setUnlinkConfirmPassword] = useState('')
  const [unlinking, setUnlinking] = useState(false)

  const isGoogleUser = firebaseUser?.providerData?.some(p => p.providerId === 'google.com') && !firebaseUser?.providerData?.some(p => p.providerId === 'password')

  // Subscription summary (displayed on the compact "My Plan" card that links to /finance/subscription)
  const currentPlan = (store?.plan || 'free') as PlanType
  const planInfo = PLAN_FEATURES[currentPlan]
  const subscription = store?.subscription
  const hasActiveSubscription = subscription?.status === 'active'

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

  // Usage stats (products/categories/images) moved to the dedicated Subscription page

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
      const credential = EmailAuthProvider.credential(firebaseUser.email!, emailPassword)
      await reauthenticateWithCredential(firebaseUser, credential)

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

  const handleUnlinkGoogle = async () => {
    if (!firebaseUser || !firebaseUser.email) return

    if (unlinkPassword.length < 6) {
      showToast(t('account.security.passwordTooShort'), 'error')
      return
    }
    if (unlinkPassword !== unlinkConfirmPassword) {
      showToast(t('account.security.passwordMismatch'), 'error')
      return
    }

    setUnlinking(true)
    try {
      const googleProvider = new GoogleAuthProvider()
      await reauthenticateWithPopup(firebaseUser, googleProvider)

      const credential = EmailAuthProvider.credential(firebaseUser.email, unlinkPassword)
      await linkWithCredential(firebaseUser, credential)
      await unlink(firebaseUser, 'google.com')

      showToast(t('account.security.unlinkGoogleSuccess'), 'success')
      setShowUnlinkGoogle(false)
      setUnlinkPassword('')
      setUnlinkConfirmPassword('')
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        showToast(t('account.toast.error'), 'error')
      } else if (error.code === 'auth/provider-already-linked') {
        showToast(t('account.toast.error'), 'error')
      } else {
        showToast(t('account.toast.error'), 'error')
      }
    } finally {
      setUnlinking(false)
    }
  }

  // Subscription management moved to /finance/subscription

  const handleDeleteAccount = async () => {
    if (!firebaseUser || deleteConfirmText !== 'ELIMINAR') return

    setDeletingCatalog(true)
    try {
      if (store?.id) {
        // Delete all products
        const productsRef = collection(db, 'stores', store.id, 'products')
        const productsSnap = await getDocs(productsRef)
        const productDeletes = productsSnap.docs.map(d => deleteDoc(d.ref))

        // Delete all categories
        const categoriesRef = collection(db, 'stores', store.id, 'categories')
        const categoriesSnap = await getDocs(categoriesRef)
        const categoryDeletes = categoriesSnap.docs.map(d => deleteDoc(d.ref))

        // Delete all orders
        const ordersRef = collection(db, 'stores', store.id, 'orders')
        const ordersSnap = await getDocs(ordersRef)
        const orderDeletes = ordersSnap.docs.map(d => deleteDoc(d.ref))

        await Promise.all([...productDeletes, ...categoryDeletes, ...orderDeletes])

        // Delete the store document
        await deleteDoc(doc(db, 'stores', store.id))
      }

      // Delete the user document
      await deleteDoc(doc(db, 'users', firebaseUser.uid))

      // Delete Firebase Auth account and sign out
      try {
        await deleteUser(firebaseUser)
      } catch {
        // If deleteUser fails (requires recent auth), just logout
      }
      await logout()
    } catch (error) {
      console.error('Error deleting account:', error)
      showToast(t('account.toast.error'), 'error')
      setDeletingCatalog(false)
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
        <h1 className="text-xl font-semibold text-gray-900">{t('account.title')}</h1>
        <p className="text-gray-600 mt-1">{t('account.subtitle')}</p>
      </div>

      <div className="space-y-6">
        {/* Personal Data */}
        <div className="bg-white rounded-xl border border-gray-200/60 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">{t('account.personal.title')}</h2>

          <div className="flex flex-col sm:flex-row gap-6">
            {/* Avatar */}
            <div className="flex items-center gap-4 sm:border-r sm:border-gray-200/60 sm:pr-6">
              <div
                onClick={() => avatarInputRef.current?.click()}
                className="w-16 h-16 bg-[#1e3a5f] rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-all flex items-center justify-center shadow-sm flex-shrink-0"
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
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1e3a5f] mb-1">{t('account.personal.lastName')}</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={t('account.personal.lastNamePlaceholder')}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all text-sm"
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
                    onClick={() => isGoogleUser ? setShowUnlinkGoogle(true) : setShowEmailForm(true)}
                    className="px-3 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-all text-sm font-medium flex-shrink-0"
                    title={isGoogleUser ? t('account.security.unlinkGoogle') : t('account.security.changeEmail')}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1e3a5f] mb-1">{t('account.personal.phone')}</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t('account.personal.phonePlaceholder')}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* My Plan — compact card. On iOS it's informational only (no link
            to subscription page) to comply with App Store Guideline 3.1.1. */}
        {(() => {
          const PlanCardContent = (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  currentPlan === 'free' ? 'bg-gray-100'
                  : currentPlan === 'pro' ? 'bg-[#1e3a5f]'
                  : 'bg-gradient-to-br from-purple-500 to-purple-700'
                }`}>
                  {currentPlan === 'free' ? (
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[11px] text-gray-400 uppercase tracking-wider">{t('plan.current')}</p>
                    {hasActiveSubscription && (
                      <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-medium rounded">
                        {t('subscription.status.active')}
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-semibold text-[#1e3a5f] truncate">{planInfo.name}</h2>
                  <p className="text-xs text-gray-500 truncate">{t(`plan.${currentPlan}Description`)}</p>
                </div>
              </div>
              {!Capacitor.isNativePlatform() && (
                <div className="flex items-center gap-1 text-sm font-medium text-[#2d6cb5] group-hover:text-[#1e3a5f] flex-shrink-0 whitespace-nowrap">
                  {currentPlan === 'free' ? 'Suscribirme' : t('subscription.changePlan')}
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              )}
            </div>
          )
          return Capacitor.isNativePlatform() ? (
            <div className="bg-white rounded-xl border border-gray-200/60 p-5 shadow-sm">
              {PlanCardContent}
            </div>
          ) : (
            <Link
              to={localePath('/finance/subscription')}
              className="block bg-white rounded-xl border border-gray-200/60 p-5 shadow-sm hover:shadow-md hover:border-[#1e3a5f]/20 transition-all group"
            >
              {PlanCardContent}
            </Link>
          )
        })()}


        {/* Security & Danger Zone */}
        <div className="bg-white rounded-xl border border-gray-200/60 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-stretch gap-4">
            {/* Change Password */}
            <div className="flex-1 sm:border-r sm:border-gray-200/60 sm:pr-6">
              {isGoogleUser ? (
                <div>
                  <h3 className="font-medium text-[#1e3a5f]">{t('account.security.changePassword')}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{t('account.security.googleAccount')}</p>
                  <button
                    onClick={() => setShowUnlinkGoogle(true)}
                    className="mt-3 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all text-sm font-medium"
                  >
                    {t('account.security.unlinkGoogle')}
                  </button>
                </div>
              ) : !showPasswordForm ? (
                <div>
                  <h3 className="font-medium text-[#1e3a5f]">{t('account.security.changePassword')}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{t('account.security.subtitle')}</p>
                  <button
                    onClick={() => setShowPasswordForm(true)}
                    className="mt-3 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all text-sm font-medium"
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
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all text-sm"
                    />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t('account.security.newPassword')}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all text-sm"
                    />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t('account.security.confirmPassword')}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleChangePassword}
                        disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                        className="px-4 py-2 bg-[#1e3a5f] text-white rounded-xl text-sm font-medium hover:bg-[#2d6cb5] transition-all disabled:opacity-50"
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

            {/* Cancel subscription moved to /finance/subscription (dedicated Subscription page) */}

            {/* Delete Catalog */}
            <div className="flex-1">
              <h3 className="font-medium text-red-600">{t('account.danger.deleteCatalog')}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{t('account.danger.description')}</p>
              <button
                onClick={() => setShowDeleteCatalog(true)}
                className="mt-3 px-4 py-2 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-all text-sm font-medium"
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
            className="w-full sm:w-auto px-8 py-3 bg-[#1e3a5f] text-white rounded-xl hover:bg-[#2d6cb5] transition-all font-semibold disabled:opacity-50 shadow-sm"
          >
            {saving ? t('account.saving') : t('account.saveChanges')}
          </button>
        </div>
      </div>

      {/* Unlink Google Modal */}
      {showUnlinkGoogle && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setShowUnlinkGoogle(false); setUnlinkPassword(''); setUnlinkConfirmPassword('') }}>
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#f0f7ff] rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#2d6cb5]" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-[#1e3a5f]">{t('account.security.unlinkGoogle')}</h3>
              </div>
              <button
                onClick={() => { setShowUnlinkGoogle(false); setUnlinkPassword(''); setUnlinkConfirmPassword('') }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">{t('account.security.unlinkGoogleDesc')}</p>

              {/* New password */}
              <div>
                <label className="block text-sm font-medium text-[#1e3a5f] mb-1">{t('account.security.createPassword')}</label>
                <input
                  type="password"
                  value={unlinkPassword}
                  onChange={(e) => setUnlinkPassword(e.target.value)}
                  placeholder="********"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all text-sm"
                  autoFocus
                />
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-sm font-medium text-[#1e3a5f] mb-1">{t('account.security.confirmNewPassword')}</label>
                <input
                  type="password"
                  value={unlinkConfirmPassword}
                  onChange={(e) => setUnlinkConfirmPassword(e.target.value)}
                  placeholder="********"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all text-sm"
                />
              </div>

              {/* Info box */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex gap-3">
                <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-blue-800">{t('account.security.unlinkGoogleHint')}</p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 pt-0">
              <button
                onClick={() => { setShowUnlinkGoogle(false); setUnlinkPassword(''); setUnlinkConfirmPassword('') }}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all text-sm font-medium"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleUnlinkGoogle}
                disabled={unlinking || !unlinkPassword || !unlinkConfirmPassword}
                className="flex-1 px-4 py-2.5 bg-[#1e3a5f] text-white rounded-xl text-sm font-medium hover:bg-[#2d6cb5] transition-all disabled:opacity-50"
              >
                {unlinking ? t('account.security.changing') : t('account.security.unlinkAndCreatePassword')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Catalog Modal */}
      {showDeleteCatalog && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setShowDeleteCatalog(false); setDeleteConfirmText('') }}>
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 pb-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-red-600">{t('account.danger.deleteCatalog')}</h3>
              </div>
              <button
                onClick={() => { setShowDeleteCatalog(false); setDeleteConfirmText('') }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">{t('account.danger.deleteWarning')}</p>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex gap-3">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-red-800">
                  {t('account.danger.allCatalogWillBeDeleted')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1e3a5f] mb-1">{t('account.danger.typeToConfirm')}</label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="ELIMINAR"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-300 focus:border-red-300 transition-all text-sm"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button
                onClick={() => { setShowDeleteCatalog(false); setDeleteConfirmText('') }}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all text-sm font-medium"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deletingCatalog || deleteConfirmText !== 'ELIMINAR'}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-all disabled:opacity-50"
              >
                {deletingCatalog ? t('account.danger.deleting') : t('account.danger.confirmDelete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Email Modal */}
      {showEmailForm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setShowEmailForm(false); setNewEmail(''); setEmailPassword('') }}>
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#f0f7ff] rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#2d6cb5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-[#1e3a5f]">{t('account.security.changeEmail')}</h3>
              </div>
              <button
                onClick={() => { setShowEmailForm(false); setNewEmail(''); setEmailPassword('') }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Current email */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">{t('account.security.currentEmail')}</label>
                <p className="text-sm font-medium text-[#1e3a5f]">{firebaseUser?.email}</p>
              </div>

              {/* New email */}
              <div>
                <label className="block text-sm font-medium text-[#1e3a5f] mb-1">{t('account.security.newEmail')}</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="nuevo@correo.com"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all text-sm"
                  autoFocus
                />
              </div>

              {/* Password - always required */}
              <div>
                <label className="block text-sm font-medium text-[#1e3a5f] mb-1">{t('account.security.currentPassword')}</label>
                <input
                  type="password"
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                  placeholder="********"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all text-sm"
                />
              </div>

              {/* Info box */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex gap-3">
                <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-xs text-amber-800 space-y-1">
                  <p>{t('account.security.emailChangeHint')}</p>
                  <p>{t('account.security.emailSpamHint')}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 pt-0">
              <button
                onClick={() => { setShowEmailForm(false); setNewEmail(''); setEmailPassword('') }}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all text-sm font-medium"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleChangeEmail}
                disabled={changingEmail || !newEmail || !emailPassword}
                className="flex-1 px-4 py-2.5 bg-[#1e3a5f] text-white rounded-xl text-sm font-medium hover:bg-[#2d6cb5] transition-all disabled:opacity-50"
              >
                {changingEmail ? t('account.security.changing') : t('account.security.sendVerification')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
