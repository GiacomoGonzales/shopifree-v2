import { useTranslation } from 'react-i18next'
import { CARD, INPUT, LABEL, REMOVE_BTN, SECTION_HINT, SECTION_TITLE } from './tokens'

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
    <div className={CARD}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className={SECTION_TITLE}>
            {t('productForm.duration.title', 'Duracion del servicio')}
          </h2>
          <p className={SECTION_HINT}>
            {t('productForm.duration.description', 'Tiempo aproximado que dura este servicio')}
          </p>
        </div>
        {duration && (
          <button
            type="button"
            onClick={clearDuration}
            className={REMOVE_BTN}
          >
            {t('productForm.duration.clear', 'Limpiar')}
          </button>
        )}
      </div>

      {/* Quick Presets */}
      <div className="mb-4">
        <p className="text-[0.72rem] font-medium text-[#8898AA] mb-2">
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
                  ? 'bg-[#1e3a5f] border-[#1e3a5f] text-white'
                  : 'bg-white border-[#E6EBF1] text-[#425466] hover:bg-[#F6F9FC]'
              }`}
            >
              {minutes >= 60 ? `${minutes / 60}h` : `${minutes} min`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={LABEL}>
            {t('productForm.duration.value', 'Duracion')}
          </label>
          <input
            type="number"
            min="0"
            value={duration?.value || ''}
            onChange={(e) => handleChange('value', e.target.value)}
            placeholder="30"
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL}>
            {t('productForm.duration.unit', 'Unidad')}
          </label>
          <select
            value={duration?.unit || 'min'}
            onChange={(e) => handleChange('unit', e.target.value)}
            className={INPUT}
          >
            <option value="min">{t('productForm.duration.minutes', 'Minutos')}</option>
            <option value="hr">{t('productForm.duration.hours', 'Horas')}</option>
          </select>
        </div>
      </div>

      {duration && duration.value > 0 && (
        <div className="mt-4 p-3 rounded-xl bg-[#F0F9FF]">
          <p className="text-[0.8rem] font-medium text-[#1e3a5f]">
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
