import { useState, useEffect } from 'react'
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useToast } from '../../components/ui/Toast'

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

interface DemoStore {
  id: string
  name: string
  subdomain: string
  theme: string
  screenshot: string
  color: string
  order: number
}

const defaultStores: Omit<DemoStore, 'id'>[] = [
  { name: 'Tienda 1', subdomain: '', theme: '', screenshot: '', color: '#1a1a2e', order: 0 },
  { name: 'Tienda 2', subdomain: '', theme: '', screenshot: '', color: '#f8f4f0', order: 1 },
  { name: 'Tienda 3', subdomain: '', theme: '', screenshot: '', color: '#0f172a', order: 2 },
  { name: 'Tienda 4', subdomain: '', theme: '', screenshot: '', color: '#78350f', order: 3 },
  { name: 'Tienda 5', subdomain: '', theme: '', screenshot: '', color: '#451a03', order: 4 },
]

export default function DemoScreenshots() {
  const { showToast } = useToast()
  const [stores, setStores] = useState<DemoStore[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [uploading, setUploading] = useState<string | null>(null)

  useEffect(() => {
    fetchStores()
  }, [])

  const fetchStores = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'demoStores'))

      if (snapshot.empty) {
        // Initialize with default stores
        const initialStores: DemoStore[] = defaultStores.map((store, index) => ({
          ...store,
          id: `demo-${index + 1}`
        }))
        setStores(initialStores)
      } else {
        const fetchedStores = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as DemoStore[]
        // Sort by order
        fetchedStores.sort((a, b) => a.order - b.order)
        setStores(fetchedStores)
      }
    } catch (error) {
      console.error('Error fetching demo stores:', error)
      showToast('Error al cargar las tiendas demo', 'error')
    } finally {
      setLoading(false)
    }
  }

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
    formData.append('folder', 'shopifree/demo-screenshots')

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData }
    )

    if (!response.ok) throw new Error('Upload failed')
    const data = await response.json()
    return data.secure_url
  }

  const handleImageUpload = async (storeId: string, file: File) => {
    setUploading(storeId)
    try {
      const url = await uploadImage(file)

      // Update local state
      setStores(prev => prev.map(store =>
        store.id === storeId ? { ...store, screenshot: url } : store
      ))

      showToast('Imagen subida correctamente', 'success')
    } catch (error) {
      console.error('Error uploading image:', error)
      showToast('Error al subir la imagen', 'error')
    } finally {
      setUploading(null)
    }
  }

  const handleFieldChange = (storeId: string, field: keyof DemoStore, value: string) => {
    setStores(prev => prev.map(store =>
      store.id === storeId ? { ...store, [field]: value } : store
    ))
  }

  const saveStore = async (store: DemoStore) => {
    setSaving(store.id)
    try {
      await setDoc(doc(db, 'demoStores', store.id), {
        name: store.name,
        subdomain: store.subdomain,
        theme: store.theme,
        screenshot: store.screenshot,
        color: store.color,
        order: store.order,
        updatedAt: new Date()
      })
      showToast('Tienda guardada correctamente', 'success')
    } catch (error) {
      console.error('Error saving store:', error)
      showToast('Error al guardar la tienda', 'error')
    } finally {
      setSaving(null)
    }
  }

  const saveAllStores = async () => {
    setSaving('all')
    try {
      for (const store of stores) {
        await setDoc(doc(db, 'demoStores', store.id), {
          name: store.name,
          subdomain: store.subdomain,
          theme: store.theme,
          screenshot: store.screenshot,
          color: store.color,
          order: store.order,
          updatedAt: new Date()
        })
      }
      showToast('Todas las tiendas guardadas correctamente', 'success')
    } catch (error) {
      console.error('Error saving stores:', error)
      showToast('Error al guardar las tiendas', 'error')
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#38bdf8]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Screenshots del Carrusel</h1>
          <p className="text-slate-400 mt-1">Gestiona las 5 tiendas que aparecen en el landing</p>
        </div>
        <button
          onClick={saveAllStores}
          disabled={saving === 'all'}
          className="px-4 py-2 bg-[#38bdf8] text-white rounded-lg hover:bg-[#0ea5e9] transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {saving === 'all' ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Guardando...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Guardar Todo
            </>
          )}
        </button>
      </div>

      {/* Store Cards */}
      <div className="grid gap-6">
        {stores.map((store, index) => (
          <div
            key={store.id}
            className="bg-[#1e293b] rounded-xl p-6 border border-slate-700"
          >
            <div className="flex items-start gap-6">
              {/* Screenshot Preview */}
              <div className="flex-shrink-0">
                <div
                  className="w-32 h-64 rounded-2xl overflow-hidden border-4 border-gray-700 relative"
                  style={{ backgroundColor: store.color }}
                >
                  {store.screenshot ? (
                    <img
                      src={store.screenshot}
                      alt={store.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}

                  {/* Upload overlay */}
                  <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                    {uploading === store.id ? (
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    ) : (
                      <div className="text-center text-white">
                        <svg className="w-8 h-8 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <span className="text-xs">Subir imagen</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleImageUpload(store.id, file)
                      }}
                      disabled={uploading === store.id}
                    />
                  </label>
                </div>
                <p className="text-center text-xs text-slate-500 mt-2">Tienda {index + 1}</p>
              </div>

              {/* Form Fields */}
              <div className="flex-1 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Nombre de la tienda
                  </label>
                  <input
                    type="text"
                    value={store.name}
                    onChange={(e) => handleFieldChange(store.id, 'name', e.target.value)}
                    className="w-full px-3 py-2 bg-[#0f172a] border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-[#38bdf8] focus:border-transparent"
                    placeholder="Ej: Alien Store"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Subdominio
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={store.subdomain}
                      onChange={(e) => handleFieldChange(store.id, 'subdomain', e.target.value)}
                      className="flex-1 px-3 py-2 bg-[#0f172a] border border-slate-600 rounded-l-lg text-white focus:ring-2 focus:ring-[#38bdf8] focus:border-transparent"
                      placeholder="alienstore"
                    />
                    <span className="px-3 py-2 bg-slate-700 border border-l-0 border-slate-600 rounded-r-lg text-slate-400 text-sm">
                      .shopifree.app
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Tema
                  </label>
                  <input
                    type="text"
                    value={store.theme}
                    onChange={(e) => handleFieldChange(store.id, 'theme', e.target.value)}
                    className="w-full px-3 py-2 bg-[#0f172a] border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-[#38bdf8] focus:border-transparent"
                    placeholder="Ej: Urban, Minimal, Boutique"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Color de fondo
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={store.color}
                      onChange={(e) => handleFieldChange(store.id, 'color', e.target.value)}
                      className="w-12 h-10 rounded-lg border border-slate-600 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={store.color}
                      onChange={(e) => handleFieldChange(store.id, 'color', e.target.value)}
                      className="flex-1 px-3 py-2 bg-[#0f172a] border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-[#38bdf8] focus:border-transparent font-mono"
                      placeholder="#1a1a2e"
                    />
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    URL del screenshot (o sube una imagen)
                  </label>
                  <input
                    type="text"
                    value={store.screenshot}
                    onChange={(e) => handleFieldChange(store.id, 'screenshot', e.target.value)}
                    className="w-full px-3 py-2 bg-[#0f172a] border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-[#38bdf8] focus:border-transparent"
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* Save Button */}
              <div className="flex-shrink-0">
                <button
                  onClick={() => saveStore(store)}
                  disabled={saving === store.id}
                  className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50"
                >
                  {saving === store.id ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Help Text */}
      <div className="bg-[#1e293b]/50 rounded-xl p-4 border border-slate-700/50">
        <h3 className="text-sm font-medium text-slate-300 mb-2">Consejos:</h3>
        <ul className="text-sm text-slate-400 space-y-1">
          <li>• Los screenshots deben ser de 400x800px o proporción similar (9:19.5)</li>
          <li>• Usa capturas de pantalla reales de las tiendas en móvil</li>
          <li>• El color de fondo se usa para el efecto glow del carrusel</li>
          <li>• El subdominio debe coincidir con una tienda real para que el link funcione</li>
        </ul>
      </div>
    </div>
  )
}
