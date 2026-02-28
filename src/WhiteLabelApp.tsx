import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { ToastProvider } from './components/ui/Toast'
import Catalog from './pages/catalog/Catalog'
import StorePrivacyPage from './pages/catalog/StorePrivacyPage'
import PaymentSuccess from './pages/payment/PaymentSuccess'
import PaymentFailure from './pages/payment/PaymentFailure'
import PaymentPending from './pages/payment/PaymentPending'

const STORE_SUBDOMAIN = import.meta.env.VITE_STORE_SUBDOMAIN as string

function StoreCatalog() {
  const { productSlug } = useParams<{ productSlug: string }>()
  return <Catalog subdomainStore={STORE_SUBDOMAIN} productSlug={productSlug} />
}

export default function WhiteLabelApp() {
  return (
    <HelmetProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/failure" element={<PaymentFailure />} />
            <Route path="/payment/pending" element={<PaymentPending />} />
            <Route path="/privacy" element={<StorePrivacyPage subdomainStore={STORE_SUBDOMAIN} />} />
            <Route path="/p/:productSlug" element={<StoreCatalog />} />
            <Route path="*" element={<StoreCatalog />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </HelmetProvider>
  )
}
