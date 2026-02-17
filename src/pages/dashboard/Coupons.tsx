import { useState, useEffect, useMemo } from 'react'
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
  const { t, i18n } = useTranslation('dashboard')
  const { store } = useAuth()
  const { localePath } = useLanguage()
  const { showToast } = useToast()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Form state
  const [code, setCode] = useState('')
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [discountValue, setDiscountValue] = useState('')
  const [minOrderAmount, setMinOrderAmount] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [expiresAt, setExpiresAt] = useState('')

  const isPro = store?.plan === 'pro' || store?.plan === 'business'
  const currencySymbol = getCurrencySymbol(store?.currency || 'USD')

  // Compute stats
  const stats = useMemo(() => {
    let activeCoupons = 0
    let totalUses = 0
    let totalDiscounted = 0

    coupons.forEach(c => {
      const isExpired = c.expiresAt && new Date(c.expiresAt).getTime() < Date.now()
      const isMaxed = c.maxUses ? c.currentUses >= c.maxUses : false
      if (c.active && !isExpired && !isMaxed) activeCoupons++
      totalUses += c.currentUses
      totalDiscounted += c.currentUses * c.discountValue
    })

    return { activeCoupons, totalUses, totalDiscounted }
  }, [coupons])

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

  const handleCopy = async (coupon: Coupon) => {
    try {
      await navigator.clipboard.writeText(coupon.code)
      setCopiedId(coupon.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // Fallback silently
    }
  }

  const handleShare = (coupon: Coupon) => {
    const discount = coupon.discountType === 'percentage'
      ? `${coupon.discountValue}%`
      : `${currencySymbol}${coupon.discountValue}`
    const storeUrl = store?.subdomain ? `https://${store.subdomain}.shopifree.app` : ''
    const message = t('coupons.shareMessage', { code: coupon.code, discount, url: storeUrl })
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
  }

  const formatExpiryDate = (date: Date) => {
    return new Date(date).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
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

      {/* Stat Cards */}
      {coupons.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* Active coupons */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1e3a5f]">{stats.activeCoupons}</p>
                <p className="text-xs text-gray-500">{t('coupons.stats.active')}</p>
              </div>
            </div>
          </div>
          {/* Total uses */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1e3a5f]">{stats.totalUses}</p>
                <p className="text-xs text-gray-500">{t('coupons.stats.totalUses')}</p>
              </div>
            </div>
          </div>
          {/* Total discounted */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1e3a5f]">~{currencySymbol}{stats.totalDiscounted.toLocaleString()}</p>
                <p className="text-xs text-gray-500">{t('coupons.stats.totalDiscounted')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

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
            const usagePercent = coupon.maxUses ? (coupon.currentUses / coupon.maxUses) * 100 : null

            return (
              <div
                key={coupon.id}
                className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-sm transition-all ${
                  !coupon.active || isExpired || isMaxed ? 'border-gray-200 opacity-60' : 'border-gray-100'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Code + info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#f0f7ff] to-white border border-[#38bdf8]/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-[#2d6cb5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#1e3a5f] font-mono">{coupon.code}</span>
                        {/* Copy button */}
                        <button
                          onClick={() => handleCopy(coupon)}
                          className="p-1 text-gray-400 hover:text-[#2d6cb5] transition-colors"
                          title={copiedId === coupon.id ? t('coupons.copied') : t('home.copyLink')}
                        >
                          {copiedId === coupon.id ? (
                            <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                        {coupon.active && !isExpired && !isMaxed && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">{t('coupons.active')}</span>
                        )}
                        {isExpired && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full">{t('coupons.expired')}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {coupon.minOrderAmount ? `${t('coupons.min')} ${currencySymbol}${coupon.minOrderAmount}` : ''}
                        {coupon.minOrderAmount && (coupon.maxUses || coupon.currentUses) ? ' · ' : ''}
                        {coupon.maxUses ? `${coupon.currentUses}/${coupon.maxUses} ${t('coupons.uses')}` : `${coupon.currentUses} ${t('coupons.uses')}`}
                        {coupon.expiresAt && !isExpired ? ` · ${t('coupons.expires', { date: formatExpiryDate(coupon.expiresAt) })}` : ''}
                      </p>
                      {/* Usage progress bar */}
                      {usagePercent !== null && (
                        <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all ${
                              usagePercent > 90 ? 'bg-red-500' : usagePercent > 70 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(usagePercent, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Discount badge + Actions */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Prominent discount badge */}
                    <span className={`px-3 py-1.5 rounded-full text-lg font-bold ${
                      coupon.discountType === 'percentage'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      -{coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `${currencySymbol}${coupon.discountValue}`}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={coupon.active}
                          onChange={() => handleToggle(coupon)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#38bdf8] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-[#1e3a5f] peer-checked:to-[#2d6cb5]"></div>
                      </label>
                      {/* WhatsApp share */}
                      <button
                        onClick={() => handleShare(coupon)}
                        className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                        title={t('coupons.share')}
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                      </button>
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
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
