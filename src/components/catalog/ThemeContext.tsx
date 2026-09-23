import { createContext, useContext, useMemo, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { Store } from '../../types'
import { BusinessTypeProvider } from '../../hooks/useBusinessType'
import { setPixelDefaultCurrency } from '../../lib/pixels'
import { getHeaderColors, getPrimaryColor, getBackgroundColor, getSurfaceColor, getTextColor, getCornerStyle, CORNER_STYLES, readableTextOn } from '../../themes/shared/themeColors'
import { getHeadingFont, getBodyFont, googleFontsUrl, fontOverridesCss } from '../../themes/shared/fonts'
import { useLiveEditContext } from './liveEditContext'

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
    productLayout?: 'grid' | 'masonry' | 'magazine' | 'carousel' | 'list' | 'sections'
    paginationType?: 'none' | 'load-more' | 'infinite-scroll' | 'classic'
    productViewMode?: 'drawer' | 'reels'
    // Premium effects
    glassMorphism?: boolean    // Glass blur effect on cards
    tilt3D?: boolean           // 3D tilt on card hover (desktop)
    animatedBorder?: boolean   // Animated gradient border on cards
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

/** Variante que no lanza si se usa fuera del provider — devuelve null. */
export function useThemeOptional() {
  return useContext(ThemeContext)
}

/** Solo colores hex: el valor termina dentro de un <style> y viene del dueno de la tienda. */
const HEX_COLOR = /^#[0-9a-f]{3,8}$/i

/**
 * CSS para los colores del header elegidos en el editor en vivo. Cada tema
 * escribe su propio <header>, asi que en vez de tocar los 87 se pisa el color
 * desde aca. Los elementos con fondo propio (el contador del carrito, botones
 * rellenos) conservan su color de texto para seguir siendo legibles.
 */
function headerColorsCss(bg?: string, text?: string) {
  // Algunos temas (clay, petcard, fiesta) pintan el header como una "pastilla" interna:
  // esa pastilla, marcada con data-sf-header-surface, es la que lleva el color.
  const rules: string[] = []
  if (bg && HEX_COLOR.test(bg)) {
    rules.push(`[data-sf-store] header,[data-sf-store] header [data-sf-header-surface]{background:${bg}!important}`)
  }
  if (text && HEX_COLOR.test(text)) {
    rules.push(`[data-sf-store] header{color:${text}!important}`)
    // `[class^="bg-"]` / `[class*=" bg-"]` detectan fondos reales y no `hover:bg-…`;
    // un fondo transparente no cuenta como fondo propio.
    rules.push(`[data-sf-store] header :where(a,button,span,p,h1,h2,h3,h4,nav,div,svg,small,strong):not(:is([class^="bg-"],[class*=" bg-"]):not([class*="bg-transparent"])):not([style*="background"]:not([style*="background-color: transparent"])),[data-sf-store] header [data-sf-header-surface]{color:inherit!important}`)
  }
  return rules.join('\n')
}

interface ThemeProviderProps {
  theme: ThemeConfig
  store: Store
  children: ReactNode
}

export function ThemeProvider({ theme, store, children }: ThemeProviderProps) {
  const language = store.language || 'es'

  // Merge store-level effect overrides into theme
  const primary = getPrimaryColor(store)
  const background = getBackgroundColor(store)
  const surface = getSurfaceColor(store)
  const text = getTextColor(store)
  const corners = getCornerStyle(store)
  const mergedTheme = useMemo(() => {
    const s = store.themeSettings
    // Colores del editor en vivo que leen los componentes compartidos (tarjetas,
    // carrito, checkout). El principal lleva texto negro o blanco segun se lea
    // mejor. El fondo tambien pinta las "superficies" cuando el tema las tenia
    // iguales al fondo (tarjetas y cajones sin color propio).
    // Superficie y texto elegidos: de ellos salen tambien el hover de las
    // superficies, el texto secundario y las lineas, para que combinen.
    const withPrimary = primary || background || surface || text || corners ? {
      ...theme,
      ...(corners && { radius: { ...CORNER_STYLES[corners] } }),
      colors: {
        ...theme.colors,
        ...(primary && {
          primary,
          primaryHover: `color-mix(in srgb, ${primary} 85%, black)`,
          textInverted: readableTextOn(primary),
        }),
        ...(background && {
          background,
          ...(theme.colors.surface === theme.colors.background && { surface: background }),
        }),
        ...(surface && {
          surface,
          surfaceHover: `color-mix(in srgb, ${surface} 92%, #808080)`,
        }),
        ...(text && {
          text,
          textMuted: `color-mix(in srgb, ${text} 65%, transparent)`,
          border: `color-mix(in srgb, ${text} 15%, transparent)`,
        }),
      },
    } : theme
    if (s?.scrollReveal === undefined && s?.imageSwapOnHover === undefined && s?.productLayout === undefined && s?.paginationType === undefined && s?.productViewMode === undefined) return withPrimary
    return {
      ...withPrimary,
      effects: {
        ...theme.effects,
        ...(s?.scrollReveal !== undefined && { scrollReveal: s.scrollReveal }),
        ...(s?.imageSwapOnHover !== undefined && { imageSwapOnHover: s.imageSwapOnHover }),
        ...(s?.productLayout !== undefined && { productLayout: s.productLayout }),
        ...(s?.paginationType !== undefined && { paginationType: s.paginationType }),
        ...(s?.productViewMode !== undefined && { productViewMode: s.productViewMode }),
      }
    }
  }, [theme, store.themeSettings, primary, background, surface, text, corners])

  const headerColors = getHeaderColors(store)
  const headingFont = getHeadingFont(store)
  const bodyFont = getBodyFont(store)
  const chosenFonts = [headingFont, bodyFont].filter((f): f is NonNullable<typeof f> => !!f)
  const fontCss = fontOverridesCss(headingFont, bodyFont)
  // Fondo de pagina: todos los temas arman su pagina en un contenedor min-h-screen
  // justo adentro de este provider. Pisa tambien degradados/texturas del fondo.
  const backgroundCss = background && HEX_COLOR.test(background)
    ? `[data-sf-store]>.min-h-screen{background:${background}!important}`
    : ''
  const overrideCss = [headerColorsCss(headerColors.background, headerColors.text), fontCss, backgroundCss].filter(Boolean).join('\n')

  // En el editor en vivo, contarle al panel los colores originales de este tema.
  const liveEdit = useLiveEditContext()
  useEffect(() => {
    liveEdit?.onThemeInfo?.({
      background: theme.colors.background,
      surface: theme.colors.surface,
      text: theme.colors.text,
      primary: theme.colors.primary,
    })
  }, [liveEdit, theme])

  // Propagate store currency to pixel helpers so tracking events use the right currency
  useEffect(() => {
    setPixelDefaultCurrency(store.currency || 'USD')
  }, [store.currency])

  return (
    <ThemeContext.Provider value={{
      theme: mergedTheme,
      store,
      currency: store.currency || 'USD',
      language
    }}>
      <BusinessTypeProvider businessType={store.businessType} language={language}>
        {/* display: contents — el wrapper no participa del layout (sticky, min-h-screen siguen igual). */}
        <div data-sf-store="" style={{ display: 'contents' }}>
          {/* Sin `precedence`: con ese atributo React 19 pausa el pintado hasta
              que carga la hoja, y en el editor eso re-ejecutaba efectos y
              perdia el borrador. Asi es un <link> comun, como en los temas. */}
          {chosenFonts.length > 0 && <link rel="stylesheet" href={googleFontsUrl(chosenFonts)} />}
          {overrideCss && <style>{overrideCss}</style>}
          {children}
        </div>
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
