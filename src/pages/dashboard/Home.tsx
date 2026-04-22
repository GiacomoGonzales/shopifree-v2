import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { doc, updateDoc, collection, addDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import { productService, analyticsService, categoryService, orderService } from '../../lib/firebase'
import { getCurrencySymbol } from '../../lib/currency'
import { PLAN_FEATURES, STRIPE_PRICES, type PlanType } from '../../lib/stripe'
import { themes } from '../../themes'
import { getThemeComponent } from '../../themes/components'
import type { Product, Category } from '../../types'

export default function DashboardHome() {
  const { t } = useTranslation('dashboard')
  const { localePath } = useLanguage()
  const { store } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [analytics, setAnalytics] = useState({ pageViews: 0, whatsappClicks: 0 })
  const [previewTheme, setPreviewTheme] = useState<string | null>(null)
  const [savingTheme, setSavingTheme] = useState(false)
  const [onboardingDismissed, setOnboardingDismissed] = useState(false)
  const [linkShared, setLinkShared] = useState(false)
  const [hasOrders, setHasOrders] = useState(false)
  const [dismissedMilestones, setDismissedMilestones] = useState<string[]>([])
  const [feedbackType, setFeedbackType] = useState<'bug' | 'suggestion' | 'missing'>('suggestion')
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [feedbackSending, setFeedbackSending] = useState(false)
  const [feedbackSent, setFeedbackSent] = useState(false)
  const [feedbackExpanded, setFeedbackExpanded] = useState(false)
  const [expandedPlanRows, setExpandedPlanRows] = useState<Record<string, boolean>>({})

  // Load persisted onboarding state
  useEffect(() => {
    if (store) {
      setOnboardingDismissed(!!store.onboardingDismissed)
      setLinkShared(localStorage.getItem(`linkShared_${store.id}`) === 'true')
      // Load dismissed milestones
      const dismissed: string[] = []
      for (const m of ['first_order', 'products_5', 'whatsapp']) {
        if (localStorage.getItem(`milestone_${m}_${store.id}`) === 'dismissed') {
          dismissed.push(m)
        }
      }
      setDismissedMilestones(dismissed)
    }
  }, [store])

  // Trial days calculation
  const trialDaysLeft = (() => {
    if (!store?.trialEndsAt || store.subscription) return -1
    const trialEnd = store.trialEndsAt instanceof Date
      ? store.trialEndsAt
      : new Date(store.trialEndsAt)
    return Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
  })()
  const isOnTrial = trialDaysLeft >= 0 && store?.plan === 'pro'

  // Check if trial has expired (had a trial, now expired, plan is free, no active subscription)
  const isTrialExpired = (() => {
    if (!store?.trialEndsAt || store.subscription?.status === 'active') return false
    const trialEnd = store.trialEndsAt instanceof Date
      ? store.trialEndsAt
      : typeof store.trialEndsAt === 'object' && 'toDate' in store.trialEndsAt
        ? (store.trialEndsAt as { toDate: () => Date }).toDate()
        : new Date(store.trialEndsAt as string)
    return trialEnd.getTime() < Date.now() && store.plan === 'free'
  })()

  // Dismiss onboarding
  const dismissOnboarding = useCallback(async () => {
    if (!store) return
    setOnboardingDismissed(true)
    await updateDoc(doc(db, 'stores', store.id), { onboardingDismissed: true, updatedAt: new Date() })
  }, [store])

  // Mark link as shared
  const markLinkShared = useCallback(() => {
    if (!store) return
    setLinkShared(true)
    localStorage.setItem(`linkShared_${store.id}`, 'true')
  }, [store])

  // Get recommended themes: premium first, then visually rich free themes
  const recommendedThemes = (() => {
    const curated = ['cosmos', 'hologram', 'velvet', 'liquid', 'glacier', 'noir', 'aurora', 'vapor', 'mirage', 'prism', 'midnight', 'vaporwave', 'neon-cyber']
    const current = store?.themeId
    const ordered = curated.filter(id => id !== current).map(id => themes.find(th => th.id === id)).filter(Boolean) as typeof themes
    return ordered.slice(0, 6)
  })()

  // Milestone logic for free plan users
  const activeMilestone = (() => {
    if (store?.plan !== 'free') return null
    const milestones = [
      { id: 'first_order', active: hasOrders },
      { id: 'products_5', active: products.length >= 5 },
      { id: 'whatsapp', active: analytics.whatsappClicks > 0 },
    ]
    return milestones.find(m => m.active && !dismissedMilestones.includes(m.id)) || null
  })()

  const dismissMilestone = useCallback((milestoneId: string) => {
    if (!store) return
    localStorage.setItem(`milestone_${milestoneId}_${store.id}`, 'dismissed')
    setDismissedMilestones(prev => [...prev, milestoneId])
  }, [store])

  const submitFeedback = useCallback(async () => {
    if (!store || !feedbackMessage.trim()) return
    setFeedbackSending(true)
    try {
      await addDoc(collection(db, 'feedback'), {
        storeId: store.id,
        storeName: store.name,
        email: store.email || '',
        plan: store.plan || 'free',
        type: feedbackType,
        message: feedbackMessage.trim(),
        createdAt: new Date(),
      })
      setFeedbackSent(true)
      setFeedbackMessage('')
      setTimeout(() => setFeedbackSent(false), 4000)
    } catch (error) {
      console.error('Error sending feedback:', error)
    } finally {
      setFeedbackSending(false)
    }
  }, [store, feedbackType, feedbackMessage])

  useEffect(() => {
    const fetchData = async () => {
      if (!store) return

      try {
        const promises: Promise<unknown>[] = [
          productService.getAll(store.id),
          analyticsService.getWeeklyStats(store.id),
          categoryService.getAll(store.id)
        ]
        // Fetch orders only for free plan (for milestone detection)
        if (store.plan === 'free') {
          promises.push(orderService.getAll(store.id, 5))
        }
        const [productsData, analyticsData, categoriesData, ordersData] = await Promise.all(promises)
        setProducts(productsData as Product[])
        setAnalytics(analyticsData as { pageViews: number; whatsappClicks: number })
        setCategories(categoriesData as Category[])
        if (ordersData) {
          const orders = ordersData as { paymentMethod?: string; paymentStatus?: string; status?: string }[]
          // Filter out abandoned carts (same logic as Orders.tsx)
          const realOrders = orders.filter(o =>
            !((o.paymentMethod === 'mercadopago' || o.paymentMethod === 'stripe') &&
              o.paymentStatus !== 'paid' &&
              o.paymentStatus !== 'failed' &&
              o.status === 'pending')
          )
          setHasOrders(realOrders.length > 0)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [store])

  // Use custom domain if available, otherwise use subdomain
  const catalogUrl = store
    ? store.customDomain
      ? `https://${store.customDomain}`
      : `https://${store.subdomain}.shopifree.app`
    : ''

  const copyLink = () => {
    navigator.clipboard.writeText(catalogUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(catalogUrl)}`

  const downloadQR = async () => {
    try {
      const fileName = `${store?.subdomain || 'tienda'}-qr.png`

      if (Capacitor.isNativePlatform()) {
        const response = await fetch(qrCodeUrl)
        const blob = await response.blob()
        const reader = new FileReader()
        const base64 = await new Promise<string>((resolve) => {
          reader.onloadend = () => {
            const result = reader.result as string
            resolve(result.split(',')[1])
          }
          reader.readAsDataURL(blob)
        })
        const result = await Filesystem.writeFile({
          path: fileName,
          data: base64,
          directory: Directory.Cache,
        })
        await Share.share({
          title: fileName,
          url: result.uri,
        })
      } else {
        const response = await fetch(qrCodeUrl)
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error downloading QR:', error)
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
    <>
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{t('home.title')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {t('home.welcomeStore', { store: store?.name || 'Store' })}
        </p>
      </div>

      {/* Trial Banner */}
      {isOnTrial && !Capacitor.isNativePlatform() && (
        <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl p-4 sm:p-5 border border-purple-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/20">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h3 className="font-semibold text-purple-900">{t('home.trial.title')}</h3>
                  <span className="px-2 py-0.5 bg-purple-200 text-purple-800 text-xs font-bold rounded-full whitespace-nowrap">
                    {trialDaysLeft === 0 ? t('home.trial.lastDay') : t('home.trial.daysLeft', { days: trialDaysLeft })}
                  </span>
                </div>
                <p className="text-sm text-purple-700 mt-0.5">{t('home.trial.description')}</p>
                {trialDaysLeft <= 5 && (
                  <p className="text-sm font-semibold text-green-700 mt-1">{t('home.trial.discountOffer')}</p>
                )}
              </div>
            </div>
            <Link
              to={localePath('/dashboard/plan')}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-xl hover:from-purple-600 hover:to-violet-700 transition-all font-semibold text-sm shadow-lg shadow-purple-500/20 text-center flex-shrink-0"
            >
              {trialDaysLeft <= 5 ? t('plan.discount.getDiscount') : t('home.trial.subscribe')}
            </Link>
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-1.5 bg-purple-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-400 to-violet-500 rounded-full transition-all"
              style={{ width: `${Math.max(5, ((14 - trialDaysLeft) / 14) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Trial Expired Banner */}
      {isTrialExpired && !Capacitor.isNativePlatform() && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-4 sm:p-5 border border-red-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-red-500/20">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-red-900">{t('home.trialExpired.title', 'Tu prueba gratuita ha terminado')}</h3>
                <p className="text-sm text-red-700 mt-0.5">{t('home.trialExpired.description', 'Renueva tu suscripcion para seguir disfrutando de todas las funciones Pro.')}</p>
                <p className="text-sm font-semibold text-green-700 mt-1">{t('home.trialExpired.offer', 'Obtén 20% de descuento en tu primer mes')}</p>
              </div>
            </div>
            <Link
              to={localePath('/dashboard/plan')}
              className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl hover:from-red-600 hover:to-orange-600 transition-all font-semibold text-sm shadow-lg shadow-red-500/20 text-center flex-shrink-0"
            >
              {t('home.trialExpired.renew', 'Renovar ahora')}
            </Link>
          </div>
        </div>
      )}

      {/* Onboarding Checklist */}
      {!onboardingDismissed && store && (() => {
        const steps = [
          { key: 'addProduct', done: products.length > 0, link: '/dashboard/products/new' },
          { key: 'uploadLogo', done: !!store.logo, link: '/dashboard/branding' },
          { key: 'chooseTheme', done: !!store.themeId && store.themeId !== 'minimal', link: '/dashboard/branding' },
          { key: 'shareStore', done: linkShared, link: null },
          { key: 'setupPayments', done: !!store.payments?.mercadopago?.enabled || !!store.payments?.stripe?.enabled, link: '/dashboard/payments' },
        ]
        const completed = steps.filter(s => s.done).length
        const allDone = completed === steps.length

        if (allDone) return null

        return (
          <div className="bg-white rounded-xl border border-gray-200/60 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-medium text-gray-900">{t('home.onboarding.title')}</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {t('home.onboarding.progress', { completed, total: steps.length })}
                </p>
              </div>
              <button
                onClick={dismissOnboarding}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                {t('home.onboarding.dismiss')}
              </button>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-gradient-to-r from-[#38bdf8] to-[#2d6cb5] rounded-full transition-all duration-500"
                style={{ width: `${(completed / steps.length) * 100}%` }}
              />
            </div>
            {/* Steps */}
            <div className="space-y-2">
              {steps.map((step) => (
                <div key={step.key} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${step.done ? 'bg-green-50' : 'bg-gray-50 hover:bg-[#f0f7ff]'}`}>
                  {step.done ? (
                    <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-7 h-7 border-2 border-gray-300 rounded-full flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${step.done ? 'text-green-700 line-through' : 'text-[#1e3a5f]'}`}>
                      {t(`home.onboarding.${step.key}`)}
                    </p>
                    {!step.done && (
                      <p className="text-xs text-gray-500">{t(`home.onboarding.${step.key}Desc`)}</p>
                    )}
                  </div>
                  {!step.done && (
                    step.link ? (
                      <Link
                        to={localePath(step.link)}
                        className="px-3 py-1.5 bg-[#1e3a5f] text-white rounded-lg text-xs font-medium hover:bg-[#2d6cb5] transition-all flex-shrink-0"
                      >
                        {t('home.onboarding.go')}
                      </Link>
                    ) : (
                      <button
                        onClick={() => {
                          copyLink()
                          markLinkShared()
                        }}
                        className="px-3 py-1.5 bg-[#1e3a5f] text-white rounded-lg text-xs font-medium hover:bg-[#2d6cb5] transition-all flex-shrink-0"
                      >
                        {t('home.copyLink')}
                      </button>
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Quick share */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-200/60">
        <h2 className="text-sm font-medium text-gray-900 mb-3">{t('home.yourLink')}</h2>
        <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
          <code className="block w-full px-4 py-3 bg-[#f0f7ff] rounded-xl text-xs sm:text-sm text-[#1e3a5f] font-medium border border-[#38bdf8]/20 truncate">
            {catalogUrl}
          </code>
          <div className="flex gap-2 sm:flex-shrink-0">
            <a
              href={catalogUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none px-3 py-3 bg-[#1e3a5f] text-white rounded-xl hover:bg-[#2d6cb5] transition flex items-center justify-center shadow-sm"
              title={t('home.openCatalog')}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            <button
              onClick={() => setShowQR(true)}
              className="flex-1 sm:flex-none px-3 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition flex items-center justify-center"
              title={t('home.showQR')}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </button>
            <button
              onClick={copyLink}
              className={`flex-1 sm:flex-none px-3 py-3 rounded-xl transition flex items-center justify-center ${
                copied
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title={copied ? t('home.copied') : t('home.copyLink')}
            >
              {copied ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-6">
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-200/60 flex flex-col items-center text-center">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#1e3a5f] rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-3 shadow-sm">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className="text-xl sm:text-3xl font-bold text-[#1e3a5f]">{products.length}</p>
          <p className="text-gray-600 text-[11px] sm:text-sm mt-0.5 sm:mt-1">{t('home.products')}</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-200/60 flex flex-col items-center text-center">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[#1e3a5f] to-[#1e3a5f] rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-3 shadow-sm">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <p className="text-xl sm:text-3xl font-bold text-[#1e3a5f]">{analytics.pageViews}</p>
          <p className="text-gray-600 text-[11px] sm:text-sm mt-0.5 sm:mt-1">{t('home.visitsWeek')}</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-200/60 flex flex-col items-center text-center">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-3 shadow-lg shadow-green-400/20">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>
          <p className="text-xl sm:text-3xl font-bold text-[#1e3a5f]">{analytics.whatsappClicks}</p>
          <p className="text-gray-600 text-[11px] sm:text-sm mt-0.5 sm:mt-1">{t('home.whatsappClicks')}</p>
        </div>
      </div>

      {/* Milestone Banner - contextual upgrade nudge for free users */}
      {activeMilestone && !Capacitor.isNativePlatform() && (() => {
        const milestoneKeys: Record<string, { icon: ReactNode; gradient: string }> = {
          first_order: {
            icon: (
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
            gradient: 'from-green-50 to-emerald-50 border-green-200'
          },
          products_5: {
            icon: (
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            ),
            gradient: 'from-blue-50 to-indigo-50 border-blue-200'
          },
          whatsapp: {
            icon: (
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            ),
            gradient: 'from-emerald-50 to-green-50 border-emerald-200'
          }
        }
        const tKey = activeMilestone.id === 'first_order' ? 'firstOrder' : activeMilestone.id === 'products_5' ? 'products5' : 'whatsapp'
        const style = milestoneKeys[activeMilestone.id]
        const iconGradient = activeMilestone.id === 'first_order' ? 'from-green-500 to-emerald-600' : activeMilestone.id === 'products_5' ? 'from-blue-500 to-indigo-600' : 'from-emerald-500 to-green-600'

        return (
          <div className={`rounded-xl p-4 sm:p-5 border shadow-sm bg-gradient-to-r ${style.gradient}`}>
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 bg-gradient-to-br ${iconGradient} rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg`}>
                {style.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-[#1e3a5f]">{t(`home.milestone.${tKey}.title`)}</h3>
                  <button
                    onClick={() => dismissMilestone(activeMilestone.id)}
                    className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-0.5">{t(`home.milestone.${tKey}.description`)}</p>
                <Link
                  to={localePath('/dashboard/plan')}
                  className={`inline-block mt-3 px-4 py-2 bg-gradient-to-r ${iconGradient} text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-md`}
                >
                  {t(`home.milestone.${tKey}.cta`)}
                </Link>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Plan Usage Card - only for free plan */}
      {store?.plan === 'free' && !Capacitor.isNativePlatform() && (() => {
        const plan = (store.plan || 'free') as PlanType
        const limits = PLAN_FEATURES[plan].limits
        const productPct = limits.products === -1 ? 0 : Math.round((products.length / limits.products) * 100)
        const categoryPct = limits.categories === -1 ? 0 : Math.round((categories.length / limits.categories) * 100)
        const isNearLimit = productPct >= 70 || categoryPct >= 70

        return (
          <div className={`rounded-xl p-4 sm:p-5 border shadow-sm ${isNearLimit ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200' : 'bg-white border-gray-200/60'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isNearLimit ? 'bg-gradient-to-br from-orange-400 to-amber-500' : 'bg-[#1e3a5f]'}`}>
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900">{t('home.planUsage.title')}</h3>
                  <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium">
                    {PLAN_FEATURES[plan].name}
                  </span>
                </div>
              </div>
              <Link
                to={localePath('/dashboard/plan')}
                className="text-xs font-semibold text-[#2d6cb5] hover:text-[#1e3a5f] transition-colors"
              >
                {t('home.planUsage.upgrade')}
              </Link>
            </div>

            <div className="space-y-3">
              {/* Products usage */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-600">{t('home.products')}</span>
                  <span className={`font-semibold ${productPct >= 80 ? 'text-orange-600' : 'text-[#1e3a5f]'}`}>
                    {products.length}/{limits.products}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${productPct >= 80 ? 'bg-gradient-to-r from-orange-400 to-red-500' : productPct >= 50 ? 'bg-gradient-to-r from-amber-400 to-orange-400' : 'bg-gradient-to-r from-[#38bdf8] to-[#2d6cb5]'}`}
                    style={{ width: `${Math.min(100, productPct)}%` }}
                  />
                </div>
              </div>

              {/* Categories usage */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-600">{t('home.planUsage.categories')}</span>
                  <span className={`font-semibold ${categoryPct >= 80 ? 'text-orange-600' : 'text-[#1e3a5f]'}`}>
                    {categories.length}/{limits.categories}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${categoryPct >= 80 ? 'bg-gradient-to-r from-orange-400 to-red-500' : categoryPct >= 50 ? 'bg-gradient-to-r from-amber-400 to-orange-400' : 'bg-gradient-to-r from-[#38bdf8] to-[#2d6cb5]'}`}
                    style={{ width: `${Math.min(100, categoryPct)}%` }}
                  />
                </div>
              </div>

              {/* Images info */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">{t('home.planUsage.images')}</span>
                <span className="font-semibold text-[#1e3a5f]">{limits.imagesPerProduct} {t('home.planUsage.perProduct')}</span>
              </div>
            </div>

            {isNearLimit && (
              <Link
                to={localePath('/dashboard/plan')}
                className="mt-4 w-full block text-center px-4 py-2.5 bg-[#1e3a5f] text-white rounded-xl hover:bg-[#2d6cb5] transition-all text-sm font-semibold shadow-sm"
              >
                {t('home.planUsage.unlockMore')}
              </Link>
            )}
          </div>
        )
      })()}

      {/* Recent Products */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-gray-900">
            {t('home.recentProducts', { defaultValue: 'Productos recientes' })}
          </h2>
          {products.length > 0 ? (
            <Link
              to={localePath('/dashboard/products')}
              className="text-sm font-medium text-[#2d6cb5] hover:text-[#1e3a5f] transition-colors"
            >
              {t('home.viewAll', { defaultValue: 'Ver todos' })}
            </Link>
          ) : (
            <Link
              to={localePath('/dashboard/products/new')}
              className="px-4 py-2 bg-[#1e3a5f] text-white rounded-xl hover:bg-[#2d6cb5] transition-all text-sm font-semibold shadow-sm"
            >
              {t('home.addFirstProduct', { defaultValue: 'Crear mi primer producto' })}
            </Link>
          )}
        </div>

        {products.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200/60 p-12 text-center">
            <div className="w-20 h-20 bg-gray-50 border border-gray-200/60 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-[#2d6cb5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              {t('home.noProductsTitle')}
            </h3>
            <p className="text-gray-600 mb-6">
              {t('home.noProductsDesc')}
            </p>
            <Link
              to={localePath('/dashboard/products/new')}
              className="inline-flex px-6 py-3 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d6cb5] transition-colors font-medium"
            >
              {t('home.addFirstProduct')}
            </Link>
          </div>
        ) : (
          <div className="-mx-4 sm:-mx-6 lg:mx-0 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide scroll-pl-4 sm:scroll-pl-6 lg:scroll-pl-0" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="flex gap-3 px-4 sm:px-6 lg:px-0 after:content-[''] after:flex-shrink-0 after:w-1">
            {products.slice(0, 5).map((product) => (
              <Link
                key={product.id}
                to={localePath(`/dashboard/products/${product.id}`)}
                className="flex-shrink-0 w-36 sm:w-44 bg-white rounded-xl border border-gray-200/60 overflow-hidden hover:shadow-lg hover:shadow-[#1e3a5f]/10 transition-all group snap-start"
              >
                <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm text-[#1e3a5f] truncate group-hover:text-[#2d6cb5] transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-[#2d6cb5] font-bold text-xs mt-1">
                    {getCurrencySymbol(store?.currency || 'USD')}{product.price.toFixed(2)}
                  </p>
                </div>
              </Link>
            ))}
            {/* Ver más card */}
            <Link
              to={localePath('/dashboard/products')}
              className="flex-shrink-0 w-36 sm:w-44 bg-gradient-to-br from-[#f0f7ff] to-white rounded-xl border border-[#38bdf8]/20 overflow-hidden hover:shadow-lg hover:shadow-[#1e3a5f]/10 transition-all flex flex-col items-center justify-center snap-start"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-[#1e3a5f] to-[#1e3a5f] rounded-xl flex items-center justify-center mb-3 shadow-sm">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-[#1e3a5f]">{t('home.viewAll', { defaultValue: 'Ver todos' })}</span>
              <span className="text-xs text-gray-500 mt-0.5">{products.length} {t('home.products').toLowerCase()}</span>
            </Link>
          </div>
          </div>
        )}
      </div>

      {/* Recommended Themes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-gray-900">
            {t('home.recommendedThemes', { defaultValue: 'Temas recomendados' })}
          </h2>
          <Link
            to={localePath('/dashboard/branding')}
            className="text-sm font-medium text-[#2d6cb5] hover:text-[#1e3a5f] transition-colors"
          >
            {t('home.viewAll')}
          </Link>
        </div>
        <div className="-mx-4 sm:-mx-6 lg:mx-0 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide scroll-pl-4 sm:scroll-pl-6 lg:scroll-pl-0" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="flex gap-3 px-4 sm:px-6 lg:px-0 after:content-[''] after:flex-shrink-0 after:w-1">
          {recommendedThemes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => setPreviewTheme(theme.id)}
              className="flex-shrink-0 w-36 sm:w-44 rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-[#38bdf8]/50 transition-all group snap-start text-left"
            >
              {/* Mini preview */}
              <div
                className="aspect-[4/3] p-3 flex flex-col relative"
                style={{ backgroundColor: theme.colors?.background || '#ffffff' }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="w-5 h-1.5 rounded-full" style={{ backgroundColor: theme.colors?.primary || '#000' }} />
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.colors?.accent || '#666' }} />
                </div>
                <div className="grid grid-cols-2 gap-1 flex-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="rounded aspect-square"
                      style={{ backgroundColor: theme.colors?.primary ? `${theme.colors.primary}15` : '#f3f4f6' }}
                    />
                  ))}
                </div>
                <div className="mt-1.5 flex items-center gap-1">
                  <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: theme.colors?.primary || '#000' }} />
                  <div className="w-5 h-5 rounded-md" style={{ backgroundColor: theme.colors?.accent || '#666' }} />
                </div>
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="px-3 py-1.5 bg-white text-[#1e3a5f] text-xs font-semibold rounded-lg flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    {t('home.preview', { defaultValue: 'Vista previa' })}
                  </span>
                </div>
              </div>
              {/* Theme info */}
              <div className="p-2.5 bg-white border-t border-gray-200/60">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-xs text-[#1e3a5f] truncate">{theme.name}</span>
                  {theme.isNew && (
                    <span className="px-1.5 py-0.5 bg-gradient-to-r from-[#38bdf8] to-[#2d6cb5] text-white text-[9px] font-bold rounded-full flex-shrink-0">
                      NEW
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-500 truncate mt-0.5">{theme.description}</p>
              </div>
            </button>
          ))}
        </div>
        </div>
      </div>

      {/* Feedback / Suggestions — collapsed "mailbox" that expands on click */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setFeedbackExpanded(v => !v)}
          className="w-full flex items-center gap-3 p-4 sm:p-5 text-left hover:bg-gray-50 transition-colors"
          aria-expanded={feedbackExpanded}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#38bdf8]/20 to-[#2d6cb5]/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-[#2d6cb5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[#1e3a5f] text-sm">
              {t('home.feedbackTitle', { defaultValue: 'Buzón de sugerencias' })}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {t('home.feedbackDesc', { defaultValue: 'Reporta errores, sugeri funciones o contanos que te falta' })}
            </p>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${feedbackExpanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {feedbackExpanded && (
          <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-gray-100 pt-4">
            {feedbackSent ? (
              <div className="flex items-center gap-2 py-4 justify-center text-emerald-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-medium">
                  {t('home.feedbackThanks', { defaultValue: 'Gracias por tu mensaje!' })}
                </span>
              </div>
            ) : (
              <>
                <div className="flex gap-2 mb-3">
                  {([
                    { key: 'bug' as const, label: t('home.feedbackBug', { defaultValue: 'Error' }), icon: 'M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
                    { key: 'suggestion' as const, label: t('home.feedbackSuggestion', { defaultValue: 'Sugerencia' }), icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
                    { key: 'missing' as const, label: t('home.feedbackMissing', { defaultValue: 'Falta algo' }), icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6' },
                  ]).map(({ key, label, icon }) => (
                    <button
                      key={key}
                      onClick={() => setFeedbackType(key)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-medium transition-all ${
                        feedbackType === key
                          ? 'bg-[#2d6cb5] text-white shadow-md shadow-[#2d6cb5]/20'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                      </svg>
                      {label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={feedbackMessage}
                  onChange={(e) => setFeedbackMessage(e.target.value)}
                  placeholder={t('home.feedbackPlaceholder', { defaultValue: 'Conta nos que encontraste o que te gustaria ver...' })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#38bdf8]/50 focus:border-[#38bdf8] placeholder:text-gray-400"
                  rows={3}
                />
                <button
                  onClick={submitFeedback}
                  disabled={feedbackSending || !feedbackMessage.trim()}
                  className="mt-2 w-full py-2.5 bg-[#1e3a5f] text-white rounded-xl hover:bg-[#2d6cb5] transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {feedbackSending ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                  {feedbackSending
                    ? t('home.feedbackSending', { defaultValue: 'Enviando...' })
                    : t('home.feedbackSend', { defaultValue: 'Enviar' })
                  }
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Plans mini-grid — 4 quick-pay cards. Hidden on native mobile (payments are web-only)
          and when the user is already on Business Annual (no upsell path left). */}
      {!Capacitor.isNativePlatform() && !(store?.plan === 'business' && (() => {
        const pid = store?.subscription?.stripePriceId
        return pid === STRIPE_PRICES.business.yearly
      })()) && (() => {
        const currentPriceId = store?.subscription?.stripePriceId
        const isActive = store?.subscription?.status === 'active' || store?.subscription?.status === 'trialing'
        const options: { id: Exclude<PlanType, 'free'>; billing: 'monthly' | 'yearly'; popular?: boolean }[] = [
          { id: 'pro', billing: 'monthly', popular: true },
          { id: 'pro', billing: 'yearly' },
          { id: 'business', billing: 'monthly' },
          { id: 'business', billing: 'yearly' },
        ]

        return (
          <div className="bg-white rounded-xl border border-gray-200/60 p-4 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-[#1e3a5f]">{t('home.plansTitle', 'Planes y precios')}</h2>
                <p className="text-sm text-gray-600 mt-0.5">{t('home.plansDesc', 'Elegí el plan que mejor se adapta a tu negocio')}</p>
              </div>
              <Link
                to={localePath('/dashboard/plan')}
                className="hidden sm:inline text-sm text-[#2d6cb5] hover:text-[#1e3a5f] font-medium"
              >
                {t('home.viewAllPlans', 'Ver todos →')}
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {options.map(({ id, billing, popular }) => {
                const feat = PLAN_FEATURES[id]
                const price = billing === 'yearly' ? feat.priceYearly : feat.price
                const priceId = STRIPE_PRICES[id]?.[billing]
                const isCurrent = isActive && priceId && currentPriceId === priceId
                const monthlyEq = billing === 'yearly' ? (price / 12).toFixed(2) : null

                const inner = (
                  <>
                    {popular && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-[#1e3a5f] text-white text-[10px] font-bold rounded-full whitespace-nowrap">
                        {t('plan.badge.popular')}
                      </span>
                    )}
                    <p className="text-xs font-semibold text-[#1e3a5f] mb-1">
                      {feat.name} {billing === 'yearly' ? t('plan.billing.yearly') : t('plan.billing.monthly')}
                    </p>
                    <p className="text-xl font-bold text-[#1e3a5f] leading-none">${price}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {billing === 'yearly' ? t('plan.billing.perYear') : t('plan.billing.perMonth')}
                    </p>
                    {monthlyEq && (
                      <p className="text-[10px] text-green-600 font-medium mt-1">≈ ${monthlyEq}{t('plan.billing.perMonth')}</p>
                    )}
                    <div className={`mt-2 text-center text-xs font-semibold py-1.5 rounded-lg ${
                      isCurrent
                        ? 'bg-gray-100 text-gray-400'
                        : popular
                        ? 'bg-[#1e3a5f] text-white'
                        : 'bg-[#f0f7ff] text-[#1e3a5f]'
                    }`}>
                      {isCurrent ? t('plan.buttons.current') : t('plan.buttons.upgrade')}
                    </div>
                  </>
                )

                if (isCurrent) {
                  return (
                    <div key={`${id}_${billing}`} className="relative bg-gray-50 border border-gray-200 rounded-lg p-3 opacity-70">
                      {inner}
                    </div>
                  )
                }

                return (
                  <Link
                    key={`${id}_${billing}`}
                    to={localePath(`/dashboard/plan?upgrade=${id}&billing=${billing}`)}
                    className={`relative block bg-white border rounded-lg p-3 transition-all hover:shadow-md ${
                      popular ? 'border-[#2d6cb5] shadow-sm shadow-[#2d6cb5]/10' : 'border-gray-200/60 hover:border-[#38bdf8]/50'
                    }`}
                  >
                    {inner}
                  </Link>
                )
              })}
            </div>

            <Link
              to={localePath('/dashboard/plan')}
              className="block sm:hidden mt-3 text-center text-sm text-[#2d6cb5] hover:text-[#1e3a5f] font-medium"
            >
              {t('home.viewAllPlans', 'Ver todos →')}
            </Link>
          </div>
        )
      })()}

      {/* Per-plan collapsible rows — one dropdown per plan, each expands to show its features.
          Hidden on native mobile like the pricing grid. */}
      {!Capacitor.isNativePlatform() && (
        <div className="space-y-2">
          {(['free', 'pro', 'business'] as const).map(planId => {
            const feat = PLAN_FEATURES[planId]
            const isCurrent = store?.plan === planId
            const isHighlighted = planId === 'pro'
            const expanded = !!expandedPlanRows[planId]
            const toggle = () => setExpandedPlanRows(prev => ({ ...prev, [planId]: !prev[planId] }))

            return (
              <div
                key={planId}
                className={`bg-white rounded-xl border overflow-hidden ${
                  isHighlighted ? 'border-[#2d6cb5]/40' : 'border-gray-200'
                }`}
              >
                <button
                  type="button"
                  onClick={toggle}
                  className="w-full flex items-center gap-3 p-4 sm:p-5 text-left hover:bg-gray-50 transition-colors"
                  aria-expanded={expanded}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    planId === 'free'
                      ? 'bg-gray-100'
                      : planId === 'pro'
                      ? 'bg-gradient-to-br from-[#38bdf8]/20 to-[#2d6cb5]/20'
                      : 'bg-gradient-to-br from-amber-100 to-orange-100'
                  }`}>
                    <svg className={`w-5 h-5 ${
                      planId === 'free' ? 'text-gray-500' : planId === 'pro' ? 'text-[#2d6cb5]' : 'text-amber-600'
                    }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {planId === 'free' && (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      )}
                      {planId === 'pro' && (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      )}
                      {planId === 'business' && (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      )}
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-[#1e3a5f] text-sm">{feat.name}</h3>
                      {isCurrent && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-semibold rounded-full">
                          {t('plan.buttons.current')}
                        </span>
                      )}
                      {!isCurrent && isHighlighted && (
                        <span className="px-2 py-0.5 bg-[#1e3a5f] text-white text-[10px] font-semibold rounded-full">
                          {t('plan.badge.popular')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {feat.price === 0 ? t('plan.badge.free') : `$${feat.price}${t('plan.billing.perMonth')} · $${feat.priceYearly}${t('plan.billing.perYear')}`}
                    </p>
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {expanded && (
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-gray-100 pt-4">
                    <ul className="space-y-2">
                      {feat.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <svg className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    {!isCurrent && planId !== 'free' && (
                      <div className="mt-4 flex gap-2">
                        <Link
                          to={localePath(`/dashboard/plan?upgrade=${planId}&billing=monthly`)}
                          className="flex-1 text-center text-xs font-semibold py-2 rounded-lg bg-[#f0f7ff] text-[#1e3a5f] hover:bg-[#e0efff] transition-all"
                        >
                          {t('plan.billing.monthly')} · ${feat.price}
                        </Link>
                        <Link
                          to={localePath(`/dashboard/plan?upgrade=${planId}&billing=yearly`)}
                          className="flex-1 text-center text-xs font-semibold py-2 rounded-lg bg-[#1e3a5f] text-white hover:bg-[#2d6cb5] transition-all"
                        >
                          {t('plan.billing.yearly')} · ${feat.priceYearly}
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>

      {/* Theme Preview Modal */}
      {previewTheme && store && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <div className="flex-1 overflow-auto">
            {(() => {
              const ThemeComponent = getThemeComponent(previewTheme)
              return (
                <ThemeComponent
                  store={store}
                  products={products}
                  categories={categories}
                />
              )
            })()}
          </div>
          {/* Floating bottom bar */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className="flex items-center gap-2 px-2 py-2 bg-black/70 backdrop-blur-md rounded-full shadow-2xl border border-white/10">
              <button
                onClick={() => setPreviewTheme(null)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <span className="text-white/80 text-sm px-2 hidden sm:block">
                {themes.find(th => th.id === previewTheme)?.name}
              </span>
              <div className="w-px h-6 bg-white/20 hidden sm:block" />
              <button
                onClick={async () => {
                  if (!store) return
                  setSavingTheme(true)
                  try {
                    await updateDoc(doc(db, 'stores', store.id), { themeId: previewTheme, updatedAt: new Date() })
                    setPreviewTheme(null)
                  } catch (error) {
                    console.error('Error saving theme:', error)
                  } finally {
                    setSavingTheme(false)
                  }
                }}
                disabled={savingTheme}
                className="px-4 py-2 bg-white text-gray-900 rounded-full hover:bg-gray-100 transition-all font-medium text-sm disabled:opacity-70 flex items-center gap-2"
              >
                {savingTheme && (
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-gray-900 rounded-full animate-spin" />
                )}
                {savingTheme ? t('home.saving', { defaultValue: 'Guardando...' }) : t('home.useTheme', { defaultValue: 'Usar tema' })}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQR && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowQR(false)}
        >
          <div
            className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#1e3a5f]">{t('home.qrTitle')}</h3>
              <button
                onClick={() => setShowQR(false)}
                className="p-1 text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200/60 flex items-center justify-center mb-4">
              <img
                src={qrCodeUrl}
                alt="QR Code"
                className="w-48 h-48"
              />
            </div>

            <p className="text-center text-sm text-gray-500 mb-4 break-all">
              {catalogUrl}
            </p>

            <button
              onClick={downloadQR}
              className="w-full py-3 bg-[#1e3a5f] text-white rounded-xl hover:bg-[#2d6cb5] transition font-medium flex items-center justify-center gap-2 shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {t('home.downloadQR')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
