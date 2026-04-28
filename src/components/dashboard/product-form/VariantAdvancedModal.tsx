import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../../ui/Toast'
import type { VariantCombination } from '../../../types'

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

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
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
      formData.append('folder', 'shopifree/products')
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      )
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      onChange({ image: data.secure_url })
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
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200/60 max-h-[88vh] flex flex-col">
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-[#1e3a5f]">{t('productForm.variantAdvanced.title')}</h3>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{comboLabel}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto px-5 py-4 space-y-5">
            {/* Image */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                {t('productForm.variantAdvanced.image')}
              </label>
              <div className="flex items-center gap-3">
                <div className="w-20 h-20 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center shrink-0">
                  {combo.image ? (
                    <img src={combo.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                    </svg>
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
                        className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors"
                      >
                        {t('productForm.variantAdvanced.removeImage')}
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400">{t('productForm.variantAdvanced.imageHint')}</p>
                </div>
              </div>
            </div>

            {/* Identifiers */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t('productForm.variantAdvanced.sku')}
                </label>
                <input
                  type="text"
                  value={combo.sku || ''}
                  onChange={e => onChange({ sku: e.target.value || undefined })}
                  placeholder="ABC-123"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t('productForm.variantAdvanced.barcode')}
                </label>
                <input
                  type="text"
                  value={combo.barcode || ''}
                  onChange={e => onChange({ barcode: e.target.value || undefined })}
                  placeholder="7501234567890"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40"
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t('productForm.variantAdvanced.price')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={combo.price ?? ''}
                  onChange={e => onChange({ price: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder={basePrice !== undefined ? String(basePrice) : '0.00'}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40"
                />
                <p className="text-[11px] text-gray-400 mt-1">{t('productForm.variantAdvanced.priceHint')}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t('productForm.variantAdvanced.cost')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={combo.cost ?? ''}
                  onChange={e => onChange({ cost: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40"
                />
                <p className="text-[11px] text-gray-400 mt-1">{t('productForm.variantAdvanced.costHint')}</p>
              </div>
            </div>

            {/* Stock — only when track stock is on AND not editing
                (when editing, stock is managed from the Inventory page) */}
            {trackStock && !isEditing && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t('productForm.variantAdvanced.stock')}
                </label>
                <input
                  type="number"
                  min="0"
                  value={combo.stock || ''}
                  onChange={e => onChange({ stock: Number(e.target.value) || 0 })}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40"
                />
              </div>
            )}

            {/* Available toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-700">
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
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2d6cb5]" />
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
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
