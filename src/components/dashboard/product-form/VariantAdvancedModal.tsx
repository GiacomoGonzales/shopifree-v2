import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../../ui/Toast'
import type { VariantCombination } from '../../../types'
import { uploadImage as uploadToStorage } from '../../../utils/uploadImage'
import { INPUT_SM, LABEL } from './tokens'

interface Props {
  combo: VariantCombination
  basePrice?: number
  trackStock?: boolean
  isEditing?: boolean
  onChange: (updates: Partial<VariantCombination>) => void
  onClose: () => void
}

export default function VariantAdvancedModal({
  combo, basePrice, trackStock, isEditing, onChange, onClose,
}: Props) {
  const { t } = useTranslation('dashboard')
  const { showToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const comboLabel = Object.values(combo.options).join(' / ')

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadToStorage(file, { folder: 'shopifree/products' })
      onChange({ image: url })
    } catch (err) {
      console.error(err)
      showToast(t('productForm.variantAdvanced.uploadError'), 'error')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50"
        onClick={onClose}
      />
      <div className="fixed inset-x-4 top-[6%] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg z-50 animate-[slideDown_0.2s_ease-out]">
        <div className="bg-white rounded-xl shadow-2xl border border-[#E6EBF1] max-h-[88vh] flex flex-col">
          {/* Header */}
          <div className="px-5 py-4 border-b border-[#EEF2F6] flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-[#1e3a5f]">{t('productForm.variantAdvanced.title')}</h3>
              <p className="text-xs text-[#8898AA] mt-0.5 truncate">{comboLabel}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-[#A9B6C6] hover:text-[#425466] rounded-md hover:bg-[#F1F5F9] transition-colors"
              aria-label="Close"
            >
              &times;
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto px-5 py-4 space-y-5">
            {/* Image */}
            <div>
              <label className="block text-xs font-medium text-[#425466] mb-2">
                {t('productForm.variantAdvanced.image')}
              </label>
              <div className="flex items-center gap-3">
                <div className="w-20 h-20 rounded-lg border border-[#E6EBF1] bg-[#F6F9FC] overflow-hidden flex items-center justify-center shrink-0">
                  {combo.image ? (
                    <img src={combo.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[0.66rem] font-medium text-[#C3CFDB]">Sin foto</span>
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUpload}
                    className="hidden"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="px-3 py-1.5 text-xs font-medium bg-[#1e3a5f] text-white rounded-md hover:bg-[#2d6cb5] transition-colors disabled:opacity-50"
                    >
                      {uploading ? t('productForm.variantAdvanced.uploading') : t('productForm.variantAdvanced.uploadImage')}
                    </button>
                    {combo.image && (
                      <button
                        type="button"
                        onClick={() => onChange({ image: undefined })}
                        className="px-3 py-1.5 text-xs font-medium bg-[#F1F5F9] text-[#425466] rounded-md hover:bg-[#E1E8EF] transition-colors"
                      >
                        {t('productForm.variantAdvanced.removeImage')}
                      </button>
                    )}
                  </div>
                  <p className="text-[0.7rem] font-normal text-[#A9B6C6]">{t('productForm.variantAdvanced.imageHint')}</p>
                </div>
              </div>
            </div>

            {/* Identifiers */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>
                  {t('productForm.variantAdvanced.sku')}
                </label>
                <input
                  type="text"
                  value={combo.sku || ''}
                  onChange={e => onChange({ sku: e.target.value || undefined })}
                  placeholder="ABC-123"
                  className={INPUT_SM}
                />
              </div>
              <div>
                <label className={LABEL}>
                  {t('productForm.variantAdvanced.barcode')}
                </label>
                <input
                  type="text"
                  value={combo.barcode || ''}
                  onChange={e => onChange({ barcode: e.target.value || undefined })}
                  placeholder="7501234567890"
                  className={INPUT_SM}
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>
                  {t('productForm.variantAdvanced.price')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={combo.price ?? ''}
                  onChange={e => onChange({ price: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder={basePrice !== undefined ? String(basePrice) : '0.00'}
                  className={INPUT_SM}
                />
                <p className="text-[11px] text-[#A9B6C6] mt-1">{t('productForm.variantAdvanced.priceHint')}</p>
              </div>
              <div>
                <label className={LABEL}>
                  {t('productForm.variantAdvanced.cost')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={combo.cost ?? ''}
                  onChange={e => onChange({ cost: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="0.00"
                  className={INPUT_SM}
                />
                <p className="text-[11px] text-[#A9B6C6] mt-1">{t('productForm.variantAdvanced.costHint')}</p>
              </div>
            </div>

            {/* Stock — only when track stock is on AND not editing
                (when editing, stock is managed from the Inventory page) */}
            {trackStock && !isEditing && (
              <div>
                <label className={LABEL}>
                  {t('productForm.variantAdvanced.stock')}
                </label>
                <input
                  type="number"
                  min="0"
                  value={combo.stock || ''}
                  onChange={e => onChange({ stock: Number(e.target.value) || 0 })}
                  placeholder="0"
                  className={INPUT_SM}
                />
              </div>
            )}

            {/* Available toggle */}
            <div className="flex items-center justify-between p-3 bg-[#F6F9FC] rounded-lg">
              <span className="text-sm text-[#425466]">
                {combo.available
                  ? t('productForm.variantAdvanced.available')
                  : t('productForm.variantAdvanced.unavailable')}
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={combo.available}
                  onChange={e => onChange({ available: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#E1E8EF] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#D8E2EC] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2d6cb5]" />
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-[#EEF2F6] flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium bg-[#1e3a5f] text-white rounded-md hover:bg-[#2d6cb5] transition-colors"
            >
              {t('productForm.variantAdvanced.close')}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
