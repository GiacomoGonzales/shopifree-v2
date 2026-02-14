import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import type { Store } from '../../types'
import { BusinessTypeProvider } from '../../hooks/useBusinessType'

/**
 * Theme configuration that each theme provides
 * Controls visual appearance without duplicating logic
 */
export interface ThemeConfig {
  // Colors
  colors: {
    background: string        // Page background
    surface: string           // Card/drawer background
    surfaceHover: string      // Card hover state
    text: string              // Primary text
    textMuted: string         // Secondary text
    textInverted: string      // Text on dark backgrounds
    primary: string           // Primary action color
    primaryHover: string      // Primary hover
    accent: string            // Accent/highlight color
    border: string            // Border color
    badge: string             // Badge background
    badgeText: string         // Badge text
  }
  // Border radius
  radius: {
    sm: string    // Small elements (badges)
    md: string    // Medium elements (buttons)
    lg: string    // Large elements (cards)
    xl: string    // Extra large (drawers, modals)
    full: string  // Fully rounded (avatars, pills)
  }
  // Typography
  fonts: {
    heading: string   // Font for headings
    body: string      // Font for body text
  }
  // Shadows
  shadows: {
    sm: string
    md: string
    lg: string
  }
  // Special styles
  effects: {
    cardHover: string         // Hover effect on cards
    buttonHover: string       // Hover effect on buttons
    headerBlur: boolean       // Use backdrop blur on header
    darkMode: boolean         // Is this a dark theme
    scrollReveal?: boolean    // Animate products on scroll into viewport
    imageSwapOnHover?: boolean // Show second image on card hover
  }
}

interface ThemeContextValue {
  theme: ThemeConfig
  store: Store
  currency: string
  language: string
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  theme: ThemeConfig
  store: Store
  children: ReactNode
}

export function ThemeProvider({ theme, store, children }: ThemeProviderProps) {
  const language = store.language || 'es'

  // Merge store-level effect overrides into theme
  const mergedTheme = useMemo(() => {
    const s = store.themeSettings
    if (s?.scrollReveal === undefined && s?.imageSwapOnHover === undefined) return theme
    return {
      ...theme,
      effects: {
        ...theme.effects,
        ...(s?.scrollReveal !== undefined && { scrollReveal: s.scrollReveal }),
        ...(s?.imageSwapOnHover !== undefined && { imageSwapOnHover: s.imageSwapOnHover }),
      }
    }
  }, [theme, store.themeSettings])

  return (
    <ThemeContext.Provider value={{
      theme: mergedTheme,
      store,
      currency: store.currency || 'USD',
      language
    }}>
      <BusinessTypeProvider businessType={store.businessType} language={language}>
        {children}
      </BusinessTypeProvider>
    </ThemeContext.Provider>
  )
}

// Default minimal theme
export const minimalTheme: ThemeConfig = {
  colors: {
    background: '#ffffff',
    surface: '#ffffff',
    surfaceHover: '#f9fafb',
    text: '#111827',
    textMuted: '#6b7280',
    textInverted: '#ffffff',
    primary: '#111827',
    primaryHover: '#1f2937',
    accent: '#111827',
    border: '#f3f4f6',
    badge: '#ffffff',
    badgeText: '#111827',
  },
  radius: {
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
    full: '9999px',
  },
  fonts: {
    heading: 'system-ui, sans-serif',
    body: 'system-ui, sans-serif',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  },
  effects: {
    cardHover: 'scale-105',
    buttonHover: 'scale-110',
    headerBlur: true,
    darkMode: false,
  },
}
