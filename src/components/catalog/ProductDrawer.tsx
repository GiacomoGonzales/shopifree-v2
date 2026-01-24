import { useState, useCallback, useMemo } from 'react'
import type { Product } from '../../types'
import { formatPrice } from '../../lib/currency'
import { useTheme } from './ThemeContext'
import { useBusinessType } from '../../hooks/useBusinessType'
import ProductGallery from '../../themes/shared/ProductGallery'
import { getThemeTranslations } from '../../themes/shared/translations'
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
  const { theme, currency, language } = useTheme()
  const { features } = useBusinessType()
  const t = getThemeTranslations(language)

  // Selection states
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({})
  const [selectedModifiers, setSelectedModifiers] = useState<SelectedModifier[]>([])
  const [modifiersExtra, setModifiersExtra] = useState(0)
  const [customNote, setCustomNote] = useState('')

  const hasDiscount = product.comparePrice && product.comparePrice > product.price
  const discountPercent = hasDiscount
    ? Math.round((1 - product.price / product.comparePrice!) * 100)
    : 0

  // Calculate total price including modifiers
  const totalPrice = useMemo(() => {
    return product.price + modifiersExtra
  }, [product.price, modifiersExtra])

  // Handle modifier changes
  const handleModifiersChange = useCallback((selected: SelectedModifier[], extra: number) => {
    setSelectedModifiers(selected)
    setModifiersExtra(extra)
  }, [])

  // Check if all required selections are made
  const canAddToCart = useMemo(() => {
    // Check required modifiers
    if (features.showModifiers && product.modifierGroups?.length) {
      for (const group of product.modifierGroups) {
        if (group.required) {
          const selection = selectedModifiers.find(s => s.groupId === group.id)
          if (!selection || selection.options.length < group.minSelect) {
            return false
          }
        }
      }
    }

    // Check required variants (at least one option selected per variation)
    if (features.showVariants && product.variations?.length) {
      for (const variation of product.variations) {
        if (!selectedVariants[variation.name]) {
          return false
        }
      }
    }

    return true
  }, [features, product, selectedModifiers, selectedVariants])

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

    onAddToCart(product, extras)
    onClose()
  }

  // Determine if we need selection before adding
  const requiresSelection = (features.showModifiers && (product.modifierGroups?.length ?? 0) > 0) ||
                            (features.showVariants && (product.variations?.length ?? 0) > 0)

  return (
    <div className="fixed inset-0 z-[60] animate-fadeIn" onClick={onClose}>
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      />

      <div
        className="absolute right-0 top-0 bottom-0 w-full max-w-md shadow-2xl animate-slideLeft flex flex-col"
        style={{ backgroundColor: theme.colors.surface }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 backdrop-blur flex items-center justify-center transition-colors"
          style={{
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
              images={product.images?.length ? product.images : (product.image ? [product.image] : [])}
              productName={product.name}
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
                {product.name}
              </h2>

              {/* Badges row */}
              <div className="flex flex-wrap gap-2 mb-4">
                {/* Food: Prep Time */}
                {features.showPrepTime && product.prepTime && (
                  <PrepTimeDisplay prepTime={product.prepTime} language={language} />
                )}

                {/* Beauty: Duration */}
                {features.showServiceDuration && product.duration && (
                  <DurationDisplay duration={product.duration} language={language} />
                )}

                {/* Tech: Warranty */}
                {features.showWarranty && product.warranty && (
                  <WarrantyBadge warranty={product.warranty} language={language} />
                )}

                {/* Pets: Pet Type */}
                {features.showPetType && product.petType && (
                  <PetTypeBadge
                    petType={product.petType}
                    petAge={product.petAge}
                    language={language}
                  />
                )}

                {/* Craft: Limited Stock */}
                {features.showLimitedStock && product.availableQuantity !== undefined && (
                  <AvailabilityBadge quantity={product.availableQuantity} language={language} />
                )}
              </div>

              {product.description && (
                <p
                  className="leading-relaxed"
                  style={{ color: theme.colors.textMuted }}
                >
                  {product.description}
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
                  {formatPrice(hasDiscount ? product.comparePrice! : product.price, currency)}
                </span>
              )}
            </div>

            {/* Fashion/Pets: Variants */}
            {features.showVariants && product.variations && product.variations.length > 0 && (
              <VariantSelector
                variations={product.variations}
                selected={selectedVariants}
                onChange={setSelectedVariants}
              />
            )}

            {/* Food: Modifiers */}
            {features.showModifiers && product.modifierGroups && product.modifierGroups.length > 0 && (
              <ModifierSelector
                modifierGroups={product.modifierGroups}
                onChange={handleModifiersChange}
                language={language}
              />
            )}

            {/* Tech: Specs */}
            {features.showSpecs && product.specs && product.specs.length > 0 && (
              <SpecsDisplay
                specs={product.specs}
                model={product.model}
                language={language}
              />
            )}

            {/* Craft: Custom Order */}
            {features.showCustomOrder && product.customizable && (
              <CustomOrderInput
                value={customNote}
                instructions={product.customizationInstructions}
                onChange={setCustomNote}
                language={language}
              />
            )}
          </div>
        </div>

        {/* Add Button */}
        <div
          className="p-6"
          style={{ borderTop: `1px solid ${theme.colors.border}` }}
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
