import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import type { Product } from '../../types'
import { formatPrice } from '../../lib/currency'
import { findCombination, getDisplayPrice, getStockForSelection } from '../../lib/variants'
import { useTheme } from './ThemeContext'
import { useBusinessType } from '../../hooks/useBusinessType'
import ProductGallery from '../../themes/shared/ProductGallery'
import { getThemeTranslations } from '../../themes/shared/translations'
import ProductReels from './ProductReels'
import { getCatalogProducts } from './catalogProducts'
import {
  ModifierSelector,
  VariantSelector,
  PrepTimeDisplay,
  DurationDisplay,
  AvailabilityBadge,
  CustomOrderInput,
  SpecsDisplay,
  WarrantyBadge,
  PetTypeBadge,
  type SelectedModifier,
} from './business-type'

export interface CartItemExtras {
  selectedVariants?: Record<string, string>
  selectedModifiers?: SelectedModifier[]
  customNote?: string
  itemPrice: number
}

interface ProductDrawerProps {
  product: Product
  onClose: () => void
  onAddToCart: (product: Product, extras?: CartItemExtras) => void
}

export default function ProductDrawer({ product, onClose, onAddToCart }: ProductDrawerProps) {
  const { theme, currency, language, store } = useTheme()
  const { features } = useBusinessType()
  const t = getThemeTranslations(language)

  // All hooks must be called before any conditional returns (Rules of Hooks)
  const [drawerProduct, setDrawerProduct] = useState<Product | null>(null)
  const reelsProductRef = useRef<Product>(product) // tracks current reel position
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({})
  const [selectedModifiers, setSelectedModifiers] = useState<SelectedModifier[]>([])
  const [modifiersExtra, setModifiersExtra] = useState(0)
  const [customNote, setCustomNote] = useState('')
  const [selectionWarning, setSelectionWarning] = useState(false)
  const variantSectionRef = useRef<HTMLDivElement>(null)

  const activeProduct = drawerProduct || product

  // Track ViewContent (Meta/TikTok/GA4) when a product drawer opens
  useEffect(() => {
    if (!activeProduct?.id) return
    // Lazy import to avoid circular deps with ThemeContext
    import('../../lib/pixels').then(({ trackViewContent }) => {
      trackViewContent({
        currency: currency || 'USD',
        value: activeProduct.price || 0,
        items: [{
          id: activeProduct.id,
          name: activeProduct.name,
          price: activeProduct.price || 0,
          quantity: 1,
        }],
      })
    }).catch(() => { /* swallow — pixels never block UI */ })
  }, [activeProduct?.id, activeProduct?.price, activeProduct?.name, currency])

  // Auto-select variants that have only one available option
  useEffect(() => {
    if (!features.showVariants || !activeProduct.variations?.length) return
    const autoSelected: Record<string, string> = {}
    let hasAuto = false
    for (const variation of activeProduct.variations) {
      const available = variation.options.filter(opt => opt.available)
      if (available.length === 1 && !selectedVariants[variation.name]) {
        autoSelected[variation.name] = available[0].value
        hasAuto = true
      }
    }
    if (hasAuto) {
      setSelectedVariants(prev => ({ ...prev, ...autoSelected }))
    }
  }, [activeProduct.variations, features.showVariants])

  // Base unit price reflects the selected variant when one is fully chosen.
  // Falls back to product.price for simple products or partial selections.
  const unitPrice = useMemo(
    () => getDisplayPrice(activeProduct, selectedVariants),
    [activeProduct, selectedVariants],
  )

  const totalPrice = useMemo(() => unitPrice + modifiersExtra, [unitPrice, modifiersExtra])

  // The selected combination (if any) drives image swap and stock checks.
  const selectedCombination = useMemo(
    () => findCombination(activeProduct, selectedVariants),
    [activeProduct, selectedVariants],
  )

  // Gallery images = ALL product images + every variant image, deduped.
  // Order: product images first (preserved), then any variant images that
  // aren't already in the gallery. This way the gallery is stable across
  // variant selections — we never re-mount or reorder; we only scroll to the
  // selected variant's image via `activeImage`.
  const galleryImages = useMemo(() => {
    const productImages = activeProduct.images?.length
      ? activeProduct.images
      : (activeProduct.image ? [activeProduct.image] : [])
    const seen = new Set(productImages)
    const variantImages: string[] = []
    for (const c of activeProduct.combinations || []) {
      if (c.image && !seen.has(c.image)) {
        seen.add(c.image)
        variantImages.push(c.image)
      }
    }
    return [...productImages, ...variantImages]
  }, [activeProduct.images, activeProduct.image, activeProduct.combinations])

  const handleModifiersChange = useCallback((selected: SelectedModifier[], extra: number) => {
    setSelectedModifiers(selected)
    setModifiersExtra(extra)
  }, [])

  // Clear warning when selections change
  useEffect(() => {
    if (selectionWarning) setSelectionWarning(false)
  }, [selectedVariants, selectedModifiers])

  const canAddToCart = useMemo(() => {
    if (features.showModifiers && activeProduct.modifierGroups?.length) {
      for (const group of activeProduct.modifierGroups) {
        if (group.required) {
          const selection = selectedModifiers.find(s => s.groupId === group.id)
          if (!selection || selection.options.length < group.minSelect) {
            return false
          }
        }
      }
    }
    if (features.showVariants && activeProduct.variations?.length) {
      for (const variation of activeProduct.variations) {
        if (!selectedVariants[variation.name]) {
          return false
        }
      }
    }
    return true
  }, [features, activeProduct, selectedModifiers, selectedVariants])

  // Reels mode delegation (after all hooks)
  const isReelsMode = theme.effects.productViewMode === 'reels' && getCatalogProducts().length > 0

  if (isReelsMode && !drawerProduct) {
    return (
      <ProductReels
        initialProduct={reelsProductRef.current}
        onClose={onClose}
        onAddToCart={onAddToCart}
        onOpenDrawer={(p) => setDrawerProduct(p)}
        onProductChange={(p) => { reelsProductRef.current = p }}
      />
    )
  }

  // Drawer logic
  const handleCloseDrawer = () => {
    if (drawerProduct) {
      setDrawerProduct(null)
    } else {
      onClose()
    }
  }

  // Compare price uses the unit price (variant or product). If no variant is
  // selected, this still reflects the product baseline. The compare price
  // itself is a product-level field (no per-variant compare price in the model).
  const hasDiscount = activeProduct.comparePrice && activeProduct.comparePrice > unitPrice
  const discountPercent = hasDiscount
    ? Math.round((1 - unitPrice / activeProduct.comparePrice!) * 100)
    : 0

  // Out-of-stock: when a combination is selected, defer to its stock; otherwise
  // use product.stock for simple products. For products with variants where no
  // selection was made yet, isOutOfStock stays false (the user must still pick).
  const stockForSelection = getStockForSelection(activeProduct, selectedVariants)
  const isOutOfStock = !!activeProduct.trackStock
    && typeof stockForSelection === 'number'
    && stockForSelection <= 0
    && (!!selectedCombination || !activeProduct.variations?.length)

  const handleAddToCart = () => {
    if (requiresSelection && !canAddToCart) {
      setSelectionWarning(true)
      setTimeout(() => setSelectionWarning(false), 3000)
      variantSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    const extras: CartItemExtras = {
      itemPrice: totalPrice,
    }

    if (Object.keys(selectedVariants).length > 0) {
      extras.selectedVariants = selectedVariants
    }

    if (selectedModifiers.length > 0) {
      extras.selectedModifiers = selectedModifiers
    }

    if (customNote.trim()) {
      extras.customNote = customNote.trim()
    }

    onAddToCart(activeProduct, extras)
    onClose()
  }

  const requiresSelection = (features.showModifiers && (activeProduct.modifierGroups?.length ?? 0) > 0) ||
                            (features.showVariants && (activeProduct.variations?.length ?? 0) > 0)

  return (
    <div className="fixed inset-0 z-[60] animate-fadeIn" onClick={handleCloseDrawer}>
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
      />

      <div
        className="absolute right-0 top-0 bottom-0 w-full max-w-md shadow-2xl animate-slideLeft flex flex-col"
        style={{ backgroundColor: theme.colors.surface }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleCloseDrawer}
          className="absolute right-4 z-10 w-10 h-10 backdrop-blur flex items-center justify-center transition-colors"
          style={{
            top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
            backgroundColor: theme.effects.darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
            borderRadius: theme.radius.full,
            boxShadow: theme.shadows.lg
          }}
        >
          <svg
            className="w-5 h-5"
            style={{ color: theme.colors.textMuted }}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {/* Image Gallery */}
          <div className="relative">
            <ProductGallery
              images={galleryImages}
              productName={activeProduct.name}
              variant={theme.effects.darkMode ? 'dark' : 'light'}
              activeImage={selectedCombination?.image}
            />

            {hasDiscount && (
              <div
                className="absolute top-4 left-4 z-10 px-3 py-1.5 text-sm font-semibold backdrop-blur-sm shadow-sm"
                style={{
                  backgroundColor: theme.colors.badge,
                  color: theme.colors.badgeText,
                  borderRadius: theme.radius.full
                }}
              >
                -{discountPercent}%
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Header */}
            <div>
              <h2
                className="text-2xl font-semibold mb-2"
                style={{ color: theme.colors.text }}
              >
                {activeProduct.name}
              </h2>

              {/* Badges row */}
              <div className="flex flex-wrap gap-2 mb-4">
                {/* Food: Prep Time */}
                {features.showPrepTime && activeProduct.prepTime && (
                  <PrepTimeDisplay prepTime={activeProduct.prepTime} language={language} />
                )}

                {/* Beauty: Duration */}
                {features.showServiceDuration && activeProduct.duration && (
                  <DurationDisplay duration={activeProduct.duration} language={language} />
                )}

                {/* Tech: Warranty */}
                {features.showWarranty && activeProduct.warranty && (
                  <WarrantyBadge warranty={activeProduct.warranty} language={language} />
                )}

                {/* Pets: Pet Type */}
                {features.showPetType && activeProduct.petType && (
                  <PetTypeBadge
                    petType={activeProduct.petType}
                    petAge={activeProduct.petAge}
                    language={language}
                  />
                )}

                {/* Limited Stock */}
                {(features.showLimitedStock || store.plan !== 'free') && activeProduct.availableQuantity !== undefined && (
                  <AvailabilityBadge quantity={activeProduct.availableQuantity} language={language} />
                )}
              </div>

              {activeProduct.description && (() => {
                // Check if description contains HTML tags
                const hasHtml = /<[a-z][\s\S]*>/i.test(activeProduct.description)
                if (hasHtml) {
                  // Clean CJ descriptions: remove img tags, empty divs, inline colors, excessive whitespace
                  const cleaned = activeProduct.description
                    .replace(/<img[^>]*>/gi, '')
                    .replace(/<div[^>]*>\s*<\/div>/gi, '')
                    .replace(/(<br\s*\/?>\s*){3,}/gi, '<br/><br/>')
                    .replace(/Product Image:?/gi, '')
                    .replace(/color\s*:\s*[^;"']+/gi, `color: ${theme.colors.textMuted}`)
                    .replace(/background(-color)?\s*:\s*[^;"']+/gi, '')
                    .trim()
                  if (!cleaned || cleaned.replace(/<[^>]*>/g, '').trim().length === 0) return null
                  return (
                    <div
                      className="leading-relaxed text-sm prose prose-sm max-w-none [&_*]:!text-inherit"
                      style={{ color: theme.colors.textMuted }}
                      dangerouslySetInnerHTML={{ __html: cleaned }}
                    />
                  )
                }
                return (
                  <p className="leading-relaxed" style={{ color: theme.colors.textMuted }}>
                    {activeProduct.description}
                  </p>
                )
              })()}
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span
                className="text-3xl font-semibold"
                style={{ color: theme.colors.text }}
              >
                {formatPrice(totalPrice, currency)}
              </span>
              {(hasDiscount || modifiersExtra > 0) && (
                <span
                  className="text-xl line-through"
                  style={{ color: theme.colors.textMuted }}
                >
                  {formatPrice(hasDiscount ? activeProduct.comparePrice! : unitPrice, currency)}
                </span>
              )}
            </div>

            {/* Fashion/Pets: Variants */}
            {features.showVariants && activeProduct.variations && activeProduct.variations.length > 0 && (
              <div ref={variantSectionRef}>
                {selectionWarning && (
                  <div
                    className="mb-3 px-4 py-2.5 text-sm font-medium animate-fadeIn"
                    style={{
                      backgroundColor: theme.effects.darkMode ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)',
                      color: '#ef4444',
                      borderRadius: theme.radius.md,
                      border: '1px solid rgba(239,68,68,0.3)',
                    }}
                  >
                    {language === 'en' ? 'Please select all options before adding to cart' :
                     language === 'pt' ? 'Selecione todas as opcoes antes de adicionar ao carrinho' :
                     'Selecciona todas las opciones antes de agregar al carrito'}
                  </div>
                )}
                <VariantSelector
                  variations={activeProduct.variations}
                  selected={selectedVariants}
                  onChange={setSelectedVariants}
                  trackStock={activeProduct.trackStock}
                  product={activeProduct}
                />
              </div>
            )}

            {/* Food: Modifiers */}
            {features.showModifiers && activeProduct.modifierGroups && activeProduct.modifierGroups.length > 0 && (
              <div ref={!activeProduct.variations?.length ? variantSectionRef : undefined}>
                {selectionWarning && !activeProduct.variations?.length && (
                  <div
                    className="mb-3 px-4 py-2.5 text-sm font-medium animate-fadeIn"
                    style={{
                      backgroundColor: theme.effects.darkMode ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)',
                      color: '#ef4444',
                      borderRadius: theme.radius.md,
                      border: '1px solid rgba(239,68,68,0.3)',
                    }}
                  >
                    {language === 'en' ? 'Please select required options before adding to cart' :
                     language === 'pt' ? 'Selecione as opcoes obrigatorias antes de adicionar ao carrinho' :
                     'Selecciona las opciones requeridas antes de agregar al carrito'}
                  </div>
                )}
                <ModifierSelector
                  modifierGroups={activeProduct.modifierGroups}
                  onChange={handleModifiersChange}
                  language={language}
                />
              </div>
            )}

            {/* Tech: Specs */}
            {features.showSpecs && activeProduct.specs && activeProduct.specs.length > 0 && (
              <SpecsDisplay
                specs={activeProduct.specs}
                model={activeProduct.model}
                language={language}
              />
            )}

            {/* Craft: Custom Order */}
            {features.showCustomOrder && activeProduct.customizable && (
              <CustomOrderInput
                value={customNote}
                instructions={activeProduct.customizationInstructions}
                onChange={setCustomNote}
                language={language}
              />
            )}
          </div>
        </div>

        {/* Add Button */}
        <div
          className="p-6"
          style={{ borderTop: `1px solid ${theme.colors.border}`, paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}
        >
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className="w-full py-4 font-medium transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: isOutOfStock ? '#9ca3af' : theme.colors.primary,
              color: theme.colors.textInverted,
              borderRadius: theme.radius.lg
            }}
          >
            {isOutOfStock
              ? t.outOfStock
              : features.showBookingCTA
                ? (language === 'en' ? 'Book Now' : language === 'pt' ? 'Reservar' : 'Reservar')
                : t.addToCart}
            {!isOutOfStock && modifiersExtra > 0 && ` - ${formatPrice(totalPrice, currency)}`}
          </button>
        </div>
      </div>
    </div>
  )
}
