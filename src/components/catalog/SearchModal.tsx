import { useState, useEffect, useMemo, useRef } from 'react'
import type { Product } from '../../types'
import { useTheme } from './ThemeContext'
import { getThemeTranslations } from '../../themes/shared/translations'
import { formatPrice } from '../../lib/currency'
import { optimizeImage } from '../../utils/cloudinary'

interface SearchModalProps {
  products: Product[]
  onSelectProduct: (product: Product) => void
  onClose: () => void
}

export default function SearchModal({ products, onSelectProduct, onClose }: SearchModalProps) {
  const { theme, currency, language } = useTheme()
  const t = getThemeTranslations(language)
  const [searchTerm, setSearchTerm] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Body scroll lock (iOS-safe: fixes the body so fixed overlays work after scroll)
  useEffect(() => {
    const scrollY = window.scrollY
    const { body } = document
    const originalStyles = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    }
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.width = '100%'
    body.style.overflow = 'hidden'
    return () => {
      body.style.position = originalStyles.position
      body.style.top = originalStyles.top
      body.style.width = originalStyles.width
      body.style.overflow = originalStyles.overflow
      window.scrollTo(0, scrollY)
    }
  }, [])

  // Autofocus (slight delay so iOS renders the modal first)
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 50)
    return () => clearTimeout(timer)
  }, [])

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const filtered = useMemo(() => {
    if (!searchTerm) return products
    const term = searchTerm.toLowerCase()
    return products.filter(p =>
      p.name.toLowerCase().includes(term) ||
      p.description?.toLowerCase().includes(term)
    )
  }, [products, searchTerm])

  const handleSelect = (product: Product) => {
    onSelectProduct(product)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] animate-fadeIn" onClick={onClose}>
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
      />

      {/* Mobile: full-screen / Desktop: side panel like CartDrawer */}
      <div
        className="absolute inset-0 md:inset-auto md:right-0 md:top-0 md:bottom-0 md:w-full md:max-w-md flex flex-col shadow-2xl animate-slideUp md:animate-slideLeft"
        style={{ backgroundColor: theme.colors.surface }}
        onClick={(e) => e.stopPropagation()}
      >
          {/* Header with search input - with safe area for notch/Dynamic Island */}
          <div
            className="flex items-center gap-3 p-4"
            style={{
              borderBottom: `1px solid ${theme.colors.border}`,
              paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
            }}
          >
            {/* Magnifying glass */}
            <svg
              className="w-5 h-5 flex-shrink-0"
              style={{ color: theme.colors.textMuted }}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>

            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t.searchProducts}
              className="flex-1 bg-transparent outline-none text-base"
              style={{ color: theme.colors.text }}
            />

            {/* Clear / Close button */}
            <button
              onClick={searchTerm ? () => setSearchTerm('') : onClose}
              className="w-8 h-8 flex items-center justify-center flex-shrink-0 transition-opacity hover:opacity-70"
              style={{ color: theme.colors.textMuted }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-black/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-black/20">
            {filtered.length === 0 ? (
              <div className="flex items-center justify-center py-16 px-4">
                <p className="text-sm" style={{ color: theme.colors.textMuted }}>
                  {t.searchNoResults}
                </p>
              </div>
            ) : (
              <div>
                {filtered.map(product => (
                  <button
                    key={product.id}
                    onClick={() => handleSelect(product)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:opacity-80"
                    style={{ borderBottom: `1px solid ${theme.colors.border}` }}
                  >
                    {/* Thumbnail */}
                    <div
                      className="w-12 h-12 flex-shrink-0 overflow-hidden"
                      style={{
                        borderRadius: theme.radius.md,
                        backgroundColor: theme.effects.darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.04)',
                      }}
                    >
                      {product.image ? (
                        <img
                          src={optimizeImage(product.image, 'thumbnail')}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg
                            className="w-5 h-5"
                            style={{ color: theme.colors.textMuted }}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.5}
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Name + price */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-medium truncate"
                        style={{ color: theme.colors.text }}
                      >
                        {product.name}
                      </p>
                      <p
                        className="text-sm"
                        style={{ color: theme.colors.textMuted }}
                      >
                        {formatPrice(product.price, currency)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
      </div>
    </div>
  )
}
