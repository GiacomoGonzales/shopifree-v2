import { useState, useEffect } from 'react'
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import type { Store, StoreLocation } from '../../types'

export default function Settings() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Basic info
  const [name, setName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [currency, setCurrency] = useState('PEN')
  const [businessType, setBusinessType] = useState<Store['businessType']>('retail')

  // About
  const [slogan, setSlogan] = useState('')
  const [description, setDescription] = useState('')

  // Location
  const [location, setLocation] = useState<StoreLocation>({
    address: '',
    city: '',
    state: '',
    country: 'PE'
  })

  // Contact
  const [email, setEmail] = useState('')
  const [instagram, setInstagram] = useState('')
  const [facebook, setFacebook] = useState('')
  const [tiktok, setTiktok] = useState('')

  useEffect(() => {
    const fetchStore = async () => {
      if (!user) return

      try {
        const storesRef = collection(db, 'stores')
        const storeQuery = query(storesRef, where('ownerId', '==', user.uid))
        const storeSnapshot = await getDocs(storeQuery)

        if (!storeSnapshot.empty) {
          const storeData = storeSnapshot.docs[0].data() as Store
          const storeWithId = { ...storeData, id: storeSnapshot.docs[0].id }
          setStore(storeWithId)

          // Basic
          setName(storeData.name || '')
          setWhatsapp(storeData.whatsapp || '')
          setCurrency(storeData.currency || 'PEN')
          setBusinessType(storeData.businessType || 'retail')

          // About
          setSlogan(storeData.about?.slogan || '')
          setDescription(storeData.about?.description || '')

          // Location
          if (storeData.location) {
            setLocation(storeData.location)
          }

          // Contact
          setEmail(storeData.email || '')
          setInstagram(storeData.instagram || '')
          setFacebook(storeData.facebook || '')
          setTiktok(storeData.tiktok || '')
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
        name,
        whatsapp,
        currency,
        businessType,
        about: {
          slogan: slogan || null,
          description: description || null
        },
        location,
        email: email || null,
        instagram: instagram || null,
        facebook: facebook || null,
        tiktok: tiktok || null,
        updatedAt: new Date()
      })
      showToast('Configuracion guardada', 'success')
    } catch (error) {
      console.error('Error saving settings:', error)
      showToast('Error al guardar la configuracion', 'error')
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
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Configuracion</h1>
          <p className="text-gray-600 mt-1">Configura la informacion de tu tienda</p>
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
        {/* Basic Info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#1e3a5f] mb-6">Informacion basica</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
                Nombre de la tienda
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
                Tipo de negocio
              </label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value as Store['businessType'])}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
              >
                <option value="retail">Tienda / Retail</option>
                <option value="restaurant">Restaurante / Comida</option>
                <option value="services">Servicios</option>
                <option value="other">Otro</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {businessType === 'retail' && 'Podras agregar variaciones (talla, color) a tus productos'}
                {businessType === 'restaurant' && 'Podras agregar modificadores (extras, opciones) a tus productos'}
                {businessType === 'services' && 'Para servicios profesionales y consultorias'}
                {businessType === 'other' && 'Configura segun tus necesidades'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
                Moneda
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
              >
                <option value="PEN">S/ - Sol Peruano</option>
                <option value="USD">$ - Dolar Americano</option>
                <option value="MXN">$ - Peso Mexicano</option>
                <option value="COP">$ - Peso Colombiano</option>
                <option value="ARS">$ - Peso Argentino</option>
                <option value="CLP">$ - Peso Chileno</option>
                <option value="BRL">R$ - Real Brasileno</option>
                <option value="EUR">€ - Euro</option>
              </select>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#1e3a5f] mb-6">Sobre tu negocio</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
                Slogan o frase corta
              </label>
              <input
                type="text"
                value={slogan}
                onChange={(e) => setSlogan(e.target.value)}
                placeholder="Ej: Los mejores postres de la ciudad"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
                Quienes somos
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Cuentale a tus clientes sobre tu negocio, tu historia, que te hace especial..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all resize-none"
              />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#1e3a5f] mb-6">Ubicacion</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
                Pais
              </label>
              <select
                value={location.country}
                onChange={(e) => setLocation({ ...location, country: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
              >
                <option value="PE">Peru</option>
                <option value="MX">Mexico</option>
                <option value="CO">Colombia</option>
                <option value="AR">Argentina</option>
                <option value="CL">Chile</option>
                <option value="EC">Ecuador</option>
                <option value="VE">Venezuela</option>
                <option value="US">Estados Unidos</option>
                <option value="ES">Espana</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
                  Ciudad
                </label>
                <input
                  type="text"
                  value={location.city || ''}
                  onChange={(e) => setLocation({ ...location, city: e.target.value })}
                  placeholder="Ej: Lima"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
                  Estado/Provincia
                </label>
                <input
                  type="text"
                  value={location.state || ''}
                  onChange={(e) => setLocation({ ...location, state: e.target.value })}
                  placeholder="Opcional"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
                Direccion
              </label>
              <input
                type="text"
                value={location.address || ''}
                onChange={(e) => setLocation({ ...location, address: e.target.value })}
                placeholder="Calle, numero, local, etc."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
              />
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#1e3a5f] mb-6">Contacto y redes sociales</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
                WhatsApp (con codigo de pais)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </span>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="+51 999 888 777"
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contacto@mitienda.com"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
                  Instagram
                </label>
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="@mitienda"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
                  Facebook
                </label>
                <input
                  type="text"
                  value={facebook}
                  onChange={(e) => setFacebook(e.target.value)}
                  placeholder="mitienda"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
                  TikTok
                </label>
                <input
                  type="text"
                  value={tiktok}
                  onChange={(e) => setTiktok(e.target.value)}
                  placeholder="@mitienda"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Danger zone */}
        <div className="bg-white rounded-2xl border border-red-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-red-600 mb-2">Zona de peligro</h2>
          <p className="text-sm text-gray-600 mb-4">
            Eliminar tu catalogo borrara permanentemente todos tus productos y datos.
          </p>
          <button
            onClick={() => showToast('Funcionalidad proximamente', 'info')}
            className="px-4 py-2.5 border border-red-300 text-red-600 rounded-xl hover:bg-red-50 transition-all text-sm font-medium"
          >
            Eliminar mi catalogo
          </button>
        </div>
      </div>
    </div>
  )
}
