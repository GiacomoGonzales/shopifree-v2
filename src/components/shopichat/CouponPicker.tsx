/**
 * Cupones activos de la tienda para ofrecer por el chat: al elegir uno cae en
 * el cuadro de escribir "Usa el cupón *CODE* para X de descuento" (no sale
 * solo).
 */
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Coupon, Store } from '../../types'
import { formatPrice } from '../../lib/currency'
import { usableCoupons } from './storeData'
import { couponText } from './sell'
import { IconTag, IconX } from './icons'

interface Props {
  store: Store
  onClose: () => void
  onInsert: (text: string) => void
}

export default function CouponPicker({ store, onClose, onInsert }: Props) {
  const { t } = useTranslation('dashboard')
  const [coupons, setCoupons] = useState<Coupon[] | null>(null)
  const currency = store.currency || 'USD'

  useEffect(() => {
    let alive = true
    usableCoupons(store.id)
      .then(list => { if (alive) setCoupons(list) })
      .catch(() => { if (alive) setCoupons([]) })
    return () => { alive = false }
  }, [store.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div
        className="bg-white rounded-t-[18px] sm:rounded-[14px] shadow-xl w-full sm:max-w-sm max-h-[80vh] flex flex-col"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-[#E6EBF1] flex items-center justify-between">
          <h3 className="font-semibold text-[#1e3a5f] text-[14px]">{t('shopichat.sell.coupons')}</h3>
          <button type="button" onClick={onClose} className="text-[#A9B6C6] hover:text-[#425466]" aria-label={t('shopichat.common.close')}>
            <IconX className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {coupons === null && <p className="px-4 py-4 text-[12.5px] text-[#A9B6C6]">{t('shopichat.common.loading')}</p>}
          {coupons !== null && coupons.length === 0 && <p className="px-4 py-4 text-[12.5px] text-[#8898AA]">{t('shopichat.sell.noCoupons')}</p>}
          {(coupons || []).map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => onInsert(couponText(t, c, currency))}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#F6F9FC] border-b border-[#F8FAFC]"
            >
              <span className="w-9 h-9 rounded-lg bg-[#F0F9FF] text-[#0284C7] grid place-items-center flex-none"><IconTag className="w-4 h-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-mono text-[13px] font-semibold text-[#1e3a5f]">{c.code}</span>
                <span className="block text-[11.5px] text-[#8898AA] truncate">
                  {c.discountType === 'percentage' ? `${c.discountValue}%` : formatPrice(c.discountValue, currency)}
                  {c.minOrderAmount ? ` · ${t('shopichat.sell.minShort', { amount: formatPrice(c.minOrderAmount, currency) })}` : ''}
                  {c.maxUses ? ` · ${t('shopichat.sell.usesLeft', { count: Math.max(0, c.maxUses - (c.currentUses || 0)) })}` : ''}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
