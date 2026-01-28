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
