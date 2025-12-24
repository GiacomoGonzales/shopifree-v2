// Theme components registry
// Import theme components here as they are created

import MinimalTheme from './minimal/MinimalTheme'
import BoldTheme from './bold/BoldTheme'

// Map theme IDs to their components
export const themeComponents: Record<string, React.ComponentType<any>> = {
  minimal: MinimalTheme,
  bold: BoldTheme,
  // These will use Minimal as fallback until implemented:
  boutique: MinimalTheme,
  fresh: MinimalTheme,
  neon: BoldTheme, // Uses Bold (dark theme) as base
  luxe: BoldTheme,
  craft: MinimalTheme,
  pop: MinimalTheme,
}

export function getThemeComponent(themeId: string): React.ComponentType<any> {
  return themeComponents[themeId] || MinimalTheme
}

export { MinimalTheme, BoldTheme }
