import { useState, useEffect } from 'react'
import { collection, query, where, getDocs, doc, addDoc, deleteDoc, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import type { Category } from '../../types'

export default function Categories() {
  const { user } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [storeId, setStoreId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      try {
        // Fetch store
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
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!storeId || !newCategoryName.trim()) return

    try {
      const slug = newCategoryName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')

      const docRef = await addDoc(collection(db, 'categories'), {
        storeId,
        name: newCategoryName.trim(),
        slug,
        order: categories.length,
        createdAt: new Date(),
        updatedAt: new Date()
      })

      setCategories([...categories, {
        id: docRef.id,
        storeId,
        name: newCategoryName.trim(),
        slug,
        order: categories.length,
        createdAt: new Date(),
        updatedAt: new Date()
      }])
      setNewCategoryName('')
    } catch (error) {
      console.error('Error adding category:', error)
      alert('Error al agregar categoría')
    }
  }

  const handleDelete = async (categoryId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta categoría?')) return

    try {
      await deleteDoc(doc(db, 'categories', categoryId))
      setCategories(categories.filter(c => c.id !== categoryId))
    } catch (error) {
      console.error('Error deleting category:', error)
      alert('Error al eliminar categoría')
    }
  }

  const handleEdit = (category: Category) => {
    setEditingId(category.id)
    setEditingName(category.name)
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editingName.trim()) return

    try {
      const slug = editingName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')

      await updateDoc(doc(db, 'categories', editingId), {
        name: editingName.trim(),
        slug,
        updatedAt: new Date()
      })

      setCategories(categories.map(c =>
        c.id === editingId
          ? { ...c, name: editingName.trim(), slug, updatedAt: new Date() }
          : c
      ))
      setEditingId(null)
      setEditingName('')
    } catch (error) {
      console.error('Error updating category:', error)
      alert('Error al actualizar categoría')
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Categorías</h1>
        <p className="text-gray-600 mt-1">
          Organiza tus productos en categorías
        </p>
      </div>

      {/* Add new category */}
      <form onSubmit={handleAdd} className="flex gap-3">
        <input
          type="text"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="Nueva categoría..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
        />
        <button
          type="submit"
          disabled={!newCategoryName.trim()}
          className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition font-medium disabled:opacity-50"
        >
          Agregar
        </button>
      </form>

      {/* Categories list */}
      {categories.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No tienes categorías aún
          </h3>
          <p className="text-gray-600">
            Las categorías te ayudan a organizar tus productos
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
          {categories.map((category) => (
            <div key={category.id} className="flex items-center justify-between px-6 py-4">
              {editingId === category.id ? (
                <div className="flex items-center gap-3 flex-1">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveEdit}
                    className="px-3 py-1.5 text-sm bg-black text-white rounded-lg hover:bg-gray-800"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <>
                  <span className="font-medium text-gray-900">{category.name}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(category)}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                    >
                      Eliminar
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
