import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import type { Store } from '../../types'

export default function Integrations() {
  const { t } = useTranslation('dashboard')
  const { firebaseUser } = useAuth()
  const { showToast } = useToast()
  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [googleAnalytics, setGoogleAnalytics] = useState('')
  const [metaPixel, setMetaPixel] = useState('')
  const [tiktokPixel, setTiktokPixel] = useState('')
  const [googleSearchConsole, setGoogleSearchConsole] = useState('')
  const [cjApiKey, setCjApiKey] = useState('')
  const [printfulToken, setPrintfulToken] = useState('')

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

          if (storeData.integrations) {
            setGoogleAnalytics(storeData.integrations.googleAnalytics || '')
            setMetaPixel(storeData.integrations.metaPixel || '')
            setTiktokPixel(storeData.integrations.tiktokPixel || '')
            setGoogleSearchConsole(storeData.integrations.googleSearchConsole || '')
            setCjApiKey(storeData.integrations.cjApiKey || '')
            setPrintfulToken(storeData.integrations.printfulToken || '')
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
      await updateDoc(doc(db, 'stores', store.id), {
        integrations: {
          googleAnalytics: googleAnalytics.trim() || null,
          metaPixel: metaPixel.trim() || null,
          tiktokPixel: tiktokPixel.trim() || null,
          googleSearchConsole: googleSearchConsole.trim() || null,
          cjApiKey: cjApiKey.trim() || null,
          printfulToken: printfulToken.trim() || null,
        },
        updatedAt: new Date()
      })
      showToast(t('integrations.toast.saved'), 'success')
    } catch (error) {
      console.error('Error saving:', error)
      showToast(t('integrations.toast.error'), 'error')
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

  const cards = [
    {
      key: 'googleAnalytics',
      title: t('integrations.googleAnalytics.title'),
      description: t('integrations.googleAnalytics.description'),
      label: t('integrations.googleAnalytics.label'),
      placeholder: t('integrations.googleAnalytics.placeholder'),
      value: googleAnalytics,
      onChange: setGoogleAnalytics,
      color: '#F9AB00',
      icon: (
        <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.84 2.998v17.958c0 .97-.654 1.823-1.59 2.073l-.098.024a2.126 2.126 0 01-2.503-1.476l-.016-.063a2.127 2.127 0 01-.076-.558V6.11L7.057 19.562a2.127 2.127 0 01-1.778.966h-.002a2.127 2.127 0 01-1.78-.966L1.16 15.53a2.127 2.127 0 01.378-2.652l.052-.048L14.633 2.126A2.127 2.127 0 0116.148 1.5h4.565c1.175 0 2.127.952 2.127 2.127v-.63z"/>
        </svg>
      ),
    },
    {
      key: 'metaPixel',
      title: t('integrations.metaPixel.title'),
      description: t('integrations.metaPixel.description'),
      label: t('integrations.metaPixel.label'),
      placeholder: t('integrations.metaPixel.placeholder'),
      value: metaPixel,
      onChange: setMetaPixel,
      color: '#1877F2',
      icon: (
        <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
    },
    {
      key: 'tiktokPixel',
      title: t('integrations.tiktokPixel.title'),
      description: t('integrations.tiktokPixel.description'),
      label: t('integrations.tiktokPixel.label'),
      placeholder: t('integrations.tiktokPixel.placeholder'),
      value: tiktokPixel,
      onChange: setTiktokPixel,
      color: '#000000',
      icon: (
        <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.75a8.18 8.18 0 004.76 1.52V6.84a4.84 4.84 0 01-1-.15z"/>
        </svg>
      ),
    },
    {
      key: 'googleSearchConsole',
      title: t('integrations.googleSearchConsole.title'),
      description: t('integrations.googleSearchConsole.description'),
      label: t('integrations.googleSearchConsole.label'),
      placeholder: t('integrations.googleSearchConsole.placeholder'),
      value: googleSearchConsole,
      onChange: setGoogleSearchConsole,
      color: '#4285F4',
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
    {
      key: 'cjApiKey',
      title: 'CJ Dropshipping',
      description: 'Conecta tu cuenta de CJ Dropshipping para importar productos y hacer dropshipping. Registrate gratis en cjdropshipping.com y obtiene tu API Key.',
      label: 'API Key',
      placeholder: 'CJ1234567@api@xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      value: cjApiKey,
      onChange: setCjApiKey,
      color: '#F57C00',
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      key: 'printfulToken',
      title: 'Printful',
      description: 'Conecta tu cuenta de Printful para vender productos print-on-demand (remeras, tazas, posters y mas). Genera tu token en printful.com > Settings > API.',
      label: 'Private Token',
      placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      value: printfulToken,
      onChange: setPrintfulToken,
      color: '#2E7D32',
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      ),
    },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('integrations.title')}</h1>
          <p className="text-gray-600 mt-1">{t('integrations.subtitle')}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto px-6 py-2.5 bg-[#1e3a5f] text-white rounded-xl hover:bg-[#2d6cb5] transition-all font-semibold disabled:opacity-50 shadow-sm"
        >
          {saving ? t('integrations.saving') : t('integrations.saveChanges')}
        </button>
      </div>

      {/* Cards */}
      <div className="space-y-6">
        {cards.map((card) => (
          <div key={card.key} className="bg-white rounded-xl border border-gray-200/60 p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
                style={{ backgroundColor: card.color, boxShadow: `0 4px 14px ${card.color}33` }}
              >
                {card.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-[#1e3a5f]">{card.title}</h2>
                <p className="text-sm text-gray-600 mt-1">{card.description}</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200/60">
              <label className="block text-sm font-medium text-[#1e3a5f] mb-1">{card.label}</label>
              <input
                type="text"
                value={card.value}
                onChange={(e) => card.onChange(e.target.value)}
                placeholder={card.placeholder}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all font-mono text-sm"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
