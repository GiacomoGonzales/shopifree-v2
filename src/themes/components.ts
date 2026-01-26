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
import MetroTheme from './metro/MetroTheme'
import VintageTheme from './vintage/VintageTheme'
import FlavorTheme from './flavor/FlavorTheme'
import UrbanTheme from './urban/UrbanTheme'
import BistroTheme from './bistro/BistroTheme'

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
  metro: MetroTheme,
  vintage: VintageTheme,
  flavor: FlavorTheme,
  urban: UrbanTheme,
  bistro: BistroTheme,
}

export function getThemeComponent(themeId: string): React.ComponentType<any> {
  return themeComponents[themeId] || MinimalTheme
}

export { MinimalTheme, BoldTheme, BoutiqueTheme, FreshTheme, NeonTheme, LuxeTheme, CraftTheme, PopTheme, MetroTheme, VintageTheme, FlavorTheme, UrbanTheme, BistroTheme }
