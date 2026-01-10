// Theme components registry
// Import theme components here as they are created

import MinimalTheme from './minimal/MinimalTheme'
import BoldTheme from './bold/BoldTheme'
import BoutiqueTheme from './boutique/BoutiqueTheme'
import FreshTheme from './fresh/FreshTheme'

// Map theme IDs to their components
export const themeComponents: Record<string, React.ComponentType<any>> = {
  minimal: MinimalTheme,
  bold: BoldTheme,
  boutique: BoutiqueTheme,
  fresh: FreshTheme,
  // These will use fallback until implemented:
  neon: BoldTheme, // Uses Bold (dark theme) as base
  luxe: BoldTheme,
  craft: MinimalTheme,
  pop: MinimalTheme,
}

export function getThemeComponent(themeId: string): React.ComponentType<any> {
  return themeComponents[themeId] || MinimalTheme
}

export { MinimalTheme, BoldTheme, BoutiqueTheme, FreshTheme }
