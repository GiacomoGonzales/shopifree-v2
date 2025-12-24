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
