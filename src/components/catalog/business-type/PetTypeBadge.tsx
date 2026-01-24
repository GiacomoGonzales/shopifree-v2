import { useTheme } from '../ThemeContext'
import PetIcon from '../../ui/PetIcon'

type PetType = 'dog' | 'cat' | 'bird' | 'fish' | 'small' | 'other'
type PetAge = 'puppy' | 'adult' | 'senior' | 'all'

interface PetTypeBadgeProps {
  petType: PetType
  petAge?: PetAge
  variant?: 'badge' | 'inline'
  language?: string
}

export default function PetTypeBadge({
  petType,
  petAge,
  variant = 'badge',
  language = 'es',
}: PetTypeBadgeProps) {
  const { theme } = useTheme()

  const labels = {
    es: {
      for: 'Para',
      types: {
        dog: 'Perros',
        cat: 'Gatos',
        bird: 'Aves',
        fish: 'Peces',
        small: 'Pequenos',
        other: 'Mascotas',
      },
      ages: {
        puppy: 'Cachorros',
        adult: 'Adultos',
        senior: 'Senior',
        all: '',
      },
    },
    en: {
      for: 'For',
      types: {
        dog: 'Dogs',
        cat: 'Cats',
        bird: 'Birds',
        fish: 'Fish',
        small: 'Small pets',
        other: 'Pets',
      },
      ages: {
        puppy: 'Puppies',
        adult: 'Adults',
        senior: 'Senior',
        all: '',
      },
    },
    pt: {
      for: 'Para',
      types: {
        dog: 'Caes',
        cat: 'Gatos',
        bird: 'Aves',
        fish: 'Peixes',
        small: 'Pequenos',
        other: 'Pets',
      },
      ages: {
        puppy: 'Filhotes',
        adult: 'Adultos',
        senior: 'Senior',
        all: '',
      },
    },
  }

  const t = labels[language as keyof typeof labels] || labels.es

  const petLabel = t.types[petType]
  const ageLabel = petAge && petAge !== 'all' ? t.ages[petAge] : ''

  const text = ageLabel
    ? `${t.for} ${petLabel} ${ageLabel}`
    : `${t.for} ${petLabel}`

  if (variant === 'inline') {
    return (
      <span
        className="text-sm flex items-center gap-1"
        style={{ color: theme.colors.textMuted }}
      >
        <PetIcon type={petType} className="w-4 h-4" />
        {text}
      </span>
    )
  }

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1"
      style={{
        backgroundColor: theme.effects.darkMode
          ? 'rgba(255,255,255,0.1)'
          : 'rgba(0,0,0,0.05)',
        borderRadius: theme.radius.full,
      }}
    >
      <PetIcon type={petType} className="w-4 h-4" />
      <span
        className="text-xs font-medium"
        style={{ color: theme.colors.text }}
      >
        {text}
      </span>
    </div>
  )
}
