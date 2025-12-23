import { useState, useEffect } from 'react'
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import type { Store } from '../../types'

export default function Settings() {
  const { user } = useAuth()
  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [currency, setCurrency] = useState('PEN')
  const [description, setDescription] = useState('')

  useEffect(() => {
    const fetchStore = async () => {
      if (!user) return

      try {
        const storesRef = collection(db, 'stores')
        const storeQuery = query(storesRef, where('userId', '==', user.uid))
        const storeSnapshot = await getDocs(storeQuery)

        if (!storeSnapshot.empty) {
          const storeData = storeSnapshot.docs[0].data() as Store
          setStore({ ...storeData, id: storeSnapshot.docs[0].id })
          setName(storeData.name)
          setWhatsapp(storeData.whatsapp)
          setCurrency(storeData.currency)
          setDescription(storeData.description || '')
        }
      } catch (error) {
        console.error('Error fetching store:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStore()
  }, [user])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!store) return

    setSaving(true)
    try {
      await updateDoc(doc(db, 'stores', store.id), {
        name,
        whatsapp,
        currency,
        description,
        updatedAt: new Date()
      })
      alert('Configuración guardada!')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Error al guardar la configuración')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-600 mt-1">
          Configura tu catálogo y preferencias
        </p>
      </div>

      {/* Store settings form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Información del negocio</h2>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del negocio
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
            />
          </div>

          <div>
            <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700 mb-1">
              WhatsApp (con código de país)
            </label>
            <input
              id="whatsapp"
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+51999999999"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
            />
          </div>

          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
              Moneda
            </label>
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
            >
              <option value="PEN">PEN - Sol Peruano</option>
              <option value="USD">USD - Dólar Americano</option>
              <option value="MXN">MXN - Peso Mexicano</option>
              <option value="COP">COP - Peso Colombiano</option>
              <option value="ARS">ARS - Peso Argentino</option>
              <option value="CLP">CLP - Peso Chileno</option>
              <option value="BRL">BRL - Real Brasileño</option>
            </select>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Descripción (opcional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Cuéntale a tus clientes sobre tu negocio..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black resize-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition font-medium disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>

      {/* Plan section */}
      <div id="plans" className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Tu plan actual</h2>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-gray-900">
              Plan {store?.plan === 'premium' ? 'Premium' : 'Gratis'}
            </p>
            <p className="text-sm text-gray-600">
              {store?.plan === 'premium'
                ? 'Productos ilimitados, sin marca de agua'
                : 'Hasta 20 productos'}
            </p>
          </div>
          {store?.plan !== 'premium' && (
            <button className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition text-sm font-medium">
              Mejorar plan
            </button>
          )}
        </div>

        {store?.plan !== 'premium' && (
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Incluido en Premium ($5/mes):</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span> Productos ilimitados
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span> Múltiples fotos por producto
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span> Sin marca "Creado con Shopifree"
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span> Cupones de descuento
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span> Analytics completos
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span> Control de stock
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="bg-white rounded-xl border border-red-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-red-600">Zona de peligro</h2>
        <p className="text-sm text-gray-600">
          Eliminar tu catálogo borrará permanentemente todos tus productos y datos.
        </p>
        <button className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition text-sm font-medium">
          Eliminar mi catálogo
        </button>
      </div>
    </div>
  )
}
