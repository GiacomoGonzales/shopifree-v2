import { useRef, useState, useEffect } from 'react'
import type { Category, Product } from '../../types'
import { useTheme } from './ThemeContext'
import { getThemeTranslations } from '../../themes/shared/translations'
import SearchModal from './SearchModal'

interface CategoryNavProps {
  categories: Category[]
  activeCategory: string | null
  onCategoryChange: (categoryId: string | null) => void
  products?: Product[]
  onSelectProduct?: (product: Product) => void
  stickyTop?: string  // e.g., 'top-16' - fallback if auto-detect fails
}

export default function CategoryNav({
  categories,
  activeCategory,
  onCategoryChange,
  products,
  onSelectProduct,
  stickyTop = 'top-16'
}: CategoryNavProps) {
  const { theme, language } = useTheme()
  const t = getThemeTranslations(language)
  const navRef = useRef<HTMLElement>(null)
  const [headerHeight, setHeaderHeight] = useState<number | null>(null)
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  // Auto-detect the header height by finding the previous <header> sibling
  useEffect(() => {
    const measure = () => {
      if (!navRef.current) return
      // Walk up to find the closest header element before this nav
      const parent = navRef.current.parentElement
      if (!parent) return
      const header = parent.querySelector('header')
      if (header) {
        setHeaderHeight(header.getBoundingClientRect().height)
      }
    }

    measure()
    // Re-measure on resize and after a short delay (for scroll-based header transitions)
    window.addEventListener('resize', measure)
    const interval = setInterval(measure, 500)
    return () => {
      window.removeEventListener('resize', measure)
      clearInterval(interval)
    }
  }, [])

  const hasSearch = products && onSelectProduct

  if (categories.length === 0 && !hasSearch) return null

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
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="flex md:justify-center gap-1 py-3 overflow-x-auto scrollbar-hide">
            {/* Search icon button */}
            {hasSearch && (
              <button
                onClick={() => setIsSearchOpen(true)}
                className="flex-shrink-0 w-9 h-9 flex items-center justify-center transition-all duration-200"
                style={{
                  color: theme.colors.textMuted,
                  borderRadius: theme.radius.full,
                }}
              >
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </button>
            )}

            {categories.length > 0 && (
              <>
                <button
                  onClick={() => onCategoryChange(null)}
                  className="flex-shrink-0 px-5 py-2 text-sm transition-all duration-200"
                  style={{
                    backgroundColor: !activeCategory ? theme.colors.primary : 'transparent',
                    color: !activeCategory ? theme.colors.textInverted : theme.colors.textMuted,
                    borderRadius: theme.radius.full,
                    fontWeight: !activeCategory ? 500 : 400
                  }}
                >
                  {t.all}
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => onCategoryChange(cat.id)}
                    className="flex-shrink-0 px-5 py-2 text-sm transition-all duration-200"
                    style={{
                      backgroundColor: activeCategory === cat.id ? theme.colors.primary : 'transparent',
                      color: activeCategory === cat.id ? theme.colors.textInverted : theme.colors.textMuted,
                      borderRadius: theme.radius.full,
                      fontWeight: activeCategory === cat.id ? 500 : 400
                    }}
                  >
                    {cat.name}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Search Modal */}
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
