import { useState, useCallback, useMemo, useRef } from 'react'
import type { Product } from '../../types'
import { formatPrice } from '../../lib/currency'
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

  const activeProduct = drawerProduct || product

  const totalPrice = useMemo(() => {
    return activeProduct.price + modifiersExtra
  }, [activeProduct.price, modifiersExtra])

  const handleModifiersChange = useCallback((selected: SelectedModifier[], extra: number) => {
    setSelectedModifiers(selected)
    setModifiersExtra(extra)
  }, [])

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

  const hasDiscount = activeProduct.comparePrice && activeProduct.comparePrice > activeProduct.price
  const discountPercent = hasDiscount
    ? Math.round((1 - activeProduct.price / activeProduct.comparePrice!) * 100)
    : 0

  const handleAddToCart = () => {
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
              images={activeProduct.images?.length ? activeProduct.images : (activeProduct.image ? [activeProduct.image] : [])}
              productName={activeProduct.name}
              variant={theme.effects.darkMode ? 'dark' : 'light'}
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

              {activeProduct.description && (
                <p
                  className="leading-relaxed"
                  style={{ color: theme.colors.textMuted }}
                >
                  {activeProduct.description}
                </p>
              )}
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
                  {formatPrice(hasDiscount ? activeProduct.comparePrice! : activeProduct.price, currency)}
                </span>
              )}
            </div>

            {/* Fashion/Pets: Variants */}
            {features.showVariants && activeProduct.variations && activeProduct.variations.length > 0 && (
              <VariantSelector
                variations={activeProduct.variations}
                selected={selectedVariants}
                onChange={setSelectedVariants}
              />
            )}

            {/* Food: Modifiers */}
            {features.showModifiers && activeProduct.modifierGroups && activeProduct.modifierGroups.length > 0 && (
              <ModifierSelector
                modifierGroups={activeProduct.modifierGroups}
                onChange={handleModifiersChange}
                language={language}
              />
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
            disabled={requiresSelection && !canAddToCart}
            className="w-full py-4 font-medium transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: theme.colors.primary,
              color: theme.colors.textInverted,
              borderRadius: theme.radius.lg
            }}
          >
            {features.showBookingCTA
              ? (language === 'en' ? 'Book Now' : language === 'pt' ? 'Reservar' : 'Reservar')
              : t.addToCart}
            {modifiersExtra > 0 && ` - ${formatPrice(totalPrice, currency)}`}
          </button>
        </div>
      </div>
    </div>
  )
}
