import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate, Outlet } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { ToastProvider } from './components/ui/Toast'
import { useSubdomain } from './hooks/useSubdomain'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supportedLanguages, type SupportedLanguage } from './i18n'
import { Capacitor } from '@capacitor/core'

// Pages
import Landing from './pages/Landing'
import MobileWelcome from './pages/mobile/MobileWelcome'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import DashboardLayout from './components/dashboard/DashboardLayout'
import DashboardHome from './pages/dashboard/Home'
import Products from './pages/dashboard/Products'
import ProductForm from './pages/dashboard/ProductForm'
import Settings from './pages/dashboard/Settings'
import Branding from './pages/dashboard/Branding'
import Account from './pages/dashboard/Account'
import Domain from './pages/dashboard/Domain'
import Payments from './pages/dashboard/Payments'
import Integrations from './pages/dashboard/Integrations'
import Coupons from './pages/dashboard/Coupons'
import Plan from './pages/dashboard/Plan'
import Analytics from './pages/dashboard/Analytics'
import Orders from './pages/dashboard/Orders'
import Customers from './pages/dashboard/Customers'
import SupportChats from './pages/dashboard/SupportChats'
import MoreMenu from './pages/dashboard/MoreMenu'
import Catalog from './pages/catalog/Catalog'

// Blog Pages
import BlogList from './pages/blog/BlogList'
import BlogPost from './pages/blog/BlogPost'

// Admin Pages
import AdminLayout from './components/admin/AdminLayout'
import AdminDashboard from './pages/admin/Dashboard'
import AdminStores from './pages/admin/Stores'
import AdminStoreDetail from './pages/admin/StoreDetail'
import AdminUsers from './pages/admin/Users'
import AdminPlans from './pages/admin/Plans'

// Payment Pages
import PaymentSuccess from './pages/payment/PaymentSuccess'
import PaymentFailure from './pages/payment/PaymentFailure'
import PaymentPending from './pages/payment/PaymentPending'

// Legal Pages
import Privacy from './pages/Privacy'

// Subdomain catalog wrapper (supports optional product slug)
function SubdomainCatalog({ subdomain }: { subdomain: string }) {
  const { productSlug } = useParams<{ productSlug: string }>()
  return <Catalog subdomainStore={subdomain} productSlug={productSlug} />
}

// Custom domain catalog wrapper (supports optional product slug)
function CustomDomainCatalog({ domain }: { domain: string }) {
  const { productSlug } = useParams<{ productSlug: string }>()
  return <Catalog customDomain={domain} productSlug={productSlug} />
}

// Detect browser language and redirect to appropriate language route
function LanguageRedirect() {
  const navigate = useNavigate()
  const { i18n } = useTranslation()

  useEffect(() => {
    // Get browser language (e.g., "es-ES" -> "es")
    const browserLang = navigator.language.split('-')[0]
    const targetLang = supportedLanguages.includes(browserLang as SupportedLanguage)
      ? browserLang
      : 'es'

    i18n.changeLanguage(targetLang)
    navigate(`/${targetLang}`, { replace: true })
  }, [navigate, i18n])

  return null
}

// Layout component that sets the language based on URL
function LanguageLayout() {
  const { lang } = useParams<{ lang: string }>()
  const { i18n } = useTranslation()
  const navigate = useNavigate()

  useEffect(() => {
    if (lang && supportedLanguages.includes(lang as SupportedLanguage)) {
      if (i18n.language !== lang) {
        i18n.changeLanguage(lang)
      }
    } else {
      // Invalid language, redirect to Spanish
      navigate('/es', { replace: true })
    }
  }, [lang, i18n, navigate])

  return <Outlet />
}

// Main app with subdomain and custom domain detection
function AppRoutes() {
  const { subdomain, isSubdomain, isCustomDomain, customDomain } = useSubdomain()

  // If we're on a subdomain, show only the catalog
  if (isSubdomain && subdomain) {
    return (
      <Routes>
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/payment/failure" element={<PaymentFailure />} />
        <Route path="/payment/pending" element={<PaymentPending />} />
        <Route path="/p/:productSlug" element={<SubdomainCatalog subdomain={subdomain} />} />
        <Route path="*" element={<SubdomainCatalog subdomain={subdomain} />} />
      </Routes>
    )
  }

  // If we're on a custom domain, show only the catalog
  if (isCustomDomain && customDomain) {
    return (
      <Routes>
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/payment/failure" element={<PaymentFailure />} />
        <Route path="/payment/pending" element={<PaymentPending />} />
        <Route path="/p/:productSlug" element={<CustomDomainCatalog domain={customDomain} />} />
        <Route path="*" element={<CustomDomainCatalog domain={customDomain} />} />
      </Routes>
    )
  }

  // Normal app routes
  return (
    <Routes>
      {/* Root redirect to detected language */}
      <Route path="/" element={<LanguageRedirect />} />

      {/* Payment return pages (no language prefix - used by MercadoPago) */}
      <Route path="/payment/success" element={<PaymentSuccess />} />
      <Route path="/payment/failure" element={<PaymentFailure />} />
      <Route path="/payment/pending" element={<PaymentPending />} />

      {/* Public catalog (no language prefix) */}
      <Route path="/c/:storeSlug/p/:productSlug" element={<Catalog />} />
      <Route path="/c/:storeSlug" element={<Catalog />} />

      {/* Language-prefixed routes */}
      <Route path="/:lang" element={<LanguageLayout />}>
        {/* Public routes - Show MobileWelcome on native, Landing on web */}
        <Route index element={Capacitor.isNativePlatform() ? <MobileWelcome /> : <Landing />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />

        {/* Legal routes */}
        <Route path="privacy" element={<Privacy />} />

        {/* Blog routes */}
        <Route path="blog" element={<BlogList />} />
        <Route path="blog/:slug" element={<BlogPost />} />

        {/* Dashboard routes */}
        <Route path="dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="products" element={<Products />} />
          <Route path="products/:productId" element={<ProductForm />} />
          <Route path="categories" element={<Navigate to="products" replace />} />
          <Route path="orders" element={<Orders />} />
          <Route path="customers" element={<Customers />} />
          <Route path="analytics" element={<Analytics />} />
          {/* Mi Tienda */}
          <Route path="branding" element={<Branding />} />
          <Route path="settings" element={<Settings />} />
          <Route path="domain" element={<Domain />} />
          <Route path="payments" element={<Payments />} />
          <Route path="integrations" element={<Integrations />} />
          <Route path="coupons" element={<Coupons />} />
          {/* Account & Plan */}
          <Route path="account" element={<Account />} />
          <Route path="plan" element={<Plan />} />
          <Route path="support-chats" element={<SupportChats />} />
          <Route path="more" element={<MoreMenu />} />
          <Route path="subscription" element={<Navigate to="account" replace />} />
        </Route>

        {/* Admin routes (protected for admin@shopifree.app) */}
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="stores" element={<AdminStores />} />
          <Route path="stores/:storeId" element={<AdminStoreDetail />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="plans" element={<AdminPlans />} />
        </Route>
      </Route>

      {/* Fallback: redirect old routes to Spanish */}
      <Route path="/login" element={<Navigate to="/es/login" replace />} />
      <Route path="/register" element={<Navigate to="/es/register" replace />} />
      <Route path="/dashboard/*" element={<Navigate to="/es/dashboard" replace />} />
      <Route path="/admin/*" element={<Navigate to="/es/admin" replace />} />
      <Route path="/blog" element={<Navigate to="/es/blog" replace />} />
      <Route path="/blog/*" element={<Navigate to="/es/blog" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  )
}

export default App
