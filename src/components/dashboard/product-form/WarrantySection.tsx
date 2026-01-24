import { useTranslation } from 'react-i18next'

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
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-[#1e3a5f]">
            {t('productForm.warranty.title', 'Garantia')}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {t('productForm.warranty.description', 'Periodo de garantia del producto')}
          </p>
        </div>
        {warranty && (
          <button
            type="button"
            onClick={clearWarranty}
            className="text-sm text-gray-400 hover:text-red-500 transition-colors"
          >
            {t('productForm.warranty.clear', 'Limpiar')}
          </button>
        )}
      </div>

      {/* Quick Presets */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-2">
          {t('productForm.warranty.quickSelect', 'Seleccion rapida:')}
        </p>
        <div className="flex flex-wrap gap-2">
          {presets.map((months) => (
            <button
              key={months}
              type="button"
              onClick={() => onChange({ months, description: warranty?.description })}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                warranty?.months === months
                  ? 'bg-[#2d6cb5] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
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
          <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
            {t('productForm.warranty.monthsLabel', 'Duracion (meses)')}
          </label>
          <input
            type="number"
            min="0"
            value={warranty?.months || ''}
            onChange={(e) => handleChange('months', e.target.value)}
            placeholder="12"
            className="w-32 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
            {t('productForm.warranty.descriptionLabel', 'Descripcion (opcional)')}
          </label>
          <input
            type="text"
            value={warranty?.description || ''}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder={t('productForm.warranty.descriptionPlaceholder', 'Ej: Garantia del fabricante')}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
          />
        </div>
      </div>

      {warranty && warranty.months > 0 && (
        <div className="mt-4 p-3 bg-[#f0f7ff] rounded-xl flex items-center gap-2">
          <svg className="w-5 h-5 text-[#2d6cb5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <p className="text-sm text-[#1e3a5f]">
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
