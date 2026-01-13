import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import type { Store } from '../../types'

export default function Domain() {
  const { t } = useTranslation('dashboard')
  const { firebaseUser } = useAuth()
  const { showToast } = useToast()
  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStore = async () => {
      if (!firebaseUser) return

      try {
        const storesRef = collection(db, 'stores')
        const storeQuery = query(storesRef, where('ownerId', '==', firebaseUser.uid))
        const storeSnapshot = await getDocs(storeQuery)

        if (!storeSnapshot.empty) {
          const storeData = storeSnapshot.docs[0].data() as Store
          setStore({ ...storeData, id: storeSnapshot.docs[0].id })
        }
      } catch (error) {
        console.error('Error fetching store:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStore()
  }, [firebaseUser])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a5f]"></div>
      </div>
    )
  }

  const catalogUrl = store ? `https://${store.subdomain}.shopifree.app` : ''

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1e3a5f]">{t('domain.title')}</h1>
        <p className="text-gray-600 mt-1">{t('domain.subtitle')}</p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Current URL */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">{t('domain.currentUrl.title')}</h2>
            <div className="flex gap-3">
              <code className="flex-1 px-4 py-3 bg-[#f0f7ff] rounded-xl text-sm text-[#1e3a5f] font-medium border border-[#38bdf8]/20 break-all">
                {catalogUrl}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(catalogUrl)
                  showToast(t('domain.toast.copied'), 'success')
                }}
                className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all text-sm font-medium whitespace-nowrap flex-shrink-0"
              >
                {t('domain.currentUrl.copy')}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {t('domain.currentUrl.freeLink')}
            </p>
          </div>

          {/* Custom Domain */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#38bdf8] to-[#2d6cb5] rounded-2xl flex items-center justify-center shadow-lg shadow-[#38bdf8]/20 flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-[#1e3a5f]">{t('domain.custom.title')}</h2>
                <p className="text-sm text-gray-600 mt-1 mb-4" dangerouslySetInnerHTML={{ __html: t('domain.custom.description') }} />

                <div className="bg-gradient-to-br from-[#f0f7ff] to-white border border-[#38bdf8]/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-[#2d6cb5] text-white text-xs font-semibold rounded-full">{t('domain.custom.proBadge')}</span>
                    <span className="text-sm font-medium text-[#1e3a5f]">{t('domain.custom.proPlan')}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {t('domain.custom.upgradeMessage')}
                  </p>
                  <button
                    onClick={() => showToast(t('domain.toast.comingSoon'), 'info')}
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white rounded-xl hover:from-[#2d6cb5] hover:to-[#38bdf8] transition-all text-sm font-semibold shadow-lg shadow-[#1e3a5f]/20"
                  >
                    {t('domain.custom.viewPlans')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Instructions */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm h-fit">
          <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">{t('domain.instructions.title')}</h2>
          <ol className="space-y-4 text-sm text-gray-600">
            <li className="flex gap-3">
              <span className="w-6 h-6 bg-[#f0f7ff] rounded-full flex items-center justify-center text-[#2d6cb5] font-semibold text-xs flex-shrink-0">1</span>
              <div>
                <p className="font-medium text-[#1e3a5f]">{t('domain.instructions.step1.title')}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t('domain.instructions.step1.description')}</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 bg-[#f0f7ff] rounded-full flex items-center justify-center text-[#2d6cb5] font-semibold text-xs flex-shrink-0">2</span>
              <div>
                <p className="font-medium text-[#1e3a5f]">{t('domain.instructions.step2.title')}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t('domain.instructions.step2.description')}</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 bg-[#f0f7ff] rounded-full flex items-center justify-center text-[#2d6cb5] font-semibold text-xs flex-shrink-0">3</span>
              <div>
                <p className="font-medium text-[#1e3a5f]">{t('domain.instructions.step3.title')}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t('domain.instructions.step3.description')}</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 bg-[#f0f7ff] rounded-full flex items-center justify-center text-[#2d6cb5] font-semibold text-xs flex-shrink-0">4</span>
              <div>
                <p className="font-medium text-[#1e3a5f]">{t('domain.instructions.step4.title')}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t('domain.instructions.step4.description')}</p>
              </div>
            </li>
          </ol>

          <div className="mt-6 p-3 bg-[#f0f7ff] rounded-xl">
            <p className="text-xs text-[#1e3a5f]">
              <span className="font-medium">{t('domain.instructions.tip')}</span> {t('domain.instructions.tipText')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
