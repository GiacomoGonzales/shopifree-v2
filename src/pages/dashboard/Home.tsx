import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import { productService, analyticsService } from '../../lib/firebase'
import { getCurrencySymbol } from '../../lib/currency'
import type { Product } from '../../types'

export default function DashboardHome() {
  const { t } = useTranslation('dashboard')
  const { localePath } = useLanguage()
  const { store } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [analytics, setAnalytics] = useState({ pageViews: 0, whatsappClicks: 0 })

  useEffect(() => {
    const fetchData = async () => {
      if (!store) return

      try {
        const [productsData, analyticsData] = await Promise.all([
          productService.getAll(store.id),
          analyticsService.getWeeklyStats(store.id)
        ])
        setProducts(productsData)
        setAnalytics(analyticsData)
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
      const response = await fetch(qrCodeUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${store?.subdomain || 'tienda'}-qr.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">{t('home.title')}</h1>
        <p className="text-gray-600 mt-1">
          {t('home.welcomeStore', { store: store?.name || 'Store' })}
        </p>
      </div>

      {/* Quick share */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm">
        <h2 className="text-sm font-semibold text-[#1e3a5f] mb-3">{t('home.yourLink')}</h2>
        <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
          <code className="block w-full px-4 py-3 bg-[#f0f7ff] rounded-xl text-xs sm:text-sm text-[#1e3a5f] font-medium border border-[#38bdf8]/20 truncate">
            {catalogUrl}
          </code>
          <div className="flex gap-2 sm:flex-shrink-0">
            <a
              href={catalogUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none px-3 py-3 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white rounded-xl hover:from-[#2d6cb5] hover:to-[#38bdf8] transition flex items-center justify-center shadow-lg shadow-[#1e3a5f]/20"
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm">
          <div className="w-10 h-10 bg-gradient-to-br from-[#38bdf8] to-[#2d6cb5] rounded-xl flex items-center justify-center mb-3 shadow-lg shadow-[#38bdf8]/20">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-[#1e3a5f]">{products.length}</p>
          <p className="text-gray-600 text-sm mt-1">{t('home.products')}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm">
          <div className="w-10 h-10 bg-gradient-to-br from-[#1e3a5f] to-[#2d6cb5] rounded-xl flex items-center justify-center mb-3 shadow-lg shadow-[#1e3a5f]/20">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-[#1e3a5f]">{analytics.pageViews}</p>
          <p className="text-gray-600 text-sm mt-1">{t('home.visitsWeek')}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm">
          <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center mb-3 shadow-lg shadow-green-400/20">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>
          <p className="text-3xl font-bold text-[#1e3a5f]">{analytics.whatsappClicks}</p>
          <p className="text-gray-600 text-sm mt-1">{t('home.whatsappClicks')}</p>
        </div>
      </div>

      {/* Products */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#1e3a5f]">
            {t('home.yourProducts', { count: products.length })}
          </h2>
          <Link
            to={localePath('/dashboard/products/new')}
            className="px-4 py-2 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white rounded-xl hover:from-[#2d6cb5] hover:to-[#38bdf8] transition-all text-sm font-semibold shadow-lg shadow-[#1e3a5f]/20"
          >
            {t('home.addProduct')}
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
            <div className="w-20 h-20 bg-gradient-to-br from-[#f0f7ff] to-white border border-[#38bdf8]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-[#2d6cb5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[#1e3a5f] mb-2">
              {t('home.noProductsTitle')}
            </h3>
            <p className="text-gray-600 mb-6">
              {t('home.noProductsDesc')}
            </p>
            <Link
              to={localePath('/dashboard/products/new')}
              className="inline-flex px-6 py-3 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white rounded-xl hover:from-[#2d6cb5] hover:to-[#38bdf8] transition-all font-semibold shadow-lg shadow-[#1e3a5f]/20"
            >
              {t('home.addFirstProduct')}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <Link
                key={product.id}
                to={localePath(`/dashboard/products/${product.id}`)}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:shadow-[#1e3a5f]/10 transition-all group"
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
                      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-[#1e3a5f] truncate group-hover:text-[#2d6cb5] transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-[#2d6cb5] font-bold text-sm mt-1">
                    {getCurrencySymbol(store?.currency || 'USD')}{product.price.toFixed(2)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Upgrade banner */}
      <div className="bg-gradient-to-r from-[#1e3a5f] via-[#2d6cb5] to-[#38bdf8] rounded-2xl p-4 sm:p-6 text-white shadow-xl shadow-[#1e3a5f]/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="font-bold text-lg">{t('home.upgradeTitle')}</h3>
            <p className="text-white/80 mt-1 text-sm sm:text-base">
              {t('home.upgradeDesc')}
            </p>
          </div>
          <Link
            to={localePath('/dashboard/plan')}
            className="px-6 py-3 bg-white text-[#1e3a5f] rounded-xl hover:bg-white/90 transition font-semibold shadow-lg text-center sm:flex-shrink-0"
          >
            {t('home.viewPlans')}
          </Link>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQR && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowQR(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
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

            <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-center mb-4">
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
              className="w-full py-3 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white rounded-xl hover:from-[#2d6cb5] hover:to-[#38bdf8] transition font-medium flex items-center justify-center gap-2 shadow-lg shadow-[#1e3a5f]/20"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {t('home.downloadQR')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
