import { useTranslation } from 'react-i18next'

interface CustomOrderSectionProps {
  customizable: boolean
  customizationInstructions?: string
  availableQuantity?: number
  onCustomizableChange: (customizable: boolean) => void
  onInstructionsChange: (instructions: string | undefined) => void
  onQuantityChange: (quantity: number | undefined) => void
}

export default function CustomOrderSection({
  customizable,
  customizationInstructions,
  availableQuantity,
  onCustomizableChange,
  onInstructionsChange,
  onQuantityChange,
}: CustomOrderSectionProps) {
  const { t } = useTranslation('dashboard')

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-[#1e3a5f]">
          {t('productForm.customOrder.title', 'Pedido personalizado')}
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {t('productForm.customOrder.description', 'Permite a los clientes agregar notas de personalizacion')}
        </p>
      </div>

      <div className="space-y-4">
        {/* Enable Customization Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div>
            <span className="text-sm font-medium text-[#1e3a5f]">
              {t('productForm.customOrder.enable', 'Permitir personalizacion')}
            </span>
            <p className="text-xs text-gray-500 mt-0.5">
              {t('productForm.customOrder.enableHint', 'Los clientes pueden agregar instrucciones especiales')}
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={customizable}
              onChange={(e) => onCustomizableChange(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#38bdf8] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-[#1e3a5f] peer-checked:to-[#2d6cb5]"></div>
          </label>
        </div>

        {/* Customization Instructions */}
        {customizable && (
          <div>
            <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
              {t('productForm.customOrder.instructions', 'Instrucciones para el cliente')}
            </label>
            <textarea
              value={customizationInstructions || ''}
              onChange={(e) => onInstructionsChange(e.target.value || undefined)}
              rows={3}
              placeholder={t('productForm.customOrder.instructionsPlaceholder', 'Ej: Describe el color, tamano, texto que deseas...')}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">
              {t('productForm.customOrder.instructionsHint', 'Este texto se mostrara al cliente junto al campo de personalizacion')}
            </p>
          </div>
        )}

        {/* Available Quantity */}
        <div>
          <label className="block text-sm font-medium text-[#1e3a5f] mb-1">
            {t('productForm.customOrder.quantity', 'Cantidad disponible')}
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="0"
              value={availableQuantity ?? ''}
              onChange={(e) => {
                const val = e.target.value
                onQuantityChange(val ? parseInt(val) : undefined)
              }}
              placeholder={t('productForm.customOrder.quantityPlaceholder', 'Ilimitado')}
              className="w-32 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
            />
            <span className="text-sm text-gray-500">
              {t('productForm.customOrder.quantityHint', 'Deja vacio para ilimitado')}
            </span>
          </div>
          {availableQuantity && availableQuantity > 0 && availableQuantity <= 10 && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-700">
                {t('productForm.customOrder.lowStockWarning', 'Se mostrara "Solo quedan {{count}}" en tu catalogo', { count: availableQuantity })}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
