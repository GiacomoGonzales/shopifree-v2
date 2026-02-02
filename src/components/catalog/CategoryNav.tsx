import { useRef, useState, useEffect } from 'react'
import type { Category } from '../../types'
import { useTheme } from './ThemeContext'
import { getThemeTranslations } from '../../themes/shared/translations'

interface CategoryNavProps {
  categories: Category[]
  activeCategory: string | null
  onCategoryChange: (categoryId: string | null) => void
  stickyTop?: string  // e.g., 'top-16' - fallback if auto-detect fails
}

export default function CategoryNav({
  categories,
  activeCategory,
  onCategoryChange,
  stickyTop = 'top-16'
}: CategoryNavProps) {
  const { theme, language } = useTheme()
  const t = getThemeTranslations(language)
  const navRef = useRef<HTMLElement>(null)
  const [headerHeight, setHeaderHeight] = useState<number | null>(null)

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

  if (categories.length === 0) return null

  return (
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
        </div>
      </div>
    </nav>
  )
}
