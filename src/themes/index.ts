import type { Theme } from '../types'

// Registry de temas disponibles
export const themes: Theme[] = [
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Diseno limpio y moderno con colores neutros. Perfecto para cualquier tipo de negocio.',
    thumbnail: '/themes/minimal.png',
    category: 'all',
    isPremium: false,
    isNew: false,
    createdAt: new Date('2024-01-01'),
    colors: {
      primary: '#000000',
      background: '#ffffff',
      accent: '#6b7280'
    }
  },
  {
    id: 'boutique',
    name: 'Boutique',
    description: 'Elegante y sofisticado con tonos rosados. Ideal para moda y accesorios.',
    thumbnail: '/themes/boutique.png',
    category: 'retail',
    isPremium: false,
    isNew: false,
    createdAt: new Date('2024-01-15'),
    colors: {
      primary: '#be185d',
      background: '#fdf2f8',
      accent: '#ec4899'
    }
  },
  {
    id: 'bold',
    name: 'Bold',
    description: 'Oscuro y llamativo con acentos amarillos. Para marcas que quieren destacar.',
    thumbnail: '/themes/bold.png',
    category: 'retail',
    isPremium: false,
    isNew: false,
    createdAt: new Date('2024-02-01'),
    colors: {
      primary: '#fbbf24',
      background: '#000000',
      accent: '#f59e0b'
    }
  },
  {
    id: 'fresh',
    name: 'Fresh',
    description: 'Fresco y natural con tonos verdes. Perfecto para productos organicos y naturales.',
    thumbnail: '/themes/fresh.png',
    category: 'all',
    isPremium: false,
    isNew: false,
    createdAt: new Date('2024-02-15'),
    colors: {
      primary: '#059669',
      background: '#ecfdf5',
      accent: '#10b981'
    }
  },
  {
    id: 'neon',
    name: 'Neon',
    description: 'Futurista con efectos de luz neon. Ideal para tecnologia y productos modernos.',
    thumbnail: '/themes/neon.png',
    category: 'retail',
    isPremium: false,
    isNew: true,
    createdAt: new Date('2024-03-01'),
    colors: {
      primary: '#00ff88',
      background: '#0a0a0f',
      accent: '#00ffff'
    }
  },
  {
    id: 'luxe',
    name: 'Luxe',
    description: 'Lujoso y premium con dorados. Para productos de alta gama.',
    thumbnail: '/themes/luxe.png',
    category: 'retail',
    isPremium: false,
    isNew: false,
    createdAt: new Date('2024-03-15'),
    colors: {
      primary: '#d4af37',
      background: '#1a1a1a',
      accent: '#c9a227'
    }
  },
  {
    id: 'craft',
    name: 'Craft',
    description: 'Artesanal y calido con tonos tierra. Perfecto para productos hechos a mano.',
    thumbnail: '/themes/craft.png',
    category: 'all',
    isPremium: false,
    isNew: false,
    createdAt: new Date('2024-04-01'),
    colors: {
      primary: '#92400e',
      background: '#fefce8',
      accent: '#b45309'
    }
  },
  {
    id: 'pop',
    name: 'Pop',
    description: 'Colorido y divertido con gradientes vibrantes. Para marcas jovenes y dinamicas.',
    thumbnail: '/themes/pop.png',
    category: 'retail',
    isPremium: false,
    isNew: true,
    createdAt: new Date('2024-04-15'),
    colors: {
      primary: '#8b5cf6',
      background: '#ffffff',
      accent: '#ec4899'
    }
  },
  {
    id: 'metro',
    name: 'Metro',
    description: 'Moderno y tecnologico con azul electrico. Ideal para startups y productos tech.',
    thumbnail: '/themes/metro.png',
    category: 'retail',
    isPremium: false,
    isNew: true,
    createdAt: new Date('2024-05-01'),
    colors: {
      primary: '#0066FF',
      background: '#ffffff',
      accent: '#00D4FF'
    }
  },
  {
    id: 'vintage',
    name: 'Vintage',
    description: 'Clasico y nostalgico con tonos sepia. Perfecto para antiguedades y productos artesanales.',
    thumbnail: '/themes/vintage.png',
    category: 'retail',
    isPremium: false,
    isNew: true,
    createdAt: new Date('2024-05-15'),
    colors: {
      primary: '#5D4037',
      background: '#FDF8F3',
      accent: '#C9A962'
    }
  },
  {
    id: 'flavor',
    name: 'Flavor',
    description: 'Calido y apetitoso con tonos rojos. Ideal para restaurantes, cafeterias y delivery.',
    thumbnail: '/themes/flavor.png',
    category: 'restaurant',
    isPremium: false,
    isNew: true,
    createdAt: new Date('2024-06-01'),
    colors: {
      primary: '#E53935',
      background: '#FFFDF7',
      accent: '#FF6D00'
    }
  },
  {
    id: 'urban',
    name: 'Urban',
    description: 'Audaz y urbano con negro y neon. Perfecto para streetwear, sneakers y moda urbana.',
    thumbnail: '/themes/urban.png',
    category: 'retail',
    isPremium: false,
    isNew: true,
    createdAt: new Date('2024-06-15'),
    colors: {
      primary: '#CCFF00',
      background: '#0A0A0A',
      accent: '#FFFFFF'
    }
  },
  {
    id: 'bistro',
    name: 'Bistro',
    description: 'Elegante y sofisticado con tonos oscuros y cobre. Ideal para restaurantes finos y wine bars.',
    thumbnail: '/themes/bistro.png',
    category: 'restaurant',
    isPremium: false,
    isNew: true,
    createdAt: new Date('2024-07-01'),
    colors: {
      primary: '#B87333',
      background: '#1C1917',
      accent: '#722F37'
    }
  },
  {
    id: 'taqueria',
    name: 'Taqueria',
    description: 'Vibrante y festivo con colores mexicanos. Ideal para taquerias, comida mexicana y food trucks.',
    thumbnail: '/themes/taqueria.png',
    category: 'restaurant',
    isPremium: false,
    isNew: true,
    createdAt: new Date('2024-07-15'),
    colors: {
      primary: '#F97316',
      background: '#FFFBEB',
      accent: '#84CC16'
    }
  },
  {
    id: 'sakura',
    name: 'Sakura',
    description: 'Minimalista y zen con estetica japonesa. Ideal para sushi bars, ramen shops e izakayas.',
    thumbnail: '/themes/sakura.png',
    category: 'restaurant',
    isPremium: false,
    isNew: true,
    createdAt: new Date('2024-07-20'),
    colors: {
      primary: '#DC2626',
      background: '#0C0C0C',
      accent: '#D4A853'
    }
  },
  {
    id: 'trattoria',
    name: 'Trattoria',
    description: 'Calido y rustico con estilo italiano. Ideal para pizzerias, pastas y cocina mediterranea.',
    thumbnail: '/themes/trattoria.png',
    category: 'restaurant',
    isPremium: false,
    isNew: true,
    createdAt: new Date('2024-07-25'),
    colors: {
      primary: '#C2410C',
      background: '#FEF7ED',
      accent: '#65A30D'
    }
  },
  {
    id: 'minimal-tech',
    name: 'Minimal Tech',
    description: 'Minimalista y premium estilo Apple. Ideal para electronica, smartphones y productos tech de alta gama.',
    thumbnail: '/themes/minimal-tech.png',
    category: 'tech',
    isPremium: false,
    isNew: true,
    createdAt: new Date('2026-01-27'),
    colors: {
      primary: '#1d1d1f',
      background: '#ffffff',
      accent: '#0071e3'
    }
  },
  {
    id: 'neon-cyber',
    name: 'Neon Cyber',
    description: 'Futurista y gaming con neon sobre negro. Ideal para gaming, accesorios RGB y gadgets tech.',
    thumbnail: '/themes/neon-cyber.png',
    category: 'tech',
    isPremium: false,
    isNew: true,
    createdAt: new Date('2026-01-27'),
    colors: {
      primary: '#00f0ff',
      background: '#0a0a0f',
      accent: '#ff00ff'
    }
  },
  {
    id: 'glam',
    name: 'Glam',
    description: 'Elegante y lujoso con dorados y tonos nude. Ideal para maquillaje, perfumeria y beauty premium.',
    thumbnail: '/themes/glam.png',
    category: 'cosmetics',
    isPremium: false,
    isNew: true,
    createdAt: new Date('2026-01-27'),
    colors: {
      primary: '#C9A962',
      background: '#FDF5F3',
      accent: '#1A1A1A'
    }
  },
  {
    id: 'organic',
    name: 'Organic',
    description: 'Natural y fresco con tonos verdes. Ideal para tiendas organicas, productos naturales y alimentos saludables.',
    thumbnail: '/themes/organic.png',
    category: 'grocery',
    isPremium: false,
    isNew: true,
    createdAt: new Date('2026-01-27'),
    colors: {
      primary: '#2D5A3D',
      background: '#FDFBF7',
      accent: '#4A7C59'
    }
  },
  {
    id: 'pawshop',
    name: 'Pawshop',
    description: 'Alegre y divertido con colores calidos. Ideal para pet shops, accesorios y productos para mascotas.',
    thumbnail: '/themes/pawshop.png',
    category: 'pets',
    isPremium: false,
    isNew: true,
    createdAt: new Date('2026-01-27'),
    colors: {
      primary: '#F59E0B',
      background: '#FFFBEB',
      accent: '#38BDF8'
    }
  },
  {
    id: 'fitness',
    name: 'Fitness',
    description: 'Agresivo y motivacional con negro y rojo. Ideal para gimnasios, suplementos y ropa deportiva.',
    thumbnail: '/themes/fitness.png',
    category: 'retail',
    isPremium: false,
    isNew: true,
    createdAt: new Date('2026-02-13'),
    colors: {
      primary: '#EF4444',
      background: '#111111',
      accent: '#FFFFFF'
    }
  },
  {
    id: 'barista',
    name: 'Barista',
    description: 'Calido y acogedor con tonos cafe. Ideal para cafeterias, panaderias y chocolaterias.',
    thumbnail: '/themes/barista.png',
    category: 'restaurant',
    isPremium: false,
    isNew: true,
    createdAt: new Date('2026-02-13'),
    colors: {
      primary: '#6F4E37',
      background: '#FFF8F0',
      accent: '#C2956B'
    }
  },
  {
    id: 'toyland',
    name: 'Toyland',
    description: 'Divertido y colorido con colores primarios. Ideal para jugueterias, ropa de bebe y articulos infantiles.',
    thumbnail: '/themes/toyland.png',
    category: 'retail',
    isPremium: false,
    isNew: true,
    createdAt: new Date('2026-02-13'),
    colors: {
      primary: '#06B6D4',
      background: '#FEFCE8',
      accent: '#FB7185'
    }
  },
  {
    id: 'bloom',
    name: 'Bloom',
    description: 'Delicado y romantico con tonos rosados y verde salvia. Ideal para florerias, regalerias y eventos.',
    thumbnail: '/themes/bloom.png',
    category: 'retail',
    isPremium: false,
    isNew: true,
    createdAt: new Date('2026-02-13'),
    colors: {
      primary: '#6B8F71',
      background: '#FFFBFC',
      accent: '#F9A8B8'
    }
  },
  {
    id: 'deco',
    name: 'Deco',
    description: 'Escandinavo y calido con tonos tierra. Ideal para mueblerias, decoracion e interiorismo.',
    thumbnail: '/themes/deco.png',
    category: 'retail',
    isPremium: false,
    isNew: true,
    createdAt: new Date('2026-02-13'),
    colors: {
      primary: '#6B7B3A',
      background: '#FAF8F5',
      accent: '#CC7755'
    }
  },
  {
    id: 'libreria',
    name: 'Libreria',
    description: 'Clasico y literario con estilo editorial. Ideal para librerias, papelerias y editoriales.',
    thumbnail: '/themes/libreria.png',
    category: 'retail',
    isPremium: false,
    isNew: true,
    createdAt: new Date('2026-02-13'),
    colors: {
      primary: '#1E3A5F',
      background: '#F5F0E8',
      accent: '#8B2232'
    }
  },
  {
    id: 'slate',
    name: 'Slate',
    description: 'Profesional y corporativo con tonos neutros. Perfecto para cualquier tipo de negocio o servicio.',
    thumbnail: '/themes/slate.png',
    category: 'all',
    isPremium: false,
    isNew: true,
    createdAt: new Date('2026-02-14'),
    colors: {
      primary: '#475569',
      background: '#FFFFFF',
      accent: '#3B82F6'
    }
  },
  {
    id: 'ember',
    name: 'Ember',
    description: 'Oscuro y calido con acentos ambar. Para marcas premium con estetica sofisticada.',
    thumbnail: '/themes/ember.png',
    category: 'all',
    isPremium: false,
    isNew: true,
    createdAt: new Date('2026-02-14'),
    colors: {
      primary: '#F97316',
      background: '#1C1210',
      accent: '#FBBF24'
    }
  },
  {
    id: 'circuit',
    name: 'Circuit',
    description: 'Dark navy futurista con azul electrico. Ideal para electronica, componentes y gadgets tech.',
    thumbnail: '/themes/circuit.png',
    category: 'tech',
    isPremium: false,
    isNew: true,
    createdAt: new Date('2026-02-14'),
    colors: {
      primary: '#3B82F6',
      background: '#0F172A',
      accent: '#06B6D4'
    }
  },
  {
    id: 'aura',
    name: 'Aura',
    description: 'Suave y delicado con tonos lavanda. Ideal para skincare, aromaterapia y cosmeticos naturales.',
    thumbnail: '/themes/aura.png',
    category: 'cosmetics',
    isPremium: false,
    isNew: true,
    createdAt: new Date('2026-02-14'),
    colors: {
      primary: '#8B5CF6',
      background: '#FAF5FF',
      accent: '#6D28D9'
    }
  },
  {
    id: 'blush',
    name: 'Blush',
    description: 'Rosa coral femenino y fresco. Ideal para maquillaje, accesorios beauty y nail art.',
    thumbnail: '/themes/blush.png',
    category: 'cosmetics',
    isPremium: false,
    isNew: true,
    createdAt: new Date('2026-02-14'),
    colors: {
      primary: '#E11D48',
      background: '#FFF1F2',
      accent: '#FB7185'
    }
  },
  {
    id: 'harvest',
    name: 'Harvest',
    description: 'Rustico y organico con tonos terracota. Ideal para mercados locales, panaderia artesanal y productos del campo.',
    thumbnail: '/themes/harvest.png',
    category: 'grocery',
    isPremium: false,
    isNew: true,
    createdAt: new Date('2026-02-14'),
    colors: {
      primary: '#C2410C',
      background: '#FFFBEB',
      accent: '#65A30D'
    }
  },
  {
    id: 'furry',
    name: 'Furry',
    description: 'Jugueton y vibrante con teal y rosa. Ideal para veterinarias, grooming y accesorios de mascotas.',
    thumbnail: '/themes/furry.png',
    category: 'pets',
    isPremium: false,
    isNew: true,
    createdAt: new Date('2026-02-14'),
    colors: {
      primary: '#0D9488',
      background: '#F0FDFA',
      accent: '#EC4899'
    }
  },
  {
    id: 'vaporwave',
    name: 'Vaporwave',
    description: 'Estetica retro-futurista 80s/90s con gradientes rosa-cyan. Ideal para vinilos, ropa vintage, stickers y aesthetic shops.',
    thumbnail: '/themes/vaporwave.png',
    category: 'retail',
    isPremium: false,
    isNew: true,
    createdAt: new Date('2026-02-18'),
    colors: {
      primary: '#FF71CE',
      background: '#1a0030',
      accent: '#01CDFE'
    }
  },
  {
    id: 'candy',
    name: 'Candy',
    description: 'Ultra Y2K, bubble gum, glossy y divertido. Ideal para accesorios, phone cases, stickers y moda trendy.',
    thumbnail: '/themes/candy.png',
    category: 'retail',
    isPremium: false,
    isNew: true,
    createdAt: new Date('2026-02-18'),
    colors: {
      primary: '#FF69B4',
      background: '#FFF0F5',
      accent: '#B967FF'
    }
  },
  {
    id: 'brutalist',
    name: 'Brutalist',
    description: 'Anti-diseno crudo con tipografia monospace gigante. Ideal para marcas independientes, arte y studios creativos.',
    thumbnail: '/themes/brutalist.png',
    category: 'retail',
    isPremium: false,
    isNew: true,
    createdAt: new Date('2026-02-18'),
    colors: {
      primary: '#FF0000',
      background: '#FFFFFF',
      accent: '#000000'
    }
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Espacio profundo con nebulosas violeta-azul y estrellas. Ideal para joyeria, cristales, astrologia y perfumes.',
    thumbnail: '/themes/midnight.png',
    category: 'retail',
    isPremium: false,
    isNew: true,
    createdAt: new Date('2026-02-18'),
    colors: {
      primary: '#7C3AED',
      background: '#0B0D1A',
      accent: '#3B82F6'
    }
  },
  {
    id: 'tropical',
    name: 'Tropical',
    description: 'Vibes caribenas con colores sunset naranja-magenta. Ideal para swimwear, moda verano y accesorios de playa.',
    thumbnail: '/themes/tropical.png',
    category: 'retail',
    isPremium: false,
    isNew: true,
    createdAt: new Date('2026-02-18'),
    colors: {
      primary: '#FF6B35',
      background: '#FFF5E1',
      accent: '#FF1493'
    }
  },
  {
    id: 'grunge',
    name: 'Grunge',
    description: 'Raw y punk rock con amarillo acido y estetica de poster de banda. Ideal para ropa alternativa, skate y tattoo shops.',
    thumbnail: '/themes/grunge.png',
    category: 'retail',
    isPremium: false,
    isNew: true,
    createdAt: new Date('2026-02-18'),
    colors: {
      primary: '#E4FF1A',
      background: '#1A1A1A',
      accent: '#FF2D55'
    }
  },
  {
    id: 'aurora',
    name: 'Aurora',
    description: 'Aurora boreal con fondo animado verde-violeta-azul. Efectos premium: glassmorphism, 3D tilt, bordes animados.',
    thumbnail: '/themes/aurora.png',
    category: 'all',
    isPremium: true,
    isNew: true,
    createdAt: new Date('2026-02-18'),
    colors: {
      primary: '#00D68F',
      background: '#0A0F1C',
      accent: '#7C3AED'
    }
  },
  {
    id: 'prism',
    name: 'Prism',
    description: 'Blanco prismatico con reflejos arcoiris y texto degradado animado. Efectos premium: glassmorphism, bordes animados.',
    thumbnail: '/themes/prism.png',
    category: 'all',
    isPremium: true,
    isNew: true,
    createdAt: new Date('2026-02-18'),
    colors: {
      primary: '#6366F1',
      background: '#FFFFFF',
      accent: '#EC4899'
    }
  },
  {
    id: 'noir',
    name: 'Noir',
    description: 'Negro cinematografico con spotlight dorado y efecto film grain. Efectos premium: 3D tilt, bordes animados.',
    thumbnail: '/themes/noir.png',
    category: 'all',
    isPremium: true,
    isNew: true,
    createdAt: new Date('2026-02-18'),
    colors: {
      primary: '#D4AF37',
      background: '#000000',
      accent: '#C9A227'
    }
  }
]

export function getThemeById(id: string): Theme | undefined {
  return themes.find(theme => theme.id === id)
}

export function getThemesByCategory(category: Theme['category']): Theme[] {
  if (category === 'all') return themes
  return themes.filter(theme => theme.category === category || theme.category === 'all')
}

export function getFreeThemes(): Theme[] {
  return themes.filter(theme => !theme.isPremium)
}

export function getNewThemes(): Theme[] {
  return themes.filter(theme => theme.isNew)
}
