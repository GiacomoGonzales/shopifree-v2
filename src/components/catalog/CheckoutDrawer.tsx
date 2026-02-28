import { useEffect, useCallback, useRef, useState } from 'react'
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
  MercadoPagoBrick,
  StripeElement,
  type CustomerFormRef,
  type DeliverySelectorRef,
  type PaymentSelectorRef
} from './checkout'

/** Translate MercadoPago status_detail to human-readable message */
function getPaymentErrorMessage(statusDetail: string, lang?: string): string {
  const messages: Record<string, Record<string, string>> = {
    cc_rejected_insufficient_amount: {
      es: 'Fondos insuficientes. Intenta con otra tarjeta o medio de pago.',
      en: 'Insufficient funds. Try another card or payment method.',
      pt: 'Saldo insuficiente. Tente com outro cartão ou meio de pagamento.',
    },
    cc_rejected_bad_filled_security_code: {
      es: 'Código de seguridad incorrecto. Revisa el CVV e intenta de nuevo.',
      en: 'Incorrect security code. Check the CVV and try again.',
      pt: 'Código de segurança incorreto. Verifique o CVV e tente novamente.',
    },
    cc_rejected_bad_filled_date: {
      es: 'Fecha de vencimiento incorrecta. Revisa los datos de tu tarjeta.',
      en: 'Incorrect expiration date. Check your card details.',
      pt: 'Data de validade incorreta. Verifique os dados do seu cartão.',
    },
    cc_rejected_bad_filled_card_number: {
      es: 'Número de tarjeta incorrecto. Revisa e intenta de nuevo.',
      en: 'Incorrect card number. Check and try again.',
      pt: 'Número do cartão incorreto. Verifique e tente novamente.',
    },
    cc_rejected_bad_filled_other: {
      es: 'Datos de la tarjeta incorrectos. Revisa la información e intenta de nuevo.',
      en: 'Incorrect card details. Check the information and try again.',
      pt: 'Dados do cartão incorretos. Verifique as informações e tente novamente.',
    },
    cc_rejected_call_for_authorize: {
      es: 'Tu banco requiere autorización. Contacta a tu banco y luego intenta de nuevo.',
      en: 'Your bank requires authorization. Contact your bank and try again.',
      pt: 'Seu banco requer autorização. Entre em contato com seu banco e tente novamente.',
    },
    cc_rejected_card_disabled: {
      es: 'Tu tarjeta está deshabilitada. Contacta a tu banco o usa otra tarjeta.',
      en: 'Your card is disabled. Contact your bank or use another card.',
      pt: 'Seu cartão está desabilitado. Entre em contato com seu banco ou use outro cartão.',
    },
    cc_rejected_duplicated_payment: {
      es: 'Ya procesaste un pago con este monto. Si necesitas pagar de nuevo, usa otra tarjeta.',
      en: 'You already made a payment for this amount. Use another card if you need to pay again.',
      pt: 'Você já fez um pagamento com esse valor. Use outro cartão se precisar pagar novamente.',
    },
    cc_rejected_high_risk: {
      es: 'Pago rechazado por seguridad. Intenta con otro medio de pago.',
      en: 'Payment rejected for security reasons. Try another payment method.',
      pt: 'Pagamento recusado por segurança. Tente com outro meio de pagamento.',
    },
    cc_rejected_max_attempts: {
      es: 'Superaste el máximo de intentos. Intenta con otra tarjeta.',
      en: 'Maximum attempts exceeded. Try with another card.',
      pt: 'Máximo de tentativas excedido. Tente com outro cartão.',
    },
    cc_rejected_other_reason: {
      es: 'Tu tarjeta fue rechazada. Intenta con otra tarjeta o medio de pago.',
      en: 'Your card was declined. Try another card or payment method.',
      pt: 'Seu cartão foi recusado. Tente com outro cartão ou meio de pagamento.',
    },
  }

  const l = lang === 'pt' ? 'pt' : lang === 'en' ? 'en' : 'es'
  const msg = messages[statusDetail]
  if (msg) return msg[l] || msg.es

  // Fallback genérico
  const fallback: Record<string, string> = {
    es: 'Pago rechazado. Intenta con otra tarjeta o medio de pago.',
    en: 'Payment rejected. Try another card or payment method.',
    pt: 'Pagamento recusado. Tente com outro cartão ou meio de pagamento.',
  }
  return fallback[l] || fallback.es
}

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

  // Track selected payment method for dynamic button text
  const [selectedPayment, setSelectedPayment] = useState<'whatsapp' | 'mercadopago' | 'stripe' | 'transfer'>('whatsapp')

  // Form refs
  const customerFormRef = useRef<CustomerFormRef>(null)
  const deliverySelectorRef = useRef<DeliverySelectorRef>(null)
  const paymentSelectorRef = useRef<PaymentSelectorRef>(null)

  const {
    step,
    data,
    order,
    preferenceId,
    loading,
    error,
    shippingCost,
    finalTotal,
    discountAmount,
    appliedCoupon,
    couponError,
    couponLoading,
    brickMode,
    stripeMode,
    goBack,
    goNext,
    updateData,
    applyCoupon,
    removeCoupon,
    processWhatsApp,
    processMercadoPago,
    processStripe,
    processStripePaymentComplete,
    processTransfer,
    processBrickPayment,
    fallbackToCheckoutPro
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

  // Update delivery method in real-time so OrderSummary reflects shipping cost
  const handleDeliveryMethodChange = useCallback((method: 'pickup' | 'delivery') => {
    updateData({ delivery: { ...data.delivery, method } })
  }, [updateData, data.delivery])

  const handleBackToStore = useCallback(() => {
    if (order) {
      onOrderComplete(order) // clears cart + closes drawer
    } else {
      onClose()
    }
  }, [order, onOrderComplete, onClose])

  const handlePaymentSubmit = useCallback((method: 'whatsapp' | 'mercadopago' | 'stripe' | 'transfer') => {
    switch (method) {
      case 'whatsapp':
        processWhatsApp()
        break
      case 'mercadopago':
        processMercadoPago()
        break
      case 'stripe':
        processStripe()
        break
      case 'transfer':
        processTransfer()
        break
    }
  }, [processWhatsApp, processMercadoPago, processStripe, processTransfer])

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
  const progressSteps = brickMode
    ? ['customer', 'delivery', 'payment', 'brick']
    : stripeMode
    ? ['customer', 'delivery', 'payment', 'stripe']
    : ['customer', 'delivery', 'payment']
  const currentStepIndex = step === 'confirmation'
    ? progressSteps.length
    : progressSteps.indexOf(step)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[70] animate-fadeIn"
        onClick={() => step !== 'confirmation' && !loading && onClose()}
      />

      {/* Drawer */}
      <div
        className="checkout-drawer fixed inset-y-0 right-0 w-full max-w-md z-[71] flex flex-col animate-slideInRight"
        style={{ backgroundColor: theme.colors.background }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)', borderColor: theme.colors.border }}
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
              {progressSteps.map((s, i) => (
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
                discountAmount={discountAmount}
                finalTotal={finalTotal}
                currency={store.currency}
                t={t}
                collapsible={true}
                deliveryMethod={data.delivery?.method}
                shippingEnabled={store.shipping?.enabled}
                appliedCoupon={appliedCoupon}
                couponError={couponError}
                couponLoading={couponLoading}
                onApplyCoupon={(store.plan === 'pro' || store.plan === 'business') ? applyCoupon : undefined}
                onRemoveCoupon={removeCoupon}
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
              subtotal={totalPrice}
              onSubmit={handleDeliverySubmit}
              onMethodChange={handleDeliveryMethodChange}
              error={error}
              t={t}
            />
          )}

          {step === 'payment' && (
            <PaymentSelector
              ref={paymentSelectorRef}
              store={store}
              onSubmit={handlePaymentSubmit}
              onSelectionChange={setSelectedPayment}
              error={error}
              t={t}
            />
          )}

          {step === 'brick' && (
            <>
              {error && (
                <div className="mb-4 p-3 rounded-lg border border-red-300 bg-red-50 text-red-700 text-sm">
                  {error.startsWith('paymentRejected:')
                    ? getPaymentErrorMessage(error.split(':')[1], store.language)
                    : error}
                </div>
              )}
              <MercadoPagoBrick
                store={store}
                amount={finalTotal}
                preferenceId={preferenceId}
                onSubmit={processBrickPayment}
                onFallbackToRedirect={fallbackToCheckoutPro}
                onError={(msg) => { void msg }}
                t={t}
              />
            </>
          )}

          {step === 'stripe' && order && (
            <>
              {error && (
                <div className="mb-4 p-3 rounded-lg border border-red-300 bg-red-50 text-red-700 text-sm">
                  {error.startsWith('paymentRejected:')
                    ? getPaymentErrorMessage(error.split(':')[1], store.language)
                    : error}
                </div>
              )}
              <StripeElement
                store={store}
                orderId={order.id}
                amount={finalTotal}
                currency={store.currency || 'USD'}
                onPaymentComplete={processStripePaymentComplete}
                onError={(msg) => { void msg }}
                t={t}
              />
            </>
          )}

          {step === 'confirmation' && order && (
            <OrderConfirmation
              order={order}
              whatsapp={store.whatsapp}
              storeName={store.name}
              currency={store.currency}
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
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
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
                  className={`${step === 'brick' || step === 'stripe' ? 'w-full' : 'flex-1'} py-3.5 font-medium border transition-all disabled:opacity-50`}
                  style={{
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                    borderRadius: theme.radius.md
                  }}
                >
                  {t.backBtn}
                </button>
              ) : null}
              {/* Hide continue button on brick/stripe step - they have their own Pay button */}
              {step !== 'brick' && step !== 'stripe' && (
                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={loading}
                  className={`${step === 'customer' ? 'w-full' : 'flex-1'} py-3.5 font-medium transition-all flex items-center justify-center gap-2`}
                  style={{
                    backgroundColor: theme.colors.primary,
                    color: theme.colors.textInverted,
                    borderRadius: theme.radius.md
                  }}
                >
                  {loading ? (
                    <div
                      className="animate-spin h-5 w-5 rounded-full"
                      style={{
                        border: '2.5px solid rgba(255,255,255,0.3)',
                        borderTopColor: '#ffffff',
                      }}
                    />
                  ) : step === 'payment' ? (
                    selectedPayment === 'mercadopago' || selectedPayment === 'stripe'
                      ? t.goToPaymentBtn
                      : t.sendOrderBtn
                  ) : (
                    t.continueBtn
                  )}
                </button>
              )}
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
