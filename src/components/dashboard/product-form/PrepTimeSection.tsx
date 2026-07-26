import { useTranslation } from 'react-i18next'
import { CARD, INPUT, LABEL, REMOVE_BTN, SECTION_HINT, SECTION_TITLE } from './tokens'

interface PrepTimeSectionProps {
  prepTime?: {
    min: number
    max: number
    unit: 'min' | 'hr'
  }
  onChange: (prepTime: { min: number; max: number; unit: 'min' | 'hr' } | undefined) => void
}

export default function PrepTimeSection({ prepTime, onChange }: PrepTimeSectionProps) {
  const { t } = useTranslation('dashboard')

  const handleChange = (field: 'min' | 'max' | 'unit', value: string | number) => {
    const current = prepTime || { min: 0, max: 0, unit: 'min' as const }
    if (field === 'unit') {
      onChange({ ...current, unit: value as 'min' | 'hr' })
    } else {
      const numValue = typeof value === 'string' ? parseInt(value) || 0 : value
      onChange({ ...current, [field]: numValue })
    }
  }

  const clearPrepTime = () => {
    onChange(undefined)
  }

  return (
    <div className={CARD}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className={SECTION_TITLE}>
            {t('productForm.prepTime.title', 'Tiempo de preparacion')}
          </h2>
          <p className={SECTION_HINT}>
            {t('productForm.prepTime.description', 'Tiempo estimado para preparar este platillo')}
          </p>
        </div>
        {prepTime && (
          <button
            type="button"
            onClick={clearPrepTime}
            className={REMOVE_BTN}
          >
            {t('productForm.prepTime.clear', 'Limpiar')}
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={LABEL}>
            {t('productForm.prepTime.min', 'Minimo')}
          </label>
          <input
            type="number"
            min="0"
            value={prepTime?.min || ''}
            onChange={(e) => handleChange('min', e.target.value)}
            placeholder="15"
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL}>
            {t('productForm.prepTime.max', 'Maximo')}
          </label>
          <input
            type="number"
            min="0"
            value={prepTime?.max || ''}
            onChange={(e) => handleChange('max', e.target.value)}
            placeholder="20"
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL}>
            {t('productForm.prepTime.unit', 'Unidad')}
          </label>
          <select
            value={prepTime?.unit || 'min'}
            onChange={(e) => handleChange('unit', e.target.value)}
            className={INPUT}
          >
            <option value="min">{t('productForm.prepTime.minutes', 'Minutos')}</option>
            <option value="hr">{t('productForm.prepTime.hours', 'Horas')}</option>
          </select>
        </div>
      </div>

      {prepTime && prepTime.min > 0 && prepTime.max > 0 && (
        <div className="mt-4 p-3 rounded-xl bg-[#F0F9FF]">
          <p className="text-[0.8rem] font-medium text-[#1e3a5f]">
            {t('productForm.prepTime.preview', 'Vista previa:')}
            <span className="font-medium ml-2">
              {prepTime.min}-{prepTime.max} {prepTime.unit === 'hr' ? 'hr' : 'min'}
            </span>
          </p>
        </div>
      )}
    </div>
  )
}
