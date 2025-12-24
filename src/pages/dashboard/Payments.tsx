import { useState, useEffect } from 'react'
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import type { Store } from '../../types'

export default function Payments() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // MercadoPago settings
  const [mpEnabled, setMpEnabled] = useState(false)
  const [mpPublicKey, setMpPublicKey] = useState('')
  const [mpAccessToken, setMpAccessToken] = useState('')
  const [mpSandbox, setMpSandbox] = useState(true)

  useEffect(() => {
    const fetchStore = async () => {
      if (!user) return

      try {
        const storesRef = collection(db, 'stores')
        const storeQuery = query(storesRef, where('ownerId', '==', user.uid))
        const storeSnapshot = await getDocs(storeQuery)

        if (!storeSnapshot.empty) {
          const storeData = storeSnapshot.docs[0].data() as Store
          setStore({ ...storeData, id: storeSnapshot.docs[0].id })

          if (storeData.payments?.mercadopago) {
            setMpEnabled(storeData.payments.mercadopago.enabled || false)
            setMpPublicKey(storeData.payments.mercadopago.publicKey || '')
            setMpAccessToken(storeData.payments.mercadopago.accessToken || '')
            setMpSandbox(storeData.payments.mercadopago.sandbox ?? true)
          }
        }
      } catch (error) {
        console.error('Error fetching store:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStore()
  }, [user])

  const handleSave = async () => {
    if (!store) return

    setSaving(true)
    try {
      await updateDoc(doc(db, 'stores', store.id), {
        payments: {
          mercadopago: {
            enabled: mpEnabled,
            publicKey: mpPublicKey || null,
            accessToken: mpAccessToken || null,
            sandbox: mpSandbox
          }
        },
        updatedAt: new Date()
      })
      showToast('Configuracion guardada', 'success')
    } catch (error) {
      console.error('Error saving:', error)
      showToast('Error al guardar', 'error')
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
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Pagos</h1>
          <p className="text-gray-600 mt-1">Configura tus metodos de pago</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white rounded-xl hover:from-[#2d6cb5] hover:to-[#38bdf8] transition-all font-semibold disabled:opacity-50 shadow-lg shadow-[#1e3a5f]/20"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

      <div className="space-y-8">
        {/* WhatsApp (default) */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/20">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-[#1e3a5f]">WhatsApp</h2>
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">Activo</span>
              </div>
              <p className="text-gray-600 mt-1">
                Los clientes pueden hacer pedidos directamente por WhatsApp. Este metodo siempre esta disponible.
              </p>
            </div>
          </div>
        </div>

        {/* MercadoPago */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 bg-[#00b1ea] rounded-2xl flex items-center justify-center shadow-lg shadow-[#00b1ea]/20">
              <span className="text-white font-bold text-lg">MP</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#1e3a5f]">MercadoPago</h2>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mpEnabled}
                    onChange={(e) => setMpEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#38bdf8] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-[#1e3a5f] peer-checked:to-[#2d6cb5]"></div>
                </label>
              </div>
              <p className="text-gray-600 mt-1">
                Acepta pagos con tarjeta de credito, debito, efectivo y mas. Disponible en Peru, Mexico, Argentina, Colombia, Chile, Brasil y Uruguay.
              </p>
            </div>
          </div>

          {mpEnabled && (
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm text-amber-800">
                  <strong>Importante:</strong> Necesitas una cuenta de MercadoPago para obtener tus credenciales. <a href="https://www.mercadopago.com/developers" target="_blank" rel="noopener noreferrer" className="underline">Obtener credenciales</a>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
                  Public Key
                </label>
                <input
                  type="text"
                  value={mpPublicKey}
                  onChange={(e) => setMpPublicKey(e.target.value)}
                  placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
                  Access Token
                </label>
                <input
                  type="password"
                  value={mpAccessToken}
                  onChange={(e) => setMpAccessToken(e.target.value)}
                  placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Este token es privado y se almacena de forma segura</p>
              </div>

              <div className="flex items-center gap-3 p-4 bg-[#f0f7ff] rounded-xl">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mpSandbox}
                    onChange={(e) => setMpSandbox(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#38bdf8] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
                <div>
                  <span className="text-sm font-medium text-[#1e3a5f]">Modo de prueba (Sandbox)</span>
                  <p className="text-xs text-gray-500">Activa esto para probar pagos sin cobrar dinero real</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Coming soon */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm opacity-50">
          <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">Proximamente</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-[#635bff] rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="text-sm font-medium text-gray-600">Stripe</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-[#003087] rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-sm">PP</span>
              </div>
              <span className="text-sm font-medium text-gray-600">PayPal</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-sm">+</span>
              </div>
              <span className="text-sm font-medium text-gray-600">Mas...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
