import { useTranslation } from 'react-i18next'

interface DurationSectionProps {
  duration?: {
    value: number
    unit: 'min' | 'hr'
  }
  onChange: (duration: { value: number; unit: 'min' | 'hr' } | undefined) => void
}

export default function DurationSection({ duration, onChange }: DurationSectionProps) {
  const { t } = useTranslation('dashboard')

  const handleChange = (field: 'value' | 'unit', value: string | number) => {
    const current = duration || { value: 0, unit: 'min' as const }
    if (field === 'unit') {
      onChange({ ...current, unit: value as 'min' | 'hr' })
    } else {
      const numValue = typeof value === 'string' ? parseInt(value) || 0 : value
      onChange({ ...current, value: numValue })
    }
  }

  const clearDuration = () => {
    onChange(undefined)
  }

  // Quick duration presets (in minutes)
  const presets = [15, 30, 45, 60, 90, 120]

  const setPreset = (minutes: number) => {
    if (minutes >= 60) {
      onChange({ value: minutes / 60, unit: 'hr' })
    } else {
      onChange({ value: minutes, unit: 'min' })
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-[#1e3a5f]">
            {t('productForm.duration.title', 'Duracion del servicio')}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {t('productForm.duration.description', 'Tiempo aproximado que dura este servicio')}
          </p>
        </div>
        {duration && (
          <button
            type="button"
            onClick={clearDuration}
            className="text-sm text-gray-400 hover:text-red-500 transition-colors"
          >
            {t('productForm.duration.clear', 'Limpiar')}
          </button>
        )}
      </div>

      {/* Quick Presets */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-2">
          {t('productForm.duration.quickSelect', 'Seleccion rapida:')}
        </p>
        <div className="flex flex-wrap gap-2">
          {presets.map((minutes) => (
            <button
              key={minutes}
              type="button"
              onClick={() => setPreset(minutes)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                (duration?.unit === 'min' && duration.value === minutes) ||
                (duration?.unit === 'hr' && duration.value === minutes / 60)
                  ? 'bg-[#2d6cb5] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {minutes >= 60 ? `${minutes / 60}h` : `${minutes} min`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
            {t('productForm.duration.value', 'Duracion')}
          </label>
          <input
            type="number"
            min="0"
            value={duration?.value || ''}
            onChange={(e) => handleChange('value', e.target.value)}
            placeholder="30"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
            {t('productForm.duration.unit', 'Unidad')}
          </label>
          <select
            value={duration?.unit || 'min'}
            onChange={(e) => handleChange('unit', e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
          >
            <option value="min">{t('productForm.duration.minutes', 'Minutos')}</option>
            <option value="hr">{t('productForm.duration.hours', 'Horas')}</option>
          </select>
        </div>
      </div>

      {duration && duration.value > 0 && (
        <div className="mt-4 p-3 bg-[#f0f7ff] rounded-xl">
          <p className="text-sm text-[#1e3a5f]">
            {t('productForm.duration.preview', 'Vista previa:')}
            <span className="font-medium ml-2">
              {duration.value} {duration.unit === 'hr'
                ? t('productForm.duration.hoursShort', 'hr')
                : t('productForm.duration.minutesShort', 'min')}
            </span>
          </p>
        </div>
      )}
    </div>
  )
}
