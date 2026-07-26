import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate, useLocation, Outlet } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { ToastProvider } from './components/ui/Toast'
import { useSubdomain } from './hooks/useSubdomain'
import { trackPlatformPageView } from './lib/platformTracking'
import { lazy, Suspense, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supportedLanguages, type SupportedLanguage } from './i18n'
import { Capacitor } from '@capacitor/core'

// First-paint pages stay STATIC: Landing is the paid-ads entry (web) and
// MobileWelcome the native splash — they must render without an extra chunk
// round-trip. Everything else is code-split per route (React.lazy) so the
// landing no longer ships the dashboard, finance, admin, blog and ~30 themes
// in one 4.2MB bundle.
import Landing from './pages/Landing'
import MobileWelcome from './pages/mobile/MobileWelcome'

// Auth
const Login = lazy(() => import('./pages/auth/Login'))
const Register = lazy(() => import('./pages/auth/Register'))

// Dashboard
const DashboardLayout = lazy(() => import('./components/dashboard/DashboardLayout'))
const DashboardHome = lazy(() => import('./pages/dashboard/Home'))
const Products = lazy(() => import('./pages/dashboard/Products'))
const ProductForm = lazy(() => import('./pages/dashboard/ProductForm'))
const Settings = lazy(() => import('./pages/dashboard/Settings'))
const Branding = lazy(() => import('./pages/dashboard/Branding'))
const Account = lazy(() => import('./pages/dashboard/Account'))
const Domain = lazy(() => import('./pages/dashboard/Domain'))
const Payments = lazy(() => import('./pages/dashboard/Payments'))
const Integrations = lazy(() => import('./pages/dashboard/Integrations'))
const ApiDocs = lazy(() => import('./pages/ApiDocs'))
const ThemeShot = lazy(() => import('./pages/ThemeShot'))
const Coupons = lazy(() => import('./pages/dashboard/Coupons'))
const Plan = lazy(() => import('./pages/dashboard/Plan'))
const Analytics = lazy(() => import('./pages/dashboard/Analytics'))
const Orders = lazy(() => import('./pages/dashboard/Orders'))
const Customers = lazy(() => import('./pages/dashboard/Customers'))
const SupportChats = lazy(() => import('./pages/dashboard/SupportChats'))
const MoreMenu = lazy(() => import('./pages/dashboard/MoreMenu'))
const Help = lazy(() => import('./pages/dashboard/Help'))
const MiApp = lazy(() => import('./pages/dashboard/MiApp'))
const Dropshipping = lazy(() => import('./pages/dashboard/Dropshipping'))

// Storefront catalog (pulls all themes — the single heaviest chunk)
const Catalog = lazy(() => import('./pages/catalog/Catalog'))

// Blog
const BlogList = lazy(() => import('./pages/blog/BlogList'))
const BlogPost = lazy(() => import('./pages/blog/BlogPost'))

// Finance
const FinanceLayout = lazy(() => import('./components/finance/FinanceLayout'))
const FinanceDashboard = lazy(() => import('./pages/finance/FinanceDashboard'))
const Expenses = lazy(() => import('./pages/finance/Expenses'))
const CashFlow = lazy(() => import('./pages/finance/CashFlow'))
const ComingSoon = lazy(() => import('./pages/finance/ComingSoon'))
const Inventory = lazy(() => import('./pages/finance/Inventory'))
const InventoryAdjust = lazy(() => import('./pages/finance/InventoryAdjust'))
const StockMovements = lazy(() => import('./pages/finance/StockMovements'))
const StockDiagnostic = lazy(() => import('./pages/finance/StockDiagnostic'))
const WarehousesPage = lazy(() => import('./pages/finance/Warehouses'))
const Suppliers = lazy(() => import('./pages/finance/Suppliers'))
const PurchasesPage = lazy(() => import('./pages/finance/Purchases'))
const ProductionPage = lazy(() => import('./pages/finance/Production'))
const AppShell = lazy(() => import('./components/layout/AppShell'))

// Admin
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'))
const AdminAppBuilds = lazy(() => import('./pages/admin/AppBuilds'))
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'))
const AdminStores = lazy(() => import('./pages/admin/Stores'))
const AdminStoreDetail = lazy(() => import('./pages/admin/StoreDetail'))
const AdminUsers = lazy(() => import('./pages/admin/Users'))
const AdminPlans = lazy(() => import('./pages/admin/Plans'))
const AdminPaidStores = lazy(() => import('./pages/admin/PaidStores'))
const AdminFeedback = lazy(() => import('./pages/admin/Feedback'))
const AdminMediaStats = lazy(() => import('./pages/admin/MediaStats'))
const AdminStoreAppPreview = lazy(() => import('./pages/admin/StoreAppPreview'))

// Payment return pages (also used by storefronts)
const PaymentSuccess = lazy(() => import('./pages/payment/PaymentSuccess'))
const PaymentFailure = lazy(() => import('./pages/payment/PaymentFailure'))
const PaymentPending = lazy(() => import('./pages/payment/PaymentPending'))

// Legal
const Privacy = lazy(() => import('./pages/Privacy'))
const StorePrivacyPage = lazy(() => import('./pages/catalog/StorePrivacyPage'))

// Suspense fallback while a route chunk downloads — mirrors the app's spinner
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a5f]"></div>
    </div>
  )
}

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
  const location = useLocation()
  const { i18n } = useTranslation()

  useEffect(() => {
    // Get browser language (e.g., "es-ES" -> "es")
    const browserLang = navigator.language.split('-')[0]
    const targetLang = supportedLanguages.includes(browserLang as SupportedLanguage)
      ? browserLang
      : 'es'

    i18n.changeLanguage(targetLang)
    // Preserve query + hash: ad clicks land on "/" carrying utm_*/fbclid, and
    // dropping them here blinded GA4/Meta attribution for every campaign.
    navigate(`/${targetLang}${location.search}${location.hash}`, { replace: true })
  }, [navigate, i18n, location.search, location.hash])

  return null
}

// Layout component that sets the language based on URL
function LanguageLayout() {
  const { lang } = useParams<{ lang: string }>()
  const { i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (lang && supportedLanguages.includes(lang as SupportedLanguage)) {
      if (i18n.language !== lang) {
        i18n.changeLanguage(lang)
      }
    } else {
      // Invalid language, redirect to Spanish (keep query + hash for ads)
      navigate(`/es${location.search}${location.hash}`, { replace: true })
    }
  }, [lang, i18n, navigate, location.search, location.hash])

  return <Outlet />
}

// Main app with subdomain and custom domain detection
function AppRoutes() {
  const { subdomain, isSubdomain, isCustomDomain, customDomain } = useSubdomain()

  // If we're on a subdomain, show only the catalog
  if (isSubdomain && subdomain) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment/failure" element={<PaymentFailure />} />
          <Route path="/payment/pending" element={<PaymentPending />} />
          <Route path="/privacy" element={<StorePrivacyPage subdomainStore={subdomain} />} />
          <Route path="/p/:productSlug" element={<SubdomainCatalog subdomain={subdomain} />} />
          <Route path="*" element={<SubdomainCatalog subdomain={subdomain} />} />
        </Routes>
      </Suspense>
    )
  }

  // If we're on a custom domain, show only the catalog
  if (isCustomDomain && customDomain) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment/failure" element={<PaymentFailure />} />
          <Route path="/payment/pending" element={<PaymentPending />} />
          <Route path="/privacy" element={<StorePrivacyPage customDomain={customDomain} />} />
          <Route path="/p/:productSlug" element={<CustomDomainCatalog domain={customDomain} />} />
          <Route path="*" element={<CustomDomainCatalog domain={customDomain} />} />
        </Routes>
      </Suspense>
    )
  }

  // Normal app routes
  return (
    <Suspense fallback={<PageLoader />}>
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

      {/* Public API docs — no language prefix, no auth required */}
      <Route path="/api-docs" element={<ApiDocs />} />

      {/* Theme thumbnail capture (used by scripts/generate-theme-thumbnails.mjs) */}
      <Route path="/theme-shot/:themeId" element={<ThemeShot />} />

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

        {/* Dashboard + Finance routes share an AppShell that persists the mobile sidebar */}
        <Route element={<AppShell />}>
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
            {/* API & Webhooks se fusionó con Integraciones. La ruta vieja sigue
                viva porque hay enlaces a ella (por ejemplo desde /api-docs). */}
            <Route path="api" element={<Navigate to="../integrations?tab=api" replace />} />
            <Route path="mi-app" element={<MiApp />} />
            <Route path="coupons" element={<Coupons />} />
            <Route path="dropshipping" element={<Dropshipping />} />
            {/* Account & Plan */}
            <Route path="account" element={<Account />} />
            <Route path="plan" element={<Plan />} />
            <Route path="support-chats" element={<SupportChats />} />
            <Route path="more" element={<MoreMenu />} />
            <Route path="help" element={<Help />} />
            <Route path="subscription" element={<Navigate to="account" replace />} />
          </Route>

          {/* Finance routes */}
          <Route path="finance" element={<FinanceLayout />}>
            <Route index element={<FinanceDashboard />} />
            {/* Inventario */}
            <Route path="inventory" element={<Inventory />} />
            <Route path="inventory/adjust" element={<InventoryAdjust />} />
            <Route path="inventory/diagnostic" element={<StockDiagnostic />} />
            <Route path="stock-movements" element={<StockMovements />} />
            <Route path="warehouses" element={<WarehousesPage />} />
            {/* Compras */}
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="purchases" element={<PurchasesPage />} />
            <Route path="production" element={<ProductionPage />} />
            {/* Operaciones */}
            <Route path="branches" element={<WarehousesPage />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="cashflow" element={<CashFlow />} />
            {/* Reportes */}
            <Route path="reports" element={<ComingSoon />} />
            {/* Compartidas */}
            <Route path="subscription" element={<Plan />} />
            <Route path="account" element={<Account />} />
            <Route path="support-chats" element={<SupportChats />} />
          </Route>
        </Route>

        {/* Admin routes (protected for admin@shopifree.app) */}
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="stores" element={<AdminStores />} />
          <Route path="stores/:storeId" element={<AdminStoreDetail />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="paid-stores" element={<AdminPaidStores />} />
          <Route path="plans" element={<AdminPlans />} />
          <Route path="feedback" element={<AdminFeedback />} />
          <Route path="app-builds" element={<AdminAppBuilds />} />
          <Route path="stores/:storeId/app-preview" element={<AdminStoreAppPreview />} />
          <Route path="media" element={<AdminMediaStats />} />
        </Route>
      </Route>

      {/* Fallback: redirect old routes to Spanish */}
      <Route path="/login" element={<Navigate to="/es/login" replace />} />
      <Route path="/register" element={<Navigate to="/es/register" replace />} />
      <Route path="/dashboard/*" element={<Navigate to="/es/dashboard" replace />} />
      <Route path="/finance/*" element={<Navigate to="/es/finance" replace />} />
      <Route path="/admin/*" element={<Navigate to="/es/admin" replace />} />
      <Route path="/blog" element={<Navigate to="/es/blog" replace />} />
      <Route path="/blog/*" element={<Navigate to="/es/blog" replace />} />
    </Routes>
    </Suspense>
  )
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

function GoogleAnalyticsTracker() {
  const location = useLocation()
  const { subdomain, isSubdomain, isCustomDomain, customDomain } = useSubdomain()

  // Determine site context: "main" (landing/dashboard), "storefront" (subdomain/custom domain)
  const siteType = isSubdomain || isCustomDomain ? 'storefront' : 'main'
  const storeName = subdomain || customDomain || ''

  useEffect(() => {
    if (window.gtag) {
      window.gtag('event', 'page_view', {
        page_path: location.pathname + location.search,
        page_location: window.location.href,
        page_title: document.title,
        site_type: siteType,
        store_name: storeName,
      })
    }
    // Platform Meta Pixel PageView (main site only — storefronts fire the
    // merchant's own pixel via src/lib/pixels.ts instead).
    if (siteType === 'main') {
      trackPlatformPageView()
    }
  }, [location, siteType, storeName])
  return null
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <GoogleAnalyticsTracker />
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  )
}

export default App
