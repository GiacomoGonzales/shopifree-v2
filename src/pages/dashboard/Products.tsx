import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { productService, categoryService } from '../../lib/firebase'
import { useToast } from '../../components/ui/Toast'
import { getCurrencySymbol } from '../../lib/currency'
import type { Product, Category } from '../../types'

export default function Products() {
  const { store } = useAuth()
  const { showToast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Category management
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [savingCategory, setSavingCategory] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      if (!store) return

      try {
        const [productsData, categoriesData] = await Promise.all([
          productService.getAll(store.id),
          categoryService.getAll(store.id)
        ])
        setProducts(productsData)
        setCategories(categoriesData)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [store])

  const handleDeleteProduct = async (productId: string) => {
    if (!store) return
    if (!confirm('¿Estas seguro de eliminar este producto?')) return

    try {
      await productService.delete(store.id, productId)
      setProducts(products.filter(p => p.id !== productId))
      showToast('Producto eliminado', 'success')
    } catch (error) {
      console.error('Error deleting product:', error)
      showToast('Error al eliminar el producto', 'error')
    }
  }

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!store || !newCategoryName.trim()) return

    setSavingCategory(true)
    try {
      const slug = newCategoryName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')

      if (editingCategory) {
        await categoryService.update(store.id, editingCategory.id, {
          name: newCategoryName.trim(),
          slug
        })
        setCategories(categories.map(c =>
          c.id === editingCategory.id
            ? { ...c, name: newCategoryName.trim(), slug }
            : c
        ))
        showToast('Categoria actualizada', 'success')
      } else {
        const categoryId = await categoryService.create(store.id, {
          name: newCategoryName.trim(),
          slug,
          order: categories.length
        })
        setCategories([...categories, {
          id: categoryId,
          storeId: store.id,
          name: newCategoryName.trim(),
          slug,
          order: categories.length,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }])
        showToast('Categoria creada', 'success')
      }

      setShowCategoryModal(false)
      setNewCategoryName('')
      setEditingCategory(null)
    } catch (error) {
      console.error('Error saving category:', error)
      showToast('Error al guardar categoria', 'error')
    } finally {
      setSavingCategory(false)
    }
  }

  const handleDeleteCategory = async (category: Category) => {
    if (!store) return
    if (!confirm(`¿Eliminar la categoría "${category.name}"? Los productos no se eliminarán.`)) return

    try {
      await categoryService.delete(store.id, category.id)
      setCategories(categories.filter(c => c.id !== category.id))
      if (selectedCategory === category.id) {
        setSelectedCategory(null)
      }
      showToast('Categoria eliminada', 'success')
    } catch (error) {
      console.error('Error deleting category:', error)
      showToast('Error al eliminar categoria', 'error')
    }
  }

  const openEditCategory = (category: Category) => {
    setEditingCategory(category)
    setNewCategoryName(category.name)
    setShowCategoryModal(true)
  }

  const filteredProducts = selectedCategory
    ? selectedCategory === 'uncategorized'
      ? products.filter(p => !p.categoryId)
      : products.filter(p => p.categoryId === selectedCategory)
    : products

  const getProductCount = (categoryId: string | null) => {
    if (categoryId === null) return products.length
    if (categoryId === 'uncategorized') return products.filter(p => !p.categoryId).length
    return products.filter(p => p.categoryId === categoryId).length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a5f]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1e3a5f]">Productos</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            {products.length} producto{products.length !== 1 ? 's' : ''} en tu catalogo
          </p>
        </div>
        <Link
          to="/dashboard/products/new"
          className="px-4 py-2.5 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white rounded-xl hover:from-[#2d6cb5] hover:to-[#38bdf8] transition-all text-sm font-semibold shadow-lg shadow-[#1e3a5f]/20 text-center"
        >
          + Agregar producto
        </Link>
      </div>

      {/* Categories tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#1e3a5f]">Categorias</h3>
          <button
            onClick={() => {
              setEditingCategory(null)
              setNewCategoryName('')
              setShowCategoryModal(true)
            }}
            className="text-sm text-[#2d6cb5] hover:text-[#1e3a5f] font-medium flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              selectedCategory === null
                ? 'bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white shadow-lg shadow-[#1e3a5f]/20'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todos ({getProductCount(null)})
          </button>

          {categories.map(category => (
            <div key={category.id} className="relative group">
              <button
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedCategory === category.id
                    ? 'bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white shadow-lg shadow-[#1e3a5f]/20'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.name} ({getProductCount(category.id)})
              </button>

              {/* Edit/Delete dropdown */}
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    openEditCategory(category)
                  }}
                  className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50"
                >
                  Editar
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteCategory(category)
                  }}
                  className="block w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}

          {products.some(p => !p.categoryId) && (
            <button
              onClick={() => setSelectedCategory('uncategorized')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                selectedCategory === 'uncategorized'
                  ? 'bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white shadow-lg shadow-[#1e3a5f]/20'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Sin categoria ({getProductCount('uncategorized')})
            </button>
          )}
        </div>
      </div>

      {/* Products list */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
          <div className="w-20 h-20 bg-gradient-to-br from-[#f0f7ff] to-white border border-[#38bdf8]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-[#2d6cb5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[#1e3a5f] mb-2">
            {selectedCategory ? 'No hay productos en esta categoria' : 'No tienes productos aun'}
          </h3>
          <p className="text-gray-600 mb-6">
            {selectedCategory ? 'Agrega productos o cambia de categoria' : 'Agrega tu primer producto para empezar a vender'}
          </p>
          <Link
            to="/dashboard/products/new"
            className="inline-flex px-6 py-3 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white rounded-xl hover:from-[#2d6cb5] hover:to-[#38bdf8] transition-all font-semibold shadow-lg shadow-[#1e3a5f]/20"
          >
            Agregar producto
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:shadow-[#1e3a5f]/10 transition-all group"
            >
              <Link to={`/dashboard/products/${product.id}`}>
                <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 relative">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  {!product.active && (
                    <div className="absolute top-2 right-2 px-2 py-1 bg-gray-900/70 text-white text-xs rounded-lg">
                      Oculto
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-[#1e3a5f] truncate group-hover:text-[#2d6cb5] transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-[#2d6cb5] font-bold text-sm mt-1">
                    {getCurrencySymbol(store?.currency || 'USD')}{product.price.toFixed(2)}
                  </p>
                  {product.categoryId && (
                    <p className="text-xs text-gray-500 mt-1">
                      {categories.find(c => c.id === product.categoryId)?.name}
                    </p>
                  )}
                </div>
              </Link>
              <div className="px-4 pb-4 flex gap-2">
                <Link
                  to={`/dashboard/products/${product.id}`}
                  className="flex-1 px-3 py-2 text-xs font-medium text-[#2d6cb5] bg-[#f0f7ff] hover:bg-[#e0efff] rounded-lg transition-all text-center"
                >
                  Editar
                </Link>
                <button
                  onClick={() => handleDeleteProduct(product.id)}
                  className="px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-all"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-[#1e3a5f] mb-4">
              {editingCategory ? 'Editar categoria' : 'Nueva categoria'}
            </h3>
            <form onSubmit={handleSaveCategory}>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nombre de la categoria"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all mb-4"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryModal(false)
                    setNewCategoryName('')
                    setEditingCategory(null)
                  }}
                  className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newCategoryName.trim() || savingCategory}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white rounded-xl hover:from-[#2d6cb5] hover:to-[#38bdf8] transition-all font-medium disabled:opacity-50"
                >
                  {savingCategory ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
