import { useState, useImperativeHandle, forwardRef } from 'react'
import { useTheme } from '../ThemeContext'
import type { DeliveryData } from '../../../hooks/useCheckout'
import type { ThemeTranslations } from '../../../themes/shared/translations'
import type { Store } from '../../../types'
import { formatPrice } from '../../../lib/currency'
import { statesByCountry, stateLabel } from '../../../data/states'

interface Props {
  data?: DeliveryData
  store: Store
  subtotal: number
  onSubmit: (data: DeliveryData) => void
  error?: string | null
  t: ThemeTranslations
}

export interface DeliverySelectorRef {
  submit: () => boolean
}

const DeliverySelector = forwardRef<DeliverySelectorRef, Props>(({ data, store, subtotal, onSubmit, error, t }, ref) => {
  const { theme } = useTheme()

  const pickupEnabled = store.shipping?.pickupEnabled !== false
  const deliveryEnabled = store.shipping?.deliveryEnabled !== false

  // Determine default method based on enabled options
  const getDefaultMethod = (): 'pickup' | 'delivery' => {
    if (data?.method) {
      if (data.method === 'pickup' && pickupEnabled) return 'pickup'
      if (data.method === 'delivery' && deliveryEnabled) return 'delivery'
    }
    if (pickupEnabled) return 'pickup'
    return 'delivery'
  }

  const [method, setMethod] = useState<'pickup' | 'delivery'>(getDefaultMethod())
  const [addressState, setAddressState] = useState(data?.address?.state || '')
  const [street, setStreet] = useState(data?.address?.street || '')
  const [city, setCity] = useState(data?.address?.city || '')
  const [reference, setReference] = useState(data?.address?.reference || '')
  const [observations, setObservations] = useState(data?.observations || '')

  // Get states for the store's country
  const countryCode = store.location?.country || 'PE'
  const states = statesByCountry[countryCode] || []
  const storeLang = (store.language?.substring(0, 2) || 'es') as 'es' | 'en' | 'pt'
  const stateFieldLabel = stateLabel[countryCode]?.[storeLang] || stateLabel[countryCode]?.es || 'Estado'

  // Calculate shipping cost for display
  const getShippingCost = (): number => {
    if (!store.shipping?.enabled) return 0
    if (store.shipping.freeAbove && subtotal >= store.shipping.freeAbove) return 0
    return store.shipping.cost || 0
  }

  const shippingCost = getShippingCost()
  const isFreeShipping = store.shipping?.enabled && store.shipping.freeAbove && subtotal >= store.shipping.freeAbove

  useImperativeHandle(ref, () => ({
    submit: () => {
      if (method === 'delivery') {
        if (states.length > 0 && !addressState) return false
        if (!street.trim() || !city.trim()) return false
      }
      const deliveryData: DeliveryData = {
        method,
        address: method === 'delivery' ? {
          state: addressState || undefined,
          street,
          city,
          reference: reference || undefined
        } : undefined,
        observations: observations || undefined
      }
      onSubmit(deliveryData)
      return true
    }
  }))

  const inputStyle = {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    borderRadius: theme.radius.md
  }

  const optionStyle = (selected: boolean) => ({
    backgroundColor: selected ? `${theme.colors.primary}10` : theme.colors.surface,
    borderColor: selected ? theme.colors.primary : theme.colors.border,
    color: theme.colors.text,
    borderRadius: theme.radius.md
  })

  const storeAddress = store.location
    ? `${store.location.address || ''}, ${store.location.city || ''}`
    : null

  return (
    <div className="flex flex-col gap-4">
      <h3
        className="text-lg font-semibold"
        style={{ color: theme.colors.text }}
      >
        {t.howToReceive}
      </h3>

      {/* Delivery method options */}
      {pickupEnabled && deliveryEnabled ? (
        <div className="flex flex-col gap-3">
          {/* Pickup option */}
          <button
            type="button"
            onClick={() => setMethod('pickup')}
            className="flex items-start gap-3 p-4 border-2 transition-all text-left"
            style={optionStyle(method === 'pickup')}
          >
            <div
              className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ borderColor: method === 'pickup' ? theme.colors.primary : theme.colors.border }}
            >
              {method === 'pickup' && (
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: theme.colors.primary }}
                />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="font-medium">{t.pickupInStore}</span>
              </div>
              {storeAddress && method === 'pickup' && (
                <p
                  className="text-sm mt-1"
                  style={{ color: theme.colors.textMuted }}
                >
                  {storeAddress}
                </p>
              )}
            </div>
          </button>

          {/* Delivery option */}
          <button
            type="button"
            onClick={() => setMethod('delivery')}
            className="flex items-start gap-3 p-4 border-2 transition-all text-left"
            style={optionStyle(method === 'delivery')}
          >
            <div
              className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ borderColor: method === 'delivery' ? theme.colors.primary : theme.colors.border }}
            >
              {method === 'delivery' && (
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: theme.colors.primary }}
                />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="font-medium">{t.homeDelivery}</span>
                </div>
                {/* Show shipping cost */}
                {store.shipping?.enabled && (
                  <span
                    className="text-sm font-medium"
                    style={{ color: isFreeShipping ? theme.colors.accent : theme.colors.primary }}
                  >
                    {isFreeShipping ? t.freeShipping : shippingCost > 0 ? `+${formatPrice(shippingCost, store.currency)}` : t.freeShipping}
                  </span>
                )}
              </div>
              {/* Show free shipping threshold info */}
              {store.shipping?.enabled && store.shipping.freeAbove && !isFreeShipping && (
                <p
                  className="text-xs mt-1"
                  style={{ color: theme.colors.textMuted }}
                >
                  {t.freeShippingAbove?.replace('{{amount}}', formatPrice(store.shipping.freeAbove, store.currency)) ||
                    `Envío gratis en compras mayores a ${formatPrice(store.shipping.freeAbove, store.currency)}`}
                </p>
              )}
            </div>
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Single option auto-selected - just show info */}
          {pickupEnabled && (
            <div
              className="flex items-start gap-3 p-4 border-2 text-left"
              style={optionStyle(true)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="font-medium">{t.pickupInStore}</span>
                </div>
                {storeAddress && (
                  <p
                    className="text-sm mt-1"
                    style={{ color: theme.colors.textMuted }}
                  >
                    {storeAddress}
                  </p>
                )}
              </div>
            </div>
          )}
          {deliveryEnabled && (
            <div
              className="flex items-start gap-3 p-4 border-2 text-left"
              style={optionStyle(true)}
            >
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="font-medium">{t.homeDelivery}</span>
                  </div>
                  {store.shipping?.enabled && (
                    <span
                      className="text-sm font-medium"
                      style={{ color: isFreeShipping ? theme.colors.accent : theme.colors.primary }}
                    >
                      {isFreeShipping ? t.freeShipping : shippingCost > 0 ? `+${formatPrice(shippingCost, store.currency)}` : t.freeShipping}
                    </span>
                  )}
                </div>
                {store.shipping?.enabled && store.shipping.freeAbove && !isFreeShipping && (
                  <p
                    className="text-xs mt-1"
                    style={{ color: theme.colors.textMuted }}
                  >
                    {t.freeShippingAbove?.replace('{{amount}}', formatPrice(store.shipping.freeAbove, store.currency)) ||
                      `Envío gratis en compras mayores a ${formatPrice(store.shipping.freeAbove, store.currency)}`}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delivery address form */}
      {method === 'delivery' && (
        <div className="flex flex-col gap-3 mt-2 animate-fadeIn">
          <h4
            className="text-sm font-medium"
            style={{ color: theme.colors.textMuted }}
          >
            {t.deliveryAddress}
          </h4>

          {/* State/Department select */}
          {states.length > 0 && (
            <select
              value={addressState}
              onChange={(e) => setAddressState(e.target.value)}
              className="w-full px-4 py-3 border outline-none focus:ring-2 transition-all"
              style={{
                ...inputStyle,
                boxShadow: error === 'stateRequired' ? `0 0 0 2px #ef4444` : undefined
              }}
              required
            >
              <option value="">{stateFieldLabel}...</option>
              {states.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}

          <input
            type="text"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            className="w-full px-4 py-3 border outline-none focus:ring-2 transition-all"
            style={{
              ...inputStyle,
              boxShadow: error === 'addressRequired' ? `0 0 0 2px #ef4444` : undefined
            }}
            placeholder={t.streetAddress}
            required
          />
          {error === 'addressRequired' && (
            <p className="text-sm text-red-500 -mt-2">{t.addressRequired}</p>
          )}

          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full px-4 py-3 border outline-none focus:ring-2 transition-all"
            style={{
              ...inputStyle,
              boxShadow: error === 'cityRequired' ? `0 0 0 2px #ef4444` : undefined
            }}
            placeholder={t.city}
            required
          />
          {error === 'cityRequired' && (
            <p className="text-sm text-red-500 -mt-2">{t.cityRequired}</p>
          )}

          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className="w-full px-4 py-3 border outline-none focus:ring-2 transition-all"
            style={inputStyle}
            placeholder={t.referenceOptional}
          />
        </div>
      )}

      {/* Observations field - always visible */}
      <div className="mt-4">
        <label
          className="block text-sm font-medium mb-1.5"
          style={{ color: theme.colors.textMuted }}
        >
          {t.observations}
        </label>
        <textarea
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          className="w-full px-4 py-3 border outline-none focus:ring-2 transition-all resize-none"
          style={inputStyle}
          placeholder={t.observationsPlaceholder}
          rows={3}
        />
      </div>

    </div>
  )
})

export default DeliverySelector
