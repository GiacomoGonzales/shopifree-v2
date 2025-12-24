import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { ToastProvider } from './components/ui/Toast'

// Pages
import Landing from './pages/Landing'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import DashboardLayout from './components/dashboard/DashboardLayout'
import DashboardHome from './pages/dashboard/Home'
import Products from './pages/dashboard/Products'
import ProductForm from './pages/dashboard/ProductForm'
import Categories from './pages/dashboard/Categories'
import Settings from './pages/dashboard/Settings'
import Branding from './pages/dashboard/Branding'
import Account from './pages/dashboard/Account'
import Domain from './pages/dashboard/Domain'
import Payments from './pages/dashboard/Payments'
import Plan from './pages/dashboard/Plan'
import Catalog from './pages/catalog/Catalog'

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Public catalog */}
          <Route path="/c/:storeSlug" element={<Catalog />} />

          {/* Dashboard routes */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="products" element={<Products />} />
            <Route path="products/:productId" element={<ProductForm />} />
            <Route path="categories" element={<Categories />} />
            {/* Mi Tienda */}
            <Route path="branding" element={<Branding />} />
            <Route path="settings" element={<Settings />} />
            <Route path="domain" element={<Domain />} />
            <Route path="payments" element={<Payments />} />
            {/* Account & Plan */}
            <Route path="account" element={<Account />} />
            <Route path="plan" element={<Plan />} />
          </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  )
}

export default App
