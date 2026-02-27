import { useState, useEffect } from 'react'
import { doc, updateDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import { useLanguage } from '../../hooks/useLanguage'
import type { StoreAppConfig } from '../../types'

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

interface NotificationHistory {
  id: string
  title: string
  body: string
  sentAt: Date
  recipientCount: number
}

const PUSH_TEMPLATES = [
  { key: 'templateNewProduct', title: 'Nuevo producto disponible!', body: 'Descubre lo nuevo que tenemos para ti' },
  { key: 'templateDiscount', title: 'Descuento especial!', body: '20% de descuento en todos los productos. Solo por hoy!' },
  { key: 'templateBackInStock', title: 'De vuelta en stock!', body: 'El producto que buscabas ya está disponible' },
]

const STATUS_STEPS = ['none', 'requested', 'building', 'published'] as const

export default function MiApp() {
  const { t } = useTranslation('dashboard')
  const { firebaseUser, store } = useAuth()
  const { localePath } = useLanguage()
  const { showToast } = useToast()

  // App config form state
  const [appName, setAppName] = useState('')
  const [icon, setIcon] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#1e3a5f')
  const [secondaryColor, setSecondaryColor] = useState('#38bdf8')
  const [splashColor, setSplashColor] = useState('#ffffff')
  const [saving, setSaving] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [uploadingIcon, setUploadingIcon] = useState(false)

  // Push notification state
  const [pushTitle, setPushTitle] = useState('')
  const [pushBody, setPushBody] = useState('')
  const [sending, setSending] = useState(false)
  const [history, setHistory] = useState<NotificationHistory[]>([])

  const appConfig = store?.appConfig
  const currentStatus = appConfig?.status || 'none'
  const currentStepIdx = STATUS_STEPS.indexOf(currentStatus as typeof STATUS_STEPS[number])

  // Load app config from store
  useEffect(() => {
    if (store?.appConfig) {
      const cfg = store.appConfig
      setAppName(cfg.appName || '')
      setIcon(cfg.icon || '')
      setPrimaryColor(cfg.primaryColor || '#1e3a5f')
      setSecondaryColor(cfg.secondaryColor || '#38bdf8')
      setSplashColor(cfg.splashColor || '#ffffff')
    } else if (store) {
      setAppName(store.name || '')
      setPrimaryColor(store.themeSettings?.primaryColor || '#1e3a5f')
    }
  }, [store])

  // Load notification history
  useEffect(() => {
    if (!store?.id) return
    const q = query(
      collection(db, 'stores', store.id, 'notifications'),
      orderBy('sentAt', 'desc'),
      limit(10)
    )
    getDocs(q).then(snap => {
      setHistory(snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        sentAt: d.data().sentAt?.toDate?.() || new Date()
      } as NotificationHistory)))
    })
  }, [store?.id])

  // Upload icon to Cloudinary
  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !store) return

    setUploadingIcon(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
      formData.append('folder', `shopifree/app-icons`)

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      )
      if (!response.ok) throw new Error('Upload failed')
      const data = await response.json()
      setIcon(data.secure_url)
    } catch {
      showToast(t('miApp.toast.iconError'), 'error')
    } finally {
      setUploadingIcon(false)
    }
  }

  // Save app config
  const handleSaveConfig = async () => {
    if (!store || !firebaseUser) return
    setSaving(true)
    try {
      const config: StoreAppConfig = {
        appName: appName || store.name,
        icon: icon || undefined,
        primaryColor,
        secondaryColor,
        splashColor,
        status: appConfig?.status || 'none',
        pushEnabled: appConfig?.pushEnabled ?? true,
        ...(appConfig?.requestedAt && { requestedAt: appConfig.requestedAt }),
        ...(appConfig?.publishedAt && { publishedAt: appConfig.publishedAt }),
        ...(appConfig?.androidUrl && { androidUrl: appConfig.androidUrl }),
        ...(appConfig?.iosUrl && { iosUrl: appConfig.iosUrl }),
      }
      await updateDoc(doc(db, 'stores', store.id), { appConfig: config })
      showToast(t('miApp.toast.saved'))
    } catch {
      showToast(t('miApp.toast.error'), 'error')
    } finally {
      setSaving(false)
    }
  }

  // Request publication
  const handleRequest = async () => {
    if (!store || !firebaseUser) return
    setRequesting(true)
    try {
      await updateDoc(doc(db, 'stores', store.id), {
        'appConfig.status': 'requested',
        'appConfig.requestedAt': new Date()
      })
      showToast(t('miApp.toast.requested'))
    } catch {
      showToast(t('miApp.toast.error'), 'error')
    } finally {
      setRequesting(false)
    }
  }

  // Send push notification
  const handleSendPush = async () => {
    if (!store || !firebaseUser || !pushTitle.trim() || !pushBody.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: store.id,
          title: pushTitle.trim(),
          body: pushBody.trim(),
          ownerId: firebaseUser.uid
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (data.sent === 0) {
        showToast(t('miApp.push.noTokens'))
      } else {
        showToast(t('miApp.push.sent', { count: data.sent }))
      }
      setPushTitle('')
      setPushBody('')

      // Refresh history
      const q = query(
        collection(db, 'stores', store.id, 'notifications'),
        orderBy('sentAt', 'desc'),
        limit(10)
      )
      const snap = await getDocs(q)
      setHistory(snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        sentAt: d.data().sentAt?.toDate?.() || new Date()
      } as NotificationHistory)))
    } catch {
      showToast(t('miApp.push.error'), 'error')
    } finally {
      setSending(false)
    }
  }

  // Apply template
  const applyTemplate = (tpl: typeof PUSH_TEMPLATES[number]) => {
    setPushTitle(tpl.title)
    setPushBody(tpl.body)
  }

  // Plan gate - Business required
  if (store && store.plan !== 'business') {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900">{t('miApp.title')}</h1>
        <p className="mt-1 text-gray-500">{t('miApp.subtitle')}</p>

        <div className="mt-8 bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200/50 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">{t('miApp.title')}</h3>
          <p className="mt-2 text-sm text-gray-600 max-w-md mx-auto">{t('miApp.businessRequired')}</p>
          <Link
            to={localePath('/dashboard/plan')}
            className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-md"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            {t('miApp.upgradeToBusiness')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('miApp.title')}</h1>
        <p className="mt-1 text-gray-500">{t('miApp.subtitle')}</p>
      </div>

      {/* Status tracker */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900">{t('miApp.status.title')}</h2>
        <div className="mt-4 flex items-center gap-2">
          {STATUS_STEPS.map((step, idx) => {
            const isActive = idx <= currentStepIdx
            const isCurrent = step === currentStatus
            return (
              <div key={step} className="flex items-center gap-2 flex-1">
                <div className={`flex items-center gap-2 flex-1 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isCurrent
                    ? 'bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white shadow-md'
                    : isActive
                      ? 'bg-green-50 text-green-700'
                      : 'bg-gray-50 text-gray-400'
                }`}>
                  {isActive && idx < currentStepIdx ? (
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : isCurrent ? (
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse flex-shrink-0" />
                  ) : null}
                  <span className="truncate">{t(`miApp.status.${step}`)}</span>
                </div>
                {idx < STATUS_STEPS.length - 1 && (
                  <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            )
          })}
        </div>
        <p className="mt-3 text-sm text-gray-500">
          {t(`miApp.status.${currentStatus}Desc`)}
        </p>
      </div>

      {/* App config form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900">{t('miApp.config.title')}</h2>

        <div className="mt-4 space-y-4">
          {/* App name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('miApp.config.appName')}</label>
            <input
              type="text"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder={t('miApp.config.appNamePlaceholder')}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
            />
          </div>

          {/* App icon */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('miApp.config.icon')}</label>
            <p className="text-xs text-gray-400 mb-2">{t('miApp.config.iconHint')}</p>
            <div className="flex items-center gap-4">
              {icon ? (
                <img src={icon} alt="App icon" className="w-16 h-16 rounded-2xl object-cover border border-gray-200 shadow-sm" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              <label className="cursor-pointer px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 transition-all">
                {uploadingIcon ? '...' : t('miApp.config.uploadIcon')}
                <input type="file" accept="image/png,image/jpeg" onChange={handleIconUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* Colors */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('miApp.config.primaryColor')}</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('miApp.config.secondaryColor')}</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('miApp.config.splashColor')}</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={splashColor}
                  onChange={(e) => setSplashColor(e.target.value)}
                  className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={splashColor}
                  onChange={(e) => setSplashColor(e.target.value)}
                  className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
                />
              </div>
            </div>
          </div>

          {/* Save + Request */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="px-5 py-2 bg-[#1e3a5f] text-white rounded-xl text-sm font-semibold hover:bg-[#2d6cb5] transition-all disabled:opacity-50"
            >
              {saving ? t('miApp.config.saving') : t('miApp.config.save')}
            </button>
            {currentStatus === 'none' && (
              <button
                onClick={handleRequest}
                disabled={requesting || !appName.trim()}
                className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50"
              >
                {requesting ? t('miApp.status.requesting') : t('miApp.status.request')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Download links (when published) */}
      {currentStatus === 'published' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900">{t('miApp.links.title')}</h2>
          <div className="mt-4 space-y-3">
            {appConfig?.androidUrl ? (
              <a
                href={appConfig.androidUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all"
              >
                <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.523 2.294l-1.907 3.302A9.953 9.953 0 0012.002 4.5c-1.327 0-2.588.259-3.744.726L6.35 1.924a.5.5 0 00-.866.5l1.893 3.278A9.972 9.972 0 002.5 14h19a9.972 9.972 0 00-4.877-8.298l1.893-3.278a.5.5 0 00-.866-.5h-.127zM8.5 11a1 1 0 110-2 1 1 0 010 2zm7 0a1 1 0 110-2 1 1 0 010 2z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900">{t('miApp.links.playStore')}</span>
                  <p className="text-xs text-gray-400 truncate">{appConfig.androidUrl}</p>
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            ) : null}
            {appConfig?.iosUrl ? (
              <a
                href={appConfig.iosUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all"
              >
                <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900">{t('miApp.links.appStore')}</span>
                  <p className="text-xs text-gray-400 truncate">{appConfig.iosUrl}</p>
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            ) : null}
            {!appConfig?.androidUrl && !appConfig?.iosUrl && (
              <p className="text-sm text-gray-400 py-2">{t('miApp.links.noLinks')}</p>
            )}
          </div>
        </div>
      )}

      {/* Push Notifications */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900">{t('miApp.push.title')}</h2>

        <div className="mt-4 space-y-4">
          {/* Quick templates */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">{t('miApp.push.templates')}</p>
            <div className="flex flex-wrap gap-2">
              {PUSH_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.key}
                  onClick={() => applyTemplate(tpl)}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-600 transition-all"
                >
                  {t(`miApp.push.${tpl.key}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('miApp.push.titleLabel')}</label>
            <input
              type="text"
              value={pushTitle}
              onChange={(e) => setPushTitle(e.target.value)}
              placeholder={t('miApp.push.titlePlaceholder')}
              maxLength={65}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('miApp.push.bodyLabel')}</label>
            <textarea
              value={pushBody}
              onChange={(e) => setPushBody(e.target.value)}
              placeholder={t('miApp.push.bodyPlaceholder')}
              maxLength={240}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] resize-none"
            />
          </div>

          {/* Send button */}
          <button
            onClick={handleSendPush}
            disabled={sending || !pushTitle.trim() || !pushBody.trim()}
            className="px-5 py-2 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {sending ? t('miApp.push.sending') : t('miApp.push.send')}
          </button>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('miApp.push.history')}</h3>
            <div className="space-y-2">
              {history.map((notif) => (
                <div key={notif.id} className="flex items-start gap-3 px-3 py-2 bg-gray-50 rounded-xl">
                  <div className="w-8 h-8 bg-[#1e3a5f]/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-[#1e3a5f]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{notif.title}</p>
                    <p className="text-xs text-gray-500 truncate">{notif.body}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-gray-400">
                        {notif.sentAt.toLocaleDateString()}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {t('miApp.push.recipients', { count: notif.recipientCount })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {history.length === 0 && (
          <p className="mt-4 text-sm text-gray-400">{t('miApp.push.noHistory')}</p>
        )}
      </div>
    </div>
  )
}
