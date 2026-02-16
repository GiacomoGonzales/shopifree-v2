import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Capacitor } from '@capacitor/core'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import { useToast } from '../../components/ui/Toast'
import { couponService } from '../../lib/firebase'
import { getCurrencySymbol } from '../../lib/currency'
import type { Coupon } from '../../types'

export default function Coupons() {
  const { t } = useTranslation('dashboard')
  const { store } = useAuth()
  const { localePath } = useLanguage()
  const { showToast } = useToast()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form state
  const [code, setCode] = useState('')
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [discountValue, setDiscountValue] = useState('')
  const [minOrderAmount, setMinOrderAmount] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [expiresAt, setExpiresAt] = useState('')

  const isPro = store?.plan === 'pro' || store?.plan === 'business'
  const currencySymbol = getCurrencySymbol(store?.currency || 'USD')

  useEffect(() => {
    const fetchCoupons = async () => {
      if (!store) return
      try {
        const data = await couponService.getAll(store.id)
        setCoupons(data)
      } catch (error) {
        console.error('Error fetching coupons:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchCoupons()
  }, [store])

  const resetForm = () => {
    setCode('')
    setDiscountType('percentage')
    setDiscountValue('')
    setMinOrderAmount('')
    setMaxUses('')
    setExpiresAt('')
    setEditingId(null)
    setShowForm(false)
  }

  const handleEdit = (coupon: Coupon) => {
    setCode(coupon.code)
    setDiscountType(coupon.discountType)
    setDiscountValue(String(coupon.discountValue))
    setMinOrderAmount(coupon.minOrderAmount ? String(coupon.minOrderAmount) : '')
    setMaxUses(coupon.maxUses ? String(coupon.maxUses) : '')
    setExpiresAt(coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().split('T')[0] : '')
    setEditingId(coupon.id)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!store || !code.trim() || !discountValue) return

    setSaving(true)
    try {
      const couponData: Partial<Coupon> = {
        code: code.toUpperCase().trim(),
        discountType,
        discountValue: Number(discountValue),
        ...(minOrderAmount && { minOrderAmount: Number(minOrderAmount) }),
        ...(maxUses && { maxUses: Number(maxUses) }),
        ...(expiresAt && { expiresAt: new Date(expiresAt) }),
      }

      if (editingId) {
        await couponService.update(store.id, editingId, couponData)
        showToast(t('coupons.toast.updated'), 'success')
      } else {
        await couponService.create(store.id, couponData)
        showToast(t('coupons.toast.created'), 'success')
      }

      const updated = await couponService.getAll(store.id)
      setCoupons(updated)
      resetForm()
    } catch (error) {
      console.error('Error saving coupon:', error)
      showToast(t('coupons.toast.error'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (coupon: Coupon) => {
    if (!store) return
    try {
      await couponService.update(store.id, coupon.id, { active: !coupon.active })
      setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, active: !c.active } : c))
    } catch (error) {
      console.error('Error toggling coupon:', error)
    }
  }

  const handleDelete = async (couponId: string) => {
    if (!store) return
    try {
      await couponService.delete(store.id, couponId)
      setCoupons(prev => prev.filter(c => c.id !== couponId))
      showToast(t('coupons.toast.deleted'), 'success')
    } catch (error) {
      console.error('Error deleting coupon:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a5f]"></div>
      </div>
    )
  }

  // Gate: Pro plan required
  if (!isPro) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
        <div className="w-20 h-20 bg-gradient-to-br from-[#f0f7ff] to-white border border-[#38bdf8]/20 rounded-2xl flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-[#2d6cb5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-[#1e3a5f] mb-2">{t('coupons.proRequired.title')}</h2>
        <p className="text-gray-600 mb-6 max-w-md">{t('coupons.proRequired.description')}</p>
        {!Capacitor.isNativePlatform() && (
          <Link
            to={localePath('/dashboard/plan')}
            className="px-6 py-3 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white rounded-xl hover:from-[#2d6cb5] hover:to-[#38bdf8] transition-all font-semibold shadow-lg shadow-[#1e3a5f]/20"
          >
            {t('coupons.proRequired.upgrade')}
          </Link>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">{t('coupons.title')}</h1>
          <p className="text-gray-600 mt-1">{t('coupons.subtitle')}</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true) }}
          className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white rounded-xl hover:from-[#2d6cb5] hover:to-[#38bdf8] transition-all font-semibold shadow-lg shadow-[#1e3a5f]/20"
        >
          {t('coupons.create')}
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm mb-6">
          <h3 className="font-semibold text-[#1e3a5f] mb-4">
            {editingId ? t('coupons.edit') : t('coupons.new')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Code */}
            <div>
              <label className="block text-sm font-medium text-[#1e3a5f] mb-1">{t('coupons.form.code')}</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="VERANO20"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all uppercase font-mono"
              />
            </div>
            {/* Discount type + value */}
            <div>
              <label className="block text-sm font-medium text-[#1e3a5f] mb-1">{t('coupons.form.discount')}</label>
              <div className="flex gap-2">
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                  className="px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                >
                  <option value="percentage">%</option>
                  <option value="fixed">{currencySymbol}</option>
                </select>
                <input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === 'percentage' ? '20' : '10.00'}
                  min="0"
                  step={discountType === 'percentage' ? '1' : '0.01'}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                />
              </div>
            </div>
            {/* Min order */}
            <div>
              <label className="block text-sm font-medium text-[#1e3a5f] mb-1">{t('coupons.form.minOrder')}</label>
              <input
                type="number"
                value={minOrderAmount}
                onChange={(e) => setMinOrderAmount(e.target.value)}
                placeholder={t('coupons.form.optional')}
                min="0"
                step="0.01"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
              />
            </div>
            {/* Max uses */}
            <div>
              <label className="block text-sm font-medium text-[#1e3a5f] mb-1">{t('coupons.form.maxUses')}</label>
              <input
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder={t('coupons.form.unlimited')}
                min="1"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
              />
            </div>
            {/* Expires */}
            <div>
              <label className="block text-sm font-medium text-[#1e3a5f] mb-1">{t('coupons.form.expires')}</label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
              />
            </div>
          </div>
          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSave}
              disabled={saving || !code.trim() || !discountValue}
              className="px-6 py-2.5 bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white rounded-xl hover:from-[#2d6cb5] hover:to-[#38bdf8] transition-all font-semibold disabled:opacity-50 shadow-lg shadow-[#1e3a5f]/20"
            >
              {saving ? t('coupons.form.saving') : editingId ? t('coupons.form.update') : t('coupons.form.save')}
            </button>
            <button
              onClick={resetForm}
              className="px-6 py-2.5 text-gray-600 hover:text-[#1e3a5f] transition-colors"
            >
              {t('coupons.form.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Coupons list */}
      {coupons.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
          <div className="w-20 h-20 bg-gradient-to-br from-[#f0f7ff] to-white border border-[#38bdf8]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-[#2d6cb5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[#1e3a5f] mb-2">{t('coupons.empty.title')}</h3>
          <p className="text-gray-600 mb-6">{t('coupons.empty.description')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {coupons.map((coupon) => {
            const isExpired = coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()
            const isMaxed = coupon.maxUses ? coupon.currentUses >= coupon.maxUses : false

            return (
              <div
                key={coupon.id}
                className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-sm transition-all ${
                  !coupon.active || isExpired || isMaxed ? 'border-gray-200 opacity-60' : 'border-gray-100'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Code + badge */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#f0f7ff] to-white border border-[#38bdf8]/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-[#2d6cb5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#1e3a5f] font-mono">{coupon.code}</span>
                        {coupon.active && !isExpired && !isMaxed && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">{t('coupons.active')}</span>
                        )}
                        {isExpired && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full">{t('coupons.expired')}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `${currencySymbol}${coupon.discountValue}`}
                        {coupon.minOrderAmount ? ` · ${t('coupons.min')} ${currencySymbol}${coupon.minOrderAmount}` : ''}
                        {coupon.maxUses ? ` · ${coupon.currentUses}/${coupon.maxUses} ${t('coupons.uses')}` : ` · ${coupon.currentUses} ${t('coupons.uses')}`}
                      </p>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={coupon.active}
                        onChange={() => handleToggle(coupon)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#38bdf8] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-[#1e3a5f] peer-checked:to-[#2d6cb5]"></div>
                    </label>
                    <button
                      onClick={() => handleEdit(coupon)}
                      className="p-2 text-gray-400 hover:text-[#2d6cb5] transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(coupon.id)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
