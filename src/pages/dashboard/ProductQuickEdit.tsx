import { useTranslation } from 'react-i18next'
import type { Product } from '../../types'
import { optimizeImage } from '../../utils/cloudinary'

/**
 * Edicion rapida de un producto desde el editor en vivo. Cada cambio se aplica
 * al borrador en el momento (se ve en la vista previa) y se guarda junto con
 * el resto con "Guardar cambios". Para variantes, stock, categorias, etc. esta
 * el formulario completo de Productos.
 */
interface Props {
  product: Product
  uploading: boolean
  onChange: (patch: Partial<Product>, field: string) => void
  onPickImage: () => void
  onClose: () => void
  fullFormHref: string
}

const INPUT = 'mt-1 w-full px-3 py-2 text-sm border border-[#E6EBF1] rounded-lg focus:outline-none focus:border-[#1e3a5f]'

/** '' -> undefined (campo vacio); si no es un numero valido, tambien undefined. */
const toPrice = (raw: string) => {
  if (raw.trim() === '') return undefined
  const n = Number(raw.replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

export default function ProductQuickEdit({ product, uploading, onChange, onPickImage, onClose, fullFormHref }: Props) {
  const { t } = useTranslation('dashboard')
  const hidden = product.active === false

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="w-full sm:max-w-md max-h-[90vh] overflow-auto bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[#1e3a5f]">{t('liveEditor.product.title')}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100" title={t('liveEditor.product.close')}>
            <svg className="w-5 h-5 text-[#425466]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onPickImage}
            disabled={uploading}
            className="w-20 h-20 shrink-0 rounded-xl border border-[#E6EBF1] bg-[#F6F9FC] overflow-hidden flex items-center justify-center"
          >
            {product.image
              ? <img src={optimizeImage(product.image, 'thumbnail')} alt="" className="w-full h-full object-cover" />
              : <svg className="w-5 h-5 text-[#8898AA]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>}
          </button>
          <div className="text-xs">
            <p className="text-[#425466]">{t('liveEditor.product.photo')}</p>
            {uploading
              ? <p className="text-[#8898AA]">{t('liveEditor.uploading')}</p>
              : <button onClick={onPickImage} className="text-[#2d6cb5] hover:underline">{t('liveEditor.change')}</button>}
          </div>
        </div>

        <label className="block mb-3">
          <span className="text-xs text-[#425466]">{t('liveEditor.product.name')}</span>
          <input
            type="text"
            value={product.name}
            onChange={e => onChange({ name: e.target.value }, 'name')}
            className={INPUT}
          />
        </label>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <label className="block">
            <span className="text-xs text-[#425466]">{t('liveEditor.product.price')}</span>
            <input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              defaultValue={product.price}
              onChange={e => {
                const price = toPrice(e.target.value)
                if (price !== undefined) onChange({ price }, 'price')
              }}
              className={INPUT}
            />
          </label>
          <label className="block">
            <span className="text-xs text-[#425466]">{t('liveEditor.product.comparePrice')}</span>
            <input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              defaultValue={product.comparePrice ?? ''}
              onChange={e => onChange({ comparePrice: toPrice(e.target.value) }, 'comparePrice')}
              className={INPUT}
            />
          </label>
        </div>

        <label className="block mb-3">
          <span className="text-xs text-[#425466]">{t('liveEditor.product.description')}</span>
          <textarea
            rows={3}
            value={product.description || ''}
            onChange={e => onChange({ description: e.target.value }, 'description')}
            className={`${INPUT} resize-none`}
          />
        </label>

        <label className="flex items-center gap-2 mb-4 text-sm text-[#425466] cursor-pointer">
          <input type="checkbox" checked={!hidden} onChange={e => onChange({ active: e.target.checked }, 'active')} />
          {t('liveEditor.product.visible')}
        </label>
        {hidden && <p className="-mt-2 mb-4 text-[0.7rem] text-amber-700">{t('liveEditor.product.hiddenHint')}</p>}

        <div className="flex items-center justify-between">
          <a href={fullFormHref} className="text-xs text-[#2d6cb5] hover:underline">{t('liveEditor.product.fullForm')}</a>
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-white bg-[#1e3a5f] rounded-lg">
            {t('liveEditor.product.done')}
          </button>
        </div>
      </div>
    </div>
  )
}
