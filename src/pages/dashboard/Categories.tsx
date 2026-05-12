import { useState, useEffect, useRef } from 'react'
import { collection, query, where, getDocs, doc, addDoc, deleteDoc, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { optimizeImage } from '../../utils/cloudinary'
import type { Category } from '../../types'

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

// Phase 1 plumbing for the category-carousel feature: the storefront still
// renders categories as text-only via CategoryNav, so uploading an image here
// has no visible effect for shoppers yet. The image will start to be used
// once a theme migrates to CategoryCarousel (Phase 3+). Merchants can begin
// curating images today so the rollout doesn't catch them empty-handed.
const MAX_IMAGE_BYTES = 2 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

async function uploadCategoryImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
  formData.append('folder', 'shopifree/categories')

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  )
  if (!response.ok) throw new Error('Cloudinary upload failed')
  const data = await response.json()
  return data.secure_url as string
}

function CategoryThumbnail({ category, uploading, onUpload, onRemove }: {
  category: Category
  uploading: boolean
  onUpload: (categoryId: string, file: File) => void
  onRemove: (categoryId: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onUpload(category.id, file)
    e.target.value = ''
  }

  return (
    <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 group">
      {category.image ? (
        <>
          <img
            src={optimizeImage(category.image, 'thumbnail')}
            alt={category.name}
            className="w-full h-full object-cover"
          />
          {/* Hover overlay: tap image to change, tap × to remove */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center"
            title="Cambiar imagen"
          >
            {uploading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(category.id) }}
            className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white rounded-bl-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600"
            title="Quitar imagen"
          >
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full h-full bg-gray-50 hover:bg-gray-100 border-2 border-dashed border-gray-300 hover:border-gray-400 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          title="Subir imagen"
        >
          {uploading ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}

function SortableCategory({ category, editingId, editingName, setEditingName, handleSaveEdit, setEditingId, handleEdit, handleDelete, uploadingId, onImageUpload, onImageRemove }: {
  category: Category
  editingId: string | null
  editingName: string
  setEditingName: (name: string) => void
  handleSaveEdit: () => void
  setEditingId: (id: string | null) => void
  handleEdit: (category: Category) => void
  handleDelete: (id: string) => void
  uploadingId: string | null
  onImageUpload: (categoryId: string, file: File) => void
  onImageRemove: (categoryId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center justify-between px-4 sm:px-6 py-4 gap-2 border-b border-gray-200 last:border-b-0">
      {editingId === category.id ? (
        <div className="flex items-center gap-2 sm:gap-3 flex-1">
          <input
            type="text"
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            className="flex-1 min-w-0 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
            autoFocus
          />
          <button
            onClick={handleSaveEdit}
            className="px-3 py-1.5 text-sm bg-black text-white rounded-lg hover:bg-gray-800 whitespace-nowrap"
          >
            Guardar
          </button>
          <button
            onClick={() => setEditingId(null)}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 whitespace-nowrap"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <>
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="9" cy="6" r="1.5" />
              <circle cx="15" cy="6" r="1.5" />
              <circle cx="9" cy="12" r="1.5" />
              <circle cx="15" cy="12" r="1.5" />
              <circle cx="9" cy="18" r="1.5" />
              <circle cx="15" cy="18" r="1.5" />
            </svg>
          </button>

          <CategoryThumbnail
            category={category}
            uploading={uploadingId === category.id}
            onUpload={onImageUpload}
            onRemove={onImageRemove}
          />

          <span className="font-medium text-gray-900 flex-1 min-w-0 truncate">{category.name}</span>
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => handleEdit(category)}
              className="px-2 sm:px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
            >
              Editar
            </button>
            <button
              onClick={() => handleDelete(category.id)}
              className="px-2 sm:px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
            >
              Eliminar
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default function Categories() {
  const { firebaseUser } = useAuth()
  const { showToast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [storeId, setStoreId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  useEffect(() => {
    const fetchData = async () => {
      if (!firebaseUser) return

      try {
        const storesRef = collection(db, 'stores')
        const storeQuery = query(storesRef, where('ownerId', '==', firebaseUser.uid))
        const storeSnapshot = await getDocs(storeQuery)

        if (!storeSnapshot.empty) {
          const sid = storeSnapshot.docs[0].id
          setStoreId(sid)

          // Categories live at stores/{storeId}/categories. The old version of
          // this page wrote to a top-level /categories collection — those
          // docs were invisible to the storefront (which reads the
          // subcollection) and to every other dashboard page, so merchants
          // who used this page never saw their categories appear. The
          // top-level orphans, if any, stay where they are; this page now
          // reads/writes the correct path.
          const categoriesRef = collection(db, 'stores', sid, 'categories')
          const categoriesSnapshot = await getDocs(categoriesRef)

          setCategories(categoriesSnapshot.docs.map(doc => ({
            ...doc.data() as Category,
            id: doc.id,
            storeId: sid
          })))
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [firebaseUser])

  const sortedCategories = [...categories].sort((a, b) => a.order - b.order)

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!storeId) return
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = sortedCategories.findIndex(c => c.id === active.id)
    const newIndex = sortedCategories.findIndex(c => c.id === over.id)
    const reordered = arrayMove(sortedCategories, oldIndex, newIndex)

    // Update local state immediately
    const updated = reordered.map((c, i) => ({ ...c, order: i }))
    setCategories(updated)

    // Persist to Firestore
    try {
      await Promise.all(
        updated.map(c => updateDoc(doc(db, 'stores', storeId, 'categories', c.id), { order: c.order, updatedAt: new Date() }))
      )
    } catch (error) {
      console.error('Error reordering categories:', error)
      showToast('Error al reordenar', 'error')
    }
  }

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

      const docRef = await addDoc(collection(db, 'stores', storeId, 'categories'), {
        storeId,
        name: newCategoryName.trim(),
        slug,
        order: categories.length,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })

      setCategories([...categories, {
        id: docRef.id,
        storeId,
        name: newCategoryName.trim(),
        slug,
        order: categories.length,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }])
      setNewCategoryName('')
    } catch (error) {
      console.error('Error adding category:', error)
      showToast('Error al agregar categoria', 'error')
    }
  }

  const handleDelete = async (categoryId: string) => {
    if (!storeId) return
    if (!confirm('¿Estás seguro de eliminar esta categoría?')) return

    try {
      await deleteDoc(doc(db, 'stores', storeId, 'categories', categoryId))
      setCategories(categories.filter(c => c.id !== categoryId))
    } catch (error) {
      console.error('Error deleting category:', error)
      showToast('Error al eliminar categoria', 'error')
    }
  }

  const handleEdit = (category: Category) => {
    setEditingId(category.id)
    setEditingName(category.name)
  }

  const handleSaveEdit = async () => {
    if (!storeId || !editingId || !editingName.trim()) return

    try {
      const slug = editingName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')

      await updateDoc(doc(db, 'stores', storeId, 'categories', editingId), {
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
      showToast('Error al actualizar categoria', 'error')
    }
  }

  const handleImageUpload = async (categoryId: string, file: File) => {
    if (!storeId) return
    // Validate file before round-tripping to Cloudinary.
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      showToast('Formato no soportado. Usa JPG, PNG o WebP.', 'error')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      showToast('La imagen debe pesar menos de 2 MB', 'error')
      return
    }

    setUploadingId(categoryId)
    try {
      const url = await uploadCategoryImage(file)
      await updateDoc(doc(db, 'stores', storeId, 'categories', categoryId), {
        image: url,
        updatedAt: new Date()
      })
      setCategories(categories.map(c =>
        c.id === categoryId
          ? { ...c, image: url, updatedAt: new Date() }
          : c
      ))
      showToast('Imagen actualizada', 'success')
    } catch (error) {
      console.error('Error uploading category image:', error)
      showToast('Error al subir imagen', 'error')
    } finally {
      setUploadingId(null)
    }
  }

  const handleImageRemove = async (categoryId: string) => {
    if (!storeId) return
    if (!confirm('¿Quitar la imagen de esta categoría?')) return

    try {
      // We clear the field rather than delete it so existing reads keep working
      // even if the field disappears from older docs.
      await updateDoc(doc(db, 'stores', storeId, 'categories', categoryId), {
        image: null,
        updatedAt: new Date()
      })
      setCategories(categories.map(c =>
        c.id === categoryId
          ? { ...c, image: undefined, updatedAt: new Date() }
          : c
      ))
    } catch (error) {
      console.error('Error removing category image:', error)
      showToast('Error al quitar imagen', 'error')
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
        <h1 className="text-xl font-semibold text-gray-900">Categorías</h1>
        <p className="text-gray-600 mt-1">
          Organiza tus productos en categorías
        </p>
        <p className="text-xs text-gray-500 mt-2">
          💡 Puedes subir una imagen cuadrada por categoría. Pronto aparecerá en un carrusel en tu tienda. Formatos: JPG, PNG, WebP · máx 2&nbsp;MB.
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
        <div className="bg-white rounded-xl border border-gray-200">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortedCategories.map(c => c.id)} strategy={verticalListSortingStrategy}>
              {sortedCategories.map(category => (
                <SortableCategory
                  key={category.id}
                  category={category}
                  editingId={editingId}
                  editingName={editingName}
                  setEditingName={setEditingName}
                  handleSaveEdit={handleSaveEdit}
                  setEditingId={setEditingId}
                  handleEdit={handleEdit}
                  handleDelete={handleDelete}
                  uploadingId={uploadingId}
                  onImageUpload={handleImageUpload}
                  onImageRemove={handleImageRemove}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  )
}
