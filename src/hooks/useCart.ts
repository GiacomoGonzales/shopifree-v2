import { useState, useCallback, useMemo } from 'react'
import type { Product } from '../types'
import type { SelectedModifier } from '../components/catalog/business-type'
import { trackAddToCart, getPixelDefaultCurrency } from '../lib/pixels'

export interface CartItemExtras {
  selectedVariants?: Record<string, string>
  selectedModifiers?: SelectedModifier[]
  customNote?: string
  itemPrice: number
}

export interface CartItem {
  product: Product
  quantity: number
  // Business type specific
  selectedVariants?: Record<string, string>
  selectedModifiers?: SelectedModifier[]
  customNote?: string
  itemPrice: number  // Price per unit including modifiers
}

// Generate a unique key for cart items based on product and selections
function generateCartItemKey(product: Product, extras?: CartItemExtras): string {
  const parts = [product.id]

  if (extras?.selectedVariants) {
    const variantParts = Object.entries(extras.selectedVariants)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
    parts.push('v', ...variantParts)
  }

  if (extras?.selectedModifiers) {
    const modifierParts = extras.selectedModifiers
      .flatMap(m => m.options.map(o => o.id))
      .sort()
    parts.push('m', ...modifierParts)
  }

  return parts.join('-')
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([])

  const addItem = useCallback((product: Product, extras?: CartItemExtras): boolean => {
    let blocked = false
    setItems(currentItems => {
      const itemKey = generateCartItemKey(product, extras)

      // Find existing item with same product AND same selections
      const existingIndex = currentItems.findIndex(item => {
        const currentKey = generateCartItemKey(item.product, {
          selectedVariants: item.selectedVariants,
          selectedModifiers: item.selectedModifiers,
          itemPrice: item.itemPrice,
        })
        return currentKey === itemKey
      })

      // Check stock limit (variant-level first, then product-level)
      if (product.trackStock) {
        const currentQty = existingIndex !== -1 ? currentItems[existingIndex].quantity : 0
        let stockLimit: number | undefined

        if (extras?.selectedVariants && product.variations?.length) {
          for (const [varName, varValue] of Object.entries(extras.selectedVariants)) {
            const variation = product.variations.find(v => v.name === varName)
            const option = variation?.options.find(o => o.value === varValue)
            if (option && typeof option.stock === 'number') {
              stockLimit = stockLimit === undefined ? option.stock : Math.min(stockLimit, option.stock)
            }
          }
        }

        if (stockLimit === undefined && typeof product.stock === 'number') {
          stockLimit = product.stock
        }

        if (stockLimit !== undefined && currentQty + 1 > stockLimit) {
          blocked = true
          return currentItems
        }
      }

      if (existingIndex !== -1) {
        // Increment quantity of existing item
        return currentItems.map((item, index) =>
          index === existingIndex
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }

      // Add new item
      const newItem: CartItem = {
        product,
        quantity: 1,
        selectedVariants: extras?.selectedVariants,
        selectedModifiers: extras?.selectedModifiers,
        customNote: extras?.customNote,
        itemPrice: extras?.itemPrice || product.price,
      }

      return [...currentItems, newItem]
    })
    // Fire AddToCart pixel event on successful add (not when blocked by stock)
    if (!blocked) {
      const unitPrice = extras?.itemPrice || product.price || 0
      trackAddToCart({
        currency: getPixelDefaultCurrency(),
        value: unitPrice,
        items: [{
          id: product.id,
          name: product.name,
          price: unitPrice,
          quantity: 1,
        }],
      })
    }
    return !blocked
  }, [])

  const removeItem = useCallback((index: number) => {
    setItems(currentItems => currentItems.filter((_, i) => i !== index))
  }, [])

  const updateQuantity = useCallback((index: number, quantity: number): boolean => {
    if (quantity <= 0) {
      setItems(currentItems => currentItems.filter((_, i) => i !== index))
      return true
    }
    let blocked = false
    setItems(currentItems =>
      currentItems.map((item, i) => {
        if (i !== index) return item
        if (item.product.trackStock) {
          let stockLimit: number | undefined

          if (item.selectedVariants && item.product.variations?.length) {
            for (const [varName, varValue] of Object.entries(item.selectedVariants)) {
              const variation = item.product.variations.find(v => v.name === varName)
              const option = variation?.options.find(o => o.value === varValue)
              if (option && typeof option.stock === 'number') {
                stockLimit = stockLimit === undefined ? option.stock : Math.min(stockLimit, option.stock)
              }
            }
          }

          if (stockLimit === undefined && typeof item.product.stock === 'number') {
            stockLimit = item.product.stock
          }

          if (stockLimit !== undefined && quantity > stockLimit) {
            blocked = true
            return item
          }
        }
        return { ...item, quantity }
      })
    )
    return !blocked
  }, [])

  const updateCustomNote = useCallback((index: number, customNote: string) => {
    setItems(currentItems =>
      currentItems.map((item, i) =>
        i === index ? { ...item, customNote } : item
      )
    )
  }, [])

  // ID-based methods for backwards compatibility with CartDrawer
  const removeItemById = useCallback((productId: string) => {
    setItems(currentItems => {
      const index = currentItems.findIndex(item => item.product.id === productId)
      if (index === -1) return currentItems
      return currentItems.filter((_, i) => i !== index)
    })
  }, [])

  const updateQuantityById = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItemById(productId)
      return
    }
    setItems(currentItems =>
      currentItems.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    )
  }, [removeItemById])

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const totalItems = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0)
  }, [items])

  const totalPrice = useMemo(() => {
    return items.reduce((sum, item) => sum + item.itemPrice * item.quantity, 0)
  }, [items])

  // Generate WhatsApp message with all item details
  const generateWhatsAppMessage = useCallback((greeting: string, language: string = 'es') => {
    if (items.length === 0) return ''

    const labels = {
      es: {
        variants: 'Variantes',
        extras: 'Extras',
        note: 'Nota',
        total: 'Total',
      },
      en: {
        variants: 'Options',
        extras: 'Extras',
        note: 'Note',
        total: 'Total',
      },
      pt: {
        variants: 'Opcoes',
        extras: 'Extras',
        note: 'Nota',
        total: 'Total',
      },
    }

    const t = labels[language as keyof typeof labels] || labels.es

    const lines: string[] = [greeting, '']

    items.forEach((item, index) => {
      // Product name and quantity
      lines.push(`${index + 1}. *${item.product.name}* x${item.quantity}`)

      // Variants (Size, Color, etc.)
      if (item.selectedVariants && Object.keys(item.selectedVariants).length > 0) {
        const variantText = Object.entries(item.selectedVariants)
          .map(([name, value]) => `${name}: ${value}`)
          .join(', ')
        lines.push(`   ${t.variants}: ${variantText}`)
      }

      // Modifiers (Extras, Toppings, etc.)
      if (item.selectedModifiers && item.selectedModifiers.length > 0) {
        item.selectedModifiers.forEach(modifier => {
          const optionNames = modifier.options.map(o => o.name).join(', ')
          lines.push(`   ${modifier.groupName}: ${optionNames}`)
        })
      }

      // Custom note
      if (item.customNote) {
        lines.push(`   ${t.note}: ${item.customNote}`)
      }

      lines.push('') // Empty line between items
    })

    lines.push(`*${t.total}:* $${totalPrice.toFixed(2)}`)

    return lines.join('\n')
  }, [items, totalPrice])

  return {
    items,
    totalItems,
    totalPrice,
    addItem,
    removeItem,
    removeItemById,
    updateQuantity,
    updateQuantityById,
    updateCustomNote,
    clearCart,
    generateWhatsAppMessage,
  }
}
