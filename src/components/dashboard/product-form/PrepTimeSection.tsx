import { useTranslation } from 'react-i18next'

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
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-[#1e3a5f]">
            {t('productForm.prepTime.title', 'Tiempo de preparacion')}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {t('productForm.prepTime.description', 'Tiempo estimado para preparar este platillo')}
          </p>
        </div>
        {prepTime && (
          <button
            type="button"
            onClick={clearPrepTime}
            className="text-sm text-gray-400 hover:text-red-500 transition-colors"
          >
            {t('productForm.prepTime.clear', 'Limpiar')}
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
            {t('productForm.prepTime.min', 'Minimo')}
          </label>
          <input
            type="number"
            min="0"
            value={prepTime?.min || ''}
            onChange={(e) => handleChange('min', e.target.value)}
            placeholder="15"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
            {t('productForm.prepTime.max', 'Maximo')}
          </label>
          <input
            type="number"
            min="0"
            value={prepTime?.max || ''}
            onChange={(e) => handleChange('max', e.target.value)}
            placeholder="20"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
            {t('productForm.prepTime.unit', 'Unidad')}
          </label>
          <select
            value={prepTime?.unit || 'min'}
            onChange={(e) => handleChange('unit', e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
          >
            <option value="min">{t('productForm.prepTime.minutes', 'Minutos')}</option>
            <option value="hr">{t('productForm.prepTime.hours', 'Horas')}</option>
          </select>
        </div>
      </div>

      {prepTime && prepTime.min > 0 && prepTime.max > 0 && (
        <div className="mt-4 p-3 bg-[#f0f7ff] rounded-xl">
          <p className="text-sm text-[#1e3a5f]">
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
