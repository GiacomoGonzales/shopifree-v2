import { useTranslation } from 'react-i18next'
import { formatPrice } from '../../../lib/currency'
import { getVolumePriceTable } from '../../../lib/volumePricing'
import { CARD, INPUT_SM, LABEL, SECTION_HINT, SECTION_TITLE } from './tokens'
import { rowsToTiers, type VolumeMode, type VolumeRow } from './volumePricingForm'

interface VolumePricingSectionProps {
  rows: VolumeRow[]
  onChange: (rows: VolumeRow[]) => void
  mode: VolumeMode
  onModeChange: (mode: VolumeMode) => void
  basePrice?: number        // precio del producto (o de la variante más barata)
  pricedByVariants: boolean
  currency: string
}

export default function VolumePricingSection({
  rows, onChange, mode, onModeChange, basePrice, pricedByVariants, currency,
}: VolumePricingSectionProps) {
  const { t } = useTranslation('dashboard')

  const addRow = () => {
    // Sugerencia: la siguiente cantidad después de la última fila
    const last = rows.length ? parseInt(rows[rows.length - 1].minQty, 10) : NaN
    const nextQty = Number.isInteger(last) ? last + 1 : 2
    onChange([...rows, { minQty: String(nextQty), value: '' }])
  }
  const updateRow = (i: number, patch: Partial<VolumeRow>) => {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }
  const removeRow = (i: number) => onChange(rows.filter((_, idx) => idx !== i))

  // Cambiar de modo convierte los valores cargados para no perderlos
  const switchMode = (next: VolumeMode) => {
    if (next === mode) return
    if (basePrice && basePrice > 0) {
      onChange(rows.map(r => {
        const v = parseFloat(r.value)
        if (!isFinite(v) || v <= 0) return r
        const converted = next === 'percent'
          ? Math.round((1 - v / basePrice) * 10000) / 100
          : Math.round(basePrice * (1 - v / 100) * 100) / 100
        return { ...r, value: converted > 0 ? String(converted) : '' }
      }))
    }
    onModeChange(next)
  }

  const preview = basePrice && basePrice > 0
    ? getVolumePriceTable({ price: basePrice, volumePricing: rowsToTiers(rows, mode) }, basePrice)
    : []

  const rowWarning = (r: VolumeRow): string | null => {
    const qty = parseInt(r.minQty, 10)
    const v = parseFloat(r.value)
    if (r.minQty && (!Number.isInteger(qty) || qty < 2)) {
      return t('productForm.volume.minQtyError', 'La cantidad mínima es 2')
    }
    if (mode === 'price' && basePrice && isFinite(v) && v >= basePrice) {
      return t('productForm.volume.notLowerError', 'Tiene que ser menor que el precio normal ({{price}})', {
        price: formatPrice(basePrice, currency),
      })
    }
    if (mode === 'percent' && isFinite(v) && (v <= 0 || v >= 100)) {
      return t('productForm.volume.percentError', 'Pon un % entre 1 y 99')
    }
    return null
  }

  return (
    <div className={CARD}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h2 className={SECTION_TITLE}>{t('productForm.volume.title', 'Precios por cantidad (mayoreo)')}</h2>
          <p className={SECTION_HINT}>
            {t('productForm.volume.hint', 'Baja el precio por unidad cuando el cliente lleva más. Ej.: 1 unidad a $100 y desde 2 unidades a $95 c/u.')}
          </p>
        </div>
        <button
          type="button"
          onClick={addRow}
          className="shrink-0 px-3 py-1.5 text-sm font-medium bg-[#38bdf8]/10 text-[#1e3a5f] rounded-lg hover:bg-[#38bdf8]/20 transition-colors"
        >
          + {t('productForm.volume.add', 'Agregar')}
        </button>
      </div>

      {rows.length > 0 && (
        <div className="space-y-3">
          <div className="inline-flex rounded-lg bg-[#F1F5F9] p-0.5 text-xs font-medium">
            {(['price', 'percent'] as VolumeMode[]).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`px-3 py-1.5 rounded-md transition-colors ${mode === m ? 'bg-white text-[#1e3a5f] shadow-sm' : 'text-[#8898AA] hover:text-[#425466]'}`}
              >
                {m === 'price'
                  ? t('productForm.volume.modePrice', 'Precio por unidad')
                  : t('productForm.volume.modePercent', '% de descuento')}
              </button>
            ))}
          </div>

          {rows.map((r, i) => {
            const warning = rowWarning(r)
            return (
              <div key={i}>
                <div className="flex items-end gap-2">
                  <div className="w-28">
                    <label className={LABEL}>{t('productForm.volume.fromQty', 'Desde (unidades)')}</label>
                    <input
                      type="number"
                      min="2"
                      step="1"
                      inputMode="numeric"
                      value={r.minQty}
                      onChange={e => updateRow(i, { minQty: e.target.value })}
                      className={INPUT_SM}
                    />
                  </div>
                  <div className="flex-1">
                    <label className={LABEL}>
                      {mode === 'price'
                        ? t('productForm.volume.unitPrice', 'Precio c/u')
                        : t('productForm.volume.percentOff', 'Descuento (%)')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step={mode === 'price' ? '0.01' : '1'}
                      inputMode="decimal"
                      value={r.value}
                      onChange={e => updateRow(i, { value: e.target.value })}
                      placeholder={mode === 'price' ? '0.00' : '10'}
                      className={INPUT_SM}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    aria-label={t('productForm.volume.remove', 'Quitar')}
                    className="p-2 text-[#A9B6C6] hover:text-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {warning && <p className="text-xs text-amber-600 mt-1">{warning}</p>}
              </div>
            )
          })}

          {pricedByVariants && (
            <p className="text-xs text-[#8898AA]">
              {mode === 'price'
                ? t('productForm.volume.variantsPriceHint', 'Tus variantes tienen precios distintos: el precio c/u es para la variante más barata y a las demás se les aplica el mismo % de descuento.')
                : t('productForm.volume.variantsPercentHint', 'El descuento se aplica sobre el precio de cada variante.')}
            </p>
          )}

          <p className="text-xs text-[#8898AA]">
            {t('productForm.volume.mixHint', 'Se cuentan todas las unidades del producto en el carrito, aunque sean de distintas variantes.')}
          </p>

          {preview.length > 0 && (
            <div className="rounded-lg border border-[#EAF0F6] overflow-hidden">
              <p className="px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-wide text-[#8898AA] bg-[#F8FAFC]">
                {t('productForm.volume.preview', 'Así lo verán tus clientes')}
              </p>
              {preview.map(row => (
                <div key={row.from} className="flex items-center justify-between px-3 py-1.5 text-sm border-t border-[#EAF0F6]">
                  <span className="text-[#425466]">
                    {row.to === null
                      ? t('productForm.volume.rowFrom', '{{n}} o más', { n: row.from })
                      : row.from === row.to
                        ? (row.from === 1
                          ? t('productForm.volume.rowOne', '1 unidad')
                          : t('productForm.volume.rowExact', '{{n}} unidades', { n: row.from }))
                        : t('productForm.volume.rowRange', '{{from}} a {{to}} unidades', { from: row.from, to: row.to })}
                  </span>
                  <span className="font-semibold text-[#1e3a5f]">
                    {formatPrice(row.unitPrice, currency)} <span className="text-xs font-normal text-[#8898AA]">{t('productForm.volume.each', 'c/u')}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
