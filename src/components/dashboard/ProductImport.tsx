import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { useAuth } from '../../hooks/useAuth'
import { productService, categoryService } from '../../lib/firebase'
import { useToast } from '../ui/Toast'
import { getCurrencySymbol } from '../../lib/currency'

interface ImportProduct {
  name: string
  price: number
  description?: string
  sku?: string
  barcode?: string
  stock?: number
  cost?: number
  comparePrice?: number
  brand?: string
  tags?: string
  weight?: number
  category?: string
  active?: boolean
  featured?: boolean
}

interface ProductImportProps {
  onClose: () => void
  onSuccess: () => void
  categories: { id: string; name: string }[]
}

export default function ProductImport({ onClose, onSuccess, categories }: ProductImportProps) {
  const { store } = useAuth()
  const { showToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<'upload' | 'preview' | 'importing'>('upload')
  const [products, setProducts] = useState<ImportProduct[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const downloadTemplate = () => {
    const template = [
      {
        nombre: 'Producto ejemplo',
        precio: 99.99,
        descripcion: 'Descripcion del producto',
        sku: 'SKU-001',
        codigo_barras: '7501234567890',
        stock: 100,
        costo: 50,
        precio_anterior: 120,
        marca: 'Mi Marca',
        etiquetas: 'nuevo, oferta',
        peso_gramos: 500,
        categoria: 'Categoria ejemplo',
        activo: 'si',
        destacado: 'no'
      }
    ]

    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Productos')

    // Set column widths
    ws['!cols'] = [
      { wch: 20 }, // nombre
      { wch: 10 }, // precio
      { wch: 30 }, // descripcion
      { wch: 12 }, // sku
      { wch: 15 }, // codigo_barras
      { wch: 8 },  // stock
      { wch: 10 }, // costo
      { wch: 12 }, // precio_anterior
      { wch: 15 }, // marca
      { wch: 20 }, // etiquetas
      { wch: 12 }, // peso_gramos
      { wch: 15 }, // categoria
      { wch: 8 },  // activo
      { wch: 10 }, // destacado
    ]

    XLSX.writeFile(wb, 'plantilla_productos_shopifree.xlsx')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = event.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)

        const parsedProducts: ImportProduct[] = []
        const parseErrors: string[] = []

        const rows = jsonData as Record<string, unknown>[]
        rows.forEach((row: Record<string, unknown>, index: number) => {
          const rowNum = index + 2 // Excel rows start at 1, plus header

          // Get name (required)
          const name = String(row['nombre'] || row['name'] || row['Nombre'] || row['Name'] || '').trim()
          if (!name) {
            parseErrors.push(`Fila ${rowNum}: El nombre es requerido`)
            return
          }

          // Get price (required)
          const priceVal = row['precio'] || row['price'] || row['Precio'] || row['Price']
          const price = parseFloat(String(priceVal))
          if (isNaN(price) || price < 0) {
            parseErrors.push(`Fila ${rowNum}: El precio debe ser un numero valido`)
            return
          }

          const product: ImportProduct = {
            name,
            price,
            description: String(row['descripcion'] || row['description'] || row['Descripcion'] || '').trim() || undefined,
            sku: String(row['sku'] || row['SKU'] || '').trim() || undefined,
            barcode: String(row['codigo_barras'] || row['barcode'] || row['Codigo_barras'] || '').trim() || undefined,
            stock: row['stock'] || row['Stock'] ? parseInt(String(row['stock'] || row['Stock'])) : undefined,
            cost: row['costo'] || row['cost'] ? parseFloat(String(row['costo'] || row['cost'])) : undefined,
            comparePrice: row['precio_anterior'] || row['compare_price'] ? parseFloat(String(row['precio_anterior'] || row['compare_price'])) : undefined,
            brand: String(row['marca'] || row['brand'] || row['Marca'] || '').trim() || undefined,
            tags: String(row['etiquetas'] || row['tags'] || row['Etiquetas'] || '').trim() || undefined,
            weight: row['peso_gramos'] || row['weight'] ? parseFloat(String(row['peso_gramos'] || row['weight'])) : undefined,
            category: String(row['categoria'] || row['category'] || row['Categoria'] || '').trim() || undefined,
            active: ['si', 'yes', '1', 'true', 'activo'].includes(String(row['activo'] || row['active'] || 'si').toLowerCase()),
            featured: ['si', 'yes', '1', 'true'].includes(String(row['destacado'] || row['featured'] || 'no').toLowerCase()),
          }

          parsedProducts.push(product)
        })

        setProducts(parsedProducts)
        setErrors(parseErrors)

        if (parsedProducts.length > 0) {
          setStep('preview')
        } else if (parseErrors.length > 0) {
          showToast('No se encontraron productos validos', 'error')
        }
      } catch (error) {
        console.error('Error parsing file:', error)
        showToast('Error al leer el archivo', 'error')
      }
    }
    reader.readAsBinaryString(file)
  }

  const handleImport = async () => {
    if (!store || products.length === 0) return

    setImporting(true)
    setStep('importing')

    // Build category map (name -> id)
    const categoryMap = new Map<string, string>()
    categories.forEach(c => categoryMap.set(c.name.toLowerCase(), c.id))

    // Find unique category names that need to be created
    const uniqueCategoryNames = new Set<string>()
    products.forEach(p => {
      if (p.category && !categoryMap.has(p.category.toLowerCase())) {
        uniqueCategoryNames.add(p.category.trim())
      }
    })

    // Create missing categories first
    const categoriesToCreate = Array.from(uniqueCategoryNames)
    const totalSteps = categoriesToCreate.length + products.length
    setProgress({ current: 0, total: totalSteps })

    for (let i = 0; i < categoriesToCreate.length; i++) {
      const categoryName = categoriesToCreate[i]
      try {
        const slug = categoryName
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')

        const categoryId = await categoryService.create(store.id, {
          name: categoryName,
          slug,
          order: categories.length + i
        })
        categoryMap.set(categoryName.toLowerCase(), categoryId)
      } catch (error) {
        console.error(`Error creating category ${categoryName}:`, error)
      }
      setProgress({ current: i + 1, total: totalSteps })
    }

    // Now import products
    let successCount = 0
    const importErrors: string[] = []

    for (let i = 0; i < products.length; i++) {
      const product = products[i]
      try {
        // Find category ID (now includes newly created ones)
        let categoryId: string | null = null
        if (product.category) {
          categoryId = categoryMap.get(product.category.toLowerCase()) || null
        }

        await productService.create(store.id, {
          name: product.name,
          slug: generateSlug(product.name),
          price: product.price,
          description: product.description || undefined,
          sku: product.sku || undefined,
          barcode: product.barcode || undefined,
          stock: product.stock,
          trackStock: product.stock !== undefined,
          cost: product.cost,
          comparePrice: product.comparePrice,
          brand: product.brand || undefined,
          tags: product.tags ? product.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          weight: product.weight,
          categoryId: categoryId || undefined,
          active: product.active ?? true,
          featured: product.featured ?? false,
          image: undefined,
        })
        successCount++
      } catch (error) {
        console.error(`Error importing product ${product.name}:`, error)
        importErrors.push(`"${product.name}": Error al importar`)
      }
      setProgress({ current: categoriesToCreate.length + i + 1, total: totalSteps })
    }

    setImporting(false)

    const newCategoriesMsg = categoriesToCreate.length > 0
      ? ` (${categoriesToCreate.length} categoria${categoriesToCreate.length !== 1 ? 's' : ''} creada${categoriesToCreate.length !== 1 ? 's' : ''})`
      : ''

    if (successCount === products.length) {
      showToast(`${successCount} productos importados${newCategoriesMsg}`, 'success')
      onSuccess()
      onClose()
    } else {
      showToast(`${successCount} de ${products.length} productos importados${newCategoriesMsg}`, successCount > 0 ? 'success' : 'error')
      setErrors([...errors, ...importErrors])
      if (successCount > 0) {
        onSuccess()
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#1e3a5f]">Importar productos</h2>
          <button
            onClick={onClose}
            disabled={importing}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Download template */}
              <div className="bg-gradient-to-br from-[#f0f7ff] to-white p-4 rounded-xl border border-[#38bdf8]/20">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#38bdf8]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-[#2d6cb5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-[#1e3a5f] mb-1">Paso 1: Descarga la plantilla</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Usa nuestra plantilla de Excel para asegurarte de que los datos esten en el formato correcto.
                    </p>
                    <button
                      onClick={downloadTemplate}
                      className="px-4 py-2 bg-white border border-[#38bdf8] text-[#2d6cb5] rounded-lg text-sm font-medium hover:bg-[#f0f7ff] transition-colors"
                    >
                      Descargar plantilla Excel
                    </button>
                  </div>
                </div>
              </div>

              {/* Upload file */}
              <div>
                <h4 className="font-semibold text-[#1e3a5f] mb-3">Paso 2: Sube tu archivo</h4>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-[#38bdf8] transition-colors"
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-[#38bdf8] to-[#2d6cb5] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#38bdf8]/20">
                    <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-[#1e3a5f] font-medium mb-1">Click para seleccionar archivo</p>
                  <p className="text-gray-400 text-sm">o arrastra y suelta aqui</p>
                  <p className="text-gray-400 text-xs mt-2">Formatos soportados: .xlsx, .xls, .csv</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Info */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">Campos requeridos:</p>
                    <ul className="list-disc list-inside text-yellow-700">
                      <li><strong>nombre</strong> - Nombre del producto</li>
                      <li><strong>precio</strong> - Precio de venta</li>
                    </ul>
                    <p className="mt-2 text-yellow-700">Los demas campos son opcionales.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-br from-[#f0f7ff] to-white rounded-xl border border-[#38bdf8]/20">
                <div>
                  <p className="text-sm text-gray-600">Productos a importar</p>
                  <p className="text-2xl font-bold text-[#1e3a5f]">{products.length}</p>
                </div>
                {errors.length > 0 && (
                  <div className="text-right">
                    <p className="text-sm text-red-600">Errores encontrados</p>
                    <p className="text-2xl font-bold text-red-600">{errors.length}</p>
                  </div>
                )}
              </div>

              {/* Errors */}
              {errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 max-h-32 overflow-y-auto">
                  <p className="text-sm font-medium text-red-800 mb-2">Filas con errores (no se importaran):</p>
                  <ul className="text-sm text-red-700 space-y-1">
                    {errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-[#1e3a5f]">Nombre</th>
                        <th className="px-4 py-3 text-left font-semibold text-[#1e3a5f]">Precio</th>
                        <th className="px-4 py-3 text-left font-semibold text-[#1e3a5f]">SKU</th>
                        <th className="px-4 py-3 text-left font-semibold text-[#1e3a5f]">Stock</th>
                        <th className="px-4 py-3 text-left font-semibold text-[#1e3a5f]">Categoria</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {products.slice(0, 50).map((product, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{product.name}</td>
                          <td className="px-4 py-3 text-gray-600">{getCurrencySymbol(store?.currency || 'USD')}{product.price.toFixed(2)}</td>
                          <td className="px-4 py-3 text-gray-600">{product.sku || '-'}</td>
                          <td className="px-4 py-3 text-gray-600">{product.stock ?? '-'}</td>
                          <td className="px-4 py-3 text-gray-600">{product.category || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {products.length > 50 && (
                  <div className="px-4 py-2 bg-gray-50 text-center text-sm text-gray-500">
                    Mostrando 50 de {products.length} productos
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'importing' && (
            <div className="py-8 text-center">
              <div className="w-16 h-16 border-4 border-[#38bdf8]/30 border-t-[#2d6cb5] rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-lg font-semibold text-[#1e3a5f] mb-2">Importando productos...</p>
              <p className="text-gray-600">{progress.current} de {progress.total}</p>
              <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-[#1e3a5f] to-[#38bdf8] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'importing' && (
          <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
            {step === 'preview' && (
              <button
                onClick={() => {
                  setStep('upload')
                  setProducts([])
                  setErrors([])
                }}
                className="px-4 py-2.5 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium"
              >
                Volver
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium"
            >
              Cancelar
            </button>
            {step === 'preview' && products.length > 0 && (
              <button
                onClick={handleImport}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white rounded-xl hover:from-[#2d6cb5] hover:to-[#38bdf8] transition-all font-semibold shadow-lg shadow-[#1e3a5f]/20"
              >
                Importar {products.length} producto{products.length !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
