/**
 * Buscador de productos para mandar uno como tarjeta (foto + "*Nombre*",
 * precio y link). Busca por nombre o SKU entre los productos activos y muestra
 * foto, precio (o rango con variantes) y stock. Al elegir uno se puede fijar
 * una variante (cambia foto y precio del pie) y retocar el texto antes de
 * mandar.
 */
import { optimizeImage } from '../../utils/media'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Product, Store, VariantCombination } from '../../types'
import { formatPrice } from '../../lib/currency'
import { storeProducts } from './storeData'
import { comboLabel, priceRangeText, productCaption, productImage, productStock, sellableCombos } from './sell'
import { IconArrowLeft, IconSearch, IconSend, IconX } from './icons'

interface Props {
  store: Store
  onClose: () => void
  onSend: (input: { product: Product; imageUrl: string | null; caption: string }) => void
}

export default function ProductPicker({ store, onClose, onSend }: Props) {
  const { t } = useTranslation('dashboard')
  const [products, setProducts] = useState<Product[] | null>(null)
  const [search, setSearch] = useState('')
  const [picked, setPicked] = useState<Product | null>(null)
  const [combo, setCombo] = useState<VariantCombination | null>(null)
  const [caption, setCaption] = useState('')
  const currency = store.currency || 'USD'

  useEffect(() => {
    let alive = true
    storeProducts(store.id).then(list => { if (alive) setProducts(list) })
    return () => { alive = false }
  }, [store.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = (products || []).filter(p => p.active !== false && p.slug)
    return (q
      ? list.filter(p => p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q)
        || (p.combinations || []).some(c => (c.sku || '').toLowerCase().includes(q)))
      : list
    ).slice(0, 60)
  }, [products, search])

  const pick = (p: Product) => {
    setPicked(p)
    setCombo(null)
    setCaption(productCaption(store, p, null))
  }

  const chooseCombo = (id: string) => {
    if (!picked) return
    const c = sellableCombos(picked).find(x => x.id === id) || null
    setCombo(c)
    setCaption(productCaption(store, picked, c))
  }

  const stockText = (p: Product, c?: VariantCombination | null) => {
    const s = productStock(p, c)
    if (s === null) return null
    return s > 0 ? t('shopichat.sell.inStock', { count: s }) : t('shopichat.sell.outOfStock')
  }

  const image = picked ? productImage(picked, combo) : null

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div
        className="bg-white rounded-t-[18px] sm:rounded-[14px] shadow-xl w-full sm:max-w-md max-h-[88vh] flex flex-col"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-[#E6EBF1] flex items-center gap-2">
          {picked && (
            <button type="button" onClick={() => setPicked(null)} className="p-1 -ml-1 text-[#8898AA] hover:text-[#425466]" aria-label={t('shopichat.common.back')}>
              <IconArrowLeft className="w-4 h-4" />
            </button>
          )}
          <h3 className="flex-1 font-semibold text-[#1e3a5f] text-[14px]">{t('shopichat.sell.sendProduct')}</h3>
          <button type="button" onClick={onClose} className="text-[#A9B6C6] hover:text-[#425466]" aria-label={t('shopichat.common.close')}>
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {!picked ? (
          <>
            <div className="relative border-b border-[#F1F5F9]">
              <IconSearch className="w-4 h-4 text-[#A9B6C6] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('shopichat.sell.searchProduct')}
                className="w-full pl-10 pr-3 py-2.5 text-[13px] outline-none"
              />
            </div>
            <div className="flex-1 min-h-[200px] overflow-y-auto overscroll-contain">
              {products === null && <p className="px-4 py-4 text-[12.5px] text-[#A9B6C6]">{t('shopichat.common.loading')}</p>}
              {products !== null && filtered.length === 0 && <p className="px-4 py-4 text-[12.5px] text-[#A9B6C6]">{t('shopichat.list.noMatches')}</p>}
              {filtered.map(p => {
                const stock = stockText(p)
                const out = productStock(p) === 0
                return (
                  <button key={p.id} type="button" onClick={() => pick(p)} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#F6F9FC] border-b border-[#F8FAFC]">
                    {p.image ? (
                      <img src={optimizeImage(p.image, 'thumbnail')} alt="" className="w-11 h-11 rounded-lg object-cover flex-none bg-[#F6F9FC]" loading="lazy" />
                    ) : (
                      <span className="w-11 h-11 rounded-lg bg-[#F6F9FC] flex-none" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium text-[#1e3a5f] truncate">{p.name}</span>
                      <span className="block text-[11.5px] text-[#8898AA] truncate">
                        {priceRangeText(p, currency)}
                        {p.sku && ` · ${p.sku}`}
                      </span>
                    </span>
                    {stock && (
                      <span className={`flex-none text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full ${out ? 'bg-red-50 text-red-600' : 'bg-[#F1F5F9] text-[#425466]'}`}>{stock}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="flex gap-3">
              {image ? (
                <img src={optimizeImage(image, 'thumbnail')} alt="" className="w-24 h-24 rounded-xl object-cover flex-none bg-[#F6F9FC]" />
              ) : (
                <span className="w-24 h-24 rounded-xl bg-[#F6F9FC] flex-none grid place-items-center text-[11px] text-[#A9B6C6] text-center px-2">{t('shopichat.sell.noImage')}</span>
              )}
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-[#1e3a5f]">{picked.name}</p>
                <p className="text-[12.5px] text-[#425466]">{combo ? formatPrice(typeof combo.price === 'number' ? combo.price : picked.price, currency) : priceRangeText(picked, currency)}</p>
                {stockText(picked, combo) && <p className="text-[11.5px] text-[#8898AA]">{stockText(picked, combo)}</p>}
              </div>
            </div>
            {sellableCombos(picked).length > 0 && (
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8898AA]">{t('shopichat.sell.variantOptional')}</span>
                <select
                  value={combo?.id || ''}
                  onChange={e => chooseCombo(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-[13px] bg-white border border-[#E6EBF1] rounded-lg outline-none focus:border-[#38bdf8]"
                >
                  <option value="">{t('shopichat.sell.allVariants')}</option>
                  {sellableCombos(picked).map(c => (
                    <option key={c.id} value={c.id}>
                      {comboLabel(c)} — {formatPrice(typeof c.price === 'number' ? c.price : picked.price, currency)}
                      {picked.trackStock ? ` (${Number(c.stock) || 0})` : ''}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8898AA]">{t('shopichat.sell.captionLabel')}</span>
              <textarea
                value={caption}
                onChange={e => setCaption(e.target.value)}
                rows={4}
                maxLength={1024}
                className="mt-1 w-full text-[13px] bg-[#F6F9FC] border border-[#E6EBF1] rounded-lg px-3 py-2 outline-none focus:border-[#38bdf8] resize-none"
              />
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setPicked(null)} className="px-4 py-2 text-[13px] font-semibold text-[#425466] hover:bg-[#F6F9FC] rounded-lg">
                {t('shopichat.common.back')}
              </button>
              <button
                type="button"
                disabled={!caption.trim()}
                onClick={() => onSend({ product: picked, imageUrl: image, caption: caption.trim() })}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2a4d7a] disabled:opacity-40"
              >
                <IconSend className="w-4 h-4" />{t('shopichat.composer.send')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
