import { useState, useRef, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { useAuth } from '../../hooks/useAuth'
import { productService, categoryService } from '../../lib/firebase'
import { useToast } from '../ui/Toast'
import { getCurrencySymbol } from '../../lib/currency'
import { getBusinessTypeFeatures, type BusinessType } from '../../config/businessTypes'
import type { ProductVariation, ModifierGroup } from '../../types'

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
  // Fashion: Variations
  variations?: ProductVariation[]
  // Food: Modifiers and prep time
  modifierGroups?: ModifierGroup[]
  prepTimeMin?: number
  prepTimeMax?: number
  // Beauty: Duration
  durationValue?: number
  durationUnit?: 'min' | 'hr'
  // Tech: Specs, warranty, model
  model?: string
  warrantyMonths?: number
  specs?: Array<{ key: string; value: string }>
  // Pets
  petType?: string
  petAge?: string
  // Craft
  customizable?: boolean
  customizationInstructions?: string
  availableQuantity?: number
}

interface ProductImportProps {
  onClose: () => void
  onSuccess: () => void
  categories: { id: string; name: string }[]
}

// Template column definitions by business type
const getTemplateColumns = (businessType: BusinessType, lang: 'es' | 'en' = 'es') => {
  const features = getBusinessTypeFeatures(businessType)

  const labels = {
    es: {
      // Base fields
      nombre: 'nombre',
      precio: 'precio',
      descripcion: 'descripcion',
      categoria: 'categoria',
      activo: 'activo',
      destacado: 'destacado',
      // Inventory
      sku: 'sku',
      codigo_barras: 'codigo_barras',
      stock: 'stock',
      costo: 'costo',
      precio_anterior: 'precio_anterior',
      marca: 'marca',
      etiquetas: 'etiquetas',
      peso_gramos: 'peso_gramos',
      // Fashion
      variante_1_nombre: 'variante_1_nombre',
      variante_1_opciones: 'variante_1_opciones',
      variante_2_nombre: 'variante_2_nombre',
      variante_2_opciones: 'variante_2_opciones',
      // Food
      tiempo_prep_min: 'tiempo_prep_min',
      tiempo_prep_max: 'tiempo_prep_max',
      modificadores: 'modificadores',
      // Beauty
      duracion_valor: 'duracion_valor',
      duracion_unidad: 'duracion_unidad',
      // Tech
      modelo: 'modelo',
      garantia_meses: 'garantia_meses',
      especificaciones: 'especificaciones',
      // Pets
      tipo_mascota: 'tipo_mascota',
      edad_mascota: 'edad_mascota',
      // Craft
      personalizable: 'personalizable',
      instrucciones_personalizacion: 'instrucciones_personalizacion',
      cantidad_disponible: 'cantidad_disponible',
    },
    en: {
      nombre: 'name',
      precio: 'price',
      descripcion: 'description',
      categoria: 'category',
      activo: 'active',
      destacado: 'featured',
      sku: 'sku',
      codigo_barras: 'barcode',
      stock: 'stock',
      costo: 'cost',
      precio_anterior: 'compare_price',
      marca: 'brand',
      etiquetas: 'tags',
      peso_gramos: 'weight_grams',
      variante_1_nombre: 'variant_1_name',
      variante_1_opciones: 'variant_1_options',
      variante_2_nombre: 'variant_2_name',
      variante_2_opciones: 'variant_2_options',
      tiempo_prep_min: 'prep_time_min',
      tiempo_prep_max: 'prep_time_max',
      modificadores: 'modifiers',
      duracion_valor: 'duration_value',
      duracion_unidad: 'duration_unit',
      modelo: 'model',
      garantia_meses: 'warranty_months',
      especificaciones: 'specifications',
      tipo_mascota: 'pet_type',
      edad_mascota: 'pet_age',
      personalizable: 'customizable',
      instrucciones_personalizacion: 'customization_instructions',
      cantidad_disponible: 'available_quantity',
    }
  }

  const l = labels[lang]

  // Build columns array based on business type features
  const columns: string[] = [l.nombre, l.precio, l.descripcion, l.categoria]

  if (features.showSku) columns.push(l.sku)
  if (features.showBarcode) columns.push(l.codigo_barras)
  if (features.showStock) columns.push(l.stock)
  if (features.showCost) columns.push(l.costo)
  if (features.showComparePrice) columns.push(l.precio_anterior)
  if (features.showBrand) columns.push(l.marca)
  if (features.showTags) columns.push(l.etiquetas)
  if (features.showShipping) columns.push(l.peso_gramos)

  // Fashion: Variations
  if (features.showVariants) {
    columns.push(l.variante_1_nombre, l.variante_1_opciones)
    columns.push(l.variante_2_nombre, l.variante_2_opciones)
  }

  // Food: Prep time and modifiers
  if (features.showPrepTime) {
    columns.push(l.tiempo_prep_min, l.tiempo_prep_max)
  }
  if (features.showModifiers) {
    columns.push(l.modificadores)
  }

  // Beauty: Duration
  if (features.showServiceDuration) {
    columns.push(l.duracion_valor, l.duracion_unidad)
  }

  // Tech: Model, warranty, specs
  if (features.showModel) columns.push(l.modelo)
  if (features.showWarranty) columns.push(l.garantia_meses)
  if (features.showSpecs) columns.push(l.especificaciones)

  // Pets
  if (features.showPetType) columns.push(l.tipo_mascota)
  if (features.showPetAge) columns.push(l.edad_mascota)

  // Craft
  if (features.showCustomOrder) {
    columns.push(l.personalizable, l.instrucciones_personalizacion)
  }
  if (features.showLimitedStock) {
    columns.push(l.cantidad_disponible)
  }

  columns.push(l.activo, l.destacado)

  return columns
}

// Generate example row based on business type
const getExampleRow = (businessType: BusinessType, lang: 'es' | 'en' = 'es') => {
  const columns = getTemplateColumns(businessType, lang)

  const examples: Record<string, Record<string, string | number>> = {
    es: {
      nombre: businessType === 'food' ? 'Hamburguesa clasica' :
              businessType === 'fashion' ? 'Camiseta basica' :
              businessType === 'cosmetics' ? 'Labial mate rojo' :
              businessType === 'grocery' ? 'Galletas integrales' :
              businessType === 'tech' ? 'Audifonos Bluetooth' :
              businessType === 'pets' ? 'Alimento premium' :
              businessType === 'craft' ? 'Macrame colgante' :
              'Producto ejemplo',
      precio: 99.99,
      descripcion: 'Descripcion del producto',
      categoria: businessType === 'food' ? 'Hamburguesas' :
                 businessType === 'fashion' ? 'Camisetas' :
                 businessType === 'cosmetics' ? 'Labiales' :
                 businessType === 'grocery' ? 'Galletas' :
                 businessType === 'tech' ? 'Audio' :
                 businessType === 'pets' ? 'Alimentos' :
                 businessType === 'craft' ? 'Decoracion' :
                 'Categoria ejemplo',
      sku: 'SKU-001',
      codigo_barras: '7501234567890',
      stock: 100,
      costo: 50,
      precio_anterior: 120,
      marca: 'Mi Marca',
      etiquetas: 'nuevo, oferta',
      peso_gramos: 500,
      // Fashion
      variante_1_nombre: 'Talla',
      variante_1_opciones: 'S, M, L, XL',
      variante_2_nombre: 'Color',
      variante_2_opciones: 'Negro, Blanco, Azul',
      // Food
      tiempo_prep_min: 15,
      tiempo_prep_max: 25,
      modificadores: 'Tipo de pan:Pan brioche|Pan integral;Extras:Queso extra:+5|Tocino:+8',
      // Tech
      modelo: 'BT-500',
      garantia_meses: 12,
      especificaciones: 'Bluetooth:5.0;Bateria:20h;Driver:40mm',
      // Pets
      tipo_mascota: 'dog',
      edad_mascota: 'adult',
      // Craft
      personalizable: 'si',
      instrucciones_personalizacion: 'Puedes elegir el color de las cuerdas',
      cantidad_disponible: 5,
      activo: 'si',
      destacado: 'no'
    },
    en: {
      name: businessType === 'food' ? 'Classic burger' :
            businessType === 'fashion' ? 'Basic t-shirt' :
            businessType === 'cosmetics' ? 'Red matte lipstick' :
            businessType === 'grocery' ? 'Whole grain cookies' :
            businessType === 'tech' ? 'Bluetooth headphones' :
            businessType === 'pets' ? 'Premium food' :
            businessType === 'craft' ? 'Macrame wall hanging' :
            'Example product',
      price: 99.99,
      description: 'Product description',
      category: businessType === 'food' ? 'Burgers' :
                businessType === 'fashion' ? 'T-shirts' :
                businessType === 'cosmetics' ? 'Lipsticks' :
                businessType === 'grocery' ? 'Cookies' :
                businessType === 'tech' ? 'Audio' :
                businessType === 'pets' ? 'Food' :
                businessType === 'craft' ? 'Decoration' :
                'Example category',
      sku: 'SKU-001',
      barcode: '7501234567890',
      stock: 100,
      cost: 50,
      compare_price: 120,
      brand: 'My Brand',
      tags: 'new, sale',
      weight_grams: 500,
      variant_1_name: 'Size',
      variant_1_options: 'S, M, L, XL',
      variant_2_name: 'Color',
      variant_2_options: 'Black, White, Blue',
      prep_time_min: 15,
      prep_time_max: 25,
      modifiers: 'Bread type:Brioche|Whole wheat;Extras:Extra cheese:+5|Bacon:+8',
      model: 'BT-500',
      warranty_months: 12,
      specifications: 'Bluetooth:5.0;Battery:20h;Driver:40mm',
      pet_type: 'dog',
      pet_age: 'adult',
      customizable: 'yes',
      customization_instructions: 'You can choose the rope color',
      available_quantity: 5,
      active: 'yes',
      featured: 'no'
    }
  }

  const row: Record<string, string | number> = {}
  const exampleData = examples[lang]

  columns.forEach(col => {
    if (exampleData[col] !== undefined) {
      row[col] = exampleData[col]
    }
  })

  return row
}

// Parse variations from import row
const parseVariations = (row: Record<string, unknown>): ProductVariation[] => {
  const variations: ProductVariation[] = []

  // Variant 1
  const var1Name = String(row['variante_1_nombre'] || row['variant_1_name'] || '').trim()
  const var1Options = String(row['variante_1_opciones'] || row['variant_1_options'] || '').trim()

  if (var1Name && var1Options) {
    const options = var1Options.split(',').map(opt => opt.trim()).filter(Boolean)
    if (options.length > 0) {
      variations.push({
        id: `var-${Date.now()}-1`,
        name: var1Name,
        options: options.map((value, i) => ({
          id: `opt-${Date.now()}-1-${i}`,
          value,
          available: true
        }))
      })
    }
  }

  // Variant 2
  const var2Name = String(row['variante_2_nombre'] || row['variant_2_name'] || '').trim()
  const var2Options = String(row['variante_2_opciones'] || row['variant_2_options'] || '').trim()

  if (var2Name && var2Options) {
    const options = var2Options.split(',').map(opt => opt.trim()).filter(Boolean)
    if (options.length > 0) {
      variations.push({
        id: `var-${Date.now()}-2`,
        name: var2Name,
        options: options.map((value, i) => ({
          id: `opt-${Date.now()}-2-${i}`,
          value,
          available: true
        }))
      })
    }
  }

  return variations
}

// Parse modifiers from import row
// Format: "Grupo:Opcion1|Opcion2:+precio;OtroGrupo:Opcion"
const parseModifiers = (row: Record<string, unknown>): ModifierGroup[] => {
  const modifiersStr = String(row['modificadores'] || row['modifiers'] || '').trim()
  if (!modifiersStr) return []

  const groups: ModifierGroup[] = []
  const groupStrings = modifiersStr.split(';')

  groupStrings.forEach((groupStr, groupIndex) => {
    const parts = groupStr.split(':')
    if (parts.length < 2) return

    const groupName = parts[0].trim()
    const optionsStr = parts.slice(1).join(':') // Rejoin in case option has price with :

    if (!groupName) return

    const options = optionsStr.split('|').map((optStr, optIndex) => {
      // Check if option has a price: "Queso extra:+5" or just "Pan brioche"
      const optParts = optStr.split(':')
      const optName = optParts[0].trim()
      let price = 0

      if (optParts.length > 1) {
        const priceStr = optParts[1].replace('+', '').trim()
        price = parseFloat(priceStr) || 0
      }

      return {
        id: `mod-opt-${Date.now()}-${groupIndex}-${optIndex}`,
        name: optName,
        price,
        available: true
      }
    }).filter(opt => opt.name)

    if (options.length > 0) {
      groups.push({
        id: `mod-group-${Date.now()}-${groupIndex}`,
        name: groupName,
        required: false,
        minSelect: 0,
        maxSelect: options.length,
        options
      })
    }
  })

  return groups
}

// Parse specifications from import row
// Format: "Key:Value;OtherKey:OtherValue"
const parseSpecs = (row: Record<string, unknown>): Array<{ key: string; value: string }> => {
  const specsStr = String(row['especificaciones'] || row['specifications'] || '').trim()
  if (!specsStr) return []

  return specsStr.split(';').map(specStr => {
    const [key, ...valueParts] = specStr.split(':')
    return {
      key: key.trim(),
      value: valueParts.join(':').trim()
    }
  }).filter(spec => spec.key && spec.value)
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
  const [isDragging, setIsDragging] = useState(false)

  const businessType = (store?.businessType as BusinessType) || 'general'
  const features = useMemo(() => getBusinessTypeFeatures(businessType), [businessType])

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
    const columns = getTemplateColumns(businessType, 'es')
    const exampleRow = getExampleRow(businessType, 'es')

    const template = [exampleRow]

    const ws = XLSX.utils.json_to_sheet(template, { header: columns })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Productos')

    // Set column widths based on content
    ws['!cols'] = columns.map(col => ({ wch: Math.max(15, col.length + 5) }))

    const fileName = `plantilla_productos_${businessType}_shopifree.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  const processFile = (file: File) => {
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
            weight: row['peso_gramos'] || row['weight_grams'] || row['weight'] ? parseFloat(String(row['peso_gramos'] || row['weight_grams'] || row['weight'])) : undefined,
            category: String(row['categoria'] || row['category'] || row['Categoria'] || '').trim() || undefined,
            active: ['si', 'yes', '1', 'true', 'activo'].includes(String(row['activo'] || row['active'] || 'si').toLowerCase()),
            featured: ['si', 'yes', '1', 'true'].includes(String(row['destacado'] || row['featured'] || 'no').toLowerCase()),
          }

          // Parse business-type specific fields

          // Fashion: Variations
          if (features.showVariants) {
            const variations = parseVariations(row)
            if (variations.length > 0) {
              product.variations = variations
            }
          }

          // Food: Modifiers and prep time
          if (features.showModifiers) {
            const modifiers = parseModifiers(row)
            if (modifiers.length > 0) {
              product.modifierGroups = modifiers
            }
          }

          if (features.showPrepTime) {
            const prepMin = row['tiempo_prep_min'] || row['prep_time_min']
            const prepMax = row['tiempo_prep_max'] || row['prep_time_max']
            if (prepMin !== undefined) {
              product.prepTimeMin = parseInt(String(prepMin)) || undefined
            }
            if (prepMax !== undefined) {
              product.prepTimeMax = parseInt(String(prepMax)) || undefined
            }
          }

          // Beauty: Duration
          if (features.showServiceDuration) {
            const durVal = row['duracion_valor'] || row['duration_value']
            const durUnit = String(row['duracion_unidad'] || row['duration_unit'] || 'min').toLowerCase()
            if (durVal !== undefined) {
              product.durationValue = parseInt(String(durVal)) || undefined
              product.durationUnit = (durUnit === 'hr' || durUnit === 'hour') ? 'hr' : 'min'
            }
          }

          // Tech: Model, warranty, specs
          if (features.showModel) {
            product.model = String(row['modelo'] || row['model'] || '').trim() || undefined
          }
          if (features.showWarranty) {
            const warranty = row['garantia_meses'] || row['warranty_months']
            if (warranty !== undefined) {
              product.warrantyMonths = parseInt(String(warranty)) || undefined
            }
          }
          if (features.showSpecs) {
            const specs = parseSpecs(row)
            if (specs.length > 0) {
              product.specs = specs
            }
          }

          // Pets
          if (features.showPetType) {
            const petType = String(row['tipo_mascota'] || row['pet_type'] || '').toLowerCase().trim()
            if (['dog', 'cat', 'bird', 'fish', 'small', 'other'].includes(petType)) {
              product.petType = petType
            }
          }
          if (features.showPetAge) {
            const petAge = String(row['edad_mascota'] || row['pet_age'] || '').toLowerCase().trim()
            if (['puppy', 'adult', 'senior', 'all'].includes(petAge)) {
              product.petAge = petAge
            }
          }

          // Craft
          if (features.showCustomOrder) {
            product.customizable = ['si', 'yes', '1', 'true'].includes(String(row['personalizable'] || row['customizable'] || 'no').toLowerCase())
            product.customizationInstructions = String(row['instrucciones_personalizacion'] || row['customization_instructions'] || '').trim() || undefined
          }
          if (features.showLimitedStock) {
            const availQty = row['cantidad_disponible'] || row['available_quantity']
            if (availQty !== undefined) {
              product.availableQuantity = parseInt(String(availQty)) || undefined
            }
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    processFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['.xlsx', '.xls', '.csv']
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!validTypes.includes(fileExtension)) {
      showToast('Formato no soportado. Usa .xlsx, .xls o .csv', 'error')
      return
    }

    processFile(file)
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

        // Build product data, only including defined values
        const productData: Record<string, unknown> = {
          name: product.name,
          slug: generateSlug(product.name),
          price: product.price,
          tags: product.tags ? product.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          active: product.active ?? true,
          featured: product.featured ?? false,
          images: [],
        }

        // Add optional fields only if they have values
        if (product.description) productData.description = product.description
        if (product.sku) productData.sku = product.sku
        if (product.barcode) productData.barcode = product.barcode
        if (product.stock !== undefined && product.stock !== null) {
          productData.stock = product.stock
          productData.trackStock = true
        } else {
          productData.trackStock = false
        }
        if (product.cost !== undefined && product.cost !== null) productData.cost = product.cost
        if (product.comparePrice !== undefined && product.comparePrice !== null) productData.comparePrice = product.comparePrice
        if (product.brand) productData.brand = product.brand
        if (product.weight !== undefined && product.weight !== null) productData.weight = product.weight
        if (categoryId) productData.categoryId = categoryId

        // Business-type specific fields

        // Fashion: Variations
        if (product.variations && product.variations.length > 0) {
          productData.hasVariations = true
          productData.variations = product.variations
        }

        // Food: Modifiers and prep time
        if (product.modifierGroups && product.modifierGroups.length > 0) {
          productData.hasModifiers = true
          productData.modifierGroups = product.modifierGroups
        }

        if (product.prepTimeMin !== undefined || product.prepTimeMax !== undefined) {
          productData.prepTime = {
            min: product.prepTimeMin || 0,
            max: product.prepTimeMax || product.prepTimeMin || 0,
            unit: 'min'
          }
        }

        // Beauty: Duration
        if (product.durationValue !== undefined) {
          productData.duration = {
            value: product.durationValue,
            unit: product.durationUnit || 'min'
          }
        }

        // Tech
        if (product.model) productData.model = product.model
        if (product.warrantyMonths !== undefined) {
          productData.warranty = {
            months: product.warrantyMonths
          }
        }
        if (product.specs && product.specs.length > 0) {
          productData.specs = product.specs
        }

        // Pets
        if (product.petType) productData.petType = product.petType
        if (product.petAge) productData.petAge = product.petAge

        // Craft
        if (product.customizable !== undefined) {
          productData.customizable = product.customizable
          if (product.customizationInstructions) {
            productData.customizationInstructions = product.customizationInstructions
          }
        }
        if (product.availableQuantity !== undefined) {
          productData.availableQuantity = product.availableQuantity
        }

        await productService.create(store.id, productData as Parameters<typeof productService.create>[1])
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

  // Get business type label for display
  const businessTypeLabels: Record<BusinessType, string> = {
    fashion: 'Moda / Ropa',
    food: 'Restaurante / Comida',
    grocery: 'Alimentos / Abarrotes',
    cosmetics: 'Cosmeticos / Belleza',
    tech: 'Tecnologia / Electronica',
    pets: 'Mascotas',
    craft: 'Artesanal / Handmade',
    general: 'General'
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#1e3a5f]">Importar productos</h2>
            <p className="text-sm text-gray-500">Plantilla para: {businessTypeLabels[businessType]}</p>
          </div>
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
                      Plantilla personalizada para <strong>{businessTypeLabels[businessType]}</strong> con los campos relevantes para tu tipo de negocio.
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
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? 'border-[#38bdf8] bg-[#f0f7ff]'
                      : 'border-gray-200 hover:border-[#38bdf8]'
                  }`}
                >
                  <div className={`w-14 h-14 bg-gradient-to-br from-[#38bdf8] to-[#2d6cb5] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#38bdf8]/20 transition-transform ${isDragging ? 'scale-110' : ''}`}>
                    <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-[#1e3a5f] font-medium mb-1">
                    {isDragging ? 'Suelta el archivo aqui' : 'Click para seleccionar archivo'}
                  </p>
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
                        {features.showSku && (
                          <th className="px-4 py-3 text-left font-semibold text-[#1e3a5f]">SKU</th>
                        )}
                        {features.showStock && (
                          <th className="px-4 py-3 text-left font-semibold text-[#1e3a5f]">Stock</th>
                        )}
                        <th className="px-4 py-3 text-left font-semibold text-[#1e3a5f]">Categoria</th>
                        {features.showVariants && (
                          <th className="px-4 py-3 text-left font-semibold text-[#1e3a5f]">Variantes</th>
                        )}
                        {features.showModifiers && (
                          <th className="px-4 py-3 text-left font-semibold text-[#1e3a5f]">Modificadores</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {products.slice(0, 50).map((product, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{product.name}</td>
                          <td className="px-4 py-3 text-gray-600">{getCurrencySymbol(store?.currency || 'USD')}{product.price.toFixed(2)}</td>
                          {features.showSku && (
                            <td className="px-4 py-3 text-gray-600">{product.sku || '-'}</td>
                          )}
                          {features.showStock && (
                            <td className="px-4 py-3 text-gray-600">{product.stock ?? '-'}</td>
                          )}
                          <td className="px-4 py-3 text-gray-600">{product.category || '-'}</td>
                          {features.showVariants && (
                            <td className="px-4 py-3 text-gray-600">
                              {product.variations?.length
                                ? product.variations.map(v => `${v.name}: ${v.options.length}`).join(', ')
                                : '-'}
                            </td>
                          )}
                          {features.showModifiers && (
                            <td className="px-4 py-3 text-gray-600">
                              {product.modifierGroups?.length
                                ? `${product.modifierGroups.length} grupo${product.modifierGroups.length > 1 ? 's' : ''}`
                                : '-'}
                            </td>
                          )}
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
