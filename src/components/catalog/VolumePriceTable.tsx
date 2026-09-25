import type { Product } from '../../types'
import { formatPrice } from '../../lib/currency'
import { getVolumePriceTable, type VolumePriceRow } from '../../lib/volumePricing'
import { getThemeTranslations, type ThemeTranslations } from '../../themes/shared/translations'
import { useTheme } from './ThemeContext'

function volumeRowLabel(row: VolumePriceRow, t: ThemeTranslations): string {
  if (row.to === null) return t.volumeFrom.replace('{n}', String(row.from))
  if (row.from === row.to) {
    return row.from === 1 ? t.volumeOne : t.volumeExact.replace('{n}', String(row.from))
  }
  return t.volumeRange.replace('{from}', String(row.from)).replace('{to}', String(row.to))
}

/** Tabla "Precio por cantidad" de la ficha. `basePrice` = precio de la variante elegida. */
export default function VolumePriceTable({ product, basePrice }: { product: Product; basePrice: number }) {
  const { theme, currency, language } = useTheme()
  const t = getThemeTranslations(language)
  const rows = getVolumePriceTable(product, basePrice)
  if (rows.length === 0) return null

  return (
    <div
      className="overflow-hidden"
      style={{ border: `1px solid ${theme.colors.border}`, borderRadius: theme.radius.md }}
    >
      <p
        className="px-4 py-2 text-xs font-semibold uppercase tracking-wide"
        style={{ color: theme.colors.textMuted, backgroundColor: theme.colors.surfaceHover }}
      >
        {t.volumePricing}
      </p>
      {rows.map((row, i) => (
        <div
          key={row.from}
          className="flex items-center justify-between px-4 py-2 text-sm"
          style={{ borderTop: i > 0 ? `1px solid ${theme.colors.border}` : undefined }}
        >
          <span style={{ color: theme.colors.textMuted }}>{volumeRowLabel(row, t)}</span>
          <span className="font-semibold" style={{ color: theme.colors.text }}>
            {formatPrice(row.unitPrice, currency)}{' '}
            <span className="text-xs font-normal" style={{ color: theme.colors.textMuted }}>{t.perUnit}</span>
          </span>
        </div>
      ))}
    </div>
  )
}
