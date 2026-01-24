import { useTranslation } from 'react-i18next'

interface Spec {
  key: string
  value: string
}

interface SpecsSectionProps {
  specs: Spec[]
  model?: string
  onChange: (specs: Spec[]) => void
  onModelChange: (model: string | undefined) => void
}

export default function SpecsSection({ specs, model, onChange, onModelChange }: SpecsSectionProps) {
  const { t } = useTranslation('dashboard')

  const addSpec = () => {
    onChange([...specs, { key: '', value: '' }])
  }

  const updateSpec = (index: number, field: 'key' | 'value', value: string) => {
    const newSpecs = [...specs]
    newSpecs[index] = { ...newSpecs[index], [field]: value }
    onChange(newSpecs)
  }

  const removeSpec = (index: number) => {
    onChange(specs.filter((_, i) => i !== index))
  }

  // Common spec presets for electronics
  const presets = [
    { key: 'Pantalla', value: '' },
    { key: 'Procesador', value: '' },
    { key: 'RAM', value: '' },
    { key: 'Almacenamiento', value: '' },
    { key: 'Bateria', value: '' },
    { key: 'Camara', value: '' },
    { key: 'Conectividad', value: '' },
    { key: 'Peso', value: '' },
  ]

  const addPreset = (preset: { key: string; value: string }) => {
    // Only add if not already present
    if (!specs.some(s => s.key === preset.key)) {
      onChange([...specs, preset])
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-[#1e3a5f]">
            {t('productForm.specs.title', 'Especificaciones tecnicas')}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {t('productForm.specs.description', 'Caracteristicas tecnicas del producto')}
          </p>
        </div>
        <button
          type="button"
          onClick={addSpec}
          className="px-3 py-1.5 text-sm font-medium bg-[#38bdf8]/10 text-[#1e3a5f] rounded-lg hover:bg-[#38bdf8]/20 transition-colors"
        >
          + {t('productForm.specs.add', 'Agregar')}
        </button>
      </div>

      {/* Model Number */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
          {t('productForm.specs.model', 'Numero de modelo')}
        </label>
        <input
          type="text"
          value={model || ''}
          onChange={(e) => onModelChange(e.target.value || undefined)}
          placeholder={t('productForm.specs.modelPlaceholder', 'Ej: XM5-2024')}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
        />
      </div>

      {/* Quick Presets */}
      {specs.length === 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">
            {t('productForm.specs.quickAdd', 'Agregar rapido:')}
          </p>
          <div className="flex flex-wrap gap-2">
            {presets.slice(0, 5).map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => addPreset(preset)}
                className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {preset.key}
              </button>
            ))}
          </div>
        </div>
      )}

      {specs.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <p className="text-gray-500 text-sm">
            {t('productForm.specs.empty', 'Sin especificaciones. Agrega una para empezar.')}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {specs.map((spec, index) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <input
                type="text"
                value={spec.key}
                onChange={(e) => updateSpec(index, 'key', e.target.value)}
                placeholder={t('productForm.specs.keyPlaceholder', 'Caracteristica')}
                className="w-1/3 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8]"
              />
              <span className="text-gray-400">:</span>
              <input
                type="text"
                value={spec.value}
                onChange={(e) => updateSpec(index, 'value', e.target.value)}
                placeholder={t('productForm.specs.valuePlaceholder', 'Valor')}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8]"
              />
              <button
                type="button"
                onClick={() => removeSpec(index)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Preview */}
      {specs.length > 0 && specs.some(s => s.key && s.value) && (
        <div className="mt-4 p-4 bg-[#f0f7ff] rounded-xl">
          <p className="text-xs text-gray-500 mb-2">
            {t('productForm.specs.preview', 'Vista previa:')}
          </p>
          <table className="w-full text-sm">
            <tbody>
              {specs
                .filter(s => s.key && s.value)
                .map((spec, index) => (
                  <tr key={index} className="border-b border-[#38bdf8]/20 last:border-0">
                    <td className="py-1.5 font-medium text-[#1e3a5f]">{spec.key}</td>
                    <td className="py-1.5 text-gray-600 text-right">{spec.value}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
