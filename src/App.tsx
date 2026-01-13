import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate, Outlet } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { ToastProvider } from './components/ui/Toast'
import { useSubdomain } from './hooks/useSubdomain'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supportedLanguages, type SupportedLanguage } from './i18n'

// Pages
import Landing from './pages/Landing'
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
import Plan from './pages/dashboard/Plan'
import Catalog from './pages/catalog/Catalog'

// Admin Pages
import AdminLayout from './components/admin/AdminLayout'
import AdminDashboard from './pages/admin/Dashboard'
import AdminStores from './pages/admin/Stores'
import AdminUsers from './pages/admin/Users'
import AdminPlans from './pages/admin/Plans'

// Subdomain catalog wrapper
function SubdomainCatalog({ subdomain }: { subdomain: string }) {
  return <Catalog subdomainStore={subdomain} />
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

// Main app with subdomain detection
function AppRoutes() {
  const { subdomain, isSubdomain } = useSubdomain()

  // If we're on a subdomain, show only the catalog
  if (isSubdomain && subdomain) {
    return (
      <Routes>
        <Route path="*" element={<SubdomainCatalog subdomain={subdomain} />} />
      </Routes>
    )
  }

  // Normal app routes
  return (
    <Routes>
      {/* Root redirect to detected language */}
      <Route path="/" element={<LanguageRedirect />} />

      {/* Public catalog (no language prefix) */}
      <Route path="/c/:storeSlug" element={<Catalog />} />

      {/* Language-prefixed routes */}
      <Route path="/:lang" element={<LanguageLayout />}>
        {/* Public routes */}
        <Route index element={<Landing />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />

        {/* Dashboard routes */}
        <Route path="dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="products" element={<Products />} />
          <Route path="products/:productId" element={<ProductForm />} />
          <Route path="categories" element={<Navigate to="products" replace />} />
          {/* Mi Tienda */}
          <Route path="branding" element={<Branding />} />
          <Route path="settings" element={<Settings />} />
          <Route path="domain" element={<Domain />} />
          <Route path="payments" element={<Payments />} />
          {/* Account & Plan */}
          <Route path="account" element={<Account />} />
          <Route path="plan" element={<Plan />} />
        </Route>

        {/* Admin routes (protected for admin@shopifree.app) */}
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="stores" element={<AdminStores />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="plans" element={<AdminPlans />} />
        </Route>
      </Route>

      {/* Fallback: redirect old routes to Spanish */}
      <Route path="/login" element={<Navigate to="/es/login" replace />} />
      <Route path="/register" element={<Navigate to="/es/register" replace />} />
      <Route path="/dashboard/*" element={<Navigate to="/es/dashboard" replace />} />
      <Route path="/admin/*" element={<Navigate to="/es/admin" replace />} />
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
