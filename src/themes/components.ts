// Theme components registry
// Import theme components here as they are created

import MinimalTheme from './minimal/MinimalTheme'
import BoldTheme from './bold/BoldTheme'
import BoutiqueTheme from './boutique/BoutiqueTheme'
import FreshTheme from './fresh/FreshTheme'
import NeonTheme from './neon/NeonTheme'
import LuxeTheme from './luxe/LuxeTheme'
import CraftTheme from './craft/CraftTheme'
import PopTheme from './pop/PopTheme'

// Map theme IDs to their components
export const themeComponents: Record<string, React.ComponentType<any>> = {
  minimal: MinimalTheme,
  bold: BoldTheme,
  boutique: BoutiqueTheme,
  fresh: FreshTheme,
  neon: NeonTheme,
  luxe: LuxeTheme,
  craft: CraftTheme,
  pop: PopTheme,
}

export function getThemeComponent(themeId: string): React.ComponentType<any> {
  return themeComponents[themeId] || MinimalTheme
}

export { MinimalTheme, BoldTheme, BoutiqueTheme, FreshTheme, NeonTheme, LuxeTheme, CraftTheme, PopTheme }
