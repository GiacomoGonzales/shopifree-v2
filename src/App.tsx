import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { ToastProvider } from './components/ui/Toast'
import { useSubdomain } from './hooks/useSubdomain'

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
      {/* Public routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Public catalog (fallback for /c/storename) */}
      <Route path="/c/:storeSlug" element={<Catalog />} />

      {/* Dashboard routes */}
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<DashboardHome />} />
        <Route path="products" element={<Products />} />
        <Route path="products/:productId" element={<ProductForm />} />
        <Route path="categories" element={<Navigate to="/dashboard/products" replace />} />
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
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="stores" element={<AdminStores />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="plans" element={<AdminPlans />} />
      </Route>
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
