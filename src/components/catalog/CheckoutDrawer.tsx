import { useEffect, useCallback, useRef } from 'react'
import { useTheme } from './ThemeContext'
import { useCheckout } from '../../hooks/useCheckout'
import type { Store, Order } from '../../types'
import type { CartItem } from '../../hooks/useCart'
import { getThemeTranslations } from '../../themes/shared/translations'
import {
  CustomerForm,
  DeliverySelector,
  PaymentSelector,
  OrderSummary,
  OrderConfirmation,
  type CustomerFormRef,
  type DeliverySelectorRef,
  type PaymentSelectorRef
} from './checkout'

interface Props {
  items: CartItem[]
  totalPrice: number
  store: Store
  onClose: () => void
  onOrderComplete: (order: Order) => void
}

export default function CheckoutDrawer({ items, totalPrice, store, onClose, onOrderComplete }: Props) {
  const { theme } = useTheme()
  const t = getThemeTranslations(store.language)

  // Form refs
  const customerFormRef = useRef<CustomerFormRef>(null)
  const deliverySelectorRef = useRef<DeliverySelectorRef>(null)
  const paymentSelectorRef = useRef<PaymentSelectorRef>(null)

  const {
    step,
    data,
    order,
    loading,
    error,
    shippingCost,
    finalTotal,
    goBack,
    goNext,
    updateData,
    processWhatsApp,
    processMercadoPago,
    processTransfer
  } = useCheckout({
    store,
    items,
    totalPrice,
    onOrderComplete
  })

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && step !== 'confirmation' && !loading) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [step, loading, onClose])

  // These handlers receive the data directly from forms to avoid timing issues
  const handleCustomerSubmit = useCallback((customerData: { name: string; phone: string; email?: string }) => {
    // Validate
    if (!customerData.name?.trim()) {
      return // Form already handles visual validation
    }
    if (!customerData.phone?.trim()) {
      return
    }
    // Update and continue
    updateData({ customer: customerData })
    goNext()
  }, [updateData, goNext])

  const handleDeliverySubmit = useCallback((deliveryData: { method: 'pickup' | 'delivery'; address?: { street: string; city: string; reference?: string } }) => {
    // Validate
    if (deliveryData.method === 'delivery') {
      if (!deliveryData.address?.street?.trim() || !deliveryData.address?.city?.trim()) {
        return
      }
    }
    // Update and continue
    updateData({ delivery: deliveryData })
    goNext()
  }, [updateData, goNext])

  const handleBackToStore = useCallback(() => {
    onClose()
  }, [onClose])

  const handlePaymentSubmit = useCallback((method: 'whatsapp' | 'mercadopago' | 'transfer') => {
    switch (method) {
      case 'whatsapp':
        processWhatsApp()
        break
      case 'mercadopago':
        processMercadoPago()
        break
      case 'transfer':
        processTransfer()
        break
    }
  }, [processWhatsApp, processMercadoPago, processTransfer])

  // Handle continue button click
  const handleContinue = useCallback(() => {
    switch (step) {
      case 'customer':
        customerFormRef.current?.submit()
        break
      case 'delivery':
        deliverySelectorRef.current?.submit()
        break
      case 'payment':
        paymentSelectorRef.current?.submit()
        break
    }
  }, [step])

  // Step indicators
  const steps = ['customer', 'delivery', 'payment']
  const currentStepIndex = step === 'confirmation' ? 3 : steps.indexOf(step)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[70] animate-fadeIn"
        onClick={() => step !== 'confirmation' && !loading && onClose()}
      />

      {/* Drawer */}
      <div
        className="fixed inset-y-0 right-0 w-full max-w-md z-[71] flex flex-col animate-slideInRight"
        style={{ backgroundColor: theme.colors.background }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: theme.colors.border }}
        >
          <h2 className="text-lg font-semibold" style={{ color: theme.colors.text }}>
            {t.checkoutTitle}
          </h2>
          {step !== 'confirmation' && (
            <button
              onClick={onClose}
              disabled={loading}
              className="p-2 -m-2 hover:opacity-70 transition-opacity disabled:opacity-30"
              style={{ color: theme.colors.textMuted }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Progress indicator */}
        {step !== 'confirmation' && (
          <div className="px-5 py-3 border-b" style={{ borderColor: theme.colors.border }}>
            <div className="flex items-center gap-2">
              {steps.map((s, i) => (
                <div key={s} className="flex items-center flex-1">
                  <div
                    className="w-full h-1 rounded-full transition-all"
                    style={{
                      backgroundColor: i <= currentStepIndex
                        ? theme.colors.primary
                        : theme.colors.border
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Order Summary - always visible except on confirmation */}
          {step !== 'confirmation' && (
            <div className="mb-6">
              <OrderSummary
                items={items}
                totalPrice={totalPrice}
                shippingCost={shippingCost}
                finalTotal={finalTotal}
                currency={store.currency}
                t={t}
                collapsible={true}
              />
            </div>
          )}

          {/* Step content */}
          {step === 'customer' && (
            <CustomerForm
              ref={customerFormRef}
              data={data.customer}
              onSubmit={handleCustomerSubmit}
              error={error}
              t={t}
            />
          )}

          {step === 'delivery' && (
            <DeliverySelector
              ref={deliverySelectorRef}
              data={data.delivery}
              store={store}
              onSubmit={handleDeliverySubmit}
              error={error}
              t={t}
            />
          )}

          {step === 'payment' && (
            <PaymentSelector
              ref={paymentSelectorRef}
              store={store}
              onSubmit={handlePaymentSubmit}
              error={error}
              t={t}
            />
          )}

          {step === 'confirmation' && order && (
            <OrderConfirmation
              order={order}
              whatsapp={store.whatsapp}
              onBackToStore={handleBackToStore}
              t={t}
            />
          )}
        </div>

        {/* Fixed Footer with navigation buttons */}
        {step !== 'confirmation' && (
          <div
            className="px-5 py-4 border-t"
            style={{
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface
            }}
          >
            <div className="flex gap-3">
              {step !== 'customer' ? (
                <button
                  type="button"
                  onClick={goBack}
                  disabled={loading}
                  className="flex-1 py-3.5 font-medium border transition-all disabled:opacity-50"
                  style={{
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                    borderRadius: theme.radius.md
                  }}
                >
                  {t.backBtn}
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleContinue}
                disabled={loading}
                className={`${step === 'customer' ? 'w-full' : 'flex-1'} py-3.5 font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2`}
                style={{
                  backgroundColor: theme.colors.primary,
                  color: theme.colors.textInverted,
                  borderRadius: theme.radius.md
                }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </>
                ) : step === 'payment' ? (
                  t.sendOrderBtn
                ) : (
                  t.continueBtn
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideInRight {
          animation: slideInRight 0.3s ease-out;
        }
      `}</style>
    </>
  )
}
