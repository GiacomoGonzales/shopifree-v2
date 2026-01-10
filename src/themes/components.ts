// Theme components registry
// Import theme components here as they are created

import MinimalTheme from './minimal/MinimalTheme'
import BoldTheme from './bold/BoldTheme'
import BoutiqueTheme from './boutique/BoutiqueTheme'
import FreshTheme from './fresh/FreshTheme'
import NeonTheme from './neon/NeonTheme'

// Map theme IDs to their components
export const themeComponents: Record<string, React.ComponentType<any>> = {
  minimal: MinimalTheme,
  bold: BoldTheme,
  boutique: BoutiqueTheme,
  fresh: FreshTheme,
  neon: NeonTheme,
  // These will use fallback until implemented:
  luxe: BoldTheme,
  craft: MinimalTheme,
  pop: MinimalTheme,
}

export function getThemeComponent(themeId: string): React.ComponentType<any> {
  return themeComponents[themeId] || MinimalTheme
}

export { MinimalTheme, BoldTheme, BoutiqueTheme, FreshTheme, NeonTheme }
