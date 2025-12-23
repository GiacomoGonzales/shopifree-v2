import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { collection, query, where, getDocs, doc, addDoc, updateDoc, getDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import type { Product, Category } from '../../types'

export default function ProductForm() {
  const { productId } = useParams<{ productId: string }>()
  const isEditing = productId && productId !== 'new'
  const { user } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [storeId, setStoreId] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [image, setImage] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [active, setActive] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      try {
        // Get store
        const storesRef = collection(db, 'stores')
        const storeQuery = query(storesRef, where('userId', '==', user.uid))
        const storeSnapshot = await getDocs(storeQuery)

        if (!storeSnapshot.empty) {
          const sid = storeSnapshot.docs[0].id
          setStoreId(sid)

          // Fetch categories
          const categoriesRef = collection(db, 'categories')
          const categoriesQuery = query(categoriesRef, where('storeId', '==', sid))
          const categoriesSnapshot = await getDocs(categoriesQuery)
          setCategories(categoriesSnapshot.docs.map(doc => ({
            ...doc.data() as Category,
            id: doc.id
          })))

          // If editing, fetch product
          if (isEditing && productId) {
            const productDoc = await getDoc(doc(db, 'products', productId))
            if (productDoc.exists()) {
              const productData = productDoc.data() as Product
              setName(productData.name)
              setPrice(productData.price.toString())
              setDescription(productData.description || '')
              setImage(productData.image || '')
              setCategoryId(productData.categoryId || '')
              setActive(productData.active)
            }
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, isEditing, productId])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !storeId) return

    setUploading(true)
    try {
      const filename = `${Date.now()}-${file.name}`
      const storageRef = ref(storage, `products/${storeId}/${filename}`)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)
      setImage(url)
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Error al subir la imagen')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!storeId) return

    setSaving(true)
    try {
      const slug = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')

      const productData = {
        storeId,
        name,
        slug,
        price: parseFloat(price),
        description: description || null,
        image: image || null,
        categoryId: categoryId || null,
        active,
        updatedAt: new Date()
      }

      if (isEditing && productId) {
        await updateDoc(doc(db, 'products', productId), productData)
      } else {
        await addDoc(collection(db, 'products'), {
          ...productData,
          createdAt: new Date()
        })
      }

      navigate('/dashboard/products')
    } catch (error) {
      console.error('Error saving product:', error)
      alert('Error al guardar el producto')
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
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Editar producto' : 'Nuevo producto'}
        </h1>
        <button
          onClick={() => navigate('/dashboard/products')}
          className="text-gray-600 hover:text-gray-900"
        >
          Cancelar
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Image upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Foto del producto
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed border-gray-300 rounded-xl overflow-hidden cursor-pointer hover:border-gray-400 transition ${
              image ? 'aspect-square max-w-xs' : 'aspect-video'
            }`}
          >
            {image ? (
              <img src={image} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-gray-500">
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-500 mb-2"></div>
                    <p>Subiendo...</p>
                  </>
                ) : (
                  <>
                    <svg className="w-12 h-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p>Click para subir foto</p>
                  </>
                )}
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          {image && (
            <button
              type="button"
              onClick={() => setImage('')}
              className="mt-2 text-sm text-red-600 hover:text-red-700"
            >
              Eliminar foto
            </button>
          )}
        </div>

        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del producto *
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Torta de chocolate"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
          />
        </div>

        {/* Price */}
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
            Precio *
          </label>
          <input
            id="price"
            type="number"
            required
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Descripción (opcional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Describe tu producto..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black resize-none"
          />
        </div>

        {/* Category */}
        {categories.length > 0 && (
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Categoría (opcional)
            </label>
            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
            >
              <option value="">Sin categoría</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Active toggle */}
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-black rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
          </label>
          <span className="text-sm text-gray-700">
            {active ? 'Visible en el catálogo' : 'Oculto del catálogo'}
          </span>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={saving || !name || !price}
          className="w-full py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition font-medium disabled:opacity-50"
        >
          {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear producto'}
        </button>
      </form>
    </div>
  )
}
