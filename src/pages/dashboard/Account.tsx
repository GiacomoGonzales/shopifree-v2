import { useState, useEffect, useRef } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import type { User } from '../../types'

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export default function Account() {
  const { firebaseUser } = useAuth()
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

  // Company data
  const [companyName, setCompanyName] = useState('')
  const [taxId, setTaxId] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [companyCity, setCompanyCity] = useState('')
  const [companyCountry, setCompanyCountry] = useState('')

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
          if (userData.company) {
            setCompanyName(userData.company.name || '')
            setTaxId(userData.company.taxId || '')
            setCompanyAddress(userData.company.address || '')
            setCompanyCity(userData.company.city || '')
            setCompanyCountry(userData.company.country || '')
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [firebaseUser])

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
      showToast('Error al subir la imagen', 'error')
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
        company: {
          name: companyName || null,
          taxId: taxId || null,
          address: companyAddress || null,
          city: companyCity || null,
          country: companyCountry || null
        },
        updatedAt: new Date()
      }, { merge: true })
      showToast('Datos guardados', 'success')
    } catch (error) {
      console.error('Error saving user data:', error)
      showToast('Error al guardar los datos', 'error')
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
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Mi Cuenta</h1>
          <p className="text-gray-600 mt-1">Administra tus datos personales y de facturacion</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white rounded-xl hover:from-[#2d6cb5] hover:to-[#38bdf8] transition-all font-semibold disabled:opacity-50 shadow-lg shadow-[#1e3a5f]/20"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left Column - Personal Data */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm h-fit">
          <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">Datos personales</h2>

          {/* Avatar */}
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
            <div
              onClick={() => avatarInputRef.current?.click()}
              className="w-16 h-16 bg-gradient-to-br from-[#38bdf8] to-[#2d6cb5] rounded-2xl overflow-hidden cursor-pointer hover:opacity-90 transition-all flex items-center justify-center shadow-lg shadow-[#38bdf8]/20 flex-shrink-0"
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
                Cambiar foto
              </button>
              {avatar && (
                <button
                  onClick={() => setAvatar('')}
                  className="block text-sm text-red-600 hover:text-red-700 mt-1"
                >
                  Eliminar
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1e3a5f] mb-1">Nombre</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1e3a5f] mb-1">Apellido</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Tu apellido"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1e3a5f] mb-1">Email</label>
                <input
                  type="email"
                  value={firebaseUser?.email || ''}
                  disabled
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1e3a5f] mb-1">Telefono</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+51 999 888 777"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Billing Data */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm h-fit">
          <h2 className="text-lg font-semibold text-[#1e3a5f] mb-1">Datos de facturacion</h2>
          <p className="text-sm text-gray-600 mb-4">Opcional - para facturas y comprobantes</p>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1e3a5f] mb-1">Razon social</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Mi Empresa SAC"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1e3a5f] mb-1">RUC / NIT / RFC</label>
                <input
                  type="text"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="20123456789"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1e3a5f] mb-1">Direccion fiscal</label>
              <input
                type="text"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                placeholder="Calle, numero, etc."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1e3a5f] mb-1">Ciudad</label>
                <input
                  type="text"
                  value={companyCity}
                  onChange={(e) => setCompanyCity(e.target.value)}
                  placeholder="Tu ciudad"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1e3a5f] mb-1">Pais</label>
                <select
                  value={companyCountry}
                  onChange={(e) => setCompanyCountry(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                >
                  <option value="">Seleccionar</option>
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
            </div>
          </div>
        </div>
      </div>

      {/* Security - Full Width */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[#1e3a5f] mb-1">Seguridad</h2>
            <p className="text-sm text-gray-600">Gestiona tu contrasena y opciones de seguridad</p>
          </div>
          <button
            onClick={() => showToast('Funcionalidad proximamente', 'info')}
            className="w-full sm:w-auto px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium text-sm flex-shrink-0"
          >
            Cambiar contrasena
          </button>
        </div>
      </div>
    </div>
  )
}
