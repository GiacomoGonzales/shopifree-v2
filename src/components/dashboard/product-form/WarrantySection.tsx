import { useTranslation } from 'react-i18next'
import { CARD, INPUT, LABEL, REMOVE_BTN, SECTION_HINT, SECTION_TITLE, chipClass } from './tokens'

interface WarrantySectionProps {
  warranty?: {
    months: number
    description?: string
  }
  onChange: (warranty: { months: number; description?: string } | undefined) => void
}

export default function WarrantySection({ warranty, onChange }: WarrantySectionProps) {
  const { t } = useTranslation('dashboard')

  const handleChange = (field: 'months' | 'description', value: string | number) => {
    const current = warranty || { months: 0 }
    if (field === 'months') {
      const numValue = typeof value === 'string' ? parseInt(value) || 0 : value
      if (numValue === 0) {
        onChange(undefined)
      } else {
        onChange({ ...current, months: numValue })
      }
    } else {
      onChange({ ...current, description: value as string || undefined })
    }
  }

  const clearWarranty = () => {
    onChange(undefined)
  }

  // Quick warranty presets (in months)
  const presets = [3, 6, 12, 24, 36]

  return (
    <div className={CARD}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className={SECTION_TITLE}>
            {t('productForm.warranty.title', 'Garantia')}
          </h2>
          <p className={SECTION_HINT}>
            {t('productForm.warranty.description', 'Periodo de garantia del producto')}
          </p>
        </div>
        {warranty && (
          <button
            type="button"
            onClick={clearWarranty}
            className={REMOVE_BTN}
          >
            {t('productForm.warranty.clear', 'Limpiar')}
          </button>
        )}
      </div>

      {/* Quick Presets */}
      <div className="mb-4">
        <p className="text-[0.72rem] font-medium text-[#8898AA] mb-2">
          {t('productForm.warranty.quickSelect', 'Seleccion rapida:')}
        </p>
        <div className="flex flex-wrap gap-2">
          {presets.map((months) => (
            <button
              key={months}
              type="button"
              onClick={() => onChange({ months, description: warranty?.description })}
              className={chipClass(warranty?.months === months)}
            >
              {months >= 12
                ? t('productForm.warranty.years', '{{count}} ano', { count: months / 12 })
                : t('productForm.warranty.months', '{{count}} meses', { count: months })}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className={LABEL}>
            {t('productForm.warranty.monthsLabel', 'Duracion (meses)')}
          </label>
          <input
            type="number"
            min="0"
            value={warranty?.months || ''}
            onChange={(e) => handleChange('months', e.target.value)}
            placeholder="12"
            className="w-32 px-4 py-2.5 border border-[#E6EBF1] rounded-lg focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all"
          />
        </div>

        <div>
          <label className={LABEL}>
            {t('productForm.warranty.descriptionLabel', 'Descripcion (opcional)')}
          </label>
          <input
            type="text"
            value={warranty?.description || ''}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder={t('productForm.warranty.descriptionPlaceholder', 'Ej: Garantia del fabricante')}
            className={INPUT}
          />
        </div>
      </div>

      {warranty && warranty.months > 0 && (
        <div className="mt-4 p-3 rounded-xl bg-[#F0F9FF] flex items-center gap-2">
          <p className="text-[0.8rem] font-medium text-[#1e3a5f]">
            {warranty.months >= 12
              ? t('productForm.warranty.previewYears', '{{count}} ano de garantia', { count: warranty.months / 12 })
              : t('productForm.warranty.previewMonths', '{{count}} meses de garantia', { count: warranty.months })}
            {warranty.description && ` - ${warranty.description}`}
          </p>
        </div>
      )}
    </div>
  )
}
