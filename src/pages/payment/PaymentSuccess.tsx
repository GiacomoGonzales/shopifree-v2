import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'

interface PendingOrder {
  orderId: string
  storeId: string
  orderNumber: string
}

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [orderNumber, setOrderNumber] = useState<string | null>(null)

  useEffect(() => {
    const processPayment = async () => {
      try {
        // Get stored order info
        const pendingOrderData = sessionStorage.getItem('pendingOrder')
        if (!pendingOrderData) {
          setStatus('error')
          return
        }

        const pendingOrder: PendingOrder = JSON.parse(pendingOrderData)
        setOrderNumber(pendingOrder.orderNumber)

        // Get payment info from URL
        const paymentId = searchParams.get('payment_id')
        const paymentStatus = searchParams.get('status')

        if (paymentStatus === 'approved' && paymentId) {
          // Update order in Firestore
          const orderRef = doc(db, 'stores', pendingOrder.storeId, 'orders', pendingOrder.orderId)
          await updateDoc(orderRef, {
            paymentStatus: 'paid',
            paymentId: paymentId,
            status: 'confirmed',
            updatedAt: new Date()
          })
        }

        // Clear pending order from session
        sessionStorage.removeItem('pendingOrder')

        setStatus('success')
      } catch (error) {
        console.error('Error processing payment:', error)
        setStatus('error')
      }
    }

    processPayment()
  }, [searchParams])

  const handleBackToStore = () => {
    // Navigate back (reload the page to get fresh store context)
    window.history.go(-2)
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 mx-auto text-gray-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-4 text-gray-600">Procesando pago...</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error al procesar el pago</h1>
          <p className="text-gray-600 mb-6">
            Hubo un problema al procesar tu pago. Por favor, intenta nuevamente o contacta a la tienda.
          </p>
          <button
            onClick={handleBackToStore}
            className="px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            Volver a la tienda
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-md">
        {/* Success icon */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Pago completado!
        </h1>
        <p className="text-gray-600 mb-6">
          Tu pago ha sido procesado exitosamente.
        </p>

        {/* Order number */}
        {orderNumber && (
          <div className="bg-gray-100 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500 mb-1">Numero de pedido</p>
            <p className="text-2xl font-bold text-gray-900 tracking-wider">
              {orderNumber}
            </p>
          </div>
        )}

        {/* Info */}
        <p className="text-sm text-gray-500 mb-6">
          Hemos enviado la confirmacion a tu email. El vendedor se pondra en contacto contigo para coordinar la entrega.
        </p>

        {/* Back button */}
        <button
          onClick={handleBackToStore}
          className="w-full px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          Volver a la tienda
        </button>
      </div>
    </div>
  )
}
