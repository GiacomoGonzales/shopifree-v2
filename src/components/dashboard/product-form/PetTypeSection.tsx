import { useTranslation } from 'react-i18next'
import PetIcon from '../../ui/PetIcon'
import { CARD, SECTION_HINT, SECTION_TITLE } from './tokens'

type PetType = 'dog' | 'cat' | 'bird' | 'fish' | 'small' | 'other'
type PetAge = 'puppy' | 'adult' | 'senior' | 'all'

interface PetTypeSectionProps {
  petType?: PetType
  petAge?: PetAge
  onPetTypeChange: (petType: PetType | undefined) => void
  onPetAgeChange: (petAge: PetAge | undefined) => void
}

export default function PetTypeSection({
  petType,
  petAge,
  onPetTypeChange,
  onPetAgeChange,
}: PetTypeSectionProps) {
  const { t } = useTranslation('dashboard')

  const petTypes: { value: PetType; label: string }[] = [
    { value: 'dog', label: t('productForm.petType.types.dog', 'Perro') },
    { value: 'cat', label: t('productForm.petType.types.cat', 'Gato') },
    { value: 'bird', label: t('productForm.petType.types.bird', 'Ave') },
    { value: 'fish', label: t('productForm.petType.types.fish', 'Pez') },
    { value: 'small', label: t('productForm.petType.types.small', 'Pequeno') },
    { value: 'other', label: t('productForm.petType.types.other', 'Otro') },
  ]

  const petAges: { value: PetAge; label: string }[] = [
    { value: 'all', label: t('productForm.petType.ages.all', 'Todas las edades') },
    { value: 'puppy', label: t('productForm.petType.ages.puppy', 'Cachorro / Joven') },
    { value: 'adult', label: t('productForm.petType.ages.adult', 'Adulto') },
    { value: 'senior', label: t('productForm.petType.ages.senior', 'Senior') },
  ]

  return (
    <div className={CARD}>
      <div className="mb-4">
        <h2 className={SECTION_TITLE}>
          {t('productForm.petType.title', 'Tipo de mascota')}
        </h2>
        <p className={SECTION_HINT}>
          {t('productForm.petType.description', 'Para que tipo de mascota es este producto')}
        </p>
      </div>

      <div className="space-y-4">
        {/* Pet Type Selection */}
        <div>
          <label className="block text-sm font-medium text-[#1e3a5f] mb-2">
            {t('productForm.petType.typeLabel', 'Mascota')}
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {petTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => onPetTypeChange(petType === type.value ? undefined : type.value)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                  petType === type.value
                    ? 'border-[#2d6cb5] bg-[#f0f7ff]'
                    : 'border-[#E6EBF1] hover:border-[#D8E2EC]'
                }`}
              >
                <span className={petType === type.value ? 'text-[#1e3a5f]' : 'text-[#8898AA]'}>
                  <PetIcon type={type.value} className="w-6 h-6" />
                </span>
                <span className={`text-xs font-medium ${
                  petType === type.value ? 'text-[#1e3a5f]' : 'text-[#425466]'
                }`}>
                  {type.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Pet Age Selection */}
        {petType && (
          <div>
            <label className="block text-sm font-medium text-[#1e3a5f] mb-2">
              {t('productForm.petType.ageLabel', 'Edad')}
            </label>
            <div className="flex flex-wrap gap-2">
              {petAges.map((age) => (
                <button
                  key={age.value}
                  type="button"
                  onClick={() => onPetAgeChange(petAge === age.value ? undefined : age.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    petAge === age.value
                      ? 'bg-[#2d6cb5] text-white'
                      : 'bg-[#F1F5F9] text-[#425466] hover:bg-[#E1E8EF]'
                  }`}
                >
                  {age.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Preview */}
      {petType && (
        <div className="mt-4 p-3 rounded-xl bg-[#F0F9FF]">
          <p className="text-sm text-[#1e3a5f] flex items-center gap-2">
            {t('productForm.petType.preview', 'Se mostrara:')}
            <span className="font-medium inline-flex items-center gap-1.5">
              <PetIcon type={petType} className="w-4 h-4" />
              {t('productForm.petType.forPet', 'Para {{pet}}', {
                pet: petTypes.find(pt => pt.value === petType)?.label.toLowerCase()
              })}
              {petAge && petAge !== 'all' && (
                <span className="text-[#8898AA]">
                  {' - '}
                  {petAges.find(a => a.value === petAge)?.label}
                </span>
              )}
            </span>
          </p>
        </div>
      )}
    </div>
  )
}
