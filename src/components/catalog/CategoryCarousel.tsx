import { useRef, useState, useEffect } from 'react'
import type { Category, Product } from '../../types'
import { useTheme } from './ThemeContext'
import { getThemeTranslations } from '../../themes/shared/translations'
import { optimizeImage, getImageSrcSet } from '../../utils/cloudinary'
import SearchModal from './SearchModal'

/**
 * CategoryCarousel — drop-in replacement for CategoryNav that supports
 * optional category images in four visual variants.
 *
 * Phase 2 of the category-image rollout. CategoryNav stays put for the
 * 70+ themes that haven't migrated; themes opt into the carousel by
 * swapping the import and (optionally) passing a variant prop. When a
 * category has no `image` field, the carousel falls back to a tinted
 * "avatar" with the first letter so merchants can roll out images
 * gradually without breaking the row.
 *
 * Variants:
 *  - `pill`   — closest to CategoryNav. Horizontal pills with an
 *               optional 24×24 circle thumbnail to the left of the name.
 *  - `circle` — Instagram-Stories style. Round 64px thumbnails with the
 *               name centered underneath; active item gets a ring in
 *               the theme primary color.
 *  - `square` — Same layout as `circle` but the thumbnail is a 64px
 *               rounded square. Reads more "boutique" than `circle`.
 *  - `tile`   — Wider 144×80 horizontal tiles with the name overlaid
 *               on top of the image (gradient fade for legibility).
 *               Best for premium/visual-first themes.
 *
 * The API matches CategoryNav 1:1 plus the new `variant` prop, so
 * migrating a theme is just changing the import and (optionally)
 * passing a variant. Themes that don't pass anything get the `pill`
 * default which is the closest thing to the legacy look.
 */

type Variant = 'pill' | 'circle' | 'square' | 'tile'

interface CategoryCarouselProps {
  categories: Category[]
  activeCategory: string | null
  onCategoryChange: (categoryId: string | null) => void
  products?: Product[]
  onSelectProduct?: (product: Product) => void
  stickyTop?: string
  variant?: Variant
}

// Used by the icon variants for the "Todos / All" pseudo-category.
function AllGridIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

// Avatar shown when a category has no image yet (so themes can opt-in
// to the carousel before every category is curated). Uses the theme
// primary color with the first letter as a hint.
function CategoryAvatar({ name, shape, bg, fg }: {
  name: string
  shape: 'circle' | 'square'
  bg: string
  fg: string
}) {
  const letter = name.charAt(0).toUpperCase()
  return (
    <div
      className={`w-full h-full flex items-center justify-center font-semibold ${shape === 'circle' ? 'rounded-full' : 'rounded-xl'}`}
      style={{ backgroundColor: bg, color: fg }}
    >
      <span className="text-lg">{letter}</span>
    </div>
  )
}

export default function CategoryCarousel({
  categories,
  activeCategory,
  onCategoryChange,
  products,
  onSelectProduct,
  stickyTop = 'top-16',
  variant = 'pill'
}: CategoryCarouselProps) {
  const { theme, language } = useTheme()
  const t = getThemeTranslations(language)
  const navRef = useRef<HTMLElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [headerHeight, setHeaderHeight] = useState<number | null>(null)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  // Visibilidad de las flechas de scroll (solo desktop). Se calcula segun
  // si hay contenido recortado a izquierda/derecha del viewport del row.
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // Auto-detect the header height (same approach as CategoryNav). Keeps the
  // sticky offset in sync if the header shrinks on scroll.
  useEffect(() => {
    const measure = () => {
      if (!navRef.current) return
      const parent = navRef.current.parentElement
      if (!parent) return
      const header = parent.querySelector('header')
      if (header) {
        setHeaderHeight(header.getBoundingClientRect().height)
      }
    }
    measure()
    window.addEventListener('resize', measure)
    const interval = setInterval(measure, 500)
    return () => {
      window.removeEventListener('resize', measure)
      clearInterval(interval)
    }
  }, [])

  // Tracking de overflow horizontal para mostrar/ocultar las flechas.
  // ResizeObserver cubre el caso donde las categorias cargan async
  // y el contenido cambia despues del primer mount.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const update = () => {
      const tolerance = 2 // margen contra errores de subpixel
      setCanScrollLeft(el.scrollLeft > tolerance)
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - tolerance)
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      observer.disconnect()
    }
  }, [categories.length])

  const scrollByDelta = (delta: number) => {
    scrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' })
  }

  // Cuando el usuario cambia de categoria, llevarlo arriba del area de
  // productos si estaba scrolleado abajo. Sin esto, si esta cerca del
  // footer de "Polos" y selecciona "Pantalones", ve directamente el
  // footer de la categoria nueva en vez de los primeros productos.
  // Solo scrollea si esta debajo del area — si esta arriba (viendo el
  // hero) lo dejamos donde esta.
  const handleCategoryChange = (categoryId: string | null) => {
    onCategoryChange(categoryId)
    if (!navRef.current) return
    const targetY = Math.max(0, navRef.current.offsetTop - (headerHeight ?? 0))
    if (window.scrollY > targetY + 4) {
      window.scrollTo({ top: targetY, behavior: 'smooth' })
    }
  }

  const hasSearch = products && onSelectProduct
  if (categories.length === 0 && !hasSearch) return null

  const isIconVariant = variant === 'circle' || variant === 'square'
  // Tighter vertical rhythm for pill (text-only feel), more breathing room
  // for variants where each item has an image + label stack.
  const verticalPadding = variant === 'pill' ? 'py-3' : variant === 'tile' ? 'py-3' : 'py-4'

  return (
    <>
      <nav
        ref={navRef}
        className={headerHeight === null ? `sticky ${stickyTop} z-40` : 'sticky z-40'}
        style={{
          ...(headerHeight !== null ? { top: `${headerHeight}px` } : {}),
          backgroundColor: theme.effects.headerBlur
            ? (theme.effects.darkMode ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)')
            : theme.colors.background,
          backdropFilter: theme.effects.headerBlur ? 'blur(12px)' : undefined,
          borderTop: `1px solid ${theme.colors.border}`,
          borderBottom: `1px solid ${theme.colors.border}`
        }}
      >
        <div className="max-w-6xl mx-auto px-4 md:px-6 relative">
          {/* Flecha izquierda (solo desktop). Aparece cuando hay contenido
              scrolleado a la izquierda. Usa los colores del tema asi se
              integra con el resto del header/nav sin importar dark o light. */}
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scrollByDelta(-220)}
              className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center rounded-full transition-opacity hover:opacity-100 opacity-90"
              style={{
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
                boxShadow: `0 1px 3px rgba(0,0,0,0.15), 0 0 0 1px ${theme.colors.border}`,
              }}
              aria-label="Scroll categories left"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Flecha derecha (solo desktop) — gemela de la izquierda */}
          {canScrollRight && (
            <button
              type="button"
              onClick={() => scrollByDelta(220)}
              className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center rounded-full transition-opacity hover:opacity-100 opacity-90"
              style={{
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
                boxShadow: `0 1px 3px rgba(0,0,0,0.15), 0 0 0 1px ${theme.colors.border}`,
              }}
              aria-label="Scroll categories right"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          <div
            ref={scrollRef}
            className={`flex md:[justify-content:safe_center] gap-2 ${verticalPadding} overflow-x-auto scrollbar-hide -mx-4 md:mx-0`}
          >
            <div className="w-3 flex-shrink-0 md:hidden" aria-hidden="true" />

            {/* Search icon — same affordance as CategoryNav. Aligned to the
                start of the row so its tap target sits where users already
                expect it from the rest of the catalog. */}
            {hasSearch && (
              <button
                onClick={() => setIsSearchOpen(true)}
                className={`flex-shrink-0 flex items-center justify-center transition-all duration-200 ${
                  isIconVariant ? 'w-16 h-16 self-center' : variant === 'tile' ? 'w-9 h-9 self-center' : 'w-9 h-9'
                }`}
                style={{
                  color: theme.colors.textMuted,
                  borderRadius: theme.radius.full,
                }}
                aria-label={t.searchProducts}
              >
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </button>
            )}

            {categories.length > 0 && (
              <>
                {/* "Todos" pseudo-category — first item, always visible */}
                <CategoryItem
                  variant={variant}
                  isAll
                  isActive={!activeCategory}
                  name={t.all}
                  onClick={() => handleCategoryChange(null)}
                  theme={theme}
                />

                {categories.map(cat => (
                  <CategoryItem
                    key={cat.id}
                    variant={variant}
                    isActive={activeCategory === cat.id}
                    name={cat.name}
                    image={cat.image}
                    onClick={() => handleCategoryChange(cat.id)}
                    theme={theme}
                  />
                ))}
              </>
            )}
            <div className="w-3 flex-shrink-0 md:hidden" aria-hidden="true" />
          </div>
        </div>
      </nav>

      {/* Search Modal — identical to CategoryNav */}
      {isSearchOpen && hasSearch && (
        <SearchModal
          products={products}
          onSelectProduct={onSelectProduct}
          onClose={() => setIsSearchOpen(false)}
        />
      )}
    </>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Per-variant item rendering. Kept inline (rather than four separate
// components) because they share state and theme access, and pulling the
// shared bits through props would only obscure the layout differences
// without removing duplication.
// ──────────────────────────────────────────────────────────────────────

interface ItemProps {
  variant: Variant
  isActive: boolean
  isAll?: boolean
  name: string
  image?: string
  onClick: () => void
  theme: ReturnType<typeof useTheme>['theme']
}

function CategoryItem({ variant, isActive, isAll, name, image, onClick, theme }: ItemProps) {
  // Optimized image URL only generated when we'll actually render it.
  const optimized = image ? optimizeImage(image, 'category') : ''
  const srcSet = image ? getImageSrcSet(image, 'category') : ''

  if (variant === 'pill') {
    return (
      <button
        onClick={onClick}
        className="flex-shrink-0 flex items-center gap-2 px-5 py-2 text-sm transition-all duration-200"
        style={{
          backgroundColor: isActive ? theme.colors.primary : 'transparent',
          color: isActive ? theme.colors.textInverted : theme.colors.textMuted,
          borderRadius: theme.radius.full,
          fontWeight: isActive ? 500 : 400
        }}
      >
        {image && !isAll && (
          <img
            src={optimized}
            srcSet={srcSet}
            alt=""
            className="w-6 h-6 rounded-full object-cover -ml-1"
            loading="lazy"
          />
        )}
        <span>{name}</span>
      </button>
    )
  }

  if (variant === 'circle' || variant === 'square') {
    const shape: 'circle' | 'square' = variant === 'circle' ? 'circle' : 'square'
    const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-xl'

    return (
      <button
        onClick={onClick}
        className="flex-shrink-0 flex flex-col items-center gap-1.5 min-w-[68px] transition-all duration-200"
      >
        <div
          className={`w-16 h-16 overflow-hidden ${shapeClass} transition-all duration-200`}
          style={{
            boxShadow: isActive
              ? `0 0 0 2.5px ${theme.colors.background}, 0 0 0 5px ${theme.colors.primary}`
              : undefined,
          }}
        >
          {isAll ? (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{
                backgroundColor: isActive ? theme.colors.primary : `${theme.colors.primary}15`,
                color: isActive ? theme.colors.textInverted : theme.colors.primary,
              }}
            >
              <AllGridIcon className="w-6 h-6" />
            </div>
          ) : image ? (
            <img
              src={optimized}
              srcSet={srcSet}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <CategoryAvatar
              name={name}
              shape={shape}
              bg={`${theme.colors.primary}25`}
              fg={theme.colors.primary}
            />
          )}
        </div>
        <span
          className="text-xs text-center leading-tight max-w-[68px] line-clamp-2"
          style={{
            color: isActive ? theme.colors.text : theme.colors.textMuted,
            fontWeight: isActive ? 600 : 400,
          }}
        >
          {name}
        </span>
      </button>
    )
  }

  // variant === 'tile'
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 relative w-36 h-20 rounded-xl overflow-hidden transition-all duration-200"
      style={{
        boxShadow: isActive
          ? `0 0 0 2.5px ${theme.colors.background}, 0 0 0 5px ${theme.colors.primary}`
          : undefined,
      }}
    >
      {isAll || !image ? (
        <div
          className="w-full h-full"
          style={{
            background: isAll
              ? `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.primary}cc)`
              : `${theme.colors.primary}30`,
          }}
        />
      ) : (
        <img
          src={optimized}
          srcSet={srcSet}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
        />
      )}
      {/* Bottom gradient so the label stays legible against any image */}
      {!isAll && image && (
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,0.65) 100%)',
          }}
        />
      )}
      <span
        className="absolute bottom-2 left-3 right-3 text-sm font-medium text-left line-clamp-2 leading-tight"
        style={{
          color: isAll || (image && !isAll) ? '#fff' : theme.colors.primary,
        }}
      >
        {name}
      </span>
    </button>
  )
}
