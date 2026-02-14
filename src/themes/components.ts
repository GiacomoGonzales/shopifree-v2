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
import TaqueriaTheme from './taqueria/TaqueriaTheme'
import SakuraTheme from './sakura/SakuraTheme'
import TrattoriaTheme from './trattoria/TrattoriaTheme'
import MinimalTechTheme from './minimal-tech/MinimalTechTheme'
import NeonCyberTheme from './neon-cyber/NeonCyberTheme'
import GlamTheme from './glam/GlamTheme'
import OrganicTheme from './organic/OrganicTheme'
import PawshopTheme from './pawshop/PawshopTheme'
import FitnessTheme from './fitness/FitnessTheme'
import BaristaTheme from './barista/BaristaTheme'
import ToylandTheme from './toyland/ToylandTheme'
import BloomTheme from './bloom/BloomTheme'
import DecoTheme from './deco/DecoTheme'
import LibreriaTheme from './libreria/LibreriaTheme'

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
  taqueria: TaqueriaTheme,
  sakura: SakuraTheme,
  trattoria: TrattoriaTheme,
  'minimal-tech': MinimalTechTheme,
  'neon-cyber': NeonCyberTheme,
  glam: GlamTheme,
  organic: OrganicTheme,
  pawshop: PawshopTheme,
  fitness: FitnessTheme,
  barista: BaristaTheme,
  toyland: ToylandTheme,
  bloom: BloomTheme,
  deco: DecoTheme,
  libreria: LibreriaTheme,
}

export function getThemeComponent(themeId: string): React.ComponentType<any> {
  return themeComponents[themeId] || MinimalTheme
}

export { MinimalTheme, BoldTheme, BoutiqueTheme, FreshTheme, NeonTheme, LuxeTheme, CraftTheme, PopTheme, MetroTheme, VintageTheme, FlavorTheme, UrbanTheme, BistroTheme, TaqueriaTheme, SakuraTheme, TrattoriaTheme, MinimalTechTheme, NeonCyberTheme, GlamTheme, OrganicTheme, PawshopTheme, FitnessTheme, BaristaTheme, ToylandTheme, BloomTheme, DecoTheme, LibreriaTheme }
