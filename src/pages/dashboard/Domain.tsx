import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Capacitor } from '@capacitor/core'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import type { Store } from '../../types'

const API_URL = 'https://shopifree.app/api'

export default function Domain() {
  const { t } = useTranslation('dashboard')
  const { firebaseUser } = useAuth()
  const { showToast } = useToast()
  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [customDomain, setCustomDomain] = useState('')
  const [dnsRecords, setDnsRecords] = useState<Array<{type: string, name: string, value: string}>>([])
  const [loadingDns, setLoadingDns] = useState(false)

  const fetchDnsRecords = async (domain: string) => {
    setLoadingDns(true)
    try {
      // Call Vercel config API directly from browser - no serverless middleman
      const vercelToken = import.meta.env.VITE_VERCEL_TOKEN
      const response = await fetch(
        `https://api.vercel.com/v6/domains/${domain}/config`,
        { headers: { 'Authorization': `Bearer ${vercelToken}` } }
      )
      if (response.ok) {
        const configData = await response.json()
        const records: Array<{type: string, name: string, value: string}> = []

        const ip = configData.recommendedIPv4?.find((r: { rank: number }) => r.rank === 1)?.value?.[0]
        if (ip) records.push({ type: 'A', name: '@', value: ip })

        const cname = configData.recommendedCNAME?.find((r: { rank: number }) => r.rank === 1)?.value?.replace(/\.$/, '')
        if (cname) records.push({ type: 'CNAME', name: 'www', value: cname })

        if (records.length > 0) setDnsRecords(records)
      }
    } catch (err) {
      console.error('Error fetching DNS records:', err)
    } finally {
      setLoadingDns(false)
    }
  }

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
          setCustomDomain(storeData.customDomain || '')

          // Always fetch fresh DNS records from Vercel if domain exists and is not verified
          if (storeData.customDomain && storeData.domainStatus !== 'verified') {
            fetchDnsRecords(storeData.customDomain)
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

  const handleSaveDomain = async () => {
    if (!store) return

    // Validar formato de dominio
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/
    const cleanDomain = customDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')

    if (!cleanDomain) {
      showToast('Ingresa un dominio válido', 'error')
      return
    }

    if (!domainRegex.test(cleanDomain)) {
      showToast('El formato del dominio no es válido', 'error')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`${API_URL}/domain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          storeId: store.id,
          domain: cleanDomain
        })
      })

      const data = await response.json()

      if (!response.ok) {
        showToast(data.error || 'Error al agregar dominio', 'error')
        return
      }

      setCustomDomain(cleanDomain)
      setStore({
        ...store,
        customDomain: cleanDomain,
        domainStatus: 'pending_verification',
        domainVerification: data.verification,
      })
      // Fetch fresh DNS records from Vercel
      fetchDnsRecords(cleanDomain)
      showToast('Dominio agregado correctamente', 'success')
    } catch (error) {
      console.error('Error saving domain:', error)
      showToast('Error al guardar el dominio', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveDomain = async () => {
    if (!store || !store.customDomain) return

    setSaving(true)
    try {
      const response = await fetch(`${API_URL}/domain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove',
          storeId: store.id,
          domain: store.customDomain
        })
      })

      const data = await response.json()

      if (!response.ok) {
        showToast(data.error || 'Error al eliminar dominio', 'error')
        return
      }

      setCustomDomain('')
      setStore({
        ...store,
        customDomain: undefined,
        domainStatus: undefined,
        domainVerification: undefined
      })
      showToast('Dominio eliminado', 'success')
    } catch (error) {
      console.error('Error removing domain:', error)
      showToast('Error al eliminar el dominio', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleVerifyDomain = async () => {
    if (!store || !store.customDomain) return

    setVerifying(true)
    try {
      const response = await fetch(`${API_URL}/domain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          storeId: store.id,
          domain: store.customDomain
        })
      })

      const data = await response.json()

      if (!response.ok) {
        showToast(data.error || 'Error al verificar dominio', 'error')
        return
      }

      setStore({
        ...store,
        domainStatus: data.status,
        domainVerification: data.verification,
      })
      if (data.dnsRecords && data.dnsRecords.length > 0) {
        setDnsRecords(data.dnsRecords)
      }

      if (data.verified) {
        showToast('¡Dominio verificado correctamente!', 'success')
      } else {
        showToast('El DNS aún no está configurado correctamente', 'info')
      }
    } catch (error) {
      console.error('Error verifying domain:', error)
      showToast('Error al verificar el dominio', 'error')
    } finally {
      setVerifying(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a5f]"></div>
      </div>
    )
  }

  const catalogUrl = store ? `https://${store.subdomain}.shopifree.app` : ''
  const hasDomainConfigured = store?.customDomain && store.customDomain.length > 0
  const isVerified = store?.domainStatus === 'verified'

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
            <div className="flex flex-col sm:flex-row gap-3">
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
            <div className="flex flex-col gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#38bdf8] to-[#2d6cb5] rounded-2xl flex items-center justify-center shadow-lg shadow-[#38bdf8]/20 flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-[#1e3a5f]">{t('domain.custom.title')}</h2>
                <p className="text-sm text-gray-600 mt-1 mb-4" dangerouslySetInnerHTML={{ __html: t('domain.custom.description') }} />

                {store?.plan === 'pro' || store?.plan === 'business' ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-semibold rounded-full">PRO</span>
                      <span className="text-sm font-medium text-green-600">{t('domain.custom.proActive', 'Plan Pro activo')}</span>
                    </div>

                    {hasDomainConfigured ? (
                      // Dominio ya configurado
                      <div className="space-y-4">
                        <div className={`p-4 rounded-xl border ${isVerified ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                          <div className="flex items-center gap-2 mb-2">
                            {isVerified ? (
                              <>
                                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="font-medium text-green-800">Dominio verificado</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-5 h-5 text-amber-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="font-medium text-amber-800">Pendiente de verificación</span>
                              </>
                            )}
                          </div>
                          <code className={`text-sm font-mono ${isVerified ? 'text-green-700' : 'text-amber-700'}`}>
                            {store.customDomain}
                          </code>
                        </div>

                        {!isVerified && (
                          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                            <p className="text-sm text-blue-800 font-medium mb-2">
                              Configura tu DNS para activar el dominio:
                            </p>
                            {loadingDns ? (
                              <div className="flex items-center gap-2 py-4 justify-center">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                <span className="text-sm text-blue-600">Obteniendo registros DNS de Vercel...</span>
                              </div>
                            ) : dnsRecords.length > 0 ? (
                              <div className="space-y-2 text-xs font-mono bg-white p-3 rounded-lg border border-blue-100 overflow-x-auto">
                                <div className="grid grid-cols-[60px_60px_1fr_36px] gap-2 text-blue-700 min-w-[300px]">
                                  <span className="font-semibold">Tipo</span>
                                  <span className="font-semibold">Nombre</span>
                                  <span className="font-semibold">Valor</span>
                                  <span></span>
                                </div>
                                {dnsRecords.map((record, index) => (
                                  <div key={index} className="grid grid-cols-[60px_60px_1fr_36px] gap-2 text-blue-900 min-w-[300px] items-center">
                                    <span>{record.type}</span>
                                    <span>{record.name}</span>
                                    <span className="break-all">{record.value}</span>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(record.value)
                                        showToast('Copiado', 'success')
                                      }}
                                      className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                      title="Copiar valor"
                                    >
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                      </svg>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-red-600 py-2">
                                No se pudieron obtener los registros DNS. Haz clic en "Verificar DNS" para reintentar.
                              </p>
                            )}
                            <p className="text-xs text-blue-600 mt-2">
                              Los cambios de DNS pueden tardar hasta 48 horas en propagarse.
                            </p>
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-2">
                          {!isVerified && (
                            <button
                              onClick={handleVerifyDomain}
                              disabled={verifying}
                              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white rounded-xl hover:from-[#2d6cb5] hover:to-[#38bdf8] transition-all text-sm font-semibold disabled:opacity-50"
                            >
                              {verifying ? 'Verificando...' : 'Verificar DNS'}
                            </button>
                          )}
                          <button
                            onClick={handleRemoveDomain}
                            disabled={saving}
                            className="flex-1 px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-100 transition-all text-sm font-medium disabled:opacity-50"
                          >
                            {saving ? 'Eliminando...' : 'Eliminar dominio'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Formulario para agregar dominio
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
                            {t('domain.custom.yourDomain', 'Tu dominio personalizado')}
                          </label>
                          <input
                            type="text"
                            value={customDomain}
                            onChange={(e) => setCustomDomain(e.target.value)}
                            placeholder="tutienda.com"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {t('domain.custom.domainHint', 'Ingresa el dominio que deseas conectar (ej: mitienda.com)')}
                          </p>
                        </div>
                        <button
                          onClick={handleSaveDomain}
                          disabled={saving || !customDomain.trim()}
                          className="w-full px-4 py-2.5 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white rounded-xl hover:from-[#2d6cb5] hover:to-[#38bdf8] transition-all text-sm font-semibold shadow-lg shadow-[#1e3a5f]/20 disabled:opacity-50"
                        >
                          {saving ? 'Guardando...' : t('domain.custom.connect', 'Conectar dominio')}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-[#f0f7ff] to-white border border-[#38bdf8]/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 bg-[#2d6cb5] text-white text-xs font-semibold rounded-full">{t('domain.custom.proBadge')}</span>
                      <span className="text-sm font-medium text-[#1e3a5f]">{t('domain.custom.proPlan')}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {t('domain.custom.upgradeMessage')}
                    </p>
                    {!Capacitor.isNativePlatform() && (
                      <button
                        onClick={() => showToast(t('domain.toast.comingSoon'), 'info')}
                        className="w-full px-4 py-2.5 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white rounded-xl hover:from-[#2d6cb5] hover:to-[#38bdf8] transition-all text-sm font-semibold shadow-lg shadow-[#1e3a5f]/20"
                      >
                        {t('domain.custom.viewPlans')}
                      </button>
                    )}
                  </div>
                )}
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
                <p className="font-medium text-[#1e3a5f]">Compra tu dominio</p>
                <p className="text-xs text-gray-500 mt-0.5">Puedes comprarlo en GoDaddy, Namecheap, Google Domains, etc.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 bg-[#f0f7ff] rounded-full flex items-center justify-center text-[#2d6cb5] font-semibold text-xs flex-shrink-0">2</span>
              <div>
                <p className="font-medium text-[#1e3a5f]">Ingresa tu dominio aquí</p>
                <p className="text-xs text-gray-500 mt-0.5">Escribe tu dominio en el campo de arriba y guárdalo.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 bg-[#f0f7ff] rounded-full flex items-center justify-center text-[#2d6cb5] font-semibold text-xs flex-shrink-0">3</span>
              <div>
                <p className="font-medium text-[#1e3a5f]">Configura el DNS</p>
                <p className="text-xs text-gray-500 mt-0.5">Agrega los registros DNS que aparecen en la tabla (se obtienen automáticamente de Vercel)</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 bg-[#f0f7ff] rounded-full flex items-center justify-center text-[#2d6cb5] font-semibold text-xs flex-shrink-0">4</span>
              <div>
                <p className="font-medium text-[#1e3a5f]">Verifica el dominio</p>
                <p className="text-xs text-gray-500 mt-0.5">Haz clic en "Verificar DNS" para confirmar que está configurado correctamente.</p>
              </div>
            </li>
          </ol>

          <div className="mt-6 p-3 bg-[#f0f7ff] rounded-xl">
            <p className="text-xs text-[#1e3a5f]">
              <span className="font-medium">Tip:</span> Si tienes problemas, contacta a tu proveedor de dominio para ayuda con la configuración DNS.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
